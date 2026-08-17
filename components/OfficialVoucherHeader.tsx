import React from 'react';
import { OfficeDetails } from '../types';
import { getCleanOfficeTitle, getOfficeLogoUrl, getCleanOfficeSubtitle } from '../utils/printUtils';

interface OfficialVoucherHeaderProps {
  officeDetails?: Partial<OfficeDetails> | null;
  adminPanchayat?: string;
  voucherTitle: string;
  voucherSubTitle?: string;
  className?: string;
  badgeBgColor?: string;
}

export const OfficialVoucherHeader: React.FC<OfficialVoucherHeaderProps> = ({
  officeDetails,
  adminPanchayat,
  voucherTitle,
  voucherSubTitle,
  className = '',
  badgeBgColor = 'bg-slate-100 text-slate-900 border-slate-300',
}) => {
  const logoUrl = getOfficeLogoUrl(officeDetails);
  const officeName = getCleanOfficeTitle(officeDetails, adminPanchayat);
  const officeSubtitle = getCleanOfficeSubtitle(officeDetails, { gramPanchayat: adminPanchayat });

  return (
    <div className={`text-center border-b-2 border-slate-900 pb-4 space-y-1.5 ${className}`}>
      {/* Official Government / Panchayat Logo */}
      <div className="flex justify-center mb-1">
        <img
          src={logoUrl}
          alt="Official Logo"
          className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-xs"
          onError={(e) => {
            // Fallback to default state emblem if custom URL fails to load
            (e.currentTarget as HTMLImageElement).src =
              'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Emblem_of_Madhya_Pradesh.svg/180px-Emblem_of_Madhya_Pradesh.svg.png';
          }}
        />
      </div>

      {/* Main Gram Panchayat Name */}
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
        {officeName}
      </h2>

      {/* Address / Block / District / State */}
      <p className="text-xs text-slate-700 font-semibold max-w-xl mx-auto">
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
