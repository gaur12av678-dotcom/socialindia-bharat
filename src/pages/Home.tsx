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

// Fallback curated Shorts to ensure all 5 vertical slots are always populated beautifully with working Cloud CDN streams
export const DEFAULT_CURATED_SHORTS: Partial<Video>[] = [
  {
    videoId: 'sample-short-1',
    title: 'Vande Bharat or Orange Snake 😮 A stunning video of Vande Bharat Express',
    videoUrl: 'https://res.cloudinary.com/wgk5kuxe/video/upload/v1790959177/socialindia_videos/snhqik26jkpwje0hbbrh.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    duration: 48,
    viewsCount: 14200,
    isShort: true,
    creatorId: 'c_nature_india',
    creatorDisplayName: 'Nature Explorer',
    creatorUsername: 'nature_india',
    creatorPhotoURL: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80'
  },
  {
    videoId: 'sample-short-2',
    title: 'Co-pilot Smit Machhar’s courage saved 180+ lives during cockpit emergency ✈️',
    videoUrl: 'https://res.cloudinary.com/wgk5kuxe/video/upload/v1791199131/socialindia_videos/b9toykpxtfctrgewy3je.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    duration: 32,
    viewsCount: 28900,
    isShort: true,
    creatorId: 'c_gaurav_saini',
    creatorDisplayName: 'Gaurav Saini',
    creatorUsername: 'gaurav_saini',
    creatorPhotoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
  },
  {
    videoId: 'sample-short-3',
    title: 'Minecraft Horror Is Very Creepy... #shorts 🎮',
    videoUrl: 'https://res.cloudinary.com/wgk5kuxe/video/upload/v1791129740/socialindia_videos/n4ulzx1ar4xrwilc8x4g.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    duration: 59,
    viewsCount: 56300,
    isShort: true,
    creatorId: 'c_progamer',
    creatorDisplayName: 'Pro Gamer India',
    creatorUsername: 'progamer',
    creatorPhotoURL: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80'
  },
  {
    videoId: 'sample-short-4',
    title: 'What a reply 🥶🔥 SocialIndia Trending Shorts',
    videoUrl: 'https://res.cloudinary.com/wgk5kuxe/video/upload/v1791729664/socialindia_videos/kstfqksi9zckb7hdw78d.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&auto=format&fit=crop&q=80',
    duration: 41,
    viewsCount: 39100,
    isShort: true,
    creatorId: 'c_delhivlogs',
    creatorDisplayName: 'Delhi Vlogs',
    creatorUsername: 'delhivlogs',
    creatorPhotoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  },
  {
    videoId: 'sample-short-5',
    title: 'AVOID these places — unless you’re ready for an unforgettable India! #shorts 📱',
    videoUrl: 'https://res.cloudinary.com/wgk5kuxe/video/upload/v1791612442/socialindia_videos/skktxp6ft9gkbu1rzctn.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    duration: 37,
    viewsCount: 47800,
    isShort: true,
    creatorId: 'c_techguru',
    creatorDisplayName: 'Tech Guru India',
    creatorUsername: 'techguru',
    creatorPhotoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
  }
];

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
    if (initialCachedShorts.length > 0) {
      const ranked = recommendationService.rankAndFilterVideos(initialCachedShorts, {
        isShortsOnly: true,
        userUid: currentUser?.uid
      });
      if (ranked.length < 5) {
        return [...ranked, ...DEFAULT_CURATED_SHORTS.slice(ranked.length) as Video[]];
      }
      return ranked;
    }
    return DEFAULT_CURATED_SHORTS as Video[];
  });

  const [loading, setLoading] = useState(() => !persistentHomeVideos && initialCachedVideos.length === 0);
  const [loadingShorts, setLoadingShorts] = useState(false);
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

  const fetchHomeShorts = async () => {
    try {
      const shortsData = await videoService.getVideos({
        isShort: true
      });
      const rankedShorts = recommendationService.rankAndFilterVideos(shortsData, {
        isShortsOnly: true,
        userUid: currentUser?.uid
      });

      if (rankedShorts.length < 5) {
        const merged = [...rankedShorts, ...DEFAULT_CURATED_SHORTS.slice(rankedShorts.length) as Video[]];
        setShorts(merged);
        persistentHomeShorts = merged;
      } else {
        setShorts(rankedShorts);
        persistentHomeShorts = rankedShorts;
      }
    } catch (err) {
      console.error(err);
      if (shorts.length === 0) {
        setShorts(DEFAULT_CURATED_SHORTS as Video[]);
        persistentHomeShorts = DEFAULT_CURATED_SHORTS as Video[];
      }
    } finally {
      setLoadingShorts(false);
    }
  };

  // YouTube-style feed refresh handler
  const handleRefreshFeed = async (showToast = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    persistentHomeScrollY = 0;
    try {
      await Promise.allSettled([
        fetchHomeVideos(true),
        fetchHomeShorts()
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

      {/* 2. Shorts Section (Positioned right after Row 1 - Exact Capture.PNG placement!) */}
      {selectedCategory === 'All' && (
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
                <div key={i} className="aspect-[9/16] rounded-2xl bg-slate-100 dark:bg-[#1f1f23] animate-pulse" />
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
