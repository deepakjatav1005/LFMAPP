import React, { useState, useMemo } from 'react';
import { Family, OtherTaxReceiptRecord, OtherTaxCategory, OfficeDetails, Admin, BusinessRegistrationRecord } from '../types';
import ViewHeader from './ViewHeader';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import {
  formatDateDDMMYYYY,
  getCleanOfficeTitle,
  getCleanOfficeSubtitle,
  getOfficeLogoUrl,
  DEFAULT_OFFICE_LOGO,
  openPrintWindow,
} from '../utils/printUtils';
import {
  DuplicateWarningModal,
  DuplicateWarningDetails,
  SuccessPopupModal,
  SuccessPopupDetails,
} from './EntryFeedbackModals';
import {
  getFinancialYear,
  isSameFinancialYear,
  isPropertyTaxHead,
  isCommercialShopTaxHead,
  checkAnnualTaxPaymentStatus,
} from '../utils/financialYearUtils';

interface OtherTaxViewProps {
  families: Family[];
  receipts: OtherTaxReceiptRecord[];
  businessRegistrations?: BusinessRegistrationRecord[];
  officeDetails?: OfficeDetails;
  admin?: Admin | null;
  onCreateReceipt: (record: Omit<OtherTaxReceiptRecord, 'id'>) => void;
  onDeleteReceipt?: (id: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const OtherTaxView: React.FC<OtherTaxViewProps> = ({
  families,
  receipts = [],
  businessRegistrations = [],
  officeDetails,
  admin,
  onCreateReceipt,
  onDeleteReceipt,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'RECORDS'>('REGISTER');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTaxHead, setFilterTaxHead] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterWard, setFilterWard] = useState<string>('ALL');
  const [filterFY, setFilterFY] = useState<string>('ALL');
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<OtherTaxReceiptRecord | null>(null);
  const [deletingReceipt, setDeletingReceipt] = useState<OtherTaxReceiptRecord | null>(null);
  const [isDeletingReceipt, setIsDeletingReceipt] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(families[0]?.id || '');
  const [beneficiarySearch, setBeneficiarySearch] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [taxCategory, setTaxCategory] = useState<string>(OtherTaxCategory.PROPERTY);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [customTaxName, setCustomTaxName] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('200');
  const [receiptDate, setReceiptDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK' | 'UPI' | 'CHEQUE'>('CASH');
  const [transactionId, setTransactionId] = useState<string>('');
  const [collectorName, setCollectorName] = useState<string>(admin?.name || officeDetails?.secretaryName || '');
  const [remarks, setRemarks] = useState<string>('');

  // Duplicate Warning & Success Popup Modal State
  const [duplicateModalInfo, setDuplicateModalInfo] = useState<DuplicateWarningDetails | null>(null);
  const [successModalInfo, setSuccessModalInfo] = useState<SuccessPopupDetails | null>(null);

  // Selected Family Info
  const selectedFamily = useMemo(() => {
    return families.find((f) => f.id === selectedFamilyId) || families[0] || null;
  }, [families, selectedFamilyId]);

  // Filtered families for search dropdown
  const searchedFamilies = useMemo(() => {
    if (!beneficiarySearch.trim()) return families.slice(0, 15);
    const q = beneficiarySearch.toLowerCase();
    return families
      .filter((f) => {
        return (
          f.name.toLowerCase().includes(q) ||
          f.surname.toLowerCase().includes(q) ||
          (f.guardianName && f.guardianName.toLowerCase().includes(q)) ||
          (f.samagraId && f.samagraId.includes(q)) ||
          (f.familyId && f.familyId.includes(q)) ||
          (f.mobile && f.mobile.includes(q)) ||
          (f.muhalla && f.muhalla.toLowerCase().includes(q))
        );
      })
      .slice(0, 20);
  }, [families, beneficiarySearch]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSelectFamily = (f: Family) => {
    setSelectedFamilyId(f.id);
    setBeneficiarySearch(`${f.name} ${f.surname} (समग्र ID: ${f.samagraId || f.id})`);
    setIsDropdownOpen(false);
  };

  // Selected Registered Business Object
  const selectedBusinessObj = useMemo(() => {
    if (!selectedBusinessId) return null;
    return businessRegistrations.find((b) => b.id === selectedBusinessId) || null;
  }, [businessRegistrations, selectedBusinessId]);

  // Current effective tax head
  const effectiveTaxHead = useMemo(() => {
    if (taxCategory === OtherTaxCategory.OTHER && customTaxName.trim()) {
      return `अन्य कर - ${customTaxName.trim()}`;
    }
    if (taxCategory === OtherTaxCategory.COMMERCIAL_SHOP) {
      if (selectedBusinessObj) {
        return `${OtherTaxCategory.COMMERCIAL_SHOP} - ${selectedBusinessObj.businessName}`;
      }
      if (customTaxName.trim()) {
        return `${OtherTaxCategory.COMMERCIAL_SHOP} - ${customTaxName.trim()}`;
      }
    }
    return taxCategory;
  }, [taxCategory, customTaxName, selectedBusinessObj]);

  // Financial Year Check for Annual Taxes (Property Tax & Commercial Shop Tax)
  const currentFormFY = useMemo(() => getFinancialYear(receiptDate), [receiptDate]);

  const annualTaxStatus = useMemo(() => {
    return checkAnnualTaxPaymentStatus({
      receipts,
      familyId: selectedFamily?.id,
      samagraId: selectedFamily?.samagraId,
      businessRegistrationId: selectedBusinessId || undefined,
      businessName: selectedBusinessObj?.businessName || customTaxName || undefined,
      taxHeadOrCategory: effectiveTaxHead,
      targetDate: receiptDate,
    });
  }, [
    receipts,
    selectedFamily,
    selectedBusinessId,
    selectedBusinessObj,
    customTaxName,
    effectiveTaxHead,
    receiptDate,
  ]);

  const executeCreateReceipt = () => {
    const amount = Number(taxAmount);
    const receiptNo = `OTR-${new Date().getFullYear()}-${String(receipts.length + 1).padStart(4, '0')}`;
    const targetFY = getFinancialYear(receiptDate);

    const newRecord: Omit<OtherTaxReceiptRecord, 'id'> = {
      receiptNo,
      familyId: selectedFamily!.id,
      beneficiaryName: `${selectedFamily!.name} ${selectedFamily!.surname}`.trim(),
      guardianName: selectedFamily!.guardianName || '',
      fatherHusbandName: selectedFamily!.guardianName || '',
      mobile: selectedFamily!.mobile || '',
      wardNo: selectedFamily!.wardNo || '01',
      muhalla: selectedFamily!.muhalla || '',
      samagraId: selectedFamily!.samagraId || '',
      familySamagraId: selectedFamily!.familyId || '',
      category: selectedFamily!.category || 'APL',
      taxHead: effectiveTaxHead,
      taxAmount: amount,
      receiptDate: receiptDate || new Date().toISOString().split('T')[0],
      financialYear: targetFY.fyShort,
      businessRegistrationId: selectedBusinessId || undefined,
      businessName: selectedBusinessObj?.businessName || undefined,
      paymentMode,
      transactionId: transactionId.trim() || undefined,
      collectorName: collectorName.trim() || undefined,
      remarks: remarks.trim() || undefined,
      createdAt: new Date().toISOString(),
      gramPanchayat: admin?.gramPanchayat || officeDetails?.officeName || '',
      adminId: admin?.id || '',
    };

    onCreateReceipt(newRecord);

    const fullRecordObj: OtherTaxReceiptRecord = {
      ...newRecord,
      id: `temp-${Date.now()}`,
    };

    // Show Success Confirmation Modal
    setSuccessModalInfo({
      title: isHindi ? 'अन्य कर / फ़ीस रसीद जारी हुई!' : 'Other Tax Receipt Generated Successfully!',
      message: isHindi
        ? `हितग्राही ${newRecord.beneficiaryName} से ₹${amount} की कर रसीद (${effectiveTaxHead}) सुरक्षित हो गई है एवं रोकड़बही (Cashbook) में आय दर्ज हो गई है।`
        : `Tax receipt of ₹${amount} for ${newRecord.beneficiaryName} (${effectiveTaxHead}) generated and synced with Cashbook.`,
      recordType: isHindi ? 'अन्य कर / फ़ीस रसीद' : 'OTHER TAX / FEE RECEIPT',
      details: [
        { label: isHindi ? 'रसीद क्रमांक' : 'Receipt No', value: receiptNo },
        { label: isHindi ? 'हितग्राही का नाम' : 'Beneficiary', value: newRecord.beneficiaryName },
        { label: isHindi ? 'कर / शुल्क मद' : 'Tax Head', value: effectiveTaxHead },
        { label: isHindi ? 'वित्तीय वर्ष' : 'Financial Year', value: targetFY.fyShort },
        { label: isHindi ? 'प्राप्त राशि' : 'Amount', value: `₹${amount}` },
        { label: isHindi ? 'भुगतान माध्यम' : 'Payment Mode', value: paymentMode },
      ],
      onPrint: () => {
        setSuccessModalInfo(null);
        setSelectedReceiptForPrint(fullRecordObj);
      },
      printButtonLabel: isHindi ? '🖨️ रसीद देखें / प्रिंट करें' : 'View / Print Receipt',
      onClose: () => {
        setSuccessModalInfo(null);
      },
      isHindi,
    });

    // Reset form fields
    setTaxAmount('200');
    setCustomTaxName('');
    setTransactionId('');
    setRemarks('');
  };

  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFamily) {
      alert(isHindi ? 'कृपया मान्य हितग्राही का चयन करें।' : 'Please select a valid beneficiary.');
      return;
    }

    const amount = Number(taxAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(isHindi ? 'कृपया वैध कर राशि दर्ज करें।' : 'Please enter a valid tax amount.');
      return;
    }

    // STRICT CHECK: Check duplicate payment in same financial year or matching same receipt
    if (annualTaxStatus.alreadyPaid) {
      setDuplicateModalInfo({
        title: isHindi ? 'वार्षिक कर पूर्व भुगतान चेतावनी' : 'Annual Tax Duplicate Warning',
        message: annualTaxStatus.warningHi || `⚠️ इस वित्तीय वर्ष में इस कर मद का भुगतान पहले ही प्राप्त हो चुका है।`,
        duplicateInfo: [
          { label: isHindi ? 'करदाता' : 'Beneficiary', value: `${selectedFamily.name} ${selectedFamily.surname}` },
          { label: isHindi ? 'कर मद' : 'Tax Head', value: effectiveTaxHead },
          { label: isHindi ? 'वित्तीय वर्ष' : 'Financial Year', value: currentFormFY.fyShort },
        ],
        onConfirm: () => {
          setDuplicateModalInfo(null);
          executeCreateReceipt();
        },
        onCancel: () => {
          setDuplicateModalInfo(null);
        },
        isHindi,
      });
      return;
    }

    // Check same date duplicate
    const sameDateReceipt = receipts.find(
      (r) =>
        r.familyId === selectedFamily.id &&
        r.taxHead === effectiveTaxHead &&
        r.receiptDate === receiptDate &&
        r.taxAmount === amount
    );

    if (sameDateReceipt) {
      setDuplicateModalInfo({
        title: isHindi ? 'समान रसीद प्रविष्टि चेतावनी' : 'Duplicate Receipt Warning',
        message: isHindi
          ? `⚠️ इस हितग्राही हेतु आज दिनांक ${formatDateDDMMYYYY(receiptDate)} को ${effectiveTaxHead} की ₹${amount} की रसीद पहले से जारी की जा चुकी है!`
          : `⚠️ A receipt for ${effectiveTaxHead} (₹${amount}) already exists on ${formatDateDDMMYYYY(receiptDate)}!`,
        duplicateInfo: [
          { label: isHindi ? 'रसीद क्रमांक' : 'Receipt No', value: sameDateReceipt.receiptNo },
          { label: isHindi ? 'रसीद दिनांक' : 'Date', value: formatDateDDMMYYYY(sameDateReceipt.receiptDate) },
          { label: isHindi ? 'राशि' : 'Amount', value: `₹${sameDateReceipt.taxAmount}` },
        ],
        onConfirm: () => {
          setDuplicateModalInfo(null);
          executeCreateReceipt();
        },
        onCancel: () => {
          setDuplicateModalInfo(null);
        },
        isHindi,
      });
      return;
    }

    executeCreateReceipt();
  };

  // Available Financial Years from receipts
  const availableFinancialYears = useMemo(() => {
    const set = new Set<string>();
    const currentFYCode = getFinancialYear().fyShort;
    set.add(currentFYCode);
    receipts.forEach((r) => {
      const fy = r.financialYear || getFinancialYear(r.receiptDate).fyShort;
      if (fy) set.add(fy);
    });
    return Array.from(set).sort().reverse();
  }, [receipts]);

  // Filtered Receipts for Records tab
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const q = searchTerm.toLowerCase();
      const rFY = r.financialYear || getFinancialYear(r.receiptDate).fyShort;

      const matchesSearch =
        !q ||
        r.beneficiaryName.toLowerCase().includes(q) ||
        r.receiptNo.toLowerCase().includes(q) ||
        (r.samagraId && r.samagraId.includes(q)) ||
        (r.mobile && r.mobile.includes(q)) ||
        (r.muhalla && r.muhalla.toLowerCase().includes(q)) ||
        r.taxHead.toLowerCase().includes(q) ||
        (rFY && rFY.toLowerCase().includes(q));

      const matchesHead = filterTaxHead === 'ALL' || r.taxHead.includes(filterTaxHead);
      const matchesMode = filterMode === 'ALL' || r.paymentMode === filterMode;
      const matchesWard = filterWard === 'ALL' || r.wardNo === filterWard;
      const matchesFY = filterFY === 'ALL' || rFY === filterFY;

      return matchesSearch && matchesHead && matchesMode && matchesWard && matchesFY;
    });
  }, [receipts, searchTerm, filterTaxHead, filterMode, filterWard, filterFY]);

  // Statistics
  const totalRevenue = useMemo(() => {
    return receipts.reduce((sum, r) => sum + (Number(r.taxAmount) || 0), 0);
  }, [receipts]);

  const wards = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach((r) => {
      if (r.wardNo) set.add(r.wardNo);
    });
    return Array.from(set).sort();
  }, [receipts]);

  // Export to Excel
  const handleExportExcel = () => {
    const filename = `Other_Tax_Receipts_Register_${formatDateDDMMYYYY(new Date()).replace(/\//g, '-')}`;
    const headers = [
      isHindi ? 'क्र.' : 'S.N',
      isHindi ? 'रसीद क्र.' : 'Receipt No',
      isHindi ? 'दिनांक' : 'Date',
      isHindi ? 'करदाता / हितग्राही का नाम' : 'Beneficiary Name',
      isHindi ? 'पिता / पति का नाम' : 'Guardian Name',
      isHindi ? 'समग्र आईडी' : 'Samagra ID',
      isHindi ? 'वार्ड क्र.' : 'Ward No',
      isHindi ? 'मोहल्ला' : 'Muhalla',
      isHindi ? 'कर मद (Tax Head)' : 'Tax Head',
      isHindi ? 'कर राशि (₹)' : 'Amount (Rs.)',
      isHindi ? 'भुगतान माध्यम' : 'Payment Mode',
      isHindi ? 'ट्रांजेक्शन / चेक आईडी' : 'Txn / Cheque No',
      isHindi ? 'संग्राहक' : 'Collector',
      isHindi ? 'टिप्पणी' : 'Remarks',
    ];

    const rows = filteredReceipts.map((r, idx) => [
      idx + 1,
      r.receiptNo,
      formatDateDDMMYYYY(r.receiptDate),
      r.beneficiaryName,
      r.guardianName || r.fatherHusbandName || '-',
      r.samagraId || '-',
      r.wardNo || '01',
      r.muhalla || '-',
      r.taxHead,
      r.taxAmount,
      r.paymentMode,
      r.transactionId || '-',
      r.collectorName || '-',
      r.remarks || '-',
    ]);

    exportToExcel(filename, 'OtherTaxReceipts', headers, rows);
    showNotification(isHindi ? 'Excel फ़ाइल डाउनलोड हो गई है।' : 'Excel file downloaded.');
  };

  // Export to PDF
  const handleExportPDF = () => {
    const filename = `Other_Tax_Receipts_Report_${formatDateDDMMYYYY(new Date()).replace(/\//g, '-')}`;
    const officeName = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
    const title = isHindi ? 'अन्य कर रसीद संग्रह पंजी (3.11 Other Tax Register)' : 'Other Tax Receipts Register';
    const subtitle = isHindi
      ? `कुल रसीदें: ${filteredReceipts.length} | कुल संग्रहित कर राशि: ₹${filteredReceipts.reduce((s, r) => s + (Number(r.taxAmount) || 0), 0).toLocaleString('en-IN')}`
      : `Total Receipts: ${filteredReceipts.length} | Total Tax Collected: Rs. ${filteredReceipts.reduce((s, r) => s + (Number(r.taxAmount) || 0), 0)}`;

    const headers = [
      'क्र.',
      'रसीद क्र.',
      'दिनांक',
      'हितग्राही का नाम',
      'समग्र ID',
      'वार्ड व मोहल्ला',
      'कर का नाम (Tax Head)',
      'राशि (₹)',
      'माध्यम',
    ];

    const rows = filteredReceipts.map((r, idx) => [
      idx + 1,
      r.receiptNo,
      formatDateDDMMYYYY(r.receiptDate),
      r.beneficiaryName,
      r.samagraId || '-',
      `W-${r.wardNo || '01'}, ${r.muhalla || '-'}`,
      r.taxHead,
      r.taxAmount,
      r.paymentMode,
    ]);

    exportToPDF(filename, title, subtitle, headers, rows, officeDetails, admin);
  };

  // Print Single Receipt Document
  const handlePrintSingleReceiptDocument = (r: OtherTaxReceiptRecord) => {
    const officeTitle = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
    const officeSubtitle = getCleanOfficeSubtitle(officeDetails, admin);
    const logoUrl = getOfficeLogoUrl(officeDetails);
    const districtName = officeDetails?.district || admin?.district || 'मध्य प्रदेश';
    const blockName = officeDetails?.block || admin?.block || '';
    const secretaryName = r.collectorName || officeDetails?.secretaryName || admin?.name || 'सचिव / प्राधिकृत अधिकारी';
    const dateFormatted = formatDateDDMMYYYY(r.receiptDate);
    const fyInfo = getFinancialYear(r.receiptDate);
    const rFY = r.financialYear || fyInfo.fyShort;
    const isAnnualTax = isPropertyTaxHead(r.taxHead) || isCommercialShopTaxHead(r.taxHead);

    const bodyHtml = `
      <div class="no-print max-w-3xl mx-auto mb-6 p-4 bg-white rounded-xl shadow border border-slate-200 flex items-center justify-between">
        <div>
          <h2 class="font-bold text-slate-800 text-base">📄 कर रसीद पूर्वावलोकन (Tax Receipt Preview)</h2>
          <p class="text-xs text-slate-500 font-mono">रसीद क्रमांक: ${r.receiptNo} | वित्तीय वर्ष: ${rFY}</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="window.print()" class="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg shadow flex items-center gap-2 cursor-pointer">
            🖨️ प्रिंट करें / PDF सेव करें (Print / Save)
          </button>
          <button onclick="window.close()" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg">
            बंद करें (Close)
          </button>
        </div>
      </div>

      <div class="max-w-3xl mx-auto bg-white border-2 border-slate-900 rounded-2xl p-7 shadow-lg">
        <!-- Standard Official Header Banner -->
        <div class="border-b-2 border-slate-900 pb-4 mb-4 text-center space-y-1.5">
          <div class="flex justify-center mb-1">
            <img
              src="${logoUrl}"
              alt="Emblem"
              referrerpolicy="no-referrer"
              class="w-16 h-16 object-contain mx-auto drop-shadow-xs"
              onerror="this.onerror=null;this.src='${DEFAULT_OFFICE_LOGO}';"
            />
          </div>
          <h1 class="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
            ${officeTitle}
          </h1>
          <p class="text-xs font-semibold text-slate-700 max-w-xl mx-auto">
            ${officeSubtitle}
          </p>
          <div class="pt-1">
            <div class="inline-block border border-emerald-300 bg-emerald-50 text-emerald-950 font-black text-xs px-4 py-1 rounded-full uppercase shadow-xs">
              अधिकृत कर भुगतान रसीद • वित्तीय वर्ष: ${fyInfo.fyCode} (${rFY})
            </div>
          </div>
        </div>

        <!-- Metadata Grid -->
        <div class="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 grid grid-cols-3 gap-4 text-xs mb-4">
          <div>
            <span class="text-slate-500">रसीद क्रमांक (Receipt No):</span>
            <div class="text-sm font-black text-emerald-950 font-mono">${r.receiptNo}</div>
          </div>
          <div class="text-center">
            <span class="text-slate-500">वित्तीय वर्ष (Financial Year):</span>
            <div class="text-sm font-black text-emerald-900 font-mono">FY ${rFY}</div>
          </div>
          <div class="text-right">
            <span class="text-slate-500">रसीद दिनांक (Receipt Date):</span>
            <div class="text-sm font-black text-slate-900 font-mono">${dateFormatted}</div>
          </div>
        </div>

        <!-- Beneficiary Details -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-xs space-y-2">
          <div class="flex justify-between border-b border-slate-200 pb-2">
            <div>
              <span class="text-slate-500 text-[11px]">करदाता / हितग्राही का नाम (Taxpayer Name):</span>
              <div class="text-base font-black text-slate-900">${r.beneficiaryName}</div>
              <div class="text-slate-600 font-medium">पिता / पति का नाम: <strong>${r.guardianName || r.fatherHusbandName || '-'}</strong></div>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold text-slate-700 text-[11px]">
                श्रेणी: ${r.category || 'APL'}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-1 text-slate-700">
            <div>समग्र आईडी: <strong class="font-mono text-slate-900">${r.samagraId || '-'}</strong></div>
            <div>वार्ड क्रमांक: <strong class="text-slate-900">वार्ड ${r.wardNo || '01'}</strong></div>
            <div>मोहल्ला: <strong class="text-emerald-900">${r.muhalla || '-'}</strong></div>
            <div>मोबाइल: <strong class="font-mono text-slate-900">${r.mobile || '-'}</strong></div>
            <div>भुगतान माध्यम: <strong class="text-slate-900">${r.paymentMode}</strong></div>
            <div>ट्रांजेक्शन / चेक क्र: <strong class="font-mono text-slate-900">${r.transactionId || '-'}</strong></div>
          </div>
        </div>

        <!-- Tax Receipt Statement Table -->
        <table class="w-full text-xs border-collapse border border-slate-300 mb-4">
          <thead>
            <tr class="bg-emerald-800 text-white font-bold">
              <th class="p-2.5 text-left border border-slate-300">विवरण / कर मद (Tax Head Description)</th>
              <th class="p-2.5 text-center border border-slate-300 w-32">कर अवधि / वि.व.</th>
              <th class="p-2.5 text-right border border-slate-300 w-40">प्राप्त राशि (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="p-3 border border-slate-300">
                <div class="font-black text-slate-900 text-sm">${r.taxHead}</div>
                <div class="text-[11px] text-slate-500 mt-0.5">${r.remarks ? `टिप्पणी: ${r.remarks}` : 'ग्राम पंचायत अधिकृत कर मद'}</div>
              </td>
              <td class="p-3 border border-slate-300 text-center font-bold text-slate-800 font-mono">
                वि.व. ${rFY}
              </td>
              <td class="p-3 border border-slate-300 text-right font-black font-mono text-emerald-900 text-base">₹${Number(r.taxAmount).toLocaleString('en-IN')}</td>
            </tr>
            <tr class="bg-emerald-50 font-black text-slate-900">
              <td colspan="2" class="p-2.5 border border-slate-300 text-right">कुल प्राप्त राशि (Total Tax Paid):</td>
              <td class="p-2.5 border border-slate-300 text-right font-mono text-lg text-emerald-950">₹${Number(r.taxAmount).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div class="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-950 mb-6 space-y-1">
          <div>
            <strong>✓ प्रमाणित:</strong> हितग्राही से उपरोक्त कर मद हेतु वित्तीय वर्ष <strong>${rFY} (${fyInfo.fyCode})</strong> की कुल राशि <strong>₹${Number(r.taxAmount).toLocaleString('en-IN')}</strong> सधन्यवाद प्राप्त हुई।
          </div>
          ${isAnnualTax ? `
            <div class="font-bold text-emerald-900 pt-1 border-t border-amber-200/60">
              📌 वार्षिक कर नियम: यह कर वित्तीय वर्ष में केवल 1 बार देय है। अगला कर आगामी वित्तीय वर्ष ${fyInfo.nextFyShort} (01/04/${fyInfo.endYear} से) में देय होगा।
            </div>
          ` : ''}
        </div>

        <!-- Signatures -->
        <div class="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
          <div>
            <div class="h-10"></div>
            <div class="font-bold text-slate-800">${r.collectorName || 'कर संग्राहक / लिपिक'}</div>
            <div class="text-[10px] text-slate-500">ग्राम पंचायत (हस्ताक्षर)</div>
          </div>
          <div>
            <div class="h-10"></div>
            <div class="font-bold text-slate-800">${secretaryName}</div>
            <div class="text-[10px] text-slate-500">सचिव / प्राधिकृत अधिकारी (हस्ताक्षर एवं सील)</div>
          </div>
        </div>
      </div>
    `;

    openPrintWindow(bodyHtml, `कर रसीद - ${r.receiptNo}`, 'portrait');
  };

  return (
    <div className="space-y-6">
      <ViewHeader
        title={isHindi ? '3.11 अन्य कर रसीद प्रबंधन (Other Tax Receipt)' : '3.11 Other Tax Receipt Management'}
        subtitle={
          isHindi
            ? 'प्रकाश कर, संपत्ति कर, हाट-बाजार कर, रॉयल्टी कर एवं अन्य विविध करों की रसीद जारी व संधारित करें'
            : 'Register and manage other tax receipts like Light Tax, Property Tax, Market Tax, Royalty Tax & Other Taxes'
        }
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
        icon="📜"
      />

      {/* Notification Toast */}
      {notification && (
        <div className="p-4 bg-emerald-700 text-white rounded-xl shadow-lg font-bold text-sm flex items-center justify-between animate-fade-in">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-white/80 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-black shrink-0">
            ₹
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isHindi ? 'कुल संग्रहित कर राशि' : 'Total Tax Collected'}
            </p>
            <p className="text-2xl font-black text-emerald-950 font-mono">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-2xl font-black shrink-0">
            📑
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isHindi ? 'कुल जारी रसीदें' : 'Total Receipts Issued'}
            </p>
            <p className="text-2xl font-black text-teal-950 font-mono">{receipts.length}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-2xl font-black shrink-0">
            📅
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isHindi ? 'वर्तमान वित्तीय वर्ष' : 'Current FY'}
            </p>
            <p className="text-lg font-black text-indigo-950 font-mono">{currentFormFY.fyShort}</p>
            <p className="text-[10px] text-indigo-700 font-semibold">01/04/{currentFormFY.startYear} - 31/03/{currentFormFY.endYear}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-black shrink-0">
            🛡️
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isHindi ? 'वार्षिक कर नियम' : 'Annual Tax Rule'}
            </p>
            <p className="text-xs font-black text-amber-900 leading-tight">
              {isHindi ? 'संपत्ति व दुकान कर: वर्ष में 1 बार' : 'Property & Shop Tax: Once in FY'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 shadow-xs">
        <button
          onClick={() => setActiveTab('REGISTER')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'REGISTER'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>✍️ {isHindi ? 'नई अन्य कर रसीद काटें / जारी करें' : 'Issue New Other Tax Receipt'}</span>
        </button>

        <button
          onClick={() => setActiveTab('RECORDS')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'RECORDS'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📋 {isHindi ? 'अन्य कर रसीद पंजी एवं रिकॉर्ड्स' : 'Receipts Register & Summary'}</span>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold font-mono">
            {receipts.length}
          </span>
        </button>
      </div>

      {/* TAB 1: REGISTER OTHER TAX RECEIPT */}
      {activeTab === 'REGISTER' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <form onSubmit={handleSubmitReceipt} className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📝</span> {isHindi ? 'हितग्राही चयन एवं कर विवरण दर्ज करें' : 'Select Taxpayer & Tax Details'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isHindi
                  ? 'हितग्राही को खोजकर चुनें और प्रकाश कर, संपत्ति कर, हाट-बाजार कर, रॉयल्टी कर या अन्य कर की राशि दर्ज करें'
                  : 'Search and select beneficiary and enter amount for Light Tax, Property Tax, Market Tax, Royalty Tax etc.'}
              </p>
            </div>

            {/* Beneficiary Search Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. {isHindi ? 'हितग्राही खोजें / चुनें (Select Beneficiary)' : 'Select Beneficiary'} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={beneficiarySearch}
                  onChange={(e) => {
                    setBeneficiarySearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={isHindi ? '🔍 हितग्राही का नाम, पिता का नाम, समग्र आईडी या मोबाइल नंबर से खोजें...' : 'Search by Name, Samagra ID, Mobile...'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 transition outline-hidden"
                />

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl z-30 max-h-60 overflow-y-auto custom-scrollbar">
                    {searchedFamilies.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 text-center font-medium">
                        {isHindi ? 'कोई हितग्राही नहीं मिला।' : 'No beneficiaries found.'}
                      </div>
                    ) : (
                      searchedFamilies.map((f) => (
                        <div
                          key={f.id}
                          onClick={() => handleSelectFamily(f)}
                          className={`p-3 border-b border-slate-100 hover:bg-emerald-50 cursor-pointer transition flex items-center justify-between text-xs ${
                            selectedFamilyId === f.id ? 'bg-emerald-50/90 font-bold' : ''
                          }`}
                        >
                          <div>
                            <div className="font-black text-slate-900 text-sm">
                              {f.name} {f.surname}
                            </div>
                            <div className="text-slate-600 text-[11px]">
                              पिता/पति: <strong>{f.guardianName || '-'}</strong> | वार्ड: <strong>{f.wardNo || '01'}</strong> ({f.muhalla || '-'})
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] font-bold text-slate-700">
                              समग्र: {f.samagraId || '-'}
                            </span>
                            <div className="text-[10px] text-teal-800 font-bold mt-0.5">
                              {f.category || 'APL'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Family Details Card */}
            {selectedFamily && (
              <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">{isHindi ? 'चयनित हितग्राही:' : 'Selected Name:'}</span>
                  <div className="font-black text-slate-900 text-sm">{selectedFamily.name} {selectedFamily.surname}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">{isHindi ? 'पिता / पति का नाम:' : 'Guardian:'}</span>
                  <div className="font-bold text-slate-800">{selectedFamily.guardianName || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">{isHindi ? 'समग्र आईडी:' : 'Samagra ID:'}</span>
                  <div className="font-mono font-bold text-slate-900">{selectedFamily.samagraId || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">{isHindi ? 'वार्ड व मोहल्ला:' : 'Ward & Locality:'}</span>
                  <div className="font-bold text-teal-800">वार्ड {selectedFamily.wardNo || '01'}, {selectedFamily.muhalla || '-'}</div>
                </div>
              </div>
            )}

            {/* Tax Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tax Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  2. {isHindi ? 'कर मद चुनें (Tax Head)' : 'Tax Category'} *
                </label>
                <select
                  value={taxCategory}
                  onChange={(e) => {
                    setTaxCategory(e.target.value);
                    if (e.target.value === OtherTaxCategory.COMMERCIAL_SHOP && businessRegistrations.length > 0) {
                      const firstBiz = businessRegistrations[0];
                      if (firstBiz.annualTaxRate) setTaxAmount(String(firstBiz.annualTaxRate));
                      setCustomTaxName(firstBiz.businessName);
                      setRemarks(`पंजीकृत दुकान: ${firstBiz.businessName} (प्रमाण पत्र: ${firstBiz.certificateNo})`);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                >
                  <option value={OtherTaxCategory.COMMERCIAL_SHOP}>🏪 {OtherTaxCategory.COMMERCIAL_SHOP}</option>
                  <option value={OtherTaxCategory.PROPERTY}>🏠 {OtherTaxCategory.PROPERTY}</option>
                  <option value={OtherTaxCategory.LIGHT}>💡 {OtherTaxCategory.LIGHT}</option>
                  <option value={OtherTaxCategory.HATBAZAR}>🛒 {OtherTaxCategory.HATBAZAR}</option>
                  <option value={OtherTaxCategory.ROYALTY}>⛏️ {OtherTaxCategory.ROYALTY}</option>
                  <option value={OtherTaxCategory.OTHER}>📜 {OtherTaxCategory.OTHER}</option>
                </select>
              </div>

              {/* Business Picker for 3.12 Registered Businesses */}
              {taxCategory === OtherTaxCategory.COMMERCIAL_SHOP && businessRegistrations.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider mb-1">
                    🏪 {isHindi ? '3.12 पंजीकृत दुकान / संस्थान से चुनें' : 'Select Registered Business'}
                  </label>
                  <select
                    onChange={(e) => {
                      const biz = businessRegistrations.find((b) => b.id === e.target.value);
                      if (biz) {
                        setCustomTaxName(biz.businessName);
                        if (biz.annualTaxRate) setTaxAmount(String(biz.annualTaxRate));
                        setRemarks(`पंजीकृत दुकान: ${biz.businessName} (प्रमाण पत्र: ${biz.certificateNo}, क्षेत्रफल: ${biz.shopAreaSqFt} Sq.Ft)`);
                        
                        // Try to auto match family
                        if (biz.familyId) {
                          const fam = families.find((f) => f.id === biz.familyId);
                          if (fam) handleSelectFamily(fam);
                        } else if (biz.samagraMemberId || biz.memberId) {
                          const fam = families.find((f) => f.samagraId === (biz.samagraMemberId || biz.memberId));
                          if (fam) handleSelectFamily(fam);
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                  >
                    <option value="">-- {isHindi ? 'पंजीकृत दुकान चुनें (Select Shop)' : 'Select Shop'} --</option>
                    {businessRegistrations.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.businessName} - {b.ownerName} (वार्ड {b.wardNo}, ₹{b.annualTaxRate || 200}/वर्ष)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Tax Name if OTHER or COMMERCIAL_SHOP is selected */}
              {taxCategory === OtherTaxCategory.OTHER || taxCategory === OtherTaxCategory.COMMERCIAL_SHOP ? (
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    {taxCategory === OtherTaxCategory.COMMERCIAL_SHOP
                      ? (isHindi ? 'दुकान / प्रतिष्ठान का नाम (Business Name)' : 'Business Name')
                      : (isHindi ? 'अन्य कर का विशिष्ट नाम (Custom Tax Name)' : 'Custom Tax Name')}
                  </label>
                  <input
                    type="text"
                    value={customTaxName || ''}
                    onChange={(e) => setCustomTaxName(e.target.value)}
                    placeholder={isHindi ? 'जैसे: किराना दुकान / प्रतिष्ठान कर' : 'e.g. Shop Business Tax'}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              ) : null}

              {/* Tax Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  3. {isHindi ? 'कर राशि दर्ज करें (Tax Amount ₹)' : 'Tax Amount (Rs.)'} *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={taxAmount || ''}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-emerald-950 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 font-mono"
                  />
                </div>
              </div>

              {/* Receipt Date */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  4. {isHindi ? 'रसीद दिनांक (Receipt Date)' : 'Receipt Date'} *
                </label>
                <input
                  type="date"
                  required
                  value={receiptDate || ''}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 font-mono"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  5. {isHindi ? 'भुगतान माध्यम (Payment Mode)' : 'Payment Mode'} *
                </label>
                <select
                  value={paymentMode || 'CASH'}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                >
                  <option value="CASH">💵 नकद (CASH)</option>
                  <option value="UPI">📱 यूपीआई / क्यूआर (UPI)</option>
                  <option value="BANK">🏦 बैंक ट्रांसफर / NEFT (BANK)</option>
                  <option value="CHEQUE">📑 चेक / ड्राफ्ट (CHEQUE)</option>
                </select>
              </div>

              {/* Transaction / Cheque ID */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  6. {isHindi ? 'यूटीआर / चेक / ट्रांजेक्शन क्र.' : 'Txn / Cheque No'}
                </label>
                <input
                  type="text"
                  value={transactionId || ''}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder={isHindi ? 'वैकल्पिक' : 'Optional'}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 font-mono"
                />
              </div>

              {/* Collector Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  7. {isHindi ? 'कर संग्राहक / लिपिक का नाम' : 'Collector Name'}
                </label>
                <input
                  type="text"
                  value={collectorName || ''}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder={isHindi ? 'संग्राहक का नाम' : 'Collector Name'}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                8. {isHindi ? 'टिप्पणी / विवरण (Remarks)' : 'Remarks'}
              </label>
              <input
                type="text"
                value={remarks || ''}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={isHindi ? 'कर भुगतान संबंधी कोई विशेष विवरण या टिप्पणी दर्ज करें...' : 'Optional remarks...'}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            {/* PROMINENT ANNUAL TAX RESTRICTION BANNER IF ALREADY PAID IN CURRENT FINANCIAL YEAR */}
            {annualTaxStatus.alreadyPaid && annualTaxStatus.existingReceipt && (
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-3 animate-fade-in shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center text-xl shrink-0 font-bold">
                    🔒
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-amber-950">
                      {isHindi
                        ? `वित्तीय वर्ष ${annualTaxStatus.targetFY.fyShort} (${annualTaxStatus.targetFY.fyCode}) का ${annualTaxStatus.annualTaxType === 'PROPERTY' ? 'संपत्ति कर' : 'व्यावसायिक दुकान कर'} पहले ही जमा है!`
                        : `${annualTaxStatus.annualTaxType === 'PROPERTY' ? 'Property Tax' : 'Commercial Shop Tax'} is ALREADY PAID for FY ${annualTaxStatus.targetFY.fyShort}!`}
                    </h4>
                    <p className="text-xs text-amber-900 mt-1 font-medium leading-relaxed">
                      {isHindi ? (
                        <>
                          हितग्राही <strong>"{selectedFamily?.name} {selectedFamily?.surname}"</strong> द्वारा वित्तीय वर्ष <strong>{annualTaxStatus.targetFY.fyShort}</strong> हेतु रसीद क्रमांक <strong className="font-mono text-emerald-950">{annualTaxStatus.existingReceipt.receiptNo}</strong> (दिनांक: <strong>{formatDateDDMMYYYY(annualTaxStatus.existingReceipt.receiptDate)}</strong>, राशि: <strong>₹{Number(annualTaxStatus.existingReceipt.taxAmount).toLocaleString('en-IN')}</strong>) से कर पहले ही जमा किया जा चुका है।
                        </>
                      ) : (
                        annualTaxStatus.warningEn
                      )}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <span>📌 नियम (Rule):</span>
                    <span>संपत्ति कर एवं व्यावसायिक दुकान कर वित्तीय वर्ष में केवल 1 बार (Once per Financial Year) ही देय होता है।</span>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    👉 <strong>आगामी कर देयता:</strong> अगला कर आगामी <strong>वित्तीय वर्ष ${annualTaxStatus.nextFY}</strong> (01/04/{annualTaxStatus.targetFY.endYear} से) में ही देय होगा।
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handlePrintSingleReceiptDocument(annualTaxStatus.existingReceipt!)}
                    className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>👁️</span>
                    <span>{isHindi ? `पूर्व जमा रसीद देखें (${annualTaxStatus.existingReceipt.receiptNo})` : 'View Previous Receipt'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReceiptDate(annualTaxStatus.targetFY.nextFyStartDate);
                      showNotification(
                        isHindi
                          ? `📅 दिनांक आगामी वित्तीय वर्ष (${annualTaxStatus.nextFY}) हेतु 01/04/${annualTaxStatus.targetFY.endYear} पर सेट की गई।`
                          : `Date set to next financial year ${annualTaxStatus.nextFY}.`
                      );
                    }}
                    className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📅</span>
                    <span>{isHindi ? `आगामी वित्तीय वर्ष (${annualTaxStatus.nextFY}) का अग्रिम भुगतान सेट करें` : 'Set Next Financial Year Date'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
              {annualTaxStatus.alreadyPaid ? (
                <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-black text-rose-800 flex items-center gap-2">
                  <span>❌</span>
                  <span>
                    {isHindi
                      ? `वित्तीय वर्ष ${annualTaxStatus.targetFY.fyShort} का कर पूर्व में जमा होने के कारण नया भुगतान स्वीकृत नहीं है।`
                      : `Tax for FY ${annualTaxStatus.targetFY.fyShort} is already paid.`}
                  </span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-black rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>📜</span>
                  <span>{isHindi ? 'रसीद जनरेट करें एवं कैशबुक में दर्ज करें' : 'Generate Receipt & Post to Cashbook'}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: RECORDS & REGISTER */}
      {activeTab === 'RECORDS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isHindi ? '🔍 खोजें: रसीद क्र, हितग्राही, समग्र आईडी, मोहल्ला...' : 'Search records...'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-700"
              />
            </div>

            <div>
              <select
                value={filterFY}
                onChange={(e) => setFilterFY(e.target.value)}
                className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-300 rounded-xl text-xs font-bold text-indigo-950"
              >
                <option value="ALL">📅 सभी वि.व. (All FY)</option>
                {availableFinancialYears.map((fy) => (
                  <option key={fy} value={fy}>
                    वि.व. {fy}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterTaxHead}
                onChange={(e) => setFilterTaxHead(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="ALL">सभी कर मद (All Heads)</option>
                <option value="संपत्ति">संपत्ति कर (Property)</option>
                <option value="दुकान">व्यावसायिक दुकान कर (Shop)</option>
                <option value="प्रकाश">प्रकाश कर (Light)</option>
                <option value="हाट">हाट-बाजार (Market)</option>
                <option value="रॉयल्टी">रॉयल्टी (Royalty)</option>
                <option value="अन्य">अन्य विविध (Other)</option>
              </select>
            </div>

            <div>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="ALL">सभी माध्यम (All Modes)</option>
                <option value="CASH">CASH (नकद)</option>
                <option value="UPI">UPI (क्यूआर)</option>
                <option value="BANK">BANK (बैंक)</option>
                <option value="CHEQUE">CHEQUE (चेक)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportExcel}
                className="flex-1 px-3 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Excel फ़ाइल डाउनलोड करें"
              >
                <span>📊</span>
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex-1 px-3 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="PDF रिपोर्ट प्रिंट करें"
              >
                <span>🖨️</span>
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="p-3">क्र.</th>
                  <th className="p-3">रसीद क्रमांक</th>
                  <th className="p-3">दिनांक</th>
                  <th className="p-3">वित्तीय वर्ष</th>
                  <th className="p-3">हितग्राही का नाम</th>
                  <th className="p-3">समग्र आईडी</th>
                  <th className="p-3">वार्ड व मोहल्ला</th>
                  <th className="p-3">कर का प्रकार (Tax Head)</th>
                  <th className="p-3 text-right">कर राशि (₹)</th>
                  <th className="p-3 text-center">माध्यम</th>
                  <th className="p-3 text-center">कार्रवाई</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400 font-semibold">
                      {isHindi ? 'कोई अन्य कर रसीद रिकॉर्ड उपलब्ध नहीं है।' : 'No other tax receipt records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r, idx) => {
                    const rFY = r.financialYear || getFinancialYear(r.receiptDate).fyShort;
                    const isAnnual = isPropertyTaxHead(r.taxHead) || isCommercialShopTaxHead(r.taxHead);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-3 font-bold font-mono text-emerald-950">{r.receiptNo}</td>
                        <td className="p-3 font-mono text-slate-700">{formatDateDDMMYYYY(r.receiptDate)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded font-mono font-bold text-[10px] text-indigo-900">
                            FY {rFY}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{r.beneficiaryName}</div>
                          <div className="text-[10px] text-slate-500">पिता/पति: {r.guardianName || r.fatherHusbandName || '-'}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-700">{r.samagraId || '-'}</td>
                        <td className="p-3 text-slate-700">W-{r.wardNo || '01'}, {r.muhalla || '-'}</td>
                        <td className="p-3">
                          <div className="font-bold text-teal-900">{r.taxHead}</div>
                          {isAnnual && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-amber-50 border border-amber-200 rounded text-[9px] font-bold text-amber-800">
                              📅 वार्षिक कर (1 बार देय)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-black font-mono text-emerald-950 text-sm">
                          ₹{Number(r.taxAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-semibold text-[10px] text-slate-800">
                            {r.paymentMode}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrintSingleReceiptDocument(r)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition cursor-pointer"
                              title="रसीद प्रिंट करें"
                            >
                              🖨️
                            </button>
                            {onDeleteReceipt && (
                              <button
                                type="button"
                                onClick={() => setDeletingReceipt(r)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
                                title={isHindi ? 'हटाएं' : 'Delete'}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Instant Print Preview after generation */}
      {selectedReceiptForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  🎉 {isHindi ? 'रसीद सफलतापूर्वक जारी हुई!' : 'Receipt Generated!'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">रसीद क्र.: {selectedReceiptForPrint.receiptNo}</p>
              </div>
              <button
                onClick={() => setSelectedReceiptForPrint(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">करदाता / हितग्राही:</span>
                <span className="font-bold text-slate-900">{selectedReceiptForPrint.beneficiaryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">कर का मद (Tax Head):</span>
                <span className="font-bold text-teal-900">{selectedReceiptForPrint.taxHead}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">प्राप्त कर राशि:</span>
                <span className="font-black text-emerald-950 font-mono text-sm">
                  ₹{Number(selectedReceiptForPrint.taxAmount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">भुगतान माध्यम:</span>
                <span className="font-semibold text-slate-800">{selectedReceiptForPrint.paymentMode}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedReceiptForPrint(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                {isHindi ? 'समाप्त करें (Done)' : 'Close'}
              </button>
              <button
                onClick={() => {
                  handlePrintSingleReceiptDocument(selectedReceiptForPrint);
                  setSelectedReceiptForPrint(null);
                }}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs shadow flex items-center gap-2"
              >
                <span>🖨️</span>
                <span>{isHindi ? 'रसीद प्रिंट करें / PDF निकालें' : 'Print Official Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {deletingReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-rose-200 animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🗑️
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                {isHindi ? 'अन्य कर रसीद हटाएं?' : 'Delete Tax Receipt?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isHindi ? (
                  <>
                    क्या आप रसीद क्र. <span className="font-mono font-bold text-emerald-800">{deletingReceipt.receiptNo}</span> (हितग्राही: <strong>{deletingReceipt.beneficiaryName}</strong> | राशि: <strong>₹{Number(deletingReceipt.taxAmount).toLocaleString('en-IN')}</strong>) को स्थायी रूप से हटाना चाहते हैं?
                  </>
                ) : (
                  <>
                    Are you sure you want to delete receipt <span className="font-mono font-bold">{deletingReceipt.receiptNo}</span> for <strong>{deletingReceipt.beneficiaryName}</strong> (₹{Number(deletingReceipt.taxAmount).toLocaleString('en-IN')})?
                  </>
                )}
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 text-left font-medium">
                ⚠️ {isHindi ? 'नोट: यह रिकॉर्ड एवं संबंधित रोकड़बही (Cashbook) आय प्रविष्टि दोनों हटा दी जाएंगी।' : 'Note: Record and associated cashbook voucher will be deleted.'}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingReceipt}
                onClick={() => setDeletingReceipt(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {isHindi ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={isDeletingReceipt}
                onClick={async () => {
                  if (!deletingReceipt) return;
                  const idToDelete = deletingReceipt.id;
                  try {
                    setIsDeletingReceipt(true);
                    if (selectedReceiptForPrint?.id === idToDelete) {
                      setSelectedReceiptForPrint(null);
                    }
                    if (onDeleteReceipt) {
                      await onDeleteReceipt(idToDelete);
                    }
                  } finally {
                    setIsDeletingReceipt(false);
                    setDeletingReceipt(null);
                  }
                }}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>🗑️</span>
                <span>{isDeletingReceipt ? 'हटाया जा रहा है...' : (isHindi ? 'हाँ, हटाएं' : 'Delete Now')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE RECEIPT WARNING MODAL */}
      {duplicateModalInfo && <DuplicateWarningModal {...duplicateModalInfo} />}

      {/* SUCCESS CONFIRMATION POPUP MODAL */}
      {successModalInfo && <SuccessPopupModal {...successModalInfo} />}
    </div>
  );
};

export default OtherTaxView;
