import React, { useState } from 'react';
import { Admin, ComplaintQuery } from '../types';
import ViewHeader from './ViewHeader';
import { formatDateDDMMYYYY } from '../utils/printUtils';

interface ComplaintSuggestionViewProps {
  isHindi: boolean;
  loggedInAdmin: Admin | null;
  complaints: ComplaintQuery[];
  onSubmitComplaint: (complaint: Omit<ComplaintQuery, 'id' | 'date' | 'status'>) => void;
}

export const ComplaintSuggestionView: React.FC<ComplaintSuggestionViewProps> = ({
  isHindi,
  loggedInAdmin,
  complaints,
  onSubmitComplaint,
}) => {
  const [category, setCategory] = useState<'TAX_CALCULATION' | 'PRINT_RECEIPT' | 'BILLING' | 'TECHNICAL' | 'FEATURE_REQUEST'>('TECHNICAL');
  const [type, setType] = useState<'COMPLAINT' | 'SUGGESTION'>('SUGGESTION');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [mobile, setMobile] = useState(loggedInAdmin?.mobile || '');
  const [submittedBanner, setSubmittedBanner] = useState(false);

  // Filter complaints for this specific logged-in admin
  const userComplaints = complaints.filter(
    (c) => c.adminId === loggedInAdmin?.id || c.gramPanchayat === loggedInAdmin?.gramPanchayat
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    onSubmitComplaint({
      adminId: loggedInAdmin?.id || 'admin_user',
      gramPanchayat: loggedInAdmin?.gramPanchayat || 'Gram Panchayat',
      officerName: loggedInAdmin?.name || 'Secretary / User',
      mobile: mobile || loggedInAdmin?.mobile || '',
      subject: `[${type === 'SUGGESTION' ? 'सुझाव' : 'शिकायत'}] ${subject.trim()}`,
      category,
      description: description.trim(),
    });

    setSubject('');
    setDescription('');
    setSubmittedBanner(true);
    setTimeout(() => setSubmittedBanner(false), 5000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <ViewHeader
        title={isHindi ? 'शिकायत एवं सुझाव केंद्र' : 'Complaint & Suggestion Portal'}
        subtitle={
          isHindi
            ? 'डेवलपर (Chanchal Net Zone) को पोर्टल संबंधी शिकायत अथवा सुझाव भेजें और उत्तर प्राप्त करें'
            : 'Send complaints or feature suggestions directly to the software developer'
        }
        icon="💬"
      />

      {submittedBanner && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg border border-emerald-500 font-bold text-sm flex items-center justify-between animate-fade-in">
          <span>
            {isHindi
              ? '🎉 आपकी शिकायत / सुझाव डेवलपर को सफलतापूर्वक भेज दिया गया है! जल्द प्रतिक्रिया प्राप्त होगी।'
              : '🎉 Your complaint/suggestion has been sent to the developer successfully!'}
          </span>
          <button onClick={() => setSubmittedBanner(false)} className="text-emerald-200 hover:text-white font-black text-xs">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SUBMISSION FORM */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-md border border-slate-200 space-y-4 h-fit">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {isHindi ? 'नवीन शिकायत या सुझाव भेजें' : 'Send New Complaint or Suggestion'}
              </h3>
              <p className="text-xs text-slate-500">
                {isHindi ? 'डेवलपर को अपनी समस्या या सुझाव विस्तार से लिखें' : 'Write details for the developer'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'प्रकार चुनें (Type) *' : 'Select Type *'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('SUGGESTION')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'SUGGESTION'
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>💡</span>
                  <span>{isHindi ? 'सुझाव (Suggestion)' : 'Suggestion'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('COMPLAINT')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'COMPLAINT'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>⚠️</span>
                  <span>{isHindi ? 'शिकायत (Complaint)' : 'Complaint'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'श्रेणी (Category) *' : 'Category *'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TECHNICAL">{isHindi ? 'तकनीकी समस्या (Technical Issue)' : 'Technical Issue'}</option>
                <option value="TAX_CALCULATION">{isHindi ? 'कर गणना त्रुटि (Tax Calculation Error)' : 'Tax Calculation'}</option>
                <option value="PRINT_RECEIPT">{isHindi ? 'रसीद / प्रिंट समस्या (Print Receipt Issue)' : 'Print Receipt Issue'}</option>
                <option value="BILLING">{isHindi ? 'बिलिंग व मांग पत्र (Billing & Demand Notice)' : 'Billing Issue'}</option>
                <option value="FEATURE_REQUEST">{isHindi ? 'नवीन फीचर का सुझाव (New Feature Request)' : 'Feature Request'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'विषय (Subject) *' : 'Subject *'}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={isHindi ? 'जैसे - रसीद प्रिंट में लोगो स्पष्ट नहीं आ रहा' : 'e.g. Receipt printing alignment issue'}
                className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'मोबाइल नंबर (संपर्क हेतु)' : 'Mobile Number'}
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="911234567890"
                className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'विस्तृत विवरण (Description) *' : 'Description *'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder={isHindi ? 'अपनी समस्या अथवा सुझाव को यहाँ स्पष्ट रूप से दर्ज करें...' : 'Explain in detail...'}
                className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
            >
              <span>🚀</span>
              <span>{isHindi ? 'डेवलपर को भेजें (Submit Message)' : 'Send to Developer'}</span>
            </button>
          </form>
        </div>

        {/* SUBMITTED LIST & DEVELOPER RESPONSES */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <span>📋</span>
                  <span>{isHindi ? 'आपके द्वारा भेजे गए सुझाव एवं शिकायतें' : 'Your Submitted Complaints & Suggestions'}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isHindi ? 'डेवलपर उत्तर एवं स्थिति ट्रैक करें' : 'Track status & developer replies'}
                </p>
              </div>
              <span className="bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                {userComplaints.length} {isHindi ? 'कुल' : 'Total'}
              </span>
            </div>

            {userComplaints.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <span className="text-4xl block">💬</span>
                <p className="font-bold text-slate-700 text-xs">
                  {isHindi ? 'अभी तक कोई शिकायत या सुझाव दर्ज नहीं है।' : 'No complaints or suggestions submitted yet.'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isHindi
                    ? 'बायें ओर दिए गए फॉर्म से अपनी समस्या या सुझाव डेवलपर को भेजें।'
                    : 'Use the form on the left to submit feedback to developer.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userComplaints.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-sm hover:border-emerald-300 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase border ${
                              item.subject.includes('सुझाव')
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            {item.subject.includes('सुझाव') ? '💡 सुझाव' : '⚠️ शिकायत'}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{item.subject}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium pt-1">
                          📅 {formatDateDDMMYYYY(item.date)} • {item.gramPanchayat} ({item.officerName})
                        </p>
                      </div>

                      {/* STATUS BADGE */}
                      <div>
                        {item.status === 'RESOLVED' && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span>✅</span> {isHindi ? 'निस्तारित (Resolved)' : 'Resolved'}
                          </span>
                        )}
                        {item.status === 'IN_PROGRESS' && (
                          <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span>⚙️</span> {isHindi ? 'प्रगति पर' : 'In Progress'}
                          </span>
                        )}
                        {item.status === 'PENDING' && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span>⏳</span> {isHindi ? 'लंबित' : 'Pending'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-normal">
                      {item.description}
                    </div>

                    {/* DEVELOPER REPLY BOX */}
                    {item.developerReply ? (
                      <div className="bg-emerald-50 border-2 border-emerald-300 p-3.5 rounded-xl space-y-1 text-xs text-emerald-950">
                        <div className="flex items-center justify-between font-extrabold text-emerald-900">
                          <span className="flex items-center gap-1.5">
                            <span>👨‍💻</span>
                            <span>{isHindi ? 'डेवलपर उत्तर (Chanchal Net Zone Response):' : 'Developer Reply:'}</span>
                          </span>
                          {item.replyDate && <span className="text-[10px] text-emerald-700 font-mono">{formatDateDDMMYYYY(item.replyDate)}</span>}
                        </div>
                        <p className="font-semibold text-emerald-900 leading-relaxed pt-1">
                          {item.developerReply}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        {isHindi
                          ? '⏳ डेवलपर द्वारा समीक्षा की जा रही है। शीघ्र ही उत्तर प्राप्त होगा।'
                          : '⏳ Under review by developer. Response will appear here.'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintSuggestionView;
