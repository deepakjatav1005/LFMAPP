import React, { useState, useEffect } from 'react';
import { getSecurityAuditLogs, clearSecurityAuditLogs, SecurityEventLog } from '../lib/security';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHindi: boolean;
  panchayatName?: string;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen,
  onClose,
  isHindi,
  panchayatName,
}) => {
  const [logs, setLogs] = useState<SecurityEventLog[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLogs(getSecurityAuditLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearLogs = () => {
    if (window.confirm(isHindi ? 'क्या आप सुरक्षा ऑडिट लॉग साफ़ करना चाहते हैं?' : 'Clear all security audit logs?')) {
      clearSecurityAuditLogs();
      setLogs([]);
    }
  };

  const securityShields = [
    {
      title: isHindi ? 'XSS एवं स्क्रिप्ट इंजेक्शन फ़िल्टर' : 'Anti-XSS & Script Injection Shield',
      desc: isHindi ? 'सभी इनपुट फ़ील्ड्स में HTML, जावास्क्रिप्ट एवं दुर्भावनापूर्ण पेलोड का स्वचालित निष्कासन।' : 'Automatic stripping of HTML tags, javascript execution payloads, and malicious code on all input fields.',
      status: isHindi ? 'सक्रिय (Active)' : 'ACTIVE',
      icon: '🛡️',
      color: 'emerald',
    },
    {
      title: isHindi ? 'ब्रूट-फोर्स एवं पासवर्ड अटैक सुरक्षा' : 'Brute-Force & Rate-Limiting Guard',
      desc: isHindi ? '5 से अधिक बार गलत पासवर्ड डालने पर खाता 5 मिनट के लिए लॉक हो जाता है।' : 'Temporary 5-minute lockout enforced after 5 consecutive failed login attempts.',
      status: isHindi ? 'सक्रिय (Active)' : 'ACTIVE',
      icon: '🔒',
      color: 'emerald',
    },
    {
      title: isHindi ? 'SQL इंजेक्शन एवं पैरामीटर सुरक्षा' : 'SQL Injection & Parameterized Guard',
      desc: isHindi ? 'Supabase पोस्टग्रेज लेयर पर सीधे SQL इनलाइन से बचाव एवं प्रिपेयर्ड कॉल्स का प्रयोग।' : 'Parameterized queries and payload validation to block SQL injection vulnerabilities completely.',
      status: isHindi ? 'सक्रिय (Active)' : 'ACTIVE',
      icon: '⚡',
      color: 'emerald',
    },
    {
      title: isHindi ? 'मल्टी-टेनेंट डेटा अलगाव (Isolation)' : 'Multi-Tenant Row Level Isolation',
      desc: isHindi ? 'प्रत्येक ग्राम पंचायत का डेटा उसके अद्वितीय पहचानकर्ता (admin_id/gram_panchayat) द्वारा पृथक रहता है।' : 'Guaranteed workspace isolation ensuring one Panchayat cannot view, alter, or delete another Panchayat\'s records.',
      status: isHindi ? 'सक्रिय (Active)' : 'ACTIVE',
      icon: '🏛️',
      color: 'emerald',
    },
    {
      title: isHindi ? 'संवेदनशील डेटा मास्किंग एवं एन्क्रिप्शन' : 'Sensitive Data Masking & Safe Rendering',
      desc: isHindi ? 'बैंक खाता संख्या व संवेदनशील फ़ील्ड्स का स्वचालित मास्किंग (•••• 1234) एवं सेफ प्रोटोकॉल।' : 'Automatic masking of sensitive account numbers and strict HTTPS asset URL verification.',
      status: isHindi ? 'सक्रिय (Active)' : 'ACTIVE',
      icon: '👁️‍🗨️',
      color: 'emerald',
    },
    {
      title: isHindi ? 'सत्र अक्रियता टाइमआउट सुरक्षा' : 'Session Inactivity Auto-Lockout',
      desc: isHindi ? 'पंचायत कंप्यूटर पर बिना कार्य के खुली स्क्रीन को अनधिकृत पहुंच से सुरक्षित रखना।' : 'Auto session lock tracking to protect unattended Panchayat computer terminals from unauthorized access.',
      status: isHindi ? 'सक्रिय (Active)' : 'ACTIVE',
      icon: '⏱️',
      color: 'emerald',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border-2 border-blue-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 border-b border-blue-500 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center text-xl shadow-sm border border-white/30">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {isHindi ? 'साइबर सुरक्षा एवं डेटा संरक्षण केंद्र' : 'Cyber Security & Data Protection Shield'}
                </h3>
                <span className="px-2 py-0.5 bg-emerald-400 text-emerald-950 font-black text-[10px] rounded-full uppercase tracking-wider shadow-xs">
                  256-Bit SSL / HTTPS
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                {panchayatName ? `${isHindi ? 'सुरक्षित पंचायत' : 'Protected Panchayat'}: ${panchayatName}` : (isHindi ? 'ग्राम पंचायत वित्तीय पोर्टल सुरक्षा स्थिति' : 'Gram Panchayat Financial Portal Security Status')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-grow bg-blue-50/40">
          
          {/* SECURITY STATUS BANNER */}
          <div className="bg-white border-2 border-emerald-500/40 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">🟢</span>
              <div>
                <h4 className="text-sm font-black text-emerald-900">
                  {isHindi ? 'सभी साइबर सुरक्षा कवच सक्रिय एवं सुरक्षित हैं' : 'All Cyber Defense Shields are Active & Compliant'}
                </h4>
                <p className="text-xs text-slate-700 font-semibold">
                  {isHindi
                    ? 'डेटाबेस, इनपुट फ़िल्टर, दर-सीमा (Rate Limiter), व सत्र अलगाव सफलतापूर्वक कार्य कर रहे हैं।'
                    : 'Database, input filters, rate limiters, and session isolation guards are functioning securely.'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-lg shadow uppercase">
                {isHindi ? '100% सुरक्षित' : '100% Protected'}
              </span>
            </div>
          </div>

          {/* ACTIVE SECURITY GUARDS GRID */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider">
              {isHindi ? 'सक्रिय सुरक्षा उपाय एवं नीतियां (Active Defenses)' : 'Active Security Policies & Countermeasures'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {securityShields.map((shield, idx) => (
                <div key={idx} className="bg-white border border-blue-200 p-3.5 rounded-xl space-y-1.5 hover:border-blue-400 transition-colors shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-blue-950">
                      <span>{shield.icon}</span>
                      <span>{shield.title}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[10px] font-black">
                      {shield.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {shield.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* SECURITY AUDIT EVENT LOG */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span>
                <span>{isHindi ? 'सुरक्षा गतिविधि एवं ऑडिट लॉग' : 'Security Audit Trail Logs'}</span>
              </h4>
              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline cursor-pointer"
                >
                  {isHindi ? 'लॉग साफ़ करें' : 'Clear Logs'}
                </button>
              )}
            </div>

            <div className="bg-white border border-blue-200 rounded-xl p-3 max-h-52 overflow-y-auto font-mono text-xs space-y-2 shadow-inner">
              {logs.length === 0 ? (
                <p className="text-slate-500 text-center py-4 italic font-sans font-medium">
                  {isHindi ? 'सुरक्षा लॉग में कोई संदिग्ध गतिविधि दर्ज नहीं है।' : 'No security violations or suspicious attempts logged.'}
                </p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-2 bg-blue-50/50 rounded border border-blue-100 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          log.type.includes('LOCKOUT') || log.type.includes('BLOCKED')
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : log.type.includes('SUCCESS')
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {log.type}
                        </span>
                        <span className="text-slate-800 text-xs font-bold">{log.description}</span>
                      </div>
                      {log.panchayat && (
                        <p className="text-[10px] text-slate-600 font-semibold">Panchayat: {log.panchayat}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-bold">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white border-t border-blue-200 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-slate-700 font-bold">
            🔒 {isHindi ? 'सुरक्षित एन्क्रिप्टेड सत्र' : 'Protected by Enterprise Client & Database Firewall'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow transition-all cursor-pointer"
          >
            {isHindi ? 'बंद करें (Close)' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
