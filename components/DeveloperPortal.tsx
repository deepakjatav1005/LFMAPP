import React, { useState } from 'react';
import { Admin, DeveloperProfile, Subscription, SubscriptionPlan, Announcement, ComplaintQuery, DeveloperTab } from '../types';
import { saveSubscriptionPlanToSupabase, deleteSubscriptionPlanFromSupabase, saveSubscriptionToSupabase, saveComplaintToSupabase, saveAdminUserToSupabase, saveAnnouncementToSupabase, deleteAnnouncementFromSupabase } from '../lib/supabaseSync';
import { formatDateDDMMYYYY } from '../utils/printUtils';

interface DeveloperPortalProps {
  isHindi: boolean;
  developerProfile: DeveloperProfile;
  setDeveloperProfile: React.Dispatch<React.SetStateAction<DeveloperProfile>>;
  adminList: Admin[];
  setAdminList: React.Dispatch<React.SetStateAction<Admin[]>>;
  subscriptions: Subscription[];
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>;
  subscriptionPlans: SubscriptionPlan[];
  setSubscriptionPlans: React.Dispatch<React.SetStateAction<SubscriptionPlan[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  complaints: ComplaintQuery[];
  setComplaints: React.Dispatch<React.SetStateAction<ComplaintQuery[]>>;
  onLogoutDeveloper: () => void;
}

export const DeveloperPortal: React.FC<DeveloperPortalProps> = ({
  isHindi,
  developerProfile,
  setDeveloperProfile,
  adminList,
  setAdminList,
  subscriptions,
  setSubscriptions,
  subscriptionPlans = [],
  setSubscriptionPlans,
  announcements,
  setAnnouncements,
  complaints,
  setComplaints,
  onLogoutDeveloper,
}) => {
  const [activeTab, setActiveTab] = useState<DeveloperTab>(DeveloperTab.OVERVIEW);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');
  const [subFilter, setSubFilter] = useState<'ALL' | 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'TRIAL'>('ALL');
  const [complaintFilter, setComplaintFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');

  // Modal States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintQuery | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [devDeleteModal, setDevDeleteModal] = useState<{ id: string; name: string; type: 'PLAN' | 'ADMIN' } | null>(null);

  // New Subscription Plan State
  const [newPlan, setNewPlan] = useState({
    name: '',
    amount: 499,
    period: 'MONTHLY' as 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM',
    periodDays: 30,
    description: '',
    isActive: true,
  });

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name || newPlan.name.trim() === '') return;
    const plan: SubscriptionPlan = {
      id: `plan-${Date.now()}`,
      name: newPlan.name.trim(),
      amount: newPlan.amount !== undefined && newPlan.amount !== null && !isNaN(Number(newPlan.amount)) ? Number(newPlan.amount) : 0,
      period: newPlan.period,
      periodDays: Number(newPlan.periodDays) || 30,
      description: newPlan.description || '',
      isActive: newPlan.isActive,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSubscriptionPlans(prev => [...prev, plan]);
    setShowAddPlanModal(false);
    setNewPlan({ name: '', amount: 499, period: 'MONTHLY', periodDays: 30, description: '', isActive: true });

    const success = await saveSubscriptionPlanToSupabase(plan);
    if (success) {
      alert(isHindi ? '✅ नया सदस्यता प्लान बैकएंड डेटाबेस (Supabase) में सफलतापूर्वक सेव हो गया है!' : '✅ New Subscription Plan saved to backend database successfully!');
    } else {
      alert(isHindi ? '⚠️ प्लान लोकल में बनाया गया (डेटाबेस सेव पेंडिंग/विफल)।' : '⚠️ Plan created locally, but database save failed.');
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !editingPlan.name || editingPlan.name.trim() === '') return;
    const updatedPlan: SubscriptionPlan = {
      ...editingPlan,
      name: editingPlan.name.trim(),
      amount: editingPlan.amount !== undefined && editingPlan.amount !== null && !isNaN(Number(editingPlan.amount)) ? Number(editingPlan.amount) : 0,
      periodDays: Number(editingPlan.periodDays) || 30,
    };
    setSubscriptionPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    setEditingPlan(null);

    const success = await saveSubscriptionPlanToSupabase(updatedPlan);
    if (success) {
      alert(isHindi ? '✅ सदस्यता प्लान परिवर्तन बैकएंड डेटाबेस (Supabase) में सफलतापूर्वक अपडेट हो गया है!' : '✅ Subscription Plan updated in backend database successfully!');
    } else {
      alert(isHindi ? '⚠️ लोकल में अपडेट हो गया (डेटाबेस सिंक विफल)।' : '⚠️ Updated locally, but database sync failed.');
    }
  };

  const handleTogglePlanActive = async (planId: string) => {
    let targetPlan: SubscriptionPlan | null = null;
    setSubscriptionPlans(prev => prev.map(p => {
      if (p.id === planId) {
        targetPlan = { ...p, isActive: !p.isActive };
        return targetPlan;
      }
      return p;
    }));

    if (targetPlan) {
      const success = await saveSubscriptionPlanToSupabase(targetPlan);
      if (success) {
        const text = (targetPlan as SubscriptionPlan).isActive ? 'सक्रिय (ON)' : 'निष्क्रिय (OFF)';
        alert(isHindi ? `✅ सदस्यता प्लान स्थिति (${text}) बैकएंड डेटाबेस में सफलतापूर्वक अपडेट हो गई है!` : `✅ Subscription Plan status updated in backend database successfully!`);
      } else {
        alert(isHindi ? '⚠️ स्थिति लोकल में बदली (डेटाबेस सिंक विफल)।' : '⚠️ Status updated locally, database sync failed.');
      }
    }
  };

  const handleDeletePlan = (planId: string) => {
    const plan = subscriptionPlans.find(p => p.id === planId);
    setDevDeleteModal({ id: planId, name: plan?.name || 'Subscription Plan', type: 'PLAN' });
  };

  // New User Form State
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    mobile: '',
    designation: 'Gram Panchayat Secretary',
    gramPanchayat: '',
    block: '',
    district: '',
    email: '',
    password: 'password123',
  });

  // New Announcement State
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    priority: 'NORMAL' as 'NORMAL' | 'HIGH' | 'URGENT',
  });

  // Profile Form State
  const [profileForm, setProfileForm] = useState<DeveloperProfile>(developerProfile);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Statistics Calculations
  const totalUsers = adminList.length;
  const subscribedCount = subscriptions.filter(s => s.status === 'SUBSCRIBED').length;
  const unsubscribedCount = subscriptions.filter(s => s.status === 'UNSUBSCRIBED').length;
  const trialCount = subscriptions.filter(s => s.status === 'TRIAL' || s.status === 'EXPIRED').length;
  const pendingComplaints = complaints.filter(c => c.status === 'PENDING').length;
  const activeAnnouncementsCount = announcements.filter(a => a.isActive).length;
  const totalRevenue = subscriptions
    .filter(s => s.status === 'SUBSCRIBED')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Handlers
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setDeveloperProfile(profileForm);
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 3000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.gramPanchayat || !newAdmin.name || !newAdmin.mobile) return;
    const newId = `adm-${Date.now()}`;
    const createdAdmin: Admin = {
      id: newId,
      name: newAdmin.name,
      mobile: newAdmin.mobile,
      designation: newAdmin.designation,
      gramPanchayat: newAdmin.gramPanchayat,
      block: newAdmin.block || 'Main Block',
      district: newAdmin.district || 'District',
      email: newAdmin.email || `admin.${newId}@panchayat.gov.in`,
      password: newAdmin.password || 'password123',
    };

    setAdminList(prev => [...prev, createdAdmin]);
    saveAdminUserToSupabase(createdAdmin);
    
    // Auto create trial subscription
    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      adminId: newId,
      gramPanchayat: createdAdmin.gramPanchayat,
      officerName: createdAdmin.name,
      status: 'SUBSCRIBED',
      planType: 'ANNUAL',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
      amount: 4999,
    };
    setSubscriptions(prev => [...prev, newSub]);
    saveSubscriptionToSupabase(newSub);

    setShowAddUserModal(false);
    setNewAdmin({
      name: '',
      mobile: '',
      designation: 'Gram Panchayat Secretary',
      gramPanchayat: '',
      block: '',
      district: '',
      email: '',
      password: 'password123',
    });
  };

  const handleUpdateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setAdminList(prev => prev.map(a => a.id === editingAdmin.id ? editingAdmin : a));
    // Update linked subscription name
    setSubscriptions(prev => prev.map(s => s.adminId === editingAdmin.id ? { ...s, gramPanchayat: editingAdmin.gramPanchayat, officerName: editingAdmin.name } : s));
    setEditingAdmin(null);
  };

  const handleDeleteAdmin = (id: string) => {
    const adminUser = adminList.find(a => a.id === id);
    setDevDeleteModal({ id, name: adminUser ? `${adminUser.name} (${adminUser.gramPanchayat})` : 'GP Admin User', type: 'ADMIN' });
  };

  const handleToggleSubscription = async (adminId: string) => {
    let targetSub: Subscription | null = null;
    setSubscriptions(prev => prev.map(sub => {
      if (sub.adminId === adminId) {
        const newStatus = sub.status === 'SUBSCRIBED' ? 'UNSUBSCRIBED' : 'SUBSCRIBED';
        targetSub = {
          ...sub,
          status: newStatus,
          amount: newStatus === 'SUBSCRIBED' ? 4999 : 0,
        };
        return targetSub;
      }
      return sub;
    }));

    if (targetSub) {
      const success = await saveSubscriptionToSupabase(targetSub);
      if (success) {
        const text = (targetSub as Subscription).status === 'SUBSCRIBED' ? 'सक्रिय (SUBSCRIBED)' : 'निष्क्रिय (UNSUBSCRIBED)';
        alert(isHindi ? `✅ उपयोगकर्ता सब्स्क्रिप्शन स्थिति (${text}) बैकएंड डेटाबेस (Supabase) में सफलतापूर्वक अपडेट हो गई है!` : `✅ User subscription status updated in backend database successfully!`);
      } else {
        alert(isHindi ? '⚠️ स्थिति लोकल में अपडेट हुई (डेटाबेस सिंक विफल)।' : '⚠️ Status updated locally, database sync failed.');
      }
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.message) return;
    const item: Announcement = {
      id: `anc-${Date.now()}`,
      title: newAnnouncement.title,
      message: newAnnouncement.message,
      priority: newAnnouncement.priority,
      date: new Date().toISOString().split('T')[0],
      isActive: true,
    };
    setAnnouncements(prev => [item, ...prev]);
    await saveAnnouncementToSupabase(item);
    setShowAddAnnouncementModal(false);
    setNewAnnouncement({ title: '', message: '', priority: 'NORMAL' });
  };

  const handleToggleAnnouncement = async (id: string) => {
    let updatedItem: Announcement | null = null;
    setAnnouncements(prev => prev.map(a => {
      if (a.id === id) {
        updatedItem = { ...a, isActive: !a.isActive };
        return updatedItem;
      }
      return a;
    }));
    if (updatedItem) {
      await saveAnnouncementToSupabase(updatedItem);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    await deleteAnnouncementFromSupabase(id);
  };

  const handleReplyComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !replyText) return;
    let updatedItem: ComplaintQuery | null = null;
    setComplaints(prev => prev.map(c => {
      if (c.id === selectedComplaint.id) {
        updatedItem = {
          ...c,
          status: 'RESOLVED',
          developerReply: replyText,
          replyDate: new Date().toISOString().split('T')[0],
        };
        return updatedItem;
      }
      return c;
    }));

    setSelectedComplaint(null);
    setReplyText('');

    if (updatedItem) {
      const success = await saveComplaintToSupabase(updatedItem);
      if (success) {
        alert(isHindi ? '✅ शिकायत/सुझाव का उत्तर बैकएंड डेटाबेस (Supabase) में सफलतापूर्वक सुरक्षित हो गया है!' : '✅ Reply saved to backend database successfully!');
      } else {
        alert(isHindi ? '⚠️ जवाब लोकल में सेव हुआ (डेटाबेस सिंक विफल)।' : '⚠️ Reply saved locally, database sync failed.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      
      {/* TOP BRAND HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* BRAND LOGO BADGE */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center text-white font-black text-2xl shadow-lg border border-cyan-400/40">
              💻
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                  DEVELOPER & OWNER CONTROL CENTER
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  ● SYSTEM ACTIVE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {developerProfile.company}
                <span className="text-xs font-semibold text-slate-400">({developerProfile.name})</span>
              </h1>
            </div>
          </div>

          {/* DEVELOPER CREDENTIALS BADGE & LOGOUT */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <p className="font-bold text-cyan-300">{developerProfile.email}</p>
              <p className="text-[10px] text-slate-400">Master Developer Login</p>
            </div>
            <button
              onClick={onLogoutDeveloper}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-800 hover:border-red-500 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>🚪</span>
              <span>{isHindi ? 'डेवलपर लॉगआउट' : 'Developer Logout'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* TAB NAVIGATION BUTTONS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin border-b border-slate-800">
          {[
            { id: DeveloperTab.OVERVIEW, icon: '📊', label: isHindi ? 'डैशबोर्ड एवं सांख्यिकी' : 'Overview & Stats' },
            { id: DeveloperTab.PROFILE_MANAGEMENT, icon: '👤', label: isHindi ? 'डेवलपर प्रोफाइल' : 'Developer Profile' },
            { id: DeveloperTab.USER_MANAGEMENT, icon: '🏛️', label: isHindi ? 'उपयोगकर्ता/पंचायत प्रबंधन' : 'User Management', badge: totalUsers },
            { id: DeveloperTab.SUBSCRIPTION_MANAGEMENT, icon: '💳', label: isHindi ? 'सदस्यता प्रबंधन' : 'Subscription Mgmt', badge: subscribedCount },
            { id: DeveloperTab.ANNOUNCEMENT_MANAGEMENT, icon: '📢', label: isHindi ? 'घोषणा प्रबंधन' : 'Announcements', badge: activeAnnouncementsCount },
            { id: DeveloperTab.COMPLAINT_MANAGEMENT, icon: '🎧', label: isHindi ? 'शिकायत एवं सहायता' : 'Complaints & Help', badge: pendingComplaints, badgeDanger: pendingComplaints > 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DeveloperTab)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  tab.badgeDanger ? 'bg-red-500 text-white' : 'bg-slate-800 text-cyan-300 border border-cyan-800'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ==================== TAB 1: OVERVIEW & STATISTICS ==================== */}
        {activeTab === DeveloperTab.OVERVIEW && (
          <div className="space-y-6 animate-fade-in">
            
            {/* WELCOME BANNER */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 rounded-3xl border border-cyan-800/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">
                  MASTER DEVELOPER CONTROL PANEL
                </span>
                <h2 className="text-2xl font-black text-white">
                  {isHindi ? `स्वागत है, ${developerProfile.name}!` : `Welcome back, ${developerProfile.name}!`}
                </h2>
                <p className="text-xs text-slate-300 max-w-xl">
                  {isHindi
                    ? 'चंचल नेट ज़ोन (Chanchal Net Zone) स्थानीय वित्तीय प्रबंधन (Local Fund Management) सॉफ्टवेयर के संपूर्ण उपयोगकर्ता, सदस्यता, घोषणा एवं सहायता टिकटों का केंद्रीय नियंत्रण।'
                    : 'Central control dashboard for user management, subscriptions, broadcasts, and support tickets for Local Fund Management.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>🏛️+</span>
                  <span>{isHindi ? 'नवीन उपयोगकर्ता जोड़ें' : 'Add Panchayat User'}</span>
                </button>

                <button
                  onClick={() => setShowAddAnnouncementModal(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <span>📢+</span>
                  <span>{isHindi ? 'नई घोषणा प्रसारित करें' : 'Post Broadcast'}</span>
                </button>
              </div>
            </div>

            {/* STATS CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* STAT 1: TOTAL USERS */}
              <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {isHindi ? 'कुल पंचायत उपयोगकर्ता' : 'Total Gram Panchayats'}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center font-bold text-lg">
                    🏛️
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{totalUsers}</span>
                  <span className="text-xs text-slate-400 font-semibold">{isHindi ? 'पंजीकृत खाते' : 'Registered'}</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                  <span>Subscribed: <strong className="text-emerald-400">{subscribedCount}</strong></span>
                  <span>Trial/Expired: <strong className="text-amber-400">{trialCount}</strong></span>
                </div>
              </div>

              {/* STAT 2: SUBSCRIBED USERS */}
              <div className="p-5 bg-slate-900 rounded-2xl border border-emerald-900/60 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    {isHindi ? 'सक्रिय सदस्यता (Subscribed)' : 'Subscribed Users'}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-lg">
                    💳
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400">{subscribedCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">({Math.round((subscribedCount / (totalUsers || 1)) * 100)}%)</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                  <span>Revenue Projected: <strong className="text-emerald-300">₹{totalRevenue.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>

              {/* STAT 3: UNSUBSCRIBED USERS */}
              <div className="p-5 bg-slate-900 rounded-2xl border border-amber-900/60 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {isHindi ? 'गैर-सदस्य / ट्रायल उपयोगकर्ता' : 'Unsubscribed / Trial'}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center font-bold text-lg">
                    ⏳
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">{unsubscribedCount + trialCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {isHindi ? 'नवीनीकरण लंबित' : 'Pending Renew'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                  <span>Unsubscribed: <strong className="text-red-400">{unsubscribedCount}</strong></span>
                  <span>Trial: <strong className="text-amber-300">{trialCount}</strong></span>
                </div>
              </div>

              {/* STAT 4: COMPLAINTS & QUERIES */}
              <div className="p-5 bg-slate-900 rounded-2xl border border-red-900/60 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    {isHindi ? 'लंबित सहायता टिकट' : 'Pending Queries'}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-red-950 text-red-400 border border-red-800 flex items-center justify-center font-bold text-lg">
                    🎧
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-red-400">{pendingComplaints}</span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {isHindi ? 'निवारण हेतु' : 'Needs Resolution'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                  <span>Total Tickets: <strong className="text-slate-200">{complaints.length}</strong></span>
                  <span>Resolved: <strong className="text-emerald-400">{complaints.length - pendingComplaints}</strong></span>
                </div>
              </div>

            </div>

            {/* USER BREAKDOWN & RECENT ACTIVITY GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* USER SUBSCRIPTION BREAKDOWN BAR */}
              <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-black text-white text-sm flex items-center gap-2">
                    <span>📊</span>
                    <span>{isHindi ? 'सदस्यता सांख्यिकी एवं वितरण' : 'Subscription Distribution Statistics'}</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab(DeveloperTab.SUBSCRIPTION_MANAGEMENT)}
                    className="text-xs text-cyan-400 hover:underline font-bold"
                  >
                    {isHindi ? 'प्रबंधित करें →' : 'Manage All →'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Subscribed ({subscribedCount})</span>
                    <span>Unsubscribed / Trial ({unsubscribedCount + trialCount})</span>
                  </div>

                  {/* VISUAL PROGRESS BAR */}
                  <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(subscribedCount / (totalUsers || 1)) * 100}%` }}
                      className="h-full bg-emerald-500 transition-all duration-500"
                      title={`Subscribed: ${subscribedCount}`}
                    />
                    <div
                      style={{ width: `${(unsubscribedCount / (totalUsers || 1)) * 100}%` }}
                      className="h-full bg-red-500 transition-all duration-500"
                      title={`Unsubscribed: ${unsubscribedCount}`}
                    />
                    <div
                      style={{ width: `${(trialCount / (totalUsers || 1)) * 100}%` }}
                      className="h-full bg-amber-500 transition-all duration-500"
                      title={`Trial: ${trialCount}`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-emerald-400 font-bold">SUBSCRIBED</p>
                      <p className="text-lg font-black text-white">{subscribedCount}</p>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-red-400 font-bold">UNSUBSCRIBED</p>
                      <p className="text-lg font-black text-white">{unsubscribedCount}</p>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-amber-400 font-bold">TRIAL / EXPIRED</p>
                      <p className="text-lg font-black text-white">{trialCount}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-cyan-400">💡 Developer Note:</p>
                  <p className="text-[11px] text-slate-400">
                    You can toggle subscription status directly from the Subscription Management tab to enable or disable full Panchayat features.
                  </p>
                </div>
              </div>

              {/* RECENT SUPPORT TICKETS & ANNOUNCEMENTS */}
              <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-black text-white text-sm flex items-center gap-2">
                    <span>🎧</span>
                    <span>{isHindi ? 'हाल ही के प्रश्न एवं सहायता टिकट' : 'Recent Support Queries'}</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab(DeveloperTab.COMPLAINT_MANAGEMENT)}
                    className="text-xs text-cyan-400 hover:underline font-bold"
                  >
                    {isHindi ? 'सभी देखें →' : 'View All →'}
                  </button>
                </div>

                {complaints.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No complaints recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {complaints.slice(0, 3).map((comp) => (
                      <div key={comp.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded ${
                              comp.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                            }`}>
                              {comp.status}
                            </span>
                            <span className="text-xs font-bold text-white">{comp.gramPanchayat}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-300">{comp.subject}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{comp.description}</p>
                        </div>
                        <button
                          onClick={() => { setSelectedComplaint(comp); setActiveTab(DeveloperTab.COMPLAINT_MANAGEMENT); }}
                          className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-[11px] font-bold rounded-lg border border-cyan-800 shrink-0"
                        >
                          Reply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB 2: DEVELOPER PROFILE MANAGEMENT ==================== */}
        {activeTab === DeveloperTab.PROFILE_MANAGEMENT && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
              
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <span>👤</span>
                    <span>{isHindi ? 'डेवलपर एवं स्वामी प्रोफाइल' : 'Developer & Owner Profile'}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isHindi ? 'सॉफ्टवेयर स्वामित्व, संपर्क जानकारी एवं ब्रांडिंग विवरण अपडेट करें' : 'Update software owner, branding and contact details'}
                  </p>
                </div>
                <span className="px-3 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-bold rounded-full">
                  Master Owner
                </span>
              </div>

              {profileSaveSuccess && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <span>✅</span>
                  <span>{isHindi ? 'प्रोफाइल विवरण सफलतापूर्वक सहेजा गया!' : 'Profile updated successfully!'}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      {isHindi ? 'कंपनी / फर्म का नाम' : 'Company / Brand Name'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.company}
                      onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      {isHindi ? 'सॉफ्टवेयर स्वामी का नाम' : 'Owner / Developer Name'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      {isHindi ? 'ऑफिशियल ईमेल' : 'Official Support Email'}
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      {isHindi ? 'हेल्पलाइन / मोबाइल नंबर' : 'Helpline Mobile Number'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      {isHindi ? 'सॉफ्टवेयर संस्करण' : 'Software Version Tag'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.version}
                      onChange={(e) => setProfileForm({ ...profileForm, version: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      {isHindi ? 'सहायता समय' : 'Support Working Hours'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.supportHours}
                      onChange={(e) => setProfileForm({ ...profileForm, supportHours: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">
                    {isHindi ? 'कार्यालय का पता' : 'Office Address'}
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    💾 {isHindi ? 'प्रोफाइल सहेजें' : 'Save Profile Updates'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* ==================== TAB 3: USER (PANCHAYAT) MANAGEMENT ==================== */}
        {activeTab === DeveloperTab.USER_MANAGEMENT && (
          <div className="space-y-6 animate-fade-in">
            
            {/* SEARCH & ADD BAR */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-96 relative">
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder={isHindi ? 'पंचायत, सचिव या मोबाइल द्वारा खोजें...' : 'Search Panchayat, Secretary...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl"
                >
                  <option value="ALL">All Accounts ({adminList.length})</option>
                  <option value="ACTIVE">Active Accounts</option>
                </select>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>🏛️+</span>
                  <span>{isHindi ? 'नया पंचायत खाता जोड़ें' : 'Add Panchayat Account'}</span>
                </button>
              </div>
            </div>

            {/* USERS TABLE */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">Panchayat Name</th>
                      <th className="px-4 py-3.5">Secretary / Officer</th>
                      <th className="px-4 py-3.5">Contact</th>
                      <th className="px-4 py-3.5">Block & District</th>
                      <th className="px-4 py-3.5">Subscription</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {adminList
                      .filter(a => {
                        const matchesSearch = a.gramPanchayat.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.mobile.includes(searchTerm);
                        return matchesSearch;
                      })
                      .map((adm) => {
                        const sub = subscriptions.find(s => s.adminId === adm.id);
                        return (
                          <tr key={adm.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3.5 font-black text-white">
                              🏛️ {adm.gramPanchayat}
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-slate-200">{adm.name}</p>
                              <p className="text-[10px] text-slate-500">{adm.designation}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-mono text-cyan-400">{adm.mobile}</p>
                              <p className="text-[10px] text-slate-500">{adm.email || 'N/A'}</p>
                            </td>
                            <td className="px-4 py-3.5 text-slate-400">
                              {adm.block || 'Main'}, {adm.district || 'District'}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${
                                sub?.status === 'SUBSCRIBED'
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                  : 'bg-amber-950 text-amber-400 border-amber-800'
                              }`}>
                                {sub?.status || 'UNSUBSCRIBED'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right space-x-2">
                              <button
                                onClick={() => setEditingAdmin(adm)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[11px] rounded-lg border border-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAdmin(adm.id)}
                                className="px-2.5 py-1 bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-white font-bold text-[11px] rounded-lg border border-red-800"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 4: SUBSCRIPTION MANAGEMENT ==================== */}
        {activeTab === DeveloperTab.SUBSCRIPTION_MANAGEMENT && (
          <div className="space-y-6 animate-fade-in">
            
            {/* STAT SUMMARY */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900 rounded-2xl border border-emerald-900/60 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase">Active Subscribed</p>
                  <p className="text-2xl font-black text-white">{subscribedCount}</p>
                </div>
                <span className="text-2xl">💳</span>
              </div>
              <div className="p-4 bg-slate-900 rounded-2xl border border-red-900/60 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-red-400 uppercase">Unsubscribed</p>
                  <p className="text-2xl font-black text-white">{unsubscribedCount}</p>
                </div>
                <span className="text-2xl">🚫</span>
              </div>
              <div className="p-4 bg-slate-900 rounded-2xl border border-amber-900/60 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase">Trial / Expired</p>
                  <p className="text-2xl font-black text-white">{trialCount}</p>
                </div>
                <span className="text-2xl">⏳</span>
              </div>
            </div>

            {/* DEVELOPER SUBSCRIPTION PLAN CREATOR & TOGGLE CONTROL */}
            <div className="p-5 bg-slate-900 rounded-2xl border border-cyan-900/60 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <span>👑</span>
                    <span>{isHindi ? 'सदस्यता प्लान निर्माता एवं ऑन/ऑफ टॉगल नियंत्रण' : 'Subscription Plans & On/Off Toggle Control'}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isHindi
                      ? 'डेवलपर द्वारा प्लान बनाएँ, राशि एवं अवधि तय करें, तथा On/Off बटन से प्लान चालू अथवा बंद करें'
                      : 'Create plans with custom amount, duration, and toggle ON/OFF active visibility for users'}
                  </p>
                </div>

                <button
                  onClick={() => setShowAddPlanModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-emerald-400/40"
                >
                  <span>✨</span>
                  <span>{isHindi ? 'नया प्लान जोड़ें (Add Plan)' : 'Create New Plan'}</span>
                </button>
              </div>

              {/* LIST OF CREATED SUBSCRIPTION PLANS */}
              {subscriptionPlans.length === 0 ? (
                <div className="p-6 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-xs font-bold text-slate-400">
                    {isHindi ? 'अभी कोई नया प्लान नहीं बनाया गया है।' : 'No custom subscription plans created yet.'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isHindi ? 'ऊपर दिए गए "नया प्लान जोड़ें" बटन से नया प्लान निर्मित करें।' : 'Click "Create New Plan" to add custom plan.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subscriptionPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-4 rounded-2xl border shadow-lg space-y-3 relative transition-all ${
                        plan.isActive
                          ? 'bg-slate-950 border-emerald-800/80'
                          : 'bg-slate-950/60 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-white text-sm">{plan.name}</span>
                        <span className="text-[10px] font-black font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                          {plan.period}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-emerald-400">₹{plan.amount}</span>
                        <span className="text-[11px] font-medium text-slate-400">/ {plan.periodDays} days</span>
                      </div>

                      {plan.description && (
                        <p className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800">
                          {plan.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        {/* ON / OFF TOGGLE SWITCH BUTTON */}
                        <button
                          onClick={() => handleTogglePlanActive(plan.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                            plan.isActive
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-950'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full inline-block ${plan.isActive ? 'bg-white' : 'bg-slate-500'}`} />
                          <span>{plan.isActive ? 'PLAN ON (सक्रिय)' : 'PLAN OFF (निष्क्रिय)'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingPlan(plan)}
                            className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-600 text-amber-300 hover:text-white font-bold text-[10px] rounded-lg border border-amber-800/80 transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-white font-bold text-[10px] rounded-lg border border-red-800/80 transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SUBSCRIPTION TABLE */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-black text-white text-sm">
                  {isHindi ? 'ग्राम पंचायत उपयोगकर्ता सदस्यता स्थिति एवं नियंत्रण' : 'Panchayat Subscriptions Control'}
                </h3>
                <div className="flex gap-2">
                  {(['ALL', 'SUBSCRIBED', 'UNSUBSCRIBED', 'TRIAL'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setSubFilter(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                        subFilter === st ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">Panchayat & Officer</th>
                      <th className="px-4 py-3.5">Plan Type</th>
                      <th className="px-4 py-3.5">Renewal Date</th>
                      <th className="px-4 py-3.5">Amount</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Action Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {subscriptions
                      .filter(s => subFilter === 'ALL' || s.status === subFilter)
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-black text-white">🏛️ {sub.gramPanchayat}</p>
                            <p className="text-[10px] text-slate-400">{sub.officerName}</p>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-cyan-300">
                            {sub.planName || `${sub.planType} PLAN`}
                          </td>
                          <td className="px-4 py-3.5 text-slate-300 font-mono">
                            {formatDateDDMMYYYY(sub.endDate)}
                          </td>
                          <td className="px-4 py-3.5 font-black text-emerald-400">
                            ₹{sub.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${
                              sub.status === 'SUBSCRIBED'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : sub.status === 'UNSUBSCRIBED'
                                ? 'bg-red-950 text-red-400 border-red-800'
                                : 'bg-amber-950 text-amber-400 border-amber-800'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleToggleSubscription(sub.adminId)}
                              className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer border ${
                                sub.status === 'SUBSCRIBED'
                                  ? 'bg-red-950 hover:bg-red-900 text-red-300 border-red-800'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md'
                              }`}
                            >
                              {sub.status === 'SUBSCRIBED' ? 'Deactivate Sub' : 'Activate Sub (Subscribed)'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 5: ANNOUNCEMENT MANAGEMENT ==================== */}
        {activeTab === DeveloperTab.ANNOUNCEMENT_MANAGEMENT && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div>
                <h2 className="text-base font-black text-white">
                  {isHindi ? 'सिस्टम घोषणाएं एवं समाचार पट्टी' : 'Broadcast Announcements & Ticker'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isHindi ? 'सभी ग्राम पंचायत यूजर डैशबोर्ड पर प्रसारित होने वाली लाइव घोषणाएं' : 'Announcements broadcasted across all Gram Panchayat headers'}
                </p>
              </div>
              <button
                onClick={() => setShowAddAnnouncementModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>📢+</span>
                <span>{isHindi ? 'नई घोषणा पोस्ट करें' : 'Post New Broadcast'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map((anc) => (
                <div key={anc.id} className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className={`px-2.5 py-0.5 text-[9px] font-black rounded uppercase ${
                      anc.priority === 'URGENT' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                    }`}>
                      {anc.priority} PRIORITY
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{formatDateDDMMYYYY(anc.date)}</span>
                  </div>

                  <h3 className="font-black text-white text-sm">{anc.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {anc.message}
                  </p>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => handleToggleAnnouncement(anc.id)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg border ${
                        anc.isActive ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {anc.isActive ? '● Live Broadcast Active' : '○ Paused'}
                    </button>

                    <button
                      onClick={() => handleDeleteAnnouncement(anc.id)}
                      className="px-2.5 py-1 text-[11px] bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-lg border border-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ==================== TAB 6: COMPLAINT & QUERY MANAGEMENT ==================== */}
        {activeTab === DeveloperTab.COMPLAINT_MANAGEMENT && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div>
                <h2 className="text-base font-black text-white">
                  {isHindi ? 'ग्राम पंचायत सहायता एवं शिकायत टिकट' : 'Support Tickets & Help Queries'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isHindi ? 'ग्राम पंचायत सचिवों/अधिकारियों द्वारा प्राप्त तकनीकी एवं बिलिंग प्रश्न' : 'User queries from secretaries regarding taxes, billing, or features'}
                </p>
              </div>

              <div className="flex gap-2">
                {(['ALL', 'PENDING', 'RESOLVED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setComplaintFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      complaintFilter === st ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {complaints
                .filter(c => complaintFilter === 'ALL' || c.status === complaintFilter)
                .map((comp) => (
                  <div key={comp.id} className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">🏛️ {comp.gramPanchayat}</span>
                          <span className="text-xs text-slate-400 font-semibold">({comp.officerName} - {comp.mobile})</span>
                        </div>
                        <p className="text-[11px] text-cyan-400 font-bold mt-0.5">Category: {comp.category}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">{formatDateDDMMYYYY(comp.date)}</span>
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${
                          comp.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-red-950 text-red-400 border-red-800'
                        }`}>
                          {comp.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-xs">Subject: {comp.subject}</h4>
                      <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        {comp.description}
                      </p>
                    </div>

                    {/* DEVELOPER REPLY DISPLAY OR FORM */}
                    {comp.developerReply ? (
                      <div className="p-3 bg-cyan-950/40 border border-cyan-800/80 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-cyan-300 flex items-center justify-between">
                          <span>💬 Developer Resolution Reply ({developerProfile.name}):</span>
                          <span className="text-[10px] text-slate-400 font-normal">{formatDateDDMMYYYY(comp.replyDate)}</span>
                        </p>
                        <p className="text-slate-200">{comp.developerReply}</p>
                      </div>
                    ) : (
                      <div className="pt-2">
                        {selectedComplaint?.id === comp.id ? (
                          <form onSubmit={handleReplyComplaint} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <label className="block text-xs font-bold text-cyan-400">
                              Write Resolution / Answer:
                            </label>
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type solution or reply to Gram Panchayat secretary..."
                              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                              required
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedComplaint(null)}
                                className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg shadow"
                              >
                                Submit & Resolve Ticket
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => { setSelectedComplaint(comp); setReplyText(''); }}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                          >
                            💬 Write Developer Resolution Reply
                          </button>
                        )}
                      </div>
                    )}

                  </div>
                ))}
            </div>

          </div>
        )}

      </div>

      {/* MODAL: ADD PANCHAYAT USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">🏛️ Add New Panchayat Account</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Gram Panchayat Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Gram Panchayat Bamori"
                  value={newAdmin.gramPanchayat}
                  onChange={(e) => setNewAdmin({ ...newAdmin, gramPanchayat: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Officer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Shri Chanchal Kumar"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    placeholder="10-digit mobile"
                    value={newAdmin.mobile}
                    onChange={(e) => setNewAdmin({ ...newAdmin, mobile: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Block</label>
                  <input
                    type="text"
                    placeholder="e.g. Guna"
                    value={newAdmin.block}
                    onChange={(e) => setNewAdmin({ ...newAdmin, block: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">District</label>
                  <input
                    type="text"
                    placeholder="e.g. Guna"
                    value={newAdmin.district}
                    onChange={(e) => setNewAdmin({ ...newAdmin, district: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl shadow"
                >
                  Create Panchayat User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">✏️ Edit Panchayat Account</h3>
              <button onClick={() => setEditingAdmin(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Gram Panchayat Name</label>
                <input
                  type="text"
                  value={editingAdmin.gramPanchayat}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, gramPanchayat: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Officer Name</label>
                  <input
                    type="text"
                    value={editingAdmin.name}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={editingAdmin.mobile}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, mobile: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ANNOUNCEMENT */}
      {showAddAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">📢 Broadcast New Announcement</h3>
              <button onClick={() => setShowAddAnnouncementModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. New Financial Year Tax Settlement Notice"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Priority</label>
                <select
                  value={newAnnouncement.priority}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as any })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Broadcast</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Message Body *</label>
                <textarea
                  rows={3}
                  placeholder="Broadcast message text visible across all Gram Panchayat headers..."
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAnnouncementModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl shadow"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUBSCRIPTION PLAN */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">✨ {isHindi ? 'नया सदस्यता प्लान निर्मित करें' : 'Create New Subscription Plan'}</h3>
              <button onClick={() => setShowAddPlanModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isHindi ? 'प्लान का नाम (Plan Name) *' : 'Plan Name *'}
                </label>
                <input
                  type="text"
                  placeholder={isHindi ? 'जैसे - वार्षिक अनलिमिटेड प्लान (Annual Plan)' : 'e.g. Annual Unlimited Plan'}
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {isHindi ? 'प्लान राशि (Amount ₹) *' : 'Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    value={newPlan.amount}
                    onChange={(e) => setNewPlan({ ...newPlan, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-black text-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {isHindi ? 'अवधि प्रकार (Period)' : 'Period Type'}
                  </label>
                  <select
                    value={newPlan.period}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      let days = 30;
                      if (val === 'ANNUAL') days = 365;
                      if (val === 'LIFETIME') days = 3650;
                      setNewPlan({ ...newPlan, period: val, periodDays: days });
                    }}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  >
                    <option value="MONTHLY">{isHindi ? 'मासिक (Monthly - 30 days)' : 'Monthly'}</option>
                    <option value="ANNUAL">{isHindi ? 'वार्षिक (Annual - 365 days)' : 'Annual'}</option>
                    <option value="LIFETIME">{isHindi ? 'लाइफटाइम (Lifetime Pass)' : 'Lifetime'}</option>
                    <option value="CUSTOM">{isHindi ? 'कस्टम दिन (Custom Days)' : 'Custom Days'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isHindi ? 'वैधता कुल दिन (Total Days)' : 'Validity Period in Days'}
                </label>
                <input
                  type="number"
                  value={newPlan.periodDays}
                  onChange={(e) => setNewPlan({ ...newPlan, periodDays: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isHindi ? 'प्लान विवरण (Description)' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isHindi ? 'प्लान की मुख्य विशेषताएं...' : 'Plan highlights...'}
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              {/* ACTIVE ON/OFF INITIAL TOGGLE */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300">
                  {isHindi ? 'प्लान स्थिति तुरंत चालू (ON) रखें?' : 'Set Plan Active Immediately (ON)?'}
                </span>
                <button
                  type="button"
                  onClick={() => setNewPlan({ ...newPlan, isActive: !newPlan.isActive })}
                  className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer border ${
                    newPlan.isActive ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {newPlan.isActive ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow border border-emerald-400"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SUBSCRIPTION PLAN */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-amber-400 text-base">✏️ {isHindi ? 'सदस्यता प्लान संशोधित करें (Edit Plan)' : 'Edit Subscription Plan'}</h3>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isHindi ? 'प्लान का नाम (Plan Name) *' : 'Plan Name *'}
                </label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {isHindi ? 'प्लान राशि (Amount ₹) *' : 'Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    value={editingPlan.amount}
                    onChange={(e) => setEditingPlan({ ...editingPlan, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-black text-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {isHindi ? 'अवधि प्रकार (Period)' : 'Period Type'}
                  </label>
                  <select
                    value={editingPlan.period}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      let days = editingPlan.periodDays;
                      if (val === 'MONTHLY') days = 30;
                      if (val === 'ANNUAL') days = 365;
                      if (val === 'LIFETIME') days = 3650;
                      setEditingPlan({ ...editingPlan, period: val, periodDays: days });
                    }}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  >
                    <option value="MONTHLY">{isHindi ? 'मासिक (Monthly - 30 days)' : 'Monthly'}</option>
                    <option value="ANNUAL">{isHindi ? 'वार्षिक (Annual - 365 days)' : 'Annual'}</option>
                    <option value="LIFETIME">{isHindi ? 'लाइफटाइम (Lifetime Pass)' : 'Lifetime'}</option>
                    <option value="CUSTOM">{isHindi ? 'कस्टम दिन (Custom Days)' : 'Custom Days'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isHindi ? 'वैधता कुल दिन (Total Days)' : 'Validity Period in Days'}
                </label>
                <input
                  type="number"
                  value={editingPlan.periodDays}
                  onChange={(e) => setEditingPlan({ ...editingPlan, periodDays: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isHindi ? 'प्लान विवरण (Description)' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              {/* ACTIVE ON/OFF TOGGLE */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300">
                  {isHindi ? 'प्लान स्थिति (PLAN ON/OFF)' : 'Plan Status (ON/OFF)'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingPlan({ ...editingPlan, isActive: !editingPlan.isActive })}
                  className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer border ${
                    editingPlan.isActive ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {editingPlan.isActive ? 'PLAN ON' : 'PLAN OFF'}
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl shadow border border-amber-400 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEV DELETE CONFIRM MODAL */}
      {devDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-rose-500/30 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in text-center text-slate-100">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-2xl border border-rose-500/30">
              🗑️
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                {isHindi ? 'हटाने की पुष्टि करें' : 'Confirm Deletion'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {isHindi
                  ? `क्या आप निश्चित रूप से "${devDeleteModal.name}" को हटाना चाहते हैं?`
                  : `Are you sure you want to delete "${devDeleteModal.name}"?`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDevDeleteModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer border border-slate-700"
              >
                {isHindi ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (devDeleteModal.type === 'PLAN') {
                    const pid = devDeleteModal.id;
                    setSubscriptionPlans(prev => prev.filter(p => p.id !== pid));
                    await deleteSubscriptionPlanFromSupabase(pid);
                  } else if (devDeleteModal.type === 'ADMIN') {
                    const aid = devDeleteModal.id;
                    setAdminList(prev => prev.filter(a => a.id !== aid));
                    setSubscriptions(prev => prev.filter(s => s.adminId !== aid));
                  }
                  setDevDeleteModal(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer border border-rose-400"
              >
                {isHindi ? 'हाँ, हटाएं (Yes, Delete)' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
