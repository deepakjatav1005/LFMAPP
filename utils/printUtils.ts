export const DEFAULT_OFFICE_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Emblem_of_Madhya_Pradesh.svg/180px-Emblem_of_Madhya_Pradesh.svg.png';

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
  if (officeDetails?.address && officeDetails.address.trim().length > 0) {
    return officeDetails.address.trim();
  }
  const block = officeDetails?.block || officeDetails?.janpadPanchayat || admin?.block || '';
  const district = officeDetails?.district || officeDetails?.districtName || admin?.district || '';
  const state = officeDetails?.state || 'मध्य प्रदेश';
  const pin = officeDetails?.pincode ? ` - ${officeDetails.pincode}` : '';

  const parts = [];
  if (block) parts.push(`जनपद पंचायत: ${block}`);
  if (district) parts.push(`जिला: ${district}`);
  if (state) parts.push(`(${state}${pin})`);

  return parts.length > 0 ? parts.join(', ') : 'जनपद पंचायत एवं जिला कार्यालय (मध्य प्रदेश)';
}

/**
 * Ensures clean office title without duplicate prefixes like "कार्यालय ग्राम पंचायत कार्यालय ग्राम पंचायत कठौतिया"
 */
export function getCleanOfficeTitle(officeDetails?: any, fallbackPanchayat?: string): string {
  const name = officeDetails?.officeName?.trim() || (fallbackPanchayat ? `ग्राम पंचायत ${fallbackPanchayat}` : '');
  if (!name) return 'कार्यालय ग्राम पंचायत';
  
  if (name.startsWith('कार्यालय ग्राम पंचायत')) return name;
  if (name.startsWith('कार्यालय')) return name;
  if (name.startsWith('ग्राम पंचायत')) return `कार्यालय ${name}`;
  return `कार्यालय ग्राम पंचायत ${name}`;
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
 * Utility function to handle printing cleanly across all browsers, popups, and iframe contexts.
 * Handles member cards, receipts, cashbook reports, demand notices, and general printable areas.
 * @param elementId Optional target HTML element ID or class selector to print specifically
 */
export function triggerPrint(elementId?: string): void {
  try {
    let targetElement: HTMLElement | null = null;

    if (elementId) {
      const cleanId = elementId.replace('#', '').replace('.', '');
      targetElement = (
        document.getElementById(cleanId) ||
        document.querySelector(`.${cleanId}`) ||
        document.querySelector(elementId)
      ) as HTMLElement | null;
    }

    if (!targetElement) {
      targetElement = (
        document.getElementById('printable-area') ||
        document.querySelector('.printable-area') ||
        document.getElementById('receipt-print-area')
      ) as HTMLElement | null;
    }

    const htmlContent = targetElement ? targetElement.outerHTML : document.body.innerHTML;

    // Method 1: Try pop-up window print (Works best in sandboxed web environments)
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=800,scrollbars=yes,status=no,toolbar=no,menubar=no');
      if (printWindow) {
        const tailwindScript = '<script src="https://cdn.tailwindcss.com"></script>';
        const fontStyles = '<link rel="stylesheet" href="https://rsms.me/inter/inter.css">';
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="hi">
            <head>
              <meta charset="UTF-8">
              <title>Print Report / Document - Gram Panchayat Portal</title>
              ${tailwindScript}
              ${fontStyles}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }
                body {
                  background-color: #ffffff !important;
                  color: #000000 !important;
                  padding: 20px !important;
                  margin: 0 !important;
                  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                button, input, select, textarea, nav, header, footer, .no-print, .print\\:hidden {
                  display: none !important;
                }
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  font-size: 12px !important;
                }
                th, td {
                  border: 1px solid #000000 !important;
                  padding: 6px 8px !important;
                  color: #000000 !important;
                }
                th {
                  background-color: #f1f5f9 !important;
                }
                .printable-area, #printable-area, #receipt-print-area {
                  display: block !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                }
              </style>
            </head>
            <body>
              <div class="printable-area">
                ${htmlContent}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  }, 400);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return;
      }
    } catch (popupErr) {
      console.warn('Pop-up printing blocked or unavailable, trying iframe/direct print fallback:', popupErr);
    }

    // Method 2: Try hidden iframe print
    if (targetElement) {
      try {
        const printIframe = document.createElement('iframe');
        printIframe.style.position = 'fixed';
        printIframe.style.right = '0';
        printIframe.style.bottom = '0';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = '0';
        printIframe.style.zIndex = '-9999';
        document.body.appendChild(printIframe);

        const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Print Document</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  body {
                    background: #ffffff !important;
                    color: #000000 !important;
                    margin: 0 !important;
                    padding: 15px !important;
                    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print\\:hidden, button, input, select, textarea, nav, header, footer {
                    display: none !important;
                  }
                  @page {
                    size: A4 portrait;
                    margin: 10mm;
                  }
                  table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                  }
                  th, td {
                    border: 1px solid #000000 !important;
                    padding: 6px 8px !important;
                    color: #000000 !important;
                  }
                </style>
              </head>
              <body>
                <div>${targetElement.outerHTML}</div>
              </body>
            </html>
          `);
          iframeDoc.close();

          setTimeout(() => {
            try {
              if (printIframe.contentWindow) {
                printIframe.contentWindow.focus();
                printIframe.contentWindow.print();
              } else {
                window.focus();
                window.print();
              }
            } catch {
              window.focus();
              window.print();
            } finally {
              setTimeout(() => {
                if (document.body.contains(printIframe)) {
                  document.body.removeChild(printIframe);
                }
              }, 2000);
            }
          }, 300);
          return;
        }
      } catch (iframeErr) {
        console.warn('Iframe printing failed:', iframeErr);
      }
    }

    // Method 3: Direct window print fallback
    window.focus();
    window.print();
  } catch (err) {
    console.error('Print trigger unexpected error:', err);
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn('Direct window.print() error:', e);
    }
  }
}

