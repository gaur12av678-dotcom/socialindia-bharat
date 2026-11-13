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
let persistentRankedVideos: Video[] = [];
let persistentExtraMoreVideos: Video[] = [];
let persistentMoreDisplayCount = 18;
let persistentHomeShorts: Video[] | null = null;
let persistentHomeCategory = 'All';
let persistentHomeScrollY = 0;
let persistentLastVideoDoc: any = null;
let persistentHasMoreVideos = true;
let hasLoadedHomeOnce = false;
let hasFetchedShortsOnce = false;

interface HomeClipCardProps {
  short: Video;
  idx: number;
  isHindi: boolean;
  onOpen: (videoId: string) => void;
}

const HomeClipCard: React.FC<HomeClipCardProps> = ({ short, idx, isHindi, onOpen }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgLoaded(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, [short.videoId, short.thumbnailUrl]);

  return (
    <a
      href={`#/shorts/${short.videoId}`}
      draggable={true}
      title={short.title}
      onClick={(e) => {
        if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        onOpen(short.videoId);
      }}
      style={{
        animationDelay: `${Math.min(idx, 8) * 45}ms`,
        animationFillMode: 'both'
      }}
      className="yt-card-animate w-[150px] sm:w-[180px] md:w-[200px] lg:w-[215px] shrink-0 group relative block cursor-pointer select-none transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-[#dbe2ee] dark:bg-slate-800 shadow-md">
        {short.thumbnailUrl && !imgLoaded && (
          <div className="absolute inset-0 bg-[#dbe2ee] dark:bg-slate-800 animate-pulse z-0" />
        )}
        {short.thumbnailUrl ? (
          <img
            ref={imgRef}
            src={short.thumbnailUrl}
            alt={short.title}
            loading={idx < 4 ? 'eager' : 'lazy'}
            fetchPriority={idx < 4 ? 'high' : 'auto'}
            decoding="async"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              if (!e.currentTarget.dataset.fallbackApplied) {
                e.currentTarget.dataset.fallbackApplied = '1';
                e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60';
              } else {
                setImgLoaded(true);
              }
            }}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 pointer-events-none select-none ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
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
  );
};

export const Home: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { route, navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState(route.searchParams?.category || persistentHomeCategory || 'All');
  const [mobileFeedTab, setMobileFeedTab] = useState<'all' | 'following'>('all');
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

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
    if (persistentRankedVideos.length > 0 && selectedCategory === persistentHomeCategory) {
      return persistentRankedVideos;
    }
    const source = masterVideosRef.current.length > 0 ? masterVideosRef.current : initialAllCached;
    if (source.length > 0) {
      const filtered = getFilteredVideosForCategory(selectedCategory, source);
      const ranked = recommendationService.rankAndFilterVideos(filtered, {
        userUid: currentUser?.uid
      });
      persistentRankedVideos = ranked;
      return ranked;
    }
    return [];
  });

  const [shorts, setShorts] = useState<Video[]>(() => {
    if (persistentHomeShorts && persistentHomeShorts.length > 0) {
      return persistentHomeShorts;
    }
    if (initialCachedShorts.length > 0) {
      const rankedInitialShorts = recommendationService.getShortsRecommendations({
        allShorts: initialCachedShorts,
        userUid: currentUser?.uid,
        limit: 18
      });
      persistentHomeShorts = rankedInitialShorts;
      return rankedInitialShorts;
    }
    return [];
  });

  const [loading, setLoading] = useState(() => !(masterVideosRef.current.length > 0 || initialAllCached.length > 0 || persistentRankedVideos.length > 0));
  const [loadingShorts, setLoadingShorts] = useState(() => {
    if (persistentHomeShorts && persistentHomeShorts.length > 0) return false;
    if (initialCachedShorts.length > 0) return false;
    return true;
  });
  const [extraMoreVideos, setExtraMoreVideos] = useState<Video[]>(() => persistentExtraMoreVideos);
  const [moreDisplayCount, setMoreDisplayCount] = useState<number>(() => persistentMoreDisplayCount);
  const [hasMorePlatformVideos, setHasMorePlatformVideos] = useState<boolean>(() => persistentHasMoreVideos);
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState<boolean>(false);
  const moreSentinelRef = useRef<HTMLDivElement>(null);
  const lastVideoDocRef = useRef<any>(persistentLastVideoDoc);
  const isFetchingMoreRef = useRef<boolean>(false);
  const didInitCategoryEffectRef = useRef<boolean>(false);

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
    persistentRankedVideos = ranked;
    setVideos(ranked);
    setLoading(false);
  };

  const selectedCategoryRef = useRef(selectedCategory);
  selectedCategoryRef.current = selectedCategory;

  const fetchHomeVideos = async (forceFresh = false) => {
    const hadCachedBeforeFetch = masterVideosRef.current.length > 0;

    // If videos are already loaded in memory from network in this session and user is not pulling to refresh, do not re-fetch!
    if (hadCachedBeforeFetch && !forceFresh && hasLoadedHomeOnce) {
      setLoading(false);
      return;
    }

    if (!hadCachedBeforeFetch || forceFresh) {
      setLoading(true);
    }

    try {
      const page = await videoService.getVideosPage({ isShort: false, limit: 60 });
      const fetchedVideos = page.videos;
      lastVideoDocRef.current = page.lastDoc;
      persistentLastVideoDoc = page.lastDoc;
      persistentHasMoreVideos = page.hasMore;
      setHasMorePlatformVideos(page.hasMore);

      if (fetchedVideos && fetchedVideos.length > 0) {
        if (hadCachedBeforeFetch && !forceFresh) {
          // Silent merge: keep existing Row 1 & order intact so the page never flashes/reloads twice,
          // while adding any newly published or uncached videos into masterVideosRef & extraMoreVideos
          const existingIds = new Set(masterVideosRef.current.map(v => v.videoId));
          const brandNew = fetchedVideos.filter(v => !existingIds.has(v.videoId));
          const updatedMaster = [...masterVideosRef.current, ...brandNew];
          masterVideosRef.current = updatedMaster;
          persistentMasterVideos = updatedMaster;
          if (brandNew.length > 0) {
            setExtraMoreVideos(prev => {
              const prevIds = new Set(prev.map(v => v.videoId));
              const toAppend = brandNew.filter(v => !prevIds.has(v.videoId));
              return toAppend.length > 0 ? [...prev, ...toAppend] : prev;
            });
          }
        } else {
          masterVideosRef.current = fetchedVideos;
          persistentMasterVideos = fetchedVideos;
          persistentExtraMoreVideos = [];
          persistentMoreDisplayCount = 18;
          setExtraMoreVideos([]);
          setMoreDisplayCount(18);

          const filtered = getFilteredVideosForCategory(selectedCategoryRef.current, fetchedVideos);
          const ranked = recommendationService.rankAndFilterVideos(filtered, {
            userUid: currentUser?.uid,
            rotateTop: forceFresh
          });

          persistentRankedVideos = ranked;
          setVideos(ranked);
        }
        hasLoadedHomeOnce = true;
      }
    } catch (err) {
      console.error(err);
      if (masterVideosRef.current.length === 0) {
        addToast('Failed to load videos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMorePlatformVideos = async () => {
    if (isFetchingMoreRef.current || !hasMorePlatformVideos) return;
    isFetchingMoreRef.current = true;
    setIsLoadingMoreVideos(true);

    try {
      let cursor = lastVideoDocRef.current;
      let hasMore: boolean = hasMorePlatformVideos;
      const accumulatedNew: Video[] = [];
      let attempts = 0;

      // Advance cursor until we find unseen platform videos or reach end of collection
      while (hasMore && attempts < 5) {
        attempts += 1;
        const page = await videoService.getVideosPage({
          isShort: false,
          limit: 60,
          afterDoc: cursor
        });

        cursor = page.lastDoc;
        hasMore = page.hasMore;
        lastVideoDocRef.current = cursor;
        persistentLastVideoDoc = cursor;
        persistentHasMoreVideos = hasMore;
        setHasMorePlatformVideos(hasMore);

        if (page.videos.length > 0) {
          const existingMasterIds = new Set([
            ...masterVideosRef.current.map(v => v.videoId),
            ...accumulatedNew.map(v => v.videoId)
          ]);
          const newUnique = page.videos.filter(v => !existingMasterIds.has(v.videoId));
          if (newUnique.length > 0) {
            accumulatedNew.push(...newUnique);
            break;
          }
        }
      }

      if (accumulatedNew.length > 0) {
        const updatedMaster = [...masterVideosRef.current, ...accumulatedNew];
        masterVideosRef.current = updatedMaster;
        persistentMasterVideos = updatedMaster;

        const rankedBatch = recommendationService.getHomeMoreVideosRecommendations({
          allVideos: accumulatedNew,
          firstRowIds: [],
          userUid: currentUser?.uid
        });

        setExtraMoreVideos(prev => {
          const prevIds = new Set(prev.map(v => v.videoId));
          const cleanAppend = rankedBatch.filter(v => !prevIds.has(v.videoId));
          return cleanAppend.length > 0 ? [...prev, ...cleanAppend] : prev;
        });
        setMoreDisplayCount(prev => prev + 18);
      }
    } catch (err) {
      console.warn('Could not load additional platform videos:', err);
    } finally {
      isFetchingMoreRef.current = false;
      setIsLoadingMoreVideos(false);
    }
  };

  const fetchHomeShorts = async (forceFresh = false) => {
    const hadCachedShorts = Boolean(persistentHomeShorts && persistentHomeShorts.length > 0);
    if (hadCachedShorts && !forceFresh && hasFetchedShortsOnce) {
      setLoadingShorts(false);
      return;
    }

    if (!hadCachedShorts || forceFresh) {
      setLoadingShorts(true);
    }

    try {
      // Lightweight query (20 shorts) so Clips load rapidly alongside Row 1 without disappearing
      const fetchedShorts = await videoService.getVideos({ isShort: true, limit: 20 });
      hasFetchedShortsOnce = true;

      if (fetchedShorts && fetchedShorts.length > 0) {
        const rankedShorts = recommendationService.getShortsRecommendations({
          allShorts: fetchedShorts,
          userUid: currentUser?.uid,
          limit: 18
        });

        if (hadCachedShorts && !forceFresh) {
          // Preserve currently visible Clips shelf cards to prevent double-load flicker,
          // while silently appending any newly published/uncached clips at the end
          setShorts(prev => {
            if (prev.length === 0) {
              persistentHomeShorts = rankedShorts;
              return rankedShorts;
            }
            const existingIds = new Set(prev.map(s => s.videoId));
            const newClips = rankedShorts.filter(s => !existingIds.has(s.videoId));
            if (newClips.length === 0) return prev;
            const merged = [...prev, ...newClips];
            persistentHomeShorts = merged;
            return merged;
          });
        } else {
          setShorts(rankedShorts);
          persistentHomeShorts = rankedShorts;
        }
        setTimeout(checkShortsScroll, 120);
      }
    } catch (err) {
      console.error(err);
      setShorts(prev => {
        if (prev.length > 0) return prev;
        if (persistentHomeShorts && persistentHomeShorts.length > 0) return persistentHomeShorts;
        return [];
      });
    } finally {
      setLoadingShorts(false);
      setTimeout(checkShortsScroll, 150);
    }
  };

  // YouTube-style feed refresh handler
  const handleRefreshFeed = async (_showToast = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    persistentHomeScrollY = 0;
    lastVideoDocRef.current = null;
    persistentLastVideoDoc = null;
    persistentHasMoreVideos = true;
    setHasMorePlatformVideos(true);
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

  // Persist paginated More Videos state across Home remounts
  useEffect(() => {
    persistentExtraMoreVideos = extraMoreVideos;
  }, [extraMoreVideos]);

  useEffect(() => {
    persistentMoreDisplayCount = moreDisplayCount;
  }, [moreDisplayCount]);

  // Synchronize category change instantly (0ms) without refetching from network
  useEffect(() => {
    persistentHomeCategory = selectedCategory;

    // On initial mount, videos state is already initialized from persistent/cached data
    if (didInitCategoryEffectRef.current && masterVideosRef.current.length > 0) {
      const instant = getFilteredVideosForCategory(selectedCategory, masterVideosRef.current);
      const ranked = recommendationService.rankAndFilterVideos(instant, {
        userUid: currentUser?.uid
      });
      persistentRankedVideos = ranked;
      setVideos(ranked);
      setLoading(false);
    }
    didInitCategoryEffectRef.current = true;

    // Only initiate network fetch if not already loaded in this session
    if (!hasLoadedHomeOnce || masterVideosRef.current.length === 0) {
      fetchHomeVideos();
    }

    // Load or silently sync shorts if not yet fetched from network in this session
    if (!hasFetchedShortsOnce || !persistentHomeShorts || persistentHomeShorts.length === 0) {
      fetchHomeShorts();
    }
  }, [selectedCategory]);

  // Failsafe: dismiss skeleton quickly if videos or cached data already exist
  useEffect(() => {
    if (!loading) return;
    if (masterVideosRef.current.length > 0 || videos.length > 0) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading, videos.length]);

  // Only dismiss shorts skeleton automatically if shorts have populated (never hide section mid-fetch!)
  useEffect(() => {
    if (loadingShorts && shorts.length > 0) {
      setLoadingShorts(false);
    }
  }, [loadingShorts, shorts.length]);

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

  // Stable YouTube-style feed layout:
  // For 'All': Top 3 videos in Row 1 above Shorts shelf, then More Videos below Shorts.
  // For specific category: all filtered category videos in Row 1.
  const firstRowVideos = React.useMemo(() => {
    return selectedCategory === 'All' ? videos.slice(0, 3) : videos;
  }, [selectedCategory, videos]);

  const firstRowIdsKey = React.useMemo(() => {
    return selectedCategory === 'All' ? firstRowVideos.map(v => v.videoId).join(',') : '';
  }, [selectedCategory, firstRowVideos]);

  // Base "More Videos For You" recommendation list from initial feed (stable while scrolling)
  const baseMoreVideos = React.useMemo(() => {
    if (isFollowingFeed || selectedCategory !== 'All' || videos.length === 0) return [];
    return recommendationService.getHomeMoreVideosRecommendations({
      allVideos: videos,
      firstRowIds: firstRowVideos.map(v => v.videoId),
      userUid: currentUser?.uid
    });
  }, [isFollowingFeed, selectedCategory, firstRowIdsKey, currentUser?.uid, videos]);

  // Combine initial More Videos with cursor-paginated extra platform videos (without reordering already-seen items)
  const allMoreVideos = React.useMemo(() => {
    if (extraMoreVideos.length === 0) return baseMoreVideos;
    const seen = new Set([
      ...firstRowVideos.map(v => v.videoId),
      ...baseMoreVideos.map(v => v.videoId)
    ]);
    const appended = extraMoreVideos.filter(v => !seen.has(v.videoId));
    return [...baseMoreVideos, ...appended];
  }, [baseMoreVideos, extraMoreVideos, firstRowVideos]);

  const displayedMoreVideos = React.useMemo(() => {
    return allMoreVideos.slice(0, moreDisplayCount);
  }, [allMoreVideos, moreDisplayCount]);

  const canRevealOrFetchMore =
    moreDisplayCount < allMoreVideos.length || hasMorePlatformVideos;

  // Infinite scroll observer for "More Videos For You" (reveals buffered items + fetches remaining platform videos)
  useEffect(() => {
    if (isFollowingFeed || selectedCategory !== 'All' || loading || !canRevealOrFetchMore) return;
    const sentinel = moreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          if (moreDisplayCount < allMoreVideos.length) {
            setMoreDisplayCount(prev => prev + 18);
          } else if (hasMorePlatformVideos && !isFetchingMoreRef.current) {
            fetchMorePlatformVideos();
          }
        }
      },
      { rootMargin: '500px' }
    );

    observer.observe(sentinel);
    return () => {
      observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [
    isFollowingFeed,
    selectedCategory,
    loading,
    canRevealOrFetchMore,
    moreDisplayCount,
    allMoreVideos.length,
    hasMorePlatformVideos,
    isLoadingMoreVideos
  ]);

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
          skeletonCount={selectedCategory === 'All' ? 3 : 6}
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
            <div className="flex gap-3 md:gap-4 overflow-x-hidden py-1 px-0.5">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  style={{ animationDelay: `${i * 75}ms` }}
                  className="w-[150px] sm:w-[180px] md:w-[200px] lg:w-[215px] shrink-0 flex flex-col space-y-2 animate-pulse"
                >
                  <div className="aspect-[9/16] w-full rounded-2xl bg-[#dbe2ee] dark:bg-slate-800 relative overflow-hidden shadow-xs">
                    <div className="absolute bottom-2.5 right-2.5 h-4 w-8 bg-[#bcc8dc] dark:bg-slate-700 rounded-md" />
                  </div>
                  <div className="space-y-1.5 px-0.5 pt-1">
                    <div className="h-3.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[85%]" />
                    <div className="h-2.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[55%]" />
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
                <HomeClipCard
                  key={short.videoId}
                  short={short}
                  idx={idx}
                  isHindi={isHindi}
                  onOpen={(id) => navigate('shorts', id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* External Native / Iframe Ad Banner (YouTube Style, rotating location) */}
      <div className="my-6">
        <ExternalAdBanner type="random" locationTag="home-feed-middle" />
      </div>

      {/* 3. More Videos Section (YouTube Algorithm Recommended Videos + Infinite Platform Scroll) */}
      {selectedCategory === 'All' && (allMoreVideos.length > 0 || loading) && (
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {isHindi ? 'आपके लिए और वीडियो' : 'More Videos For You'}
            </h2>
          </div>

          <VideoGrid 
            videos={displayedMoreVideos} 
            loading={loading && allMoreVideos.length === 0} 
            skeletonCount={6}
            activeAds={[]}
            gridColsClass="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            emptyHeading={isHindi ? 'कोई और वीडियो नहीं' : 'No more videos'}
            emptyMessage={isHindi ? 'अधिक वीडियो प्रकाशित होने पर यहां दिखाई देंगे।' : 'More videos will appear here.'}
          />

          {/* Infinite Scroll Sentinel & Loading State */}
          {!loading && canRevealOrFetchMore && (
            <div ref={moreSentinelRef} className="pt-2 pb-6 flex flex-col items-center justify-center gap-3">
              {isLoadingMoreVideos ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="flex flex-col space-y-3 animate-pulse">
                      <div className="aspect-video bg-[#dbe2ee] dark:bg-slate-800 rounded-2xl" />
                      <div className="flex items-start gap-2.5 pt-1">
                        <div className="w-9 h-9 rounded-full bg-[#dbe2ee] dark:bg-slate-800 shrink-0" />
                        <div className="flex-1 space-y-2 pt-0.5">
                          <div className="h-3.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[85%]" />
                          <div className="h-2.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[55%]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (moreDisplayCount < allMoreVideos.length) {
                      setMoreDisplayCount(prev => prev + 18);
                    } else if (hasMorePlatformVideos) {
                      fetchMorePlatformVideos();
                    }
                  }}
                  className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  {isHindi ? 'और वीडियो लोड करें' : 'Load more videos'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      </div>
      )}
    </div>
  );
};
