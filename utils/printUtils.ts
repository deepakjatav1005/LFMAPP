// Official high-resolution vector emblem URL for Madhya Pradesh Shasan & Gram Panchayat
export const DEFAULT_OFFICE_LOGO =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Emblem_of_Madhya_Pradesh.svg/240px-Emblem_of_Madhya_Pradesh.svg.png';

/**
 * Returns a valid office logo URL or standard Madhya Pradesh State Emblem logo fallback
 */
export function getOfficeLogoUrl(officeDetails?: any): string {
  if (officeDetails?.logoUrl && typeof officeDetails.logoUrl === 'string' && officeDetails.logoUrl.trim().length > 0) {
    return officeDetails.logoUrl.trim();
  }
  return DEFAULT_OFFICE_LOGO;
}

/**
 * Returns a formatted office address line with block, district, state & pin
 */
export function getCleanOfficeSubtitle(officeDetails?: any, admin?: any): string {
  const block =
    (officeDetails?.block && String(officeDetails.block).trim()) ||
    (officeDetails?.janpadPanchayat && String(officeDetails.janpadPanchayat).trim()) ||
    (admin?.block && String(admin.block).trim()) ||
    (admin?.janpadPanchayat && String(admin.janpadPanchayat).trim()) ||
    '';
  const district =
    (officeDetails?.district && String(officeDetails.district).trim()) ||
    (officeDetails?.districtName && String(officeDetails.districtName).trim()) ||
    (admin?.district && String(admin.district).trim()) ||
    (admin?.districtName && String(admin.districtName).trim()) ||
    '';
  const state =
    (officeDetails?.state && String(officeDetails.state).trim()) ||
    (admin?.state && String(admin.state).trim()) ||
    'मध्य प्रदेश';
  const pin =
    officeDetails?.pincode || admin?.pincode ? ` - ${officeDetails?.pincode || admin?.pincode}` : '';

  const parts: string[] = [];
  if (block) {
    const cleanBlock = block
      .replace(/^(जनपद\s*पंचायत\s*:?\s*)/i, '')
      .replace(/^(जनपद\s*:?\s*)/i, '')
      .replace(/^(block\s*:?\s*)/i, '')
      .trim();
    if (cleanBlock) parts.push(`जनपद पंचायत: ${cleanBlock}`);
  }
  if (district) {
    const cleanDistrict = district
      .replace(/^(जिला\s*:?\s*)/i, '')
      .replace(/^(district\s*:?\s*)/i, '')
      .trim();
    if (cleanDistrict) parts.push(`जिला: ${cleanDistrict}`);
  }
  if (state) {
    parts.push(`(${state}${pin})`);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (officeDetails?.address && String(officeDetails.address).trim().length > 0) {
    return String(officeDetails.address).trim();
  }

  return 'जनपद पंचायत एवं जिला कार्यालय (मध्य प्रदेश)';
}

/**
 * Ensures clean office title without duplicate prefixes like "कार्यालय ग्राम पंचायत कार्यालय ग्राम पंचायत कठौतिया" or "कार्यालय ग्राम पंचायत ग्राम पंचायत जोवा"
 */
export function getCleanOfficeTitle(officeDetails?: any, fallbackPanchayat?: string): string {
  const officeNameRaw = officeDetails?.officeName ? String(officeDetails.officeName).trim() : '';
  const gpRaw =
    (officeDetails?.gramPanchayat ? String(officeDetails.gramPanchayat).trim() : '') ||
    (fallbackPanchayat && typeof fallbackPanchayat === 'string' ? fallbackPanchayat.trim() : '');

  // Choose the best source of the Panchayat name
  let target = '';
  if (
    officeNameRaw &&
    officeNameRaw !== 'कार्यालय ग्राम पंचायत' &&
    officeNameRaw !== 'ग्राम पंचायत'
  ) {
    target = officeNameRaw;
  } else if (gpRaw) {
    target = gpRaw;
  } else {
    target = officeNameRaw || 'ग्राम पंचायत';
  }

  // Clean all repeated prefixes like "कार्यालय", "ग्राम पंचायत", "office of", "gram panchayat"
  const cleanedName = target
    .replace(/^(कार्यालय\s*)+/gi, '')
    .replace(/^(ग्राम\s*पंचायत\s*)+/gi, '')
    .replace(/^(office\s*(of)?\s*)+/gi, '')
    .replace(/^(gram\s*panchayat\s*)+/gi, '')
    .trim();

  return cleanedName ? `कार्यालय ग्राम पंचायत ${cleanedName}` : 'कार्यालय ग्राम पंचायत';
}

/**
 * Generates standardized HTML markup for the official Gram Panchayat letterhead banner.
 * Uses getOfficeLogoUrl, getCleanOfficeTitle, getCleanOfficeSubtitle, and state tagline.
 */
export function renderHtmlOfficialHeader({
  officeDetails,
  admin,
  voucherTitle,
  voucherSubTitle,
  badgeBgColor = 'bg-slate-100 text-slate-900 border-slate-300',
  className = '',
}: {
  officeDetails?: any;
  admin?: any;
  voucherTitle: string;
  voucherSubTitle?: string;
  badgeBgColor?: string;
  className?: string;
}): string {
  const logoUrl = getOfficeLogoUrl(officeDetails);
  const officeName = getCleanOfficeTitle(officeDetails, admin?.gramPanchayat);
  const officeSubtitle = getCleanOfficeSubtitle(officeDetails, admin);

  return `
    <div class="text-center border-b-2 border-slate-900 pb-4 space-y-2 mb-4 ${className}">
      <div class="flex justify-center items-center gap-3 mb-2">
        <img
          src="${logoUrl}"
          alt="Official Logo"
          referrerpolicy="no-referrer"
          class="w-24 h-24 sm:w-28 sm:h-28 print:w-24 print:h-24 object-contain drop-shadow-md mx-auto"
          onerror="this.onerror=null;this.src='${DEFAULT_OFFICE_LOGO}';"
        />
      </div>
      <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
        ${officeName}
      </h2>
      <p class="text-xs sm:text-sm text-slate-700 font-semibold max-w-xl mx-auto">
        ${officeSubtitle}
      </p>
      ${voucherSubTitle ? `<p class="text-[10px] text-slate-500 font-medium">${voucherSubTitle}</p>` : ''}
      <div class="pt-1">
        <div class="inline-block border font-black text-xs px-4 py-1 rounded-full uppercase shadow-xs ${badgeBgColor}">
          ${voucherTitle}
        </div>
      </div>
    </div>
  `;
}

/**
 * Formats amount into Indian Rupee currency string (e.g. ₹1,500)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
}

/**
 * Returns full month name from 1-indexed month number (1 -> January, etc.)
 */
export function getMonthName(month: number): string {
  return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
}

/**
 * Formats any ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ) or Date object into DD/MM/YYYY
 */
export function formatDateDDMMYYYY(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // If it's already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    // Handle YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.split('T')[0].split('-');
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
      }
    }
  }
  
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Checks if a given date string (YYYY-MM-DD), year number (2025), or financial year string (2025-26)
 * belongs strictly to the requested Indian Financial Year string (e.g. "2025" for FY 2025-26).
 */
export function isInFinancialYear(dateStrOrYear: string | number | undefined | null, selectedYear: string): boolean {
  if (!selectedYear || selectedYear === 'ALL') return true;
  if (dateStrOrYear === undefined || dateStrOrYear === null || dateStrOrYear === '') return false;

  const targetYearNum = parseInt(selectedYear, 10);
  if (isNaN(targetYearNum)) return true;

  // Case 1: direct year number or 4-digit string like 2025
  if (typeof dateStrOrYear === 'number' || /^\d{4}$/.test(String(dateStrOrYear))) {
    return Number(dateStrOrYear) === targetYearNum;
  }

  const valStr = String(dateStrOrYear).trim();

  // Case 2: FY string like "2025-26" or "2025-2026"
  if (valStr.includes(`${targetYearNum}-${(targetYearNum + 1) % 100}`) || valStr.includes(`${targetYearNum}-${targetYearNum + 1}`)) {
    return true;
  }

  // Case 3: ISO Date string YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(valStr)) {
    const parts = valStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10); // 1-indexed

    // Indian Financial Year: April (4) to March (3)
    // Apr-Dec of Year Y -> FY Y
    // Jan-Mar of Year Y -> FY Y-1
    const fyYear = month >= 4 ? year : year - 1;
    return fyYear === targetYearNum;
  }

  // Fallback check
  return valStr.includes(selectedYear);
}

/**
 * Returns financial year details for a given date (1 April - 31 March cycle)
 */
export function getFinancialYear(dateInput?: string | Date | null): {
  startYear: number;
  endYear: number;
  fyString: string;
  fyShort: string;
  label: string;
  nextFyString: string;
  nextFyShort: string;
} {
  let d = new Date();
  if (dateInput) {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const [y, m, day] = dateInput.split('-').map((n) => parseInt(n, 10));
      d = new Date(y, m - 1, day || 1);
    } else {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
  }

  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const month = isNaN(d.getMonth()) ? new Date().getMonth() + 1 : d.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const fyString = `${startYear}-${String(endYear).slice(-2)}`;
  const fyShort = fyString;
  const nextStartYear = endYear;
  const nextEndYear = nextStartYear + 1;
  const nextFyString = `${nextStartYear}-${String(nextEndYear).slice(-2)}`;
  const nextFyShort = nextFyString;
  const label = `${startYear}-${endYear}`;
  return { startYear, endYear, fyString, fyShort, label, nextFyString, nextFyShort };
}

/**
 * Utility function to handle printing cleanly across all browsers, popups, and iframe contexts.
 * Handles member cards, receipts, cashbook reports, demand notices, and general printable areas.
 * Supports landscape orientation for official certificates and wide ledger reports.
 * @param elementId Optional target HTML element ID or class selector to print specifically
 * @param options Optional configuration object or orientation string ('landscape' | 'portrait')
 */
/**
 * Injects dynamic print styles into the main document to ensure 100% accurate print layout,
 * orientation, colors, and font rendering when printing via native window.print().
 */
export function injectDocumentPrintStyle(orientation: 'landscape' | 'portrait' = 'portrait'): void {
  const isLandscape = orientation === 'landscape';
  let styleEl = document.getElementById('gp-print-dynamic-style') as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'gp-print-dynamic-style';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    @page {
      size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'} !important;
      margin: ${isLandscape ? '2.5mm 3.5mm' : '4mm 6mm'} !important;
    }
    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background: #ffffff !important;
        color: #000000 !important;
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
      .no-print, header, nav, aside, footer, button, input:not([type="checkbox"]), select, textarea, [class*="no-print"] {
        display: none !important;
        visibility: hidden !important;
      }
      #printable-business-certificate, .printable-certificate, .printable-area, #printable-area, #receipt-print-area {
        display: block !important;
        visibility: visible !important;
        width: 100% !important;
        max-width: ${isLandscape ? '290mm' : '100%'} !important;
        margin: 0 auto !important;
        padding: 1.5mm !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  `;
}

/**
 * Standard trigger print function with high-contrast color preservation, orientation handling, and layout isolation.
 * Works flawlessly across desktop, mobile, embedded iframes, and modern browsers.
 */
export function triggerPrint(
  elementId?: string,
  options?: { orientation?: 'portrait' | 'landscape'; title?: string } | 'landscape' | 'portrait'
): void {
  try {
    let orientation: 'portrait' | 'landscape' = 'portrait';
    let title = 'Gram Panchayat Certificate / Report';

    if (typeof options === 'string') {
      orientation = options.toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
    } else if (options && typeof options === 'object') {
      if (options.orientation) orientation = options.orientation;
      if (options.title) title = options.title;
    } else if (elementId?.includes('landscape') || elementId?.includes('business-certificate')) {
      orientation = 'landscape';
    }

    // Set page title for print / save as PDF dialog
    if (title) {
      document.title = title;
    }

    // 1. Inject exact dynamic print stylesheet with correct orientation
    injectDocumentPrintStyle(orientation);

    // 2. Focus window and trigger native print
    setTimeout(() => {
      window.focus();
      window.print();
    }, 150);
  } catch (err) {
    console.error('Print trigger error:', err);
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn('Direct window.print() fallback error:', e);
    }
  }
}

/**
 * Prints an HTML element cleanly via an isolated temporary container/iframe with safe fallback.
 */
export function printElementViaIframe(
  elementId: string,
  options?: { orientation?: 'portrait' | 'landscape'; title?: string }
): void {
  const orientation = options?.orientation || (elementId.includes('landscape') || elementId.includes('business-certificate') ? 'landscape' : 'portrait');
  triggerPrint(elementId, { orientation, title: options?.title });
}

/**
 * Opens the certificate / report in a dedicated clean popup window for 100% reliable printing and PDF download
 */
export function openPrintWindow(
  elementId: string,
  title = 'Certificate Print',
  orientation: 'landscape' | 'portrait' = 'landscape'
) {
  try {
    const cleanId = elementId.replace(/^#/, '');
    let el = document.getElementById(cleanId) || document.querySelector(`.${cleanId}`) || document.querySelector(elementId);
    if (!el) {
      el = document.getElementById('printable-business-certificate') || document.getElementById('printable-area');
    }
    if (!el) {
      triggerPrint(elementId, { orientation, title });
      return;
    }

    const isLandscape = orientation === 'landscape';
    const collectedStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('\n');

    const printWin = window.open('', '_blank', 'width=1150,height=800,menubar=no,toolbar=no,location=no,status=no');
    if (!printWin) {
      // If popup blocker intervened, fallback to in-page triggerPrint
      triggerPrint(elementId, { orientation, title });
      return;
    }

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="hi">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Tiro+Devanagari+Hindi:ital@0;1&family=Yantramanav:wght@400;500;700;900&display=swap" rel="stylesheet">
          ${collectedStyles}
          <style>
            @page {
              size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'} !important;
              margin: ${isLandscape ? '2mm 3mm' : '4mm 6mm'} !important;
            }
            *, *:before, *:after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 auto !important;
              padding: 4px !important;
              font-family: 'Noto Sans Devanagari', 'Tiro Devanagari Hindi', 'Yantramanav', ui-sans-serif, system-ui, sans-serif;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .no-print, button:not(.floating-print-bar), nav {
              display: none !important;
            }
            #printable-business-certificate, .printable-certificate, .printable-area {
              display: block !important;
              width: 100% !important;
              max-width: ${isLandscape ? '290mm' : '100%'} !important;
              margin: 0 auto !important;
              padding: 2mm !important;
              box-sizing: border-box !important;
            }
            .floating-toolbar {
              position: fixed;
              top: 12px;
              right: 12px;
              z-index: 99999;
              display: flex;
              gap: 8px;
              background: rgba(255, 255, 255, 0.95);
              padding: 6px;
              border-radius: 12px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.25);
              border: 1px solid #cbd5e1;
            }
            .floating-print-btn {
              background: #1d4ed8;
              color: white;
              padding: 8px 18px;
              border-radius: 8px;
              font-weight: 800;
              font-size: 13px;
              cursor: pointer;
              border: none;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .floating-print-btn:hover {
              background: #1e40af;
            }
            .floating-close-btn {
              background: #f1f5f9;
              color: #334155;
              padding: 8px 14px;
              border-radius: 8px;
              font-weight: 700;
              font-size: 13px;
              cursor: pointer;
              border: 1px solid #cbd5e1;
            }
            @media print {
              .floating-toolbar {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="floating-toolbar">
            <button class="floating-print-btn" onclick="window.print()">🖨️ प्रमाण पत्र प्रिंट / PDF सेव करें</button>
            <button class="floating-close-btn" onclick="window.close()">बंद करें</button>
          </div>
          <div class="printable-area ${isLandscape ? 'printable-landscape' : ''}">
            ${el.outerHTML}
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 400);
            });
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  } catch (e) {
    console.error('Popup print window error, fallback to in-page triggerPrint:', e);
    triggerPrint(elementId, { orientation, title });
  }
}

