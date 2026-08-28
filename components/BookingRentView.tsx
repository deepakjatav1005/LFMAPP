import React, { useState, useMemo } from 'react';
import { BookingRentRecord, Family, OfficeDetails } from '../types';
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

interface BookingRentViewProps {
  bookingList: BookingRentRecord[];
  families: Family[];
  officeDetails?: OfficeDetails;
  onCreateBooking: (booking: Omit<BookingRentRecord, 'id' | 'voucherNo' | 'createdAt'>) => Promise<BookingRentRecord | void>;
  onDeleteBooking?: (id: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const BookingRentView: React.FC<BookingRentViewProps> = ({
  bookingList = [],
  families = [],
  officeDetails,
  onCreateBooking,
  onDeleteBooking,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [selectedBookingForPrint, setSelectedBookingForPrint] = useState<BookingRentRecord | null>(null);

  // Form State
  const [beneficiarySearch, setBeneficiarySearch] = useState<string>('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [facilityName, setFacilityName] = useState<string>('ग्राम पंचायत सामुदायिक भवन (Community Hall)');
  const [customFacility, setCustomFacility] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('विवाह / शादी समारोह (Marriage Function)');
  const [customPurpose, setCustomPurpose] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState<string>('21:00');
  const [chargeAmount, setChargeAmount] = useState<number | ''>('');
  const [securityDeposit, setSecurityDeposit] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK' | 'UPI' | 'CHEQUE'>('CASH');
  const [transactionId, setTransactionId] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Duplicate Warning & Success Popup Modal State
  const [duplicateModalInfo, setDuplicateModalInfo] = useState<DuplicateWarningDetails | null>(null);
  const [successModalInfo, setSuccessModalInfo] = useState<SuccessPopupDetails | null>(null);

  // Filtered beneficiaries for autocomplete selection
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

  const handleSelectFamily = (fam: Family) => {
    setSelectedFamilyId(fam.id);
    setBeneficiarySearch(`${fam.name} ${fam.surname} (समग्र ID: ${fam.samagraId})`);
  };

  const executeSaveBooking = async () => {
    if (!selectedFamily) return;
    const amountNum = Number(chargeAmount);
    const finalFacility = facilityName === 'OTHER' ? customFacility || 'अन्य परिसंपत्ति' : facilityName;
    const finalPurpose = purpose === 'OTHER' ? customPurpose || 'अन्य प्रयोजन' : purpose;

    setIsSubmitting(true);
    try {
      const created = await onCreateBooking({
        familyId: selectedFamily.id,
        beneficiaryName: `${selectedFamily.name} ${selectedFamily.surname}`,
        guardianName: selectedFamily.guardianName,
        mobile: selectedFamily.mobile,
        wardNo: selectedFamily.wardNo,
        samagraId: selectedFamily.samagraId,
        facilityName: finalFacility,
        purpose: finalPurpose,
        startDate,
        startTime,
        endDate,
        endTime,
        chargeAmount: amountNum,
        securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
        paymentMode,
        transactionId: transactionId.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      // Show Successful Popup Confirmation Modal
      setSuccessModalInfo({
        title: isHindi ? 'बुकिंग वाउचर सफलतापूर्वक दर्ज हुआ!' : 'Booking Voucher Saved Successfully!',
        message: isHindi
          ? `ग्राम पंचायत परिसंपत्ति/भवन बुकिंग वाउचर सफलतापूर्वक पंजीकृत हो गया है एवं कैशबुक आय में सुरक्षित कर दिया गया है।`
          : `Booking voucher registered successfully and recorded in Cashbook Income.`,
        recordType: isHindi ? 'बुकिंग रसीद' : 'BOOKING RECEIPT',
        details: [
          { label: isHindi ? 'हितग्राही का नाम' : 'Beneficiary', value: `${selectedFamily.name} ${selectedFamily.surname}` },
          { label: isHindi ? 'परिसंपत्ति / भवन' : 'Facility', value: finalFacility },
          { label: isHindi ? 'बुकिंग अवधि' : 'Dates', value: `${formatDateDDMMYYYY(startDate)} से ${formatDateDDMMYYYY(endDate)}` },
          { label: isHindi ? 'किराया शुल्क राशि' : 'Rent Amount', value: `₹${amountNum.toLocaleString('en-IN')}` },
          { label: isHindi ? 'भुगतान माध्यम' : 'Payment Mode', value: paymentMode },
        ],
        printButtonLabel: isHindi ? '🖨️ रसीद प्रिंट करें' : 'Print Receipt',
        onPrint: () => {
          if (created) {
            setSelectedBookingForPrint(created as BookingRentRecord);
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
      setChargeAmount('');
      setSecurityDeposit('');
      setRemarks('');
      setTransactionId('');
      setActiveTab('LIST');
    } catch (err) {
      console.error('Error creating booking voucher:', err);
      alert(isHindi ? 'बुकिंग वाउचर बनाने में त्रुटि हुई।' : 'Error creating booking voucher.');
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

    const amountNum = Number(chargeAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert(isHindi ? 'कृपया वैध किराया राशि दर्ज करें।' : 'Please enter a valid charge amount.');
      return;
    }

    if (!startDate || !endDate) {
      alert(isHindi ? 'कृपया बुकिंग प्रारंभ एवं समाप्ति तिथि चुनें।' : 'Please select valid start and end dates.');
      return;
    }

    const finalFacility = facilityName === 'OTHER' ? customFacility || 'अन्य परिसंपत्ति' : facilityName;

    // Check for duplicate / overlapping bookings
    const matchingBooking = bookingList.find((b) => {
      const sameFacility = b.facilityName === finalFacility;
      const sameFamily = b.familyId === selectedFamily.id || (selectedFamily.samagraId && b.samagraId === selectedFamily.samagraId);
      const overlappingDates =
        (startDate >= b.startDate && startDate <= b.endDate) ||
        (endDate >= b.startDate && endDate <= b.endDate) ||
        (startDate <= b.startDate && endDate >= b.endDate);
      return (sameFacility && overlappingDates) || (sameFamily && overlappingDates);
    });

    if (matchingBooking) {
      setDuplicateModalInfo({
        title: isHindi ? 'समान बुकिंग प्रविष्टि चेतावनी (Duplicate Booking Warning)' : 'Duplicate Booking Warning',
        message: isHindi
          ? `चेतावनी: इस परिसर (${finalFacility}) या हितग्राही (${matchingBooking.beneficiaryName}) हेतु दिनांक ${formatDateDDMMYYYY(matchingBooking.startDate)} से ${formatDateDDMMYYYY(matchingBooking.endDate)} की अवधि में पहले से बुकिंग वाउचर (${matchingBooking.voucherNo}) दर्ज है।`
          : `Warning: An existing booking (${matchingBooking.voucherNo}) already exists for this facility/beneficiary on matching dates.`,
        duplicateInfo: [
          { label: isHindi ? 'मौजूदा वाउचर क्र.' : 'Existing Voucher No', value: matchingBooking.voucherNo },
          { label: isHindi ? 'हितग्राही का नाम' : 'Beneficiary', value: matchingBooking.beneficiaryName },
          { label: isHindi ? 'परिसंपत्ति' : 'Facility', value: matchingBooking.facilityName },
          { label: isHindi ? 'दर्ज बुकिंग अवधि' : 'Dates', value: `${formatDateDDMMYYYY(matchingBooking.startDate)} से ${formatDateDDMMYYYY(matchingBooking.endDate)}` },
        ],
        onConfirm: () => {
          setDuplicateModalInfo(null);
          executeSaveBooking();
        },
        onCancel: () => {
          setDuplicateModalInfo(null);
        },
        isHindi,
      });
      return;
    }

    executeSaveBooking();
  };

  // Filtered booking records list
  const filteredBookings = useMemo(() => {
    return bookingList.filter((b) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        b.voucherNo.toLowerCase().includes(q) ||
        b.beneficiaryName.toLowerCase().includes(q) ||
        (b.samagraId && b.samagraId.includes(q)) ||
        (b.mobile && b.mobile.includes(q)) ||
        (b.facilityName && b.facilityName.toLowerCase().includes(q)) ||
        (b.purpose && b.purpose.toLowerCase().includes(q));

      const matchesMode = filterMode === 'ALL' || b.paymentMode === filterMode;
      return matchesSearch && matchesMode;
    });
  }, [bookingList, searchTerm, filterMode]);

  // Statistics
  const totalRevenue = useMemo(() => {
    return filteredBookings.reduce((sum, b) => sum + (b.chargeAmount || 0), 0);
  }, [filteredBookings]);

  const totalSecurity = useMemo(() => {
    return filteredBookings.reduce((sum, b) => sum + (b.securityDeposit || 0), 0);
  }, [filteredBookings]);

  const officeTitle = getCleanOfficeTitle(officeDetails);

  // Export to Excel (3.7 - बुकिंग एवं किराया वाउचर पंजी)
  const handleExportExcel = () => {
    if (filteredBookings.length === 0) {
      alert(isHindi ? 'डाउनलोड हेतु कोई रिकॉर्ड उपलब्ध नहीं है।' : 'No records available to export.');
      return;
    }

    const headers = [
      'क्र. (S.No.)',
      'वाउचर क्र. (Voucher No)',
      'दिनांक (Date)',
      'हितग्राही का नाम (Beneficiary)',
      'पिता/पति का नाम (Guardian)',
      'मोबाइल (Mobile)',
      'वार्ड क्र. (Ward No)',
      'समग्र ID (Samagra ID)',
      'परिसंपत्ति / स्थान (Facility / Asset)',
      'प्रयोजन (Purpose)',
      'आरंभ तिथि (Start Date)',
      'आरंभ समय (Start Time)',
      'समाप्ति तिथि (End Date)',
      'समाप्ति समय (End Time)',
      'किराया शुल्क ₹ (Rent Amount)',
      'सुरक्षा अमानत ₹ (Security Deposit)',
      'भुगतान माध्यम (Payment Mode)',
      'ट्रांजेक्शन ID (Txn ID)',
      'रिमार्क (Remarks)',
    ];

    const rows = filteredBookings.map((b, idx) => [
      idx + 1,
      b.voucherNo,
      formatDateDDMMYYYY(b.createdAt),
      b.beneficiaryName,
      b.guardianName || '',
      b.mobile || '',
      b.wardNo || '',
      b.samagraId || '',
      b.facilityName,
      b.purpose,
      formatDateDDMMYYYY(b.startDate),
      b.startTime || '',
      formatDateDDMMYYYY(b.endDate),
      b.endTime || '',
      b.chargeAmount,
      b.securityDeposit || 0,
      b.paymentMode,
      b.transactionId || '',
      b.remarks || '',
    ]);

    // Add Summary Row
    rows.push([
      'कुल योग (Total)',
      `कुल बुकिंग्स: ${filteredBookings.length}`,
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
      '',
      totalRevenue,
      totalSecurity,
      '',
      '',
      '',
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(
      `Booking_Rent_Register_${dateStr}`,
      'Booking & Rent Register',
      headers,
      rows
    );
  };

  // Export to PDF (3.7 - बुकिंग एवं किराया वाउचर पंजी)
  const handleExportPDF = () => {
    if (filteredBookings.length === 0) {
      alert(isHindi ? 'डाउनलोड हेतु कोई रिकॉर्ड उपलब्ध नहीं है।' : 'No records available to export.');
      return;
    }

    const headers = [
      'क्र.',
      'वाउचर क्र.',
      'दिनांक',
      'हितग्राही का नाम व पिता/पति',
      'वार्ड',
      'परिसंपत्ति / स्थान',
      'प्रयोजन व अवधि',
      'किराया शुल्क (₹)',
      'अमानत (₹)',
      'माध्यम',
    ];

    const rows = filteredBookings.map((b, idx) => [
      idx + 1,
      b.voucherNo,
      formatDateDDMMYYYY(b.createdAt),
      `${b.beneficiaryName} ${b.guardianName ? `(${b.guardianName})` : ''}`,
      b.wardNo || '01',
      b.facilityName,
      `${b.purpose} (${formatDateDDMMYYYY(b.startDate)} से ${formatDateDDMMYYYY(b.endDate)})`,
      `₹${b.chargeAmount.toLocaleString('en-IN')}`,
      b.securityDeposit ? `₹${b.securityDeposit.toLocaleString('en-IN')}` : '-',
      b.paymentMode,
    ]);

    // Total row
    rows.push([
      'कुल',
      `कुल बुकिंग: ${filteredBookings.length}`,
      '',
      '',
      '',
      '',
      '',
      `₹${totalRevenue.toLocaleString('en-IN')}`,
      `₹${totalSecurity.toLocaleString('en-IN')}`,
      '',
    ]);

    const title = 'ग्राम पंचायत परिसंपत्ति बुकिंग एवं किराया पंजी (Booking & Rent Register)';
    const subtitle = `कुल बुकिंग्स: ${filteredBookings.length} | कुल किराया आय: ₹${totalRevenue.toLocaleString('en-IN')} | सुरक्षा अमानत: ₹${totalSecurity.toLocaleString('en-IN')}`;

    exportToPDF(
      'Booking_Rent_Register',
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
        title={isHindi ? '3.7- बुकिंग एवं किराया वाउचर' : '3.7- Booking & Rent Management'}
        subtitle={
          isHindi
            ? 'पंचायत सामुदायिक भवन, मैरिज हॉल, दुकानें एवं परिसंपत्ति बुकिंग वाउचर निर्माण (कैशबुक आय में स्वतः प्रविष्टि)'
            : 'Community hall, shops & asset booking vouchers (Auto-synced with Cashbook Income)'
        }
        icon="🏢"
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
              <span>{isHindi ? 'बुकिंग वाउचर सूची' : 'Voucher List'} ({bookingList.length})</span>
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
              <span>{isHindi ? 'नया बुकिंग वाउचर बनाएं' : '+ Create Booking Voucher'}</span>
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
            <p className="text-xs font-bold text-slate-500 uppercase">{isHindi ? 'कुल बुकिंग्स' : 'Total Bookings'}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{filteredBookings.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center text-xl font-bold border border-blue-200">
            📅
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between bg-emerald-50/20">
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase">{isHindi ? 'कुल प्राप्त किराया आय' : 'Total Rent Revenue'}</p>
            <p className="text-2xl font-black text-emerald-800 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-xl font-bold border border-emerald-300">
            💰
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between bg-amber-50/20">
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase">{isHindi ? 'कुल अमानत (Security)' : 'Security Deposits'}</p>
            <p className="text-2xl font-black text-amber-800 mt-1">₹{totalSecurity.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center text-xl font-bold border border-amber-300">
            🛡️
          </div>
        </div>
      </div>

      {/* TAB 1: LIST VIEW */}
      {activeTab === 'LIST' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          {/* SEARCH & FILTERS */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full md:w-80">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder={isHindi ? 'हितग्राही, वाउचर क्र., समग्र ID, प्रयोजन खोजें...' : 'Search Beneficiary, Voucher No, Purpose...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-medium"
                />
              </div>

              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-700"
              >
                <option value="ALL">{isHindi ? 'सभी भुगतान माध्यम' : 'All Payment Modes'}</option>
                <option value="CASH">नकद (CASH)</option>
                <option value="BANK">बैंक (BANK)</option>
                <option value="UPI">UPI / ऑनलाइन</option>
                <option value="CHEQUE">चेक (CHEQUE)</option>
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

              <div className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                {isHindi ? 'प्रदर्शित वाउचर:' : 'Showing:'} <span className="text-primary font-black">{filteredBookings.length}</span>
              </div>
            </div>
          </div>

          {/* TABLE OF BOOKINGS */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase">{isHindi ? 'वाउचर क्र. व दिनांक' : 'Voucher & Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase">{isHindi ? 'हितग्राही विवरण' : 'Beneficiary Details'}</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase">{isHindi ? 'परिसंपत्ति / स्थान' : 'Facility / Asset'}</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase">{isHindi ? 'बुकिंग अवधि व प्रयोजन' : 'Booking Period & Purpose'}</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-600 uppercase">{isHindi ? 'किराया शुल्क (₹)' : 'Rent Charge (₹)'}</th>
                  <th className="px-4 py-3 text-center text-xs font-black text-slate-600 uppercase">{isHindi ? 'माध्यम' : 'Mode'}</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-600 uppercase">{isHindi ? 'कार्यवाही' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono font-black text-xs text-primary bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                        {b.voucherNo}
                      </span>
                      <div className="text-[11px] text-slate-500 font-bold mt-1">
                        📅 {formatDateDDMMYYYY(b.createdAt)}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-black text-slate-900">{b.beneficiaryName}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {b.guardianName ? `पिता/पति: ${b.guardianName} | ` : ''}Ward: {b.wardNo || '01'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        समग्र ID: {b.samagraId || 'N/A'} {b.mobile ? `| Mob: ${b.mobile}` : ''}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        <span>🏛️</span>
                        <span>{b.facilityName}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-700">
                      <div className="font-bold text-slate-900">{b.purpose}</div>
                      <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                        🗓️ {formatDateDDMMYYYY(b.startDate)} {b.startTime ? `(${b.startTime})` : ''} ➔ {formatDateDDMMYYYY(b.endDate)} {b.endTime ? `(${b.endTime})` : ''}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-black text-emerald-800 text-sm">
                      <div>₹{b.chargeAmount.toLocaleString('en-IN')}</div>
                      {b.securityDeposit ? (
                        <div className="text-[10px] text-amber-700 font-medium">
                          + ₹{b.securityDeposit.toLocaleString('en-IN')} अमानत
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                        {b.paymentMode}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedBookingForPrint(b)}
                        className="px-2.5 py-1 text-xs font-black text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title={isHindi ? 'रसीद प्रिंट / देखें' : 'View / Print Receipt'}
                      >
                        <span>🖨️</span>
                        <span>{isHindi ? 'रसीद' : 'Print'}</span>
                      </button>

                      {onDeleteBooking && (
                        <button
                          onClick={() => {
                            if (confirm(isHindi ? `क्या आप बुकिंग वाउचर ${b.voucherNo} को हटाना चाहते हैं?` : `Delete voucher ${b.voucherNo}?`)) {
                              onDeleteBooking(b.id);
                            }
                          }}
                          className="px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                          title={isHindi ? 'हटाएं' : 'Delete'}
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      {isHindi ? 'कोई बुकिंग वाउचर नहीं मिला।' : 'No booking vouchers found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE NEW BOOKING VOUCHER FORM */}
      {activeTab === 'CREATE' && (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="border-b pb-4 border-slate-200">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>📝 {isHindi ? 'नया बुकिंग एवं किराया वाउचर जारी करें' : 'Create New Booking & Rent Voucher'}</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                {isHindi ? 'कैशबुक आय स्वतः लिंक' : 'Auto-synced to Cashbook'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isHindi
                ? 'पंजीकृत हितग्राही को खोजकर चुनें, बुकिंग की तिथि, समय व प्रयोजन दर्ज करें। वाउचर बनते ही कैशबुक में आय प्रविष्टि स्वतः हो जाएगी।'
                : 'Select registered beneficiary, enter booking dates, purpose and charges. Automatically records as Income in Cashbook.'}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* 1. BENEFICIARY SEARCH & SELECTION */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-black text-slate-800 uppercase">
                {isHindi ? '1. पंजीकृत हितग्राही का चयन करें (Beneficiary Selection) *' : '1. Select Registered Beneficiary *'}
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

              {/* Live search dropdown results */}
              {!selectedFamilyId && searchedFamilies.length > 0 && (
                <div className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 text-xs">
                  {searchedFamilies.map((fam) => (
                    <div
                      key={fam.id}
                      onClick={() => handleSelectFamily(fam)}
                      className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-black text-slate-900">{fam.name} {fam.surname}</span>
                        <span className="text-slate-500 ml-2">({fam.guardianName ? `पिता/पति: ${fam.guardianName}` : `Ward ${fam.wardNo}`})</span>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          समग्र: {fam.samagraId} | Mob: {fam.mobile} | श्रेणी: {fam.category || 'APL'}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px] border border-emerald-300">
                        चुनें ➔
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Beneficiary Preview Card */}
              {selectedFamily && (
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
              )}
            </div>

            {/* 2. FACILITY / PROPERTY & PURPOSE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  {isHindi ? 'परिसंपत्ति / सुविधा का नाम *' : 'Facility / Asset *'}
                </label>
                <select
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-bold text-slate-800"
                >
                  <option value="ग्राम पंचायत सामुदायिक भवन (Community Hall)">ग्राम पंचायत सामुदायिक भवन (Community Hall)</option>
                  <option value="मंगल भवन / बारात घर (Marriage Hall)">मंगल भवन / बारात घर (Marriage Hall)</option>
                  <option value="पंचायत दुकान / हाट बाजार स्टॉल (Shop / Stall)">पंचायत दुकान / हाट बाजार स्टॉल (Shop / Stall)</option>
                  <option value="बर्तन / टेंट / ध्वनि विस्तारक सामग्री (Utensils & Equipment)">बर्तन / टेंट / ध्वनि विस्तारक सामग्री</option>
                  <option value="खेल मैदान / पंचायत सभागार (Playground / Auditorium)">खेल मैदान / पंचायत सभागार</option>
                  <option value="OTHER">अन्य परिसंपत्ति (Other Asset)</option>
                </select>
                {facilityName === 'OTHER' && (
                  <input
                    type="text"
                    placeholder={isHindi ? 'परिसंपत्ति का नाम दर्ज करें...' : 'Enter Asset Name...'}
                    value={customFacility}
                    onChange={(e) => setCustomFacility(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  {isHindi ? 'बुकिंग का प्रयोजन (Purpose) *' : 'Purpose of Booking *'}
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-bold text-slate-800"
                >
                  <option value="विवाह / शादी समारोह (Marriage Function)">विवाह / शादी समारोह (Marriage Function)</option>
                  <option value="सामाजिक / पारिवारिक बैठक (Social / Family Meeting)">सामाजिक / पारिवारिक बैठक</option>
                  <option value="धार्मिक / कथा / सत्संग कार्यक्रम (Religious Program)">धार्मिक / कथा / सत्संग कार्यक्रम</option>
                  <option value="व्यापारिक / प्रदर्शनी मेला (Commercial / Fair)">व्यापारिक / प्रदर्शनी मेला</option>
                  <option value="दुकान मासिक किराया (Monthly Shop Rent)">दुकान मासिक किराया (Monthly Shop Rent)</option>
                  <option value="OTHER">अन्य प्रयोजन (Other Purpose)</option>
                </select>
                {purpose === 'OTHER' && (
                  <input
                    type="text"
                    placeholder={isHindi ? 'प्रयोजन का विवरण लिखें...' : 'Enter Purpose Description...'}
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                    required
                  />
                )}
              </div>
            </div>

            {/* 3. DATE & TIME RANGE (BETWEEN) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-black text-slate-800 uppercase">
                {isHindi ? '2. बुकिंग समयावधि (Date & Time Range) *' : '2. Booking Date & Time Range *'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-slate-600">
                    🟢 {isHindi ? 'प्रारंभ तिथि एवं समय (Start Date & Time)' : 'Start Date & Time'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white"
                      required
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-bold text-slate-600">
                    🔴 {isHindi ? 'समाप्ति तिथि एवं समय (End Date & Time)' : 'End Date & Time'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white"
                      required
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CHARGE AMOUNT & SECURITY DEPOSIT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase mb-1">
                  {isHindi ? 'किराया प्रभार राशि (Charge Amount ₹) *' : 'Charge Amount (₹) *'}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2500"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 text-base border-2 border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-black text-emerald-900 bg-white"
                  required
                  min="1"
                />
                <span className="block text-[11px] text-slate-500 mt-1">
                  {isHindi ? 'यह राशि कैशबुक में आय (Income) के रूप में स्वतः दर्ज होगी।' : 'This amount is automatically booked as Income in Cashbook.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  {isHindi ? 'अमानत / सुरक्षा राशि (Security Deposit ₹) [वैकल्पिक]' : 'Security Deposit (₹) [Optional]'}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary font-mono font-bold text-slate-800 bg-white"
                  min="0"
                />
                <span className="block text-[11px] text-slate-500 mt-1">
                  {isHindi ? 'कार्यक्रम पश्चात वापसी योग्य धरोहर राशि (यदि लागू हो)' : 'Refundable deposit post-event (if applicable)'}
                </span>
              </div>
            </div>

            {/* 5. PAYMENT MODE & TRANSACTION ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  {isHindi ? 'भुगतान माध्यम (Payment Mode) *' : 'Payment Mode *'}
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white font-bold"
                >
                  <option value="CASH">💵 नकद (CASH)</option>
                  <option value="BANK">🏛️ बैंक अंतरण (BANK Transfer / NEFT)</option>
                  <option value="UPI">📱 UPI / QR कोड ऑनलाइन</option>
                  <option value="CHEQUE">📜 चेक (CHEQUE / DD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  {isHindi ? 'यूटीआर / चेक / संदर्भ क्र. (Ref / Txn ID)' : 'Transaction Ref / Cheque No'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI/1234567890 or Cheque #000123"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary font-mono"
                />
              </div>
            </div>

            {/* 6. REMARKS */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                {isHindi ? 'विशेष टिप्पणी / नियम व शर्तें (Remarks / Notes)' : 'Remarks / Terms'}
              </label>
              <textarea
                rows={2}
                placeholder={isHindi ? 'सफाई व्यवस्था, ध्वनि विस्तारक अनुमति, समय सीमा आदि...' : 'Cleaning rules, sound system permission notes...'}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary font-medium"
              />
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !selectedFamilyId || !chargeAmount}
                className="px-8 py-3 text-sm font-black bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition-all border border-emerald-500 cursor-pointer flex items-center gap-2"
              >
                <span>💾</span>
                <span>{isSubmitting ? 'वाउचर बन रहा है...' : isHindi ? 'बुकिंग वाउचर बनाएं एवं कैशबुक में जोड़ें' : 'Generate Voucher & Add to Cashbook'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {selectedBookingForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 animate-slide-up border-2 border-primary my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Sticky Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧾</span>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {isHindi ? 'बुकिंग किराया पावती रसीद वाउचर' : 'Booking Rent Receipt Voucher'} - <span className="font-mono text-primary">{selectedBookingForPrint.voucherNo}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookingForPrint(null)}
                className="text-slate-500 hover:text-slate-800 font-bold px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>✕</span> {isHindi ? 'बंद करें (Close)' : 'Close'}
              </button>
            </div>

            {/* Scrollable Receipt Body */}
            <div className="overflow-y-auto flex-1 py-3 pr-1 space-y-4 my-1">
              {/* PRINTABLE AREA */}
              <div id="booking-receipt-print-area" className="printable-area p-5 sm:p-7 bg-white border-2 border-dashed border-primary-300 rounded-2xl space-y-5 text-slate-800">
                {/* Standardized Panchayat Letterhead Header with Logo */}
                <OfficialVoucherHeader
                  officeDetails={officeDetails}
                  adminPanchayat={officeDetails?.gramPanchayat}
                  voucherTitle="बुकिंग एवं किराया पावती रसीद वाउचर (BOOKING RENT RECEIPT)"
                  voucherSubTitle="परिसंपत्ति आरक्षण एवं किराया राजस्व पावती (Panchayat Asset Booking Voucher)"
                  badgeBgColor="bg-emerald-50 text-emerald-950 border-emerald-300"
                />

                {/* Meta row */}
                <div className="flex justify-between items-center text-xs font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono">
                  <div>
                    <span className="text-slate-500">वाउचर क्र. (Voucher No): </span>
                    <span className="text-primary font-black">{selectedBookingForPrint.voucherNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">दिनांक: </span>
                    <span className="text-slate-900">{formatDateDDMMYYYY(selectedBookingForPrint.createdAt)}</span>
                  </div>
                </div>

                {/* Beneficiary and Facility Table */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-slate-500 font-bold">किरायेदार / हितग्राही का नाम:</p>
                    <p className="font-black text-slate-900 text-sm">{selectedBookingForPrint.beneficiaryName}</p>
                    {selectedBookingForPrint.guardianName && (
                      <p className="text-slate-600 font-medium">पिता/पति: {selectedBookingForPrint.guardianName}</p>
                    )}
                    <p className="text-slate-600 font-mono text-[11px]">समग्र ID: {selectedBookingForPrint.samagraId || 'N/A'}</p>
                    <p className="text-slate-600">वार्ड: {selectedBookingForPrint.wardNo || '01'} | मो.: {selectedBookingForPrint.mobile || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-slate-500 font-bold">बुक की गई परिसंपत्ति / भवन:</p>
                    <p className="font-black text-slate-900">{selectedBookingForPrint.facilityName}</p>
                    <p className="text-slate-500 font-bold mt-1.5">बुकिंग प्रयोजन:</p>
                    <p className="font-bold text-emerald-900">{selectedBookingForPrint.purpose}</p>
                  </div>
                </div>

                {/* Booking Dates */}
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-emerald-950 block">🗓️ आरक्षण समयावधि (Booking Schedule):</span>
                  <p className="font-mono font-bold text-emerald-900">
                    प्रारंभ: {formatDateDDMMYYYY(selectedBookingForPrint.startDate)} {selectedBookingForPrint.startTime ? `(${selectedBookingForPrint.startTime})` : ''} ➔ समाप्ति: {formatDateDDMMYYYY(selectedBookingForPrint.endDate)} {selectedBookingForPrint.endTime ? `(${selectedBookingForPrint.endTime})` : ''}
                  </p>
                </div>

                {/* Financial Particulars Table */}
                <table className="w-full text-xs border border-slate-300">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2 border border-slate-300 text-left">विवरण (Particulars)</th>
                      <th className="p-2 border border-slate-300 text-right w-40">राशि (Amount ₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 border border-slate-300 font-bold">
                        {selectedBookingForPrint.facilityName} किराया शुल्क ({selectedBookingForPrint.purpose})
                      </td>
                      <td className="p-2.5 border border-slate-300 text-right font-mono font-black text-sm text-slate-900">
                        ₹{selectedBookingForPrint.chargeAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    {selectedBookingForPrint.securityDeposit ? (
                      <tr>
                        <td className="p-2 border border-slate-300 text-slate-600 font-medium">
                          धरोहर / अमानत राशि (Refundable Security Deposit)
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-mono font-bold text-amber-800">
                          ₹{selectedBookingForPrint.securityDeposit.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ) : null}
                    <tr className="bg-slate-100/70 font-black">
                      <td className="p-2.5 border border-slate-300 text-slate-900">
                        कुल प्राप्त राशि (Total Received Amount) [{selectedBookingForPrint.paymentMode}]:
                      </td>
                      <td className="p-2.5 border border-slate-300 text-right font-mono text-base text-emerald-900">
                        ₹{(selectedBookingForPrint.chargeAmount + (selectedBookingForPrint.securityDeposit || 0)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Conditions / Terms Note */}
                <div className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-200 pt-2">
                  <p>1. कार्यक्रम समाप्ति उपरांत भवन/सामग्री को स्वच्छ एवं सुरक्षित अवस्था में ग्राम पंचायत को सौंपना अनिवार्य होगा।</p>
                  <p>2. यह रसीद कंप्यूटर जनित आधिकारिक वित्तीय पावती है, जिसकी प्रविष्टि ग्राम पंचायत कैशबुक में दर्ज है।</p>
                </div>

                {/* Signatures */}
                <div className="pt-8 flex justify-between items-end text-xs font-bold text-slate-800">
                  <div className="text-center">
                    <div className="w-32 border-b border-slate-400 mb-1"></div>
                    <p>किरायेदार / आवेदक हस्ताक्षर</p>
                  </div>

                  <div className="text-center">
                    <div className="w-40 border-b border-slate-400 mb-1"></div>
                    <p>{officeDetails?.secretaryName || 'सचिव / अधिकृत अधिकारी'}</p>
                    <p className="text-[10px] text-slate-500 font-normal">ग्राम पंचायत {officeDetails?.gramPanchayat || ''}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer Actions */}
            <div className="flex items-center justify-between gap-3 print:hidden pt-3 border-t border-slate-200 shrink-0">
              <button
                onClick={() => setSelectedBookingForPrint(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {isHindi ? 'वापस जाएं (Close)' : 'Close'}
              </button>
              <button
                onClick={() => triggerPrint('booking-receipt-print-area')}
                className="px-6 py-2.5 bg-primary hover:bg-primary-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>🖨️</span>
                <span>{isHindi ? 'रसीद प्रिंट / डाउनलोड करें' : 'Print Voucher Receipt'}</span>
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

export default BookingRentView;
