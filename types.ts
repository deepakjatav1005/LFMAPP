export enum TaxType {
  WATER = 'Water Tax (जल कर)',
  SANITATION = 'Sanitation Tax (स्वच्छता कर)',
}

export enum OtherTaxCategory {
  LIGHT = 'प्रकाश कर (Light Tax)',
  PROPERTY = 'संपत्ति कर (Property Tax)',
  COMMERCIAL_SHOP = 'व्यावसायिक दुकान / संस्थान कर (Commercial Shop & Business Tax)',
  HATBAZAR = 'हाट-बाजार कर (Hatbazar / Bazaar Tax)',
  ROYALTY = 'रॉयल्टी कर (Royalty Tax)',
  OTHER = 'अन्य विविध कर (Other / Misc Tax)',
}

export enum BeneficiaryCategory {
  BPL = 'BPL',
  APL = 'APL',
  DIVYANG = 'DIVYANG',
  OTHER = 'OTHER',
}

export interface Family {
  id: string;
  samagraId: string; // 9-digit Samagra ID
  familyId?: string;  // 8-digit Family ID
  name: string;
  surname: string;
  guardianName: string; // Father / Husband name
  mobile: string;
  category: BeneficiaryCategory; // BPL, APL, DIVYANG, OTHER
  memberCount?: number;
  wardNo: string;
  muhalla?: string;
  address?: string;
  registrationDate?: string;
  isLocked?: boolean; // Profile lock state (true = profile locked, can charge tax; false = unlocked, can edit profile)
  gramPanchayat?: string;
  adminId?: string;
}

export type CategoryTaxRates = {
  [key in BeneficiaryCategory]: number;
};

export type TaxRates = {
  [key in TaxType]: CategoryTaxRates;
};

export interface TaxRatesLockInfo {
  isLocked: boolean;
  year: number | string;
  month: number | 'ALL';
  lockedAt?: string;
  lockedBy?: string;
}

export interface Tax {
  id: string;
  billNo?: string;
  familyId: string;
  month: number; // 1-12
  year: number;
  type: TaxType;
  amount: number;
  dueDate?: string;
  issueDate?: string;
  category?: BeneficiaryCategory;
  status?: 'ISSUED' | 'PAID' | 'PARTIAL';
  isLocked?: boolean;
  gramPanchayat?: string;
  adminId?: string;
}

export interface Payment {
  id: string;
  familyId: string;
  taxId?: string;
  taxType?: TaxType;
  date?: string;
  paymentDate?: string;
  paymentMode?: string;
  collectorName?: string;
  amount: number; // Amount paid (प्राप्त राशि)
  chargedAmount?: number; // मूल कर मांग
  previousDues?: number; // पूर्व शेष बकाया
  penalty?: number; // शास्ति / विलंब शुल्क
  concession?: number; // छूट / रियायत
  remainingDues?: number; // कुल शेष बकाया राशि
  receiptNo: string;
  mode?: 'CASH' | 'UPI' | 'ONLINE' | 'CHEQUE' | 'NET_BANKING';
  transactionId?: string;
  remarks?: string;
  month?: number;
  year?: number;
  chargedMonth?: number; // Charged/assessed tax month
  chargedYear?: number; // Charged/assessed tax year
  chargedMonthNames?: string; // e.g. "अगस्त 2026" or "08/2026"
  receivedMonth?: number; // Payment received month
  receivedYear?: number; // Payment received year
  receivedMonthNames?: string; // e.g. "अगस्त 2026"
  paidTaxIds?: string[];
  gramPanchayat?: string;
  adminId?: string;
}

export interface Admin {
  id: string;
  name: string;
  mobile: string;
  photoUrl?: string;
  avatar?: string;
  designation?: string;
  gramPanchayat: string;
  block?: string;
  email?: string;
  district?: string;
  state?: string;
  password?: string;
  isApproved?: boolean;
  registrationDate?: string;
  createdAt?: string;
}

export interface TaxBeneficiaryList {
  taxType: TaxType;
  includedFamilyIds: string[];
  isLocked: boolean;
  updatedAt?: string;
}

export enum Page {
  LOGIN = 'LOGIN',
  ADMIN_REGISTRATION = 'ADMIN_REGISTRATION',
  DASHBOARD = 'DASHBOARD',
  MANAGE_PROFILE = 'MANAGE_PROFILE',
  MANAGE_TAX_RATES = 'MANAGE_TAX_RATES',
  MANAGE_OFFICE = 'MANAGE_OFFICE',
  BENEFICIARY_MANAGEMENT = 'BENEFICIARY_MANAGEMENT',
  TAX_BENEFICIARY_LIST = 'TAX_BENEFICIARY_LIST',
  TAX_ISSUE_MANAGEMENT = 'TAX_ISSUE_MANAGEMENT',
  TAX_RECEIPT_MANAGEMENT = 'TAX_RECEIPT_MANAGEMENT',
  DEMAND_NOTICE = 'DEMAND_NOTICE',
  BOOKING_RENT = 'BOOKING_RENT',
  BUILDING_PERMISSION = 'BUILDING_PERMISSION',
  TAX_REPORT = 'TAX_REPORT',
  MEMBER_CARD = 'MEMBER_CARD',
  OTHER_TAX = 'OTHER_TAX',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  CASHBOOK_MANAGEMENT = 'CASHBOOK_MANAGEMENT',
  FAMILY_DETAILS = 'FAMILY_DETAILS',
  REGISTER_FAMILY = 'REGISTER_FAMILY',
  DEVELOPER_PORTAL = 'DEVELOPER_PORTAL',
  COMPLAINTS_SUGGESTIONS = 'COMPLAINTS_SUGGESTIONS',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
}

export interface BusinessRegistrationRecord {
  id: string;
  certificateNo: string; // e.g. GP-BRC/2026-27/001
  familyId?: string;
  memberId?: string; // 9-digit Samagra Member ID
  ownerName: string; // स्वामी / संचालक का नाम
  guardianName?: string; // पिता / पति का नाम
  mobile: string;
  wardNo: string;
  muhalla?: string;
  samagraFamilyId?: string; // 8-digit Family ID
  samagraMemberId?: string; // 9-digit Member ID
  category?: string; // APL / BPL / General / OBC / SC / ST
  
  // Business Specific Details
  businessName: string; // व्यावसायिक प्रतिष्ठान / दुकान / संस्थान का नाम
  businessType: string; // व्यवसाय का प्रकार (e.g. किराना, कपड़ा, इलेक्ट्रॉनिक्स, हार्डवेयर, होटल, सेवा केंद्र, आदि)
  shopAddress: string; // दुकान / संस्थान का पूरा पता एवं स्थान
  shopAreaSqFt: number; // दुकान / संस्थान का क्षेत्रफल (वर्ग फीट में)
  shopTotalCost?: number; // दुकान / संस्थान की कुल लागत / अनुमानित मूल्य (₹)
  annualTaxRate?: number; // वार्षिक निर्धारित व्यावसायिक कर राशि (₹)
  gstNumber?: string; // GST / व्यापार अनुज्ञप्ति / उद्यम क्रमांक (Optional)
  photoUrl?: string; // मालिक / संचालक का पासपोर्ट साइज फोटो या दुकान का फोटो
  
  registrationDate: string; // YYYY-MM-DD
  validUpto?: string; // e.g. 31-03-2027
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  remarks?: string;
  createdAt: string;
  gramPanchayat?: string;
  adminId?: string;
}

export interface BookingRentRecord {
  id: string;
  voucherNo: string; // e.g. BKG-2026-0001
  familyId?: string;
  beneficiaryName: string;
  guardianName?: string;
  fatherHusbandName?: string;
  mobile?: string;
  wardNo?: string;
  samagraId?: string;
  facilityName: string; // e.g. ग्राम पंचायत सामुदायिक भवन / मैरिज हॉल / टेंट सामग्री / दुकान
  purpose: string; // e.g. विवाह / शादी समारोह, सामाजिक बैठक, धार्मिक आयोजन, अन्य
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime?: string; // HH:mm
  chargeAmount: number; // manually entered charge
  securityDeposit?: number; // optional अमानत राशि
  paymentMode: 'CASH' | 'BANK' | 'UPI' | 'CHEQUE';
  transactionId?: string;
  remarks?: string;
  createdAt: string;
  cashbookVoucherId?: string;
  gramPanchayat?: string;
  adminId?: string;
}

export interface BuildingPermissionRecord {
  id: string;
  voucherNo: string; // e.g. BP-VOU-2026-0001
  permissionNo: string; // e.g. BP-2026-0012
  familyId?: string;
  beneficiaryName: string;
  guardianName?: string;
  fatherHusbandName?: string;
  mobile?: string;
  wardNo?: string;
  samagraId?: string;
  plotNo?: string; // खसरा / भूखंड क्र. (Optional/Legacy)
  locationAddress?: string; // निर्माण स्थल का पता
  constructionType?: string; // आवासीय (Residential), व्यावसायिक (Commercial), मिश्रित (Mixed)
  totalFloors?: string; // मंजिलों की संख्या (भू-तल / 1 / 2...)
  areaSqFt?: number; // क्षेत्रफल (वर्ग फीट में)
  ratePerSqFt?: number; // दर प्रति वर्ग फीट (₹)
  taxAmount?: number;
  calculatedTax?: number;
  sanitationFee?: number; // मलबा/स्वच्छता शुल्क (₹)
  chargeAmount?: number; // मैनुअल निर्माण अनुमति शुल्क (₹)
  totalAmount: number; // कुल निर्माण अनुमति व कर शुल्क
  paymentMode: 'CASH' | 'BANK' | 'UPI' | 'CHEQUE';
  transactionId?: string;
  validUpto?: string; // वैधता अवधि (e.g. 1 वर्ष / 2027-03-31)
  issueDate?: string;
  remarks?: string;
  createdAt: string;
  cashbookVoucherId?: string;
  gramPanchayat?: string;
  adminId?: string;
}

export interface OtherTaxReceiptRecord {
  id: string;
  receiptNo: string; // e.g. OTR-2026-0001
  familyId?: string;
  beneficiaryName: string;
  guardianName?: string;
  fatherHusbandName?: string;
  mobile?: string;
  wardNo?: string;
  muhalla?: string;
  samagraId?: string;
  familySamagraId?: string;
  category?: string;
  taxHead: string; // e.g. प्रकाश कर (Light Tax), संपत्ति कर (Property Tax), हाट-बाजार कर (Hatbazar Tax), रॉयल्टी कर (Royalty Tax), अन्य कर (Other Tax)
  taxAmount: number; // कर राशि (₹)
  receiptDate: string; // YYYY-MM-DD
  financialYear?: string; // e.g. "2026-2027" or "2026-27"
  businessRegistrationId?: string;
  businessName?: string;
  paymentMode: 'CASH' | 'BANK' | 'UPI' | 'CHEQUE';
  transactionId?: string;
  collectorName?: string; // कर संग्राहक / लिपिक का नाम
  remarks?: string;
  createdAt: string;
  cashbookVoucherId?: string;
  gramPanchayat?: string;
  adminId?: string;
}

export enum CashbookTab {
  ACCOUNT_HEADS = 'ACCOUNT_HEADS',
  EXPENSE_SUBHEADS = 'EXPENSE_SUBHEADS',
  VENDORS = 'VENDORS',
  WORKS = 'WORKS',
  INCOME_VOUCHERS = 'INCOME_VOUCHERS',
  EXPENDITURE_VOUCHERS = 'EXPENDITURE_VOUCHERS',
  LEDGER_REPORT = 'LEDGER_REPORT',
  CASHBOOK_REPORT = 'CASHBOOK_REPORT',
  WORK_EXPENDITURE_REPORT = 'WORK_EXPENDITURE_REPORT',
}

export interface ExpenseSubHead {
  id: string;
  name: string;
  headId?: string;
  description?: string;
  gramPanchayat?: string;
  adminId?: string;
}

export interface AccountHead {
  id: string;
  code?: string;
  name: string;
  type: 'INCOME' | 'EXPENDITURE' | 'BOTH';
  openingBalance: number;
  asOnDate: string;
  gramPanchayat?: string;
  adminId?: string;
}

export interface Vendor {
  id: string;
  name: string;
  address: string;
  mobile?: string;
  gstNo?: string;
  openingBalance?: number;
  gramPanchayat?: string;
  adminId?: string;
}

export interface Work {
  id: string;
  name: string;
  cost: number;
  headId: string;
  headAmount: number;
  subHeadName?: string;
  subHeadAmount?: number;
  convergenceHeadId?: string;
  convergenceHeadName?: string;
  convergenceHeadAmount?: number;
  adminSanctionDate?: string;
  gramPanchayat?: string;
  adminId?: string;
}

export interface CashbookVoucher {
  id: string;
  voucherNo: string;
  voucherType: 'INCOME' | 'EXPENDITURE';
  date: string;
  headId: string;
  subHeadName?: string;
  amount: number;
  vendorId?: string;
  workId?: string;
  paymentMode: 'CASH' | 'BANK' | 'UPI' | 'CHEQUE';
  remarks: string;
  proposalNo?: string;
  proposalDate?: string;
  billNo?: string;
  billDate?: string;
  workSanctionAmount?: number;
  previousExpendedAmount?: number;
  remainingAmount?: number;
  expenseCategory?: 'WORK' | 'OFFICE';
  gramPanchayat?: string;
  adminId?: string;
}

export interface OfficeDetails {
  officeName: string; // e.g. कार्यालय ग्राम पंचायत रामपुर
  secretaryName: string; // e.g. श्री दीपक जाटव
  secretaryDesignation?: string; // e.g. ग्राम पंचायत सचिव / सचिव
  sarpanchName?: string; // e.g. श्रीमती कमला देवी
  contactPhone: string; // e.g. 911234567890
  email?: string; // e.g. gprampur2026@gmail.com
  password?: string; // Login Password
  gramPanchayat?: string; // Gram Panchayat name
  address: string; // e.g. मुख्य बाजार मार्ग, ग्राम पंचायत रामपुर, जनपद पंचायत
  block: string;
  district: string;
  state: string;
  pincode?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  adminId?: string;
}

export interface DemandNoticeRecord {
  id: string;
  serialNo: string;
  issueDate: string;
  dueDate: string;
  familyId: string;
  remarks?: string;
}

export enum DeveloperTab {
  OVERVIEW = 'OVERVIEW',
  PROFILE_MANAGEMENT = 'PROFILE_MANAGEMENT',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  SUBSCRIPTION_MANAGEMENT = 'SUBSCRIPTION_MANAGEMENT',
  ANNOUNCEMENT_MANAGEMENT = 'ANNOUNCEMENT_MANAGEMENT',
  COMPLAINT_MANAGEMENT = 'COMPLAINT_MANAGEMENT',
}

export interface DeveloperProfile {
  id?: string;
  name: string; // Hemlata Jatav
  company: string; // Chanchal Net Zone
  email: string; // chanchalnetzone2026@gmail.com
  phone: string; // 911234567890
  version: string; // v3.0 Multi-Tenant Pro
  supportHours: string;
  address: string;
  logoUrl?: string;
  avatarUrl?: string;
  qrCodeUrl?: string;
  upiId?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  adminId: string;
  gramPanchayat: string;
  officerName: string;
  status: 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'TRIAL' | 'EXPIRED';
  planType: 'ANNUAL' | 'MONTHLY' | 'LIFETIME' | 'CUSTOM';
  planName?: string;
  startDate: string;
  endDate: string;
  amount: number;
  notes?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string; // e.g. "Monthly Plan (मासिक प्लान)", "Annual Plan (वार्षिक प्लान)"
  amount: number; // e.g. 499, 3999
  period: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM';
  periodDays: number; // e.g. 30, 365, 3650
  description?: string;
  isActive: boolean; // ON / OFF toggle button
  createdAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
  priority: 'HIGH' | 'NORMAL' | 'URGENT';
  isActive: boolean;
}

export interface ComplaintQuery {
  id: string;
  adminId: string;
  gramPanchayat: string;
  officerName: string;
  mobile: string;
  subject: string;
  category: 'TAX_CALCULATION' | 'PRINT_RECEIPT' | 'BILLING' | 'TECHNICAL' | 'FEATURE_REQUEST';
  description: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  developerReply?: string;
  replyDate?: string;
}

export interface LocationData {
  [state: string]: {
    [district: string]: {
      [block: string]: string[];
    };
  };
}


