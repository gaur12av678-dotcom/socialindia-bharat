import React, { useState, useEffect, useRef } from 'react';
import { videoService } from '../services/videoService';
import { recommendationService } from '../services/recommendationService';
import { Video } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { adService } from '../services/adService';
import { AdCampaign } from '../types';
import { Flame, Zap, ArrowRight, Play, RotateCw, ArrowDown } from 'lucide-react';
import { useTranslation } from '../i18n';
import { ExternalAdBanner } from '../components/ads/ExternalAdBanner';

export const categoriesList = [
  'All', 'Music', 'Gaming', 'Technology', 'Education', 'News', 'Sports', 'Entertainment', 'Coding', 'Lifestyle', 'Science', 'Vlogs', 'Comedy'
];

export const categoryHindiMap: Record<string, string> = {
  'All': 'सभी',
  'Music': 'संगीत',
  'Gaming': 'गेमिंग',
  'Technology': 'तकनीक',
  'Education': 'शिक्षा',
  'News': 'समाचार',
  'Sports': 'खेल',
  'Entertainment': 'मनोरंजन',
  'Coding': 'कोडिंग',
  'Lifestyle': 'लाइफस्टाइल',
  'Science': 'विज्ञान',
  'Vlogs': 'व्लॉग्स',
  'Comedy': 'कॉमेडी'
};


// Persistent in-memory Home feed state (preserves loaded videos, shorts, category, and scroll position between route transitions like YouTube)
let persistentHomeVideos: Video[] | null = null;
let persistentHomeShorts: Video[] | null = null;
let persistentHomeCategory = 'All';
let persistentHomeScrollY = 0;
let hasLoadedHomeOnce = false;

export const Home: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { route, navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState(route.searchParams?.category || persistentHomeCategory || 'All');
  
  // Instant synchronous cache resolution (0ms initial render)
  const initialCategory = (route.searchParams?.category || selectedCategory) === 'All' ? undefined : (route.searchParams?.category || selectedCategory);
  const initialCachedVideos = videoService.getCachedVideos({
    category: initialCategory,
    isShort: false
  });
  const initialCachedShorts = videoService.getCachedVideos({ isShort: true });

  const [videos, setVideos] = useState<Video[]>(() => {
    if (persistentHomeVideos && persistentHomeVideos.length > 0) {
      return persistentHomeVideos;
    }
    if (initialCachedVideos.length > 0) {
      return recommendationService.rankAndFilterVideos(initialCachedVideos, {
        userUid: currentUser?.uid
      });
    }
    return [];
  });

  const [shorts, setShorts] = useState<Video[]>(() => {
    if (persistentHomeShorts && persistentHomeShorts.length > 0) {
      return persistentHomeShorts;
    }
    return [];
  });

  const [loading, setLoading] = useState(() => !(persistentHomeVideos && persistentHomeVideos.length > 0));
  const [loadingShorts, setLoadingShorts] = useState(() => !(persistentHomeShorts && persistentHomeShorts.length > 0));
  const [activeAds, setActiveAds] = useState<AdCampaign[]>([]);
  const [adDismissed, setAdDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile Pull-to-Refresh Gesture States
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);

  // Sync category with URL query param if present
  useEffect(() => {
    if (route.searchParams?.category) {
      setSelectedCategory(route.searchParams.category);
    }
  }, [route.searchParams?.category]);

  // Restore scroll position when returning to Home like YouTube
  useEffect(() => {
    if (persistentHomeScrollY > 0) {
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: persistentHomeScrollY, behavior: 'instant' });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      persistentHomeScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      persistentHomeScrollY = window.scrollY;
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    adService.getActiveAds(5).then(setActiveAds).catch(console.warn);
  }, []);

  const fetchHomeVideos = async (_forceFresh = false) => {
    if (videos.length === 0) {
      setLoading(true);
    }
    try {
      const data = await videoService.getVideos({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        isShort: false
      });
      
      const ranked = recommendationService.rankAndFilterVideos(data, {
        userUid: currentUser?.uid
      });

      setVideos(ranked);
      persistentHomeVideos = ranked;
      hasLoadedHomeOnce = true;
    } catch (err) {
      console.error(err);
      if (videos.length === 0) {
        addToast('Failed to load videos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHomeShorts = async (forceFresh = false) => {
    if (shorts.length === 0 || forceFresh) {
      setLoadingShorts(true);
    }
    try {
      const shortsData = await videoService.getVideos({
        isShort: true
      });
      const rankedShorts = recommendationService.rankAndFilterVideos(shortsData, {
        isShortsOnly: true,
        userUid: currentUser?.uid
      });
      setShorts(rankedShorts);
      persistentHomeShorts = rankedShorts;
    } catch (err) {
      console.error(err);
      if (shorts.length === 0) {
        setShorts([]);
        persistentHomeShorts = [];
      }
    } finally {
      setLoadingShorts(false);
    }
  };

  // YouTube-style feed refresh handler
  const handleRefreshFeed = async (_showToast = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    persistentHomeScrollY = 0;
    try {
      await Promise.allSettled([
        fetchHomeVideos(true),
        fetchHomeShorts(true)
      ]);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  // Listen for Home/Logo click while already on Home to trigger refresh
  useEffect(() => {
    const onHomeRefreshEvent = () => {
      handleRefreshFeed(false);
    };
    window.addEventListener('socialindia:refresh-home', onHomeRefreshEvent);
    return () => window.removeEventListener('socialindia:refresh-home', onHomeRefreshEvent);
  }, [selectedCategory]);

  // Load feed on category change or first initial load only (Never re-fetches when navigating back to home!)
  useEffect(() => {
    if (hasLoadedHomeOnce && persistentHomeVideos && persistentHomeVideos.length > 0 && persistentHomeCategory === selectedCategory) {
      return;
    }
    persistentHomeCategory = selectedCategory;
    fetchHomeVideos();
    fetchHomeShorts();
  }, [selectedCategory]);

  // Touch handlers for Mobile Pull-to-Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 2) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    } else {
      setIsPulling(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    if (window.scrollY > 2) {
      setPullDistance(0);
      return;
    }
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      const damped = Math.min(diff * 0.45, 80);
      setPullDistance(damped);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling || isRefreshing) return;
    if (pullDistance >= 55) {
      handleRefreshFeed(true);
    } else {
      setPullDistance(0);
    }
    setIsPulling(false);
  };

  // For the 'All' feed, split videos so the top 4 (Row 1) display above Shorts, matching reference design!
  const firstRowVideos = selectedCategory === 'All' ? videos.slice(0, 4) : videos;
  const remainingVideos = selectedCategory === 'All' ? videos.slice(4) : [];

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="p-4 md:p-6 space-y-7 max-w-7xl mx-auto relative"
    >
      {/* YouTube-style Pull to Refresh Spinner Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          style={{ transform: `translateY(${pullDistance}px)` }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-transform duration-100 ease-out"
        >
          <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1f2024] shadow-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#2563eb]">
            {isRefreshing ? (
              <RotateCw className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowDown 
                className="w-5 h-5 transition-transform" 
                style={{ transform: `rotate(${Math.min(pullDistance * 4, 180)}deg)` }} 
              />
            )}
          </div>
        </div>
      )}
      


      {/* 1. Recommended Videos Section (Row 1) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500 fill-red-500 shrink-0" />
            <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {isHindi 
                ? (selectedCategory === 'All' ? 'अनुशंसित वीडियो' : `${categoryHindiMap[selectedCategory] || selectedCategory} वीडियो`) 
                : (selectedCategory === 'All' ? 'Recommended Videos' : `${selectedCategory} Videos`)}
            </h2>
          </div>
          
          <button 
            onClick={() => navigate('trending')}
            className="text-xs font-bold text-[#065fd4] dark:text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isHindi ? 'सभी देखें' : 'See All'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <VideoGrid 
          videos={firstRowVideos} 
          loading={loading} 
          activeAds={adDismissed ? [] : activeAds}
          onDismissAd={() => setAdDismissed(true)}
          gridColsClass="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          emptyHeading={isHindi ? 'अभी कोई वीडियो उपलब्ध नहीं है' : 'No videos available yet'}
          emptyMessage={isHindi ? 'सोशलइंडिया पर प्रकाशित वीडियो यहां दिखाई देंगे।' : 'Videos published on SocialIndia will appear here.'}
        />
      </div>

      {/* 2. Shorts Section (Only shown if loading or if real shorts exist) */}
      {selectedCategory === 'All' && (loadingShorts || shorts.length > 0) && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Zap className="w-3.5 h-3.5 fill-current" />
              </div>
              <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {t('nav_shorts', 'Shorts')}
              </h2>
            </div>

            <button 
              onClick={() => navigate('shorts')}
              className="text-xs font-bold text-[#065fd4] dark:text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isHindi ? 'सभी देखें' : 'See All'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingShorts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-2 animate-pulse">
                  <div className="aspect-[9/16] w-full rounded-2xl bg-[#dbe2ee] dark:bg-slate-800 relative overflow-hidden shadow-xs">
                    <div className="absolute bottom-2.5 right-2.5 h-4 w-8 bg-[#bcc8dc] dark:bg-slate-700 rounded-md" />
                  </div>
                  <div className="space-y-1.5 px-0.5 pt-1">
                    <div className="h-3.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[85%]" />
                    <div className="h-2.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[50%]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {shorts.slice(0, 5).map((short) => (
                <div
                  key={short.videoId}
                  onClick={() => navigate('shorts', short.videoId)}
                  className="group relative cursor-pointer select-none"
                >
                  <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-md">
                    {short.thumbnailUrl ? (
                      <img 
                        src={short.thumbnailUrl} 
                        alt={short.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
                        <Zap className="w-8 h-8 text-white/50 mb-1" />
                        <span className="text-[11px] text-white/70 font-semibold truncate max-w-[90%]">{short.title}</span>
                      </div>
                    )}
                    
                    {/* Dark gradient scrim at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 group-hover:from-black/90 transition-colors" />

                    {/* Play Button Overlay on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold rounded-md">
                      {short.duration ? `${Math.floor(short.duration / 60)}:${(short.duration % 60).toString().padStart(2, '0')}` : '0:45'}
                    </div>
                  </div>

                  {/* Short Title & Views */}
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-[#065fd4] dark:group-hover:text-[#3b82f6] transition-colors">
                      {short.title}
                    </p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                      {short.viewsCount ? (isHindi ? `${(short.viewsCount / 1000).toFixed(1)}k व्यूज़` : `${short.viewsCount.toLocaleString()} views`) : (isHindi ? '1.2k व्यूज़' : '1.2k views')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* External Native / Iframe Ad Banner (YouTube Style, rotating location) */}
      <div className="my-6">
        <ExternalAdBanner type="random" locationTag="home-feed-middle" />
      </div>

      {/* 3. More Videos Section (If more than 3 videos exist) */}
      {selectedCategory === 'All' && remainingVideos.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {isHindi ? 'आपके लिए और वीडियो' : 'More Videos For You'}
            </h2>
          </div>

          <VideoGrid 
            videos={remainingVideos} 
            loading={false} 
            activeAds={[]}
            gridColsClass="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            emptyHeading={isHindi ? 'कोई और वीडियो नहीं' : 'No more videos'}
            emptyMessage={isHindi ? 'अधिक वीडियो प्रकाशित होने पर यहां दिखाई देंगे।' : 'More videos will appear here.'}
          />
        </div>
      )}

    </div>
  );
};
