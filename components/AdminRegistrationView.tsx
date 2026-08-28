import React, { useState, useEffect, useMemo } from 'react';
import { Admin } from '../types';
import { LOCATIONS } from '../utils/locations';

interface AdminRegistrationViewProps {
  isHindi: boolean;
  onRegisterAdmin: (adminData: Omit<Admin, 'id'>) => Promise<void> | void;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
  existingAdmins?: Admin[];
}

export const AdminRegistrationView: React.FC<AdminRegistrationViewProps> = ({
  isHindi,
  onRegisterAdmin,
  onNavigateToLogin,
  onNavigateToHome,
  existingAdmins = [],
}) => {
  const stateName = 'MADHYA PRADESH';
  const mpLocations = LOCATIONS[stateName] || {};

  // List of all MP Districts sorted alphabetically
  const districtList = useMemo(() => {
    return Object.keys(mpLocations).sort((a, b) => a.localeCompare(b));
  }, [mpLocations]);

  // Default empty initial selection so user picks first select option
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [selectedPanchayat, setSelectedPanchayat] = useState<string>('');
  const [gpNameInput, setGpNameInput] = useState<string>('');
  const [isCustomGp, setIsCustomGp] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Computed blocks for selected district
  const blockList = useMemo(() => {
    if (!selectedDistrict || !mpLocations[selectedDistrict]) return [];
    return Object.keys(mpLocations[selectedDistrict]).sort((a, b) => a.localeCompare(b));
  }, [mpLocations, selectedDistrict]);

  // Computed gram panchayats for selected block
  const panchayatList = useMemo(() => {
    if (!selectedDistrict || !selectedBlock || !mpLocations[selectedDistrict]?.[selectedBlock]) return [];
    return mpLocations[selectedDistrict][selectedBlock];
  }, [mpLocations, selectedDistrict, selectedBlock]);

  // Form input fields
  const [officerName, setOfficerName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const designation = isHindi ? 'ग्राम पंचायत सचिव' : 'Gram Panchayat Secretary';
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle District Change
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrict = e.target.value;
    setSelectedDistrict(newDistrict);
    setSelectedBlock('');
    setSelectedPanchayat('');
    setGpNameInput('');
    setErrorMessage('');
  };

  // Handle Block Change
  const handleBlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBlock = e.target.value;
    setSelectedBlock(newBlock);
    setSelectedPanchayat('');
    setGpNameInput('');
    setErrorMessage('');
  };

  // Handle Panchayat Select Change
  const handlePanchayatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPanchayat(val);
    setErrorMessage('');
    if (val === 'OTHER_CUSTOM') {
      setIsCustomGp(true);
      setGpNameInput(isHindi ? 'ग्राम पंचायत ' : 'Gram Panchayat ');
    } else if (val) {
      setIsCustomGp(false);
      setGpNameInput(isHindi ? `ग्राम पंचायत ${val}` : `Gram Panchayat ${val}`);
    } else {
      setGpNameInput('');
    }
  };

  // Filtered panchayats for search box inside selector
  const filteredPanchayats = useMemo(() => {
    if (!filterQuery) return panchayatList;
    return panchayatList.filter((p) => p.toLowerCase().includes(filterQuery.toLowerCase()));
  }, [panchayatList, filterQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedDistrict) {
      setErrorMessage(isHindi ? 'कृपया जिला चुनें।' : 'Please select a District.');
      return;
    }
    if (!selectedBlock) {
      setErrorMessage(isHindi ? 'कृपया जनपद पंचायत चुनें।' : 'Please select a Block.');
      return;
    }
    if (!selectedPanchayat) {
      setErrorMessage(isHindi ? 'कृपया ग्राम पंचायत चुनें।' : 'Please select a Gram Panchayat.');
      return;
    }

    const finalGpName = gpNameInput.trim() || `Gram Panchayat ${selectedPanchayat}`;

    // DUPLICATE CHECK: Make sure only one user can register for one Panchayat
    const cleanGpName = finalGpName.toLowerCase().replace(/^(कार्यालय|office|gram|panchayat|ग्राम|पंचायत)\s*/gi, '').trim();
    const cleanMobile = mobile.trim();

    const isDuplicatePanchayat = existingAdmins.some((adm) => {
      if (adm.mobile === cleanMobile) return true;
      const existingCleanGp = adm.gramPanchayat.toLowerCase().replace(/^(कार्यालय|office|gram|panchayat|ग्राम|पंचायत)\s*/gi, '').trim();
      if (cleanGpName && existingCleanGp && cleanGpName === existingCleanGp) return true;
      if (adm.district && adm.block && adm.district.toLowerCase() === selectedDistrict.toLowerCase() && adm.block.toLowerCase() === selectedBlock.toLowerCase()) {
        if (selectedPanchayat && selectedPanchayat !== 'OTHER_CUSTOM' && existingCleanGp.includes(selectedPanchayat.toLowerCase())) {
          return true;
        }
      }
      return false;
    });

    if (isDuplicatePanchayat) {
      setErrorMessage(
        isHindi
          ? 'इस ग्राम पंचायत या मोबाइल नंबर के लिए उपयोगकर्ता पहले से पंजीकृत है। एक ग्राम पंचायत के लिए केवल एक ही खाते की अनुमति है।'
          : 'A user is already registered for this Gram Panchayat or Mobile Number. Duplicate registrations are not allowed.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onRegisterAdmin({
        name: officerName,
        mobile: cleanMobile,
        password: password || 'password',
        designation: designation,
        gramPanchayat: finalGpName,
        block: selectedBlock,
        district: selectedDistrict,
        email: email || 'chanchalnetzone2026@gmail.com',
        state: 'Madhya Pradesh',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || (isHindi ? 'पंजीयन में त्रुटि हुई।' : 'Error during registration.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-3 sm:p-6">
      <div className="w-full max-w-2xl p-5 sm:p-8 space-y-6 bg-white rounded-2xl shadow-xl animate-slide-up border border-slate-200">
        
        {/* BRANDING HEADER */}
        <div className="text-center space-y-1.5 border-b border-slate-100 pb-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-3xl shadow-lg border border-emerald-500">
            🏛️
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isHindi ? 'ग्राम पंचायत उपयोगकर्ता पंजीयन' : 'Gram Panchayat User Registration'}
          </h2>
          <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
            {isHindi ? 'जिला, जनपद एवं ग्राम पंचायत का चयन करें' : 'Select District, Block & Gram Panchayat'}
          </p>
        </div>

        {/* ERROR DISPLAY */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-950 font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* REGISTRATION FORM */}
        <form className="space-y-4" onSubmit={handleSubmit}>

          {/* STEP 1: GEOGRAPHIC LOCATION SELECTION */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📍</span>
                <span>{isHindi ? '1. ग्राम पंचायत स्थान चयन' : '1. Location Selection'}</span>
              </span>
            </div>

            {/* STATE & DISTRICT SELECTION ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'राज्य' : 'State'}
                </label>
                <div className="w-full px-3.5 py-2.5 text-xs font-extrabold bg-slate-200 border border-slate-300 rounded-xl text-slate-700 flex items-center gap-2">
                  <span>🇮🇳</span>
                  <span>{isHindi ? 'मध्य प्रदेश' : 'Madhya Pradesh'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  {isHindi ? 'जिला' : 'District'} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDistrict}
                  onChange={handleDistrictChange}
                  required
                  className="w-full px-3.5 py-2.5 text-xs font-bold border-2 border-emerald-500 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                >
                  <option value="">{isHindi ? '-- जिला चुनें --' : '-- Select District --'}</option>
                  {districtList.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BLOCK & GRAM PANCHAYAT SELECTION ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  {isHindi ? 'जनपद पंचायत / ब्लॉक' : 'Select Block'} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedBlock}
                  onChange={handleBlockChange}
                  required
                  disabled={!selectedDistrict}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border-2 border-emerald-500 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm disabled:opacity-50"
                >
                  <option value="">{isHindi ? '-- जनपद चुनें --' : '-- Select Block --'}</option>
                  {blockList.map((blk) => (
                    <option key={blk} value={blk}>
                      {blk}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  {isHindi ? 'ग्राम पंचायत' : 'Select Gram Panchayat'} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedPanchayat}
                  onChange={handlePanchayatChange}
                  required
                  disabled={!selectedBlock}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border-2 border-emerald-600 rounded-xl bg-emerald-50 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm disabled:opacity-50"
                >
                  <option value="">{isHindi ? '-- ग्राम पंचायत चुनें --' : '-- Select Gram Panchayat --'}</option>
                  {filteredPanchayats.map((gp) => (
                    <option key={gp} value={gp}>
                      {gp}
                    </option>
                  ))}
                  <option value="OTHER_CUSTOM">
                    ✏️ {isHindi ? '+ अन्य पंचायत नाम दर्ज करें' : '+ Other Panchayat Name'}
                  </option>
                </select>
              </div>
            </div>

            {/* SEARCH / FILTER INPUT FOR QUICK GP LOOKUP */}
            {panchayatList.length > 10 && selectedBlock && (
              <div>
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={isHindi ? `🔍 ${selectedBlock} के ग्राम पंचायतों में खोजें...` : `🔍 Search Gram Panchayats in ${selectedBlock}...`}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* CONFIRMED / EDITABLE GRAM PANCHAYAT NAME DISPLAY */}
            {selectedPanchayat && (
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  {isHindi ? 'ग्राम पंचायत का पूर्ण नाम' : 'Official Gram Panchayat Full Name'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={gpNameInput}
                  onChange={(e) => setGpNameInput(e.target.value)}
                  required
                  placeholder={isHindi ? 'कार्यालय ग्राम पंचायत रामपुर' : 'Gram Panchayat Rampur'}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            )}
          </div>

          {/* STEP 2: USER ACCOUNT DETAILS */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2">
              👤 {isHindi ? '2. उपयोगकर्ता खाते का विवरण' : '2. User Account Credentials'}
            </span>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                {isHindi ? 'उपयोगकर्ता / अधिकारी का पूर्ण नाम' : 'User Full Name'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                required
                placeholder={isHindi ? 'पूरा नाम दर्ज करें' : 'Enter full name'}
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  {isHindi ? 'मोबाइल नंबर' : 'Mobile Number'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  placeholder={isHindi ? '10 अंकों का मोबाइल नंबर' : '10 digit mobile'}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  {isHindi ? 'लॉगिन पासवर्ड' : 'Login Password'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Password"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                {isHindi ? 'ईमेल पता' : 'Email Address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* SUMMARY DISPLAY BOX BEFORE SUBMIT */}
          {selectedDistrict && selectedBlock && selectedPanchayat && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span>✅</span>
                <span>
                  {isHindi ? 'चयनित विवरण:' : 'Selected Location:'}
                </span>
              </p>
              <p className="text-emerald-900 font-semibold">
                <strong className="text-slate-900">{gpNameInput || selectedPanchayat}</strong> • {isHindi ? 'जनपद:' : 'Block:'} <strong>{selectedBlock}</strong> • {isHindi ? 'जिला:' : 'District:'} <strong>{selectedDistrict}</strong>
              </p>
            </div>
          )}

          {/* BUTTONS */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-black rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
            >
              <span>{isSubmitting ? '⏳' : '🏛️'}</span>
              <span>
                {isSubmitting
                  ? (isHindi ? 'पंजीयन हो रहा है...' : 'Registering...')
                  : (isHindi ? 'नया पंचायत खाता बनाएं एवं लॉगिन करें' : 'Create Panchayat Account & Login')}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors text-center border border-slate-300 cursor-pointer"
              >
                {isHindi ? '← लॉगिन पृष्ठ पर जाएं' : '← Go to Login'}
              </button>
              <button
                type="button"
                onClick={onNavigateToHome}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors text-center border border-slate-300 cursor-pointer"
              >
                {isHindi ? '← होम पर जाएं' : '← Go to Home'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

