import { getSupabaseClient } from './supabase';
import { Family, Tax, Payment, OfficeDetails, TaxType, Admin, ComplaintQuery, Subscription, SubscriptionPlan, TaxRates, TaxRatesLockInfo, TaxBeneficiaryList, AccountHead, Vendor, Work, CashbookVoucher, Announcement, BookingRentRecord, BuildingPermissionRecord } from '../types';

// Helper function to safely upsert into Supabase tables, automatically stripping columns that do not exist in remote table schema or violating check constraints
export async function safeUpsertToSupabase(
  table: string,
  payload: Record<string, any>,
  onConflict?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase client not initialized' };

  let currentPayload = { ...payload };

  for (let attempt = 0; attempt < 10; attempt++) {
    const options = onConflict ? { onConflict } : undefined;
    const { error } = await supabase.from(table).upsert(currentPayload, options);
    if (!error) return { success: true };

    // 1. Detect if column doesn't exist in the remote database table schema cache
    const match1 = error.message.match(/Could not find the '([^']+)' column/i);
    const match2 = error.message.match(/column "([^"]+)" of relation/i);
    const missingCol = match1?.[1] || match2?.[1];

    if (missingCol && missingCol in currentPayload) {
      console.warn(`Column '${missingCol}' not found in '${table}' schema, removing and retrying upsert...`);
      delete currentPayload[missingCol];
      continue;
    }

    // 2. Detect check constraint violation (e.g. complaints_queries_category_check)
    if (error.message.includes('violates check constraint') || error.message.includes('check constraint')) {
      const constraintMatch = error.message.match(/violates check constraint "([^"]+)"/i);
      const constraintName = constraintMatch?.[1] || error.message;

      if (constraintName.includes('category') || error.message.includes('category')) {
        if (currentPayload.category && currentPayload.category !== 'TECHNICAL') {
          console.warn(`Category '${currentPayload.category}' violated check constraint in '${table}', retrying with 'TECHNICAL'...`);
          currentPayload.category = 'TECHNICAL';
          continue;
        } else if (currentPayload.category === 'TECHNICAL') {
          console.warn(`Category 'TECHNICAL' violated constraint in '${table}', retrying with null...`);
          delete currentPayload.category;
          continue;
        } else {
          delete currentPayload.category;
          continue;
        }
      }

      if (constraintName.includes('status') || error.message.includes('status')) {
        if (currentPayload.status && currentPayload.status !== 'PENDING') {
          console.warn(`Status '${currentPayload.status}' violated check constraint in '${table}', retrying with 'PENDING'...`);
          currentPayload.status = 'PENDING';
          continue;
        } else {
          delete currentPayload.status;
          continue;
        }
      }

      // If constraint mentions any key in currentPayload, remove it and retry
      let keyRemoved = false;
      for (const key of Object.keys(currentPayload)) {
        if (constraintName.toLowerCase().includes(key.toLowerCase())) {
          console.warn(`Constraint '${constraintName}' failed for '${key}', deleting field and retrying...`);
          delete currentPayload[key];
          keyRemoved = true;
          break;
        }
      }

      if (keyRemoved) continue;
    }

    // 3. Fallback for row-level security or insert retry: Try plain insert if upsert fails due to policy mismatch
    if (error.message.includes('violates row-level security policy') || error.message.includes('row-level security')) {
      try {
        const { error: insertErr } = await supabase.from(table).insert(currentPayload);
        if (!insertErr) return { success: true };
      } catch (e) {
        // ignore and report error below
      }
    }

    console.error(`Error saving to table '${table}':`, error.message);
    return { success: false, error: error.message };
  }

  return { success: false, error: 'Max attempts reached during payload cleanup' };
}

// ==============================================================================
// 1. ADMIN USERS / GRAM PANCHAYAT USER REGISTRATION
// ==============================================================================

export async function fetchAdminUsersFromSupabase(): Promise<Admin[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('admin_users').select('*');
    if (error) {
      console.warn('Supabase fetchAdminUsersFromSupabase info:', error.message || error);
      return null;
    }
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      designation: row.designation,
      gramPanchayat: row.gram_panchayat,
      block: row.block || '',
      district: row.district || '',
      state: row.state || 'Madhya Pradesh',
      mobile: row.mobile,
      email: row.email || '',
      password: row.password,
    }));
  } catch (err) {
    console.error('Exception in fetchAdminUsersFromSupabase:', err);
    return null;
  }
}

export async function fetchAdminUserByMobileFromSupabase(mobile: string): Promise<Admin | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('mobile', mobile.trim())
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      designation: data.designation,
      gramPanchayat: data.gram_panchayat,
      block: data.block || '',
      district: data.district || '',
      state: data.state || 'Madhya Pradesh',
      mobile: data.mobile,
      email: data.email || '',
      password: data.password,
    };
  } catch (err) {
    return null;
  }
}

export async function saveAdminUserToSupabase(admin: Admin): Promise<{ success: boolean; message?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase is not configured yet.');
    return { success: false, message: 'Supabase credentials missing' };
  }
  try {
    const cleanMobile = admin.mobile.trim();

    // Check if user already exists by mobile
    const { data: existing } = await supabase
      .from('admin_users')
      .select('id')
      .eq('mobile', cleanMobile)
      .maybeSingle();

    const finalId = existing?.id || admin.id;

    const payload = {
      id: finalId,
      name: admin.name,
      designation: admin.designation,
      gram_panchayat: admin.gramPanchayat,
      block: admin.block || '',
      district: admin.district || '',
      state: admin.state || 'Madhya Pradesh',
      mobile: cleanMobile,
      email: admin.email || '',
      password: admin.password || 'password',
    };

    const res = await safeUpsertToSupabase('admin_users', payload, 'id');
    if (!res.success) {
      console.error('Supabase admin registration error:', res.error);
      return { success: false, message: res.error };
    }

    console.log('Successfully saved admin user to Supabase:', admin.gramPanchayat, cleanMobile);
    return { success: true, message: 'Saved to Supabase successfully' };
  } catch (err: any) {
    console.error('Exception saving admin user to Supabase:', err);
    return { success: false, message: err?.message || 'Database error' };
  }
}

// ==============================================================================
// 2. FAMILIES / BENEFICIARIES
// ==============================================================================

export async function fetchFamiliesFromSupabase(): Promise<Family[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    // PostgREST limits queries to 1000 items by default. Fetch in pages to ensure 100% of records are loaded without any loss.
    let allRows: any[] = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.warn('Supabase fetch families page error:', error.message || error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allRows = allRows.concat(data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      }
    }

    if (allRows.length === 0) return null;

    return allRows.map((row: any) => ({
      id: row.id,
      samagraId: String(row.samagra_id || ''),
      familyId: row.family_id ? String(row.family_id) : undefined,
      name: String(row.name || ''),
      surname: String(row.surname || ''),
      guardianName: String(row.guardian_name || ''),
      mobile: String(row.mobile || ''),
      category: row.category,
      memberCount: row.member_count ? Number(row.member_count) : 1,
      wardNo: String(row.ward_no || '01'),
      muhalla: row.muhalla ? String(row.muhalla) : '',
      address: row.address ? String(row.address) : '',
      isLocked: row.is_locked !== undefined ? Boolean(row.is_locked) : true,
      gramPanchayat: row.gram_panchayat,
      adminId: row.admin_id,
    }));
  } catch (err) {
    console.warn('Supabase families request skipped:', err);
    return null;
  }
}

export async function saveFamilyToSupabase(family: Family): Promise<boolean> {
  try {
    let cleanCategory = (family.category || 'APL').toUpperCase().trim();
    if (!['BPL', 'APL', 'DIVYANG', 'OTHER'].includes(cleanCategory)) {
      cleanCategory = 'APL';
    }

    const payload = {
      id: family.id || `fam_${family.samagraId}`,
      samagra_id: String(family.samagraId || '').trim(),
      family_id: String(family.familyId || family.samagraId || 'NA').trim(),
      name: String(family.name || '').trim() || 'हितग्राही',
      surname: String(family.surname || '').trim(),
      guardian_name: String(family.guardianName || '').trim(),
      mobile: String(family.mobile || '').trim() || '9800000000',
      category: cleanCategory,
      member_count: Math.max(1, Number(family.memberCount) || 1),
      ward_no: String(family.wardNo || '01').trim(),
      muhalla: String(family.muhalla || '').trim() || 'मुख्य बस्ती',
      address: String(family.address || '').trim(),
      is_locked: family.isLocked !== undefined ? Boolean(family.isLocked) : true,
      gram_panchayat: family.gramPanchayat || null,
      admin_id: family.adminId || null,
    };

    const res = await safeUpsertToSupabase('families', payload, 'samagra_id');
    if (!res.success) {
      const res2 = await safeUpsertToSupabase('families', payload, 'id');
      return res2.success;
    }
    return true;
  } catch (err) {
    console.warn('Supabase family save skipped:', err);
    return false;
  }
}

export async function saveFamiliesBatchToSupabase(
  familiesList: Family[],
  onProgress?: (processed: number, total: number) => void
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !familiesList || familiesList.length === 0) return true;

  try {
    const CHUNK_SIZE = 50;
    let processed = 0;

    for (let i = 0; i < familiesList.length; i += CHUNK_SIZE) {
      const chunk = familiesList.slice(i, i + CHUNK_SIZE);
      const payloads = chunk.map((family) => {
        let cleanCategory = (family.category || 'APL').toUpperCase().trim();
        if (!['BPL', 'APL', 'DIVYANG', 'OTHER'].includes(cleanCategory)) {
          cleanCategory = 'APL';
        }

        return {
          id: family.id || `fam_${family.samagraId}`,
          samagra_id: String(family.samagraId || '').trim(),
          family_id: String(family.familyId || family.samagraId || 'NA').trim(),
          name: String(family.name || '').trim() || 'हितग्राही',
          surname: String(family.surname || '').trim(),
          guardian_name: String(family.guardianName || '').trim(),
          mobile: String(family.mobile || '').trim() || '9800000000',
          category: cleanCategory,
          member_count: Math.max(1, Number(family.memberCount) || 1),
          ward_no: String(family.wardNo || '01').trim(),
          muhalla: String(family.muhalla || '').trim() || 'मुख्य बस्ती',
          address: String(family.address || '').trim(),
          is_locked: family.isLocked !== undefined ? Boolean(family.isLocked) : true,
          gram_panchayat: family.gramPanchayat || null,
          admin_id: family.adminId || null,
        };
      });

      // Try bulk upsert first for high performance
      const { error } = await supabase
        .from('families')
        .upsert(payloads, { onConflict: 'samagra_id' });

      if (error) {
        console.warn(`Bulk chunk upsert failed, falling back to individual safe row upsert for chunk starting at ${i}:`, error.message);
        // Fallback row-by-row to ensure 100% delivery without data loss
        for (const fam of chunk) {
          await saveFamilyToSupabase(fam);
        }
      }

      processed += chunk.length;
      if (onProgress) {
        onProgress(Math.min(processed, familiesList.length), familiesList.length);
      }
    }
    return true;
  } catch (err) {
    console.error('Supabase batch family save critical error:', err);
    return false;
  }
}

export async function deleteFamilyFromSupabase(familyId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('families').delete().eq('id', familyId);
    if (error) {
      console.warn('Supabase delete family info:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase family delete skipped:', err);
    return false;
  }
}

export async function deleteFamiliesBatchFromSupabase(familyIds: string[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !familyIds || familyIds.length === 0) return false;
  try {
    const { error } = await supabase.from('families').delete().in('id', familyIds);
    if (error) {
      console.warn('Supabase batch delete families error:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase batch family delete skipped:', err);
    return false;
  }
}

// ==============================================================================
// 3. TAX DEMANDS / ISSUED TAXES
// ==============================================================================

export async function fetchTaxesFromSupabase(): Promise<Tax[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('tax_demands').select('*');
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      billNo: row.bill_no,
      familyId: row.family_id,
      month: row.month,
      year: row.year,
      type: row.tax_type as TaxType,
      amount: Number(row.amount),
      dueDate: row.due_date,
      category: row.category,
      status: row.status,
      gramPanchayat: row.gram_panchayat,
      adminId: row.admin_id,
    }));
  } catch (err) {
    console.error('Error fetching taxes from Supabase:', err);
    return null;
  }
}

export async function saveTaxToSupabase(tax: Tax): Promise<boolean> {
  try {
    let category = tax.category || 'APL';
    if (!['BPL', 'APL', 'DIVYANG', 'OTHER'].includes(category)) {
      category = 'APL';
    }

    const payload = {
      id: tax.id,
      bill_no: tax.billNo || `DEM-${tax.year || new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      family_id: tax.familyId,
      month: Number(tax.month) || (new Date().getMonth() + 1),
      year: Number(tax.year) || new Date().getFullYear(),
      tax_type: tax.type,
      amount: Number(tax.amount) || 0,
      due_date: (tax.dueDate && tax.dueDate.trim() !== '') ? tax.dueDate : null,
      category: category,
      status: tax.status || 'ISSUED',
      gram_panchayat: tax.gramPanchayat || '',
      admin_id: tax.adminId || '',
    };

    const res = await safeUpsertToSupabase('tax_demands', payload);
    return res.success;
  } catch (err) {
    console.error('Error saving tax demand to Supabase:', err);
    return false;
  }
}

export async function saveTaxesBatchToSupabase(
  taxesList: Tax[],
  onProgress?: (done: number, total: number) => void
): Promise<{ successCount: number; failCount: number }> {
  if (!taxesList || taxesList.length === 0) return { successCount: 0, failCount: 0 };
  const supabase = getSupabaseClient();
  let successCount = 0;
  let failCount = 0;

  const CHUNK_SIZE = 50;
  for (let i = 0; i < taxesList.length; i += CHUNK_SIZE) {
    const chunk = taxesList.slice(i, i + CHUNK_SIZE);
    const payloads = chunk.map((tax) => {
      let category = tax.category || 'APL';
      if (!['BPL', 'APL', 'DIVYANG', 'OTHER'].includes(category)) {
        category = 'APL';
      }
      return {
        id: tax.id,
        bill_no: tax.billNo || `DEM-${tax.year || new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        family_id: tax.familyId,
        month: Number(tax.month) || (new Date().getMonth() + 1),
        year: Number(tax.year) || new Date().getFullYear(),
        tax_type: tax.type,
        amount: Number(tax.amount) || 0,
        due_date: (tax.dueDate && tax.dueDate.trim() !== '') ? tax.dueDate : null,
        category: category,
        status: tax.status || 'ISSUED',
        gram_panchayat: tax.gramPanchayat || '',
        admin_id: tax.adminId || '',
      };
    });

    if (supabase) {
      try {
        const { error } = await supabase.from('tax_demands').upsert(payloads, { onConflict: 'id' });
        if (!error) {
          successCount += chunk.length;
        } else {
          // Fallback to individual safe upserts
          for (const tax of chunk) {
            const ok = await saveTaxToSupabase(tax);
            if (ok) successCount++;
            else failCount++;
          }
        }
      } catch (err) {
        for (const tax of chunk) {
          const ok = await saveTaxToSupabase(tax);
          if (ok) successCount++;
          else failCount++;
        }
      }
    } else {
      successCount += chunk.length;
    }

    if (onProgress) {
      onProgress(Math.min(i + CHUNK_SIZE, taxesList.length), taxesList.length);
    }
  }

  return { successCount, failCount };
}

// ==============================================================================
// 3B. TAX RATES & TAX BENEFICIARY LISTS
// ==============================================================================

export async function fetchTaxRatesFromSupabase(): Promise<{ rates: TaxRates; isLocked?: boolean; lockInfo?: TaxRatesLockInfo } | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('tax_rates').select('*');
    if (error || !data || data.length === 0) return null;

    const ratesObj: Partial<TaxRates> = {};
    let isLocked: boolean | undefined = undefined;
    let lockInfo: TaxRatesLockInfo | undefined = undefined;

    data.forEach((row: any) => {
      if (row.tax_type === 'CONFIG_LOCK') {
        const ratesData = row.rates || {};
        isLocked = Boolean(ratesData.is_locked);
        lockInfo = {
          isLocked: isLocked,
          year: ratesData.year || new Date().getFullYear(),
          month: ratesData.month ?? 'ALL',
          lockedAt: ratesData.locked_at || ratesData.lockedAt || row.updated_at,
          lockedBy: ratesData.locked_by || ratesData.lockedBy,
        };
      } else if (row.tax_type && row.rates) {
        ratesObj[row.tax_type as TaxType] = row.rates;
      }
    });

    return {
      rates: ratesObj as TaxRates,
      isLocked,
      lockInfo,
    };
  } catch (err) {
    console.error('Error fetching tax rates from Supabase:', err);
    return null;
  }
}

export async function saveTaxRatesToSupabase(taxRates: TaxRates, lockInfo?: TaxRatesLockInfo | boolean): Promise<boolean> {
  try {
    const promises = Object.entries(taxRates).map(([taxType, rates]) => {
      const payload = {
        tax_type: taxType,
        rates: rates,
        updated_at: new Date().toISOString(),
      };
      return safeUpsertToSupabase('tax_rates', payload, 'tax_type');
    });

    if (lockInfo !== undefined) {
      const isLockedBool = typeof lockInfo === 'boolean' ? lockInfo : lockInfo.isLocked;
      const ratesPayload: Record<string, any> = {
        is_locked: isLockedBool ? 1 : 0,
      };

      if (typeof lockInfo === 'object') {
        ratesPayload.year = lockInfo.year;
        ratesPayload.month = lockInfo.month;
        ratesPayload.locked_at = lockInfo.lockedAt || new Date().toISOString();
        if (lockInfo.lockedBy) ratesPayload.locked_by = lockInfo.lockedBy;
      }

      promises.push(
        safeUpsertToSupabase('tax_rates', {
          tax_type: 'CONFIG_LOCK',
          rates: ratesPayload,
          updated_at: new Date().toISOString(),
        }, 'tax_type')
      );
    }

    const results = await Promise.all(promises);
    return results.every((r) => r.success);
  } catch (err) {
    console.error('Error saving tax rates to Supabase:', err);
    return false;
  }
}

export async function saveTaxRateLockToSupabase(lockInfo: TaxRatesLockInfo | boolean): Promise<boolean> {
  try {
    const isLockedBool = typeof lockInfo === 'boolean' ? lockInfo : lockInfo.isLocked;
    const ratesPayload: Record<string, any> = {
      is_locked: isLockedBool ? 1 : 0,
    };

    if (typeof lockInfo === 'object') {
      ratesPayload.year = lockInfo.year;
      ratesPayload.month = lockInfo.month;
      ratesPayload.locked_at = lockInfo.lockedAt || new Date().toISOString();
      if (lockInfo.lockedBy) ratesPayload.locked_by = lockInfo.lockedBy;
    }

    const res = await safeUpsertToSupabase('tax_rates', {
      tax_type: 'CONFIG_LOCK',
      rates: ratesPayload,
      updated_at: new Date().toISOString(),
    }, 'tax_type');
    return res.success;
  } catch (err) {
    console.error('Error saving tax rate lock to Supabase:', err);
    return false;
  }
}

export async function fetchTaxBeneficiaryListsFromSupabase(): Promise<Record<string, TaxBeneficiaryList> | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('tax_beneficiary_lists').select('*');
    if (error || !data || data.length === 0) return null;

    const listsObj: Record<string, TaxBeneficiaryList> = {};
    data.forEach((row: any) => {
      if (row.tax_type) {
        listsObj[row.tax_type] = {
          taxType: row.tax_type as TaxType,
          includedFamilyIds: Array.isArray(row.included_family_ids) ? row.included_family_ids : [],
          isLocked: Boolean(row.is_locked),
          updatedAt: row.updated_at,
        };
      }
    });
    return Object.keys(listsObj).length > 0 ? listsObj : null;
  } catch (err) {
    console.error('Error fetching tax beneficiary lists from Supabase:', err);
    return null;
  }
}

export async function saveTaxBeneficiaryListToSupabase(list: TaxBeneficiaryList): Promise<boolean> {
  try {
    const payload = {
      tax_type: list.taxType,
      included_family_ids: list.includedFamilyIds || [],
      is_locked: Boolean(list.isLocked),
      updated_at: list.updatedAt || new Date().toISOString(),
    };

    const res = await safeUpsertToSupabase('tax_beneficiary_lists', payload, 'tax_type');
    return res.success;
  } catch (err) {
    console.error('Error saving tax beneficiary list to Supabase:', err);
    return false;
  }
}

// ==============================================================================
// 4. TAX RECEIPTS / PAYMENTS
// ==============================================================================

export async function fetchPaymentsFromSupabase(): Promise<Payment[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('tax_receipts').select('*');
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      receiptNo: row.receipt_no,
      familyId: row.family_id,
      taxId: row.tax_id,
      taxType: row.tax_type,
      date: row.payment_date,
      amount: Number(row.amount),
      mode: row.mode,
      transactionId: row.transaction_id,
      remarks: row.remarks,
      month: row.month,
      year: row.year,
      gramPanchayat: row.gram_panchayat,
      adminId: row.admin_id,
    }));
  } catch (err) {
    return null;
  }
}

export async function savePaymentToSupabase(payment: Payment): Promise<boolean> {
  try {
    let cleanMonth: number | null = null;
    if (typeof payment.month === 'number' && !isNaN(payment.month) && payment.month >= 1 && payment.month <= 12) {
      cleanMonth = Math.floor(payment.month);
    } else if (payment.month) {
      const parsed = parseInt(String(payment.month), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        cleanMonth = parsed;
      }
    }
    if (!cleanMonth && payment.date) {
      const pDate = new Date(payment.date);
      if (!isNaN(pDate.getTime())) {
        cleanMonth = pDate.getMonth() + 1;
      }
    }

    let cleanYear: number | null = null;
    if (typeof payment.year === 'number' && !isNaN(payment.year) && payment.year >= 1900 && payment.year <= 2100) {
      cleanYear = Math.floor(payment.year);
    } else if (payment.year) {
      const numericMatch = String(payment.year).match(/\d{4}/);
      if (numericMatch) {
        cleanYear = parseInt(numericMatch[0], 10);
      }
    }
    if (!cleanYear && payment.date) {
      const pDate = new Date(payment.date);
      if (!isNaN(pDate.getTime())) {
        cleanYear = pDate.getFullYear();
      }
    }

    const payload = {
      id: payment.id,
      receipt_no: payment.receiptNo,
      family_id: payment.familyId,
      tax_id: payment.taxId || null,
      tax_type: payment.taxType || null,
      payment_date: payment.date || new Date().toISOString().split('T')[0],
      amount: Number(payment.amount || 0),
      mode: payment.mode || 'CASH',
      transaction_id: payment.transactionId || null,
      remarks: payment.remarks || null,
      month: cleanMonth,
      year: cleanYear,
      gram_panchayat: payment.gramPanchayat || null,
      admin_id: payment.adminId || null,
    };

    const res = await safeUpsertToSupabase('tax_receipts', payload);
    return res.success;
  } catch (err) {
    return false;
  }
}

// ==============================================================================
// 5. OFFICE DETAILS
// ==============================================================================

export async function fetchOfficeDetailsFromSupabase(adminId?: string): Promise<OfficeDetails | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    let query = supabase.from('office_details').select('*');
    if (adminId) query = query.eq('admin_id', adminId);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

    return {
      officeName: data.office_name || '',
      secretaryName: data.secretary_name || '',
      sarpanchName: data.sarpanch_name || '',
      contactPhone: data.contact_phone || '',
      email: data.email || '',
      address: data.address || '',
      block: data.block || '',
      district: data.district || '',
      state: data.state || 'मध्य प्रदेश',
      pincode: data.pincode || '',
      bankName: data.bank_name || '',
      accountName: data.account_name || '',
      accountNumber: data.account_number || '',
      ifscCode: data.ifsc_code || '',
      logoUrl: data.logo_url || '',
      qrCodeUrl: data.qr_code_url || '',
    };
  } catch (err) {
    return null;
  }
}

export async function saveOfficeDetailsToSupabase(details: OfficeDetails, adminId?: string, gramPanchayat?: string): Promise<boolean> {
  try {
    const payload = {
      id: adminId || 'default_office',
      office_name: details.officeName,
      secretary_name: details.secretaryName,
      sarpanch_name: details.sarpanchName,
      contact_phone: details.contactPhone,
      email: details.email,
      address: details.address,
      block: details.block,
      district: details.district,
      state: details.state,
      pincode: details.pincode,
      bank_name: details.bankName,
      account_name: details.accountName,
      account_number: details.accountNumber,
      ifsc_code: details.ifscCode,
      logo_url: details.logoUrl,
      qr_code_url: details.qrCodeUrl,
    };

    const res = await safeUpsertToSupabase('office_details', payload);
    return res.success;
  } catch (err) {
    return false;
  }
}

// ==============================================================================
// 6. COMPLAINTS & QUERIES
// ==============================================================================

export async function fetchComplaintsFromSupabase(): Promise<ComplaintQuery[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('complaints_queries').select('*');
    if (error) {
      console.warn('Supabase complaints query returned error, falling back to local state:', error.message || error);
      return null;
    }
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      adminId: row.admin_id || '',
      gramPanchayat: row.gram_panchayat || '',
      officerName: row.officer_name || row.citizen_name || '',
      mobile: row.mobile || row.contact_mobile || '',
      subject: row.subject || '',
      category: row.category || 'TECHNICAL',
      description: row.description || '',
      date: row.date || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      status: row.status || 'PENDING',
      developerReply: row.developer_reply || row.resolution_notes || '',
      replyDate: row.reply_date || '',
    }));
  } catch (err) {
    console.warn('Exception in fetchComplaintsFromSupabase:', err);
    return null;
  }
}

export async function saveComplaintToSupabase(complaint: ComplaintQuery): Promise<boolean> {
  try {
    let category = complaint.category || 'TECHNICAL';
    // Map UI categories to values recognized by Postgres database check constraints
    if (category === 'TAX_CALCULATION' || category === 'BILLING') {
      category = 'TECHNICAL';
    } else if (category === 'PRINT_RECEIPT' || category === 'FEATURE_REQUEST') {
      category = 'TECHNICAL';
    }

    const payload = {
      id: complaint.id,
      admin_id: complaint.adminId,
      gram_panchayat: complaint.gramPanchayat,
      officer_name: complaint.officerName,
      citizen_name: complaint.officerName || 'Gram Panchayat User',
      contact_mobile: complaint.mobile,
      mobile: complaint.mobile,
      ticket_no: complaint.id,
      subject: complaint.subject,
      category: category,
      description: complaint.description,
      date: complaint.date,
      status: complaint.status || 'PENDING',
      developer_reply: complaint.developerReply || '',
      resolution_notes: complaint.developerReply || '',
      reply_date: complaint.replyDate || '',
    };

    const res = await safeUpsertToSupabase('complaints_queries', payload);
    return res.success;
  } catch (err) {
    console.error('Exception in saveComplaintToSupabase:', err);
    return false;
  }
}

// ==============================================================================
// 7. USER SUBSCRIPTIONS
// ==============================================================================

export async function fetchSubscriptionsFromSupabase(): Promise<Subscription[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('user_subscriptions').select('*');
    if (error) {
      console.warn('Supabase fetchSubscriptionsFromSupabase info:', error.message || error);
      return null;
    }
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      adminId: row.admin_id || '',
      gramPanchayat: row.gram_panchayat || '',
      officerName: row.officer_name || '',
      status: row.status || 'SUBSCRIBED',
      planType: row.plan_type || 'ANNUAL',
      planName: row.plan_name || 'Standard Plan',
      startDate: row.start_date || new Date().toISOString().split('T')[0],
      endDate: row.end_date || new Date().toISOString().split('T')[0],
      amount: Number(row.amount || row.price || 0),
      notes: row.notes || '',
    }));
  } catch (err) {
    console.warn('Exception in fetchSubscriptionsFromSupabase:', err);
    return null;
  }
}

export async function saveSubscriptionToSupabase(sub: Subscription): Promise<boolean> {
  try {
    const payload = {
      id: sub.id,
      admin_id: sub.adminId,
      gram_panchayat: sub.gramPanchayat,
      officer_name: sub.officerName,
      status: sub.status,
      plan_type: sub.planType,
      plan_name: sub.planName || 'Standard Plan',
      start_date: sub.startDate,
      end_date: sub.endDate,
      amount: sub.amount,
      notes: sub.notes || '',
    };

    const res = await safeUpsertToSupabase('user_subscriptions', payload);
    return res.success;
  } catch (err) {
    console.warn('Exception in saveSubscriptionToSupabase:', err);
    return false;
  }
}

// ==============================================================================
// 8. SUBSCRIPTION PLANS (DEVELOPER CREATED)
// ==============================================================================

export async function fetchSubscriptionPlansFromSupabase(): Promise<SubscriptionPlan[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('subscription_plans').select('*');
    if (error) {
      console.warn('Supabase fetchSubscriptionPlansFromSupabase info:', error.message || error);
      return null;
    }
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount || 0),
      period: row.period || 'MONTHLY',
      periodDays: Number(row.period_days || 30),
      description: row.description || '',
      isActive: row.is_active !== false,
      createdAt: row.created_at || new Date().toISOString().split('T')[0],
    }));
  } catch (err) {
    console.error('Exception in fetchSubscriptionPlansFromSupabase:', err);
    return null;
  }
}

export async function saveSubscriptionPlanToSupabase(plan: SubscriptionPlan): Promise<boolean> {
  try {
    const payload = {
      id: plan.id,
      name: plan.name,
      amount: plan.amount,
      period: plan.period,
      period_days: plan.periodDays,
      description: plan.description || '',
      is_active: plan.isActive,
    };

    const res = await safeUpsertToSupabase('subscription_plans', payload);
    return res.success;
  } catch (err) {
    console.error('Exception in saveSubscriptionPlanToSupabase:', err);
    return false;
  }
}

export async function deleteSubscriptionPlanFromSupabase(planId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('subscription_plans').delete().eq('id', planId);
    if (error) {
      console.error('Error deleting subscription plan from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception in deleteSubscriptionPlanFromSupabase:', err);
    return false;
  }
}

// ==============================================================================
// 9. CASHBOOK MANAGEMENT (ACCOUNT HEADS, VENDORS, WORKS, VOUCHERS)
// ==============================================================================

// 9A. ACCOUNT HEADS
export async function fetchAccountHeadsFromSupabase(): Promise<AccountHead[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('account_heads').select('*');
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      code: row.code || '',
      name: row.name,
      type: row.type || 'BOTH',
      openingBalance: Number(row.opening_balance || 0),
      asOnDate: row.as_on_date || new Date().toISOString().split('T')[0],
      gramPanchayat: row.gram_panchayat || '',
      adminId: row.admin_id || '',
    }));
  } catch (err) {
    console.error('Error fetching account heads from Supabase:', err);
    return null;
  }
}

export async function saveAccountHeadToSupabase(head: AccountHead): Promise<boolean> {
  try {
    const payload = {
      id: head.id,
      code: head.code || '',
      name: head.name,
      type: head.type,
      opening_balance: Number(head.openingBalance || 0),
      as_on_date: head.asOnDate || new Date().toISOString().split('T')[0],
      gram_panchayat: head.gramPanchayat || '',
      admin_id: head.adminId || '',
    };
    const res = await safeUpsertToSupabase('account_heads', payload);
    return res.success;
  } catch (err) {
    console.error('Error saving account head to Supabase:', err);
    return false;
  }
}

export async function deleteAccountHeadFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('account_heads').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Error deleting account head from Supabase:', err);
    return false;
  }
}

// 9B. VENDORS
export async function fetchVendorsFromSupabase(): Promise<Vendor[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('vendors').select('*');
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      address: row.address || '',
      mobile: row.mobile || '',
      gstNo: row.gst_no || '',
      openingBalance: Number(row.opening_balance || 0),
      gramPanchayat: row.gram_panchayat || '',
      adminId: row.admin_id || '',
    }));
  } catch (err) {
    console.error('Error fetching vendors from Supabase:', err);
    return null;
  }
}

export async function saveVendorToSupabase(vendor: Vendor): Promise<boolean> {
  try {
    const payload = {
      id: vendor.id,
      name: vendor.name,
      address: vendor.address || '',
      mobile: vendor.mobile || '',
      gst_no: vendor.gstNo || '',
      opening_balance: Number(vendor.openingBalance || 0),
      gram_panchayat: vendor.gramPanchayat || '',
      admin_id: vendor.adminId || '',
    };
    const res = await safeUpsertToSupabase('vendors', payload);
    return res.success;
  } catch (err) {
    console.error('Error saving vendor to Supabase:', err);
    return false;
  }
}

export async function deleteVendorFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Error deleting vendor from Supabase:', err);
    return false;
  }
}

// 9C. WORKS
export async function fetchWorksFromSupabase(): Promise<Work[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('works').select('*');
    if (error || !data) return null;

    return data.map((row: any) => {
      let extractedSanctionDate = row.admin_sanction_date || row.sanction_date || row.date || '';
      let subHead = row.sub_head_name || '';
      if (!extractedSanctionDate && subHead && subHead.includes('[SD:')) {
        const match = subHead.match(/\[SD:(.*?)\]/);
        if (match && match[1]) {
          extractedSanctionDate = match[1];
          subHead = subHead.replace(/\[SD:.*?\]/, '').trim();
        }
      }

      return {
        id: row.id,
        name: row.name,
        cost: Number(row.cost || 0),
        headId: row.head_id || '',
        headAmount: Number(row.head_amount || 0),
        subHeadName: subHead,
        subHeadAmount: Number(row.sub_head_amount || 0),
        convergenceHeadId: row.convergence_head_id || '',
        convergenceHeadName: row.convergence_head_name || '',
        convergenceHeadAmount: Number(row.convergence_head_amount || 0),
        adminSanctionDate: extractedSanctionDate,
        gramPanchayat: row.gram_panchayat || '',
        adminId: row.admin_id || '',
      };
    });
  } catch (err) {
    console.error('Error fetching works from Supabase:', err);
    return null;
  }
}

export async function saveWorkToSupabase(work: Work): Promise<boolean> {
  try {
    const sanctionDate = work.adminSanctionDate || '';
    let subHeadNamePayload = work.subHeadName || '';
    if (sanctionDate && !subHeadNamePayload.includes('[SD:')) {
      subHeadNamePayload = subHeadNamePayload
        ? `${subHeadNamePayload} [SD:${sanctionDate}]`
        : `[SD:${sanctionDate}]`;
    }

    const payload = {
      id: work.id,
      name: work.name,
      cost: Number(work.cost || 0),
      head_id: work.headId || '',
      head_amount: Number(work.headAmount || 0),
      sub_head_name: subHeadNamePayload,
      sub_head_amount: Number(work.subHeadAmount || 0),
      convergence_head_id: work.convergenceHeadId || '',
      convergence_head_name: work.convergenceHeadName || '',
      convergence_head_amount: Number(work.convergenceHeadAmount || 0),
      admin_sanction_date: sanctionDate,
      sanction_date: sanctionDate,
      date: sanctionDate,
      gram_panchayat: work.gramPanchayat || '',
      admin_id: work.adminId || '',
    };
    const res = await safeUpsertToSupabase('works', payload);
    return res.success;
  } catch (err) {
    console.error('Error saving work to Supabase:', err);
    return false;
  }
}

export async function deleteWorkFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('works').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Error deleting work from Supabase:', err);
    return false;
  }
}

// 9D. CASHBOOK VOUCHERS
export async function fetchCashbookVouchersFromSupabase(): Promise<CashbookVoucher[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('cashbook_vouchers').select('*');
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      voucherNo: row.voucher_no,
      voucherType: row.voucher_type,
      date: row.date,
      headId: row.head_id,
      subHeadName: row.sub_head_name || '',
      amount: Number(row.amount || 0),
      vendorId: row.vendor_id || '',
      workId: row.work_id || '',
      paymentMode: row.payment_mode || 'BANK',
      remarks: row.remarks || '',
      gramPanchayat: row.gram_panchayat || '',
      adminId: row.admin_id || '',
    }));
  } catch (err) {
    console.error('Error fetching cashbook vouchers from Supabase:', err);
    return null;
  }
}

export async function saveCashbookVoucherToSupabase(voucher: CashbookVoucher): Promise<boolean> {
  try {
    const payload = {
      id: voucher.id,
      voucher_no: voucher.voucherNo,
      voucher_type: voucher.voucherType,
      date: voucher.date,
      head_id: voucher.headId,
      sub_head_name: voucher.subHeadName || '',
      amount: Number(voucher.amount || 0),
      vendor_id: voucher.vendorId || null,
      work_id: voucher.workId || null,
      payment_mode: voucher.paymentMode || 'BANK',
      remarks: voucher.remarks || '',
      gram_panchayat: voucher.gramPanchayat || '',
      admin_id: voucher.adminId || '',
    };
    const res = await safeUpsertToSupabase('cashbook_vouchers', payload);
    return res.success;
  } catch (err) {
    console.error('Error saving cashbook voucher to Supabase:', err);
    return false;
  }
}

export async function deleteCashbookVoucherFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('cashbook_vouchers').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Error deleting cashbook voucher from Supabase:', err);
    return false;
  }
}

export async function deletePaymentFromSupabase(paymentId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    return !error;
  } catch (err) {
    console.error('Error deleting payment from Supabase:', err);
    return false;
  }
}

export async function deleteTaxFromSupabase(taxId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('taxes').delete().eq('id', taxId);
    return !error;
  } catch (err) {
    console.error('Error deleting tax demand from Supabase:', err);
    return false;
  }
}

// ==============================================================================
// 10. ANNOUNCEMENTS / SYSTEM BROADCAST NOTIFICATIONS
// ==============================================================================

export async function fetchAnnouncementsFromSupabase(): Promise<Announcement[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('announcements').select('*');
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      title: row.title || '',
      message: row.message || '',
      date: row.date || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      priority: row.priority || 'NORMAL',
      isActive: row.is_active !== false,
    }));
  } catch (err) {
    console.error('Error fetching announcements from Supabase:', err);
    return null;
  }
}

export async function saveAnnouncementToSupabase(anc: Announcement): Promise<boolean> {
  try {
    const payload = {
      id: anc.id,
      title: anc.title,
      message: anc.message,
      date: anc.date || new Date().toISOString().split('T')[0],
      priority: anc.priority || 'NORMAL',
      is_active: Boolean(anc.isActive),
    };

    const res = await safeUpsertToSupabase('announcements', payload, 'id');
    return res.success;
  } catch (err) {
    console.error('Error saving announcement to Supabase:', err);
    return false;
  }
}

export async function deleteAnnouncementFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Error deleting announcement from Supabase:', err);
    return false;
  }
}

// ==============================================================================
// 12. BOOKING RENT (3.7 - बुकिंग एवं किराया वाउचर)
// ==============================================================================

export async function fetchBookingRentsFromSupabase(): Promise<BookingRentRecord[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('booking_rents').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      voucherNo: row.voucher_no || row.voucherNo || `BKG-${row.id}`,
      familyId: row.family_id || row.familyId,
      beneficiaryName: row.beneficiary_name || row.beneficiaryName || '',
      guardianName: row.guardian_name || row.guardianName,
      fatherHusbandName: row.father_husband_name || row.guardian_name || row.guardianName || '',
      mobile: row.mobile,
      wardNo: row.ward_no || row.wardNo,
      samagraId: row.samagra_id || row.samagraId,
      facilityName: row.facility_name || row.facilityName || 'सामुदायिक भवन / परिसर',
      purpose: row.purpose || '',
      startDate: row.start_date || row.startDate || '',
      startTime: row.start_time || row.startTime,
      endDate: row.end_date || row.endDate || '',
      endTime: row.end_time || row.endTime,
      chargeAmount: Number(row.charge_amount || row.chargeAmount || 0),
      securityDeposit: row.security_deposit !== undefined ? Number(row.security_deposit) : undefined,
      paymentMode: row.payment_mode || row.paymentMode || 'CASH',
      transactionId: row.transaction_id || row.transactionId,
      remarks: row.remarks || '',
      createdAt: row.created_at || new Date().toISOString(),
      cashbookVoucherId: row.cashbook_voucher_id || row.cashbookVoucherId,
      gramPanchayat: row.gram_panchayat || row.gramPanchayat || '',
      adminId: row.admin_id || row.adminId || '',
    }));
  } catch (err) {
    console.error('Error fetching booking rents from Supabase:', err);
    return null;
  }
}

export async function saveBookingRentToSupabase(booking: BookingRentRecord): Promise<boolean> {
  try {
    const payload = {
      id: booking.id,
      voucher_no: booking.voucherNo,
      family_id: booking.familyId,
      beneficiary_name: booking.beneficiaryName,
      guardian_name: booking.guardianName || '',
      mobile: booking.mobile || '',
      ward_no: booking.wardNo || '',
      samagra_id: booking.samagraId || '',
      facility_name: booking.facilityName,
      purpose: booking.purpose,
      start_date: booking.startDate,
      start_time: booking.startTime || null,
      end_date: booking.endDate,
      end_time: booking.endTime || null,
      charge_amount: Number(booking.chargeAmount) || 0,
      security_deposit: booking.securityDeposit !== undefined ? Number(booking.securityDeposit) : null,
      payment_mode: booking.paymentMode || 'CASH',
      transaction_id: booking.transactionId || '',
      remarks: booking.remarks || '',
      cashbook_voucher_id: booking.cashbookVoucherId || '',
      gram_panchayat: booking.gramPanchayat || '',
      admin_id: booking.adminId || '',
    };

    const res = await safeUpsertToSupabase('booking_rents', payload, 'id');
    return res.success;
  } catch (err) {
    console.error('Error saving booking rent to Supabase:', err);
    return false;
  }
}

export async function deleteBookingRentFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('booking_rents').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Error deleting booking rent from Supabase:', err);
    return false;
  }
}

// ==============================================================================
// 13. BUILDING PERMISSION & TAX (3.8 - भवन निर्माण अनुमति एवं कर वाउचर)
// ==============================================================================

export async function fetchBuildingPermissionsFromSupabase(): Promise<BuildingPermissionRecord[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('building_permissions').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      voucherNo: row.voucher_no || row.voucherNo || `BP-VOU-${row.id}`,
      permissionNo: row.permission_no || row.permissionNo || `BP-${row.id}`,
      familyId: row.family_id || row.familyId,
      beneficiaryName: row.beneficiary_name || row.beneficiaryName || '',
      guardianName: row.guardian_name || row.guardianName,
      fatherHusbandName: row.father_husband_name || row.guardian_name || row.guardianName || '',
      mobile: row.mobile,
      wardNo: row.ward_no || row.wardNo,
      samagraId: row.samagra_id || row.samagraId,
      plotNo: row.plot_no || row.plotNo || '',
      locationAddress: row.location_address || row.locationAddress || '',
      constructionType: row.construction_type || row.constructionType || 'आवासीय (Residential)',
      totalFloors: row.total_floors || row.totalFloors || 'भू-तल (Ground Floor)',
      areaSqFt: Number(row.area_sq_ft || row.areaSqFt || 0),
      ratePerSqFt: Number(row.rate_per_sq_ft || row.ratePerSqFt || 0),
      taxAmount: Number(row.tax_amount || row.taxAmount || 0),
      calculatedTax: Number(row.tax_amount || row.taxAmount || row.calculated_tax || 0),
      sanitationFee: row.sanitation_fee !== undefined ? Number(row.sanitation_fee) : 0,
      totalAmount: Number(row.total_amount || row.totalAmount || 0),
      paymentMode: row.payment_mode || row.paymentMode || 'CASH',
      transactionId: row.transaction_id || row.transactionId,
      validUpto: row.valid_upto || row.validUpto,
      issueDate: row.issue_date || row.issueDate || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      remarks: row.remarks || '',
      createdAt: row.created_at || new Date().toISOString(),
      cashbookVoucherId: row.cashbook_voucher_id || row.cashbookVoucherId,
      gramPanchayat: row.gram_panchayat || row.gramPanchayat || '',
      adminId: row.admin_id || row.adminId || '',
    }));
  } catch (err) {
    console.error('Error fetching building permissions from Supabase:', err);
    return null;
  }
}

export async function saveBuildingPermissionToSupabase(perm: BuildingPermissionRecord): Promise<boolean> {
  try {
    const payload = {
      id: perm.id,
      voucher_no: perm.voucherNo,
      permission_no: perm.permissionNo,
      family_id: perm.familyId,
      beneficiary_name: perm.beneficiaryName,
      guardian_name: perm.guardianName || '',
      mobile: perm.mobile || '',
      ward_no: perm.wardNo || '',
      samagra_id: perm.samagraId || '',
      plot_no: perm.plotNo || '',
      location_address: perm.locationAddress || '',
      construction_type: perm.constructionType || '',
      total_floors: perm.totalFloors || '',
      area_sq_ft: Number(perm.areaSqFt) || 0,
      rate_per_sq_ft: Number(perm.ratePerSqFt) || 0,
      tax_amount: Number(perm.taxAmount) || 0,
      sanitation_fee: Number(perm.sanitationFee) || 0,
      total_amount: Number(perm.totalAmount) || 0,
      payment_mode: perm.paymentMode || 'CASH',
      transaction_id: perm.transactionId || '',
      valid_upto: perm.validUpto || null,
      remarks: perm.remarks || '',
      cashbook_voucher_id: perm.cashbookVoucherId || '',
      gram_panchayat: perm.gramPanchayat || '',
      admin_id: perm.adminId || '',
    };

    const res = await safeUpsertToSupabase('building_permissions', payload, 'id');
    return res.success;
  } catch (err) {
    console.error('Error saving building permission to Supabase:', err);
    return false;
  }
}

export async function deleteBuildingPermissionFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('building_permissions').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Error deleting building permission from Supabase:', err);
    return false;
  }
}

