import React, { useState, useMemo } from 'react';
import { Tax, Family, TaxType, TaxRates, TaxRatesLockInfo, BeneficiaryCategory, TaxBeneficiaryList, Payment, OfficeDetails, Admin } from '../types';
import ViewHeader from './ViewHeader';
import { formatDateDDMMYYYY, getCleanOfficeTitle } from '../utils/printUtils';
import { exportBulkDemandBillsToPDF, exportToExcel, exportToPDF } from '../utils/exportUtils';
import {
  DuplicateWarningModal,
  DuplicateWarningDetails,
  SuccessPopupModal,
  SuccessPopupDetails,
} from './EntryFeedbackModals';

interface TaxIssueManagementViewProps {
  taxes: Tax[];
  payments?: Payment[];
  families: Family[];
  taxRates: TaxRates;
  taxRatesLockInfo?: TaxRatesLockInfo;
  taxBeneficiaryLists?: Record<string, TaxBeneficiaryList>;
  officeDetails?: OfficeDetails;
  admin?: Admin | null;
  onUpdateTaxBeneficiaryList?: (list: TaxBeneficiaryList) => void;
  onIssueTax: (newTax: Omit<Tax, 'id'>) => void;
  onBatchIssueTaxes: (month: number, year: number, taxTypes: TaxType[]) => void;
  onModifyTax: (taxId: string, newAmount: number) => void;
  onDeleteTax?: (taxId: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const TaxIssueManagementView: React.FC<TaxIssueManagementViewProps> = ({
  taxes,
  payments = [],
  families,
  taxRates,
  taxRatesLockInfo,
  taxBeneficiaryLists = {},
  officeDetails,
  admin,
  onUpdateTaxBeneficiaryList,
  onIssueTax,
  onBatchIssueTaxes,
  onModifyTax,
  onDeleteTax,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const [activeTab, setActiveTab] = useState<'ISSUED_LIST' | 'SINGLE_ISSUE' | 'BATCH_ISSUE'>('ISSUED_LIST');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTaxType, setFilterTaxType] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<number | 'ALL'>('ALL');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterWard, setFilterWard] = useState<string>('ALL');
  const [isBulkBillModalOpen, setIsBulkBillModalOpen] = useState<boolean>(false);
  const [bulkBillMonth, setBulkBillMonth] = useState<number>(new Date().getMonth() + 1);
  const [bulkBillYear, setBulkBillYear] = useState<number>(new Date().getFullYear());
  const [bulkBillWard, setBulkBillWard] = useState<string>('ALL');

  // Duplicate Warning & Success Popup Modal State
  const [duplicateModalInfo, setDuplicateModalInfo] = useState<DuplicateWarningDetails | null>(null);
  const [successModalInfo, setSuccessModalInfo] = useState<SuccessPopupDetails | null>(null);

  // Single issue form state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTaxType, setSelectedTaxType] = useState<TaxType>(TaxType.WATER);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(families[0]?.id || '');
  
  // Compute initial rate for selected family + tax type
  const getCalculatedRate = (famId: string, type: TaxType): number => {
    const family = families.find(f => f.id === famId);
    const cat = family?.category || BeneficiaryCategory.APL;
    return taxRates[type]?.[cat] ?? 100;
  };

  const [customAmount, setCustomAmount] = useState<number>(() => getCalculatedRate(families[0]?.id || '', TaxType.WATER));

  // Batch issue state
  const [batchMonth, setBatchMonth] = useState<number>(new Date().getMonth() + 1);
  const [batchYear, setBatchYear] = useState<number>(new Date().getFullYear());
  const [selectedTypesForBatch, setSelectedTypesForBatch] = useState<TaxType[]>([TaxType.WATER, TaxType.SANITATION]);
  const [notification, setNotification] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ id: string; billNo: string } | null>(null);

  // Modify modal
  const [modifyingTax, setModifyingTax] = useState<Tax | null>(null);
  const [newAmountInput, setNewAmountInput] = useState<number>(0);

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

  const handleFamilyChange = (famId: string) => {
    setSelectedFamilyId(famId);
    setCustomAmount(getCalculatedRate(famId, selectedTaxType));
  };

  const handleTaxTypeChange = (type: TaxType) => {
    setSelectedTaxType(type);
    setCustomAmount(getCalculatedRate(selectedFamilyId, type));
  };

  // Helper to check if tax bill has received payment
  const isTaxPaidOrLocked = (tax: Tax): boolean => {
    if (tax.status === 'PAID' || tax.status === 'PARTIAL') return true;
    return payments.some(
      (p) =>
        (p.taxId && p.taxId === tax.id) ||
        (p.paidTaxIds && p.paidTaxIds.includes(tax.id)) ||
        (p.familyId === tax.familyId &&
          (!p.taxType || p.taxType === tax.type) &&
          ((p.month === tax.month && p.year === tax.year) ||
            (p.chargedMonth === tax.month && p.chargedYear === tax.year)))
    );
  };

  // Single vs All Beneficiaries selection mode
  const [chargeScope, setChargeScope] = useState<'SEPARATE' | 'ALL'>('SEPARATE');

  // Compute locked/eligible families for selectedTaxType:
  const listConfig = taxBeneficiaryLists?.[selectedTaxType];
  const isTaxListLocked = !!(listConfig && listConfig.isLocked);

  // 1. All families included in the locked beneficiary list for selectedTaxType
  const baseLockedFamilies = useMemo(() => {
    if (isTaxListLocked && listConfig) {
      const set = new Set((listConfig.includedFamilyIds || []).map((id) => String(id).trim().toLowerCase()));
      return families.filter((f) => {
        const idMatch = set.has(String(f.id).trim().toLowerCase());
        const samagraMatch = f.samagraId ? set.has(String(f.samagraId).trim().toLowerCase()) : false;
        return idMatch || samagraMatch;
      });
    }
    return [];
  }, [families, isTaxListLocked, listConfig]);

  // 2. Filter out families who ALREADY have tax issued OR payment received for selectedTaxType in selectedMonth & selectedYear
  const lockedFamilies = useMemo(() => {
    return baseLockedFamilies.filter((f) => {
      const alreadyIssued = taxes.some(
        (t) =>
          (t.familyId === f.id || (f.samagraId && t.familyId === f.samagraId)) &&
          t.type === selectedTaxType &&
          Number(t.month) === Number(selectedMonth) &&
          Number(t.year) === Number(selectedYear)
      );
      const alreadyPaid = payments.some(
        (p) =>
          (p.familyId === f.id || (f.samagraId && p.familyId === f.samagraId)) &&
          (!p.taxType || p.taxType === selectedTaxType) &&
          ((Number(p.month) === Number(selectedMonth) && Number(p.year) === Number(selectedYear)) ||
            (Number(p.chargedMonth) === Number(selectedMonth) && Number(p.chargedYear) === Number(selectedYear)))
      );
      return !alreadyIssued && !alreadyPaid;
    });
  }, [baseLockedFamilies, taxes, payments, selectedTaxType, selectedMonth, selectedYear]);

  const alreadyIssuedCount = baseLockedFamilies.length - lockedFamilies.length;

  // Ensure default selected family is locked
  React.useEffect(() => {
    if (lockedFamilies.length > 0 && (!selectedFamilyId || !lockedFamilies.some(f => f.id === selectedFamilyId))) {
      setSelectedFamilyId(lockedFamilies[0].id);
      setCustomAmount(getCalculatedRate(lockedFamilies[0].id, selectedTaxType));
    }
  }, [lockedFamilies]);

  const executeSingleTaxIssue = () => {
    const family = families.find((f) => f.id === selectedFamilyId);
    const billNo = `DEM-${selectedYear}-${Math.floor(1000 + Math.random() * 9000)}`;
    const monthName = months.find((m) => m.value === selectedMonth)?.name || `माह ${selectedMonth}`;

    onIssueTax({
      familyId: selectedFamilyId,
      month: selectedMonth,
      year: selectedYear,
      type: selectedTaxType,
      amount: Number(customAmount),
      category: family?.category || BeneficiaryCategory.APL,
      status: 'ISSUED',
      billNo,
    });

    setSuccessModalInfo({
      title: isHindi ? 'कर मांग पत्र जारी हुआ!' : 'Tax Demand Bill Issued Successfully!',
      message: isHindi
        ? `हितग्राही ${family?.name} ${family?.surname} हेतु ${monthName} ${selectedYear} का ${selectedTaxType} कर मांग पत्र सफलतापूर्वक जारी किया गया।`
        : `Tax demand bill for ${family?.name} ${family?.surname} (${selectedTaxType}, ${monthName} ${selectedYear}) has been issued.`,
      recordType: isHindi ? 'कर मांग पत्र (TAX DEMAND BILL)' : 'TAX DEMAND BILL',
      details: [
        { label: isHindi ? 'मांग पत्र क्रमांक' : 'Bill No', value: billNo },
        { label: isHindi ? 'हितग्राही का नाम' : 'Beneficiary', value: `${family?.name} ${family?.surname}` },
        { label: isHindi ? 'कर मद' : 'Tax Type', value: selectedTaxType },
        { label: isHindi ? 'अवधि / माह' : 'Period', value: `${monthName} ${selectedYear}` },
        { label: isHindi ? 'मांग राशि' : 'Amount', value: `₹${customAmount}` },
      ],
      onPrint: () => {
        setSuccessModalInfo(null);
        const createdTaxObj: Tax = {
          id: `temp-${Date.now()}`,
          familyId: selectedFamilyId,
          type: selectedTaxType,
          month: selectedMonth,
          year: selectedYear,
          amount: customAmount,
          status: 'ISSUED',
          billNo,
          issueDate: new Date().toISOString().split('T')[0],
        };
        handlePrintSingleBill(createdTaxObj);
      },
      printButtonLabel: isHindi ? '📄 मांग पत्र प्रिंट करें' : 'Print Demand Bill',
      onClose: () => {
        setSuccessModalInfo(null);
        setActiveTab('ISSUED_LIST');
      },
      isHindi,
    });
  };

  const handleChargeTaxSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isTaxListLocked) {
      alert(
        isHindi
          ? `🔒 ${selectedTaxType} कर की लाभार्थी सूची एवं दरें लॉक (Lock) नहीं हैं। शासकीय नियमानुसार जब तक इस कर मद को "कर पात्र हितग्राही प्रबंधन" में जाकर लॉक नहीं किया जाता, तब तक कर मांग जारी करने की अनुमति नहीं है।`
          : `🔒 Beneficiary list for ${selectedTaxType} is unlocked. Government rules require locking the list before issuing tax bills.`
      );
      return;
    }

    if (lockedFamilies.length === 0) {
      alert(
        isHindi
          ? `⚠️ चयनित माह (${months.find(m => m.value === selectedMonth)?.name} ${selectedYear}) हेतु ${selectedTaxType} के सभी पात्र हितग्राहियों को कर मांग पहले ही जारी की जा चुकी है अथवा भुगतान प्राप्त हो चुका है। जारी करने हेतु कोई हितग्राही शेष नहीं है।`
          : `⚠️ All eligible beneficiaries for ${selectedTaxType} in ${months.find(m => m.value === selectedMonth)?.name} ${selectedYear} have already been billed or paid.`
      );
      return;
    }

    if (chargeScope === 'SEPARATE') {
      if (!selectedFamilyId) {
        alert(isHindi ? 'कृपया पात्र हितग्राही का चयन करें।' : 'Please select a locked beneficiary profile.');
        return;
      }

      // Check if duplicate demand bill already exists for same family, type, month, and year
      const existingBill = taxes.find(
        (t) =>
          t.familyId === selectedFamilyId &&
          t.type === selectedTaxType &&
          t.month === selectedMonth &&
          t.year === selectedYear
      );

      if (existingBill) {
        const family = families.find((f) => f.id === selectedFamilyId);
        const monthName = months.find((m) => m.value === selectedMonth)?.name || `माह ${selectedMonth}`;
        setDuplicateModalInfo({
          title: isHindi ? 'समान कर मांग पत्र प्रविष्टि चेतावनी' : 'Duplicate Tax Demand Warning',
          message: isHindi
            ? `⚠️ इस हितग्राही (${family?.name} ${family?.surname}) हेतु ${monthName} ${selectedYear} का ${selectedTaxType} मांग पत्र पहले से दर्ज है!`
            : `⚠️ A tax demand bill for ${family?.name} ${family?.surname} (${selectedTaxType}, ${monthName} ${selectedYear}) already exists!`,
          duplicateInfo: [
            { label: isHindi ? 'मांग पत्र क्र.' : 'Bill No', value: existingBill.billNo || existingBill.id },
            { label: isHindi ? 'मांग राशि' : 'Amount', value: `₹${existingBill.amount}` },
            { label: isHindi ? 'वर्तमान स्थिति' : 'Status', value: existingBill.status === 'PAID' ? 'भुगतान पूर्ण (PAID)' : 'लंबित (ISSUED/UNPAID)' },
          ],
          onConfirm: () => {
            setDuplicateModalInfo(null);
            executeSingleTaxIssue();
          },
          onCancel: () => {
            setDuplicateModalInfo(null);
          },
          isHindi,
        });
        return;
      }

      executeSingleTaxIssue();
    } else {
      // Issue to ALL locked beneficiaries for selected month & tax type
      const monthName = months.find((m) => m.value === selectedMonth)?.name || `माह ${selectedMonth}`;
      onBatchIssueTaxes(selectedMonth, selectedYear, [selectedTaxType]);

      setSuccessModalInfo({
        title: isHindi ? 'थोक कर मांग पत्र जारी हुए!' : 'Bulk Tax Demand Bills Issued!',
        message: isHindi
          ? `सफलतापूर्वक सभी ${lockedFamilies.length} पात्र हितग्राहियों हेतु ${selectedTaxType} (${monthName} ${selectedYear}) के मांग पत्र जारी कर दिए गए।`
          : `Successfully generated ${selectedTaxType} demand bills for ${lockedFamilies.length} beneficiaries (${monthName} ${selectedYear}).`,
        recordType: isHindi ? 'थोक मांग पत्र जारी' : 'BULK TAX DEMAND BILLS',
        details: [
          { label: isHindi ? 'कर मद' : 'Tax Type', value: selectedTaxType },
          { label: isHindi ? 'माह / वर्ष' : 'Period', value: `${monthName} ${selectedYear}` },
          { label: isHindi ? 'कुल हितग्राही' : 'Total Beneficiaries', value: `${lockedFamilies.length} परिवार` },
        ],
        onPrint: () => {
          setSuccessModalInfo(null);
          setBulkBillMonth(selectedMonth);
          setBulkBillYear(selectedYear);
          setIsBulkBillModalOpen(true);
        },
        printButtonLabel: isHindi ? '🖨️ थोक मांग पत्र PDF देखें' : 'View Bulk PDF',
        onClose: () => {
          setSuccessModalInfo(null);
          setActiveTab('ISSUED_LIST');
        },
        isHindi,
      });
    }
  };

  const handleBatchIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTypesForBatch.length === 0) return;

    const unlockedBatchTypes = selectedTypesForBatch.filter(t => !taxBeneficiaryLists[t]?.isLocked);
    if (unlockedBatchTypes.length > 0) {
      alert(
        isHindi
          ? `🔒 निम्नलिखित करों की लाभार्थी सूची एवं दरें इस माह हेतु लॉक (Lock) नहीं हैं: ${unlockedBatchTypes.join(', ')}। बैच मांग पत्र जारी करने हेतु सभी चयनित करों की सूचियों का लॉक होना अनिवार्य है।`
          : `🔒 The following tax beneficiary lists are unlocked: ${unlockedBatchTypes.join(', ')}. All selected tax lists must be locked before batch issuance.`
      );
      return;
    }

    const monthName = months.find((m) => m.value === batchMonth)?.name || `माह ${batchMonth}`;
    onBatchIssueTaxes(batchMonth, batchYear, selectedTypesForBatch);
    const count = families.length * selectedTypesForBatch.length;

    setSuccessModalInfo({
      title: isHindi ? 'थोक मांग पत्र सफलतापूर्वक जारी हुए!' : 'Bulk Demand Bills Generated!',
      message: isHindi
        ? `चयनित ${selectedTypesForBatch.length} कर मदों हेतु कुल ${count} कर मांग पत्र (${monthName} ${batchYear}) सफलतापूर्वक तैयार कर दिए गए।`
        : `Successfully generated ${count} category-wise tax demand bills for ${families.length} families (${monthName} ${batchYear}).`,
      recordType: isHindi ? 'बैच कर मांग प्रपत्र' : 'BATCH DEMAND GENERATION',
      details: [
        { label: isHindi ? 'चयनित कर मदें' : 'Selected Taxes', value: selectedTypesForBatch.join(', ') },
        { label: isHindi ? 'अवधि / माह' : 'Period', value: `${monthName} ${batchYear}` },
        { label: isHindi ? 'कुल जारी बिल संख्या' : 'Total Bills Generated', value: `${count} प्रपत्र` },
        { label: isHindi ? 'कुल परिवार' : 'Families', value: `${families.length} परिवार` },
      ],
      onPrint: () => {
        setSuccessModalInfo(null);
        setBulkBillMonth(batchMonth);
        setBulkBillYear(batchYear);
        setIsBulkBillModalOpen(true);
      },
      printButtonLabel: isHindi ? '🖨️ थोक मांग पत्र PDF देखें' : 'View Bulk PDF',
      onClose: () => {
        setSuccessModalInfo(null);
        setActiveTab('ISSUED_LIST');
      },
      isHindi,
    });
  };

  const handleToggleBatchTaxType = (type: TaxType) => {
    if (selectedTypesForBatch.includes(type)) {
      setSelectedTypesForBatch(selectedTypesForBatch.filter((t) => t !== type));
    } else {
      setSelectedTypesForBatch([...selectedTypesForBatch, type]);
    }
  };

  // Filtered taxes by search term, tax type, month, year, and ward
  const filteredTaxes = useMemo(() => {
    return taxes.filter((tax) => {
      const family = families.find((f) => f.id === tax.familyId);
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        !query ||
        (family &&
          (family.name.toLowerCase().includes(query) ||
            family.surname.toLowerCase().includes(query) ||
            family.samagraId.toLowerCase().includes(query) ||
            (family.familyId && family.familyId.toLowerCase().includes(query)) ||
            (family.wardNo && family.wardNo.toLowerCase().includes(query)) ||
            (family.muhalla && family.muhalla.toLowerCase().includes(query)))) ||
        tax.type.toLowerCase().includes(query) ||
        (tax.billNo && tax.billNo.toLowerCase().includes(query));

      const matchesType = filterTaxType === 'ALL' || tax.type === filterTaxType;
      const matchesMonth = filterMonth === 'ALL' || tax.month === Number(filterMonth);
      const matchesYear = !filterYear || tax.year === Number(filterYear);
      const matchesWard = filterWard === 'ALL' || (family && family.wardNo === filterWard);

      return matchesSearch && matchesType && matchesMonth && matchesYear && matchesWard;
    });
  }, [taxes, families, searchTerm, filterTaxType, filterMonth, filterYear, filterWard]);

  // BULK DEMAND BILLS GENERATOR BY MONTH & YEAR (INCLUDING ALL TAX TYPES & DUES)
  const handleGenerateBulkDemandBills = (targetMonth: number, targetYear: number, targetWard: string = 'ALL') => {
    const targetFamilies = families.filter((f) => targetWard === 'ALL' || f.wardNo === targetWard);
    const monthObj = months.find((m) => m.value === targetMonth);
    const monthName = monthObj ? monthObj.name : `Month ${targetMonth}`;

    const demandBills: any[] = [];

    targetFamilies.forEach((family) => {
      const allTaxTypes = Object.values(TaxType);
      const taxBreakdown: { type: string; currentDemand: number; previousDues: number; total: number }[] = [];
      let totalBillAmount = 0;

      allTaxTypes.forEach((type) => {
        // Current demand for target month & year
        const currentTaxesOfType = taxes.filter(
          (t) => t.familyId === family.id && t.type === type && t.month === targetMonth && t.year === targetYear
        );
        const currentDemand = currentTaxesOfType.reduce((s, t) => s + Number(t.amount || 0), 0);

        // Previous unpaid dues for this tax type (prior months or unpaid)
        const previousUnpaidTaxes = taxes.filter(
          (t) =>
            t.familyId === family.id &&
            t.type === type &&
            (t.year < targetYear || (t.year === targetYear && t.month < targetMonth)) &&
            !isTaxPaidOrLocked(t)
        );
        const previousDues = previousUnpaidTaxes.reduce((s, t) => s + Number(t.amount || 0), 0);

        const typeTotal = currentDemand + previousDues;
        totalBillAmount += typeTotal;

        if (currentDemand > 0 || previousDues > 0) {
          taxBreakdown.push({
            type,
            currentDemand,
            previousDues,
            total: typeTotal,
          });
        }
      });

      // If no specific breakdown was populated, fallback to current rate or default line
      if (taxBreakdown.length === 0) {
        allTaxTypes.slice(0, 2).forEach((type) => {
          const cat = family.category || BeneficiaryCategory.APL;
          const rate = taxRates[type]?.[cat] || 50;
          taxBreakdown.push({
            type,
            currentDemand: rate,
            previousDues: 0,
            total: rate,
          });
          totalBillAmount += rate;
        });
      }

      demandBills.push({
        billNo: `DEM-${targetYear}-${String(targetMonth).padStart(2, '0')}-${family.samagraId || family.id.slice(-6)}`,
        family,
        month: targetMonth,
        year: targetYear,
        monthName,
        taxBreakdown,
        totalAmount: totalBillAmount,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: `${targetYear}-${String(targetMonth).padStart(2, '0')}-28`,
      });
    });

    if (demandBills.length === 0) {
      alert(isHindi ? 'मांग पत्र तैयार करने हेतु कोई हितग्राही रिकॉर्ड नहीं मिला।' : 'No beneficiaries found for demand bills.');
      return;
    }

    const filename = `Bulk_Demand_Bills_${monthName}_${targetYear}_${demandBills.length}_Records`;
    exportBulkDemandBillsToPDF(filename, demandBills, monthName, targetYear, officeDetails, admin);
  };

  // PRINT SINGLE DEMAND BILL
  const handlePrintSingleBill = (tax: Tax) => {
    const family = families.find((f) => f.id === tax.familyId);
    if (!family) return;

    const monthObj = months.find((m) => m.value === tax.month);
    const monthName = monthObj ? monthObj.name : `Month ${tax.month}`;
    const allTaxTypes = Object.values(TaxType);
    const taxBreakdown: { type: string; currentDemand: number; previousDues: number; total: number }[] = [];
    let totalBillAmount = 0;

    allTaxTypes.forEach((type) => {
      const currentTaxesOfType = taxes.filter(
        (t) => t.familyId === family.id && t.type === type && t.month === tax.month && t.year === tax.year
      );
      const currentDemand = currentTaxesOfType.reduce((s, t) => s + Number(t.amount || 0), 0);

      const previousUnpaidTaxes = taxes.filter(
        (t) =>
          t.familyId === family.id &&
          t.type === type &&
          (t.year < tax.year || (t.year === tax.year && t.month < tax.month)) &&
          !isTaxPaidOrLocked(t)
      );
      const previousDues = previousUnpaidTaxes.reduce((s, t) => s + Number(t.amount || 0), 0);

      const typeTotal = currentDemand + previousDues;
      totalBillAmount += typeTotal;

      if (currentDemand > 0 || previousDues > 0) {
        taxBreakdown.push({
          type,
          currentDemand,
          previousDues,
          total: typeTotal,
        });
      }
    });

    if (taxBreakdown.length === 0) {
      taxBreakdown.push({
        type: tax.type,
        currentDemand: tax.amount,
        previousDues: 0,
        total: tax.amount,
      });
      totalBillAmount = tax.amount;
    }

    const singleBill = [
      {
        billNo: tax.billNo || `DEM-${tax.year}-${String(tax.month).padStart(2, '0')}-${family.samagraId}`,
        family,
        month: tax.month,
        year: tax.year,
        monthName,
        taxBreakdown,
        totalAmount: totalBillAmount,
        issueDate: tax.issueDate || new Date().toISOString().split('T')[0],
        dueDate: tax.dueDate || `${tax.year}-${String(tax.month).padStart(2, '0')}-28`,
      },
    ];

    const filename = `Demand_Bill_${family.name}_${monthName}_${tax.year}`;
    exportBulkDemandBillsToPDF(filename, singleBill, monthName, tax.year, officeDetails, admin);
  };

  // EXPORT ISSUED DEMAND BILLS TO EXCEL
  const handleExportExcel = () => {
    const filename = `Tax_Demand_Register_${formatDateDDMMYYYY(new Date()).replace(/\//g, '-')}`;
    const headers = [
      'क्र. (S.No)',
      'मांग पत्र क्र. (Bill No)',
      'हितग्राही का नाम (Beneficiary Name)',
      'पिता / पति का नाम (Father / Husband)',
      'समग्र आईडी (Samagra ID)',
      'परिवार आईडी (Family ID)',
      'श्रेणी (Category)',
      'वार्ड क्र. (Ward No)',
      'मोहल्ला (Muhalla)',
      'कर प्रकार (Tax Type)',
      'माह (Month)',
      'वर्ष (Year)',
      'मांग राशि (₹)',
      'स्थिति (Status)'
    ];

    const rows = filteredTaxes.map((t, idx) => {
      const family = families.find((f) => f.id === t.familyId);
      const monthObj = months.find((m) => m.value === t.month);
      const isPaid = isTaxPaidOrLocked(t);

      return [
        idx + 1,
        t.billNo || `DEM-${t.id.slice(-6)}`,
        family ? `${family.name} ${family.surname}` : 'N/A',
        family?.guardianName || family?.fatherHusbandName || '-',
        family?.samagraId || '-',
        family?.familyId || '-',
        family?.category || 'APL',
        family?.wardNo || '01',
        family?.muhalla || '-',
        t.type,
        monthObj ? monthObj.name : `Month ${t.month}`,
        t.year,
        t.amount,
        isPaid ? 'Paid' : 'Pending'
      ];
    });

    exportToExcel(filename, 'DemandBills', headers, rows);
  };

  // EXPORT ISSUED DEMAND BILLS TO PDF
  const handleExportPDF = () => {
    const filename = `Tax_Demand_List_${formatDateDDMMYYYY(new Date()).replace(/\//g, '-')}`;
    const officeName = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
    const title = isHindi ? 'कर मांग पत्र (डिमांड बिल) पंजी' : 'Tax Demand Register & Dues Report';
    const subtitle = isHindi
      ? `कुल मांग बिल: ${filteredTaxes.length} | कुल मांग राशि: ₹${filteredTaxes.reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN')} | मोहल्ला एवं वार्डवार`
      : `Total Demand Bills: ${filteredTaxes.length} | Total Demanded: ₹${filteredTaxes.reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN')} | With Ward & Muhalla`;

    const headers = [
      'क्र.',
      'बिल क्र.',
      'हितग्राही नाम',
      'समग्र ID',
      'वार्ड',
      'मोहल्ला (Muhalla)',
      'कर प्रकार',
      'अवधि (Month/Year)',
      'राशि (₹)',
      'स्थिति'
    ];

    const rows = filteredTaxes.map((t, idx) => {
      const family = families.find((f) => f.id === t.familyId);
      const monthObj = months.find((m) => m.value === t.month);
      const isPaid = isTaxPaidOrLocked(t);

      return [
        idx + 1,
        t.billNo || `DEM-${t.id.slice(-6)}`,
        family ? `${family.name} ${family.surname}` : 'N/A',
        family?.samagraId || '-',
        family?.wardNo || '01',
        family?.muhalla || '-',
        t.type,
        `${monthObj ? monthObj.name.slice(0, 3) : t.month}/${t.year}`,
        t.amount,
        isPaid ? 'PAID' : 'DUE'
      ];
    });

    exportToPDF(filename, title, subtitle, headers, rows, officeDetails, admin);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in max-w-7xl">
      {/* STANDARDIZED HEADER WITH BACK AND CLOSE BUTTONS */}
      <ViewHeader
        title={isHindi ? "Tax Issue Management (कर मांग जारी करें)" : "Tax Issue Management"}
        subtitle={isHindi ? "श्रेणीवार (BPL/APL/Divyang) कर दर अनुसार व्यक्तिगत या एकमुश्त (Bulk) कर मांग पत्र जारी करें।" : "Issue individual or bulk tax demand bills according to category-wise rates."}
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            {/* BULK DEMAND BILLS PDF PRINT BUTTON */}
            <button
              onClick={() => setIsBulkBillModalOpen(true)}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-teal-700"
              title={isHindi ? 'माहवार समस्त करों के थोक मांग पत्र (PDF) जनरेट एवं प्रिंट करें' : 'Generate & Print Month-wise Bulk Demand Bills PDF'}
            >
              <span>📑</span>
              <span>{isHindi ? 'माहवार थोक मांग पत्र (Bulk Bills PDF)' : 'Bulk Demand Bills PDF'}</span>
            </button>

            {/* EXCEL EXPORT BUTTON */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-600"
              title={isHindi ? 'मोहल्ला सहित मांग पत्र एक्सेल सूची डाउनलोड करें' : 'Export Excel List with Muhalla'}
            >
              <span>📊</span>
              <span>{isHindi ? 'एक्सेल (Excel)' : 'Excel'}</span>
            </button>

            {/* PDF EXPORT BUTTON */}
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title={isHindi ? 'मोहल्ला सहित मांग पत्र पीडीएफ सूची डाउनलोड करें' : 'Export PDF List with Muhalla'}
            >
              <span>📄</span>
              <span>{isHindi ? 'पीडीएफ (PDF)' : 'PDF'}</span>
            </button>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 ml-1">
              <button
                onClick={() => setActiveTab('ISSUED_LIST')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'ISSUED_LIST' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 All Demand Bills ({taxes.length})
              </button>
              <button
                onClick={() => setActiveTab('SINGLE_ISSUE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'SINGLE_ISSUE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                💸 + Charge Tax Amount (कर मांग)
              </button>
            </div>
          </div>
        }
      />

      {notification && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-slide-up">
          <span className="text-lg">✅</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* TAB 1: ALL ISSUED TAXES LIST */}
      {activeTab === 'ISSUED_LIST' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full md:w-64">
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={isHindi ? "खोजें (नाम, समग्र ID, मोहल्ला, वार्ड, बिल क्र.)..." : "Search by Keyword (Name, Samagra ID, Muhalla, Ward)..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* TAX TYPE FILTER */}
              <select
                value={filterTaxType}
                onChange={(e) => setFilterTaxType(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700"
              >
                <option value="ALL">{isHindi ? 'समस्त कर प्रकार' : 'All Tax Types'}</option>
                {Object.values(TaxType).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* MONTH FILTER */}
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700"
              >
                <option value="ALL">{isHindi ? 'सभी माह (All Months)' : 'All Months'}</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>

              {/* YEAR FILTER */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {/* WARD FILTER */}
              <select
                value={filterWard}
                onChange={(e) => setFilterWard(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700"
              >
                <option value="ALL">{isHindi ? 'सभी वार्ड (All Wards)' : 'All Wards'}</option>
                {Array.from(new Set(families.map((f) => f.wardNo || '01'))).sort().map((w) => (
                  <option key={w} value={w}>वार्ड क्र. {w}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-600 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border">
                कुल मांग: <strong className="text-primary font-bold">₹{filteredTaxes.reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN')}</strong> ({filteredTaxes.length} रिकॉर्ड)
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100/70">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">{isHindi ? 'हितग्राही व श्रेणी' : 'Beneficiary & Category'}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">{isHindi ? 'समग्र व परिवार आईडी' : 'Samagra & Family ID'}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">{isHindi ? 'वार्ड व मोहल्ला (Muhalla)' : 'Ward & Muhalla'}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">{isHindi ? 'कर मांग माह व वर्ष (Period)' : 'Period (Month/Year)'}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">{isHindi ? 'कर प्रकार' : 'Tax Type'}</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">{isHindi ? 'मांग राशि' : 'Assessed Amount'}</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase">{isHindi ? 'स्थिति' : 'Status'}</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">{isHindi ? 'कार्यवाही' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredTaxes.map((tax) => {
                  const family = families.find((f) => f.id === tax.familyId);
                  const monthObj = months.find((m) => m.value === tax.month);
                  const isPaid = isTaxPaidOrLocked(tax);

                  return (
                    <tr key={tax.id} className={`transition-colors ${isPaid ? 'bg-emerald-50/30 hover:bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{family ? `${family.name} ${family.surname}` : 'Family ID: ' + tax.familyId}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-slate-400">पिता/पति: {family?.guardianName || family?.fatherHusbandName || '-'}</span>
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 text-[10px] rounded font-bold">
                            {family?.category || 'APL'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                        <div>S-ID: <strong className="text-slate-900">{family?.samagraId || 'N/A'}</strong></div>
                        <div>F-ID: {family?.familyId || 'N/A'}</div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                        <div className="font-semibold text-slate-800">वार्ड क्र. {family?.wardNo || '01'}</div>
                        <div className="text-teal-800 font-medium mt-0.5 bg-teal-50 px-2 py-0.5 rounded inline-block border border-teal-100">
                          📍 {family?.muhalla || 'ग्राम क्षेत्र'}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-700 text-xs">
                        <div className="font-bold text-slate-900">{monthObj ? monthObj.name : `Month ${tax.month}`} {tax.year}</div>
                        <div className="text-[10px] text-slate-500 font-mono">({String(tax.month).padStart(2, '0')}/{tax.year}) | {tax.billNo || `DEM-${tax.id.slice(-6)}`}</div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="bg-primary-50 text-primary border border-primary-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
                          {tax.type}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                        ₹{tax.amount.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                            <span>🔒</span> {isHindi ? 'भुगतान प्राप्त (Paid)' : 'Paid'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                            <span>⏳</span> {isHindi ? 'बकाया (Pending)' : 'Pending'}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right space-x-1.5">
                        {/* PRINT SINGLE DEMAND BILL */}
                        <button
                          onClick={() => handlePrintSingleBill(tax)}
                          className="text-xs font-bold text-teal-700 hover:text-teal-900 hover:bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-300 transition-colors cursor-pointer inline-flex items-center gap-1"
                          title={isHindi ? 'यह मांग पत्र प्रिंट करें (Print Demand Bill)' : 'Print Demand Bill'}
                        >
                          <span>🖨️</span> {isHindi ? 'मांग पत्र' : 'Bill'}
                        </button>

                        {isPaid ? (
                          <button
                            type="button"
                            disabled
                            title={
                              isHindi
                                ? '⚠️ इस कर मांग पत्र का भुगतान प्राप्त हो चुका है। भुगतान प्राप्ति के पश्चात बिल में संशोधन प्रतिबंधित है।'
                                : '⚠️ Payment has already been received for this bill. Modifications are locked.'
                            }
                            className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 cursor-not-allowed inline-flex items-center gap-1 opacity-75"
                          >
                            <span>🔒</span> {isHindi ? 'संशोधन लॉक' : 'Locked'}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setModifyingTax(tax);
                              setNewAmountInput(tax.amount);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                          >
                            {isHindi ? 'संशोधन' : 'Modify'}
                          </button>
                        )}

                        {onDeleteTax && (
                          isPaid ? (
                            <button
                              type="button"
                              disabled
                              title={
                                isHindi
                                  ? '⚠️ इस कर मांग पत्र का भुगतान प्राप्त हो चुका है, अतः इसे हटाया नहीं जा सकता।'
                                  : '⚠️ Payment received. Cannot be deleted.'
                              }
                              className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 cursor-not-allowed opacity-75"
                            >
                              🔒
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmModal({ id: tax.id, billNo: tax.billNo || tax.id })}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                              title={isHindi ? 'कर मांग पत्र हटाएं' : 'Delete Tax Bill'}
                            >
                              🗑️
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredTaxes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      {isHindi ? 'चयनित फ़िल्टर के अनुसार कोई कर मांग पत्र रिकॉर्ड नहीं मिला।' : 'No tax demand bills found matching selected filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CHARGE TAX AMOUNT FORM (3-STEP WORKFLOW) */}
      {activeTab === 'SINGLE_ISSUE' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          {!isTaxListLocked && (
            <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔒</span>
                <div>
                  <h4 className="font-extrabold text-amber-900 text-sm">
                    {isHindi ? `कर सूची एवं दरें अनलॉक हैं (${selectedTaxType})` : `Tax Beneficiary List Unlocked (${selectedTaxType})`}
                  </h4>
                  <p className="text-xs text-amber-800 font-medium">
                    {isHindi 
                      ? "शासकीय नियम: कर मांग पत्र जारी करने से पूर्व इस कर मद की दरें एवं पात्र हितग्राही सूची को प्रत्येक माह लॉक (LOCK) करना अनिवार्य है।" 
                      : "Requirement: You must lock the beneficiary list and rates for this tax type before issuing bills."}
                  </p>
                </div>
              </div>
              {onUpdateTaxBeneficiaryList && (
                <button
                  type="button"
                  onClick={() => {
                    const existing = taxBeneficiaryLists[selectedTaxType] || {
                      taxType: selectedTaxType,
                      isLocked: false,
                      includedFamilyIds: families.map(f => f.id),
                      updatedAt: new Date().toISOString()
                    };
                    onUpdateTaxBeneficiaryList({
                      ...existing,
                      isLocked: true,
                      updatedAt: new Date().toISOString()
                    });
                    setNotification(isHindi ? `🔒 ${selectedTaxType} कर लाभार्थी सूची एवं दरें सफलतापूर्वक लॉक की गईं!` : `🔒 ${selectedTaxType} list & rates locked successfully!`);
                    setTimeout(() => setNotification(null), 4000);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-lg shadow transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔒</span> {isHindi ? 'अभी तुरंत सूची लॉक करें' : 'Lock List Now'}
                </button>
              )}
            </div>
          )}

          <div className="border-b pb-4 border-slate-200">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span>💸 Charge Tax Amount</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                कर राशि मांग प्रक्रिया
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              स्टेप 1: माह एवं वर्ष चुनें ➔ स्टेप 2: कर का प्रकार चुनें ➔ स्टेप 3: पृथक हितग्राही अथवा समस्त लॉक हितग्राहियों हेतु कर मांग पत्र जारी करें।
            </p>
          </div>

          <form onSubmit={handleChargeTaxSubmit} className="space-y-6">
            {/* STEP 1: SELECT MONTH & YEAR */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">1</span>
                <label className="text-sm font-bold text-slate-800">
                  {isHindi ? "चरण 1: माह एवं वर्ष का चयन करें *" : "STEP 1: Select Month & Year *"}
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isHindi ? "मांग का माह" : "Demand Month"}
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-semibold"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isHindi ? "वित्तीय वर्ष" : "Financial Year"}
                  </label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary font-mono font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: SELECT TAX TYPE */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">2</span>
                <label className="text-sm font-bold text-slate-800">
                  {isHindi ? "चरण 2: कर का प्रकार चुनें *" : "STEP 2: Select Tax Type *"}
                </label>
              </div>
              <select
                value={selectedTaxType}
                onChange={(e) => handleTaxTypeChange(e.target.value as TaxType)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-bold text-slate-800"
              >
                {Object.values(TaxType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {/* Tax Beneficiary List status banner */}
              {isTaxListLocked ? (
                <div className="space-y-2">
                  <div className="text-xs bg-emerald-50 border border-emerald-300 text-emerald-900 p-2.5 rounded-xl flex items-center justify-between font-bold">
                    <span>
                      🔒 {selectedTaxType} - {isHindi ? 'लॉक की गई कर लाभार्थी सूची' : 'Locked Tax Beneficiary List'}:
                    </span>
                    <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-mono">
                      {lockedFamilies.length} {isHindi ? 'जारी करने हेतु शेष' : 'Remaining to Issue'}
                    </span>
                  </div>

                  {alreadyIssuedCount > 0 && (
                    <div className="text-xs bg-blue-50 border border-blue-300 text-blue-900 p-2.5 rounded-xl flex items-center justify-between font-medium">
                      <span>
                        ℹ️ {isHindi ? `${alreadyIssuedCount} हितग्राहियों को ${months.find(m => m.value === selectedMonth)?.name} ${selectedYear} का ${selectedTaxType} मांग पत्र पहले ही जारी किया जा चुका है।` : `${alreadyIssuedCount} beneficiaries already received ${selectedTaxType} demand for ${months.find(m => m.value === selectedMonth)?.name} ${selectedYear}.`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span>
                      {isHindi 
                        ? `${selectedTaxType} की लाभार्थी सूची अभी लॉक नहीं है!` 
                        : `${selectedTaxType} Beneficiary List is NOT locked!`}
                    </span>
                  </div>
                  <span className="text-[11px] font-normal text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
                    {isHindi
                      ? 'कर मांग जारी करने हेतु "कर लाभार्थी सूची" विकल्प में जाकर इस कर सूची को लॉक करें।'
                      : 'Please go to "Tax Beneficiary List" and lock this tax list first.'}
                  </span>
                </div>
              )}

              {/* Show Rates preview for selected tax type */}
              {taxRatesLockInfo?.isLocked && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  <span>🔒</span>
                  <span>
                    {isHindi
                      ? `लागू फिक्स दर (वर्ष: ${taxRatesLockInfo.year}${taxRatesLockInfo.month && taxRatesLockInfo.month !== 'ALL' ? `, माह: ${taxRatesLockInfo.month}` : ''})`
                      : `Fixed Locked Rate (Year: ${taxRatesLockInfo.year}${taxRatesLockInfo.month && taxRatesLockInfo.month !== 'ALL' ? `, Month: ${taxRatesLockInfo.month}` : ''})`}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 text-center text-[11px] pt-1">
                <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg">
                  <span className="block text-amber-700 font-bold">{isHindi ? 'बीपीएल दर' : 'BPL Rate'}</span>
                  <span className="font-mono font-black text-amber-900">₹{taxRates[selectedTaxType]?.[BeneficiaryCategory.BPL] ?? 50}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg">
                  <span className="block text-blue-700 font-bold">{isHindi ? 'एपीएल दर' : 'APL Rate'}</span>
                  <span className="font-mono font-black text-blue-900">₹{taxRates[selectedTaxType]?.[BeneficiaryCategory.APL] ?? 100}</span>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-2 rounded-lg">
                  <span className="block text-purple-700 font-bold">{isHindi ? 'दिव्यांग दर' : 'Divyang Rate'}</span>
                  <span className="font-mono font-black text-purple-900">₹{taxRates[selectedTaxType]?.[BeneficiaryCategory.DIVYANG] ?? 30}</span>
                </div>
                <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg">
                  <span className="block text-slate-700 font-bold">{isHindi ? 'अन्य दर' : 'Other Rate'}</span>
                  <span className="font-mono font-black text-slate-900">₹{taxRates[selectedTaxType]?.[BeneficiaryCategory.OTHER] ?? 80}</span>
                </div>
              </div>
            </div>

            {/* STEP 3: BENEFICIARY SELECTION OPTION (SEPARATE OR ALL) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">3</span>
                  <label className="text-sm font-bold text-slate-800">
                    {isHindi ? "चरण 3: हितग्राही का चयन करें *" : "STEP 3: Select Beneficiary Option *"}
                  </label>
                </div>
              </div>

              {/* Scope Radio Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setChargeScope('SEPARATE')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    chargeScope === 'SEPARATE'
                      ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="chargeScope"
                    checked={chargeScope === 'SEPARATE'}
                    onChange={() => setChargeScope('SEPARATE')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block text-xs font-black text-slate-800">
                      {isHindi ? `👤 पृथक ${selectedTaxType} हितग्राही` : `👤 Separate ${selectedTaxType} Beneficiary`}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {isHindi ? `केवल चयनित हितग्राही हेतु कर मांग पत्र जारी करें।` : `Issue demand bill for selected beneficiary only.`}
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setChargeScope('ALL')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    chargeScope === 'ALL'
                      ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="chargeScope"
                    checked={chargeScope === 'ALL'}
                    onChange={() => setChargeScope('ALL')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block text-xs font-black text-slate-800">
                      {isHindi ? `👥 समस्त पात्र ${selectedTaxType} हितग्राही` : `👥 ALL Eligible ${selectedTaxType} Beneficiaries`}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {isHindi ? `सूची के समस्त पात्र हितग्राहियों हेतु एकमुश्त मांग जारी करें।` : `Issue bulk demand for all eligible list beneficiaries.`}
                    </span>
                  </div>
                </label>
              </div>

              {/* SEPARATE BENEFICIARY SUB-FORM */}
              {chargeScope === 'SEPARATE' && (
                <div className="space-y-4 pt-2 border-t border-slate-200 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? `चयनित ${selectedTaxType} हितग्राही *` : `Select ${selectedTaxType} Beneficiary *`}
                    </label>
                    {!isTaxListLocked ? (
                      <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold">
                        {isHindi ? (
                          <>
                            ⚠️ {selectedTaxType} हेतु कोई लॉक की गई कर लाभार्थी सूची नहीं मिली!
                            <br />
                            <span className="font-normal text-[11px] text-amber-800">
                              कृपया "कर लाभार्थी सूची" (Tax Beneficiary List) विकल्प पर जाएं, {selectedTaxType} चुनें, उसमें परिवारों को शामिल करें और "🔒 {selectedTaxType} सूची लॉक करें" बटन पर क्लिक करें।
                            </span>
                          </>
                        ) : (
                          <>
                            ⚠️ No locked beneficiary list found for {selectedTaxType}!
                            <br />
                            <span className="font-normal text-[11px] text-amber-800">
                              Please go to "Tax Beneficiary List", select {selectedTaxType}, include beneficiaries, and click "🔒 Lock {selectedTaxType} List".
                            </span>
                          </>
                        )}
                      </div>
                    ) : lockedFamilies.length === 0 ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold space-y-1">
                        <p className="flex items-center gap-1.5 text-sm text-emerald-800">
                          <span>✅</span>
                          <span>{isHindi ? 'सभी पात्र हितग्राहियों को कर मांग जारी / भुगतान प्राप्त' : 'All Beneficiaries Billed / Paid'}</span>
                        </p>
                        <p className="font-normal text-emerald-800 text-[11px]">
                          {isHindi
                            ? `चयनित माह (${months.find(m => m.value === selectedMonth)?.name} ${selectedYear}) हेतु ${selectedTaxType} के सभी पात्र हितग्राहियों को मांग पत्र जारी किया जा चुका है अथवा भुगतान प्राप्त हो चुका है। जारी करने हेतु कोई नया हितग्राही शेष नहीं है।`
                            : `All eligible beneficiaries for ${selectedTaxType} in ${months.find(m => m.value === selectedMonth)?.name} ${selectedYear} have already received demand bills or paid.`}
                        </p>
                      </div>
                    ) : (
                      <select
                        value={selectedFamilyId}
                        onChange={(e) => handleFamilyChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-semibold"
                        required
                      >
                        {lockedFamilies.map((f) => (
                          <option key={f.id} value={f.id}>
                            👤 {f.name} {f.surname} [{f.category || 'APL'}] (Samagra: {f.samagraId}, Reg: {formatDateDDMMYYYY(f.registrationDate) || 'N/A'}, Mob: {f.mobile})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedFamilyId && lockedFamilies.some(f => f.id === selectedFamilyId) && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700 uppercase">Assessed Tax Amount (₹) *</label>
                          <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            Auto-applied ({families.find(f => f.id === selectedFamilyId)?.category || 'APL'} Category Rate)
                          </span>
                        </div>
                        <input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary font-mono font-black text-xl text-emerald-800 bg-white"
                          required
                        />
                      </div>

                      {/* DUES BREAKDOWN CARD FOR SELECTED BENEFICIARY */}
                      {(() => {
                        const familyTaxes = taxes.filter(t => t.familyId === selectedFamilyId && t.status !== 'PAID');
                        const olderPending = familyTaxes.reduce((sum, t) => sum + t.amount, 0);
                        const currentMonthTax = Number(customAmount || 0);
                        const totalNetPayable = olderPending + currentMonthTax;

                        return (
                          <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 text-xs border border-slate-800 shadow-md">
                            <div className="flex justify-between items-center text-slate-300 font-medium">
                              <span>🕒 {isHindi ? 'पूर्व बकाया कर मांग (Older Unpaid Pending Dues):' : 'Older Unpaid Pending Dues:'}</span>
                              <span className="font-mono font-bold text-amber-400">₹{olderPending.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300 font-medium">
                              <span>🧾 {isHindi ? 'वर्तमान कर मांग (Current Month Tax):' : 'Current Month Tax:'}</span>
                              <span className="font-mono font-bold text-emerald-400">₹{currentMonthTax.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-700 font-bold text-white text-xs">
                              <span className="text-amber-300">💰 {isHindi ? 'कुल देय कर राशि (Total Net Amount to Pay):' : 'Total Net Amount to Pay:'}</span>
                              <span className="font-mono text-sm font-black text-amber-300">₹{totalNetPayable.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ALL LOCKED BENEFICIARIES SUMMARY */}
              {chargeScope === 'ALL' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl space-y-2 text-xs animate-fade-in">
                  <p className="font-black text-emerald-800 text-sm flex items-center gap-1.5">
                    <span>⚡ Bulk Issue Summary for ALL Locked Beneficiaries:</span>
                  </p>
                  <p>• Total Locked Beneficiaries: <strong>{lockedFamilies.length} Beneficiaries</strong></p>
                  <p>• Selected Demand Month: <strong>{months.find(m => m.value === selectedMonth)?.name} {selectedYear}</strong></p>
                  <p>• Tax Type to Charge: <strong>{selectedTaxType}</strong></p>
                  <p className="text-[11px] text-emerald-700 italic border-t border-emerald-200 pt-1 mt-1">
                    ✓ Each beneficiary will be billed according to their registered category (BPL, APL, Divyang, Other) tax rate.
                  </p>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('ISSUED_LIST')}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isTaxListLocked || lockedFamilies.length === 0}
                className="px-8 py-3 text-sm font-black bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-500 text-white rounded-xl shadow-lg transition-all border border-emerald-500 cursor-pointer flex items-center gap-2"
              >
                <span>💸</span>
                <span>
                  {chargeScope === 'SEPARATE'
                    ? 'Issue Individual Tax Demand (कर मांग पत्र जारी करें)'
                    : `Issue Tax Demand to ALL (${lockedFamilies.length}) Locked Beneficiaries`}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: BULK TAX ISSUE */}
      {activeTab === 'BATCH_ISSUE' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <div className="border-b pb-3 border-slate-100 mb-5">
            <h3 className="text-lg font-bold text-slate-800">
              Bulk Tax Demand Generation (एकमुश्त कर मांग)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              सभी पंजीकृत हितग्राहियों हेतु उनकी श्रेणीवार (BPL/APL/Divyang/Other) निर्धारित दरों पर स्वतः कर मांग जारी करें।
            </p>
          </div>

          <form onSubmit={handleBatchIssueSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Demand Month *</label>
                <select
                  value={batchMonth}
                  onChange={(e) => setBatchMonth(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Year *</label>
                <input
                  type="number"
                  value={batchYear}
                  onChange={(e) => setBatchYear(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Tax Types to Issue in Bulk *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(TaxType).map((type) => {
                  const isChecked = selectedTypesForBatch.includes(type);
                  return (
                    <label
                      key={type}
                      onClick={() => handleToggleBatchTaxType(type)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-primary-50 border-primary-300 text-primary-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs">{type}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Category Rates Applied</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                ⚡ Bulk Demand Calculation Summary:
              </p>
              <p>• Total Registered Beneficiaries: <strong>{families.length} Families</strong></p>
              <p>• Selected Tax Types: <strong>{selectedTypesForBatch.length}</strong></p>
              <p>
                • Total Tax Bills Created: <strong>{families.length * selectedTypesForBatch.length} Bills</strong>
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('ISSUED_LIST')}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedTypesForBatch.length === 0}
                className="px-6 py-2.5 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary-700 shadow-md disabled:opacity-50"
              >
                Generate Bulk Tax Bills
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL FOR MODIFYING A TAX CHARGE */}
      {modifyingTax && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-slide-up border-t-4 border-primary">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Modify Tax Demand Amount</h3>
              <button onClick={() => setModifyingTax(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Updating assessed amount for <strong>{modifyingTax.type}</strong> ({modifyingTax.month}/{modifyingTax.year}).
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Assessed Amount (₹)</label>
                <input
                  type="number"
                  value={newAmountInput}
                  onChange={(e) => setNewAmountInput(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary font-mono font-bold"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => setModifyingTax(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onModifyTax(modifyingTax.id, newAmountInput);
                    setModifyingTax(null);
                  }}
                  className="px-5 py-2 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary-700 shadow-md"
                >
                  Save Amount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK DEMAND BILLS MONTH-WISE PRINT MODAL */}
      {isBulkBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-teal-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📑</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {isHindi ? 'माहवार एकमुश्त मांग पत्र प्रिंट (Bulk Demand Bills PDF)' : 'Print Bulk Demand Bills PDF'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isHindi ? 'समस्त करों की मांग, पूर्व बकाया एवं मोहल्ला नाम सहित' : 'Includes all tax heads, previous dues & Muhalla'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkBillModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'माह का चयन करें (Select Month):' : 'Select Month:'}
                  </label>
                  <select
                    value={bulkBillMonth}
                    onChange={(e) => setBulkBillMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-700"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.name} (माह {m.value})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'वर्ष का चयन करें (Select Year):' : 'Select Year:'}
                  </label>
                  <select
                    value={bulkBillYear}
                    onChange={(e) => setBulkBillYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-700"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHindi ? 'वार्ड फ़िल्टर (Ward Filter):' : 'Ward Filter:'}
                </label>
                <select
                  value={bulkBillWard}
                  onChange={(e) => setBulkBillWard(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-700"
                >
                  <option value="ALL">{isHindi ? 'समस्त वार्ड (All Wards) - पूरे ग्राम पंचायत हेतु' : 'All Wards'}</option>
                  {Array.from(new Set(families.map((f) => f.wardNo || '01'))).sort().map((w) => (
                    <option key={w} value={w}>वार्ड क्र. {w}</option>
                  ))}
                </select>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>ℹ️</span> {isHindi ? 'डिमांड बिल की मुख्य विशेषताएं:' : 'Demand Bill Key Highlights:'}
                </div>
                <ul className="list-disc list-inside text-[11px] text-teal-900 space-y-0.5">
                  <li>जल कर, स्वच्छता कर, प्रकाश कर, संपत्ति कर आदि सभी कर मदों का विवरण</li>
                  <li>पूर्व बकाया (Previous Dues) एवं चालू माह की मांग राशि का गणना विवरण</li>
                  <li>करदाता का नाम, पिता/पति का नाम, श्रेणी, समग्र आईडी एवं <strong>मोहल्ला (Muhalla)</strong></li>
                  <li>सचिव / प्राधिकृत अधिकारी के हस्ताक्षर एवं आधिकारिक कार्यालय सील सहित A4 प्रिंट लेआउट</li>
                </ul>
              </div>

              <div className="text-xs text-slate-500 text-center font-medium">
                कुल लक्षित हितग्राही परिवार:{' '}
                <strong className="text-teal-900 font-bold">
                  {bulkBillWard === 'ALL' ? families.length : families.filter((f) => f.wardNo === bulkBillWard).length} परिवार
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkBillModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                {isHindi ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBulkBillModalOpen(false);
                  handleGenerateBulkDemandBills(bulkBillMonth, bulkBillYear, bulkBillWard);
                }}
                className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition flex items-center gap-2"
              >
                <span>🖨️</span>
                <span>{isHindi ? 'मांग पत्र PDF तैयार करें व प्रिंट करें' : 'Generate & Print PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              🗑️
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isHindi ? 'कर मांग पत्र हटाने की पुष्टि करें' : 'Confirm Demand Bill Deletion'}
              </h3>
              <p className="text-slate-600 text-xs mt-1">
                {isHindi
                  ? `क्या आप निश्चित रूप से बिल क्र. "${deleteConfirmModal.billNo}" को हटाना चाहते हैं?`
                  : `Are you sure you want to delete Demand Bill No. "${deleteConfirmModal.billNo}"?`}
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
                  if (onDeleteTax) {
                    onDeleteTax(deleteConfirmModal.id);
                  }
                  setDeleteConfirmModal(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                {isHindi ? 'हाँ, हटाएं (Yes, Delete)' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE DEMAND WARNING MODAL */}
      {duplicateModalInfo && <DuplicateWarningModal {...duplicateModalInfo} />}

      {/* SUCCESS CONFIRMATION POPUP MODAL */}
      {successModalInfo && <SuccessPopupModal {...successModalInfo} />}
    </div>
  );
};

export default TaxIssueManagementView;
