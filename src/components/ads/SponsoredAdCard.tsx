import React, { useEffect, useRef, useState } from 'react';
import { AdCampaign, Video } from '../../types';
import { adService } from '../../services/adService';
import { videoService } from '../../services/videoService';
import { ExternalLink, Play, Sparkles, X, MoreVertical, Info } from 'lucide-react';
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
  const [socialVideo, setSocialVideo] = useState<Video | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!impressionRecorded.current && ad.adId) {
      adService.recordAdImpression(ad.adId);
      impressionRecorded.current = true;
    }
  }, [ad.adId]);

  // Extract target SocialIndia videoId if available
  const getTargetVideoId = (): string | null => {
    if (ad.ctaUrl) {
      if (ad.ctaUrl.includes('/watch/')) {
        return ad.ctaUrl.split('/watch/')[1].split('?')[0];
      }
      if (ad.ctaUrl.startsWith('video_')) {
        return ad.ctaUrl;
      }
    }
    if (ad.videoUrl) {
      if (ad.videoUrl.includes('/watch/')) {
        return ad.videoUrl.split('/watch/')[1].split('?')[0];
      }
      if (ad.videoUrl.startsWith('video_')) {
        return ad.videoUrl;
      }
    }
    return null;
  };

  const targetVidId = getTargetVideoId();

  // Load SocialIndia video details if linked to get exact thumbnail and title
  useEffect(() => {
    if (targetVidId) {
      videoService.getVideo(targetVidId).then(v => {
        if (v) setSocialVideo(v);
      }).catch(console.warn);
    }
  }, [targetVidId]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (isDismissed) return null;

  const displayThumbnail = socialVideo?.thumbnailUrl || ad.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
  const displayTitle = ad.headline || ad.title || socialVideo?.title || 'Promoted Content';
  const displayAuthor = ad.creatorUsername || socialVideo?.creatorDisplayName || ad.sponsorName || 'Promoter';

  // Click on Thumbnail or Title -> Open Video directly
  const handleMediaOrTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ad.adId) {
      adService.recordAdClick(ad.adId);
    }

    if (targetVidId) {
      navigate('watch', targetVidId);
    } else {
      // Fallback to Ad Details info page if no direct video ID
      navigate('ad-info', ad.adId);
    }
  };

  // Click on "Learn More" -> Open YouTube-style Ad Center Info Page
  const handleLearnMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ad.adId) {
      adService.recordAdClick(ad.adId);
    }
    navigate('ad-info', ad.adId);
  };

  // SIDEBAR COMPACT LAYOUT (FOR WATCH PAGE)
  if (layout === 'sidebar') {
    return (
      <div className="bg-white dark:bg-[#111827] border border-amber-500/30 rounded-2xl p-2.5 shadow-xs relative overflow-hidden transition-all hover:border-amber-500/60 group">
        <button
          onClick={handleDismiss}
          className="absolute top-1.5 right-1.5 p-1 bg-black/40 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer z-10"
          title="Dismiss Ad"
        >
          <X className="w-3 h-3" />
        </button>

        <div className="flex gap-3">
          
          {/* Thumbnail */}
          <div 
            onClick={handleMediaOrTitleClick}
            className="w-28 sm:w-32 aspect-video shrink-0 rounded-xl overflow-hidden bg-slate-900 cursor-pointer relative group-hover:opacity-95 transition-opacity"
          >
            <img 
              src={displayThumbnail} 
              alt={displayTitle} 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] rounded-md uppercase tracking-wider shadow-xs">
              Sponsored
            </div>
            {targetVidId && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5 space-y-1 pr-4">
            <div>
              <h4 
                onClick={handleMediaOrTitleClick}
                className="text-xs font-black text-slate-900 dark:text-white line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 leading-snug"
              >
                {displayTitle}
              </h4>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                @{displayAuthor} • <span className="text-amber-600 dark:text-amber-400 font-extrabold">Sponsored</span>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={handleLearnMoreClick}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>Learn More</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // YOUTUBE MOBILE FEED VIDEO CARD STYLE (EXACT YOUTUBE UI)
  return (
    <div className="group cursor-pointer flex flex-col transition-all duration-200 w-full relative">
      
      {/* 16:9 Thumbnail Section */}
      <div 
        onClick={handleMediaOrTitleClick}
        className="relative w-full aspect-video bg-slate-900 dark:bg-[#1e293b] shrink-0 rounded-2xl overflow-hidden shadow-xs border border-slate-100 dark:border-slate-800/80 cursor-pointer"
      >
        <img 
          src={displayThumbnail} 
          alt={displayTitle} 
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
        />

        {/* Small YouTube-style Sponsored Badge */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-md uppercase tracking-wider shadow-md flex items-center gap-1">
          <Sparkles className="w-3 h-3 fill-slate-950" />
          <span>Sponsored</span>
        </div>

        {/* Play Button Overlay */}
        {targetVidId && (
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info Row Below Thumbnail (YouTube Mobile Feed Item) */}
      <div className="mt-3 flex items-start gap-3">
        
        {/* Sponsor Avatar */}
        <div 
          onClick={handleMediaOrTitleClick}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1e293b] shrink-0 overflow-hidden border border-slate-100 dark:border-slate-800 cursor-pointer flex items-center justify-center font-bold text-xs text-[#00A3FF]"
        >
          {ad.sponsorLogo ? (
            <img src={ad.sponsorLogo} alt="" className="w-full h-full object-cover" />
          ) : (
            (displayAuthor || 'A')[0].toUpperCase()
          )}
        </div>

        {/* Title & Metadata */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <h3 
            onClick={handleMediaOrTitleClick}
            className="text-sm font-bold text-slate-900 dark:text-[#f8fafc] leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400"
          >
            {displayTitle}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94a3b8] font-semibold flex-wrap pt-0.5">
            <span className="font-extrabold text-amber-600 dark:text-amber-400 text-[11px]">
              Sponsored
            </span>
            <span>•</span>
            <span className="truncate">@{displayAuthor}</span>
          </div>

          {ad.description && (
            <p className="text-xs text-slate-500 dark:text-[#94a3b8] line-clamp-1 font-medium">
              {ad.description}
            </p>
          )}
        </div>

        {/* Right Actions: Learn More Button + Options Menu */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5 relative">
          <button
            onClick={handleLearnMoreClick}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <span>Learn More</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* YouTube-style Options Dropdown Menu */}
          {menuOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-9 w-44 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 p-1 text-xs font-bold text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                onClick={(e) => {
                  setMenuOpen(false);
                  handleLearnMoreClick(e);
                }}
                className="w-full px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-left flex items-center gap-2 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-blue-500" />
                <span>About this ad</span>
              </button>
              <button
                onClick={(e) => {
                  setMenuOpen(false);
                  handleDismiss(e);
                }}
                className="w-full px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-left flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200"
              >
                <X className="w-3.5 h-3.5 text-rose-500" />
                <span>Hide this ad</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
