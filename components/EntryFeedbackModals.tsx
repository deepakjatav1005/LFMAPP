import React from 'react';

export interface DuplicateWarningDetails {
  title?: string;
  message: string;
  duplicateInfo?: Array<{ label: string; value: string | number }>;
  onConfirm: () => void;
  onCancel: () => void;
  isHindi?: boolean;
}

export interface SuccessPopupDetails {
  title?: string;
  message: string;
  recordType?: string;
  details?: Array<{ label: string; value: string | number }>;
  onPrint?: () => void;
  printButtonLabel?: string;
  onClose: () => void;
  isHindi?: boolean;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningDetails> = ({
  title,
  message,
  duplicateInfo = [],
  onConfirm,
  onCancel,
  isHindi = true,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex justify-center items-center p-3 sm:p-4 overflow-y-auto animate-fade-in print:hidden">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto overflow-hidden border-2 border-amber-400 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-xl shrink-0">
            ⚠️
          </div>
          <div>
            <h3 className="font-black text-base leading-tight">
              {title || (isHindi ? 'समान प्रविष्टि चेतावनी (Duplicate Entry Warning)' : 'Duplicate Entry Warning')}
            </h3>
            <p className="text-[11px] text-amber-100 font-medium">
              {isHindi ? 'कृपया पुनः पुष्टि करें' : 'Please review and confirm'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 leading-relaxed font-semibold">
            {message}
          </div>

          {duplicateInfo.length > 0 && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-sans">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {isHindi ? 'मौजूदा रिकॉर्ड का मिलान विवरण:' : 'Matched Record Details:'}
              </p>
              {duplicateInfo.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                  <span className="text-slate-600">{item.label}:</span>
                  <span className="font-bold text-slate-900 font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-600 text-center">
            {isHindi
              ? 'क्या आप निश्चित रूप से इस प्रविष्टि को सुरक्षित करना चाहते हैं?'
              : 'Are you sure you want to proceed and save this duplicate entry?'}
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-300 flex items-center justify-center gap-1.5"
            >
              <span>❌</span>
              <span>{isHindi ? 'रद्द करें (Cancel)' : 'Cancel'}</span>
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>⚠️</span>
              <span>{isHindi ? 'हां, प्रविष्टि करें' : 'Yes, Proceed'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SuccessPopupModal: React.FC<SuccessPopupDetails> = ({
  title,
  message,
  recordType,
  details = [],
  onPrint,
  printButtonLabel,
  onClose,
  isHindi = true,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex justify-center items-center p-3 sm:p-4 overflow-y-auto animate-fade-in print:hidden">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto overflow-hidden border-2 border-emerald-400 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white p-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            ✅
          </div>
          <div>
            <span className="inline-block px-2 py-0.5 bg-emerald-400/30 text-emerald-200 border border-emerald-300/30 rounded-md text-[10px] font-black uppercase tracking-wider mb-0.5">
              {recordType || (isHindi ? 'सफलतापूर्वक सुरक्षित' : 'SUCCESS')}
            </span>
            <h3 className="font-black text-base sm:text-lg leading-tight">
              {title || (isHindi ? 'प्रविष्टि सफलतापूर्वक दर्ज हुई!' : 'Entry Saved Successfully!')}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-700 font-semibold text-center leading-relaxed">
            {message}
          </p>

          {details.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 font-sans">
              {details.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                  <span className="text-slate-500 font-medium">{item.label}:</span>
                  <strong className="text-slate-900 font-mono">{item.value}</strong>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {onPrint && (
              <button
                type="button"
                onClick={() => {
                  onPrint();
                }}
                className="w-full sm:w-1/2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🖨️</span>
                <span>{printButtonLabel || (isHindi ? 'रसीद / प्रिंट देखें' : 'Print / View')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`w-full ${onPrint ? 'sm:w-1/2' : ''} px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5`}
            >
              <span>👍</span>
              <span>{isHindi ? 'ठीक है (OK)' : 'Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
