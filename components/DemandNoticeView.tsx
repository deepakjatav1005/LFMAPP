import React, { useState, useMemo } from 'react';
import { Family, Tax, OfficeDetails, Admin, TaxType } from '../types';
import ViewHeader from './ViewHeader';
import { getCleanOfficeTitle, triggerPrint, formatDateDDMMYYYY, getOfficeLogoUrl } from '../utils/printUtils';

interface DemandNoticeViewProps {
  families: Family[];
  taxes: Tax[];
  officeDetails: OfficeDetails;
  admin: Admin | null;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const DemandNoticeView: React.FC<DemandNoticeViewProps> = ({
  families,
  taxes,
  officeDetails,
  admin,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(families[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [serialNoInput, setSerialNoInput] = useState<string>('क्र. / ग्रा.पं. / 2026 / 101');
  const [issueDateInput, setIssueDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Default deadline: 15 days from today
  const defaultDeadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dueDateInput, setDueDateInput] = useState<string>(defaultDeadline);
  
  const [customRemarks, setCustomRemarks] = useState<string>(
    'कृपया अंतिम तिथि से पूर्व बकाया कर राशि जमा कर रसीद प्राप्त करें। नियत समय में भुगतान न करने पर नियमानुसार वैधानिक कार्रवाई एवं सेवा विच्छेदन किया जा सकता है।'
  );

  const [batchNoticeMode, setBatchNoticeMode] = useState<boolean>(false);

  // Compute pending taxes for each family
  const familyDuesMap = useMemo(() => {
    const map = new Map<string, { pendingTaxes: Tax[]; totalAmount: number }>();
    families.forEach((fam) => {
      const famTaxes = taxes.filter((t) => t.familyId === fam.id && t.status !== 'PAID');
      const totalAmount = famTaxes.reduce((sum, t) => sum + t.amount, 0);
      map.set(fam.id, { pendingTaxes: famTaxes, totalAmount });
    });
    return map;
  }, [families, taxes]);

  // Beneficiaries with pending dues
  const familiesWithDues = useMemo(() => {
    return families.filter((f) => {
      const dues = familyDuesMap.get(f.id);
      return dues && dues.totalAmount > 0;
    });
  }, [families, familyDuesMap]);

  // Filtered families for select/search
  const filteredFamilies = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return families;
    return families.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.surname.toLowerCase().includes(q) ||
        f.samagraId.toLowerCase().includes(q) ||
        (f.familyId && f.familyId.toLowerCase().includes(q)) ||
        f.mobile.toLowerCase().includes(q) ||
        (f.wardNo && f.wardNo.toLowerCase().includes(q))
    );
  }, [families, searchTerm]);

  // Selected Family & pending taxes
  const currentFamily = families.find((f) => f.id === selectedFamilyId) || families[0];
  const currentDuesInfo = currentFamily ? familyDuesMap.get(currentFamily.id) : null;
  const pendingTaxes = currentDuesInfo ? currentDuesInfo.pendingTaxes : [];
  const totalPendingAmount = currentDuesInfo ? currentDuesInfo.totalAmount : 0;

  // Function to convert number to Hindi words
  const numberToHindiWords = (num: number): string => {
    if (!num || num <= 0) return 'शून्य रुपये मात्र';
    return `रुपये ${num.toLocaleString('hi-IN')} मात्र`;
  };

  const monthNamesHindi = [
    'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl animate-fade-in">
      {/* HEADER WITH PRINT / BACK BUTTONS */}
      <ViewHeader
        title={isHindi ? 'बकाया कर मांग नोटिस' : 'Tax Demand Notice Generator'}
        subtitle={isHindi ? 'ग्राम पंचायत सचिव की ओर से बकाएदार करदाताओं हेतु आधिकारिक कर मांग नोटिस जनरेट एवं डाउनलोड करें।' : 'Generate & download official tax demand notices for defaulting taxpayers on behalf of the Gram Panchayat Secretary.'}
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
      />

      {/* CONTROL PANEL CARD (PRINT HIDDEN) */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-8 print:hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b pb-4 mb-6 border-slate-200">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>🧾</span> {isHindi ? 'मांग नोटिस सेटिंग्स एवं करदाता चयन' : 'Demand Notice Settings & Taxpayer Selection'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isHindi ? 'क्रमांक, जारी तिथि एवं बकाया करदाता चुनें। आप 1-क्लिक में सभी बकाएदारों का मांग नोटिस प्रिंट कर सकते हैं।' : 'Set dispatch serial number, issue date and select taxpayer. Print all notices in 1-click.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setBatchNoticeMode(!batchNoticeMode)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                batchNoticeMode
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300'
              }`}
            >
              <span>📋</span>
              <span>
                {batchNoticeMode
                  ? (isHindi ? 'एकल करदाता नोटिस (Single View)' : 'Single Notice Mode')
                  : (isHindi ? `समस्त बकाएदार नोटिस [${familiesWithDues.length}]` : `Batch Print All [${familiesWithDues.length}]`)}
              </span>
            </button>

            <button
              onClick={() => {
                try {
                  triggerPrint('printable-area');
                } catch (e) {
                  console.error('Print demand notice failed:', e);
                }
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>🖨️</span>
              <span>{isHindi ? 'मांग नोटिस प्रिंट / PDF डाउनलोड करें' : 'Print / Download Notice PDF'}</span>
            </button>
          </div>
        </div>

        {/* INPUT FORM CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          {/* Dispatch Serial Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isHindi ? 'जारी प्रेषण क्रमांक (Serial No) *' : 'Dispatch Serial No *'}
            </label>
            <input
              type="text"
              value={serialNoInput}
              onChange={(e) => setSerialNoInput(e.target.value)}
              placeholder="e.g. क्र. / ग्रा.पं. / 2026 / 101"
              className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
              required
            />
          </div>

          {/* Issue Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isHindi ? 'नोटिस जारी दिनांक (Issue Date) *' : 'Notice Issue Date *'}
            </label>
            <input
              type="date"
              value={issueDateInput}
              onChange={(e) => setIssueDateInput(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
              required
            />
          </div>

          {/* Due Payment Deadline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isHindi ? 'भुगतान की अंतिम समय सीमा (Due Date) *' : 'Payment Deadline *'}
            </label>
            <input
              type="date"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-bold text-rose-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
              required
            />
          </div>

          {/* Search / Select Taxpayer */}
          {!batchNoticeMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {isHindi ? 'करदाता (Beneficiary) खोजें व चुनें *' : 'Select Taxpayer *'}
              </label>
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Type Name / Samagra ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                />
                <select
                  value={selectedFamilyId}
                  onChange={(e) => setSelectedFamilyId(e.target.value)}
                  className="w-full px-3.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
                >
                  {filteredFamilies.map((f) => {
                    const dues = familyDuesMap.get(f.id);
                    const pendingAmt = dues ? dues.totalAmount : 0;
                    return (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.surname} (S-ID: {f.samagraId}) - {pendingAmt > 0 ? `बकाया: ₹${pendingAmt}` : 'कोई बकाया नहीं'}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            {isHindi ? 'विशेष दिशा-निर्देश व टिप्पणी (Notice Remarks / Directives)' : 'Notice Remarks'}
          </label>
          <input
            type="text"
            value={customRemarks}
            onChange={(e) => setCustomRemarks(e.target.value)}
            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary bg-white"
          />
        </div>
      </div>

      {/* NOTICE PRINT CONTAINER */}
      <div className="space-y-12">
        {batchNoticeMode ? (
          // BATCH MODE: Print demand notices for all families with pending dues
          familiesWithDues.length > 0 ? (
            familiesWithDues.map((fam, index) => {
              const dues = familyDuesMap.get(fam.id);
              const pendingList = dues ? dues.pendingTaxes : [];
              const totalAmt = dues ? dues.totalAmount : 0;
              const serialNo = `${serialNoInput}-${index + 1}`;

              return (
                <DemandNoticeDocument
                  key={fam.id}
                  family={fam}
                  pendingTaxes={pendingList}
                  totalPendingAmount={totalAmt}
                  officeDetails={officeDetails}
                  serialNo={serialNo}
                  issueDate={issueDateInput}
                  dueDate={dueDateInput}
                  remarks={customRemarks}
                  numberToWords={numberToHindiWords}
                  monthNames={monthNamesHindi}
                  isHindi={isHindi}
                />
              );
            })
          ) : (
            <div className="p-12 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 font-bold">
              🎉 बधाई! ग्राम पंचायत में किसी भी करदाता का बकाया कर लंबित नहीं है।
            </div>
          )
        ) : (
          // SINGLE NOTICE MODE
          currentFamily && (
            <DemandNoticeDocument
              family={currentFamily}
              pendingTaxes={pendingTaxes}
              totalPendingAmount={totalPendingAmount}
              officeDetails={officeDetails}
              serialNo={serialNoInput}
              issueDate={issueDateInput}
              dueDate={dueDateInput}
              remarks={customRemarks}
              numberToWords={numberToHindiWords}
              monthNames={monthNamesHindi}
              isHindi={isHindi}
            />
          )
        )}
      </div>
    </div>
  );
};

// SUB-COMPONENT: OFFICIAL DEMAND NOTICE DOCUMENT (A4 PRINT OPTIMIZED)
interface DemandNoticeDocumentProps {
  family: Family;
  pendingTaxes: Tax[];
  totalPendingAmount: number;
  officeDetails: OfficeDetails;
  serialNo: string;
  issueDate: string;
  dueDate: string;
  remarks: string;
  numberToWords: (n: number) => string;
  monthNames: string[];
  isHindi: boolean;
}

const DemandNoticeDocument: React.FC<DemandNoticeDocumentProps> = ({
  family,
  pendingTaxes,
  totalPendingAmount,
  officeDetails,
  serialNo,
  issueDate,
  dueDate,
  remarks,
  numberToWords,
  monthNames,
  isHindi,
}) => {
  return (
    <div id="printable-area" className="printable-area bg-white p-8 sm:p-10 rounded-2xl shadow-xl border-2 border-slate-300 max-w-4xl mx-auto space-y-6 text-slate-900 font-serif print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none page-break-after-always">
      {/* 1. OFFICIAL LETTERHEAD HEADER */}
      <div className="border-b-2 border-slate-900 pb-4 text-center relative">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Office Logo */}
          <div className="w-20 h-20 shrink-0 flex items-center justify-center">
            <img
              src={getOfficeLogoUrl(officeDetails?.logoUrl)}
              alt="Logo"
              className="max-h-20 max-w-20 object-contain drop-shadow-xs"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('data:image/svg+xml')) {
                  target.src = getOfficeLogoUrl(undefined);
                }
              }}
            />
          </div>

          {/* Center: Gram Panchayat Office Details */}
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
              {getCleanOfficeTitle(officeDetails, officeDetails.gramPanchayat)}
            </h1>
            <p className="text-xs font-sans text-slate-700 font-semibold">
              {officeDetails.address || 'ग्राम पंचायत भवन, मध्य प्रदेश'}
            </p>
            <p className="text-[11px] font-sans text-slate-600">
              जनपद पंचायत: <strong>{officeDetails.block || officeDetails.gramPanchayat}</strong> | जिला: <strong>{officeDetails.district || officeDetails.gramPanchayat} ({officeDetails.state || 'म.प्र.'})</strong> | मो: <strong>{officeDetails.contactPhone}</strong>
            </p>
          </div>

          {/* Right: Payment QR Code if available */}
          <div className="w-20 h-20 shrink-0 flex flex-col items-center justify-center text-center">
            {officeDetails.qrCodeUrl ? (
              <img src={officeDetails.qrCodeUrl} alt="UPI QR" className="w-16 h-16 border border-slate-300 rounded p-0.5" />
            ) : (
              <div className="w-16 h-16 bg-slate-50 border border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400 font-sans">
                [ QR Code ]
              </div>
            )}
            <span className="text-[8px] font-sans font-bold text-slate-500 mt-0.5">UPI Pay</span>
          </div>
        </div>

        {/* Dispatch Serial No & Issue Date Bar */}
        <div className="mt-4 pt-2 border-t border-slate-300 flex flex-wrap justify-between items-center text-xs font-sans font-bold text-slate-800">
          <div>
            <span>प्रेषण क्रमांक (Dispatch No):</span>{' '}
            <strong className="text-slate-950 font-mono text-sm underline">{serialNo}</strong>
          </div>
          <div>
            <span>दिनांक (Issue Date):</span>{' '}
            <strong className="text-slate-950 font-mono text-sm">{formatDateDDMMYYYY(issueDate)}</strong>
          </div>
        </div>
      </div>

      {/* 2. NOTICE SUBJECT HEADING */}
      <div className="text-center py-2 bg-slate-100 border-y-2 border-slate-800 my-2">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase">
          {isHindi ? '॥ बकाया कर भुगतान हेतु आधिकारिक मांग नोटिस ॥' : 'OFFICIAL DEMAND NOTICE FOR PENDING TAXES'}
        </h2>
        <p className="text-xs font-sans font-bold text-slate-700 mt-0.5">
          (म.प्र. पंचायत राज एवं ग्राम स्वराज अधिनियम के अंतर्गत जारी)
        </p>
      </div>

      {/* 3. BENEFICIARY TAXPAYER DETAILS BOX */}
      <div className="bg-slate-50 border-2 border-slate-300 p-4 rounded-xl text-xs font-sans space-y-2">
        <p className="font-extrabold text-slate-900 text-sm border-b pb-1 border-slate-200 uppercase tracking-wider">
          प्रति (To, Taxpayer Beneficiary):
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
          <div>
            <span className="text-slate-500">करदाता का नाम:</span>{' '}
            <strong className="text-slate-950 text-sm font-black">{family.name} {family.surname}</strong>
          </div>
          <div>
            <span className="text-slate-500">पिता/पति का नाम:</span>{' '}
            <strong className="text-slate-900">{family.guardianName || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-slate-500">समग्र आईडी (Samagra ID):</span>{' '}
            <strong className="text-slate-900 font-mono text-sm">{family.samagraId}</strong>
          </div>
          <div>
            <span className="text-slate-500">परिवार आईडी (Family ID):</span>{' '}
            <strong className="text-slate-900 font-mono">{family.familyId || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-slate-500">वार्ड क्र. एवं मुहल्ला:</span>{' '}
            <strong>वार्ड नं. {family.wardNo || '01'}, {family.muhalla || 'ग्राम पंचायत क्षेत्र'}</strong>
          </div>
          <div>
            <span className="text-slate-500">संपर्क मोबाइल:</span>{' '}
            <strong className="font-mono">{family.mobile}</strong> | श्रेणी: <strong>{family.category || 'APL'}</strong> | पंजीयन: <strong>{formatDateDDMMYYYY(family.registrationDate) || 'N/A'}</strong>
          </div>
        </div>
      </div>

      {/* 4. OFFICIAL NOTICE STATEMENT ON BEHALF OF SECRETARY */}
      <div className="text-xs sm:text-sm leading-relaxed text-slate-800 space-y-2 text-justify font-sans">
        <p>
          <strong>महोदय / महोदया,</strong>
        </p>
        <p>
          <strong>{getCleanOfficeTitle(officeDetails, officeDetails.gramPanchayat)}</strong> द्वारा आपको सूचित किया जाता है कि ग्राम पंचायत अभिलेखानुसार आपके नाम पर निम्नलिखित विवरण के अनुसार विभिन्न करों (संपत्ति कर, जल कर, प्रकाश कर, स्वच्छता कर आदि) की कर राशि बकाया लंबित है:
        </p>
      </div>

      {/* 5. ITEMIZED TAX DUES TABLE */}
      <div className="overflow-x-auto font-sans">
        <table className="min-w-full text-xs border-2 border-slate-900 divide-y divide-slate-800">
          <thead className="bg-slate-200 font-black text-slate-900 uppercase">
            <tr>
              <th className="p-2 border-r border-slate-800 text-center w-12">क्र.</th>
              <th className="p-2 border-r border-slate-800 text-left">कर का प्रकार (Tax Type)</th>
              <th className="p-2 border-r border-slate-800 text-center">माह एवं वर्ष (Month / Year)</th>
              <th className="p-2 text-right">देय बकाया राशि (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-medium">
            {pendingTaxes.length > 0 ? (
              pendingTaxes.map((tax, idx) => (
                <tr key={tax.id} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{tax.type}</td>
                  <td className="p-2 border-r border-slate-300 text-center font-mono">
                    {monthNames[tax.month - 1] || tax.month}, {tax.year}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-slate-950 text-sm">
                    ₹{tax.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500 font-bold">
                  इस करदाता का कोई पुराना बकाया लंबित नहीं है।
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-black border-t-2 border-slate-900 text-slate-950">
            <tr>
              <td colSpan={3} className="p-2.5 text-right uppercase border-r border-slate-800 text-sm">
                कुल देय बकाया कर राशि (Total Dues Amount):
              </td>
              <td className="p-2.5 text-right font-mono text-base text-rose-900 underline">
                ₹{totalPendingAmount.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 6. AMOUNT IN WORDS & PAYMENT DEADLINE DIRECTIVE */}
      <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-xl text-xs font-sans space-y-1.5">
        <p className="font-bold text-amber-950">
          बकाया राशि शब्दों में: <span className="text-slate-900 font-extrabold underline">{numberToWords(totalPendingAmount)}</span>
        </p>
        <p className="font-extrabold text-rose-900 text-sm">
          ⚠️ भुगतान की अंतिम तिथि (Payment Deadline): <span className="underline font-mono">{formatDateDDMMYYYY(dueDate)}</span> (तक अनिवार्य रूप से जमा करें)
        </p>
        <p className="text-amber-900 text-[11px] italic">
          नोट: {remarks}
        </p>
      </div>

      {/* 7. PAYMENT OPTIONS & BANK ACCOUNT DETAILS */}
      <div className="border-2 border-slate-300 p-3.5 rounded-xl text-xs font-sans bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="font-extrabold text-slate-900 uppercase border-b pb-1 mb-1 text-[11px]">
            🏦 बैंक खाते में सीधे कर भुगतान हेतु विवरण:
          </p>
          <p>बैंक नाम: <strong>{officeDetails.bankName || 'भारतीय स्टेट बैंक (SBI)'}</strong></p>
          <p>खाताधारक: <strong>{officeDetails.accountName || officeDetails.officeName}</strong></p>
          <p>खाता क्रमांक: <strong className="font-mono text-emerald-800">{officeDetails.accountNumber}</strong></p>
          <p>IFSC कोड: <strong className="font-mono">{officeDetails.ifscCode}</strong></p>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-300 pt-2 md:pt-0 md:pl-3">
          {officeDetails.qrCodeUrl && (
            <img src={officeDetails.qrCodeUrl} alt="UPI QR" className="w-16 h-16 object-contain border border-slate-300 bg-white rounded p-1" />
          )}
          <div className="text-[11px] text-slate-700">
            <p className="font-bold text-slate-900">📱 UPI / QR Code द्वारा ऑनलाइन भुगतान:</p>
            <p className="text-[10px] text-slate-600">गूगल पे, फोनपे, पेटीएम या भीम ऐप से क्यूआर कोड स्कैन कर भुगतान करें एवं ऑनलाइन रसीद प्राप्त करें।</p>
          </div>
        </div>
      </div>

      {/* 8. OFFICIAL SIGNATURES & STAMP FOOTER */}
      <div className="pt-8 border-t-2 border-slate-900 flex justify-between items-end text-xs font-sans text-slate-800">
        {/* Left: Panchayat Seal Stamp Box */}
        <div className="text-center">
          <div className="w-24 h-24 border-2 border-dashed border-slate-400 rounded-2xl flex flex-col items-center justify-center text-[10px] text-slate-400 bg-slate-50 font-mono">
            <span>[ कार्यालय मुहर ]</span>
            <span className="text-[8px] mt-1 text-slate-500">Panchayat Stamp</span>
          </div>
          <span className="block mt-1 font-bold text-slate-700 text-[11px]">ग्राम पंचायत सील</span>
        </div>

        {/* Center: Sarpanch Sign */}
        <div className="text-center space-y-8">
          <div className="border-b border-slate-400 w-36 mx-auto"></div>
          <div>
            <p className="font-bold text-slate-900">{officeDetails.sarpanchName || 'सरपंच'}</p>
            <p className="text-[10px] text-slate-600">ग्राम पंचायत सरपंच</p>
          </div>
        </div>

        {/* Right: Secretary Sign */}
        <div className="text-center space-y-8">
          <div className="border-b-2 border-slate-900 w-48 mx-auto"></div>
          <div>
            <p className="font-black text-slate-950 text-sm">{officeDetails.secretaryName || 'श्री दीपक जाटव'}</p>
            <p className="font-extrabold text-slate-900 text-xs">ग्राम पंचायत सचिव / आदेशानुसार</p>
            <p className="text-[10px] text-slate-600">{officeDetails.officeName || 'ग्राम पंचायत'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandNoticeView;
