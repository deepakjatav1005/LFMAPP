import React, { useState, useEffect } from 'react';
import { TaxType, BeneficiaryCategory, TaxRates, TaxRatesLockInfo } from '../types';
import ViewHeader from './ViewHeader';
import { formatDateDDMMYYYY } from '../utils/printUtils';

interface ManageTaxRatesViewProps {
  taxRates: TaxRates;
  isTaxRatesLocked?: boolean;
  taxRatesLockInfo?: TaxRatesLockInfo;
  onUpdateTaxRates: (newRates: TaxRates, lockInfo?: TaxRatesLockInfo | boolean) => void;
  onToggleLockTaxRates?: (lockInfo: TaxRatesLockInfo | boolean) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const ManageTaxRatesView: React.FC<ManageTaxRatesViewProps> = ({
  taxRates,
  isTaxRatesLocked = false,
  taxRatesLockInfo,
  onUpdateTaxRates,
  onToggleLockTaxRates,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const [rates, setRates] = useState<TaxRates>(taxRates);
  const [isLocked, setIsLocked] = useState<boolean>(
    taxRatesLockInfo?.isLocked ?? isTaxRatesLocked
  );
  const [lockInfo, setLockInfo] = useState<TaxRatesLockInfo>(() => {
    if (taxRatesLockInfo) return taxRatesLockInfo;
    return {
      isLocked: isTaxRatesLocked,
      year: '2026-2027',
      month: 'ALL',
      lockedAt: new Date().toISOString(),
    };
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lock Modal State (Only Year and Month selection)
  const [showLockModal, setShowLockModal] = useState<boolean>(false);
  const [lockSelectedYear, setLockSelectedYear] = useState<string>('2026-2027');
  const [lockSelectedMonth, setLockSelectedMonth] = useState<number | 'ALL'>('ALL');

  // Unlock Modal State
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);

  useEffect(() => {
    setRates(taxRates);
  }, [taxRates]);

  useEffect(() => {
    if (taxRatesLockInfo) {
      setIsLocked(Boolean(taxRatesLockInfo.isLocked));
      setLockInfo(taxRatesLockInfo);
      if (taxRatesLockInfo.year) setLockSelectedYear(String(taxRatesLockInfo.year));
      if (taxRatesLockInfo.month !== undefined) setLockSelectedMonth(taxRatesLockInfo.month);
    } else {
      setIsLocked(isTaxRatesLocked);
    }
  }, [isTaxRatesLocked, taxRatesLockInfo]);

  const categories = [
    { key: BeneficiaryCategory.BPL, label: 'BPL', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    { key: BeneficiaryCategory.APL, label: 'APL', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    { key: BeneficiaryCategory.DIVYANG, label: 'DIVYANG', color: 'bg-purple-50 text-purple-800 border-purple-200' },
    { key: BeneficiaryCategory.OTHER, label: 'OTHER', color: 'bg-slate-50 text-slate-800 border-slate-200' },
  ];

  const monthOptions = isHindi
    ? [
        { value: 'ALL', label: 'पूरे वर्ष हेतु (सभी माह / All Months)' },
        { value: 1, label: '01 - जनवरी (January)' },
        { value: 2, label: '02 - फ़रवरी (February)' },
        { value: 3, label: '03 - मार्च (March)' },
        { value: 4, label: '04 - अप्रैल (April)' },
        { value: 5, label: '05 - मई (May)' },
        { value: 6, label: '06 - जून (June)' },
        { value: 7, label: '07 - जुलाई (July)' },
        { value: 8, label: '08 - अगस्त (August)' },
        { value: 9, label: '09 - सितंबर (September)' },
        { value: 10, label: '10 - अक्टूबर (October)' },
        { value: 11, label: '11 - नवंबर (November)' },
        { value: 12, label: '12 - दिसंबर (December)' },
      ]
    : [
        { value: 'ALL', label: 'Whole Year (All Months)' },
        { value: 1, label: '01 - January' },
        { value: 2, label: '02 - February' },
        { value: 3, label: '03 - March' },
        { value: 4, label: '04 - April' },
        { value: 5, label: '05 - May' },
        { value: 6, label: '06 - June' },
        { value: 7, label: '07 - July' },
        { value: 8, label: '08 - August' },
        { value: 9, label: '09 - September' },
        { value: 10, label: '10 - October' },
        { value: 11, label: '11 - November' },
        { value: 12, label: '12 - December' },
      ];

  const getMonthLabel = (mVal: number | 'ALL' | undefined) => {
    if (mVal === 'ALL' || !mVal) return isHindi ? 'सभी माह (All Months)' : 'All Months';
    const found = monthOptions.find((m) => m.value === mVal);
    return found ? found.label : `माह ${mVal}`;
  };

  const handleRateChange = (taxType: TaxType, category: BeneficiaryCategory, val: number) => {
    if (isLocked) {
      setSuccessMsg(
        isHindi
          ? '⚠️ कर दर सूची वर्तमान में वर्ष एवं माह अनुसार लॉक है! बदलाव करने के लिए दरें अनलॉक करें।'
          : '⚠️ Tax rates are currently locked by year & month! Unlock to modify.'
      );
      setTimeout(() => setSuccessMsg(null), 3500);
      return;
    }

    setRates((prev) => ({
      ...prev,
      [taxType]: {
        ...prev[taxType],
        [category]: Math.max(0, val),
      },
    }));
  };

  const handleApplyBPLDiscount = () => {
    if (isLocked) return;
    setRates((prev) => {
      const updated = { ...prev };
      Object.values(TaxType).forEach((taxType) => {
        const aplRate = updated[taxType]?.[BeneficiaryCategory.APL] || 100;
        updated[taxType] = {
          ...updated[taxType],
          [BeneficiaryCategory.BPL]: Math.round(aplRate * 0.5),
          [BeneficiaryCategory.DIVYANG]: Math.round(aplRate * 0.3),
        };
      });
      return updated;
    });
    setSuccessMsg(
      isHindi
        ? 'BPL हेतु 50% एवं दिव्यांग हेतु 70% छूट दरें लागू की गईं!'
        : 'Applied standard 50% discount for BPL and 70% discount for Divyang beneficiaries!'
    );
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Open lock modal
  const handleOpenLockModal = () => {
    if (isLocked) {
      setShowUnlockModal(true);
      return;
    }
    setShowLockModal(true);
  };

  // Confirm Lock from Modal (selecting Year and Month)
  const handleConfirmLock = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedLockInfo: TaxRatesLockInfo = {
      isLocked: true,
      year: lockSelectedYear,
      month: lockSelectedMonth,
      lockedAt: new Date().toISOString(),
    };

    setIsLocked(true);
    setLockInfo(updatedLockInfo);
    setShowLockModal(false);

    if (onToggleLockTaxRates) {
      onToggleLockTaxRates(updatedLockInfo);
    } else {
      onUpdateTaxRates(rates, updatedLockInfo);
    }

    setSuccessMsg(
      isHindi
        ? `🔒 वर्ष (${updatedLockInfo.year}) एवं माह (${getMonthLabel(updatedLockInfo.month)}) अनुसार कर दरें सफलतापूर्वक लॉक व फिक्स की गईं!`
        : `🔒 Tax rates locked & fixed for Year ${updatedLockInfo.year} & Month (${getMonthLabel(updatedLockInfo.month)})!`
    );
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  // Confirm Unlock
  const handleConfirmUnlock = () => {
    const updatedLockInfo: TaxRatesLockInfo = {
      ...lockInfo,
      isLocked: false,
    };
    setIsLocked(false);
    setLockInfo(updatedLockInfo);
    setShowUnlockModal(false);

    if (onToggleLockTaxRates) {
      onToggleLockTaxRates(updatedLockInfo);
    } else {
      onUpdateTaxRates(rates, updatedLockInfo);
    }

    setSuccessMsg(
      isHindi
        ? '🔓 कर दरें अनलॉक कर दी गईं। अब आप दरों में संशोधन कर सकते हैं।'
        : '🔓 Tax rates unlocked. You can now edit the rates.'
    );
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setSuccessMsg(
        isHindi
          ? '🔒 दरें पहले से लॉक हैं। संशोधन के लिए पहले दरें अनलॉक करें।'
          : '🔒 Rates are locked. Unlock to modify.'
      );
      setTimeout(() => setSuccessMsg(null), 3500);
      return;
    }
    onUpdateTaxRates(rates, lockInfo);
    setSuccessMsg(
      isHindi
        ? 'मासिक कर दरें सफलतापूर्वक सहेजी गईं!'
        : 'Category-wise Monthly Tax Rates saved successfully!'
    );
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in max-w-5xl">
      {/* HEADER */}
      <ViewHeader
        title={isHindi ? "मासिक कर दर सूची एवं लॉक प्रबंधन" : "Monthly Tax Rate & Lock Management"}
        subtitle={
          isHindi
            ? "वर्ष एवं माह चयन कर विभिन्न कर प्रकारों हेतु श्रेणीवार मासिक कर दरें निर्धारित एवं लॉक करें।"
            : "Select Year and Month to configure and lock monthly tax rates."
        }
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyBPLDiscount}
              disabled={isLocked}
              className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                isLocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <span>⚡</span>
              <span>{isHindi ? 'छूट दर लागू करें' : 'Apply Concession'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenLockModal}
              className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                isLocked
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <span>{isLocked ? '🔓' : '🔒'}</span>
              <span>
                {isLocked
                  ? isHindi
                    ? 'दरें अनलॉक करें'
                    : 'Unlock Rates'
                  : isHindi
                  ? 'वर्ष एवं माह से लॉक करें'
                  : 'Lock by Year & Month'}
              </span>
            </button>
          </div>
        }
      />

      {successMsg && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-center gap-3 animate-slide-up font-bold text-xs shadow-sm">
          <span className="text-xl">ℹ️</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* OFFICIAL LOCK STATUS BANNER */}
      {isLocked ? (
        <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-amber-100/70 to-emerald-50 border-2 border-amber-400 rounded-2xl shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-300 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <div>
                <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                  {isHindi ? 'कर दर सूची लॉक एवं फिक्स है (Tax Rates Locked & Fixed)' : 'Tax Rates are Locked & Fixed'}
                </h3>
                <p className="text-xs text-amber-800 font-medium">
                  {isHindi
                    ? 'निर्धारित वर्ष एवं माह अनुसार दरें फिक्स हैं। नया कर मांग पत्र इसी दर पर बनेगा।'
                    : 'Rates are officially locked and fixed for the selected year and month.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUnlockModal(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1 self-end sm:self-auto"
            >
              <span>🔓</span>
              <span>{isHindi ? 'संशोधन हेतु अनलॉक करें' : 'Unlock to Edit'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/80 p-3 rounded-xl border border-amber-200 shadow-xs">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">
                {isHindi ? 'लागू वर्ष (Effective Year)' : 'Effective Year'}
              </span>
              <span className="text-sm font-black text-slate-900">{lockInfo.year || '2026-2027'}</span>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-amber-200 shadow-xs">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">
                {isHindi ? 'लागू माह (Effective Month)' : 'Effective Month'}
              </span>
              <span className="text-sm font-black text-slate-900">{getMonthLabel(lockInfo.month)}</span>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-amber-200 shadow-xs">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">
                {isHindi ? 'लॉक तिथि (Locked Date)' : 'Locked Date'}
              </span>
              <span className="text-xs font-bold text-slate-900">
                📅 {formatDateDDMMYYYY(lockInfo.lockedAt) || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔓</span>
            <div>
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                {isHindi ? 'स्थिति: दरें अनलॉक हैं (Status: Unlocked)' : 'Status: Rates are Unlocked'}
              </h4>
              <p className="text-xs text-emerald-800 font-medium">
                {isHindi
                  ? 'आप वर्तमान दरों में संशोधन कर सकते हैं। संशोधन के उपरांत वर्ष व माह चुनकर दरें लॉक करें।'
                  : 'You can edit rates below. Click Lock by Year & Month to fix the rates.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenLockModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
          >
            <span>🔒</span>
            <span>{isHindi ? 'दरें लॉक करें (Lock Rates)' : 'Lock Rates'}</span>
          </button>
        </div>
      )}

      {/* FORM MATRIX */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden space-y-0">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              {isHindi ? 'मासिक कर दर सूची (₹ प्रति माह)' : 'Monthly Tax Rates Matrix (₹ per month)'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {isHindi ? 'सभी कर प्रकारों हेतु श्रेणी अनुसार मासिक शुल्क' : 'Category-wise monthly rates for all tax types'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                isLocked
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {isLocked
                ? isHindi
                  ? `🔒 लॉक: ${lockInfo.year} (${getMonthLabel(lockInfo.month)})`
                  : `🔒 Locked: ${lockInfo.year}`
                : isHindi
                ? '🔓 अनलॉक है'
                : '🔓 Unlocked'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100/80">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase w-64">
                  {isHindi ? 'कर प्रकार' : 'Tax Type'}
                </th>
                {categories.map((cat) => (
                  <th key={cat.key} className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase">
                    <span className={`inline-block px-2.5 py-1 rounded-lg border text-[11px] ${cat.color}`}>
                      {cat.key}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {Object.values(TaxType).map((taxType) => (
                <tr key={taxType} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      <span>{taxType}</span>
                    </div>
                  </td>

                  {categories.map((cat) => {
                    const currentVal = rates[taxType]?.[cat.key] ?? 0;

                    return (
                      <td key={cat.key} className="px-4 py-3 text-center">
                        <div className="relative inline-block w-28">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-bold pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            disabled={isLocked}
                            value={currentVal}
                            onChange={(e) => handleRateChange(taxType, cat.key, Number(e.target.value))}
                            className={`w-full pl-6 pr-2 py-1.5 text-sm font-mono font-bold text-slate-900 border rounded-lg text-right focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${
                              isLocked
                                ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200 select-none'
                                : 'bg-slate-50 border-slate-300'
                            }`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-medium">
            {isHindi
              ? '* निर्धारित मासिक कर दरें कर मांग पत्र जारी करते समय श्रेणी अनुसार स्वचालित लागू होंगी।'
              : '* These rates will automatically apply per category when generating monthly tax bills.'}
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              {isHindi ? 'निरस्त करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isLocked}
              className={`px-6 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border ${
                isLocked
                  ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                  : 'text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
              }`}
            >
              <span>💾</span>
              <span>{isHindi ? 'दरें सहेजें' : 'Save Tax Rates'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* LOCK CONFIRMATION & SELECTION MODAL */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔒</span>
                <h3 className="text-base font-bold">
                  {isHindi ? 'कर दर सूची लॉक एवं फिक्स करें' : 'Lock & Fix Tax Rates'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form: Only Year and Month */}
            <form onSubmit={handleConfirmLock} className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 font-medium">
                {isHindi
                  ? 'कर दरें लॉक करने हेतु लागू वित्तीय वर्ष एवं माह चुनें:'
                  : 'Select Financial Year and Month to lock and fix tax rates:'}
              </p>

              <div className="space-y-4">
                {/* YEAR SELECTION */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    {isHindi ? '1. लागू वर्ष / वित्तीय वर्ष' : '1. Effective Year'}
                  </label>
                  <select
                    value={lockSelectedYear}
                    onChange={(e) => setLockSelectedYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="2026-2027">2026-2027 (वर्तमान वित्तीय वर्ष)</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2027-2028">2027-2028</option>
                    <option value="2026">2026 (कैलेंडर वर्ष)</option>
                    <option value="2025">2025</option>
                    <option value="2027">2027</option>
                  </select>
                </div>

                {/* MONTH SELECTION */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    {isHindi ? '2. लागू माह / अवधि' : '2. Effective Month'}
                  </label>
                  <select
                    value={String(lockSelectedMonth)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLockSelectedMonth(v === 'ALL' ? 'ALL' : Number(v));
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {monthOptions.map((m) => (
                      <option key={String(m.value)} value={String(m.value)}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SUMMARY WARNING */}
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] space-y-1">
                <p className="font-bold">
                  {isHindi
                    ? '⚠️ ध्यान दें: लॉक करने के उपरांत दरें सुरक्षित व फिक्स रहेंगी।'
                    : '⚠️ Note: After locking, tax rates will be fixed and protected.'}
                </p>
                <p className="text-slate-600">
                  {isHindi
                    ? 'कर मांग पत्र (Tax Bills) इसी निर्धारित दर पर जारी होंगे। दरों में बदलाव के लिए किसी भी समय अनलॉक किया जा सकता है।'
                    : 'Tax bills will be generated using these locked rates.'}
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔒</span>
                  <span>{isHindi ? 'दरें लॉक एवं फिक्स करें' : 'Confirm & Lock Rates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNLOCK CONFIRMATION MODAL */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-6 py-4 bg-amber-500 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔓</span>
                <h3 className="text-base font-bold">
                  {isHindi ? 'कर दर अनलॉक पुष्टि' : 'Confirm Unlock Tax Rates'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="text-slate-950/80 hover:text-slate-950 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <p className="font-bold text-sm text-slate-900">
                {isHindi
                  ? 'क्या आप निश्चित रूप से कर दरों को अनलॉक करना चाहते हैं?'
                  : 'Are you sure you want to unlock the tax rates?'}
              </p>
              <p className="text-slate-600">
                {isHindi
                  ? `वर्तमान में दरें वर्ष (${lockInfo.year}) अनुसार लॉक हैं। अनलॉक करने पर आप दरों में संशोधन कर सकेंगे।`
                  : 'Unlocking will allow modifying the rates.'}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  {isHindi ? 'निरस्त करें' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUnlock}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔓</span>
                  <span>{isHindi ? 'हाँ, अनलॉक करें' : 'Yes, Unlock Rates'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTaxRatesView;
