import { Video } from '../types';

const WATCHED_STORAGE_KEY = 'socialindia_watched_ids';
let lastHeroVideoId = '';

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
   * TOP-20 VIEWS ROTATING RECOMMENDATION ENGINE
   * 1. Filters only the videos with highest views (viewsCount descending).
   * 2. Takes strictly the top 20 highest-viewed videos ("top ki 20 ko hi gumneh dena").
   * 3. Dynamically changes/rotates their positions on each refresh ("positing bhi badlana bar bar").
   * 4. Ensures the exact same video doesn't appear at position #0 repeatedly ("same bar bar mat dikhna").
   * 5. Keeps remaining videos (ranked 21+) after the top 20.
   */
  rankAndFilterVideos(videos: Video[], options?: { isShortsOnly?: boolean; userUid?: string }): Video[] {
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

    // 2. Select strictly the TOP 20 highest-viewed videos
    const TOP_LIMIT = 20;
    const top20Pool = pool.slice(0, TOP_LIMIT);
    const restPool = pool.slice(TOP_LIMIT);

    // 3. Rotate & change positions among these top 20 so they are not static
    const rotatedTop20 = this.shuffleArray(top20Pool);

    // 4. Anti-repeat hero check: if first video was the exact hero video in the previous view, swap with another item
    if (rotatedTop20.length > 1 && rotatedTop20[0].videoId === lastHeroVideoId) {
      const swapIdx = Math.floor(Math.random() * (rotatedTop20.length - 1)) + 1;
      [rotatedTop20[0], rotatedTop20[swapIdx]] = [rotatedTop20[swapIdx], rotatedTop20[0]];
    }

    if (rotatedTop20[0]?.videoId) {
      lastHeroVideoId = rotatedTop20[0].videoId;
    }

    // 5. Return rotated top 20 first, followed by the rest
    return [...rotatedTop20, ...restPool];
  }
};
