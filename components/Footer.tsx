
import React from 'react';
import { Page } from '../types';

interface FooterProps {
  isHindi?: boolean;
  setCurrentPage?: (page: Page) => void;
  onOpenAbout?: () => void;
}

const Footer: React.FC<FooterProps> = ({ isHindi = true, setCurrentPage, onOpenAbout }) => {
  return (
    <footer className="bg-white text-slate-800 mt-auto print:hidden border-t-2 border-blue-200 shadow-sm py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        
        {/* QUICK NAVIGATION BUTTONS (WHITE & BLUE) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/70 rounded-2xl border border-blue-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
              {isHindi ? 'पोर्टल लिंक्स' : 'Portal Quick Links'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentPage && setCurrentPage(Page.DASHBOARD)}
              className="px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-900 font-black text-xs rounded-xl transition-all border border-blue-200 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>🏠</span>
              <span>{isHindi ? 'होम' : 'Home'}</span>
            </button>

            <button
              onClick={() => setCurrentPage && setCurrentPage(Page.LOGIN)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all border border-blue-600 cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>🔐</span>
              <span>{isHindi ? 'लॉगिन' : 'Login'}</span>
            </button>

            <button
              onClick={() => setCurrentPage && setCurrentPage(Page.ADMIN_REGISTRATION)}
              className="px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-900 font-black text-xs rounded-xl transition-all border border-blue-200 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>🏛️+</span>
              <span>{isHindi ? 'पंजीयन' : 'Register'}</span>
            </button>

            <button
              onClick={() => setCurrentPage && setCurrentPage(Page.DEVELOPER_PORTAL)}
              className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-950 font-black text-xs rounded-xl transition-all border border-blue-300 cursor-pointer flex items-center gap-1.5"
            >
              <span>💻</span>
              <span>{isHindi ? 'डेवलपर पोर्टल' : 'Developer'}</span>
            </button>

            {onOpenAbout && (
              <button
                onClick={onOpenAbout}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-black text-xs rounded-xl transition-all border border-amber-300 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>ℹ️</span>
                <span>{isHindi ? 'अबाउट' : 'About'}</span>
              </button>
            )}
          </div>
        </div>

        {/* BRANDING LOGO & SOCIAL MEDIA LINKS ROW */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 p-5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl border border-blue-500 shadow-md text-white">
          
          {/* BRAND LOGO BADGE */}
          <div className="flex items-center gap-4">
            {/* CNZ CUSTOM STYLIZED VECTOR LOGO */}
            <div className="relative flex items-center shrink-0 bg-white/10 p-1.5 rounded-xl border border-white/20">
              <svg className="w-14 h-10" viewBox="0 0 120 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Network nodes line */}
                <path d="M 45 10 L 60 4 L 78 12 L 95 6" stroke="#BAE6FD" strokeWidth="2" strokeDasharray="2 2" />
                <circle cx="45" cy="10" r="3" fill="#BAE6FD" />
                <circle cx="60" cy="4" r="3" fill="#BAE6FD" />
                <circle cx="78" cy="12" r="3" fill="#BAE6FD" />
                <circle cx="95" cy="6" r="3" fill="#BAE6FD" />

                {/* C letter */}
                <path d="M 28 14 C 18 14, 10 21, 10 30 C 10 39, 18 46, 28 46 C 34 46, 38 43, 40 40" stroke="white" strokeWidth="8" strokeLinecap="round" />
                {/* Lime Dot inside C */}
                <circle cx="25" cy="30" r="5" fill="#FACC15" />

                {/* N letter */}
                <path d="M 48 46 L 48 18 L 68 46 L 68 18" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />

                {/* Z letter */}
                <path d="M 78 18 L 100 18 L 78 46 L 100 46" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* BRAND DETAILS */}
            <div>
              <p className="text-[10px] font-black tracking-widest text-sky-200 uppercase leading-none mb-1">
                DEVELOPER & OWNER BRAND
              </p>
              <h3 className="text-lg font-black text-white tracking-tight leading-none mb-1">
                CHANCHAL NET ZONE
              </h3>
              <p className="text-xs font-semibold text-blue-100">
                Hemlata Jatav • <a href="mailto:chanchalnetzone2026@gmail.com" className="text-yellow-300 hover:underline font-mono font-bold">chanchalnetzone2026@gmail.com</a>
              </p>
            </div>
          </div>

          {/* SOCIAL MEDIA ICONS ROW */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-blue-100 hidden lg:inline-block">Follow Us:</span>

            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white text-white hover:text-blue-700 border border-white/30 flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-sm cursor-pointer"
              title="Follow Chanchal Net Zone on Facebook"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white text-white hover:text-red-600 border border-white/30 flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-sm cursor-pointer"
              title="Subscribe to Chanchal Net Zone on YouTube"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/911234567890?text=Hello%20Chanchal%20Net%20Zone%20Gram%20Panchayat%20Tax%20Software"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white text-white hover:text-emerald-600 border border-white/30 flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-sm cursor-pointer"
              title="Chat on WhatsApp"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </a>

            {/* Email / Web */}
            <a
              href="mailto:chanchalnetzone2026@gmail.com"
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white text-white hover:text-amber-600 border border-white/30 flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-sm cursor-pointer"
              title="Send Email"
            >
              <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          </div>

        </div>

        {/* COPYRIGHT BOTTOM LINE */}
        <div className="border-t border-blue-100 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-700 text-xs font-semibold">
          <p>© {new Date().getFullYear()} Gram Panchayat Tax Software. Developed & Owned by <strong className="text-blue-900 font-bold">Chanchal Net Zone (Hemlata Jatav)</strong>.</p>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded text-[11px] font-mono font-black border border-blue-200">Chanchal Net Zone</span>
            <span className="text-emerald-700 font-bold">● Active Portal</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;


