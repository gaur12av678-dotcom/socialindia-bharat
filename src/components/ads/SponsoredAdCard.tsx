import React, { useEffect, useRef } from 'react';
import { AdCampaign } from '../../types';
import { adService } from '../../services/adService';
import { ExternalLink, Sparkles, Volume2, VolumeX } from 'lucide-react';
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

    // Check if CTA url points to a video on platform
    if (ad.ctaUrl.includes('/watch/') || ad.ctaUrl.startsWith('video_')) {
      const vidId = ad.ctaUrl.replace(/.*\/watch\//, '');
      navigate(`watch/${vidId}`);
    } else {
      window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // SIDEBAR COMPACT LAYOUT (FOR WATCH PAGE)
  if (layout === 'sidebar') {
    return (
      <div className="bg-slate-50 dark:bg-[#111827] border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-3.5 space-y-3 shadow-xs relative overflow-hidden transition-all hover:border-amber-500/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-md uppercase tracking-wider">
              Sponsored
            </span>
            <span className="text-[11px] text-slate-500 font-bold truncate max-w-[120px]">
              @{ad.creatorUsername || ad.sponsorName}
            </span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {ad.bannerUrl && (
          <div 
            onClick={handleClick}
            className="w-full h-32 rounded-xl overflow-hidden bg-slate-900 cursor-pointer relative group"
          >
            {ad.bannerUrl.endsWith('.mp4') || ad.bannerUrl.endsWith('.webm') ? (
              <video 
                src={ad.bannerUrl}
                muted 
                loop 
                autoPlay 
                playsInline
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <img 
                src={ad.bannerUrl} 
                alt={ad.headline || 'Sponsored'} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
          </div>
        )}

        <div className="space-y-1">
          <h4 
            onClick={handleClick}
            className="text-xs font-black text-slate-900 dark:text-white line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
          >
            {ad.headline || ad.title}
          </h4>
          {ad.description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 font-medium">
              {ad.description}
            </p>
          )}
        </div>

        <button
          onClick={handleClick}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
        >
          <span>{ad.ctaText || 'Learn More'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // FEED WIDE FEATURED CARD (FOR HOME PAGE)
  return (
    <div className="bg-linear-to-r from-amber-500/10 via-blue-500/5 to-transparent dark:from-amber-500/15 dark:via-blue-500/10 border border-amber-500/30 dark:border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
      <div className="flex flex-col md:flex-row items-center gap-5">
        
        {/* Ad Media (Image / Video preview) */}
        {ad.bannerUrl && (
          <div 
            onClick={handleClick}
            className="w-full md:w-72 h-44 shrink-0 rounded-2xl overflow-hidden bg-slate-950 cursor-pointer relative group shadow-sm border border-black/10 dark:border-white/10"
          >
            {ad.bannerUrl.endsWith('.mp4') || ad.bannerUrl.endsWith('.webm') ? (
              <video 
                src={ad.bannerUrl}
                muted 
                loop 
                autoPlay 
                playsInline
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <img 
                src={ad.bannerUrl} 
                alt={ad.headline || 'Sponsored'} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/70 backdrop-blur-md text-amber-400 text-[10px] font-black rounded-md uppercase tracking-wider">
              Ad
            </div>
          </div>
        )}

        {/* Content details */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Sponsored Promotion</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              Promoted by <strong className="text-slate-800 dark:text-slate-200">@{ad.creatorUsername || ad.sponsorName}</strong>
            </span>
          </div>

          <div className="space-y-1">
            <h3 
              onClick={handleClick}
              className="text-base sm:text-lg font-black text-slate-900 dark:text-white line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
            >
              {ad.headline || ad.title}
            </h3>
            {ad.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 font-medium">
                {ad.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleClick}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>{ad.ctaText || 'Learn More'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {ad.ctaUrl && (
              <span className="text-[11px] text-slate-400 truncate max-w-[200px] font-mono">
                {ad.ctaUrl.replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
