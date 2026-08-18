import React from 'react';
import { Volume2, Bell, AlertTriangle, Sparkles, Info, ExternalLink } from 'lucide-react';
import { NoticeHeaderConfig } from '../../types';

interface NoticeHeaderBarProps {
  notice?: NoticeHeaderConfig;
  className?: string;
  isCompact?: boolean;
}

export const NoticeHeaderBar: React.FC<NoticeHeaderBarProps> = ({
  notice,
  className = '',
  isCompact = false,
}) => {
  if (!notice || !notice.enabled || !notice.text?.trim()) {
    return null;
  }

  const theme = notice.theme || 'amber';
  const speed = notice.speed || 'medium';
  const iconType = notice.icon || 'megaphone';

  const getThemeClasses = () => {
    switch (theme) {
      case 'blue':
        return {
          wrapper: 'bg-gradient-to-r from-blue-900 via-sky-900 to-indigo-950 text-sky-100 border-b border-blue-700/50',
          badge: 'bg-sky-500 text-slate-950 font-black',
          link: 'text-sky-300 hover:text-white',
        };
      case 'red':
        return {
          wrapper: 'bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 text-rose-100 border-b border-rose-700/50',
          badge: 'bg-rose-500 text-white font-black',
          link: 'text-rose-300 hover:text-white',
        };
      case 'emerald':
        return {
          wrapper: 'bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 text-emerald-100 border-b border-emerald-700/50',
          badge: 'bg-emerald-400 text-slate-950 font-black',
          link: 'text-emerald-300 hover:text-white',
        };
      case 'purple':
        return {
          wrapper: 'bg-gradient-to-r from-purple-950 via-fuchsia-950 to-indigo-950 text-purple-100 border-b border-purple-700/50',
          badge: 'bg-purple-400 text-slate-950 font-black',
          link: 'text-purple-300 hover:text-white',
        };
      case 'gradient':
        return {
          wrapper: 'bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 text-amber-200 border-b border-amber-500/30',
          badge: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black',
          link: 'text-amber-300 hover:text-white',
        };
      case 'amber':
      default:
        return {
          wrapper: 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-amber-100 border-b border-amber-600/50',
          badge: 'bg-amber-400 text-slate-950 font-black',
          link: 'text-amber-300 hover:text-white',
        };
    }
  };

  const renderIcon = () => {
    switch (iconType) {
      case 'bell':
        return <Bell className="w-3 h-3 animate-bounce" />;
      case 'alert':
        return <AlertTriangle className="w-3 h-3 animate-pulse text-amber-300" />;
      case 'sparkle':
        return <Sparkles className="w-3 h-3 animate-spin text-amber-300" />;
      case 'info':
        return <Info className="w-3 h-3" />;
      case 'megaphone':
      default:
        return <Volume2 className="w-3 h-3 animate-pulse" />;
    }
  };

  const themeStyles = getThemeClasses();

  return (
    <div
      id="user-notice-header-scroller"
      className={`relative w-full overflow-hidden flex items-center shadow-xs z-20 select-none py-1.5 px-2.5 ${themeStyles.wrapper} ${className}`}
      title="নোটিশ পড়তে মাউস উপরে রাখুন"
    >
      {/* Sticky Left Notice Tag / Badge */}
      <div className="flex items-center gap-1 shrink-0 mr-2 z-10">
        <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs ${themeStyles.badge}`}>
          {renderIcon()}
          <span>নোটিশ</span>
        </span>
      </div>

      {/* Marquee Scrolling Text Area */}
      <div className="notice-marquee-track flex-1 overflow-hidden">
        <div className={`notice-marquee-text font-medium text-[11px] sm:text-xs tracking-wide speed-${speed}`}>
          <span>{notice.text}</span>
          {notice.linkUrl && (
            <a
              href={notice.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-0.5 ml-3 underline font-bold ${themeStyles.link}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span>{notice.linkText || 'লিংক দেখুন'}</span>
              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </a>
          )}
          {/* Spacing spacer before loop */}
          <span className="mx-6 text-white/40">• • •</span>
          <span>{notice.text}</span>
          {notice.linkUrl && (
            <a
              href={notice.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-0.5 ml-3 underline font-bold ${themeStyles.link}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span>{notice.linkText || 'লিংক দেখুন'}</span>
              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
