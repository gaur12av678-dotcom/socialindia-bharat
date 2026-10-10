import React, { useState, useEffect } from 'react';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { Flame } from 'lucide-react';
import { useTranslation } from '../i18n';

export const Trending: React.FC = () => {
  const { t, isHindi } = useTranslation();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingVideos = async () => {
      setLoading(true);
      try {
        const all = await videoService.getVideos();
        // Sort by viewsCount descending, then likesCount descending to rank trending
        const ranked = all.sort((a, b) => {
          const rankA = (a.viewsCount || 0) * 1.5 + (a.likesCount || 0) * 3;
          const rankB = (b.viewsCount || 0) * 1.5 + (b.likesCount || 0) * 3;
          return rankB - rankA;
        });
        setVideos(ranked);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrendingVideos();
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      
      {/* Title Header */}
      <div className="flex items-center gap-2.5">
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-amber-500 rounded-xl">
          <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
            {t('trending_title', 'Trending Now')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
            {isHindi 
              ? 'आज भारत भर में सबसे ज़्यादा देखे जाने वाले और लोकप्रिय वीडियो' 
              : 'Most watched, commented and liked video creators across India today'}
          </p>
        </div>
      </div>

      {/* Video Feed */}
      <VideoGrid 
        videos={videos} 
        loading={loading} 
        emptyMessage={isHindi ? 'अभी कोई ट्रेंडिंग वीडियो उपलब्ध नहीं है।' : 'No trending video entries calculated yet.'}
      />
    </div>
  );
};
