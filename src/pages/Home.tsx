import React, { useState, useEffect, useRef } from 'react';
import { videoService } from '../services/videoService';
import { recommendationService } from '../services/recommendationService';
import { Video } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { adService } from '../services/adService';
import { AdCampaign } from '../types';
import { Flame, Zap, ArrowRight, Play, RotateCw, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../i18n';
import { ExternalAdBanner } from '../components/ads/ExternalAdBanner';
import { ShortsLogo } from '../components/ShortsLogo';
import { Subscriptions } from './Subscriptions';

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


// Helper to filter videos strictly by category in 0ms (sub-millisecond)
// 'All' shows all videos. Specific category shows ONLY videos belonging to that exact category!
export const getFilteredVideosForCategory = (category: string, sourceVideos: Video[]): Video[] => {
  if (!category || category === 'All') return sourceVideos;
  const target = category.toLowerCase().trim();
  const targetHindi = categoryHindiMap[category] ? categoryHindiMap[category].toLowerCase().trim() : '';

  return sourceVideos.filter(v => {
    const vCat = (v.category || '').toLowerCase().trim();
    return vCat === target || (Boolean(targetHindi) && vCat === targetHindi);
  });
};

// Persistent in-memory Home feed state (preserves master videos, shorts, category, and scroll position like YouTube)
let persistentMasterVideos: Video[] = [];
let persistentHomeShorts: Video[] | null = null;
let persistentHomeCategory = 'All';
let persistentHomeScrollY = 0;
let hasLoadedHomeOnce = false;

const INITIAL_BATCH_COUNT = 12;
const BATCH_INCREMENT = 12;

export const Home: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { route, navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState(route.searchParams?.category || persistentHomeCategory || 'All');
  const [mobileFeedTab, setMobileFeedTab] = useState<'all' | 'following'>('all');
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  
  // Incremental batch rendering to prevent UI lag and avoid rendering 50+ videos upfront
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_COUNT);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Master in-memory video repository for instant 0ms filtering
  const initialAllCached = videoService.getCachedVideos({ isShort: false });
  const initialCachedShorts = videoService.getCachedVideos({ isShort: true });

  const masterVideosRef = useRef<Video[]>(
    persistentMasterVideos.length > 0 
      ? persistentMasterVideos 
      : (initialAllCached.length > 0 ? initialAllCached : [])
  );
  if (persistentMasterVideos.length === 0 && initialAllCached.length > 0) {
    persistentMasterVideos = initialAllCached;
  }

  const [videos, setVideos] = useState<Video[]>(() => {
    if (masterVideosRef.current.length > 0) {
      return recommendationService.rankAndFilterVideos(
        getFilteredVideosForCategory(selectedCategory, masterVideosRef.current),
        { userUid: currentUser?.uid }
      );
    }
    if (initialAllCached.length > 0) {
      return recommendationService.rankAndFilterVideos(
        getFilteredVideosForCategory(selectedCategory, initialAllCached), 
        { userUid: currentUser?.uid }
      );
    }
    return [];
  });

  const [shorts, setShorts] = useState<Video[]>(() => {
    if (persistentHomeShorts && persistentHomeShorts.length > 0) {
      return persistentHomeShorts;
    }
    if (initialCachedShorts.length > 0) {
      return recommendationService.getShortsRecommendations({
        allShorts: initialCachedShorts,
        userUid: currentUser?.uid,
        limit: 15
      });
    }
    return [];
  });

  const [loading, setLoading] = useState(() => !(masterVideosRef.current.length > 0 || initialAllCached.length > 0));
  const [loadingShorts, setLoadingShorts] = useState(() => {
    if (persistentHomeShorts && persistentHomeShorts.length > 0) return false;
    if (initialCachedShorts.length > 0) return false;
    return true;
  });
  const [activeAds, setActiveAds] = useState<AdCampaign[]>([]);
  const [adDismissed, setAdDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile Pull-to-Refresh Gesture States
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);

  // Category Filter Chips Horizontal Scroll State (YouTube Style)
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Shorts Horizontal Scroll Shelf State (YouTube Style)
  const shortsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollShortsLeft, setCanScrollShortsLeft] = useState(false);
  const [canScrollShortsRight, setCanScrollShortsRight] = useState(false);

  const checkShortsScroll = () => {
    if (shortsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = shortsScrollRef.current;
      setCanScrollShortsLeft(scrollLeft > 10);
      setCanScrollShortsRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scrollShorts = (direction: 'left' | 'right') => {
    if (shortsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      shortsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkShortsScroll, 250);
    }
  };

  const checkFilterScroll = () => {
    if (filterScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = filterScrollRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  const scrollFilter = (direction: 'left' | 'right') => {
    if (filterScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      filterScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkFilterScroll, 220);
    }
  };

  useEffect(() => {
    checkFilterScroll();
    checkShortsScroll();
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
      checkFilterScroll();
      checkShortsScroll();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [shorts.length]);

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

  const handleCategorySelect = (cat: string) => {
    if (selectedCategory === cat) return;
    setSelectedCategory(cat);
    persistentHomeCategory = cat;
    setVisibleCount(INITIAL_BATCH_COUNT);

    // Scroll to top of main container or window
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 100% INSTANT 0ms filter from masterVideos in memory
    const instantFiltered = getFilteredVideosForCategory(cat, masterVideosRef.current);
    const ranked = recommendationService.rankAndFilterVideos(instantFiltered, {
      userUid: currentUser?.uid
    });
    setVideos(ranked);
    setLoading(false);
  };

  const fetchHomeVideos = async (forceFresh = false) => {
    // Only show loading skeleton if no videos are loaded at all
    if (masterVideosRef.current.length === 0 || forceFresh) {
      setLoading(true);
    }
    try {
      // Fetch public videos with limit 60 for ultra-fast response
      const data = await videoService.getVideos({
        isShort: false,
        limit: 60
      });
      
      masterVideosRef.current = data;
      persistentMasterVideos = data;

      const filtered = getFilteredVideosForCategory(selectedCategory, data);
      const ranked = recommendationService.rankAndFilterVideos(filtered, {
        userUid: currentUser?.uid
      });

      setVideos(ranked);
      hasLoadedHomeOnce = true;
    } catch (err) {
      console.error(err);
      if (videos.length === 0 && masterVideosRef.current.length === 0) {
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
        isShort: true,
        limit: 25
      });
      const rankedShorts = recommendationService.getShortsRecommendations({
        allShorts: shortsData,
        userUid: currentUser?.uid,
        limit: 15
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
      setTimeout(checkShortsScroll, 200);
    }
  };

  // YouTube-style feed refresh handler
  const handleRefreshFeed = async (_showToast = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setVisibleCount(INITIAL_BATCH_COUNT);
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

  // Synchronize category change instantly (0ms) without refetching from network
  useEffect(() => {
    persistentHomeCategory = selectedCategory;
    setVisibleCount(INITIAL_BATCH_COUNT);

    // 0ms instant filter from in-memory videos
    if (masterVideosRef.current.length > 0) {
      const instant = getFilteredVideosForCategory(selectedCategory, masterVideosRef.current);
      const ranked = recommendationService.rankAndFilterVideos(instant, {
        userUid: currentUser?.uid
      });
      setVideos(ranked);
      setLoading(false);
    }

    // Only initiate network fetch if master videos haven't loaded yet
    if (!hasLoadedHomeOnce || masterVideosRef.current.length === 0) {
      fetchHomeVideos();
    }

    // Only load shorts on initial load
    if (!persistentHomeShorts || persistentHomeShorts.length === 0) {
      fetchHomeShorts();
    }
  }, [selectedCategory]);

  // Failsafe: dismiss skeleton quickly if videos or cached data exist (<700ms)
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      if (masterVideosRef.current.length > 0 || videos.length > 0) {
        setLoading(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [loading, videos.length]);

  // Failsafe for shorts: never leave blank gray skeleton hanging
  useEffect(() => {
    if (!loadingShorts) return;
    const timer = setTimeout(() => {
      setLoadingShorts(false);
    }, 750);
    return () => clearTimeout(timer);
  }, [loadingShorts]);

  // Infinite Scroll IntersectionObserver & Scroll Listener:
  // Dynamically increments visibleCount as user scrolls near bottom
  useEffect(() => {
    if (visibleCount >= videos.length) return;

    let observer: IntersectionObserver | null = null;
    const currentSentinel = sentinelRef.current;

    if (typeof IntersectionObserver !== 'undefined' && currentSentinel) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, videos.length));
          }
        },
        { rootMargin: '600px', threshold: 0.05 }
      );
      observer.observe(currentSentinel);
    }

    const onScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollY + windowHeight >= docHeight - 750) {
        setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, videos.length));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (observer && currentSentinel) {
        observer.unobserve(currentSentinel);
      }
      window.removeEventListener('scroll', onScroll);
    };
  }, [visibleCount, videos.length]);

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

  const isFollowingFeed = isMobileViewport && mobileFeedTab === 'following';

  // YouTube-style Incremental Batch Rendering:
  // For 'All': Top 3 in Row 1 above Shorts, then YouTube-style algorithm recommendations for "More Videos For You"
  // For specific category: slices up to visibleCount (starts with 12)
  const firstRowVideos = selectedCategory === 'All' ? videos.slice(0, 3) : videos.slice(0, visibleCount);

  // YouTube-style recommendation algorithm for "More Videos For You"
  const moreVideos = React.useMemo(() => {
    if (isFollowingFeed || selectedCategory !== 'All' || masterVideosRef.current.length === 0) return [];
    const firstRowIds = firstRowVideos.map(v => v.videoId);
    return recommendationService.getHomeMoreVideosRecommendations({
      allVideos: masterVideosRef.current,
      firstRowIds,
      userUid: currentUser?.uid
    });
  }, [isFollowingFeed, selectedCategory, firstRowVideos, currentUser?.uid]);

  const displayedMoreVideos = !isFollowingFeed && selectedCategory === 'All'
    ? moreVideos.slice(0, Math.max(0, visibleCount - 3))
    : [];

  const hasMoreVideos = !isFollowingFeed && (
    selectedCategory === 'All'
      ? visibleCount - 3 < moreVideos.length
      : visibleCount < videos.length
  );

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-screen"
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

      {/* Top Filter Bar: Mobile Instagram-style All/Following tabs | Desktop YouTube-style Category Chips */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/80 transition-colors shadow-2xs">
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6">
          {/* Mobile Only: Instagram-style All & Following Tabs (replaces category filter chips on mobile) */}
          <div
            aria-label="Home feed filter"
            className="grid grid-cols-2 md:hidden w-full"
          >
            <button
              type="button"
              aria-current={mobileFeedTab === 'all' ? 'true' : undefined}
              onClick={() => {
                setMobileFeedTab('all');
                setVisibleCount(INITIAL_BATCH_COUNT);
                if (selectedCategory !== 'All') {
                  handleCategorySelect('All');
                }
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className={`relative py-2.5 text-[13px] tracking-wide transition-colors cursor-pointer flex items-center justify-center ${
                mobileFeedTab === 'all'
                  ? 'font-extrabold text-slate-900 dark:text-white'
                  : 'font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{isHindi ? 'सभी' : 'All'}</span>
              {mobileFeedTab === 'all' && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2.5px] rounded-full bg-slate-900 dark:bg-white" />
              )}
            </button>

            <button
              type="button"
              aria-current={mobileFeedTab === 'following' ? 'true' : undefined}
              onClick={() => {
                setMobileFeedTab('following');
                setVisibleCount(INITIAL_BATCH_COUNT);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className={`relative py-2.5 text-[13px] tracking-wide transition-colors cursor-pointer flex items-center justify-center ${
                mobileFeedTab === 'following'
                  ? 'font-extrabold text-slate-900 dark:text-white'
                  : 'font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{isHindi ? 'फ़ॉलोइंग' : 'Following'}</span>
              {mobileFeedTab === 'following' && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2.5px] rounded-full bg-slate-900 dark:bg-white" />
              )}
            </button>
          </div>

          {/* Desktop Only: Left Scroll Button with Gradient Fade */}
          {canScrollLeft && (
            <div className="hidden md:flex absolute left-0 top-0 bottom-0 z-10 items-center pr-3 pl-2 bg-gradient-to-r from-white via-white/95 to-transparent dark:from-[#0f0f0f] dark:via-[#0f0f0f]/95">
              <button
                type="button"
                onClick={() => scrollFilter('left')}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#272727] hover:bg-slate-100 dark:hover:bg-[#3f3f3f] shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-all active:scale-95"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Desktop Only: Category Chips Container */}
          <div 
            ref={filterScrollRef}
            onScroll={checkFilterScroll}
            data-no-scrollbar="true"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="hidden md:flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar py-2.5 px-0.5 scroll-smooth select-none"
          >
            {categoriesList.map((cat) => {
              const isSelected = selectedCategory === cat;
              const label = isHindi ? (categoryHindiMap[cat] || cat) : cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`h-8 px-3.5 rounded-lg text-xs whitespace-nowrap transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 flex items-center justify-center border ${
                    isSelected
                      ? 'yt-chip-active shadow-xs'
                      : 'yt-chip-inactive'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop Only: Right Scroll Button with Gradient Fade */}
          {canScrollRight && (
            <div className="hidden md:flex absolute right-0 top-0 bottom-0 z-10 items-center pl-3 pr-2 bg-gradient-to-l from-white via-white/95 to-transparent dark:from-[#0f0f0f] dark:via-[#0f0f0f]/95">
              <button
                type="button"
                onClick={() => scrollFilter('right')}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#272727] hover:bg-slate-100 dark:hover:bg-[#3f3f3f] shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-all active:scale-95"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Home Feed Content */}
      {isFollowingFeed ? (
        <Subscriptions
          embedded
          onSwitchToAll={() => {
            setMobileFeedTab('all');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      ) : (
      <div className="p-4 md:p-6 space-y-7 max-w-7xl mx-auto">
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
          gridColsClass="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          emptyHeading={isHindi ? 'अभी कोई वीडियो उपलब्ध नहीं है' : 'No videos available yet'}
          emptyMessage={isHindi ? 'सोशलइंडिया पर प्रकाशित वीडियो यहां दिखाई देंगे।' : 'Videos published on SocialIndia will appear here.'}
        />
      </div>

      {/* 2. Clips Section (Progressive vertical-video shelf with algorithmic rotation) */}
      {selectedCategory === 'All' && (loadingShorts || shorts.length > 0) && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShortsLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-sm" />
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('nav_shorts', 'Shorts')}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop Scroll Buttons */}
              {canScrollShortsLeft && (
                <button
                  type="button"
                  onClick={() => scrollShorts('left')}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 hidden sm:flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all active:scale-90"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
              {canScrollShortsRight && (
                <button
                  type="button"
                  onClick={() => scrollShorts('right')}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 hidden sm:flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all active:scale-90"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}

              <button 
                onClick={() => navigate('shorts')}
                className="text-xs font-bold text-[#065fd4] dark:text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer ml-1"
              >
                <span>{isHindi ? 'सभी देखें' : 'See All'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loadingShorts && shorts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  style={{ animationDelay: `${i * 90}ms` }}
                  className="flex flex-col space-y-2 animate-pulse"
                >
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
            <div 
              ref={shortsScrollRef}
              onScroll={checkShortsScroll}
              data-no-scrollbar="true"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-none no-scrollbar scroll-smooth py-1 px-0.5"
            >
              {shorts.map((short, idx) => (
                <a
                  key={short.videoId}
                  href={`#/shorts/${short.videoId}`}
                  draggable={true}
                  title={short.title}
                  onClick={(e) => {
                    if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                    e.preventDefault();
                    navigate('shorts', short.videoId);
                  }}
                  style={{
                    animationDelay: `${Math.min(idx, 8) * 60}ms`,
                    animationFillMode: 'both'
                  }}
                  className="w-[150px] sm:w-[180px] md:w-[200px] lg:w-[215px] shrink-0 group relative block cursor-pointer select-none transition-transform active:scale-[0.98]"
                >
                  <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-md">
                    {short.thumbnailUrl ? (
                      <img 
                        src={short.thumbnailUrl} 
                        alt={short.title} 
                        loading="lazy"
                        draggable={false}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex flex-col items-center justify-center p-3 text-center pointer-events-none">
                        <ShortsLogo className="w-8 h-8 mb-1" />
                        <span className="text-[11px] text-white/70 font-semibold truncate max-w-[90%]">{short.title}</span>
                      </div>
                    )}
                    
                    {/* Dark gradient scrim at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 group-hover:from-black/90 transition-colors pointer-events-none" />

                    {/* Play Button Overlay on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold rounded-md pointer-events-none">
                      {short.duration ? `${Math.floor(short.duration / 60)}:${(short.duration % 60).toString().padStart(2, '0')}` : '0:45'}
                    </div>
                  </div>

                  {/* Short Title & Creator & Views */}
                  <div className="mt-2 space-y-0.5 px-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-[#065fd4] dark:group-hover:text-[#3b82f6] transition-colors">
                      {short.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span className="truncate max-w-[120px]">{short.creatorDisplayName || short.creatorUsername}</span>
                      <span>•</span>
                      <span className="shrink-0">
                        {short.viewsCount ? (isHindi ? `${(short.viewsCount / 1000).toFixed(1)}k व्यूज़` : `${short.viewsCount.toLocaleString()} views`) : (isHindi ? '1.2k व्यूज़' : '1.2k views')}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* External Native / Iframe Ad Banner (YouTube Style, rotating location) */}
      <div className="my-6">
        <ExternalAdBanner type="random" locationTag="home-feed-middle" />
      </div>

      {/* 3. More Videos Section (YouTube Algorithm Recommended Videos) */}
      {selectedCategory === 'All' && displayedMoreVideos.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {isHindi ? 'आपके लिए और वीडियो' : 'More Videos For You'}
            </h2>
          </div>

          <VideoGrid 
            videos={displayedMoreVideos} 
            loading={false} 
            activeAds={[]}
            gridColsClass="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            emptyHeading={isHindi ? 'कोई और वीडियो नहीं' : 'No more videos'}
            emptyMessage={isHindi ? 'अधिक वीडियो प्रकाशित होने पर यहां दिखाई देंगे।' : 'More videos will appear here.'}
          />
        </div>
      )}

      {/* Infinite Scroll Sentinel element & Smooth Bottom Loading Indicator */}
      <div ref={sentinelRef} className="h-6 w-full pointer-events-none" />

      {hasMoreVideos && (
        <div className="flex flex-col items-center justify-center py-6 gap-2 select-none">
          <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-700 border-t-[#2563eb] dark:border-t-[#3b82f6] rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isHindi ? 'अधिक वीडियो लोड हो रहे हैं...' : 'Loading more videos...'}
          </span>
        </div>
      )}
      </div>
      )}
    </div>
  );
};
