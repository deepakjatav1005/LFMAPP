import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Page, Family, Admin, Tax, Payment, TaxRates, TaxRatesLockInfo, TaxType, BeneficiaryCategory, DeveloperProfile, Subscription, SubscriptionPlan, Announcement, ComplaintQuery, DeveloperTab, OfficeDetails, TaxBeneficiaryList, AccountHead, Vendor, Work, CashbookVoucher, CashbookTab, ExpenseSubHead, BookingRentRecord, BuildingPermissionRecord } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import DashboardCard from './components/DashboardCard';
import Modal from './components/Modal';
import FlappedSidebar from './components/FlappedSidebar';
import ManageProfileView from './components/ManageProfileView';
import ManageTaxRatesView from './components/ManageTaxRatesView';
import BeneficiaryManagementView from './components/BeneficiaryManagementView';
import TaxBeneficiaryListView from './components/TaxBeneficiaryListView';
import TaxIssueManagementView from './components/TaxIssueManagementView';
import TaxReceiptManagementView from './components/TaxReceiptManagementView';
import TaxReportView from './components/TaxReportView';
import CashbookManagementView from './components/CashbookManagementView';
import { BookingRentView } from './components/BookingRentView';
import { BuildingPermissionView } from './components/BuildingPermissionView';
import { MemberCardView } from './components/MemberCardView';
import ViewHeader from './components/ViewHeader';
import { DeveloperPortal } from './components/DeveloperPortal';
import ManageOfficeView from './components/ManageOfficeView';
import DemandNoticeView from './components/DemandNoticeView';
import { AdminRegistrationView } from './components/AdminRegistrationView';
import { ComplaintSuggestionView } from './components/ComplaintSuggestionView';
import { UserSubscriptionView } from './components/UserSubscriptionView';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { checkIsConfigured } from './lib/supabase';
import { triggerPrint, getCleanOfficeTitle, isInFinancialYear, formatDateDDMMYYYY } from './utils/printUtils';
import { fetchFamiliesFromSupabase, fetchTaxesFromSupabase, fetchPaymentsFromSupabase, fetchAdminUsersFromSupabase, fetchAdminUserByMobileFromSupabase, saveFamilyToSupabase, saveFamiliesBatchToSupabase, deleteFamilyFromSupabase, deleteFamiliesBatchFromSupabase, saveTaxToSupabase, saveTaxesBatchToSupabase, deleteTaxFromSupabase, savePaymentToSupabase, deletePaymentFromSupabase, saveAdminUserToSupabase, fetchOfficeDetailsFromSupabase, saveOfficeDetailsToSupabase, fetchComplaintsFromSupabase, saveComplaintToSupabase, fetchSubscriptionsFromSupabase, saveSubscriptionToSupabase, fetchSubscriptionPlansFromSupabase, saveSubscriptionPlanToSupabase, deleteSubscriptionPlanFromSupabase, fetchTaxRatesFromSupabase, saveTaxRatesToSupabase, saveTaxRateLockToSupabase, fetchTaxBeneficiaryListsFromSupabase, saveTaxBeneficiaryListToSupabase, fetchAccountHeadsFromSupabase, saveAccountHeadToSupabase, deleteAccountHeadFromSupabase, fetchVendorsFromSupabase, saveVendorToSupabase, deleteVendorFromSupabase, fetchWorksFromSupabase, saveWorkToSupabase, deleteWorkFromSupabase, fetchCashbookVouchersFromSupabase, saveCashbookVoucherToSupabase, deleteCashbookVoucherFromSupabase, fetchAnnouncementsFromSupabase, saveAnnouncementToSupabase, deleteAnnouncementFromSupabase, fetchBookingRentsFromSupabase, saveBookingRentToSupabase, deleteBookingRentFromSupabase, fetchBuildingPermissionsFromSupabase, saveBuildingPermissionToSupabase, deleteBuildingPermissionFromSupabase } from './lib/supabaseSync';
import { UsersIcon, RupeeIcon, CheckCircleIcon, XCircleIcon, PrinterIcon } from './components/icons';

// --- INITIAL CASHBOOK DATA ---
const initialAccountHeads: AccountHead[] = [
  {
    id: 'head-panchayat-taxation',
    code: '101-TAX',
    name: 'ग्राम पंचायत कर संग्रह (Panchayat Taxation)',
    type: 'INCOME',
    openingBalance: 0,
    asOnDate: '2026-04-01',
  },
];
const initialVendors: Vendor[] = [];
const initialWorks: Work[] = [];
const initialVouchers: CashbookVoucher[] = [];

const initialSubHeads: ExpenseSubHead[] = [
  { id: 'sub-1', name: 'कार्यालय स्टेशनरी व छपाई (Office Stationery & Printing)', description: 'स्टेशनरी, रजिस्टर, प्रिंटिंग कार्य व्यय' },
  { id: 'sub-2', name: 'स्वच्छता मजदूर मानदेय (Sanitation Labour Remuneration)', description: 'सफाई कर्मी एवं कचरा संग्रहण मानदेय' },
  { id: 'sub-3', name: 'पेयजल पाइपलाइन व मोटर मरम्मत (Water Pipeline & Motor Maintenance)', description: 'नल-जल योजना मरम्मत कार्य' },
  { id: 'sub-4', name: 'स्ट्रीट लाइट व विद्युत सामग्री (Street Light & Electrical Items)', description: 'प्रकाश व्यवस्था एवं बल्ब, केबल खरीद' },
  { id: 'sub-5', name: 'ई-गवर्नेंस, कंप्यूटर व इंटरनेट व्यय (E-Governance & Internet)', description: 'कंप्यूटर रिपेयरिंग, स्टेशनरी व ब्रॉडबैंड' },
  { id: 'sub-6', name: 'ग्राम सभा व बैठक आयोजन व्यय (Gram Sabha & Meeting Expenses)', description: 'बैठक व्यवस्था, जलपान व लाउडस्पीकर' },
  { id: 'sub-7', name: 'नल-जल योजना बिजली बिल (Water Supply Electricity Bill)', description: 'पेयजल पंप हाउस विद्युत बिल भुगतान' },
  { id: 'sub-8', name: 'अन्य पंचायत आकस्मिक व्यय (Contingent Panchayat Expenses)', description: 'विविध आकस्मिक व्यय' },
];

// --- INITIAL OFFICE DETAILS ---
const initialOfficeDetails: OfficeDetails = {
  officeName: '',
  secretaryName: '',
  secretaryDesignation: 'ग्राम पंचायत सचिव',
  sarpanchName: '',
  contactPhone: '',
  email: '',
  address: '',
  block: '',
  district: '',
  state: 'Madhya Pradesh',
  pincode: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  ifscCode: '',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Emblem_of_Madhya_Pradesh.svg/180px-Emblem_of_Madhya_Pradesh.svg.png',
  qrCodeUrl: '',
};

// --- INITIAL DEVELOPER & SYSTEM DATA ---
const initialDeveloperProfile: DeveloperProfile = {
  name: 'Hemlata Jatav',
  company: 'Chanchal Net Zone',
  email: 'chanchalnetzone2026@gmail.com',
  phone: '911234567890',
  version: 'v3.0 Multi-Tenant Pro',
  supportHours: '09:00 AM - 08:00 PM IST',
  address: 'Main Market Road, Sehore / Guna, Madhya Pradesh - 466001',
};

const initialSubscriptions: Subscription[] = [];

const initialSubscriptionPlans: SubscriptionPlan[] = [];

const initialAnnouncements: Announcement[] = [
  {
    id: 'anc-prod-1',
    title: '📢 संस्था के वित्तीय एवं टैक्स आय व्यय प्रबंधन पोर्टल सक्रिय',
    message: 'संस्था के वित्तीय एवं टैक्स आय व्यय प्रबंधन पोर्टल उपयोग हेतु सक्रिय है।',
    date: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    isActive: true,
  },
];

const initialComplaints: ComplaintQuery[] = [];

// --- INITIAL DEMO & PRODUCTION DATA ---
const initialAdminList: Admin[] = [];

const initialFamilies: Family[] = [];

const initialTaxRates: TaxRates = {
  [TaxType.WATER]: {
    [BeneficiaryCategory.BPL]: 50,
    [BeneficiaryCategory.APL]: 100,
    [BeneficiaryCategory.DIVYANG]: 30,
    [BeneficiaryCategory.OTHER]: 80,
  },
  [TaxType.SANITATION]: {
    [BeneficiaryCategory.BPL]: 25,
    [BeneficiaryCategory.APL]: 50,
    [BeneficiaryCategory.DIVYANG]: 15,
    [BeneficiaryCategory.OTHER]: 40,
  },
  [TaxType.LIGHT]: {
    [BeneficiaryCategory.BPL]: 35,
    [BeneficiaryCategory.APL]: 75,
    [BeneficiaryCategory.DIVYANG]: 20,
    [BeneficiaryCategory.OTHER]: 60,
  },
  [TaxType.PROPERTY]: {
    [BeneficiaryCategory.BPL]: 250,
    [BeneficiaryCategory.APL]: 500,
    [BeneficiaryCategory.DIVYANG]: 150,
    [BeneficiaryCategory.OTHER]: 400,
  },
  [TaxType.HATBAZAR]: {
    [BeneficiaryCategory.BPL]: 10,
    [BeneficiaryCategory.APL]: 20,
    [BeneficiaryCategory.DIVYANG]: 5,
    [BeneficiaryCategory.OTHER]: 15,
  },
  [TaxType.ROYALTY]: {
    [BeneficiaryCategory.BPL]: 75,
    [BeneficiaryCategory.APL]: 150,
    [BeneficiaryCategory.DIVYANG]: 50,
    [BeneficiaryCategory.OTHER]: 120,
  },
  [TaxType.OTHER]: {
    [BeneficiaryCategory.BPL]: 0,
    [BeneficiaryCategory.APL]: 0,
    [BeneficiaryCategory.DIVYANG]: 0,
    [BeneficiaryCategory.OTHER]: 0,
  },
};

const initialTaxes: Tax[] = [];

const initialPayments: Payment[] = [];

// --- UTILITY FUNCTIONS ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
const getMonthName = (month: number) => new Date(0, month - 1).toLocaleString('default', { month: 'long' });

// --- REUSABLE UI COMPONENTS ---
const InputField = ({ label, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-semibold text-slate-700 uppercase mb-1">{label}</label>
    <input
      id={id}
      {...props}
      className="mt-1 block w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
    />
  </div>
);

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit';
};

const Button = ({ children, onClick, variant = 'primary', type = 'button' }: ButtonProps) => {
  const baseClasses = "w-full inline-flex items-center justify-center py-3 px-5 shadow-md text-sm font-bold rounded-xl focus:outline-none transition-all ease-in-out cursor-pointer active:scale-95";
  const variantClasses = variant === 'primary' 
    ? 'text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 shadow-emerald-100' 
    : 'text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300';
  return <button type={type} onClick={onClick} className={`${baseClasses} ${variantClasses}`}>{children}</button>;
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  // Helper to filter out legacy demo entries if present in local storage
  const isLegacyDemoId = (id: string) => [
    'admin1', 'admin2', 'admin3', 'admin4', 'admin5',
    'fam1', 'fam2', 'fam3', 'fam4',
    'tax1', 'tax2', 'tax3', 'tax4',
    'pay1', 'sub-1', 'sub-2', 'sub-3', 'sub-4', 'sub-5',
    'comp-1', 'comp-2', 'anc-1', 'anc-2'
  ].includes(id);

  // --- STATE MANAGEMENT ---
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [cashbookTab, setCashbookTab] = useState<CashbookTab>(CashbookTab.CASHBOOK_REPORT);
  const [dashboardModule, setDashboardModule] = useState<'TAXATION' | 'CASHBOOK' | 'ALL'>('ALL');

  const handleNavigate = (page: Page, tab?: CashbookTab) => {
    setCurrentPage(page);
    if (tab) {
      setCashbookTab(tab);
    }
  };
  const [adminList, setAdminList] = useState<Admin[]>(() => {
    try {
      const saved = localStorage.getItem('gp_admin_list');
      if (saved) {
        const parsed: Admin[] = JSON.parse(saved);
        const filtered = parsed.filter(a => !isLegacyDemoId(a.id));
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {}
    return initialAdminList;
  });
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [loggedInAdmin, setLoggedInAdmin] = useState<Admin | null>(() => {
    try {
      const saved = localStorage.getItem('gp_logged_in_admin');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialAdminList[0] || null;
  });
  const [families, setFamilies] = useState<Family[]>(() => {
    try {
      const saved = localStorage.getItem('gp_families');
      if (saved) {
        const parsed: Family[] = JSON.parse(saved);
        const filtered = parsed.filter(f => !isLegacyDemoId(f.id));
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {}
    return initialFamilies;
  });
  const [taxes, setTaxes] = useState<Tax[]>(() => {
    try {
      const saved = localStorage.getItem('gp_taxes');
      if (saved) {
        const parsed: Tax[] = JSON.parse(saved);
        const filtered = parsed.filter(t => !isLegacyDemoId(t.id));
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {}
    return initialTaxes;
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const saved = localStorage.getItem('gp_payments');
      if (saved) {
        const parsed: Payment[] = JSON.parse(saved);
        const filtered = parsed.filter(p => !isLegacyDemoId(p.id));
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {}
    return initialPayments;
  });
  const [taxRates, setTaxRates] = useState<TaxRates>(() => {
    try {
      const saved = localStorage.getItem('gp_tax_rates');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialTaxRates;
  });
  const [taxRatesLockInfo, setTaxRatesLockInfo] = useState<TaxRatesLockInfo>(() => {
    try {
      const saved = localStorage.getItem('gp_tax_rates_lock_info');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const isLockedLegacy = localStorage.getItem('gp_is_tax_rates_locked') === 'true';
    return {
      isLocked: isLockedLegacy,
      year: '2026-2027',
      month: 'ALL',
      lockedAt: new Date().toISOString(),
    };
  });
  const [isTaxRatesLocked, setIsTaxRatesLocked] = useState<boolean>(() => {
    try {
      const savedLockInfo = localStorage.getItem('gp_tax_rates_lock_info');
      if (savedLockInfo) {
        const parsed = JSON.parse(savedLockInfo);
        if (parsed.isLocked !== undefined) return Boolean(parsed.isLocked);
      }
      return localStorage.getItem('gp_is_tax_rates_locked') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [taxBeneficiaryLists, setTaxBeneficiaryLists] = useState<Record<string, TaxBeneficiaryList>>(() => {
    try {
      const saved = localStorage.getItem('gp_tax_beneficiary_lists');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<'payment' | 'bill' | null>(null);
  const [theme, setTheme] = useState('theme-teal');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [autoOpenBeneficiaryModal, setAutoOpenBeneficiaryModal] = useState(false);
  const [isHindi, setIsHindi] = useState<boolean>(true);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // LOGIN FORM STATES
  const [loginMobile, setLoginMobile] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [registrationSuccessBanner, setRegistrationSuccessBanner] = useState<string>('');

  const [officeDetails, setOfficeDetails] = useState<OfficeDetails>(() => {
    try {
      const saved = localStorage.getItem('gp_office_details');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialOfficeDetails;
  });

  // --- DEVELOPER PORTAL STATES ---
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile>(initialDeveloperProfile);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    try {
      const saved = localStorage.getItem('gp_subscriptions');
      if (saved) {
        const parsed: Subscription[] = JSON.parse(saved);
        return parsed.filter(s => !isLegacyDemoId(s.id));
      }
    } catch (e) {}
    return initialSubscriptions;
  });
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(() => {
    try {
      const saved = localStorage.getItem('gp_subscription_plans');
      if (saved) {
        const parsed: SubscriptionPlan[] = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return initialSubscriptionPlans;
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem('gp_announcements');
      if (saved) {
        const parsed: Announcement[] = JSON.parse(saved);
        const filtered = parsed.filter(a => !isLegacyDemoId(a.id));
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {}
    return initialAnnouncements;
  });
  const [complaints, setComplaints] = useState<ComplaintQuery[]>(() => {
    try {
      const saved = localStorage.getItem('gp_complaints');
      if (saved) {
        const parsed: ComplaintQuery[] = JSON.parse(saved);
        return parsed.filter(c => !isLegacyDemoId(c.id));
      }
    } catch (e) {}
    return initialComplaints;
  });

  // CASHBOOK STATES
  const isDemoCashbookId = (id: string) => ['head-15fc', 'head-gpf', 'head-sbm', 'ven-1', 'ven-2', 'work-1', 'work-2', 'vouch-1', 'vouch-2', 'vouch-3', 'vouch-4'].includes(id);

  const [accountHeads, setAccountHeads] = useState<AccountHead[]>(() => {
    try {
      const saved = localStorage.getItem('gp_account_heads');
      if (saved) {
        const parsed: AccountHead[] = JSON.parse(saved);
        return parsed.filter(h => !isDemoCashbookId(h.id));
      }
    } catch (e) {}
    return initialAccountHeads;
  });
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    try {
      const saved = localStorage.getItem('gp_vendors');
      if (saved) {
        const parsed: Vendor[] = JSON.parse(saved);
        return parsed.filter(v => !isDemoCashbookId(v.id));
      }
    } catch (e) {}
    return initialVendors;
  });
  const [works, setWorks] = useState<Work[]>(() => {
    try {
      const saved = localStorage.getItem('gp_works');
      if (saved) {
        const parsed: Work[] = JSON.parse(saved);
        return parsed.filter(w => !isDemoCashbookId(w.id));
      }
    } catch (e) {}
    return initialWorks;
  });
  const [vouchers, setVouchers] = useState<CashbookVoucher[]>(() => {
    try {
      const saved = localStorage.getItem('gp_vouchers');
      if (saved) {
        const parsed: CashbookVoucher[] = JSON.parse(saved);
        return parsed.filter(v => !isDemoCashbookId(v.id));
      }
    } catch (e) {}
    return initialVouchers;
  });

  const [bookingRents, setBookingRents] = useState<BookingRentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('gp_booking_rents');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [buildingPermissions, setBuildingPermissions] = useState<BuildingPermissionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('gp_building_permissions');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [subHeads, setSubHeads] = useState<ExpenseSubHead[]>(() => {
    try {
      const saved = localStorage.getItem('gp_subheads');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialSubHeads;
  });

  // Global App Toast Notification State
  const [appToast, setAppToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setAppToast({ message, type });
    setTimeout(() => {
      setAppToast((current) => (current?.message === message ? null : current));
    }, 4500);
  };
  useEffect(() => { localStorage.setItem('gp_families', JSON.stringify(families)); }, [families]);
  useEffect(() => { localStorage.setItem('gp_taxes', JSON.stringify(taxes)); }, [taxes]);
  useEffect(() => { localStorage.setItem('gp_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('gp_admin_list', JSON.stringify(adminList)); }, [adminList]);
  useEffect(() => { localStorage.setItem('gp_office_details', JSON.stringify(officeDetails)); }, [officeDetails]);
  useEffect(() => { localStorage.setItem('gp_subscriptions', JSON.stringify(subscriptions)); }, [subscriptions]);
  useEffect(() => { localStorage.setItem('gp_subscription_plans', JSON.stringify(subscriptionPlans)); }, [subscriptionPlans]);
  useEffect(() => { localStorage.setItem('gp_announcements', JSON.stringify(announcements)); }, [announcements]);
  useEffect(() => { localStorage.setItem('gp_complaints', JSON.stringify(complaints)); }, [complaints]);
  useEffect(() => { localStorage.setItem('gp_tax_rates', JSON.stringify(taxRates)); }, [taxRates]);
  useEffect(() => { localStorage.setItem('gp_is_tax_rates_locked', String(isTaxRatesLocked)); }, [isTaxRatesLocked]);
  useEffect(() => { localStorage.setItem('gp_tax_rates_lock_info', JSON.stringify(taxRatesLockInfo)); }, [taxRatesLockInfo]);
  useEffect(() => { localStorage.setItem('gp_tax_beneficiary_lists', JSON.stringify(taxBeneficiaryLists)); }, [taxBeneficiaryLists]);
  useEffect(() => { localStorage.setItem('gp_account_heads', JSON.stringify(accountHeads)); }, [accountHeads]);
  useEffect(() => { localStorage.setItem('gp_subheads', JSON.stringify(subHeads)); }, [subHeads]);
  useEffect(() => { localStorage.setItem('gp_vendors', JSON.stringify(vendors)); }, [vendors]);
  useEffect(() => { localStorage.setItem('gp_works', JSON.stringify(works)); }, [works]);
  useEffect(() => { localStorage.setItem('gp_vouchers', JSON.stringify(vouchers)); }, [vouchers]);
  useEffect(() => { localStorage.setItem('gp_booking_rents', JSON.stringify(bookingRents)); }, [bookingRents]);
  useEffect(() => { localStorage.setItem('gp_building_permissions', JSON.stringify(buildingPermissions)); }, [buildingPermissions]);

  // AUTO-SYNC ALL TAX RECEIPTS, RENT BOOKINGS, AND BUILDING PERMISSION INCOMES INTO CASHBOOK UNDER 'ग्राम पंचायत कर संग्रह (Panchayat Taxation)'
  useEffect(() => {
    // 1. Find or create the Panchayat Taxation account head
    let taxHead = accountHeads.find(
      (h) =>
        h.id === 'head-panchayat-taxation' ||
        h.name.toLowerCase().includes('panchayat taxation') ||
        h.name.includes('ग्राम पंचायत कर संग्रह') ||
        h.name.toLowerCase().includes('taxation') ||
        h.name.toLowerCase().includes('कर संग्रह')
    );

    if (!taxHead) {
      taxHead = {
        id: 'head-panchayat-taxation',
        code: '101-TAX',
        name: 'ग्राम पंचायत कर संग्रह (Panchayat Taxation)',
        type: 'INCOME',
        openingBalance: 0,
        asOnDate: '2026-04-01',
        gramPanchayat: loggedInAdmin?.gramPanchayat,
        adminId: loggedInAdmin?.id,
      };
      setAccountHeads((prev) => [taxHead!, ...prev]);
      saveAccountHeadToSupabase(taxHead);
    }

    const existingVoucherNos = new Set(vouchers.map((v) => v.voucherNo));
    const missingVouchers: CashbookVoucher[] = [];

    // A. Sync Tax Receipt Payments
    payments.forEach((pay) => {
      const vNo = `INC-${pay.receiptNo}`;
      if (!existingVoucherNos.has(vNo) && pay.amount > 0) {
        const family = families.find((f) => f.id === pay.familyId);
        const taxPayerInfo = family
          ? `करदाता: ${family.name} ${family.surname} | पिता/पति: ${family.guardianName || 'N/A'} | सदस्य/समग्र ID: ${family.samagraId || 'N/A'}`
          : `हितग्राही ID: ${pay.familyId}`;

        const v: CashbookVoucher = {
          id: `vouch-tax-${pay.id}`,
          voucherNo: vNo,
          voucherType: 'INCOME',
          date: pay.date || new Date().toISOString().split('T')[0],
          headId: taxHead!.id,
          amount: pay.amount,
          paymentMode: (pay.mode === 'CHEQUE' || pay.mode === 'NET_BANKING' || pay.mode === 'UPI' || pay.mode === 'ONLINE') ? 'BANK' : 'CASH',
          remarks: `कर संग्रह रसीद: ${pay.receiptNo} [${taxPayerInfo}] (${pay.remarks || 'Tax Collection Bank Deposit'})`,
          gramPanchayat: pay.gramPanchayat || loggedInAdmin?.gramPanchayat,
          adminId: pay.adminId || loggedInAdmin?.id,
        };
        missingVouchers.push(v);
        saveCashbookVoucherToSupabase(v);
      }
    });

    // B. Sync Booking & Rent Collections
    bookingRents.forEach((b) => {
      if (!existingVoucherNos.has(b.voucherNo) && (b.chargeAmount || 0) > 0) {
        const v: CashbookVoucher = {
          id: `vouch-book-${b.id}`,
          voucherNo: b.voucherNo,
          voucherType: 'INCOME',
          date: b.startDate || new Date().toISOString().split('T')[0],
          headId: taxHead!.id,
          amount: Number(b.chargeAmount || 0),
          paymentMode: b.paymentMode === 'CASH' ? 'CASH' : 'BANK',
          remarks: `परिसर/भवन बुकिंग किराया: ${b.beneficiaryName} | प्रयोजन: ${b.purpose} | अवधि: ${formatDateDDMMYYYY(b.startDate)} से ${formatDateDDMMYYYY(b.endDate)} (${b.voucherNo})`,
          gramPanchayat: b.gramPanchayat || loggedInAdmin?.gramPanchayat,
          adminId: b.adminId || loggedInAdmin?.id,
        };
        missingVouchers.push(v);
        saveCashbookVoucherToSupabase(v);
      }
    });

    // C. Sync Building Permission Collections
    buildingPermissions.forEach((p) => {
      if (!existingVoucherNos.has(p.voucherNo) && (p.totalAmount || 0) > 0) {
        const v: CashbookVoucher = {
          id: `vouch-bld-${p.id}`,
          voucherNo: p.voucherNo,
          voucherType: 'INCOME',
          date: p.issueDate || new Date().toISOString().split('T')[0],
          headId: taxHead!.id,
          amount: Number(p.totalAmount || 0),
          paymentMode: p.paymentMode === 'CASH' ? 'CASH' : 'BANK',
          remarks: `भवन निर्माण अनुमति शुल्क: ${p.beneficiaryName} | निर्माण: ${p.constructionType || 'आवासीय'} | अनुमति क्र.: ${p.permissionNo}`,
          gramPanchayat: p.gramPanchayat || loggedInAdmin?.gramPanchayat,
          adminId: p.adminId || loggedInAdmin?.id,
        };
        missingVouchers.push(v);
        saveCashbookVoucherToSupabase(v);
      }
    });

    if (missingVouchers.length > 0) {
      setVouchers((prev) => [...missingVouchers, ...prev]);
    }

    // D. Migrate any existing tax, booking rent, or building permission vouchers to 'ग्राम पंचायत कर संग्रह (Panchayat Taxation)' head
    setVouchers((prev) => {
      let changed = false;
      const updated = prev.map((v) => {
        const isTaxOrRentOrPerm =
          v.id.startsWith('vouch-tax-') ||
          v.id.startsWith('vouch-book-') ||
          v.id.startsWith('vouch-bld-') ||
          v.voucherNo.startsWith('INC-RCP-') ||
          v.voucherNo.startsWith('INC-BOOK-') ||
          v.voucherNo.startsWith('INC-BLD-') ||
          (v.headId && v.headId !== taxHead!.id && (v.headId === 'head-rent-booking' || v.headId === 'head-building-permission'));

        if (isTaxOrRentOrPerm && v.headId !== taxHead!.id) {
          changed = true;
          const newV = { ...v, headId: taxHead!.id };
          saveCashbookVoucherToSupabase(newV);
          return newV;
        }
        return v;
      });
      return changed ? updated : prev;
    });
  }, [payments, bookingRents, buildingPermissions, families, accountHeads.length, vouchers.length, loggedInAdmin]);

  // CASHBOOK HANDLERS
  const handleAddAccountHead = (head: Omit<AccountHead, 'id'>) => {
    const newHead: AccountHead = {
      id: `head-${Date.now()}`,
      ...head,
      adminId: loggedInAdmin?.id,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
    };
    setAccountHeads((prev) => [newHead, ...prev]);
    saveAccountHeadToSupabase(newHead);
  };

  const handleUpdateAccountHead = (updatedHead: AccountHead) => {
    setAccountHeads((prev) => prev.map((h) => (h.id === updatedHead.id ? updatedHead : h)));
    saveAccountHeadToSupabase(updatedHead);
  };

  const handleDeleteAccountHead = (id: string) => {
    setAccountHeads((prev) => prev.filter((h) => h.id !== id));
    deleteAccountHeadFromSupabase(id);
  };

  const handleAddSubHead = (subHead: Omit<ExpenseSubHead, 'id'>) => {
    const newSubHead: ExpenseSubHead = {
      id: `sub-${Date.now()}`,
      ...subHead,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
      adminId: loggedInAdmin?.id,
    };
    setSubHeads((prev) => [newSubHead, ...prev]);
  };

  const handleDeleteSubHead = (id: string) => {
    setSubHeads((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddVendor = (vendor: Omit<Vendor, 'id'>) => {
    const newVendor: Vendor = {
      id: `ven-${Date.now()}`,
      ...vendor,
      adminId: loggedInAdmin?.id,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
    };
    setVendors((prev) => [newVendor, ...prev]);
    saveVendorToSupabase(newVendor);
  };

  const handleDeleteVendor = (id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
    deleteVendorFromSupabase(id);
  };

  const handleAddWork = (work: Omit<Work, 'id'>) => {
    const newWork: Work = {
      id: `work-${Date.now()}`,
      ...work,
      adminId: loggedInAdmin?.id,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
    };
    setWorks((prev) => [newWork, ...prev]);
    saveWorkToSupabase(newWork);
  };

  const handleUpdateWork = (updatedWork: Work) => {
    setWorks((prev) => prev.map((w) => (w.id === updatedWork.id ? updatedWork : w)));
    saveWorkToSupabase(updatedWork);
  };

  const handleDeleteWork = (id: string) => {
    setWorks((prev) => prev.filter((w) => w.id !== id));
    deleteWorkFromSupabase(id);
  };

  const handleAddVoucher = (v: Omit<CashbookVoucher, 'id' | 'voucherNo'>) => {
    const prefix = v.voucherType === 'INCOME' ? 'INC' : 'EXP';
    const num = (vouchers.filter((vo) => vo.voucherType === v.voucherType).length + 1).toString().padStart(3, '0');
    const year = new Date().getFullYear();
    const newVoucher: CashbookVoucher = {
      id: `vouch-${Date.now()}`,
      voucherNo: `${prefix}-${year}-${num}`,
      ...v,
      adminId: loggedInAdmin?.id,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
    };
    setVouchers((prev) => [newVoucher, ...prev]);
    saveCashbookVoucherToSupabase(newVoucher);
    return newVoucher;
  };

  const handleDeleteVoucher = (id: string) => {
    setVouchers((prev) => prev.filter((v) => v.id !== id));
    deleteCashbookVoucherFromSupabase(id);
  };
  const [isDeveloperLoggedIn, setIsDeveloperLoggedIn] = useState<boolean>(false);
  const [devEmailInput, setDevEmailInput] = useState<string>('');
  const [devPasswordInput, setDevPasswordInput] = useState<string>('');
  const [devLoginError, setDevLoginError] = useState<string>('');

  const handleDeveloperLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!devEmailInput || !devPasswordInput) {
      setDevLoginError(isHindi ? 'कृपया ईमेल और पासवर्ड दर्ज करें' : 'Please enter email & password');
      return;
    }
    setIsDeveloperLoggedIn(true);
    setCurrentPage(Page.DEVELOPER_PORTAL);
    setDevLoginError('');
  };

  const handleDeveloperLogout = () => {
    setIsDeveloperLoggedIn(false);
    setCurrentPage(Page.DASHBOARD);
  };

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // Synchronize all data from Supabase backend database
  const syncAllDataFromSupabase = useCallback(async (isManual = false) => {
    if (!checkIsConfigured()) {
      if (isManual) {
        showToast(
          isHindi ? '⚠️ Supabase डेटाबेस क्रेडेंशियल कॉन्फ़िगर नहीं हैं।' : '⚠️ Supabase credentials not configured.',
          'warning'
        );
      }
      return;
    }

    setIsSyncing(true);
    try {
      const [
        dbAdmins,
        dbFamilies,
        dbTaxes,
        dbPayments,
        dbOffice,
        dbComplaints,
        dbSubs,
        dbPlans,
        dbAncs,
        ratesRes,
        dbLists,
        dbHeads,
        dbVendors,
        dbWorks,
        dbVouchers,
        dbBookingRents,
        dbBuildingPerms,
      ] = await Promise.all([
        fetchAdminUsersFromSupabase(),
        fetchFamiliesFromSupabase(),
        fetchTaxesFromSupabase(),
        fetchPaymentsFromSupabase(),
        fetchOfficeDetailsFromSupabase(),
        fetchComplaintsFromSupabase(),
        fetchSubscriptionsFromSupabase(),
        fetchSubscriptionPlansFromSupabase(),
        fetchAnnouncementsFromSupabase(),
        fetchTaxRatesFromSupabase(),
        fetchTaxBeneficiaryListsFromSupabase(),
        fetchAccountHeadsFromSupabase(),
        fetchVendorsFromSupabase(),
        fetchWorksFromSupabase(),
        fetchCashbookVouchersFromSupabase(),
        fetchBookingRentsFromSupabase(),
        fetchBuildingPermissionsFromSupabase(),
      ]);

      if (dbAdmins !== null) {
        setAdminList((prev) => {
          const combined = [...prev];
          dbAdmins.forEach((adm) => {
            if (!combined.some((a) => a.id === adm.id || a.mobile === adm.mobile)) {
              combined.push(adm);
            }
          });
          return combined;
        });
      }

      // If database is connected, state should reflect exactly what is in Supabase
      if (dbFamilies !== null) {
        setFamilies(dbFamilies);
        try {
          localStorage.setItem('gp_families', JSON.stringify(dbFamilies));
        } catch (e) {}
      }

      if (dbTaxes !== null) {
        setTaxes(dbTaxes);
        try {
          localStorage.setItem('gp_taxes', JSON.stringify(dbTaxes));
        } catch (e) {}
      }

      if (dbPayments !== null) {
        setPayments(dbPayments);
        try {
          localStorage.setItem('gp_payments', JSON.stringify(dbPayments));
        } catch (e) {}
      }

      if (dbOffice) {
        setOfficeDetails(dbOffice);
        try {
          localStorage.setItem('gp_office_details', JSON.stringify(dbOffice));
        } catch (e) {}
      }

      if (dbComplaints !== null) {
        setComplaints(dbComplaints);
        try {
          localStorage.setItem('gp_complaints', JSON.stringify(dbComplaints));
        } catch (e) {}
      }

      if (dbSubs !== null) {
        setSubscriptions(dbSubs);
        try {
          localStorage.setItem('gp_subscriptions', JSON.stringify(dbSubs));
        } catch (e) {}
      }

      if (dbPlans !== null) {
        setSubscriptionPlans(dbPlans);
        try {
          localStorage.setItem('gp_subscription_plans', JSON.stringify(dbPlans));
        } catch (e) {}
      }

      if (dbAncs !== null) {
        setAnnouncements(dbAncs);
        try {
          localStorage.setItem('gp_announcements', JSON.stringify(dbAncs));
        } catch (e) {}
      }

      if (ratesRes) {
        if (ratesRes.rates && Object.keys(ratesRes.rates).length > 0) {
          setTaxRates((prev) => ({ ...prev, ...ratesRes.rates }));
        }
        if (ratesRes.lockInfo) {
          setTaxRatesLockInfo(ratesRes.lockInfo);
          setIsTaxRatesLocked(Boolean(ratesRes.lockInfo.isLocked));
        } else if (ratesRes.isLocked !== undefined) {
          setIsTaxRatesLocked(ratesRes.isLocked);
          setTaxRatesLockInfo((prev) => ({ ...prev, isLocked: Boolean(ratesRes.isLocked) }));
        }
      }

      if (dbLists !== null) {
        setTaxBeneficiaryLists(dbLists);
        try {
          localStorage.setItem('gp_tax_beneficiary_lists', JSON.stringify(dbLists));
        } catch (e) {}
      }

      if (dbHeads !== null) {
        const filtered = dbHeads.filter((h) => !isDemoCashbookId(h.id));
        setAccountHeads(filtered);
        try {
          localStorage.setItem('gp_account_heads', JSON.stringify(filtered));
        } catch (e) {}
      }

      if (dbVendors !== null) {
        const filtered = dbVendors.filter((v) => !isDemoCashbookId(v.id));
        setVendors(filtered);
        try {
          localStorage.setItem('gp_vendors', JSON.stringify(filtered));
        } catch (e) {}
      }

      if (dbWorks !== null) {
        const filtered = dbWorks.filter((w) => !isDemoCashbookId(w.id));
        setWorks(filtered);
        try {
          localStorage.setItem('gp_works', JSON.stringify(filtered));
        } catch (e) {}
      }

      if (dbVouchers !== null) {
        const filtered = dbVouchers.filter((v) => !isDemoCashbookId(v.id));
        setVouchers(filtered);
        try {
          localStorage.setItem('gp_vouchers', JSON.stringify(filtered));
        } catch (e) {}
      }

      if (dbBookingRents !== null) {
        setBookingRents(dbBookingRents);
        try {
          localStorage.setItem('gp_booking_rents', JSON.stringify(dbBookingRents));
        } catch (e) {}
      }

      if (dbBuildingPerms !== null) {
        setBuildingPermissions(dbBuildingPerms);
        try {
          localStorage.setItem('gp_building_permissions', JSON.stringify(dbBuildingPerms));
        } catch (e) {}
      }

      if (isManual) {
        showToast(
          isHindi
            ? `🔄 Supabase डेटाबेस से सिंक सफल! कुल ${dbFamilies ? dbFamilies.length : 0} हितग्राही परिवार लोड हुए।`
            : `🔄 Database sync successful! Loaded ${dbFamilies ? dbFamilies.length : 0} families.`,
          'success'
        );
      }
    } catch (err) {
      console.warn('Sync from Supabase error:', err);
      if (isManual) {
        showToast(
          isHindi ? '⚠️ डेटाबेस सिंक में त्रुटि या नेटवर्क समस्या।' : '⚠️ Database sync error or network issue.',
          'error'
        );
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isHindi]);

  // Load initial data from Supabase on startup
  useEffect(() => {
    syncAllDataFromSupabase(false);
  }, [syncAllDataFromSupabase]);

  // --- MULTI-TENANT ISOLATED DATA PER LOGGED-IN GRAM PANCHAYAT ---
  const currentFamilies = useMemo(() => {
    if (!loggedInAdmin) return families;
    return families.filter(
      (f) =>
        !f.gramPanchayat ||
        f.gramPanchayat === loggedInAdmin.gramPanchayat ||
        f.adminId === loggedInAdmin.id
    );
  }, [families, loggedInAdmin]);

  const currentTaxes = useMemo(() => {
    if (!loggedInAdmin) return taxes;
    return taxes.filter(
      (t) =>
        !t.gramPanchayat ||
        t.gramPanchayat === loggedInAdmin.gramPanchayat ||
        t.adminId === loggedInAdmin.id
    );
  }, [taxes, loggedInAdmin]);

  const currentPayments = useMemo(() => {
    if (!loggedInAdmin) return payments;
    return payments.filter(
      (p) =>
        !p.gramPanchayat ||
        p.gramPanchayat === loggedInAdmin.gramPanchayat ||
        p.adminId === loggedInAdmin.id
    );
  }, [payments, loggedInAdmin]);

  const currentOfficeDetails = useMemo(() => {
    if (!loggedInAdmin) return officeDetails;
    return {
      ...officeDetails,
      officeName: officeDetails.officeName || `कार्यालय ग्राम पंचायत ${loggedInAdmin.gramPanchayat}`,
      gramPanchayat: officeDetails.gramPanchayat || loggedInAdmin.gramPanchayat,
      secretaryName: officeDetails.secretaryName || loggedInAdmin.name,
      contactPhone: officeDetails.contactPhone || loggedInAdmin.mobile,
      email: officeDetails.email || loggedInAdmin.email || 'chanchalnetzone2026@gmail.com',
      address: officeDetails.address || `ग्राम पंचायत ${loggedInAdmin.gramPanchayat}, जनपद पंचायत ${loggedInAdmin.block || loggedInAdmin.gramPanchayat}, जिला ${loggedInAdmin.district || ''}`,
      block: officeDetails.block || loggedInAdmin.block || '',
      district: officeDetails.district || loggedInAdmin.district || '',
      state: officeDetails.state || loggedInAdmin.state || 'Madhya Pradesh',
    };
  }, [officeDetails, loggedInAdmin]);

  // Dynamic Regional Statistics for Registered Panchayats, Blocks & Districts
  const multiPanchayatStats = useMemo(() => {
    const uniquePanchayats = new Set(adminList.map(a => a.gramPanchayat.trim())).size;
    const uniqueBlocks = new Set(adminList.map(a => (a.block || a.gramPanchayat).trim())).size;
    const uniqueDistricts = new Set(adminList.map(a => (a.district || 'Sehore').trim())).size;
    return {
      registeredPanchayatsCount: uniquePanchayats,
      registeredBlocksCount: uniqueBlocks,
      registeredDistrictsCount: uniqueDistricts,
      totalRegisteredAdmins: adminList.length,
    };
  }, [adminList]);

  const [selectedDashboardYear, setSelectedDashboardYear] = useState<string>('ALL');

  // --- YEAR-FILTERED DATASETS FOR DASHBOARD ---
  const dashboardTaxes = useMemo(() => {
    if (selectedDashboardYear === 'ALL') return currentTaxes;
    return currentTaxes.filter(t => isInFinancialYear(t.year || t.date, selectedDashboardYear));
  }, [currentTaxes, selectedDashboardYear]);

  const dashboardPayments = useMemo(() => {
    if (selectedDashboardYear === 'ALL') return currentPayments;
    return currentPayments.filter(p => isInFinancialYear(p.date, selectedDashboardYear));
  }, [currentPayments, selectedDashboardYear]);

  const dashboardVouchers = useMemo(() => {
    const currentVouchers = loggedInAdmin
      ? vouchers.filter(v => !v.gramPanchayat || v.gramPanchayat === loggedInAdmin.gramPanchayat || v.adminId === loggedInAdmin.id)
      : vouchers;
    if (selectedDashboardYear === 'ALL') return currentVouchers;
    return currentVouchers.filter(v => isInFinancialYear(v.date, selectedDashboardYear));
  }, [vouchers, loggedInAdmin, selectedDashboardYear]);

  // --- COMPUTED VALUES FOR ACTIVE PANCHAYAT ---
  const stats = useMemo(() => {
    const totalCharged = dashboardTaxes.reduce((acc, tax) => acc + tax.amount, 0);
    const totalReceived = dashboardPayments.reduce((acc, payment) => acc + payment.amount, 0);
    return {
      totalFamilies: currentFamilies.length,
      totalCharged,
      totalReceived,
      totalDues: totalCharged - totalReceived,
    };
  }, [currentFamilies, dashboardTaxes, dashboardPayments]);

  const taxWiseStats = useMemo(() => {
    const allTaxTypes = Object.values(TaxType);

    return allTaxTypes.map((taxType) => {
      // Taxes issued of this tax type
      const matchingTaxes = dashboardTaxes.filter((t) => t.type === taxType);
      const charged = matchingTaxes.reduce((sum, t) => sum + t.amount, 0);

      // Registered Beneficiaries count for THIS tax type only
      const billedFamilyIds = new Set(matchingTaxes.map((t) => t.familyId));
      
      // Also check taxBeneficiaryLists for this tax type if list is locked
      const taxList = taxBeneficiaryLists[taxType];
      if (taxList && taxList.isLocked && Array.isArray(taxList.includedFamilyIds)) {
        taxList.includedFamilyIds.forEach((id) => billedFamilyIds.add(id));
      }

      const registeredBeneficiariesCount = billedFamilyIds.size;

      // Payments received for this tax type
      const matchingPayments = dashboardPayments.filter((p) => {
        if (p.taxType === taxType) return true;
        if (p.taxId) {
          const linkedTax = dashboardTaxes.find((t) => t.id === p.taxId);
          return linkedTax?.type === taxType;
        }
        return false;
      });
      const received = matchingPayments.reduce((sum, p) => sum + p.amount, 0);
      const pending = Math.max(0, charged - received);
      const collectionPercent = charged > 0 ? Math.min(100, Math.round((received / charged) * 100)) : 0;

      return {
        taxType,
        registeredBeneficiariesCount,
        charged,
        received,
        pending,
        collectionPercent,
      };
    });
  }, [dashboardTaxes, dashboardPayments, taxBeneficiaryLists]);

  const grandTotals = useMemo(() => {
    const totalCharged = dashboardTaxes.reduce((sum, t) => sum + t.amount, 0);
    const totalPenalties = dashboardPayments.reduce((sum, p) => sum + (p.penalty || 0), 0);
    const totalConcessions = dashboardPayments.reduce((sum, p) => sum + (p.concession || 0), 0);
    const totalReceived = dashboardPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = Math.max(0, totalCharged + totalPenalties - totalConcessions - totalReceived);
    
    // Unique taxpayers who have at least one locked tax or locked tax list
    const uniqueBilledFamilies = new Set<string>();
    dashboardTaxes.forEach((t) => uniqueBilledFamilies.add(t.familyId));
    Object.values(taxBeneficiaryLists).forEach((rawList) => {
      const list = rawList as TaxBeneficiaryList;
      if (list && list.isLocked && Array.isArray(list.includedFamilyIds)) {
        list.includedFamilyIds.forEach((id) => uniqueBilledFamilies.add(id));
      }
    });

    const totalRegistered = uniqueBilledFamilies.size;
    const overallPercent = (totalCharged + totalPenalties - totalConcessions) > 0 
      ? Math.min(100, Math.round((totalReceived / (totalCharged + totalPenalties - totalConcessions)) * 100)) 
      : 0;

    return {
      totalCharged: totalCharged + totalPenalties - totalConcessions,
      totalReceived,
      totalPending,
      totalRegistered,
      overallPercent,
    };
  }, [dashboardTaxes, dashboardPayments, taxBeneficiaryLists]);

  const cashbookStats = useMemo(() => {
    const totalOpening = accountHeads.reduce((s, h) => s + Number(h.openingBalance || 0), 0);
    const totalIncome = dashboardVouchers
      .filter((v) => v.voucherType === 'INCOME')
      .reduce((s, v) => s + v.amount, 0);
    const totalExpenditure = dashboardVouchers
      .filter((v) => v.voucherType === 'EXPENDITURE')
      .reduce((s, v) => s + v.amount, 0);

    const netBalance = totalOpening + totalIncome - totalExpenditure;

    const cashInHand = dashboardVouchers.reduce((acc, v) => {
      if (v.paymentMode === 'CASH') {
        return acc + (v.voucherType === 'INCOME' ? v.amount : -v.amount);
      }
      return acc;
    }, 0);

    const bankBalance = totalOpening + dashboardVouchers.reduce((acc, v) => {
      if (v.paymentMode !== 'CASH') {
        return acc + (v.voucherType === 'INCOME' ? v.amount : -v.amount);
      }
      return acc;
    }, 0);

    return {
      totalOpening,
      totalIncome,
      totalExpenditure,
      netBalance,
      cashInHand,
      bankBalance,
      accountHeadsCount: accountHeads.length,
      vendorsCount: vendors.length,
      worksCount: works.length,
      vouchersCount: dashboardVouchers.length,
    };
  }, [dashboardVouchers, accountHeads, vendors, works]);

  const getFamilyDues = (familyId: string) => {
    const familyTaxes = currentTaxes.filter(t => t.familyId === familyId);
    const familyPayments = currentPayments.filter(p => p.familyId === familyId);

    const charged = familyTaxes.reduce((sum, t) => sum + t.amount, 0);
    const penalties = familyPayments.reduce((sum, p) => sum + (p.penalty || 0), 0);
    const concessions = familyPayments.reduce((sum, p) => sum + (p.concession || 0), 0);
    const paid = familyPayments.reduce((sum, p) => sum + p.amount, 0);

    return Math.max(0, charged + penalties - concessions - paid);
  };

  // --- HANDLERS ---
  const handleSelectAdminDropdown = (adminId: string) => {
    setSelectedAdminId(adminId);
    setLoginError('');
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');

    const mob = loginMobile.trim();
    const pass = loginPassword.trim();

    let matchedAdmin = adminList.find((a) => a.mobile.trim() === mob);
    if (!matchedAdmin && selectedAdminId) {
      matchedAdmin = adminList.find((a) => a.id === selectedAdminId);
    }

    if (!matchedAdmin && checkIsConfigured() && mob) {
      const dbAdmin = await fetchAdminUserByMobileFromSupabase(mob);
      if (dbAdmin) {
        matchedAdmin = dbAdmin;
        setAdminList((prev) => {
          if (!prev.some((a) => a.id === dbAdmin.id || a.mobile === dbAdmin.mobile)) {
            return [...prev, dbAdmin];
          }
          return prev;
        });
      }
    }

    if (!matchedAdmin) {
      setLoginError(
        isHindi
          ? '⚠️ यह मोबाइल नंबर / ग्राम पंचायत पोर्टल पर पंजीकृत नहीं है। कृपया पहले नीचे दिए गए "नवीन पंचायत पंजीयन" बटन से रजिस्ट्रेशन करें।'
          : '⚠️ Account or Panchayat not registered. Please register first.'
      );
      return;
    }

    if (matchedAdmin.password && pass && matchedAdmin.password !== pass) {
      setLoginError(
        isHindi
          ? '⚠️ गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें अथवा नया पंजीयन करें।'
          : '⚠️ Incorrect password! Please verify credentials.'
      );
      return;
    }

    setLoggedInAdmin(matchedAdmin);
    setRegistrationSuccessBanner('');
    setCurrentPage(Page.DASHBOARD);
    syncAllDataFromSupabase(false);
  };

  const handleRegisterNewAdmin = async (newAdminData: Omit<Admin, 'id'>) => {
    const existing = adminList.find((a) => a.mobile.trim() === newAdminData.mobile.trim());
    if (existing) {
      const updated = { ...existing, ...newAdminData };
      setAdminList((prev) => prev.map((a) => (a.id === existing.id ? updated : a)));
      setSelectedAdminId(existing.id);
      setLoginMobile('');
      setLoginPassword('');
      setLoginError('');

      const res = await saveAdminUserToSupabase(updated);
      if (res.success) {
        setRegistrationSuccessBanner(
          `🎉 पंजीयन विवरण अपडेट हो गया है एवं Supabase डेटाबेस में सुरक्षित हो गया है! ग्राम पंचायत "${newAdminData.gramPanchayat}" में स्वागत है। अब लॉगिन करें।`
        );
      } else {
        setRegistrationSuccessBanner(
          `🎉 पंजीयन विवरण local mode में अपडेट हुआ। (${res.message || 'Supabase connected'}). ग्राम पंचायत "${newAdminData.gramPanchayat}" में स्वागत है।`
        );
      }
      setCurrentPage(Page.LOGIN);
      return;
    }

    const newAdmin: Admin = {
      id: `admin_${Date.now()}`,
      ...newAdminData,
    };
    setAdminList((prev) => [...prev, newAdmin]);
    setSelectedAdminId(newAdmin.id);
    setLoginMobile('');
    setLoginPassword('');
    setLoginError('');

    const res = await saveAdminUserToSupabase(newAdmin);
    if (res.success) {
      setRegistrationSuccessBanner(
        `🎉 पंजीयन सफल एवं Supabase डेटाबेस में सुरक्षित! ग्राम पंचायत "${newAdmin.gramPanchayat}" (${newAdmin.district || ''}) का खाता बन गया है। अब मोबाइल नंबर ${newAdmin.mobile} से लॉगिन करें।`
      );
    } else {
      setRegistrationSuccessBanner(
        `🎉 पंजीयन स्थानीय खाता निर्मित! (Supabase status: ${res.message || 'Not Connected'}). ग्राम पंचायत "${newAdmin.gramPanchayat}" के लिए लॉगिन करें।`
      );
    }
    setCurrentPage(Page.LOGIN);
  };

  const handleLogout = () => {
    setLoggedInAdmin(null);
    setCurrentPage(Page.LOGIN);
  };

  const handleViewFamily = (family: Family) => {
    setSelectedFamily(family);
    setCurrentPage(Page.FAMILY_DETAILS);
  };

  const handleAddPayment = (
    familyId: string,
    amount: number,
    mode: 'CASH' | 'UPI' | 'ONLINE' | 'CHEQUE' | 'NET_BANKING' = 'CASH',
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
  ) => {
    const paymentDateStr = date || new Date().toISOString().split('T')[0];
    const pDate = new Date(paymentDateStr);
    
    // Safely parse month and year to ensure they are strictly integers
    let recMonth: number = (typeof receivedMonth === 'number' && !isNaN(receivedMonth)) ? Math.floor(receivedMonth) : parseInt(String(receivedMonth || ''), 10);
    if (isNaN(recMonth) || recMonth < 1 || recMonth > 12) {
      recMonth = !isNaN(pDate.getMonth()) ? pDate.getMonth() + 1 : (new Date().getMonth() + 1);
    }

    let recYear: number = (typeof receivedYear === 'number' && !isNaN(receivedYear)) ? Math.floor(receivedYear) : parseInt(String(receivedYear || '').replace(/\D/g, ''), 10);
    if (isNaN(recYear) || recYear < 2000 || recYear > 2100) {
      recYear = !isNaN(pDate.getFullYear()) ? pDate.getFullYear() : new Date().getFullYear();
    }

    let safeChargedMonth: number | undefined = undefined;
    if (typeof chargedMonth === 'number' && !isNaN(chargedMonth) && chargedMonth >= 1 && chargedMonth <= 12) {
      safeChargedMonth = Math.floor(chargedMonth);
    } else if (chargedMonth) {
      const parsedCM = parseInt(String(chargedMonth), 10);
      if (!isNaN(parsedCM) && parsedCM >= 1 && parsedCM <= 12) safeChargedMonth = parsedCM;
    }

    let safeChargedYear: number | undefined = undefined;
    if (typeof chargedYear === 'number' && !isNaN(chargedYear) && chargedYear >= 2000 && chargedYear <= 2100) {
      safeChargedYear = Math.floor(chargedYear);
    } else if (chargedYear) {
      const parsedCY = parseInt(String(chargedYear).replace(/\D/g, ''), 10);
      if (!isNaN(parsedCY) && parsedCY >= 2000 && parsedCY <= 2100) safeChargedYear = parsedCY;
    }

    const newPayment: Payment = {
      id: `pay${Date.now()}`,
      familyId,
      amount: Number(amount || 0),
      chargedAmount,
      previousDues,
      penalty,
      concession,
      remainingDues,
      date: paymentDateStr,
      receiptNo: `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      mode,
      taxType,
      remarks: remarks || 'Tax Collection Receipt',
      month: recMonth,
      year: recYear,
      chargedMonth: safeChargedMonth,
      chargedYear: safeChargedYear,
      chargedMonthNames,
      receivedMonth: recMonth,
      receivedYear: recYear,
      receivedMonthNames,
      paidTaxIds,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
      adminId: loggedInAdmin?.id,
    };
    setPayments((prev) => [newPayment, ...prev]);
    savePaymentToSupabase(newPayment);

    // Auto-create Cashbook Income Voucher for this Tax Receipt under Panchayat Taxation head
    if (newPayment.amount > 0) {
      let taxHead = accountHeads.find(
        (h) =>
          h.id === 'head-panchayat-taxation' ||
          h.name.toLowerCase().includes('panchayat taxation') ||
          h.name.includes('ग्राम पंचायत कर संग्रह') ||
          h.name.toLowerCase().includes('taxation') ||
          h.name.toLowerCase().includes('कर संग्रह')
      );

      if (!taxHead) {
        taxHead = {
          id: 'head-panchayat-taxation',
          code: '101-TAX',
          name: 'ग्राम पंचायत कर संग्रह (Panchayat Taxation)',
          type: 'INCOME',
          openingBalance: 0,
          asOnDate: newPayment.date,
          gramPanchayat: loggedInAdmin?.gramPanchayat,
          adminId: loggedInAdmin?.id,
        };
        setAccountHeads((prev) => [taxHead!, ...prev]);
        saveAccountHeadToSupabase(taxHead);
      }

      const newIncomeVoucher: CashbookVoucher = {
        id: `vouch-tax-${newPayment.id}`,
        voucherNo: `INC-${newPayment.receiptNo}`,
        voucherType: 'INCOME',
        date: newPayment.date,
        headId: taxHead.id,
        amount: newPayment.amount,
        paymentMode: (newPayment.mode === 'CHEQUE' || newPayment.mode === 'NET_BANKING' || newPayment.mode === 'UPI' || newPayment.mode === 'ONLINE') ? 'BANK' : 'CASH',
        remarks: `कर संग्रह रसीद (${newPayment.remarks || 'Tax Collection'}) - ${newPayment.receiptNo}`,
        gramPanchayat: loggedInAdmin?.gramPanchayat,
        adminId: loggedInAdmin?.id,
      };

      setVouchers((prev) => [newIncomeVoucher, ...prev]);
      saveCashbookVoucherToSupabase(newIncomeVoucher);
    }

    // Update tax status for family or selected tax vouchers
    setTaxes((prevTaxes) =>
      prevTaxes.map((tax) => {
        if (tax.familyId === familyId && (!taxType || tax.type === taxType || (paidTaxIds && paidTaxIds.includes(tax.id)))) {
          const isFullyPaid = (remainingDues === 0) || (paidTaxIds && paidTaxIds.includes(tax.id));
          const updatedTax = { ...tax, status: (isFullyPaid ? 'PAID' : 'PARTIAL') as 'PAID' | 'PARTIAL' };
          saveTaxToSupabase(updatedTax);
          return updatedTax;
        }
        return tax;
      })
    );

    setIsModalOpen(false);
  };

  const handleModifyBill = (taxId: string, newAmount: number) => {
    const targetTax = taxes.find(t => t.id === taxId);
    if (targetTax) {
      const isPaid = targetTax.status === 'PAID' || targetTax.status === 'PARTIAL' || payments.some(p => 
        (p.taxId && p.taxId === taxId) ||
        (p.paidTaxIds && p.paidTaxIds.includes(taxId)) ||
        (p.familyId === targetTax.familyId && (!p.taxType || p.taxType === targetTax.type) && ((p.month === targetTax.month && p.year === targetTax.year) || (p.chargedMonth === targetTax.month && p.chargedYear === targetTax.year)))
      );
      if (isPaid) {
        showToast(
          isHindi
            ? '⚠️ इस कर मांग पत्र का भुगतान प्राप्त हो चुका है। शासकीय नियमानुसार भुगतान प्राप्त होने के पश्चात बिल में संशोधन प्रतिबंधित है।'
            : '⚠️ Payment has already been received for this bill. Modifications are strictly forbidden.',
          'error'
        );
        return;
      }
    }
    setTaxes(prevTaxes => prevTaxes.map(tax => tax.id === taxId ? { ...tax, amount: newAmount } : tax));
    const updated = taxes.find(t => t.id === taxId);
    if (updated) {
      saveTaxToSupabase({ ...updated, amount: newAmount });
    }
    showToast(isHindi ? '✅ कर मांग राशि सफलतापूर्वक संशोधित की गई!' : '✅ Tax amount modified successfully!', 'success');
    setIsModalOpen(false);
  };

  const handleRegisterFamily = (family: Omit<Family, 'id'>) => {
    const newFamily: Family = {
      id: `fam${Date.now()}`,
      isLocked: false,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
      adminId: loggedInAdmin?.id,
      ...family,
    };
    setFamilies(prev => [...prev, newFamily]);
    saveFamilyToSupabase(newFamily);
  };

  const handleRegisterFamiliesBatch = async (
    newFamilies: Omit<Family, 'id'>[],
    onProgress?: (processed: number, total: number) => void
  ) => {
    const timestamp = Date.now();
    const createdFamilies: Family[] = newFamilies.map((fam, idx) => {
      const existing = families.find(
        (f) =>
          String(f.samagraId || '').trim().toLowerCase() ===
          String(fam.samagraId || '').trim().toLowerCase()
      );
      return {
        id: existing ? existing.id : `fam_${fam.samagraId || `${timestamp}_${idx}`}`,
        isLocked: fam.isLocked !== undefined ? fam.isLocked : true,
        gramPanchayat: loggedInAdmin?.gramPanchayat,
        adminId: loggedInAdmin?.id,
        ...fam,
      };
    });

    setFamilies((prev) => {
      const newSamagraSet = new Set(
        createdFamilies.map((f) => String(f.samagraId || '').trim().toLowerCase()).filter(Boolean)
      );
      const filtered = prev.filter(
        (f) => !newSamagraSet.has(String(f.samagraId || '').trim().toLowerCase())
      );
      const combined = [...filtered, ...createdFamilies];
      try {
        localStorage.setItem('gp_families', JSON.stringify(combined));
      } catch (e) {}
      return combined;
    });

    await saveFamiliesBatchToSupabase(createdFamilies, onProgress);
  };

  const handleDeleteFamiliesBatch = async (familyIds: string[]) => {
    const idSet = new Set(familyIds);
    setFamilies((prev) => {
      const remaining = prev.filter((f) => !idSet.has(f.id));
      try {
        localStorage.setItem('gp_families', JSON.stringify(remaining));
      } catch (e) {}
      return remaining;
    });
    await deleteFamiliesBatchFromSupabase(familyIds);
  };

  const handleToggleLockFamily = (familyId: string) => {
    setFamilies(prev => prev.map(f => {
      if (f.id === familyId) {
        const updated = { ...f, isLocked: !(f.isLocked !== false) };
        saveFamilyToSupabase(updated);
        return updated;
      }
      return f;
    }));
  };

  const handleUpdateFamily = (updatedFamily: Family) => {
    setFamilies(prev => prev.map(f => f.id === updatedFamily.id ? updatedFamily : f));
    saveFamilyToSupabase(updatedFamily);
  };

  const handleDeleteFamily = (familyId: string) => {
    setFamilies(prev => prev.filter(f => f.id !== familyId));
    deleteFamilyFromSupabase(familyId);
  };

  const handleDeletePayment = (paymentId: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    deletePaymentFromSupabase(paymentId);
    setVouchers((prev) => prev.filter((v) => v.id !== `vouch-tax-${paymentId}`));
    deleteCashbookVoucherFromSupabase(`vouch-tax-${paymentId}`);
  };

  const handleDeleteTax = (taxId: string) => {
    const targetTax = taxes.find(t => t.id === taxId);
    if (targetTax) {
      const isPaid = targetTax.status === 'PAID' || targetTax.status === 'PARTIAL' || payments.some(p => 
        (p.taxId && p.taxId === taxId) ||
        (p.paidTaxIds && p.paidTaxIds.includes(taxId)) ||
        (p.familyId === targetTax.familyId && (!p.taxType || p.taxType === targetTax.type) && ((p.month === targetTax.month && p.year === targetTax.year) || (p.chargedMonth === targetTax.month && p.chargedYear === targetTax.year)))
      );
      if (isPaid) {
        showToast(
          isHindi
            ? '⚠️ इस कर मांग पत्र का भुगतान प्राप्त हो चुका है, अतः इसे हटाया नहीं जा सकता।'
            : '⚠️ Payment has already been received for this bill. It cannot be deleted.',
          'error'
        );
        return;
      }
    }
    setTaxes((prev) => prev.filter((t) => t.id !== taxId));
    deleteTaxFromSupabase(taxId);
    showToast(isHindi ? '✅ कर मांग पत्र सफलतापूर्वक हटाया गया।' : '✅ Tax bill deleted successfully.', 'success');
  };

  const handleUpdateTaxBeneficiaryList = async (updatedList: TaxBeneficiaryList) => {
    setTaxBeneficiaryLists((prev) => ({
      ...prev,
      [updatedList.taxType]: updatedList,
    }));
    await saveTaxBeneficiaryListToSupabase(updatedList);
  };

  const handleIssueTax = async (newTaxData: Omit<Tax, 'id'>) => {
    // Prevent duplicate tax issuance for the same family, tax type, month, and year
    const existingTax = taxes.find(
      t => t.familyId === newTaxData.familyId &&
           t.type === newTaxData.type &&
           t.month === newTaxData.month &&
           t.year === newTaxData.year
    );
    if (existingTax) {
      showToast(
        isHindi
          ? `⚠️ इस हितग्राही को ${newTaxData.type} का ${newTaxData.month}/${newTaxData.year} माह हेतु कर मांग पत्र पहले ही जारी किया जा चुका है!`
          : `⚠️ A tax demand for ${newTaxData.type} for month ${newTaxData.month}/${newTaxData.year} has already been issued to this beneficiary!`,
        'warning'
      );
      return;
    }

    const newTax: Tax = {
      id: `tax${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
      adminId: loggedInAdmin?.id,
      ...newTaxData,
    };
    setTaxes(prev => [newTax, ...prev]);
    const ok = await saveTaxToSupabase(newTax);
    if (ok) {
      showToast(
        isHindi
          ? '✅ कर मांग पत्र सफलतापूर्वक बैकएंड डेटाबेस में दर्ज एवं जारी हो गया!'
          : '✅ Tax Demand Bill generated and successfully saved to backend database!',
        'success'
      );
    } else {
      showToast(
        isHindi
          ? '⚠️ कर मांग लोकल में सहेजी गई। (डेटाबेस सिंक पेंडिंग)'
          : '⚠️ Saved locally. Database sync pending.',
        'warning'
      );
    }
  };

  const handleBatchIssueTaxes = async (month: number, year: number, taxTypes: TaxType[]) => {
    const newTaxEntries: Tax[] = [];
    const timestamp = Date.now();
    let idxCounter = 0;

    // Use all current gram panchayat registered families
    const targetFamilies = currentFamilies.length > 0 ? currentFamilies : families;

    taxTypes.forEach((type) => {
      const listConfig = taxBeneficiaryLists[type];
      if (!listConfig || !listConfig.isLocked) {
        return; // Tax beneficiary list must be locked
      }

      const includedSet = new Set(
        (listConfig.includedFamilyIds || []).map((id) => String(id).trim().toLowerCase())
      );

      targetFamilies.forEach((fam) => {
        const famIdMatch = includedSet.has(String(fam.id).trim().toLowerCase());
        const samagraMatch = fam.samagraId ? includedSet.has(String(fam.samagraId).trim().toLowerCase()) : false;

        if (!famIdMatch && !samagraMatch) {
          return; // Skip if family is not included in the locked list for this tax type
        }

        // Prevent duplicate tax issuance for same family, type, month, year
        const alreadyIssued = taxes.some(
          (t) =>
            (t.familyId === fam.id || (fam.samagraId && t.familyId === fam.samagraId)) &&
            t.type === type &&
            Number(t.month) === Number(month) &&
            Number(t.year) === Number(year)
        );
        if (alreadyIssued) {
          return; // Skip if tax demand already issued for this month
        }

        const cat = fam.category || BeneficiaryCategory.APL;
        const rate = taxRates[type]?.[cat] ?? 100;
        idxCounter++;

        newTaxEntries.push({
          id: `tax_${timestamp}_${idxCounter}_${fam.id.replace(/[^a-zA-Z0-9]/g, '')}_${type.replace(/[^a-zA-Z0-9]/g, '')}`,
          billNo: `DEM-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
          familyId: fam.id,
          month,
          year,
          type,
          amount: Number(rate),
          category: cat,
          status: 'ISSUED',
          gramPanchayat: fam.gramPanchayat || loggedInAdmin?.gramPanchayat,
          adminId: loggedInAdmin?.id,
        });
      });
    });

    if (newTaxEntries.length === 0) {
      showToast(
        isHindi
          ? '⚠️ कोई नवीन कर मांग पत्र जारी नहीं हुआ। चयनित माह हेतु सभी पात्र हितग्राहियों के मांग पत्र पहले ही जारी हैं अथवा सूची लॉक नहीं है।'
          : '⚠️ No new tax demands generated. All eligible beneficiaries already have demands or list is unlocked.',
        'warning'
      );
      return;
    }

    setTaxes((prev) => [...newTaxEntries, ...prev]);

    const batchSaved = await saveTaxesBatchToSupabase(newTaxEntries);
    if (batchSaved) {
      showToast(
        isHindi
          ? `✅ कुल ${newTaxEntries.length} हितग्राहियों को कर मांग पत्र (Tax Demands) डेटाबेस (Supabase) में शत-प्रतिशत सफलतापूर्वक सुरक्षित एवं जारी किए गए!`
          : `✅ All ${newTaxEntries.length} Tax Demands saved to database successfully!`,
        'success'
      );
    } else {
      showToast(
        isHindi
          ? `⚠️ ${newTaxEntries.length} कर मांग पत्र जारी हुए। (डेटाबेस सिंक पेंडिंग)`
          : `⚠️ ${newTaxEntries.length} tax demands generated locally. Database sync pending.`,
        'warning'
      );
    }
  };

  // BOOKING & RENT HANDLERS (3.7)
  const handleCreateBookingRent = async (
    bookingData: Omit<BookingRentRecord, 'id' | 'voucherNo' | 'createdAt'>
  ): Promise<BookingRentRecord | void> => {
    const timestamp = Date.now();
    const year = new Date().getFullYear();
    const count = bookingRents.length + 1;
    const voucherNo = `INC-BOOK-${year}-${String(count).padStart(3, '0')}`;
    const newBooking: BookingRentRecord = {
      id: `book_${timestamp}_${Math.random().toString(36).substr(2, 4)}`,
      voucherNo,
      createdAt: new Date().toISOString(),
      gramPanchayat: loggedInAdmin?.gramPanchayat,
      adminId: loggedInAdmin?.id,
      ...bookingData,
    };

    setBookingRents((prev) => [newBooking, ...prev]);
    saveBookingRentToSupabase(newBooking);

    // Automatically create Cashbook Income Voucher under 'ग्राम पंचायत कर संग्रह (Panchayat Taxation)'
    let taxHead = accountHeads.find(
      (h) =>
        h.id === 'head-panchayat-taxation' ||
        h.name.toLowerCase().includes('panchayat taxation') ||
        h.name.includes('ग्राम पंचायत कर संग्रह') ||
        h.name.toLowerCase().includes('taxation') ||
        h.name.toLowerCase().includes('कर संग्रह')
    );

    if (!taxHead) {
      taxHead = {
        id: 'head-panchayat-taxation',
        code: '101-TAX',
        name: 'ग्राम पंचायत कर संग्रह (Panchayat Taxation)',
        type: 'INCOME',
        openingBalance: 0,
        asOnDate: newBooking.startDate,
        gramPanchayat: loggedInAdmin?.gramPanchayat,
        adminId: loggedInAdmin?.id,
      };
      setAccountHeads((prev) => [taxHead!, ...prev]);
      saveAccountHeadToSupabase(taxHead);
    }

    const incomeVoucher: CashbookVoucher = {
      id: `vouch-book-${newBooking.id}`,
      voucherNo: newBooking.voucherNo,
      voucherType: 'INCOME',
      date: newBooking.startDate,
      headId: taxHead.id,
      amount: Number(newBooking.chargeAmount || 0),
      paymentMode: newBooking.paymentMode === 'CASH' ? 'CASH' : 'BANK',
      remarks: `परिसर/भवन बुकिंग किराया: ${newBooking.beneficiaryName} | प्रयोजन: ${newBooking.purpose} | अवधि: ${formatDateDDMMYYYY(newBooking.startDate)} से ${formatDateDDMMYYYY(newBooking.endDate)} (${newBooking.voucherNo})`,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
      adminId: loggedInAdmin?.id,
    };

    setVouchers((prev) => [incomeVoucher, ...prev]);
    saveCashbookVoucherToSupabase(incomeVoucher);

    showToast(
      isHindi
        ? `✅ बुकिंग वाउचर (${newBooking.voucherNo}) एवं कैशबुक आय प्रविष्टि (₹${newBooking.chargeAmount}) सफलतापूर्वक दर्ज हुई!`
        : `✅ Booking voucher & Cashbook income voucher (₹${newBooking.chargeAmount}) created successfully!`,
      'success'
    );

    return newBooking;
  };

  const handleDeleteBookingRent = (id: string) => {
    setBookingRents((prev) => prev.filter((b) => b.id !== id));
    deleteBookingRentFromSupabase(id);
    setVouchers((prev) => prev.filter((v) => v.id !== `vouch-book-${id}`));
    deleteCashbookVoucherFromSupabase(`vouch-book-${id}`);
    showToast(isHindi ? '✅ बुकिंग वाउचर एवं संबंधित आय प्रविष्टि हटाई गई।' : '✅ Booking voucher deleted.', 'success');
  };

  // BUILDING PERMISSION & TAX HANDLERS (3.8)
  const handleCreateBuildingPermission = async (
    permData: Omit<BuildingPermissionRecord, 'id' | 'voucherNo' | 'permissionNo' | 'createdAt'>
  ): Promise<BuildingPermissionRecord | void> => {
    const timestamp = Date.now();
    const year = new Date().getFullYear();
    const count = buildingPermissions.length + 1;
    const permissionNo = `BP-${year}-${String(count).padStart(3, '0')}`;
    const voucherNo = `INC-BLD-${year}-${String(count).padStart(3, '0')}`;

    const newPerm: BuildingPermissionRecord = {
      id: `bld_${timestamp}_${Math.random().toString(36).substr(2, 4)}`,
      permissionNo,
      voucherNo,
      createdAt: new Date().toISOString(),
      gramPanchayat: loggedInAdmin?.gramPanchayat,
      adminId: loggedInAdmin?.id,
      ...permData,
    };

    setBuildingPermissions((prev) => [newPerm, ...prev]);
    saveBuildingPermissionToSupabase(newPerm);

    // Automatically create Cashbook Income Voucher under 'ग्राम पंचायत कर संग्रह (Panchayat Taxation)'
    let taxHead = accountHeads.find(
      (h) =>
        h.id === 'head-panchayat-taxation' ||
        h.name.toLowerCase().includes('panchayat taxation') ||
        h.name.includes('ग्राम पंचायत कर संग्रह') ||
        h.name.toLowerCase().includes('taxation') ||
        h.name.toLowerCase().includes('कर संग्रह')
    );

    if (!taxHead) {
      taxHead = {
        id: 'head-panchayat-taxation',
        code: '101-TAX',
        name: 'ग्राम पंचायत कर संग्रह (Panchayat Taxation)',
        type: 'INCOME',
        openingBalance: 0,
        asOnDate: newPerm.issueDate || new Date().toISOString().split('T')[0],
        gramPanchayat: loggedInAdmin?.gramPanchayat,
        adminId: loggedInAdmin?.id,
      };
      setAccountHeads((prev) => [taxHead!, ...prev]);
      saveAccountHeadToSupabase(taxHead);
    }

    const totalIncomeAmt = Number(newPerm.totalAmount || 0);
    const incomeVoucher: CashbookVoucher = {
      id: `vouch-bld-${newPerm.id}`,
      voucherNo: newPerm.voucherNo,
      voucherType: 'INCOME',
      date: newPerm.issueDate || new Date().toISOString().split('T')[0],
      headId: taxHead.id,
      amount: totalIncomeAmt,
      paymentMode: newPerm.paymentMode === 'CASH' ? 'CASH' : 'BANK',
      remarks: `भवन निर्माण अनुमति शुल्क: ${newPerm.beneficiaryName} | निर्माण: ${newPerm.constructionType || 'आवासीय'} | अनुमति क्र.: ${newPerm.permissionNo}`,
      gramPanchayat: loggedInAdmin?.gramPanchayat,
      adminId: loggedInAdmin?.id,
    };

    setVouchers((prev) => [incomeVoucher, ...prev]);
    saveCashbookVoucherToSupabase(incomeVoucher);

    showToast(
      isHindi
        ? `✅ भवन निर्माण अनुमति पत्र (${newPerm.permissionNo}) एवं कैशबुक आय वाउचर (₹${totalIncomeAmt}) सफलतापूर्वक जारी हुआ!`
        : `✅ Building Permission Certificate & Cashbook income voucher (₹${totalIncomeAmt}) created successfully!`,
      'success'
    );

    return newPerm;
  };

  const handleDeleteBuildingPermission = (id: string) => {
    setBuildingPermissions((prev) => prev.filter((p) => p.id !== id));
    deleteBuildingPermissionFromSupabase(id);
    setVouchers((prev) => prev.filter((v) => v.id !== `vouch-bld-${id}`));
    deleteCashbookVoucherFromSupabase(`vouch-bld-${id}`);
    showToast(isHindi ? '✅ भवन निर्माण अनुमति रिकॉर्ड एवं आय प्रविष्टि हटाई गई।' : '✅ Building permission record deleted.', 'success');
  };

  const handleUpdateTaxRates = async (newRates: TaxRates, lockInfo?: TaxRatesLockInfo | boolean) => {
    setTaxRates(newRates);
    if (lockInfo !== undefined) {
      if (typeof lockInfo === 'boolean') {
        setIsTaxRatesLocked(lockInfo);
        setTaxRatesLockInfo((prev) => ({ ...prev, isLocked: lockInfo }));
      } else {
        setIsTaxRatesLocked(lockInfo.isLocked);
        setTaxRatesLockInfo(lockInfo);
      }
    }
    const currentLockPayload = lockInfo !== undefined ? lockInfo : taxRatesLockInfo;
    const ok = await saveTaxRatesToSupabase(newRates, currentLockPayload);
    if (ok) {
      showToast(
        isHindi
          ? '✅ श्रेणीवार कर दर सूची एवं लॉक स्थिति सफलतापूर्वक बैकएंड डेटाबेस (Supabase) में अपडेट व सहेजी गई!'
          : '✅ Category-wise Tax Rates & lock status saved to database successfully!',
        'success'
      );
    } else {
      showToast(
        isHindi
          ? '⚠️ कर दर सूची लोकल में सहेजी गई। (डेटाबेस सिंक पेंडिंग)'
          : '⚠️ Saved locally. Database sync pending.',
        'warning'
      );
    }
    setCurrentPage(Page.DASHBOARD);
  };

  const handleToggleLockTaxRates = async (lockInfo: TaxRatesLockInfo | boolean) => {
    const isLockedBool = typeof lockInfo === 'boolean' ? lockInfo : lockInfo.isLocked;
    setIsTaxRatesLocked(isLockedBool);
    if (typeof lockInfo === 'object') {
      setTaxRatesLockInfo(lockInfo);
    } else {
      setTaxRatesLockInfo((prev) => ({ ...prev, isLocked: isLockedBool }));
    }
    const ok = await saveTaxRateLockToSupabase(lockInfo);
    if (ok) {
      showToast(
        isLockedBool
          ? isHindi
            ? '🔒 वर्ष एवं माह अनुसार कर दर लॉक स्थिति डेटाबेस में सुरक्षित की गई!'
            : '🔒 Tax rates locked & fixed with year & month in database!'
          : isHindi
          ? '🔓 कर दरें अनलॉक कर दी गईं (डेटाबेस अपडेट सफल)।'
          : '🔓 Tax rates unlocked successfully!',
        'success'
      );
    } else {
      showToast(
        isHindi
          ? '⚠️ लॉक स्थिति लोकल में अपडेट हुई। (डेटाबेस सिंक पेंडिंग)'
          : '⚠️ Lock status updated locally. Database sync pending.',
        'warning'
      );
    }
  };

  const handleUpdateAdmin = (updatedAdmin: Admin) => {
    setLoggedInAdmin(updatedAdmin);
    setAdminList((prev) => prev.map((a) => (a.id === updatedAdmin.id ? updatedAdmin : a)));
    saveAdminUserToSupabase(updatedAdmin);
  };

  // Public search term state for Home Page search widget
  const [homeSearchTerm, setHomeSearchTerm] = useState('');

  // --- PAGE/VIEW RENDERERS ---

  const renderPublicHomeView = () => (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 text-white py-10 px-4 sm:px-6 lg:px-8 shadow-xl border-b-4 border-emerald-500">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {isHindi ? 'संस्था के वित्तीय एवं टैक्स आय व्यय प्रबंधन पोर्टल' : 'Local Fund Management - Financial & Tax Revenue Expense Portal'}
            </h1>
            <p className="text-base sm:text-lg font-bold text-emerald-400">
              {isHindi ? 'स्थानीय वित्तीय प्रबंधन (Local Fund Management)' : 'Local Fund Management Software'}
            </p>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isHindi 
                ? 'संस्था एवं ग्राम पंचायतों हेतु जल कर, स्वच्छता कर, प्रकाश कर, संपत्ति कर एवं अन्य करों हेतु डिजिटल रसीद, रोकड़बही एवं आय-व्यय बहीखाता प्रबंधन प्रणाली।' 
                : 'Digital tax billing, receipt collection, cashbook and local revenue & expense ledger management software.'}
            </p>

            {/* REGISTERED PANCHAYAT, BLOCK & DISTRICT STATISTICS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 max-w-3xl text-center">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-2xl">
                <div className="text-xl mb-0.5">🏛️</div>
                <p className="text-xl sm:text-2xl font-black text-amber-300">{multiPanchayatStats.registeredPanchayatsCount}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-200 font-bold uppercase">
                  {isHindi ? 'पंजीकृत पंचायतें' : 'Reg. Panchayats'}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-2xl">
                <div className="text-xl mb-0.5">🏢</div>
                <p className="text-xl sm:text-2xl font-black text-amber-300">{multiPanchayatStats.registeredBlocksCount}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-200 font-bold uppercase">
                  {isHindi ? 'पंजीकृत ब्लॉक' : 'Reg. Blocks'}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-2xl">
                <div className="text-xl mb-0.5">📍</div>
                <p className="text-xl sm:text-2xl font-black text-amber-300">{multiPanchayatStats.registeredDistrictsCount}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-200 font-bold uppercase">
                  {isHindi ? 'पंजीकृत जिले' : 'Reg. Districts'}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-2xl">
                <div className="text-xl mb-0.5">👥</div>
                <p className="text-xl sm:text-2xl font-black text-emerald-300">{families.length}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-200 font-bold uppercase">
                  {isHindi ? 'पंजीकृत करदाता' : 'Reg. Families'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN HOME PAGE CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PUBLIC INQUIRY */}
        <div className="lg:col-span-7 space-y-8">

          {/* PUBLIC BENEFICIARY TAX STATUS INQUIRY */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-xl">🔍</span>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {isHindi ? 'सार्वजनिक कर बकाया स्थिति खोज' : 'Public Tax Dues Status Search'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isHindi ? 'समग्र आईडी अथवा हितग्राही नाम से अपनी कर बकाया स्थिति देखें' : 'Check your tax dues status by Samagra ID or Beneficiary Name'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={isHindi ? 'समग्र आईडी अथवा नाम से खोजें...' : 'Search Samagra ID or Beneficiary Name...'}
                value={homeSearchTerm}
                onChange={(e) => setHomeSearchTerm(e.target.value)}
                className="flex-grow px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {homeSearchTerm && (
                <button
                  onClick={() => setHomeSearchTerm('')}
                  className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
                >
                  {isHindi ? 'हटाएं' : 'Clear'}
                </button>
              )}
            </div>

            {homeSearchTerm ? (
              <div className="space-y-3 pt-2">
                {families
                  .filter(f => 
                    f.name.toLowerCase().includes(homeSearchTerm.toLowerCase()) ||
                    f.surname.toLowerCase().includes(homeSearchTerm.toLowerCase()) ||
                    f.samagraId.includes(homeSearchTerm) ||
                    f.mobile.includes(homeSearchTerm)
                  )
                  .map(fam => {
                    const dues = getFamilyDues(fam.id);
                    return (
                      <div key={fam.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{fam.name} {fam.surname}</p>
                          <p className="text-slate-500">
                            {isHindi ? 'पिता/अभिभावक' : 'Guardian'}: {fam.guardianName} | {isHindi ? 'श्रेणी' : 'Category'}: <strong className="text-amber-800">{fam.category || 'APL'}</strong>
                          </p>
                          <p className="text-slate-400 font-mono">
                            {isHindi ? 'समग्र आईडी' : 'Samagra ID'}: {fam.samagraId} | {isHindi ? 'वार्ड' : 'Ward'} {fam.wardNo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">
                            {isHindi ? 'बकाया कर राशि' : 'OUTSTANDING DUES'}
                          </p>
                          <p className={`font-black text-base ${dues > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {formatCurrency(dues)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {isHindi ? '💡 सुझाव: समग्र आईडी अथवा नाम टाइप कर करदाता स्थिति खोजें।' : '💡 Tip: Type Samagra ID or name to check beneficiary status.'}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK PORTAL NAVIGATION & ACTION PANEL */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-8 space-y-6 rounded-2xl shadow-xl border border-slate-200 sticky top-24">
            
            {/* BRANDING HEADER */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-3xl shadow-md">
                🏛️
              </div>
              <h2 className="text-xl font-black text-slate-900">
                {isHindi ? 'संस्था के वित्तीय एवं टैक्स आय व्यय प्रबंधन पोर्टल' : 'Local Fund Management Portal'}
              </h2>
              <p className="text-xs text-emerald-800 font-bold uppercase">
                {isHindi ? 'स्थानीय वित्तीय प्रबंधन' : 'Local Fund Management'}
              </p>
            </div>

            {/* QUICK PORTAL ACCESS NAVIGATION BUTTONS */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider text-center">
                {isHindi ? 'पोर्टल प्रवेश एवं नेविगेशन' : 'Portal Access & Action'}
              </p>

              {/* USER LOGIN NAVIGATION BUTTON */}
              <button
                onClick={() => setCurrentPage(Page.LOGIN)}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
              >
                <span>🔐</span>
                <span>{isHindi ? 'उपयोगकर्ता लॉगिन पृष्ठ खोलें' : 'Go to User Login Screen'}</span>
              </button>

              {/* REGISTER LOGIN NAVIGATION BUTTON */}
              <button
                onClick={() => setCurrentPage(Page.ADMIN_REGISTRATION)}
                className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-xl transition-all border border-emerald-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🏛️+</span>
                <span>{isHindi ? 'नवीन उपयोगकर्ता / पंचायत पंजीयन' : 'Register New User / Panchayat'}</span>
              </button>

              {/* ABOUT PORTAL BUTTON */}
              <button
                onClick={() => setIsAboutOpen(true)}
                className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all border border-amber-500 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>ℹ️</span>
                <span>{isHindi ? 'पोर्टल के बारे में' : 'About Portal Info'}</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );

  const renderLoginPage = () => (
    <div className="min-h-screen bg-slate-100 pb-12 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg p-6 sm:p-8 space-y-5 bg-white rounded-2xl shadow-2xl border border-slate-200 animate-slide-up">
        
        {/* BRANDING HEADER */}
        <div className="text-center space-y-1.5 border-b border-slate-100 pb-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-3xl shadow-md">
            🔐
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            {isHindi ? 'संस्था के वित्तीय एवं टैक्स आय व्यय प्रबंधन पोर्टल' : 'Local Fund Management'}
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase">
            {isHindi ? 'स्थानीय वित्तीय प्रबंधन - उपयोगकर्ता लॉगिन' : 'User Login - Local Fund Management'}
          </p>
        </div>

        {/* REGISTRATION SUCCESS BANNERS */}
        {registrationSuccessBanner && (
          <div className="bg-emerald-600 text-white p-4 rounded-xl text-xs font-bold shadow-md animate-fade-in flex items-start gap-2 border border-emerald-700">
            <span className="text-lg">🎉</span>
            <div className="flex-1">{registrationSuccessBanner}</div>
          </div>
        )}

        {/* ERROR BANNER IF UNREGISTERED */}
        {loginError && (
          <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-xl text-xs space-y-2 text-rose-950 animate-bounce-short">
            <div className="flex items-start gap-2 font-black text-rose-900">
              <span className="text-lg">⚠️</span>
              <div className="flex-1 leading-relaxed">{loginError}</div>
            </div>
            <button
              onClick={() => setCurrentPage(Page.ADMIN_REGISTRATION)}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>🏛️+</span>
              <span>{isHindi ? 'अभी नवीन पंचायत पंजीयन करें' : 'Register Panchayat Now'}</span>
            </button>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
              📱 {isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}
            </label>
            <input
              type="text"
              value={loginMobile}
              onChange={(e) => {
                setLoginMobile(e.target.value);
                setLoginError('');
              }}
              required
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:border-emerald-500"
              placeholder="10 digit mobile"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
              🔑 {isHindi ? 'पासवर्ड' : 'Password'}
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => {
                setLoginPassword(e.target.value);
                setLoginError('');
              }}
              required
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:border-emerald-500"
              placeholder="password"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
          >
            <span>🔐</span> {isHindi ? 'पंचायत पोर्टल में लॉगिन करें' : 'Login to Panchayat'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 space-y-2">
          {/* PROMINENT REGISTRATION BUTTON */}
          <button
            onClick={() => {
              setLoginError('');
              setCurrentPage(Page.ADMIN_REGISTRATION);
            }}
            className="w-full py-3 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-2 border-emerald-400 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>🏛️+</span>
            <span>{isHindi ? 'नवीन उपयोगकर्ता / पंचायत पंजीयन' : 'Register New User / Panchayat'}</span>
          </button>

          <button
            onClick={() => setCurrentPage(Page.DEVELOPER_PORTAL)}
            className="w-full py-2.5 px-3 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>💻</span>
            <span>{isHindi ? 'डेवलपर पोर्टल लॉगिन' : 'Developer Portal Login'}</span>
          </button>

          <button
            onClick={() => setCurrentPage(Page.DASHBOARD)}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🏠</span>
            <span>{isHindi ? '← होम पर वापस जाएं' : '← Back to Home'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderDeveloperLoginView = () => (
    <div className="min-h-screen bg-slate-950 pb-12 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-slate-900 rounded-2xl shadow-2xl border border-cyan-800/60 animate-slide-up">
        <div className="text-center space-y-2 border-b border-slate-800 pb-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-600 text-white flex items-center justify-center font-black text-3xl shadow-lg border border-cyan-400">
            💻
          </div>
          <h2 className="text-2xl font-black text-white">
            {isHindi ? 'डेवलपर लॉगिन' : 'Developer Login'}
          </h2>
          <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider">
            Chanchal Net Zone
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
          <p className="font-bold text-slate-300">🔑 Default Developer Credentials:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-mono text-cyan-300 pt-1">
            <div>Email: <strong className="text-white">chanchalnetzone2026@gmail.com</strong></div>
            <div>Password: <strong className="text-white">developer123</strong></div>
          </div>
        </div>

        {devLoginError && (
          <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold rounded-xl text-center">
            ⚠️ {devLoginError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleDeveloperLogin}>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              {isHindi ? 'डेवलपर ईमेल' : 'Developer Email'}
            </label>
            <input
              type="email"
              value={devEmailInput}
              onChange={(e) => setDevEmailInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              {isHindi ? 'डेवलपर पासवर्ड' : 'Developer Password'}
            </label>
            <input
              type="password"
              value={devPasswordInput}
              onChange={(e) => setDevPasswordInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-base font-black rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer border border-cyan-400"
          >
            <span>🔐</span> {isHindi ? 'डेवलपर डैशबोर्ड में प्रवेश करें' : 'Login to Developer Portal'}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800 space-y-2 text-center">
          <button
            onClick={() => handleDeveloperLogin()}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>⚡</span>
            <span>{isHindi ? '1-क्लिक डायरेक्ट डेमो डेवलपर प्रवेश' : '1-Click Direct Demo Developer Login'}</span>
          </button>

          <button
            onClick={() => setCurrentPage(Page.LOGIN)}
            className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800"
          >
            <span>←</span>
            <span>{isHindi ? 'उपयोगकर्ता (ग्राम पंचायत) लॉगिन पर जाएं' : 'Go to User Login'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdminRegistration = () => (
    <AdminRegistrationView
      isHindi={isHindi}
      onRegisterAdmin={handleRegisterNewAdmin}
      onNavigateToLogin={() => setCurrentPage(Page.LOGIN)}
      onNavigateToHome={() => setCurrentPage(Page.DASHBOARD)}
      existingAdmins={adminList}
    />
  );

  const renderDashboard = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in max-w-7xl">
      {/* PANCHAYAT PORTAL HEADER BANNER */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 p-2 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
            <img src={officeDetails.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Emblem_of_Madhya_Pradesh.svg/180px-Emblem_of_Madhya_Pradesh.svg.png'} alt="Logo" className="max-h-full max-w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-black rounded-full border border-emerald-400/40 uppercase">
                {isHindi ? 'ग्राम पंचायत पोर्टल' : 'Panchayat Portal'}
              </span>
              <span className="text-xs text-slate-300 font-bold">
                {currentOfficeDetails.gramPanchayat || loggedInAdmin?.gramPanchayat || ''} {currentOfficeDetails.block || loggedInAdmin?.block ? `• ${currentOfficeDetails.block || loggedInAdmin?.block}` : ''} {currentOfficeDetails.district || loggedInAdmin?.district ? `• ${currentOfficeDetails.district || loggedInAdmin?.district}` : ''}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              {getCleanOfficeTitle(currentOfficeDetails, loggedInAdmin?.gramPanchayat)}
            </h2>
          </div>
        </div>

        {/* DASHBOARD CONTROLS: YEAR SELECTOR & MODULE SWITCHER TABS */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {/* GLOBAL YEAR FILTER */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs shadow-inner">
            <span className="font-bold text-amber-300">📅 {isHindi ? 'वित्तीय वर्ष:' : 'Filter Year:'}</span>
            <select
              value={selectedDashboardYear}
              onChange={(e) => setSelectedDashboardYear(e.target.value)}
              className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">{isHindi ? 'समस्त वर्ष (ALL YEARS)' : 'ALL YEARS'}</option>
              <option value="2024">2024 (2024-25)</option>
              <option value="2025">2025 (2025-26)</option>
              <option value="2026">2026 (2026-27)</option>
              <option value="2027">2027 (2027-28)</option>
            </select>
          </div>

          {/* DASHBOARD MODULE SWITCHER TABS */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
            <button
              onClick={() => setDashboardModule('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                dashboardModule === 'ALL'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              📊 {isHindi ? 'समस्त सारांश' : 'All Overview'}
            </button>
            <button
              onClick={() => setDashboardModule('TAXATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                dashboardModule === 'TAXATION'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              🏛️ {isHindi ? 'कर प्रबंधन' : 'Taxation Module'}
            </button>
            <button
              onClick={() => setDashboardModule('CASHBOOK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                dashboardModule === 'CASHBOOK'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              📗 {isHindi ? 'रोकड़ बही' : 'Cashbook Module'}
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: ALL OVERVIEW (DEFAULT MAIN DASHBOARD) */}
      {(dashboardModule === 'ALL') && (
        <div className="space-y-6">
          {/* TAXATION OVERVIEW CARDS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>🏛️</span> {isHindi ? 'कराधान एवं स्व-कर संग्रह स्थिति' : 'Taxation & Own Tax Revenue Overview'}
              </h3>
              <button
                onClick={() => setDashboardModule('TAXATION')}
                className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isHindi ? 'कर प्रबंधन विवरण देखें' : 'View Taxation Module'}</span>
                <span>→</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isHindi ? 'कुल पंजीकृत' : 'Total Registered'}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    {isHindi ? 'पंजीकृत परिवार / करदाता' : 'Registered Taxpayers'}
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{grandTotals.totalRegistered}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
                  👥
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isHindi ? 'कुल कर मांग' : 'Total Tax Demand'}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    {isHindi ? 'जारी कुल मांग राशि' : 'Total Charges Issued'}
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(grandTotals.totalCharged)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl shrink-0">
                  🧾
                </div>
              </div>

              <div className="bg-emerald-50/90 p-5 rounded-2xl border-2 border-emerald-300 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                    {isHindi ? 'कुल प्राप्त कर राशि' : 'TOTAL RECEIVED AMOUNT'}
                  </p>
                  <p className="text-xs text-emerald-700 font-bold">
                    {isHindi ? 'समस्त कर - कुल प्राप्त राशि' : 'All Taxes Collected'}
                  </p>
                  <p className="text-2xl font-black text-emerald-800 mt-1">{formatCurrency(grandTotals.totalReceived)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                  ✓
                </div>
              </div>

              <div className="bg-rose-50/90 p-5 rounded-2xl border-2 border-rose-300 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-rose-900 uppercase tracking-wider">
                    {isHindi ? 'कुल बकाया कर राशि' : 'TOTAL PENDING AMOUNT'}
                  </p>
                  <p className="text-xs text-rose-700 font-bold">
                    {isHindi ? 'समस्त कर - कुल बकाया राशि' : 'All Taxes Outstanding'}
                  </p>
                  <p className="text-2xl font-black text-rose-800 mt-1">{formatCurrency(grandTotals.totalPending)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                  ⏳
                </div>
              </div>
            </div>
          </div>

          {/* CASHBOOK OVERVIEW CARDS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>📗</span> {isHindi ? 'रोकड़ बही (Cashbook) आय एवं व्यय स्थिति' : 'Cashbook Financial Overview'}
              </h3>
              <button
                onClick={() => setCurrentPage(Page.CASHBOOK_MANAGEMENT, CashbookTab.CASHBOOK_REPORT)}
                className="text-xs font-extrabold text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isHindi ? 'कैशबुक विस्तृत रिपोर्ट देखें' : 'View Full Cashbook'}</span>
                <span>→</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-emerald-900 text-white p-5 rounded-2xl border border-emerald-700 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                    {isHindi ? 'कुल आय (INCOME)' : 'Total Income'}
                  </p>
                  <p className="text-xs text-emerald-300/80 font-medium">
                    {isHindi ? 'आय वाउचर कुल जमा' : 'Total Revenue Collected'}
                  </p>
                  <p className="text-2xl font-black text-emerald-300 mt-1">{formatCurrency(cashbookStats.totalIncome)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold text-xl shrink-0">
                  📈
                </div>
              </div>

              <div className="bg-rose-900 text-white p-5 rounded-2xl border border-rose-700 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                    {isHindi ? 'कुल व्यय (EXPENDITURE)' : 'Total Expenditure'}
                  </p>
                  <p className="text-xs text-rose-300/80 font-medium">
                    {isHindi ? 'व्यय वाउचर कुल भुगतान' : 'Total Expenditure Paid'}
                  </p>
                  <p className="text-2xl font-black text-rose-300 mt-1">{formatCurrency(cashbookStats.totalExpenditure)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-800 text-rose-200 flex items-center justify-center font-bold text-xl shrink-0">
                  📉
                </div>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-700 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {isHindi ? 'कुल अवशेष (NET BALANCE)' : 'Net Balance'}
                  </p>
                  <p className="text-xs text-slate-300 font-medium">
                    {isHindi ? 'प्रारंभिक + आय - व्यय' : 'Opening + Income - Expenditure'}
                  </p>
                  <p className="text-2xl font-black text-white mt-1">{formatCurrency(cashbookStats.netBalance)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-xl shrink-0">
                  💰
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isHindi ? 'रोकड़ व बैंक स्थिति' : 'Cash & Bank Balance'}
                  </p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-semibold">💵 {isHindi ? 'नकद हस्तस्थ:' : 'Cash in Hand:'}</span>
                      <span className="font-black text-emerald-700">{formatCurrency(cashbookStats.cashInHand)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-semibold">🏦 {isHindi ? 'बैंक खाता शेष:' : 'Bank Balance:'}</span>
                      <span className="font-black text-blue-700">{formatCurrency(cashbookStats.bankBalance)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MODULE ACTION CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MODULE 1 CARD */}
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white rounded-2xl p-5 shadow-lg border-2 border-emerald-500 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-emerald-500/30 border border-emerald-400/50 rounded-full text-[11px] font-black text-emerald-200 uppercase">
                    {isHindi ? 'मॉड्यूल 1 • मुख्य कर प्रणाली' : 'MODULE 1 • TAXATION'}
                  </span>
                  <span className="text-3xl">🏛️</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  {isHindi ? 'Taxation Module (कर प्रबंधन)' : 'Taxation Module'}
                </h3>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  {isHindi 
                    ? 'हितग्राही पंजीयन, कर दर निर्धारण, कर मांग पत्र निर्माण, डिजिटल कर रसीद संग्रह एवं करवार रिपोर्ट।' 
                    : 'Taxpayer registration, tax rate master, bill generation, payment collection & reports.'}
                </p>
              </div>
              
              <div className="mt-4 pt-3 border-t border-emerald-700/60 flex items-center justify-between">
                <button
                  onClick={() => setDashboardModule('TAXATION')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>{isHindi ? 'कर प्रबंधन मॉड्यूल खोलें' : 'Open Taxation Module'}</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => setCurrentPage(Page.TAX_RECEIPT_MANAGEMENT)}
                  className="px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-bold text-xs rounded-xl border border-emerald-600 transition-all cursor-pointer"
                >
                  💳 {isHindi ? 'कर रसीद' : 'Receipts'}
                </button>
              </div>
            </div>

            {/* MODULE 2 CARD */}
            <div className="bg-gradient-to-br from-amber-950 via-amber-900 to-slate-950 text-white rounded-2xl p-5 shadow-lg border-2 border-amber-500 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-amber-500/30 border border-amber-400/50 rounded-full text-[11px] font-black text-amber-200 uppercase">
                    {isHindi ? 'मॉड्यूल 2 • नवीन कैशबुक' : 'MODULE 2 • CASHBOOK'}
                  </span>
                  <span className="text-3xl">📗</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  {isHindi ? 'Cashbook Module (कैशबुक रोकड़ बही)' : 'Cashbook Module'}
                </h3>
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  {isHindi 
                    ? 'खाता शीर्षक निर्माण, वेंडर प्रबंधन, कार्य प्रबंधन, आय-व्यय वाउचर प्रविष्टि एवं रोकड़ बही (Cashbook) लेजर रिपोर्ट।' 
                    : 'Account head creation, vendor management, work management, vouchers & cashbook report.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-700/60 flex items-center justify-between">
                <button
                  onClick={() => setDashboardModule('CASHBOOK')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>{isHindi ? 'कैशबुक मॉड्यूल खोलें' : 'Open Cashbook Module'}</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => setCurrentPage(Page.CASHBOOK_MANAGEMENT, CashbookTab.CASHBOOK_REPORT)}
                  className="px-3 py-2 bg-amber-800 hover:bg-amber-700 text-amber-100 font-bold text-xs rounded-xl border border-amber-600 transition-all cursor-pointer"
                >
                  📖 {isHindi ? 'रोकड़ बही रिपोर्ट' : 'Cashbook Ledger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: TAXATION MODULE (SHOWS WHEN TAXATION TAB IS CLICKED OR NAVIGATED TO) */}
      {(dashboardModule === 'TAXATION') && (
        <div className="space-y-6">
          {/* TAXATION OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isHindi ? 'कुल पंजीकृत' : 'Total Registered'}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  {isHindi ? 'पंजीकृत परिवार / करदाता' : 'Registered Taxpayers'}
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">{grandTotals.totalRegistered}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
                👥
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isHindi ? 'कुल कर मांग' : 'Total Tax Demand'}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  {isHindi ? 'जारी कुल मांग राशि' : 'Total Charges Issued'}
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(grandTotals.totalCharged)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl shrink-0">
                🧾
              </div>
            </div>

            <div className="bg-emerald-50/90 p-5 rounded-2xl border-2 border-emerald-300 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                  {isHindi ? 'कुल प्राप्त कर राशि' : 'TOTAL RECEIVED AMOUNT'}
                </p>
                <p className="text-xs text-emerald-700 font-bold">
                  {isHindi ? 'समस्त कर - कुल प्राप्त राशि' : 'All Taxes Collected'}
                </p>
                <p className="text-2xl font-black text-emerald-800 mt-1">{formatCurrency(grandTotals.totalReceived)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                ✓
              </div>
            </div>

            <div className="bg-rose-50/90 p-5 rounded-2xl border-2 border-rose-300 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-rose-900 uppercase tracking-wider">
                  {isHindi ? 'कुल बकाया कर राशि' : 'TOTAL PENDING AMOUNT'}
                </p>
                <p className="text-xs text-rose-700 font-bold">
                  {isHindi ? 'समस्त कर - कुल बकाया राशि' : 'All Taxes Outstanding'}
                </p>
                <p className="text-2xl font-black text-rose-800 mt-1">{formatCurrency(grandTotals.totalPending)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                ⏳
              </div>
            </div>
          </div>






          {/* 3. TAX-WISE BREAKDOWN TABLE & GRAND TOTALS */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {isHindi ? 'करवार प्राप्त एवं बकाया विवरण' : 'Tax-Wise Revenue & Dues Breakdown'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isHindi ? 'प्रत्येक कर प्रकार अनुसार पंजीकृत हितग्राही, कुल मांग, कुल प्राप्त राशि एवं कुल बकाया राशि' : 'Registered taxpayers, total demand, total collected and pending amounts per tax category'}
                </p>
              </div>
              <button
                onClick={() => setCurrentPage(Page.TAX_RECEIPT_MANAGEMENT)}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm self-start sm:self-auto shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <span>💳 {isHindi ? 'कर भुगतान स्वीकार करें' : 'Collect Payment'}</span>
              </button>
            </div>

            {/* DESKTOP TABLE */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100/80">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {isHindi ? 'कर का प्रकार (Tax Category)' : 'Tax Category'}
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {isHindi ? 'पंजीकृत हितग्राही' : 'Taxpayers'}
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {isHindi ? 'कुल मांग राशि' : 'Total Demand'}
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50/50">
                      {isHindi ? 'प्राप्त राशि (Collected)' : 'Collected'}
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-rose-700 uppercase tracking-wider bg-rose-50/50">
                      {isHindi ? 'बकाया राशि (Pending)' : 'Pending'}
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {isHindi ? 'वसूली प्रतिशत' : 'Recovery %'}
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {isHindi ? 'कार्य' : 'Action'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {taxWiseStats.map((item) => (
                    <tr key={item.taxType} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900">
                        {item.taxType}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center font-semibold text-slate-700">
                        {item.registeredBeneficiariesCount}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-slate-800">
                        {formatCurrency(item.charged)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-black text-emerald-700 bg-emerald-50/30">
                        {formatCurrency(item.received)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-black text-rose-700 bg-rose-50/30">
                        {formatCurrency(item.pending)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-emerald-600 h-2 rounded-full" 
                              style={{ width: `${item.collectionPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600">{item.collectionPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <button
                          onClick={() => setCurrentPage(Page.TAX_RECEIPT_MANAGEMENT)}
                          className="text-xs font-bold text-primary hover:bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200 transition-colors cursor-pointer"
                        >
                          {isHindi ? 'प्राप्त करें' : 'Collect'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black divide-y divide-slate-800 border-t-2 border-slate-900">
                  <tr>
                    <td className="px-4 py-4 text-left text-sm uppercase tracking-wide text-amber-400">
                      {isHindi ? 'समस्त करों का कुल योग (GRAND TOTAL)' : 'GRAND TOTAL'}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-200">
                      {grandTotals.totalRegistered}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-200">
                      {formatCurrency(grandTotals.totalCharged)}
                    </td>
                    <td className="px-4 py-4 text-right text-base text-emerald-400 bg-emerald-950/60">
                      {formatCurrency(grandTotals.totalReceived)}
                    </td>
                    <td className="px-4 py-4 text-right text-base text-rose-400 bg-rose-950/60">
                      {formatCurrency(grandTotals.totalPending)}
                    </td>
                    <td className="px-4 py-4 text-center text-xs text-slate-300">
                      {grandTotals.overallPercent}%
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-400">
                      {isHindi ? 'सारांश' : 'Summary'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* MOBILE RESPONSIVE CARDS */}
            <div className="block sm:hidden divide-y divide-slate-200">
              {taxWiseStats.map((item) => (
                <div key={item.taxType} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{item.taxType}</span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border">
                      {item.registeredBeneficiariesCount} {isHindi ? 'पंजीकृत' : 'Registered'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">{isHindi ? 'कुल मांग' : 'Total Demand'}</span>
                      <span className="font-bold text-slate-800">{formatCurrency(item.charged)}</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                      <span className="block text-[10px] text-emerald-700 uppercase font-bold">{isHindi ? 'प्राप्त' : 'Received'}</span>
                      <span className="font-black text-emerald-800">{formatCurrency(item.received)}</span>
                    </div>
                    <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                      <span className="block text-[10px] text-rose-700 uppercase font-bold">{isHindi ? 'बकाया' : 'Pending'}</span>
                      <span className="font-black text-rose-800">{formatCurrency(item.pending)}</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-slate-900 text-white space-y-2">
                <p className="text-xs font-black uppercase text-amber-400">
                  {isHindi ? 'समस्त करों का कुल योग (GRAND TOTAL)' : 'GRAND TOTAL OF ALL TAXES'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                  <div className="bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-800">
                    <span className="block text-[10px] text-emerald-300 font-bold uppercase">{isHindi ? 'कुल प्राप्त' : 'TOTAL RECEIVED'}</span>
                    <span className="font-black text-base text-emerald-400">{formatCurrency(grandTotals.totalReceived)}</span>
                  </div>
                  <div className="bg-rose-950/80 p-2.5 rounded-xl border border-rose-800">
                    <span className="block text-[10px] text-rose-300 font-bold uppercase">{isHindi ? 'कुल बकाया' : 'TOTAL PENDING'}</span>
                    <span className="font-black text-base text-rose-400">{formatCurrency(grandTotals.totalPending)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: CASHBOOK MODULE */}
      {(dashboardModule === 'CASHBOOK') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-900 text-white p-5 rounded-2xl border border-emerald-700 shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                  {isHindi ? 'कुल आय (INCOME)' : 'Total Income'}
                </p>
                <p className="text-2xl font-black text-emerald-300 mt-1">{formatCurrency(cashbookStats.totalIncome)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold text-xl shrink-0">
                📈
              </div>
            </div>

            <div className="bg-rose-900 text-white p-5 rounded-2xl border border-rose-700 shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                  {isHindi ? 'कुल व्यय (EXPENDITURE)' : 'Total Expenditure'}
                </p>
                <p className="text-2xl font-black text-rose-300 mt-1">{formatCurrency(cashbookStats.totalExpenditure)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-800 text-rose-200 flex items-center justify-center font-bold text-xl shrink-0">
                📉
              </div>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-700 shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {isHindi ? 'कुल अवशेष (NET BALANCE)' : 'Net Balance'}
                </p>
                <p className="text-2xl font-black text-white mt-1">{formatCurrency(cashbookStats.netBalance)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-xl shrink-0">
                💰
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isHindi ? 'कुल पंजीकृत वाउचर' : 'Total Vouchers'}
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">{cashbookStats.vouchersCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xl shrink-0">
                📝
              </div>
            </div>
          </div>

          {/* ACCOUNT HEAD SUMMARY TABLE ON DASHBOARD */}
          {(() => {
            const headStatsMap: Record<string, { income: number; expenditure: number; balance: number }> = {};
            accountHeads.forEach((h) => {
              headStatsMap[h.id] = { income: 0, expenditure: 0, balance: Number(h.openingBalance || 0) };
            });
            vouchers.forEach((v) => {
              if (!headStatsMap[v.headId]) {
                headStatsMap[v.headId] = { income: 0, expenditure: 0, balance: 0 };
              }
              const amt = Number(v.amount || 0);
              if (v.voucherType === 'INCOME') {
                headStatsMap[v.headId].income += amt;
                headStatsMap[v.headId].balance += amt;
              } else {
                headStatsMap[v.headId].expenditure += amt;
                headStatsMap[v.headId].balance -= amt;
              }
            });

            const totalOpening = accountHeads.reduce((s, h) => s + Number(h.openingBalance || 0), 0);
            const totalIncome = cashbookStats.totalIncome;
            const totalExpenditure = cashbookStats.totalExpenditure;
            const totalAvailable = totalOpening + totalIncome - totalExpenditure;

            return (
              <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span>🏛️</span>
                      <span>{isHindi ? 'खाता शीर्षक-वार बजट, आय-व्यय एवं उपलब्ध शेष' : 'Account Head Wise Budget & Available Balance'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isHindi ? 'समस्त खाता शीर्षकों का विवरण एवं कॉलम योग' : 'Account heads opening balance, income, expenditure and available balance'}
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentPage(Page.CASHBOOK_MANAGEMENT, CashbookTab.ACCOUNT_HEADS)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all"
                  >
                    + {isHindi ? 'खाता शीर्षक जोड़ें' : 'Manage Heads'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black uppercase text-[11px]">
                      <tr>
                        <th className="p-2.5 border-r border-slate-200 text-center w-10">#</th>
                        <th className="p-2.5 border-r border-slate-200">{isHindi ? 'खाता शीर्षक नाम/कोड' : 'Head Name & Code'}</th>
                        <th className="p-2.5 border-r border-slate-200 text-center">{isHindi ? 'प्रकार' : 'Type'}</th>
                        <th className="p-2.5 border-r border-slate-200 text-right">{isHindi ? 'प्रारंभिक शेष (Opening)' : 'Opening Bal'}</th>
                        <th className="p-2.5 border-r border-slate-200 text-right">{isHindi ? 'कुल आय (+ Income)' : 'Total Income (+)'}</th>
                        <th className="p-2.5 border-r border-slate-200 text-right">{isHindi ? 'कुल व्यय (- Expense)' : 'Total Expense (-)'}</th>
                        <th className="p-2.5 text-right">{isHindi ? 'उपलब्ध शेष (Available Bal)' : 'Available Bal'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                      {accountHeads.map((h, idx) => {
                        const stats = headStatsMap[h.id] || { income: 0, expenditure: 0, balance: Number(h.openingBalance || 0) };
                        return (
                          <tr key={h.id} className="hover:bg-slate-50">
                            <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 border-r border-slate-200">
                              <p className="font-bold text-slate-900">{h.name}</p>
                              {h.code && <p className="text-[10px] text-slate-500 font-mono">Code: {h.code}</p>}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-center">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold">
                                {h.type}
                              </span>
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono text-slate-700 font-bold">
                              ₹{Number(h.openingBalance || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono text-emerald-700 font-bold">
                              +₹{stats.income.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono text-rose-700 font-bold">
                              -₹{stats.expenditure.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-right font-mono text-primary font-black">
                              ₹{stats.balance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                      {accountHeads.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 font-semibold">
                            {isHindi ? 'कोई खाता शीर्षक दर्ज नहीं है।' : 'No account heads registered.'}
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
                          ₹{totalOpening.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-right font-mono font-black text-emerald-800">
                          +₹{totalIncome.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-right font-mono font-black text-rose-800">
                          -₹{totalExpenditure.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-primary text-sm">
                          ₹{totalAvailable.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}


        </div>
      )}
    </div>
  );









  const renderFamilyDetails = () => {
    if (!selectedFamily) return null;

    const familyTaxes = taxes.filter(t => t.familyId === selectedFamily.id);
    const familyPayments = payments.filter(p => p.familyId === selectedFamily.id);
    const rawCharged = familyTaxes.reduce((sum, t) => sum + t.amount, 0);
    const totalPenalties = familyPayments.reduce((sum, p) => sum + (p.penalty || 0), 0);
    const totalConcessions = familyPayments.reduce((sum, p) => sum + (p.concession || 0), 0);
    const totalCharged = rawCharged + totalPenalties - totalConcessions;
    const totalPaid = familyPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDues = Math.max(0, totalCharged - totalPaid);

    // Filter pending tax vouchers (taxes not yet paid or partially paid)
    const pendingTaxes = familyTaxes.filter(t => t.status !== 'PAID');
    const selectedVouchersTotal = familyTaxes
      .filter(t => selectedVoucherIds.includes(t.id))
      .reduce((sum, t) => sum + t.amount, 0);

    const handleToggleVoucher = (taxId: string) => {
      setSelectedVoucherIds(prev =>
        prev.includes(taxId) ? prev.filter(id => id !== taxId) : [...prev, taxId]
      );
    };

    const handleSelectAllPending = () => {
      if (selectedVoucherIds.length === pendingTaxes.length) {
        setSelectedVoucherIds([]);
      } else {
        setSelectedVoucherIds(pendingTaxes.map(t => t.id));
      }
    };

    const handleRegisterSelectedVouchersPayment = () => {
      if (selectedVoucherIds.length === 0 && pendingTaxes.length > 0) {
        // Default to all pending if none explicitly checked
        setSelectedVoucherIds(pendingTaxes.map(t => t.id));
      }
      setModalContent('payment');
      setIsModalOpen(true);
    };

    const handlePrintCard = () => {
      try {
        triggerPrint('printable-area');
      } catch (err) {
        console.error('Print member card failed:', err);
      }
    };

    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in max-w-7xl space-y-6">
        {/* VIEW HEADER WITH QUICK ACTIONS */}
        <ViewHeader
          title={`Member Profile: ${selectedFamily.name} ${selectedFamily.surname}`}
          subtitle={`Samagra ID: ${selectedFamily.samagraId} | Ward ${selectedFamily.wardNo || '01'}, ${selectedFamily.muhalla || ''}`}
          onBack={() => setCurrentPage(Page.BENEFICIARY_MANAGEMENT)}
          onClose={() => setCurrentPage(Page.DASHBOARD)}
          actionButton={
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleRegisterSelectedVouchersPayment}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>💳</span> Register Due Payment ({selectedVoucherIds.length > 0 ? `₹${selectedVouchersTotal}` : 'All Pending'})
              </button>
              <button
                onClick={handlePrintCard}
                className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-sm border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PrinterIcon /> Print Member Card
              </button>
            </div>
          }
        />

        {/* ---------------- PENDING TAX VOUCHERS REGISTRATION CARD (INTERACTIVE) ---------------- */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-md border-2 border-amber-300 print:hidden space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 border-amber-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎟️</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {isHindi ? 'भुगतान दर्ज करने हेतु बकाया कर वाउचर चुनें' : 'Select Pending Tax Vouchers to Register Payment'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Check pending demand vouchers below to clear dues for {selectedFamily.name} {selectedFamily.surname}.
              </p>
            </div>

            {pendingTaxes.length > 0 && (
              <button
                onClick={handleSelectAllPending}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {selectedVoucherIds.length === pendingTaxes.length ? '✓ Deselect All' : '☑️ Select All Pending'}
              </button>
            )}
          </div>

          {pendingTaxes.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingTaxes.map((tax) => {
                  const isChecked = selectedVoucherIds.includes(tax.id);
                  const voucherNo = tax.billNo || `VOUCH-${tax.id.slice(-6).toUpperCase()}`;

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
                        onChange={() => {}} // Handled by parent container onClick
                        className="mt-1 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{tax.type}</span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border">
                            {voucherNo}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 mt-1 flex justify-between">
                          <span>Month: {getMonthName(tax.month)}, {tax.year}</span>
                          <span className="font-mono font-black text-amber-700">₹{tax.amount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
                          <span>Due Date: {formatDateDDMMYYYY(tax.dueDate || `${tax.year}-07-31`)}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                            UNPAID
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
                  <span>Selected Vouchers: <strong className="text-amber-900">{selectedVoucherIds.length}</strong></span>
                  <span className="mx-2">|</span>
                  <span>Total Due Amount: <strong className="text-emerald-700 font-mono text-sm">₹{selectedVouchersTotal.toLocaleString('en-IN')}</strong></span>
                </div>

                <button
                  onClick={handleRegisterSelectedVouchersPayment}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>💳</span> Clear Selected Vouchers (₹{selectedVouchersTotal.toLocaleString('en-IN')})
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-bold">
              🎉 Great news! All tax demand vouchers for this member are fully paid.
            </div>
          )}
        </div>

        {/* ---------------- OFFICIAL PRINTABLE MEMBER CARD & LEDGER ---------------- */}
        <div id="printable-area" className="p-6 sm:p-8 bg-white rounded-2xl shadow-lg border-2 border-primary-200 space-y-6">
          {/* PRINT CARD LETTERHEAD */}
          <header className="flex flex-col sm:flex-row justify-between items-start border-b-2 pb-4 border-dashed border-primary-300 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-primary">{getCleanOfficeTitle(currentOfficeDetails, loggedInAdmin?.gramPanchayat)}</h2>
              <p className="text-xs text-slate-600 font-bold">हितग्राही संपत्ति, कराधान एवं बकाया भुगतान रिपोर्ट कार्ड</p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-600 space-y-1 font-mono">
              <p><strong>Card Date:</strong> {formatDateDDMMYYYY(new Date())}</p>
              <p><strong>Document ID:</strong> CARD-{selectedFamily.samagraId.slice(-6)}-{new Date().getFullYear()}</p>
            </div>
          </header>

          {/* MEMBER & FINANCIAL SUMMARY GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1 mb-3 text-primary">
                {isHindi ? '1. हितग्राही व्यक्तिगत विवरण' : '1. Member Personal Profile'}
              </h3>
              <div className="text-xs space-y-2 text-slate-700">
                <p><span className="font-bold w-32 inline-block">{isHindi ? 'मुखिया का नाम:' : 'Head Name:'}</span> <strong className="text-slate-900">{selectedFamily.name} {selectedFamily.surname}</strong></p>
                <p><span className="font-bold w-32 inline-block">{isHindi ? 'पिता/पति का नाम:' : 'Father/Husband Name:'}</span> {selectedFamily.guardianName}</p>
                <p><span className="font-bold w-32 inline-block">{isHindi ? 'श्रेणी:' : 'Category:'}</span> <span className="font-bold text-amber-800 px-2 py-0.5 bg-amber-100 rounded">{selectedFamily.category || 'APL'}</span></p>
                <p><span className="font-bold w-32 inline-block">Samagra ID:</span> <span className="font-mono font-bold">{selectedFamily.samagraId}</span></p>
                <p><span className="font-bold w-32 inline-block">Family ID:</span> <span className="font-mono">{selectedFamily.familyId || 'N/A'}</span></p>
                <p><span className="font-bold w-32 inline-block">{isHindi ? 'पंजीयन तिथि:' : 'Registration Date:'}</span> <span className="font-bold text-slate-800">📅 {formatDateDDMMYYYY(selectedFamily.registrationDate) || 'N/A'}</span></p>
                <p><span className="font-bold w-32 inline-block">{isHindi ? 'वार्ड एवं मोहल्ला:' : 'Ward & Muhalla:'}</span> Ward {selectedFamily.wardNo || '01'}, {selectedFamily.muhalla || 'N/A'}</p>
                <p><span className="font-bold w-32 inline-block">{isHindi ? 'मोबाइल नंबर:' : 'Mobile Contact:'}</span> {selectedFamily.mobile}</p>
              </div>
            </div>

            <div className="bg-primary-50/80 p-4 rounded-xl border border-primary-200 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-primary-900 uppercase tracking-wider border-b pb-1 mb-3 border-primary-200">
                  {isHindi ? '2. वित्तीय स्थिति सारांश' : '2. Financial Dues Summary'}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center mt-2">
                  <div className="bg-white p-3 rounded-xl border border-primary-100">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{isHindi ? 'कुल मांग' : 'TOTAL CHARGED'}</p>
                    <p className="font-black text-xl text-amber-700 font-mono mt-0.5">{formatCurrency(totalCharged)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-primary-100">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{isHindi ? 'कुल प्राप्त' : 'TOTAL PAID'}</p>
                    <p className="font-black text-xl text-emerald-700 font-mono mt-0.5">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border-2 border-rose-300 mt-3 text-center">
                <p className="text-xs text-slate-600 font-bold uppercase">{isHindi ? 'कुल शेष बकाया राशि' : 'NET OUTSTANDING DUES'}</p>
                <p className="text-2xl font-black text-rose-700 font-mono mt-0.5">{formatCurrency(totalDues)}</p>
              </div>
            </div>
          </div>

          {/* ITEMISED TAX DEMAND VOUCHERS TABLE */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 mb-2">
              {isHindi ? '3. कर मांग पत्र विवरण' : '3. Tax Demand Vouchers'}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-200 border border-slate-200 rounded-lg">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">Voucher No</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">Month/Year</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">Tax Type</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-600 uppercase">Amount (₹)</th>
                    <th className="px-3 py-2 text-center font-bold text-slate-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {familyTaxes.map((tax) => {
                    const voucherNo = tax.billNo || `VOUCH-${tax.id.slice(-6).toUpperCase()}`;
                    return (
                      <tr key={tax.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-slate-600">{voucherNo}</td>
                        <td className="px-3 py-2 font-medium">{getMonthName(tax.month)}, {tax.year}</td>
                        <td className="px-3 py-2 font-bold text-slate-800">{tax.type}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(tax.amount)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            tax.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {tax.status || 'UNPAID'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {familyTaxes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-xs text-slate-400">No tax demands billed yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ITEMISED PAYMENTS RECEIVED TABLE */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 mb-2">
              {isHindi ? '4. प्राप्त शुल्क रसीद विवरण' : '4. Payment Receipts Received'}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-200 border border-slate-200 rounded-lg">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">Receipt No</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">Date</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase">Payment Mode</th>
                    <th className="px-3 py-2 text-right font-bold text-emerald-800 uppercase">Amount Paid (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {familyPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-bold text-primary">{payment.receiptNo || payment.id}</td>
                      <td className="px-3 py-2 text-slate-600">{formatDateDDMMYYYY(payment.date)}</td>
                      <td className="px-3 py-2 font-semibold text-slate-700">{payment.mode || 'CASH'}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                  {familyPayments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-xs text-slate-400">No payment receipts recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* OFFICIAL STAMP & SIGNATURE FOOTER FOR PRINT */}
          <div className="pt-6 border-t-2 border-slate-200 flex justify-between items-end text-[11px] text-slate-600">
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[9px] text-slate-400 font-mono">
                [ पंचायत मुहर ]
              </div>
              <span className="block mt-1 font-bold">ग्राम पंचायत सील</span>
            </div>

            <div className="text-center space-y-6">
              <div className="border-b-2 border-slate-400 w-40 mx-auto"></div>
              <div>
                <p className="font-bold text-slate-900 text-xs">ग्राम पंचायत सचिव / सरपंच</p>
                <p className="text-[10px] text-slate-500">{loggedInAdmin?.gramPanchayat}</p>
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
            <PrinterIcon /> {isHindi ? 'सदस्य पहचान पत्र एवं लेजर प्रिंट करें' : 'Print Member Card & Dues Ledger'}
          </button>
        </div>
      </div>
    );
  };

  // --- RENDER ROUTER LOGIC ---
  const renderContent = () => {
    // DEVELOPER PORTAL ROUTE (Accessible directly via Developer Login)
    if (currentPage === Page.DEVELOPER_PORTAL) {
      if (isDeveloperLoggedIn) {
        return (
          <DeveloperPortal
            isHindi={isHindi}
            developerProfile={developerProfile}
            setDeveloperProfile={setDeveloperProfile}
            adminList={adminList}
            setAdminList={setAdminList}
            subscriptions={subscriptions}
            setSubscriptions={setSubscriptions}
            subscriptionPlans={subscriptionPlans}
            setSubscriptionPlans={setSubscriptionPlans}
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            complaints={complaints}
            setComplaints={setComplaints}
            onLogoutDeveloper={handleDeveloperLogout}
          />
        );
      } else {
        return renderDeveloperLoginView();
      }
    }

    if (!loggedInAdmin) {
      switch (currentPage) {
        case Page.ADMIN_REGISTRATION:
          return renderAdminRegistration();
        case Page.LOGIN:
          return renderLoginPage();
        case Page.DASHBOARD:
        default:
          return renderPublicHomeView();
      }
    }

    switch (currentPage) {
      case Page.DASHBOARD:
        return renderDashboard();
      case Page.MANAGE_PROFILE:
        return (
          <ManageProfileView
            admin={loggedInAdmin}
            onUpdateAdmin={handleUpdateAdmin}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.MANAGE_TAX_RATES:
        return (
          <ManageTaxRatesView
            taxRates={taxRates}
            isTaxRatesLocked={isTaxRatesLocked}
            taxRatesLockInfo={taxRatesLockInfo}
            onUpdateTaxRates={handleUpdateTaxRates}
            onToggleLockTaxRates={handleToggleLockTaxRates}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.BENEFICIARY_MANAGEMENT:
        return (
          <BeneficiaryManagementView
            families={currentFamilies}
            taxes={currentTaxes}
            payments={currentPayments}
            officeDetails={currentOfficeDetails}
            admin={loggedInAdmin}
            onAddFamily={handleRegisterFamily}
            onAddFamiliesBatch={handleRegisterFamiliesBatch}
            onDeleteFamiliesBatch={handleDeleteFamiliesBatch}
            onUpdateFamily={handleUpdateFamily}
            onDeleteFamily={handleDeleteFamily}
            onSelectFamily={handleViewFamily}
            onIssueTax={(fam) => setCurrentPage(Page.TAX_ISSUE_MANAGEMENT)}
            onReceivePayment={(fam) => {
              setSelectedFamily(fam);
              setModalContent('payment');
              setIsModalOpen(true);
            }}
            onOpenMemberCard={(fam) => {
              if (fam) setSelectedFamily(fam);
              setCurrentPage(Page.MEMBER_CARD);
            }}
            onToggleLockFamily={handleToggleLockFamily}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            autoOpenAddModal={autoOpenBeneficiaryModal}
            onResetAutoOpenModal={() => setAutoOpenBeneficiaryModal(false)}
            isHindi={isHindi}
          />
        );
      case Page.TAX_BENEFICIARY_LIST:
        return (
          <TaxBeneficiaryListView
            families={currentFamilies}
            taxBeneficiaryLists={taxBeneficiaryLists}
            onUpdateTaxBeneficiaryList={handleUpdateTaxBeneficiaryList}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.TAX_ISSUE_MANAGEMENT:
        return (
          <TaxIssueManagementView
            taxes={currentTaxes}
            payments={currentPayments}
            families={currentFamilies}
            taxRates={taxRates}
            taxRatesLockInfo={taxRatesLockInfo}
            taxBeneficiaryLists={taxBeneficiaryLists}
            onUpdateTaxBeneficiaryList={handleUpdateTaxBeneficiaryList}
            onIssueTax={handleIssueTax}
            onBatchIssueTaxes={handleBatchIssueTaxes}
            onModifyTax={handleModifyBill}
            onDeleteTax={handleDeleteTax}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.TAX_RECEIPT_MANAGEMENT:
        return (
          <TaxReceiptManagementView
            payments={currentPayments}
            families={currentFamilies}
            taxes={currentTaxes}
            admin={loggedInAdmin}
            officeDetails={currentOfficeDetails}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.DEMAND_NOTICE:
        return (
          <DemandNoticeView
            families={currentFamilies}
            taxes={currentTaxes}
            officeDetails={currentOfficeDetails}
            admin={loggedInAdmin}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.BOOKING_RENT:
        return (
          <BookingRentView
            bookingList={bookingRents}
            families={currentFamilies}
            officeDetails={currentOfficeDetails}
            onCreateBooking={handleCreateBookingRent}
            onDeleteBooking={handleDeleteBookingRent}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.BUILDING_PERMISSION:
        return (
          <BuildingPermissionView
            permissionList={buildingPermissions}
            families={currentFamilies}
            officeDetails={currentOfficeDetails}
            onCreatePermission={handleCreateBuildingPermission}
            onDeletePermission={handleDeleteBuildingPermission}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.MANAGE_OFFICE:
        return (
          <ManageOfficeView
            officeDetails={currentOfficeDetails}
            onUpdateOfficeDetails={(updated) => {
              setOfficeDetails(updated);
              saveOfficeDetailsToSupabase(updated, loggedInAdmin?.id, loggedInAdmin?.gramPanchayat);
            }}
            admin={loggedInAdmin}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.TAX_REPORT:
        return (
          <TaxReportView
            taxes={currentTaxes}
            payments={currentPayments}
            families={currentFamilies}
            admin={loggedInAdmin}
            officeDetails={currentOfficeDetails}
            onSelectFamily={handleViewFamily}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.MEMBER_CARD:
      case Page.FAMILY_DETAILS:
        return (
          <MemberCardView
            families={currentFamilies}
            taxes={currentTaxes}
            payments={currentPayments}
            bookingRents={bookingRents}
            buildingPermissions={buildingPermissions}
            officeDetails={currentOfficeDetails}
            admin={loggedInAdmin}
            initialFamilyId={selectedFamily?.id}
            onSelectFamily={handleViewFamily}
            onReceivePayment={(fam, selectedTaxIds) => {
              setSelectedFamily(fam);
              if (selectedTaxIds && selectedTaxIds.length > 0) {
                setSelectedVoucherIds(selectedTaxIds);
              }
              setModalContent('payment');
              setIsModalOpen(true);
            }}
            onBack={() => setCurrentPage(Page.BENEFICIARY_MANAGEMENT)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
            isHindi={isHindi}
          />
        );
      case Page.CASHBOOK_MANAGEMENT:
        return (
          <CashbookManagementView
            isHindi={isHindi}
            initialTab={cashbookTab}
            accountHeads={accountHeads}
            vendors={vendors}
            works={works}
            vouchers={vouchers}
            families={currentFamilies}
            payments={currentPayments}
            subHeads={subHeads}
            officeDetails={officeDetails}
            onAddAccountHead={handleAddAccountHead}
            onUpdateAccountHead={handleUpdateAccountHead}
            onDeleteAccountHead={handleDeleteAccountHead}
            onAddSubHead={handleAddSubHead}
            onDeleteSubHead={handleDeleteSubHead}
            onAddVendor={handleAddVendor}
            onDeleteVendor={handleDeleteVendor}
            onAddWork={handleAddWork}
            onUpdateWork={handleUpdateWork}
            onDeleteWork={handleDeleteWork}
            onAddVoucher={handleAddVoucher}
            onDeleteVoucher={handleDeleteVoucher}
            onBack={() => setCurrentPage(Page.DASHBOARD)}
            onClose={() => setCurrentPage(Page.DASHBOARD)}
          />
        );
      case Page.COMPLAINTS_SUGGESTIONS:
        return (
          <ComplaintSuggestionView
            isHindi={isHindi}
            loggedInAdmin={loggedInAdmin}
            complaints={complaints}
            onSubmitComplaint={async (newComplaint) => {
              const item: ComplaintQuery = {
                id: `comp-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                status: 'PENDING',
                ...newComplaint,
              };
              setComplaints((prev) => [item, ...prev]);
              const success = await saveComplaintToSupabase(item);
              if (success) {
                showToast(
                  isHindi
                    ? '✅ आपकी शिकायत / सुझाव बैकएंड डेटाबेस (Supabase) में सफलतापूर्वक दर्ज हो गया है!'
                    : '✅ Your complaint / suggestion has been saved to the backend database successfully!',
                  'success'
                );
              } else {
                showToast(
                  isHindi
                    ? '⚠️ आपकी शिकायत लोकल में सेव हुई (डेटाबेस सिंक पेंडिंग)।'
                    : '⚠️ Saved locally. Database sync pending.',
                  'warning'
                );
              }
            }}
          />
        );
      case Page.SUBSCRIPTIONS:
        return (
          <UserSubscriptionView
            isHindi={isHindi}
            loggedInAdmin={loggedInAdmin}
            developerProfile={developerProfile}
            subscriptionPlans={subscriptionPlans}
            subscriptions={subscriptions}
            currentSubscription={subscriptions.find(
              (s) => s.adminId === loggedInAdmin?.id || s.gramPanchayat === loggedInAdmin?.gramPanchayat
            )}
            onRequestSubscription={async (plan, notes) => {
              if (!loggedInAdmin) return;
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + (plan.periodDays || 30));
              const subItem: Subscription = {
                id: `sub-${Date.now()}`,
                adminId: loggedInAdmin.id,
                gramPanchayat: loggedInAdmin.gramPanchayat,
                officerName: loggedInAdmin.name,
                planType: plan.period === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
                planName: plan.name,
                startDate: new Date().toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                amount: plan.amount,
                status: 'SUBSCRIBED',
                notes: notes || '',
              };
              setSubscriptions((prev) => [subItem, ...prev.filter((s) => s.adminId !== loggedInAdmin.id)]);
              const success = await saveSubscriptionToSupabase(subItem);
              if (success) {
                showToast(
                  isHindi
                    ? `✅ आपकी ${plan.name} सदस्यता योजना बैकएंड डेटाबेस (Supabase) में सफलतापूर्वक एक्टिवेट व सेव हो गई है!`
                    : `✅ Subscription plan ${plan.name} activated and saved to backend database successfully!`,
                  'success'
                );
              } else {
                showToast(
                  isHindi
                    ? '⚠️ सब्स्क्रिप्शन लोकल में एक्टिवेट हुआ (डेटाबेस सिंक विफल)।'
                    : '⚠️ Subscription activated locally, database sync failed.',
                  'warning'
                );
              }
            }}
          />
        );
      default:
        return renderDashboard();
    }
  };

  const renderModal = () => {
    if (!isModalOpen || !selectedFamily) return null;

    if (modalContent === 'payment') {
      return (
        <FamilyPaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedFamily={selectedFamily}
          selectedVoucherIds={selectedVoucherIds}
          currentTaxes={currentTaxes}
          currentPayments={currentPayments}
          isHindi={isHindi}
          onAddPayment={handleAddPayment}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-slate-50">
      <Header
        admin={loggedInAdmin}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
        currentPage={currentPage}
        setCurrentPage={(page, tab) => handleNavigate(page, tab)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        isHindi={isHindi}
        setIsHindi={setIsHindi}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenSupabaseGuide={() => setIsSupabaseGuideOpen(true)}
        onSyncDatabase={() => syncAllDataFromSupabase(true)}
        isSyncing={isSyncing}
      />

      {/* SYSTEM ANNOUNCEMENTS & NOTIFICATIONS BANNER */}
      <AnnouncementBanner announcements={announcements} isHindi={isHindi} />

      <div className="flex-grow flex relative">
        {/* SIDEBAR NAVIGATION */}
        {loggedInAdmin && (
          <FlappedSidebar
            currentPage={currentPage}
            activeCashbookTab={cashbookTab}
            setCurrentPage={(page, tab) => handleNavigate(page, tab)}
            onLogout={handleLogout}
            beneficiaryCount={families.length}
            pendingTaxesCount={taxes.length}
            receiptsCount={payments.length}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
            isHindi={isHindi}
          />
        )}

        {/* MAIN CONTENT AREA */}
        <main className={`flex-grow w-full overflow-y-auto overflow-x-hidden min-h-[calc(100vh-4rem)] transition-all duration-300 ${loggedInAdmin ? 'lg:pl-16' : ''}`}>
          {renderContent()}
        </main>
      </div>

      <Footer isHindi={isHindi} setCurrentPage={setCurrentPage} onOpenAbout={() => setIsAboutOpen(true)} />
      {renderModal()}

      {/* SUPABASE INTEGRATION GUIDE MODAL */}
      <SupabaseGuideModal
        isOpen={isSupabaseGuideOpen}
        onClose={() => setIsSupabaseGuideOpen(false)}
        isHindi={isHindi}
      />

      {/* ABOUT PORTAL MODAL */}
      {isAboutOpen && (
        <Modal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
          title={isHindi ? 'स्थानीय वित्तीय प्रबंधन - पोर्टल जानकारी' : 'Local Fund Management - Portal Information'}
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-md mb-2">
                🏛️
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Local Fund Management (स्थानीय वित्तीय प्रबंधन)
              </h3>
              <p className="text-xs font-bold text-emerald-800">
                {isHindi ? 'संस्था के वित्तीय एवं टैक्स आय व्यय प्रबंधन पोर्टल' : 'Financial & Tax Revenue Expense Management Portal'}
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <p className="font-bold text-amber-950 text-sm">💻 Software Developer & Owner</p>
              <p className="font-extrabold text-amber-900">Chanchal Net Zone (Owner: Hemlata Jatav)</p>
              <p className="text-[11px] font-mono text-amber-800">
                ✉️ Email: <a href="mailto:chanchalnetzone2026@gmail.com" className="underline font-bold">chanchalnetzone2026@gmail.com</a>
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-wider">
                {isHindi ? 'प्रमुख विशेषताएं एवं सुविधाएं (Key Features)' : 'Key Features'}
              </h4>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
                <li><strong>{isHindi ? 'बहु-पंचायत लॉगिन' : 'Multi-Panchayat Login'}:</strong> {isHindi ? 'प्रत्येक ग्राम पंचायत के लिए पृथक एवं सुरक्षित ई-खाता।' : 'Separate secure login account for each Gram Panchayat.'}</li>
                <li><strong>{isHindi ? 'समग्र आईडी आधार खोज' : 'Samagra ID Search'}:</strong> {isHindi ? 'समग्र आईडी या नाम से तुरंत बकाया कर एवं करदाता खोजें।' : 'Instant dues lookup by Samagra ID or taxpayer name.'}</li>
                <li><strong>{isHindi ? 'समस्त ग्राम पंचायत कर श्रेणी' : 'All Tax Types'}:</strong> {isHindi ? 'जल कर, स्वच्छता कर, प्रकाश कर, संपत्ति कर, हाट-बाजार कर एवं व्यावसायिक कर बिलिंग।' : 'Billing for Water, Sanitation, Lighting, Property, Hatbazar, & Royalty Taxes.'}</li>
                <li><strong>{isHindi ? 'डिजिटल कर रसीद एवं लेजर' : 'Digital Receipts & Ledger'}:</strong> {isHindi ? 'त्वरित डिजिटल रसीद प्रिंटिंग एवं वार्षिक बहीखाता रिपोर्ट।' : 'Instant printable payment receipts and ledger reports.'}</li>
              </ul>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsAboutOpen(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                {isHindi ? 'ठीक है (बंद करें)' : 'Close'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const FamilyPaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  selectedFamily: Family;
  selectedVoucherIds: string[];
  currentTaxes: Tax[];
  currentPayments: Payment[];
  isHindi: boolean;
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
    remainingDues?: number
  ) => void;
}> = ({
  isOpen,
  onClose,
  selectedFamily,
  selectedVoucherIds,
  currentTaxes,
  currentPayments,
  isHindi,
  onAddPayment,
}) => {
  const familyTaxes = currentTaxes.filter((t) => t.familyId === selectedFamily.id);
  const selectedTaxes = familyTaxes.filter((t) => selectedVoucherIds.includes(t.id));

  const totalFamilyCharged = familyTaxes.reduce((s, t) => s + t.amount, 0);
  const totalFamilyPaid = currentPayments.filter((p) => p.familyId === selectedFamily.id).reduce((s, p) => s + p.amount, 0);
  const previousDues = Math.max(0, totalFamilyCharged - totalFamilyPaid);

  const voucherChargedAmount = selectedTaxes.length > 0
    ? selectedTaxes.reduce((s, t) => s + t.amount, 0)
    : previousDues;

  const [penalty, setPenalty] = useState<number>(0);
  const [concession, setConcession] = useState<number>(0);

  const netPayable = Math.max(0, voucherChargedAmount + Number(penalty || 0) - Number(concession || 0));
  const [paymentAmount, setPaymentAmount] = useState<number>(netPayable);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'ONLINE' | 'CHEQUE' | 'NET_BANKING'>('CASH');
  const [remarks, setRemarks] = useState<string>(
    selectedVoucherIds.length > 0 ? `Payment for ${selectedVoucherIds.length} tax vouchers` : 'Cleared annual tax dues'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setPaymentAmount(netPayable);
  }, [netPayable]);

  const remainingDues = Math.max(0, netPayable - Number(paymentAmount || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (paymentAmount > netPayable) {
      setErrorMsg(
        isHindi
          ? `⚠️ भुगतान राशि (₹${paymentAmount}) कुल देय राशि (₹${netPayable}) से अधिक नहीं हो सकती!`
          : `⚠️ Payment amount (₹${paymentAmount}) cannot exceed net payable amount (₹${netPayable})!`
      );
      return;
    }

    onAddPayment(
      selectedFamily.id,
      Number(paymentAmount),
      paymentMode,
      remarks,
      undefined,
      undefined,
      selectedVoucherIds,
      voucherChargedAmount,
      previousDues,
      Number(penalty || 0),
      Number(concession || 0),
      remainingDues
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isHindi ? `कर भुगतान पंजीयन: ${selectedFamily.name} ${selectedFamily.surname}` : `Register Tax Payment for ${selectedFamily.name} ${selectedFamily.surname}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {selectedVoucherIds.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
            <p className="font-bold text-amber-900">
              🎟️ Selected Tax Vouchers ({selectedVoucherIds.length}):
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedTaxes.map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-0.5 bg-white border border-amber-300 rounded font-mono text-[10px] text-amber-950 font-semibold"
                >
                  {t.type} (Month {t.month}): ₹{t.amount}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-700 font-medium">
            <span>{isHindi ? 'चयनित कर मांग / पूर्व बकाया:' : 'Charged Dues:'}</span>
            <span className="font-mono font-bold text-slate-900">₹{voucherChargedAmount.toLocaleString('en-IN')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-rose-800 uppercase mb-1">
                + {isHindi ? 'विलंब शुल्क (शास्ति)' : 'Penalty (₹)'}
              </label>
              <input
                type="number"
                min="0"
                value={penalty}
                onChange={(e) => setPenalty(Math.max(0, Number(e.target.value)))}
                className="w-full px-2 py-1 text-xs border border-rose-200 rounded-lg font-mono font-bold text-rose-700 bg-rose-50/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">
                - {isHindi ? 'छूट / रियायत' : 'Concession (₹)'}
              </label>
              <input
                type="number"
                min="0"
                value={concession}
                onChange={(e) => setConcession(Math.max(0, Number(e.target.value)))}
                className="w-full px-2 py-1 text-xs border border-emerald-200 rounded-lg font-mono font-bold text-emerald-700 bg-emerald-50/50"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-300 font-bold text-slate-900 text-xs">
            <span>{isHindi ? 'कुल देय राशि (Net Payable):' : 'Net Payable:'}</span>
            <span className="font-mono text-sm text-primary font-black">₹{netPayable.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            {isHindi ? 'प्राप्त भुगतान राशि (₹) *' : 'Payment Amount (₹) *'}
          </label>
          <input
            type="number"
            min="0"
            max={netPayable}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 bg-emerald-50/30"
            required
          />
        </div>

        <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center text-xs font-bold text-amber-900">
          <span>{isHindi ? 'शेष पेंडिंग बकाया (Remaining Dues):' : 'Remaining Balance:'}</span>
          <span className="font-mono font-black text-rose-700">₹{remainingDues.toLocaleString('en-IN')}</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            {isHindi ? 'भुगतान का प्रकार (Mode)' : 'Payment Mode'}
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as any)}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white font-semibold"
          >
            <option value="CASH">💵 Cash (नकद)</option>
            <option value="UPI">📱 UPI / QR Code</option>
            <option value="ONLINE">🌐 Online Banking</option>
            <option value="NET_BANKING">🏦 Net Banking</option>
            <option value="CHEQUE">📜 Cheque</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            {isHindi ? 'टिप्पणी / रिमार्क्स' : 'Remarks'}
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
          />
        </div>

        <div className="pt-2">
          <Button type="submit">
            {isHindi ? 'भुगतान दर्ज करें एवं रसीद काटें' : 'Record Payment & Issue Receipt Voucher'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default App;
