import React, { useState, useMemo, useEffect } from 'react';
import { Payment, Family, Admin, TaxType, OfficeDetails, Tax } from '../types';
import ViewHeader from './ViewHeader';
import OfficialVoucherHeader from './OfficialVoucherHeader';
import { triggerPrint, getCleanOfficeTitle, formatDateDDMMYYYY } from '../utils/printUtils';
import { exportBulkVouchersToPDF, exportToExcel } from '../utils/exportUtils';

interface TaxReceiptManagementViewProps {
  payments: Payment[];
  families: Family[];
  taxes?: Tax[];
  admin: Admin | null;
  officeDetails?: OfficeDetails;
  onAddPayment: (
    familyId: string,
    amount: number,
    mode: 'CASH' | 'UPI' | 'ONLINE' | 'CHEQUE' | 'NET_BANKING',
    remarks?: string,
    taxType?: TaxType,
    date?: string,
    paidTaxIds?: string[],
    chargedAmount?: number,
    previousDues?: number,
    penalty?: number,
    concession?: number,
    remainingDues?: number,
    chargedMonth?: number,
    chargedYear?: number,
    chargedMonthNames?: string,
    receivedMonth?: number,
    receivedYear?: number,
    receivedMonthNames?: string
  ) => void;
  onDeletePayment?: (paymentId: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const TaxReceiptManagementView: React.FC<TaxReceiptManagementViewProps> = ({
  payments,
  families,
  taxes = [],
  admin,
  officeDetails,
  onAddPayment,
  onDeletePayment,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(families[0]?.id || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [concessionAmount, setConcessionAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'ONLINE' | 'CHEQUE' | 'NET_BANKING'>('CASH');
  const [selectedTaxType, setSelectedTaxType] = useState<TaxType | 'ALL'>('ALL');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('Tax Payment Collection');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [beneficiarySearch, setBeneficiarySearch] = useState<string>('');
  const [viewingReceipt, setViewingReceipt] = useState<Payment | null>(null);
  const [memberCardFamily, setMemberCardFamily] = useState<Family | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ id: string; receiptNo: string } | null>(null);
  const [selectedDemandTaxId, setSelectedDemandTaxId] = useState<string>('ALL');

  // Bulk Voucher Download State
  const [showBulkVoucherModal, setShowBulkVoucherModal] = useState<boolean>(false);
  const [bulkSelectedMonth, setBulkSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [bulkSelectedYear, setBulkSelectedYear] = useState<number>(new Date().getFullYear());
  const [bulkSelectedTaxType, setBulkSelectedTaxType] = useState<string>('ALL');
  const [bulkSelectedWard, setBulkSelectedWard] = useState<string>('ALL');
  const [bulkViewMode, setBulkViewMode] = useState<'LIST' | 'PREVIEW'>('LIST');

  // Month & Year Options
  const monthsList = useMemo(() => [
    { value: 'ALL', nameHi: 'सभी माह (All Months)', nameEn: 'All Months' },
    { value: 1, nameHi: '01 - जनवरी (January)', nameEn: 'January' },
    { value: 2, nameHi: '02 - फरवरी (February)', nameEn: 'February' },
    { value: 3, nameHi: '03 - मार्च (March)', nameEn: 'March' },
    { value: 4, nameHi: '04 - अप्रैल (April)', nameEn: 'April' },
    { value: 5, nameHi: '05 - मई (May)', nameEn: 'May' },
    { value: 6, nameHi: '06 - जून (June)', nameEn: 'June' },
    { value: 7, nameHi: '07 - जुलाई (July)', nameEn: 'July' },
    { value: 8, nameHi: '08 - अगस्त (August)', nameEn: 'August' },
    { value: 9, nameHi: '09 - सितम्बर (September)', nameEn: 'September' },
    { value: 10, nameHi: '10 - अक्टूबर (October)', nameEn: 'October' },
    { value: 11, nameHi: '11 - नवम्बर (November)', nameEn: 'November' },
    { value: 12, nameHi: '12 - दिसम्बर (December)', nameEn: 'December' },
  ], []);

  const yearsList = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());
    yearsSet.add(new Date().getFullYear() - 1);
    yearsSet.add(new Date().getFullYear() + 1);
    payments.forEach((p) => {
      if (p.date) {
        const y = parseInt(p.date.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [payments]);

  // Filtered Bulk Vouchers
  const filteredBulkVouchers = useMemo(() => {
    return payments
      .filter((p) => {
        if (!p.date) return false;
        const parts = p.date.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);

        if (bulkSelectedYear && year !== Number(bulkSelectedYear)) return false;
        if (bulkSelectedMonth !== 'ALL' && month !== Number(bulkSelectedMonth)) return false;
        if (bulkSelectedTaxType !== 'ALL' && p.taxType && p.taxType !== bulkSelectedTaxType) return false;
        if (bulkSelectedWard !== 'ALL') {
          const fam = families.find((f) => f.id === p.familyId);
          if (fam?.wardNo !== bulkSelectedWard) return false;
        }
        return true;
      })
      .map((payment) => ({
        payment,
        family: families.find((f) => f.id === payment.familyId),
      }))
      .sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime());
  }, [payments, families, bulkSelectedMonth, bulkSelectedYear, bulkSelectedTaxType, bulkSelectedWard]);

  // Bulk Totals
  const bulkTotalAmount = useMemo(() => {
    return filteredBulkVouchers.reduce((sum, item) => sum + item.payment.amount, 0);
  }, [filteredBulkVouchers]);

  const bulkTotalRemaining = useMemo(() => {
    return filteredBulkVouchers.reduce((sum, item) => sum + (item.payment.remainingDues || 0), 0);
  }, [filteredBulkVouchers]);

  // Download Bulk PDF handler
  const handleDownloadBulkPDF = () => {
    const monthObj = monthsList.find((m) => m.value === bulkSelectedMonth);
    const monthLabel = bulkSelectedMonth === 'ALL' ? 'All_Months' : (monthObj?.nameEn || `Month_${bulkSelectedMonth}`);
    const filename = `Tax_Vouchers_${monthLabel}_${bulkSelectedYear}`;
    const officeName = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
    const secName = officeDetails?.secretaryName || admin?.name || 'ग्राम पंचायत सचिव';

    exportBulkVouchersToPDF(
      filename,
      filteredBulkVouchers,
      bulkSelectedMonth === 'ALL' ? (isHindi ? 'सभी माह' : 'All Months') : (monthObj?.nameEn || String(bulkSelectedMonth)),
      bulkSelectedYear,
      officeName,
      secName
    );
  };

  // Helper functions for month labels
  const getChargedMonthLabel = (p: Payment) => {
    if (p.chargedMonthNames) return p.chargedMonthNames;
    if (p.chargedMonth) {
      const m = monthsList.find((x) => x.value === p.chargedMonth);
      const mName = m ? m.nameHi.split(' - ')[1].split(' (')[0] : `माह ${p.chargedMonth}`;
      return `${mName} ${p.chargedYear || ''}`.trim();
    }
    if (p.month) {
      const m = monthsList.find((x) => x.value === p.month);
      const mName = m ? m.nameHi.split(' - ')[1].split(' (')[0] : `माह ${p.month}`;
      return `${mName} ${p.year || ''}`.trim();
    }
    if (p.date) {
      const parts = p.date.split('-');
      const mVal = parseInt(parts[1], 10);
      const m = monthsList.find((x) => x.value === mVal);
      const mName = m ? m.nameHi.split(' - ')[1].split(' (')[0] : `माह ${mVal}`;
      return `${mName} ${parts[0]}`;
    }
    return isHindi ? 'समस्त बकाया अवधि' : 'All Dues Period';
  };

  const getReceivedMonthLabel = (p: Payment) => {
    if (p.receivedMonthNames) return p.receivedMonthNames;
    if (p.receivedMonth) {
      const m = monthsList.find((x) => x.value === p.receivedMonth);
      const mName = m ? m.nameHi.split(' - ')[1].split(' (')[0] : `माह ${p.receivedMonth}`;
      return `${mName} ${p.receivedYear || ''}`.trim();
    }
    if (p.date) {
      const parts = p.date.split('-');
      const mVal = parseInt(parts[1], 10);
      const m = monthsList.find((x) => x.value === mVal);
      const mName = m ? m.nameHi.split(' - ')[1].split(' (')[0] : `माह ${mVal}`;
      return `${mName} ${parts[0]}`;
    }
    return 'N/A';
  };

  // Export Bulk Excel handler
  const handleExportBulkExcel = () => {
    const monthObj = monthsList.find((m) => m.value === bulkSelectedMonth);
    const monthLabel = bulkSelectedMonth === 'ALL' ? 'All_Months' : (monthObj?.nameEn || `Month_${bulkSelectedMonth}`);
    const filename = `Tax_Vouchers_${monthLabel}_${bulkSelectedYear}`;
    const headers = [
      'Receipt No',
      'Date (DD/MM/YYYY)',
      'कर मांग माह (Charged Period)',
      'कर प्राप्ति माह (Received Month)',
      'Beneficiary Name',
      'Father / Guardian',
      'Samagra ID',
      'Category',
      'Ward No',
      'मोहल्ला (Muhalla)',
      'Tax Type',
      'Tax Demand (₹)',
      'Late Penalty (₹)',
      'Concession (₹)',
      'Paid Amount (₹)',
      'Remaining Dues (₹)',
      'Payment Mode',
      'Remarks'
    ];
    const rows = filteredBulkVouchers.map(({ payment, family }) => [
      payment.receiptNo || `RCP-${String(payment.id).toUpperCase()}`,
      formatDateDDMMYYYY(payment.date),
      getChargedMonthLabel(payment),
      getReceivedMonthLabel(payment),
      family ? `${family.name} ${family.surname}` : payment.familyId,
      family?.guardianName || '-',
      family?.samagraId || '-',
      family?.category || 'APL',
      family?.wardNo || '01',
      family?.muhalla || '-',
      payment.taxType || 'All Taxes',
      payment.previousDues ?? payment.chargedAmount ?? payment.amount,
      payment.penalty || 0,
      payment.concession || 0,
      payment.amount,
      payment.remainingDues || 0,
      payment.mode || 'CASH',
      payment.remarks || '-'
    ]);

    exportToExcel(filename, `Vouchers ${monthLabel} ${bulkSelectedYear}`, headers, rows);
  };

  // Get selected family
  const selectedFamily = useMemo(() => {
    return families.find((f) => f.id === selectedFamilyId);
  }, [families, selectedFamilyId]);

  // Calculate family dues & taxes
  const familyTaxes = useMemo(() => {
    if (!selectedFamilyId) return [];
    return taxes.filter((t) => t.familyId === selectedFamilyId);
  }, [taxes, selectedFamilyId]);

  // Unpaid pending demand bills for family
  const pendingDemandTaxes = useMemo(() => {
    return familyTaxes.filter(
      (t) =>
        t.status !== 'PAID' &&
        (selectedTaxType === 'ALL' || t.type === selectedTaxType)
    );
  }, [familyTaxes, selectedTaxType]);

  const chosenSpecificTax = useMemo(() => {
    if (selectedDemandTaxId === 'ALL') return null;
    return pendingDemandTaxes.find((t) => t.id === selectedDemandTaxId) || null;
  }, [pendingDemandTaxes, selectedDemandTaxId]);

  const totalChargedForFamily = useMemo(() => {
    if (chosenSpecificTax) {
      return chosenSpecificTax.amount;
    }
    if (selectedTaxType === 'ALL') {
      return familyTaxes.reduce((sum, t) => sum + t.amount, 0);
    }
    return familyTaxes.filter((t) => t.type === selectedTaxType).reduce((sum, t) => sum + t.amount, 0);
  }, [familyTaxes, selectedTaxType, chosenSpecificTax]);

  const totalPaidPreviously = useMemo(() => {
    if (!selectedFamilyId) return 0;
    if (chosenSpecificTax) {
      // If paying a specific tax bill, check if any previous payment was made for this exact taxId
      const taxPayments = payments.filter((p) => (p.paidTaxIds && p.paidTaxIds.includes(chosenSpecificTax.id)) || p.taxId === chosenSpecificTax.id);
      return taxPayments.reduce((sum, p) => sum + p.amount, 0);
    }
    const famPayments = payments.filter((p) => p.familyId === selectedFamilyId);
    if (selectedTaxType === 'ALL') {
      return famPayments.reduce((sum, p) => sum + p.amount, 0);
    }
    return famPayments.filter((p) => !p.taxType || p.taxType === selectedTaxType).reduce((sum, p) => sum + p.amount, 0);
  }, [payments, selectedFamilyId, selectedTaxType, chosenSpecificTax]);

  const previousDues = useMemo(() => {
    return Math.max(0, totalChargedForFamily - totalPaidPreviously);
  }, [totalChargedForFamily, totalPaidPreviously]);

  const netPayable = useMemo(() => {
    return Math.max(0, previousDues + Number(penaltyAmount || 0) - Number(concessionAmount || 0));
  }, [previousDues, penaltyAmount, concessionAmount]);

  const remainingDues = useMemo(() => {
    return Math.max(0, netPayable - Number(paymentAmount || 0));
  }, [netPayable, paymentAmount]);

  // Auto set paymentAmount to netPayable whenever selected family or tax type or penalty/concession changes
  useEffect(() => {
    setPaymentAmount(netPayable);
  }, [netPayable]);

  const filteredFamiliesForSelect = families.filter((f) => {
    const q = beneficiarySearch.toLowerCase();
    if (!q) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      f.surname.toLowerCase().includes(q) ||
      f.samagraId.toLowerCase().includes(q) ||
      (f.familyId && f.familyId.toLowerCase().includes(q)) ||
      f.mobile.toLowerCase().includes(q) ||
      (f.wardNo && f.wardNo.toLowerCase().includes(q))
    );
  });

  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedFamilyId) {
      setErrorMsg(isHindi ? '⚠️ कृपया हितग्राही चुनें!' : '⚠️ Please select a beneficiary!');
      return;
    }

    if (paymentAmount <= 0 && netPayable > 0) {
      setErrorMsg(isHindi ? '⚠️ कृपया वैध भुगतान राशि दर्ज करें!' : '⚠️ Please enter a valid payment amount!');
      return;
    }

    // STRICT OVER-PAYMENT VALIDATION RULE
    if (paymentAmount > netPayable) {
      setErrorMsg(
        isHindi
          ? `⚠️ भुगतान राशि (₹${paymentAmount}) कुल देय राशि (₹${netPayable}) से अधिक नहीं हो सकती! कृपया राशि कम करें।`
          : `⚠️ Payment amount (₹${paymentAmount}) cannot exceed net payable amount (₹${netPayable})!`
      );
      return;
    }

    // Determine charged and received month & year
    const pParts = paymentDate.split('-');
    const recMonthNum = parseInt(pParts[1], 10) || (new Date().getMonth() + 1);
    const recYearNum = parseInt(pParts[0], 10) || new Date().getFullYear();
    const recMonthObj = monthsList.find((m) => m.value === recMonthNum);
    const recMonthHindi = recMonthObj ? recMonthObj.nameHi.split(' - ')[1].split(' (')[0] : `माह ${recMonthNum}`;
    const receivedMonthNames = `${recMonthHindi} ${recYearNum}`;

    let paidTaxIds: string[] | undefined = undefined;
    let chargedMonth: number | undefined = undefined;
    let chargedYear: number | undefined = undefined;
    let chargedMonthNames: string | undefined = undefined;

    if (chosenSpecificTax) {
      paidTaxIds = [chosenSpecificTax.id];
      chargedMonth = chosenSpecificTax.month;
      chargedYear = chosenSpecificTax.year;
      const mObj = monthsList.find((m) => m.value === chosenSpecificTax.month);
      const mName = mObj ? mObj.nameHi.split(' - ')[1].split(' (')[0] : `माह ${chosenSpecificTax.month}`;
      chargedMonthNames = `${mName} ${chosenSpecificTax.year} (${chosenSpecificTax.type})`;
    } else if (pendingDemandTaxes.length > 0) {
      paidTaxIds = pendingDemandTaxes.map((t) => t.id);
      chargedMonth = pendingDemandTaxes[0].month;
      chargedYear = pendingDemandTaxes[0].year;
      const uniquePeriodNames = pendingDemandTaxes.map((t) => {
        const mObj = monthsList.find((m) => m.value === t.month);
        const mName = mObj ? mObj.nameHi.split(' - ')[1].split(' (')[0] : `माह ${t.month}`;
        return `${mName} ${t.year}`;
      }).filter((v, i, a) => a.indexOf(v) === i);
      chargedMonthNames = uniquePeriodNames.join(', ');
    } else {
      chargedMonth = recMonthNum;
      chargedYear = recYearNum;
      chargedMonthNames = `${recMonthHindi} ${recYearNum}`;
    }

    onAddPayment(
      selectedFamilyId,
      Number(paymentAmount),
      paymentMode,
      remarks,
      selectedTaxType === 'ALL' ? (chosenSpecificTax ? chosenSpecificTax.type : undefined) : selectedTaxType,
      paymentDate,
      paidTaxIds,
      totalChargedForFamily,
      previousDues,
      Number(penaltyAmount || 0),
      Number(concessionAmount || 0),
      remainingDues,
      chargedMonth,
      chargedYear,
      chargedMonthNames,
      recMonthNum,
      recYearNum,
      receivedMonthNames
    );

    setSuccessMsg(
      isHindi
        ? `🎉 कर रसीद सफलतापूर्वक काटी गई! मांग माह: ${chargedMonthNames} | प्राप्ति माह: ${receivedMonthNames} (प्राप्त राशि: ₹${paymentAmount})`
        : `🎉 Tax Receipt generated! Charged: ${chargedMonthNames} | Received: ${receivedMonthNames} (Paid: ₹${paymentAmount})`
    );
    setTimeout(() => setSuccessMsg(null), 5000);

    // Reset form fields
    setPenaltyAmount(0);
    setConcessionAmount(0);
  };

  const filteredPayments = payments.filter((p) => {
    const family = families.find((f) => f.id === p.familyId);
    const query = searchTerm.toLowerCase();

    const familyName = family ? `${family.name} ${family.surname}`.toLowerCase() : '';
    const guardianName = family ? family.guardianName.toLowerCase() : '';
    const samagraId = family ? family.samagraId.toLowerCase() : '';
    const familyId = family && family.familyId ? family.familyId.toLowerCase() : '';
    const receiptNo = (p.receiptNo || p.id).toLowerCase();
    const mode = (p.mode || '').toLowerCase();
    const pRemarks = (p.remarks || '').toLowerCase();
    const pTaxType = (p.taxType || '').toLowerCase();
    const amountStr = p.amount.toString();

    return (
      familyName.includes(query) ||
      guardianName.includes(query) ||
      samagraId.includes(query) ||
      familyId.includes(query) ||
      receiptNo.includes(query) ||
      mode.includes(query) ||
      pRemarks.includes(query) ||
      pTaxType.includes(query) ||
      amountStr.includes(query) ||
      p.date.includes(query)
    );
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in max-w-7xl">
      {/* STANDARDIZED HEADER WITH BACK AND CLOSE BUTTONS */}
      <ViewHeader
        title={isHindi ? "कर रसीद प्रबंधन एवं बहीखाता" : "Tax Receipt & Ledger Management"}
        subtitle={isHindi ? "करवार नकद, UPI एवं ऑनलाइन भुगतान रसीद काटें, विलंब शुल्क/छूट जोड़ें एवं रसीद वाउचर प्रिंट करें।" : "Record tax receipts, manage penalties/concessions, and print receipt vouchers."}
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
      />

      {successMsg && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-slide-up">
          <span className="text-xl">🧾</span>
          <span className="text-xs sm:text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-xl flex items-center gap-3 animate-slide-up">
          <span className="text-xl">⚠️</span>
          <span className="text-xs sm:text-sm font-bold">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* PAYMENT RECEIPT REGISTRATION FORM */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-md border border-slate-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-black text-slate-900 border-b pb-3 border-slate-100 flex items-center gap-2">
            <span>💳</span>
            <span>{isHindi ? 'कर रसीद पंजीयन (Register Tax Receipt)' : 'Register Tax Receipt'}</span>
          </h3>

          <form onSubmit={handleCollectPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'हितग्राही खोजें व चुनें *' : 'Search & Select Beneficiary *'}
              </label>
              <input
                type="text"
                placeholder={isHindi ? "नाम या समग्र आईडी से खोजें..." : "Filter by Name or Samagra ID..."}
                value={beneficiarySearch}
                onChange={(e) => setBeneficiarySearch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg mb-1.5 bg-slate-50 focus:bg-white"
              />
              <select
                value={selectedFamilyId}
                onChange={(e) => setSelectedFamilyId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-medium"
                required
              >
                {filteredFamiliesForSelect.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.surname} (S-ID: {f.samagraId}, Reg: {formatDateDDMMYYYY(f.registrationDate) || 'N/A'}) [{f.category || 'APL'}]
                  </option>
                ))}
                {filteredFamiliesForSelect.length === 0 && (
                  <option value="" disabled>No beneficiary found matching search</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'कर का प्रकार (Tax Category)' : 'Tax Category'}
              </label>
              <select
                value={selectedTaxType}
                onChange={(e) => {
                  setSelectedTaxType(e.target.value as any);
                  setSelectedDemandTaxId('ALL');
                }}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="ALL">All Combined Taxes (समस्त संयुक्त कर)</option>
                {Object.values(TaxType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* DEMAND TAX / MONTH SPECIFIC SELECTOR */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'मांग बिल व संबंधित माह (Demand Bill & Billing Period) *' : 'Demand Bill / Billing Period *'}
              </label>
              <select
                value={selectedDemandTaxId}
                onChange={(e) => setSelectedDemandTaxId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-indigo-50/40 font-semibold text-indigo-950"
              >
                <option value="ALL">
                  {isHindi
                    ? `समस्त लंबित मांग बिल (${pendingDemandTaxes.length} बिल - कुल ₹${totalChargedForFamily})`
                    : `All Pending Demands (${pendingDemandTaxes.length} bills - Total ₹${totalChargedForFamily})`}
                </option>
                {pendingDemandTaxes.map((tax) => {
                  const mObj = monthsList.find((m) => m.value === tax.month);
                  const mName = mObj ? mObj.nameHi.split(' - ')[1].split(' (')[0] : `माह ${tax.month}`;
                  return (
                    <option key={tax.id} value={tax.id}>
                      {tax.type} - {mName} {tax.year} (बिल क्र: {tax.billNo || tax.id.slice(-6)}) - ₹{tax.amount}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* CHARGED MONTH & RECEIVED MONTH INFO STRIP */}
            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs space-y-1.5 font-medium">
              <div className="flex justify-between items-center text-indigo-950">
                <span className="font-bold">{isHindi ? 'कर मांग माह (Charged Period):' : 'Charged Month:'}</span>
                <span className="bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded font-mono font-bold">
                  {chosenSpecificTax
                    ? `${monthsList.find((m) => m.value === chosenSpecificTax.month)?.nameHi.split(' - ')[1].split(' (')[0] || chosenSpecificTax.month} ${chosenSpecificTax.year}`
                    : pendingDemandTaxes.length > 0
                    ? pendingDemandTaxes.map((t) => `${monthsList.find((m) => m.value === t.month)?.nameHi.split(' - ')[1].split(' (')[0] || t.month} ${t.year}`).filter((v, i, a) => a.indexOf(v) === i).join(', ')
                    : `${monthsList.find((m) => m.value === (parseInt(paymentDate.split('-')[1], 10) || 1))?.nameHi.split(' - ')[1].split(' (')[0]} ${paymentDate.split('-')[0]}`}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-950">
                <span className="font-bold">{isHindi ? 'भुगतान प्राप्ति माह (Received Period):' : 'Received Month:'}</span>
                <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                  {`${monthsList.find((m) => m.value === (parseInt(paymentDate.split('-')[1], 10) || 1))?.nameHi.split(' - ')[1].split(' (')[0] || 'माह'} ${paymentDate.split('-')[0]}`}
                </span>
              </div>
            </div>

            {/* DUES SUMMARY BREAKDOWN BOX */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>{isHindi ? 'पूर्व बकाया / मूल कर (Dues):' : 'Previous Dues:'}</span>
                <span className="font-mono font-bold text-slate-900">₹{previousDues.toLocaleString('en-IN')}</span>
              </div>

              {/* PENALTY AND CONCESSION INPUTS */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-rose-800 uppercase mb-1">
                    + {isHindi ? 'विलंब शुल्क (शास्ति)' : 'Penalty (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={penaltyAmount}
                    onChange={(e) => setPenaltyAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 text-xs border border-rose-200 rounded-lg focus:ring-1 focus:ring-rose-500 font-mono font-bold text-rose-700 bg-rose-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">
                    - {isHindi ? 'छूट / रियायत' : 'Concession (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={concessionAmount}
                    onChange={(e) => setConcessionAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 text-xs border border-emerald-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-emerald-700 bg-emerald-50/50"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-300 font-bold text-slate-900 text-xs">
                <span>{isHindi ? 'कुल देय राशि (Net Payable):' : 'Net Payable:'}</span>
                <span className="font-mono text-sm text-primary font-black">₹{netPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'प्राप्त राशि (Paid ₹) *' : 'Amount Paid (₹) *'}
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary font-mono font-bold text-emerald-700 bg-emerald-50/30"
                  min="0"
                  max={netPayable}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'भुगतान दिनांक *' : 'Payment Date *'}
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* REMAINING DUES PREVIEW */}
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-bold text-amber-900">
              <span>{isHindi ? 'शेष पेंडिंग बकाया (Remaining Dues):' : 'Remaining Balance Dues:'}</span>
              <span className="font-mono text-sm font-black text-rose-700">₹{remainingDues.toLocaleString('en-IN')}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'भुगतान माध्यम (Mode) *' : 'Payment Mode *'}
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-semibold"
              >
                <option value="CASH">💵 CASH (नकद)</option>
                <option value="UPI">📱 UPI / QR Code</option>
                <option value="ONLINE">🌐 ONLINE (ऑनलाइन)</option>
                <option value="NET_BANKING">🏦 Net Banking</option>
                <option value="CHEQUE">📜 Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'टिप्पणी / रिमार्क्स' : 'Remarks / Note'}
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                placeholder="e.g. Tax collection with receipt voucher"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <span>🧾</span>
              <span>{isHindi ? 'रसीद काटें एवं वाउचर जारी करें' : 'Register Receipt & Issue Voucher'}</span>
            </button>

            {selectedFamily && (
              <button
                type="button"
                onClick={() => setMemberCardFamily(selectedFamily)}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-amber-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800 shadow-sm"
              >
                <span>🎴</span>
                <span>{isHindi ? 'सदस्य कार्ड एवं भुगतान इतिहास प्रिंट करें' : 'Print Member Card & Payment Summary'}</span>
              </button>
            )}
          </form>
        </div>

        {/* REGISTERED RECEIPTS SEARCH & HISTORY TABLE */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                <span>🧾</span>
                <span>{isHindi ? `पंजीकृत कर रसीद सूची (${payments.length})` : `Registered Tax Receipts (${payments.length})`}</span>
              </h3>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {isHindi ? 'माह व वर्ष अनुसार थोक वाउचर डाउनलोड एवं प्रिंट करें' : 'Download and bulk print tax vouchers by month & year'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-60">
                <input
                  type="text"
                  placeholder={isHindi ? "नाम, रसीद नंबर, माध्यम..." : "Search by Name, S-ID, Receipt No..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowBulkVoucherModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-teal-500"
                title={isHindi ? 'माह व वर्ष अनुसार थोक कर वाउचर डाउनलोड करें' : 'Bulk Download Tax Vouchers by Month & Year'}
              >
                <span>📥</span>
                <span>{isHindi ? 'थोक वाउचर डाउनलोड (PDF)' : 'Bulk Voucher PDF'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
              <thead className="bg-slate-100/70">
                <tr>
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase">Receipt No</th>
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase">Beneficiary</th>
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase">मांग माह (Charged)</th>
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase">प्राप्ति माह (Received)</th>
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase">Mode</th>
                  <th className="px-3.5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Paid / Dues</th>
                  <th className="px-3.5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Voucher</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredPayments.map((payment) => {
                  const family = families.find((f) => f.id === payment.familyId);
                  const receiptNo = payment.receiptNo || `RCP-${payment.id.toUpperCase()}`;
                  const chargedLabel = getChargedMonthLabel(payment);
                  const receivedLabel = getReceivedMonthLabel(payment);

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-xs font-bold text-primary">
                        {receiptNo}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap font-medium text-slate-800 text-xs">
                        <div>{family ? `${family.name} ${family.surname}` : 'Family ID: ' + payment.familyId}</div>
                        <div className="text-[10px] text-slate-400">S-ID: {family?.samagraId}</div>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-xs">
                        <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                          {chargedLabel}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-xs">
                        <div className="font-semibold text-emerald-800">{receivedLabel}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{formatDateDDMMYYYY(payment.date)}</div>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold border">
                          {payment.mode || 'CASH'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-right font-mono text-xs">
                        <div className="font-bold text-emerald-700">₹{payment.amount.toLocaleString('en-IN')}</div>
                        {payment.remainingDues !== undefined && payment.remainingDues > 0 && (
                          <div className="text-[10px] text-rose-600">Pending: ₹{payment.remainingDues.toLocaleString('en-IN')}</div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-right space-x-1">
                        <button
                          onClick={() => setViewingReceipt(payment)}
                          className="text-xs font-bold text-primary hover:bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200 transition-colors cursor-pointer"
                        >
                          {isHindi ? 'रसीद देखें / प्रिंट' : 'View / Print'}
                        </button>
                        {onDeletePayment && (
                          <button
                            onClick={() => setDeleteConfirmModal({ id: payment.id, receiptNo: payment.receiptNo })}
                            className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            title={isHindi ? 'रसीद निरस्त करें' : 'Delete Receipt'}
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                      No tax receipts found matching "{searchTerm}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL RECEIPT MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 animate-slide-up border-2 border-primary my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* STICKY TOP HEADER WITH CLOSE BUTTON */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧾</span>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {isHindi ? 'डिजिटल कर रसीद वाउचर' : 'Digital Tax Receipt Voucher'}
                </h3>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                className="text-slate-500 hover:text-slate-800 font-bold px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>✕</span> {isHindi ? 'बंद करें (Close)' : 'Close'}
              </button>
            </div>

            {/* RECEIPT CARD CONTENT (SCROLLABLE) */}
            <div className="overflow-y-auto flex-1 py-3 pr-1 space-y-4 my-1">
              <div id="receipt-print-area" className="printable-area p-5 sm:p-7 bg-white border-2 border-dashed border-primary-300 rounded-2xl space-y-5">
                {/* Standardized Panchayat Letterhead Header with Logo */}
                <OfficialVoucherHeader
                  officeDetails={officeDetails}
                  adminPanchayat={admin?.gramPanchayat}
                  voucherTitle="कराधान एवं ई-राजस्व संग्रह पावती (OFFICIAL TAX RECEIPT VOUCHER)"
                  voucherSubTitle="मध्य प्रदेश पंचायत राज एवं ग्राम स्वराज अधिनियम (अधिरोपित कर वसूली पावती)"
                  badgeBgColor="bg-emerald-50 text-emerald-950 border-emerald-300"
                />

                <div className="flex flex-wrap justify-between items-center text-xs text-slate-600 border-b pb-3 border-slate-100 font-mono gap-2">
                  <div>
                    <span className="font-bold text-slate-800">Receipt No:</span>{' '}
                    <strong className="text-primary">{viewingReceipt.receiptNo || `RCP-${viewingReceipt.id.toUpperCase()}`}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Date:</span> {formatDateDDMMYYYY(viewingReceipt.date)}
                  </div>
                </div>

                {/* CHARGED MONTH & RECEIVED MONTH VOUCHER BADGES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-indigo-50/70 border border-indigo-200 p-2.5 rounded-xl text-xs">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <span className="font-bold text-indigo-950">कर मांग माह (Charged Period):</span>
                    <span className="bg-indigo-600 text-white px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                      {getChargedMonthLabel(viewingReceipt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <span className="font-bold text-emerald-950">प्राप्ति माह (Received Month):</span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                      {getReceivedMonthLabel(viewingReceipt)}
                    </span>
                  </div>
                </div>

                {(() => {
                  const fam = families.find((f) => f.id === viewingReceipt.familyId);
                  return (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <p>
                        <strong className="text-slate-700 w-28 inline-block">Beneficiary Head:</strong>{' '}
                        <span className="font-bold text-slate-900">{fam ? `${fam.name} ${fam.surname}` : 'N/A'}</span>
                      </p>
                      <p>
                        <strong className="text-slate-700 w-28 inline-block">Category (श्रेणी):</strong>{' '}
                        <span className="font-bold text-amber-800">{fam?.category || 'APL'}</span>
                      </p>
                      <p>
                        <strong className="text-slate-700 w-28 inline-block">Samagra ID:</strong>{' '}
                        <span className="font-mono font-semibold">{fam?.samagraId}</span> | Family ID: <span className="font-mono">{fam?.familyId || 'N/A'}</span>
                      </p>
                      <p>
                        <strong className="text-slate-700 w-28 inline-block">Ward & Muhalla:</strong> Ward {fam?.wardNo || '01'}, {fam?.muhalla || 'N/A'}
                      </p>
                    </div>
                  );
                })()}

                {/* DETAILED FINANCIAL BREAKDOWN TABLE */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left">विवरण (Particulars)</th>
                        <th className="px-3 py-2 text-right">राशि (Amount in ₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      <tr>
                        <td className="px-3 py-2">
                          <div>मूल कर मांग / पूर्व बकाया (Tax Demand / Previous Dues)</div>
                          <div className="text-[10px] text-indigo-700 font-mono">
                            मांग अवधि: {getChargedMonthLabel(viewingReceipt)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          ₹{(viewingReceipt.previousDues ?? viewingReceipt.chargedAmount ?? viewingReceipt.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                      {viewingReceipt.penalty !== undefined && viewingReceipt.penalty > 0 && (
                        <tr className="text-rose-700 font-semibold bg-rose-50/40">
                          <td className="px-3 py-2">+ विलंब शुल्क / शास्ति (Late Penalty)</td>
                          <td className="px-3 py-2 text-right font-mono">+₹{viewingReceipt.penalty.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      {viewingReceipt.concession !== undefined && viewingReceipt.concession > 0 && (
                        <tr className="text-emerald-700 font-semibold bg-emerald-50/40">
                          <td className="px-3 py-2">- छूट / रियायत (Concession / Discount)</td>
                          <td className="px-3 py-2 text-right font-mono">-₹{viewingReceipt.concession.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      <tr className="bg-emerald-100/70 font-black text-emerald-900 border-t-2 border-emerald-300">
                        <td className="px-3 py-2">
                          <div>कुल प्राप्त भुगतान (Total Amount Paid & Received)</div>
                          <div className="text-[10px] text-emerald-800 font-mono font-normal">
                            प्राप्ति माह: {getReceivedMonthLabel(viewingReceipt)} ({viewingReceipt.mode || 'CASH'})
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm">
                          ₹{viewingReceipt.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                      {viewingReceipt.remainingDues !== undefined && viewingReceipt.remainingDues > 0 && (
                        <tr className="bg-rose-50 text-rose-800 font-bold border-t border-rose-200">
                          <td className="px-3 py-2">शेष पेंडिंग बकाया (Net Remaining Pending Dues)</td>
                          <td className="px-3 py-2 text-right font-mono">
                            ₹{viewingReceipt.remainingDues.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-slate-500 italic">
                  Note: {viewingReceipt.remarks || 'Official tax collection receipt issued by Gram Panchayat office.'}
                </p>

                <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
                  <div className="text-center">
                    {officeDetails?.qrCodeUrl ? (
                      <img src={officeDetails.qrCodeUrl} alt="Payment Barcode QR" className="w-16 h-16 object-contain border border-slate-300 rounded p-0.5 bg-white mx-auto" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded flex items-center justify-center font-mono text-[9px] text-slate-400">
                        [ QR Code ]
                      </div>
                    )}
                    <span className="block mt-1 font-bold text-slate-700 text-[10px]">डिजिटल पावती सील</span>
                  </div>

                  <div className="text-center space-y-6">
                    <div className="border-b-2 border-slate-800 w-44 mx-auto"></div>
                    <div>
                      <p className="font-black text-slate-900 text-xs">{officeDetails?.secretaryName || admin?.name || 'ग्राम पंचायत सचिव'}</p>
                      <p className="font-bold text-slate-600 text-[10px]">ग्राम पंचायत सचिव / प्राधिकृत हस्ताक्षर</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STICKY BOTTOM ACTION BAR WITH PRINT, DELETE AND CLOSE BUTTONS */}
            <div className="flex items-center justify-between gap-3 print:hidden pt-3 border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ✕ {isHindi ? 'बंद करें (Close)' : 'Close'}
                </button>
                {onDeletePayment && viewingReceipt && (
                  <button
                    onClick={() => setDeleteConfirmModal({ id: viewingReceipt.id, receiptNo: viewingReceipt.receiptNo })}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-rose-200 flex items-center gap-1"
                  >
                    <span>🗑️</span>
                    <span>{isHindi ? 'रसीद निरस्त करें' : 'Delete Receipt'}</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  try {
                    triggerPrint('receipt-print-area');
                  } catch (e) {
                    console.error('Print failed:', e);
                  }
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
              >
                <span>🖨️</span> {isHindi ? 'रसीद पावती प्रिंट करें (Print / Download Receipt)' : 'Print / Download Receipt Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER CARD & PAYMENT HISTORY MODAL */}
      {memberCardFamily && (() => {
        const famTaxes = taxes.filter(t => t.familyId === memberCardFamily.id);
        const famPayments = payments.filter(p => p.familyId === memberCardFamily.id);
        const totalCharged = famTaxes.reduce((s, t) => s + t.amount, 0);
        const totalPaid = famPayments.reduce((s, p) => s + p.amount, 0);
        const netDues = Math.max(0, totalCharged - totalPaid);
        const isFullyPaid = netDues === 0 && famTaxes.length > 0;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 border-2 border-primary my-auto max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎴</span>
                  <h3 className="text-base font-black text-slate-900">
                    {isHindi ? 'करदाता सदस्य कार्ड एवं भुगतान इतिहास पावती' : 'Taxpayer Member Card & Payment History'}
                  </h3>
                </div>
                <button
                  onClick={() => setMemberCardFamily(null)}
                  className="text-slate-500 hover:text-slate-800 font-bold px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs cursor-pointer"
                >
                  ✕ {isHindi ? 'बंद करें' : 'Close'}
                </button>
              </div>

              <div className="overflow-y-auto flex-1 py-3 pr-1 space-y-4 my-1">
                <div id="member-card-printable" className="printable-area p-5 sm:p-7 bg-white border-2 border-slate-800 rounded-2xl space-y-5">
                  {/* Standardized Panchayat Letterhead Header with Logo */}
                  <OfficialVoucherHeader
                    officeDetails={officeDetails}
                    adminPanchayat={admin?.gramPanchayat}
                    voucherTitle="करदाता सदस्य पहचान एवं भुगतान इतिहास कार्ड (TAXPAYER MEMBER CARD)"
                    voucherSubTitle="ग्राम पंचायत कराधान एवं करदाता परिवार खाता विवरणी"
                    badgeBgColor="bg-amber-50 text-amber-950 border-amber-300"
                  />

                  {/* MEMBER PROFILE GRID */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs">
                    <div>
                      <p><span className="text-slate-500 font-bold">{isHindi ? 'मुखिया नाम:' : 'Head Name:'}</span> <strong className="text-slate-900 text-sm">{memberCardFamily.name} {memberCardFamily.surname}</strong></p>
                      <p><span className="text-slate-500 font-bold">{isHindi ? 'पिता/पति:' : 'Guardian:'}</span> {memberCardFamily.guardianName}</p>
                      <p><span className="text-slate-500 font-bold">Samagra ID:</span> <span className="font-mono font-bold text-primary">{memberCardFamily.samagraId}</span></p>
                      <p><span className="text-slate-500 font-bold">Family ID:</span> <span className="font-mono">{memberCardFamily.familyId || 'N/A'}</span></p>
                    </div>
                    <div>
                      <p><span className="text-slate-500 font-bold">{isHindi ? 'श्रेणी (Category):' : 'Category:'}</span> <strong className="text-amber-800">{memberCardFamily.category || 'APL'}</strong></p>
                      <p><span className="text-slate-500 font-bold">{isHindi ? 'वार्ड सं.:' : 'Ward No:'}</span> Ward {memberCardFamily.wardNo || '01'}, {memberCardFamily.muhalla || ''}</p>
                      <p><span className="text-slate-500 font-bold">{isHindi ? 'संपर्क नंबर:' : 'Mobile:'}</span> {memberCardFamily.mobile}</p>
                      <p><span className="text-slate-500 font-bold">{isHindi ? 'पंजीयन दिनांक:' : 'Reg Date:'}</span> {formatDateDDMMYYYY(memberCardFamily.registrationDate) || 'N/A'}</p>
                    </div>
                  </div>

                  {/* PAYMENT STATUS BADGE */}
                  <div className={`p-3.5 rounded-xl border-2 text-center font-black text-xs ${
                    isFullyPaid ? 'bg-emerald-100 border-emerald-500 text-emerald-950' : 'bg-rose-100 border-rose-500 text-rose-950'
                  }`}>
                    {isFullyPaid ? (
                      <div>
                        <span className="text-base">✅</span> {isHindi ? 'समस्त कर देयता पूर्ण चुकता (ALL TAX DUES FULLY PAID & CLEARED)' : 'ALL TAX DUES FULLY PAID & CLEARED'}
                        <div className="text-[11px] font-normal text-emerald-800 mt-0.5">
                          {isHindi ? 'इस करदाता द्वारा पंचायत के समस्त करों का भुगतान पूर्ण कर लिया गया है।' : 'Taxpayer has successfully paid all levied Panchayat tax demands.'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-base">⏳</span> {isHindi ? `बकाया कर देय राशि: ₹${netDues.toLocaleString('en-IN')}` : `OUTSTANDING DUES PENDING: ₹${netDues.toLocaleString('en-IN')}`}
                        <div className="text-[11px] font-normal text-rose-800 mt-0.5">
                          {isHindi ? 'कृपया बकाया राशि का भुगतान शीघ्रातिशीघ्र जमा करें।' : 'Please pay the pending tax amount at the earliest.'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PREVIOUS INVOICES & PAYMENTS HISTORY TABLE */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 border-b pb-1">
                      {isHindi ? 'भुगतान रसीद एवं पूर्व बकाया जमा विवरण (Payment Invoices & Receipts)' : 'Payment Invoices & Receipts History'}
                    </h4>
                    <table className="min-w-full divide-y divide-slate-300 border border-slate-300 text-xs">
                      <thead className="bg-slate-100 font-bold text-slate-700">
                        <tr>
                          <th className="px-3 py-1.5 text-left">Receipt No</th>
                          <th className="px-3 py-1.5 text-left">Date</th>
                          <th className="px-3 py-1.5 text-left">Tax Category</th>
                          <th className="px-3 py-1.5 text-left">Mode</th>
                          <th className="px-3 py-1.5 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                        {famPayments.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-1.5 font-mono font-bold text-primary">{p.receiptNo || p.id}</td>
                            <td className="px-3 py-1.5">{formatDateDDMMYYYY(p.date)}</td>
                            <td className="px-3 py-1.5">{p.taxType || 'All Taxes'}</td>
                            <td className="px-3 py-1.5 font-bold text-slate-600">{p.mode || 'CASH'}</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        {famPayments.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-3 text-slate-400">No payment receipts issued yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-4 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
                    <div>
                      <p>Card Generated Date: {formatDateDDMMYYYY(new Date())}</p>
                      <p>Digital Taxpayer Document • Gram Panchayat Portal</p>
                    </div>
                    <div className="text-center font-bold text-slate-800">
                      <p className="border-b border-slate-800 pb-1 mb-1">{officeDetails?.secretaryName || admin?.name || 'सचिव'}</p>
                      <p>ग्राम पंचायत सचिव / हस्ताक्षर</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200 shrink-0">
                <button
                  onClick={() => setMemberCardFamily(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  ✕ {isHindi ? 'बंद करें' : 'Close'}
                </button>
                <button
                  onClick={() => triggerPrint('member-card-printable')}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-amber-300 font-black rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>🖨️</span> {isHindi ? 'सदस्य कार्ड प्रिंट करें' : 'Print Member Card'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              🗑️
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isHindi ? 'भुगतान रसीद निरस्त करने की पुष्टि करें' : 'Confirm Receipt Cancellation'}
              </h3>
              <p className="text-slate-600 text-xs mt-1">
                {isHindi
                  ? `क्या आप निश्चित रूप से रसीद सं. "${deleteConfirmModal.receiptNo}" को निरस्त/हटाना चाहते हैं?`
                  : `Are you sure you want to cancel/delete Receipt No. "${deleteConfirmModal.receiptNo}"?`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                {isHindi ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeletePayment) {
                    onDeletePayment(deleteConfirmModal.id);
                  }
                  if (viewingReceipt?.id === deleteConfirmModal.id) {
                    setViewingReceipt(null);
                  }
                  setDeleteConfirmModal(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                {isHindi ? 'हाँ, निरस्त करें (Yes, Delete)' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BULK TAX VOUCHERS DOWNLOAD & PRINT MODAL ==================== */}
      {showBulkVoucherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fade-in my-auto">
            
            {/* MODAL HEADER */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                  📥
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black leading-tight">
                    {isHindi ? 'माह व वर्ष अनुसार थोक कर वाउचर डाउनलोड (Bulk Tax Voucher PDF)' : 'Bulk Tax Voucher Download & Print'}
                  </h3>
                  <p className="text-xs text-teal-100/90 font-medium">
                    {isHindi
                      ? 'माह व वर्ष चुनकर सभी कर रसीद वाउचर एक साथ PDF फाइल में डाउनलोड अथवा प्रिंट करें।'
                      : 'Select month & year to download multi-page tax receipt vouchers in official PDF format.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBulkVoucherModal(false)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>✕</span>
                <span className="hidden sm:inline">{isHindi ? 'बंद करें' : 'Close'}</span>
              </button>
            </div>

            {/* FILTER CONTROLS BAR */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                
                {/* MONTH SELECTOR */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    📅 {isHindi ? 'माह चुनें (Select Month)' : 'Select Month'}
                  </label>
                  <select
                    value={bulkSelectedMonth}
                    onChange={(e) => setBulkSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 shadow-sm"
                  >
                    {monthsList.map((m) => (
                      <option key={m.value} value={m.value}>
                        {isHindi ? m.nameHi : m.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* YEAR SELECTOR */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    📆 {isHindi ? 'वर्ष चुनें (Select Year)' : 'Select Year'}
                  </label>
                  <select
                    value={bulkSelectedYear}
                    onChange={(e) => setBulkSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 shadow-sm font-mono"
                  >
                    {yearsList.map((y) => (
                      <option key={y} value={y}>
                        {y} {isHindi ? '(वित्तीय/कैलेंडर वर्ष)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TAX TYPE FILTER */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    🏷️ {isHindi ? 'कर का प्रकार (Tax Type)' : 'Tax Type'}
                  </label>
                  <select
                    value={bulkSelectedTaxType}
                    onChange={(e) => setBulkSelectedTaxType(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 shadow-sm"
                  >
                    <option value="ALL">{isHindi ? 'सभी कर (All Taxes)' : 'All Taxes'}</option>
                    {Object.values(TaxType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* WARD FILTER */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    🏘️ {isHindi ? 'वार्ड संख्या (Ward No)' : 'Ward No'}
                  </label>
                  <select
                    value={bulkSelectedWard}
                    onChange={(e) => setBulkSelectedWard(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 shadow-sm"
                  >
                    <option value="ALL">{isHindi ? 'सभी वार्ड (All Wards)' : 'All Wards'}</option>
                    {Array.from(new Set(families.map((f) => f.wardNo || '01')))
                      .sort()
                      .map((w) => (
                        <option key={w} value={w}>
                          Ward {w}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* SUMMARY STATS & ACTION BUTTONS STRIP */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-teal-100 text-teal-900 rounded-lg text-xs font-bold border border-teal-200">
                    🧾 {isHindi ? 'कुल वाउचर:' : 'Total Vouchers:'} <strong className="font-mono text-sm">{filteredBulkVouchers.length}</strong>
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold border border-emerald-200">
                    💰 {isHindi ? 'कुल प्राप्त राशि:' : 'Total Collected:'} <strong className="font-mono text-sm">₹{bulkTotalAmount.toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-bold border border-amber-200">
                    ⏳ {isHindi ? 'कुल शेष बकाया:' : 'Remaining Dues:'} <strong className="font-mono text-sm">₹{bulkTotalRemaining.toLocaleString('en-IN')}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* DOWNLOAD MULTI-PAGE PDF BUTTON */}
                  <button
                    type="button"
                    onClick={handleDownloadBulkPDF}
                    disabled={filteredBulkVouchers.length === 0}
                    className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      filteredBulkVouchers.length === 0
                        ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                        : 'bg-rose-600 hover:bg-rose-700 active:scale-95'
                    }`}
                    title={isHindi ? 'सभी चयनित वाउचर की संयुक्त PDF फाइल डाउनलोड करें' : 'Download multi-voucher PDF file'}
                  >
                    <span>📥</span>
                    <span>{isHindi ? 'PDF फाइल डाउनलोड करें' : 'Download PDF File'}</span>
                  </button>

                  {/* BULK PRINT / BROWSER PRINT TO PDF */}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        triggerPrint('bulk-vouchers-print-area');
                      } catch (e) {
                        console.error('Bulk voucher print error:', e);
                      }
                    }}
                    disabled={filteredBulkVouchers.length === 0}
                    className={`px-3.5 py-2 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      filteredBulkVouchers.length === 0
                        ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                        : 'bg-slate-900 hover:bg-black active:scale-95 text-amber-300'
                    }`}
                    title={isHindi ? 'वाउचर बुक प्रिंट करें अथवा PDF के रूप में सेव करें' : 'Print Voucher Book or Save to PDF'}
                  >
                    <span>🖨️</span>
                    <span>{isHindi ? 'थोक प्रिंट / वाउचर बुक' : 'Bulk Print Book'}</span>
                  </button>

                  {/* EXCEL EXPORT */}
                  <button
                    type="button"
                    onClick={handleExportBulkExcel}
                    disabled={filteredBulkVouchers.length === 0}
                    className={`px-3 py-2 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                      filteredBulkVouchers.length === 0
                        ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                    title="Export list to Excel"
                  >
                    <span>📊</span>
                    <span>Excel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TAB SWITCHER: LIST VIEW vs SLIP PREVIEW */}
            <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkViewMode('LIST')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    bulkViewMode === 'LIST' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  📋 {isHindi ? 'तालिका सूची (Table List)' : 'Table List'}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkViewMode('PREVIEW')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    bulkViewMode === 'PREVIEW' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🧾 {isHindi ? 'वाउचर स्लिप प्रीव्यू (Voucher Slips Preview)' : 'Voucher Slips Preview'}
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                {bulkSelectedMonth === 'ALL'
                  ? (isHindi ? `सभी माह ${bulkSelectedYear}` : `All Months ${bulkSelectedYear}`)
                  : `${monthsList.find((m) => m.value === bulkSelectedMonth)?.nameEn} ${bulkSelectedYear}`}
              </span>
            </div>

            {/* MODAL CONTENT BODY */}
            <div className="p-4 overflow-y-auto flex-1 bg-slate-100/50">
              {filteredBulkVouchers.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-4xl">📭</div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {isHindi ? 'चयनित माह एवं वर्ष में कोई कर रसीद वाउचर उपलब्ध नहीं है।' : 'No tax receipt vouchers found for the selected period.'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {isHindi
                      ? 'कृपया ऊपर दिए गए फिल्टर से दूसरा माह अथवा वर्ष चुनें अथवा नई कर रसीद जारी करें।'
                      : 'Please change the month/year filter above or issue new tax receipts to generate vouchers.'}
                  </p>
                </div>
              ) : bulkViewMode === 'LIST' ? (
                /* TABLE VIEW */
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-100/80 font-bold text-slate-600 uppercase">
                        <tr>
                          <th className="px-3.5 py-2.5 text-left">S.No</th>
                          <th className="px-3.5 py-2.5 text-left">Receipt No</th>
                          <th className="px-3.5 py-2.5 text-left">Date</th>
                          <th className="px-3.5 py-2.5 text-left">Beneficiary Name</th>
                          <th className="px-3.5 py-2.5 text-left">Samagra / Ward</th>
                          <th className="px-3.5 py-2.5 text-left">Tax Type</th>
                          <th className="px-3.5 py-2.5 text-right">Tax Demand</th>
                          <th className="px-3.5 py-2.5 text-right">Paid Amount</th>
                          <th className="px-3.5 py-2.5 text-right">Remaining</th>
                          <th className="px-3.5 py-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBulkVouchers.map(({ payment, family }, index) => {
                          const receiptNo = payment.receiptNo || `RCP-${String(payment.id).toUpperCase()}`;
                          const prevDues = payment.previousDues ?? payment.chargedAmount ?? payment.amount;

                          return (
                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-2.5 font-bold text-slate-400">{index + 1}</td>
                              <td className="px-3.5 py-2.5 font-mono font-bold text-teal-700">{receiptNo}</td>
                              <td className="px-3.5 py-2.5 font-mono text-slate-600">{formatDateDDMMYYYY(payment.date)}</td>
                              <td className="px-3.5 py-2.5 font-bold text-slate-900">
                                {family ? `${family.name} ${family.surname}` : `ID: ${payment.familyId}`}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-600">
                                <div>S-ID: {family?.samagraId || '-'}</div>
                                <div className="text-[10px] text-slate-400">Ward {family?.wardNo || '01'}</div>
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-700 font-semibold">{payment.taxType || 'All Taxes'}</td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">₹{Number(prevDues).toLocaleString('en-IN')}</td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700">
                                ₹{payment.amount.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 block font-sans">({payment.mode || 'CASH'})</span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-rose-600">
                                ₹{(payment.remainingDues || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-3.5 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingReceipt(payment);
                                    setShowBulkVoucherModal(false);
                                  }}
                                  className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg text-[11px] border border-teal-200 transition-colors"
                                >
                                  👁️ {isHindi ? 'देखें' : 'View'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* PREVIEW OF SLIPS IN MODAL */
                <div className="space-y-6">
                  {filteredBulkVouchers.map(({ payment, family }, index) => {
                    const receiptNo = payment.receiptNo || `RCP-${String(payment.id).toUpperCase()}`;
                    const prevDues = payment.previousDues ?? payment.chargedAmount ?? payment.amount;

                    return (
                      <div key={payment.id} className="p-5 bg-white rounded-xl shadow-sm border border-slate-300 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3 border-slate-200">
                          <div>
                            <h4 className="text-base font-black text-slate-900">
                              {getCleanOfficeTitle(officeDetails, admin?.gramPanchayat)}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-semibold">
                              कराधान एवं ई-राजस्व संग्रह पावती (Official Tax Receipt Voucher) • #{index + 1}
                            </p>
                          </div>

                          <div className="text-right font-mono text-xs">
                            <p><span className="font-bold text-slate-700">Receipt No:</span> <strong className="text-teal-700">{receiptNo}</strong></p>
                            <p><span className="font-bold text-slate-700">Date:</span> <strong>{formatDateDDMMYYYY(payment.date)}</strong></p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                          <div>
                            <p><strong className="text-slate-600">Beneficiary:</strong> <span className="font-bold text-slate-900">{family ? `${family.name} ${family.surname}` : 'N/A'}</span></p>
                            <p><strong className="text-slate-600">Category:</strong> <span className="font-bold text-amber-800">{family?.category || 'APL'}</span> | S-ID: <span className="font-mono">{family?.samagraId || '-'}</span></p>
                            <p><strong className="text-slate-600">Address:</strong> Ward {family?.wardNo || '01'}, {family?.muhalla || '-'}</p>
                          </div>
                          <div>
                            <p><strong className="text-slate-600">Tax Type:</strong> <span className="font-bold text-slate-900">{payment.taxType || 'All Taxes'}</span></p>
                            <p><strong className="text-slate-600">Payment Mode:</strong> <span className="font-bold text-emerald-800">{payment.mode || 'CASH'}</span></p>
                            <p><strong className="text-slate-600">Remarks:</strong> <span className="text-slate-700">{payment.remarks || 'Tax Payment'}</span></p>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100 font-bold text-slate-700">
                              <tr>
                                <th className="px-3 py-1.5 text-left">विवरण (Particulars)</th>
                                <th className="px-3 py-1.5 text-right">राशि (Amount ₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              <tr>
                                <td className="px-3 py-1.5">मूल कर मांग / पूर्व बकाया (Tax Demand / Previous Dues)</td>
                                <td className="px-3 py-1.5 text-right font-mono">₹{Number(prevDues).toLocaleString('en-IN')}</td>
                              </tr>
                              {payment.penalty !== undefined && payment.penalty > 0 && (
                                <tr className="text-rose-700 bg-rose-50/40">
                                  <td className="px-3 py-1.5">+ विलंब शुल्क / शास्ति (Late Penalty)</td>
                                  <td className="px-3 py-1.5 text-right font-mono">+₹{Number(payment.penalty).toLocaleString('en-IN')}</td>
                                </tr>
                              )}
                              {payment.concession !== undefined && payment.concession > 0 && (
                                <tr className="text-emerald-700 bg-emerald-50/40">
                                  <td className="px-3 py-1.5">- छूट / रियायत (Concession / Rebate)</td>
                                  <td className="px-3 py-1.5 text-right font-mono">-₹{Number(payment.concession).toLocaleString('en-IN')}</td>
                                </tr>
                              )}
                              <tr className="bg-teal-50 font-bold text-teal-900">
                                <td className="px-3 py-1.5">कुल प्राप्त भुगतान (Total Paid & Received)</td>
                                <td className="px-3 py-1.5 text-right font-mono text-sm font-black">₹{payment.amount.toLocaleString('en-IN')}</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-1.5 text-slate-600">शेष बकाया राशि (Remaining Dues)</td>
                                <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-600">₹{(payment.remainingDues || 0).toLocaleString('en-IN')}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-between items-center pt-2 text-[10px] text-slate-500 border-t border-slate-200">
                          <span>Official Computer-Generated Tax Voucher • Gram Panchayat Portal</span>
                          <span className="font-bold text-slate-800">{officeDetails?.secretaryName || admin?.name || 'ग्राम पंचायत सचिव'} (हस्ताक्षर)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* HIDDEN PRINTABLE BULK VOUCHERS CONTAINER FOR 1-CLICK BROWSER PRINT TO PDF */}
            <div id="bulk-vouchers-print-area" className="hidden print:block">
              {filteredBulkVouchers.map(({ payment, family }, index) => {
                const receiptNo = payment.receiptNo || `RCP-${String(payment.id).toUpperCase()}`;
                const prevDues = payment.previousDues ?? payment.chargedAmount ?? payment.amount;

                return (
                  <div
                    key={`print-${payment.id}`}
                    className="p-6 bg-white border-2 border-dashed border-teal-700 rounded-xl mb-8 space-y-4"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    <div className="text-center border-b-2 pb-3 border-teal-800 space-y-1">
                      <h2 className="text-xl font-black text-slate-900">
                        {getCleanOfficeTitle(officeDetails, admin?.gramPanchayat)}
                      </h2>
                      <p className="text-xs text-slate-600 font-semibold">
                        {officeDetails?.address 
                          ? officeDetails.address 
                          : `ग्राम पंचायत ${admin?.gramPanchayat || ''}, जनपद ${officeDetails?.block || admin?.block || ''}, जिला ${officeDetails?.district || admin?.district || ''}`}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        कराधान एवं ई-राजस्व संग्रह पावती (Official Tax Receipt Voucher)
                      </p>
                    </div>

                    <div className="flex justify-between text-xs text-slate-700 border-b pb-2 border-slate-200 font-mono">
                      <div>
                        <span className="font-bold">Receipt No:</span> <strong className="text-teal-800">{receiptNo}</strong>
                      </div>
                      <div>
                        <span className="font-bold">Date:</span> <strong>{formatDateDDMMYYYY(payment.date)}</strong>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 text-xs space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <p><strong className="text-slate-600">Beneficiary Head:</strong> <span className="font-bold text-slate-900">{family ? `${family.name} ${family.surname}` : 'N/A'}</span></p>
                        <p><strong className="text-slate-600">Tax Type:</strong> <span className="font-bold text-slate-900">{payment.taxType || 'All Taxes'}</span></p>
                        <p><strong className="text-slate-600">Category / S-ID:</strong> <span className="font-bold text-amber-900">{family?.category || 'APL'}</span> | S-ID: <span className="font-mono">{family?.samagraId || '-'}</span></p>
                        <p><strong className="text-slate-600">Payment Mode:</strong> <span className="font-bold text-emerald-800">{payment.mode || 'CASH'}</span></p>
                        <p className="col-span-2"><strong className="text-slate-600">Ward & Muhalla:</strong> Ward {family?.wardNo || '01'}, {family?.muhalla || '-'}</p>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                      <table className="min-w-full divide-y divide-slate-300">
                        <thead className="bg-slate-100 font-bold text-slate-800">
                          <tr>
                            <th className="px-3 py-2 text-left">विवरण (Particulars)</th>
                            <th className="px-3 py-2 text-right">राशि (Amount ₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="px-3 py-1.5">मूल कर मांग / पूर्व बकाया (Tax Demand / Previous Dues)</td>
                            <td className="px-3 py-1.5 text-right font-mono">₹{Number(prevDues).toLocaleString('en-IN')}</td>
                          </tr>
                          {payment.penalty !== undefined && payment.penalty > 0 && (
                            <tr className="text-rose-700">
                              <td className="px-3 py-1.5">+ विलंब शुल्क / शास्ति (Late Penalty)</td>
                              <td className="px-3 py-1.5 text-right font-mono">+₹{Number(payment.penalty).toLocaleString('en-IN')}</td>
                            </tr>
                          )}
                          {payment.concession !== undefined && payment.concession > 0 && (
                            <tr className="text-emerald-700">
                              <td className="px-3 py-1.5">- छूट / रियायत (Concession / Rebate)</td>
                              <td className="px-3 py-1.5 text-right font-mono">-₹{Number(payment.concession).toLocaleString('en-IN')}</td>
                            </tr>
                          )}
                          <tr className="bg-teal-50 font-black text-teal-950">
                            <td className="px-3 py-2">कुल प्राप्त भुगतान (Total Paid & Received)</td>
                            <td className="px-3 py-2 text-right font-mono text-sm">₹{payment.amount.toLocaleString('en-IN')} ({payment.mode || 'CASH'})</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-slate-600">शेष बकाया राशि (Remaining Dues)</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-600">₹{(payment.remainingDues || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="pt-4 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-600">
                      <div>
                        <p>{payment.remarks ? `Note: ${payment.remarks}` : 'Official Computer-Generated Tax Receipt Voucher'}</p>
                        <p>Date: {formatDateDDMMYYYY(new Date())} • Gram Panchayat Tax Portal</p>
                      </div>
                      <div className="text-center font-bold text-slate-900">
                        <p className="border-b border-slate-800 pb-1 mb-1">{officeDetails?.secretaryName || admin?.name || 'सचिव'}</p>
                        <p>ग्राम पंचायत सचिव / हस्ताक्षर</p>
                      </div>
                    </div>

                    {index % 2 === 0 && index < filteredBulkVouchers.length - 1 && (
                      <div className="pt-4 text-center text-[9px] text-slate-400 font-mono">
                        ✂----------------------------- CUT HERE (Official Voucher Copy) -----------------------------✂
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {isHindi ? `चयनित अवधि में ${filteredBulkVouchers.length} वाउचर उपलब्ध` : `${filteredBulkVouchers.length} vouchers in selected period`}
              </span>
              <button
                type="button"
                onClick={() => setShowBulkVoucherModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {isHindi ? 'बंद करें (Close)' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReceiptManagementView;
