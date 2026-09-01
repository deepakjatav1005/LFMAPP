import React, { useState, useMemo } from 'react';
import { Family, Tax, OfficeDetails, Admin, TaxType } from '../types';
import ViewHeader from './ViewHeader';
import OfficialVoucherHeader from './OfficialVoucherHeader';
import {
  getCleanOfficeTitle,
  triggerPrint,
  formatDateDDMMYYYY,
  getOfficeLogoUrl,
  downloadElementAsPDF,
  openInStandaloneTab
} from '../utils/printUtils';

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
              type="button"
              onClick={async () => {
                const title = batchNoticeMode
                  ? `DemandNotices_Batch_${formatDateDDMMYYYY(issueDateInput)}`
                  : `DemandNotice_${currentFamily ? currentFamily.name : 'All'}`;
                await downloadElementAsPDF('demand-notice-printable-area', title, 'portrait');
              }}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>📥</span>
              <span>{isHindi ? 'PDF डाउनलोड करें' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const title = batchNoticeMode
                  ? `DemandNotices_Batch_${formatDateDDMMYYYY(issueDateInput)}`
                  : `DemandNotice_${currentFamily ? currentFamily.name : 'All'}`;
                openInStandaloneTab('demand-notice-printable-area', title, 'portrait');
              }}
              className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
              title="नये विंडो में खोलकर सीधे प्रिंट या PDF सेव करें"
            >
              <span>↗️</span>
              <span>{isHindi ? 'नये टैब में' : 'New Tab'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  triggerPrint('demand-notice-printable-area', {
                    title: batchNoticeMode
                      ? `DemandNotices_Batch_${formatDateDDMMYYYY(issueDateInput)}`
                      : `DemandNotice_${currentFamily ? currentFamily.name : 'All'}`
                  });
                } catch (e) {
                  console.error('Print demand notice failed:', e);
                }
              }}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>🖨️</span>
              <span>{isHindi ? 'प्रिंट करें (Ctrl+P)' : 'Print Notice'}</span>
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
      <div id="demand-notice-printable-area" className="space-y-12">
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
                  adminPanchayat={admin?.gramPanchayat}
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
              adminPanchayat={admin?.gramPanchayat}
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
  adminPanchayat?: string;
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
  adminPanchayat,
  serialNo,
  issueDate,
  dueDate,
  remarks,
  numberToWords,
  monthNames,
  isHindi,
}) => {
  return (
    <div className="demand-notice-card printable-area bg-white p-6 sm:p-8 rounded-2xl shadow-xl border-2 border-dashed border-amber-400 max-w-3xl mx-auto space-y-5 text-slate-900 font-sans print:shadow-none print:border-2 print:border-slate-800 print:rounded-xl print:p-6 print:m-0 print:max-w-none page-break-inside-avoid page-break-after-always">
      {/* 1. STANDARDIZED OFFICIAL VOUCHER HEADER (MATCHING RECEIPT PAGE) */}
      <OfficialVoucherHeader
        officeDetails={officeDetails}
        adminPanchayat={officeDetails?.gramPanchayat || adminPanchayat}
        voucherTitle="बकाया कर मांग नोटिस प्रपत्र (OFFICIAL TAX DEMAND NOTICE VOUCHER)"
        badgeBgColor="bg-amber-50 text-amber-950 border-amber-300"
      />

      {/* 2. DISPATCH METADATA & ISSUE DATE BAR */}
      <div className="flex flex-wrap justify-between items-center text-xs text-slate-700 border-b pb-3 border-slate-200 font-mono gap-2">
        <div>
          <span className="font-bold text-slate-800">प्रेषण क्रमांक (Dispatch No):</span>{' '}
          <strong className="text-amber-900 text-sm font-black underline">{serialNo}</strong>
        </div>
        <div>
          <span className="font-bold text-slate-800">नोटिस दिनांक (Issue Date):</span>{' '}
          <strong className="text-slate-900">{formatDateDDMMYYYY(issueDate)}</strong>
        </div>
      </div>

      {/* 3. BENEFICIARY TAXPAYER DETAILS BOX (MATCHING RECEIPT DESIGN) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
        <div className="flex items-center justify-between border-b pb-1.5 border-slate-200">
          <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
            प्रति (To, Taxpayer Beneficiary):
          </p>
          <span className="bg-amber-100 text-amber-950 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px]">
            श्रेणी: {family.category || 'APL'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
          <div>
            <span className="text-slate-500">करदाता / मुखिया का नाम:</span>{' '}
            <strong className="text-slate-950 font-black">{family.name} {family.surname}</strong>
          </div>
          <div>
            <span className="text-slate-500">पिता/पति का नाम:</span>{' '}
            <strong className="text-slate-900">{family.guardianName || (family as any)?.fatherHusbandName || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-slate-500">समग्र सदस्य आईडी (Samagra ID):</span>{' '}
            <strong className="text-slate-900 font-mono">{family.samagraId}</strong>
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
            <strong className="font-mono">{family.mobile}</strong>
          </div>
        </div>
      </div>

      {/* 4. OFFICIAL NOTICE STATEMENT */}
      <div className="text-xs leading-relaxed text-slate-800 space-y-1 text-justify font-sans bg-amber-50/50 border border-amber-200/60 p-3 rounded-xl">
        <p className="font-bold text-slate-900">
          महोदय / महोदया,
        </p>
        <p>
          <strong>{getCleanOfficeTitle(officeDetails, officeDetails.gramPanchayat)}</strong> अभिलेखानुसार आपके नाम पर निम्नलिखित विवरण के अनुसार विभिन्न करों (संपत्ति कर, जल कर, प्रकाश कर, स्वच्छता कर आदि) की राशि बकाया लंबित है। कृपया निर्धारित अंतिम तिथि से पूर्व कर राशि का भुगतान सुनिश्चित करें:
        </p>
      </div>

      {/* 5. ITEMIZED TAX DUES BREAKDOWN TABLE */}
      <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100 font-bold text-slate-800 uppercase">
            <tr>
              <th className="px-3 py-2 text-center w-12 border-r border-slate-200">क्र.</th>
              <th className="px-3 py-2 text-left border-r border-slate-200">कर का प्रकार (Tax Type)</th>
              <th className="px-3 py-2 text-center border-r border-slate-200">मांग अवधि (Charged Period)</th>
              <th className="px-3 py-2 text-right">देय बकाया राशि (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {pendingTaxes.length > 0 ? (
              pendingTaxes.map((tax, idx) => (
                <tr key={tax.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-center font-mono font-bold border-r border-slate-100">{idx + 1}</td>
                  <td className="px-3 py-2 border-r border-slate-100 font-bold text-slate-900">{tax.type}</td>
                  <td className="px-3 py-2 text-center font-mono border-r border-slate-100">
                    {monthNames[tax.month - 1] || tax.month}, {tax.year}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-950">
                    ₹{tax.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-500 font-bold">
                  इस करदाता का कोई पुराना बकाया लंबित नहीं है।
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-amber-50/80 font-black border-t-2 border-amber-300 text-slate-950">
            <tr>
              <td colSpan={3} className="px-3 py-2.5 text-right uppercase border-r border-amber-200 text-xs sm:text-sm">
                कुल देय बकाया कर राशि (Total Outstanding Dues):
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-sm sm:text-base text-amber-950 underline">
                ₹{totalPendingAmount.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 6. AMOUNT IN WORDS & PAYMENT DEADLINE DIRECTIVE */}
      <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-xs space-y-1.5">
        <p className="font-bold text-amber-950">
          बकाया राशि शब्दों में: <span className="text-slate-900 font-extrabold underline">{numberToWords(totalPendingAmount)}</span>
        </p>
        <p className="font-extrabold text-rose-900 text-xs sm:text-sm">
          ⚠️ भुगतान की अंतिम तिथि (Payment Due Date): <span className="underline font-mono">{formatDateDDMMYYYY(dueDate)}</span> (तक अनिवार्य रूप से जमा करें)
        </p>
        {remarks && (
          <p className="text-amber-900 text-[11px] italic">
            निर्देश: {remarks}
          </p>
        )}
      </div>

      {/* 7. PAYMENT OPTIONS & BANK ACCOUNT DETAILS */}
      <div className="border border-slate-200 p-3 rounded-xl text-xs bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="font-extrabold text-slate-900 uppercase border-b pb-1 mb-1 text-[11px]">
            🏦 बैंक खाते में सीधे कर भुगतान हेतु विवरण:
          </p>
          <p>बैंक नाम: <strong>{officeDetails.bankName || 'भारतीय स्टेट बैंक (SBI)'}</strong></p>
          <p>खाताधारक: <strong>{officeDetails.accountName || officeDetails.officeName}</strong></p>
          <p>खाता क्रमांक: <strong className="font-mono text-emerald-800">{officeDetails.accountNumber}</strong></p>
          <p>IFSC कोड: <strong className="font-mono">{officeDetails.ifscCode}</strong></p>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3">
          {officeDetails.qrCodeUrl && (
            <img src={officeDetails.qrCodeUrl} alt="UPI QR" className="w-14 h-14 object-contain border border-slate-300 bg-white rounded p-1" />
          )}
          <div className="text-[11px] text-slate-700">
            <p className="font-bold text-slate-900">📱 UPI / QR Code द्वारा ऑनलाइन भुगतान:</p>
            <p className="text-[10px] text-slate-600">गूगल पे, फोनपे, पेटीएम या भीम ऐप से क्यूआर कोड स्कैन कर भुगतान करें एवं ऑनलाइन रसीद प्राप्त करें।</p>
          </div>
        </div>
      </div>

      {/* 8. OFFICIAL SIGNATURES & STAMP FOOTER (MATCHING RECEIPT FORMAT) */}
      <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-xs text-slate-800">
        {/* Left: Panchayat Seal Stamp Box */}
        <div className="text-center">
          <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-[9px] text-slate-400 bg-slate-50 font-mono">
            <span>[ कार्यालय मुहर ]</span>
            <span className="text-[8px] mt-0.5 text-slate-500">Panchayat Stamp</span>
          </div>
          <span className="block mt-1 font-bold text-slate-700 text-[10px]">ग्राम पंचायत सील</span>
        </div>

        {/* Center: Sarpanch Sign */}
        <div className="text-center space-y-6">
          <div className="border-b border-slate-300 w-32 mx-auto"></div>
          <div>
            <p className="font-bold text-slate-900 text-xs">{officeDetails.sarpanchName || 'सरपंच'}</p>
            <p className="text-[10px] text-slate-500">ग्राम पंचायत सरपंच</p>
          </div>
        </div>

        {/* Right: Secretary Sign */}
        <div className="text-center space-y-6">
          <div className="border-b-2 border-slate-800 w-44 mx-auto"></div>
          <div>
            <p className="font-black text-slate-950 text-xs">{officeDetails.secretaryName || 'ग्राम पंचायत सचिव'}</p>
            <p className="font-extrabold text-slate-900 text-[10px]">ग्राम पंचायत सचिव / आदेशानुसार</p>
            <p className="text-[9px] text-slate-500">{officeDetails.officeName || 'ग्राम पंचायत'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandNoticeView;
