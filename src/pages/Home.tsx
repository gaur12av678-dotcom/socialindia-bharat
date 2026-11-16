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
import { getVideoUrlDuration, parseVideoUrl } from '../utils/videoUtils';

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
let persistentMoreDisplayCount = 3;
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

const HomeClipCard: React.FC<HomeClipCardProps> = React.memo(({ short, idx, isHindi, onOpen }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [resolvedDuration, setResolvedDuration] = useState(0);
  const [shouldResolveDuration, setShouldResolveDuration] = useState(false);
  const clipCardRef = useRef<HTMLAnchorElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgLoaded(false);
    setImgFailed(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, [short.videoId, short.thumbnailUrl]);

  useEffect(() => {
    const node = clipCardRef.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setShouldResolveDuration(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldResolveDuration(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(node);

    return () => observer.disconnect();
  }, [short.videoId]);

  useEffect(() => {
    const savedDuration = Number(short.duration);
    if (Number.isFinite(savedDuration) && savedDuration > 0) {
      setResolvedDuration(savedDuration);
      return;
    }

    setResolvedDuration(0);
    if (!shouldResolveDuration || !short.videoUrl || parseVideoUrl(short.videoUrl).type !== 'direct') return;

    let active = true;
    getVideoUrlDuration(short.videoUrl)
      .then(duration => {
        if (active) setResolvedDuration(Math.round(duration));
      })
      .catch(error => {
        console.warn(`Could not resolve duration for clip ${short.videoId}:`, error);
      });

    return () => {
      active = false;
    };
  }, [short.videoId, short.videoUrl, short.duration, shouldResolveDuration]);

  const savedDuration = Number(short.duration);
  const displayDuration = Number.isFinite(savedDuration) && savedDuration > 0
    ? savedDuration
    : resolvedDuration;

  return (
    <a
      ref={clipCardRef}
      href={`#/clips/${short.videoId}`}
      draggable={true}
      title={short.title}
      onClick={(e) => {
        if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        onOpen(short.videoId);
      }}
      style={{
        animationDelay: `${(idx % 3) * 35}ms`,
        animationFillMode: 'both'
      }}
      className="yt-card-animate w-full min-w-0 group relative block cursor-pointer select-none transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-[#dbe2ee] dark:bg-slate-800 shadow-md">
        {short.thumbnailUrl && !imgLoaded && !imgFailed && (
          <div className="absolute inset-0 bg-[#dbe2ee] dark:bg-slate-800 animate-pulse z-0" />
        )}
        {short.thumbnailUrl && !imgFailed ? (
          <img
            ref={imgRef}
            src={short.thumbnailUrl}
            alt={short.title}
            loading={idx < 3 ? 'eager' : 'lazy'}
            fetchPriority={idx < 3 ? 'high' : 'auto'}
            decoding="async"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgFailed(true);
              setImgLoaded(true);
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

        {/* YouTube-style Duration Badge */}
        {Number.isFinite(displayDuration) && displayDuration > 0 && (
          <div className="duration-badge">
            {`${Math.floor(displayDuration / 60)}:${(displayDuration % 60).toString().padStart(2, '0')}`}
          </div>
        )}
      </div>

      {/* Short Title & Creator & Views */}
      {imgLoaded || imgFailed || !short.thumbnailUrl ? (
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
      ) : (
        <div className="mt-2 space-y-2 px-0.5 animate-pulse" aria-hidden="true">
          <div className="h-3.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[88%]" />
          <div className="h-2.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[60%]" />
        </div>
      )}
    </a>
  );
});

export const Home: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { route, navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  const openHomeShort = React.useCallback((id: string) => navigate('shorts', id), [navigate]);
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
    const source = masterVideosRef.current.length > 0
      ? masterVideosRef.current
      : persistentRankedVideos.length > 0
        ? persistentRankedVideos
        : initialAllCached;
    if (source.length > 0) {
      const filtered = getFilteredVideosForCategory(selectedCategory, source);
      const ranked = recommendationService.rankAndFilterVideos(filtered, {
        userUid: currentUser?.uid,
        rotateTop: true
      });
      persistentRankedVideos = ranked;
      return ranked;
    }
    return [];
  });

  const [shorts, setShorts] = useState<Video[]>(() => {
    if (persistentHomeShorts && persistentHomeShorts.length > 0) {
      const candidates = new Map<string, Video>();
      [...persistentHomeShorts, ...initialCachedShorts].forEach(short => {
        if (short.videoId) candidates.set(short.videoId, short);
      });
      const ranked = recommendationService.getShortsRecommendations({
        allShorts: [...candidates.values()],
        userUid: currentUser?.uid,
        limit: 5
      });
      persistentHomeShorts = ranked;
      return ranked;
    }
    if (initialCachedShorts.length > 0) {
      const rankedInitialShorts = recommendationService.getShortsRecommendations({
        allShorts: initialCachedShorts,
        userUid: currentUser?.uid,
        limit: 5
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
  const lastMoreRevealScrollYRef = useRef(-1);
  const lastVideoDocRef = useRef<any>(persistentLastVideoDoc);
  const categoryLastVideoDocRef = useRef<any>(null);
  const isFetchingMoreRef = useRef<boolean>(false);
  const didInitCategoryEffectRef = useRef<boolean>(false);
  const hasMoreSelectedCategoryRef = useRef<boolean>(true);

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
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
      checkFilterScroll();
      };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
    lastMoreRevealScrollYRef.current = -1;
    categoryLastVideoDocRef.current = null;
    hasMoreSelectedCategoryRef.current = true;
    setExtraMoreVideos([]);
    setMoreDisplayCount(3);

    // Scroll to top of main container or window
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 100% INSTANT 0ms filter from masterVideos in memory
    const instantFiltered = getFilteredVideosForCategory(cat, masterVideosRef.current);
    const ranked = recommendationService.rankAndFilterVideos(instantFiltered, {
      userUid: currentUser?.uid,
      rotateTop: true
    });
    persistentRankedVideos = ranked;
    setVideos(ranked);
    setLoading(cat !== 'All' && instantFiltered.length === 0);
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
      const page = await videoService.getVideosPage({ isShort: false, limit: 3 });

      const fetchedVideos = page.videos;
      lastVideoDocRef.current = page.lastDoc;
      persistentLastVideoDoc = page.lastDoc;
      persistentHasMoreVideos = page.hasMore;
      setHasMorePlatformVideos(page.hasMore);

      if (fetchedVideos && fetchedVideos.length > 0) {
        const currentIds = new Set(masterVideosRef.current.map(video => video.videoId));
        const newVideos = fetchedVideos.filter(video => !currentIds.has(video.videoId));
        const mergedById = new Map(
          masterVideosRef.current.map(video => [video.videoId, video])
        );
        fetchedVideos.forEach(video => mergedById.set(video.videoId, video));
        const updatedMaster = [...mergedById.values()];
        masterVideosRef.current = updatedMaster;
        persistentMasterVideos = updatedMaster;

        if (forceFresh || !hadCachedBeforeFetch) {
          persistentExtraMoreVideos = [];
          persistentMoreDisplayCount = 3;
          setExtraMoreVideos([]);
          setMoreDisplayCount(3);
        }

        if (forceFresh || !hadCachedBeforeFetch) {
          const filtered = getFilteredVideosForCategory(
            selectedCategoryRef.current,
            updatedMaster
          );
          const ranked = recommendationService.rankAndFilterVideos(filtered, {
            userUid: currentUser?.uid,
            rotateTop: true
          });
          persistentRankedVideos = ranked;
          setVideos(ranked);
        } else if (newVideos.length > 0 && selectedCategoryRef.current === 'All') {
          setExtraMoreVideos(previous => {
            const ids = new Set(previous.map(video => video.videoId));
            const additions = newVideos.filter(video => !ids.has(video.videoId));
            return additions.length > 0 ? [...previous, ...additions] : previous;
          });
        }
        hasLoadedHomeOnce = true;
      }

      // Prefetch a few small pages while the initial row stays visible.
      if (page.hasMore && page.lastDoc) {
        isFetchingMoreRef.current = true;
        setIsLoadingMoreVideos(true);

        void (async () => {
          let cursor = page.lastDoc;
          let hasMore = page.hasMore;
          let batchesLoaded = 0;

          try {
            while (hasMore && cursor && batchesLoaded < 2) {
              const nextPage = await videoService.getVideosPage({
                isShort: false,
                limit: 6,
                afterDoc: cursor
              });
              cursor = nextPage.lastDoc;
              hasMore = nextPage.hasMore;
              batchesLoaded += 1;

              const existingIds = new Set(masterVideosRef.current.map(video => video.videoId));
              const newBatch = nextPage.videos.filter(video => !existingIds.has(video.videoId));
              if (newBatch.length > 0) {
                const updatedMaster = [...masterVideosRef.current, ...newBatch];
                masterVideosRef.current = updatedMaster;
                persistentMasterVideos = updatedMaster;

                if (selectedCategoryRef.current === 'All') {
                  const rankedBatch = recommendationService.rankAndFilterVideos(newBatch, {
                    userUid: currentUser?.uid
                  });
                  setExtraMoreVideos(previous => {
                    const ids = new Set(previous.map(video => video.videoId));
                    const additions = rankedBatch.filter(video => !ids.has(video.videoId));
                    return additions.length > 0 ? [...previous, ...additions] : previous;
                  });
                }
              }
            }

            lastVideoDocRef.current = cursor;
            persistentLastVideoDoc = cursor;
            persistentHasMoreVideos = hasMore;
            setHasMorePlatformVideos(hasMore);
          } catch (err) {
            console.warn('Background video loading failed:', err);
            lastVideoDocRef.current = cursor;
            persistentLastVideoDoc = cursor;
            persistentHasMoreVideos = hasMore;
            setHasMorePlatformVideos(hasMore);
          } finally {
            isFetchingMoreRef.current = false;
            setIsLoadingMoreVideos(false);
          }
        })();
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
      while (hasMore && attempts < 3) {
        attempts += 1;
        const page = await videoService.getVideosPage({
          isShort: false,
          limit: 6,
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
        setMoreDisplayCount(prev => prev + 3);
      }
    } catch (err) {
      console.warn('Could not load additional platform videos:', err);
    } finally {
      isFetchingMoreRef.current = false;
      setIsLoadingMoreVideos(false);
    }
  };

  const fetchMoreSelectedCategoryVideos = async () => {
    if (isFetchingMoreRef.current || selectedCategory === 'All' || !hasMoreSelectedCategoryRef.current) return;
    isFetchingMoreRef.current = true;
    setIsLoadingMoreVideos(true);

    try {
      const page = await videoService.getVideosPage({
        category: selectedCategory,
        isShort: false,
        limit: 24,
        afterDoc: categoryLastVideoDocRef.current
      });

      if (!page.videos.length) {
        hasMoreSelectedCategoryRef.current = false;
        return;
      }

      const existingIds = new Set(masterVideosRef.current.map(v => v.videoId));
      const newUnique = page.videos.filter(v => !existingIds.has(v.videoId));

      if (newUnique.length > 0) {
        const updatedMaster = [...masterVideosRef.current, ...newUnique];
        masterVideosRef.current = updatedMaster;
        persistentMasterVideos = updatedMaster;

        const rankedBatch = recommendationService.rankAndFilterVideos(
          getFilteredVideosForCategory(selectedCategory, newUnique),
          {
            userUid: currentUser?.uid
          }
        );

        setVideos(prev => {
          const currentIds = new Set(prev.map(v => v.videoId));
          const additions = rankedBatch.filter(v => !currentIds.has(v.videoId));
          const merged = additions.length > 0 ? [...prev, ...additions] : prev;
          persistentRankedVideos = merged;
          return merged;
        });
      }

      categoryLastVideoDocRef.current = page.lastDoc;
      hasMoreSelectedCategoryRef.current = page.hasMore;
    } catch (err) {
      console.warn('Could not load more category videos:', err);
    } finally {
      isFetchingMoreRef.current = false;
      setIsLoadingMoreVideos(false);
    }
  };

  const fetchHomeShorts = async (forceFresh = false) => {
    const hadCachedShorts = Boolean(persistentHomeShorts && persistentHomeShorts.length > 0);
    if (
      hadCachedShorts &&
      !forceFresh &&
      hasFetchedShortsOnce &&
      initialCachedShorts.length >= 10
    ) {
      setLoadingShorts(false);
      return;
    }

    if (!hadCachedShorts || forceFresh) {
      setLoadingShorts(true);
    }

    try {
      // Fetch enough clips to fill the shelf while keeping the request lightweight.
      const shortsPage = await videoService.getVideosPage({ isShort: true, limit: 10 });
      const fetchedShorts = shortsPage.videos;
      hasFetchedShortsOnce = true;
      if (fetchedShorts && fetchedShorts.length > 0) {
        const candidates = new Map<string, Video>();
        [...initialCachedShorts, ...fetchedShorts].forEach(short => {
          if (short.videoId) candidates.set(short.videoId, short);
        });
        if (forceFresh || shorts.length === 0) {
          const rankedShorts = recommendationService.getShortsRecommendations({
            allShorts: [...candidates.values()],
            userUid: currentUser?.uid,
            limit: 5
          });
          setShorts(rankedShorts);
          persistentHomeShorts = rankedShorts;
        } else if (shorts.length < 5) {
          const existingIds = shorts.map(short => short.videoId);
          const additions = recommendationService.getShortsRecommendations({
            allShorts: [...candidates.values()],
            excludeIds: existingIds,
            userUid: currentUser?.uid,
            limit: 5 - shorts.length
          });
          const merged = [...shorts, ...additions].slice(0, 5);
          setShorts(merged);
          persistentHomeShorts = merged;
        }
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
    }
  };

  // YouTube-style feed refresh handler
  const handleRefreshFeed = async (_showToast = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    persistentHomeScrollY = 0;
    lastMoreRevealScrollYRef.current = -1;
    lastVideoDocRef.current = null;
    persistentLastVideoDoc = null;
    persistentHasMoreVideos = true;
    setHasMorePlatformVideos(true);
    try {
      await fetchHomeVideos(true);
      await fetchHomeShorts(true);
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

  // Show cached category videos immediately and fetch that category directly.
  useEffect(() => {
    persistentHomeCategory = selectedCategory;

    let cancelled = false;

    const cachedCategoryVideos = getFilteredVideosForCategory(
      selectedCategory,
      masterVideosRef.current
    );

    if (selectedCategory !== 'All') {
      if (cachedCategoryVideos.length > 0) {
        const ranked = recommendationService.rankAndFilterVideos(cachedCategoryVideos, {
          userUid: currentUser?.uid,
          rotateTop: true
        });
        persistentRankedVideos = ranked;
        setVideos(ranked);
        setLoading(false);
      } else {
        setVideos([]);
        setLoading(true);
      }

      const loadSelectedCategory = async () => {
        categoryLastVideoDocRef.current = null;
        hasMoreSelectedCategoryRef.current = true;
        if (cachedCategoryVideos.length > 0) {
          setIsLoadingMoreVideos(true);
        }

        try {
          const page = await videoService.getVideosPage({
            category: selectedCategory,
            isShort: false,
            limit: 24
          });

          if (cancelled) return;

          const existingIds = new Set(masterVideosRef.current.map(v => v.videoId));
          const additions = page.videos.filter(v => !existingIds.has(v.videoId));
          const updatedMaster = [...masterVideosRef.current, ...additions];

          if (additions.length > 0) {
            masterVideosRef.current = updatedMaster;
            persistentMasterVideos = updatedMaster;
          }

          categoryLastVideoDocRef.current = page.lastDoc;
          hasMoreSelectedCategoryRef.current = page.hasMore;

          if (additions.length > 0) {
            const rankedBatch = recommendationService.rankAndFilterVideos(
              getFilteredVideosForCategory(selectedCategory, additions),
              { userUid: currentUser?.uid }
            );

            setVideos(prev => {
              const currentIds = new Set(prev.map(v => v.videoId));
              const newVideos = rankedBatch.filter(v => !currentIds.has(v.videoId));
              const merged = newVideos.length > 0 ? [...prev, ...newVideos] : prev;
              persistentRankedVideos = merged;
              return merged;
            });
          }
        } catch (err) {
          console.error('Category video loading failed:', err);
          if (!cancelled) {
            addToast(
              isHindi ? 'इस श्रेणी के वीडियो लोड नहीं हो सके।' : 'Could not load videos for this category.',
              'error'
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
            setIsLoadingMoreVideos(false);
          }
        }
      };

      void loadSelectedCategory();

      return () => {
        cancelled = true;
      };
    }

    if (didInitCategoryEffectRef.current) {
      const ranked = recommendationService.rankAndFilterVideos(cachedCategoryVideos, {
        userUid: currentUser?.uid,
        rotateTop: true
      });
      persistentRankedVideos = ranked;
      setVideos(ranked);
      setLoading(false);
    }

    didInitCategoryEffectRef.current = true;

    const loadHomeFeedInOrder = async () => {
      const shouldFetchVideos = !hasLoadedHomeOnce || masterVideosRef.current.length === 0;
      const shouldFetchShorts = !hasFetchedShortsOnce || initialCachedShorts.length < 10;
      const videosPromise = shouldFetchVideos ? fetchHomeVideos() : Promise.resolve();
      const shortsPromise = shouldFetchShorts ? fetchHomeShorts() : Promise.resolve();
      await Promise.all([videosPromise, shortsPromise]);
    };

    void loadHomeFeedInOrder();

    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

  // Failsafe: dismiss skeleton quickly if videos or cached data already exist
  useEffect(() => {
    if (!loading) return;
    const hasVideosForSelection = selectedCategory === 'All'
      ? masterVideosRef.current.length > 0 || videos.length > 0
      : videos.length > 0;
    if (hasVideosForSelection) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading, selectedCategory, videos.length]);

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

  useEffect(() => {
    if (selectedCategory === 'All' && firstRowVideos.length > 0) {
      recommendationService.recordHomeRecommendations(
        firstRowVideos.slice(0, 3).map(video => video.videoId)
      );
    }
  }, [firstRowIdsKey, selectedCategory]);

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
    const seen = new Set(firstRowVideos.map(v => v.videoId));
    const uniqueVideos: Video[] = [];
    for (const video of [...baseMoreVideos, ...extraMoreVideos]) {
      if (!video.videoId || seen.has(video.videoId)) continue;
      seen.add(video.videoId);
      uniqueVideos.push(video);
    }
    return uniqueVideos;
  }, [baseMoreVideos, extraMoreVideos, firstRowVideos]);

  const displayedMoreVideos = React.useMemo(() => {
    return allMoreVideos.slice(0, moreDisplayCount);
  }, [allMoreVideos, moreDisplayCount]);

  const canRevealOrFetchMore =
    moreDisplayCount < allMoreVideos.length || hasMorePlatformVideos;

  // Reveal small batches as the user scrolls and prefetch before the buffer runs out.
  useEffect(() => {
    const sentinel = moreSentinelRef.current;
    if (!sentinel || loading) return;
    const scrollContainer = sentinel.closest('main');
    if (!scrollContainer) return;

    const loadNextBatch = () => {
      if (selectedCategory !== 'All') return;
      const bufferedVideos = allMoreVideos.length - moreDisplayCount;
      if (bufferedVideos > 0) {
        setMoreDisplayCount(previous => Math.min(previous + 3, allMoreVideos.length));
      }
      if (
        bufferedVideos <= 6 &&
        hasMorePlatformVideos &&
        !isFetchingMoreRef.current
      ) {
        void fetchMorePlatformVideos();
      }
    };

    const revealMoreOnScroll = () => {
      if (selectedCategory !== 'All') return;

      const bounds = sentinel.getBoundingClientRect();
      const containerBounds = scrollContainer.getBoundingClientRect();
      if (bounds.top > containerBounds.bottom + 900) return;

      const currentScrollY = scrollContainer.scrollTop;
      const previousScrollY = lastMoreRevealScrollYRef.current;
      if (previousScrollY >= 0 && currentScrollY < previousScrollY) {
        lastMoreRevealScrollYRef.current = currentScrollY;
        return;
      }
      if (previousScrollY >= 0 && currentScrollY - previousScrollY < 280) return;
      lastMoreRevealScrollYRef.current = currentScrollY;
      loadNextBatch();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0] || !entries[0].isIntersecting) return;

        if (selectedCategory === 'All') {
          loadNextBatch();
          return;
        }

        if (!isFetchingMoreRef.current && hasMoreSelectedCategoryRef.current) {
          void fetchMoreSelectedCategoryVideos();
        }
      },
      { root: scrollContainer, rootMargin: '900px 0px' }
    );
    observer.observe(sentinel);
    scrollContainer.addEventListener('scroll', revealMoreOnScroll, { passive: true });
    return () => {
      observer.disconnect();
      scrollContainer.removeEventListener('scroll', revealMoreOnScroll);
    };
  }, [
    isFollowingFeed,
    selectedCategory,
    loading,
    moreDisplayCount,
    allMoreVideos.length,
    hasMorePlatformVideos,
    isLoadingMoreVideos,
    hasMoreSelectedCategoryRef.current,
    videos.length
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
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md border-b border-[#e5e5e5] dark:border-[#262626] transition-colors shadow-2xs">
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
          priorityCount={3}
          activeAds={adDismissed ? [] : activeAds}
          onDismissAd={() => setAdDismissed(true)}
          gridColsClass="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          emptyHeading={isHindi ? 'अभी कोई वीडियो उपलब्ध नहीं है' : 'No videos available yet'}
          emptyMessage={isHindi ? 'सोशलइंडिया पर प्रकाशित वीडियो यहां दिखाई देंगे।' : 'Videos published on SocialIndia will appear here.'}
        />
        {selectedCategory !== 'All' && !loading && videos.length > 0 && (
          <>
            {isLoadingMoreVideos && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" aria-label={isHindi ? 'वीडियो लोड हो रहे हैं' : 'Loading more videos'}>
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{ animationDelay: `${idx * 70}ms` }}
                    className="flex flex-col space-y-3 animate-pulse"
                  >
                    <div className="aspect-video bg-[#dbe2ee] dark:bg-slate-800 rounded-2xl" />
                    <div className="flex items-start gap-2.5 pt-1 px-0.5">
                      <div className="w-9 h-9 rounded-full bg-[#dbe2ee] dark:bg-slate-800 shrink-0" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="h-3.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[88%]" />
                        <div className="h-2.5 bg-[#dbe2ee] dark:bg-slate-800 rounded-full w-[55%]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hasMoreSelectedCategoryRef.current && (
              <div ref={moreSentinelRef} className="h-1 w-full" aria-hidden="true" />
            )}
          </>
        )}
      </div>

      {/* 2. Clips Section (Progressive vertical-video shelf with algorithmic rotation) */}
      {selectedCategory === 'All' && (loadingShorts || shorts.length > 0) && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShortsLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-sm" />
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('nav_shorts', 'Clips')}
              </h2>
            </div>

            <div className="flex items-center gap-2">
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 py-1 px-0.5">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  style={{ animationDelay: `${i * 75}ms` }}
                  className="w-full min-w-0 flex flex-col space-y-2 animate-pulse"
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 py-1 px-0.5">
              {shorts.map((short, idx) => (
                <HomeClipCard
                  key={short.videoId}
                  short={short}
                  idx={idx}
                  isHindi={isHindi}
                  onOpen={openHomeShort}
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
      {selectedCategory === 'All' && (allMoreVideos.length > 0 || loading || isLoadingMoreVideos) && (
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {isHindi ? 'आपके लिए और वीडियो' : 'More Videos For You'}
            </h2>
          </div>

          <VideoGrid 
            videos={displayedMoreVideos} 
            loading={loading && allMoreVideos.length === 0} 
            skeletonCount={3}
            priorityCount={0}
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
                <div className="h-1 w-full" aria-hidden="true" />
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
