import React, { useState, useMemo } from 'react';
import { Family, Tax, Payment, BeneficiaryCategory, OfficeDetails, Admin } from '../types';
import ViewHeader from './ViewHeader';
import { formatDateDDMMYYYY, getCleanOfficeTitle } from '../utils/printUtils';
import { exportBulkMemberCardsToPDF, exportToExcel, exportToPDF } from '../utils/exportUtils';
import {
  DuplicateWarningModal,
  DuplicateWarningDetails,
  SuccessPopupModal,
  SuccessPopupDetails,
} from './EntryFeedbackModals';
import {
  parseBeneficiaryFile,
  downloadSampleExcelTemplate,
  downloadSampleCsvTemplate,
  isCorruptedQuestionMarks,
  ParsedBeneficiaryResult,
} from '../utils/indicUtils';

interface BeneficiaryManagementViewProps {
  families: Family[];
  taxes: Tax[];
  payments: Payment[];
  officeDetails?: OfficeDetails;
  admin?: Admin | null;
  onAddFamily: (family: Omit<Family, 'id'>) => void;
  onAddFamiliesBatch?: (
    families: Omit<Family, 'id'>[],
    onProgress?: (processed: number, total: number) => void
  ) => Promise<void>;
  onDeleteFamiliesBatch?: (familyIds: string[]) => Promise<void>;
  onUpdateFamily: (family: Family) => void;
  onDeleteFamily: (familyId: string) => void;
  onSelectFamily: (family: Family) => void;
  onIssueTax: (family: Family) => void;
  onReceivePayment: (family: Family) => void;
  onOpenMemberCard?: (family: Family) => void;
  onToggleLockFamily?: (familyId: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  autoOpenAddModal?: boolean;
  onResetAutoOpenModal?: () => void;
  isHindi?: boolean;
}

export const BeneficiaryManagementView: React.FC<BeneficiaryManagementViewProps> = ({
  families,
  taxes,
  payments,
  officeDetails,
  admin,
  onAddFamily,
  onAddFamiliesBatch,
  onDeleteFamiliesBatch,
  onUpdateFamily,
  onDeleteFamily,
  onSelectFamily,
  onIssueTax,
  onReceivePayment,
  onOpenMemberCard,
  onToggleLockFamily,
  onBack,
  onClose,
  autoOpenAddModal,
  onResetAutoOpenModal,
  isHindi = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedBeneficiaryResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkImportSuccessMsg, setBulkImportSuccessMsg] = useState<string | null>(null);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [deleteConfirmFamilyModal, setDeleteConfirmFamilyModal] = useState<{ id: string; name: string } | null>(null);
  const [isClearCorruptedModalOpen, setIsClearCorruptedModalOpen] = useState(false);
  const [isClearingCorrupted, setIsClearingCorrupted] = useState(false);

  // Duplicate Warning & Success Popup Modal State
  const [duplicateModalInfo, setDuplicateModalInfo] = useState<DuplicateWarningDetails | null>(null);
  const [successModalInfo, setSuccessModalInfo] = useState<SuccessPopupDetails | null>(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Count corrupted question-mark records in current database
  const corruptedFamilies = useMemo(() => {
    return families.filter(
      (f) =>
        isCorruptedQuestionMarks(f.name) ||
        isCorruptedQuestionMarks(f.surname) ||
        isCorruptedQuestionMarks(f.guardianName)
    );
  }, [families]);

  // Helper to check duplicate Samagra ID
  const isSamagraDuplicate = (samagraIdToCheck: string, excludeFamilyId?: string) => {
    if (!samagraIdToCheck || !samagraIdToCheck.trim()) return false;
    const cleanId = samagraIdToCheck.trim().toLowerCase();
    return families.some(
      (f) => f.id !== excludeFamilyId && f.samagraId && f.samagraId.trim().toLowerCase() === cleanId
    );
  };

  React.useEffect(() => {
    if (autoOpenAddModal) {
      handleOpenAddModal();
      if (onResetAutoOpenModal) {
        onResetAutoOpenModal();
      }
    }
  }, [autoOpenAddModal]);

  const [formData, setFormData] = useState({
    samagraId: '',
    familyId: '',
    name: '',
    surname: '',
    guardianName: '',
    mobile: '',
    category: BeneficiaryCategory.APL,
    memberCount: 4,
    wardNo: '01',
    muhalla: 'मुख्य बस्ती',
    address: '',
    registrationDate: new Date().toISOString().split('T')[0],
  });

  const getFamilyDues = (familyId: string) => {
    const familyTaxes = taxes.filter((t) => t.familyId === familyId);
    const familyPayments = payments.filter((p) => p.familyId === familyId);

    const charged = familyTaxes.reduce((sum, t) => sum + t.amount, 0);
    const penalties = familyPayments.reduce((sum, p) => sum + (p.penalty || 0), 0);
    const concessions = familyPayments.reduce((sum, p) => sum + (p.concession || 0), 0);
    const paid = familyPayments.reduce((sum, p) => sum + p.amount, 0);

    return Math.max(0, charged + penalties - concessions - paid);
  };

  const filteredFamilies = useMemo(() => {
    return families.filter((f) => {
      const query = searchTerm.toLowerCase();
      const matchesQuery =
        !query ||
        f.name.toLowerCase().includes(query) ||
        f.surname.toLowerCase().includes(query) ||
        f.samagraId.toLowerCase().includes(query) ||
        (f.familyId && f.familyId.toLowerCase().includes(query)) ||
        f.mobile.toLowerCase().includes(query) ||
        f.guardianName.toLowerCase().includes(query) ||
        (f.wardNo && f.wardNo.toLowerCase().includes(query)) ||
        (f.muhalla && f.muhalla.toLowerCase().includes(query)) ||
        (f.category && f.category.toLowerCase().includes(query));

      const matchesCategory = selectedCategory === 'ALL' || f.category === selectedCategory;

      return matchesQuery && matchesCategory;
    });
  }, [families, searchTerm, selectedCategory]);

  const handleOpenAddModal = () => {
    setEditingFamily(null);
    setFormData({
      samagraId: '',
      familyId: '',
      name: '',
      surname: '',
      guardianName: '',
      mobile: '',
      category: BeneficiaryCategory.APL,
      memberCount: 4,
      wardNo: '01',
      muhalla: '',
      address: '',
      registrationDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (family: Family) => {
    setEditingFamily(family);
    setFormData({
      samagraId: family.samagraId || '',
      familyId: family.familyId || '',
      name: family.name || '',
      surname: family.surname || '',
      guardianName: family.guardianName || '',
      mobile: family.mobile || '',
      category: family.category || BeneficiaryCategory.APL,
      memberCount: family.memberCount || 1,
      wardNo: family.wardNo || '01',
      muhalla: family.muhalla || '',
      address: family.address || '',
      registrationDate: family.registrationDate || new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const executeSaveFamily = () => {
    if (editingFamily) {
      onUpdateFamily({
        ...editingFamily,
        ...formData,
      });
    } else {
      onAddFamily(formData);
    }
    setIsModalOpen(false);

    // Show Success Confirmation Popup
    setSuccessModalInfo({
      title: editingFamily
        ? isHindi
          ? 'हितग्राही विवरण अद्यतन हुआ!'
          : 'Beneficiary Updated Successfully!'
        : isHindi
        ? 'हितग्राही सफलतापूर्वक दर्ज हुआ!'
        : 'Beneficiary Registered Successfully!',
      message: isHindi
        ? `हितग्राही श्री/श्रीमती ${formData.name} ${formData.surname} का विवरण ग्राम पंचायत पोर्टल में सुरक्षित कर लिया गया है।`
        : `Beneficiary record for ${formData.name} ${formData.surname} has been saved successfully.`,
      recordType: isHindi ? 'हितग्राही पंजीयन' : 'BENEFICIARY REGISTRATION',
      details: [
        { label: isHindi ? 'हितग्राही का नाम' : 'Name', value: `${formData.name} ${formData.surname}` },
        { label: isHindi ? 'समग्र आईडी' : 'Samagra ID', value: formData.samagraId || '-' },
        { label: isHindi ? 'पिता / पति का नाम' : 'Guardian', value: formData.guardianName || '-' },
        { label: isHindi ? 'वार्ड क्रमांक' : 'Ward No', value: `वार्ड क्र. ${formData.wardNo}` },
        { label: isHindi ? 'श्रेणी' : 'Category', value: formData.category || 'APL' },
      ],
      onPrint: () => {
        setSuccessModalInfo(null);
        if (onOpenMemberCard) {
          onOpenMemberCard({
            id: editingFamily ? editingFamily.id : 'temp-' + Date.now(),
            ...formData,
          });
        }
      },
      printButtonLabel: isHindi ? '🪪 सदस्य कार्ड देखें' : 'View Member Card',
      onClose: () => setSuccessModalInfo(null),
      isHindi,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check duplicate by Samagra ID or by Name + Surname + Ward
    const duplicateMatch = families.find((f) => {
      if (f.id === editingFamily?.id) return false;
      const sameSamagra =
        formData.samagraId &&
        f.samagraId &&
        f.samagraId.trim().toLowerCase() === formData.samagraId.trim().toLowerCase();
      const sameNameAndWard =
        formData.name.trim().toLowerCase() === f.name.trim().toLowerCase() &&
        formData.surname.trim().toLowerCase() === f.surname.trim().toLowerCase() &&
        formData.wardNo === f.wardNo;
      return sameSamagra || sameNameAndWard;
    });

    if (duplicateMatch) {
      setDuplicateModalInfo({
        title: isHindi ? 'समान हितग्राही प्रविष्टि चेतावनी' : 'Duplicate Beneficiary Warning',
        message: isHindi
          ? `⚠️ इस विवरण (समग्र आईडी: ${formData.samagraId || '-'} अथवा नाम: ${formData.name} ${formData.surname}, वार्ड क्र. ${formData.wardNo}) से मिलता-जुलता हितग्राही रिकॉर्ड पहले से मौजूद है!`
          : `⚠️ A beneficiary record with matching details (Samagra ID: ${formData.samagraId || '-'} or Name: ${formData.name} ${formData.surname}) already exists!`,
        duplicateInfo: [
          {
            label: isHindi ? 'मौजूदा हितग्राही का नाम' : 'Existing Name',
            value: `${duplicateMatch.name} ${duplicateMatch.surname}`,
          },
          { label: isHindi ? 'समग्र आईडी' : 'Samagra ID', value: duplicateMatch.samagraId || '-' },
          { label: isHindi ? 'पिता / पति' : 'Guardian', value: duplicateMatch.guardianName || '-' },
          {
            label: isHindi ? 'वार्ड क्रमांक' : 'Ward No',
            value: `वार्ड क्र. ${duplicateMatch.wardNo || '01'}`,
          },
        ],
        onConfirm: () => {
          setDuplicateModalInfo(null);
          executeSaveFamily();
        },
        onCancel: () => {
          setDuplicateModalInfo(null);
        },
        isHindi,
      });
      return;
    }

    executeSaveFamily();
  };

  const handleLockAll = () => {
    families.forEach((f) => {
      if (f.isLocked === false && onToggleLockFamily) {
        onToggleLockFamily(f.id);
      }
    });
  };

  const allLocked = families.length > 0 && families.every((f) => f.isLocked !== false);

  // HANDLE SPREADSHEET FILE SELECTION (EXCEL / CSV / TSV / TXT)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setIsParsingFile(true);
    try {
      const result = await parseBeneficiaryFile(file, families);
      setParsedResult(result);
    } catch (err) {
      console.error('Error parsing file:', err);
      alert(
        isHindi
          ? 'फ़ाइल पढ़ने में त्रुटि। कृपया सुनिश्चित करें कि फ़ाइल सही Excel (.xlsx) या CSV प्रारूप में है।'
          : 'Error reading file. Please ensure the file is in valid Excel (.xlsx) or CSV format.'
      );
    } finally {
      setIsParsingFile(false);
    }
  };

  // CONFIRM BULK IMPORT
  const handleConfirmBulkImport = async () => {
    if (!parsedResult || parsedResult.records.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedResult.records.length });

    try {
      if (onAddFamiliesBatch) {
        await onAddFamiliesBatch(parsedResult.records, (current, total) => {
          setImportProgress({ current, total });
        });
      } else {
        parsedResult.records.forEach((ben) => {
          onAddFamily(ben);
        });
      }

      setBulkImportSuccessMsg(
        isHindi
          ? `✅ कुल ${parsedResult.records.length} हितग्राही रिकॉर्ड्स देवनागरी/हिंदी फ़ॉन्ट में सफलतापूर्वक आयात हुए!`
          : `✅ Successfully imported ${parsedResult.records.length} beneficiary records!`
      );

      setTimeout(() => {
        setBulkImportSuccessMsg(null);
        setIsBulkModalOpen(false);
        setParsedResult(null);
        setBulkFile(null);
        setIsImporting(false);
        setImportProgress(null);
      }, 2000);
    } catch (err) {
      console.error('Import failed:', err);
      alert(isHindi ? 'आयात प्रक्रिया में त्रुटि!' : 'Import failed!');
      setIsImporting(false);
    }
  };

  // CLEAR ALL CORRUPTED QUESTION MARK RECORDS
  const handleClearAllCorruptedRecords = async () => {
    if (corruptedFamilies.length === 0) return;
    setIsClearingCorrupted(true);
    try {
      const corruptedIds = corruptedFamilies.map((f) => f.id);
      if (onDeleteFamiliesBatch) {
        await onDeleteFamiliesBatch(corruptedIds);
      } else {
        corruptedIds.forEach((id) => onDeleteFamily(id));
      }
      setIsClearCorruptedModalOpen(false);
      setSelectedIds([]);
    } catch (err) {
      console.error('Error clearing corrupted records:', err);
    } finally {
      setIsClearingCorrupted(false);
    }
  };

  // DELETE SELECTED RECORDS
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        isHindi
          ? `क्या आप चयनित ${selectedIds.length} हितग्राहियों को हटाना चाहते हैं?`
          : `Are you sure you want to delete ${selectedIds.length} selected beneficiaries?`
      )
    ) {
      return;
    }

    if (onDeleteFamiliesBatch) {
      await onDeleteFamiliesBatch(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteFamily(id));
    }
    setSelectedIds([]);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredFamilies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFamilies.map((f) => f.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // PRINT ALL / SELECTED MEMBER CARDS
  const handlePrintMemberCards = (targetList?: Family[]) => {
    const listToPrint = targetList || (selectedIds.length > 0 
      ? families.filter((f) => selectedIds.includes(f.id))
      : filteredFamilies.length > 0 ? filteredFamilies : families);

    if (listToPrint.length === 0) {
      alert(isHindi ? 'प्रिंट करने हेतु कोई हितग्राही उपलब्ध नहीं है।' : 'No beneficiaries available to print.');
      return;
    }

    const officeName = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
    const filename = `Member_Cards_${listToPrint.length}_Records_${new Date().getFullYear()}`;
    exportBulkMemberCardsToPDF(filename, listToPrint, taxes, payments, officeDetails, admin);
  };

  // EXPORT BENEFICIARIES EXCEL
  const handleExportExcel = () => {
    const filename = `Beneficiary_Register_${formatDateDDMMYYYY(new Date()).replace(/\//g, '-')}`;
    const headers = [
      'क्र. (S.No)',
      'हितग्राही का नाम (Beneficiary Name)',
      'पिता / पति का नाम (Father / Husband)',
      'समग्र आईडी (Samagra ID)',
      'परिवार आईडी (Family ID)',
      'श्रेणी (Category)',
      'वार्ड क्र. (Ward No)',
      'मोहल्ला / क्षेत्र (Muhalla)',
      'मोबाइल नं. (Mobile)',
      'पंजीयन दिनांक (Reg. Date)',
      'लॉक स्थिति (Lock Status)',
      'कुल बकाया कर (₹)'
    ];

    const rows = filteredFamilies.map((f, idx) => {
      const dues = getFamilyDues(f.id);
      return [
        idx + 1,
        `${f.name} ${f.surname}`,
        f.guardianName || f.fatherHusbandName || '-',
        f.samagraId || '-',
        f.familyId || '-',
        f.category || 'APL',
        f.wardNo || '01',
        f.muhalla || '-',
        f.mobile || '-',
        f.registrationDate ? formatDateDDMMYYYY(f.registrationDate) : '-',
        f.isLocked !== false ? 'Locked' : 'Unlocked',
        dues
      ];
    });

    exportToExcel(filename, 'Beneficiaries', headers, rows);
  };

  // EXPORT BENEFICIARIES PDF
  const handleExportPDF = () => {
    const filename = `Beneficiary_List_${formatDateDDMMYYYY(new Date()).replace(/\//g, '-')}`;
    const officeName = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
    const title = isHindi ? 'पंजीकृत हितग्राही / करदाता पंजी सूची' : 'Registered Beneficiaries & Taxpayers Register';
    const subtitle = isHindi 
      ? `कुल पंजीकृत हितग्राही: ${filteredFamilies.length} | श्रेणी: ${selectedCategory} | मोहल्ला एवं वार्डवार विवरण`
      : `Total Taxpayers: ${filteredFamilies.length} | Category: ${selectedCategory} | With Ward & Muhalla Details`;

    const headers = [
      'क्र.',
      'हितग्राही नाम',
      'पिता/पति',
      'समग्र ID',
      'श्रेणी',
      'वार्ड',
      'मोहल्ला (Muhalla)',
      'मोबाइल',
      'बकाया कर (₹)'
    ];

    const rows = filteredFamilies.map((f, idx) => {
      const dues = getFamilyDues(f.id);
      return [
        idx + 1,
        `${f.name} ${f.surname}`,
        f.guardianName || f.fatherHusbandName || '-',
        f.samagraId || '-',
        f.category || 'APL',
        f.wardNo || '01',
        f.muhalla || '-',
        f.mobile || '-',
        dues
      ];
    });

    exportToPDF(filename, title, subtitle, headers, rows, officeName);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in max-w-7xl font-sans">
      {/* STANDARDIZED HEADER */}
      <ViewHeader
        title={isHindi ? 'हितग्राही प्रबंधन एवं लॉक' : 'Beneficiary Management & Lock'}
        subtitle={
          isHindi
            ? 'समग्र आईडी, परिवार आईडी, श्रेणी (BPL/APL/Divyang) एवं मोहल्ला अनुसार पंजीकृत हितग्राही रिकॉर्ड'
            : 'Registered beneficiary records by Samagra ID, Family ID, Category, Ward & Locality'
        }
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            {/* PRINT ALL MEMBER CARDS BUTTON */}
            <button
              onClick={() => handlePrintMemberCards()}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-teal-700"
              title={isHindi ? 'समस्त हितग्राहियों के सदस्य कार्ड एक साथ प्रिंट करें' : 'Print All Member Cards in Bulk'}
            >
              <span>🖨️</span>
              <span>{isHindi ? 'सभी सदस्य कार्ड प्रिंट करें' : 'Print All Member Cards'}</span>
            </button>

            {/* EXCEL EXPORT BUTTON */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-600"
              title={isHindi ? 'मोहल्ला सहित एक्सेल सूची डाउनलोड करें' : 'Export Excel List with Muhalla'}
            >
              <span>📊</span>
              <span>{isHindi ? 'एक्सेल (Excel)' : 'Excel Export'}</span>
            </button>

            {/* PDF EXPORT BUTTON */}
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title={isHindi ? 'मोहल्ला सहित पीडीएफ सूची डाउनलोड करें' : 'Export PDF List with Muhalla'}
            >
              <span>📄</span>
              <span>{isHindi ? 'पीडीएफ (PDF)' : 'PDF Export'}</span>
            </button>

            <button
              onClick={() => {
                setBulkFile(null);
                setParsedResult(null);
                setIsBulkModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-600"
            >
              <span>📊</span>
              <span>{isHindi ? 'थोक प्रविष्टि (Excel / CSV)' : 'Bulk Upload (Excel/CSV)'}</span>
            </button>
            <button
              onClick={handleLockAll}
              className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border ${
                allLocked
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-emerald-600 text-white border-emerald-500'
              }`}
            >
              <span>{allLocked ? '🔒' : '🔓'}</span>
              <span>
                {allLocked
                  ? isHindi
                    ? 'समस्त लॉक हैं'
                    : 'All Locked'
                  : isHindi
                  ? 'समस्त हितग्राही लॉक करें'
                  : 'Lock All Beneficiaries'}
              </span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-xs sm:text-sm gap-2 shrink-0 border border-emerald-500 cursor-pointer"
            >
              <span>👤+</span>
              <span>{isHindi ? '+ नया पंजीयन' : '+ Register Beneficiary'}</span>
            </button>
          </div>
        }
      />

      {/* CORRUPTED QUESTION MARKS WARNING & REPAIR BANNER */}
      {corruptedFamilies.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-black flex items-center justify-center text-xl shrink-0 border border-amber-300">
              ⚠️
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <span>{isHindi ? 'अमान्य प्रश्नचिह्न (????) रिकॉर्ड्स का पता चला!' : 'Corrupted (????) Records Detected!'}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black">
                  {corruptedFamilies.length} {isHindi ? 'रिकॉर्ड्स' : 'Records'}
                </span>
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {isHindi
                  ? 'आपके डेटाबेस में पुराने CSV अपलोड के कारण नाम "????" के रूप में दिख रहे हैं। आप इन ख़राब रिकॉर्ड्स को एक क्लिक में हटाकर अपनी मूल Excel (.xlsx) फ़ाइल से साफ़ हिंदी में पुनः अपलोड कर सकते हैं।'
                  : 'Names in your database appear as "????" due to previous ANSI CSV encoding. Clean these invalid records and re-upload using our direct Excel (.xlsx) importer.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsClearCorruptedModalOpen(true)}
              className="w-full md:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-500"
            >
              <span>🗑️</span>
              <span>
                {isHindi
                  ? `समस्त ${corruptedFamilies.length} अमान्य रिकॉर्ड्स हटाएं`
                  : `Clear ${corruptedFamilies.length} Corrupted Records`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* SEARCH FILTER & STATS BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <svg
              className="w-5 h-5 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={
                isHindi
                  ? 'नाम, समग्र/परिवार आईडी, मोबाइल, वार्ड, मोहल्ला से खोजें...'
                  : 'Search by Name, Mobile, Samagra/Family ID, Ward...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
          >
            <option value="ALL">All Categories (सभी)</option>
            <option value="BPL">BPL (बीपीएल)</option>
            <option value="APL">APL (एपीएल)</option>
            <option value="DIVYANG">DIVYANG (दिव्यांग)</option>
            <option value="OTHER">OTHER (अन्य)</option>
          </select>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintMemberCards(families.filter((f) => selectedIds.includes(f.id)))}
                className="w-full sm:w-auto px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer border border-teal-700"
              >
                <span>🖨️</span>
                <span>{isHindi ? `चयनित कार्ड प्रिंट करें (${selectedIds.length})` : `Print Selected Cards (${selectedIds.length})`}</span>
              </button>

              <button
                onClick={handleDeleteSelected}
                className="w-full sm:w-auto px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>🗑️</span>
                <span>{isHindi ? `हटाएं (${selectedIds.length})` : `Delete (${selectedIds.length})`}</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <span className="bg-slate-100 px-3 py-1.5 rounded-lg border">
            {isHindi ? 'कुल पंजीकृत:' : 'Total Registered:'} <strong className="text-slate-900">{families.length}</strong>
          </span>
          <span className="bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-200">
            {isHindi ? 'प्रदर्शित:' : 'Showing:'} <strong className="text-emerald-700">{filteredFamilies.length}</strong>
          </span>
        </div>
      </div>

      {/* BENEFICIARIES TABLE */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredFamilies.length > 0 && selectedIds.length === filteredFamilies.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">
                  {isHindi ? 'हितग्राही का नाम' : 'Beneficiary Name'}
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">
                  {isHindi ? 'श्रेणी' : 'Category'}
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">
                  {isHindi ? 'समग्र एवं परिवार आईडी' : 'Samagra & Family ID'}
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">
                  {isHindi ? 'पंजीयन तिथि' : 'Reg. Date'}
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">
                  {isHindi ? 'वार्ड एवं मोबाइल' : 'Ward & Mobile'}
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">
                  {isHindi ? 'लॉक स्थिति' : 'Lock Status'}
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">
                  {isHindi ? 'बकाया स्थिति' : 'Dues Status'}
                </th>
                <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase">
                  {isHindi ? 'कार्रवाई' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredFamilies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500 text-sm">
                    {isHindi ? 'कोई हितग्राही रिकॉर्ड नहीं मिला।' : 'No beneficiary records found.'}
                  </td>
                </tr>
              ) : (
                filteredFamilies.map((family) => {
                  const dues = getFamilyDues(family.id);
                  const isLocked = family.isLocked !== false;
                  const isCorrupted =
                    isCorruptedQuestionMarks(family.name) ||
                    isCorruptedQuestionMarks(family.surname) ||
                    isCorruptedQuestionMarks(family.guardianName);
                  const isSelected = selectedIds.includes(family.id);

                  return (
                    <tr
                      key={family.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : isCorrupted ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(family.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {family.name} {family.surname}
                          </span>
                          {isCorrupted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                              ⚠️ {isHindi ? 'अमान्य फ़ॉन्ट' : 'Font Error'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {isHindi ? 'पिता/पति:' : 'S/o, W/o:'} {family.guardianName || 'N/A'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            family.category === 'BPL'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : family.category === 'DIVYANG'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : family.category === 'APL'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {family.category || 'APL'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs text-slate-700 font-mono">
                          <span className="text-slate-400">S-ID:</span>{' '}
                          <strong className="text-slate-900">{family.samagraId}</strong>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          <span className="text-slate-400">F-ID:</span> {family.familyId || 'N/A'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                          <span>📅</span>
                          <span>{family.registrationDate ? formatDateDDMMYYYY(family.registrationDate) : 'N/A'}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs text-slate-800 font-medium">
                          {isHindi ? 'वार्ड' : 'Ward'} {family.wardNo || '01'}
                          {family.muhalla ? ` • ${family.muhalla}` : ''}
                        </div>
                        <div className="text-xs text-slate-600 font-mono flex items-center gap-1">
                          <span>📞</span>
                          <span>{family.mobile || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1.5">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>🔒</span>
                              <span>{isHindi ? 'Locked (प्रोफ़ाइल लॉक)' : 'Locked'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <span>🔓</span>
                              <span>{isHindi ? 'Unlocked (संपादन खुला)' : 'Unlocked'}</span>
                            </span>
                          )}

                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            {onToggleLockFamily && (
                              <button
                                type="button"
                                onClick={() => onToggleLockFamily(family.id)}
                                className={`text-[10px] font-bold underline flex items-center gap-0.5 cursor-pointer ${
                                  isLocked ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'
                                }`}
                                title={isLocked ? (isHindi ? 'प्रोफ़ाइल अनलॉक करें' : 'Unlock Profile') : (isHindi ? 'प्रोफ़ाइल लॉक करें' : 'Lock Profile')}
                              >
                                <span>{isLocked ? '🔓' : '🔒'}</span>
                                <span>{isLocked ? (isHindi ? 'Unlock Profile' : 'Unlock Profile') : (isHindi ? 'Lock Profile' : 'Lock Profile')}</span>
                              </button>
                            )}

                            {onOpenMemberCard && (
                              <button
                                type="button"
                                onClick={() => onOpenMemberCard(family)}
                                className="text-[10px] font-black text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title={isHindi ? `${family.name} का सदस्य पहचान पत्र देखें` : `View Member Card for ${family.name}`}
                              >
                                <span>🪪</span>
                                <span>{isHindi ? 'सदस्य कार्ड' : 'Member Card'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {dues > 0 ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            ₹{dues.toLocaleString('en-IN')} Due
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ₹0 Cleared
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenMemberCard && (
                            <button
                              onClick={() => onOpenMemberCard(family)}
                              className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border border-amber-200"
                              title={isHindi ? 'सदस्य पहचान पत्र (प्रिंट)' : 'Print Member ID Card'}
                            >
                              🪪
                            </button>
                          )}
                          <button
                            onClick={() => onSelectFamily(family)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title={isHindi ? 'विवरण देखें' : 'View Details'}
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(family)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title={isHindi ? 'संपादित करें' : 'Edit'}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteConfirmFamilyModal({ id: family.id, name: `${family.name} ${family.surname}` })}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={isHindi ? 'हटाएं' : 'Delete'}
                          >
                            🗑️
                          </button>
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

      {/* BULK IMPORT MODAL (EXCEL .XLSX / CSV WITH INDIC FONT SUPPORT) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 my-8 animate-fade-in font-sans max-h-[90vh] overflow-y-auto">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
                  📊
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    {isHindi ? 'हितग्राही थोक प्रविष्टि (Excel / CSV Import)' : 'Bulk Beneficiary Import'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isHindi
                      ? 'हिंदी / देवनागरी (Indic Input, Mangal, Kruti Dev) एवं अंग्रेजी फ़ॉन्ट पूर्ण समर्थित'
                      : 'Full support for Indic Unicode, Mangal, InScript, Kruti Dev & English'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setParsedResult(null);
                  setBulkFile(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {bulkImportSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl font-bold text-sm text-center">
                {bulkImportSuccessMsg}
              </div>
            )}

            {/* STEP 1: SAMPLE TEMPLATES DOWNLOAD */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💡</span>
                    <span>{isHindi ? 'स्टेप 1: नमूना फ़ाइल प्रारूप डाउनलोड करें' : 'Step 1: Download Sample Format'}</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    {isHindi
                      ? 'हिंदी नामों के लिए Excel (.xlsx) प्रारूप सर्वोत्तम है, जिसमें फॉन्ट कभी ख़राब नहीं होता:'
                      : 'Excel (.xlsx) is recommended for Indic & Hindi fonts to prevent character loss:'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadSampleExcelTemplate(isHindi)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-500"
                  >
                    <span>📊</span>
                    <span>{isHindi ? 'नमूना Excel (.xlsx)' : 'Sample Excel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadSampleCsvTemplate(isHindi)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📄</span>
                    <span>CSV (UTF-8)</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono bg-white p-2.5 rounded-xl border border-slate-200 overflow-x-auto">
                <span className="font-bold text-slate-700">{isHindi ? 'कॉलम क्रम:' : 'Columns:'}</span> Samagra ID, Family ID, First Name (नाम), Surname (उपनाम), Guardian Name (पिता/पति), Mobile, Category (BPL/APL/DIVYANG), Member Count, Ward No, Muhalla, Address
              </div>
            </div>

            {/* STEP 2: FILE UPLOAD ZONE */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                {isHindi ? 'स्टेप 2: अपनी Excel (.xlsx, .xls) या CSV फ़ाइल चुनें:' : 'Step 2: Choose Excel or CSV File:'}
              </label>

              <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .tsv, .txt, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-csv-file-input"
                />
                <label htmlFor="excel-csv-file-input" className="cursor-pointer block space-y-2">
                  <div className="text-3xl">📁</div>
                  <div className="text-xs font-bold text-slate-800">
                    {bulkFile
                      ? `चयनित फ़ाइल: ${bulkFile.name}`
                      : isHindi
                      ? 'Excel (.xlsx) या CSV फ़ाइल चुनने के लिए यहाँ क्लिक करें'
                      : 'Click here to choose Excel or CSV file'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isHindi
                      ? 'Microsoft Indic Input, Kruti Dev 010, Mangal एवं Unicode हिंदी समर्थित'
                      : 'Supports Microsoft Indic Input, Kruti Dev, Mangal & Devanagari Unicode'}
                  </p>
                </label>
              </div>
            </div>

            {/* PARSING LOADER */}
            {isParsingFile && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800 animate-pulse">
                ⏳ {isHindi ? 'फ़ाइल का विश्लेषण एवं हिंदी फ़ॉन्ट डिकोडिंग जारी है...' : 'Parsing file and decoding Indic fonts...'}
              </div>
            )}

            {/* WARNING IF FILE HAS QUESTION MARKS */}
            {parsedResult && parsedResult.corruptedCount > 0 && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span>⚠️</span>
                  <span>
                    {isHindi
                      ? `चेतावनी: फ़ाइल में ${parsedResult.corruptedCount} नामों में '????' पाया गया है!`
                      : `Warning: ${parsedResult.corruptedCount} records contain '????' character corruption!`}
                  </span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  {isHindi
                    ? 'ऐसा तब होता है जब MS Excel में सेव करते समय साधारण CSV (ANSI) चुना जाता है। समाधान: कृपया अपनी मूल .xlsx (Excel) फ़ाइल सीधे चुनें, या Excel में "Save As -> CSV UTF-8" विकल्प चुनें।'
                    : 'This happens when Excel is saved as plain ANSI CSV. Fix: Upload your original .xlsx file directly, or use "Save As -> CSV UTF-8" in Excel.'}
                </p>
              </div>
            )}

            {/* PREVIEW OF PARSED BENEFICIARIES */}
            {parsedResult && (
              <div className="space-y-3 pt-2">
                {parsedResult.duplicateCount > 0 && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-xl font-bold text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    <span>
                      {isHindi
                        ? `कुल ${parsedResult.duplicateCount} रिकॉर्ड्स पहले से पंजीकृत होने (डुप्लीकेट समग्र आईडी) के कारण छोड़ दिए गए हैं।`
                        : `${parsedResult.duplicateCount} duplicate records skipped.`}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📋</span>
                    <span>
                      {isHindi
                        ? `पूर्वावलोकन: ${parsedResult.records.length} हितग्राही आयात हेतु तैयार`
                        : `Preview: ${parsedResult.records.length} Beneficiaries Ready to Import`}
                    </span>
                  </h4>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full">
                    {parsedResult.records.length} Records
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-100 sticky top-0 font-bold text-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left">S.No</th>
                        <th className="px-3 py-2 text-left">{isHindi ? 'नाम (Name)' : 'Name'}</th>
                        <th className="px-3 py-2 text-left">{isHindi ? 'पिता/पति (Guardian)' : 'Guardian'}</th>
                        <th className="px-3 py-2 text-left">{isHindi ? 'समग्र / परिवार आईडी' : 'IDs'}</th>
                        <th className="px-3 py-2 text-left">{isHindi ? 'श्रेणी' : 'Category'}</th>
                        <th className="px-3 py-2 text-left">{isHindi ? 'वार्ड' : 'Ward'}</th>
                        <th className="px-3 py-2 text-left">{isHindi ? 'मोबाइल' : 'Mobile'}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 font-medium">
                      {parsedResult.records.slice(0, 50).map((b, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {b.name} {b.surname}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{b.guardianName}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-700">
                            S: {b.samagraId} | F: {b.familyId}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {b.category}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">Ward {b.wardNo}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">{b.mobile}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedResult.records.length > 50 && (
                    <div className="p-2 bg-slate-50 text-center text-slate-500 text-[11px] border-t border-slate-100">
                      ... और {parsedResult.records.length - 50} अन्य रिकॉर्ड्स सूची में शामिल हैं
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IMPORT PROGRESS BAR */}
            {isImporting && importProgress && (
              <div className="space-y-1.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex justify-between text-xs font-bold text-emerald-900">
                  <span>{isHindi ? 'डेटाबेस में सुरक्षित किया जा रहा है...' : 'Saving to database...'}</span>
                  <span>
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* MODAL FOOTER */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">
                {isHindi
                  ? '* सभी आयातित हितग्राही लॉक स्थिति में सुरक्षित रूप से पंजीकृत होंगे।'
                  : '* All imported beneficiaries will be registered in locked status.'}
              </span>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => {
                    setIsBulkModalOpen(false);
                    setParsedResult(null);
                    setBulkFile(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer"
                >
                  {isHindi ? 'निरस्त करें' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={!parsedResult || parsedResult.records.length === 0 || isImporting}
                  onClick={handleConfirmBulkImport}
                  className={`px-6 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border ${
                    parsedResult && parsedResult.records.length > 0 && !isImporting
                      ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
                      : 'bg-slate-300 cursor-not-allowed border-slate-300'
                  }`}
                >
                  <span>⚡</span>
                  <span>
                    {isImporting
                      ? isHindi
                        ? 'आयात जारी है...'
                        : 'Importing...'
                      : isHindi
                      ? `समस्त ${parsedResult ? parsedResult.records.length : 0} हितग्राही आयात करें`
                      : `Import ${parsedResult ? parsedResult.records.length : 0} Beneficiaries`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL CORRUPTED QUESTION MARKS MODAL */}
      {isClearCorruptedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              🧹
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                {isHindi ? 'अमान्य प्रश्नचिह्न (????) रिकॉर्ड हटाएं' : 'Clear Corrupted Records'}
              </h3>
              <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                {isHindi
                  ? `क्या आप निश्चित रूप से सभी ${corruptedFamilies.length} अमान्य (????) हितग्राही रिकॉर्ड्स को हटाना चाहते हैं? इसके बाद आप अपनी शुद्ध Excel (.xlsx) फ़ाइल सीधे आयात कर सकेंगे।`
                  : `Are you sure you want to remove all ${corruptedFamilies.length} corrupted records? You can then re-import clean Excel files.`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isClearingCorrupted}
                onClick={() => setIsClearCorruptedModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isClearingCorrupted}
                onClick={handleClearAllCorruptedRecords}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>
                  {isClearingCorrupted
                    ? (isHindi ? 'हटाया जा रहा है...' : 'Deleting...')
                    : (isHindi ? 'हाँ, सभी हटाएं' : 'Yes, Delete All')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT BENEFICIARY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                {editingFamily ? (isHindi ? 'हितग्राही विवरण संशोधित करें' : 'Edit Beneficiary Details') : (isHindi ? 'नया हितग्राही पंजीयन' : 'New Beneficiary Registration')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'समग्र सदस्य आईडी *' : 'Samagra Member ID *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.samagraId || ''}
                    onChange={(e) => setFormData({ ...formData, samagraId: e.target.value })}
                    placeholder="e.g. 112185879"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'परिवार आईडी' : 'Family ID'}
                  </label>
                  <input
                    type="text"
                    value={formData.familyId || ''}
                    onChange={(e) => setFormData({ ...formData, familyId: e.target.value })}
                    placeholder="e.g. 22995551"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'हितग्राही का नाम *' : 'First Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isHindi ? 'e.g. रामप्रसाद' : 'First Name'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'उपनाम (Surname)' : 'Surname'}
                  </label>
                  <input
                    type="text"
                    value={formData.surname || ''}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    placeholder={isHindi ? 'e.g. वर्मा' : 'Surname'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'पिता / पति का नाम' : 'Guardian Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName || ''}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder={isHindi ? 'e.g. गोपीचंद वर्मा' : 'Father / Husband Name'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile || ''}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="9826012345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'श्रेणी (Category)' : 'Category'}
                  </label>
                  <select
                    value={formData.category || BeneficiaryCategory.APL}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as BeneficiaryCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold bg-slate-50"
                  >
                    <option value={BeneficiaryCategory.BPL}>BPL (बीपीएल)</option>
                    <option value={BeneficiaryCategory.APL}>APL (एपीएल)</option>
                    <option value={BeneficiaryCategory.DIVYANG}>DIVYANG (दिव्यांग)</option>
                    <option value={BeneficiaryCategory.OTHER}>OTHER (अन्य)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'वार्ड क्रमांक' : 'Ward No'}
                  </label>
                  <input
                    type="text"
                    value={formData.wardNo || ''}
                    onChange={(e) => setFormData({ ...formData, wardNo: e.target.value })}
                    placeholder="01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'मोहल्ला / बस्ती' : 'Muhalla / Locality'}
                  </label>
                  <input
                    type="text"
                    value={formData.muhalla || ''}
                    onChange={(e) => setFormData({ ...formData, muhalla: e.target.value })}
                    placeholder={isHindi ? 'e.g. पटेल मोहल्ला' : 'Main Area'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'कुल सदस्य संख्या' : 'Member Count'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.memberCount ?? 1}
                    onChange={(e) => setFormData({ ...formData, memberCount: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'पूरा पता' : 'Address'}</label>
                <textarea
                  rows={2}
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={isHindi ? 'मकान नंबर, गली, ग्राम...' : 'Address details'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  {editingFamily ? (isHindi ? 'संशोधन सहेजें' : 'Save Changes') : (isHindi ? 'पंजीयन पूर्ण करें' : 'Register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUPLICATE ENTRY WARNING MODAL */}
      {duplicateModalInfo && <DuplicateWarningModal {...duplicateModalInfo} />}

      {/* SUCCESS CONFIRMATION POPUP MODAL */}
      {successModalInfo && <SuccessPopupModal {...successModalInfo} />}
    </div>
  );
};

export default BeneficiaryManagementView;
