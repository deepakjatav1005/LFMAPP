-- ==============================================================================
-- GRAM PANCHAYAT TAX COLLECTION APP - COMPLETE SUPABASE DATABASE & STORAGE SCHEMA
-- Execute this SQL script in your Supabase SQL Editor (https://supabase.com)
-- ==============================================================================

-- 1. ADMIN USERS / REGISTERED GRAM PANCHAYATS TABLE
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    designation TEXT NOT NULL,
    gram_panchayat TEXT NOT NULL,
    block TEXT,
    district TEXT,
    state TEXT DEFAULT 'Madhya Pradesh',
    mobile TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_mobile ON public.admin_users(mobile);
CREATE INDEX IF NOT EXISTS idx_admin_panchayat ON public.admin_users(gram_panchayat);

-- 2. FAMILIES / BENEFICIARIES TABLE
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
    is_locked BOOLEAN DEFAULT false,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure multi-tenant columns exist on families table
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS gram_panchayat TEXT;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS admin_id TEXT;

-- Indexes for fast lookup by Samagra ID, Family ID, Category, and Panchayat
CREATE INDEX IF NOT EXISTS idx_families_samagra ON public.families(samagra_id);
CREATE INDEX IF NOT EXISTS idx_families_family ON public.families(family_id);
CREATE INDEX IF NOT EXISTS idx_families_category ON public.families(category);
CREATE INDEX IF NOT EXISTS idx_families_panchayat ON public.families(gram_panchayat);

-- 3. TAX DEMANDS / ISSUED TAXES TABLE
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

-- Ensure multi-tenant columns exist on tax_demands table
ALTER TABLE public.tax_demands ADD COLUMN IF NOT EXISTS gram_panchayat TEXT;
ALTER TABLE public.tax_demands ADD COLUMN IF NOT EXISTS admin_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tax_demands_family ON public.tax_demands(family_id);
CREATE INDEX IF NOT EXISTS idx_tax_demands_status ON public.tax_demands(status);
CREATE INDEX IF NOT EXISTS idx_tax_demands_panchayat ON public.tax_demands(gram_panchayat);

-- 4. PAYMENTS / RECEIPTS TABLE
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
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure multi-tenant columns exist on tax_receipts table
ALTER TABLE public.tax_receipts ADD COLUMN IF NOT EXISTS gram_panchayat TEXT;
ALTER TABLE public.tax_receipts ADD COLUMN IF NOT EXISTS admin_id TEXT;

CREATE INDEX IF NOT EXISTS idx_receipts_family ON public.tax_receipts(family_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_no ON public.tax_receipts(receipt_no);
CREATE INDEX IF NOT EXISTS idx_receipts_panchayat ON public.tax_receipts(gram_panchayat);

-- 5. TAX BENEFICIARY LISTS TABLE
CREATE TABLE IF NOT EXISTS public.tax_beneficiary_lists (
    tax_type TEXT PRIMARY KEY,
    included_family_ids JSONB DEFAULT '[]'::jsonb,
    is_locked BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TAX RATES TABLE
CREATE TABLE IF NOT EXISTS public.tax_rates (
    tax_type TEXT PRIMARY KEY,
    rates JSONB NOT NULL DEFAULT '{"BPL":0, "APL":0, "DIVYANG":0, "OTHER":0}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. PANCHAYAT OFFICE DETAILS TABLE
CREATE TABLE IF NOT EXISTS public.office_details (
    id TEXT PRIMARY KEY DEFAULT 'main_office',
    office_name TEXT NOT NULL,
    secretary_name TEXT NOT NULL,
    sarpanch_name TEXT,
    contact_phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    block TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT,
    bank_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    logo_url TEXT,
    qr_code_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. USER SUBSCRIPTION PLANS & ACTIVE CREATED PLANS
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 499.00,
    period TEXT NOT NULL DEFAULT 'MONTHLY',
    period_days INTEGER NOT NULL DEFAULT 30,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id TEXT PRIMARY KEY,
    admin_id TEXT,
    gram_panchayat TEXT NOT NULL,
    officer_name TEXT,
    plan_name TEXT DEFAULT 'STANDARD PLAN',
    plan_type TEXT NOT NULL DEFAULT 'MONTHLY',
    amount NUMERIC(10,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'SUBSCRIBED',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subs_admin ON public.user_subscriptions(admin_id);
CREATE INDEX IF NOT EXISTS idx_subs_panchayat ON public.user_subscriptions(gram_panchayat);

-- 9. COMPLAINTS AND QUERIES TABLE
CREATE TABLE IF NOT EXISTS public.complaints_queries (
    id TEXT PRIMARY KEY,
    admin_id TEXT,
    gram_panchayat TEXT,
    officer_name TEXT,
    citizen_name TEXT,
    contact_mobile TEXT,
    mobile TEXT,
    ticket_no TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'PENDING',
    date DATE DEFAULT CURRENT_DATE,
    developer_reply TEXT,
    resolution_notes TEXT,
    reply_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_complaints_panchayat ON public.complaints_queries(gram_panchayat);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints_queries(status);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    gram_panchayat TEXT NOT NULL,
    admin_id TEXT,
    family_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'SYSTEM' CHECK (notification_type IN ('SYSTEM', 'DEMAND_NOTICE', 'PAYMENT_ALERT', 'COMPLAINT_UPDATE', 'ANNUAL_BILLING')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_panchayat ON public.notifications(gram_panchayat);
CREATE INDEX IF NOT EXISTS idx_notif_family ON public.notifications(family_id);

-- 11. CASHBOOK MANAGEMENT TABLES (ACCOUNT HEADS, VENDORS, WORKS, CASHBOOK VOUCHERS)

-- 11A. ACCOUNT HEADS (खाता मद तालिका)
CREATE TABLE IF NOT EXISTS public.account_heads (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENDITURE', 'BOTH')),
    opening_balance NUMERIC(12,2) DEFAULT 0.00,
    as_on_date DATE DEFAULT CURRENT_DATE,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_heads_panchayat ON public.account_heads(gram_panchayat);
CREATE INDEX IF NOT EXISTS idx_heads_type ON public.account_heads(type);

-- 11B. VENDORS (वेंडर / ठेकेदार तालिका)
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    mobile TEXT,
    gst_no TEXT,
    opening_balance NUMERIC(12,2) DEFAULT 0.00,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vendors_panchayat ON public.vendors(gram_panchayat);

-- 11C. WORKS (स्वीकृत निर्माण व विकास कार्य तालिका)
CREATE TABLE IF NOT EXISTS public.works (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    head_id TEXT,
    head_amount NUMERIC(12,2) DEFAULT 0.00,
    sub_head_name TEXT,
    sub_head_amount NUMERIC(12,2) DEFAULT 0.00,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_works_panchayat ON public.works(gram_panchayat);
CREATE INDEX IF NOT EXISTS idx_works_head ON public.works(head_id);

-- 11D. CASHBOOK VOUCHERS (कैशबुक वाउचर / आय-व्यय प्रविष्टि तालिका)
CREATE TABLE IF NOT EXISTS public.cashbook_vouchers (
    id TEXT PRIMARY KEY,
    voucher_no TEXT NOT NULL,
    voucher_type TEXT NOT NULL CHECK (voucher_type IN ('INCOME', 'EXPENDITURE')),
    date DATE NOT NULL,
    head_id TEXT NOT NULL,
    sub_head_name TEXT,
    amount NUMERIC(12,2) NOT NULL,
    vendor_id TEXT,
    work_id TEXT,
    payment_mode TEXT NOT NULL DEFAULT 'BANK' CHECK (payment_mode IN ('CASH', 'BANK', 'UPI', 'CHEQUE')),
    remarks TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vouchers_panchayat ON public.cashbook_vouchers(gram_panchayat);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON public.cashbook_vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON public.cashbook_vouchers(date);
CREATE INDEX IF NOT EXISTS idx_vouchers_head ON public.cashbook_vouchers(head_id);

-- 12. ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC ACCESS POLICIES
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_beneficiary_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashbook_vouchers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script to prevent "policy already exists" error
DROP POLICY IF EXISTS "Allow public read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow public write admin_users" ON public.admin_users;

DROP POLICY IF EXISTS "Allow public read families" ON public.families;
DROP POLICY IF EXISTS "Allow public insert families" ON public.families;
DROP POLICY IF EXISTS "Allow public update families" ON public.families;
DROP POLICY IF EXISTS "Allow public delete families" ON public.families;

DROP POLICY IF EXISTS "Allow public read tax_demands" ON public.tax_demands;
DROP POLICY IF EXISTS "Allow public insert tax_demands" ON public.tax_demands;
DROP POLICY IF EXISTS "Allow public update tax_demands" ON public.tax_demands;

DROP POLICY IF EXISTS "Allow public read tax_receipts" ON public.tax_receipts;
DROP POLICY IF EXISTS "Allow public insert tax_receipts" ON public.tax_receipts;

DROP POLICY IF EXISTS "Allow public read tax_beneficiary_lists" ON public.tax_beneficiary_lists;
DROP POLICY IF EXISTS "Allow public write tax_beneficiary_lists" ON public.tax_beneficiary_lists;

DROP POLICY IF EXISTS "Allow public read tax_rates" ON public.tax_rates;
DROP POLICY IF EXISTS "Allow public write tax_rates" ON public.tax_rates;

DROP POLICY IF EXISTS "Allow public read office_details" ON public.office_details;
DROP POLICY IF EXISTS "Allow public write office_details" ON public.office_details;

DROP POLICY IF EXISTS "Allow public read user_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Allow public write user_subscriptions" ON public.user_subscriptions;

DROP POLICY IF EXISTS "Allow public read complaints_queries" ON public.complaints_queries;
DROP POLICY IF EXISTS "Allow public write complaints_queries" ON public.complaints_queries;

DROP POLICY IF EXISTS "Allow public read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public write notifications" ON public.notifications;

DROP POLICY IF EXISTS "Allow public read account_heads" ON public.account_heads;
DROP POLICY IF EXISTS "Allow public write account_heads" ON public.account_heads;

DROP POLICY IF EXISTS "Allow public read vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow public write vendors" ON public.vendors;

DROP POLICY IF EXISTS "Allow public read works" ON public.works;
DROP POLICY IF EXISTS "Allow public write works" ON public.works;

DROP POLICY IF EXISTS "Allow public read cashbook_vouchers" ON public.cashbook_vouchers;
DROP POLICY IF EXISTS "Allow public write cashbook_vouchers" ON public.cashbook_vouchers;

-- Public CRUD Policies for app syncing
CREATE POLICY "Allow public read admin_users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Allow public write admin_users" ON public.admin_users FOR ALL USING (true);

CREATE POLICY "Allow public read families" ON public.families FOR SELECT USING (true);
CREATE POLICY "Allow public insert families" ON public.families FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update families" ON public.families FOR UPDATE USING (true);
CREATE POLICY "Allow public delete families" ON public.families FOR DELETE USING (true);

CREATE POLICY "Allow public read tax_demands" ON public.tax_demands FOR SELECT USING (true);
CREATE POLICY "Allow public insert tax_demands" ON public.tax_demands FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update tax_demands" ON public.tax_demands FOR UPDATE USING (true);

CREATE POLICY "Allow public read tax_receipts" ON public.tax_receipts FOR SELECT USING (true);
CREATE POLICY "Allow public insert tax_receipts" ON public.tax_receipts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read tax_beneficiary_lists" ON public.tax_beneficiary_lists FOR SELECT USING (true);
CREATE POLICY "Allow public write tax_beneficiary_lists" ON public.tax_beneficiary_lists FOR ALL USING (true);

CREATE POLICY "Allow public read tax_rates" ON public.tax_rates FOR SELECT USING (true);
CREATE POLICY "Allow public write tax_rates" ON public.tax_rates FOR ALL USING (true);

CREATE POLICY "Allow public read office_details" ON public.office_details FOR SELECT USING (true);
CREATE POLICY "Allow public write office_details" ON public.office_details FOR ALL USING (true);

CREATE POLICY "Allow public read user_subscriptions" ON public.user_subscriptions FOR SELECT USING (true);
CREATE POLICY "Allow public write user_subscriptions" ON public.user_subscriptions FOR ALL USING (true);

CREATE POLICY "Allow public read subscription_plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Allow public write subscription_plans" ON public.subscription_plans FOR ALL USING (true);

CREATE POLICY "Allow public read complaints_queries" ON public.complaints_queries FOR SELECT USING (true);
CREATE POLICY "Allow public write complaints_queries" ON public.complaints_queries FOR ALL USING (true);

CREATE POLICY "Allow public read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public write notifications" ON public.notifications FOR ALL USING (true);

CREATE POLICY "Allow public read account_heads" ON public.account_heads FOR SELECT USING (true);
CREATE POLICY "Allow public write account_heads" ON public.account_heads FOR ALL USING (true);

CREATE POLICY "Allow public read vendors" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Allow public write vendors" ON public.vendors FOR ALL USING (true);

CREATE POLICY "Allow public read works" ON public.works FOR SELECT USING (true);
CREATE POLICY "Allow public write works" ON public.works FOR ALL USING (true);

CREATE POLICY "Allow public read cashbook_vouchers" ON public.cashbook_vouchers FOR SELECT USING (true);
CREATE POLICY "Allow public write cashbook_vouchers" ON public.cashbook_vouchers FOR ALL USING (true);

-- ==============================================================================
-- 8B. BOOKING RENT (3.7 - बुकिंग एवं किराया वाउचर)
-- ==============================================================================
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
CREATE INDEX IF NOT EXISTS idx_booking_rents_dates ON public.booking_rents(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_booking_rents_panchayat ON public.booking_rents(gram_panchayat);

ALTER TABLE public.booking_rents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read booking_rents" ON public.booking_rents FOR SELECT USING (true);
CREATE POLICY "Allow public write booking_rents" ON public.booking_rents FOR ALL USING (true);

-- ==============================================================================
-- 8C. BUILDING PERMISSION & TAX (3.8 - भवन निर्माण अनुमति एवं कर)
-- ==============================================================================
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
CREATE POLICY "Allow public read building_permissions" ON public.building_permissions FOR SELECT USING (true);
CREATE POLICY "Allow public write building_permissions" ON public.building_permissions FOR ALL USING (true);

-- 15. OTHER TAX RECEIPTS (3.11 अन्य कर रसीद प्रबंधन तालिका)
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

-- ==============================================================================
-- 8. BUSINESS / SHOP REGISTRATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.business_registrations (
    id TEXT PRIMARY KEY,
    certificate_no TEXT,
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
    shop_address TEXT NOT NULL,
    address TEXT,
    shop_area_sq_ft NUMERIC(10,2) DEFAULT 0,
    area_sq_ft NUMERIC(10,2) DEFAULT 0,
    shop_total_cost NUMERIC(12,2),
    annual_tax_rate NUMERIC(10,2),
    gst_number TEXT,
    photo_url TEXT,
    registration_date DATE DEFAULT CURRENT_DATE,
    valid_upto DATE,
    status TEXT DEFAULT 'ACTIVE',
    remarks TEXT,
    gram_panchayat TEXT,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_biz_reg_gram_panchayat ON public.business_registrations(gram_panchayat);
CREATE INDEX IF NOT EXISTS idx_biz_reg_certificate ON public.business_registrations(certificate_no);
CREATE INDEX IF NOT EXISTS idx_biz_reg_family ON public.business_registrations(family_id);

ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read business_registrations" ON public.business_registrations;
DROP POLICY IF EXISTS "Allow public write business_registrations" ON public.business_registrations;
CREATE POLICY "Allow public read business_registrations" ON public.business_registrations FOR SELECT USING (true);
CREATE POLICY "Allow public write business_registrations" ON public.business_registrations FOR ALL USING (true);

-- ==============================================================================
-- 9. SUPABASE STORAGE BUCKET CREATION & POLICIES
-- Recommended Bucket Names: `photos` and `panchayat-assets`
-- Used for: Business Photos, Office Logo, QR Code Images, Developer Logo, Avatars, Demand Notices, and Payment Receipts
-- ==============================================================================

-- Create Storage Buckets ('photos' and 'panchayat-assets')
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
    'photos', 
    'photos', 
    true, 
    10485760, -- 10 MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
),
(
    'panchayat-assets', 
    'panchayat-assets', 
    true, 
    10485760, -- 10 MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Public Policies for Read, Upload, Update, and Delete
DROP POLICY IF EXISTS "Public Read Access for Photos Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access for Photos Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access for Photos Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access for Panchayat Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access for Panchayat Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Access for Panchayat Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to all photos and assets" ON storage.objects;

CREATE POLICY "Public Read Access for Photos Bucket" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('photos', 'panchayat-assets', 'assets', 'public'));

CREATE POLICY "Public Upload Access for Photos Bucket" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id IN ('photos', 'panchayat-assets', 'assets', 'public'));

CREATE POLICY "Public Manage Access for Photos Bucket" 
ON storage.objects FOR ALL 
USING (bucket_id IN ('photos', 'panchayat-assets', 'assets', 'public'));

-- ==============================================================================
-- 10. DEVELOPER PROFILE & OWNER BRANDING TABLE
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

-- Seed default master developer profile record if none exists
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
ON CONFLICT (id) DO UPDATE SET 
    updated_at = timezone('utc'::text, now());



