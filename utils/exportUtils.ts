import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDateDDMMYYYY } from './printUtils';

/**
 * Export data table to an Excel (.xlsx) file
 */
export const exportToExcel = (
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
) => {
  const data = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Auto-set column widths based on content
  const colWidths = headers.map((h, i) => {
    let maxLen = h.toString().length;
    rows.forEach((r) => {
      const val = r[i] !== undefined && r[i] !== null ? r[i].toString() : '';
      if (val.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Report');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Clean text for standard ASCII PDF fallback while preserving meaning
 */
function sanitizeForAsciiPDF(text: any): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str.replace(/₹/g, 'Rs. ');
}

/**
 * Generate and print/download a high-fidelity PDF report with 100% perfect Devanagari Hindi font support
 */
export const exportToPDF = (
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  gramPanchayatName: string = 'ग्राम पंचायत कार्यालय (Gram Panchayat Office)'
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback to jsPDF if pop-up blocked
    generateFallbackJSPDF(filename, title, subtitle, headers, rows, gramPanchayatName);
    return;
  }

  const dateStr = formatDateDDMMYYYY(new Date());

  const tableHeaderHtml = headers
    .map((h) => `<th class="px-3 py-2.5 text-left text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 uppercase tracking-wider">${h}</th>`)
    .join('');

  const tableRowsHtml = rows
    .map((row, rIdx) => {
      const isTotalRow = row.some((c) => String(c).toUpperCase().includes('TOTAL') || String(c).includes('कुल'));
      const bgClass = isTotalRow ? 'bg-amber-50 font-bold text-slate-900 border-t-2 border-amber-400' : rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
      const cells = row
        .map((cell) => {
          const cellStr = cell !== null && cell !== undefined ? String(cell) : '';
          const isNum = typeof cell === 'number' || (!isNaN(Number(cell)) && cell !== '' && !cellStr.startsWith('0') && !cellStr.includes('-'));
          return `<td class="px-3 py-2 text-xs text-slate-700 border border-slate-200 ${isNum ? 'text-right font-mono' : 'text-left'}">${cellStr}</td>`;
        })
        .join('');
      return `<tr class="${bgClass}">${cells}</tr>`;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="UTF-8">
      <title>${title} - ${filename}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        * {
          font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page {
          size: A4 portrait;
          margin: 12mm 12mm 12mm 12mm;
        }
        @media print {
          body {
            margin: 0;
            background: #fff;
            color: #000;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body class="bg-slate-50 text-slate-900 p-6 min-h-screen">
      <!-- Toolbar for Save as PDF / Print -->
      <div class="no-print max-w-5xl mx-auto mb-6 p-4 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-between">
        <div>
          <h2 class="font-bold text-slate-800 text-base">📄 रिपोर्ट पूर्वावलोकन (Report Document PDF Preview)</h2>
          <p class="text-xs text-slate-500">देवनागरी हिंदी फॉन्ट एवं आधिकारिक प्रारूप में सुरक्षित व प्रिंट करने योग्य</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="window.print()" class="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg shadow flex items-center gap-2 cursor-pointer transition">
            🖨️ PDF सेव करें / प्रिंट करें (Print / Save as PDF)
          </button>
          <button onclick="window.close()" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition">
            बंद करें (Close)
          </button>
        </div>
      </div>

      <!-- Printable A4 Document Sheet -->
      <div class="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow border border-slate-200">
        <!-- Header Banner -->
        <div class="border-b-2 border-teal-700 pb-4 mb-5 flex items-start justify-between">
          <div>
            <span class="inline-block px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[11px] font-bold tracking-wide uppercase mb-1">
              कार्यालय ग्राम पंचायत (OFFICIAL DOCUMENT)
            </span>
            <h1 class="text-xl font-black text-teal-900 uppercase tracking-tight">${gramPanchayatName}</h1>
            <p class="text-xs font-semibold text-slate-600">पंचायत राज संचनालय | कर प्रबंधन एवं वित्तीय लेखा प्रणाली</p>
          </div>
          <div class="text-right">
            <div class="text-xs text-slate-500">दिनांक (Date):</div>
            <div class="text-sm font-bold text-slate-800 font-mono">${dateStr}</div>
            <div class="text-[10px] text-slate-400 mt-1 font-mono">REF: ${filename.toUpperCase()}</div>
          </div>
        </div>

        <!-- Title & Subtitle -->
        <div class="mb-5 bg-teal-50/60 p-3.5 rounded-lg border border-teal-100 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">${title}</h2>
            ${subtitle ? `<p class="text-xs text-slate-600 mt-0.5">${subtitle}</p>` : ''}
          </div>
          <div class="text-right">
            <span class="text-xs font-semibold px-2.5 py-1 bg-white rounded border border-teal-200 text-teal-800">
              कुल रिकॉर्ड: ${rows.length}
            </span>
          </div>
        </div>

        <!-- Main Data Table -->
        <div class="overflow-x-auto mb-6">
          <table class="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr>${tableHeaderHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Official Footer / Signatures -->
        <div class="mt-12 pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
          <div>
            <div class="h-12 border-b border-dashed border-slate-300"></div>
            <div class="font-bold text-slate-800 mt-2">कर संग्राहक / लिपिक</div>
            <div class="text-[11px] text-slate-500">ग्राम पंचायत</div>
          </div>
          <div>
            <div class="h-12 flex items-center justify-center">
              <span class="text-[11px] font-bold text-teal-800 border border-teal-300 bg-teal-50 px-3 py-1 rounded-full">
                ✓ कम्प्यूटरीकृत सत्यापित प्रति
              </span>
            </div>
            <div class="text-[10px] text-slate-400 mt-2">Generated via Gram Panchayat e-Tax Portal</div>
          </div>
          <div>
            <div class="h-12 border-b border-dashed border-slate-300"></div>
            <div class="font-bold text-slate-800 mt-2">सचिव / प्राधिकृत अधिकारी</div>
            <div class="text-[11px] text-slate-500">ग्राम पंचायत कार्यालय (हस्ताक्षर एवं सील)</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * Fallback direct jsPDF generator
 */
function generateFallbackJSPDF(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  gramPanchayatName: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const sanitizedGP = sanitizeForAsciiPDF(gramPanchayatName);
  const sanitizedTitle = sanitizeForAsciiPDF(title);
  const sanitizedSub = sanitizeForAsciiPDF(subtitle);
  const sanitizedHeaders = headers.map(sanitizeForAsciiPDF);
  const sanitizedRows = rows.map((r) => r.map(sanitizeForAsciiPDF));

  // Header Banner
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(sanitizedGP.toUpperCase() || 'GRAM PANCHAYAT OFFICE', 14, 12);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Tax Management & Collection System Report', 14, 18);
  doc.text(`Date: ${formatDateDDMMYYYY(new Date())}`, 196, 18, { align: 'right' });

  // Document Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(sanitizedTitle, 14, 38);

  if (sanitizedSub) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(sanitizedSub, 14, 44);
  }

  autoTable(doc, {
    startY: sanitizedSub ? 48 : 42,
    head: [sanitizedHeaders],
    body: sanitizedRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    bodyStyles: {
      textColor: [51, 65, 85],
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 35, bottom: 20, left: 14, right: 14 },
    didDrawPage: () => {
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 196, 287, { align: 'right' });
      doc.text('Official Computer-Generated Gram Panchayat Tax Document', 14, 287);
    },
  });

  doc.save(`${filename}.pdf`);
}

/**
 * Export Bulk Tax Vouchers to a high-quality multi-page PDF document with complete Devanagari Hindi font support
 */
export const exportBulkVouchersToPDF = (
  filename: string,
  vouchers: {
    payment: any;
    family?: any;
  }[],
  monthName: string,
  year: string | number,
  gramPanchayatName: string = 'ग्राम पंचायत कार्यालय (Gram Panchayat Office)',
  secretaryName: string = 'सचिव (Gram Panchayat Secretary)'
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // If popup blocked, use client-side download fallback
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.text('Vouchers export initiated. Please allow pop-ups for high-resolution Hindi receipt printing.', 14, 30);
    doc.save(`${filename}.pdf`);
    return;
  }

  const vouchersHtml = vouchers
    .map((item, idx) => {
      const { payment, family } = item;
      const receiptNo = payment.receiptNo || `RCP-${String(payment.id).toUpperCase()}`;
      const dateFormatted = formatDateDDMMYYYY(payment.date);
      const beneficiaryName = family ? `${family.name} ${family.surname}` : `ID: ${payment.familyId}`;
      const fatherHusband = family?.fatherHusbandName ? `(पिता/पति: ${family.fatherHusbandName})` : '';
      const samagraId = family?.samagraId || '-';
      const category = family?.category || 'APL';
      const wardMuhalla = `वार्ड क्र. ${family?.wardNo || '01'}, ${family?.muhalla || '-'}`;
      const chargedPeriodText = payment.chargedMonthNames || (payment.chargedMonth ? `माह ${payment.chargedMonth}/${payment.chargedYear || ''}` : `${monthName} ${year}`);
      const prevDues = payment.previousDues ?? payment.chargedAmount ?? payment.amount;
      const penalty = payment.penalty || 0;
      const concession = payment.concession || 0;
      const paid = payment.amount;
      const remaining = payment.remainingDues || 0;

      const isEven = idx % 2 === 1;

      return `
        <div class="voucher-card border-2 border-teal-700 rounded-xl bg-white p-5 mb-6 shadow-sm ${isEven && idx < vouchers.length - 1 ? 'page-break' : ''}">
          <!-- Voucher Header -->
          <div class="bg-teal-700 text-white -m-5 mb-4 p-3.5 rounded-t-[10px] flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-base">🏛️</div>
              <div>
                <h3 class="font-black text-sm uppercase tracking-wide leading-tight">${gramPanchayatName}</h3>
                <p class="text-[11px] text-teal-100 font-medium">आधिकारिक कर रसीद / वाउचर (Official Tax Receipt Voucher)</p>
              </div>
            </div>
            <div class="text-right">
              <span class="inline-block px-2 py-0.5 bg-amber-400 text-slate-900 rounded font-bold text-[10px] uppercase">
                कर अवधि: ${monthName} ${year}
              </span>
            </div>
          </div>

          <!-- Meta Row -->
          <div class="bg-slate-100 -mx-5 -mt-4 mb-3 px-5 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
            <div><span class="text-slate-500">रसीद क्रमांक (Receipt No):</span> <strong class="text-slate-900 font-mono">${receiptNo}</strong></div>
            <div><span class="text-slate-500">भुगतान दिनांक (Date):</span> <strong class="text-slate-900 font-mono">${dateFormatted}</strong></div>
          </div>

          <!-- Beneficiary Details Grid -->
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 text-xs mb-3">
            <div>
              <div class="text-slate-500 text-[11px]">हितग्राही का नाम (Beneficiary):</div>
              <div class="font-bold text-slate-900 text-sm">${beneficiaryName} <span class="text-xs font-normal text-slate-600">${fatherHusband}</span></div>
              <div class="text-slate-600 mt-1">समग्र आईडी: <strong class="text-slate-800 font-mono">${samagraId}</strong> | श्रेणी: <strong class="text-teal-800">${category}</strong></div>
              <div class="text-slate-600">पता: ${wardMuhalla}</div>
            </div>
            <div>
              <div class="text-slate-500 text-[11px]">कर प्रकार एवं मांग अवधि:</div>
              <div class="font-bold text-slate-900">${payment.taxType || 'समस्त कर (All Taxes)'}</div>
              <div class="text-slate-600 mt-1">लागू अवधि: <strong class="text-slate-800">${chargedPeriodText}</strong></div>
              <div class="text-slate-600">भुगतान माध्यम: <strong class="text-emerald-700 font-bold">${payment.mode || 'CASH'}</strong></div>
            </div>
          </div>

          <!-- Financial Particulars Table -->
          <table class="w-full text-xs border-collapse border border-slate-300 mb-4">
            <thead>
              <tr class="bg-teal-50 text-teal-950 font-bold">
                <th class="p-1.5 text-left border border-slate-300">वित्तीय विवरण (Particulars)</th>
                <th class="p-1.5 text-right border border-slate-300 w-36">राशि (Amount ₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="p-1.5 border border-slate-300">कर मांग / पूर्व बकाया राशि (Tax Demand Dues)</td>
                <td class="p-1.5 text-right border border-slate-300 font-mono font-semibold">₹${Number(prevDues).toLocaleString('en-IN')}</td>
              </tr>
              ${penalty > 0 ? `<tr><td class="p-1.5 border border-slate-300 text-red-700">विलंब शुल्क / पेनल्टी (+)</td><td class="p-1.5 text-right border border-slate-300 font-mono text-red-700">+ ₹${Number(penalty).toLocaleString('en-IN')}</td></tr>` : ''}
              ${concession > 0 ? `<tr><td class="p-1.5 border border-slate-300 text-emerald-700">छूट / रियायत (-)</td><td class="p-1.5 text-right border border-slate-300 font-mono text-emerald-700">- ₹${Number(concession).toLocaleString('en-IN')}</td></tr>` : ''}
              <tr class="bg-emerald-50/80 font-bold text-emerald-950">
                <td class="p-1.5 border border-slate-300">कुल प्राप्त एवं जमा राशि (Amount Received)</td>
                <td class="p-1.5 text-right border border-slate-300 font-mono text-emerald-800 text-sm">₹${Number(paid).toLocaleString('en-IN')}</td>
              </tr>
              <tr class="bg-slate-50 font-semibold text-slate-700">
                <td class="p-1.5 border border-slate-300">शेष बकाया राशि (Remaining Dues)</td>
                <td class="p-1.5 text-right border border-slate-300 font-mono ${remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}">₹${Number(remaining).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <!-- Footer & Signatures -->
          <div class="flex items-end justify-between pt-2 text-[11px] text-slate-500">
            <div>
              <p class="italic">${payment.remarks ? `टिप्पणी: ${payment.remarks}` : 'नोट: यह एक कम्प्यूटरीकृत वैध कर रसीद है।'}</p>
            </div>
            <div class="text-right">
              <div class="h-6"></div>
              <strong class="text-slate-800">${secretaryName}</strong>
              <p class="text-[10px] text-slate-500">सचिव / प्राधिकृत हस्ताक्षरकर्ता</p>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        * {
          font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          body {
            margin: 0;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body class="bg-slate-100 text-slate-900 p-6 min-h-screen">
      <!-- Toolbar -->
      <div class="no-print max-w-4xl mx-auto mb-6 p-4 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-between">
        <div>
          <h2 class="font-bold text-slate-800 text-base">📑 थोक कर रसीद वाउचर (Bulk Tax Vouchers PDF)</h2>
          <p class="text-xs text-slate-500">कुल ${vouchers.length} वाउचर देवनागरी हिंदी प्रारूप में तैयार हैं</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="window.print()" class="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg shadow flex items-center gap-2 cursor-pointer transition">
            🖨️ PDF सेव करें / प्रिंट करें (Print / Save PDF)
          </button>
          <button onclick="window.close()" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition">
            बंद करें (Close)
          </button>
        </div>
      </div>

      <div class="max-w-4xl mx-auto">
        ${vouchersHtml}
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * Export All / Bulk Member Cards to a pristine printable multi-page PDF document
 */
export const exportBulkMemberCardsToPDF = (
  filename: string,
  families: any[],
  taxes: any[] = [],
  payments: any[] = [],
  officeDetails?: any,
  admin?: any
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('कृपया पॉप-अप की अनुमति दें (Please allow pop-ups for Member Card PDF printing).');
    return;
  }

  const officeTitle = officeDetails?.officeName || (admin?.gramPanchayat ? `ग्राम पंचायत ${admin.gramPanchayat}` : 'कार्यालय ग्राम पंचायत');
  const districtName = officeDetails?.district || admin?.district || 'मध्य प्रदेश';
  const blockName = officeDetails?.block || admin?.block || '';
  const secretaryName = officeDetails?.secretaryName || admin?.name || 'सचिव / प्राधिकृत अधिकारी';
  const printDate = formatDateDDMMYYYY(new Date());

  const cardsHtml = families
    .map((family, idx) => {
      // Calculate financial summary for this family
      const famTaxes = taxes.filter((t) => t.familyId === family.id);
      const famPayments = payments.filter((p) => p.familyId === family.id);

      const totalDemands = famTaxes.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalPaid = famPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPenalties = famPayments.reduce((sum, p) => sum + (p.penalty || 0), 0);
      const totalConcessions = famPayments.reduce((sum, p) => sum + (p.concession || 0), 0);
      const netTaxCharged = totalDemands + totalPenalties - totalConcessions;
      const totalDues = Math.max(0, netTaxCharged - totalPaid);

      const cardNo = `MC-${family.samagraId || family.id}`;
      const isEven = idx % 2 === 1;

      return `
        <div class="member-card-wrapper border-2 border-slate-800 rounded-2xl bg-white p-5 mb-6 shadow-sm ${isEven && idx < families.length - 1 ? 'page-break' : ''}">
          <!-- Card Header Banner -->
          <div class="bg-gradient-to-r from-teal-800 to-slate-900 text-white -m-5 mb-4 p-4 rounded-t-xl flex items-center justify-between border-b-2 border-amber-400">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
                🏛️
              </div>
              <div>
                <h3 class="font-black text-sm uppercase tracking-wide leading-tight">${officeTitle}</h3>
                <p class="text-[11px] text-teal-200 font-medium">
                  ${blockName ? `जनपद: ${blockName} | ` : ''}जिला: ${districtName} | मध्य प्रदेश
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="inline-block px-3 py-1 bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg tracking-wider uppercase shadow-xs">
                सदस्य पहचान पत्र (MEMBER ID)
              </span>
              <div class="text-[10px] text-teal-200 mt-0.5 font-mono">कार्ड क्र: ${cardNo}</div>
            </div>
          </div>

          <!-- Beneficiary Identification Grid -->
          <div class="grid grid-cols-3 gap-4 mb-4">
            <!-- Left 2 Cols: Details -->
            <div class="col-span-2 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div class="flex items-start justify-between border-b border-slate-200 pb-2">
                <div>
                  <span class="text-[11px] text-slate-500 font-semibold">हितग्राही का पूरा नाम (Beneficiary Name):</span>
                  <div class="text-base font-black text-slate-900 leading-tight">
                    ${family.name} ${family.surname}
                  </div>
                  <div class="text-xs text-slate-600 font-medium mt-0.5">
                    पिता / पति: <strong class="text-slate-800">${family.guardianName || family.fatherHusbandName || '-'}</strong>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black border ${
                    family.category === 'BPL'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : family.category === 'DIVYANG'
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : 'bg-blue-100 text-blue-900 border-blue-300'
                  }">
                    ${family.category || 'APL'}
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span class="text-slate-500 text-[10px]">समग्र आईडी (Samagra ID):</span>
                  <div class="font-mono font-bold text-slate-900 text-xs">${family.samagraId || '-'}</div>
                </div>
                <div>
                  <span class="text-slate-500 text-[10px]">परिवार आईडी (Family ID):</span>
                  <div class="font-mono font-bold text-slate-900 text-xs">${family.familyId || '-'}</div>
                </div>
                <div>
                  <span class="text-slate-500 text-[10px]">वार्ड क्रमांक (Ward No):</span>
                  <div class="font-bold text-slate-900 text-xs">वार्ड क्र. ${family.wardNo || '01'}</div>
                </div>
                <div>
                  <span class="text-slate-500 text-[10px]">मोहल्ला / क्षेत्र (Muhalla):</span>
                  <div class="font-bold text-teal-800 text-xs">${family.muhalla || '-'}</div>
                </div>
                <div>
                  <span class="text-slate-500 text-[10px]">मोबाइल नंबर (Mobile):</span>
                  <div class="font-mono font-bold text-slate-900 text-xs">${family.mobile || '-'}</div>
                </div>
                <div>
                  <span class="text-slate-500 text-[10px]">पंजीयन दिनांक (Reg. Date):</span>
                  <div class="font-mono font-bold text-slate-900 text-xs">${formatDateDDMMYYYY(family.registrationDate) || '-'}</div>
                </div>
              </div>
            </div>

            <!-- Right 1 Col: Dues Badge & Official Stamp -->
            <div class="col-span-1 flex flex-col justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <div>
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  कर स्थिति (Tax Dues Status)
                </span>
                <div class="p-2.5 rounded-lg border ${
                  totalDues > 0
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }">
                  <div class="text-[11px] font-bold">${totalDues > 0 ? 'कुल बकाया राशि' : 'सभी कर चुकता'}</div>
                  <div class="text-lg font-black font-mono mt-0.5">
                    ${totalDues > 0 ? `₹${totalDues.toLocaleString('en-IN')}` : '₹0 (NIL)'}
                  </div>
                </div>
                <div class="text-[10px] text-slate-500 mt-2">
                  मांग: ₹${totalDemands.toLocaleString('en-IN')} | जमा: ₹${totalPaid.toLocaleString('en-IN')}
                </div>
              </div>

              <div class="mt-3 pt-2 border-t border-slate-200">
                <div class="inline-block px-2 py-0.5 bg-white border border-teal-300 text-teal-900 font-bold text-[9px] rounded-full">
                  ✓ सत्यापित हितग्राही
                </div>
              </div>
            </div>
          </div>

          <!-- Footer & Authorized Signatures -->
          <div class="flex items-end justify-between pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
            <div>
              <p class="italic">नोट: यह कार्ड ग्राम पंचायत का अधिकृत कम्प्यूटरीकृत सदस्य पहचान पत्र है।</p>
              <p class="text-slate-400">जारी दिनांक: ${printDate}</p>
            </div>
            <div class="text-right">
              <div class="font-bold text-slate-800">${secretaryName}</div>
              <div class="text-slate-500 text-[9px]">सचिव / प्राधिकृत अधिकारी (हस्ताक्षर एवं सील)</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        * {
          font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          body {
            margin: 0;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body class="bg-slate-100 text-slate-900 p-6 min-h-screen">
      <!-- Toolbar -->
      <div class="no-print max-w-4xl mx-auto mb-6 p-4 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-between">
        <div>
          <h2 class="font-bold text-slate-800 text-base">🪪 समस्त सदस्य पहचान पत्र (All Member ID Cards PDF)</h2>
          <p class="text-xs text-slate-500">कुल ${families.length} सदस्य कार्ड उच्च-गुणवत्ता देवनागरी हिंदी प्रारूप में तैयार हैं</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="window.print()" class="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg shadow flex items-center gap-2 cursor-pointer transition">
            🖨️ PDF सेव करें / प्रिंट करें (Print / Save PDF)
          </button>
          <button onclick="window.close()" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition">
            बंद करें (Close)
          </button>
        </div>
      </div>

      <div class="max-w-4xl mx-auto">
        ${cardsHtml}
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * Export Bulk Demand Bills to a high-quality multi-page PDF document grouped by month with all tax types
 */
export const exportBulkDemandBillsToPDF = (
  filename: string,
  demandBills: {
    billNo?: string;
    family: any;
    month: number | string;
    year: number | string;
    monthName: string;
    taxBreakdown: { type: string; currentDemand: number; previousDues: number; total: number }[];
    totalAmount: number;
    issueDate?: string;
    dueDate?: string;
  }[],
  monthLabel: string,
  year: number | string,
  officeDetails?: any,
  admin?: any
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('कृपया पॉप-अप की अनुमति दें (Please allow pop-ups for Demand Bills PDF printing).');
    return;
  }

  const officeTitle = officeDetails?.officeName || (admin?.gramPanchayat ? `ग्राम पंचायत ${admin.gramPanchayat}` : 'कार्यालय ग्राम पंचायत');
  const districtName = officeDetails?.district || admin?.district || 'मध्य प्रदेश';
  const blockName = officeDetails?.block || admin?.block || '';
  const secretaryName = officeDetails?.secretaryName || admin?.name || 'सचिव (Gram Panchayat Secretary)';
  const printDate = formatDateDDMMYYYY(new Date());

  const billsHtml = demandBills
    .map((item, idx) => {
      const { family, monthName, year: billYear, taxBreakdown, totalAmount, billNo, dueDate, issueDate } = item;
      const displayBillNo = billNo || `DB-${billYear}-${String(item.month).padStart(2, '0')}-${family.samagraId || family.id}`;
      const displayIssueDate = issueDate ? formatDateDDMMYYYY(issueDate) : printDate;
      const displayDueDate = dueDate ? formatDateDDMMYYYY(dueDate) : '15 दिवस के भीतर';
      const isEven = idx % 2 === 1;

      const taxRows = taxBreakdown.map((t) => `
        <tr>
          <td class="p-2 border border-slate-300 font-semibold text-slate-800">${t.type}</td>
          <td class="p-2 border border-slate-300 text-right font-mono">₹${Number(t.previousDues || 0).toLocaleString('en-IN')}</td>
          <td class="p-2 border border-slate-300 text-right font-mono font-semibold">₹${Number(t.currentDemand || 0).toLocaleString('en-IN')}</td>
          <td class="p-2 border border-slate-300 text-right font-mono font-bold text-teal-900">₹${Number(t.total || 0).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');

      return `
        <div class="demand-bill-wrapper border-2 border-teal-800 rounded-2xl bg-white p-5 mb-6 shadow-sm ${isEven && idx < demandBills.length - 1 ? 'page-break' : ''}">
          <!-- Bill Header -->
          <div class="bg-teal-800 text-white -m-5 mb-4 p-4 rounded-t-xl flex items-center justify-between border-b-2 border-amber-400">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">🏛️</div>
              <div>
                <h3 class="font-black text-sm uppercase tracking-wide leading-tight">${officeTitle}</h3>
                <p class="text-[11px] text-teal-200 font-medium">
                  ${blockName ? `जनपद: ${blockName} | ` : ''}जिला: ${districtName} | मध्य प्रदेश
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="inline-block px-3 py-1 bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg uppercase">
                कर मांग पत्र / बिल (TAX DEMAND BILL)
              </span>
              <div class="text-[10px] text-teal-200 mt-0.5 font-bold">माह: ${monthName} ${billYear}</div>
            </div>
          </div>

          <!-- Metadata Bar -->
          <div class="bg-slate-100 -mx-5 -mt-4 mb-3 px-5 py-2 border-b border-slate-200 grid grid-cols-3 gap-2 text-xs">
            <div><span class="text-slate-500">बिल क्रमांक:</span> <strong class="text-slate-900 font-mono">${displayBillNo}</strong></div>
            <div><span class="text-slate-500">जारी दिनांक:</span> <strong class="text-slate-900 font-mono">${displayIssueDate}</strong></div>
            <div class="text-right"><span class="text-slate-500">अंतिम तिथि:</span> <strong class="text-rose-700 font-mono">${displayDueDate}</strong></div>
          </div>

          <!-- Beneficiary Details Grid -->
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs mb-3">
            <div>
              <div class="text-slate-500 text-[11px]">करदाता / हितग्राही का विवरण:</div>
              <div class="font-black text-slate-900 text-sm">${family.name} ${family.surname}</div>
              <div class="text-slate-700 mt-0.5">पिता/पति: <strong>${family.guardianName || family.fatherHusbandName || '-'}</strong></div>
              <div class="text-slate-600 mt-0.5">श्रेणी: <strong class="text-teal-800">${family.category || 'APL'}</strong> | मोबाइल: <strong class="font-mono">${family.mobile || '-'}</strong></div>
            </div>
            <div>
              <div class="text-slate-500 text-[11px]">स्थान एवं पहचान विवरण:</div>
              <div class="text-slate-700">समग्र आईडी: <strong class="text-slate-900 font-mono">${family.samagraId || '-'}</strong> | परिवार आईडी: <strong class="text-slate-900 font-mono">${family.familyId || '-'}</strong></div>
              <div class="text-slate-700 mt-0.5">वार्ड क्रमांक: <strong class="text-slate-900">वार्ड क्र. ${family.wardNo || '01'}</strong></div>
              <div class="text-slate-900 font-bold mt-0.5">मोहल्ला (Muhalla): <span class="text-teal-800">${family.muhalla || '-'}</span></div>
            </div>
          </div>

          <!-- Tax Breakup Table with All Tax Types -->
          <table class="w-full text-xs border-collapse border border-slate-300 mb-3">
            <thead>
              <tr class="bg-teal-50 text-teal-950 font-bold">
                <th class="p-2 text-left border border-slate-300">कर का प्रकार (Tax Heads)</th>
                <th class="p-2 text-right border border-slate-300 w-28">पूर्व बकाया (₹)</th>
                <th class="p-2 text-right border border-slate-300 w-28">मासिक मांग (₹)</th>
                <th class="p-2 text-right border border-slate-300 w-32">कुल देय राशि (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${taxRows}
              <tr class="bg-teal-100/70 font-black text-teal-950 text-sm">
                <td class="p-2 border border-slate-300 text-left">कुल देय कर राशि (Total Payable Amount)</td>
                <td class="p-2 border border-slate-300 text-right font-mono">₹${taxBreakdown.reduce((s, t) => s + (t.previousDues || 0), 0).toLocaleString('en-IN')}</td>
                <td class="p-2 border border-slate-300 text-right font-mono">₹${taxBreakdown.reduce((s, t) => s + (t.currentDemand || 0), 0).toLocaleString('en-IN')}</td>
                <td class="p-2 border border-slate-300 text-right font-mono text-teal-900 text-base">₹${totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <!-- Statutory Notice & Signatures -->
          <div class="bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg text-[11px] text-amber-950 mb-3">
            <strong>⚠️ महत्वपूर्ण सूचना:</strong> कृपया नियत अंतिम तिथि से पूर्व देय कर राशि ग्राम पंचायत कार्यालय में जमा कर अधिकृत रसीद प्राप्त करें। निर्धारित अवधि में भुगतान न करने पर नियमानुसार अधिभार अथवा वैधानिक कार्रवाई की जा सकती है।
          </div>

          <div class="flex items-end justify-between pt-1 text-[11px] text-slate-500">
            <div>
              <p>कर संग्रहण केंद्र: ग्राम पंचायत कार्यालय | ई-टैक्स पोर्टल</p>
            </div>
            <div class="text-right">
              <div class="h-4"></div>
              <strong class="text-slate-900">${secretaryName}</strong>
              <p class="text-[10px] text-slate-500">सचिव / प्राधिकृत हस्ताक्षरकर्ता</p>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        * {
          font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          body {
            margin: 0;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body class="bg-slate-100 text-slate-900 p-6 min-h-screen">
      <!-- Toolbar -->
      <div class="no-print max-w-4xl mx-auto mb-6 p-4 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-between">
        <div>
          <h2 class="font-bold text-slate-800 text-base">📑 माहवार थोक कर मांग पत्र (Bulk Tax Demand Bills PDF)</h2>
          <p class="text-xs text-slate-500">अवधि: ${monthLabel} ${year} | कुल ${demandBills.length} मांग पत्र समस्त कर विवरण एवं मोहल्ला नाम सहित तैयार हैं</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="window.print()" class="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg shadow flex items-center gap-2 cursor-pointer transition">
            🖨️ PDF सेव करें / प्रिंट करें (Print / Save PDF)
          </button>
          <button onclick="window.close()" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition">
            बंद करें (Close)
          </button>
        </div>
      </div>

      <div class="max-w-4xl mx-auto">
        ${billsHtml}
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
