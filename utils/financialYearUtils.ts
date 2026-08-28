import { OtherTaxReceiptRecord, OtherTaxCategory } from '../types';

export interface FinancialYearInfo {
  fyCode: string; // e.g. "2026-2027"
  fyShort: string; // e.g. "2026-27"
  startYear: number; // 2026
  endYear: number; // 2027
  startDate: string; // "2026-04-01"
  endDate: string; // "2027-03-31"
  nextFyCode: string; // "2027-2028"
  nextFyShort: string; // "2027-28"
  nextFyStartDate: string; // "2027-04-01"
  labelHi: string;
  nextLabelHi: string;
}

/**
 * Calculates Indian Financial Year (1st April to 31st March) for a given date
 */
export function getFinancialYear(dateInput?: string | Date): FinancialYearInfo {
  let d: Date;
  if (!dateInput) {
    d = new Date();
  } else if (typeof dateInput === 'string') {
    // Parse YYYY-MM-DD cleanly without timezone shift
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = new Date(dateInput);
  }

  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1 = Jan, 4 = Apr, 12 = Dec

  // If April (4) to Dec (12), FY is year to year+1. If Jan (1) to Mar (3), FY is year-1 to year
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const shortEnd = String(endYear).slice(-2);

  const nextStartYear = endYear;
  const nextEndYear = nextStartYear + 1;
  const nextShortEnd = String(nextEndYear).slice(-2);

  return {
    fyCode: `${startYear}-${endYear}`,
    fyShort: `${startYear}-${shortEnd}`,
    startYear,
    endYear,
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`,
    nextFyCode: `${nextStartYear}-${nextEndYear}`,
    nextFyShort: `${nextStartYear}-${nextShortEnd}`,
    nextFyStartDate: `${nextStartYear}-04-01`,
    labelHi: `वित्तीय वर्ष ${startYear}-${shortEnd} (01/04/${startYear} से 31/03/${endYear})`,
    nextLabelHi: `आगामी वित्तीय वर्ष ${nextStartYear}-${nextShortEnd} (01/04/${nextStartYear} से)`,
  };
}

/**
 * Checks if two dates fall within the same Indian financial year
 */
export function isSameFinancialYear(date1?: string | Date, date2?: string | Date): boolean {
  if (!date1 || !date2) return false;
  return getFinancialYear(date1).startYear === getFinancialYear(date2).startYear;
}

/**
 * Detects if a tax head belongs to Property Tax
 */
export function isPropertyTaxHead(taxCategoryOrHead?: string): boolean {
  if (!taxCategoryOrHead) return false;
  const s = taxCategoryOrHead.toLowerCase();
  return (
    taxCategoryOrHead === OtherTaxCategory.PROPERTY ||
    s.includes('संपत्ति') ||
    s.includes('property') ||
    s.includes('गृह कर') ||
    s.includes('मकान कर') ||
    s.includes('house tax')
  );
}

/**
 * Detects if a tax head belongs to Commercial Shop / Business Tax
 */
export function isCommercialShopTaxHead(taxCategoryOrHead?: string): boolean {
  if (!taxCategoryOrHead) return false;
  const s = taxCategoryOrHead.toLowerCase();
  return (
    taxCategoryOrHead === OtherTaxCategory.COMMERCIAL_SHOP ||
    s.includes('दुकान') ||
    s.includes('व्यावसायिक') ||
    s.includes('प्रतिष्ठान') ||
    s.includes('commercial') ||
    s.includes('shop') ||
    s.includes('business')
  );
}

export interface TaxAnnualPaymentCheckResult {
  alreadyPaid: boolean;
  isAnnualTax: boolean;
  annualTaxType: 'PROPERTY' | 'COMMERCIAL_SHOP' | 'NONE';
  existingReceipt: OtherTaxReceiptRecord | null;
  targetFY: FinancialYearInfo;
  nextAllowedDate: string;
  nextFY: string;
  warningHi: string;
  warningEn: string;
}

/**
 * Evaluates whether Property Tax or Commercial Shop Tax has already been paid
 * in the selected financial year for a given beneficiary / shop.
 */
export function checkAnnualTaxPaymentStatus(params: {
  receipts: OtherTaxReceiptRecord[];
  familyId?: string;
  samagraId?: string;
  businessRegistrationId?: string;
  businessName?: string;
  taxHeadOrCategory: string;
  targetDate?: string;
}): TaxAnnualPaymentCheckResult {
  const {
    receipts = [],
    familyId,
    samagraId,
    businessRegistrationId,
    businessName,
    taxHeadOrCategory,
    targetDate,
  } = params;

  const targetFY = getFinancialYear(targetDate || new Date());
  const isProp = isPropertyTaxHead(taxHeadOrCategory);
  const isShop = isCommercialShopTaxHead(taxHeadOrCategory);

  if (!isProp && !isShop) {
    return {
      alreadyPaid: false,
      isAnnualTax: false,
      annualTaxType: 'NONE',
      existingReceipt: null,
      targetFY,
      nextAllowedDate: targetFY.nextFyStartDate,
      nextFY: targetFY.nextFyShort,
      warningHi: '',
      warningEn: '',
    };
  }

  const annualTaxType: 'PROPERTY' | 'COMMERCIAL_SHOP' = isProp ? 'PROPERTY' : 'COMMERCIAL_SHOP';

  // Find existing receipts for this tax type in the target financial year
  const matchingReceipt = receipts.find((r) => {
    // 1. Must be in the same financial year
    const rFY = getFinancialYear(r.receiptDate);
    if (rFY.startYear !== targetFY.startYear) return false;

    // 2. Check Tax Type match
    if (isProp) {
      if (!isPropertyTaxHead(r.taxHead)) return false;
      // Beneficiary Match
      const matchesFamId = familyId && r.familyId === familyId;
      const matchesSamagra = samagraId && r.samagraId && r.samagraId.trim() === samagraId.trim();
      return Boolean(matchesFamId || matchesSamagra);
    }

    if (isShop) {
      if (!isCommercialShopTaxHead(r.taxHead)) return false;

      // If specific business registration is specified
      if (businessRegistrationId && (r as any).businessRegistrationId === businessRegistrationId) {
        return true;
      }

      // If business name matches
      if (
        businessName &&
        r.taxHead.toLowerCase().includes(businessName.toLowerCase().trim())
      ) {
        return true;
      }

      // Beneficiary Match for shop tax
      const matchesFamId = familyId && r.familyId === familyId;
      const matchesSamagra = samagraId && r.samagraId && r.samagraId.trim() === samagraId.trim();
      return Boolean(matchesFamId || matchesSamagra);
    }

    return false;
  });

  if (matchingReceipt) {
    const taxNameHi = isProp ? 'संपत्ति कर (Property Tax)' : 'व्यावसायिक दुकान कर (Shop Tax)';
    const nextDateFormatted = `01/04/${targetFY.endYear}`;
    return {
      alreadyPaid: true,
      isAnnualTax: true,
      annualTaxType,
      existingReceipt: matchingReceipt,
      targetFY,
      nextAllowedDate: targetFY.nextFyStartDate,
      nextFY: targetFY.nextFyShort,
      warningHi: `⚠️ ${taxNameHi} चालू वित्तीय वर्ष (${targetFY.fyShort}) में पहले ही जमा किया जा चुका है (रसीद क्र: ${matchingReceipt.receiptNo}, दिनांक: ${matchingReceipt.receiptDate}, राशि: ₹${matchingReceipt.taxAmount})। यह कर वित्तीय वर्ष में केवल 1 बार देय होता है। अगला कर आगामी वित्तीय वर्ष (${targetFY.nextFyShort}) में ${nextDateFormatted} से देय होगा।`,
      warningEn: `⚠️ ${isProp ? 'Property Tax' : 'Commercial Shop Tax'} is already paid for Financial Year ${targetFY.fyShort} (Receipt: ${matchingReceipt.receiptNo}, Date: ${matchingReceipt.receiptDate}, Amount: ₹${matchingReceipt.taxAmount}). Annual tax is charged once per financial year. Next payment will be due in FY ${targetFY.nextFyShort} (from ${targetFY.nextFyStartDate}).`,
    };
  }

  return {
    alreadyPaid: false,
    isAnnualTax: true,
    annualTaxType,
    existingReceipt: null,
    targetFY,
    nextAllowedDate: targetFY.nextFyStartDate,
    nextFY: targetFY.nextFyShort,
    warningHi: '',
    warningEn: '',
  };
}
