import React from 'react';
import { OfficeDetails } from '../types';
import { getCleanOfficeTitle, getOfficeLogoUrl, getCleanOfficeSubtitle, DEFAULT_OFFICE_LOGO } from '../utils/printUtils';

interface OfficialVoucherHeaderProps {
  officeDetails?: Partial<OfficeDetails> | null;
  adminPanchayat?: string;
  admin?: any;
  voucherTitle: string;
  voucherSubTitle?: string;
  className?: string;
  badgeBgColor?: string;
}

export const OfficialVoucherHeader: React.FC<OfficialVoucherHeaderProps> = ({
  officeDetails,
  adminPanchayat,
  admin,
  voucherTitle,
  voucherSubTitle,
  className = '',
  badgeBgColor = 'bg-slate-100 text-slate-900 border-slate-300',
}) => {
  const logoUrl = getOfficeLogoUrl(officeDetails);
  const officeName = getCleanOfficeTitle(officeDetails, adminPanchayat || admin?.gramPanchayat);
  const officeSubtitle = getCleanOfficeSubtitle(officeDetails, admin || { gramPanchayat: adminPanchayat });

  return (
    <div className={`text-center border-b-2 border-slate-900 pb-4 space-y-1.5 ${className}`}>
      {/* Official Government / Panchayat Logo */}
      <div className="flex justify-center items-center gap-3 mb-2">
        <img
          src={logoUrl}
          alt="Official Logo"
          referrerPolicy="no-referrer"
          className="w-24 h-24 sm:w-28 sm:h-28 print:w-24 print:h-24 object-contain drop-shadow-md"
          onError={(e) => {
            // Fallback to embedded official emblem if custom URL fails to load
            (e.currentTarget as HTMLImageElement).src = DEFAULT_OFFICE_LOGO;
          }}
        />
      </div>

      {/* Main Gram Panchayat Name */}
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
        {officeName}
      </h2>

      {/* Address / Block / District / State */}
      <p className="text-xs sm:text-sm text-slate-700 font-semibold max-w-xl mx-auto">
        {officeSubtitle}
      </p>

      {/* Optional Sub-Caption */}
      {voucherSubTitle && (
        <p className="text-[10px] text-slate-500 font-medium">
          {voucherSubTitle}
        </p>
      )}

      {/* Official Voucher Title Pill / Badge */}
      <div className="pt-1">
        <div className={`inline-block border font-black text-xs px-4 py-1 rounded-full uppercase shadow-xs ${badgeBgColor}`}>
          {voucherTitle}
        </div>
      </div>
    </div>
  );
};

export default OfficialVoucherHeader;
