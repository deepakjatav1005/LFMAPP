import React, { useState } from 'react';
import { Admin } from '../types';
import ViewHeader from './ViewHeader';

interface ManageProfileViewProps {
  admin: Admin;
  onUpdateAdmin: (updatedAdmin: Admin) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const ManageProfileView: React.FC<ManageProfileViewProps> = ({ admin, onUpdateAdmin, onBack, onClose, isHindi = true }) => {
  const [formData, setFormData] = useState<Admin>({
    id: admin.id,
    name: admin.name || '',
    mobile: admin.mobile || '',
    photoUrl: admin.photoUrl || admin.avatar || '',
    designation: admin.designation || 'Panchayat Secretary',
    gramPanchayat: admin.gramPanchayat || 'Gram Panchayat',
    email: admin.email || 'secretary@grampanchayat.gov.in',
    district: admin.district || 'Indore',
    state: admin.state || 'Madhya Pradesh',
  });

  React.useEffect(() => {
    if (admin) {
      setFormData({
        id: admin.id,
        name: admin.name || '',
        mobile: admin.mobile || '',
        photoUrl: admin.photoUrl || admin.avatar || '',
        designation: admin.designation || 'Panchayat Secretary',
        gramPanchayat: admin.gramPanchayat || 'Gram Panchayat',
        email: admin.email || 'secretary@grampanchayat.gov.in',
        district: admin.district || 'Indore',
        state: admin.state || 'Madhya Pradesh',
      });
    }
  }, [admin]);

  const [password, setPassword] = useState('••••••••');
  const [isSaved, setIsSaved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError(isHindi ? 'कृपया केवल इमेज फ़ाइल (JPG, PNG) चुनें।' : 'Please choose an image file (JPG, PNG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(isHindi ? 'फ़ाइल का आकार 5MB से कम होना चाहिए।' : 'Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, photoUrl: base64 }));
    };
    reader.onerror = () => {
      setPhotoError(isHindi ? 'फोटो लोड करने में त्रुटि हुई।' : 'Error loading photo.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photoUrl: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAdmin(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in max-w-5xl">
      {/* STANDARDIZED HEADER WITH BACK AND CLOSE BUTTONS */}
      <ViewHeader
        title={isHindi ? "Manage Profile (प्रोफ़ाइल प्रबंधन)" : "Manage Profile"}
        subtitle={isHindi ? "प्रशासनिक प्रोफाइल एवं ग्राम पंचायत विवरण प्रबंधित करें" : "Manage administrative profile and Gram Panchayat details"}
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
        actionButton={
          <span className="bg-primary-50 text-primary border border-primary-200 text-xs font-semibold px-3 py-1.5 rounded-full">
            Official Account
          </span>
        }
      />

      {isSaved && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-slide-up shadow-sm">
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold">
            {isHindi ? '🎉 प्रोफाइल एवं फोटो सफलतापूर्वक अपडेट हो गया है!' : 'Profile and photo updated successfully!'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-primary to-primary-700"></div>
            <div className="relative z-10 pt-4">
              <div className="w-28 h-28 mx-auto rounded-full bg-white p-1.5 shadow-lg border-2 border-primary-200 mb-3 relative group">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt={formData.name || 'Admin Photo'}
                    className="w-full h-full rounded-full object-cover shadow-inner"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-primary-100 text-primary font-extrabold text-3xl flex items-center justify-center shadow-inner">
                    {(formData.name || 'A').charAt(0)}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold" title="Active">
                  ✓
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-800">{formData.name || ''}</h3>
              <p className="text-xs font-bold text-primary">{formData.designation || ''}</p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">{formData.gramPanchayat || ''}</p>

              <div className="mt-6 pt-5 border-t border-slate-100 text-left space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Mobile:</span>
                  <span className="font-bold text-slate-800">{formData.mobile || ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Email:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[150px]">{formData.email || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">District:</span>
                  <span className="font-bold text-slate-800">{formData.district || ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">State:</span>
                  <span className="font-bold text-slate-800">{formData.state || ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active Admin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-5">
            <h3 className="text-base sm:text-lg font-black text-slate-800 border-b pb-3 border-slate-100 flex items-center justify-between">
              <span>{isHindi ? 'व्यवस्थापक प्रोफाइल एवं फोटो अपडेट' : 'Update Profile & Photo'}</span>
              <span className="text-xs font-normal text-slate-500">ID: {formData.id}</span>
            </h3>

            {/* ADMIN PHOTO UPLOAD SECTION */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>📸 {isHindi ? 'व्यवस्थापक / सचिव फोटो (Admin Photo)' : 'Admin Profile Photo'}</span>
                {formData.photoUrl && (
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                    {isHindi ? 'फोटो अपलोड है ✓' : 'Photo Active ✓'}
                  </span>
                )}
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {formData.photoUrl ? (
                    <img
                      src={formData.photoUrl}
                      alt="Uploaded Admin"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-2xl text-slate-400">👤</span>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-4 py-2 bg-primary hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition flex items-center gap-1.5">
                      <span>📁</span>
                      <span>{formData.photoUrl ? (isHindi ? 'फोटो बदलें' : 'Change Photo') : (isHindi ? 'फोटो चुनें / अपलोड करें' : 'Choose Photo')}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {formData.photoUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>🗑️</span>
                        <span>{isHindi ? 'हटाएं' : 'Remove'}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isHindi ? 'JPG, PNG या WEBP (अधिकतम 5MB)। यह फोटो आपके प्रोफाइल कार्ड व पहचान में प्रदर्शित होगी।' : 'JPG, PNG or WEBP (Max 5MB). Photo will be displayed on your profile card.'}
                  </p>
                  {photoError && (
                    <p className="text-xs text-rose-600 font-bold">{photoError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'पूरा नाम (Full Name)' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'मोबाइल नंबर (Mobile No.)' : 'Mobile No.'} *
                </label>
                <input
                  type="tel"
                  value={formData.mobile || ''}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'पदभार (Designation)' : 'Designation'} *
                </label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'ईमेल पता (Email Address)' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'ग्राम पंचायत (Gram Panchayat)' : 'Gram Panchayat Name'} *
                </label>
                <input
                  type="text"
                  value={formData.gramPanchayat || ''}
                  onChange={(e) => setFormData({ ...formData, gramPanchayat: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'जनपद / ब्लॉक (Block)' : 'Block'}
                </label>
                <input
                  type="text"
                  value={formData.block || ''}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'ज़िला (District)' : 'District'}
                </label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'राज्य (State)' : 'State'}
                </label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'सुरक्षा पासवर्ड (Security Password)' : 'Security Password'}
              </label>
              <input
                type="password"
                value={password || ''}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-mono"
              />
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-sm cursor-pointer"
                >
                  {isHindi ? '← वापस' : '← Back'}
                </button>
              )}
              <button
                type="submit"
                className="ml-auto px-6 py-2.5 bg-primary text-white font-black rounded-xl hover:bg-primary-700 transition-colors shadow-md text-sm cursor-pointer flex items-center gap-2"
              >
                <span>💾</span>
                <span>{isHindi ? 'प्रोफाइल व फोटो सुरक्षित करें' : 'Save Profile & Photo'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManageProfileView;
