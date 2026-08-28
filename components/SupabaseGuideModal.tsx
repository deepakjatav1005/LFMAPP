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
  const [copiedFullSql, setCopiedFullSql] = useState(false);
  const [copiedOtherTaxSql, setCopiedOtherTaxSql] = useState(false);
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

  const otherTaxSqlScript = `-- ==============================================================================
-- SQL TO CREATE 'other_tax_receipts', 'booking_rents', & 'building_permissions'
-- Execute in Supabase SQL Editor (https://supabase.com -> SQL Editor -> Run)
-- ==============================================================================

-- 1. OTHER TAX RECEIPTS TABLE (3.11 अन्य कर रसीद प्रबंधन)
CREATE TABLE IF NOT EXISTS public.other_tax_receipts (
    id TEXT PRIMARY KEY,
    receipt_no TEXT UNIQUE NOT NULL,
    family_id TEXT,
    beneficiary_name TEXT NOT NULL,
    guardian_name TEXT,
    mobile TEXT,
    ward_no TEXT,
    muhalla TEXT,
    samagra_id TEXT,
    family_samagra_id TEXT,
    category TEXT DEFAULT 'APL',
    tax_head TEXT NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    receipt_date DATE DEFAULT CURRENT_DATE,
    payment_mode TEXT NOT NULL DEFAULT 'CASH',
    transaction_id TEXT,
    collector_name TEXT,
    remarks TEXT,
    cashbook_voucher_id TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_other_tax_receipt_no ON public.other_tax_receipts(receipt_no);
CREATE INDEX IF NOT EXISTS idx_other_tax_family ON public.other_tax_receipts(family_id);
CREATE INDEX IF NOT EXISTS idx_other_tax_panchayat ON public.other_tax_receipts(gram_panchayat);
ALTER TABLE public.other_tax_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read other_tax_receipts" ON public.other_tax_receipts;
DROP POLICY IF EXISTS "Allow public write other_tax_receipts" ON public.other_tax_receipts;
CREATE POLICY "Allow public read other_tax_receipts" ON public.other_tax_receipts FOR SELECT USING (true);
CREATE POLICY "Allow public write other_tax_receipts" ON public.other_tax_receipts FOR ALL USING (true);

-- 2. BOOKING & RENT TABLE (3.7 भवन / परिसर बुकिंग एवं किराया)
CREATE TABLE IF NOT EXISTS public.booking_rents (
    id TEXT PRIMARY KEY,
    voucher_no TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    beneficiary_name TEXT NOT NULL,
    guardian_name TEXT,
    mobile TEXT,
    ward_no TEXT,
    samagra_id TEXT,
    facility_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    start_date DATE NOT NULL,
    start_time TEXT,
    end_date DATE NOT NULL,
    end_time TEXT,
    charge_amount NUMERIC(10,2) NOT NULL,
    security_deposit NUMERIC(10,2),
    payment_mode TEXT NOT NULL DEFAULT 'CASH',
    transaction_id TEXT,
    remarks TEXT,
    cashbook_voucher_id TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_booking_rents_family ON public.booking_rents(family_id);
CREATE INDEX IF NOT EXISTS idx_booking_rents_panchayat ON public.booking_rents(gram_panchayat);
ALTER TABLE public.booking_rents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read booking_rents" ON public.booking_rents;
DROP POLICY IF EXISTS "Allow public write booking_rents" ON public.booking_rents;
CREATE POLICY "Allow public read booking_rents" ON public.booking_rents FOR SELECT USING (true);
CREATE POLICY "Allow public write booking_rents" ON public.booking_rents FOR ALL USING (true);

-- 3. BUILDING PERMISSION & TAX TABLE (3.8 भवन निर्माण अनुमति एवं कर)
CREATE TABLE IF NOT EXISTS public.building_permissions (
    id TEXT PRIMARY KEY,
    voucher_no TEXT UNIQUE NOT NULL,
    permission_no TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    beneficiary_name TEXT NOT NULL,
    guardian_name TEXT,
    mobile TEXT,
    ward_no TEXT,
    samagra_id TEXT,
    plot_no TEXT,
    location_address TEXT,
    construction_type TEXT,
    total_floors TEXT,
    area_sq_ft NUMERIC(10,2) NOT NULL,
    rate_per_sq_ft NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL,
    sanitation_fee NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'CASH',
    transaction_id TEXT,
    valid_upto DATE,
    remarks TEXT,
    cashbook_voucher_id TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_building_perm_family ON public.building_permissions(family_id);
CREATE INDEX IF NOT EXISTS idx_building_perm_panchayat ON public.building_permissions(gram_panchayat);
ALTER TABLE public.building_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read building_permissions" ON public.building_permissions;
DROP POLICY IF EXISTS "Allow public write building_permissions" ON public.building_permissions;
CREATE POLICY "Allow public read building_permissions" ON public.building_permissions FOR SELECT USING (true);
CREATE POLICY "Allow public write building_permissions" ON public.building_permissions FOR ALL USING (true);`;

  const fullSchemaSql = `-- ==============================================================================
-- GRAM PANCHAYAT TAX COLLECTION & CASHBOOK - COMPLETE DATABASE SCHEMA
-- Execute in Supabase SQL Editor (https://supabase.com -> SQL Editor -> Run)
-- ==============================================================================

-- 1. ADMIN USERS / GRAM PANCHAYAT USER REGISTRATION
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    gram_panchayat TEXT NOT NULL,
    block TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT DEFAULT 'Madhya Pradesh',
    role TEXT NOT NULL DEFAULT 'USER_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'USER_ADMIN')),
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow public write admin_users" ON public.admin_users;
CREATE POLICY "Allow public read admin_users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Allow public write admin_users" ON public.admin_users FOR ALL USING (true);

-- 2. FAMILIES / TAXPAYERS
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
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read families" ON public.families;
DROP POLICY IF EXISTS "Allow public write families" ON public.families;
CREATE POLICY "Allow public read families" ON public.families FOR SELECT USING (true);
CREATE POLICY "Allow public write families" ON public.families FOR ALL USING (true);

-- 3. TAX DEMAND BILLS
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
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tax_demands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read tax_demands" ON public.tax_demands;
DROP POLICY IF EXISTS "Allow public write tax_demands" ON public.tax_demands;
CREATE POLICY "Allow public read tax_demands" ON public.tax_demands FOR SELECT USING (true);
CREATE POLICY "Allow public write tax_demands" ON public.tax_demands FOR ALL USING (true);

-- 4. TAX PAYMENT RECEIPTS
CREATE TABLE IF NOT EXISTS public.tax_receipts (
    id TEXT PRIMARY KEY,
    receipt_no TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    tax_id TEXT,
    tax_type TEXT,
    payment_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    charged_amount NUMERIC(10,2),
    previous_dues NUMERIC(10,2),
    penalty NUMERIC(10,2),
    concession NUMERIC(10,2),
    remaining_dues NUMERIC(10,2),
    mode TEXT NOT NULL CHECK (mode IN ('CASH', 'UPI', 'ONLINE', 'CHEQUE', 'NET_BANKING')),
    transaction_id TEXT,
    remarks TEXT,
    month INTEGER,
    year INTEGER,
    charged_month INTEGER,
    charged_year INTEGER,
    charged_month_names TEXT,
    received_month INTEGER,
    received_year INTEGER,
    received_month_names TEXT,
    paid_tax_ids JSONB,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tax_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read tax_receipts" ON public.tax_receipts;
DROP POLICY IF EXISTS "Allow public write tax_receipts" ON public.tax_receipts;
CREATE POLICY "Allow public read tax_receipts" ON public.tax_receipts FOR SELECT USING (true);
CREATE POLICY "Allow public write tax_receipts" ON public.tax_receipts FOR ALL USING (true);

-- 5. CASHBOOK ACCOUNT HEADS
CREATE TABLE IF NOT EXISTS public.account_heads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    type TEXT DEFAULT 'BOTH' CHECK (type IN ('INCOME', 'EXPENDITURE', 'BOTH')),
    opening_balance NUMERIC(12,2) DEFAULT 0,
    as_on_date DATE,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.account_heads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read account_heads" ON public.account_heads;
DROP POLICY IF EXISTS "Allow public write account_heads" ON public.account_heads;
CREATE POLICY "Allow public read account_heads" ON public.account_heads FOR SELECT USING (true);
CREATE POLICY "Allow public write account_heads" ON public.account_heads FOR ALL USING (true);

-- 6. CASHBOOK VENDORS
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    firm_name TEXT,
    mobile TEXT,
    gstin TEXT,
    bank_name TEXT,
    account_no TEXT,
    ifsc TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow public write vendors" ON public.vendors;
CREATE POLICY "Allow public read vendors" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Allow public write vendors" ON public.vendors FOR ALL USING (true);

-- 7. CASHBOOK WORKS / PROJECTS
CREATE TABLE IF NOT EXISTS public.works (
    id TEXT PRIMARY KEY,
    work_code TEXT,
    name TEXT NOT NULL,
    sanctioned_amount NUMERIC(12,2) DEFAULT 0,
    financial_year TEXT,
    status TEXT DEFAULT 'IN_PROGRESS',
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read works" ON public.works;
DROP POLICY IF EXISTS "Allow public write works" ON public.works;
CREATE POLICY "Allow public read works" ON public.works FOR SELECT USING (true);
CREATE POLICY "Allow public write works" ON public.works FOR ALL USING (true);

-- 8. CASHBOOK VOUCHERS (INCOME & EXPENDITURE)
CREATE TABLE IF NOT EXISTS public.cashbook_vouchers (
    id TEXT PRIMARY KEY,
    voucher_no TEXT NOT NULL,
    voucher_type TEXT NOT NULL CHECK (voucher_type IN ('INCOME', 'EXPENDITURE')),
    date DATE NOT NULL,
    head_id TEXT,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode TEXT DEFAULT 'CASH',
    vendor_id TEXT,
    work_id TEXT,
    remarks TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.cashbook_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read cashbook_vouchers" ON public.cashbook_vouchers;
DROP POLICY IF EXISTS "Allow public write cashbook_vouchers" ON public.cashbook_vouchers;
CREATE POLICY "Allow public read cashbook_vouchers" ON public.cashbook_vouchers FOR SELECT USING (true);
CREATE POLICY "Allow public write cashbook_vouchers" ON public.cashbook_vouchers FOR ALL USING (true);

-- 9. OTHER TAX RECEIPTS (3.11 अन्य कर रसीद)
CREATE TABLE IF NOT EXISTS public.other_tax_receipts (
    id TEXT PRIMARY KEY,
    receipt_no TEXT UNIQUE NOT NULL,
    family_id TEXT,
    beneficiary_name TEXT NOT NULL,
    guardian_name TEXT,
    mobile TEXT,
    ward_no TEXT,
    muhalla TEXT,
    samagra_id TEXT,
    family_samagra_id TEXT,
    category TEXT DEFAULT 'APL',
    tax_head TEXT NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    receipt_date DATE DEFAULT CURRENT_DATE,
    payment_mode TEXT NOT NULL DEFAULT 'CASH',
    transaction_id TEXT,
    collector_name TEXT,
    remarks TEXT,
    cashbook_voucher_id TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.other_tax_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read other_tax_receipts" ON public.other_tax_receipts;
DROP POLICY IF EXISTS "Allow public write other_tax_receipts" ON public.other_tax_receipts;
CREATE POLICY "Allow public read other_tax_receipts" ON public.other_tax_receipts FOR SELECT USING (true);
CREATE POLICY "Allow public write other_tax_receipts" ON public.other_tax_receipts FOR ALL USING (true);

-- 10. BOOKING & RENTS (3.7 परिसर / भवन बुकिंग)
CREATE TABLE IF NOT EXISTS public.booking_rents (
    id TEXT PRIMARY KEY,
    voucher_no TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    beneficiary_name TEXT NOT NULL,
    guardian_name TEXT,
    mobile TEXT,
    ward_no TEXT,
    samagra_id TEXT,
    facility_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    start_date DATE NOT NULL,
    start_time TEXT,
    end_date DATE NOT NULL,
    end_time TEXT,
    charge_amount NUMERIC(10,2) NOT NULL,
    security_deposit NUMERIC(10,2),
    payment_mode TEXT NOT NULL DEFAULT 'CASH',
    transaction_id TEXT,
    remarks TEXT,
    cashbook_voucher_id TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.booking_rents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read booking_rents" ON public.booking_rents;
DROP POLICY IF EXISTS "Allow public write booking_rents" ON public.booking_rents;
CREATE POLICY "Allow public read booking_rents" ON public.booking_rents FOR SELECT USING (true);
CREATE POLICY "Allow public write booking_rents" ON public.booking_rents FOR ALL USING (true);

-- 11. BUILDING PERMISSIONS (3.8 भवन निर्माण अनुमति)
CREATE TABLE IF NOT EXISTS public.building_permissions (
    id TEXT PRIMARY KEY,
    voucher_no TEXT UNIQUE NOT NULL,
    permission_no TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    beneficiary_name TEXT NOT NULL,
    guardian_name TEXT,
    mobile TEXT,
    ward_no TEXT,
    samagra_id TEXT,
    plot_no TEXT,
    location_address TEXT,
    construction_type TEXT,
    total_floors TEXT,
    area_sq_ft NUMERIC(10,2) NOT NULL,
    rate_per_sq_ft NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL,
    sanitation_fee NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'CASH',
    transaction_id TEXT,
    valid_upto DATE,
    remarks TEXT,
    cashbook_voucher_id TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.building_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read building_permissions" ON public.building_permissions;
DROP POLICY IF EXISTS "Allow public write building_permissions" ON public.building_permissions;
CREATE POLICY "Allow public read building_permissions" ON public.building_permissions FOR SELECT USING (true);
CREATE POLICY "Allow public write building_permissions" ON public.building_permissions FOR ALL USING (true);

-- 12. OFFICE DETAILS
CREATE TABLE IF NOT EXISTS public.office_details (
    id TEXT PRIMARY KEY DEFAULT 'primary_office',
    office_name TEXT,
    panchayat_name TEXT,
    block TEXT,
    block_name TEXT,
    district TEXT,
    district_name TEXT,
    state TEXT DEFAULT 'मध्य प्रदेश',
    state_name TEXT DEFAULT 'Madhya Pradesh',
    address TEXT,
    pincode TEXT,
    sarpanch_name TEXT,
    secretary_name TEXT,
    contact_phone TEXT,
    office_mobile TEXT,
    email TEXT,
    office_email TEXT,
    bank_name TEXT,
    account_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    logo_url TEXT,
    qr_code_url TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist in case table already exists
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS office_name TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS panchayat_name TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS block TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS block_name TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS district_name TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'मध्य प्रदेश';
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS state_name TEXT DEFAULT 'Madhya Pradesh';
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS sarpanch_name TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS secretary_name TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS office_mobile TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS office_email TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS gram_panchayat TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS admin_id TEXT;
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.office_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read office_details" ON public.office_details;
DROP POLICY IF EXISTS "Allow public write office_details" ON public.office_details;
CREATE POLICY "Allow public read office_details" ON public.office_details FOR SELECT USING (true);
CREATE POLICY "Allow public write office_details" ON public.office_details FOR ALL USING (true);

-- 13. BUSINESS / COMMERCIAL SHOP REGISTRATIONS (3.12 व्यावसायिक दुकान पंजीयन)
CREATE TABLE IF NOT EXISTS public.business_registrations (
    id TEXT PRIMARY KEY,
    certificate_no TEXT UNIQUE NOT NULL,
    voucher_no TEXT,
    family_id TEXT,
    member_id TEXT,
    owner_name TEXT NOT NULL,
    beneficiary_name TEXT,
    guardian_name TEXT,
    mobile TEXT,
    ward_no TEXT DEFAULT '01',
    muhalla TEXT,
    samagra_family_id TEXT,
    samagra_member_id TEXT,
    category TEXT DEFAULT 'General',
    business_name TEXT NOT NULL,
    shop_name TEXT,
    business_type TEXT NOT NULL,
    shop_address TEXT,
    address TEXT,
    shop_area_sq_ft NUMERIC(10,2) DEFAULT 0,
    area_sq_ft NUMERIC(10,2) DEFAULT 0,
    shop_total_cost NUMERIC(12,2),
    annual_tax_rate NUMERIC(10,2),
    gst_number TEXT,
    photo_url TEXT,
    registration_date DATE DEFAULT CURRENT_DATE,
    valid_upto TEXT,
    status TEXT DEFAULT 'ACTIVE',
    remarks TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_biz_reg_no ON public.business_registrations(certificate_no);
CREATE INDEX IF NOT EXISTS idx_biz_family ON public.business_registrations(family_id);
CREATE INDEX IF NOT EXISTS idx_biz_panchayat ON public.business_registrations(gram_panchayat);

ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read business_registrations" ON public.business_registrations;
DROP POLICY IF EXISTS "Allow public write business_registrations" ON public.business_registrations;
CREATE POLICY "Allow public read business_registrations" ON public.business_registrations FOR SELECT USING (true);
CREATE POLICY "Allow public write business_registrations" ON public.business_registrations FOR ALL USING (true);

-- 14. SUPABASE STORAGE BUCKET FOR PHOTOS & RECEIPTS
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('photos', 'photos', true),
  ('panchayat-assets', 'panchayat-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access to photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload to photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update to photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete to photos" ON storage.objects;

CREATE POLICY "Public Access to photos" ON storage.objects FOR SELECT USING (bucket_id IN ('photos', 'panchayat-assets'));
CREATE POLICY "Allow Upload to photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('photos', 'panchayat-assets'));
CREATE POLICY "Allow Update to photos" ON storage.objects FOR UPDATE USING (bucket_id IN ('photos', 'panchayat-assets'));
CREATE POLICY "Allow Delete to photos" ON storage.objects FOR DELETE USING (bucket_id IN ('photos', 'panchayat-assets'));`;

  const handleDownloadFullSql = () => {
    const element = document.createElement('a');
    const file = new Blob([fullSchemaSql], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'supabase_schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadOtherTaxSql = () => {
    const element = document.createElement('a');
    const file = new Blob([otherTaxSqlScript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'create_other_tax_receipts_table.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyOtherTaxSqlToClipboard = () => {
    navigator.clipboard.writeText(otherTaxSqlScript);
    setCopiedOtherTaxSql(true);
    setTimeout(() => setCopiedOtherTaxSql(false), 2500);
  };

  const copyFullSqlToClipboard = () => {
    navigator.clipboard.writeText(fullSchemaSql);
    setCopiedFullSql(true);
    setTimeout(() => setCopiedFullSql(false), 2500);
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
        <form onSubmit={handleConnect} className="p-4 bg-blue-50/70 text-slate-900 rounded-xl space-y-3 border border-blue-200">
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔌</span>
              <h4 className="font-black text-xs text-primary uppercase tracking-wider">
                {isHindi ? 'सीधा Supabase कनेक्शन (Quick Connect)' : 'Instant Supabase Database Connection'}
              </h4>
            </div>
            {isConnected && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-300">
                ACTIVE
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-slate-900 text-xs font-mono font-semibold focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Supabase Anon Public Key
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="eyJhY2... (Anon Key)"
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-slate-900 text-xs font-mono font-semibold focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {connectMsg && (
            <div className={`p-2 rounded text-xs font-bold ${connectMsg.isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
              {connectMsg.text}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-700 text-white font-black text-xs rounded-lg shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{isHindi ? 'Supabase डेटाबेस से कनेक्ट करें' : 'Connect Supabase Database'}</span>
            </button>
          </div>
        </form>

        {/* STEP 1: CREATE SUPABASE PROJECT */}
        <div className="space-y-2">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px]">1</span>
            <span>{isHindi ? 'प्रोजेक्ट बनाएं (Create Supabase Project)' : 'Create Supabase Project'}</span>
          </h4>
          <p className="text-xs text-slate-600 pl-6">
            {isHindi
              ? 'Supabase (https://supabase.com) पर निःशुल्क खाता खोलें तथा नया प्रोजेक्ट बनाएं।'
              : 'Sign up or log in at https://supabase.com and create a new project.'}
          </p>
        </div>

        {/* STEP 2: SQL SCHEMA RUN */}
        <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px]">2</span>
              <span>{isHindi ? 'डेटाबेस तालिकाएं बनाएं (Run SQL Schema)' : 'Run Database SQL Schema'}</span>
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadOtherTaxSql}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                title="Download SQL for other_tax_receipts, booking_rents, building_permissions"
              >
                <span>⚡</span>
                <span>{isHindi ? 'नवीन तालिका SQL फ़ाइल' : 'other_tax_receipts.sql'}</span>
              </button>
              <button
                onClick={handleDownloadFullSql}
                className="px-3 py-1.5 bg-primary hover:bg-primary-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>📥</span>
                <span>{isHindi ? 'सम्पूर्ण SQL फ़ाइल' : 'supabase_schema.sql'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-600 pl-6">
            {isHindi
              ? 'यदि आपको "Could not find the table other_tax_receipts in the schema cache" त्रुटि आ रही है, तो नीचे दिए गए बटन से SQL कॉपी कर Supabase SQL Editor में चलाएं:'
              : 'If you encounter "Could not find the table other_tax_receipts in the schema cache" error, copy the SQL below and run it in Supabase SQL Editor:'}
          </p>

          {/* QUICK COPY BUTTONS */}
          <div className="pl-6 flex flex-wrap items-center gap-2">
            <button
              onClick={copyOtherTaxSqlToClipboard}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                copiedOtherTaxSql
                  ? 'bg-primary text-white border-primary shadow'
                  : 'bg-white hover:bg-blue-50 text-slate-800 border-blue-200 shadow-sm'
              }`}
            >
              <span>{copiedOtherTaxSql ? '✓' : '📋'}</span>
              <span>{copiedOtherTaxSql ? (isHindi ? 'कॉपी हो गया!' : 'Copied!') : (isHindi ? 'Copy `other_tax_receipts` SQL' : 'Copy other_tax_receipts SQL')}</span>
            </button>

            <button
              onClick={copyFullSqlToClipboard}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                copiedFullSql
                  ? 'bg-primary text-white border-primary shadow'
                  : 'bg-white hover:bg-blue-50 text-slate-800 border-blue-200 shadow-sm'
              }`}
            >
              <span>{copiedFullSql ? '✓' : '📋'}</span>
              <span>{copiedFullSql ? (isHindi ? 'कॉपी हो गया!' : 'Copied!') : (isHindi ? 'Copy Complete Schema SQL' : 'Copy Complete Schema SQL')}</span>
            </button>
          </div>
        </div>

        {/* STEP 3: ENV VARIABLES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px]">3</span>
              <span>{isHindi ? 'वातावरण कुंजियाँ सेट करें (.env Variables)' : 'Configure Environment Variables'}</span>
            </h4>
            <button
              onClick={copyEnvToClipboard}
              className="px-3 py-1 bg-primary hover:bg-primary-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {copiedEnv ? '✓ Copied!' : 'Copy .env snippet'}
            </button>
          </div>
          <p className="text-xs text-slate-600 pl-6">
            {isHindi
              ? 'प्रोजेक्ट की Settings > API से प्रोजेक्ट URL तथा Anon Key प्राप्त करके `.env` फ़ाइल में दर्ज करें:'
              : 'Copy Project URL and anon public key from Supabase Settings > API into your `.env` file:'}
          </p>

          <pre className="mx-6 p-3 bg-blue-900 text-blue-100 font-mono text-xs rounded-xl overflow-x-auto border border-blue-800">
            {envSample}
          </pre>
        </div>

        {/* FOOTER */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm"
          >
            {isHindi ? 'समझ गया (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
