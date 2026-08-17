import React from 'react';

interface ViewHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  actionButton?: React.ReactNode;
  isHindi?: boolean;
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onClose,
  actionButton,
  isHindi = true,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* LEFT & CENTER TITLE WITH BACK BUTTON */}
        <div className="flex items-start sm:items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="mt-0.5 sm:mt-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Go back to previous view"
            >
              <span>←</span>
              <span>{isHindi ? 'वापस' : 'Back'}</span>
            </button>
          )}

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* RIGHT ACTION BUTTON & CLOSE BUTTON */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {actionButton}

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Close page and return to Dashboard"
            >
              <span>✕</span>
              <span>{isHindi ? 'बंद करें' : 'Close'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewHeader;
