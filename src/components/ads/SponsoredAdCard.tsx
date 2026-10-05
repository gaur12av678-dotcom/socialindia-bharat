import React, { useEffect, useRef } from 'react';
import { AdCampaign } from '../../types';
import { adService } from '../../services/adService';
import { ExternalLink } from 'lucide-react';
import { useRouter } from '../../hooks/useRouter';

interface SponsoredAdCardProps {
  ad: AdCampaign;
  layout?: 'feed' | 'sidebar' | 'inline';
  onDismiss?: () => void;
}

export const SponsoredAdCard: React.FC<SponsoredAdCardProps> = ({
  ad,
  layout = 'feed',
  onDismiss,
}) => {
  const { navigate } = useRouter();
  const impressionRecorded = useRef(false);

  useEffect(() => {
    if (!impressionRecorded.current && ad.adId) {
      adService.recordAdImpression(ad.adId);
      impressionRecorded.current = true;
    }
  }, [ad.adId]);

  const handleClick = () => {
    if (ad.adId) {
      adService.recordAdClick(ad.adId);
    }
    if (!ad.ctaUrl) return;
    if (ad.ctaUrl.includes('/watch/') || ad.ctaUrl.startsWith('video_')) {
      const vidId = ad.ctaUrl.replace(/.*\/watch\//, '');
      navigate(`watch/${vidId}`);
    } else {
      window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // SIDEBAR — Watch page ke liye chhota compact card
  if (layout === 'sidebar') {
    return (
      <div className="bg-slate-50 dark:bg-[#111827] border border-amber-500/20 dark:border-amber-500/30 rounded-xl p-2.5 space-y-2 relative overflow-hidden transition-all hover:border-amber-500/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[9px] font-black rounded uppercase tracking-wider shrink-0">
              Ad
            </span>
            <span className="text-[10px] text-slate-500 font-bold truncate">
              @{ad.creatorUsername || ad.sponsorName}
            </span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        {ad.bannerUrl && (
          <div
            onClick={handleClick}
            className="w-full h-20 rounded-lg overflow-hidden bg-slate-900 cursor-pointer relative group"
          >
            {ad.bannerUrl.endsWith('.mp4') || ad.bannerUrl.endsWith('.webm') ? (
              <video
                src={ad.bannerUrl}
                muted
                loop
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={ad.bannerUrl}
                alt={ad.headline || 'Sponsored'}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        <h4
          onClick={handleClick}
          className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
        >
          {ad.headline || ad.title}
        </h4>

        <button
          onClick={handleClick}
          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
        >
          <span>{ad.ctaText || 'Learn More'}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // FEED — YouTube jaisa compact horizontal banner (zyada space nahi leta)
  return (
    <div className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#3f3f3f] rounded-xl p-2.5 sm:p-3 flex items-center gap-3 relative overflow-hidden transition-all hover:bg-slate-100 dark:hover:bg-[#222]">
      {ad.bannerUrl && (
        <div
          onClick={handleClick}
          className="w-28 sm:w-40 h-16 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-slate-900 cursor-pointer relative"
        >
          {ad.bannerUrl.endsWith('.mp4') || ad.bannerUrl.endsWith('.webm') ? (
            <video
              src={ad.bannerUrl}
              muted
              loop
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={ad.bannerUrl}
              alt={ad.headline || 'Sponsored'}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-amber-400 text-[8px] font-black rounded uppercase">
            Ad
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider">
          Sponsored
        </span>
        <h4
          onClick={handleClick}
          className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
        >
          {ad.headline || ad.title}
        </h4>
        {ad.description && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 hidden sm:block">
            {ad.description}
          </p>
        )}
        <span className="text-[10px] text-slate-400 font-medium">
          @{ad.creatorUsername || ad.sponsorName}
        </span>
      </div>

      <button
        onClick={handleClick}
        className="shrink-0 px-3 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 active:scale-95"
      >
        <span className="hidden sm:inline">{ad.ctaText || 'Learn More'}</span>
        <ExternalLink className="w-3 h-3" />
      </button>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-1.5 right-1.5 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );
};
