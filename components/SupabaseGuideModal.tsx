import React, { useState } from 'react';
import { checkIsConfigured, setSupabaseCredentials } from '../lib/supabase';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHindi: boolean;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({
  isOpen,
  onClose,
  isHindi,
}) => {
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [inputUrl, setInputUrl] = useState(() => localStorage.getItem('custom_supabase_url') || '');
  const [inputKey, setInputKey] = useState(() => localStorage.getItem('custom_supabase_anon_key') || '');
  const [connectMsg, setConnectMsg] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const isConnected = checkIsConfigured();

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) {
      setConnectMsg({
        text: isHindi ? 'कृपया Supabase URL तथा Anon Key दोनों दर्ज करें' : 'Please enter both Supabase URL and Anon Key',
        isError: true,
      });
      return;
    }

    const success = setSupabaseCredentials(inputUrl.trim(), inputKey.trim());
    if (success) {
      setConnectMsg({
        text: isHindi ? '🎉 Supabase डेटाबेस सफलतापूर्वक कनेक्ट हो गया है!' : '🎉 Supabase database connected successfully!',
        isError: false,
      });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      setConnectMsg({
        text: isHindi ? '❌ अमान्य URL या Key format! URL "https://" से शुरू होना चाहिए।' : '❌ Invalid URL or Key format! URL must start with "https://".',
        isError: true,
      });
    }
  };

  const envSample = `VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-supabase-anon-key`;

  const sqlDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([
      `-- ==============================================================================
-- GRAM PANCHAYAT TAX COLLECTION & CASHBOOK - SUPABASE FULL DATABASE SCHEMA
-- Execute this SQL script in your Supabase SQL Editor (https://supabase.com)
-- ==============================================================================

-- 1. FAMILIES / TAXPAYERS
CREATE TABLE IF NOT EXISTS public.families (
    id TEXT PRIMARY KEY,
    samagra_id TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    guardian_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('BPL', 'APL', 'DIVYANG', 'OTHER')),
    member_count INTEGER DEFAULT 1,
    ward_no TEXT NOT NULL,
    muhalla TEXT NOT NULL,
    address TEXT,
    is_locked BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TAX DEMAND BILLS
CREATE TABLE IF NOT EXISTS public.tax_demands (
    id TEXT PRIMARY KEY,
    bill_no TEXT,
    family_id TEXT NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    tax_type TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE,
    category TEXT CHECK (category IN ('BPL', 'APL', 'DIVYANG', 'OTHER')),
    status TEXT DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'PAID', 'PARTIAL')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TAX PAYMENT RECEIPTS
CREATE TABLE IF NOT EXISTS public.tax_receipts (
    id TEXT PRIMARY KEY,
    receipt_no TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    tax_id TEXT,
    tax_type TEXT,
    payment_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('CASH', 'UPI', 'ONLINE', 'CHEQUE', 'NET_BANKING')),
    transaction_id TEXT,
    remarks TEXT,
    month INTEGER,
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CASHBOOK ACCOUNT HEADS
CREATE TABLE IF NOT EXISTS public.account_heads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    type TEXT DEFAULT 'BOTH' CHECK (type IN ('INCOME', 'EXPENDITURE', 'BOTH')),
    opening_balance NUMERIC(12,2) DEFAULT 0,
    as_on_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CASHBOOK VENDORS
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    firm_name TEXT,
    mobile TEXT,
    gstin TEXT,
    bank_name TEXT,
    account_no TEXT,
    ifsc TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CASHBOOK WORKS / PROJECTS
CREATE TABLE IF NOT EXISTS public.works (
    id TEXT PRIMARY KEY,
    work_code TEXT UNIQUE,
    name TEXT NOT NULL,
    sanctioned_amount NUMERIC(12,2) DEFAULT 0,
    financial_year TEXT,
    status TEXT DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CASHBOOK VOUCHERS (INCOME & EXPENDITURE)
CREATE TABLE IF NOT EXISTS public.cashbook_vouchers (
    id TEXT PRIMARY KEY,
    voucher_no TEXT NOT NULL,
    voucher_type TEXT NOT NULL CHECK (voucher_type IN ('INCOME', 'EXPENDITURE')),
    date DATE NOT NULL,
    head_id TEXT,
    head_name TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    mode TEXT DEFAULT 'CASH',
    vendor_id TEXT,
    vendor_name TEXT,
    work_id TEXT,
    work_name TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. PANCHAYAT OFFICE DETAILS
CREATE TABLE IF NOT EXISTS public.office_details (
    id TEXT PRIMARY KEY DEFAULT 'primary_office',
    panchayat_name TEXT NOT NULL,
    block_name TEXT NOT NULL,
    district_name TEXT NOT NULL,
    state_name TEXT DEFAULT 'Madhya Pradesh',
    pincode TEXT,
    sarpanch_name TEXT,
    secretary_name TEXT,
    office_mobile TEXT,
    office_email TEXT,
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- DISABLE RLS FOR EASY DIRECT SYNC (OR ENABLE WITH ALL-ALLOW POLICIES)
ALTER TABLE public.families DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_demands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_heads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.works DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashbook_vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_details DISABLE ROW LEVEL SECURITY;
`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'supabase_schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyEnvToClipboard = () => {
    navigator.clipboard.writeText(envSample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 border-t-4 border-emerald-600 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {isHindi ? 'Supabase बैकएंड एकीकरण गाइड' : 'Supabase Backend Integration Guide'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isHindi
                  ? 'ग्राम पंचायत कर सॉफ्टवेयर हेतु सुपेबेस डेटाबेस इंटीग्रेशन सेट-अप निर्देश'
                  : 'Setup instructions for connecting Supabase PostgreSQL backend'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* STATUS CARD */}
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          isConnected
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <span className="text-2xl">{isConnected ? '✅' : '⚠️'}</span>
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider">
              {isConnected
                ? (isHindi ? 'Supabase डेटाबेस कनेक्शन सक्रिय है' : 'Supabase Client Connected & Ready')
                : (isHindi ? 'Supabase कनेक्शन अपेक्षित है' : 'Supabase Credentials Required')}
            </h4>
            <p className="text-xs mt-0.5">
              {isConnected
                ? (isHindi ? 'ऐप सीधे Supabase डेटाबेस में डेटा सेव कर रहा है।' : 'App is configured to save directly into Supabase PostgreSQL cloud database.')
                : (isHindi ? 'नीचे अपनी Supabase Project URL तथा Anon Key दर्ज करें अथवा `.env` फ़ाइल सेट करें:' : 'Enter your Supabase Project URL & Anon Key below to link database immediately:')}
            </p>
          </div>
        </div>

        {/* DIRECT SUPABASE CONNECTION FORM */}
        <form onSubmit={handleConnect} className="p-4 bg-slate-900 text-white rounded-xl space-y-3 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔌</span>
              <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-wider">
                {isHindi ? 'सीधा Supabase कनेक्शन (Quick Connect)' : 'Instant Supabase Database Connection'}
              </h4>
            </div>
            {isConnected && (
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/40">
                ACTIVE
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Supabase Anon Public Key
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="eyJhY2... (Anon Key)"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {connectMsg && (
            <div className={`p-2 rounded text-xs font-bold ${connectMsg.isError ? 'bg-rose-950/80 text-rose-300 border border-rose-800' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'}`}>
              {connectMsg.text}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{isHindi ? 'Supabase डेटाबेस से कनेक्ट करें' : 'Connect Supabase Database'}</span>
            </button>
          </div>
        </form>

        {/* STEP 1: CREATE SUPABASE PROJECT */}
        <div className="space-y-2">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
            <span>{isHindi ? 'प्रोजेक्ट बनाएं (Create Supabase Project)' : 'Create Supabase Project'}</span>
          </h4>
          <p className="text-xs text-slate-600 pl-6">
            {isHindi
              ? 'Supabase (https://supabase.com) पर निःशुल्क खाता खोलें तथा नया प्रोजेक्ट बनाएं।'
              : 'Sign up or log in at https://supabase.com and create a new project.'}
          </p>
        </div>

        {/* STEP 2: SQL SCHEMA RUN */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
              <span>{isHindi ? 'डेटाबेस टेबल बनाएं (Run SQL Schema)' : 'Run Database SQL Schema'}</span>
            </h4>
            <button
              onClick={sqlDownload}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>📥</span>
              <span>{isHindi ? 'SQL फ़ाइल डाउनलोड' : 'Download supabase_schema.sql'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-600 pl-6">
            {isHindi
              ? 'Supabase डैशबोर्ड के SQL Editor में जाएं और डाउनलोड की गई `supabase_schema.sql` स्क्रिप्ट को चलाएं।'
              : 'Go to Supabase SQL Editor and run the downloaded `supabase_schema.sql` script.'}
          </p>
        </div>

        {/* STEP 3: ENV VARIABLES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px]">3</span>
              <span>{isHindi ? 'वातावरण कुंजियाँ सेट करें (.env Variables)' : 'Configure Environment Variables'}</span>
            </h4>
            <button
              onClick={copyEnvToClipboard}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {copiedEnv ? '✓ Copied!' : 'Copy .env snippet'}
            </button>
          </div>
          <p className="text-xs text-slate-600 pl-6">
            {isHindi
              ? 'प्रोजेक्ट की Settings > API से प्रोजेक्ट URL तथा Anon Key प्राप्त करके `.env` फ़ाइल में दर्ज करें:'
              : 'Copy Project URL and anon public key from Supabase Settings > API into your `.env` file:'}
          </p>

          <pre className="mx-6 p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800">
            {envSample}
          </pre>
        </div>

        {/* FOOTER */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            {isHindi ? 'समझ गया (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
