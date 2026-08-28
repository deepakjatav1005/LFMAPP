import React, { useState } from 'react';
import { Admin, DeveloperProfile, Subscription, SubscriptionPlan, Announcement, ComplaintQuery, DeveloperTab } from '../types';
import { saveSubscriptionPlanToSupabase, deleteSubscriptionPlanFromSupabase, saveSubscriptionToSupabase, deleteSubscriptionFromSupabase, saveComplaintToSupabase, saveAdminUserToSupabase, deleteAdminUserFromSupabase, saveAnnouncementToSupabase, deleteAnnouncementFromSupabase, saveDeveloperProfileToSupabase, fetchDeveloperProfileFromSupabase, uploadImageToSupabaseBucket } from '../lib/supabaseSync';
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
  const [profileForm, setProfileForm] = useState<DeveloperProfile>({
    id: developerProfile?.id || 'master_developer',
    name: developerProfile?.name || '',
    company: developerProfile?.company || '',
    email: developerProfile?.email || '',
    phone: developerProfile?.phone || '',
    version: developerProfile?.version || 'v3.0 Multi-Tenant Pro',
    supportHours: developerProfile?.supportHours || '',
    address: developerProfile?.address || '',
    logoUrl: developerProfile?.logoUrl || '',
    avatarUrl: developerProfile?.avatarUrl || '',
    qrCodeUrl: developerProfile?.qrCodeUrl || '',
    upiId: developerProfile?.upiId || '',
  });
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  React.useEffect(() => {
    if (developerProfile) {
      setProfileForm({
        id: developerProfile.id || 'master_developer',
        name: developerProfile.name || '',
        company: developerProfile.company || '',
        email: developerProfile.email || '',
        phone: developerProfile.phone || '',
        version: developerProfile.version || 'v3.0 Multi-Tenant Pro',
        supportHours: developerProfile.supportHours || '',
        address: developerProfile.address || '',
        logoUrl: developerProfile.logoUrl || '',
        avatarUrl: developerProfile.avatarUrl || '',
        qrCodeUrl: developerProfile.qrCodeUrl || '',
        upiId: developerProfile.upiId || '',
      });
    }
  }, [developerProfile]);

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

  // File Upload Handlers for Developer Profile
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately via FileReader
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setProfileForm(prev => ({ ...prev, logoUrl: base64 }));
      
      setUploadingLogo(true);
      try {
        const uploadResult = await uploadImageToSupabaseBucket(file, 'photos', 'developer_branding');
        if (uploadResult.success && uploadResult.publicUrl) {
          setProfileForm(prev => ({ ...prev, logoUrl: uploadResult.publicUrl }));
        }
      } catch (err) {
        console.error('Logo upload error:', err);
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setProfileForm(prev => ({ ...prev, avatarUrl: base64 }));
      
      setUploadingAvatar(true);
      try {
        const uploadResult = await uploadImageToSupabaseBucket(file, 'photos', 'developer_avatars');
        if (uploadResult.success && uploadResult.publicUrl) {
          setProfileForm(prev => ({ ...prev, avatarUrl: uploadResult.publicUrl }));
        }
      } catch (err) {
        console.error('Avatar upload error:', err);
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setProfileForm(prev => ({ ...prev, qrCodeUrl: base64 }));
      
      setUploadingQr(true);
      try {
        const uploadResult = await uploadImageToSupabaseBucket(file, 'photos', 'developer_payments');
        if (uploadResult.success && uploadResult.publicUrl) {
          setProfileForm(prev => ({ ...prev, qrCodeUrl: uploadResult.publicUrl }));
        }
      } catch (err) {
        console.error('QR code upload error:', err);
      } finally {
        setUploadingQr(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveSuccess(false);

    try {
      const updatedProfile: DeveloperProfile = {
        ...profileForm,
        id: profileForm.id || 'master_developer',
        updatedAt: new Date().toISOString(),
      };

      // 1. Update React memory state
      setDeveloperProfile(updatedProfile);

      // 2. Update localStorage for offline fallback
      try {
        localStorage.setItem('gp_developer_profile', JSON.stringify(updatedProfile));
      } catch (lsErr) {}

      // 3. Persist to Supabase Database (with auto-upload of images to storage)
      const res = await saveDeveloperProfileToSupabase(updatedProfile);

      if (res.success) {
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 4000);
      } else {
        setProfileSaveError(res.error || 'Failed to save to database table');
      }
    } catch (err: any) {
      setProfileSaveError(err?.message || 'Unexpected error occurred while saving profile');
    } finally {
      setIsSavingProfile(false);
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      
      {/* TOP BRAND HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* BRAND LOGO BADGE */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-primary-700 flex items-center justify-center text-white font-black text-2xl shadow-md border border-blue-400 overflow-hidden shrink-0">
              {developerProfile.logoUrl ? (
                <img
                  src={developerProfile.logoUrl}
                  alt="Brand Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : developerProfile.avatarUrl ? (
                <img
                  src={developerProfile.avatarUrl}
                  alt="Developer Avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                '💻'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-primary uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  DEVELOPER & OWNER CONTROL CENTER
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ● SYSTEM ACTIVE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {developerProfile.company}
                <span className="text-xs font-bold text-slate-500">({developerProfile.name})</span>
              </h1>
            </div>
          </div>

          {/* DEVELOPER CREDENTIALS BADGE & LOGOUT */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
              <p className="font-black text-primary">{developerProfile.email}</p>
              <p className="text-[10px] font-bold text-slate-500">Master Developer Login</p>
            </div>
            <button
              onClick={onLogoutDeveloper}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin border-b border-slate-200">
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
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-blue-50/60 border-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  tab.badgeDanger ? 'bg-red-500 text-white' : 'bg-blue-100 text-primary border border-blue-200'
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
            <div className="p-6 bg-gradient-to-r from-blue-700 via-primary-700 to-blue-800 text-white rounded-3xl border border-blue-600 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-xs font-black text-blue-200 tracking-wider uppercase">
                  MASTER DEVELOPER CONTROL PANEL
                </span>
                <h2 className="text-2xl font-black text-white">
                  {isHindi ? `स्वागत है, ${developerProfile.name}!` : `Welcome back, ${developerProfile.name}!`}
                </h2>
                <p className="text-xs text-blue-100 font-medium max-w-xl">
                  {isHindi
                    ? 'चंचल नेट ज़ोन (Chanchal Net Zone) स्थानीय वित्तीय प्रबंधन (Local Fund Management) सॉफ्टवेयर के संपूर्ण उपयोगकर्ता, सदस्यता, घोषणा एवं सहायता टिकटों का केंद्रीय नियंत्रण।'
                    : 'Central control dashboard for user management, subscriptions, broadcasts, and support tickets for Local Fund Management.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSqlModal(true)}
                  className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white border border-white/40 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm backdrop-blur-sm"
                >
                  <span>📜</span>
                  <span>{isHindi ? 'डेटाबेस SQL' : 'Supabase SQL'}</span>
                </button>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-2.5 bg-white text-primary hover:bg-blue-50 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>🏛️+</span>
                  <span>{isHindi ? 'नवीन उपयोगकर्ता जोड़ें' : 'Add Panchayat User'}</span>
                </button>

                <button
                  onClick={() => setShowAddAnnouncementModal(true)}
                  className="px-4 py-2.5 bg-blue-900/60 hover:bg-blue-900 text-white font-black text-xs rounded-xl transition-all border border-blue-400 flex items-center gap-2 cursor-pointer"
                >
                  <span>📢+</span>
                  <span>{isHindi ? 'नई घोषणा प्रसारित करें' : 'Post Broadcast'}</span>
                </button>
              </div>
            </div>

            {/* STATS CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* STAT 1: TOTAL USERS */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                    {isHindi ? 'कुल पंचायत उपयोगकर्ता' : 'Total Gram Panchayats'}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary border border-blue-200 flex items-center justify-center font-bold text-lg">
                    🏛️
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{totalUsers}</span>
                  <span className="text-xs text-slate-500 font-bold">{isHindi ? 'पंजीकृत खाते' : 'Registered'}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600 font-medium">
                  <span>Subscribed: <strong className="text-emerald-700 font-bold">{subscribedCount}</strong></span>
                  <span>Trial/Expired: <strong className="text-amber-700 font-bold">{trialCount}</strong></span>
                </div>
              </div>

              {/* STAT 2: SUBSCRIBED USERS */}
              <div className="p-5 bg-white rounded-2xl border border-emerald-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                    {isHindi ? 'सक्रिय सदस्यता (Subscribed)' : 'Subscribed Users'}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-lg">
                    💳
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-700">{subscribedCount}</span>
                  <span className="text-xs text-slate-500 font-bold">({Math.round((subscribedCount / (totalUsers || 1)) * 100)}%)</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600 font-medium">
                  <span>Revenue Projected: <strong className="text-emerald-700 font-bold">₹{totalRevenue.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>

              {/* STAT 3: UNSUBSCRIBED USERS */}
              <div className="p-5 bg-white rounded-2xl border border-amber-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-800 uppercase tracking-wider">
                    {isHindi ? 'गैर-सदस्य / ट्रायल उपयोगकर्ता' : 'Unsubscribed / Trial'}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-lg">
                    ⏳
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-700">{unsubscribedCount + trialCount}</span>
                  <span className="text-xs text-slate-500 font-bold">
                    {isHindi ? 'नवीनीकरण लंबित' : 'Pending Renew'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600 font-medium">
                  <span>Unsubscribed: <strong className="text-red-700 font-bold">{unsubscribedCount}</strong></span>
                  <span>Trial: <strong className="text-amber-700 font-bold">{trialCount}</strong></span>
                </div>
              </div>

              {/* STAT 4: COMPLAINTS & QUERIES */}
              <div className="p-5 bg-white rounded-2xl border border-rose-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-800 uppercase tracking-wider">
                    {isHindi ? 'लंबित सहायता टिकट' : 'Pending Queries'}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-lg">
                    🎧
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-rose-700">{pendingComplaints}</span>
                  <span className="text-xs text-slate-500 font-bold">
                    {isHindi ? 'निवारण हेतु' : 'Needs Resolution'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600 font-medium">
                  <span>Total Tickets: <strong className="text-slate-800 font-bold">{complaints.length}</strong></span>
                  <span>Resolved: <strong className="text-emerald-700 font-bold">{complaints.length - pendingComplaints}</strong></span>
                </div>
              </div>

            </div>

            {/* USER BREAKDOWN & RECENT ACTIVITY GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* USER SUBSCRIPTION BREAKDOWN BAR */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <span>📊</span>
                    <span>{isHindi ? 'सदस्यता सांख्यिकी एवं वितरण' : 'Subscription Distribution Statistics'}</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab(DeveloperTab.SUBSCRIPTION_MANAGEMENT)}
                    className="text-xs text-primary hover:underline font-bold"
                  >
                    {isHindi ? 'प्रबंधित करें →' : 'Manage All →'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Subscribed ({subscribedCount})</span>
                    <span>Unsubscribed / Trial ({unsubscribedCount + trialCount})</span>
                  </div>

                  {/* VISUAL PROGRESS BAR */}
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                    <div
                      style={{ width: `${(subscribedCount / (totalUsers || 1)) * 100}%` }}
                      className="h-full bg-emerald-500 transition-all duration-500"
                      title={`Subscribed: ${subscribedCount}`}
                    />
                    <div
                      style={{ width: `${(unsubscribedCount / (totalUsers || 1)) * 100}%` }}
                      className="h-full bg-rose-500 transition-all duration-500"
                      title={`Unsubscribed: ${unsubscribedCount}`}
                    />
                    <div
                      style={{ width: `${(trialCount / (totalUsers || 1)) * 100}%` }}
                      className="h-full bg-amber-500 transition-all duration-500"
                      title={`Trial: ${trialCount}`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-200">
                      <p className="text-[10px] text-emerald-800 font-bold">SUBSCRIBED</p>
                      <p className="text-lg font-black text-emerald-700">{subscribedCount}</p>
                    </div>
                    <div className="p-2 bg-rose-50/70 rounded-xl border border-rose-200">
                      <p className="text-[10px] text-rose-800 font-bold">UNSUBSCRIBED</p>
                      <p className="text-lg font-black text-rose-700">{unsubscribedCount}</p>
                    </div>
                    <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-200">
                      <p className="text-[10px] text-amber-800 font-bold">TRIAL / EXPIRED</p>
                      <p className="text-lg font-black text-amber-700">{trialCount}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-slate-700 space-y-1">
                  <p className="font-black text-primary">💡 Developer Note:</p>
                  <p className="text-[11px] text-slate-600 font-medium">
                    You can toggle subscription status directly from the Subscription Management tab to enable or disable full Panchayat features.
                  </p>
                </div>
              </div>

              {/* RECENT SUPPORT TICKETS & ANNOUNCEMENTS */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <span>🎧</span>
                    <span>{isHindi ? 'हाल ही के प्रश्न एवं सहायता टिकट' : 'Recent Support Queries'}</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab(DeveloperTab.COMPLAINT_MANAGEMENT)}
                    className="text-xs text-primary hover:underline font-bold"
                  >
                    {isHindi ? 'सभी देखें →' : 'View All →'}
                  </button>
                </div>

                {complaints.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No complaints recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {complaints.slice(0, 3).map((comp) => (
                      <div key={comp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded ${
                              comp.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {comp.status}
                            </span>
                            <span className="text-xs font-black text-slate-900">{comp.gramPanchayat}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800">{comp.subject}</p>
                          <p className="text-[10px] text-slate-600 line-clamp-1">{comp.description}</p>
                        </div>
                        <button
                          onClick={() => { setSelectedComplaint(comp); setActiveTab(DeveloperTab.COMPLAINT_MANAGEMENT); }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-primary text-[11px] font-bold rounded-lg border border-blue-200 shrink-0"
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
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>👤</span>
                    <span>{isHindi ? 'डेवलपर एवं स्वामी प्रोफाइल प्रबंधन' : 'Developer & Owner Profile Management'}</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {isHindi ? 'सॉफ्टवेयर स्वामित्व, लोगो, फोटो, UPI QR कोड, संपर्क जानकारी एवं ब्रांडिंग डेटाबेस में सिंक करें' : 'Update software owner, branding logo, photo, payment QR and sync directly to Supabase'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSqlModal(true)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>📜</span>
                    <span>{isHindi ? 'डेटाबेस SQL स्क्रिप्ट देखें' : 'View Database SQL'}</span>
                  </button>
                  <span className="px-3 py-1.5 bg-blue-50 text-primary border border-blue-200 text-xs font-bold rounded-xl">
                    Master Owner
                  </span>
                </div>
              </div>

              {profileSaveSuccess && (
                <div className="p-4 bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✅</span>
                    <span>{isHindi ? 'डेवलपर प्रोफाइल और फोटो/QR कोड Supabase डेटाबेस में सफलतापूर्वक सहेजे गए!' : 'Developer profile, photos, and branding saved to Supabase database successfully!'}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-900 text-emerald-300 rounded text-[10px]">Synced</span>
                </div>
              )}

              {profileSaveError && (
                <div className="p-4 bg-red-950/90 border border-red-800 text-red-200 text-xs font-medium rounded-2xl space-y-2 shadow-lg">
                  <div className="flex items-center gap-2 font-bold text-red-300">
                    <span className="text-base">⚠️</span>
                    <span>{isHindi ? 'डेटाबेस सिंक चेतावनी (लोकल स्टोरेज में सुरक्षित):' : 'Database Sync Warning (Saved to Local Storage):'}</span>
                  </div>
                  <p className="text-[11px] text-red-300/90">{profileSaveError}</p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSqlModal(true)}
                      className="px-3 py-1 bg-red-900 hover:bg-red-800 text-white rounded-lg text-[11px] font-bold underline cursor-pointer"
                    >
                      {isHindi ? 'आवश्यक SQL टेबल एवं स्टोरेज बकेट स्क्रिप्ट प्राप्त करें ➔' : 'Get Required SQL Table & Storage Script ➔'}
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
                
                {/* BRANDING ASSETS UPLOAD SECTION */}
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 space-y-4">
                  <h3 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-2">
                    <span>🖼️</span>
                    <span>{isHindi ? 'ब्रांडिंग, लोगो एवं भुगतान QR कोड (Supabase स्टोरेज)' : 'Branding Logo, Photo & Payment QR Code (Supabase Storage)'}</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* 1. BRAND / COMPANY LOGO */}
                    <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col items-center text-center space-y-2">
                      <span className="font-bold text-slate-700 text-[11px]">
                        {isHindi ? 'कंपनी / फर्म लोगो' : 'Company / Brand Logo'}
                      </span>
                      <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-center overflow-hidden relative shadow-inner">
                        {profileForm.logoUrl ? (
                          <img
                            src={profileForm.logoUrl}
                            alt="Logo Preview"
                            className="w-full h-full object-contain p-1"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-2xl text-slate-400">🏢</span>
                        )}
                        {uploadingLogo && (
                          <div className="absolute inset-0 bg-white/90 flex items-center justify-center text-[10px] text-primary font-bold animate-pulse">
                            Uploading...
                          </div>
                        )}
                      </div>
                      <label className="w-full px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-primary rounded-lg text-[11px] font-bold text-center cursor-pointer transition-all border border-blue-200">
                        <span>{uploadingLogo ? '⏳ अपलोड हो रहा...' : profileForm.logoUrl ? '🔄 लोगो बदलें' : '📤 लोगो अपलोड करें'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {profileForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileForm({ ...profileForm, logoUrl: '' })}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-bold underline"
                        >
                          हटाएं (Remove)
                        </button>
                      )}
                    </div>

                    {/* 2. DEVELOPER AVATAR / PHOTO */}
                    <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col items-center text-center space-y-2">
                      <span className="font-bold text-slate-700 text-[11px]">
                        {isHindi ? 'डेवलपर फोटो / अवतार' : 'Developer Avatar / Photo'}
                      </span>
                      <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-300 flex items-center justify-center overflow-hidden relative shadow-inner">
                        {profileForm.avatarUrl ? (
                          <img
                            src={profileForm.avatarUrl}
                            alt="Avatar Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-2xl text-slate-400">👨‍💻</span>
                        )}
                        {uploadingAvatar && (
                          <div className="absolute inset-0 bg-white/90 flex items-center justify-center text-[10px] text-primary font-bold animate-pulse">
                            Uploading...
                          </div>
                        )}
                      </div>
                      <label className="w-full px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-primary rounded-lg text-[11px] font-bold text-center cursor-pointer transition-all border border-blue-200">
                        <span>{uploadingAvatar ? '⏳ अपलोड हो रहा...' : profileForm.avatarUrl ? '🔄 फोटो बदलें' : '📤 फोटो अपलोड करें'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </label>
                      {profileForm.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileForm({ ...profileForm, avatarUrl: '' })}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-bold underline"
                        >
                          हटाएं (Remove)
                        </button>
                      )}
                    </div>

                    {/* 3. PAYMENT UPI QR CODE */}
                    <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col items-center text-center space-y-2">
                      <span className="font-bold text-slate-700 text-[11px]">
                        {isHindi ? 'UPI भुगतान QR कोड' : 'Payment UPI QR Code'}
                      </span>
                      <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-center overflow-hidden relative shadow-inner">
                        {profileForm.qrCodeUrl ? (
                          <img
                            src={profileForm.qrCodeUrl}
                            alt="QR Preview"
                            className="w-full h-full object-contain p-1"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-2xl text-slate-400">💳</span>
                        )}
                        {uploadingQr && (
                          <div className="absolute inset-0 bg-white/90 flex items-center justify-center text-[10px] text-primary font-bold animate-pulse">
                            Uploading...
                          </div>
                        )}
                      </div>
                      <label className="w-full px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-primary rounded-lg text-[11px] font-bold text-center cursor-pointer transition-all border border-blue-200">
                        <span>{uploadingQr ? '⏳ अपलोड हो रहा...' : profileForm.qrCodeUrl ? '🔄 QR बदलें' : '📤 QR अपलोड करें'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleQrUpload}
                          className="hidden"
                        />
                      </label>
                      {profileForm.qrCodeUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileForm({ ...profileForm, qrCodeUrl: '' })}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-bold underline"
                        >
                          हटाएं (Remove)
                        </button>
                      )}
                    </div>

                  </div>
                </div>

                {/* BASIC INFO FIELDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'कंपनी / फर्म का नाम' : 'Company / Brand Name'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.company || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'सॉफ्टवेयर स्वामी का नाम' : 'Owner / Developer Name'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'ऑफिशियल ईमेल' : 'Official Support Email'}
                    </label>
                    <input
                      type="email"
                      value={profileForm.email || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'हेल्पलाइन / मोबाइल नंबर' : 'Helpline Mobile Number'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.phone || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'सॉफ्टवेयर संस्करण' : 'Software Version Tag'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.version || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, version: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'सहायता समय' : 'Support Working Hours'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.supportHours || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, supportHours: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {isHindi ? 'डेवलपर UPI ID' : 'Developer Payment UPI ID'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. username@okhdfcbank"
                      value={profileForm.upiId || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, upiId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {isHindi ? 'कार्यालय का पता' : 'Office Address'}
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.address || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {profileForm.updatedAt ? `Last saved: ${new Date(profileForm.updatedAt).toLocaleString()}` : ''}
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingProfile || uploadingLogo || uploadingAvatar || uploadingQr}
                    className="px-6 py-3 bg-primary hover:bg-primary-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>{isHindi ? 'सहेजा जा रहा है...' : 'Saving to Supabase...'}</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>{isHindi ? 'प्रोफाइल एवं फोटो सहेजें' : 'Save Profile & Assets to Supabase'}</span>
                      </>
                    )}
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
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-96 relative">
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder={isHindi ? 'पंचायत, सचिव या मोबाइल द्वारा खोजें...' : 'Search Panchayat, Secretary...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-700 rounded-xl"
                >
                  <option value="ALL">All Accounts ({adminList.length})</option>
                  <option value="ACTIVE">Active Accounts</option>
                </select>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary-700 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>🏛️+</span>
                  <span>{isHindi ? 'नया पंचायत खाता जोड़ें' : 'Add Panchayat Account'}</span>
                </button>
              </div>
            </div>

            {/* USERS TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-blue-50/70 text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5">Panchayat Name</th>
                      <th className="px-4 py-3.5">Secretary / Officer</th>
                      <th className="px-4 py-3.5">Contact</th>
                      <th className="px-4 py-3.5">Block & District</th>
                      <th className="px-4 py-3.5">Subscription</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
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
                          <tr key={adm.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="px-4 py-3.5 font-black text-slate-900">
                              🏛️ {adm.gramPanchayat}
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-slate-900">{adm.name}</p>
                              <p className="text-[10px] text-slate-500">{adm.designation}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-mono font-bold text-primary">{adm.mobile}</p>
                              <p className="text-[10px] text-slate-500">{adm.email || 'N/A'}</p>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {adm.block || 'Main'}, {adm.district || 'District'}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${
                                sub?.status === 'SUBSCRIBED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {sub?.status || 'UNSUBSCRIBED'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right space-x-2">
                              <button
                                onClick={() => setEditingAdmin(adm)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-primary font-bold text-[11px] rounded-lg border border-blue-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAdmin(adm.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-bold text-[11px] rounded-lg border border-rose-200"
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
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-emerald-800 uppercase">Active Subscribed</p>
                  <p className="text-2xl font-black text-emerald-950">{subscribedCount}</p>
                </div>
                <span className="text-2xl">💳</span>
              </div>
              <div className="p-4 bg-rose-50/80 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-rose-800 uppercase">Unsubscribed</p>
                  <p className="text-2xl font-black text-rose-950">{unsubscribedCount}</p>
                </div>
                <span className="text-2xl">🚫</span>
              </div>
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-amber-800 uppercase">Trial / Expired</p>
                  <p className="text-2xl font-black text-amber-950">{trialCount}</p>
                </div>
                <span className="text-2xl">⏳</span>
              </div>
            </div>

            {/* DEVELOPER SUBSCRIPTION PLAN CREATOR & TOGGLE CONTROL */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <span>👑</span>
                    <span>{isHindi ? 'सदस्यता प्लान निर्माता एवं ऑन/ऑफ टॉगल नियंत्रण' : 'Subscription Plans & On/Off Toggle Control'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {isHindi
                      ? 'डेवलपर द्वारा प्लान बनाएँ, राशि एवं अवधि तय करें, तथा On/Off बटन से प्लान चालू अथवा बंद करें'
                      : 'Create plans with custom amount, duration, and toggle ON/OFF active visibility for users'}
                  </p>
                </div>

                <button
                  onClick={() => setShowAddPlanModal(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary-700 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-primary"
                >
                  <span>✨</span>
                  <span>{isHindi ? 'नया प्लान जोड़ें (Add Plan)' : 'Create New Plan'}</span>
                </button>
              </div>

              {/* LIST OF CREATED SUBSCRIPTION PLANS */}
              {subscriptionPlans.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-xs font-bold text-slate-600">
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
                      className={`p-4 rounded-2xl border shadow-sm space-y-3 relative transition-all ${
                        plan.isActive
                          ? 'bg-white border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-slate-50 border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 text-sm">{plan.name}</span>
                        <span className="text-[10px] font-black font-mono text-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {plan.period}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-emerald-700">₹{plan.amount}</span>
                        <span className="text-[11px] font-medium text-slate-500">/ {plan.periodDays} days</span>
                      </div>

                      {plan.description && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 font-medium">
                          {plan.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        {/* ON / OFF TOGGLE SWITCH BUTTON */}
                        <button
                          onClick={() => handleTogglePlanActive(plan.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                            plan.isActive
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full inline-block ${plan.isActive ? 'bg-white' : 'bg-slate-400'}`} />
                          <span>{plan.isActive ? 'PLAN ON (सक्रिय)' : 'PLAN OFF (निष्क्रिय)'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingPlan(plan)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white font-bold text-[10px] rounded-lg border border-amber-200 transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-bold text-[10px] rounded-lg border border-rose-200 transition-all cursor-pointer"
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-blue-50/40">
                <h3 className="font-black text-slate-900 text-sm">
                  {isHindi ? 'ग्राम पंचायत उपयोगकर्ता सदस्यता स्थिति एवं नियंत्रण' : 'Panchayat Subscriptions Control'}
                </h3>
                <div className="flex gap-2">
                  {(['ALL', 'SUBSCRIBED', 'UNSUBSCRIBED', 'TRIAL'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setSubFilter(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-black border ${
                        subFilter === st ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-blue-50/70 text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5">Panchayat & Officer</th>
                      <th className="px-4 py-3.5">Plan Type</th>
                      <th className="px-4 py-3.5">Renewal Date</th>
                      <th className="px-4 py-3.5">Amount</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Action Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {subscriptions
                      .filter(s => subFilter === 'ALL' || s.status === subFilter)
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-black text-slate-900">🏛️ {sub.gramPanchayat}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{sub.officerName}</p>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-primary">
                            {sub.planName || `${sub.planType} PLAN`}
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 font-mono font-bold">
                            {formatDateDDMMYYYY(sub.endDate)}
                          </td>
                          <td className="px-4 py-3.5 font-black text-emerald-700">
                            ₹{sub.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${
                              sub.status === 'SUBSCRIBED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : sub.status === 'UNSUBSCRIBED'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleToggleSubscription(sub.adminId)}
                              className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer border ${
                                sub.status === 'SUBSCRIBED'
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-primary hover:bg-primary-700 text-white border-primary shadow-sm'
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
            
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {isHindi ? 'सिस्टम घोषणाएं एवं समाचार पट्टी' : 'Broadcast Announcements & Ticker'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isHindi ? 'सभी ग्राम पंचायत यूजर डैशबोर्ड पर प्रसारित होने वाली लाइव घोषणाएं' : 'Announcements broadcasted across all Gram Panchayat headers'}
                </p>
              </div>
              <button
                onClick={() => setShowAddAnnouncementModal(true)}
                className="px-4 py-2 bg-primary hover:bg-primary-700 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>📢+</span>
                <span>{isHindi ? 'नई घोषणा पोस्ट करें' : 'Post New Broadcast'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map((anc) => (
                <div key={anc.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className={`px-2.5 py-0.5 text-[9px] font-black rounded uppercase ${
                      anc.priority === 'URGENT' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}>
                      {anc.priority} PRIORITY
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">{formatDateDDMMYYYY(anc.date)}</span>
                  </div>

                  <h3 className="font-black text-slate-900 text-sm">{anc.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                    {anc.message}
                  </p>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => handleToggleAnnouncement(anc.id)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg border ${
                        anc.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {anc.isActive ? '● Live Broadcast Active' : '○ Paused'}
                    </button>

                    <button
                      onClick={() => handleDeleteAnnouncement(anc.id)}
                      className="px-2.5 py-1 text-[11px] bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-bold rounded-lg border border-rose-200"
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
            
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {isHindi ? 'ग्राम पंचायत सहायता एवं शिकायत टिकट' : 'Support Tickets & Help Queries'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isHindi ? 'ग्राम पंचायत सचिवों/अधिकारियों द्वारा प्राप्त तकनीकी एवं बिलिंग प्रश्न' : 'User queries from secretaries regarding taxes, billing, or features'}
                </p>
              </div>

              <div className="flex gap-2">
                {(['ALL', 'PENDING', 'RESOLVED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setComplaintFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-black border ${
                      complaintFilter === st ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
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
                  <div key={comp.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">🏛️ {comp.gramPanchayat}</span>
                          <span className="text-xs text-slate-500 font-bold">({comp.officerName} - {comp.mobile})</span>
                        </div>
                        <p className="text-[11px] text-primary font-bold mt-0.5">Category: {comp.category}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono font-bold">{formatDateDDMMYYYY(comp.date)}</span>
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${
                          comp.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {comp.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-black text-slate-900 text-xs">Subject: {comp.subject}</h4>
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                        {comp.description}
                      </p>
                    </div>

                    {/* DEVELOPER REPLY DISPLAY OR FORM */}
                    {comp.developerReply ? (
                      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-primary flex items-center justify-between">
                          <span>💬 Developer Resolution Reply ({developerProfile.name}):</span>
                          <span className="text-[10px] text-slate-500 font-normal">{formatDateDDMMYYYY(comp.replyDate)}</span>
                        </p>
                        <p className="text-slate-800 font-medium">{comp.developerReply}</p>
                      </div>
                    ) : (
                      <div className="pt-2">
                        {selectedComplaint?.id === comp.id ? (
                          <form onSubmit={handleReplyComplaint} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className="block text-xs font-bold text-primary">
                              Write Resolution / Answer:
                            </label>
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type solution or reply to Gram Panchayat secretary..."
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-primary"
                              required
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedComplaint(null)}
                                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm"
                              >
                                Submit & Resolve Ticket
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => { setSelectedComplaint(comp); setReplyText(''); }}
                            className="px-4 py-2 bg-primary hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">🏛️ Add New Panchayat Account</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gram Panchayat Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Gram Panchayat Bamori"
                  value={newAdmin.gramPanchayat}
                  onChange={(e) => setNewAdmin({ ...newAdmin, gramPanchayat: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Officer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Shri Chanchal Kumar"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    placeholder="10-digit mobile"
                    value={newAdmin.mobile}
                    onChange={(e) => setNewAdmin({ ...newAdmin, mobile: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Block</label>
                  <input
                    type="text"
                    placeholder="e.g. Guna"
                    value={newAdmin.block}
                    onChange={(e) => setNewAdmin({ ...newAdmin, block: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    placeholder="e.g. Guna"
                    value={newAdmin.district}
                    onChange={(e) => setNewAdmin({ ...newAdmin, district: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-700 text-white font-black rounded-xl shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">✏️ Edit Panchayat Account</h3>
              <button onClick={() => setEditingAdmin(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gram Panchayat Name</label>
                <input
                  type="text"
                  value={editingAdmin?.gramPanchayat || ''}
                  onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, gramPanchayat: e.target.value }) : null)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Officer Name</label>
                  <input
                    type="text"
                    value={editingAdmin?.name || ''}
                    onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={editingAdmin?.mobile || ''}
                    onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, mobile: e.target.value }) : null)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-700 text-white font-black rounded-xl shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">📢 Broadcast New Announcement</h3>
              <button onClick={() => setShowAddAnnouncementModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. New Financial Year Tax Settlement Notice"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority</label>
                <select
                  value={newAnnouncement.priority}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as any })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Broadcast</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Body *</label>
                <textarea
                  rows={3}
                  placeholder="Broadcast message text visible across all Gram Panchayat headers..."
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAnnouncementModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-700 text-white font-black rounded-xl shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">✨ {isHindi ? 'नया सदस्यता प्लान निर्मित करें' : 'Create New Subscription Plan'}</h3>
              <button onClick={() => setShowAddPlanModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'प्लान का नाम (Plan Name) *' : 'Plan Name *'}
                </label>
                <input
                  type="text"
                  placeholder={isHindi ? 'जैसे - वार्षिक अनलिमिटेड प्लान (Annual Plan)' : 'e.g. Annual Unlimited Plan'}
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'प्लान राशि (Amount ₹) *' : 'Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    value={newPlan.amount}
                    onChange={(e) => setNewPlan({ ...newPlan, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-black text-emerald-700 focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
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
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  >
                    <option value="MONTHLY">{isHindi ? 'मासिक (Monthly - 30 days)' : 'Monthly'}</option>
                    <option value="ANNUAL">{isHindi ? 'वार्षिक (Annual - 365 days)' : 'Annual'}</option>
                    <option value="LIFETIME">{isHindi ? 'लाइफटाइम (Lifetime Pass)' : 'Lifetime'}</option>
                    <option value="CUSTOM">{isHindi ? 'कस्टम दिन (Custom Days)' : 'Custom Days'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'वैधता कुल दिन (Total Days)' : 'Validity Period in Days'}
                </label>
                <input
                  type="number"
                  value={newPlan.periodDays}
                  onChange={(e) => setNewPlan({ ...newPlan, periodDays: Number(e.target.value) })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'प्लान विवरण (Description)' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isHindi ? 'प्लान की मुख्य विशेषताएं...' : 'Plan highlights...'}
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                />
              </div>

              {/* ACTIVE ON/OFF INITIAL TOGGLE */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">
                  {isHindi ? 'प्लान स्थिति तुरंत चालू (ON) रखें?' : 'Set Plan Active Immediately (ON)?'}
                </span>
                <button
                  type="button"
                  onClick={() => setNewPlan({ ...newPlan, isActive: !newPlan.isActive })}
                  className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer border ${
                    newPlan.isActive ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}
                >
                  {newPlan.isActive ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-700 text-white font-black rounded-xl shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-amber-700 text-base">✏️ {isHindi ? 'सदस्यता प्लान संशोधित करें (Edit Plan)' : 'Edit Subscription Plan'}</h3>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'प्लान का नाम (Plan Name) *' : 'Plan Name *'}
                </label>
                <input
                  type="text"
                  value={editingPlan?.name || ''}
                  onChange={(e) => setEditingPlan(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'प्लान राशि (Amount ₹) *' : 'Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    value={editingPlan?.amount ?? 0}
                    onChange={(e) => setEditingPlan(prev => prev ? ({ ...prev, amount: Number(e.target.value) }) : null)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-black text-emerald-700 focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'अवधि प्रकार (Period)' : 'Period Type'}
                  </label>
                  <select
                    value={editingPlan?.period || 'MONTHLY'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setEditingPlan(prev => {
                        if (!prev) return null;
                        let days = prev.periodDays;
                        if (val === 'MONTHLY') days = 30;
                        if (val === 'ANNUAL') days = 365;
                        if (val === 'LIFETIME') days = 3650;
                        return { ...prev, period: val, periodDays: days };
                      });
                    }}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  >
                    <option value="MONTHLY">{isHindi ? 'मासिक (Monthly - 30 days)' : 'Monthly'}</option>
                    <option value="ANNUAL">{isHindi ? 'वार्षिक (Annual - 365 days)' : 'Annual'}</option>
                    <option value="LIFETIME">{isHindi ? 'लाइफटाइम (Lifetime Pass)' : 'Lifetime'}</option>
                    <option value="CUSTOM">{isHindi ? 'कस्टम दिन (Custom Days)' : 'Custom Days'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'वैधता कुल दिन (Total Days)' : 'Validity Period in Days'}
                </label>
                <input
                  type="number"
                  value={editingPlan?.periodDays ?? 30}
                  onChange={(e) => setEditingPlan(prev => prev ? ({ ...prev, periodDays: Number(e.target.value) }) : null)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isHindi ? 'प्लान विवरण (Description)' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={editingPlan?.description || ''}
                  onChange={(e) => setEditingPlan(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:border-primary focus:outline-none"
                />
              </div>

              {/* ACTIVE ON/OFF TOGGLE */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">
                  {isHindi ? 'प्लान स्थिति (PLAN ON/OFF)' : 'Plan Status (ON/OFF)'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingPlan({ ...editingPlan, isActive: !editingPlan.isActive })}
                  className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer border ${
                    editingPlan.isActive ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}
                >
                  {editingPlan.isActive ? 'PLAN ON' : 'PLAN OFF'}
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-sm border border-amber-500 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in text-center text-slate-900">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl border border-rose-200">
              🗑️
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isHindi ? 'हटाने की पुष्टि करें' : 'Confirm Deletion'}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                {isHindi
                  ? `क्या आप निश्चित रूप से "${devDeleteModal.name}" को हटाना चाहते हैं?`
                  : `Are you sure you want to delete "${devDeleteModal.name}"?`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDevDeleteModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer border border-slate-200"
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
                    const linkedSubs = subscriptions.filter(s => s.adminId === aid);
                    setAdminList(prev => prev.filter(a => a.id !== aid));
                    setSubscriptions(prev => prev.filter(s => s.adminId !== aid));
                    await deleteAdminUserFromSupabase(aid);
                    for (const sub of linkedSubs) {
                      await deleteSubscriptionFromSupabase(sub.id);
                    }
                  }
                  setDevDeleteModal(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
              >
                {isHindi ? 'हाँ, हटाएं (Yes, Delete)' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL SCHEMA & STORAGE SETUP MODAL */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
            
            {/* Modal Header */}
            <div className="p-5 bg-blue-50/70 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📜</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isHindi ? 'Supabase SQL एवं स्टोरेज सेटअप स्क्रिप्ट' : 'Supabase SQL & Storage Setup Script'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {isHindi ? 'डेटाबेस टेबल एवं पब्लिक इमेज स्टोरेज बकेट तैयार करने हेतु SQL' : 'Run this script in Supabase SQL Editor to enable persistent profile and asset uploads'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <span className="font-bold">💡 How to apply:</span> Copy the SQL below, open your{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-amber-800"
                >
                  Supabase Dashboard ➔ SQL Editor
                </a>
                , paste and click <strong>Run</strong>.
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary uppercase tracking-wider text-[11px]">
                    1. Developer Profile Table & Storage Buckets SQL
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const sql = `-- ==============================================================================
-- 1. DEVELOPER PROFILE & OWNER BRANDING TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.developer_profile (
    id TEXT PRIMARY KEY DEFAULT 'master_developer',
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    version TEXT DEFAULT 'v3.0 Multi-Tenant Pro',
    support_hours TEXT,
    address TEXT,
    logo_url TEXT,
    avatar_url TEXT,
    qr_code_url TEXT,
    upi_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist on developer_profile
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS upi_id TEXT;
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.developer_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read developer_profile" ON public.developer_profile;
DROP POLICY IF EXISTS "Allow public write developer_profile" ON public.developer_profile;
CREATE POLICY "Allow public read developer_profile" ON public.developer_profile FOR SELECT USING (true);
CREATE POLICY "Allow public write developer_profile" ON public.developer_profile FOR ALL USING (true);

-- Seed initial master record
INSERT INTO public.developer_profile (id, name, company, email, phone, version, support_hours, address)
VALUES (
    'master_developer',
    'Hemlata Jatav',
    'Chanchal Net Zone',
    'chanchalnetzone2026@gmail.com',
    '911234567890',
    'v3.0 Multi-Tenant Pro',
    '09:00 AM - 08:00 PM IST',
    'Main Market Road, Sehore / Guna, Madhya Pradesh - 466001'
)
ON CONFLICT (id) DO UPDATE SET updated_at = timezone('utc'::text, now());

-- ==============================================================================
-- 2. STORAGE BUCKET & ASSET POLICIES (photos & panchayat-assets)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
    'photos', 
    'photos', 
    true, 
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
),
(
    'panchayat-assets', 
    'panchayat-assets', 
    true, 
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Access for Photos Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access for Photos Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access for Photos Bucket" ON storage.objects;

CREATE POLICY "Public Read Access for Photos Bucket" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('photos', 'panchayat-assets', 'assets', 'public'));

CREATE POLICY "Public Upload Access for Photos Bucket" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id IN ('photos', 'panchayat-assets', 'assets', 'public'));

CREATE POLICY "Public Manage Access for Photos Bucket" 
ON storage.objects FOR ALL 
USING (bucket_id IN ('photos', 'panchayat-assets', 'assets', 'public'));`;
                      navigator.clipboard.writeText(sql);
                      alert(isHindi ? '✅ SQL स्क्रिप्ट क्लिपबोर्ड पर कॉपी हो गई है!' : '✅ SQL Script copied to clipboard!');
                    }}
                    className="px-3 py-1 bg-primary hover:bg-primary-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    📋 {isHindi ? 'SQL कॉपी करें' : 'Copy SQL'}
                  </button>
                </div>

                <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-72">
{`-- ==============================================================================
-- 1. DEVELOPER PROFILE & OWNER BRANDING TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.developer_profile (
    id TEXT PRIMARY KEY DEFAULT 'master_developer',
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    version TEXT DEFAULT 'v3.0 Multi-Tenant Pro',
    support_hours TEXT,
    address TEXT,
    logo_url TEXT,
    avatar_url TEXT,
    qr_code_url TEXT,
    upi_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist on developer_profile
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS upi_id TEXT;
ALTER TABLE public.developer_profile ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.developer_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read developer_profile" ON public.developer_profile;
DROP POLICY IF EXISTS "Allow public write developer_profile" ON public.developer_profile;
CREATE POLICY "Allow public read developer_profile" ON public.developer_profile FOR SELECT USING (true);
CREATE POLICY "Allow public write developer_profile" ON public.developer_profile FOR ALL USING (true);

-- Seed initial master record
INSERT INTO public.developer_profile (id, name, company, email, phone, version, support_hours, address)
VALUES (
    'master_developer',
    'Hemlata Jatav',
    'Chanchal Net Zone',
    'chanchalnetzone2026@gmail.com',
    '911234567890',
    'v3.0 Multi-Tenant Pro',
    '09:00 AM - 08:00 PM IST',
    'Main Market Road, Sehore / Guna, Madhya Pradesh - 466001'
)
ON CONFLICT (id) DO UPDATE SET updated_at = timezone('utc'::text, now());

-- ==============================================================================
-- 2. STORAGE BUCKET & ASSET POLICIES (photos & panchayat-assets)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
    'photos', 
    'photos', 
    true, 
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
),
(
    'panchayat-assets', 
    'panchayat-assets', 
    true, 
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Access for Photos Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access for Photos Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access for Photos Bucket" ON storage.objects;

CREATE POLICY "Public Read Access for Photos Bucket" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('photos', 'panchayat-assets', 'assets', 'public'));

CREATE POLICY "Public Upload Access for Photos Bucket" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id IN ('photos', 'panchayat-assets', 'assets', 'public'));

CREATE POLICY "Public Manage Access for Photos Bucket" 
ON storage.objects FOR ALL 
USING (bucket_id IN ('photos', 'panchayat-assets', 'assets', 'public'));`}
                </pre>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                {isHindi ? 'बंद करें (Close)' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
