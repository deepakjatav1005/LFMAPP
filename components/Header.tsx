import React from 'react';
import { Admin, Page } from '../types';

interface HeaderProps {
  admin: Admin | null;
  onLogout: () => void;
  theme: string;
  setTheme: (theme: string) => void;
  currentPage?: Page;
  setCurrentPage?: (page: Page, cashbookTab?: any) => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  isHindi: boolean;
  setIsHindi: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenAbout?: () => void;
  onOpenSupabaseGuide?: () => void;
  onSyncDatabase?: () => void;
  isSyncing?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  admin,
  onLogout,
  theme,
  setTheme,
  currentPage = Page.DASHBOARD,
  setCurrentPage,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
  isHindi,
  setIsHindi,
  onOpenAbout,
  onOpenSupabaseGuide,
  onSyncDatabase,
  isSyncing = false,
}) => {
  const navItems = [
    { id: Page.DASHBOARD, label: 'Dashboard', hindiLabel: 'डैशबोर्ड', icon: '🏠' },
    { id: Page.BENEFICIARY_MANAGEMENT, label: 'Beneficiaries', hindiLabel: 'हितग्राही', icon: '👥' },
    { id: Page.TAX_BENEFICIARY_LIST, label: 'Tax Beneficiaries', hindiLabel: 'कर लाभार्थी सूची', icon: '📋' },
    { id: Page.TAX_ISSUE_MANAGEMENT, label: 'Issue Tax', hindiLabel: 'कर मांग', icon: '🧾' },
    { id: Page.TAX_RECEIPT_MANAGEMENT, label: 'Receipts', hindiLabel: 'कर रसीद', icon: '💳' },
    { id: Page.DEMAND_NOTICE, label: 'Demand Notice', hindiLabel: 'मांग नोटिस', icon: '📜' },
    { id: Page.CASHBOOK_MANAGEMENT, label: 'Cashbook', hindiLabel: 'कैशबुक', icon: '📗' },
    { id: Page.MANAGE_OFFICE, label: 'Manage Office', hindiLabel: 'कार्यालय', icon: '🏛️' },
    { id: Page.MANAGE_TAX_RATES, label: 'Tax Rates', hindiLabel: 'कर दर', icon: '🏷️' },
    { id: Page.TAX_REPORT, label: 'Reports', hindiLabel: 'रिपोर्ट', icon: '📊' },
  ];

  return (
    <header className="bg-white shadow-sm print:hidden sticky top-0 z-30 transition-colors duration-300 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center justify-between h-full gap-2">
          {/* LEFT: BRAND LOGO & MENU TOGGLE */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Sidebar Toggle Button (Visible on both Mobile & Desktop for convenience) */}
            {admin && onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary flex items-center gap-1.5 font-bold text-xs border border-slate-300 transition-colors"
                title="Toggle Navigation Menu"
                aria-label="Toggle Navigation Menu"
              >
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d={isMobileSidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                  />
                </svg>
                <span className="uppercase text-[11px] font-black text-primary hidden sm:inline">MENU</span>
              </button>
            )}

            {/* BRAND LOGO */}
            <button
              onClick={() => setCurrentPage && setCurrentPage(Page.DASHBOARD)}
              className="flex items-center gap-2 group text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition-transform shrink-0">
                🏛️
              </div>
              <div className="hidden min-[400px]:block">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-none tracking-tight">
                  {isHindi ? 'स्थानीय वित्तीय प्रबंधन' : 'Local Fund Management'}
                </h1>
                <p className="text-[10px] font-bold text-primary tracking-wide uppercase mt-0.5">
                  {isHindi ? 'वित्तीय एवं टैक्स प्रबंधन' : 'Fund & Tax Management'}
                </p>
              </div>
            </button>
          </div>

          {/* CENTER: DESKTOP NAVIGATION MENU BAR */}
          {admin && setCurrentPage && (
            <nav className="hidden xl:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
              {navItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{isHindi ? item.hindiLabel : item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* RIGHT: LANGUAGE TOGGLE, THEME, ADMIN INFO & LOGOUT OR PUBLIC LOGIN */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* LANGUAGE TOGGLE SWITCH BUTTON */}
            <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 p-1 rounded-xl border border-slate-300 transition-colors">
              <span className="text-[11px] font-black text-slate-700 pl-1 flex items-center gap-1">
                <span>🌐</span>
                <span className="hidden min-[480px]:inline">Hindi</span>
              </span>
              <button
                type="button"
                onClick={() => setIsHindi(!isHindi)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isHindi ? 'bg-emerald-600' : 'bg-slate-400'
                }`}
                role="switch"
                aria-checked={isHindi}
                title={isHindi ? 'Hindi Mode: ON (Click to switch to English Only)' : 'Hindi Mode: OFF (Click to switch to Hindi)'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isHindi ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span
                onClick={() => setIsHindi(!isHindi)}
                className={`text-[10px] font-black px-1.5 py-0.5 rounded cursor-pointer select-none ${
                  isHindi ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isHindi ? 'ON (हिंदी)' : 'OFF (EN)'}
              </span>
            </div>

            {admin ? (
              <>
                {/* Theme Dropdown */}
                <div className="relative hidden md:block">
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-2.5 pr-7 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-slate-100 transition-colors"
                    aria-label="Select theme"
                  >
                    <option value="theme-teal">Teal Theme</option>
                    <option value="theme-indigo">Indigo Theme</option>
                    <option value="theme-emerald">Emerald Theme</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Sync Database Button */}
                {onSyncDatabase && (
                  <button
                    onClick={onSyncDatabase}
                    disabled={isSyncing}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title={isHindi ? 'डेटाबेस से रीफ्रेश / सिंक करें' : 'Sync & Refresh with Supabase'}
                  >
                    <span className={`inline-block ${isSyncing ? 'animate-spin' : ''}`}>🔄</span>
                    <span className="hidden sm:inline">{isSyncing ? (isHindi ? 'सिंक हो रहा...' : 'Syncing...') : (isHindi ? 'सिंक डेटा' : 'Sync DB')}</span>
                  </button>
                )}

                {/* Supabase Guide Button */}
                {onOpenSupabaseGuide && (
                  <button
                    onClick={onOpenSupabaseGuide}
                    className="px-2.5 py-1.5 bg-emerald-900 hover:bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-lg text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
                    title={isHindi ? 'Supabase बैकएंड सेट-अप' : 'Supabase Backend Setup'}
                  >
                    <span>⚡</span>
                    <span className="hidden sm:inline">Supabase</span>
                  </button>
                )}

                {/* About Portal Button */}
                {onOpenAbout && (
                  <button
                    onClick={onOpenAbout}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title={isHindi ? 'पोर्टल के बारे में' : 'About Portal'}
                  >
                    <span>ℹ️</span>
                    <span className="hidden sm:inline">{isHindi ? 'अबाउट' : 'About'}</span>
                  </button>
                )}

                {/* User Info */}
                <div className="text-right hidden lg:block border-l pl-3 border-slate-200">
                  <p className="text-xs font-bold text-slate-900 leading-none">{admin.name}</p>
                  <p className="text-[10px] font-semibold text-slate-600 mt-1">{admin.gramPanchayat}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{admin.block ? `${admin.block}, ` : ''}{admin.district || ''}</p>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Logout from portal"
                >
                  <span>{isHindi ? 'लॉगआउट' : 'Logout'}</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* HOME BUTTON */}
                <button
                  onClick={() => setCurrentPage && setCurrentPage(Page.DASHBOARD)}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer border ${
                    currentPage === Page.DASHBOARD
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300'
                  }`}
                  title={isHindi ? 'होम / सार्वजनिक खोज' : 'Home / Search'}
                >
                  <span>🏠</span>
                  <span className="hidden sm:inline">{isHindi ? 'होम' : 'Home'}</span>
                </button>

                {/* LOGIN BUTTON */}
                <button
                  onClick={() => setCurrentPage && setCurrentPage(Page.LOGIN)}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer border ${
                    currentPage === Page.LOGIN
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                      : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-300'
                  }`}
                  title={isHindi ? 'उपयोगकर्ता लॉगिन' : 'User Login'}
                >
                  <span>🔐</span>
                  <span>{isHindi ? 'उपयोगकर्ता लॉगिन' : 'User Login'}</span>
                </button>

                {/* REGISTER LOGIN BUTTON */}
                <button
                  onClick={() => setCurrentPage && setCurrentPage(Page.ADMIN_REGISTRATION)}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer border ${
                    currentPage === Page.ADMIN_REGISTRATION
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300'
                  }`}
                  title={isHindi ? 'लॉगिन पंजीयन' : 'Register Login'}
                >
                  <span>🏛️+</span>
                  <span className="hidden sm:inline">{isHindi ? 'लॉगिन पंजीयन' : 'Register Login'}</span>
                  <span className="sm:hidden">{isHindi ? 'पंजीयन' : 'Register'}</span>
                </button>

                {/* DEVELOPER LOGIN BUTTON */}
                <button
                  onClick={() => setCurrentPage && setCurrentPage(Page.DEVELOPER_PORTAL)}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer border ${
                    currentPage === Page.DEVELOPER_PORTAL
                      ? 'bg-cyan-600 text-white border-cyan-700 shadow-md'
                      : 'bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border-cyan-800'
                  }`}
                  title={isHindi ? 'डेवलपर लॉगिन' : 'Developer Login'}
                >
                  <span>💻</span>
                  <span className="hidden md:inline">{isHindi ? 'डेवलपर लॉगिन' : 'Developer'}</span>
                </button>

                {/* SYNC DATABASE BUTTON */}
                {onSyncDatabase && (
                  <button
                    onClick={onSyncDatabase}
                    disabled={isSyncing}
                    className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-blue-200 border border-blue-700 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title={isHindi ? 'डेटाबेस से रीफ्रेश / सिंक करें' : 'Sync & Refresh with Supabase'}
                  >
                    <span className={`inline-block ${isSyncing ? 'animate-spin' : ''}`}>🔄</span>
                    <span className="hidden sm:inline">{isSyncing ? (isHindi ? 'सिंक...' : 'Syncing...') : (isHindi ? 'सिंक' : 'Sync')}</span>
                  </button>
                )}

                {/* SUPABASE CONNECTION BUTTON */}
                {onOpenSupabaseGuide && (
                  <button
                    onClick={onOpenSupabaseGuide}
                    className="px-2.5 py-1.5 bg-emerald-950 hover:bg-slate-900 text-emerald-300 border border-emerald-700 rounded-xl font-black text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                    title={isHindi ? 'Supabase डेटाबेस सेट-अप' : 'Supabase Database Setup'}
                  >
                    <span>⚡</span>
                    <span className="hidden sm:inline">Supabase</span>
                  </button>
                )}

                {/* ABOUT BUTTON */}
                {onOpenAbout && (
                  <button
                    onClick={onOpenAbout}
                    className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1 border border-amber-500 cursor-pointer"
                    title={isHindi ? 'पोर्टल के बारे में' : 'About Portal'}
                  >
                    <span>ℹ️</span>
                    <span>{isHindi ? 'अबाउट' : 'About'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
