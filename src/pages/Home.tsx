import React, { useState, useEffect } from 'react';
import { videoService } from '../services/videoService';
import { recommendationService } from '../services/recommendationService';
import { Video } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { useApp } from '../context/AppContext';
import { adService } from '../services/adService';
import { AdCampaign } from '../types';
import { SponsoredAdCard } from '../components/ads/SponsoredAdCard';

export const categoriesList = [
  'All', 'Music', 'Gaming', 'Technology', 'Education', 'News', 'Sports', 'Entertainment', 'Coding', 'Science', 'Vlogs', 'Comedy', 'Shorts', 'Other'
];

export const Home: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAds, setActiveAds] = useState<AdCampaign[]>([]);
  const [adDismissed, setAdDismissed] = useState(false);

  useEffect(() => {
    adService.getActiveAds(5).then(setActiveAds).catch(console.warn);
  }, []);

  const fetchHomeVideos = async () => {
    setLoading(true);
    try {
      const data = await videoService.getVideos({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        isShort: false
      });
      
      // Apply AI Recommendation Engine (Anti-repeat + AI Engagement Ranking + Freshness Shuffle)
      const ranked = recommendationService.rankAndFilterVideos(data, {
        userUid: currentUser?.uid
      });

      setVideos(ranked);
    } catch (err) {
      console.error(err);
      addToast('Failed to load videos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeVideos();
  }, [selectedCategory]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      
      {/* Category Horizontal Scrolling Bar */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 sticky top-0 bg-white dark:bg-[#0f0f0f] z-20 pt-2 mb-2">
        {categoriesList.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-[#272727] dark:hover:bg-[#383838] dark:text-slate-200 border border-slate-200/60 dark:border-transparent'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Optional: Hero Banner - Made more compact or removed if too noisy */}
      {selectedCategory === 'All' && (
        <div className="relative overflow-hidden rounded-2xl bg-[#2563eb] p-6 text-white shadow-sm mb-8">
          <div className="relative z-10 max-w-2xl space-y-2">
            <h2 className="text-xl md:text-2xl font-black tracking-tight leading-snug">
              Discover the best creators in India
            </h2>
            <p className="text-xs text-white/90 leading-relaxed font-medium">
              Join millions watching the latest in tech, music, and vlogs.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
        </div>
      )}

      {/* Video Feed Section (With Embedded YouTube Style Sponsored Feed Card) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold tracking-wider text-slate-900 dark:text-white uppercase">
            {selectedCategory === 'All' ? 'Recommended Videos' : `${selectedCategory} Videos`}
          </h2>
        </div>

        <VideoGrid 
          videos={videos} 
          loading={loading} 
          activeAds={adDismissed ? [] : activeAds}
          onDismissAd={() => setAdDismissed(true)}
          emptyHeading="No videos available yet"
          emptyMessage="Videos published on SocialIndia will appear here."
        />
      </div>
    </div>
  );
};
