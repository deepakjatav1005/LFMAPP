-- ==============================================================================
-- SQL SCRIPT: CREATE 'other_tax_receipts' & RELATED MODULE TABLES IN SUPABASE
-- Run this in your Supabase SQL Editor (https://supabase.com -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. OTHER TAX RECEIPTS TABLE (3.11 अन्य कर रसीद प्रबंधन तालिका)
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
CREATE INDEX IF NOT EXISTS idx_booking_rents_dates ON public.booking_rents(start_date, end_date);
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
CREATE POLICY "Allow public write building_permissions" ON public.building_permissions FOR ALL USING (true);
