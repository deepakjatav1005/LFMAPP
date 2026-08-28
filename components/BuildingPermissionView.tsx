import React, { useState, useMemo } from 'react';
import { BuildingPermissionRecord, Family, OfficeDetails } from '../types';
import ViewHeader from './ViewHeader';
import OfficialVoucherHeader from './OfficialVoucherHeader';
import { formatDateDDMMYYYY, triggerPrint, getCleanOfficeTitle } from '../utils/printUtils';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import {
  DuplicateWarningModal,
  DuplicateWarningDetails,
  SuccessPopupModal,
  SuccessPopupDetails,
} from './EntryFeedbackModals';

interface BuildingPermissionViewProps {
  permissionList: BuildingPermissionRecord[];
  families: Family[];
  officeDetails?: OfficeDetails;
  onCreatePermission: (perm: Omit<BuildingPermissionRecord, 'id' | 'voucherNo' | 'permissionNo' | 'createdAt'>) => Promise<BuildingPermissionRecord | void>;
  onDeletePermission?: (id: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const BuildingPermissionView: React.FC<BuildingPermissionViewProps> = ({
  permissionList = [],
  families = [],
  officeDetails,
  onCreatePermission,
  onDeletePermission,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedPermForPrint, setSelectedPermForPrint] = useState<BuildingPermissionRecord | null>(null);
  const [deletingPerm, setDeletingPerm] = useState<BuildingPermissionRecord | null>(null);
  const [isDeletingPerm, setIsDeletingPerm] = useState<boolean>(false);

  // Form State
  const [beneficiarySearch, setBeneficiarySearch] = useState<string>('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [constructionType, setConstructionType] = useState<string>('आवासीय (Residential)');
  const [totalFloors, setTotalFloors] = useState<string>('भू-तल + प्रथम तल (G + 1)');
  const [areaSqFt, setAreaSqFt] = useState<number | ''>(600);
  const [chargeAmount, setChargeAmount] = useState<number | ''>('');
  const [sanitationFee, setSanitationFee] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK' | 'UPI' | 'CHEQUE'>('CASH');
  const [transactionId, setTransactionId] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('पंचायत अनुमोदन संकल्प अनुसार वैध।');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Duplicate Warning & Success Popup Modal State
  const [duplicateModalInfo, setDuplicateModalInfo] = useState<DuplicateWarningDetails | null>(null);
  const [successModalInfo, setSuccessModalInfo] = useState<SuccessPopupDetails | null>(null);

  const calculatedTotalAmount = useMemo(() => {
    const cAmount = Number(chargeAmount) || 0;
    const sFee = Number(sanitationFee) || 0;
    return cAmount + sFee;
  }, [chargeAmount, sanitationFee]);

  // Beneficiary search results
  const searchedFamilies = useMemo(() => {
    if (!beneficiarySearch.trim()) return families.slice(0, 15);
    const q = beneficiarySearch.toLowerCase();
    return families.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.surname.toLowerCase().includes(q) ||
        (f.guardianName && f.guardianName.toLowerCase().includes(q)) ||
        (f.samagraId && f.samagraId.includes(q)) ||
        (f.mobile && f.mobile.includes(q)) ||
        (f.wardNo && f.wardNo.includes(q))
    ).slice(0, 20);
  }, [families, beneficiarySearch]);

  const selectedFamily = useMemo(() => {
    return families.find((f) => f.id === selectedFamilyId) || null;
  }, [families, selectedFamilyId]);

  // Check if the selected beneficiary already has an issued Building Permission
  const existingPermissionForSelected = useMemo(() => {
    if (!selectedFamily) return null;
    return (
      permissionList.find(
        (p) =>
          (p.familyId && p.familyId === selectedFamily.id) ||
          (selectedFamily.samagraId && p.samagraId === selectedFamily.samagraId)
      ) || null
    );
  }, [selectedFamily, permissionList]);

  const handleSelectFamily = (fam: Family) => {
    setSelectedFamilyId(fam.id);
    setBeneficiarySearch(`${fam.name} ${fam.surname} (समग्र ID: ${fam.samagraId})`);
    if (!locationAddress && (fam.muhalla || fam.address)) {
      setLocationAddress(`${fam.muhalla || ''} वार्ड क्र. ${fam.wardNo || '01'}`);
    }
  };

  const executeSavePermission = async () => {
    if (!selectedFamily) return;
    const chargeNum = Number(chargeAmount);
    // Default validity: 1 year from today
    const validDate = new Date();
    validDate.setFullYear(validDate.getFullYear() + 1);
    const validUptoStr = validDate.toISOString().split('T')[0];

    setIsSubmitting(true);
    try {
      const created = await onCreatePermission({
        familyId: selectedFamily.id,
        beneficiaryName: `${selectedFamily.name} ${selectedFamily.surname}`,
        guardianName: selectedFamily.guardianName,
        mobile: selectedFamily.mobile,
        wardNo: selectedFamily.wardNo,
        samagraId: selectedFamily.samagraId,
        locationAddress: locationAddress.trim() || `वार्ड क्र. ${selectedFamily.wardNo || '01'}`,
        constructionType,
        totalFloors,
        areaSqFt: Number(areaSqFt) || 0,
        ratePerSqFt: 0,
        chargeAmount: chargeNum,
        taxAmount: chargeNum,
        sanitationFee: sanitationFee ? Number(sanitationFee) : 0,
        totalAmount: calculatedTotalAmount,
        paymentMode,
        transactionId: transactionId.trim() || undefined,
        validUpto: validUptoStr,
        remarks: remarks.trim() || undefined,
      });

      // Show Successful Popup Confirmation Modal
      setSuccessModalInfo({
        title: isHindi ? 'भवन निर्माण अनुमति सफलतापूर्वक स्वीकृत!' : 'Building Permission Approved Successfully!',
        message: isHindi
          ? `ग्राम पंचायत द्वारा भवन निर्माण अनुमति एवं कर वाउचर जारी कर दिया गया है एवं कैशबुक आय में सुरक्षित हो गया है।`
          : `Building permission certificate & tax voucher issued and saved to Cashbook.`,
        recordType: isHindi ? 'भवन निर्माण अनुमति' : 'BUILDING PERMISSION',
        details: [
          { label: isHindi ? 'हितग्राही का नाम' : 'Beneficiary', value: `${selectedFamily.name} ${selectedFamily.surname}` },
          { label: isHindi ? 'स्थान / वार्ड' : 'Location', value: locationAddress.trim() || `वार्ड क्र. ${selectedFamily.wardNo || '01'}` },
          { label: isHindi ? 'निर्माण प्रकार' : 'Type', value: constructionType },
          { label: isHindi ? 'कुल जमा शुल्क राशि' : 'Total Fee Paid', value: `₹${calculatedTotalAmount.toLocaleString('en-IN')}` },
          { label: isHindi ? 'वैधता अवधि' : 'Valid Upto', value: formatDateDDMMYYYY(validUptoStr) },
        ],
        printButtonLabel: isHindi ? '🖨️ प्रमाण पत्र एवं रसीद प्रिंट करें' : 'Print Certificate & Receipt',
        onPrint: () => {
          if (created) {
            setSelectedPermForPrint(created as BuildingPermissionRecord);
          }
        },
        onClose: () => {
          setSuccessModalInfo(null);
        },
        isHindi,
      });

      // Reset form
      setSelectedFamilyId('');
      setBeneficiarySearch('');
      setLocationAddress('');
      setChargeAmount('');
      setSanitationFee('');
      setTransactionId('');
      setActiveTab('LIST');
    } catch (err) {
      console.error('Error creating building permission:', err);
      alert(isHindi ? 'भवन निर्माण अनुमति दर्ज करने में त्रुटि हुई।' : 'Error creating building permission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily) {
      alert(isHindi ? 'कृपया पंजीकृत हितग्राही का चयन करें।' : 'Please select a registered beneficiary.');
      return;
    }

    const chargeNum = Number(chargeAmount);
    if (isNaN(chargeNum) || chargeNum <= 0) {
      alert(isHindi ? 'कृपया वैध निर्माण अनुमति शुल्क राशि दर्ज करें।' : 'Please enter a valid charge amount.');
      return;
    }

    // CHECK: Existing permission for selected beneficiary
    if (existingPermissionForSelected) {
      setDuplicateModalInfo({
        title: isHindi ? 'समान निर्माण अनुमति प्रविष्टि चेतावनी (Duplicate Permission Warning)' : 'Duplicate Permission Warning',
        message: isHindi
          ? `चेतावनी: इस हितग्राही (${selectedFamily.name} ${selectedFamily.surname}) हेतु पहले से ही निर्माण अनुमति क्रमांक (${existingPermissionForSelected.permissionNo}) दिनांक ${formatDateDDMMYYYY(existingPermissionForSelected.createdAt || existingPermissionForSelected.validUpto)} को जारी है। क्या आप फिर भी नई निर्माण अनुमति प्रविष्टि करना चाहते हैं?`
          : `Warning: Building Permission (${existingPermissionForSelected.permissionNo}) has already been issued for this beneficiary. Do you want to proceed anyway?`,
        duplicateInfo: [
          { label: isHindi ? 'मौजूदा अनुमति क्र.' : 'Existing Permission No', value: existingPermissionForSelected.permissionNo },
          { label: isHindi ? 'हितग्राही का नाम' : 'Beneficiary', value: existingPermissionForSelected.beneficiaryName },
          { label: isHindi ? 'स्थान / वार्ड' : 'Location', value: existingPermissionForSelected.locationAddress },
          { label: isHindi ? 'पूर्व जमा शुल्क' : 'Previous Fee', value: `₹${existingPermissionForSelected.totalAmount.toLocaleString('en-IN')}` },
        ],
        onConfirm: () => {
          setDuplicateModalInfo(null);
          executeSavePermission();
        },
        onCancel: () => {
          setDuplicateModalInfo(null);
        },
        isHindi,
      });
      return;
    }

    executeSavePermission();
  };

  // Filtered permission records
  const filteredPermissions = useMemo(() => {
    return permissionList.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        p.permissionNo.toLowerCase().includes(q) ||
        p.voucherNo.toLowerCase().includes(q) ||
        p.beneficiaryName.toLowerCase().includes(q) ||
        (p.samagraId && p.samagraId.includes(q)) ||
        (p.plotNo && p.plotNo.toLowerCase().includes(q)) ||
        (p.wardNo && p.wardNo.includes(q));

      const matchesType = filterType === 'ALL' || p.constructionType?.includes(filterType);
      return matchesSearch && matchesType;
    });
  }, [permissionList, searchTerm, filterType]);

  // Statistics
  const totalTaxRevenue = useMemo(() => {
    return filteredPermissions.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  }, [filteredPermissions]);

  const totalSanitationRevenue = useMemo(() => {
    return filteredPermissions.reduce((sum, p) => sum + (p.sanitationFee || 0), 0);
  }, [filteredPermissions]);

  const officeTitle = getCleanOfficeTitle(officeDetails);

  // EXCEL EXPORT FUNCTION
  const handleExportExcel = () => {
    if (filteredPermissions.length === 0) {
      alert(isHindi ? 'डाउनलोड हेतु कोई रिकॉर्ड उपलब्ध नहीं है।' : 'No records available to export.');
      return;
    }

    const headers = [
      'क्र. (S.No)',
      'अनुमति क्र. (Permission No)',
      'वाउचर क्र. (Voucher No)',
      'दिनांक (Date)',
      'हितग्राही का नाम (Beneficiary Name)',
      'पिता/पति का नाम (Guardian Name)',
      'मोबाइल (Mobile)',
      'वार्ड क्र. (Ward No)',
      'समग्र ID (Samagra ID)',
      'निर्माण स्थल पता (Site Address)',
      'निर्माण का प्रकार (Type)',
      'मंजिलें (Floors)',
      'अनुमति शुल्क ₹ (Charge Amount)',
      'स्वच्छता शुल्क ₹ (Sanitation Fee)',
      'कुल जमा राशि ₹ (Total Amount)',
      'भुगतान माध्यम (Payment Mode)',
      'ट्रांजेक्शन ID (Txn ID)',
      'वैधता अवधि (Valid Upto)',
      'रिमार्क (Remarks)',
    ];

    const rows = filteredPermissions.map((p, idx) => [
      idx + 1,
      p.permissionNo,
      p.voucherNo,
      formatDateDDMMYYYY(p.createdAt),
      p.beneficiaryName,
      p.guardianName || p.fatherHusbandName || '',
      p.mobile || '',
      p.wardNo || '',
      p.samagraId || '',
      p.locationAddress || '',
      p.constructionType || '',
      p.totalFloors || '',
      p.chargeAmount ?? p.taxAmount ?? p.totalAmount,
      p.sanitationFee || 0,
      p.totalAmount,
      p.paymentMode,
      p.transactionId || '',
      p.validUpto || '',
      p.remarks || '',
    ]);

    // Add Summary Row
    rows.push([
      'कुल योग (Total)',
      `कुल अनुमतियां: ${filteredPermissions.length}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalSanitationRevenue,
      totalTaxRevenue,
      '',
      '',
      '',
      '',
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(
      `Building_Permissions_${dateStr}`,
      'Building Permissions',
      headers,
      rows
    );
  };

  // PDF REPORT EXPORT FUNCTION
  const handleExportPDF = () => {
    if (filteredPermissions.length === 0) {
      alert(isHindi ? 'डाउनलोड हेतु कोई रिकॉर्ड उपलब्ध नहीं है।' : 'No records available to export.');
      return;
    }

    const headers = [
      'क्र.',
      'अनुमति क्र.',
      'वाउचर क्र.',
      'दिनांक',
      'हितग्राही का नाम व पिता/पति',
      'वार्ड / स्थल',
      'निर्माण प्रकार',
      'अनुमति शुल्क (₹)',
      'स्वच्छता (₹)',
      'कुल शुल्क (₹)',
      'माध्यम',
    ];

    const rows = filteredPermissions.map((p, idx) => [
      idx + 1,
      p.permissionNo,
      p.voucherNo,
      formatDateDDMMYYYY(p.createdAt),
      `${p.beneficiaryName} ${p.guardianName || p.fatherHusbandName ? `(${p.guardianName || p.fatherHusbandName})` : ''}`,
      `वार्ड ${p.wardNo || '01'}`,
      p.constructionType || 'आवासीय',
      `₹${(p.chargeAmount ?? p.taxAmount ?? p.totalAmount).toLocaleString('en-IN')}`,
      `₹${(p.sanitationFee || 0).toLocaleString('en-IN')}`,
      `₹${p.totalAmount.toLocaleString('en-IN')}`,
      p.paymentMode,
    ]);

    // Total row
    rows.push([
      'कुल',
      `कुल स्वीकृतियां: ${filteredPermissions.length}`,
      '',
      '',
      '',
      '',
      '',
      '',
      `₹${totalSanitationRevenue.toLocaleString('en-IN')}`,
      `₹${totalTaxRevenue.toLocaleString('en-IN')}`,
      '',
    ]);

    const title = 'ग्राम पंचायत भवन निर्माण अनुमति एवं कर पंजी (Building Permission & Tax Register)';
    const subtitle = `कुल जारी अनुमतियां: ${filteredPermissions.length} | कुल प्राप्त निर्माण अनुमति व कर आय: ₹${totalTaxRevenue.toLocaleString('en-IN')}`;

    exportToPDF(
      'Building_Permission_Register',
      title,
      subtitle,
      headers,
      rows,
      officeTitle
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER WITH VIEWHEADER */}
      <ViewHeader
        title={isHindi ? '3.8- भवन निर्माण अनुमति एवं कर' : '3.8- Building Permission & Tax'}
        subtitle={
          isHindi
            ? 'भवन निर्माण अनुमति शुल्क प्रविष्टि एवं स्वीकृति प्रमाण पत्र (एक हितग्राही हेतु केवल 1 बार अनुमति, कैशबुक आय में स्वतः प्रविष्टि)'
            : 'Building construction permission charge entry, sanction certificate & Cashbook income recording'
        }
        icon="🏗️"
        isHindi={isHindi}
        onBack={onBack}
        onClose={onClose}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'LIST'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>📋</span>
              <span>{isHindi ? 'अनुमति एवं कर सूची' : 'Permission List'} ({permissionList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('CREATE')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'CREATE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
              }`}
            >
              <span>➕</span>
              <span>{isHindi ? 'नई निर्माण अनुमति जारी करें' : '+ Issue Permission & Tax'}</span>
            </button>
          </div>
        }
      />

      {/* NOTIFICATION BANNER */}
      {notification && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 text-emerald-900 rounded-2xl flex items-center gap-3 shadow-md animate-fade-in font-bold text-sm">
          <span>🎉</span>
          <span>{notification}</span>
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{isHindi ? 'जारी कुल स्वीकृतियां' : 'Total Permissions'}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{filteredPermissions.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center text-xl font-bold border border-blue-200">
            📄
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between bg-emerald-50/20">
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase">{isHindi ? 'कुल निर्माण अनुमति शुल्क आय' : 'Total Revenue'}</p>
            <p className="text-2xl font-black text-emerald-800 mt-1">₹{totalTaxRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-xl font-bold border border-emerald-300">
            💰
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm flex items-center justify-between bg-purple-50/20">
          <div>
            <p className="text-xs font-bold text-purple-700 uppercase">{isHindi ? 'कुल स्वच्छता/अन्य शुल्क' : 'Total Sanitation Fee'}</p>
            <p className="text-2xl font-black text-purple-800 mt-1">₹{totalSanitationRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 text-purple-800 rounded-2xl flex items-center justify-center text-xl font-bold border border-purple-300">
            🧹
          </div>
        </div>
      </div>

      {/* TAB 1: LIST VIEW */}
      {activeTab === 'LIST' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          {/* SEARCH & FILTERS & DOWNLOAD BUTTONS */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full md:w-80">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder={isHindi ? 'अनुमति क्र., हितग्राही, समग्र ID, वार्ड खोजें...' : 'Search Permission No, Beneficiary, Samagra ID...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-medium"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-700"
              >
                <option value="ALL">{isHindi ? 'सभी निर्माण प्रकार' : 'All Construction Types'}</option>
                <option value="आवासीय">आवासीय (Residential)</option>
                <option value="व्यावसायिक">व्यावसायिक (Commercial)</option>
                <option value="मिश्रित">मिश्रित (Mixed)</option>
              </select>
            </div>

            {/* DOWNLOAD EXCEL & PDF BUTTONS */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 text-xs font-black rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title={isHindi ? 'एक्सेल स्प्रेडशीट डाउनलोड करें' : 'Download Excel Sheet'}
              >
                <span>📊</span>
                <span>{isHindi ? 'Excel डाउनलोड' : 'Excel Export'}</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="px-3.5 py-2 text-xs font-black rounded-xl bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title={isHindi ? 'पीडीएफ रिपोर्ट डाउनलोड / प्रिंट करें' : 'Download PDF Report'}
              >
                <span>📄</span>
                <span>{isHindi ? 'PDF रिपोर्ट डाउनलोड' : 'PDF Report'}</span>
              </button>

              <div className="text-xs text-slate-600 font-bold bg-white px-3 py-2 rounded-xl border border-slate-200">
                {isHindi ? 'प्रदर्शित:' : 'Showing:'} <span className="text-primary font-black">{filteredPermissions.length}</span>
              </div>
            </div>
          </div>

          {/* TABLE OF PERMISSIONS */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase">{isHindi ? 'अनुमति व वाउचर क्र.' : 'Perm & Voucher No'}</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase">{isHindi ? 'हितग्राही व स्थल' : 'Beneficiary & Site'}</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase">{isHindi ? 'निर्माण विवरण' : 'Construction Details'}</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-600 uppercase">{isHindi ? 'अनुमति शुल्क (₹)' : 'Permission Charge (₹)'}</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-600 uppercase">{isHindi ? 'कुल राशि (₹)' : 'Total (₹)'}</th>
                  <th className="px-4 py-3 text-center text-xs font-black text-slate-600 uppercase">{isHindi ? 'माध्यम' : 'Mode'}</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-600 uppercase">{isHindi ? 'कार्यवाही' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredPermissions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-black text-xs text-primary bg-primary-50 px-2 py-0.5 rounded border border-primary-200 inline-block">
                        {p.permissionNo}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        वाउचर: {p.voucherNo}
                      </div>
                      <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                        📅 {formatDateDDMMYYYY(p.createdAt)}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-black text-slate-900">{p.beneficiaryName}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {p.guardianName || p.fatherHusbandName ? `पिता/पति: ${p.guardianName || p.fatherHusbandName} | ` : ''}वार्ड: {p.wardNo || '01'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        समग्र: {p.samagraId || 'N/A'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-800">
                      <div className="font-bold text-slate-900">{p.constructionType || 'आवासीय'}</div>
                      <div className="text-[11px] text-slate-500">{p.totalFloors || 'भू-तल'} {p.areaSqFt ? `| ${p.areaSqFt} Sq.Ft` : ''}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.locationAddress || 'ग्राम पंचायत क्षेत्र'}</div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-xs">
                      <div className="font-black text-slate-900">₹{(p.chargeAmount ?? p.taxAmount ?? p.totalAmount).toLocaleString('en-IN')}</div>
                      {p.sanitationFee ? (
                        <div className="text-[10px] text-slate-500 font-normal">
                          + स्वच्छता: ₹{p.sanitationFee}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-black text-emerald-800 text-sm">
                      <div>₹{p.totalAmount.toLocaleString('en-IN')}</div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                        {p.paymentMode}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedPermForPrint(p)}
                        className="px-2.5 py-1 text-xs font-black text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title={isHindi ? 'अनुमति प्रमाण पत्र देखें / प्रिंट करें' : 'View / Print Sanction Certificate'}
                      >
                        <span>📜</span>
                        <span>{isHindi ? 'प्रमाण पत्र' : 'Sanction'}</span>
                      </button>

                      {onDeletePermission && (
                        <button
                          type="button"
                          onClick={() => setDeletingPerm(p)}
                          className="px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                          title={isHindi ? 'हटाएं' : 'Delete'}
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredPermissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      {isHindi ? 'कोई भवन निर्माण अनुमति दर्ज नहीं मिली।' : 'No building permission records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE NEW BUILDING PERMISSION & TAX */}
      {activeTab === 'CREATE' && (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="border-b pb-4 border-slate-200">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>🏗️ {isHindi ? 'भवन निर्माण अनुमति एवं कर निर्धारण वाउचर' : 'Building Permission & Tax Assessment'}</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                {isHindi ? 'स्वचालित कर गणना' : 'Auto-Calculated Tax'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isHindi
                ? 'हितग्राही का चयन करें, निर्माण का क्षेत्रफल (वर्ग फीट) व दर दर्ज करें। नियमानुसार एक हितग्राही हेतु केवल 1 बार निर्माण अनुमति जारी की जा सकती है।'
                : 'Select beneficiary, enter construction area (sq ft) and rate. Only one-time building permission is permitted per beneficiary.'}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* 1. BENEFICIARY SELECTION */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-black text-slate-800 uppercase">
                {isHindi ? '1. पंजीकृत हितग्राही का चयन करें (Beneficiary Selection - केवल 1 बार अनुमन्य) *' : '1. Select Registered Beneficiary (One-Time Only) *'}
              </label>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder={isHindi ? 'नाम, पिता/पति का नाम, समग्र ID या मोबाइल नंबर टाइप करके खोजें...' : 'Type name, Samagra ID, or mobile to search...'}
                  value={beneficiarySearch}
                  onChange={(e) => {
                    setBeneficiarySearch(e.target.value);
                    if (selectedFamilyId) setSelectedFamilyId('');
                  }}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-semibold"
                  required
                />
              </div>

              {/* Autocomplete dropdown results */}
              {!selectedFamilyId && searchedFamilies.length > 0 && (
                <div className="max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 text-xs">
                  {searchedFamilies.map((fam) => {
                    const alreadyPermitted = permissionList.find(
                      (p) =>
                        (p.familyId && p.familyId === fam.id) ||
                        (fam.samagraId && p.samagraId === fam.samagraId)
                    );

                    return (
                      <div
                        key={fam.id}
                        onClick={() => handleSelectFamily(fam)}
                        className={`p-3 cursor-pointer flex items-center justify-between transition-colors ${
                          alreadyPermitted ? 'bg-amber-50/70 hover:bg-amber-100/70' : 'hover:bg-emerald-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">{fam.name} {fam.surname}</span>
                            {alreadyPermitted && (
                              <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-300">
                                ⚠️ पूर्व में अनुमति क्र. {alreadyPermitted.permissionNo} जारी
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500">
                            ({fam.guardianName ? `पिता/पति: ${fam.guardianName}` : `Ward ${fam.wardNo}`})
                          </span>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            समग्र: {fam.samagraId} | Mob: {fam.mobile} | श्रेणी: {fam.category || 'APL'}
                          </div>
                        </div>

                        <div>
                          {alreadyPermitted ? (
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 font-black rounded-lg text-[10px] border border-amber-300">
                              देखें ➔
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-black rounded-lg text-[10px] border border-emerald-300">
                              चुनें ➔
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected Beneficiary Preview Card */}
              {selectedFamily && (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-emerald-950 text-sm">👤 {selectedFamily.name} {selectedFamily.surname}</span>
                      <span className="ml-2 font-mono text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        समग्र ID: {selectedFamily.samagraId}
                      </span>
                      <div className="text-[11px] text-emerald-800 mt-1">
                        {selectedFamily.guardianName ? `पिता/पति: ${selectedFamily.guardianName} | ` : ''}वार्ड: {selectedFamily.wardNo || '01'}, {selectedFamily.muhalla || ''} | मो.: {selectedFamily.mobile}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFamilyId('');
                        setBeneficiarySearch('');
                      }}
                      className="text-rose-600 font-bold text-xs hover:underline cursor-pointer"
                    >
                      बदलें (Change)
                    </button>
                  </div>

                  {/* ONE-TIME RESTRICTION WARNING IF ALREADY ISSUED */}
                  {existingPermissionForSelected && (
                    <div className="p-4 bg-rose-50 border-2 border-rose-400 text-rose-900 rounded-xl shadow-sm space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 font-black text-sm text-rose-800">
                        <span>🚫</span>
                        <span>
                          {isHindi
                            ? 'इस हितग्राही हेतु पहले से निर्माण अनुमति जारी की जा चुकी है!'
                            : 'Building Permission already issued for this beneficiary!'}
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 leading-relaxed font-medium">
                        {isHindi
                          ? `हितग्राही ${selectedFamily.name} ${selectedFamily.surname} हेतु अनुमति क्रमांक (${existingPermissionForSelected.permissionNo}) एवं वाउचर क्रमांक (${existingPermissionForSelected.voucherNo}) दिनांक ${formatDateDDMMYYYY(existingPermissionForSelected.createdAt)} को पहले से जारी हो चुका है। शासकीय नियमानुसार एक हितग्राही को केवल एक बार ही निर्माण अनुमति जारी की जा सकती है।`
                          : `Permission ${existingPermissionForSelected.permissionNo} already exists for this beneficiary. Only 1 permission voucher is permitted per beneficiary.`}
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPermForPrint(existingPermissionForSelected)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all"
                        >
                          <span>📜</span>
                          <span>{isHindi ? 'पूर्व जारी अनुमति प्रमाण पत्र देखें / प्रिंट करें' : 'View / Print Sanction Certificate'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. CONSTRUCTION SITE & DETAILS */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <label className="block text-xs font-black text-slate-800 uppercase">
                {isHindi ? '2. निर्माण स्थल एवं प्रकार विवरण (Construction Site & Details)' : '2. Construction Site & Details'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    {isHindi ? 'निर्माण स्थल का पता / मोहल्ला / वार्ड' : 'Construction Site Address'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. मुख्य मार्ग, पटेल मोहल्ला, वार्ड 02"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    {isHindi ? 'निर्माण का प्रकार (Type) *' : 'Construction Type *'}
                  </label>
                  <select
                    value={constructionType}
                    onChange={(e) => setConstructionType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-bold"
                  >
                    <option value="आवासीय (Residential)">आवासीय (Residential)</option>
                    <option value="व्यावसायिक दुकान/गोदाम (Commercial)">व्यावसायिक दुकान/गोदाम (Commercial)</option>
                    <option value="मिश्रित - आवासीय व दुकान (Mixed)">मिश्रित - आवासीय व दुकान (Mixed)</option>
                    <option value="औद्योगिक / वर्कशॉप (Industrial)">औद्योगिक / वर्कशॉप (Industrial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    {isHindi ? 'मंजिलों की संख्या (Floors)' : 'Total Floors'}
                  </label>
                  <select
                    value={totalFloors}
                    onChange={(e) => setTotalFloors(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-bold"
                  >
                    <option value="भू-तल केवल (Ground Floor Only)">भू-तल केवल (Ground Floor Only)</option>
                    <option value="भू-तल + प्रथम तल (G + 1)">भू-तल + प्रथम तल (G + 1)</option>
                    <option value="भू-तल + 2 तल (G + 2)">भू-तल + 2 तल (G + 2)</option>
                    <option value="अतिरिक्त तल निर्माण (Additional Floor)">अतिरिक्त तल निर्माण (Additional Floor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    {isHindi ? 'निर्माण क्षेत्रफल (वर्ग फीट) *' : 'Construction Area (Sq.Ft) *'}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 600"
                    value={areaSqFt}
                    onChange={(e) => setAreaSqFt(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
                    min="0"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {isHindi ? 'कुल निर्मित / प्रस्तावित क्षेत्रफल (Sq.Ft)' : 'Total construction area in sq ft'}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. DIRECT MANUAL CHARGE AMOUNT ENTRY */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-4">
              <label className="block text-xs font-black text-emerald-950 uppercase flex items-center justify-between">
                <span>{isHindi ? '3. निर्माण अनुमति शुल्क प्रविष्टि (Permission Charge Amount)' : '3. Building Permission Charge'}</span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                  {isHindi ? 'सीधे शुल्क राशि दर्ज करें' : 'Manual Charge Entry'}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    {isHindi ? 'भवन निर्माण अनुमति शुल्क राशि (₹) *' : 'Permission Charge Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-base font-mono font-black border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    required
                    min="1"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isHindi ? 'ग्राम पंचायत द्वारा निर्धारित निर्माण अनुमति शुल्क राशि भरें' : 'Enter the fixed permission charge amount'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    {isHindi ? 'मलबा / स्वच्छता शुल्क (₹) [वैकल्पिक]' : 'Sanitation Fee (₹) [Optional]'}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={sanitationFee}
                    onChange={(e) => setSanitationFee(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-base font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    min="0"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isHindi ? 'अतिरिक्त स्वच्छता/कचरा प्रबंधन शुल्क (यदि लागू हो)' : 'Optional sanitation/debris fee'}
                  </p>
                </div>
              </div>

              {/* Total amount summary card */}
              <div className="p-4 bg-white border-2 border-emerald-400 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div>
                  <div className="text-xs text-slate-500 font-bold">
                    {isHindi ? 'शुल्क विवरण:' : 'Charge Breakdown:'}
                  </div>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5">
                    अनुमति शुल्क: <span className="font-black text-emerald-700">₹{Number(chargeAmount) || 0}</span>
                    {sanitationFee ? ` + स्वच्छता शुल्क: ₹${sanitationFee}` : ''}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">{isHindi ? 'कुल जमा शुल्क' : 'Total Charge'}</div>
                  <div className="text-2xl font-black text-emerald-800 font-mono">
                    ₹{calculatedTotalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. PAYMENT & TRANSACTION DETAILS */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <label className="block text-xs font-black text-slate-800 uppercase">
                {isHindi ? '4. भुगतान विवरण (Payment Details - कैशबुक आय में स्वतः प्रविष्टि)' : '4. Payment Details'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    {isHindi ? 'भुगतान का माध्यम (Payment Mode) *' : 'Payment Mode *'}
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-bold"
                  >
                    <option value="CASH">नकद (CASH)</option>
                    <option value="BANK">बैंक खाता (BANK TRANSFER)</option>
                    <option value="UPI">UPI / QR कोड / ऑनलाइन</option>
                    <option value="CHEQUE">चेक / ड्राफ्ट (CHEQUE / DD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    {isHindi ? 'ट्रांजेक्शन / रसीद / चेक क्रमांक' : 'Txn / Cheque No'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-987654321 / Chq 00124"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  {isHindi ? 'विशेष टिप्पणी / रिमार्क' : 'Remarks'}
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-medium"
                />
              </div>
            </div>

            {/* FORM ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                {isHindi ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !selectedFamilyId || !!existingPermissionForSelected}
                className={`px-6 py-2.5 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                  existingPermissionForSelected
                    ? 'bg-slate-400 text-white cursor-not-allowed opacity-75'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-500/25 cursor-pointer disabled:opacity-50'
                }`}
              >
                {isSubmitting ? (
                  <span>{isHindi ? 'प्रक्रियाधीन...' : 'Processing...'}</span>
                ) : existingPermissionForSelected ? (
                  <span>🚫 {isHindi ? 'अनुमति पहले से जारी है (केवल 1 बार अनुमन्य)' : 'Permission Already Issued'}</span>
                ) : (
                  <>
                    <span>🏗️</span>
                    <span>{isHindi ? 'भवन निर्माण अनुमति स्वीकृत करें एवं वाउचर बनाएं' : 'Approve Permission & Issue Voucher'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: PRINT SANCTION CERTIFICATE */}
      {selectedPermForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 animate-slide-up border-2 border-primary my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Controls Sticky Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <div>
                  <h4 className="font-black text-slate-900 text-sm sm:text-base">
                    {isHindi ? 'भवन निर्माण अनुमति एवं कर पावती प्रमाण पत्र' : 'Building Sanction Certificate & Tax Voucher'}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">अनुमति क्र.: {selectedPermForPrint.permissionNo}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPermForPrint(null)}
                className="text-slate-500 hover:text-slate-800 font-bold px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>✕</span> {isHindi ? 'बंद करें (Close)' : 'Close'}
              </button>
            </div>

            {/* Scrollable Printable Body */}
            <div className="overflow-y-auto flex-1 py-3 pr-1 space-y-4 my-1">
              {/* PRINTABLE CERTIFICATE CONTENT */}
              <div id="printable-building-permission" className="printable-area p-5 sm:p-7 bg-white border-2 border-dashed border-primary-300 rounded-2xl space-y-5 text-slate-900">
                {/* Standard Official Header with Logo */}
                <OfficialVoucherHeader
                  officeDetails={officeDetails}
                  adminPanchayat={officeDetails?.gramPanchayat}
                  voucherTitle="भवन निर्माण स्वीकृति एवं कर पावती वाउचर (BUILDING PERMISSION & TAX RECEIPT)"
                  voucherSubTitle="म.प्र. पंचायत राज एवं ग्राम स्वराज अधिनियम के अंतर्गत स्वीकृत"
                  badgeBgColor="bg-sky-50 text-sky-950 border-sky-300"
                />

                {/* Meta information */}
                <div className="flex items-center justify-between text-xs font-bold border-b border-slate-200 pb-2">
                  <div>
                    अनुमति क्रमांक: <span className="font-mono text-primary font-black">{selectedPermForPrint.permissionNo}</span>
                  </div>
                  <div>
                    वाउचर क्र.: <span className="font-mono">{selectedPermForPrint.voucherNo}</span>
                  </div>
                  <div>
                    दिनांक: <span className="font-mono">{formatDateDDMMYYYY(selectedPermForPrint.createdAt)}</span>
                  </div>
                </div>

                {/* Sanction Body Text */}
                <div className="text-xs leading-relaxed space-y-3">
                  <p>
                    प्रमाणित किया जाता है कि श्री/श्रीमती <strong>{selectedPermForPrint.beneficiaryName}</strong>
                    {selectedPermForPrint.guardianName || selectedPermForPrint.fatherHusbandName ? ` आत्मज/पत्नी श्री ${selectedPermForPrint.guardianName || selectedPermForPrint.fatherHusbandName}` : ''},
                    निवासी वार्ड क्रमांक <strong>{selectedPermForPrint.wardNo || '01'}</strong> (समग्र ID: <span className="font-mono">{selectedPermForPrint.samagraId || 'N/A'}</span>) को
                    स्थल <strong>{selectedPermForPrint.locationAddress || `वार्ड क्र. ${selectedPermForPrint.wardNo || '01'}`}</strong> पर
                    <strong> {selectedPermForPrint.constructionType || 'आवासीय'}</strong> निर्माण ({selectedPermForPrint.totalFloors || 'भू-तल'}{selectedPermForPrint.areaSqFt ? `, क्षेत्रफल: ${selectedPermForPrint.areaSqFt} वर्ग फीट` : ''}) हेतु ग्राम पंचायत द्वारा भवन निर्माण अनुमति प्रदान की जाती है।
                  </p>

                  {/* Tax Assessment Details Table */}
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                    <div className="font-black text-slate-800 text-xs uppercase border-b border-slate-200 pb-1">
                      शुल्क निर्धारण एवं भुगतान विवरण (Fee Assessment & Payment Details)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">निर्माण प्रकार:</span>
                        <div className="font-black text-slate-900">{selectedPermForPrint.constructionType || 'आवासीय'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">स्वीकृत क्षेत्रफल:</span>
                        <div className="font-black text-slate-900 font-mono">{selectedPermForPrint.areaSqFt ? `${selectedPermForPrint.areaSqFt} Sq.Ft` : 'यथाप्रस्तावित'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">भवन निर्माण अनुमति शुल्क:</span>
                        <div className="font-black text-slate-900 font-mono">₹{(selectedPermForPrint.chargeAmount ?? selectedPermForPrint.taxAmount ?? selectedPermForPrint.totalAmount).toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">स्वच्छता / अन्य शुल्क:</span>
                        <div className="font-black text-slate-900 font-mono">₹{(selectedPermForPrint.sanitationFee || 0).toLocaleString('en-IN')}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-black text-slate-900">कुल प्राप्त राशि (Total Paid Amount):</span>
                      <span className="font-black font-mono text-emerald-800 text-base">₹{selectedPermForPrint.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      भुगतान माध्यम: <span className="font-bold text-slate-800">{selectedPermForPrint.paymentMode}</span>
                      {selectedPermForPrint.transactionId ? ` | Txn ID: ${selectedPermForPrint.transactionId}` : ''}
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800">शर्तें एवं निर्देश:</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>भवन निर्माण पंचायत द्वारा स्वीकृत स्थल एवं नियमों के अनुसार ही किया जाएगा।</li>
                      <li>सार्वजनिक मार्ग या पड़ोसी की भूमि पर कोई अतिक्रमण नहीं किया जाएगा।</li>
                      <li>यह अनुमति जारी होने के दिनांक से <strong>1 वर्ष ({selectedPermForPrint.validUpto ? formatDateDDMMYYYY(selectedPermForPrint.validUpto) : '1 वर्ष'})</strong> तक वैध रहेगी।</li>
                      <li>निर्माण सामग्री सार्वजनिक रास्ते पर न फैलाएं तथा स्वच्छता नियमों का पालन करें।</li>
                    </ul>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8 flex items-end justify-between text-xs text-center border-t border-slate-200">
                  <div className="space-y-1">
                    <div className="font-bold">{officeDetails?.secretaryName || 'सचिव / ग्राम रोजगार सहायक'}</div>
                    <div className="text-slate-500">हस्ताक्षर एवं सील</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold">{officeDetails?.sarpanchName || 'सरपंच'}</div>
                    <div className="text-slate-500">हस्ताक्षर एवं सील</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer Actions */}
            <div className="flex items-center justify-between gap-3 print:hidden pt-3 border-t border-slate-200 shrink-0">
              <button
                onClick={() => setSelectedPermForPrint(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {isHindi ? 'वापस जाएं (Close)' : 'Close'}
              </button>
              <button
                onClick={() => triggerPrint('printable-building-permission')}
                className="px-6 py-2.5 bg-primary hover:bg-primary-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>🖨️</span>
                <span>{isHindi ? 'प्रमाण पत्र प्रिंट / डाउनलोड करें' : 'Print Certificate PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {deletingPerm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-rose-200 animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🗑️
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                {isHindi ? 'भवन निर्माण अनुमति हटाएं?' : 'Delete Building Permission?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isHindi ? (
                  <>
                    क्या आप निर्माण अनुमति क्र. <span className="font-mono font-bold text-emerald-800">{deletingPerm.permissionNo}</span> (हितग्राही: <strong>{deletingPerm.beneficiaryName}</strong>) को स्थायी रूप से हटाना चाहते हैं?
                  </>
                ) : (
                  <>
                    Are you sure you want to delete building permission <span className="font-mono font-bold">{deletingPerm.permissionNo}</span> for <strong>{deletingPerm.beneficiaryName}</strong>?
                  </>
                )}
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 text-left font-medium">
                ⚠️ {isHindi ? 'नोट: यह रिकॉर्ड एवं संबंधित कैशबुक आय प्रविष्टि दोनों हटा दी जाएंगी।' : 'Note: Record and associated cashbook voucher will be deleted.'}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingPerm}
                onClick={() => setDeletingPerm(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {isHindi ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={isDeletingPerm}
                onClick={async () => {
                  if (!deletingPerm) return;
                  const idToDelete = deletingPerm.id;
                  try {
                    setIsDeletingPerm(true);
                    if (selectedPermForPrint?.id === idToDelete) {
                      setSelectedPermForPrint(null);
                    }
                    if (onDeletePermission) {
                      await onDeletePermission(idToDelete);
                    }
                  } finally {
                    setIsDeletingPerm(false);
                    setDeletingPerm(null);
                  }
                }}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>🗑️</span>
                <span>{isDeletingPerm ? 'हटाया जा रहा है...' : (isHindi ? 'हाँ, हटाएं' : 'Delete Now')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Warning Modal with User Confirmation */}
      {duplicateModalInfo && (
        <DuplicateWarningModal
          isOpen={true}
          title={duplicateModalInfo.title}
          message={duplicateModalInfo.message}
          duplicateInfo={duplicateModalInfo.duplicateInfo}
          onConfirm={duplicateModalInfo.onConfirm}
          onCancel={duplicateModalInfo.onCancel}
          isHindi={isHindi}
        />
      )}

      {/* Success Popup Modal */}
      {successModalInfo && (
        <SuccessPopupModal
          isOpen={true}
          title={successModalInfo.title}
          message={successModalInfo.message}
          recordType={successModalInfo.recordType}
          details={successModalInfo.details}
          printButtonLabel={successModalInfo.printButtonLabel}
          onPrint={successModalInfo.onPrint}
          onClose={successModalInfo.onClose}
          isHindi={isHindi}
        />
      )}
    </div>
  );
};

export default BuildingPermissionView;
