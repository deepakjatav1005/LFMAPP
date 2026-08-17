import React, { useState, useEffect } from 'react';
import { OfficeDetails, Admin } from '../types';
import ViewHeader from './ViewHeader';

interface ManageOfficeViewProps {
  officeDetails: OfficeDetails;
  onUpdateOfficeDetails: (updated: OfficeDetails) => void;
  admin: Admin | null;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const ManageOfficeView: React.FC<ManageOfficeViewProps> = ({
  officeDetails,
  onUpdateOfficeDetails,
  admin,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const [formData, setFormData] = useState<OfficeDetails>({ ...officeDetails });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [upiIdInput, setUpiIdInput] = useState<string>('grampanchayat@sbi');

  useEffect(() => {
    if (officeDetails) {
      setFormData({ ...officeDetails });
    }
  }, [officeDetails]);

  // Sample Preset Logos for easy selection
  const PRESET_LOGOS = [
    {
      id: 'mp_govt',
      name: isHindi ? 'मध्य प्रदेश शासन प्रतीक' : 'MP Government Emblem',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Emblem_of_Madhya_Pradesh.svg/180px-Emblem_of_Madhya_Pradesh.svg.png',
    },
    {
      id: 'ashok_stambh',
      name: isHindi ? 'राष्ट्रीय प्रतीक - अशोक स्तंभ' : 'Ashoka Stambh Emblem',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/180px-Emblem_of_India.svg.png',
    },
    {
      id: 'panchayat_seal',
      name: isHindi ? 'ग्राम पंचायत डिजिटल सील' : 'Panchayat Seal Logo',
      url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Image File Upload (Logo or Barcode QR)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logoUrl' | 'qrCodeUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(isHindi ? 'फाइल का आकार 2MB से कम होना चाहिए' : 'File size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, [fieldName]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateUpiQr = () => {
    if (!upiIdInput.trim()) return;
    const pa = encodeURIComponent(upiIdInput.trim());
    const pn = encodeURIComponent(formData.officeName || 'Gram Panchayat Office');
    const upiUri = `upi://pay?pa=${pa}&pn=${pn}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
    
    setFormData((prev) => ({ ...prev, qrCodeUrl: qrUrl }));
    setSuccessMsg(isHindi ? 'UPI बारकोड सफलतापूर्वक जनरेट किया गया!' : 'UPI Barcode QR Code Generated!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateOfficeDetails(formData);
    setSuccessMsg(isHindi ? 'कार्यालय विवरण एवं बैंक / लोगो जानकारी सफलतापूर्वक सुरक्षित कर दी गई!' : 'Office details & bank / logo information saved successfully!');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl animate-fade-in">
      <ViewHeader
        title={isHindi ? 'कार्यालय प्रबंधन (Manage Office & Bank Profile)' : 'Manage Office & Bank Profile'}
        subtitle={isHindi ? 'ग्राम पंचायत कार्यालय का नाम, सचिव नाम, संपर्क, बैंक खाता, लोगो एवं भुगतान बारकोड पंजीकृत करें। यह विवरण सभी रसीद एवं मांग नोटिस पर प्रदर्शित होगा।' : 'Register office name, secretary, contact, bank account, logo & QR barcode for all invoices & demand notices.'}
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
      />

      {successMsg && (
        <div className="mb-6 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 p-4 rounded-2xl flex items-center gap-3 animate-slide-up shadow-md">
          <span className="text-2xl">✅</span>
          <span className="text-sm font-black">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLS: EDIT OFFICE FORM */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6">
            <div className="border-b pb-3 border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>🏛️</span> {isHindi ? '1. ग्राम पंचायत कार्यालय एवं अधिकारी विवरण' : '1. Office & Officer Details'}
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                Official Header Setup
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'कार्यालय का नाम *' : 'Office Name *'}
                </label>
                <input
                  type="text"
                  name="officeName"
                  value={formData.officeName}
                  onChange={handleInputChange}
                  placeholder="e.g. कार्यालय ग्राम पंचायत रामपुर"
                  className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'ग्राम पंचायत अधिकारी का नाम *' : 'Officer Name *'}
                </label>
                <input
                  type="text"
                  name="secretaryName"
                  value={formData.secretaryName}
                  onChange={handleInputChange}
                  placeholder={isHindi ? 'जैसे श्री दीपक जाटव' : 'e.g. Deepak Jatav'}
                  className="w-full px-3.5 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'पद / पदनाम चयन *' : 'Designation Selection *'}
                </label>
                <select
                  name="secretaryDesignation"
                  value={formData.secretaryDesignation || 'ग्राम पंचायत सचिव'}
                  onChange={(e) => setFormData(prev => ({ ...prev, secretaryDesignation: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="ग्राम पंचायत सचिव">{isHindi ? 'ग्राम पंचायत सचिव' : 'Gram Panchayat Secretary'}</option>
                  <option value="सरपंच">{isHindi ? 'सरपंच' : 'Sarpanch'}</option>
                  <option value="सहायक सचिव">{isHindi ? 'सहायक सचिव' : 'Assistant Secretary'}</option>
                  <option value="ग्राम रोजगार सहायक">{isHindi ? 'ग्राम रोजगार सहायक' : 'Gram Rozgar Sahayak'}</option>
                  <option value="कर संग्राहक">{isHindi ? 'कर संग्राहक' : 'Tax Collector'}</option>
                  <option value="कंप्यूटर ऑपरेटर">{isHindi ? 'कंप्यूटर ऑपरेटर' : 'Computer Operator'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'ग्राम पंचायत सरपंच का नाम' : 'Sarpanch Name'}
                </label>
                <input
                  type="text"
                  name="sarpanchName"
                  value={formData.sarpanchName || ''}
                  onChange={handleInputChange}
                  placeholder={isHindi ? 'जैसे श्रीमती कमला देवी' : 'e.g. Kamla Devi'}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'संपर्क मोबाइल नंबर *' : 'Contact Phone *'}
                </label>
                <input
                  type="text"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  placeholder="e.g. 911234567890"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'कार्यालय ईमेल' : 'Office Email'}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  placeholder="e.g. gprampur2026@gmail.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'कार्यालय का पूरा पता *' : 'Full Office Address *'}
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. मुख्य बस स्टैंड रोड, ग्राम पंचायत रामपुर, जनपद पंचायत सीहोर"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'जनपद / ब्लॉक *' : 'Block *'}
                </label>
                <input
                  type="text"
                  name="block"
                  value={formData.block}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'जिला *' : 'District *'}
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'राज्य *' : 'State *'}
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state || 'Madhya Pradesh'}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'पिन कोड' : 'Pin Code'}
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode || ''}
                  onChange={handleInputChange}
                  placeholder="e.g. 466001"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'लॉगिन पासवर्ड' : 'Login Password'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password || admin?.password || ''}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* BANK ACCOUNT DETAILS SECTION */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
                <span>🏦</span> {isHindi ? '2. ग्राम पंचायत बैंक खाता विवरण (Bank Account Details)' : '2. Bank Account Details'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'बैंक का नाम (Bank Name) *' : 'Bank Name *'}
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="e.g. भारतीय स्टेट बैंक (SBI)"
                    className="w-full px-3.5 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'खाताधारक का नाम (Account Holder Name) *' : 'Account Holder Name *'}
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="e.g. ग्राम पंचायत रामपुर निधि खाता"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'खाता क्रमांक (Account Number) *' : 'Account Number *'}
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. 38291048291"
                    className="w-full px-3.5 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white text-emerald-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'IFSC कोड (IFSC Code) *' : 'IFSC Code *'}
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="e.g. SBIN0001234"
                    className="w-full px-3.5 py-2 text-sm font-mono font-bold uppercase border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* LOGO & BARCODE UPLOAD SECTION */}
            <div className="pt-4 border-t border-slate-200 space-y-6">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>🖼️</span> {isHindi ? '3. कार्यालय लोगो एवं ऑनलाइन भुगतान बारकोड (Logo & Payment QR)' : '3. Office Logo & Payment Barcode'}
              </h3>

              {/* LOGO SELECTION / UPLOAD */}
              <div className="space-y-3 bg-amber-50/60 border border-amber-200 p-4 rounded-xl">
                <label className="block text-xs font-bold text-amber-950 uppercase">
                  {isHindi ? 'ग्राम पंचायत लोगो (Office Logo)' : 'Office Logo'}
                </label>

                {/* Preset Emblem Selection */}
                <p className="text-xs text-amber-900 font-medium">
                  {isHindi ? 'पूर्वनिर्धारित शासकीय प्रतीक चुनें या अपनी स्वयं की लोगो इमेज फाइल अपलोड करें:' : 'Choose a preset official emblem or upload custom image:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRESET_LOGOS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, logoUrl: p.url }))}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        formData.logoUrl === p.url
                          ? 'bg-amber-100 border-amber-600 shadow-sm ring-2 ring-amber-500'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <img src={p.url} alt={p.name} className="w-10 h-10 object-contain shrink-0" />
                      <span className="text-xs font-bold text-slate-800 leading-tight">{p.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">{isHindi ? 'अथवा लोगो इमेज अपलोड करें:' : 'Or Upload Custom Logo Image:'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logoUrl')}
                    className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* PAYMENT BARCODE / QR CODE UPLOAD & AUTO GENERATOR */}
              <div className="space-y-3 bg-cyan-50/60 border border-cyan-200 p-4 rounded-xl">
                <label className="block text-xs font-bold text-cyan-950 uppercase">
                  {isHindi ? 'डिजिटल भुगतान बारकोड / UPI QR Code' : 'Payment QR Barcode'}
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A: Upload Barcode Image */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-800">
                      {isHindi ? '1. अपने बैंक QR कोड का स्क्रीनशॉट/फोटो अपलोड करें:' : '1. Upload QR Code Image:'}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'qrCodeUrl')}
                      className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-700 file:text-white hover:file:bg-cyan-800 cursor-pointer"
                    />
                  </div>

                  {/* Option B: Auto-Generate UPI QR */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-800">
                      {isHindi ? '2. या 1-क्लिक में UPI बारकोड जनरेट करें:' : '2. Or Auto-Generate UPI Barcode:'}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={upiIdInput}
                        onChange={(e) => setUpiIdInput(e.target.value)}
                        placeholder="e.g. grampanchayat@sbi"
                        className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateUpiQr}
                        className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        {isHindi ? 'जनरेट QR' : 'Generate'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg transition-all transform hover:scale-[1.01] cursor-pointer flex items-center gap-2"
              >
                <span>💾</span>
                <span>{isHindi ? 'कार्यालय विवरण एवं बैंक प्रोफाइल सेव करें' : 'Save Office & Bank Profile'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT 1 COL: LIVE PREVIEW CARD */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl space-y-4 border border-slate-800 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>👁️</span> {isHindi ? 'लाइव रसीद व मांग नोटिस प्रीव्यू' : 'Live Official Header Preview'}
              </span>
              <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black">
                ACTIVE
              </span>
            </div>

            <p className="text-[11px] text-slate-300">
              {isHindi ? 'आपके द्वारा दर्ज किया गया कार्यालय विवरण, लोगो, बैंक विवरण एवं बारकोड सभी बिल, कर रसीद एवं मांग नोटिस पर इस प्रकार दिखेगा:' : 'Your registered logo, office info, bank details & QR code will appear on all bills & demand notices as below:'}
            </p>

            {/* MOCK OFFICIAL HEADER CARD */}
            <div className="bg-white text-slate-900 p-4 rounded-xl space-y-4 border-2 border-slate-300 font-sans shadow-inner">
              <div className="text-center border-b pb-3 border-slate-200 space-y-1">
                {formData.logoUrl && (
                  <img src={formData.logoUrl} alt="Logo" className="w-12 h-12 mx-auto object-contain mb-1" />
                )}
                <p className="text-[10px] font-extrabold uppercase text-slate-500">कार्यालय ग्राम पंचायत</p>
                <h4 className="text-base font-black text-slate-900 leading-tight">
                  {formData.officeName || 'ग्राम पंचायत नाम'}
                </h4>
                <p className="text-[10px] text-slate-600 font-medium">
                  {formData.address || 'कार्यालय पता'}
                </p>
                <p className="text-[9px] text-slate-500 font-mono">
                  जनपद: {formData.block} | जिला: {formData.district} | मो: {formData.contactPhone}
                </p>
              </div>

              {/* BANK & QR FOOTER PREVIEW */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] space-y-1">
                <p className="font-extrabold text-slate-800 border-b pb-1 text-[10px] flex justify-between">
                  <span>🏦 बैंक भुगतान विवरण:</span>
                  <span className="text-emerald-700 font-mono">{formData.ifscCode}</span>
                </p>
                <p><span className="text-slate-500">बैंक:</span> <strong className="text-slate-900">{formData.bankName}</strong></p>
                <p><span className="text-slate-500">खाता:</span> <strong className="text-slate-900">{formData.accountName}</strong></p>
                <p><span className="text-slate-500">A/C No:</span> <strong className="text-emerald-800 font-mono">{formData.accountNumber}</strong></p>
              </div>

              {formData.qrCodeUrl && (
                <div className="text-center bg-cyan-50/80 p-2 rounded-lg border border-cyan-200">
                  <p className="text-[9px] font-bold text-cyan-950 mb-1">📱 UPI / ऑनलाइन कर भुगतान क्यूआर कोड</p>
                  <img src={formData.qrCodeUrl} alt="QR Code" className="w-24 h-24 mx-auto object-contain border border-white rounded shadow-sm" />
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500 font-bold">
                <div>[ मुहर ]</div>
                <div className="text-right">
                  <p className="text-slate-900 font-black">{formData.secretaryName}</p>
                  <p className="text-[8px] text-slate-500">ग्राम पंचायत सचिव</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageOfficeView;
