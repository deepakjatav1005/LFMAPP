import React, { useState, useMemo } from 'react';
import { Family, TaxType, TaxBeneficiaryList, BeneficiaryCategory } from '../types';
import ViewHeader from './ViewHeader';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { formatDateDDMMYYYY } from '../utils/printUtils';

interface TaxBeneficiaryListViewProps {
  families: Family[];
  taxBeneficiaryLists: Record<string, TaxBeneficiaryList>;
  onUpdateTaxBeneficiaryList: (list: TaxBeneficiaryList) => void;
  onBack?: () => void;
  onClose?: () => void;
  isHindi?: boolean;
}

export const TaxBeneficiaryListView: React.FC<TaxBeneficiaryListViewProps> = ({
  families,
  taxBeneficiaryLists,
  onUpdateTaxBeneficiaryList,
  onBack,
  onClose,
  isHindi = true,
}) => {
  const taxTypes = Object.values(TaxType);
  const [selectedTaxType, setSelectedTaxType] = useState<TaxType>(taxTypes[0] || TaxType.WATER);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [wardFilter, setWardFilter] = useState<string>('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  // Get current tax beneficiary list state or fallback to default
  const currentList = useMemo(() => {
    if (taxBeneficiaryLists[selectedTaxType]) {
      return taxBeneficiaryLists[selectedTaxType];
    }
    // Default: all families included, unlocked
    return {
      taxType: selectedTaxType,
      includedFamilyIds: families.map((f) => f.id),
      isLocked: false,
      updatedAt: new Date().toISOString(),
    };
  }, [taxBeneficiaryLists, selectedTaxType, families]);

  // Unique wards for filter
  const wards = useMemo(() => {
    const set = new Set<string>();
    families.forEach((f) => {
      if (f.wardNo) set.add(f.wardNo);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [families]);

  // Filtered family list
  const filteredFamilies = useMemo(() => {
    return families.filter((fam) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        fam.name.toLowerCase().includes(q) ||
        fam.surname.toLowerCase().includes(q) ||
        fam.samagraId.toLowerCase().includes(q) ||
        (fam.familyId && fam.familyId.toLowerCase().includes(q)) ||
        fam.guardianName.toLowerCase().includes(q) ||
        fam.mobile.includes(q);

      const matchesCat = categoryFilter === 'ALL' || fam.category === categoryFilter;
      const matchesWard = wardFilter === 'ALL' || fam.wardNo === wardFilter;

      return matchesSearch && matchesCat && matchesWard;
    });
  }, [families, searchTerm, categoryFilter, wardFilter]);

  // Count stats
  const includedCount = currentList.includedFamilyIds.length;
  const excludedCount = families.length - includedCount;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Toggle single family inclusion
  const handleToggleFamily = (familyId: string) => {
    if (currentList.isLocked) {
      showNotification(
        isHindi
          ? '⚠️ यह कर लाभार्थी सूची लॉक है! संपादन करने के लिए पहले सूची अनलॉक करें।'
          : '⚠️ This list is locked! Unlock the list first to edit.'
      );
      return;
    }

    const isCurrentlyIncluded = currentList.includedFamilyIds.includes(familyId);
    let updatedIds: string[];

    if (isCurrentlyIncluded) {
      updatedIds = currentList.includedFamilyIds.filter((id) => id !== familyId);
    } else {
      updatedIds = [...currentList.includedFamilyIds, familyId];
    }

    onUpdateTaxBeneficiaryList({
      ...currentList,
      includedFamilyIds: updatedIds,
      updatedAt: new Date().toISOString(),
    });
  };

  // Bulk include / exclude actions
  const handleBulkIncludeAll = () => {
    if (currentList.isLocked) return;
    const allIds = families.map((f) => f.id);
    onUpdateTaxBeneficiaryList({
      ...currentList,
      includedFamilyIds: allIds,
      updatedAt: new Date().toISOString(),
    });
    showNotification(isHindi ? 'समस्त परिवारों को इस कर सूची में शामिल किया गया।' : 'All families included in this tax list.');
  };

  const handleBulkExcludeAll = () => {
    if (currentList.isLocked) return;
    onUpdateTaxBeneficiaryList({
      ...currentList,
      includedFamilyIds: [],
      updatedAt: new Date().toISOString(),
    });
    showNotification(isHindi ? 'समस्त परिवारों को इस कर सूची से पृथक किया गया।' : 'All families excluded from this tax list.');
  };

  const handleIncludeFiltered = () => {
    if (currentList.isLocked) return;
    const filteredIds = filteredFamilies.map((f) => f.id);
    const combined = Array.from(new Set([...currentList.includedFamilyIds, ...filteredIds]));
    onUpdateTaxBeneficiaryList({
      ...currentList,
      includedFamilyIds: combined,
      updatedAt: new Date().toISOString(),
    });
    showNotification(
      isHindi
        ? `फ़िल्टर किए गए ${filteredIds.length} परिवारों को शामिल किया गया।`
        : `Included ${filteredIds.length} filtered families.`
    );
  };

  const handleExcludeFiltered = () => {
    if (currentList.isLocked) return;
    const filteredSet = new Set(filteredFamilies.map((f) => f.id));
    const remaining = currentList.includedFamilyIds.filter((id) => !filteredSet.has(id));
    onUpdateTaxBeneficiaryList({
      ...currentList,
      includedFamilyIds: remaining,
      updatedAt: new Date().toISOString(),
    });
    showNotification(
      isHindi
        ? `फ़िल्टर किए गए ${filteredFamilies.length} परिवारों को पृथक किया गया।`
        : `Excluded ${filteredFamilies.length} filtered families.`
    );
  };

  // Toggle Lock State
  const handleToggleLock = () => {
    const newLockState = !currentList.isLocked;
    onUpdateTaxBeneficiaryList({
      ...currentList,
      isLocked: newLockState,
      updatedAt: new Date().toISOString(),
    });

    if (newLockState) {
      showNotification(
        isHindi
          ? `🔒 ${selectedTaxType} कर की लाभार्थी सूची सफलतापूर्वक लॉक की गई! अब कर मांग जारी करते समय केवल इस सूची के ${includedCount} लाभार्थी ही प्रदर्शित होंगे।`
          : `🔒 Beneficiary list for ${selectedTaxType} locked! Only these ${includedCount} beneficiaries will appear during tax issuing.`
      );
    } else {
      showNotification(
        isHindi
          ? `🔓 ${selectedTaxType} कर सूची अनलॉक कर दी गई है। अब आप इसमें बदलाव कर सकते हैं।`
          : `🔓 Beneficiary list for ${selectedTaxType} unlocked. You can now make changes.`
      );
    }
  };

  // EXCEL EXPORT FUNCTION (ONLY INCLUDED BENEFICIARIES ON THIS TAX LIST)
  const handleExportExcel = () => {
    const includedOnlyFamilies = filteredFamilies.filter((fam) =>
      currentList.includedFamilyIds.includes(fam.id)
    );

    if (includedOnlyFamilies.length === 0) {
      alert(
        isHindi
          ? `⚠️ ${selectedTaxType} की सूची में कोई भी शामिल (Included) हितग्राही नहीं है।`
          : `⚠️ No included beneficiaries found for ${selectedTaxType}.`
      );
      return;
    }

    const headers = [
      isHindi ? 'क्रम संख्या' : 'S.No',
      isHindi ? 'कर प्रकार' : 'Tax Type',
      isHindi ? 'हितग्राही का नाम' : 'Beneficiary Name',
      isHindi ? 'पिता/पति का नाम' : 'Guardian Name',
      isHindi ? 'समग्र आईडी' : 'Samagra ID',
      isHindi ? 'परिवार आईडी' : 'Family ID',
      isHindi ? 'पंजीयन तिथि' : 'Reg Date',
      isHindi ? 'श्रेणी' : 'Category',
      isHindi ? 'वार्ड नंबर' : 'Ward No',
      isHindi ? 'मोहल्ला' : 'Locality',
      isHindi ? 'मोबाइल' : 'Mobile',
    ];

    const rows = includedOnlyFamilies.map((fam, index) => {
      return [
        index + 1,
        selectedTaxType,
        `${fam.name} ${fam.surname}`,
        fam.guardianName || fam.fatherHusbandName || '-',
        fam.samagraId || '-',
        fam.familyId || '-',
        formatDateDDMMYYYY(fam.registrationDate) || '-',
        fam.category || 'APL',
        fam.wardNo || '01',
        fam.muhalla || '-',
        fam.mobile || '-',
      ];
    });

    exportToExcel(
      `${selectedTaxType}_Included_Beneficiary_List_${new Date().toISOString().slice(0, 10)}`,
      selectedTaxType,
      headers,
      rows
    );

    showNotification(
      isHindi
        ? `✅ ${selectedTaxType} के कुल ${includedOnlyFamilies.length} शामिल हितग्राहियों की Excel सूची डाउनलोड की गई!`
        : `Excel file downloaded for ${includedOnlyFamilies.length} included beneficiaries!`
    );
  };

  // PDF EXPORT FUNCTION (ONLY INCLUDED BENEFICIARIES ON THIS TAX LIST)
  const handleExportPDF = () => {
    const includedOnlyFamilies = filteredFamilies.filter((fam) =>
      currentList.includedFamilyIds.includes(fam.id)
    );

    if (includedOnlyFamilies.length === 0) {
      alert(
        isHindi
          ? `⚠️ ${selectedTaxType} की सूची में कोई भी शामिल (Included) हितग्राही नहीं है।`
          : `⚠️ No included beneficiaries found for ${selectedTaxType}.`
      );
      return;
    }

    const headers = [
      isHindi ? 'क्र.' : 'S.N',
      isHindi ? 'हितग्राही का नाम' : 'Beneficiary Name',
      isHindi ? 'पिता / पति का नाम' : 'Guardian Name',
      isHindi ? 'समग्र आईडी' : 'Samagra ID',
      isHindi ? 'श्रेणी' : 'Cat.',
      isHindi ? 'वार्ड व मोहल्ला' : 'Ward & Muhalla',
      isHindi ? 'मोबाइल' : 'Mobile',
    ];

    const rows = includedOnlyFamilies.map((fam, index) => {
      return [
        index + 1,
        `${fam.name} ${fam.surname}`,
        fam.guardianName || fam.fatherHusbandName || '-',
        fam.samagraId || '-',
        fam.category || 'APL',
        `W-${fam.wardNo || '01'}, ${fam.muhalla || '-'}`,
        fam.mobile || '-',
      ];
    });

    const title = isHindi
      ? `${selectedTaxType} - पात्र करदाता हितग्राही सूची (${currentList.isLocked ? '🔒 लॉक' : '🔓 अनलॉक'})`
      : `${selectedTaxType} Tax Beneficiary List (${currentList.isLocked ? 'Locked' : 'Unlocked'})`;

    const subtitle = isHindi
      ? `कुल शामिल पात्र हितग्राही: ${includedOnlyFamilies.length} | संबंधित कर: ${selectedTaxType}`
      : `Total Included Beneficiaries: ${includedOnlyFamilies.length} | Tax: ${selectedTaxType}`;

    exportToPDF(
      `${selectedTaxType}_Tax_Beneficiaries`,
      title,
      subtitle,
      headers,
      rows,
      isHindi ? 'कार्यालय ग्राम पंचायत' : 'Office Gram Panchayat'
    );

    showNotification(
      isHindi
        ? `✅ ${selectedTaxType} के कुल ${includedOnlyFamilies.length} शामिल हितग्राहियों की PDF सूची डाउनलोड की गई!`
        : `PDF report downloaded for ${includedOnlyFamilies.length} included beneficiaries!`
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in max-w-7xl space-y-6">
      {/* HEADER */}
      <ViewHeader
        title={isHindi ? 'करवार पृथक लाभार्थी सूची एवं लॉक प्रबंधन' : 'Tax-Wise Beneficiary List & Lock Management'}
        subtitle={
          isHindi
            ? 'प्रत्येक कर के लिए पृथक पात्र लाभार्थी सूची तैयार करें एवं लॉक करें। कर मांग जारी करते समय केवल लॉक की गई सूची लागू होगी।'
            : 'Create & lock separate beneficiary lists for each tax type. When issuing taxes, locked lists will be strictly enforced.'
        }
        onBack={onBack}
        onClose={onClose}
        isHindi={isHindi}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-600"
            >
              <span>📊</span>
              <span>{isHindi ? 'Excel डाउनलोड' : 'Export Excel'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-rose-600"
            >
              <span>📄</span>
              <span>{isHindi ? 'PDF डाउनलोड' : 'Export PDF'}</span>
            </button>
          </div>
        }
      />

      {/* NOTIFICATION BANNER */}
      {notification && (
        <div className="p-4 bg-emerald-900 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-slide-up border border-emerald-700">
          <div className="flex items-center gap-2">
            <span>ℹ️</span>
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-200 hover:text-white text-xs font-black cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAX TYPE SELECTOR TABS */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 space-y-2">
        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider pl-1">
          {isHindi ? '📌 कर प्रकार चुनें:' : '📌 Select Tax Type:'}
        </label>
        <div className="flex flex-wrap gap-2">
          {taxTypes.map((type) => {
            const list = taxBeneficiaryLists[type];
            const isLocked = list?.isLocked ?? false;
            const incCount = list ? list.includedFamilyIds.length : families.length;
            const isActive = selectedTaxType === type;

            return (
              <button
                key={type}
                onClick={() => setSelectedTaxType(type)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <span>{isLocked ? '🔒' : '📋'}</span>
                <span>{type}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white text-emerald-900' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {incCount}/{families.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED TAX TYPE CONTROL & LOCK CARD */}
      <div className="bg-white p-5 rounded-2xl shadow-md border-2 border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              <h3 className="text-lg font-black text-slate-900">
                {selectedTaxType} {isHindi ? 'लाभार्थी सूची' : 'Beneficiary List'}
              </h3>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 border ${
                  currentList.isLocked
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                <span>{currentList.isLocked ? '🔒' : '🔓'}</span>
                <span>
                  {currentList.isLocked
                    ? isHindi
                      ? 'सूची लॉक है'
                      : 'LIST IS LOCKED'
                    : isHindi
                    ? 'सूची खुली है'
                    : 'LIST IS UNLOCKED'}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {isHindi
                ? `कुल ${families.length} पंजीकृत परिवारों में से ${includedCount} परिवार इस कर हेतु चयनित हैं एवं ${excludedCount} पृथक हैं।`
                : `Out of ${families.length} total families, ${includedCount} are included for this tax and ${excludedCount} are excluded.`}
            </p>
          </div>

          {/* LOCK / UNLOCK ACTION BUTTON */}
          <button
            onClick={handleToggleLock}
            className={`px-5 py-3 rounded-xl font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer border ${
              currentList.isLocked
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
            }`}
          >
            <span className="text-base">{currentList.isLocked ? '🔓' : '🔒'}</span>
            <span>
              {currentList.isLocked
                ? isHindi
                  ? 'सूची अनलॉक करें'
                  : 'Unlock List'
                : isHindi
                ? 'कर सूची लॉक करें'
                : 'Lock Beneficiary List'}
            </span>
          </button>
        </div>

        {/* STATUS & MULTI-TAX INFORMATION BANNERS */}
        <div className="space-y-2">
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 font-bold flex items-center gap-2.5 shadow-sm">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-extrabold text-blue-900">
                {isHindi
                  ? 'बहु-कर प्रविष्टि सुविधा (Multi-Tax List Inclusion Allowed)'
                  : 'Multiple Tax List Inclusion Feature'}
              </p>
              <p className="text-[11px] text-blue-800 font-medium">
                {isHindi
                  ? 'एक हितग्राही को एक से अधिक करों (जैसे जल कर, स्वच्छता कर, प्रकाश कर, संपत्ति कर आदि) की सूचियों में एक साथ शामिल किया जा सकता है। प्रत्येक कर की सूची पूर्णतः स्वतंत्र है।'
                  : 'A single beneficiary can be included in multiple tax lists simultaneously (e.g., Water Tax, Sanitation Tax, Property Tax, etc.). Each tax list operates independently.'}
              </p>
            </div>
          </div>

          {currentList.isLocked ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 font-bold flex items-center gap-2.5">
              <span className="text-lg">🔒</span>
              <div>
                <p className="font-extrabold text-rose-900">
                  {isHindi
                    ? 'यह कर सूची वर्तमान में लॉक है!'
                    : 'This tax beneficiary list is currently locked!'}
                </p>
                <p className="text-[11px] text-rose-800">
                  {isHindi
                    ? `कर मांग जारी करते समय केवल चयनित ${includedCount} लाभार्थियों का ही बिल जारी किया जाएगा। सूची में बदलाव करने के लिए ऊपर 'सूची अनलॉक करें' पर क्लिक करें।`
                    : `When issuing tax, bills will only be created for the ${includedCount} included beneficiaries. To edit, click 'Unlock List' above.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-bold flex items-center gap-2.5">
              <span className="text-lg">💡</span>
              <div>
                <p className="font-extrabold text-emerald-950">
                  {isHindi
                    ? 'सूची अनलॉक स्थिति में है - आप परिवारों को शामिल/पृथक कर सकते हैं।'
                    : 'List is unlocked - You can toggle inclusion for each family below.'}
                </p>
                <p className="text-[11px] text-emerald-900">
                  {isHindi
                    ? 'इच्छित बदलाव करने के पश्चात ऊपर "कर सूची लॉक करें" बटन दबाएं ताकि यह सूची लॉक होकर कर जारीकरण में लागू हो सके।'
                    : 'After customizing, click "Lock Beneficiary List" above so this exact list is applied when issuing tax bills.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* FILTERS & BULK ACTIONS BAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2">
          {/* SEARCH INPUT */}
          <div className="lg:col-span-5">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              🔍 {isHindi ? 'खोजें (नाम, समग्र आईडी, मोबाइल)' : 'Search (Name, Samagra ID, Mobile)'}
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isHindi ? 'नाम / समग्र आईडी से खोजें...' : 'Search by name / Samagra ID...'}
              className="w-full px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* CATEGORY FILTER */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              🏷️ {isHindi ? 'श्रेणी फ़िल्टर' : 'Category Filter'}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">{isHindi ? 'समस्त श्रेणियां' : 'All Categories'}</option>
              <option value={BeneficiaryCategory.BPL}>BPL</option>
              <option value={BeneficiaryCategory.APL}>APL</option>
              <option value={BeneficiaryCategory.DIVYANG}>DIVYANG</option>
              <option value={BeneficiaryCategory.OTHER}>OTHER</option>
            </select>
          </div>

          {/* WARD FILTER */}
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              🏘️ {isHindi ? 'वार्ड फ़िल्टर' : 'Ward Filter'}
            </label>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">{isHindi ? 'समस्त वार्ड' : 'All Wards'}</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  Ward {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BULK ACTION BUTTONS (ENABLED ONLY WHEN UNLOCKED) */}
        {!currentList.isLocked && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-700">
              ⚡ {isHindi ? 'सामूहिक कार्य:' : 'Bulk Actions:'}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleIncludeFiltered}
                className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-lg border border-emerald-300 cursor-pointer"
              >
                ✅ {isHindi ? 'फ़िल्टर किए गए शामिल करें' : 'Include Filtered'}
              </button>
              <button
                type="button"
                onClick={handleExcludeFiltered}
                className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold rounded-lg border border-rose-300 cursor-pointer"
              >
                ✕ {isHindi ? 'फ़िल्टर किए गए पृथक करें' : 'Exclude Filtered'}
              </button>
              <button
                type="button"
                onClick={handleBulkIncludeAll}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
              >
                {isHindi ? 'सभी शामिल करें' : 'Include All'}
              </button>
              <button
                type="button"
                onClick={handleBulkExcludeAll}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
              >
                {isHindi ? 'सभी पृथक करें' : 'Exclude All'}
              </button>
            </div>
          </div>
        )}

        {/* BENEFICIARIES TABLE */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
              <tr>
                <th className="px-4 py-3 text-center">{isHindi ? 'स्थिति' : 'Status'}</th>
                <th className="px-4 py-3 text-left">{isHindi ? 'हितग्राही नाम' : 'Beneficiary Name'}</th>
                <th className="px-4 py-3 text-left">{isHindi ? 'समग्र / परिवार आईडी' : 'Samagra / Family ID'}</th>
                <th className="px-4 py-3 text-left">{isHindi ? 'पंजीयन तिथि' : 'Reg. Date'}</th>
                <th className="px-4 py-3 text-center">{isHindi ? 'श्रेणी' : 'Category'}</th>
                <th className="px-4 py-3 text-left">{isHindi ? 'वार्ड व मोहल्ला' : 'Ward & Locality'}</th>
                <th className="px-4 py-3 text-left">{isHindi ? 'मोबाइल' : 'Mobile'}</th>
                <th className="px-4 py-3 text-center">{isHindi ? 'कार्रवाई' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredFamilies.map((fam) => {
                const isIncluded = currentList.includedFamilyIds.includes(fam.id);

                return (
                  <tr
                    key={fam.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isIncluded ? 'bg-emerald-50/30' : 'bg-slate-50/60 opacity-80'
                    }`}
                  >
                    {/* INCLUSION BADGE STATUS */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {isIncluded ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <span>✓</span>
                          <span>{isHindi ? 'शामिल' : 'INCLUDED'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                          <span>✕</span>
                          <span>{isHindi ? 'पृथक' : 'EXCLUDED'}</span>
                        </span>
                      )}
                    </td>

                    {/* NAME */}
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                      <div>
                        <span className="text-sm">
                          {fam.name} {fam.surname}
                        </span>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          {isHindi ? 'पिता/पति:' : 'Guardian:'} {fam.guardianName}
                        </p>
                        {/* BADGES SHOWING ALL TAXES THIS BENEFICIARY IS INCLUDED IN */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(taxBeneficiaryLists).map(([tType, tList]) => {
                            const listObj = tList as TaxBeneficiaryList;
                            if (listObj?.includedFamilyIds?.includes(fam.id)) {
                              return (
                                <span
                                  key={tType}
                                  className="px-1.5 py-0.5 bg-blue-50 text-blue-900 text-[9px] font-bold rounded border border-blue-200"
                                >
                                  {tType}
                                </span>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    </td>

                    {/* SAMAGRA ID */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-700">
                      <div>
                        <span>{fam.samagraId}</span>
                        {fam.familyId && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Fam: {fam.familyId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* REGISTRATION DATE */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                      <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-mono">
                        <span>📅</span>
                        <span>{formatDateDDMMYYYY(fam.registrationDate) || 'N/A'}</span>
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                        {fam.category || 'APL'}
                      </span>
                    </td>

                    {/* WARD & MUHALLA */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                      Ward {fam.wardNo || '01'}, {fam.muhalla || ''}
                    </td>

                    {/* MOBILE */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-mono">
                      {fam.mobile}
                    </td>

                    {/* TOGGLE SWITCH BUTTON */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        disabled={currentList.isLocked}
                        onClick={() => handleToggleFamily(fam.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer border ${
                          currentList.isLocked
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : isIncluded
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                        }`}
                      >
                        {isIncluded ? (
                          <>
                            <span>✕</span>
                            <span>{isHindi ? 'पृथक करें' : 'Exclude'}</span>
                          </>
                        ) : (
                          <>
                            <span>+</span>
                            <span>{isHindi ? 'शामिल करें' : 'Include'}</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredFamilies.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-bold">
                    {isHindi ? 'कोई परिवार/हितग्राही नहीं मिला।' : 'No families/beneficiaries found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaxBeneficiaryListView;

