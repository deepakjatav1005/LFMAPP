import React, { useState } from 'react';
import { Announcement } from '../types';
import { formatDateDDMMYYYY } from '../utils/printUtils';

interface AnnouncementBannerProps {
  announcements: Announcement[];
  isHindi: boolean;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ announcements, isHindi }) => {
  const activeAnnouncements = announcements.filter((a) => a.isActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  if (activeAnnouncements.length === 0 || isDismissed) {
    return null;
  }

  const current = activeAnnouncements[currentIndex] || activeAnnouncements[0];

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return {
          bg: 'bg-rose-600 border-rose-700 text-white',
          badgeBg: 'bg-white text-rose-800',
          icon: '🚨',
          label: isHindi ? 'अति आवश्यक सूचना' : 'URGENT NOTICE',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-600 border-amber-700 text-white',
          badgeBg: 'bg-amber-100 text-amber-950',
          icon: '📢',
          label: isHindi ? 'महत्वपूर्ण घोषणा' : 'HIGH PRIORITY',
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-800 text-white',
          badgeBg: 'bg-emerald-500 text-white',
          icon: '🔔',
          label: isHindi ? 'सिस्टम घोषणा' : 'ANNOUNCEMENT',
        };
    }
  };

  const style = getPriorityStyle(current.priority);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
  };

  return (
    <div className="w-full print:hidden">
      <div className={`${style.bg} border-b shadow-md transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* LEFT: BADGE & CONTENT */}
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-base animate-bounce">{style.icon}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${style.badgeBg}`}>
                {style.label}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black truncate">{current.title}</h4>
                {current.date && (
                  <span className="text-[10px] opacity-80 font-mono font-semibold hidden md:inline">
                    ({formatDateDDMMYYYY(current.date)})
                  </span>
                )}
              </div>
              <p className="text-xs text-white/90 font-medium line-clamp-1">{current.message}</p>
            </div>
          </div>

          {/* RIGHT: CONTROLS */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {activeAnnouncements.length > 1 && (
              <div className="flex items-center gap-1 bg-black/20 rounded-lg px-1.5 py-0.5 text-xs font-bold">
                <button
                  onClick={handlePrev}
                  className="px-1 hover:bg-white/20 rounded cursor-pointer"
                  title="Previous"
                >
                  ◀
                </button>
                <span className="text-[10px]">
                  {currentIndex + 1}/{activeAnnouncements.length}
                </span>
                <button
                  onClick={handleNext}
                  className="px-1 hover:bg-white/20 rounded cursor-pointer"
                  title="Next"
                >
                  ▶
                </button>
              </div>
            )}

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors text-xs font-black cursor-pointer text-white/80 hover:text-white"
              title={isHindi ? 'सूचना बंद करें' : 'Dismiss notice'}
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
