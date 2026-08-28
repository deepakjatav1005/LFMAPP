import React, { useState } from 'react';
import { Page, CashbookTab } from '../types';

interface FlappedSidebarProps {
  currentPage: Page;
  activeCashbookTab?: CashbookTab;
  setCurrentPage: (page: Page, cashbookTab?: CashbookTab) => void;
  onLogout: () => void;
  beneficiaryCount?: number;
  pendingTaxesCount?: number;
  receiptsCount?: number;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  isHindi?: boolean;
}

export const FlappedSidebar: React.FC<FlappedSidebarProps> = ({
  currentPage,
  activeCashbookTab,
  setCurrentPage,
  onLogout,
  beneficiaryCount = 0,
  pendingTaxesCount = 0,
  receiptsCount = 0,
  isMobileOpen = false,
  setIsMobileOpen,
  isHindi = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  
  // Accordion state for Tax and Cashbook submenus
  const [taxSubmenuOpen, setTaxSubmenuOpen] = useState(true);
  const [cashbookSubmenuOpen, setCashbookSubmenuOpen] = useState(true);

  const expanded = isHovered || isPinned || isMobileOpen;

  const handleCloseMobile = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const handleNav = (page: Page, cashbookTab?: CashbookTab) => {
    setCurrentPage(page, cashbookTab);
    handleCloseMobile();
  };

  // Helper to check if current page belongs to Tax Management subpages
  const isTaxPage = [
    Page.MANAGE_TAX_RATES,
    Page.BENEFICIARY_MANAGEMENT,
    Page.TAX_BENEFICIARY_LIST,
    Page.TAX_ISSUE_MANAGEMENT,
    Page.TAX_RECEIPT_MANAGEMENT,
    Page.DEMAND_NOTICE,
    Page.BOOKING_RENT,
    Page.BUILDING_PERMISSION,
    Page.TAX_REPORT,
    Page.MEMBER_CARD,
    Page.OTHER_TAX,
    Page.BUSINESS_REGISTRATION,
  ].includes(currentPage);

  const isCashbookPage = currentPage === Page.CASHBOOK_MANAGEMENT;

  return (
    <>
      {/* Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 transition-opacity cursor-pointer"
          onClick={handleCloseMobile}
          title="Click to close menu"
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-16 bottom-0 z-50 bg-white border-r border-slate-200 shadow-2xl transition-all duration-300 ease-in-out print:hidden flex flex-col justify-between ${
          expanded ? 'w-72' : 'w-16'
        } ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* SIDEBAR HEADER / TOGGLE */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between min-h-[52px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 font-bold shadow-sm">
              🏛️
            </div>
            {expanded && (
              <div className="truncate">
                <p className="text-xs font-black text-slate-900 tracking-wide uppercase">MAIN MENU</p>
                <p className="text-[10px] font-bold text-primary truncate">
                  {isHindi ? 'ग्राम पंचायत पोर्टल मेनू' : 'Navigation Menu'}
                </p>
              </div>
            )}
          </div>

          {/* Close Button when menu drawer is opened */}
          {expanded && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-lg text-xs transition-colors hidden lg:block ${
                  isPinned ? 'bg-primary text-white font-bold' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
                title={isPinned ? 'Unpin Sidebar' : 'Pin Sidebar Open'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              {isMobileOpen && (
                <button
                  onClick={handleCloseMobile}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
                  title="Close Menu (बंद करें)"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* MENU ITEMS LIST (EXACT 7 STRUCTURED SECTIONS) */}
        <div className="flex-1 py-3 px-2 space-y-1.5 overflow-y-auto custom-scrollbar">
          
          {/* ITEM 1: MAIN PAGE (मुख्य पृष्ठ) */}
          <button
            onClick={() => handleNav(Page.DASHBOARD)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
              currentPage === Page.DASHBOARD
                ? 'bg-primary text-white font-extrabold shadow-md shadow-primary/20'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-lg">🏠</span>
              {expanded && (
                <div className="truncate">
                  <p className="text-xs font-bold tracking-tight uppercase truncate">
                    1- {isHindi ? 'मुख्य पृष्ठ' : 'Main Page'}
                  </p>
                  <p className={`text-[10px] truncate ${currentPage === Page.DASHBOARD ? 'text-primary-100 font-medium' : 'text-slate-400'}`}>
                    {isHindi ? 'डैशबोर्ड एवं समग्र सारांश' : 'Dashboard & Overview'}
                  </p>
                </div>
              )}
            </div>
          </button>

          {/* ITEM 2: OFFICE MANAGEMENT (कार्यालय प्रबंधन) */}
          <button
            onClick={() => handleNav(Page.MANAGE_OFFICE)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
              currentPage === Page.MANAGE_OFFICE
                ? 'bg-primary text-white font-extrabold shadow-md shadow-primary/20'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-lg">🏢</span>
              {expanded && (
                <div className="truncate">
                  <p className="text-xs font-bold tracking-tight uppercase truncate">
                    2- {isHindi ? 'कार्यालय प्रबंधन' : 'Office Management'}
                  </p>
                  <p className={`text-[10px] truncate ${currentPage === Page.MANAGE_OFFICE ? 'text-primary-100 font-medium' : 'text-slate-400'}`}>
                    {isHindi ? 'बैंक खाता, प्रतीक चिह्न व बारकोड' : 'Office Logo, Bank & Barcode'}
                  </p>
                </div>
              )}
            </div>
          </button>

          {/* ITEM 3: TAX MANAGEMENT WITH SUBMENU (कर प्रबंधन - सब मेनू) */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 overflow-hidden">
            <button
              onClick={() => {
                setTaxSubmenuOpen(!taxSubmenuOpen);
                if (!isTaxPage) handleNav(Page.BENEFICIARY_MANAGEMENT);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-all duration-200 font-bold ${
                isTaxPage ? 'bg-primary text-white shadow-sm' : 'text-slate-900 hover:bg-blue-100/70'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 text-lg">🏛️</span>
                {expanded && (
                  <div className="truncate">
                    <p className="text-xs font-black tracking-tight uppercase truncate">
                      3- {isHindi ? 'कर प्रबंधन' : 'Tax Management'}
                    </p>
                    <p className={`text-[10px] truncate ${isTaxPage ? 'text-blue-100 font-medium' : 'text-blue-700'}`}>
                      {isHindi ? 'कर दर, हितग्राही, मांग व रसीद' : 'Rates, Taxpayers, Bills & Receipts'}
                    </p>
                  </div>
                )}
              </div>
              {expanded && (
                <span className="text-xs shrink-0 ml-1 opacity-80">
                  {taxSubmenuOpen ? '▲' : '▼'}
                </span>
              )}
            </button>

            {/* SUBMENU 3.1 - 3.12 */}
            {(expanded && taxSubmenuOpen) && (
              <div className="py-1.5 pl-6 pr-1.5 space-y-1 bg-white/90 border-t border-blue-100">
                {/* 3.1 Tax Rate Management */}
                <button
                  onClick={() => handleNav(Page.MANAGE_TAX_RATES)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.MANAGE_TAX_RATES
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.1- {isHindi ? 'कर दर प्रबंधन' : 'Tax Rate Management'}</span>
                </button>

                {/* 3.2 Beneficiary Management */}
                <button
                  onClick={() => handleNav(Page.BENEFICIARY_MANAGEMENT)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.BENEFICIARY_MANAGEMENT
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.2- {isHindi ? 'हितग्राही प्रबंधन' : 'Beneficiary Management'}</span>
                  {beneficiaryCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-100 text-primary-900 text-[10px] font-black rounded-full">
                      {beneficiaryCount}
                    </span>
                  )}
                </button>

                {/* 3.3 Tax Beneficiary List */}
                <button
                  onClick={() => handleNav(Page.TAX_BENEFICIARY_LIST)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.TAX_BENEFICIARY_LIST
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.3- {isHindi ? 'कर हितग्राही सूची' : 'Tax Beneficiary List'}</span>
                </button>

                {/* 3.4 Tax Demand */}
                <button
                  onClick={() => handleNav(Page.TAX_ISSUE_MANAGEMENT)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.TAX_ISSUE_MANAGEMENT
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.4- {isHindi ? 'कर मांग जारी' : 'Tax Demand'}</span>
                  {pendingTaxesCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[10px] font-black rounded-full">
                      {pendingTaxesCount}
                    </span>
                  )}
                </button>

                {/* 3.5 Tax Receipts */}
                <button
                  onClick={() => handleNav(Page.TAX_RECEIPT_MANAGEMENT)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.TAX_RECEIPT_MANAGEMENT
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.5- {isHindi ? 'कर रसीद संग्रह' : 'Tax Receipts'}</span>
                  {receiptsCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-200 text-blue-900 text-[10px] font-black rounded-full">
                      {receiptsCount}
                    </span>
                  )}
                </button>

                {/* 3.6 Tax Demand Notice */}
                <button
                  onClick={() => handleNav(Page.DEMAND_NOTICE)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.DEMAND_NOTICE
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.6- {isHindi ? 'मांग सूचना पत्र' : 'Tax Demand Notice'}</span>
                </button>

                {/* 3.7 Booking Rent Option */}
                <button
                  onClick={() => handleNav(Page.BOOKING_RENT)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.BOOKING_RENT
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.7- {isHindi ? 'बुकिंग / किराया वाउचर' : 'Booking & Rent'}</span>
                </button>

                {/* 3.8 Building Permission & Tax Option */}
                <button
                  onClick={() => handleNav(Page.BUILDING_PERMISSION)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.BUILDING_PERMISSION
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.8- {isHindi ? 'भवन निर्माण अनुमति एवं कर' : 'Building Permission & Tax'}</span>
                </button>

                {/* 3.9 Tax Report */}
                <button
                  onClick={() => handleNav(Page.TAX_REPORT)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.TAX_REPORT
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.9- {isHindi ? 'कर रिपोर्ट एवं सारांश' : 'Tax Report & Summary'}</span>
                </button>

                {/* 3.10 Member Card Option */}
                <button
                  onClick={() => handleNav(Page.MEMBER_CARD)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.MEMBER_CARD
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.10- {isHindi ? 'सदस्य पहचान पत्र (कार्ड)' : 'Member ID Card'}</span>
                  <span className="text-xs">🪪</span>
                </button>

                {/* 3.11 Other Tax Option */}
                <button
                  onClick={() => handleNav(Page.OTHER_TAX)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.OTHER_TAX
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.11- {isHindi ? 'अन्य कर (Other Tax)' : 'Other Tax'}</span>
                  <span className="text-xs">📜</span>
                </button>

                {/* 3.12 Commercial Shop & Business Registration Option */}
                <button
                  onClick={() => handleNav(Page.BUSINESS_REGISTRATION)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    currentPage === Page.BUSINESS_REGISTRATION
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">3.12- {isHindi ? 'दुकान व संस्थान पंजीयन' : 'Shop & Business Reg.'}</span>
                  <span className="text-xs">🏪</span>
                </button>
              </div>
            )}
          </div>

          {/* ITEM 4: CASHBOOK MANAGEMENT WITH SUBMENU (कैशबुक प्रबंधन - सब मेनू) */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 overflow-hidden">
            <button
              onClick={() => {
                setCashbookSubmenuOpen(!cashbookSubmenuOpen);
                if (!isCashbookPage) handleNav(Page.CASHBOOK_MANAGEMENT, CashbookTab.CASHBOOK_REPORT);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-all duration-200 font-bold ${
                isCashbookPage ? 'bg-primary text-white shadow-sm' : 'text-slate-900 hover:bg-blue-100/70'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 text-lg">📗</span>
                {expanded && (
                  <div className="truncate">
                    <p className="text-xs font-black tracking-tight uppercase truncate">
                      4- {isHindi ? 'कैशबुक प्रबंधन' : 'Cashbook Management'}
                    </p>
                    <p className={`text-[10px] truncate ${isCashbookPage ? 'text-blue-100 font-medium' : 'text-blue-700'}`}>
                      {isHindi ? 'खाता शीर्षक, वेंडर, वाउचर व रोकड़ बही' : 'Account Heads, Vendors & Cashbook'}
                    </p>
                  </div>
                )}
              </div>
              {expanded && (
                <span className="text-xs shrink-0 ml-1 opacity-80">
                  {cashbookSubmenuOpen ? '▲' : '▼'}
                </span>
              )}
            </button>

            {/* SUBMENU 4.1 - 4.8 */}
            {(expanded && cashbookSubmenuOpen) && (
              <div className="py-1.5 pl-6 pr-1.5 space-y-1 bg-white/90 border-t border-blue-100">
                {/* 4.1 Account Head Creation */}
                <button
                  onClick={() => handleNav(Page.CASHBOOK_MANAGEMENT, CashbookTab.ACCOUNT_HEADS)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    isCashbookPage && activeCashbookTab === CashbookTab.ACCOUNT_HEADS
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">4.1- {isHindi ? 'खाता शीर्षक निर्माण' : 'Account Head Creation'}</span>
                </button>

                {/* 4.2 Vendor Management */}
                <button
                  onClick={() => handleNav(Page.CASHBOOK_MANAGEMENT, CashbookTab.VENDORS)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    isCashbookPage && activeCashbookTab === CashbookTab.VENDORS
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">4.2- {isHindi ? 'वेंडर प्रबंधन' : 'Vendor Management'}</span>
                </button>

                {/* 4.3 Work Management */}
                <button
                  onClick={() => handleNav(Page.CASHBOOK_MANAGEMENT, CashbookTab.WORKS)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    isCashbookPage && activeCashbookTab === CashbookTab.WORKS
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">4.3- {isHindi ? 'कार्य प्रबंधन' : 'Work Management'}</span>
                </button>

                {/* 4.4 Income Voucher Management */}
                <button
                  onClick={() => handleNav(Page.CASHBOOK_MANAGEMENT, CashbookTab.INCOME_VOUCHERS)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    isCashbookPage && activeCashbookTab === CashbookTab.INCOME_VOUCHERS
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">4.4- {isHindi ? 'आय वाउचर प्रविष्टि' : 'Income Voucher'}</span>
                </button>

                {/* 4.5 Expenditure Voucher */}
                <button
                  onClick={() => handleNav(Page.CASHBOOK_MANAGEMENT, CashbookTab.EXPENDITURE_VOUCHERS)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    isCashbookPage && activeCashbookTab === CashbookTab.EXPENDITURE_VOUCHERS
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">4.5- {isHindi ? 'व्यय वाउचर प्रविष्टि' : 'Expenditure Voucher'}</span>
                </button>

                {/* 4.6 Ledger Report */}
                <button
                  onClick={() => handleNav(Page.CASHBOOK_MANAGEMENT, CashbookTab.LEDGER_REPORT)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    isCashbookPage && activeCashbookTab === CashbookTab.LEDGER_REPORT
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">4.6- {isHindi ? 'खाता बही लेजर' : 'Ledger Report'}</span>
                </button>

                {/* 4.7 Cashbook Report */}
                <button
                  onClick={() => handleNav(Page.CASHBOOK_MANAGEMENT, CashbookTab.CASHBOOK_REPORT)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    isCashbookPage && activeCashbookTab === CashbookTab.CASHBOOK_REPORT
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">4.7- {isHindi ? 'रोकड़ बही रिपोर्ट' : 'Cashbook Report'}</span>
                </button>

                {/* 4.8 Work Expenditure Report */}
                <button
                  onClick={() => handleNav(Page.CASHBOOK_MANAGEMENT, CashbookTab.WORK_EXPENDITURE_REPORT)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                    isCashbookPage && activeCashbookTab === CashbookTab.WORK_EXPENDITURE_REPORT
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-primary-800'
                  }`}
                >
                  <span className="truncate">4.8- {isHindi ? 'कार्य व्यय व अभिसरण रिपोर्ट' : 'Work Expenditure Report'}</span>
                </button>
              </div>
            )}
          </div>

          {/* ITEM 5: COMPLAINT AND SUGGESTION (शिकायत एवं सुझाव) */}
          <button
            onClick={() => handleNav(Page.COMPLAINTS_SUGGESTIONS)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
              currentPage === Page.COMPLAINTS_SUGGESTIONS
                ? 'bg-primary text-white font-extrabold shadow-md shadow-primary/20'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-lg">💬</span>
              {expanded && (
                <div className="truncate">
                  <p className="text-xs font-bold tracking-tight uppercase truncate">
                    5- {isHindi ? 'शिकायत एवं सुझाव' : 'Complaint & Suggestion'}
                  </p>
                  <p className={`text-[10px] truncate ${currentPage === Page.COMPLAINTS_SUGGESTIONS ? 'text-primary-100 font-medium' : 'text-slate-400'}`}>
                    {isHindi ? 'तकनीकी सहायता एवं सुझाव' : 'Helpdesk & Support'}
                  </p>
                </div>
              )}
            </div>
          </button>

          {/* ITEM 6: MEMBERSHIP AND PLAN (सदस्यता एवं प्लान) */}
          <button
            onClick={() => handleNav(Page.SUBSCRIPTIONS)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
              currentPage === Page.SUBSCRIPTIONS
                ? 'bg-primary text-white font-extrabold shadow-md shadow-primary/20'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-lg">📜</span>
              {expanded && (
                <div className="truncate">
                  <p className="text-xs font-bold tracking-tight uppercase truncate">
                    6- {isHindi ? 'सदस्यता एवं प्लान' : 'Membership & Plan'}
                  </p>
                  <p className={`text-[10px] truncate ${currentPage === Page.SUBSCRIPTIONS ? 'text-primary-100 font-medium' : 'text-slate-400'}`}>
                    {isHindi ? 'सदस्यता प्लान व वैधता' : 'Active Plan & Renewal'}
                  </p>
                </div>
              )}
            </div>
          </button>

          {/* ITEM 7: PROFILE MANAGEMENT (प्रोफाइल प्रबंधन) */}
          <button
            onClick={() => handleNav(Page.MANAGE_PROFILE)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
              currentPage === Page.MANAGE_PROFILE
                ? 'bg-primary text-white font-extrabold shadow-md shadow-primary/20'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-lg">👤</span>
              {expanded && (
                <div className="truncate">
                  <p className="text-xs font-bold tracking-tight uppercase truncate">
                    7- {isHindi ? 'प्रोफाइल प्रबंधन' : 'Profile Management'}
                  </p>
                  <p className={`text-[10px] truncate ${currentPage === Page.MANAGE_PROFILE ? 'text-primary-100 font-medium' : 'text-slate-400'}`}>
                    {isHindi ? 'सचिव एवं सरपंच विवरण' : 'Secretary & Admin Profile'}
                  </p>
                </div>
              )}
            </div>
          </button>

        </div>

        {/* LOGOUT AT BOTTOM */}
        <div className="p-2 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => {
              onLogout();
              handleCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-all group relative ${
              !expanded ? 'justify-center' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {expanded && (
                <div>
                  <p className="text-xs font-black uppercase">
                    {isHindi ? 'लॉगआउट' : 'LOGOUT'}
                  </p>
                  <p className="text-[10px] font-bold text-red-400">
                    {isHindi ? 'पोर्टल से बाहर निकलें' : 'Exit Portal'}
                  </p>
                </div>
              )}
            </div>

            {!expanded && (
              <div className="hidden lg:block absolute left-full ml-3 px-3 py-1.5 bg-red-900 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                {isHindi ? 'लॉगआउट' : 'LOGOUT'}
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default FlappedSidebar;
