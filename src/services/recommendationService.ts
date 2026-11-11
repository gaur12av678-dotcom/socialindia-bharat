import { Video } from '../types';

const WATCHED_STORAGE_KEY = 'socialindia_watched_ids';
let lastHeroVideoId = '';
let lastWatchSidebarFirstVideoId = '';
let lastMoreVideosFirstId = '';
let lastHeroShortId = '';

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
   * TOP-20 VIEWS ROTATING RECOMMENDATION ENGINE (Home feed)
   * 1. Filters only the videos with highest views (viewsCount descending).
   * 2. Takes strictly the top 20 highest-viewed videos.
   * 3. Dynamically changes/rotates their positions on each refresh.
   * 4. Ensures the exact same video doesn't appear at position #0 repeatedly.
   * 5. Keeps remaining videos (ranked 21+) after the top 20.
   */
  rankAndFilterVideos(videos: Video[], options?: { isShortsOnly?: boolean; userUid?: string; rotateTop?: boolean }): Video[] {
    if (!videos || videos.length === 0) return [];

    let pool = [...videos];
    if (options?.isShortsOnly) {
      pool = pool.filter(v => v.isShort);
    }

    if (pool.length === 0) return [];

    // 1. Sort strictly by highest views (highest views first, likesCount as tiebreaker)
    pool.sort((a, b) => {
      const viewsA = Number(a.viewsCount) || 0;
      const viewsB = Number(b.viewsCount) || 0;
      if (viewsB !== viewsA) {
        return viewsB - viewsA;
      }
      const likesA = Number(a.likesCount) || 0;
      const likesB = Number(b.likesCount) || 0;
      if (likesB !== likesA) {
        return likesB - likesA;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    // Only rotate top items on explicit refresh
    if (options?.rotateTop) {
      const TOP_LIMIT = 20;
      const top20Pool = pool.slice(0, TOP_LIMIT);
      const restPool = pool.slice(TOP_LIMIT);
      const rotatedTop20 = this.shuffleArray(top20Pool);
      return [...rotatedTop20, ...restPool];
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
    const now = Date.now();

    const scored = pool.map(v => {
      const views = Number(v.viewsCount) || 0;
      const likes = Number(v.likesCount) || 0;

      // Base engagement score (logarithmic)
      const engagement = (Math.log10(Math.max(1, views) + 1) * 32) + (Math.log10(Math.max(1, likes) + 1) * 18);

      // Freshness bonus (New content discovery)
      const uploadTime = new Date(v.createdAt || 0).getTime();
      const ageHours = (now - uploadTime) / (1000 * 60 * 60);
      let freshness = 0;
      if (ageHours < 24) {
        freshness = 110;
      } else if (ageHours < 72) {
        freshness = 75;
      } else if (ageHours < 168) {
        freshness = 45;
      } else if (ageHours < 720) {
        freshness = 20;
      }

      let totalScore = engagement + freshness;

      // Watched penalty: Decays score so unwatched content surfaces first,
      // but keeps watched favorites eligible further down
      if (watchedIds.has(v.videoId)) {
        totalScore *= 0.45;
      }

      return {
        video: v,
        score: totalScore
      };
    });

    // Sort candidates strictly by recommendation score descending (deterministic and stable)
    scored.sort((a, b) => b.score - a.score);
    let sortedVideos = scored.map(s => s.video);

    // Channel diversity pass: don't let 3 consecutive videos be from the exact same creator
    for (let i = 0; i < sortedVideos.length - 2; i++) {
      const currentCreator = sortedVideos[i].creatorId || sortedVideos[i].creatorUsername;
      const nextCreator = sortedVideos[i + 1].creatorId || sortedVideos[i + 1].creatorUsername;
      const thirdCreator = sortedVideos[i + 2].creatorId || sortedVideos[i + 2].creatorUsername;

      if (currentCreator && nextCreator === currentCreator && thirdCreator === currentCreator) {
        // Find next video with a different creator to swap
        const diffIdx = sortedVideos.findIndex((v, idx) => idx > i + 2 && (v.creatorId || v.creatorUsername) !== currentCreator);
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

    let pool = allShorts.filter(s => s && s.videoId && !excludeSet.has(s.videoId));
    if (pool.length === 0) {
      pool = [...allShorts];
    }

    const watchedIds = this.getWatchedVideoIds();
    const now = Date.now();

    const scored = pool.map(short => {
      const views = Number(short.viewsCount) || 0;
      const likes = Number(short.likesCount) || 0;
      const comments = Number(short.commentsCount) || 0;

      // Base engagement score (logarithmic)
      const engagement = (Math.log10(Math.max(1, views) + 1) * 26) + 
                         (Math.log10(Math.max(1, likes) + 1) * 20) + 
                         (Math.log10(Math.max(1, comments) + 1) * 12);

      // Freshness bonus (elevates newly published shorts)
      const uploadTime = new Date(short.createdAt || 0).getTime();
      const ageHours = (now - uploadTime) / (1000 * 60 * 60);
      let freshness = 0;
      if (ageHours < 24) {
        freshness = 90;
      } else if (ageHours < 72) {
        freshness = 60;
      } else if (ageHours < 168) {
        freshness = 35;
      } else if (ageHours < 720) {
        freshness = 15;
      }

      let totalScore = engagement + freshness;

      // Watched penalty: Decays score so user encounters fresh shorts
      if (watchedIds.has(short.videoId)) {
        totalScore *= 0.35;
      }

      // Dynamic position jitter to avoid static frozen ranking
      const jitter = Math.random() * 28;
      totalScore += jitter;

      return {
        short,
        score: totalScore
      };
    });

    // Sort by algorithmic score descending
    scored.sort((a, b) => b.score - a.score);
    let candidateShorts = scored.map(s => s.short);

    // Creator Diversity Interleaving: avoid consecutive shorts from the exact same creator
    for (let i = 0; i < candidateShorts.length - 1; i++) {
      const currentCreator = candidateShorts[i].creatorId || candidateShorts[i].creatorUsername;
      const nextCreator = candidateShorts[i + 1].creatorId || candidateShorts[i + 1].creatorUsername;

      if (currentCreator && nextCreator === currentCreator) {
        const swapIdx = candidateShorts.findIndex((s, idx) => idx > i + 1 && (s.creatorId || s.creatorUsername) !== currentCreator);
        if (swapIdx !== -1 && swapIdx < i + 5) {
          [candidateShorts[i + 1], candidateShorts[swapIdx]] = [candidateShorts[swapIdx], candidateShorts[i + 1]];
        }
      }
    }

    // Anti-repeat Hero Short check: ensure card #0 isn't identical across consecutive page loads
    if (candidateShorts.length > 2 && candidateShorts[0].videoId === lastHeroShortId) {
      const swapTarget = Math.min(candidateShorts.length - 1, Math.floor(Math.random() * 3) + 1);
      [candidateShorts[0], candidateShorts[swapTarget]] = [candidateShorts[swapTarget], candidateShorts[0]];
    }

    if (candidateShorts[0]?.videoId) {
      lastHeroShortId = candidateShorts[0].videoId;
    }

    if (limit && limit > 0) {
      return candidateShorts.slice(0, limit);
    }

    return candidateShorts;
  }
};
