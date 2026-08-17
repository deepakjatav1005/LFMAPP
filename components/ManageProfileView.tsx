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
    designation: admin.designation || 'Panchayat Secretary',
    gramPanchayat: admin.gramPanchayat || 'Gram Panchayat',
    email: admin.email || 'secretary@grampanchayat.gov.in',
    district: admin.district || 'Indore',
    state: admin.state || 'Madhya Pradesh',
  });

  const [password, setPassword] = useState('••••••••');
  const [isSaved, setIsSaved] = useState(false);

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
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-slide-up">
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">Profile updated successfully! प्रोफाइल सफलतापूर्वक अपडेट हो गया है।</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-primary to-primary-700"></div>
            <div className="relative z-10 pt-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-white p-1.5 shadow-lg border-2 border-primary-200 mb-3">
                <div className="w-full h-full rounded-full bg-primary-100 text-primary font-extrabold text-2xl flex items-center justify-center">
                  {formData.name.charAt(0) || 'A'}
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{formData.name}</h3>
              <p className="text-xs font-semibold text-primary">{formData.designation}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{formData.gramPanchayat}</p>

              <div className="mt-6 pt-6 border-t border-slate-100 text-left space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mobile:</span>
                  <span className="font-semibold">{formData.mobile}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">District:</span>
                  <span className="font-semibold">{formData.district}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">State:</span>
                  <span className="font-semibold">{formData.state}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-emerald-600">Active Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3 border-slate-100">
              Update Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name (पूरा नाम)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mobile Number (मोबाइल न.)</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Designation (पदभार)</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gram Panchayat Name</label>
                <input
                  type="text"
                  value={formData.gramPanchayat}
                  onChange={(e) => setFormData({ ...formData, gramPanchayat: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">District (ज़िला)</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">State (राज्य)</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Security Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-md text-sm"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManageProfileView;
