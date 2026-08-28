import React, { useState, useMemo } from 'react';
import {
  AccountHead,
  Vendor,
  Work,
  CashbookVoucher,
  OfficeDetails,
  CashbookTab,
  Family,
  Payment,
  ExpenseSubHead,
  OtherTaxReceiptRecord,
  BookingRentRecord,
  BuildingPermissionRecord,
  BusinessRegistrationRecord,
} from '../types';
import ViewHeader from './ViewHeader';
import OfficialVoucherHeader from './OfficialVoucherHeader';
import {
  DuplicateWarningModal,
  DuplicateWarningDetails,
  SuccessPopupModal,
  SuccessPopupDetails,
} from './EntryFeedbackModals';
import { triggerPrint, getCleanOfficeTitle, isInFinancialYear, formatDateDDMMYYYY } from '../utils/printUtils';

interface CashbookManagementViewProps {
  accountHeads: AccountHead[];
  vendors: Vendor[];
  works: Work[];
  vouchers: CashbookVoucher[];
  families?: Family[];
  payments?: Payment[];
  otherTaxReceipts?: OtherTaxReceiptRecord[];
  bookingRents?: BookingRentRecord[];
  buildingPermissions?: BuildingPermissionRecord[];
  businessRegistrations?: BusinessRegistrationRecord[];
  onSyncTaxTransactions?: () => void;
  subHeads?: ExpenseSubHead[];
  officeDetails?: OfficeDetails;
  isHindi?: boolean;
  initialTab?: CashbookTab;
  onAddAccountHead: (head: Omit<AccountHead, 'id'>) => void;
  onUpdateAccountHead?: (head: AccountHead) => void;
  onDeleteAccountHead: (id: string) => void;
  onAddSubHead?: (subHead: Omit<ExpenseSubHead, 'id'>) => void;
  onDeleteSubHead?: (id: string) => void;
  onAddVendor: (vendor: Omit<Vendor, 'id'>) => void;
  onDeleteVendor: (id: string) => void;
  onAddWork: (work: Omit<Work, 'id'>) => void;
  onUpdateWork?: (work: Work) => void;
  onDeleteWork: (id: string) => void;
  onAddVoucher: (voucher: Omit<CashbookVoucher, 'id' | 'voucherNo'>) => void;
  onDeleteVoucher: (id: string) => void;
  onBack?: () => void;
  onClose?: () => void;
}

export const CashbookManagementView: React.FC<CashbookManagementViewProps> = ({
  accountHeads = [],
  vendors = [],
  works = [],
  vouchers = [],
  families = [],
  payments = [],
  otherTaxReceipts = [],
  bookingRents = [],
  buildingPermissions = [],
  businessRegistrations = [],
  onSyncTaxTransactions,
  subHeads = [],
  officeDetails = { officeName: 'कार्यालय ग्राम पंचायत', secretaryName: '', sarpanchName: '', districtName: '', janpadPanchayat: '' },
  isHindi = true,
  initialTab = CashbookTab.CASHBOOK_REPORT,
  onAddAccountHead,
  onUpdateAccountHead,
  onDeleteAccountHead,
  onAddSubHead,
  onDeleteSubHead,
  onAddVendor,
  onDeleteVendor,
  onAddWork,
  onUpdateWork,
  onDeleteWork,
  onAddVoucher,
  onDeleteVoucher,
}) => {
  const [activeTab, setActiveTab] = useState<CashbookTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // --- DELETE CONFIRMATION STATE ---
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    id: string;
    name: string;
    type: 'HEAD' | 'SUBHEAD' | 'VENDOR' | 'WORK' | 'VOUCHER';
  } | null>(null);

  // --- ERROR NOTIFICATION STATE ---
  const [cashbookErrorMsg, setCashbookErrorMsg] = useState<string | null>(null);

  // --- SUBHEAD FORM STATES ---
  const [subHeadNameInput, setSubHeadNameInput] = useState('');
  const [subHeadParentHeadId, setSubHeadParentHeadId] = useState('');
  const [subHeadDescInput, setSubHeadDescInput] = useState('');

  // --- TAX PAYER / BENEFICIARY DETAILS HELPER FOR CASHBOOK ENTRIES ---
  const getTaxPayerDetails = (v: CashbookVoucher) => {
    // 1. Regular Tax Payments (Property, Water, Cleanliness, Light, etc.)
    if (payments && payments.length > 0) {
      let pay = payments.find(
        (p) =>
          `vouch-tax-${p.id}` === v.id ||
          (p.receiptNo && v.voucherNo === `INC-${p.receiptNo}`) ||
          (p.receiptNo && v.voucherNo.includes(p.receiptNo))
      );
      if (!pay && v.remarks) {
        pay = payments.find((p) => p.receiptNo && v.remarks.includes(p.receiptNo));
      }
      if (pay) {
        const family = families.find(
          (f) =>
            f.id === pay?.familyId ||
            (f.familyId && f.familyId === pay?.familyId) ||
            (f.samagraId && f.samagraId === pay?.familyId)
        );
        return {
          name: family ? `${family.name} ${family.surname}` : pay.familyId || 'करदाता',
          guardianName: family?.guardianName || 'N/A',
          samagraId: family?.samagraId || 'N/A',
          familyId: family?.familyId || family?.id || pay.familyId,
          wardNo: family?.wardNo || 'N/A',
          receiptNo: pay.receiptNo,
          taxType: pay.taxType || 'कर संग्रह',
        };
      }
    }

    // 2. Other Tax Receipts (3.11)
    if (otherTaxReceipts && otherTaxReceipts.length > 0) {
      let rec = otherTaxReceipts.find(
        (r) =>
          `vouch-othertax-${r.id}` === v.id ||
          (r.receiptNo && v.voucherNo === `INC-${r.receiptNo}`) ||
          (r.receiptNo && v.voucherNo.includes(r.receiptNo))
      );
      if (!rec && v.remarks) {
        rec = otherTaxReceipts.find((r) => r.receiptNo && v.remarks.includes(r.receiptNo));
      }
      if (rec) {
        return {
          name: rec.beneficiaryName,
          guardianName: rec.guardianName || 'N/A',
          samagraId: rec.samagraId || rec.contactNo || 'N/A',
          familyId: rec.receiptNo,
          wardNo: rec.wardNo || 'N/A',
          receiptNo: rec.receiptNo,
          taxType: rec.taxHead || 'अन्य कर',
        };
      }
    }

    // 3. Premises / Hall Booking Rents (3.10)
    if (bookingRents && bookingRents.length > 0) {
      let b = bookingRents.find(
        (bk) =>
          `vouch-book-${bk.id}` === v.id ||
          (bk.voucherNo && v.voucherNo.includes(bk.voucherNo))
      );
      if (!b && v.remarks) {
        b = bookingRents.find((bk) => bk.voucherNo && v.remarks.includes(bk.voucherNo));
      }
      if (b) {
        return {
          name: b.beneficiaryName,
          guardianName: b.contactNo || 'N/A',
          samagraId: b.purpose || 'N/A',
          familyId: b.voucherNo,
          wardNo: 'N/A',
          receiptNo: b.voucherNo,
          taxType: 'परिसर/भवन किराया',
        };
      }
    }

    // 4. Building Permissions (3.9)
    if (buildingPermissions && buildingPermissions.length > 0) {
      let p = buildingPermissions.find(
        (perm) =>
          `vouch-bld-${perm.id}` === v.id ||
          (perm.voucherNo && v.voucherNo.includes(perm.voucherNo)) ||
          (perm.permissionNo && v.remarks.includes(perm.permissionNo))
      );
      if (!p && v.remarks) {
        p = buildingPermissions.find((perm) => perm.permissionNo && v.remarks.includes(perm.permissionNo));
      }
      if (p) {
        return {
          name: p.beneficiaryName,
          guardianName: p.guardianName || 'N/A',
          samagraId: p.permissionNo,
          familyId: p.permissionNo,
          wardNo: p.wardNo || 'N/A',
          receiptNo: p.permissionNo,
          taxType: 'भवन निर्माण अनुमति शुल्क',
        };
      }
    }

    // 5. Business / Shop Registrations (3.12)
    if (businessRegistrations && businessRegistrations.length > 0) {
      let biz = businessRegistrations.find(
        (b) =>
          `vouch-biz-${b.id}` === v.id ||
          (b.certificateNo && v.voucherNo.includes(b.certificateNo)) ||
          (b.certificateNo && v.remarks.includes(b.certificateNo))
      );
      if (biz) {
        return {
          name: `${biz.firmName} (${biz.ownerName})`,
          guardianName: biz.mobileNo || 'N/A',
          samagraId: biz.certificateNo,
          familyId: biz.certificateNo,
          wardNo: biz.wardNo || 'N/A',
          receiptNo: biz.certificateNo,
          taxType: 'दुकान पंजीयन / व्यवसाय कर',
        };
      }
    }

    // 6. Text extraction from v.remarks as fallback
    if (v.remarks) {
      const taxPayerMatch = v.remarks.match(/करदाता:\s*([^|\]]+)/);
      const guardianMatch = v.remarks.match(/पिता\/पति:\s*([^|\]]+)/);
      const samagraMatch = v.remarks.match(/(?:सदस्य\/समग्र ID|सदस्य ID):\s*([^|\]\)]+)/);
      const receiptMatch = v.remarks.match(/(?:रसीद क्र\.|रसीद:|रसीद):\s*([^|\s\]\)]+)/);
      if (taxPayerMatch || receiptMatch) {
        return {
          name: taxPayerMatch ? taxPayerMatch[1].trim() : 'करदाता',
          guardianName: guardianMatch ? guardianMatch[1].trim() : 'N/A',
          samagraId: samagraMatch ? samagraMatch[1].trim() : 'N/A',
          familyId: 'N/A',
          wardNo: 'N/A',
          receiptNo: receiptMatch ? receiptMatch[1].trim() : v.voucherNo,
          taxType: 'कर संग्रह',
        };
      }
    }

    return null;
  };

  // --- ACCOUNT HEAD FORM STATES ---
  const [editingHead, setEditingHead] = useState<AccountHead | null>(null);
  const [headName, setHeadName] = useState('');
  const [headCode, setHeadCode] = useState('');
  const [headType, setHeadType] = useState<'INCOME' | 'EXPENDITURE' | 'BOTH'>('BOTH');
  const [headOpeningBalance, setHeadOpeningBalance] = useState<number>(0);
  const [headAsOnDate, setHeadAsOnDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // --- VENDOR FORM STATES ---
  const [vendorName, setVendorName] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [vendorGst, setVendorGst] = useState('');
  const [vendorOpeningBalance, setVendorOpeningBalance] = useState<number>(0);

  // --- WORK FORM STATES ---
  const [workName, setWorkName] = useState('');
  const [workAdminSanctionDate, setWorkAdminSanctionDate] = useState('');
  const [workCost, setWorkCost] = useState<number>(0);
  const [workHeadId, setWorkHeadId] = useState('');
  const [workHeadAmount, setWorkHeadAmount] = useState<number>(0);
  const [workSubHead, setWorkSubHead] = useState('');
  const [workSubHeadAmount, setWorkSubHeadAmount] = useState<number>(0);
  const [workConvergenceHeadId, setWorkConvergenceHeadId] = useState('');
  const [workConvergenceHeadName, setWorkConvergenceHeadName] = useState('');
  const [workConvergenceHeadAmount, setWorkConvergenceHeadAmount] = useState<number>(0);

  // --- VOUCHER FORM STATES ---
  const [vDate, setVDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vHeadId, setVHeadId] = useState('');
  const [vSubHead, setVSubHead] = useState('');
  const [vAmount, setVAmount] = useState<number>(0);
  const [vVendorId, setVVendorId] = useState('');
  const [vWorkId, setVWorkId] = useState('');
  const [vPaymentMode, setVPaymentMode] = useState<'CASH' | 'BANK' | 'UPI' | 'CHEQUE'>('BANK');
  const [vRemarks, setVRemarks] = useState('');
  const [vProposalNo, setVProposalNo] = useState('');
  const [vProposalDate, setVProposalDate] = useState('');
  const [vBillNo, setVBillNo] = useState('');
  const [vBillDate, setVBillDate] = useState('');
  const [vExpenseCategory, setVExpenseCategory] = useState<'WORK' | 'OFFICE' | 'GENERAL'>('WORK');

  // --- REPORT FILTER STATES ---
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterHeadId, setFilterHeadId] = useState('ALL');
  const [filterVendorId, setFilterVendorId] = useState('ALL');
  const [filterWorkId, setFilterWorkId] = useState('ALL');
  const [filterSearch, setFilterSearch] = useState('');
  const [ledgerMode, setLedgerMode] = useState<'HEADS' | 'VENDORS' | 'WORKS' | 'INCOME' | 'EXPENDITURE'>('HEADS');
  const [filterFinancialYear, setFilterFinancialYear] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [viewingVoucherSlip, setViewingVoucherSlip] = useState<CashbookVoucher | null>(null);
  const [viewingNoteSheet, setViewingNoteSheet] = useState<CashbookVoucher | null>(null);
  const [viewingWorkVouchersModal, setViewingWorkVouchersModal] = useState<Work | null>(null);

  // Duplicate Warning & Success Popup Modal State
  const [duplicateModalInfo, setDuplicateModalInfo] = useState<DuplicateWarningDetails | null>(null);
  const [successModalInfo, setSuccessModalInfo] = useState<SuccessPopupDetails | null>(null);

  const monthList = [
    { value: 1, name: isHindi ? '01 - जनवरी' : '01 - January' },
    { value: 2, name: isHindi ? '02 - फ़रवरी' : '02 - February' },
    { value: 3, name: isHindi ? '03 - मार्च' : '03 - March' },
    { value: 4, name: isHindi ? '04 - अप्रैल' : '04 - April' },
    { value: 5, name: isHindi ? '05 - मई' : '05 - May' },
    { value: 6, name: isHindi ? '06 - जून' : '06 - June' },
    { value: 7, name: isHindi ? '07 - जुलाई' : '07 - July' },
    { value: 8, name: isHindi ? '08 - अगस्त' : '08 - August' },
    { value: 9, name: isHindi ? '09 - सितंबर' : '09 - September' },
    { value: 10, name: isHindi ? '10 - अक्टूबर' : '10 - October' },
    { value: 11, name: isHindi ? '11 - नवंबर' : '11 - November' },
    { value: 12, name: isHindi ? '12 - दिसंबर' : '12 - December' },
  ];

  // Calculate Head Current Balances
  const headBalances = useMemo(() => {
    const map: Record<string, { income: number; expenditure: number; balance: number }> = {};
    accountHeads.forEach((h) => {
      map[h.id] = { income: 0, expenditure: 0, balance: Number(h.openingBalance || 0) };
    });
    vouchers.forEach((v) => {
      if (!map[v.headId]) {
        map[v.headId] = { income: 0, expenditure: 0, balance: 0 };
      }
      if (v.voucherType === 'INCOME') {
        map[v.headId].income += v.amount;
        map[v.headId].balance += v.amount;
      } else {
        map[v.headId].expenditure += v.amount;
        map[v.headId].balance -= v.amount;
      }
    });
    return map;
  }, [accountHeads, vouchers]);

  // Total Summary
  const grandSummary = useMemo(() => {
    const totalOpening = accountHeads.reduce((s, h) => s + Number(h.openingBalance || 0), 0);
    const totalIncome = vouchers
      .filter((v) => v.voucherType === 'INCOME')
      .reduce((s, v) => s + v.amount, 0);
    const totalExpenditure = vouchers
      .filter((v) => v.voucherType === 'EXPENDITURE')
      .reduce((s, v) => s + v.amount, 0);
    const closingBalance = totalOpening + totalIncome - totalExpenditure;

    const bankBalance = totalOpening + vouchers.reduce((acc, v) => {
      if (v.paymentMode !== 'CASH') {
        return acc + (v.voucherType === 'INCOME' ? v.amount : -v.amount);
      }
      return acc;
    }, 0);

    const cashInHand = vouchers.reduce((acc, v) => {
      if (v.paymentMode === 'CASH') {
        return acc + (v.voucherType === 'INCOME' ? v.amount : -v.amount);
      }
      return acc;
    }, 0);

    return { totalOpening, totalIncome, totalExpenditure, closingBalance, bankBalance, cashInHand };
  }, [accountHeads, vouchers]);

  // Handlers
  const handleAddHeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName.trim()) return;
    onAddAccountHead({
      name: headName.trim(),
      code: headCode.trim() || undefined,
      type: headType,
      openingBalance: Number(headOpeningBalance || 0),
      asOnDate: headAsOnDate,
    });
    setHeadName('');
    setHeadCode('');
    setHeadOpeningBalance(0);
  };

  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) return;
    onAddVendor({
      name: vendorName.trim(),
      address: vendorAddress.trim() || 'N/A',
      mobile: vendorMobile.trim() || undefined,
      gstNo: undefined,
      openingBalance: 0,
    });
    setVendorName('');
    setVendorAddress('');
    setVendorMobile('');
    setVendorGst('');
    setVendorOpeningBalance(0);
  };

  const handleAddWorkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workName.trim() || !workHeadId) return;

    let convName = workConvergenceHeadName.trim();
    if (workConvergenceHeadId) {
      const selectedHead = accountHeads.find((h) => h.id === workConvergenceHeadId);
      if (selectedHead) {
        convName = selectedHead.name;
      }
    }

    const headAmt = Number(workHeadAmount || 0);
    if (isNaN(headAmt) || headAmt <= 0) {
      setCashbookErrorMsg(
        isHindi
          ? 'त्रुटि: मूल मद आवंटन राशि (Allocation Amount) 0 से अधिक होनी चाहिए!'
          : 'Error: Main Head allocation amount must be greater than 0!'
      );
      return;
    }

    const mainHeadObj = accountHeads.find((h) => h.id === workHeadId);
    const mainHeadData = headBalances[workHeadId];
    const mainHeadAvailBal = mainHeadData ? mainHeadData.balance : Number(mainHeadObj?.openingBalance || 0);

    if (mainHeadAvailBal <= 0) {
      setCashbookErrorMsg(
        isHindi
          ? `त्रुटि: चयनित मुख्य खाता मद (${mainHeadObj?.name || ''}) में कोई फंड उपलब्ध नहीं है (वर्तमान उपलब्ध शेष: ₹0)! कार्य केवल खाता मद में पर्याप्त फंड उपलब्ध होने पर ही पंजीकृत किया जा सकता है।`
          : `Error: Selected account head (${mainHeadObj?.name || ''}) has no available funds (Current Balance: ₹0)! Work registration is allowed only when funds are available.`
      );
      return;
    }

    if (headAmt > mainHeadAvailBal) {
      setCashbookErrorMsg(
        isHindi
          ? `त्रुटि: मूल मद आवंटन राशि (₹${headAmt.toLocaleString('en-IN')}) चयनित मुख्य खाता मद (${mainHeadObj?.name || ''}) की उपलब्ध निधि राशि (₹${mainHeadAvailBal.toLocaleString('en-IN')}) से अधिक है!`
          : `Error: Head allocation amount (₹${headAmt.toLocaleString('en-IN')}) exceeds available funds (₹${mainHeadAvailBal.toLocaleString('en-IN')}) in selected head (${mainHeadObj?.name || ''})!`
      );
      return;
    }

    const convAmt = Number(workConvergenceHeadAmount || 0);
    if (workConvergenceHeadId) {
      const convHeadObj = accountHeads.find((h) => h.id === workConvergenceHeadId);
      const convHeadData = headBalances[workConvergenceHeadId];
      const convHeadAvailBal = convHeadData ? convHeadData.balance : Number(convHeadObj?.openingBalance || 0);

      if (convHeadAvailBal <= 0) {
        setCashbookErrorMsg(
          isHindi
            ? `त्रुटि: चयनित अभिसरण मद (${convHeadObj?.name || ''}) में कोई फंड उपलब्ध नहीं है (वर्तमान उपलब्ध शेष: ₹0)!`
            : `Error: Selected convergence head (${convHeadObj?.name || ''}) has no available funds!`
        );
        return;
      }

      if (convAmt > convHeadAvailBal) {
        setCashbookErrorMsg(
          isHindi
            ? `त्रुटि: अभिसरण मद आवंटन राशि (₹${convAmt.toLocaleString('en-IN')}) चयनित अभिसरण मद की उपलब्ध निधि राशि (₹${convHeadAvailBal.toLocaleString('en-IN')}) से अधिक है!`
            : `Error: Convergence allocation amount (₹${convAmt.toLocaleString('en-IN')}) exceeds available funds (₹${convHeadAvailBal.toLocaleString('en-IN')})!`
        );
        return;
      }
    }

    const calculatedCost = Number(workCost || 0) || (headAmt + convAmt);

    onAddWork({
      name: workName.trim(),
      cost: calculatedCost,
      headId: workHeadId,
      headAmount: headAmt,
      subHeadName: undefined,
      subHeadAmount: 0,
      convergenceHeadId: workConvergenceHeadId || undefined,
      convergenceHeadName: convName || undefined,
      convergenceHeadAmount: convAmt || undefined,
      adminSanctionDate: workAdminSanctionDate || undefined,
    });

    setWorkName('');
    setWorkAdminSanctionDate('');
    setWorkCost(0);
    setWorkHeadId('');
    setWorkHeadAmount(0);
    setWorkSubHead('');
    setWorkSubHeadAmount(0);
    setWorkConvergenceHeadId('');
    setWorkConvergenceHeadName('');
    setWorkConvergenceHeadAmount(0);
  };

  // --- WORK EDIT FORM STATES ---
  const [editingWorkModal, setEditingWorkModal] = useState<Work | null>(null);
  const [editWorkName, setEditWorkName] = useState('');
  const [editWorkAdminSanctionDate, setEditWorkAdminSanctionDate] = useState('');
  const [editWorkCost, setEditWorkCost] = useState<number>(0);
  const [editWorkHeadId, setEditWorkHeadId] = useState('');
  const [editWorkHeadAmount, setEditWorkHeadAmount] = useState<number>(0);
  const [editWorkConvergenceHeadId, setEditWorkConvergenceHeadId] = useState('');
  const [editWorkConvergenceHeadName, setEditWorkConvergenceHeadName] = useState('');
  const [editWorkConvergenceHeadAmount, setEditWorkConvergenceHeadAmount] = useState<number>(0);

  const handleStartEditWork = (work: Work) => {
    setEditingWorkModal(work);
    setEditWorkName(work.name || '');
    setEditWorkAdminSanctionDate(work.adminSanctionDate || '');
    setEditWorkCost(work.cost || 0);
    setEditWorkHeadId(work.headId || '');
    setEditWorkHeadAmount(work.headAmount || 0);
    setEditWorkConvergenceHeadId(work.convergenceHeadId || '');
    setEditWorkConvergenceHeadName(work.convergenceHeadName || '');
    setEditWorkConvergenceHeadAmount(work.convergenceHeadAmount || 0);
  };

  const handleSaveEditWorkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkModal || !editWorkName.trim() || !editWorkHeadId) return;

    const headAmt = Number(editWorkHeadAmount || 0);
    if (isNaN(headAmt) || headAmt <= 0) {
      setCashbookErrorMsg(
        isHindi
          ? 'त्रुटि: मूल मद आवंटन राशि (Allocation Amount) 0 से अधिक होनी चाहिए!'
          : 'Error: Main Head allocation amount must be greater than 0!'
      );
      return;
    }

    const mainHeadObj = accountHeads.find((h) => h.id === editWorkHeadId);
    const mainHeadData = headBalances[editWorkHeadId];
    const mainHeadAvailBal = mainHeadData ? mainHeadData.balance : Number(mainHeadObj?.openingBalance || 0);

    if (mainHeadAvailBal <= 0) {
      setCashbookErrorMsg(
        isHindi
          ? `त्रुटि: चयनित मुख्य खाता मद (${mainHeadObj?.name || ''}) में कोई फंड उपलब्ध नहीं है (वर्तमान उपलब्ध शेष: ₹0)!`
          : `Error: Selected account head (${mainHeadObj?.name || ''}) has no available funds!`
      );
      return;
    }

    if (headAmt > mainHeadAvailBal) {
      setCashbookErrorMsg(
        isHindi
          ? `त्रुटि: मूल मद आवंटन राशि (₹${headAmt.toLocaleString('en-IN')}) चयनित मुख्य खाता मद (${mainHeadObj?.name || ''}) की उपलब्ध निधि राशि (₹${mainHeadAvailBal.toLocaleString('en-IN')}) से अधिक है!`
          : `Error: Head allocation amount (₹${headAmt.toLocaleString('en-IN')}) exceeds available funds (₹${mainHeadAvailBal.toLocaleString('en-IN')}) in selected head!`
      );
      return;
    }

    let convName = editWorkConvergenceHeadName.trim();
    const convAmt = Number(editWorkConvergenceHeadAmount || 0);

    if (editWorkConvergenceHeadId) {
      const convHeadObj = accountHeads.find((h) => h.id === editWorkConvergenceHeadId);
      if (convHeadObj) {
        convName = convHeadObj.name;
      }
      const convHeadData = headBalances[editWorkConvergenceHeadId];
      const convHeadAvailBal = convHeadData ? convHeadData.balance : Number(convHeadObj?.openingBalance || 0);

      if (convHeadAvailBal <= 0) {
        setCashbookErrorMsg(
          isHindi
            ? `त्रुटि: चयनित अभिसरण मद (${convHeadObj?.name || ''}) में कोई फंड उपलब्ध नहीं है!`
            : `Error: Selected convergence head has no available funds!`
        );
        return;
      }

      if (convAmt > convHeadAvailBal) {
        setCashbookErrorMsg(
          isHindi
            ? `त्रुटि: अभिसरण मद आवंटन राशि (₹${convAmt.toLocaleString('en-IN')}) चयनित अभिसरण मद की उपलब्ध निधि राशि (₹${convHeadAvailBal.toLocaleString('en-IN')}) से अधिक है!`
            : `Error: Convergence allocation amount exceeds available funds!`
        );
        return;
      }
    }

    const calculatedCost = Number(editWorkCost || 0) || (headAmt + convAmt);

    const updatedWork: Work = {
      ...editingWorkModal,
      name: editWorkName.trim(),
      cost: calculatedCost,
      headId: editWorkHeadId,
      headAmount: headAmt,
      convergenceHeadId: editWorkConvergenceHeadId || undefined,
      convergenceHeadName: convName || undefined,
      convergenceHeadAmount: convAmt || undefined,
      adminSanctionDate: editWorkAdminSanctionDate || undefined,
    };

    if (onUpdateWork) {
      onUpdateWork(updatedWork);
    }
    setEditingWorkModal(null);
  };

  const executeAddIncomeVoucher = (amountNum: number) => {
    const selectedHead = accountHeads.find((h) => h.id === vHeadId);
    const voucherDate = vDate;
    const paymentMode = 'BANK';
    const remarksText = vRemarks.trim() || (isHindi ? 'आय प्राप्ति जमा' : 'Income Receipt');

    const newVoucherObj = onAddVoucher({
      voucherType: 'INCOME',
      date: voucherDate,
      headId: vHeadId,
      subHeadName: undefined,
      amount: amountNum,
      paymentMode: 'BANK',
      remarks: remarksText,
    });

    const displayVoucher: CashbookVoucher = newVoucherObj || {
      id: `vouch-inc-${Date.now()}`,
      voucherNo: `INC-${new Date().getFullYear()}-001`,
      voucherType: 'INCOME',
      date: voucherDate,
      headId: vHeadId,
      subHeadName: undefined,
      amount: amountNum,
      paymentMode: 'BANK',
      remarks: remarksText,
    };

    setSuccessModalInfo({
      title: isHindi ? 'रोकड़बही में आय प्रविष्टि दर्ज हुई!' : 'Income Voucher Saved Successfully!',
      message: isHindi
        ? `खाता शीर्षक "${selectedHead?.name || 'आय खाता'}" में ₹${amountNum.toLocaleString('en-IN')} की आय प्रविष्टि सफलतापूर्वक दर्ज कर दी गई है।`
        : `Income voucher of ₹${amountNum.toLocaleString('en-IN')} saved under "${selectedHead?.name || 'Income Head'}".`,
      recordType: isHindi ? 'रोकड़बही आय वाउचर (CASHBOOK INCOME)' : 'INCOME VOUCHER',
      details: [
        { label: isHindi ? 'वाउचर दिनांक' : 'Date', value: formatDateDDMMYYYY(voucherDate) },
        { label: isHindi ? 'खाता शीर्षक' : 'Account Head', value: selectedHead?.name || '-' },
        { label: isHindi ? 'प्राप्त राशि' : 'Amount', value: `₹${amountNum.toLocaleString('en-IN')}` },
        { label: isHindi ? 'माध्यम' : 'Payment Mode', value: paymentMode },
        { label: isHindi ? 'विवरण' : 'Remarks', value: remarksText },
      ],
      onPrint: () => {
        setSuccessModalInfo(null);
        setViewingVoucherSlip(displayVoucher);
      },
      printButtonLabel: isHindi ? '🖨️ वाउचर स्लिप देखें' : 'View Voucher Slip',
      onClose: () => {
        setSuccessModalInfo(null);
      },
      isHindi,
    });

    setVAmount(0);
    setVSubHead('');
    setVRemarks('');
  };

  const handleAddIncomeVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(vAmount);

    if (!vHeadId) {
      setCashbookErrorMsg(isHindi ? 'कृपया आय खाता शीर्षक चुनें!' : 'Please select an income account head!');
      return;
    }

    // Negative / Zero Entry Check
    if (isNaN(amountNum) || amountNum <= 0) {
      setCashbookErrorMsg(isHindi ? 'अमान्य राशि! शून्य या ऋणात्मक राशि (Negative Entry) की अनुमति नहीं है।' : 'Invalid amount! Zero or negative entry is not allowed.');
      return;
    }

    // Duplicate Check: Same Head + Same Date + Same Amount
    const duplicateIncome = vouchers.find(
      (v) =>
        v.voucherType === 'INCOME' &&
        v.headId === vHeadId &&
        v.date === vDate &&
        Math.abs(v.amount - amountNum) < 0.01
    );

    if (duplicateIncome) {
      const headObj = accountHeads.find((h) => h.id === vHeadId);
      setDuplicateModalInfo({
        title: isHindi ? 'समान आय प्रविष्टि चेतावनी' : 'Duplicate Income Entry Warning',
        message: isHindi
          ? `⚠️ इस खाता शीर्षक (${headObj?.name || ''}) में दिनांक ${formatDateDDMMYYYY(vDate)} पर ₹${amountNum.toLocaleString('en-IN')} की आय प्रविष्टि पहले से मौजूद है!`
          : `⚠️ An income entry of ₹${amountNum.toLocaleString('en-IN')} already exists on ${formatDateDDMMYYYY(vDate)}!`,
        duplicateInfo: [
          { label: isHindi ? 'वाउचर क्र.' : 'Voucher No', value: duplicateIncome.voucherNo || duplicateIncome.id },
          { label: isHindi ? 'दिनांक' : 'Date', value: formatDateDDMMYYYY(duplicateIncome.date) },
          { label: isHindi ? 'खाता शीर्षक' : 'Account Head', value: headObj?.name || '-' },
          { label: isHindi ? 'राशि' : 'Amount', value: `₹${duplicateIncome.amount.toLocaleString('en-IN')}` },
        ],
        onConfirm: () => {
          setDuplicateModalInfo(null);
          executeAddIncomeVoucher(amountNum);
        },
        onCancel: () => {
          setDuplicateModalInfo(null);
        },
        isHindi,
      });
      return;
    }

    executeAddIncomeVoucher(amountNum);
  };

  const handleAddSubHeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subHeadNameInput.trim()) {
      setCashbookErrorMsg(isHindi ? 'कृपया व्यय उप-शीर्षक नाम दर्ज करें!' : 'Please enter expense subhead name!');
      return;
    }
    if (onAddSubHead) {
      onAddSubHead({
        name: subHeadNameInput.trim(),
        headId: subHeadParentHeadId || undefined,
        description: subHeadDescInput.trim() || undefined,
      });
    }
    setSubHeadNameInput('');
    setSubHeadParentHeadId('');
    setSubHeadDescInput('');
  };

  const executeAddExpenditureVoucher = (amountNum: number) => {
    const selectedWork = vWorkId ? works.find((w) => w.id === vWorkId) : undefined;
    const selectedVendor = vVendorId ? vendors.find((vend) => vend.id === vVendorId) : undefined;
    const selectedHead = accountHeads.find((h) => h.id === vHeadId);

    const workSanctionCost = selectedWork
      ? selectedWork.cost || (selectedWork.headAmount || 0) + (selectedWork.convergenceHeadAmount || 0)
      : undefined;
    const workSpentBefore = selectedWork
      ? vouchers
          .filter((v) => v.workId === selectedWork.id && v.voucherType === 'EXPENDITURE')
          .reduce((s, v) => s + v.amount, 0)
      : undefined;
    const workRemainingAfter =
      workSanctionCost !== undefined && workSpentBefore !== undefined
        ? workSanctionCost - (workSpentBefore + amountNum)
        : undefined;

    const newVoucherObj = onAddVoucher({
      voucherType: 'EXPENDITURE',
      date: vDate,
      headId: vHeadId,
      subHeadName: vSubHead ? vSubHead : undefined,
      amount: amountNum,
      vendorId: vVendorId || undefined,
      workId: vWorkId || undefined,
      paymentMode: vPaymentMode || 'BANK',
      remarks: vRemarks.trim() || (isHindi ? 'व्यय भुगतान निष्पादन' : 'Expenditure Payment'),
      proposalNo: vProposalNo.trim() || undefined,
      proposalDate: vProposalDate || undefined,
      billNo: vBillNo.trim() || undefined,
      billDate: vBillDate || undefined,
      workSanctionAmount: workSanctionCost,
      previousExpendedAmount: workSpentBefore,
      remainingAmount: workRemainingAfter,
      expenseCategory: vExpenseCategory || (vWorkId ? 'WORK' : 'GENERAL'),
    });

    const createdV: CashbookVoucher = newVoucherObj || {
      id: `vouch-exp-${Date.now()}`,
      voucherNo: `EXP-${new Date().getFullYear()}-001`,
      voucherType: 'EXPENDITURE',
      date: vDate,
      headId: vHeadId,
      subHeadName: vSubHead ? vSubHead : undefined,
      amount: amountNum,
      vendorId: vVendorId || undefined,
      workId: vWorkId || undefined,
      paymentMode: vPaymentMode || 'BANK',
      remarks: vRemarks.trim() || (isHindi ? 'व्यय भुगतान निष्पादन' : 'Expenditure Payment'),
      proposalNo: vProposalNo.trim() || undefined,
      proposalDate: vProposalDate || undefined,
      billNo: vBillNo.trim() || undefined,
      billDate: vBillDate || undefined,
      workSanctionAmount: workSanctionCost,
      previousExpendedAmount: workSpentBefore,
      remainingAmount: workRemainingAfter,
      expenseCategory: vExpenseCategory || (vWorkId ? 'WORK' : 'GENERAL'),
    };

    setSuccessModalInfo({
      title: isHindi ? 'रोकड़बही में व्यय वाउचर दर्ज हुआ!' : 'Expense Voucher Saved Successfully!',
      message: isHindi
        ? `खाता शीर्षक "${selectedHead?.name || 'व्यय खाता'}" से ₹${amountNum.toLocaleString('en-IN')} का भुगतान वाउचर सफलतापूर्वक सुरक्षित कर लिया गया है।`
        : `Expenditure voucher of ₹${amountNum.toLocaleString('en-IN')} saved under "${selectedHead?.name || 'Expense Head'}".`,
      recordType: isHindi ? 'रोकड़बही व्यय वाउचर (CASHBOOK EXPENDITURE)' : 'EXPENDITURE VOUCHER',
      details: [
        { label: isHindi ? 'वाउचर दिनांक' : 'Date', value: formatDateDDMMYYYY(vDate) },
        { label: isHindi ? 'खाता शीर्षक' : 'Account Head', value: selectedHead?.name || '-' },
        { label: isHindi ? 'भुगतान राशि' : 'Amount', value: `₹${amountNum.toLocaleString('en-IN')}` },
        { label: isHindi ? 'वेंडर / आदाता' : 'Vendor', value: selectedVendor?.name || '-' },
        { label: isHindi ? 'कार्य का नाम' : 'Work Name', value: selectedWork?.name || '-' },
        { label: isHindi ? 'भुगतान माध्यम' : 'Payment Mode', value: vPaymentMode || 'BANK' },
      ],
      onPrint: () => {
        setSuccessModalInfo(null);
        setViewingNoteSheet(createdV);
      },
      printButtonLabel: isHindi ? '📄 नोटशीट / वाउचर देखें' : 'View Note Sheet / Voucher',
      onClose: () => {
        setSuccessModalInfo(null);
      },
      isHindi,
    });

    setVAmount(0);
    setVSubHead('');
    setVRemarks('');
    setVProposalNo('');
    setVProposalDate('');
    setVBillNo('');
    setVBillDate('');
  };

  const handleAddExpenditureVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(vAmount);

    if (!vHeadId) {
      setCashbookErrorMsg(isHindi ? 'कृपया व्यय खाता शीर्षक चुनें!' : 'Please select an expense account head!');
      return;
    }

    // Negative / Zero Entry Check
    if (isNaN(amountNum) || amountNum <= 0) {
      setCashbookErrorMsg(isHindi ? 'अमान्य राशि! शून्य या ऋणात्मक राशि (Negative Entry) की अनुमति नहीं है।' : 'Invalid amount! Zero or negative entry is not allowed.');
      return;
    }

    // Check Head Balance Limit
    const currentHeadData = headBalances[vHeadId];
    const selectedHead = accountHeads.find((h) => h.id === vHeadId);
    const headAvailableBalance = currentHeadData
      ? currentHeadData.balance
      : Number(selectedHead?.openingBalance || 0);

    if (amountNum > headAvailableBalance) {
      setCashbookErrorMsg(
        isHindi
          ? `त्रुटि: व्यय राशि (₹${amountNum.toLocaleString('en-IN')}) चयनित खाता हेड की उपलब्ध शेष राशि (₹${headAvailableBalance.toLocaleString('en-IN')}) से अधिक नहीं हो सकती!`
          : `Error: Expenditure amount (₹${amountNum.toLocaleString('en-IN')}) cannot exceed available head balance (₹${headAvailableBalance.toLocaleString('en-IN')})!`
      );
      return;
    }

    // Check Work Cost Limit (if work is selected)
    if (vWorkId) {
      const selectedWork = works.find((w) => w.id === vWorkId);
      if (selectedWork) {
        const workCost = selectedWork.cost || ((selectedWork.headAmount || 0) + (selectedWork.convergenceHeadAmount || 0));
        const workSpent = vouchers
          .filter((v) => v.workId === selectedWork.id && v.voucherType === 'EXPENDITURE')
          .reduce((s, v) => s + v.amount, 0);
        const workRemaining = workCost - workSpent;

        if (amountNum > workRemaining) {
          setCashbookErrorMsg(
            isHindi
              ? `त्रुटि: व्यय राशि (₹${amountNum.toLocaleString('en-IN')}) इस निर्माण कार्य की शेष स्वीकृत लागत/बजट (₹${workRemaining.toLocaleString('en-IN')}) से अधिक नहीं हो सकती!`
              : `Error: Expenditure amount (₹${amountNum.toLocaleString('en-IN')}) cannot exceed remaining work budget (₹${workRemaining.toLocaleString('en-IN')})!`
          );
          return;
        }
      }
    }

    // Duplicate Check: Same Head + Same Date + Same Amount + (Same Work or Same Vendor)
    const duplicateExp = vouchers.find(
      (v) =>
        v.voucherType === 'EXPENDITURE' &&
        v.headId === vHeadId &&
        v.date === vDate &&
        Math.abs(v.amount - amountNum) < 0.01 &&
        ((vWorkId && v.workId === vWorkId) || (vVendorId && v.vendorId === vVendorId) || (!vWorkId && !vVendorId))
    );

    if (duplicateExp) {
      const headObj = accountHeads.find((h) => h.id === vHeadId);
      const vendObj = vendors.find((v) => v.id === vVendorId);
      const workObj = works.find((w) => w.id === vWorkId);
      setDuplicateModalInfo({
        title: isHindi ? 'समान व्यय प्रविष्टि चेतावनी' : 'Duplicate Expenditure Entry Warning',
        message: isHindi
          ? `⚠️ दिनांक ${formatDateDDMMYYYY(vDate)} पर इस खाता हेड (${headObj?.name || ''}) से ₹${amountNum.toLocaleString('en-IN')} का व्यय वाउचर पहले से मौजूद है!`
          : `⚠️ An expenditure voucher of ₹${amountNum.toLocaleString('en-IN')} already exists on ${formatDateDDMMYYYY(vDate)}!`,
        duplicateInfo: [
          { label: isHindi ? 'वाउचर क्र.' : 'Voucher No', value: duplicateExp.voucherNo || duplicateExp.id },
          { label: isHindi ? 'दिनांक' : 'Date', value: formatDateDDMMYYYY(duplicateExp.date) },
          { label: isHindi ? 'खाता शीर्षक' : 'Account Head', value: headObj?.name || '-' },
          { label: isHindi ? 'राशि' : 'Amount', value: `₹${duplicateExp.amount.toLocaleString('en-IN')}` },
          { label: isHindi ? 'वेंडर / कार्य' : 'Vendor/Work', value: vendObj?.name || workObj?.name || '-' },
        ],
        onConfirm: () => {
          setDuplicateModalInfo(null);
          executeAddExpenditureVoucher(amountNum);
        },
        onCancel: () => {
          setDuplicateModalInfo(null);
        },
        isHindi,
      });
      return;
    }

    executeAddExpenditureVoucher(amountNum);
  };

  // Filtered Vouchers for Reports (sorted chronological: oldest to latest date by date)
  const filteredVouchers = useMemo(() => {
    return vouchers
      .filter((v) => {
        if (filterStartDate && v.date < filterStartDate) return false;
        if (filterEndDate && v.date > filterEndDate) return false;

        // Financial Year Filter
        if (filterFinancialYear !== 'ALL') {
          if (!isInFinancialYear(v.date, filterFinancialYear)) return false;
        }

        // Month Filter
        if (filterMonth > 0) {
          const monthNum = parseInt(v.date.split('-')[1] || '0', 10);
          if (monthNum !== filterMonth) return false;
        }

        // Ledger Mode Type Filter
        if (activeTab === CashbookTab.LEDGER_REPORT) {
          if (ledgerMode === 'INCOME' && v.voucherType !== 'INCOME') return false;
          if (ledgerMode === 'EXPENDITURE' && v.voucherType !== 'EXPENDITURE') return false;
        }

        if (filterHeadId !== 'ALL' && v.headId !== filterHeadId) return false;
        if (filterVendorId !== 'ALL' && v.vendorId !== filterVendorId) return false;
        if (filterWorkId !== 'ALL' && v.workId !== filterWorkId) return false;

        if (filterSearch) {
          const q = filterSearch.toLowerCase();
          const head = accountHeads.find((h) => h.id === v.headId)?.name.toLowerCase() || '';
          const vendor = vendors.find((ven) => ven.id === v.vendorId)?.name.toLowerCase() || '';
          const work = works.find((w) => w.id === v.workId)?.name.toLowerCase() || '';
          const remarks = (v.remarks || '').toLowerCase();
          const vNo = (v.voucherNo || '').toLowerCase();
          const taxPayer = getTaxPayerDetails(v);
          const taxPayerName = (taxPayer?.name || '').toLowerCase();
          const taxPayerGuardian = (taxPayer?.guardianName || '').toLowerCase();
          const taxPayerSamagra = (taxPayer?.samagraId || '').toLowerCase();
          const taxReceiptNo = (taxPayer?.receiptNo || '').toLowerCase();

          if (
            !head.includes(q) &&
            !vendor.includes(q) &&
            !work.includes(q) &&
            !remarks.includes(q) &&
            !vNo.includes(q) &&
            !taxPayerName.includes(q) &&
            !taxPayerGuardian.includes(q) &&
            !taxPayerSamagra.includes(q) &&
            !taxReceiptNo.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return (a.voucherNo || '').localeCompare(b.voucherNo || '');
      });
  }, [
    vouchers,
    filterStartDate,
    filterEndDate,
    filterFinancialYear,
    filterMonth,
    activeTab,
    ledgerMode,
    filterHeadId,
    filterVendorId,
    filterWorkId,
    filterSearch,
    accountHeads,
    vendors,
    works,
    payments,
    families,
    otherTaxReceipts,
    bookingRents,
    buildingPermissions,
    businessRegistrations,
  ]);

  // Export CSV Handler
  const handleExportCSV = () => {
    let csv = `Date,Voucher No,Type,Account Head,Sub-Head,Vendor Name,Work Name,Payment Mode,Receipt (+),Payment (-),Remarks\n`;
    filteredVouchers.forEach((v) => {
      const head = accountHeads.find((h) => h.id === v.headId)?.name || 'N/A';
      const vendor = vendors.find((ven) => ven.id === v.vendorId)?.name || '-';
      const work = works.find((w) => w.id === v.workId)?.name || '-';
      const receipt = v.voucherType === 'INCOME' ? v.amount : 0;
      const payment = v.voucherType === 'EXPENDITURE' ? v.amount : 0;
      csv += `"${v.date}","${v.voucherNo}","${v.voucherType}","${head}","${v.subHeadName || '-'}","${vendor}","${work}","${v.paymentMode}",${receipt},${payment},"${v.remarks}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Panchayat_Cashbook_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <ViewHeader
        title={isHindi ? 'ग्राम पंचायत कैशबुक एवं बहीखाता प्रबंधन' : 'Panchayat Cashbook & Financial Ledger'}
        subtitle={
          isHindi
            ? 'खाता शीर्षक, वेंडर, निर्माण कार्य, आय/व्यय वाउचर एवं रोकड़ बही रिपोर्ट'
            : 'Account Heads, Vendors, Works, Income/Expenditure Vouchers & Cashbook Register'
        }
        icon="📗"
        badge={officeDetails?.officeName || 'Gram Panchayat Office'}
      />

      {/* TOP METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">{isHindi ? 'प्रारंभिक शेष' : 'Opening Bal'}</p>
            <p className="text-lg font-black text-slate-800 font-mono mt-0.5">
              ₹{grandSummary.totalOpening.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-base font-bold">
            🏛️
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase">{isHindi ? 'कुल आय (+)' : 'Total Income'}</p>
            <p className="text-lg font-black text-emerald-700 font-mono mt-0.5">
              +₹{grandSummary.totalIncome.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center text-base font-bold">
            📈
          </div>
        </div>

        <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-800 uppercase">{isHindi ? 'कुल व्यय (-)' : 'Total Expense'}</p>
            <p className="text-lg font-black text-rose-700 font-mono mt-0.5">
              -₹{grandSummary.totalExpenditure.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-900 flex items-center justify-center text-base font-bold">
            📉
          </div>
        </div>

        <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-900 uppercase">{isHindi ? 'बैंक खाता स्तर शेष' : 'Bank Bal'}</p>
            <p className="text-lg font-black text-blue-800 font-mono mt-0.5">
              ₹{grandSummary.bankBalance.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-200 text-blue-900 flex items-center justify-center text-base font-bold">
            🏦
          </div>
        </div>

        <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase">{isHindi ? 'अंतिम कुल शेष' : 'Closing Net Bal'}</p>
            <p className="text-lg font-black text-primary font-mono mt-0.5">
              ₹{grandSummary.closingBalance.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-base font-bold">
            💰
          </div>
        </div>
      </div>

      {/* TAXATION RECEIPTS & CASHBOOK SYNC STATUS BAR */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl shadow-md border border-emerald-700/50 flex flex-col md:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-lg shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 rounded-md text-[10px] font-black uppercase tracking-wider">
                {isHindi ? 'स्वतः सिंक सक्रिय' : 'Auto Sync Active'}
              </span>
              <p className="text-xs font-black text-white">
                {isHindi
                  ? 'कर संग्रह, अन्य कर, भवन अनुमति एवं बुकिंग रसीदें कैशबुक से 100% सिंक हैं'
                  : 'Tax collections, building permissions & booking rents are synced with Cashbook'}
              </p>
            </div>
            <p className="text-[11px] text-emerald-200/80 mt-0.5">
              {isHindi
                ? `कुल कर रसीदें: ${payments.length} | अन्य कर: ${otherTaxReceipts.length} | भवन अनुमति: ${buildingPermissions.length} | बुकिंग किराया: ${bookingRents.length}`
                : `Tax Receipts: ${payments.length} | Other Tax: ${otherTaxReceipts.length} | Building Perms: ${buildingPermissions.length} | Booking Rents: ${bookingRents.length}`}
            </p>
          </div>
        </div>

        {onSyncTaxTransactions && (
          <button
            onClick={onSyncTaxTransactions}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>🔄</span>
            <span>{isHindi ? 'कर रसीदें सिंक करें' : 'Sync Tax Receipts'}</span>
          </button>
        )}
      </div>

      {/* MODULE TAB NAVIGATION BAR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1.5 print:hidden">
        <button
          onClick={() => setActiveTab(CashbookTab.ACCOUNT_HEADS)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === CashbookTab.ACCOUNT_HEADS
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>🏦</span>
          <span>1. {isHindi ? 'खाता शीर्षक निर्माण' : 'Account Heads'}</span>
        </button>

        <button
          onClick={() => setActiveTab(CashbookTab.EXPENSE_SUBHEADS)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === CashbookTab.EXPENSE_SUBHEADS
              ? 'bg-rose-700 text-white shadow-md'
              : 'bg-rose-50 hover:bg-rose-100 text-rose-900'
          }`}
        >
          <span>📁</span>
          <span>2. {isHindi ? 'व्यय उप-शीर्षक' : 'Expense Subheads'}</span>
        </button>

        <button
          onClick={() => setActiveTab(CashbookTab.VENDORS)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === CashbookTab.VENDORS
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>🏬</span>
          <span>3. {isHindi ? 'वेंडर प्रबंधन' : 'Vendor Management'}</span>
        </button>

        <button
          onClick={() => setActiveTab(CashbookTab.WORKS)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === CashbookTab.WORKS
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>🏗️</span>
          <span>4. {isHindi ? 'कार्य प्रबंधन' : 'Work Management'}</span>
        </button>

        <button
          onClick={() => setActiveTab(CashbookTab.INCOME_VOUCHERS)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === CashbookTab.INCOME_VOUCHERS
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
          }`}
        >
          <span>📈</span>
          <span>5. {isHindi ? 'आय वाउचर' : 'Income Voucher'}</span>
        </button>

        <button
          onClick={() => setActiveTab(CashbookTab.EXPENDITURE_VOUCHERS)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === CashbookTab.EXPENDITURE_VOUCHERS
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
          }`}
        >
          <span>📉</span>
          <span>6. {isHindi ? 'व्यय वाउचर' : 'Expenditure Voucher'}</span>
        </button>

        <button
          onClick={() => setActiveTab(CashbookTab.LEDGER_REPORT)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === CashbookTab.LEDGER_REPORT
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800'
          }`}
        >
          <span>📊</span>
          <span>7. {isHindi ? 'लेजर रिपोर्ट' : 'Ledger Report'}</span>
        </button>

        <button
          onClick={() => setActiveTab(CashbookTab.CASHBOOK_REPORT)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === CashbookTab.CASHBOOK_REPORT
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-900'
          }`}
        >
          <span>📗</span>
          <span>7. {isHindi ? 'कैशबुक/रोकड़ बही रिपोर्ट' : 'Cashbook Report'}</span>
        </button>

        <button
          onClick={() => setActiveTab(CashbookTab.WORK_EXPENDITURE_REPORT)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === CashbookTab.WORK_EXPENDITURE_REPORT
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-teal-50 hover:bg-teal-100 text-teal-900'
          }`}
        >
          <span>🚜</span>
          <span>8. {isHindi ? 'कार्य व्यय व अभिसरण रिपोर्ट' : 'Work Expenditure Report'}</span>
        </button>
      </div>

      {/* TAB 1: ACCOUNT HEAD CREATION */}
      {activeTab === CashbookTab.ACCOUNT_HEADS && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span>🏦</span>
              <span>{isHindi ? 'नया खाता शीर्षक (Account Head) जोड़ें' : 'Create Account Head'}</span>
            </h3>

            <form onSubmit={handleAddHeadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'खाता शीर्षक नाम (Account Head Name) *' : 'Head Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  placeholder={isHindi ? 'e.g. 15वाँ वित्त आयोग / पंचायती राज निधि' : 'e.g. 15th Finance Commission'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'हेड कोड (Code / Serial No)' : 'Head Code'}
                </label>
                <input
                  type="text"
                  value={headCode}
                  onChange={(e) => setHeadCode(e.target.value)}
                  placeholder="e.g. HEAD-15FC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'खाता प्रकार (Type)' : 'Head Type'}
                </label>
                <select
                  value={headType}
                  onChange={(e) => setHeadType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  <option value="BOTH">🔄 {isHindi ? 'आय एवं व्यय दोनों (Both Income & Expense)' : 'Both Income & Expense'}</option>
                  <option value="INCOME">📈 {isHindi ? 'केवल आय हेड (Income Head Only)' : 'Income Head Only'}</option>
                  <option value="EXPENDITURE">📉 {isHindi ? 'केवल व्यय हेड (Expenditure Head Only)' : 'Expenditure Head Only'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'प्रारंभिक शेष राशि (Opening Balance ₹)' : 'Opening Balance (₹)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={headOpeningBalance}
                  onChange={(e) => setHeadOpeningBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'प्रारंभिक तिथि (As On Date)' : 'As On Date'}
                </label>
                <input
                  type="date"
                  required
                  value={headAsOnDate}
                  onChange={(e) => setHeadAsOnDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs"
              >
                + {isHindi ? 'खाता शीर्षक सुरक्षित करें' : 'Save Account Head'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <span>📋</span>
                <span>{isHindi ? 'पंजीकृत खाता शीर्षक सूची' : 'Account Heads List'}</span>
              </span>
              <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700">
                {accountHeads.length} {isHindi ? 'शीर्षक' : 'Heads'}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">{isHindi ? 'शीर्षक नाम / कोड' : 'Head Name'}</th>
                    <th className="p-2.5">{isHindi ? 'प्रकार' : 'Type'}</th>
                    <th className="p-2.5">{isHindi ? 'प्रारंभिक शेष' : 'Opening Bal'}</th>
                    <th className="p-2.5">{isHindi ? 'आय (+)' : 'Income'}</th>
                    <th className="p-2.5">{isHindi ? 'व्यय (-)' : 'Expenditure'}</th>
                    <th className="p-2.5">{isHindi ? 'वर्तमान शेष' : 'Current Bal'}</th>
                    <th className="p-2.5 text-right">{isHindi ? 'कार्रवाई' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {accountHeads.map((h, idx) => {
                    const stats = headBalances[h.id] || { income: 0, expenditure: 0, balance: h.openingBalance };
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{h.name}</p>
                          {h.code && <p className="text-[10px] text-slate-500 font-mono">Code: {h.code}</p>}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px]">
                            {h.type}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-slate-700 font-bold">₹{h.openingBalance.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 font-mono text-emerald-700 font-bold">+₹{stats.income.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 font-mono text-rose-700 font-bold">-₹{stats.expenditure.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 font-mono text-primary font-black">₹{stats.balance.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingHead(h)}
                              className="p-1 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                              title={isHindi ? "खाता शीर्षक का नाम या विवरण बदलें" : "Edit Account Head"}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteConfirmModal({ id: h.id, name: h.name, type: 'HEAD' })}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Head"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {accountHeads.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                        {isHindi ? 'कोई खाता शीर्षक दर्ज नहीं है। कृपया नया हेड जोड़ें।' : 'No account heads found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right font-black uppercase">
                      {isHindi ? 'समस्त खाता शीर्षकों का कुल योग (Grand Total):' : 'Grand Total:'}
                    </td>
                    <td className="p-2.5 font-mono text-slate-900 font-extrabold">
                      ₹{grandSummary.totalOpening.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 font-mono text-emerald-700 font-extrabold">
                      +₹{grandSummary.totalIncome.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 font-mono text-rose-700 font-extrabold">
                      -₹{grandSummary.totalExpenditure.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 font-mono text-primary font-black">
                      ₹{grandSummary.closingBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB FOR PANCHAYAT EXPENSE SUBHEADS */}
      {activeTab === CashbookTab.EXPENSE_SUBHEADS && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CREATE SUBHEAD FORM */}
          <div className="p-5 bg-white rounded-2xl border border-rose-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-rose-950 flex items-center gap-2 border-b border-rose-100 pb-3">
              <span>📁</span>
              <span>{isHindi ? 'ग्राम पंचायत व्यय उप-शीर्षक (Create Expense Subhead)' : 'Create Expense Subhead'}</span>
            </h3>

            <form onSubmit={handleAddSubHeadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'व्यय उप-शीर्षक का नाम (Subhead Name) *' : 'Subhead Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={subHeadNameInput}
                  onChange={(e) => setSubHeadNameInput(e.target.value)}
                  placeholder={isHindi ? 'e.g. कार्यालय स्टेशनरी व छपाई' : 'e.g. Office Stationery & Printing'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'मूल व्यय खाता हेड (Parent Account Head - ऐच्छिक)' : 'Parent Account Head (Optional)'}
                </label>
                <select
                  value={subHeadParentHeadId}
                  onChange={(e) => setSubHeadParentHeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  <option value="">-- {isHindi ? 'सभी व्यय हेड हेतु सामान्य (General Subhead)' : 'General / Any Head'} --</option>
                  {accountHeads
                    .filter((h) => h.type === 'EXPENDITURE' || h.type === 'BOTH')
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'विवरण टिप्पणी (Description / Remarks)' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={subHeadDescInput}
                  onChange={(e) => setSubHeadDescInput(e.target.value)}
                  placeholder={isHindi ? 'e.g. स्टेशनरी, रजिस्टर, प्रिंटिंग एवं फोटोकॉपी व्यय' : 'e.g. Stationery and printing costs'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>➕</span>
                <span>{isHindi ? 'व्यय उप-शीर्षक सुरक्षित करें' : 'Save Expense Subhead'}</span>
              </button>
            </form>
          </div>

          {/* SUBHEADS LIST TABLE */}
          <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📁</span>
                <span>{isHindi ? 'पंजीकृत ग्राम पंचायत व्यय उप-शीर्षक सूची' : 'Registered Expense Subheads'}</span>
              </h3>
              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-xs font-black rounded-full">
                {subHeads.length} {isHindi ? 'उप-शीर्षक' : 'Subheads'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">{isHindi ? 'उप-शीर्षक नाम (Subhead)' : 'Subhead Name'}</th>
                    <th className="p-2.5">{isHindi ? 'संबंधित मुख्य हेड' : 'Parent Head'}</th>
                    <th className="p-2.5">{isHindi ? 'विवरण' : 'Description'}</th>
                    <th className="p-2.5 text-right">{isHindi ? 'कार्रवाई' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {subHeads.map((sub, idx) => {
                    const parentHead = accountHeads.find((h) => h.id === sub.headId);
                    return (
                      <tr key={sub.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{sub.name}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700">
                            {parentHead ? parentHead.name : (isHindi ? 'सामान्य (सभी व्यय हेतु)' : 'General')}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px]">{sub.description || '-'}</td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => setDeleteConfirmModal({ id: sub.id, name: sub.name, type: 'SUBHEAD' })}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Subhead"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {subHeads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                        {isHindi ? 'कोई व्यय उप-शीर्षक दर्ज नहीं है।' : 'No expense subheads registered.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VENDOR MANAGEMENT */}
      {activeTab === CashbookTab.VENDORS && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span>🏬</span>
              <span>{isHindi ? 'नया वेंडर / विक्रेता जोड़ें' : 'Create Vendor'}</span>
            </h3>

            <form onSubmit={handleAddVendorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'वेंडर / फर्म का नाम *' : 'Vendor / Firm Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder={isHindi ? 'e.g. श्री राम ट्रेडर्स एवं सप्लायर्स' : 'e.g. M/S Ram Suppliers'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'पता (Address) *' : 'Address *'}
                </label>
                <input
                  type="text"
                  required
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  placeholder={isHindi ? 'e.g. मुख्य बाजार, सीहोर' : 'Address'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={vendorMobile}
                  onChange={(e) => setVendorMobile(e.target.value)}
                  placeholder="91XXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs"
              >
                + {isHindi ? 'वेंडर पंजीयन करें' : 'Save Vendor'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <span>📋</span>
                <span>{isHindi ? 'पंजीकृत वेंडर सूची' : 'Vendors List'}</span>
              </span>
              <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700">
                {vendors.length} {isHindi ? 'वेंडर' : 'Vendors'}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">{isHindi ? 'वेंडर नाम एवं पता' : 'Vendor Name & Address'}</th>
                    <th className="p-2.5">{isHindi ? 'मोबाइल / GST' : 'Contact / GST'}</th>
                    <th className="p-2.5">{isHindi ? 'प्रारंभिक बकाया' : 'Opening Dues'}</th>
                    <th className="p-2.5">{isHindi ? 'कुल भुगतान (+)' : 'Total Paid'}</th>
                    <th className="p-2.5 text-right">{isHindi ? 'कार्रवाई' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {vendors.map((v, idx) => {
                    const totalPaidToVendor = vouchers
                      .filter((vouch) => vouch.vendorId === v.id)
                      .reduce((s, vouch) => s + vouch.amount, 0);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{v.name}</p>
                          <p className="text-[10px] text-slate-500">{v.address}</p>
                        </td>
                        <td className="p-2.5">
                          {v.mobile && <p className="font-mono text-slate-700">📱 {v.mobile}</p>}
                          {v.gstNo && <p className="font-mono text-[10px] text-slate-500">GST: {v.gstNo}</p>}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700 font-bold">₹{(v.openingBalance || 0).toLocaleString('en-IN')}</td>
                        <td className="p-2.5 font-mono text-emerald-700 font-bold">₹{totalPaidToVendor.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => setDeleteConfirmModal({ id: v.id, name: v.name, type: 'VENDOR' })}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Vendor"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {vendors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                        {isHindi ? 'कोई वेंडर पंजीकृत नहीं है। नया वेंडर जोड़ें।' : 'No vendors registered.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WORK MANAGEMENT */}
      {activeTab === CashbookTab.WORKS && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span>🏗️</span>
              <span>{isHindi ? 'नया निर्माण कार्य जोड़ें (Register Work)' : 'Create Work Project'}</span>
            </h3>

            <form onSubmit={handleAddWorkSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'निर्माण कार्य का नाम *' : 'Work Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={workName}
                  onChange={(e) => setWorkName(e.target.value)}
                  placeholder={isHindi ? 'e.g. सीसी रोड निर्माण वार्ड 04' : 'e.g. CC Road Construction'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'प्रशासनिक स्वीकृति दिनांक (Admin Sanction Date)' : 'Admin Sanction Date'}
                </label>
                <input
                  type="date"
                  value={workAdminSanctionDate}
                  onChange={(e) => setWorkAdminSanctionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'मुख्य खाता शीर्षक (Select Account Head) *' : 'Account Head *'}
                </label>
                <select
                  required
                  value={workHeadId}
                  onChange={(e) => setWorkHeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  <option value="">-- {isHindi ? 'मुख्य हेड चुनें' : 'Select Head'} --</option>
                  {accountHeads.map((h) => {
                    const hBal = headBalances[h.id] ? headBalances[h.id].balance : Number(h.openingBalance || 0);
                    return (
                      <option key={h.id} value={h.id}>
                        {h.name} {isHindi ? `(फंड शेष: ₹${hBal.toLocaleString('en-IN')})` : `(Fund Bal: ₹${hBal.toLocaleString('en-IN')})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Fund Balance Indicator for Main Head */}
              {workHeadId && (() => {
                const mainHeadObj = accountHeads.find((h) => h.id === workHeadId);
                const headData = headBalances[workHeadId];
                const availBal = headData ? headData.balance : Number(mainHeadObj?.openingBalance || 0);
                const hasFund = availBal > 0;

                return (
                  <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${hasFund ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'}`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>💰 {isHindi ? 'मुख्य हेड उपलब्ध फंड शेष:' : 'Main Head Available Fund:'}</span>
                      <span className="font-mono font-black text-sm">₹{availBal.toLocaleString('en-IN')}</span>
                    </div>
                    {!hasFund ? (
                      <p className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{isHindi ? 'इस खाता मद में पर्याप्त फंड उपलब्ध नहीं है! नया कार्य पंजीकृत नहीं किया जा सकता।' : 'Insufficient funds! Work cannot be registered under this head.'}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-emerald-800 font-semibold">
                        ✅ {isHindi ? 'फंड उपलब्ध है। कार्य हेतु राशि आवंटित की जा सकती है।' : 'Funds available for allocation.'}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'मूल मद आवंटन राशि (Head Allocation ₹) *' : 'Head Amount (₹) *'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={workHeadAmount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setWorkHeadAmount(val);
                    setWorkCost(val + Number(workConvergenceHeadAmount || 0));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              {/* CONVERGENCE HEAD SELECTION (अभिसरण मद विकल्प) */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2.5">
                <p className="font-extrabold text-teal-950 flex items-center gap-1.5 text-xs">
                  <span>🔀</span>
                  <span>{isHindi ? 'अभिसरण / कन्वर्जेंस मद विकल्प (Convergence Head)' : 'Convergence Head Selection'}</span>
                </p>

                <div>
                  <label className="block font-bold text-teal-900 mb-1">
                    {isHindi ? 'अभिसरण खाता मद चुनें' : 'Select Convergence Head'}
                  </label>
                  <select
                    value={workConvergenceHeadId}
                    onChange={(e) => {
                      setWorkConvergenceHeadId(e.target.value);
                      if (e.target.value) {
                        const h = accountHeads.find((ah) => ah.id === e.target.value);
                        if (h) setWorkConvergenceHeadName(h.name);
                      }
                    }}
                    className="w-full px-3 py-2 border border-teal-300 rounded-xl bg-white font-semibold"
                  >
                    <option value="">-- {isHindi ? 'कोई अभिसरण मद नहीं (None)' : 'No Convergence Head'} --</option>
                    {accountHeads.map((h) => {
                      const hBal = headBalances[h.id] ? headBalances[h.id].balance : Number(h.openingBalance || 0);
                      return (
                        <option key={h.id} value={h.id}>
                          {h.name} {isHindi ? `(फंड शेष: ₹${hBal.toLocaleString('en-IN')})` : `(Fund Bal: ₹${hBal.toLocaleString('en-IN')})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Convergence Head Fund Balance Indicator */}
                {workConvergenceHeadId && (() => {
                  const convHeadObj = accountHeads.find((h) => h.id === workConvergenceHeadId);
                  const convData = headBalances[workConvergenceHeadId];
                  const convAvailBal = convData ? convData.balance : Number(convHeadObj?.openingBalance || 0);
                  const hasFund = convAvailBal > 0;

                  return (
                    <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${hasFund ? 'bg-teal-100/80 border-teal-300 text-teal-950' : 'bg-rose-50 border-rose-300 text-rose-950'}`}>
                      <div className="flex justify-between items-center font-bold">
                        <span>💰 {isHindi ? 'अभिसरण मद उपलब्ध फंड शेष:' : 'Convergence Head Available Fund:'}</span>
                        <span className="font-mono font-black text-sm">₹{convAvailBal.toLocaleString('en-IN')}</span>
                      </div>
                      {!hasFund && (
                        <p className="text-[10px] text-rose-700 font-bold">
                          ⚠️ {isHindi ? 'इस अभिसरण मद में कोई फंड उपलब्ध नहीं है!' : 'No funds available in convergence head!'}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <label className="block font-bold text-teal-900 mb-1">
                    {isHindi ? 'या अभिसरण मद नाम टाइप करें' : 'Or Custom Convergence Head Name'}
                  </label>
                  <input
                    type="text"
                    value={workConvergenceHeadName}
                    onChange={(e) => setWorkConvergenceHeadName(e.target.value)}
                    placeholder={isHindi ? 'e.g. मनरेगा (MGNREGA) / स्वच्‍छ भारत मिशन' : 'e.g. MGNREGA / SBM'}
                    className="w-full px-3 py-2 border border-teal-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-teal-900 mb-1">
                    {isHindi ? 'अभिसरण मद लागत / राशि (Convergence Cost ₹)' : 'Convergence Head Cost (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={workConvergenceHeadAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setWorkConvergenceHeadAmount(val);
                      setWorkCost(Number(workHeadAmount || 0) + val);
                    }}
                    className="w-full px-3 py-2 border border-teal-300 rounded-xl font-mono font-bold bg-white text-teal-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isHindi ? 'कार्य की कुल स्वीकृत लागत (Total Sanctioned Cost ₹) *' : 'Total Work Cost (₹) *'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={workCost}
                  onChange={(e) => setWorkCost(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-black text-slate-900 bg-slate-50"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                  {isHindi
                    ? `(मूल मद: ₹${workHeadAmount.toLocaleString('en-IN')} + कन्वर्जेंस मद: ₹${workConvergenceHeadAmount.toLocaleString('en-IN')} = ₹${(workHeadAmount + workConvergenceHeadAmount).toLocaleString('en-IN')})`
                    : `Head: ₹${workHeadAmount} + Conv: ₹${workConvergenceHeadAmount}`}
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs"
              >
                + {isHindi ? 'कार्य पंजीकृत करें' : 'Save Work'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <span>📋</span>
                <span>{isHindi ? 'पंजीकृत निर्माण कार्य सूची' : 'Works List'}</span>
              </span>
              <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700">
                {works.length} {isHindi ? 'कार्य' : 'Works'}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">{isHindi ? 'कार्य का नाम' : 'Work Name'}</th>
                    <th className="p-2.5">{isHindi ? 'मूल खाता हेड' : 'Main Head'}</th>
                    <th className="p-2.5">{isHindi ? 'अभिसरण/कन्वर्ट मद' : 'Convergence Head'}</th>
                    <th className="p-2.5">{isHindi ? 'कुल स्वीकृत लागत' : 'Total Sanction Cost'}</th>
                    <th className="p-2.5">{isHindi ? 'कुल व्यय भुगतान' : 'Total Expense'}</th>
                    <th className="p-2.5 text-right">{isHindi ? 'कार्रवाई' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {works.map((w, idx) => {
                    const headObj = accountHeads.find((h) => h.id === w.headId);
                    const totalWorkExpense = vouchers
                      .filter((v) => v.workId === w.id && v.voucherType === 'EXPENDITURE')
                      .reduce((s, v) => s + v.amount, 0);

                    return (
                      <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{w.name}</p>
                          {w.adminSanctionDate && (
                            <p className="text-[10px] text-amber-800 font-bold flex items-center gap-1 mt-0.5">
                              <span>📅</span>
                              <span>{isHindi ? `स्वीकृति: ${formatDateDDMMYYYY(w.adminSanctionDate)}` : `Sanction Date: ${formatDateDDMMYYYY(w.adminSanctionDate)}`}</span>
                            </p>
                          )}
                          {w.subHeadName && (
                            <p className="text-[10px] text-slate-500 font-semibold">Sub: {w.subHeadName}</p>
                          )}
                        </td>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-800">{headObj?.name || 'N/A'}</p>
                          <p className="text-[10px] font-mono text-slate-600 font-bold">
                            ₹{(w.headAmount || 0).toLocaleString('en-IN')}
                          </p>
                        </td>
                        <td className="p-2.5">
                          {w.convergenceHeadName || w.convergenceHeadAmount ? (
                            <div>
                              <p className="font-bold text-teal-800">🔀 {w.convergenceHeadName || 'अभिसरण मद'}</p>
                              <p className="text-[10px] font-mono text-teal-700 font-bold">
                                ₹{(w.convergenceHeadAmount || 0).toLocaleString('en-IN')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-900 font-black">
                          ₹{(w.cost || (w.headAmount + (w.convergenceHeadAmount || 0))).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 font-mono text-rose-700 font-bold">₹{totalWorkExpense.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStartEditWork(w)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            title={isHindi ? 'कार्य विवरण संशोधित करें' : 'Edit Work Details'}
                          >
                            <span>✏️</span> {isHindi ? 'संशोधन' : 'Edit'}
                          </button>
                          <button
                            onClick={() => setViewingWorkVouchersModal(w)}
                            className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="व्यय वाउचर विवरण देखें"
                          >
                            <span>👁️</span> {isHindi ? 'वाउचर' : 'Vouchers'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmModal({ id: w.id, name: w.name, type: 'WORK' })}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Work"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {works.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                        {isHindi ? 'कोई निर्माण कार्य पंजीकृत नहीं है। नया कार्य दर्ज करें।' : 'No work projects registered.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INCOME VOUCHER MANAGEMENT */}
      {activeTab === CashbookTab.INCOME_VOUCHERS && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2 border-b border-emerald-200 pb-3">
              <span>📈</span>
              <span>{isHindi ? 'नया आय वाउचर दर्ज करें (Income +)' : 'Record Income Voucher'}</span>
            </h3>

            <form onSubmit={handleAddIncomeVoucher} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'तिथि (Date) *' : 'Date *'}</label>
                <input
                  type="date"
                  required
                  value={vDate}
                  onChange={(e) => setVDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'आय खाता शीर्षक (Select Account Head) *' : 'Account Head *'}
                </label>
                <select
                  required
                  value={vHeadId}
                  onChange={(e) => setVHeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  <option value="">-- {isHindi ? 'आय हेड चुनें' : 'Select Income Head'} --</option>
                  {accountHeads
                    .filter((h) => h.type === 'INCOME' || h.type === 'BOTH')
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'आय प्राप्त राशि (Income Amount ₹) *' : 'Income Amount (₹) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={vAmount || ''}
                  onChange={(e) => setVAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-emerald-700 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'विवरण / रिमार्क्स' : 'Remarks'}
                </label>
                <input
                  type="text"
                  value={vRemarks}
                  onChange={(e) => setVRemarks(e.target.value)}
                  placeholder={isHindi ? 'e.g. 15th FC किश्त प्राप्ति' : 'Income details'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs"
              >
                + {isHindi ? 'आय वाउचर जमा करें (+)' : 'Record Income (+)'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <span>📈</span>
                <span>{isHindi ? 'आय वाउचर सूची' : 'Income Vouchers List'}</span>
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                {vouchers.filter((v) => v.voucherType === 'INCOME').length} {isHindi ? 'वाउचर' : 'Vouchers'}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">{isHindi ? 'वाउचर नं & तिथि' : 'Voucher & Date'}</th>
                    <th className="p-2.5">{isHindi ? 'खाता हेड' : 'Account Head'}</th>
                    <th className="p-2.5">{isHindi ? 'करदाता / जमाकर्ता' : 'Taxpayer / Payer'}</th>
                    <th className="p-2.5">{isHindi ? 'प्राप्त राशि (+)' : 'Income Amount'}</th>
                    <th className="p-2.5">{isHindi ? 'विवरण' : 'Remarks'}</th>
                    <th className="p-2.5 text-right">{isHindi ? 'कार्रवाई' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {vouchers
                    .filter((v) => v.voucherType === 'INCOME')
                    .map((v) => {
                      const headObj = accountHeads.find((h) => h.id === v.headId);
                      const taxPayer = getTaxPayerDetails(v);
                      return (
                        <tr key={v.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="p-2.5 font-mono">
                            <p className="font-bold text-slate-900">{v.voucherNo}</p>
                            <p className="text-[10px] text-slate-500">{formatDateDDMMYYYY(v.date)}</p>
                          </td>
                          <td className="p-2.5">
                            <p className="font-bold text-slate-800">{headObj?.name || 'N/A'}</p>
                          </td>
                          <td className="p-2.5">
                            {taxPayer ? (
                              <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-950 space-y-0.5">
                                <p className="font-bold text-amber-900 flex items-center gap-1">
                                  <span>👤</span>
                                  <span>करदाता: {taxPayer.name}</span>
                                </p>
                                <p className="text-slate-700">👨‍👦 पिता/पति: {taxPayer.guardianName}</p>
                                <p className="font-mono font-bold text-amber-800">🆔 सदस्य ID: {taxPayer.samagraId}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-emerald-700 font-black text-sm">
                            +₹{v.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px]">{v.remarks}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => setDeleteConfirmModal({ id: v.id, name: `${v.voucherNo} (${v.headName})`, type: 'VOUCHER' })}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Voucher"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {vouchers.filter((v) => v.voucherType === 'INCOME').length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                        {isHindi ? 'कोई आय वाउचर दर्ज नहीं है।' : 'No income vouchers recorded.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXPENDITURE VOUCHER MANAGEMENT */}
      {activeTab === CashbookTab.EXPENDITURE_VOUCHERS && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-rose-950 flex items-center gap-2 border-b border-rose-200 pb-3">
              <span>📉</span>
              <span>{isHindi ? 'नया व्यय वाउचर दर्ज करें (Expense -)' : 'Record Expenditure Voucher'}</span>
            </h3>

            <form onSubmit={handleAddExpenditureVoucher} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'तिथि (Date) *' : 'Date *'}</label>
                <input
                  type="date"
                  required
                  value={vDate}
                  onChange={(e) => setVDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'व्यय खाता शीर्षक (Select Account Head) *' : 'Account Head *'}
                </label>
                <select
                  required
                  value={vHeadId}
                  onChange={(e) => setVHeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  <option value="">-- {isHindi ? 'व्यय हेड चुनें' : 'Select Expense Head'} --</option>
                  {accountHeads
                    .filter((h) => h.type === 'EXPENDITURE' || h.type === 'BOTH')
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Head Remaining Balance Indicator */}
              {vHeadId && (() => {
                const headObj = accountHeads.find((h) => h.id === vHeadId);
                const headData = headBalances[vHeadId];
                const availBal = headData ? headData.balance : Number(headObj?.openingBalance || 0);

                return (
                  <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${availBal > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-100 border-rose-300 text-rose-950'}`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>💰 {isHindi ? 'खाता हेड उपलब्ध शेष राशि:' : 'Head Available Balance:'}</span>
                      <span className="font-mono font-black text-sm">₹{availBal.toLocaleString('en-IN')}</span>
                    </div>
                    {headObj && (
                      <p className="text-[10px] text-slate-600 font-semibold">
                        {isHindi
                          ? `प्रारंभिक: ₹${Number(headObj.openingBalance || 0).toLocaleString('en-IN')} | कुल आय: ₹${(headData?.income || 0).toLocaleString('en-IN')} | कुल व्यय: ₹${(headData?.expenditure || 0).toLocaleString('en-IN')}`
                          : `Opening: ₹${Number(headObj.openingBalance || 0)} | Income: ₹${headData?.income || 0} | Expense: ₹${headData?.expenditure || 0}`}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  🏷️ {isHindi ? 'व्यय श्रेणी (Expense Category)' : 'Expense Category'}
                </label>
                <select
                  value={vExpenseCategory}
                  onChange={(e) => setVExpenseCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold text-rose-900"
                >
                  <option value="WORK">🏗️ {isHindi ? 'निर्माण कार्य व्यय (Construction / Work Project)' : 'Work Project'}</option>
                  <option value="OFFICE">🏢 {isHindi ? 'कार्यालयीन व्यय (Office & Admin Expenses)' : 'Office Expenses'}</option>
                  <option value="GENERAL">📑 {isHindi ? 'सामान्य / अन्य विकास व्यय (General / Other)' : 'General Expense'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  📁 {isHindi ? 'पंचायत व्यय उप-शीर्षक (Panchayat Expense Subhead)' : 'Expense Subhead'}
                </label>
                <select
                  value={vSubHead}
                  onChange={(e) => setVSubHead(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold text-rose-950"
                >
                  <option value="">-- {isHindi ? 'उप-शीर्षक चुनें (Select Subhead)' : 'Select Subhead'} --</option>
                  {subHeads.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 {isHindi ? 'उप-शीर्षक चुनने पर निर्माण कार्य (Work) चुनना अनिवार्य नहीं रहता।' : 'Selecting a subhead allows booking expense without a Work project.'}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'वेंडर / फर्म का चयन (Vendor Payment)' : 'Select Vendor'}
                </label>
                <select
                  value={vVendorId}
                  onChange={(e) => setVVendorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  <option value="">-- {isHindi ? 'कोई वेंडर नहीं (None)' : 'None'} --</option>
                  {vendors.map((ven) => (
                    <option key={ven.id} value={ven.id}>
                      {ven.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  🏗️ {isHindi ? 'संबंधित निर्माण कार्य (Work Project - ऐच्छिक/Optional)' : 'Select Work (Optional)'}
                </label>
                <select
                  value={vWorkId}
                  onChange={(e) => setVWorkId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  <option value="">-- {isHindi ? 'कोई कार्य नहीं (केवल उप-शीर्षक से सीधा व्यय)' : 'None (Direct Subhead Expense)'} --</option>
                  {works.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (स्वीकृत लागत: ₹{w.cost.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Remaining Budget Live Indicator */}
              {vWorkId && (() => {
                const workObj = works.find((w) => w.id === vWorkId);
                if (!workObj) return null;
                const workCost = workObj.cost || ((workObj.headAmount || 0) + (workObj.convergenceHeadAmount || 0));
                const workSpent = vouchers
                  .filter((v) => v.workId === workObj.id && v.voucherType === 'EXPENDITURE')
                  .reduce((s, v) => s + v.amount, 0);
                const currentEnteredAmt = Number(vAmount) || 0;
                const workRemaining = workCost - workSpent;
                const balanceAfterCurrent = workRemaining - currentEnteredAmt;

                return (
                  <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${balanceAfterCurrent >= 0 ? 'bg-teal-50 border-teal-200 text-teal-950' : 'bg-rose-100 border-rose-300 text-rose-950'}`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>🏗️ {isHindi ? 'कार्य का स्वीकृत व शेष बजट:' : 'Work Sanction & Balance:'}</span>
                      <span className="font-mono font-black text-sm">₹{workRemaining.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold border-t border-teal-200/60 pt-1 text-slate-700">
                      <div>स्वीकृत राशि: <span className="font-mono font-bold text-slate-900">₹{workCost.toLocaleString('en-IN')}</span></div>
                      <div>पूर्व व्यय: <span className="font-mono font-bold text-slate-900">₹{workSpent.toLocaleString('en-IN')}</span></div>
                      <div>वर्तमान व्यय: <span className="font-mono font-bold text-rose-700">₹{currentEnteredAmt.toLocaleString('en-IN')}</span></div>
                      <div>भुगतान बाद शेष: <span className="font-mono font-black text-emerald-800">₹{balanceAfterCurrent.toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>
                );
              })()}

              {/* PROPOSAL & BILL DETAILS FOR NOTE SHEET */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <p className="font-black text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <span>📑</span>
                  <span>{isHindi ? 'नोटशीट संदर्भ विवरण (Note Sheet Reference Details)' : 'Note Sheet Reference'}</span>
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      {isHindi ? 'प्रस्ताव क्र. (Proposal No.)' : 'Proposal No.'}
                    </label>
                    <input
                      type="text"
                      value={vProposalNo}
                      onChange={(e) => setVProposalNo(e.target.value)}
                      placeholder={isHindi ? 'e.g. प्रस्ताव 04/2026' : 'Proposal 01'}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      {isHindi ? 'प्रस्ताव दिनांक (Date)' : 'Proposal Date'}
                    </label>
                    <input
                      type="date"
                      value={vProposalDate}
                      onChange={(e) => setVProposalDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      {isHindi ? 'बिल / देयक क्र. (Bill No.)' : 'Bill / Invoice No.'}
                    </label>
                    <input
                      type="text"
                      value={vBillNo}
                      onChange={(e) => setVBillNo(e.target.value)}
                      placeholder={isHindi ? 'e.g. बिल नं. 142' : 'Bill No. 142'}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                      {isHindi ? 'बिल दिनांक (Bill Date)' : 'Bill Date'}
                    </label>
                    <input
                      type="date"
                      value={vBillDate}
                      onChange={(e) => setVBillDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'व्यय भुगतान राशि (Payment Amount ₹) *' : 'Payment Amount (₹) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={vAmount || ''}
                  onChange={(e) => setVAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-rose-700 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'विवरण / रिमार्क्स' : 'Remarks'}
                </label>
                <input
                  type="text"
                  value={vRemarks}
                  onChange={(e) => setVRemarks(e.target.value)}
                  placeholder={isHindi ? 'e.g. बिल क्रमांक 104 भुगतान' : 'Payment details'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs"
              >
                - {isHindi ? 'व्यय वाउचर काटें (-)' : 'Record Expenditure (-)'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <span>📉</span>
                <span>{isHindi ? 'व्यय वाउचर सूची' : 'Expenditure Vouchers List'}</span>
              </span>
              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-xs font-bold">
                {vouchers.filter((v) => v.voucherType === 'EXPENDITURE').length} {isHindi ? 'वाउचर' : 'Vouchers'}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">{isHindi ? 'वाउचर नं & तिथि' : 'Voucher & Date'}</th>
                    <th className="p-2.5">{isHindi ? 'खाता हेड / उप-हेड' : 'Head / Sub-head'}</th>
                    <th className="p-2.5">{isHindi ? 'वेंडर / कार्य' : 'Vendor / Work'}</th>
                    <th className="p-2.5">{isHindi ? 'व्यय राशि (-)' : 'Payment Amount'}</th>
                    <th className="p-2.5">{isHindi ? 'विवरण' : 'Remarks'}</th>
                    <th className="p-2.5 text-right">{isHindi ? 'कार्रवाई' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {vouchers
                    .filter((v) => v.voucherType === 'EXPENDITURE')
                    .map((v) => {
                      const headObj = accountHeads.find((h) => h.id === v.headId);
                      const vendorObj = vendors.find((ven) => ven.id === v.vendorId);
                      const workObj = works.find((w) => w.id === v.workId);

                      return (
                        <tr key={v.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="p-2.5 font-mono">
                            <p className="font-bold text-slate-900">{v.voucherNo}</p>
                            <p className="text-[10px] text-slate-500">{formatDateDDMMYYYY(v.date)}</p>
                          </td>
                          <td className="p-2.5">
                            <p className="font-bold text-slate-800">{headObj?.name || 'N/A'}</p>
                            {v.subHeadName && <p className="text-[10px] text-slate-500">{v.subHeadName}</p>}
                          </td>
                          <td className="p-2.5">
                            {vendorObj && <p className="font-bold text-slate-900">🏬 {vendorObj.name}</p>}
                            {workObj && <p className="text-[10px] text-slate-600 font-semibold">🏗️ {workObj.name}</p>}
                            {!vendorObj && !workObj && <p className="text-slate-400">-</p>}
                          </td>
                          <td className="p-2.5 font-mono text-rose-700 font-black text-sm">
                            -₹{v.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px]">{v.remarks}</td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingNoteSheet(v)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                title={isHindi ? 'नोटशीट देखें व प्रिंट करें' : 'View & Print Note Sheet'}
                              >
                                <span>📄</span>
                                <span>{isHindi ? 'नोटशीट' : 'Note Sheet'}</span>
                              </button>
                              <button
                                onClick={() => setViewingVoucherSlip(v)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                title={isHindi ? 'वाउचर स्लिप देखें' : 'View Voucher Slip'}
                              >
                                <span>🧾</span>
                                <span>{isHindi ? 'स्लिप' : 'Slip'}</span>
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirmModal({
                                    id: v.id,
                                    name: `${v.voucherNo} (${headObj?.name || ''})`,
                                    type: 'VOUCHER',
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Voucher"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {vouchers.filter((v) => v.voucherType === 'EXPENDITURE').length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                        {isHindi ? 'कोई व्यय वाउचर दर्ज नहीं है।' : 'No expenditure vouchers recorded.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LEDGER REPORT */}
      {activeTab === CashbookTab.LEDGER_REPORT && (
        <div id="printable-area" className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5 printable-area">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>📊</span>
                <span>{isHindi ? 'खाता बही लेजर रिपोर्ट (Ledger Account Report)' : 'Ledger Account Report'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isHindi ? 'खाता हेड-वार, वेंडर-वार, कार्य-वार, आय एवं व्यय पृथक लेजर रिपोर्ट' : 'Head-wise, Vendor-wise, Work-wise, Income & Expenditure Ledger'}
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1"
              >
                <span>📥</span>
                <span>{isHindi ? 'Excel/CSV डाउनलोड' : 'Export CSV'}</span>
              </button>
              <button
                onClick={() => {
                  try {
                    triggerPrint('printable-area');
                  } catch (e) {
                    console.error('Print ledger failed:', e);
                  }
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1"
              >
                <span>🖨️</span>
                <span>{isHindi ? 'प्रिंट लेजर रिपोर्ट' : 'Print Ledger'}</span>
              </button>
            </div>
          </div>

          {/* LEDGER REPORT SUBMODE TABS */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 print:hidden">
            <button
              onClick={() => setLedgerMode('HEADS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                ledgerMode === 'HEADS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700'
              }`}
            >
              🏦 {isHindi ? 'खाता हेड लेजर' : 'Account Head Ledger'}
            </button>
            <button
              onClick={() => setLedgerMode('VENDORS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                ledgerMode === 'VENDORS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700'
              }`}
            >
              🏬 {isHindi ? 'वेंडर-वार लेजर' : 'Vendor-wise Ledger'}
            </button>
            <button
              onClick={() => setLedgerMode('WORKS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                ledgerMode === 'WORKS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700'
              }`}
            >
              🏗️ {isHindi ? 'कार्य-वार लेजर' : 'Work-wise Ledger'}
            </button>
            <button
              onClick={() => setLedgerMode('INCOME')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                ledgerMode === 'INCOME'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700'
              }`}
            >
              📈 {isHindi ? 'आय (प्राप्ति) लेजर' : 'Income Ledger'}
            </button>
            <button
              onClick={() => setLedgerMode('EXPENDITURE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                ledgerMode === 'EXPENDITURE'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700'
              }`}
            >
              📉 {isHindi ? 'व्यय (भुगतान) लेजर' : 'Expenditure Ledger'}
            </button>
          </div>

          {/* FILTERS BAR */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs print:hidden">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'वित्तीय वर्ष (FY)' : 'Financial Year'}</label>
              <select
                value={filterFinancialYear}
                onChange={(e) => setFilterFinancialYear(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="ALL">-- {isHindi ? 'सभी वित्तीय वर्ष' : 'All FY'} --</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'माह (Month)' : 'Month'}</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value={0}>-- {isHindi ? 'सभी माह (All Months)' : 'All Months'} --</option>
                {monthList.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'खाता हेड' : 'Head'}</label>
              <select
                value={filterHeadId}
                onChange={(e) => setFilterHeadId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="ALL">-- {isHindi ? 'सभी हेड (All)' : 'All Heads'} --</option>
                {accountHeads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'वेंडर' : 'Vendor'}</label>
              <select
                value={filterVendorId}
                onChange={(e) => setFilterVendorId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="ALL">-- {isHindi ? 'सभी वेंडर (All)' : 'All Vendors'} --</option>
                {vendors.map((ven) => (
                  <option key={ven.id} value={ven.id}>
                    {ven.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'निर्माण कार्य' : 'Work'}</label>
              <select
                value={filterWorkId}
                onChange={(e) => setFilterWorkId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="ALL">-- {isHindi ? 'सभी कार्य (All)' : 'All Works'} --</option>
                {works.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'खोजें (Search)' : 'Search'}</label>
              <input
                type="text"
                placeholder={isHindi ? 'खोजें...' : 'Search...'}
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
              />
            </div>
          </div>

          {/* LEDGER TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black uppercase">
                <tr>
                  <th className="p-2.5 border-r border-slate-200">{isHindi ? 'तिथि' : 'Date'}</th>
                  <th className="p-2.5 border-r border-slate-200">{isHindi ? 'वाउचर सं.' : 'Voucher No'}</th>
                  <th className="p-2.5 border-r border-slate-200">{isHindi ? 'खाता हेड / उप-शीर्षक' : 'Account Head'}</th>
                  <th className="p-2.5 border-r border-slate-200">{isHindi ? 'वेंडर / संस्था / करदाता' : 'Vendor / Taxpayer'}</th>
                  <th className="p-2.5 border-r border-slate-200">{isHindi ? 'निर्माण कार्य' : 'Work'}</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">{isHindi ? 'आय (+) Income' : 'Credit (+)'}</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">{isHindi ? 'व्यय (-) Expense' : 'Debit (-)'}</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">{isHindi ? 'रनिंग बैलेंस' : 'Running Bal'}</th>
                  <th className="p-2.5 text-center print:hidden">{isHindi ? 'कार्रवाई' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {(() => {
                  let runningBal = grandSummary.totalOpening;
                  return filteredVouchers.map((v) => {
                    const isInc = v.voucherType === 'INCOME';
                    if (isInc) runningBal += v.amount;
                    else runningBal -= v.amount;

                    const headObj = accountHeads.find((h) => h.id === v.headId);
                    const vendorObj = vendors.find((ven) => ven.id === v.vendorId);
                    const workObj = works.find((w) => w.id === v.workId);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="p-2.5 border-r border-slate-200 font-mono font-bold">{formatDateDDMMYYYY(v.date)}</td>
                        <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-primary">{v.voucherNo}</td>
                        <td className="p-2.5 border-r border-slate-200">
                          <p className="font-bold text-slate-900">{headObj?.name || 'N/A'}</p>
                          {v.subHeadName && <p className="text-[10px] text-slate-500">Sub: {v.subHeadName}</p>}
                          {v.remarks && <p className="text-[10px] text-slate-500">Desc: {v.remarks}</p>}
                        </td>
                        <td className="p-2.5 border-r border-slate-200">
                          {vendorObj?.name ? (
                            <span className="font-semibold text-slate-800">{vendorObj.name}</span>
                          ) : (() => {
                            const taxPayer = getTaxPayerDetails(v);
                            if (taxPayer) {
                              return (
                                <div className="p-1.5 bg-amber-50/90 border border-amber-200 rounded-lg text-[10px] text-amber-950 space-y-0.5">
                                  <p className="font-bold text-amber-950 flex items-center gap-1">
                                    <span>👤</span>
                                    <span>करदाता: {taxPayer.name}</span>
                                  </p>
                                  <p className="text-slate-700">👨‍👦 पिता/पति: {taxPayer.guardianName}</p>
                                  <p className="font-mono text-amber-900 font-bold">🆔 सदस्य ID: {taxPayer.samagraId}</p>
                                </div>
                              );
                            }
                            return '-';
                          })()}
                        </td>
                        <td className="p-2.5 border-r border-slate-200">{workObj?.name || '-'}</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                          {isInc ? `+₹${v.amount.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-rose-700">
                          {!isInc ? `-₹${v.amount.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono font-black text-slate-900">
                          ₹{runningBal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewingVoucherSlip(v)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded border border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-1"
                              title="वाउचर स्लिप प्रिंट करें"
                            >
                              <span>🖨️</span>
                              <span>स्लिप</span>
                            </button>
                            {!isInc && (
                              <button
                                onClick={() => setViewingNoteSheet(v)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[10px] font-bold rounded border border-indigo-300 transition-all cursor-pointer flex items-center justify-center gap-1"
                                title="भुगतान नोटशीट देखें व प्रिंट करें"
                              >
                                <span>📑</span>
                                <span>नोटशीट</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
                {filteredVouchers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-semibold">
                      {isHindi ? 'चयनित फ़िल्टर हेतु कोई लेजर प्रविष्टि उपलब्ध नहीं है।' : 'No ledger transactions match selected filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: CASHBOOK REGISTER REPORT (EXCEL & PDF PRINTABLE) */}
      {activeTab === CashbookTab.CASHBOOK_REPORT && (
        <div id="printable-area" className="p-6 bg-white rounded-2xl border border-slate-200 shadow-lg space-y-6 printable-area">
          
          {/* PRINTABLE OFFICIAL PANCHAYAT HEADER */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {getCleanOfficeTitle(officeDetails, (officeDetails as any)?.gramPanchayat)}
            </h2>
            <p className="text-xs font-bold text-slate-700">
              {[officeDetails?.janpadPanchayat, officeDetails?.districtName].filter(Boolean).join(', ') || 'जनपद पंचायत एवं जिला कार्यालय'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-4 text-xs font-black text-slate-900">
              <span className="px-3 py-1 bg-amber-100 border border-amber-300 rounded-lg">
                📗 {isHindi ? 'ग्राम पंचायत कैशबुक रजिस्टर (CASH BOOK REGISTER)' : 'PANCHAYAT CASH BOOK REGISTER'}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS & SEARCH FILTERS (HIDDEN IN PRINT) */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl print:hidden">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                placeholder={isHindi ? 'खोजें (हेड, वेंडर, कार्य, रिमार्क्स...)' : 'Search cashbook...'}
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white w-64"
              />

              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white"
              />

              <span className="text-slate-400 font-bold">to</span>

              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>{isHindi ? 'Excel (CSV) डाउनलोड' : 'Download Excel'}</span>
              </button>

              <button
                onClick={() => {
                  try {
                    triggerPrint('printable-area');
                  } catch (e) {
                    console.error('Print cashbook failed:', e);
                  }
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>{isHindi ? 'कैशबुक प्रिंट / PDF' : 'Print / Save PDF'}</span>
              </button>
            </div>
          </div>

          {/* CASHBOOK SUMMARY SHEET */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-300">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{isHindi ? 'प्रारंभिक शेष:' : 'Opening Bal:'}</p>
              <p className="font-mono font-black text-slate-900 text-sm">₹{grandSummary.totalOpening.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-800 font-bold uppercase">{isHindi ? 'कुल आय प्राप्ति (+):' : 'Total Income:'}</p>
              <p className="font-mono font-black text-emerald-700 text-sm">+₹{grandSummary.totalIncome.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-rose-800 font-bold uppercase">{isHindi ? 'कुल व्यय भुगतान (-):' : 'Total Expense:'}</p>
              <p className="font-mono font-black text-rose-700 text-sm">-₹{grandSummary.totalExpenditure.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-900 font-bold uppercase">{isHindi ? 'बैंक खाता शेष:' : 'Bank Balance:'}</p>
              <p className="font-mono font-black text-blue-800 text-sm">₹{grandSummary.bankBalance.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-primary font-bold uppercase">{isHindi ? 'अंतिम रोकड़ शेष:' : 'Closing Bal:'}</p>
              <p className="font-mono font-black text-primary text-sm">₹{grandSummary.closingBalance.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* ACCOUNT HEAD WISE SUMMARY TABLE */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>🏛️</span>
                <span>{isHindi ? 'खाता शीर्षक-वार बजट, आय-व्यय एवं उपलब्ध शेष (Account Head Summary Table)' : 'Account Head Wise Budget, Income-Expenditure & Available Balance'}</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {accountHeads.length} {isHindi ? 'खाता शीर्षक' : 'Account Heads'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black uppercase text-[11px]">
                  <tr>
                    <th className="p-2 border-r border-slate-200 text-center w-10">#</th>
                    <th className="p-2 border-r border-slate-200">{isHindi ? 'खाता शीर्षक नाम/कोड' : 'Account Head Name & Code'}</th>
                    <th className="p-2 border-r border-slate-200 text-center">{isHindi ? 'प्रकार' : 'Type'}</th>
                    <th className="p-2 border-r border-slate-200 text-right">{isHindi ? 'प्रारंभिक शेष (Opening Bal)' : 'Opening Bal'}</th>
                    <th className="p-2 border-r border-slate-200 text-right">{isHindi ? 'कुल आय (+ Total Income)' : 'Total Income (+)'}</th>
                    <th className="p-2 border-r border-slate-200 text-right">{isHindi ? 'कुल व्यय (- Total Expense)' : 'Total Expense (-)'}</th>
                    <th className="p-2 text-right">{isHindi ? 'कुल उपलब्ध शेष (Available Bal)' : 'Available Bal'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                  {accountHeads.map((h, idx) => {
                    const stats = headBalances[h.id] || { income: 0, expenditure: 0, balance: Number(h.openingBalance || 0) };
                    return (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200">
                          <p className="font-bold text-slate-900">{h.name}</p>
                          {h.code && <p className="text-[10px] text-slate-500 font-mono">Code: {h.code}</p>}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold">
                            {h.type}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700 font-bold">
                          ₹{Number(h.openingBalance || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono text-emerald-700 font-bold">
                          +₹{stats.income.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono text-rose-700 font-bold">
                          -₹{stats.expenditure.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-right font-mono text-primary font-black">
                          ₹{stats.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                  {accountHeads.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-semibold">
                        {isHindi ? 'कोई खाता शीर्षक उपलब्ध नहीं है।' : 'No account heads available.'}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-200 font-black text-slate-900 border-t-2 border-slate-400 text-xs">
                  <tr>
                    <td colSpan={3} className="p-2.5 border-r border-slate-300 text-right uppercase font-black">
                      {isHindi ? 'समस्त खाता शीर्षकों का कुल योग (GRAND TOTAL):' : 'GRAND TOTAL OF ALL HEADS:'}
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-right font-mono font-black text-slate-900">
                      ₹{grandSummary.totalOpening.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-right font-mono font-black text-emerald-800">
                      +₹{grandSummary.totalIncome.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-right font-mono font-black text-rose-800">
                      -₹{grandSummary.totalExpenditure.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-primary text-sm">
                      ₹{grandSummary.closingBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* MASTER CASHBOOK TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-200 border-b-2 border-slate-400 text-slate-900 font-black uppercase text-[11px]">
                <tr>
                  <th className="p-2 border-r border-slate-300">{isHindi ? 'दिनांक' : 'Date'}</th>
                  <th className="p-2 border-r border-slate-300">{isHindi ? 'वाउचर सं.' : 'Voucher No'}</th>
                  <th className="p-2 border-r border-slate-300">{isHindi ? 'खाता शीर्षक एवं उप-शीर्षक' : 'Account Head'}</th>
                  <th className="p-2 border-r border-slate-300">{isHindi ? 'वेंडर / फर्म / करदाता' : 'Vendor / Taxpayer'}</th>
                  <th className="p-2 border-r border-slate-300">{isHindi ? 'निर्माण कार्य' : 'Work Project'}</th>
                  <th className="p-2 border-r border-slate-300">{isHindi ? 'विवरण (Particulars)' : 'Remarks'}</th>
                  <th className="p-2 border-r border-slate-300 text-right">{isHindi ? 'आय (Receipts +)' : 'Income (+)'}</th>
                  <th className="p-2 border-r border-slate-300 text-right">{isHindi ? 'व्यय (Payments -)' : 'Expense (-)'}</th>
                  <th className="p-2 text-right">{isHindi ? 'अंतिम शेष' : 'Balance'}</th>
                  <th className="p-2 text-center print:hidden">{isHindi ? 'प्रिंट' : 'Print'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-900">
                {(() => {
                  let bal = grandSummary.totalOpening;
                  return filteredVouchers.map((v) => {
                    const isInc = v.voucherType === 'INCOME';
                    if (isInc) bal += v.amount;
                    else bal -= v.amount;

                    const headObj = accountHeads.find((h) => h.id === v.headId);
                    const vendorObj = vendors.find((ven) => ven.id === v.vendorId);
                    const workObj = works.find((w) => w.id === v.workId);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-mono">{formatDateDDMMYYYY(v.date)}</td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-primary">{v.voucherNo}</td>
                        <td className="p-2 border-r border-slate-200">
                          <p className="font-bold text-slate-900">{headObj?.name || 'N/A'}</p>
                          {v.subHeadName && <p className="text-[10px] text-slate-600">({v.subHeadName})</p>}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {vendorObj?.name ? (
                            <span className="font-semibold text-slate-800">{vendorObj.name}</span>
                          ) : (() => {
                            const taxPayer = getTaxPayerDetails(v);
                            if (taxPayer) {
                              return (
                                <div className="p-1.5 bg-amber-50/90 border border-amber-200 rounded-lg text-[10px] text-amber-950 space-y-0.5">
                                  <p className="font-bold text-amber-950 flex items-center gap-1">
                                    <span>👤</span>
                                    <span>करदाता: {taxPayer.name}</span>
                                  </p>
                                  <p className="text-slate-700">👨‍👦 पिता/पति: {taxPayer.guardianName}</p>
                                  <p className="font-mono text-amber-900 font-bold">🆔 सदस्य ID: {taxPayer.samagraId}</p>
                                </div>
                              );
                            }
                            return '-';
                          })()}
                        </td>
                        <td className="p-2 border-r border-slate-200">{workObj?.name || '-'}</td>
                        <td className="p-2 border-r border-slate-200 text-[11px]">{v.remarks}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-800">
                          {isInc ? `+₹${v.amount.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-rose-800">
                          {!isInc ? `-₹${v.amount.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2 text-right font-mono font-black text-slate-900">
                          ₹{bal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewingVoucherSlip(v)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded border border-slate-300 transition-all cursor-pointer"
                              title="वाउचर स्लिप प्रिंट"
                            >
                              🖨️ स्लिप
                            </button>
                            {!isInc && (
                              <button
                                onClick={() => setViewingNoteSheet(v)}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[10px] font-bold rounded border border-indigo-300 transition-all cursor-pointer"
                                title="भुगतान नोटशीट देखें व प्रिंट करें"
                              >
                                📑 नोटशीट
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
                {filteredVouchers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold">
                      {isHindi ? 'रोकड़ बही में कोई प्रविष्टि नहीं पाई गई।' : 'No cashbook records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* OFFICIAL SIGNATURE FOOTER FOR PRINT */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-900">
            <div>
              <div className="border-t border-slate-800 pt-1">
                <p>{officeDetails.secretaryName || 'ग्राम पंचायत सचिव'}</p>
                <p className="text-[10px] text-slate-600 font-medium">सचिव / ग्राम रोजगार सहायक</p>
                <p className="text-[10px] text-slate-600 font-medium">{officeDetails.officeName}</p>
              </div>
            </div>

            <div>
              <div className="border-t border-slate-800 pt-1">
                <p>{officeDetails.sarpanchName || 'सरपंच'}</p>
                <p className="text-[10px] text-slate-600 font-medium">सरपंच / ग्राम पंचायत अध्यक्ष</p>
                <p className="text-[10px] text-slate-600 font-medium">{officeDetails.officeName}</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 8: WORK EXPENDITURE REPORT (कार्य-वार व्यय एवं अभिसरण रिपोर्ट) */}
      {activeTab === CashbookTab.WORK_EXPENDITURE_REPORT && (
        <div className="space-y-6 printable-area">
          {/* REPORT TITLE BANNER */}
          <div className="p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl shadow-md border border-teal-800 space-y-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 bg-teal-800/80 text-teal-200 rounded-md text-[10px] font-black uppercase tracking-wider">
                  OFFICIAL GRAM PANCHAYAT WORK REPORT
                </span>
                <h3 className="text-lg md:text-xl font-black mt-1">
                  {isHindi ? 'ग्राम पंचायत निर्माण कार्य व्यय एवं अभिसरण (कन्वर्जेंस) रिपोर्ट' : 'Gram Panchayat Work Expenditure & Convergence Report'}
                </h3>
                <p className="text-xs text-teal-100 font-medium">
                  {officeDetails.officeName} | {[officeDetails.janpadPanchayat, officeDetails.districtName].filter(Boolean).join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>{isHindi ? 'Excel (CSV)' : 'Excel CSV'}</span>
                </button>
                <button
                  onClick={() => {
                    try {
                      triggerPrint('printable-area');
                    } catch (e) {
                      console.error('Print Work Report failed:', e);
                    }
                  }}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>{isHindi ? 'रिपोर्ट प्रिंट / PDF' : 'Print Report'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* FILTERS AND SEARCH */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">{isHindi ? 'कार्य खोजें:' : 'Search Work:'}</label>
                <input
                  type="text"
                  placeholder={isHindi ? 'कार्य / मद नाम से खोजें...' : 'Search work name...'}
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl w-56 bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">{isHindi ? 'खाता मद फ़िल्टर:' : 'Head Filter:'}</label>
                <select
                  value={filterHeadId}
                  onChange={(e) => setFilterHeadId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl bg-slate-50 font-semibold"
                >
                  <option value="ALL">-- {isHindi ? 'सभी खाता मद (All Heads)' : 'All Account Heads'} --</option>
                  {accountHeads.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              {isHindi ? `कुल दर्ज कार्य: ${works.length}` : `Total Works: ${works.length}`}
            </span>
          </div>

          {/* SUMMARY CARDS */}
          {(() => {
            const filteredWorksList = works.filter((w) => {
              const headObj = accountHeads.find((h) => h.id === w.headId);
              const matchSearch =
                !filterSearch ||
                w.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
                (w.convergenceHeadName && w.convergenceHeadName.toLowerCase().includes(filterSearch.toLowerCase())) ||
                (headObj && headObj.name.toLowerCase().includes(filterSearch.toLowerCase()));

              const matchHead =
                filterHeadId === 'ALL' || w.headId === filterHeadId || w.convergenceHeadId === filterHeadId;

              return matchSearch && matchHead;
            });

            const totalMainHeadCost = filteredWorksList.reduce((s, w) => s + (w.headAmount || 0), 0);
            const totalConvergenceCost = filteredWorksList.reduce((s, w) => s + (w.convergenceHeadAmount || 0), 0);
            const grandTotalWorkCost = filteredWorksList.reduce(
              (s, w) => s + (w.cost || (w.headAmount + (w.convergenceHeadAmount || 0))),
              0
            );

            const grandTotalWorkExpenditure = filteredWorksList.reduce((sum, w) => {
              const workExp = vouchers
                .filter((v) => v.workId === w.id && v.voucherType === 'EXPENDITURE')
                .reduce((sv, v) => sv + v.amount, 0);
              return sum + workExp;
            }, 0);

            const totalAvailableBalance = grandTotalWorkCost - grandTotalWorkExpenditure;

            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">{isHindi ? 'कुल निर्माण कार्य' : 'Total Works'}</p>
                    <p className="text-lg font-black text-slate-900">{filteredWorksList.length} {isHindi ? 'कार्य' : 'Works'}</p>
                  </div>

                  <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl shadow-sm space-y-1">
                    <p className="text-[11px] font-bold text-sky-900 uppercase">{isHindi ? 'मूल मद लागत कुल' : 'Main Head Total'}</p>
                    <p className="text-lg font-black text-sky-950 font-mono">₹{totalMainHeadCost.toLocaleString('en-IN')}</p>
                  </div>

                  <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl shadow-sm space-y-1">
                    <p className="text-[11px] font-bold text-teal-900 uppercase">{isHindi ? 'अभिसरण/कन्वर्ट अंश कुल' : 'Convergence Total'}</p>
                    <p className="text-lg font-black text-teal-950 font-mono">₹{totalConvergenceCost.toLocaleString('en-IN')}</p>
                  </div>

                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl shadow-sm space-y-1">
                    <p className="text-[11px] font-bold text-purple-900 uppercase">{isHindi ? 'कुल स्वीकृत लागत' : 'Grand Total Cost'}</p>
                    <p className="text-lg font-black text-purple-950 font-mono">₹{grandTotalWorkCost.toLocaleString('en-IN')}</p>
                  </div>

                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm space-y-1 col-span-2 md:col-span-1">
                    <p className="text-[11px] font-bold text-rose-900 uppercase">{isHindi ? 'कुल व्यय भुगतान' : 'Total Expenditure'}</p>
                    <p className="text-lg font-black text-rose-800 font-mono">₹{grandTotalWorkExpenditure.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* MAIN REPORT TABLE */}
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-300 shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-white font-black uppercase text-[11px]">
                      <tr>
                        <th className="p-3 border-r border-slate-700 text-center w-12">#</th>
                        <th className="p-3 border-r border-slate-700 min-w-[180px]">{isHindi ? 'कार्य का नाम (Work Name)' : 'Work Name'}</th>
                        <th className="p-3 border-r border-slate-700">{isHindi ? 'मूल मद एवं लागत (Head Cost)' : 'Head Cost'}</th>
                        <th className="p-3 border-r border-slate-700">{isHindi ? 'अभिसरण मद एवं लागत (Convergence Head Cost)' : 'Convergence Head Cost'}</th>
                        <th className="p-3 border-r border-slate-700 text-right">{isHindi ? 'कुल स्वीकृत लागत (Total Cost)' : 'Work Total Cost'}</th>
                        <th className="p-3 border-r border-slate-700 text-right">{isHindi ? 'कुल व्यय (Expenditure Cost)' : 'Expenditure Cost'}</th>
                        <th className="p-3 border-r border-slate-700 text-right">{isHindi ? 'शेष उपलब्ध राशि (Available Balance)' : 'Available Cost'}</th>
                        <th className="p-3 text-center print:hidden">{isHindi ? 'व्यय वाउचर' : 'Vouchers'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-900">
                      {filteredWorksList.map((w, idx) => {
                        const headObj = accountHeads.find((h) => h.id === w.headId);
                        const expCost = vouchers
                          .filter((v) => v.workId === w.id && v.voucherType === 'EXPENDITURE')
                          .reduce((s, v) => s + v.amount, 0);

                        const totalCost = w.cost || ((w.headAmount || 0) + (w.convergenceHeadAmount || 0));
                        const availableCost = totalCost - expCost;

                        return (
                          <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 border-r border-slate-200 font-bold text-center text-slate-500">{idx + 1}</td>
                            <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                              <p className="text-sm">{w.name}</p>
                              {w.subHeadName && (
                                <p className="text-[10px] text-slate-500 font-normal">उप-शीर्षक: {w.subHeadName}</p>
                              )}
                            </td>
                            <td className="p-3 border-r border-slate-200">
                              <p className="font-extrabold text-slate-800">{headObj?.name || 'N/A'}</p>
                              <p className="text-[11px] font-mono text-slate-700 font-bold">
                                ₹{(w.headAmount || 0).toLocaleString('en-IN')}
                              </p>
                            </td>
                            <td className="p-3 border-r border-slate-200">
                              {w.convergenceHeadName || w.convergenceHeadAmount ? (
                                <div>
                                  <p className="font-extrabold text-teal-800">🔀 {w.convergenceHeadName || 'अभिसरण मद'}</p>
                                  <p className="text-[11px] font-mono text-teal-700 font-bold">
                                    ₹{(w.convergenceHeadAmount || 0).toLocaleString('en-IN')}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">{isHindi ? 'कोई नहीं' : 'None'}</span>
                              )}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-right font-mono font-black text-slate-900 text-sm">
                              ₹{totalCost.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-right font-mono font-bold text-rose-700 text-sm">
                              ₹{expCost.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-right font-mono font-black text-sm">
                              <span className={availableCost >= 0 ? 'text-emerald-700' : 'text-rose-800'}>
                                ₹{availableCost.toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="p-3 text-center print:hidden">
                              <button
                                onClick={() => setViewingWorkVouchersModal(w)}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>👁️</span>
                                <span>{isHindi ? 'वाउचर देखें' : 'View Vouchers'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredWorksList.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                            {isHindi ? 'कोई कार्य व्यय रिकॉर्ड नहीं मिला।' : 'No work expenditure records found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {filteredWorksList.length > 0 && (
                      <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-black text-xs text-slate-900">
                        <tr>
                          <td colSpan={4} className="p-3 text-right uppercase tracking-wider">{isHindi ? 'कुल योग (GRAND TOTAL):' : 'GRAND TOTAL:'}</td>
                          <td className="p-3 text-right font-mono text-sm text-slate-900">₹{grandTotalWorkCost.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-mono text-sm text-rose-800">₹{grandTotalWorkExpenditure.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-mono text-sm text-emerald-800">₹{totalAvailableBalance.toLocaleString('en-IN')}</td>
                          <td className="print:hidden"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* OFFICIAL SIGNATURE FOOTER FOR PRINT */}
                <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-900">
                  <div>
                    <div className="border-t border-slate-800 pt-1">
                      <p>{officeDetails.secretaryName || 'ग्राम पंचायत सचिव'}</p>
                      <p className="text-[10px] text-slate-600 font-medium">सचिव / ग्राम रोजगार सहायक</p>
                      <p className="text-[10px] text-slate-600 font-medium">{officeDetails.officeName}</p>
                    </div>
                  </div>

                  <div>
                    <div className="border-t border-slate-800 pt-1">
                      <p>{officeDetails.sarpanchName || 'सरपंच'}</p>
                      <p className="text-[10px] text-slate-600 font-medium">सरपंच / ग्राम पंचायत अध्यक्ष</p>
                      <p className="text-[10px] text-slate-600 font-medium">{officeDetails.officeName}</p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* PRINT VOUCHER SLIP MODAL */}
      {viewingVoucherSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0">
          <div className="bg-white rounded-2xl border-2 border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-6 printable-area print:border-2 print:border-black">
            {/* MODAL HEADER WITH ACTION BUTTONS */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span>📑</span>
                <span>{isHindi ? 'आधिकारिक वाउचर स्लिप' : 'Official Voucher Slip'}</span>
              </h3>
              <div className="flex items-center gap-2">
                {viewingVoucherSlip.voucherType === 'EXPENDITURE' && (
                  <button
                    onClick={() => {
                      const v = viewingVoucherSlip;
                      setViewingVoucherSlip(null);
                      setViewingNoteSheet(v);
                    }}
                    className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>📑</span>
                    <span>{isHindi ? 'भुगतान नोटशीट देखें/प्रिंट करें' : 'Print Note Sheet'}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    try {
                      triggerPrint('printable-area');
                    } catch (e) {
                      console.error('Print voucher failed:', e);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>🖨️</span>
                  <span>{isHindi ? 'वाउचर प्रिंट करें' : 'Print Voucher'}</span>
                </button>
                <button
                  onClick={() => setViewingVoucherSlip(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
                >
                  ✖
                </button>
              </div>
            </div>

            {/* PRINTABLE VOUCHER DOCUMENT */}
            <div className="space-y-4 font-serif text-slate-900 text-xs">
              <OfficialVoucherHeader
                officeDetails={officeDetails}
                adminPanchayat={(officeDetails as any)?.gramPanchayat}
                voucherTitle={viewingVoucherSlip.voucherType === 'INCOME' ? 'आय वाउचर स्लिप (INCOME VOUCHER SLIP)' : 'व्यय वाउचर स्लिप (EXPENDITURE VOUCHER SLIP)'}
                voucherSubTitle="ग्राम पंचायत रोकड़बही एवं वित्तीय लेखा-जोखा प्रपत्र"
                badgeBgColor={viewingVoucherSlip.voucherType === 'INCOME' ? 'bg-emerald-50 text-emerald-950 border-emerald-300' : 'bg-rose-50 text-rose-950 border-rose-300'}
              />

              <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3 font-semibold">
                <div>
                  <p><span className="font-bold">वाउचर सं. (Voucher No):</span> {viewingVoucherSlip.voucherNo}</p>
                  <p><span className="font-bold">दिनांक (Date):</span> {formatDateDDMMYYYY(viewingVoucherSlip.date)}</p>
                  <p><span className="font-bold">भुगतान का माध्यम:</span> {viewingVoucherSlip.paymentMode}</p>
                </div>
                <div>
                  <p>
                    <span className="font-bold">खाता हेड:</span>{' '}
                    {accountHeads.find((h) => h.id === viewingVoucherSlip.headId)?.name || 'N/A'}
                  </p>
                  {viewingVoucherSlip.subHeadName && (
                    <p><span className="font-bold">उप-शीर्षक:</span> {viewingVoucherSlip.subHeadName}</p>
                  )}
                  {(() => {
                    const taxPayer = getTaxPayerDetails(viewingVoucherSlip);
                    if (!taxPayer) return null;
                    return (
                      <div className="mt-1 p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-950 font-sans space-y-0.5">
                        <p className="font-bold text-amber-900">👤 करदाता: {taxPayer.name}</p>
                        <p>👴 पिता/पति: {taxPayer.guardianName}</p>
                        <p className="font-mono text-amber-800 font-bold">🆔 सदस्य ID: {taxPayer.samagraId}</p>
                      </div>
                    );
                  })()}
                  {viewingVoucherSlip.vendorId && (
                    <p>
                      <span className="font-bold">वेंडर / संस्था:</span>{' '}
                      {vendors.find((v) => v.id === viewingVoucherSlip.vendorId)?.name || '-'}
                    </p>
                  )}
                  {viewingVoucherSlip.workId && (
                    <p>
                      <span className="font-bold">निर्माण कार्य:</span>{' '}
                      {works.find((w) => w.id === viewingVoucherSlip.workId)?.name || '-'}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>कुल राशि (Total Amount):</span>
                  <span className="font-mono text-base">₹{viewingVoucherSlip.amount.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px] italic font-medium">
                  <span className="font-bold">विवरण / विवरण टिप्पणी:</span> {viewingVoucherSlip.remarks || 'कोई विवरण नहीं'}
                </p>
              </div>

              {/* SIGNATURE BLOCK */}
              <div className="pt-10 grid grid-cols-3 gap-4 text-center text-[10px] font-bold">
                <div>
                  <div className="border-t border-slate-800 pt-1">
                    <p>तैयारकर्ता / लिपिक</p>
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-800 pt-1">
                    <p>{officeDetails.secretaryName || 'ग्राम पंचायत सचिव'}</p>
                    <p className="font-normal text-slate-600">सचिव</p>
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-800 pt-1">
                    <p>{officeDetails.sarpanchName || 'सरपंच'}</p>
                    <p className="font-normal text-slate-600">सरपंच</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PAYMENT NOTE SHEET MODAL (भुगतान नोटशीट प्रपत्र) */}
      {viewingNoteSheet && (() => {
        const v = viewingNoteSheet;
        const headObj = accountHeads.find((h) => h.id === v.headId);
        const workObj = works.find((w) => w.id === v.workId);
        const vendorObj = vendors.find((ve) => ve.id === v.vendorId);

        // Calculate Available Head Balance After this Voucher
        const headData = headBalances[v.headId];
        const currentAvailBal = headData ? headData.balance : Number(headObj?.openingBalance || 0);

        // Check if v is already recorded in vouchers array
        const isRecorded = vouchers.some((vo) => vo.id === v.id);
        const availBalAfterVoucher = isRecorded ? currentAvailBal : currentAvailBal - v.amount;
        const availBalBeforeVoucher = availBalAfterVoucher + v.amount;

        const isWorkExpense = !!(v.workId || workObj || v.expenseCategory === 'WORK');
        const schemeName = headObj ? headObj.name : 'ग्राम पंचायत विकास योजना / मद';
        const karyaName = isWorkExpense 
          ? (workObj?.name || v.remarks || 'निर्माण कार्य')
          : (v.subHeadName || v.remarks || 'कार्यालयीन व्यवस्था एवं प्रशासनिक व्यय');
        const vendorFirmName = vendorObj?.name || (v as any).vendorName || 'विभागीय / संबंधित विक्रेता / फर्म';

        const proposalNoStr = v.proposalNo || (workObj?.adminSanctionDate 
          ? `स्वीकृति क्र. ${workObj.id.replace('work-', 'W-')}` 
          : '—');
        const proposalDateStr = v.proposalDate 
          ? formatDateDDMMYYYY(v.proposalDate)
          : (workObj?.adminSanctionDate ? formatDateDDMMYYYY(workObj.adminSanctionDate) : '—');
        const billNoStr = v.billNo || '—';
        const billDateStr = v.billDate ? formatDateDDMMYYYY(v.billDate) : '—';

        const workSanctionCost = v.workSanctionAmount ?? (workObj ? (workObj.cost || (workObj.headAmount || 0) + (workObj.convergenceHeadAmount || 0)) : undefined);
        const workSpentBefore = v.previousExpendedAmount ?? (workObj ? vouchers.filter(vo => vo.workId === workObj.id && vo.voucherType === 'EXPENDITURE' && vo.id !== v.id).reduce((s, vo) => s + vo.amount, 0) : 0);
        const workRemainingAfter = v.remainingAmount ?? (workSanctionCost !== undefined ? Math.max(0, workSanctionCost - (workSpentBefore + v.amount)) : undefined);

        const expenseCategoryStr = v.expenseCategory === 'WORK' 
          ? 'निर्माण कार्य व्यय (Construction Work)' 
          : (v.expenseCategory === 'OFFICE' ? 'कार्यालयीन व्यय (Office Expense)' : 'सामान्य / अन्य व्यय (General Expense)');

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0">
            <div className="bg-white rounded-2xl border-2 border-slate-800 max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 printable-area print:border-0 print:shadow-none print:p-0 max-h-[92vh] overflow-y-auto">
              {/* MODAL HEADER WITH ACTION BUTTONS */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📄</span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <span>{isHindi ? 'भुगतान नोटशीट (Payment Note Sheet)' : 'Payment Note Sheet'}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded text-[10px] font-bold border border-emerald-300 font-mono">
                        {v.voucherNo}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {isHindi ? 'शासकीय स्वीकृत भुगतान नोटशीट प्रपत्र' : 'Official Government Approved Payment Note Sheet'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      try {
                        triggerPrint('printable-area');
                      } catch (e) {
                        console.error('Print note sheet failed:', e);
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🖨️</span>
                    <span>{isHindi ? 'नोटशीट प्रिंट करें' : 'Print Note Sheet'}</span>
                  </button>
                  <button
                    onClick={() => setViewingNoteSheet(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
                  >
                    ✖
                  </button>
                </div>
              </div>

              {/* PRINTABLE PAYMENT NOTE SHEET DOCUMENT */}
              <div className="space-y-5 text-slate-900 font-serif leading-relaxed text-sm print:text-xs">
                {/* Standardized Panchayat Letterhead Header with Logo */}
                <OfficialVoucherHeader
                  officeDetails={officeDetails}
                  adminPanchayat={(officeDetails as any)?.gramPanchayat}
                  voucherTitle="शासकीय भुगतान नोटशीट प्रपत्र (OFFICIAL PAYMENT NOTE SHEET)"
                  badgeBgColor="bg-slate-100 text-slate-900 border-slate-400"
                />

                {/* MAIN INNER FRAME BOX */}
                <div className="border-2 border-slate-900 p-5 sm:p-7 space-y-5 bg-white rounded-lg">
                  {/* TOP WORK / HEAD / AVAILABLE BALANCE ROW */}
                  <div className="border-b-2 border-slate-900 pb-4 space-y-3 font-sans">
                    {/* KEY SCHEME / WORK / VENDOR SUMMARY BAR */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-800">
                          <span className="text-slate-500 font-medium">योजना का नाम (Scheme/Head): </span>
                          <span className="text-slate-950 font-black underline decoration-dotted">{schemeName}</span>
                        </p>
                        <span className="text-[11px] px-2 py-0.5 bg-slate-200 text-slate-800 font-bold rounded">
                          {expenseCategoryStr}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        <span className="text-slate-500 font-medium">कार्य का नाम (Work/Purpose): </span>
                        <span className="text-slate-950 font-black underline decoration-dotted">{karyaName}</span>
                      </p>
                      <p className="text-xs font-bold text-slate-800">
                        <span className="text-slate-500 font-medium">वेंडर / फर्म का नाम (Vendor/Firm): </span>
                        <span className="text-slate-900 font-bold">{vendorFirmName}</span>
                      </p>
                    </div>

                    {/* REFERENCE & METADATA GRID */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-300 font-medium">
                      <div>
                        <span className="text-slate-500 block text-[10px]">प्रस्ताव क्र. :</span>
                        <span className="font-bold text-slate-900">{proposalNoStr}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">प्रस्ताव दिनांक:</span>
                        <span className="font-bold text-slate-900">{proposalDateStr}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">बिल क्र. व दिनांक:</span>
                        <span className="font-bold text-slate-900">{billNoStr} {v.billDate ? `(${billDateStr})` : ''}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">वाउचर क्र. व दिनांक:</span>
                        <span className="font-bold font-mono text-slate-900">{v.voucherNo} ({formatDateDDMMYYYY(v.date)})</span>
                      </div>
                    </div>

                    {/* ALL FINANCIAL INDICATORS TABLE (PROPERLY FORMATTED & EASILY VISIBLE) */}
                    <div className="border border-slate-800 rounded-lg overflow-hidden font-sans">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900 text-white font-bold">
                          <tr>
                            <th className="p-2 border-r border-slate-700">वित्तीय विवरण (Financial Indicators)</th>
                            <th className="p-2 text-right">राशि (Amount ₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-slate-900">
                          {isWorkExpense && workSanctionCost !== undefined && (
                            <>
                              <tr className="bg-slate-50">
                                <td className="p-2 border-r border-slate-200 font-semibold">1. स्वीकृत कार्य लागत (Sanctioned Work Cost)</td>
                                <td className="p-2 text-right font-mono font-bold text-slate-900">₹{workSanctionCost.toLocaleString('en-IN')}</td>
                              </tr>
                              <tr>
                                <td className="p-2 border-r border-slate-200">2. कार्य से पूर्व व्यय राशि (Already Expended from Work Fund)</td>
                                <td className="p-2 text-right font-mono font-bold text-slate-700">₹{workSpentBefore.toLocaleString('en-IN')}</td>
                              </tr>
                              <tr className="bg-rose-50/50">
                                <td className="p-2 border-r border-slate-200 font-bold text-rose-900">3. वर्तमान वाउचर भुगतान राशि (Current Voucher Payment)</td>
                                <td className="p-2 text-right font-mono font-black text-rose-700 text-sm">₹{v.amount.toLocaleString('en-IN')}</td>
                              </tr>
                              <tr className="bg-emerald-50">
                                <td className="p-2 border-r border-slate-200 font-bold text-emerald-950">4. वर्तमान भुगतान उपरांत शेष कार्य फंड (Remaining Fund After Booking)</td>
                                <td className="p-2 text-right font-mono font-black text-emerald-800 text-sm">₹{(workRemainingAfter !== undefined ? workRemainingAfter : 0).toLocaleString('en-IN')}</td>
                              </tr>
                            </>
                          )}
                          {!isWorkExpense && (
                            <>
                              <tr className="bg-slate-50">
                                <td className="p-2 border-r border-slate-200 font-semibold">1. योजना / मद में भुगतान पूर्व उपलब्ध बजट (Head Balance Before Payment)</td>
                                <td className="p-2 text-right font-mono font-bold text-slate-900">₹{availBalBeforeVoucher.toLocaleString('en-IN')}</td>
                              </tr>
                              <tr className="bg-rose-50/50">
                                <td className="p-2 border-r border-slate-200 font-bold text-rose-900">2. वर्तमान देयक/वाउचर भुगतान राशि (Current Payment Amount)</td>
                                <td className="p-2 text-right font-mono font-black text-rose-700 text-sm">₹{v.amount.toLocaleString('en-IN')}</td>
                              </tr>
                              <tr className="bg-emerald-50">
                                <td className="p-2 border-r border-slate-200 font-bold text-emerald-950">3. भुगतान उपरांत योजना / मद शेष बजट (Remaining Head Balance)</td>
                                <td className="p-2 text-right font-mono font-black text-emerald-800 text-sm">₹{availBalAfterVoucher.toLocaleString('en-IN')}</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PARAGRAPH 1 */}
                  <div className="text-justify leading-loose space-y-3 font-medium text-slate-900">
                    {isWorkExpense ? (
                      <p>
                        कार्य स्वीकृति योजना <span className="font-bold underline decoration-dotted px-1">{schemeName}</span> से है , जिसमे ग्राम सभा/ग्राम पंचायत के प्रस्ताव क्र. <span className="font-bold underline decoration-dotted px-1">{proposalNoStr}</span> दिनांक <span className="font-bold underline decoration-dotted px-1">{proposalDateStr}</span> के निर्णय के अनुसार कार्य <span className="font-bold underline decoration-dotted px-1">{karyaName}</span> स्वीकृत हुआ है । जिसकी स्वीकृति के आधार पर सचिव / ग्राम रोजगार सहायक को बिल क्र. <span className="font-bold underline decoration-dotted px-1">{billNoStr}</span> {v.billDate ? `दिनांक ${billDateStr}` : ''} के अनुसार वेंडर/फर्म <span className="font-bold underline decoration-dotted px-1">{vendorFirmName}</span> को भुगतान हेतु आदेशित किया जाता है।
                      </p>
                    ) : (
                      <p>
                        व्यय स्वीकृति योजना <span className="font-bold underline decoration-dotted px-1">{schemeName}</span> अंतर्गत उप-शीर्षक/कार्य <span className="font-bold underline decoration-dotted px-1">{karyaName}</span> हेतु है । जिसकी स्वीकृति के आधार पर सचिव / ग्राम रोजगार सहायक को बिल क्र. <span className="font-bold underline decoration-dotted px-1">{billNoStr}</span> {v.billDate ? `दिनांक ${billDateStr}` : ''} के अनुसार वेंडर/फर्म <span className="font-bold underline decoration-dotted px-1">{vendorFirmName}</span> को भुगतान हेतु आदेशित किया जाता है।
                      </p>
                    )}
                    <p>
                      जो बिल मस्टर पूर्णतः सत्य एवं सही है , उसमे कहीं कोई त्रुटि निकलती है तो मैं स्वयं जिम्मेदार रहूँगा ।
                    </p>
                  </div>

                  {/* SIGNATURES ROW 1 (2 Columns: निगरानी समिति सदस्य / सरपंच) */}
                  <div className="pt-6 pb-2 grid grid-cols-2 gap-8 text-center font-bold text-xs">
                    <div className="flex flex-col items-center justify-end h-16">
                      <p className="border-t-2 border-slate-900 pt-1 w-48 font-black">निगरानी समिति सदस्य</p>
                    </div>
                    <div className="flex flex-col items-center justify-end h-16">
                      <p className="border-t-2 border-slate-900 pt-1 w-48 font-black">सरपंच</p>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-slate-900 my-3" />

                  {/* PARAGRAPH 2 */}
                  <div className="text-justify leading-loose space-y-3 font-medium text-slate-900">
                    <p>
                      सरपंच महोदय के आदेशानुसार बिल राशि <span className="font-bold font-mono text-base underline decoration-dotted px-1">₹{v.amount.toLocaleString('en-IN')}</span> है , जो कि योजना <span className="font-bold underline decoration-dotted px-1">{schemeName}</span> (कार्य: <span className="font-bold underline decoration-dotted px-1">{karyaName}</span>) से डिजीटल भुगतान हेतु ऑनलाईन पोर्टल के माध्यम से वेंडर/फर्म <span className="font-bold underline decoration-dotted px-1">{vendorFirmName}</span> के खाते में भुगतान किया जाता है , जिसका ई.पी.ओ. वाउचर क्र. <span className="font-bold font-mono underline decoration-dotted px-1">{v.voucherNo}</span> दिनांक <span className="font-bold font-mono underline decoration-dotted px-1">{formatDateDDMMYYYY(v.date)}</span> है जो कि रोकड़बही में लिखा जावे ।
                    </p>
                  </div>

                  {/* SIGNATURES ROW 2 (3 Columns: सरपंच / निगरानी समिति सदस्य / सचिव) */}
                  <div className="pt-8 grid grid-cols-3 gap-4 text-center font-bold text-xs">
                    <div className="flex flex-col items-center justify-end h-16">
                      <p className="border-t-2 border-slate-900 pt-1 w-32 font-black">सरपंच</p>
                    </div>
                    <div className="flex flex-col items-center justify-end h-16">
                      <p className="border-t-2 border-slate-900 pt-1 w-36 font-black">निगरानी समिति सदस्य</p>
                    </div>
                    <div className="flex flex-col items-center justify-end h-16">
                      <p className="border-t-2 border-slate-900 pt-1 w-32 font-black">सचिव</p>
                    </div>
                  </div>
                </div>

                {/* FOOTER METADATA */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans border-t pt-2">
                  <span>ई.पी.ओ. वाउचर सं: {v.voucherNo} | भुगतान तिथि: {formatDateDDMMYYYY(v.date)} | माध्यम: {v.paymentMode}</span>
                  <span>ग्राम पंचायत रोकड़बही स्वीकृति प्रपत्र</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT WORK DETAILS MODAL */}
      {editingWorkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {isHindi ? 'निर्माण कार्य विवरण संशोधित करें (Edit Work Details)' : 'Edit Work Project Details'}
                </h3>
              </div>
              <button
                onClick={() => setEditingWorkModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleSaveEditWorkSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'निर्माण कार्य का नाम *' : 'Work Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editWorkName}
                  onChange={(e) => setEditWorkName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'प्रशासनिक स्वीकृति दिनांक (Admin Sanction Date)' : 'Admin Sanction Date'}
                </label>
                <input
                  type="date"
                  value={editWorkAdminSanctionDate}
                  onChange={(e) => setEditWorkAdminSanctionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'मुख्य खाता शीर्षक (Account Head) *' : 'Account Head *'}
                </label>
                <select
                  required
                  value={editWorkHeadId}
                  onChange={(e) => setEditWorkHeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="">-- {isHindi ? 'खाता शीर्षक चुनें' : 'Select Head'} --</option>
                  {accountHeads.map((h) => {
                    const hBal = headBalances[h.id] ? headBalances[h.id].balance : Number(h.openingBalance || 0);
                    return (
                      <option key={h.id} value={h.id}>
                        {h.name} {isHindi ? `(फंड शेष: ₹${hBal.toLocaleString('en-IN')})` : `(Fund Bal: ₹${hBal.toLocaleString('en-IN')})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Fund Balance Indicator in Edit Modal */}
              {editWorkHeadId && (() => {
                const mainHeadObj = accountHeads.find((h) => h.id === editWorkHeadId);
                const headData = headBalances[editWorkHeadId];
                const availBal = headData ? headData.balance : Number(mainHeadObj?.openingBalance || 0);
                const hasFund = availBal > 0;

                return (
                  <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${hasFund ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'}`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>💰 {isHindi ? 'मुख्य हेड उपलब्ध फंड शेष:' : 'Main Head Available Fund:'}</span>
                      <span className="font-mono font-black text-sm">₹{availBal.toLocaleString('en-IN')}</span>
                    </div>
                    {!hasFund && (
                      <p className="text-[11px] text-rose-700 font-bold">
                        ⚠️ {isHindi ? 'इस खाता मद में पर्याप्त फंड उपलब्ध नहीं है!' : 'Insufficient funds under this head!'}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'मूल मद आवंटन राशि ₹ *' : 'Main Head Amount ₹ *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editWorkHeadAmount}
                    onChange={(e) => setEditWorkHeadAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'कुल स्वीकृत लागत ₹' : 'Total Sanction Cost ₹'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editWorkCost}
                    onChange={(e) => setEditWorkCost(Number(e.target.value))}
                    placeholder={`Auto: ${editWorkHeadAmount + editWorkConvergenceHeadAmount}`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* CONVERGENCE HEAD OPTION */}
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 space-y-2">
                <p className="font-bold text-teal-900 text-[11px] flex items-center gap-1">
                  <span>🔀</span>
                  <span>{isHindi ? 'अभिसरण/कन्वर्ट मद विवरण (Convergence Details)' : 'Convergence Details'}</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-teal-800 text-[10px] mb-1">
                      {isHindi ? 'अभिसरण खाता शीर्षक' : 'Convergence Head'}
                    </label>
                    <select
                      value={editWorkConvergenceHeadId}
                      onChange={(e) => setEditWorkConvergenceHeadId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-teal-300 rounded-lg bg-white font-medium"
                    >
                      <option value="">-- {isHindi ? 'कोई नहीं / अन्य दर्ज करें' : 'None / Custom'} --</option>
                      {accountHeads
                        .filter((h) => h.id !== editWorkHeadId)
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-teal-800 text-[10px] mb-1">
                      {isHindi ? 'अभिसरण मद राशि ₹' : 'Convergence Amount ₹'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editWorkConvergenceHeadAmount}
                      onChange={(e) => setEditWorkConvergenceHeadAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-teal-300 rounded-lg font-mono font-bold bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingWorkModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-emerald-800 text-white font-bold rounded-xl shadow cursor-pointer transition-all flex items-center gap-1"
                >
                  <span>💾</span>
                  <span>{isHindi ? 'परिवर्तन सुरक्षित करें' : 'Update Work Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW WORK EXPENSE VOUCHERS MODAL */}
      {viewingWorkVouchersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0">
          <div className="bg-white rounded-2xl border-2 border-slate-800 max-w-4xl w-full p-6 shadow-2xl space-y-5 printable-area max-h-[90vh] overflow-y-auto">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏗️</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {isHindi ? 'कार्य व्यय वाउचर सूची एवं विवरण' : 'Work Expense Vouchers List'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">{viewingWorkVouchersModal.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    try {
                      triggerPrint('printable-area');
                    } catch (e) {
                      console.error('Print Work Vouchers failed:', e);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>🖨️</span>
                  <span>{isHindi ? 'प्रिंट विवरण' : 'Print Breakdown'}</span>
                </button>
                <button
                  onClick={() => setViewingWorkVouchersModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
                >
                  ✖
                </button>
              </div>
            </div>

            {/* WORK SUMMARY CARD INSIDE MODAL */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{isHindi ? 'मूल मद आवंटन:' : 'Main Head:'}</p>
                <p className="font-bold text-slate-900">
                  {accountHeads.find((h) => h.id === viewingWorkVouchersModal.headId)?.name || 'N/A'}
                </p>
                <p className="font-mono text-slate-800 font-extrabold">₹{(viewingWorkVouchersModal.headAmount || 0).toLocaleString('en-IN')}</p>
              </div>

              <div>
                <p className="text-[10px] text-teal-800 font-bold uppercase">{isHindi ? 'अभिसरण मद:' : 'Convergence Head:'}</p>
                <p className="font-bold text-teal-900">
                  {viewingWorkVouchersModal.convergenceHeadName || '-'}
                </p>
                <p className="font-mono text-teal-800 font-extrabold">
                  ₹{(viewingWorkVouchersModal.convergenceHeadAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{isHindi ? 'कुल स्वीकृत लागत:' : 'Total Sanctioned:'}</p>
                <p className="font-mono font-black text-slate-900 text-sm">
                  ₹{(viewingWorkVouchersModal.cost || ((viewingWorkVouchersModal.headAmount || 0) + (viewingWorkVouchersModal.convergenceHeadAmount || 0))).toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-amber-800 font-bold uppercase">{isHindi ? 'प्रशासनिक स्वीकृति दिनांक:' : 'Sanction Date:'}</p>
                <p className="font-mono font-extrabold text-amber-900">
                  {formatDateDDMMYYYY(viewingWorkVouchersModal.adminSanctionDate) || '-'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-rose-700 font-bold uppercase">{isHindi ? 'कुल व्यय भुगतान:' : 'Total Spent:'}</p>
                {(() => {
                  const workVouchers = vouchers.filter(
                    (v) => v.workId === viewingWorkVouchersModal.id && v.voucherType === 'EXPENDITURE'
                  );
                  const totalSpent = workVouchers.reduce((s, v) => s + v.amount, 0);
                  return (
                    <p className="font-mono font-black text-rose-700 text-sm">₹{totalSpent.toLocaleString('en-IN')}</p>
                  );
                })()}
              </div>
            </div>

            {/* EXPENSE VOUCHERS TABLE */}
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-200 border-b border-slate-300 text-slate-900 font-black uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-slate-300">#</th>
                    <th className="p-2 border-r border-slate-300">{isHindi ? 'वाउचर सं.' : 'Voucher No'}</th>
                    <th className="p-2 border-r border-slate-300">{isHindi ? 'दिनांक' : 'Date'}</th>
                    <th className="p-2 border-r border-slate-300">{isHindi ? 'वेंडर / फर्म नाम' : 'Vendor'}</th>
                    <th className="p-2 border-r border-slate-300">{isHindi ? 'माध्यम' : 'Mode'}</th>
                    <th className="p-2 border-r border-slate-300">{isHindi ? 'कार्य / व्यय विवरण' : 'Remarks'}</th>
                    <th className="p-2 border-r border-slate-300 text-right">{isHindi ? 'व्यय राशि ₹' : 'Amount ₹'}</th>
                    <th className="p-2 text-center print:hidden">{isHindi ? 'स्लिप' : 'Slip'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-900">
                  {(() => {
                    const workVouchers = vouchers.filter(
                      (v) => v.workId === viewingWorkVouchersModal.id && v.voucherType === 'EXPENDITURE'
                    );

                    if (workVouchers.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                            {isHindi ? 'इस निर्माण कार्य हेतु कोई व्यय वाउचर दर्ज नहीं है।' : 'No expenditure vouchers recorded for this work.'}
                          </td>
                        </tr>
                      );
                    }

                    return workVouchers.map((v, idx) => {
                      const vendorObj = vendors.find((ven) => ven.id === v.vendorId);
                      return (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-primary">{v.voucherNo}</td>
                          <td className="p-2 border-r border-slate-200 font-mono">{formatDateDDMMYYYY(v.date)}</td>
                          <td className="p-2 border-r border-slate-200 font-semibold">{vendorObj?.name || '-'}</td>
                          <td className="p-2 border-r border-slate-200 text-[10px] uppercase font-bold">{v.paymentMode}</td>
                          <td className="p-2 border-r border-slate-200 text-[11px]">{v.remarks}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-black text-rose-700">
                            ₹{v.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setViewingVoucherSlip(v);
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded border border-slate-300 transition-all cursor-pointer"
                                title="वाउचर स्लिप देखें व प्रिंट करें"
                              >
                                🖨️ स्लिप
                              </button>
                              <button
                                onClick={() => {
                                  setViewingNoteSheet(v);
                                }}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[10px] font-bold rounded border border-indigo-300 transition-all cursor-pointer"
                                title="भुगतान नोटशीट देखें व प्रिंट करें"
                              >
                                📑 नोटशीट
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* MODAL FOOTER */}
            <div className="pt-4 flex justify-end print:hidden">
              <button
                onClick={() => setViewingWorkVouchersModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                {isHindi ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT HEAD MODAL */}
      {editingHead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>✏️</span>
                <span>{isHindi ? 'खाता शीर्षक का नाम एवं विवरण बदलें (Edit Account Head)' : 'Edit Account Head'}</span>
              </h3>
              <button
                onClick={() => setEditingHead(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingHead.name.trim()) return;
                if (onUpdateAccountHead) {
                  onUpdateAccountHead(editingHead);
                }
                setEditingHead(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'खाता शीर्षक का नाम (Account Head Name) *' : 'Account Head Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editingHead.name}
                  onChange={(e) => setEditingHead({ ...editingHead, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 text-slate-900 font-medium text-sm"
                  placeholder={isHindi ? 'जैसे - 15वाँ वित्त आयोग / मूलभूत विकास कोष' : 'e.g. 15th Finance Commission'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'शीर्षक कोड (Head Code)' : 'Head Code'}
                  </label>
                  <input
                    type="text"
                    value={editingHead.code || ''}
                    onChange={(e) => setEditingHead({ ...editingHead, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    placeholder="e.g. 15th-FC-01"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'प्रकार (Head Type)' : 'Type'}
                  </label>
                  <select
                    value={editingHead.type}
                    onChange={(e) => setEditingHead({ ...editingHead, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    <option value="BOTH">{isHindi ? 'आय एवं व्यय दोनों (Both)' : 'Both Income & Expenditure'}</option>
                    <option value="INCOME">{isHindi ? 'केवल आय (Income Only)' : 'Income Only'}</option>
                    <option value="EXPENDITURE">{isHindi ? 'केवल व्यय (Expenditure Only)' : 'Expenditure Only'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'प्रारंभिक शेष (Opening Balance ₹)' : 'Opening Balance (₹)'}
                  </label>
                  <input
                    type="number"
                    value={editingHead.openingBalance}
                    onChange={(e) => setEditingHead({ ...editingHead, openingBalance: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'प्रारंभिक तिथि (As On Date)' : 'As On Date'}
                  </label>
                  <input
                    type="date"
                    value={editingHead.asOnDate}
                    onChange={(e) => setEditingHead({ ...editingHead, asOnDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingHead(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {isHindi ? 'सुरक्षित करें (Save Changes)' : 'Save Changes'}
                </button>
              </div>
            </form>
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
                {isHindi ? 'हटाने की पुष्टि करें (Confirm Delete)' : 'Confirm Deletion'}
              </h3>
              <p className="text-slate-600 text-xs mt-1">
                {isHindi
                  ? `क्या आप निश्चित रूप से "${deleteConfirmModal.name}" को हटाना चाहते हैं? यह रिकॉर्ड हमेशा के लिए हटा दिया जाएगा।`
                  : `Are you sure you want to delete "${deleteConfirmModal.name}"? This action cannot be undone.`}
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
                  if (deleteConfirmModal.type === 'HEAD') onDeleteAccountHead(deleteConfirmModal.id);
                  else if (deleteConfirmModal.type === 'VENDOR') onDeleteVendor(deleteConfirmModal.id);
                  else if (deleteConfirmModal.type === 'WORK') onDeleteWork(deleteConfirmModal.id);
                  else if (deleteConfirmModal.type === 'VOUCHER') onDeleteVoucher(deleteConfirmModal.id);
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

      {/* ERROR NOTIFICATION MODAL */}
      {cashbookErrorMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isHindi ? 'चेतावनी / त्रुटि' : 'Validation Error'}
              </h3>
              <p className="text-slate-600 text-xs mt-2">
                {cashbookErrorMsg}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCashbookErrorMsg(null)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                {isHindi ? 'ठीक है (OK)' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE CASHBOOK ENTRY WARNING MODAL */}
      {duplicateModalInfo && <DuplicateWarningModal {...duplicateModalInfo} />}

      {/* SUCCESS CONFIRMATION POPUP MODAL */}
      {successModalInfo && <SuccessPopupModal {...successModalInfo} />}
    </div>
  );
};

export default CashbookManagementView;
