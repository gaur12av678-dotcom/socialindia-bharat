import React from 'react';
import { Video, AdCampaign } from '../types';
import { VideoCard } from './VideoCard';
import { SponsoredAdCard } from './ads/SponsoredAdCard';
import { Play, Plus } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';

interface VideoGridProps {
  videos: Video[];
  loading: boolean;
  activeAds?: AdCampaign[];
  onDismissAd?: () => void;
  emptyHeading?: string;
  emptyMessage?: string;
  gridColsClass?: string;
}

export const VideoGrid: React.FC<VideoGridProps> = ({ 
  videos, 
  loading, 
  activeAds = [],
  onDismissAd,
  emptyHeading = 'No videos available yet',
  emptyMessage = 'Videos published on SocialIndia will appear here.',
  gridColsClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10'
}) => {
  const { navigate } = useRouter();
  const { currentUser } = useApp();

  if (loading) {
    return (
      <div className={gridColsClass}>
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="flex flex-col space-y-4 animate-pulse">
            <div className="aspect-video bg-slate-100 dark:bg-[#1e293b] w-full rounded-2xl shadow-inner border border-slate-50 dark:border-slate-800" />
            <div className="flex gap-3 px-1">
              <div className="w-10 h-10 bg-slate-100 dark:bg-[#1e293b] rounded-full shrink-0" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="h-3.5 bg-slate-100 dark:bg-[#1e293b] rounded-lg w-[90%]" />
                <div className="space-y-2">
                  <div className="h-2.5 bg-slate-100 dark:bg-[#1e293b] rounded-lg w-[40%]" />
                  <div className="h-2.5 bg-slate-100 dark:bg-[#1e293b] rounded-lg w-[30%]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="space-y-6">
        {activeAds && activeAds.length > 0 && (
          <SponsoredAdCard ad={activeAds[0]} layout="feed" onDismiss={onDismissAd} />
        )}

        <div className="flex flex-col items-center justify-center py-16 px-4 text-center my-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl shadow-xs">
          <div className="w-16 h-16 bg-[#eff6ff] dark:bg-[#1e293b] text-[#2563eb] dark:text-[#3b82f6] rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/30 shadow-xs">
            <Play className="w-7 h-7 fill-current ml-0.5" />
          </div>
          <h4 className="text-base font-extrabold text-slate-900 dark:text-[#f8fafc]">
            {emptyHeading}
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-1 max-w-sm font-medium">
            {emptyMessage}
          </p>

          <button
            onClick={() => navigate('studio')}
            className="mt-5 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Publish Video</span>
          </button>
        </div>
      </div>
    );
  }

  // Insert Sponsored Ad item at position 1 (between 1st and 2nd video, or 2nd and 3rd video)
  const hasAd = activeAds && activeAds.length > 0;
  const adInsertIndex = videos.length >= 2 ? 1 : 0;

  return (
    <div className={gridColsClass}>
      {videos.map((video, idx) => (
        <React.Fragment key={video.videoId}>
          {hasAd && idx === adInsertIndex && (
            <SponsoredAdCard 
              ad={activeAds[0]} 
              layout="feed" 
              onDismiss={onDismissAd} 
            />
          )}
          <VideoCard video={video} />
        </React.Fragment>
      ))}

      {/* If videos list is shorter than insert index, append ad */}
      {hasAd && videos.length <= adInsertIndex && (
        <SponsoredAdCard 
          ad={activeAds[0]} 
          layout="feed" 
          onDismiss={onDismissAd} 
        />
      )}
    </div>
  );
};
