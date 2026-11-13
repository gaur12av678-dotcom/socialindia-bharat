import React, { useState, useEffect, useRef } from 'react';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { Flame } from 'lucide-react';
import { useTranslation } from '../i18n';

const rankTrending = (list: Video[]): Video[] => {
  return [...list]
    .filter(v => v && !v.isShort)
    .sort((a, b) => {
      const rankA = (a.viewsCount || 0) * 1.5 + (a.likesCount || 0) * 3;
      const rankB = (b.viewsCount || 0) * 1.5 + (b.likesCount || 0) * 3;
      return rankB - rankA;
    });
};

let persistentTrendingVideos: Video[] = [];
let persistentTrendingLastDoc: any = null;
let persistentTrendingHasMore = true;
let hasLoadedTrendingOnce = false;

export const Trending: React.FC = () => {
  const { t, isHindi } = useTranslation();

  const initialCached = videoService.getCachedVideos({ isShort: false });
  const [videos, setVideos] = useState<Video[]>(() => {
    if (persistentTrendingVideos.length > 0) return persistentTrendingVideos;
    if (initialCached.length > 0) {
      const ranked = rankTrending(initialCached);
      persistentTrendingVideos = ranked;
      return ranked;
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (persistentTrendingVideos.length > 0 || initialCached.length > 0) return false;
    return true;
  });
  const [hasMore, setHasMore] = useState<boolean>(() => persistentTrendingHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef<any>(persistentTrendingLastDoc);
  const isFetchingMoreRef = useRef(false);

  useEffect(() => {
    if (hasLoadedTrendingOnce && persistentTrendingVideos.length > 0) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchTrendingVideos = async () => {
      const hadCache = persistentTrendingVideos.length > 0;
      if (!hadCache) setLoading(true);

      try {
        const page = await videoService.getVideosPage({ isShort: false, limit: 60 });
        if (!isMounted) return;

        lastDocRef.current = page.lastDoc;
        persistentTrendingLastDoc = page.lastDoc;
        persistentTrendingHasMore = page.hasMore;
        setHasMore(page.hasMore);

        const rankedPage = rankTrending(page.videos);
        if (hadCache && persistentTrendingVideos.length > 0) {
          // Silently append unseen videos without jarring UI jump
          const existingIds = new Set(persistentTrendingVideos.map(v => v.videoId));
          const unseen = rankedPage.filter(v => !existingIds.has(v.videoId));
          if (unseen.length > 0) {
            const merged = [...persistentTrendingVideos, ...unseen];
            persistentTrendingVideos = merged;
            setVideos(merged);
          }
        } else {
          persistentTrendingVideos = rankedPage;
          setVideos(rankedPage);
        }
        hasLoadedTrendingOnce = true;
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTrendingVideos();
    return () => { isMounted = false; };
  }, []);

  const handleLoadMore = async () => {
    if (isFetchingMoreRef.current || !hasMore) return;
    isFetchingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const page = await videoService.getVideosPage({
        isShort: false,
        limit: 60,
        afterDoc: lastDocRef.current
      });
      lastDocRef.current = page.lastDoc;
      persistentTrendingLastDoc = page.lastDoc;
      persistentTrendingHasMore = page.hasMore;
      setHasMore(page.hasMore);

      const rankedBatch = rankTrending(page.videos);
      if (rankedBatch.length > 0) {
        setVideos(prev => {
          const existingIds = new Set(prev.map(v => v.videoId));
          const fresh = rankedBatch.filter(v => !existingIds.has(v.videoId));
          const updated = [...prev, ...fresh];
          persistentTrendingVideos = updated;
          return updated;
        });
      }
    } catch (err) {
      console.warn('Could not load more trending videos:', err);
    } finally {
      isFetchingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      
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
        skeletonCount={6}
        emptyMessage={isHindi ? 'अभी कोई ट्रेंडिंग वीडियो उपलब्ध नहीं है।' : 'No trending video entries calculated yet.'}
      />

      {/* Load More Trending Videos */}
      {!loading && hasMore && (
        <div className="pt-2 pb-6 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-60"
          >
            {loadingMore
              ? (isHindi ? 'लोड हो रहा है...' : 'Loading...')
              : (isHindi ? 'और ट्रेंडिंग वीडियो देखें' : 'Load more trending videos')}
          </button>
        </div>
      )}
    </div>
  );
};
