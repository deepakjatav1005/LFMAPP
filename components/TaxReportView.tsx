import React, { useState } from 'react';
import { Tax, Payment, Family, Admin, TaxType, OfficeDetails } from '../types';
import { exportToPDF, exportToExcel, exportBulkVouchersToPDF } from '../utils/exportUtils';
import ViewHeader from './ViewHeader';
import { triggerPrint, getCleanOfficeTitle, formatDateDDMMYYYY } from '../utils/printUtils';

interface TaxReportViewProps {
  taxes: Tax[];
  payments: Payment[];
  families: Family[];
  admin: Admin | null;
  officeDetails?: OfficeDetails | null;
  onSelectFamily: (family: Family) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const TaxReportView: React.FC<TaxReportViewProps> = ({
  taxes,
  payments,
  families,
  admin,
  officeDetails,
  onSelectFamily,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const [reportTab, setReportTab] = useState<'TAX_PAYERS' | 'MONTHLY' | 'LEDGER' | 'CUMULATIVE'>('TAX_PAYERS');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(families[0]?.id || '');
  const [ledgerPeriod, setLedgerPeriod] = useState<'YEARLY' | 'MONTHLY'>('YEARLY');

  // Filters for Taxpayers Master List
  const [tpMonth, setTpMonth] = useState<number>(new Date().getMonth() + 1); // 0 = All Months, 1..12
  const [tpYear, setTpYear] = useState<number>(new Date().getFullYear());
  const [tpTaxType, setTpTaxType] = useState<TaxType | 'ALL'>('ALL');
  const [tpStatus, setTpStatus] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [tpSearch, setTpSearch] = useState<string>('');

  const months = isHindi
    ? [
        { value: 1, name: 'जनवरी' },
        { value: 2, name: 'फ़रवरी' },
        { value: 3, name: 'मार्च' },
        { value: 4, name: 'अप्रैल' },
        { value: 5, name: 'मई' },
        { value: 6, name: 'जून' },
        { value: 7, name: 'जुलाई' },
        { value: 8, name: 'अगस्त' },
        { value: 9, name: 'सितंबर' },
        { value: 10, name: 'अक्टूबर' },
        { value: 11, name: 'नवंबर' },
        { value: 12, name: 'दिसंबर' },
      ]
    : [
        { value: 1, name: 'January' },
        { value: 2, name: 'February' },
        { value: 3, name: 'March' },
        { value: 4, name: 'April' },
        { value: 5, name: 'May' },
        { value: 6, name: 'June' },
        { value: 7, name: 'July' },
        { value: 8, name: 'August' },
        { value: 9, name: 'September' },
        { value: 10, name: 'October' },
        { value: 11, name: 'November' },
        { value: 12, name: 'December' },
      ];

  // 0. TAX PAYERS LIST CALCULATION
  const taxpayersList = families.map((fam) => {
    // Filter family taxes
    const famTaxes = taxes.filter((t) => {
      if (t.familyId !== fam.id) return false;
      if (tpYear && t.year !== tpYear) return false;
      if (tpMonth > 0 && t.month !== tpMonth) return false;
      if (tpTaxType !== 'ALL' && t.type !== tpTaxType) return false;
      return true;
    });

    // Filter family payments
    const famPayments = payments.filter((p) => {
      if (p.familyId !== fam.id) return false;
      const pDate = new Date(p.date);
      if (tpYear && pDate.getFullYear() !== tpYear) return false;
      if (tpMonth > 0 && pDate.getMonth() + 1 !== tpMonth) return false;
      if (tpTaxType !== 'ALL' && p.taxType && p.taxType !== tpTaxType) return false;
      return true;
    });

    const demands = famTaxes.reduce((sum, t) => sum + t.amount, 0);
    const received = famPayments.reduce((sum, p) => sum + p.amount, 0);
    const pending = Math.max(0, demands - received);

    return {
      family: fam,
      demands,
      received,
      pending,
      taxCount: famTaxes.length,
      status: pending === 0 && demands > 0 ? 'PAID' : pending > 0 && received > 0 ? 'PARTIAL' : pending > 0 ? 'PENDING' : 'NO_DEMAND',
    };
  }).filter((item) => {
    // Search query
    const q = tpSearch.toLowerCase();
    const matchSearch =
      !q ||
      item.family.name.toLowerCase().includes(q) ||
      item.family.surname.toLowerCase().includes(q) ||
      item.family.samagraId.toLowerCase().includes(q) ||
      (item.family.familyId && item.family.familyId.toLowerCase().includes(q)) ||
      item.family.guardianName.toLowerCase().includes(q) ||
      (item.family.wardNo && item.family.wardNo.toLowerCase().includes(q)) ||
      (item.family.muhalla && item.family.muhalla.toLowerCase().includes(q));

    // Dues Status filter
    const matchStatus =
      tpStatus === 'ALL'
        ? true
        : tpStatus === 'PENDING'
        ? item.pending > 0
        : item.pending === 0 && item.demands > 0;

    return matchSearch && matchStatus;
  });

  const tpTotalDemands = taxpayersList.reduce((sum, item) => sum + item.demands, 0);
  const tpTotalReceived = taxpayersList.reduce((sum, item) => sum + item.received, 0);
  const tpTotalPending = taxpayersList.reduce((sum, item) => sum + item.pending, 0);

  const handleExportTaxpayersExcel = () => {
    const monthName = tpMonth === 0 ? 'All Months' : months.find((m) => m.value === tpMonth)?.name || `Month ${tpMonth}`;
    const headers = [
      'S.No',
      'Beneficiary Name (नाम)',
      'Father/Husband (पिता/पति)',
      'Samagra ID',
      'Family ID',
      'Ward',
      'मोहल्ला (Muhalla)',
      'Category',
      'Tax Type',
      'Month/Year',
      'Demands Billed (₹)',
      'Received Amount (₹)',
      'Pending Dues (₹)',
      'Status',
    ];

    const rows = taxpayersList.map((item, index) => [
      index + 1,
      `${item.family.name} ${item.family.surname}`,
      item.family.guardianName,
      item.family.samagraId,
      item.family.familyId || 'N/A',
      item.family.wardNo || '01',
      item.family.muhalla || '-',
      item.family.category || 'APL',
      tpTaxType === 'ALL' ? 'All Tax Types' : tpTaxType,
      `${monthName}, ${tpYear}`,
      item.demands,
      item.received,
      item.pending,
      item.pending > 0 ? 'PENDING' : item.demands > 0 ? 'PAID' : 'CLEARED',
    ]);

    rows.push([
      'TOTAL',
      `Total Payers: ${taxpayersList.length}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      tpTotalDemands,
      tpTotalReceived,
      tpTotalPending,
      '',
    ]);

    exportToExcel(
      `TaxPayers_Report_${tpMonth > 0 ? 'Month_' + tpMonth : 'AllMonths'}_${tpYear}`,
      'TaxPayers List Report',
      headers,
      rows
    );
  };

  const handleExportTaxpayersPDF = () => {
    const monthName = tpMonth === 0 ? 'All Months' : months.find((m) => m.value === tpMonth)?.name || `Month ${tpMonth}`;
    const headers = ['S.No', 'Taxpayer Name', 'Samagra ID', 'Ward & Muhalla', 'Tax Type', 'Demands (₹)', 'Received (₹)', 'Pending (₹)', 'Status'];

    const rows = taxpayersList.map((item, index) => [
      index + 1,
      `${item.family.name} ${item.family.surname}`,
      item.family.samagraId,
      `W-${item.family.wardNo || '01'}, ${item.family.muhalla || '-'}`,
      tpTaxType === 'ALL' ? 'All Taxes' : tpTaxType,
      item.demands,
      item.received,
      item.pending,
      item.pending > 0 ? 'DUE' : item.demands > 0 ? 'PAID' : 'OK',
    ]);

    rows.push(['TOTAL', `Count: ${taxpayersList.length}`, '', '', '', tpTotalDemands, tpTotalReceived, tpTotalPending, '']);

    exportToPDF(
      `TaxPayers_Report_${tpMonth > 0 ? 'Month_' + tpMonth : 'AllMonths'}_${tpYear}`,
      `Taxpayers Master Demand & Recovery List (${monthName} ${tpYear})`,
      `Tax Type: ${tpTaxType === 'ALL' ? 'All Combined Taxes' : tpTaxType} | Total Payers: ${taxpayersList.length}`,
      headers,
      rows,
      admin?.gramPanchayat
    );
  };

  // 1. MONTH-WISE REPORT DATA
  const monthlyTaxes = taxes.filter(t => t.month === selectedMonth && t.year === selectedYear);
  
  const monthTaxTypeBreakdown = Object.values(TaxType).map((type) => {
    const charged = monthlyTaxes.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
    
    // Payments made in this month/year for this tax type
    const received = payments
      .filter((p) => {
        const pDate = new Date(p.date);
        const matchMonth = pDate.getMonth() + 1 === selectedMonth && pDate.getFullYear() === selectedYear;
        return matchMonth && (p.taxType === type || !p.taxType);
      })
      .reduce((s, p) => s + p.amount, 0);

    const pending = Math.max(0, charged - received);

    return {
      type,
      charged,
      received,
      pending,
    };
  });

  const monthTotalCharged = monthTaxTypeBreakdown.reduce((s, i) => s + i.charged, 0);
  const monthTotalReceived = monthTaxTypeBreakdown.reduce((s, i) => s + i.received, 0);
  const monthTotalPending = monthTaxTypeBreakdown.reduce((s, i) => s + i.pending, 0);

  // 2. BENEFICIARY LEDGER DATA
  const activeFamily = families.find((f) => f.id === selectedFamilyId) || families[0];

  const familyTaxes = taxes.filter((t) => {
    if (t.familyId !== activeFamily?.id) return false;
    if (ledgerPeriod === 'MONTHLY') return t.month === selectedMonth && t.year === selectedYear;
    return t.year === selectedYear;
  });

  const familyPayments = payments.filter((p) => {
    if (p.familyId !== activeFamily?.id) return false;
    const pDate = new Date(p.date);
    if (ledgerPeriod === 'MONTHLY') return pDate.getMonth() + 1 === selectedMonth && pDate.getFullYear() === selectedYear;
    return pDate.getFullYear() === selectedYear;
  });

  // Combine into chronologically ordered ledger entries
  const ledgerTransactions = [
    ...familyTaxes.map((t) => ({
      date: `${t.year}-${String(t.month).padStart(2, '0')}-01`,
      type: 'DEMAND',
      description: `Tax Demand: ${t.type}`,
      billOrReceiptNo: t.billNo || `BILL-${t.id.slice(-4)}`,
      demand: t.amount,
      received: 0,
    })),
    ...familyPayments.map((p) => ({
      date: p.date,
      type: 'PAYMENT',
      description: `Payment Received (${p.mode}) ${p.remarks ? '- ' + p.remarks : ''}`,
      billOrReceiptNo: p.receiptNo || `RCP-${p.id.slice(-4)}`,
      demand: 0,
      received: p.amount,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const ledgerRowsWithBalance = ledgerTransactions.map((tx) => {
    runningBalance += tx.demand - tx.received;
    return { ...tx, balance: runningBalance };
  });

  // 3. CUMULATIVE REPORT DATA
  const cumulativeTaxTypeBreakdown = Object.values(TaxType).map((type) => {
    const charged = taxes.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
    const received = payments.filter((p) => p.taxType === type || !p.taxType).reduce((s, p) => s + p.amount, 0);
    const pending = Math.max(0, charged - received);
    return { type, charged, received, pending };
  });

  const cumTotalCharged = cumulativeTaxTypeBreakdown.reduce((s, i) => s + i.charged, 0);
  const cumTotalReceived = cumulativeTaxTypeBreakdown.reduce((s, i) => s + i.received, 0);
  const cumTotalPending = cumTotalCharged - cumTotalReceived;

  // --- EXPORT HANDLERS ---
  const handleExportMonthExcel = () => {
    const headers = ['Tax Type (कर प्रकार)', 'Charged Amount (₹)', 'Received Amount (₹)', 'Pending Amount (₹)'];
    const rows = monthTaxTypeBreakdown.map((i) => [i.type, i.charged, i.received, i.pending]);
    rows.push(['TOTAL (कुल)', monthTotalCharged, monthTotalReceived, monthTotalPending]);

    exportToExcel(
      `Tax_Report_${selectedMonth}_${selectedYear}`,
      'Monthly Tax Report',
      headers,
      rows
    );
  };

  const handleExportMonthPDF = () => {
    const monthName = months.find((m) => m.value === selectedMonth)?.name || selectedMonth;
    const headers = ['Tax Type', 'Charged (₹)', 'Received (₹)', 'Pending (₹)'];
    const rows = monthTaxTypeBreakdown.map((i) => [i.type, i.charged, i.received, i.pending]);
    rows.push(['TOTAL', monthTotalCharged, monthTotalReceived, monthTotalPending]);

    exportToPDF(
      `Tax_Report_${selectedMonth}_${selectedYear}`,
      `Monthly Tax Collection Report (${monthName} ${selectedYear})`,
      `Month-wise Charged, Received & Pending Amounts`,
      headers,
      rows,
      admin?.gramPanchayat
    );
  };

  const handleExportMonthBulkVouchersPDF = () => {
    const monthPayments = payments
      .filter((p) => {
        if (!p.date) return false;
        const parts = p.date.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        return y === selectedYear && m === selectedMonth;
      })
      .map((p) => ({
        payment: p,
        family: families.find((f) => f.id === p.familyId),
      }))
      .sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime());

    const monthObj = months.find((m) => m.value === selectedMonth);
    const monthName = monthObj?.name || `Month_${selectedMonth}`;
    const filename = `Tax_Vouchers_${monthName}_${selectedYear}`;
    const officeName = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
    const secName = officeDetails?.secretaryName || admin?.name || 'ग्राम पंचायत सचिव';

    exportBulkVouchersToPDF(filename, monthPayments, monthName, selectedYear, officeName, secName);
  };

  const handleExportLedgerExcel = () => {
    if (!activeFamily) return;
    const headers = ['Date', 'Type', 'Description', 'Bill/Receipt No', 'Demand (+)', 'Received (-)', 'Running Balance'];
    const rows = ledgerRowsWithBalance.map((r) => [
      r.date,
      r.type,
      r.description,
      r.billOrReceiptNo,
      r.demand,
      r.received,
      r.balance,
    ]);

    exportToExcel(
      `Ledger_${activeFamily.name}_${activeFamily.samagraId}`,
      'Beneficiary Ledger',
      headers,
      rows
    );
  };

  const handleExportLedgerPDF = () => {
    if (!activeFamily) return;
    const headers = ['Date', 'Type', 'Description', 'Ref No', 'Demand (₹)', 'Received (₹)', 'Balance (₹)'];
    const rows = ledgerRowsWithBalance.map((r) => [
      r.date,
      r.type,
      r.description,
      r.billOrReceiptNo,
      r.demand,
      r.received,
      r.balance,
    ]);

    exportToPDF(
      `Ledger_${activeFamily.name}_${activeFamily.samagraId}`,
      `Beneficiary Tax Ledger Statement: ${activeFamily.name} ${activeFamily.surname}`,
      `Samagra ID: ${activeFamily.samagraId} | Family ID: ${activeFamily.familyId || 'N/A'} | Category: ${activeFamily.category}`,
      headers,
      rows,
      admin?.gramPanchayat
    );
  };

  const handleExportCumulativeExcel = () => {
    const headers = ['Tax Type', 'Total Charged (₹)', 'Total Received (₹)', 'Pending Dues (₹)'];
    const rows = cumulativeTaxTypeBreakdown.map((i) => [i.type, i.charged, i.received, i.pending]);
    rows.push(['CUMULATIVE TOTAL', cumTotalCharged, cumTotalReceived, cumTotalPending]);

    exportToExcel(`Cumulative_Tax_Report_${new Date().getFullYear()}`, 'Cumulative Report', headers, rows);
  };

  const handleExportCumulativePDF = () => {
    const headers = ['Tax Type', 'Total Charged (₹)', 'Total Received (₹)', 'Pending Dues (₹)'];
    const rows = cumulativeTaxTypeBreakdown.map((i) => [i.type, i.charged, i.received, i.pending]);
    rows.push(['CUMULATIVE TOTAL', cumTotalCharged, cumTotalReceived, cumTotalPending]);

    exportToPDF(
      `Cumulative_Tax_Report_${new Date().getFullYear()}`,
      `Cumulative Gram Panchayat Tax Summary Report`,
      `Overall Tax Demand, Collections, and Outstanding Balances`,
      headers,
      rows,
      admin?.gramPanchayat
    );
  };

  return (
    <div id="printable-area" className="printable-area container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in max-w-7xl">
      {/* STANDARDIZED HEADER WITH BACK AND CLOSE BUTTONS */}
      <ViewHeader
        title={isHindi ? "कर रिपोर्ट एवं खाता बही" : "Tax Report & Ledger"}
        subtitle={isHindi ? "माहवार कर मांग, प्राप्त एवं बकाया रिपोर्ट, व्यक्तिगत लेजर बही एवं संचयी विवरण (PDF/Excel डाउनलोड)" : "Monthly tax demand, collection & pending reports, individual ledger statement and cumulative summary."}
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
        actionButton={
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
            <button
              onClick={() => setReportTab('TAX_PAYERS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                reportTab === 'TAX_PAYERS' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👥 {isHindi ? "करदाता सूची" : "All Taxpayers"}
            </button>
            <button
              onClick={() => setReportTab('MONTHLY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                reportTab === 'MONTHLY' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ {isHindi ? "माहवार विवरण" : "Month-Wise"}
            </button>
            <button
              onClick={() => setReportTab('LEDGER')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                reportTab === 'LEDGER' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📖 {isHindi ? "खाता बही" : "Ledger Statement"}
            </button>
            <button
              onClick={() => setReportTab('CUMULATIVE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                reportTab === 'CUMULATIVE' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 {isHindi ? "संचयी विवरण" : "Cumulative Summary"}
            </button>
          </div>
        }
      />

      {/* ----------------- TAB 0: ALL TAXPAYERS LIST REPORT ----------------- */}
      {reportTab === 'TAX_PAYERS' && (
        <div className="space-y-6">
          {/* FILTER & EXPORT BAR */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-grow">
                {/* Search Box */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Beneficiary</label>
                  <input
                    type="text"
                    placeholder="Search Name, Samagra ID, Ward..."
                    value={tpSearch}
                    onChange={(e) => setTpSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Month Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Month</label>
                  <select
                    value={tpMonth}
                    onChange={(e) => setTpMonth(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option value={0}>All Months (समस्त माह)</option>
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tax Type Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tax Type (कर का प्रकार)</label>
                  <select
                    value={tpTaxType}
                    onChange={(e) => setTpTaxType(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option value="ALL">All Combined Taxes (समस्त कर)</option>
                    {Object.values(TaxType).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Dues Status Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dues Status (स्थिति)</label>
                  <select
                    value={tpStatus}
                    onChange={(e) => setTpStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option value="ALL">All Taxpayers (सभी हितग्राही)</option>
                    <option value="PENDING">Pending Dues Only (केवल बकाया)</option>
                    <option value="PAID">Fully Paid Only (पूर्ण चुकता)</option>
                  </select>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 md:pt-0">
                <button
                  onClick={handleExportTaxpayersExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export taxpayers list to Excel spreadsheet"
                >
                  <span>📊</span> Excel
                </button>
                <button
                  onClick={handleExportTaxpayersPDF}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export taxpayers report to PDF file"
                >
                  <span>📄</span> PDF
                </button>
                <button
                  onClick={() => {
                    try {
                      triggerPrint('printable-area');
                    } catch (e) {
                      console.error('Print report failed:', e);
                    }
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print Taxpayers List"
                >
                  <span>🖨️</span> Print
                </button>
              </div>
            </div>
          </div>

          {/* SUMMARY STATS METRICS FOR FILTERED TAXPAYERS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Filtered Total Demands (कुल मांग)</p>
                <p className="text-xl sm:text-2xl font-black text-amber-600 font-mono mt-0.5">₹{tpTotalDemands.toLocaleString('en-IN')}</p>
              </div>
              <span className="text-2xl">🧾</span>
            </div>

            <div className="bg-emerald-50/80 p-4 rounded-2xl shadow-sm border border-emerald-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-800 uppercase">Total Received Amount (प्राप्त)</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-0.5">₹{tpTotalReceived.toLocaleString('en-IN')}</p>
              </div>
              <span className="text-2xl">✓</span>
            </div>

            <div className="bg-rose-50/80 p-4 rounded-2xl shadow-sm border border-rose-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-rose-800 uppercase">Total Pending Dues (कुल बकाया)</p>
                <p className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-0.5">₹{tpTotalPending.toLocaleString('en-IN')}</p>
              </div>
              <span className="text-2xl">⏳</span>
            </div>
          </div>

          {/* TAXPAYERS MASTER TABLE */}
          <div id="printable-area" className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            {/* PRINTABLE OFFICIAL OFFICE PROFILE HEADER */}
            <div className="p-4 border-b-2 border-slate-900 text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {getCleanOfficeTitle(officeDetails, admin?.gramPanchayat)}
              </h1>
              <p className="text-xs text-slate-600 font-semibold">
                {officeDetails?.address 
                  ? officeDetails.address 
                  : `जनपद पंचायत: ${officeDetails?.block || admin?.block || ''} | जिला: ${officeDetails?.district || admin?.district || ''}`}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
              <span>
                Tax-Wise Taxpayers Master Demand & Recovery Statement ({taxpayersList.length} Beneficiaries)
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Filter: {tpMonth === 0 ? 'All Months' : months.find(m=>m.value===tpMonth)?.name} | {tpTaxType} | {tpYear}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Taxpayer Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Samagra & Family ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Ward & Category</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">Demands Billed (₹)</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-emerald-700 uppercase">Received (₹)</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-rose-700 uppercase">Pending Dues (₹)</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {taxpayersList.map((item, idx) => (
                    <tr key={item.family.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400 font-mono">{idx + 1}</td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{item.family.name} {item.family.surname}</div>
                        <div className="text-[11px] text-slate-400">S/o: {item.family.guardianName} | 📞 {item.family.mobile}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono">
                        <div><span className="text-slate-400">S-ID:</span> <strong className="text-slate-700">{item.family.samagraId}</strong></div>
                        <div><span className="text-slate-400">F-ID:</span> <span className="text-slate-500">{item.family.familyId || 'N/A'}</span></div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <div className="font-bold text-slate-800">Ward {item.family.wardNo || '01'}</div>
                        <div className="text-[11px] text-teal-800 font-medium">📍 {item.family.muhalla || 'मुख्य बस्ती'}</div>
                        <div className="mt-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.family.category === 'BPL' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            item.family.category === 'DIVYANG' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {item.family.category || 'APL'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-slate-800">
                        ₹{item.demands.toLocaleString('en-IN')}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                        ₹{item.received.toLocaleString('en-IN')}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-black text-rose-600 bg-rose-50/20">
                        ₹{item.pending.toLocaleString('en-IN')}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {item.pending === 0 && item.demands > 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ FULLY PAID
                          </span>
                        ) : item.pending > 0 && item.received > 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            PARTIAL PAID
                          </span>
                        ) : item.pending > 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            ⏳ PENDING
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            NO DEMAND
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right print:hidden">
                        <button
                          onClick={() => onSelectFamily(item.family)}
                          className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary-50 border border-primary-200 rounded-lg transition-colors"
                          title="View Beneficiary Ledger & Register Payment"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}

                  {taxpayersList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                        No taxpayers found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="bg-slate-900 text-white font-black">
                  <tr>
                    <td colSpan={4} className="px-4 py-3.5 text-left text-xs uppercase tracking-wider text-amber-400">
                      FILTERED GRAND TOTAL ({taxpayersList.length} TAXPAYERS)
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-100">
                      ₹{tpTotalDemands.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-emerald-400 bg-emerald-950/60">
                      ₹{tpTotalReceived.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-rose-400 bg-rose-950/60">
                      ₹{tpTotalPending.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} className="px-4 py-3.5 text-center text-xs text-slate-400 print:hidden">
                      Summary Total
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 1: MONTH-WISE REPORT ----------------- */}
      {reportTab === 'MONTHLY' && (
        <div className="space-y-6">
          {/* FILTER & EXPORT BAR */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Year</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleExportMonthBulkVouchersPDF}
                className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer border border-teal-500"
                title="Download all official tax receipt vouchers for this month & year as a consolidated PDF file"
              >
                <span>📥</span> {isHindi ? 'थोक कर वाउचर (Bulk Vouchers PDF)' : 'Bulk Vouchers PDF'}
              </button>
              <button
                type="button"
                onClick={handleExportMonthExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>📊</span> Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={handleExportMonthPDF}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>📄</span> {isHindi ? 'मासिक रिपोर्ट PDF' : 'Monthly Report PDF'}
              </button>
            </div>
          </div>

          {/* MONTHLY SUMMARY METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Monthly Billed / Charged (मांग)</p>
              <p className="text-2xl font-black text-amber-600 font-mono mt-1">₹{monthTotalCharged.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Monthly Collection Received (प्राप्त)</p>
              <p className="text-2xl font-black text-emerald-600 font-mono mt-1">₹{monthTotalReceived.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Monthly Outstanding Balance (शेष)</p>
              <p className="text-2xl font-black text-red-600 font-mono mt-1">₹{monthTotalPending.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* MONTHLY BREAKDOWN TABLE */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
              Month-wise Tax Type Breakdown Matrix ({months.find(m => m.value === selectedMonth)?.name}, {selectedYear})
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tax Type (कर का प्रकार)</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Charged Amount (मांग)</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Received Amount (वसूली)</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Pending Amount (शेष)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {monthTaxTypeBreakdown.map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{row.type}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">₹{row.charged.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-700">₹{row.received.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-red-600">₹{row.pending.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold">
                  <tr>
                    <td className="px-5 py-3 text-slate-900">TOTAL (कुल मासिक)</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-900">₹{monthTotalCharged.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-700">₹{monthTotalReceived.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-right font-mono text-red-600">₹{monthTotalPending.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: BENEFICIARY LEDGER ----------------- */}
      {reportTab === 'LEDGER' && (
        <div className="space-y-6">
          {/* LEDGER FILTER & SELECTOR */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
              <div className="w-full sm:w-80">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Select Beneficiary Family</label>
                <select
                  value={selectedFamilyId}
                  onChange={(e) => setSelectedFamilyId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50"
                >
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.surname} (S-ID: {f.samagraId}) [{f.category || 'APL'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Ledger View</label>
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setLedgerPeriod('YEARLY')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg ${
                      ledgerPeriod === 'YEARLY' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Yearly ({selectedYear})
                  </button>
                  <button
                    onClick={() => setLedgerPeriod('MONTHLY')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg ${
                      ledgerPeriod === 'MONTHLY' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Monthly ({selectedMonth}/{selectedYear})
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportLedgerExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span>📊</span> Excel Ledger
              </button>
              <button
                onClick={handleExportLedgerPDF}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span>📄</span> PDF Ledger
              </button>
            </div>
          </div>

          {/* BENEFICIARY INFO HEADER */}
          {activeFamily && (
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{activeFamily.name} {activeFamily.surname}</h3>
                  <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-xs font-black">
                    {activeFamily.category || 'APL'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Guardian: {activeFamily.guardianName} | Mobile: {activeFamily.mobile}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Samagra ID: <span className="font-mono text-amber-300">{activeFamily.samagraId}</span> | Family ID: <span className="font-mono text-amber-300">{activeFamily.familyId || 'N/A'}</span> | Ward: {activeFamily.wardNo}, {activeFamily.muhalla}
                </p>
              </div>

              <div className="text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800 w-full sm:w-auto">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Net Balance</span>
                <span className={`text-2xl font-black font-mono ${runningBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  ₹{runningBalance.toLocaleString('en-IN')} {runningBalance > 0 ? 'Due' : 'Cleared'}
                </span>
              </div>
            </div>
          )}

          {/* LEDGER TRANSACTIONS TABLE */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
              Detailed Ledger Statements & Audit Trail ({ledgerTransactions.length} Entries)
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">Type & Description</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">Bill/Receipt Ref</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Demand (+)</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Received (-)</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {ledgerRowsWithBalance.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-600">{formatDateDDMMYYYY(row.date)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mr-2 ${
                          row.type === 'DEMAND' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {row.type}
                        </span>
                        <span className="text-xs font-medium text-slate-800">{row.description}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-semibold text-primary">
                        {row.billOrReceiptNo}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-amber-700 font-bold">
                        {row.demand > 0 ? `+₹${row.demand.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-700 font-bold">
                        {row.received > 0 ? `-₹${row.received.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-extrabold text-slate-900">
                        ₹{row.balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}

                  {ledgerRowsWithBalance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No transactions recorded for this beneficiary in the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: CUMULATIVE REPORT ----------------- */}
      {reportTab === 'CUMULATIVE' && (
        <div className="space-y-6">
          {/* EXPORT BAR */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Overall Cumulative Tax Assessment & Recovery Report</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCumulativeExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span>📊</span> Excel Cumulative
              </button>
              <button
                onClick={handleExportCumulativePDF}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span>📄</span> PDF Cumulative
              </button>
            </div>
          </div>

          {/* OVERALL METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Cumulative Charged (कुल मांग)</p>
              <p className="text-2xl font-black text-amber-600 font-mono mt-1">₹{cumTotalCharged.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Cumulative Received (कुल प्राप्त)</p>
              <p className="text-2xl font-black text-emerald-600 font-mono mt-1">₹{cumTotalReceived.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Cumulative Pending Dues (कुल बकाया)</p>
              <p className="text-2xl font-black text-red-600 font-mono mt-1">₹{cumTotalPending.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* CUMULATIVE BREAKDOWN TABLE */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
              Cumulative Tax Type Summary
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tax Type (कर का प्रकार)</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total Charged (कुल मांग)</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total Received (कुल वसूली)</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Outstanding Dues (कुल शेष)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {cumulativeTaxTypeBreakdown.map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{row.type}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">₹{row.charged.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-700">₹{row.received.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-red-600">₹{row.pending.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold">
                  <tr>
                    <td className="px-5 py-3 text-slate-900">CUMULATIVE TOTAL</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-900">₹{cumTotalCharged.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-700">₹{cumTotalReceived.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-right font-mono text-red-600">₹{cumTotalPending.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReportView;
