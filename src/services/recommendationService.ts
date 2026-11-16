import { Video } from '../types';

const WATCHED_STORAGE_KEY = 'socialindia_watched_ids';
const HOME_RECOMMENDED_STORAGE_KEY = 'socialindia_home_recommended_ids';
const SHORTS_RECOMMENDED_STORAGE_KEY = 'socialindia_home_shorts_recommended_ids';
let lastHeroVideoId = '';
let lastWatchSidebarFirstVideoId = '';
let lastMoreVideosFirstId = '';
let lastHeroShortId = '';

function getRecentIds(storageKey: string): Set<string> {
  try {
    const stored = localStorage.getItem(storageKey);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    return new Set(ids.slice(-10));
  } catch {
    return new Set();
  }
}

function rememberIds(storageKey: string, ids: string[], max = 100): void {
  try {
    const stored = localStorage.getItem(storageKey);
    const history: string[] = stored ? JSON.parse(stored) : [];
    const next = history.filter(id => !ids.includes(id));
    next.push(...ids);
    localStorage.setItem(storageKey, JSON.stringify(next.slice(-max)));
  } catch (error) {
    console.warn('Could not save recommendation history:', error);
  }
}

export interface ShortsRecommendationOptions {
  allShorts: Video[];
  currentShortId?: string;
  excludeIds?: string[];
  userUid?: string;
  limit?: number;
}

export interface HomeMoreVideosOptions {
  allVideos: Video[];
  firstRowIds?: string[];
  userUid?: string;
  category?: string;
}

export interface WatchSidebarOptions {
  currentVideo: Video;
  allVideos: Video[];
  selectedCategory: string; // 'All' | category name | 'FromCreator' | 'Related'
  userUid?: string;
  seed?: string;
}

export const recommendationService = {
  recordVideoWatch(videoId: string, _uid?: string) {
    if (!videoId) return;
    try {
      const existingStr = localStorage.getItem(WATCHED_STORAGE_KEY);
      const ids: string[] = existingStr ? JSON.parse(existingStr) : [];
      const filtered = ids.filter(id => id !== videoId);
      filtered.push(videoId);
      while (filtered.length > 200) filtered.shift();
      localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('LocalStorage save watched failed:', e);
    }
  },

  getWatchedVideoIds(): Set<string> {
    try {
      const existingStr = localStorage.getItem(WATCHED_STORAGE_KEY);
      const ids: string[] = existingStr ? JSON.parse(existingStr) : [];
      return new Set(ids);
    } catch (e) {
      return new Set();
    }
  },

  recordHomeRecommendations(videoIds: string[]) {
    rememberIds(HOME_RECOMMENDED_STORAGE_KEY, videoIds.filter(Boolean), 12);
  },

  /**
   * Shuffles an array using Fisher-Yates algorithm
   */
  shuffleArray<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  /**
   * Ranks Home candidates using engagement, freshness, and watch history.
   * Explicitly rotated feeds shuffle the top candidates and diversify creators.
   */
  rankAndFilterVideos(videos: Video[], options?: { isShortsOnly?: boolean; userUid?: string; rotateTop?: boolean }): Video[] {
    if (!videos || videos.length === 0) return [];

    let pool = [...videos];
    if (options?.isShortsOnly) {
      pool = pool.filter(v => v.isShort);
    }

    if (pool.length === 0) return [];

    const watchedIds = this.getWatchedVideoIds();
    const recentlyRecommendedIds = getRecentIds(HOME_RECOMMENDED_STORAGE_KEY);
    const now = Date.now();

    const scoreVideo = (video: Video) => {
      const views = Math.max(0, Number(video.viewsCount) || 0);
      const likes = Math.max(0, Number(video.likesCount) || 0);
      const comments = Math.max(0, Number(video.commentsCount) || 0);
      const uploadTime = new Date(video.createdAt || 0).getTime();
      const ageHours = Number.isFinite(uploadTime) ? Math.max(0, (now - uploadTime) / 3_600_000) : Infinity;
      const freshness = ageHours < 24 ? 45 : ageHours < 72 ? 30 : ageHours < 168 ? 15 : 0;
      const viewsPerDay = views / Math.max(1, ageHours / 24);
      const viralVelocity = Math.min(32, Math.log10(viewsPerDay + 1) * 8);
      const engagementRate = Math.min(30, ((likes + comments * 2 + 1) / (views + 100)) * 1000);
      let total = Math.log10(views + 1) * 18 + Math.log10(likes + 1) * 12 +
        Math.log10(comments + 1) * 8 + viralVelocity + engagementRate + freshness;
      if (watchedIds.has(video.videoId)) total *= 0.4;
      if (recentlyRecommendedIds.has(video.videoId)) total *= 0.35;
      return total;
    };

    pool.sort((a, b) => scoreVideo(b) - scoreVideo(a));

    if (options?.rotateTop) {
      pool = [
        ...pool.filter(video => !recentlyRecommendedIds.has(video.videoId)),
        ...pool.filter(video => recentlyRecommendedIds.has(video.videoId))
      ];
      const TOP_LIMIT = 20;
      const top20Pool = pool.slice(0, TOP_LIMIT);
      const rotatedTop20 = top20Pool
        .map(video => ({ video, score: scoreVideo(video) + Math.random() * 18 }))
        .sort((a, b) => b.score - a.score)
        .map(candidate => candidate.video);

      if (rotatedTop20.length > 2 && rotatedTop20[0].videoId === lastHeroVideoId) {
        const swapIndex = 1 + Math.floor(Math.random() * (rotatedTop20.length - 1));
        [rotatedTop20[0], rotatedTop20[swapIndex]] = [rotatedTop20[swapIndex], rotatedTop20[0]];
      }

      for (let i = 0; i < rotatedTop20.length - 1; i++) {
        const creator = rotatedTop20[i].creatorId || rotatedTop20[i].creatorUsername;
        const nextCreator = rotatedTop20[i + 1].creatorId || rotatedTop20[i + 1].creatorUsername;
        if (creator && creator === nextCreator) {
          const swapIndex = rotatedTop20.findIndex((video, index) =>
            index > i + 1 && (video.creatorId || video.creatorUsername) !== creator
          );
          if (swapIndex !== -1) {
            [rotatedTop20[i + 1], rotatedTop20[swapIndex]] = [rotatedTop20[swapIndex], rotatedTop20[i + 1]];
          }
        }
      }

      if (rotatedTop20[0]?.videoId) lastHeroVideoId = rotatedTop20[0].videoId;
      return [...rotatedTop20, ...pool.slice(TOP_LIMIT)];
    }

    return pool;
  },

  /**
   * YOUTUBE-STYLE "MORE VIDEOS FOR YOU" RECOMMENDATION ALGORITHM (Homepage feed)
   * Deterministic scoring based on engagement, freshness, and creator diversity.
   * Stable across renders and scrolling (no random jumping).
   */
  getHomeMoreVideosRecommendations(options: HomeMoreVideosOptions): Video[] {
    const { allVideos, firstRowIds = [], category = 'All' } = options;
    if (!allVideos || allVideos.length === 0) return [];

    const firstRowSet = new Set(firstRowIds);
    // Exclude shorts and row-1 videos
    let pool = allVideos.filter(v => !v.isShort && !firstRowSet.has(v.videoId));

    if (category && category !== 'All') {
      const targetCat = category.trim().toLowerCase();
      pool = pool.filter(v => v.category?.trim().toLowerCase() === targetCat);
    }

    if (pool.length === 0) return [];

    const watchedIds = this.getWatchedVideoIds();
    const recentlyRecommendedIds = getRecentIds(HOME_RECOMMENDED_STORAGE_KEY);
    const now = Date.now();

    const creatorCounts = new Map<string, number>();
    pool.forEach(video => {
      const creator = video.creatorId || video.creatorUsername;
      if (creator) creatorCounts.set(creator, (creatorCounts.get(creator) || 0) + 1);
    });

    const scored = pool.map(v => {
      const views = Math.max(0, Number(v.viewsCount) || 0);
      const likes = Math.max(0, Number(v.likesCount) || 0);
      const comments = Math.max(0, Number(v.commentsCount) || 0);
      const uploadTime = new Date(v.createdAt || 0).getTime();
      const ageHours = Number.isFinite(uploadTime) ? Math.max(0, (now - uploadTime) / 3_600_000) : Infinity;
      const freshness = ageHours < 24 ? 45 : ageHours < 72 ? 30 : ageHours < 168 ? 16 : ageHours < 720 ? 6 : 0;
      const viewsPerDay = views / Math.max(1, ageHours / 24);
      const viralVelocity = Math.min(32, Math.log10(viewsPerDay + 1) * 8);
      const engagementRate = Math.min(30, ((likes + comments * 2 + 1) / (views + 100)) * 1000);
      const creator = v.creatorId || v.creatorUsername;
      const creatorPenalty = creator ? Math.log2((creatorCounts.get(creator) || 1)) * 7 : 0;
      let totalScore = Math.log10(views + 1) * 18 + Math.log10(likes + 1) * 12 +
        Math.log10(comments + 1) * 8 + freshness + viralVelocity + engagementRate - creatorPenalty;

      if (watchedIds.has(v.videoId)) totalScore *= 0.4;
      if (recentlyRecommendedIds.has(v.videoId)) totalScore *= 0.35;

      return {
        video: v,
        score: totalScore
      };
    });

    // Sort candidates strictly by recommendation score descending (deterministic and stable)
    scored.sort((a, b) => b.score - a.score);
    let sortedVideos = scored.map(s => s.video);

    // Interleave creators and categories so the feed does not become repetitive.
    for (let i = 0; i < sortedVideos.length - 2; i++) {
      const currentCreator = sortedVideos[i].creatorId || sortedVideos[i].creatorUsername;
      const nextCreator = sortedVideos[i + 1].creatorId || sortedVideos[i + 1].creatorUsername;
      const thirdCreator = sortedVideos[i + 2].creatorId || sortedVideos[i + 2].creatorUsername;
      const currentCategory = sortedVideos[i].category?.toLowerCase();
      const nextCategory = sortedVideos[i + 1].category?.toLowerCase();
      const thirdCategory = sortedVideos[i + 2].category?.toLowerCase();

      if (
        (currentCreator && nextCreator === currentCreator && thirdCreator === currentCreator) ||
        (currentCategory && nextCategory === currentCategory && thirdCategory === currentCategory)
      ) {
        const diffIdx = sortedVideos.findIndex((video, idx) => {
          if (idx <= i + 2) return false;
          const creator = video.creatorId || video.creatorUsername;
          const category = video.category?.toLowerCase();
          return (currentCreator && creator !== currentCreator) ||
            (currentCategory && category !== currentCategory);
        });
        if (diffIdx !== -1 && diffIdx < i + 6) {
          [sortedVideos[i + 2], sortedVideos[diffIdx]] = [sortedVideos[diffIdx], sortedVideos[i + 2]];
        }
      }
    }

    return sortedVideos;
  },

  /**
   * YOUTUBE-STYLE WATCH PAGE SIDEBAR RECOMMENDATION ALGORITHM
   * 1. Multi-factor scoring:
   *    - Views & Likes engagement (log scaled).
   *    - Freshness / New Content Boost (new uploads < 24h/3d/7d get high boost).
   *    - Category / Creator Affinity (when in 'All' or 'Related').
   * 2. Watched Videos intelligent decay:
   *    - Watched videos are penalized (0.45x) so unwatched & fresh content naturally surfaces first.
   *    - BUT watched videos are NOT deleted/banned ("or yeh bhi mat karo ki ak bar hi dikho algruhtim bano").
   * 3. Dynamic Positional Jitter & Anti-Freeze:
   *    - Shuffles/rotates top positions so the same video doesn't appear in the exact same slot repeatedly ("same positing per hi ak vedio mat dikho").
   *    - Prevents back-to-back #0 repetition.
   * 4. Strict category filter when a specific category is chosen, or full library when 'All'.
   */
  getWatchSidebarRecommendations(options: WatchSidebarOptions): Video[] {
    const { currentVideo, allVideos, selectedCategory } = options;
    if (!allVideos || allVideos.length === 0) return [];

    // Exclude current video and shorts
    let pool = allVideos.filter(v => v.videoId !== currentVideo?.videoId && !v.isShort);

    // Filter by selected category
    if (selectedCategory && selectedCategory !== 'All') {
      if (selectedCategory.startsWith('From') || selectedCategory === 'FromCreator') {
        pool = pool.filter(v => 
          (currentVideo?.creatorId && v.creatorId === currentVideo.creatorId) ||
          (currentVideo?.creatorUsername && v.creatorUsername === currentVideo.creatorUsername)
        );
      } else if (selectedCategory === 'Related') {
        const currentCat = currentVideo?.category?.toLowerCase();
        const relatedPool = pool.filter(v => 
          (currentCat && v.category?.toLowerCase() === currentCat) ||
          (currentVideo?.creatorId && v.creatorId === currentVideo.creatorId)
        );
        if (relatedPool.length >= 3) {
          pool = relatedPool;
        }
      } else {
        // Specific category filter
        const targetCat = selectedCategory.trim().toLowerCase();
        pool = pool.filter(v => v.category?.trim().toLowerCase() === targetCat);
      }
    }

    if (pool.length === 0) return [];

    const watchedIds = this.getWatchedVideoIds();
    const now = Date.now();

    // Score each candidate
    interface ScoredCandidate {
      video: Video;
      score: number;
    }

    const scored: ScoredCandidate[] = pool.map(v => {
      const views = Number(v.viewsCount) || 0;
      const likes = Number(v.likesCount) || 0;

      // Base engagement score (log scaled)
      const engagement = (Math.log10(Math.max(1, views) + 1) * 35) + (Math.log10(Math.max(1, likes) + 1) * 20);

      // Freshness bonus (New content boost)
      const uploadTime = new Date(v.createdAt || 0).getTime();
      const ageHours = (now - uploadTime) / (1000 * 60 * 60);
      let freshness = 0;
      if (ageHours < 24) {
        freshness = 120; // Super fresh uploaded today!
      } else if (ageHours < 72) {
        freshness = 80;  // 1-3 days
      } else if (ageHours < 168) {
        freshness = 50;  // 1 week
      } else if (ageHours < 720) {
        freshness = 25;  // 1 month
      }

      // Affinity bonus (if 'All' or general)
      let affinity = 0;
      if (currentVideo) {
        if (v.category && currentVideo.category && v.category.toLowerCase() === currentVideo.category.toLowerCase()) {
          affinity += 70;
        }
        if (v.creatorId && currentVideo.creatorId && v.creatorId === currentVideo.creatorId) {
          affinity += 40;
        }
        if (Array.isArray(v.tags) && Array.isArray(currentVideo.tags)) {
          const common = v.tags.filter(t => currentVideo.tags?.includes(t));
          affinity += common.length * 15;
        }
      }

      let totalScore = engagement + freshness + affinity;

      // Watched penalty: Decays score so unwatched new content comes first,
      // but does NOT remove the video entirely ("or yeh bhi mat karo ki ak bar hi dikho")
      if (watchedIds.has(v.videoId)) {
        totalScore *= 0.45;
      }

      // Dynamic position jitter ("same positing per hi ak vedio mat dikho")
      const jitter = Math.random() * 20;
      totalScore += jitter;

      return {
        video: v,
        score: totalScore
      };
    });

    // Sort by final score descending
    scored.sort((a, b) => b.score - a.score);
    const sortedVideos = scored.map(s => s.video);

    // Apply positional rotation on top 6 candidates so they don't appear in frozen order
    const TOP_WINDOW = Math.min(6, sortedVideos.length);
    if (TOP_WINDOW > 1) {
      const topWindow = sortedVideos.slice(0, TOP_WINDOW);
      // Light shuffle within the top window
      for (let i = topWindow.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topWindow[i], topWindow[j]] = [topWindow[j], topWindow[i]];
      }

      // Ensure position 0 is not the exact same video as last view if alternatives exist
      if (topWindow.length > 1 && topWindow[0].videoId === lastWatchSidebarFirstVideoId) {
        const swapIdx = Math.floor(Math.random() * (topWindow.length - 1)) + 1;
        [topWindow[0], topWindow[swapIdx]] = [topWindow[swapIdx], topWindow[0]];
      }

      if (topWindow[0]?.videoId) {
        lastWatchSidebarFirstVideoId = topWindow[0].videoId;
      }

      return [...topWindow, ...sortedVideos.slice(TOP_WINDOW)];
    }

    return sortedVideos;
  },

  /**
   * YOUTUBE-STYLE SHORTS RECOMMENDATION ALGORITHM
   * Solves: "shorts same ak hi dikhti hai lagothim bano"
   * 1. Multi-factor engagement scoring (views + likes + comments).
   * 2. Watched decay penalty (0.35x for already-watched shorts to prioritize fresh/unseen content).
   * 3. Dynamic positional jitter (randomizes candidate scores to eliminate frozen static order).
   * 4. Creator Diversity Interleaving (prevents 2+ consecutive shorts from the same creator).
   * 5. Anti-Repeat Hero (prevents the same short from sticking at card #0 on every refresh).
   */
  getShortsRecommendations(options: ShortsRecommendationOptions): Video[] {
    const { allShorts, currentShortId, excludeIds = [], limit } = options;
    if (!allShorts || allShorts.length === 0) return [];

    const excludeSet = new Set(excludeIds);
    if (currentShortId) {
      excludeSet.add(currentShortId);
    }

    const uniqueShorts = new Map<string, Video>();
    allShorts.forEach(short => {
      if (short?.videoId && !excludeSet.has(short.videoId) && !uniqueShorts.has(short.videoId)) {
        uniqueShorts.set(short.videoId, short);
      }
    });
    const pool = [...uniqueShorts.values()];
    if (pool.length === 0) return [];

    const watchedIds = this.getWatchedVideoIds();
    const recentlyRecommendedShorts = getRecentIds(SHORTS_RECOMMENDED_STORAGE_KEY);
    const now = Date.now();

    const scored = pool.map(short => {
      const views = Math.max(0, Number(short.viewsCount) || 0);
      const likes = Math.max(0, Number(short.likesCount) || 0);
      const comments = Math.max(0, Number(short.commentsCount) || 0);
      const uploadTime = new Date(short.createdAt || 0).getTime();
      const ageHours = Number.isFinite(uploadTime) ? Math.max(0, (now - uploadTime) / 3_600_000) : Infinity;
      const freshness = ageHours < 24 ? 45 : ageHours < 72 ? 30 : ageHours < 168 ? 16 : ageHours < 720 ? 6 : 0;
      const viewsPerDay = views / Math.max(1, ageHours / 24);
      const viralVelocity = Math.min(32, Math.log10(viewsPerDay + 1) * 8);
      const engagementRate = Math.min(30, ((likes + comments * 2 + 1) / (views + 100)) * 1000);
      let totalScore = Math.log10(views + 1) * 18 + Math.log10(likes + 1) * 12 +
        Math.log10(comments + 1) * 8 + freshness + viralVelocity + engagementRate;
      if (watchedIds.has(short.videoId)) totalScore *= 0.4;
      if (recentlyRecommendedShorts.has(short.videoId)) totalScore *= 0.25;

      const jitter = Math.random() * 18;
      totalScore += jitter;

      return {
        short,
        score: totalScore
      };
    });

    // Sort by algorithmic score descending
    scored.sort((a, b) => b.score - a.score);
    let candidateShorts = scored.map(s => s.short);

    // Interleave creators and avoid long runs from the same category.
    for (let i = 0; i < candidateShorts.length - 1; i++) {
      const currentCreator = candidateShorts[i].creatorId || candidateShorts[i].creatorUsername;
      const nextCreator = candidateShorts[i + 1].creatorId || candidateShorts[i + 1].creatorUsername;
      const currentCategory = candidateShorts[i].category?.toLowerCase();
      const nextCategory = candidateShorts[i + 1].category?.toLowerCase();
      const thirdCategory = candidateShorts[i + 2]?.category?.toLowerCase();

      if (
        (currentCreator && nextCreator === currentCreator) ||
        (currentCategory && nextCategory === currentCategory && thirdCategory === currentCategory)
      ) {
        const swapIdx = candidateShorts.findIndex((short, idx) => {
          if (idx <= i + 1) return false;
          const creator = short.creatorId || short.creatorUsername;
          const category = short.category?.toLowerCase();
          return (currentCreator && creator !== currentCreator) ||
            (currentCategory && category !== currentCategory);
        });
        if (swapIdx !== -1 && swapIdx < i + 5) {
          [candidateShorts[i + 1], candidateShorts[swapIdx]] = [candidateShorts[swapIdx], candidateShorts[i + 1]];
        }
      }
    }

    if (limit && limit > 0) {
      const unseenShorts = candidateShorts.filter(short => !recentlyRecommendedShorts.has(short.videoId));
      const seenShorts = candidateShorts.filter(short => recentlyRecommendedShorts.has(short.videoId));
      const recommended = [...unseenShorts, ...seenShorts].slice(0, limit);
      if (recommended.length > 1 && recommended[0].videoId === lastHeroShortId) {
        const swapIndex = 1 + Math.floor(Math.random() * (recommended.length - 1));
        [recommended[0], recommended[swapIndex]] = [recommended[swapIndex], recommended[0]];
      }
      if (recommended[0]?.videoId) lastHeroShortId = recommended[0].videoId;
      rememberIds(
        SHORTS_RECOMMENDED_STORAGE_KEY,
        recommended.map(short => short.videoId)
      );
      return recommended;
    }

    if (candidateShorts.length > 2 && candidateShorts[0].videoId === lastHeroShortId) {
      const swapTarget = Math.min(candidateShorts.length - 1, Math.floor(Math.random() * 3) + 1);
      [candidateShorts[0], candidateShorts[swapTarget]] = [candidateShorts[swapTarget], candidateShorts[0]];
    }
    if (candidateShorts[0]?.videoId) lastHeroShortId = candidateShorts[0].videoId;
    return candidateShorts;
  }
};
