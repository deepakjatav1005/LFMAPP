import React, { useState, useMemo } from 'react';
import { BusinessRegistrationRecord, Family, OfficeDetails, Admin } from '../types';
import ViewHeader from './ViewHeader';
import OfficialVoucherHeader from './OfficialVoucherHeader';
import {
  formatDateDDMMYYYY,
  getFinancialYear,
  triggerPrint,
  openPrintWindow,
  openInStandaloneTab,
  downloadElementAsPDF,
  getCleanOfficeTitle,
  getCleanOfficeSubtitle,
  getOfficeLogoUrl,
  DEFAULT_OFFICE_LOGO,
} from '../utils/printUtils';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { uploadImageToSupabaseBucket } from '../lib/supabaseSync';

interface BusinessRegistrationViewProps {
  registrationList?: BusinessRegistrationRecord[];
  registrations?: BusinessRegistrationRecord[];
  families: Family[];
  officeDetails?: OfficeDetails;
  admin?: Admin | null;
  onCreateRegistration: (record: Omit<BusinessRegistrationRecord, 'id' | 'certificateNo' | 'createdAt'>) => Promise<BusinessRegistrationRecord | void>;
  onUpdateRegistration?: (record: BusinessRegistrationRecord) => Promise<void>;
  onDeleteRegistration?: (id: string) => void;
  onNavigateToOtherTax?: (business: BusinessRegistrationRecord) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

const BUSINESS_CATEGORIES = [
  'किराना एवं जनरल स्टोर्स (Grocery & General Stores)',
  'हार्डवेयर एवं बिल्डिंग मटेरियल (Hardware & Building Materials)',
  'कपड़ा, रेडीमेड एवं फुटवियर (Clothing & Footwear)',
  'होटल, रेस्टोरेंट, ढाबा व चाय-नाश्ता (Hotel, Restaurant & Eatery)',
  'ऑटोमोबाइल, गैराज व सर्विस सेंटर (Automobile & Garage)',
  'मेडिकल स्टोर एवं फार्मेसी (Medical & Pharmacy)',
  'इलेक्ट्रॉनिक, मोबाइल व रिपेयरिंग (Electronics & Mobile)',
  'सीएससी, कंप्यूटर व ऑनलाइन सेवा केंद्र (CSC & Online Services)',
  'डेयरी, बेकरी व मिठाई प्रतिष्ठान (Dairy & Sweets)',
  'सैलून, ब्यूटी पार्लर व कॉस्मेटिक्स (Salon & Beauty Parlour)',
  'कोचिंग, स्कूल व निजी शिक्षण संस्थान (Coaching & Institute)',
  'वेयरहाउस, गोदाम व थोक व्यापार (Warehouse & Wholesale)',
  'कृषि सेवा, बीज व खाद विक्रेता (Agri Seeds & Fertilizer)',
  'अन्य व्यावसायिक दुकान / प्रतिष्ठान (Other Commercial Business)',
];

export const BusinessRegistrationView: React.FC<BusinessRegistrationViewProps> = ({
  registrationList,
  registrations: propRegistrations,
  families = [],
  officeDetails,
  admin,
  onCreateRegistration,
  onUpdateRegistration,
  onDeleteRegistration,
  onNavigateToOtherTax,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const registrations = registrationList || propRegistrations || [];
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'DIRECTORY' | 'CERTIFICATE'>('REGISTER');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterWard, setFilterWard] = useState<string>('ALL');
  const [selectedRegForCertificate, setSelectedRegForCertificate] = useState<BusinessRegistrationRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<BusinessRegistrationRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<BusinessRegistrationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState<boolean>(false);

  // Form State
  const [memberIdInput, setMemberIdInput] = useState<string>('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [wardNo, setWardNo] = useState<string>('01');
  const [muhalla, setMuhalla] = useState<string>('');
  const [samagraFamilyId, setSamagraFamilyId] = useState<string>('');
  const [samagraMemberId, setSamagraMemberId] = useState<string>('');
  const [category, setCategory] = useState<string>('General');

  // Business Info
  const [businessName, setBusinessName] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [shopAddress, setShopAddress] = useState<string>('');
  const [shopAreaSqFt, setShopAreaSqFt] = useState<number | ''>(250);
  const [shopTotalCost, setShopTotalCost] = useState<number | ''>(150000);
  const [annualTaxRate, setAnnualTaxRate] = useState<number | ''>(300);
  const [gstNumber, setGstNumber] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [registrationDate, setRegistrationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [validUpto, setValidUpto] = useState<string>(`31-03-${new Date().getFullYear() + 1}`);
  const [remarks, setRemarks] = useState<string>('मध्य प्रदेश पंचायत राज अधिनियम अंतर्गत अधिकृत व्यावसायिक पंजीयन।');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    const target = deletingRecord;
    const idToDelete = target.id;
    const bizTitle = target.businessName || target.certificateNo || 'पंजीयन';
    try {
      setIsDeleting(true);
      if (selectedRegForCertificate?.id === idToDelete) {
        setSelectedRegForCertificate(null);
        setActiveTab('DIRECTORY');
      }
      if (editingRecord?.id === idToDelete) {
        setEditingRecord(null);
      }
      if (onDeleteRegistration) {
        await onDeleteRegistration(idToDelete);
      }
      showToast(
        isHindi
          ? `✅ "${bizTitle}" का पंजीयन सफलतापूर्वक हटा दिया गया!`
          : `✅ Registration for "${bizTitle}" deleted successfully!`,
        'success'
      );
    } catch (err) {
      console.error('Delete error:', err);
      showToast(isHindi ? '❌ हटाने में त्रुटि हुई।' : 'Error deleting record.', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingRecord(null);
    }
  };

  // Sync / Lookup Member or Family by Samagra Member ID / Family ID / Name
  const handleSyncMember = (searchKey?: string) => {
    const key = (searchKey || memberIdInput).trim().toLowerCase();
    if (!key) {
      showToast(isHindi ? 'कृपया समग्र सदस्य आईडी या नाम दर्ज करें।' : 'Please enter Samagra Member ID or Name.', 'error');
      return;
    }

    const matched = families.find(
      (f) =>
        (f.samagraId && f.samagraId.toLowerCase().includes(key)) ||
        (f.familyId && f.familyId.toLowerCase().includes(key)) ||
        `${f.name} ${f.surname}`.toLowerCase().includes(key) ||
        (f.mobile && f.mobile.includes(key))
    );

    if (matched) {
      setSelectedFamilyId(matched.id);
      setOwnerName(`${matched.name} ${matched.surname}`);
      setGuardianName(matched.guardianName || '');
      setMobile(matched.mobile || '');
      setWardNo(matched.wardNo || '01');
      setMuhalla(matched.muhalla || '');
      setSamagraFamilyId(matched.familyId || matched.samagraId || '');
      setSamagraMemberId(matched.samagraId || '');
      setCategory(matched.category || 'General');
      
      const currentPanchayat = officeDetails?.officeName || admin?.gramPanchayat || 'ग्राम पंचायत';
      if (!shopAddress) {
        setShopAddress(`दुकान क्र. __, ${matched.muhalla || 'मुख्य बाजार'}, वार्ड क्र. ${matched.wardNo || '01'}, ${currentPanchayat}`);
      }

      showToast(isHindi ? `✅ सदस्य डेटा सफलतापूर्वक सिंक किया गया: ${matched.name} ${matched.surname}` : `Member data synced: ${matched.name} ${matched.surname}`);
    } else {
      showToast(isHindi ? 'समग्र आईडी या सदस्य रिकॉर्ड नहीं मिला। आप मैन्युअल जानकारी दर्ज कर सकते हैं।' : 'Member not found. You can enter details manually.', 'error');
    }
  };

  // Photo File Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(isHindi ? 'पासपोर्ट फोटो का आकार 5MB से कम होना चाहिए।' : 'Photo size must be under 5MB.');
      return;
    }

    // 1. Instant local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setPhotoUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);

    // 2. Direct upload to Supabase Storage Bucket 'photos'
    try {
      setIsUploadingPhoto(true);
      const res = await uploadImageToSupabaseBucket(file, 'photos', 'business_photos');
      if (res.success && res.publicUrl) {
        setPhotoUrl(res.publicUrl);
        showToast(
          isHindi
            ? '✅ फोटो Supabase स्टोरेज बकेट (photos) में सुरक्षित रूप से अपलोड हो गई!'
            : 'Photo uploaded to Supabase Storage Bucket successfully!'
        );
      } else {
        console.warn('Storage bucket upload notification:', res.error);
        showToast(
          isHindi
            ? 'ℹ️ फोटो चयनित हुई। (पंजीयन सुरक्षित करते समय डेटाबेस में सहेजी जाएगी)'
            : 'Photo selected for registration.',
          'success'
        );
      }
    } catch (err) {
      console.warn('Error during photo upload:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownerName.trim()) {
      showToast(isHindi ? 'कृपया स्वामी / संचालक का नाम दर्ज करें।' : 'Please enter owner name.', 'error');
      return;
    }

    if (!businessName.trim()) {
      showToast(isHindi ? 'कृपया दुकान / प्रतिष्ठान का नाम दर्ज करें।' : 'Please enter business / shop name.', 'error');
      return;
    }

    if (!shopAreaSqFt || Number(shopAreaSqFt) <= 0) {
      showToast(isHindi ? 'कृपया दुकान का क्षेत्रफल (वर्ग फीट में) दर्ज करें।' : 'Please enter valid shop area in sq. ft.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRecord = await onCreateRegistration({
        familyId: selectedFamilyId || undefined,
        memberId: samagraMemberId || memberIdInput || undefined,
        ownerName: ownerName.trim(),
        guardianName: guardianName.trim(),
        mobile: mobile.trim(),
        wardNo: wardNo || '01',
        muhalla: muhalla.trim(),
        samagraFamilyId: samagraFamilyId.trim(),
        samagraMemberId: samagraMemberId.trim(),
        category: category || 'General',
        businessName: businessName.trim(),
        businessType: businessType,
        shopAddress: shopAddress.trim(),
        shopAreaSqFt: Number(shopAreaSqFt) || 0,
        shopTotalCost: shopTotalCost ? Number(shopTotalCost) : undefined,
        annualTaxRate: annualTaxRate ? Number(annualTaxRate) : undefined,
        gstNumber: gstNumber.trim(),
        photoUrl: photoUrl || '',
        registrationDate: registrationDate || new Date().toISOString().split('T')[0],
        validUpto: validUpto || `31-03-${new Date().getFullYear() + 1}`,
        status: 'ACTIVE',
        remarks: remarks.trim(),
        gramPanchayat: admin?.gramPanchayat || officeDetails?.officeName || '',
        adminId: admin?.id || '',
      });

      showToast(isHindi ? '🎉 व्यावसायिक दुकान / प्रतिष्ठान पंजीयन सफलतापूर्वक संपन्न हुआ एवं प्रमाण पत्र जारी किया गया!' : 'Business registered and certificate generated successfully!');
      
      if (newRecord) {
        setSelectedRegForCertificate(newRecord);
        setActiveTab('CERTIFICATE');
      } else {
        setActiveTab('DIRECTORY');
      }

      // Reset form
      setBusinessName('');
      setMemberIdInput('');
      setShopAddress('');
      setPhotoUrl('');
    } catch (err: any) {
      showToast(isHindi ? 'पंजीयन सुरक्षित करने में त्रुटि आई।' : 'Failed to save registration.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit / Update Submit Handler
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (!editingRecord.ownerName.trim()) {
      showToast(isHindi ? 'कृपया स्वामी / संचालक का नाम दर्ज करें।' : 'Please enter owner name.', 'error');
      return;
    }

    if (!editingRecord.businessName.trim()) {
      showToast(isHindi ? 'कृपया दुकान / प्रतिष्ठान का नाम दर्ज करें।' : 'Please enter business / shop name.', 'error');
      return;
    }

    if (!editingRecord.shopAreaSqFt || Number(editingRecord.shopAreaSqFt) <= 0) {
      showToast(isHindi ? 'कृपया मान्य क्षेत्रफल (वर्ग फीट) दर्ज करें।' : 'Please enter valid area in sq.ft.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onUpdateRegistration) {
        await onUpdateRegistration(editingRecord);
      }
      showToast(isHindi ? '✅ प्रतिष्ठान एवं स्वामी का विवरण सफलतापूर्वक अपडेट किया गया!' : 'Shop & owner details updated successfully!');
      
      // Update selected certificate if it was this record
      if (selectedRegForCertificate?.id === editingRecord.id) {
        setSelectedRegForCertificate(editingRecord);
      }
      
      setEditingRecord(null);
    } catch (err: any) {
      showToast(isHindi ? 'अपडेट करने में त्रुटि आई।' : 'Failed to update record.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered registrations directory
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        r.businessName.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.certificateNo.toLowerCase().includes(q) ||
        (r.mobile && r.mobile.includes(q)) ||
        (r.samagraMemberId && r.samagraMemberId.includes(q)) ||
        (r.shopAddress && r.shopAddress.toLowerCase().includes(q));

      const matchCategory = filterCategory === 'ALL' || r.businessType === filterCategory;
      const matchWard = filterWard === 'ALL' || r.wardNo === filterWard;

      return matchSearch && matchCategory && matchWard;
    });
  }, [registrations, searchTerm, filterCategory, filterWard]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalShops = registrations.length;
    const totalArea = registrations.reduce((s, r) => s + (r.shopAreaSqFt || 0), 0);
    const totalValuation = registrations.reduce((s, r) => s + (r.shopTotalCost || 0), 0);
    const totalTaxDemand = registrations.reduce((s, r) => s + (r.annualTaxRate || 0), 0);
    return { totalShops, totalArea, totalValuation, totalTaxDemand };
  }, [registrations]);

  // Export to Excel
  const handleExportExcel = () => {
    const headers = ['क्र.', 'प्रमाण पत्र क्र.', 'प्रतिष्ठान का नाम', 'स्वामी का नाम', 'पिता/पति', 'मोबाइल', 'सदस्य आईडी', 'वार्ड', 'व्यवसाय प्रकार', 'क्षेत्रफल (Sq.Ft)', 'कुल लागत (₹)', 'वार्षिक कर (₹)', 'पंजीयन दिनांक'];
    const rows = filteredRegistrations.map((r, i) => [
      i + 1,
      r.certificateNo,
      r.businessName,
      r.ownerName,
      r.guardianName || '-',
      r.mobile || '-',
      r.samagraMemberId || '-',
      r.wardNo || '01',
      r.businessType,
      r.shopAreaSqFt,
      r.shopTotalCost ? `₹${r.shopTotalCost}` : '-',
      r.annualTaxRate ? `₹${r.annualTaxRate}` : '-',
      formatDateDDMMYYYY(r.registrationDate),
    ]);

    exportToExcel(`Business_Registrations_Directory_${new Date().getFullYear()}`, 'Shop Register', headers, rows);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const filename = `Business_Register_${new Date().getFullYear()}`;
    const title = isHindi ? 'व्यावसायिक दुकान एवं संस्थान पंजीयन पंजी (3.12 Business Register)' : 'Commercial Shop & Business Register';
    const subtitle = officeSubtitle;
    const headers = ['प्रमाण पत्र क्र.', 'प्रतिष्ठान नाम', 'स्वामी का नाम', 'मोबाइल', 'वार्ड', 'प्रकार', 'क्षेत्रफल (SqFt)', 'लागत (₹)', 'वार्षिक कर'];
    const rows = filteredRegistrations.map((r) => [
      r.certificateNo,
      r.businessName,
      r.ownerName,
      r.mobile || '-',
      `वार्ड ${r.wardNo}`,
      r.businessType.split('(')[0].trim(),
      `${r.shopAreaSqFt} sq ft`,
      r.shopTotalCost ? `₹${r.shopTotalCost.toLocaleString('en-IN')}` : '-',
      r.annualTaxRate ? `₹${r.annualTaxRate.toLocaleString('en-IN')}` : '-',
    ]);

    exportToPDF(filename, title, subtitle, headers, rows, officeDetails, admin);
  };

  // Office Header Info
  const officeTitle = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
  const officeSubtitle = getCleanOfficeSubtitle(officeDetails, admin);
  const logoUrl = getOfficeLogoUrl(officeDetails);
  const secretaryName = officeDetails?.secretaryName || admin?.name || 'ग्राम पंचायत सचिव';
  const sarpanchName = officeDetails?.sarpanchName || 'सरपंच (Gram Panchayat Sarpanch)';

  return (
    <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 max-w-7xl animate-fade-in font-sans text-slate-900">
      {/* 1. VIEW HEADER */}
      <ViewHeader
        title={isHindi ? '3.12 व्यावसायिक दुकान एवं संस्थान पंजीयन (Business & Commercial Registration)' : '3.12 Commercial Shop & Business Registration'}
        subtitle={isHindi ? 'ग्राम पंचायत क्षेत्रांतर्गत संचालित समस्त व्यावसायिक दुकानों, संस्थानों एवं भवनों का पंजीयन करें, सदस्य आईडी से डेटा सिंक करें एवं अधिकृत प्रमाण पत्र जारी करें।' : 'Register commercial shops, sync owner details via Member ID, issue official business registration certificates & assess business taxes.'}
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
      />

      {/* 2. TOAST NOTIFICATION */}
      {notification && (
        <div
          className={`no-print print:hidden mb-6 p-4 rounded-2xl flex items-center gap-3 animate-slide-up shadow-md ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-2 border-rose-300 text-rose-950'
          }`}
        >
          <span className="text-2xl">{notification.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="text-sm font-black">{notification.message}</span>
        </div>
      )}

      {/* 3. TABS NAVIGATION */}
      <div className="no-print print:hidden flex flex-wrap items-center gap-2 mb-6 bg-white p-2 rounded-2xl border border-blue-200 shadow-sm">
        <button
          onClick={() => setActiveTab('REGISTER')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
            activeTab === 'REGISTER'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-700 hover:bg-blue-50'
          }`}
        >
          <span>🏪</span>
          <span>{isHindi ? '1. नया दुकान / व्यवसाय पंजीयन' : '1. New Business Registration'}</span>
        </button>

        <button
          onClick={() => setActiveTab('DIRECTORY')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
            activeTab === 'DIRECTORY'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-700 hover:bg-blue-50'
          }`}
        >
          <span>📋</span>
          <span>{isHindi ? `2. पंजीकृत दुकान सूची (${registrations.length})` : `2. Business Directory (${registrations.length})`}</span>
        </button>

        {selectedRegForCertificate && (
          <button
            onClick={() => setActiveTab('CERTIFICATE')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
              activeTab === 'CERTIFICATE'
                ? 'bg-blue-700 text-white shadow-md'
                : 'text-slate-700 hover:bg-blue-50'
            }`}
          >
            <span>📜</span>
            <span>{isHindi ? '3. पंजीयन प्रमाण पत्र (Certificate)' : '3. Registration Certificate'}</span>
          </button>
        )}
      </div>

      {/* 4. TAB CONTENT 1: REGISTRATION FORM */}
      {activeTab === 'REGISTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT 2 COLS: REGISTRATION FORM */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-md border border-blue-100 p-6 sm:p-8 space-y-8">
              
              {/* SECTION A: MEMBER ID SYNC / OWNER DETAILS */}
              <div className="space-y-4">
                <div className="border-b pb-3 border-slate-200 flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="text-blue-600">👤</span>
                    <span>{isHindi ? '1. स्वामी / संचालक एवं समग्र सदस्य आईडी सिंक' : '1. Owner & Member ID Sync'}</span>
                  </h3>
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-black px-3 py-1 rounded-full uppercase">
                    Auto-Sync Enabled
                  </span>
                </div>

                {/* Member ID Quick Search Bar */}
                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl space-y-2">
                  <label className="block text-xs font-bold text-blue-950 uppercase">
                    {isHindi ? 'समग्र सदस्य आईडी दर्ज कर डेटा सिंक करें (9-अंकीय समग्र ID या नाम) *' : 'Enter Samagra Member ID / Name to Sync *'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={memberIdInput}
                      onChange={(e) => setMemberIdInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSyncMember();
                        }
                      }}
                      placeholder={isHindi ? 'जैसे: 198765432 या हितग्राही का नाम' : 'e.g. 198765432 or Beneficiary Name'}
                      className="flex-1 px-4 py-2.5 text-sm font-bold border border-blue-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleSyncMember()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow transition cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <span>🔄</span>
                      <span>{isHindi ? 'डेटा सिंक करें' : 'Sync Member'}</span>
                    </button>
                  </div>

                  {/* Dropdown helper for existing registered families */}
                  <div className="flex items-center gap-2 pt-1 text-xs text-emerald-900">
                    <span className="font-semibold">{isHindi ? 'या सूची से चुनें:' : 'Or pick from list:'}</span>
                    <select
                      value={selectedFamilyId}
                      onChange={(e) => {
                        const fam = families.find((f) => f.id === e.target.value);
                        if (fam) {
                          setMemberIdInput(fam.samagraId || fam.id);
                          handleSyncMember(fam.samagraId || fam.id);
                        }
                      }}
                      className="px-3 py-1 text-xs font-semibold bg-white border border-emerald-300 rounded-lg text-slate-800 max-w-xs"
                    >
                      <option value="">-- {isHindi ? 'पंजीकृत परिवार / हितग्राही चुनें' : 'Select Registered Family'} --</option>
                      {families.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} {f.surname} (समग्र ID: {f.samagraId || f.id}) - वार्ड {f.wardNo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Synced / Editable Owner Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'स्वामी / संचालक का नाम *' : 'Owner / Applicant Name *'}
                    </label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. श्री रमेश कुमार गुप्ता"
                      className="w-full px-3.5 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'पिता / पति का नाम *' : 'Father / Husband Name *'}
                    </label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. श्री रामेश्वर गुप्ता"
                      className="w-full px-3.5 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'मोबाइल नंबर *' : 'Mobile Number *'}
                    </label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'समग्र सदस्य आईडी (Samagra Member ID)' : 'Samagra Member ID'}
                    </label>
                    <input
                      type="text"
                      value={samagraMemberId}
                      onChange={(e) => setSamagraMemberId(e.target.value)}
                      placeholder="9-digit Samagra ID"
                      className="w-full px-3.5 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'वार्ड क्रमांक *' : 'Ward No *'}
                    </label>
                    <input
                      type="text"
                      value={wardNo}
                      onChange={(e) => setWardNo(e.target.value)}
                      placeholder="01"
                      className="w-full px-3.5 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'मोहल्ला / ग्राम' : 'Muhalla / Locality'}
                    </label>
                    <input
                      type="text"
                      value={muhalla}
                      onChange={(e) => setMuhalla(e.target.value)}
                      placeholder="e.g. मुख्य बाजार / पटेल चौक"
                      className="w-full px-3.5 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: BUSINESS & SHOP SPECIFICATIONS */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="border-b pb-3 border-slate-200 flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="text-amber-600">🏪</span>
                    <span>{isHindi ? '2. दुकान / व्यावसायिक संस्थान विवरण' : '2. Business / Shop Details'}</span>
                  </h3>
                  <span className="bg-amber-100 text-amber-900 text-[11px] font-black px-3 py-1 rounded-full uppercase">
                    Commercial Property Info
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'व्यावसायिक प्रतिष्ठान / दुकान / संस्थान का नाम *' : 'Business / Shop Name *'}
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. श्री गणेश किराना एवं जनरल स्टोर्स"
                      className="w-full px-4 py-2.5 text-sm font-black border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'व्यवसाय का प्रकार / श्रेणी *' : 'Business Category *'}
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                      required
                    >
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'GST / व्यापार अनुज्ञप्ति / उद्यम क्र. (वैकल्पिक)' : 'GST / Trade License No (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="e.g. 23AAAAA0000A1Z5 / UDYAM-MP-00-12345"
                      className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'दुकान / प्रतिष्ठान का पूरा पता व स्थान *' : 'Shop Complete Address & Location *'}
                    </label>
                    <input
                      type="text"
                      value={shopAddress}
                      onChange={(e) => setShopAddress(e.target.value)}
                      placeholder="e.g. दुकान क्र. 12, मेन रोड, बस स्टैंड के पास, ग्राम पंचायत रामपुर"
                      className="w-full px-3.5 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'दुकान का कुल क्षेत्रफल (वर्ग फीट में) *' : 'Shop Area in Sq. Ft. *'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={shopAreaSqFt}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setShopAreaSqFt(val);
                          // Auto suggest tax rate based on sq ft if not manually overridden
                          if (val && typeof val === 'number') {
                            setAnnualTaxRate(Math.max(200, Math.round(val * 1.5)));
                          }
                        }}
                        placeholder="e.g. 250"
                        className="w-full pl-3.5 pr-14 py-2 text-sm font-mono font-black border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">Sq.Ft</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'दुकान की कुल लागत / अनुमानित मूल्य (₹)' : 'Total Shop Cost / Valuation (₹)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={shopTotalCost}
                        onChange={(e) => setShopTotalCost(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 150000"
                        className="w-full pl-8 pr-3.5 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">
                      {isHindi ? 'वार्षिक विहित व्यावसायिक कर (₹) *' : 'Assessed Annual Business Tax (₹) *'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-bold text-emerald-700">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={annualTaxRate}
                        onChange={(e) => setAnnualTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 300"
                        className="w-full pl-8 pr-3.5 py-2 text-sm font-mono font-black border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/50"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'पंजीयन दिनांक एवं वैधता अवधि' : 'Registration Date & Valid Upto'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={registrationDate}
                        onChange={(e) => setRegistrationDate(e.target.value)}
                        className="px-2.5 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-xl"
                      />
                      <input
                        type="text"
                        value={validUpto}
                        onChange={(e) => setValidUpto(e.target.value)}
                        placeholder="31-03-2027"
                        className="px-2.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl text-center bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: PASSPORT PHOTO UPLOAD */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="border-b pb-3 border-slate-200 flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="text-indigo-600">📸</span>
                    <span>{isHindi ? '3. स्वामी / संचालक का पासपोर्ट साइज फोटो' : '3. Passport Size Photo of Owner'}</span>
                  </h3>
                  <span className="bg-indigo-100 text-indigo-900 text-[11px] font-black px-3 py-1 rounded-full uppercase">
                    Storage Bucket: photos
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {/* Photo Preview Frame */}
                  <div className="w-28 h-32 border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-white flex flex-col items-center justify-center relative shadow-sm shrink-0">
                    {photoUrl ? (
                      <>
                        <img src={photoUrl} alt="Owner" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow cursor-pointer hover:bg-rose-700"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <span className="text-3xl block mb-1">👤</span>
                        <span className="text-[10px] font-bold block leading-tight">
                          {isUploadingPhoto ? 'अपलोड हो रहा है...' : 'पासपोर्ट फोटो'}
                        </span>
                      </div>
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[10px] font-bold text-center p-1">
                        <span className="animate-spin text-lg mb-1">⏳</span>
                        <span>बकेट में अपलोड हो रही है...</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 text-xs">
                    <p className="font-bold text-slate-700">
                      {isHindi ? 'संचालक / स्वामी की हालिया पासपोर्ट आकार की फोटो अपलोड करें:' : 'Upload recent passport size photo of the business owner:'}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>* अधिकतम आकार 5MB (PNG, JPG, JPEG, WebP)।</span>
                      {photoUrl?.startsWith('http') && (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md text-[10px]">
                          ☁️ क्लाउड बकेट में सहेजा गया
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-4 flex flex-wrap gap-3 items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setBusinessName('');
                    setMemberIdInput('');
                    setPhotoUrl('');
                  }}
                  className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer"
                >
                  {isHindi ? 'साफ़ करें (Reset)' : 'Reset Form'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-lg hover:shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>📜</span>
                  <span>{isSubmitting ? (isHindi ? 'पंजीयन हो रहा है...' : 'Registering...') : (isHindi ? 'पंजीयन करें एवं प्रमाण पत्र जारी करें' : 'Submit & Issue Certificate')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT 1 COL: SUMMARY & QUICK TIPS */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏛️</span>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wide">{officeTitle}</h4>
                  <p className="text-xs text-blue-200 font-medium">{officeSubtitle}</p>
                </div>
              </div>

              <div className="border-t border-blue-700/80 pt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-blue-800">
                  <span className="text-blue-200">{isHindi ? 'कुल पंजीकृत दुकानें:' : 'Total Registered Shops:'}</span>
                  <span className="font-black text-base text-amber-300 font-mono">{stats.totalShops}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-blue-800">
                  <span className="text-blue-200">{isHindi ? 'कुल व्यावसायिक क्षेत्रफल:' : 'Total Commercial Area:'}</span>
                  <span className="font-bold text-white font-mono">{stats.totalArea.toLocaleString('en-IN')} Sq.Ft</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-blue-800">
                  <span className="text-blue-200">{isHindi ? 'कुल अनुमानित मूल्यांकन:' : 'Total Valuation:'}</span>
                  <span className="font-bold text-white font-mono">₹{stats.totalValuation.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-blue-200">{isHindi ? 'वार्षिक कर संभाव्यता:' : 'Annual Tax Potential:'}</span>
                  <span className="font-black text-emerald-300 font-mono">₹{stats.totalTaxDemand.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Quick Process Steps Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs text-slate-700">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <span>💡</span>
                <span>{isHindi ? 'पंजीयन प्रक्रिया एवं लाभ' : 'Registration Benefits & Steps'}</span>
              </h4>
              <ul className="space-y-2.5 list-disc pl-4 text-slate-600">
                <li>
                  <strong>समग्र सदस्य आईडी सिंक:</strong> 9-अंकीय समग्र आईडी से स्वामी का नाम, पिता का नाम व पता स्वतः दर्ज होता है।
                </li>
                <li>
                  <strong>अधिकृत प्रमाण पत्र:</strong> सबमिट करते ही ग्राम पंचायत द्वारा जारी डिजिटल सील व क्यूआर कोड युक्त प्रमाण पत्र जनरेट होता है।
                </li>
                <li>
                  <strong>3.11 अन्य कर में स्वतः लिंकिंग:</strong> पंजीकृत दुकानों पर 'अन्य कर' विकल्प के अंतर्गत सीधे व्यावसायिक कर रसीद काटी जा सकती है।
                </li>
                <li>
                  <strong>वैधानिक अनुपालन:</strong> मध्य प्रदेश पंचायत राज अधिनियम 1993 के तहत व्यावसायिक संचालन की आधिकारिक मान्यता।
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT 2: DIRECTORY / DIRECTORY LIST */}
      {activeTab === 'DIRECTORY' && (
        <div className="space-y-6">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold">{isHindi ? 'कुल दुकानें / संस्थान' : 'Total Registered'}</div>
              <div className="text-2xl font-black text-emerald-800 font-mono mt-1">{stats.totalShops}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold">{isHindi ? 'कुल व्यावसायिक क्षेत्रफल' : 'Total Area'}</div>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">{stats.totalArea.toLocaleString('en-IN')} <span className="text-xs font-semibold">Sq.Ft</span></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold">{isHindi ? 'कुल संपत्ति मूल्यांकन' : 'Total Valuation'}</div>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">₹{stats.totalValuation.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold">{isHindi ? 'वार्षिक निर्धारित कर' : 'Annual Tax Demand'}</div>
              <div className="text-xl font-black text-emerald-700 font-mono mt-1">₹{stats.totalTaxDemand.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* CONTROLS & FILTER BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isHindi ? '🔍 प्रतिष्ठान नाम, स्वामी, प्रमाण पत्र क्र., मोबाइल से खोजें...' : 'Search by business, owner, certificate, mobile...'}
                className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 w-full sm:w-72"
              />

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-800"
              >
                <option value="ALL">-- {isHindi ? 'सभी व्यवसाय श्रेणियां' : 'All Categories'} --</option>
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.split('(')[0].trim()}
                  </option>
                ))}
              </select>

              <select
                value={filterWard}
                onChange={(e) => setFilterWard(e.target.value)}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-800"
              >
                <option value="ALL">-- {isHindi ? 'सभी वार्ड' : 'All Wards'} --</option>
                {Array.from(new Set(registrations.map((r) => r.wardNo))).filter(Boolean).sort().map((w) => (
                  <option key={w} value={w}>
                    वार्ड क्र. {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <span>📊</span>
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <span>📑</span>
                <span>PDF</span>
              </button>
              <button
                onClick={() => setActiveTab('REGISTER')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <span>+</span>
                <span>{isHindi ? 'नया पंजीयन' : 'New Registration'}</span>
              </button>
            </div>
          </div>

          {/* DIRECTORY TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-100 font-black text-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">प्रमाण पत्र क्र. (Certificate No)</th>
                    <th className="px-4 py-3 text-left">प्रतिष्ठान एवं स्वामी विवरण</th>
                    <th className="px-4 py-3 text-left">व्यवसाय श्रेणी</th>
                    <th className="px-4 py-3 text-right">क्षेत्रफल (SqFt)</th>
                    <th className="px-4 py-3 text-right">लागत (₹)</th>
                    <th className="px-4 py-3 text-right">वार्षिक कर (₹)</th>
                    <th className="px-4 py-3 text-center">कार्यवाही (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <span className="text-4xl block mb-2">🏪</span>
                        <p className="font-bold text-sm">{isHindi ? 'कोई व्यावसायिक दुकान / संस्थान पंजीयन रिकॉर्ड नहीं मिला।' : 'No business registration records found.'}</p>
                        <p className="text-xs text-slate-400 mt-1">{isHindi ? 'नया दुकान पंजीयन करने हेतु "नया पंजीयन" बटन पर क्लिक करें।' : 'Click "New Registration" to add a new business.'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        {/* Certificate No */}
                        <td className="px-4 py-3 align-top font-mono">
                          <div className="font-black text-emerald-800">{r.certificateNo}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">दिनांक: {formatDateDDMMYYYY(r.registrationDate)}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[9px] rounded-md uppercase">
                            {r.status}
                          </span>
                        </td>

                        {/* Business & Owner Info */}
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start gap-2.5">
                            {r.photoUrl ? (
                              <img src={r.photoUrl} alt="Photo" className="w-9 h-11 object-cover rounded-lg border border-slate-300 shrink-0" />
                            ) : (
                              <div className="w-9 h-11 bg-slate-100 rounded-lg border border-slate-300 flex items-center justify-center text-sm shrink-0">
                                🏪
                              </div>
                            )}
                            <div>
                              <div className="font-black text-slate-900 text-sm">{r.businessName}</div>
                              <div className="font-bold text-slate-700 mt-0.5">स्वामी: {r.ownerName} {r.guardianName ? `(${r.guardianName})` : ''}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                मो: {r.mobile || '-'} | समग्र ID: {r.samagraMemberId || '-'} | वार्ड {r.wardNo}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{r.shopAddress}</div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 align-top">
                          <span className="font-bold text-slate-800 block">{r.businessType.split('(')[0].trim()}</span>
                          {r.gstNumber && <span className="text-[10px] font-mono text-indigo-700 font-semibold block mt-0.5">GST: {r.gstNumber}</span>}
                        </td>

                        {/* Area */}
                        <td className="px-4 py-3 align-top text-right font-mono font-bold text-slate-900">
                          {r.shopAreaSqFt} <span className="text-[10px] text-slate-500 font-normal">Sq.Ft</span>
                        </td>

                        {/* Cost / Valuation */}
                        <td className="px-4 py-3 align-top text-right font-mono font-bold text-slate-800">
                          {r.shopTotalCost ? `₹${r.shopTotalCost.toLocaleString('en-IN')}` : '-'}
                        </td>

                        {/* Tax */}
                        <td className="px-4 py-3 align-top text-right font-mono font-black text-emerald-700 text-sm">
                          {r.annualTaxRate ? `₹${r.annualTaxRate.toLocaleString('en-IN')}` : '-'}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 align-top text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedRegForCertificate(r);
                                setActiveTab('CERTIFICATE');
                              }}
                              title="प्रमाण पत्र देखें / प्रिंट करें"
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>📜</span>
                              <span>प्रमाण पत्र</span>
                            </button>

                            <button
                              onClick={() => setEditingRecord({ ...r })}
                              title="दुकान एवं संचालक विवरण संपादित करें"
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>✏️</span>
                              <span>संपादित करें</span>
                            </button>

                            {onNavigateToOtherTax && (
                              <button
                                onClick={() => onNavigateToOtherTax(r)}
                                title="3.11 अन्य कर में व्यावसायिक रसीद काटें"
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                <span>🧾</span>
                                <span>कर रसीद</span>
                              </button>
                            )}

                            {onDeleteRegistration && (
                              <button
                                type="button"
                                onClick={() => setDeletingRecord(r)}
                                title={isHindi ? 'पंजीयन रिकॉर्ड हटाएं' : 'Delete registration'}
                                className="px-2.5 py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200 flex items-center gap-1 text-[11px] font-bold"
                              >
                                <span>🗑️</span>
                                <span>हटाएं</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT 3: OFFICIAL REGISTRATION CERTIFICATE (प्रमाण पत्र) */}
      {activeTab === 'CERTIFICATE' && selectedRegForCertificate && (
        <div className="space-y-6">
          {/* Certificate Action Toolbar */}
          <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📜</span>
                <span>व्यावसायिक दुकान एवं संस्थान पंजीयन प्रमाण पत्र (Landscape Official View)</span>
              </h3>
              <p className="text-xs text-slate-500">
                प्रमाण पत्र क्र: <strong className="font-mono text-emerald-800">{selectedRegForCertificate.certificateNo}</strong> | {selectedRegForCertificate.businessName} (A4 लैंडस्केप प्रिंटिंग हेतु अनुकूलित)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setEditingRecord({ ...selectedRegForCertificate })}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>✏️</span>
                <span>संपादित करें</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await downloadElementAsPDF('printable-business-certificate', `BusinessCertificate_${selectedRegForCertificate.certificateNo}`, 'landscape');
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>📥</span>
                <span>PDF डाउनलोड करें</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openInStandaloneTab('printable-business-certificate', `Certificate_${selectedRegForCertificate.certificateNo}`, 'landscape');
                }}
                className="px-3.5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="नये विंडो में खोलकर सीधे प्रिंट या PDF सेव करें"
              >
                <span>↗️</span>
                <span>नये टैब में</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerPrint('printable-business-certificate', {
                    orientation: 'landscape',
                    title: `Certificate_${selectedRegForCertificate.certificateNo}`,
                  });
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>🖨️</span>
                <span>प्रिंट करें (Ctrl+P)</span>
              </button>

              {onDeleteRegistration && (
                <button
                  type="button"
                  onClick={() => setDeletingRecord(selectedRegForCertificate)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                  title="प्रमाण पत्र एवं पंजीयन रिकॉर्ड हटाएं"
                >
                  <span>🗑️</span>
                  <span>हटाएं</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('DIRECTORY')}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                सूची पर वापस
              </button>
            </div>
          </div>

          {/* PRINTABLE OFFICIAL CERTIFICATE CARD - PROFESSIONAL A4 LANDSCAPE DESIGN */}
          <div
            id="printable-business-certificate"
            data-orientation="landscape"
            className="printable-certificate printable-landscape certificate-landscape bg-[#fffdfa] p-3.5 sm:p-5 md:p-6 rounded-2xl shadow-2xl border-[4px] border-emerald-950 max-w-[1100px] w-full mx-auto text-slate-900 relative font-devanagari leading-normal box-border print:p-2 print:border-[3px] print:rounded-none print:shadow-none print:max-w-full print:w-full print:overflow-visible print:m-0"
            style={{ boxSizing: 'border-box' }}
          >
            {/* INNER GOLDEN FILIGREE ACCENT BORDER WITH ORNAMENTAL CORNERS */}
            <div className="border-[2px] border-amber-600/70 p-3 sm:p-4 rounded-xl relative overflow-hidden bg-gradient-to-b from-amber-50/25 via-white/95 to-amber-50/35 flex flex-col justify-between space-y-2.5 print:space-y-1.5 print:p-2">
              
              {/* WATERMARK EMBLEM IN BACKGROUND */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.045] pointer-events-none z-0">
                <img
                  src={logoUrl || DEFAULT_OFFICE_LOGO}
                  alt="Watermark Emblem"
                  className="w-96 h-96 object-contain"
                  onError={(e: any) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_OFFICE_LOGO;
                  }}
                />
              </div>

              {/* CORNER ORNAMENTS (TOP-LEFT, TOP-RIGHT, BOTTOM-LEFT, BOTTOM-RIGHT) */}
              <div className="absolute top-1.5 left-1.5 w-6 h-6 border-t-2 border-l-2 border-amber-600 flex items-start justify-start pointer-events-none">
                <span className="text-[9px] text-amber-700 font-serif leading-none">⚜</span>
              </div>
              <div className="absolute top-1.5 right-1.5 w-6 h-6 border-t-2 border-r-2 border-amber-600 flex items-start justify-end pointer-events-none">
                <span className="text-[9px] text-amber-700 font-serif leading-none">⚜</span>
              </div>
              <div className="absolute bottom-1.5 left-1.5 w-6 h-6 border-b-2 border-l-2 border-amber-600 flex items-end justify-start pointer-events-none">
                <span className="text-[9px] text-amber-700 font-serif leading-none">⚜</span>
              </div>
              <div className="absolute bottom-1.5 right-1.5 w-6 h-6 border-b-2 border-r-2 border-amber-600 flex items-end justify-end pointer-events-none">
                <span className="text-[9px] text-amber-700 font-serif leading-none">⚜</span>
              </div>

              {/* 1. OFFICIAL LANDSCAPE HEADER (CLEAN BALANCED EMBLEM & AUTHORITY DETAILS) */}
              <div className="relative z-10 flex items-center justify-between border-b-2 border-emerald-900/80 pb-2.5 print:pb-1.5 min-h-[90px] sm:min-h-[105px] print:min-h-[85px] gap-3">
                {/* Left: State Emblem / Logo */}
                <div className="flex flex-col items-center justify-center shrink-0">
                  <div className="w-18 h-18 sm:w-24 sm:h-24 print:w-20 print:h-20 p-1.5 bg-white rounded-2xl border-2 border-amber-400 shadow-md flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Official Emblem"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain drop-shadow-xs"
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_OFFICE_LOGO;
                      }}
                    />
                  </div>
                  <span className="text-[8.5px] sm:text-[9.5px] print:text-[8px] font-black text-amber-950 mt-0.5 uppercase tracking-widest block font-serif">
                    सत्यमेव जयते
                  </span>
                </div>

                {/* Center: Official Panchayat Details & Certificate Title Ribbon */}
                <div className="flex-1 text-center space-y-1 pr-2 sm:pr-6">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl print:text-2xl font-black text-emerald-950 tracking-wide uppercase leading-tight font-devanagari">
                    {officeTitle}
                  </h1>
                  
                  <p className="text-[11px] sm:text-xs print:text-[10.5px] text-slate-700 font-bold max-w-3xl mx-auto leading-tight">
                    {officeSubtitle}
                  </p>

                  <div className="pt-0.5">
                    <div className="inline-block bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 text-white font-black text-xs sm:text-sm print:text-xs px-5 sm:px-7 py-1 rounded-full uppercase tracking-wider shadow-md border-2 border-amber-400">
                      🏛️ व्यावसायिक दुकान एवं संस्थान पंजीयन प्रमाण पत्र
                    </div>
                    <p className="text-[9px] sm:text-[9.5px] print:text-[8px] text-emerald-950 font-bold mt-0.5">
                      (मध्य प्रदेश पंचायत राज एवं ग्राम स्वराज अधिनियम 1993 के प्रावधानों अंतर्गत विधिमान्य)
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. REGISTRATION NUMBER & METADATA BAR (4-PILL STRIP) */}
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2 print:gap-1.5 bg-amber-100/60 p-1.5 print:p-1 rounded-xl border border-amber-300 text-xs print:text-[10.5px]">
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 print:py-0.5 bg-white/95 rounded-lg border border-amber-200 shadow-xs">
                  <span className="font-bold text-slate-700 shrink-0">प्रमाण पत्र क्र.:</span>
                  <span className="font-mono font-black text-emerald-950 text-xs">{selectedRegForCertificate.certificateNo}</span>
                </div>
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 print:py-0.5 bg-white/95 rounded-lg border border-amber-200 shadow-xs">
                  <span className="font-bold text-slate-700 shrink-0">पंजीयन दिनांक:</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{formatDateDDMMYYYY(selectedRegForCertificate.registrationDate)}</span>
                </div>
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 print:py-0.5 bg-white/95 rounded-lg border border-amber-200 shadow-xs">
                  <span className="font-bold text-slate-700 shrink-0">वित्तीय सत्र:</span>
                  <span className="font-mono font-bold text-indigo-950 text-xs">
                    {selectedRegForCertificate.registrationDate ? getFinancialYear(selectedRegForCertificate.registrationDate).label : '2026-2027'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 print:py-0.5 bg-white/95 rounded-lg border border-amber-200 shadow-xs">
                  <span className="font-bold text-slate-700 shrink-0">वैधता तिथि:</span>
                  <span className="font-mono font-black text-rose-900 text-xs">{selectedRegForCertificate.validUpto || `31-03-${new Date().getFullYear() + 1}`}</span>
                </div>
              </div>

              {/* 3. STATUTORY PREAMBLE DECLARATION */}
              <div className="relative z-10 text-[11px] sm:text-xs print:text-[10px] text-slate-800 leading-snug px-1 text-justify font-medium">
                <p>
                  प्रमाणित किया जाता है कि <strong>मध्य प्रदेश पंचायत राज एवं ग्राम स्वराज अधिनियम 1993</strong> तथा ग्राम पंचायत व्यवसाय एवं कराधान नियमावली के अंतर्गत निम्न विवरण अनुसार व्यावसायिक दुकान / प्रतिष्ठान का अधिकृत पंजीयन ग्राम पंचायत अभिलेख में कर यह प्रमाण पत्र जारी किया जाता है:
                </p>
              </div>

              {/* 4. MAIN 2-COLUMN LANDSCAPE CONTENT GRID */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-3 print:gap-2 items-stretch text-xs print:text-[11px]">
                
                {/* LEFT COLUMN: भाग - १: व्यावसायिक प्रतिष्ठान / दुकान विवरण */}
                <div className="md:col-span-7 print:col-span-7 bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden flex flex-col justify-between">
                  <div className="bg-emerald-900 text-white px-3 py-1 print:py-0.5 font-bold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>🏪</span>
                      <span>भाग - १: व्यावसायिक प्रतिष्ठान / दुकान विवरण</span>
                    </span>
                    <span className="text-[9.5px] text-emerald-200 font-bold">प्रतिष्ठान अभिलेख</span>
                  </div>

                  <table className="min-w-full divide-y divide-slate-200 text-xs print:text-[11px]">
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-emerald-50/40">
                        <td className="px-2.5 py-1.5 print:py-1 font-bold text-slate-700 w-2/5">प्रतिष्ठान / दुकान का नाम:</td>
                        <td className="px-2.5 py-1.5 print:py-1 font-black text-slate-950 text-xs sm:text-sm">{selectedRegForCertificate.businessName}</td>
                      </tr>
                      <tr>
                        <td className="px-2.5 py-1 print:py-0.5 font-bold text-slate-700">व्यवसाय का प्रकार / श्रेणी:</td>
                        <td className="px-2.5 py-1 print:py-0.5 font-bold text-emerald-900">{selectedRegForCertificate.businessType}</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-2.5 py-1 print:py-0.5 font-bold text-slate-700">दुकान / प्रतिष्ठान का पता व वार्ड:</td>
                        <td className="px-2.5 py-1 print:py-0.5 font-medium text-slate-900">
                          {selectedRegForCertificate.shopAddress} (वार्ड क्र. {selectedRegForCertificate.wardNo})
                          {selectedRegForCertificate.muhalla ? `, ${selectedRegForCertificate.muhalla}` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2.5 py-1 print:py-0.5 font-bold text-slate-700">दुकान कुल क्षेत्रफल:</td>
                        <td className="px-2.5 py-1 print:py-0.5 font-mono font-black text-slate-950">
                          {selectedRegForCertificate.shopAreaSqFt} वर्ग फीट
                        </td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-2.5 py-1 print:py-0.5 font-bold text-slate-700">दुकान की अनुमानित लागत:</td>
                        <td className="px-2.5 py-1 print:py-0.5 font-mono font-bold text-slate-900">
                          {selectedRegForCertificate.shopTotalCost ? `₹${selectedRegForCertificate.shopTotalCost.toLocaleString('en-IN')}` : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2.5 py-1 print:py-0.5 font-bold text-slate-700">GST / अनुज्ञप्ति क्रमांक:</td>
                        <td className="px-2.5 py-1 print:py-0.5 font-mono font-bold text-slate-800">{selectedRegForCertificate.gstNumber || 'लागू नहीं'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* RIGHT COLUMN: भाग - २: स्वामी / संचालक विवरण एवं अधिकृत छायाचित्र */}
                <div className="md:col-span-5 print:col-span-5 bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden flex flex-col justify-between">
                  <div className="bg-emerald-900 text-white px-3 py-1 print:py-0.5 font-bold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>👤</span>
                      <span>भाग - २: स्वामी / संचालक विवरण एवं छायाचित्र</span>
                    </span>
                    <span className="text-[9.5px] text-emerald-200 font-bold">संचालक अभिलेख</span>
                  </div>

                  <div className="p-2.5 print:p-1.5 flex gap-2.5 items-start">
                    {/* Owner Details Table */}
                    <div className="flex-1 space-y-1 print:space-y-0.5">
                      <div className="border-b border-slate-100 pb-0.5">
                        <span className="text-[9.5px] text-slate-500 block font-medium">स्वामी / संचालक नाम:</span>
                        <strong className="text-xs font-black text-slate-950 block">{selectedRegForCertificate.ownerName}</strong>
                      </div>
                      <div className="border-b border-slate-100 pb-0.5">
                        <span className="text-[9.5px] text-slate-500 block font-medium">पिता / पति का नाम:</span>
                        <span className="text-[11px] font-bold text-slate-800 block">{selectedRegForCertificate.guardianName || '-'}</span>
                      </div>
                      <div className="border-b border-slate-100 pb-0.5">
                        <span className="text-[9.5px] text-slate-500 block font-medium">समग्र परिवार / सदस्य ID:</span>
                        <span className="text-[11px] font-mono font-bold text-slate-900 block">
                          ID: {selectedRegForCertificate.samagraMemberId || selectedRegForCertificate.memberId || '-'}
                        </span>
                      </div>
                      <div className="border-b border-slate-100 pb-0.5">
                        <span className="text-[9.5px] text-slate-500 block font-medium">पंजीकृत मोबाइल नंबर:</span>
                        <span className="text-[11px] font-mono font-bold text-slate-900 block">{selectedRegForCertificate.mobile || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-500 block font-medium">सामाजिक वर्ग:</span>
                        <span className="text-[11px] font-bold text-slate-700 block">{selectedRegForCertificate.category || 'सामान्य (General)'}</span>
                      </div>
                    </div>

                    {/* Verified Photo Frame */}
                    <div className="w-24 h-30 sm:w-26 sm:h-32 print:w-22 print:h-28 border-2 border-emerald-900 rounded-xl overflow-hidden bg-slate-100 flex flex-col items-center justify-center shrink-0 shadow-xs relative">
                      {selectedRegForCertificate.photoUrl ? (
                        <img
                          src={selectedRegForCertificate.photoUrl}
                          alt="Owner"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-1.5 text-slate-400">
                          <span className="text-2xl block">👤</span>
                          <span className="text-[8.5px] font-bold block mt-0.5">अधिकृत फोटो</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-emerald-900 text-white text-[7.5px] font-black text-center py-0.5 uppercase tracking-wider font-devanagari">
                        अधिकृत छायाचित्र
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50/90 px-2.5 py-1 border-t border-amber-200 text-[11px] text-amber-950 font-bold flex justify-between items-center">
                    <span>वैधता अवधि:</span>
                    <span className="font-mono text-emerald-950 font-black">{selectedRegForCertificate.validUpto || `31-03-${new Date().getFullYear() + 1}`} तक</span>
                  </div>
                </div>

              </div>

              {/* 5. STATUTORY TERMS & CONDITIONS (नियम एवं वैधानिक शर्तें) */}
              <div className="relative z-10 bg-slate-50/90 p-2 print:p-1.5 rounded-xl border border-slate-200 text-[9px] sm:text-[9.5px] print:text-[8.5px] text-slate-700 space-y-0.5 leading-snug">
                <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 mb-0.5">
                  <strong className="text-slate-900 font-black text-[9.5px] sm:text-[10.5px]">नियम एवं वैधानिक शर्तें:</strong>
                  <span className="text-[9px] text-slate-500 font-devanagari">ग्राम पंचायत कराधान नियमावली</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 print:gap-1.5">
                  <p><strong>१.</strong> यह प्रमाण पत्र ग्राम पंचायत सीमा क्षेत्र में उक्त व्यवसाय संचालन हेतु अधिकृत है एवं नियत समयावधि तक विधिमान्य है।</p>
                  <p><strong>२.</strong> प्रतिष्ठान स्वामी द्वारा ग्राम पंचायत के समस्त विहित करों एवं शुल्कों का समय पर भुगतान करना अनिवार्य होगा।</p>
                  <p><strong>३.</strong> सार्वजनिक मार्ग, नाली अथवा शासकीय भूमि पर किसी भी प्रकार का अतिक्रमण या अनधिकृत विस्तार करना प्रतिबंधित है।</p>
                </div>
              </div>

              {/* 6. OFFICIAL SIGNATURES FOOTER */}
              <div className="relative z-10 pt-2 border-t-2 border-emerald-900/70 grid grid-cols-2 items-end text-center text-xs text-slate-800 px-6 sm:px-14 print:px-8">
                {/* Column 1: Secretary Signature & Seal Area */}
                <div className="flex flex-col items-center">
                  <div className="h-12 sm:h-14 print:h-11 flex items-end justify-center w-full pb-1">
                    <span className="text-[10px] text-slate-400/80 italic font-medium tracking-wide">
                      (हस्ताक्षर एवं पदमुद्रा)
                    </span>
                  </div>
                  <div className="border-b border-slate-700/80 w-44 sm:w-52 mb-1"></div>
                  <p className="font-black text-slate-950 text-xs sm:text-sm print:text-xs tracking-wide">{secretaryName}</p>
                  <p className="font-bold text-slate-700 text-[10.5px] print:text-[9.5px]">सचिव / ग्राम रोजगार सहायक</p>
                  <p className="text-[9.5px] print:text-[8.5px] text-slate-500 font-medium">{officeTitle}</p>
                </div>

                {/* Column 2: Sarpanch Signature & Seal Area */}
                <div className="flex flex-col items-center">
                  <div className="h-12 sm:h-14 print:h-11 flex items-end justify-center w-full pb-1">
                    <span className="text-[10px] text-slate-400/80 italic font-medium tracking-wide">
                      (हस्ताक्षर एवं पदमुद्रा)
                    </span>
                  </div>
                  <div className="border-b border-slate-700/80 w-44 sm:w-52 mb-1"></div>
                  <p className="font-black text-slate-950 text-xs sm:text-sm print:text-xs tracking-wide">{sarpanchName}</p>
                  <p className="font-bold text-slate-700 text-[10.5px] print:text-[9.5px]">सरपंच / ग्राम प्रधान</p>
                  <p className="text-[9.5px] print:text-[8.5px] text-slate-500 font-medium">{officeTitle}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: EDIT SHOP / OWNER DETAILS */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-300 overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-800 via-blue-900 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <span>✏️</span>
                  <span>{isHindi ? 'दुकान एवं स्वामी विवरण संपादित करें' : 'Edit Business & Owner Details'}</span>
                </h3>
                <p className="text-xs text-blue-200 font-mono mt-0.5">
                  प्रमाण पत्र क्र: {editingRecord.certificateNo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Edit Form */}
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-800">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'प्रतिष्ठान / दुकान का नाम *' : 'Shop / Business Name *'}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.businessName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, businessName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'व्यवसाय श्रेणी / प्रकार *' : 'Business Category *'}
                  </label>
                  <select
                    value={editingRecord.businessType}
                    onChange={(e) => setEditingRecord({ ...editingRecord, businessType: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {BUSINESS_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'स्वामी / संचालक का नाम *' : 'Owner Name *'}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.ownerName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, ownerName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'पिता / पति का नाम' : 'Guardian / Father Name'}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.guardianName || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, guardianName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.mobile || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, mobile: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'वार्ड क्रमांक' : 'Ward No'}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.wardNo || '01'}
                    onChange={(e) => setEditingRecord({ ...editingRecord, wardNo: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'समग्र सदस्य आईडी' : 'Samagra Member ID'}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.samagraMemberId || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, samagraMemberId: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'दुकान / प्रतिष्ठान का पूरा पता *' : 'Shop Address *'}
                </label>
                <input
                  type="text"
                  value={editingRecord.shopAddress}
                  onChange={(e) => setEditingRecord({ ...editingRecord, shopAddress: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'क्षेत्रफल (Sq.Ft) *' : 'Shop Area (Sq.Ft) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingRecord.shopAreaSqFt}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditingRecord({
                        ...editingRecord,
                        shopAreaSqFt: val,
                        annualTaxRate: editingRecord.annualTaxRate || Math.max(200, Math.round(val * 1.5)),
                      });
                    }}
                    className="w-full px-3 py-2 text-sm font-mono font-black border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'कुल लागत (₹)' : 'Total Cost (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.shopTotalCost || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, shopTotalCost: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-900 uppercase mb-1">
                    {isHindi ? 'वार्षिक कर दर (₹) *' : 'Annual Tax (₹) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.annualTaxRate || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, annualTaxRate: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono font-black border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'GST / अनुज्ञप्ति क्रमांक' : 'GST / License No'}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.gstNumber || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, gstNumber: e.target.value })}
                    placeholder="23XXXXX0000X1Z5"
                    className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'पंजीयन दिनांक' : 'Registration Date'}
                  </label>
                  <input
                    type="date"
                    value={editingRecord.registrationDate}
                    onChange={(e) => setEditingRecord({ ...editingRecord, registrationDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'वैधता अवधि' : 'Valid Upto'}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.validUpto || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, validUpto: e.target.value })}
                    placeholder="31-03-2027"
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl text-center"
                  />
                </div>
              </div>

              {/* Status and Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'पंजीयन स्थिति' : 'Registration Status'}
                  </label>
                  <select
                    value={editingRecord.status || 'ACTIVE'}
                    onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="ACTIVE">ACTIVE (सक्रिय)</option>
                    <option value="EXPIRED">EXPIRED (समाप्त)</option>
                    <option value="CANCELLED">CANCELLED (निरस्त)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'विशेष टीप / विवरण' : 'Remarks / Notes'}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.remarks || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, remarks: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Photo Upload in Edit Modal */}
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="w-14 h-16 border rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 relative">
                  {editingRecord.photoUrl ? (
                    <img src={editingRecord.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">👤</span>
                  )}
                  {isUploadingEditPhoto && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px]">
                      <span className="animate-spin">⏳</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-xs">
                  <span className="font-bold block text-slate-700 mb-1">फोटो बदलें (Change Passport Photo):</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingEditPhoto}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        alert(isHindi ? 'फोटो का आकार 5MB से कम होना चाहिए।' : 'Photo size must be under 5MB.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (reader.result) {
                          setEditingRecord({ ...editingRecord, photoUrl: reader.result as string });
                        }
                      };
                      reader.readAsDataURL(file);

                      try {
                        setIsUploadingEditPhoto(true);
                        const res = await uploadImageToSupabaseBucket(file, 'photos', 'business_photos');
                        if (res.success && res.publicUrl) {
                          setEditingRecord({ ...editingRecord, photoUrl: res.publicUrl });
                          showToast(isHindi ? '✅ नई फोटो स्टोरेज बकेट में अपलोड हो गई!' : 'New photo uploaded to storage bucket!');
                        }
                      } catch (err) {
                        console.warn('Edit modal photo upload:', err);
                      } finally {
                        setIsUploadingEditPhoto(false);
                      }
                    }}
                    className="text-xs text-slate-500 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white cursor-pointer disabled:opacity-50"
                  />
                  {editingRecord.photoUrl?.startsWith('http') && (
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                      ☁️ क्लाउड बकेट यूआरएल सक्रिय
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <div>
                  {onDeleteRegistration && (
                    <button
                      type="button"
                      onClick={() => {
                        const rec = editingRecord;
                        setEditingRecord(null);
                        setDeletingRecord(rec);
                      }}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🗑️</span>
                      <span>{isHindi ? 'पंजीयन हटाएं' : 'Delete'}</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                  >
                    रद्द करें (Cancel)
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>💾</span>
                    <span>{isSubmitting ? 'सुरक्षित हो रहा है...' : 'परिवर्तन सहेजें (Save Updates)'}</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL (No reliance on blocked browser window.confirm) */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-rose-200 animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🗑️
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                {isHindi ? 'दुकान पंजीयन रिकॉर्ड हटाएं?' : 'Delete Business Registration Record?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isHindi ? (
                  <>
                    क्या आप दुकान <strong>"{deletingRecord.businessName}"</strong> (प्रमाण पत्र क्र. <span className="font-mono font-bold text-emerald-800">{deletingRecord.certificateNo}</span>) का पंजीयन रिकॉर्ड स्थायी रूप से हटाना चाहते हैं?
                  </>
                ) : (
                  <>
                    Are you sure you want to delete business registration for <strong>"{deletingRecord.businessName}"</strong> (Certificate: <span className="font-mono font-bold">{deletingRecord.certificateNo}</span>)?
                  </>
                )}
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 text-left font-medium">
                ⚠️ {isHindi ? 'नोट: यह रिकॉर्ड स्थानीय सूची एवं Supabase डेटाबेस दोनों से हटा दिया जाएगा।' : 'Note: This record will be permanently deleted from database.'}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingRecord(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {isHindi ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>🗑️</span>
                <span>{isDeleting ? 'हटाया जा रहा है...' : (isHindi ? 'हाँ, हटाएं (Delete)' : 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessRegistrationView;
