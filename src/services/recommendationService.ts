import { Video } from '../types';

const WATCHED_STORAGE_KEY = 'socialindia_watched_ids';

// ---------------------------------------------------------------------------
// FAIR & NEUTRAL RECOMMENDATION ENGINE (YouTube-style)
// 1. Engagement RATE scoring -> small creators can compete
// 2. Time-decay freshness -> new videos get a fair chance
// 3. Per-creator diversity cap -> no single channel hogs the feed
// 4. 12% exploration shuffle -> fresh content surfaces regularly
// 5. Watched videos sink to bottom -> anti-repeat
// ---------------------------------------------------------------------------

export const recommendationService = {
  recordVideoWatch(videoId: string, uid?: string) {
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

  calculateFairScore(video: Video): number {
    const views = Math.max(video.viewsCount || 0, 1);
    const likes = video.likesCount || 0;
    const comments = video.commentsCount || 0;
    const shares = video.sharesCount || 0;

    const likeRate = likes / views;
    const commentRate = comments / views;
    const shareRate = shares / views;
    const engagementRate =
      Math.min(likeRate * 8, 1) * 0.5 +
      Math.min(commentRate * 20, 1) * 0.3 +
      Math.min(shareRate * 30, 1) * 0.2;

    // Bayesian confidence: low-view videos pulled toward neutral
    const confidence = views / (views + 50);
    const adjustedRate = 0.5 * (1 - confidence) + engagementRate * confidence;

    const popularityBoost = Math.min(Math.log10(views + 1) / 4, 0.25);

    const ageHours = Math.max(
      (Date.now() - new Date(video.createdAt || Date.now()).getTime()) / 36e5, 0
    );
    const freshness = Math.exp(-ageHours / 168) * 0.4;

    return adjustedRate * 2.2 + popularityBoost + freshness;
  },

  rankAndFilterVideos(videos: Video[], options?: { isShortsOnly?: boolean; userUid?: string }): Video[] {
    if (!videos || videos.length === 0) return [];

    const watchedSet = this.getWatchedVideoIds();
    let pool = [...videos];
    if (options?.isShortsOnly) pool = pool.filter(v => v.isShort);

    const unwatched: Video[] = [];
    const watched: Video[] = [];
    pool.forEach(v => (watchedSet.has(v.videoId) ? watched : unwatched).push(v));

    unwatched.sort((a, b) => this.calculateFairScore(b) - this.calculateFairScore(a));
    watched.sort((a, b) => this.calculateFairScore(b) - this.calculateFairScore(a));

    // 12% exploration shuffle
    const exploreCount = Math.floor(unwatched.length * 0.12);
    if (exploreCount > 1) {
      const explore = unwatched.splice(-exploreCount);
      for (let i = explore.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [explore[i], explore[j]] = [explore[j], explore[i]];
      }
      const mid = Math.floor(unwatched.length / 2);
      unwatched.splice(mid, 0, ...explore);
    }

    // Per-creator cap: max 2 videos per creator in top 20
    const result: Video[] = [];
    const creatorCount: Record<string, number> = {};
    const overflow: Video[] = [];
    for (const v of unwatched) {
      const c = v.creatorId || v.creatorUsername || 'unknown';
      if ((creatorCount[c] || 0) < 2 || result.length >= 20) {
        creatorCount[c] = (creatorCount[c] || 0) + 1;
        result.push(v);
      } else {
        overflow.push(v);
      }
    }
    return [...result, ...overflow, ...watched];
  }
};
