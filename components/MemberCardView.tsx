import React, { useState, useMemo, useEffect } from 'react';
import {
  Family,
  Tax,
  Payment,
  OfficeDetails,
  Admin,
  BookingRentRecord,
  BuildingPermissionRecord,
} from '../types';
import ViewHeader from './ViewHeader';
import OfficialVoucherHeader from './OfficialVoucherHeader';
import {
  getCleanOfficeTitle,
  getCleanOfficeSubtitle,
  getOfficeLogoUrl,
  formatDateDDMMYYYY,
  formatCurrency,
  getMonthName,
  triggerPrint,
  DEFAULT_OFFICE_LOGO,
} from '../utils/printUtils';

interface MemberCardViewProps {
  families: Family[];
  taxes: Tax[];
  payments: Payment[];
  officeDetails: OfficeDetails;
  admin: Admin | null;
  initialFamilyId?: string;
  bookingRents?: BookingRentRecord[];
  buildingPermissions?: BuildingPermissionRecord[];
  onBack?: () => void;
  onClose?: () => void;
  onSelectFamily?: (fam: Family) => void;
  onReceivePayment?: (
    fam: Family,
    selectedTaxIds?: string[],
    suggestedAmount?: number
  ) => void;
  isHindi?: boolean;
}

export const MemberCardView: React.FC<MemberCardViewProps> = ({
  families,
  taxes,
  payments,
  officeDetails,
  admin,
  initialFamilyId,
  bookingRents = [],
  buildingPermissions = [],
  onBack,
  onClose,
  onReceivePayment,
  isHindi = true,
}) => {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(
    initialFamilyId || families[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);

  // Keep selectedFamilyId in sync if initialFamilyId changes
  useEffect(() => {
    if (initialFamilyId) {
      setSelectedFamilyId(initialFamilyId);
      setSelectedVoucherIds([]);
    }
  }, [initialFamilyId]);

  // Filter beneficiaries list for search / selection
  const filteredFamilies = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return families;
    return families.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.surname.toLowerCase().includes(q) ||
        f.samagraId.toLowerCase().includes(q) ||
        (f.familyId && f.familyId.toLowerCase().includes(q)) ||
        f.mobile.toLowerCase().includes(q) ||
        (f.guardianName && f.guardianName.toLowerCase().includes(q)) ||
        (f.wardNo && f.wardNo.toLowerCase().includes(q)) ||
        (f.muhalla && f.muhalla.toLowerCase().includes(q))
    );
  }, [families, searchTerm]);

  // Currently selected family (strictly isolated to chosen beneficiary)
  const selectedFamily = useMemo(() => {
    if (selectedFamilyId) {
      const match = families.find((f) => f.id === selectedFamilyId);
      if (match) return match;
    }
    if (initialFamilyId) {
      const match = families.find((f) => f.id === initialFamilyId);
      if (match) return match;
    }
    return families[0] || null;
  }, [families, selectedFamilyId, initialFamilyId]);

  // Family-specific datasets
  const familyTaxes = useMemo(() => {
    if (!selectedFamily) return [];
    return taxes.filter((t) => t.familyId === selectedFamily.id);
  }, [taxes, selectedFamily]);

  const familyPayments = useMemo(() => {
    if (!selectedFamily) return [];
    return payments.filter((p) => p.familyId === selectedFamily.id);
  }, [payments, selectedFamily]);

  const familyBookings = useMemo(() => {
    if (!selectedFamily) return [];
    return bookingRents.filter(
      (b) =>
        b.familyId === selectedFamily.id ||
        (b.samagraId && b.samagraId === selectedFamily.samagraId)
    );
  }, [bookingRents, selectedFamily]);

  const familyBuildingPermissions = useMemo(() => {
    if (!selectedFamily) return [];
    return buildingPermissions.filter(
      (bp) =>
        bp.familyId === selectedFamily.id ||
        (bp.samagraId && bp.samagraId === selectedFamily.samagraId)
    );
  }, [buildingPermissions, selectedFamily]);

  // Financial calculations
  const financials = useMemo(() => {
    const rawTaxCharged = familyTaxes.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPenalties = familyPayments.reduce((sum, p) => sum + (p.penalty || 0), 0);
    const totalConcessions = familyPayments.reduce((sum, p) => sum + (p.concession || 0), 0);
    const totalTaxCharged = rawTaxCharged + totalPenalties - totalConcessions;
    const totalTaxPaid = familyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalTaxDues = Math.max(0, totalTaxCharged - totalTaxPaid);

    const bookingTotal = familyBookings.reduce((sum, b) => sum + (b.chargeAmount || 0), 0);
    const buildingTotal = familyBuildingPermissions.reduce((sum, bp) => sum + (bp.totalAmount || 0), 0);

    return {
      rawTaxCharged,
      totalPenalties,
      totalConcessions,
      totalTaxCharged,
      totalTaxPaid,
      totalTaxDues,
      bookingTotal,
      buildingTotal,
      grandCharged: totalTaxCharged + bookingTotal + buildingTotal,
      grandPaid: totalTaxPaid + bookingTotal + buildingTotal, // bookings & permissions are collected at issue
      grandDues: totalTaxDues,
    };
  }, [familyTaxes, familyPayments, familyBookings, familyBuildingPermissions]);

  // Pending tax vouchers
  const pendingTaxes = useMemo(() => {
    return familyTaxes.filter((t) => t.status !== 'PAID');
  }, [familyTaxes]);

  const selectedVouchersTotal = useMemo(() => {
    return familyTaxes
      .filter((t) => selectedVoucherIds.includes(t.id))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [familyTaxes, selectedVoucherIds]);

  const handleToggleVoucher = (taxId: string) => {
    setSelectedVoucherIds((prev) =>
      prev.includes(taxId) ? prev.filter((id) => id !== taxId) : [...prev, taxId]
    );
  };

  const handleSelectAllPending = () => {
    if (selectedVoucherIds.length === pendingTaxes.length) {
      setSelectedVoucherIds([]);
    } else {
      setSelectedVoucherIds(pendingTaxes.map((t) => t.id));
    }
  };

  const handleRegisterPaymentClick = () => {
    if (!selectedFamily || !onReceivePayment) return;
    const targetTaxIds =
      selectedVoucherIds.length > 0
        ? selectedVoucherIds
        : pendingTaxes.map((t) => t.id);
    const suggestedAmount =
      selectedVoucherIds.length > 0
        ? selectedVouchersTotal
        : financials.totalTaxDues;

    onReceivePayment(selectedFamily, targetTaxIds, suggestedAmount);
  };

  const handlePrintCard = () => {
    try {
      triggerPrint('printable-area');
    } catch (err) {
      console.error('Print member card failed:', err);
    }
  };

  const officeTitle = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
  const officeSubtitle = getCleanOfficeSubtitle(officeDetails, admin);
  const logoUrl = getOfficeLogoUrl(officeDetails);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl animate-fade-in font-sans space-y-6">
      {/* ---------------- VIEW HEADER ---------------- */}
      <ViewHeader
        title={
          selectedFamily
            ? isHindi
              ? `सदस्य पहचान पत्र: ${selectedFamily.name} ${selectedFamily.surname}`
              : `Member Card: ${selectedFamily.name} ${selectedFamily.surname}`
            : isHindi
            ? 'सदस्य पहचान पत्र (MEMBER CARD)'
            : 'Beneficiary Member Card'
        }
        subtitle={
          selectedFamily
            ? `समग्र ID: ${selectedFamily.samagraId} | वार्ड: ${selectedFamily.wardNo || '01'}, ${selectedFamily.muhalla || 'ग्राम पंचायत'} | श्रेणी: ${selectedFamily.category || 'APL'}`
            : isHindi
            ? 'पंजीकृत हितग्राही का आधिकारिक सदस्य पहचान पत्र, समग्र आईडी एवं कर बही लेजर कार्ड'
            : 'Official Member ID Card, Samagra Profile & Tax Assessment Ledger for Registered Beneficiaries'
        }
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
        actionButton={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {onReceivePayment && selectedFamily && (
              <button
                onClick={handleRegisterPaymentClick}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>💳</span>
                <span>
                  {isHindi ? 'बकाया कर जमा करें' : 'Register Due Payment'} (
                  {selectedVoucherIds.length > 0
                    ? `₹${selectedVouchersTotal.toLocaleString('en-IN')}`
                    : `₹${financials.totalTaxDues.toLocaleString('en-IN')}`}
                  )
                </span>
              </button>
            )}

            <button
              onClick={handlePrintCard}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-sm border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span>
              <span>{isHindi ? 'सदस्य कार्ड प्रिंट करें' : 'Print Member Card'}</span>
            </button>
          </div>
        }
      />

      {/* ---------------- BENEFICIARY SELECTOR / SEARCH BAR ---------------- */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              {isHindi ? 'हितग्राही सदस्य का चयन करें' : 'Select Beneficiary Member'}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {families.length} {isHindi ? 'कुल पंजीकृत सदस्य' : 'Total Members'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder={
                isHindi
                  ? 'नाम, समग्र आईडी, मोबाइल नंबर से खोजें...'
                  : 'Search by name, Samagra ID, mobile...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="sm:col-span-8">
            <select
              value={selectedFamily?.id || ''}
              onChange={(e) => {
                setSelectedFamilyId(e.target.value);
                setSelectedVoucherIds([]);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none cursor-pointer"
            >
              {filteredFamilies.map((fam) => (
                <option key={fam.id} value={fam.id}>
                  {fam.name} {fam.surname} | पिता/पति: {fam.guardianName} | समग्र ID: {fam.samagraId} | वार्ड: {fam.wardNo || '01'} ({fam.category || 'APL'})
                </option>
              ))}
              {filteredFamilies.length === 0 && (
                <option value="">
                  {isHindi ? 'कोई हितग्राही नहीं मिला' : 'No beneficiary found'}
                </option>
              )}
            </select>
          </div>
        </div>
      </div>

      {selectedFamily ? (
        <>
          {/* ---------------- PENDING TAX VOUCHERS REGISTRATION CARD (INTERACTIVE) ---------------- */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-md border-2 border-amber-300 print:hidden space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 border-amber-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎟️</span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {isHindi
                      ? 'भुगतान दर्ज करने हेतु बकाया कर वाउचर चुनें'
                      : 'Select Pending Tax Vouchers to Register Payment'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isHindi
                    ? `${selectedFamily.name} ${selectedFamily.surname} के लंबित मांग वाउचर चुनें और एकमुश्त भुगतान दर्ज करें:`
                    : `Check pending demand vouchers below to clear dues for ${selectedFamily.name} ${selectedFamily.surname}.`}
                </p>
              </div>

              {pendingTaxes.length > 0 && (
                <button
                  onClick={handleSelectAllPending}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {selectedVoucherIds.length === pendingTaxes.length
                    ? isHindi
                      ? '✓ सभी का चयन हटाएं'
                      : '✓ Deselect All'
                    : isHindi
                    ? '☑️ सभी बकाया चुनें'
                    : '☑️ Select All Pending'}
                </button>
              )}
            </div>

            {pendingTaxes.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingTaxes.map((tax) => {
                    const isChecked = selectedVoucherIds.includes(tax.id);
                    const voucherNo =
                      tax.billNo || `VOUCH-${tax.id.slice(-6).toUpperCase()}`;

                    return (
                      <div
                        key={tax.id}
                        onClick={() => handleToggleVoucher(tax.id)}
                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-amber-50/80 border-amber-500 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by container
                          className="mt-1 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">
                              {tax.type}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border">
                              {voucherNo}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 mt-1 flex justify-between">
                            <span>
                              {getMonthName(tax.month)}, {tax.year}
                            </span>
                            <span className="font-mono font-black text-amber-700">
                              ₹{tax.amount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
                            <span>
                              Due: {formatDateDDMMYYYY(tax.dueDate || `${tax.year}-07-31`)}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                              {tax.status || 'UNPAID'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ACTION FOOTER BAR */}
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-800">
                    <span>
                      {isHindi ? 'चयनित वाउचर:' : 'Selected Vouchers:'}{' '}
                      <strong className="text-amber-900">
                        {selectedVoucherIds.length}
                      </strong>
                    </span>
                    <span className="mx-2">|</span>
                    <span>
                      {isHindi ? 'कुल चयनित देय राशि:' : 'Total Due Amount:'}{' '}
                      <strong className="text-emerald-700 font-mono text-sm">
                        ₹{selectedVouchersTotal.toLocaleString('en-IN')}
                      </strong>
                    </span>
                  </div>

                  <button
                    onClick={handleRegisterPaymentClick}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>💳</span>
                    <span>
                      {isHindi
                        ? `चयनित वाउचर का भुगतान करें (₹${selectedVouchersTotal.toLocaleString('en-IN')})`
                        : `Clear Selected Vouchers (₹${selectedVouchersTotal.toLocaleString('en-IN')})`}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-bold">
                🎉{' '}
                {isHindi
                  ? 'उत्कृष्ट! इस हितग्राही के सभी कर मांग पत्र पूर्णतः चुकता हैं।'
                  : 'Great news! All tax demand vouchers for this member are fully paid.'}
              </div>
            )}
          </div>

          {/* ---------------- OFFICIAL PRINTABLE MEMBER CARD & LEDGER ---------------- */}
          <div
            id="printable-area"
            className="p-6 sm:p-8 bg-white rounded-2xl shadow-lg border-2 border-slate-900 space-y-6"
          >
            {/* STANDARDIZED OFFICIAL GRAM PANCHAYAT BRANDING HEADER */}
            <OfficialVoucherHeader
              officeDetails={officeDetails}
              adminPanchayat={admin?.gramPanchayat}
              voucherTitle={isHindi ? 'हितग्राही सदस्य पहचान पत्र एवं कर लेजर प्रपत्र' : 'Beneficiary Member Profile & Tax Dues Ledger Card'}
              voucherSubTitle={`${isHindi ? 'कार्ड जारी तिथि' : 'Card Date'}: ${formatDateDDMMYYYY(new Date())} | ${isHindi ? 'प्रपत्र क्रमांक' : 'Document ID'}: CARD-${selectedFamily.samagraId.slice(-6)}-${new Date().getFullYear()}`}
              badgeBgColor="bg-emerald-50 text-emerald-950 border-emerald-300"
            />

            {/* MEMBER & FINANCIAL SUMMARY GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. MEMBER PROFILE */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1 mb-3 text-primary">
                  {isHindi ? '1. हितग्राही व्यक्तिगत विवरण' : '1. Member Personal Profile'}
                </h3>
                <div className="text-xs space-y-2 text-slate-700">
                  <p>
                    <span className="font-bold w-32 inline-block">
                      {isHindi ? 'मुखिया का नाम:' : 'Head Name:'}
                    </span>{' '}
                    <strong className="text-slate-900">
                      {selectedFamily.name} {selectedFamily.surname}
                    </strong>
                  </p>
                  <p>
                    <span className="font-bold w-32 inline-block">
                      {isHindi ? 'पिता/पति का नाम:' : 'Father/Husband Name:'}
                    </span>{' '}
                    {selectedFamily.guardianName || 'N/A'}
                  </p>
                  <p>
                    <span className="font-bold w-32 inline-block">
                      {isHindi ? 'श्रेणी:' : 'Category:'}
                    </span>{' '}
                    <span className="font-bold text-amber-800 px-2 py-0.5 bg-amber-100 rounded">
                      {selectedFamily.category || 'APL'}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold w-32 inline-block">Samagra ID:</span>{' '}
                    <span className="font-mono font-bold">
                      {selectedFamily.samagraId}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold w-32 inline-block">Family ID:</span>{' '}
                    <span className="font-mono">{selectedFamily.familyId || 'N/A'}</span>
                  </p>
                  <p>
                    <span className="font-bold w-32 inline-block">
                      {isHindi ? 'पंजीयन तिथि:' : 'Registration Date:'}
                    </span>{' '}
                    <span className="font-bold text-slate-800">
                      📅 {formatDateDDMMYYYY(selectedFamily.registrationDate) || 'N/A'}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold w-32 inline-block">
                      {isHindi ? 'वार्ड एवं मोहल्ला:' : 'Ward & Muhalla:'}
                    </span>{' '}
                    Ward {selectedFamily.wardNo || '01'}, {selectedFamily.muhalla || 'N/A'}
                  </p>
                  <p>
                    <span className="font-bold w-32 inline-block">
                      {isHindi ? 'मोबाइल नंबर:' : 'Mobile Contact:'}
                    </span>{' '}
                    {selectedFamily.mobile || 'N/A'}
                  </p>
                </div>
              </div>

              {/* 2. FINANCIAL DUES SUMMARY */}
              <div className="bg-primary-50/80 p-4 rounded-xl border border-primary-200 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-primary-900 uppercase tracking-wider border-b pb-1 mb-3 border-primary-200">
                    {isHindi ? '2. वित्तीय स्थिति सारांश' : '2. Financial Dues Summary'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-center mt-2">
                    <div className="bg-white p-3 rounded-xl border border-primary-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">
                        {isHindi ? 'कुल मांग' : 'TOTAL CHARGED'}
                      </p>
                      <p className="font-black text-xl text-amber-700 font-mono mt-0.5">
                        {formatCurrency(financials.totalTaxCharged)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-primary-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">
                        {isHindi ? 'कुल प्राप्त' : 'TOTAL PAID'}
                      </p>
                      <p className="font-black text-xl text-emerald-700 font-mono mt-0.5">
                        {formatCurrency(financials.totalTaxPaid)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border-2 border-rose-300 mt-3 text-center">
                  <p className="text-xs text-slate-600 font-bold uppercase">
                    {isHindi ? 'कुल शेष बकाया राशि' : 'NET OUTSTANDING DUES'}
                  </p>
                  <p className="text-2xl font-black text-rose-700 font-mono mt-0.5">
                    {formatCurrency(financials.totalTaxDues)}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. ITEMISED TAX DEMAND VOUCHERS TABLE (ALL TAX CHARGES) */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 mb-2">
                {isHindi ? '3. कर मांग पत्र विवरण' : '3. Tax Demand Vouchers & Charges'}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">
                        {isHindi ? 'वाउचर क्रमांक' : 'Voucher No'}
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">
                        {isHindi ? 'माह/वर्ष' : 'Month/Year'}
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">
                        {isHindi ? 'कर का प्रकार' : 'Tax Type'}
                      </th>
                      <th className="px-3 py-2 text-right font-bold text-slate-600 uppercase">
                        {isHindi ? 'मांग राशि (₹)' : 'Amount (₹)'}
                      </th>
                      <th className="px-3 py-2 text-center font-bold text-slate-600 uppercase">
                        {isHindi ? 'स्थिति' : 'Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {familyTaxes.map((tax) => {
                      const voucherNo =
                        tax.billNo || `VOUCH-${tax.id.slice(-6).toUpperCase()}`;
                      return (
                        <tr key={tax.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {voucherNo}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {getMonthName(tax.month)}, {tax.year}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-800">
                            {tax.type}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(tax.amount)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                tax.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {tax.status || 'UNPAID'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {familyTaxes.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-4 text-xs text-slate-400"
                        >
                          {isHindi
                            ? 'कोई कर मांग दर्ज नहीं है।'
                            : 'No tax demands billed yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. ITEMISED PAYMENTS RECEIVED TABLE (ALL TRANSACTION RECORDS) */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 mb-2">
                {isHindi
                  ? '4. प्राप्त शुल्क रसीद विवरण'
                  : '4. Payment Receipts Received & Transaction Records'}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">
                        {isHindi ? 'रसीद क्रमांक' : 'Receipt No'}
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">
                        {isHindi ? 'दिनांक' : 'Date'}
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">
                        {isHindi ? 'भुगतान माध्यम' : 'Payment Mode'}
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">
                        {isHindi ? 'विवरण' : 'Remarks'}
                      </th>
                      <th className="px-3 py-2 text-right font-bold text-emerald-800 uppercase">
                        {isHindi ? 'प्राप्त राशि (₹)' : 'Amount Paid (₹)'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {familyPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-primary">
                          {payment.receiptNo || payment.id}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {formatDateDDMMYYYY(payment.date || payment.paymentDate)}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          {payment.mode || payment.paymentMode || 'CASH'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate">
                          {payment.remarks || 'Tax Collection'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(payment.amount)}
                        </td>
                      </tr>
                    ))}
                    {familyPayments.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-4 text-xs text-slate-400"
                        >
                          {isHindi
                            ? 'कोई भुगतान रसीद दर्ज नहीं है।'
                            : 'No payment receipts recorded.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. OTHER TRANSACTIONS (BOOKING RENT & BUILDING PERMISSIONS IF ANY) */}
            {(familyBookings.length > 0 || familyBuildingPermissions.length > 0) && (
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 mb-2">
                  {isHindi
                    ? '5. अन्य ग्राम पंचायत सेवा एवं अनुमति अभिलेख'
                    : '5. Other Panchayat Services & Permissions Records'}
                </h3>
                <div className="space-y-3">
                  {familyBuildingPermissions.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-700 mb-1">
                        🏗️ {isHindi ? 'भवन निर्माण अनुमति' : 'Building Permissions'}
                      </h4>
                      <table className="min-w-full text-xs divide-y divide-slate-200 border border-slate-200 rounded-lg">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-bold text-slate-600">
                              {isHindi ? 'अनुमति क्र.' : 'Perm No'}
                            </th>
                            <th className="px-3 py-1.5 text-left font-bold text-slate-600">
                              {isHindi ? 'दिनांक' : 'Date'}
                            </th>
                            <th className="px-3 py-1.5 text-left font-bold text-slate-600">
                              {isHindi ? 'निर्माण प्रकार' : 'Type'}
                            </th>
                            <th className="px-3 py-1.5 text-right font-bold text-slate-600">
                              {isHindi ? 'शुल्क (₹)' : 'Fee (₹)'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {familyBuildingPermissions.map((bp) => (
                            <tr key={bp.id}>
                              <td className="px-3 py-1.5 font-mono text-primary font-bold">
                                {bp.permissionNo}
                              </td>
                              <td className="px-3 py-1.5 text-slate-600">
                                {formatDateDDMMYYYY(bp.issueDate || bp.createdAt)}
                              </td>
                              <td className="px-3 py-1.5 text-slate-700">
                                {bp.constructionType || 'Residential'}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(bp.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {familyBookings.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-700 mb-1">
                        🎪 {isHindi ? 'सामुदायिक भवन / दुकान बुकिंग' : 'Premises Bookings & Rent'}
                      </h4>
                      <table className="min-w-full text-xs divide-y divide-slate-200 border border-slate-200 rounded-lg">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-bold text-slate-600">
                              {isHindi ? 'वाउचर क्र.' : 'Voucher'}
                            </th>
                            <th className="px-3 py-1.5 text-left font-bold text-slate-600">
                              {isHindi ? 'परिसर' : 'Facility'}
                            </th>
                            <th className="px-3 py-1.5 text-left font-bold text-slate-600">
                              {isHindi ? 'अवधि' : 'Dates'}
                            </th>
                            <th className="px-3 py-1.5 text-right font-bold text-slate-600">
                              {isHindi ? 'किराया (₹)' : 'Rent (₹)'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {familyBookings.map((b) => (
                            <tr key={b.id}>
                              <td className="px-3 py-1.5 font-mono text-primary font-bold">
                                {b.voucherNo}
                              </td>
                              <td className="px-3 py-1.5 text-slate-700">
                                {b.facilityName} ({b.purpose})
                              </td>
                              <td className="px-3 py-1.5 text-slate-600">
                                {formatDateDDMMYYYY(b.startDate)} to {formatDateDDMMYYYY(b.endDate)}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(b.chargeAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OFFICIAL STAMP & SIGNATURE FOOTER FOR PRINT */}
            <div className="pt-6 border-t-2 border-slate-200 flex justify-between items-end text-[11px] text-slate-600">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[9px] text-slate-400 font-mono">
                  [ {isHindi ? 'पंचायत मुहर' : 'Seal'} ]
                </div>
                <span className="block mt-1 font-bold">
                  {isHindi ? 'ग्राम पंचायत सील' : 'Gram Panchayat Seal'}
                </span>
              </div>

              <div className="text-center space-y-6">
                <div className="border-b-2 border-slate-400 w-40 mx-auto"></div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">
                    {isHindi ? 'ग्राम पंचायत सचिव / सरपंच' : 'Secretary / Sarpanch'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {admin?.gramPanchayat || officeDetails.gramPanchayat}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM PRINT ACTION BUTTON */}
          <div className="flex items-center justify-center pt-2 print:hidden">
            <button
              onClick={handlePrintCard}
              className="px-6 py-3 bg-slate-900 hover:bg-black text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>🖨️</span>
              <span>
                {isHindi
                  ? 'सदस्य पहचान पत्र एवं लेजर प्रिंट करें'
                  : 'Print Member Card & Dues Ledger'}
              </span>
            </button>
          </div>
        </>
      ) : (
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-sm font-semibold">
          {isHindi
            ? 'कृपया पहचान पत्र देखने हेतु हितग्राही का चयन करें।'
            : 'Please select a beneficiary to view member card.'}
        </div>
      )}
    </div>
  );
};

export default MemberCardView;
