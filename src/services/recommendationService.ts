import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Video } from '../types';

const WATCHED_STORAGE_KEY = 'socialindia_watched_ids';
const HOME_RECOMMENDED_STORAGE_KEY = 'socialindia_home_recommended_ids';
const SHORTS_RECOMMENDED_STORAGE_KEY = 'socialindia_home_shorts_recommended_ids';
const NOT_INTERESTED_KEY_PREFIX = 'socialindia_not_interested_';
export const NOT_INTERESTED_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (1 month)
export const NOT_INTERESTED_EVENT = 'socialindia:not-interested-updated';

interface NotInterestedEntry {
  videoId: string;
  createdAt: number;
  expiresAt: number;
  category?: string;
  creatorId?: string;
}

const cloudSyncedUids = new Set<string>();

function getNotInterestedStorageKey(uid?: string): string {
  return `${NOT_INTERESTED_KEY_PREFIX}${uid || 'guest'}`;
}

function readEntriesForKey(storageKey: string, now = Date.now()): NotInterestedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const active = parsed.filter(
      (item): item is NotInterestedEntry =>
        Boolean(item) &&
        typeof item.videoId === 'string' &&
        item.videoId.length > 0 &&
        typeof item.expiresAt === 'number' &&
        Number.isFinite(item.expiresAt) &&
        item.expiresAt > now
    );
    if (active.length !== parsed.length) {
      localStorage.setItem(storageKey, JSON.stringify(active));
    }
    return active;
  } catch {
    return [];
  }
}

function readActiveNotInterestedEntries(uid?: string): NotInterestedEntry[] {
  const now = Date.now();
  const byId = new Map<string, NotInterestedEntry>();
  const guestEntries = readEntriesForKey(getNotInterestedStorageKey(undefined), now);
  guestEntries.forEach(entry => byId.set(entry.videoId, entry));
  if (uid) {
    const userEntries = readEntriesForKey(getNotInterestedStorageKey(uid), now);
    userEntries.forEach(entry => {
      const existing = byId.get(entry.videoId);
      if (!existing || entry.expiresAt > existing.expiresAt) {
        byId.set(entry.videoId, entry);
      }
    });
  }
  return Array.from(byId.values());
}

let lastHeroVideoId = '';
let lastWatchSidebarFirstVideoId = '';
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
  markNotInterested(video: Pick<Video, 'videoId' | 'category' | 'creatorId'>, uid?: string): void {
    if (!video?.videoId || typeof window === 'undefined') return;
    const now = Date.now();
    const entry: NotInterestedEntry = {
      videoId: video.videoId,
      createdAt: now,
      expiresAt: now + NOT_INTERESTED_TTL_MS,
      category: video.category || undefined,
      creatorId: video.creatorId || undefined,
    };

    const targetKey = getNotInterestedStorageKey(uid);
    const existing = readEntriesForKey(targetKey, now).filter(item => item.videoId !== video.videoId);
    existing.push(entry);
    const trimmed = existing.slice(-500);
    try {
      localStorage.setItem(targetKey, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('LocalStorage save not-interested failed:', e);
    }

    window.dispatchEvent(new CustomEvent(NOT_INTERESTED_EVENT, {
      detail: { videoId: video.videoId, uid }
    }));

    if (uid) {
      void setDoc(
        doc(db, 'users', uid, 'private', 'not_interested'),
        {
          items: trimmed,
          updatedAt: new Date(now).toISOString(),
        },
        { merge: true }
      ).catch(err => {
        console.warn('Could not sync not-interested preferences to cloud:', err);
      });
    }
  },

  async syncNotInterestedFromCloud(uid?: string): Promise<void> {
    if (!uid || typeof window === 'undefined' || cloudSyncedUids.has(uid)) return;
    cloudSyncedUids.add(uid);
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'private', 'not_interested'));
      if (!snap.exists()) return;
      const data = snap.data();
      const cloudItems: NotInterestedEntry[] = Array.isArray(data?.items) ? data.items : [];
      const now = Date.now();
      const storageKey = getNotInterestedStorageKey(uid);
      const localItems = readEntriesForKey(storageKey, now);
      const merged = new Map<string, NotInterestedEntry>();

      localItems.forEach(item => merged.set(item.videoId, item));
      let addedNew = false;
      cloudItems.forEach(item => {
        if (
          item &&
          typeof item.videoId === 'string' &&
          typeof item.expiresAt === 'number' &&
          item.expiresAt > now
        ) {
          const prev = merged.get(item.videoId);
          if (!prev) addedNew = true;
          if (!prev || item.expiresAt > prev.expiresAt) {
            merged.set(item.videoId, item);
          }
        }
      });

      const finalItems = Array.from(merged.values()).slice(-500);
      localStorage.setItem(storageKey, JSON.stringify(finalItems));
      if (addedNew) {
        window.dispatchEvent(new CustomEvent(NOT_INTERESTED_EVENT, { detail: { uid } }));
      }
    } catch (err) {
      console.warn('Could not fetch cloud not-interested preferences:', err);
    }
  },

  getNotInterestedIds(uid?: string): Set<string> {
    return new Set(readActiveNotInterestedEntries(uid).map(item => item.videoId));
  },

  getNotInterestedPenaltySignals(uid?: string): {
    categoryCounts: Map<string, number>;
    creatorCounts: Map<string, number>;
  } {
    const entries = readActiveNotInterestedEntries(uid);
    const categoryCounts = new Map<string, number>();
    const creatorCounts = new Map<string, number>();
    entries.forEach(entry => {
      if (entry.category) {
        const catKey = entry.category.trim().toLowerCase();
        if (catKey) categoryCounts.set(catKey, (categoryCounts.get(catKey) || 0) + 1);
      }
      if (entry.creatorId) {
        creatorCounts.set(entry.creatorId, (creatorCounts.get(entry.creatorId) || 0) + 1);
      }
    });
    return { categoryCounts, creatorCounts };
  },

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

    const notInterestedIds = this.getNotInterestedIds(options?.userUid);
    const { categoryCounts, creatorCounts: dismissedCreators } = this.getNotInterestedPenaltySignals(options?.userUid);

    let pool = videos.filter(v => v && v.videoId && !notInterestedIds.has(v.videoId));
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
      const dismissedCreatorHits = video.creatorId ? (dismissedCreators.get(video.creatorId) || 0) : 0;
      if (dismissedCreatorHits > 0) total *= Math.max(0.45, 1 - dismissedCreatorHits * 0.15);
      const dismissedCatHits = video.category ? (categoryCounts.get(video.category.trim().toLowerCase()) || 0) : 0;
      if (dismissedCatHits > 0) total *= Math.max(0.6, 1 - dismissedCatHits * 0.08);
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
    const { allVideos, firstRowIds = [], category = 'All', userUid } = options;
    if (!allVideos || allVideos.length === 0) return [];

    const notInterestedIds = this.getNotInterestedIds(userUid);
    const { categoryCounts, creatorCounts: dismissedCreators } = this.getNotInterestedPenaltySignals(userUid);
    const firstRowSet = new Set(firstRowIds);
    // Exclude shorts, row-1 videos, and 30-day not-interested videos
    let pool = allVideos.filter(v => v && v.videoId && !v.isShort && !firstRowSet.has(v.videoId) && !notInterestedIds.has(v.videoId));

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
      const dismissedCreatorHits = v.creatorId ? (dismissedCreators.get(v.creatorId) || 0) : 0;
      if (dismissedCreatorHits > 0) totalScore *= Math.max(0.45, 1 - dismissedCreatorHits * 0.15);
      const dismissedCatHits = v.category ? (categoryCounts.get(v.category.trim().toLowerCase()) || 0) : 0;
      if (dismissedCatHits > 0) totalScore *= Math.max(0.6, 1 - dismissedCatHits * 0.08);

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
   */
  getWatchSidebarRecommendations(options: WatchSidebarOptions): Video[] {
    const { currentVideo, allVideos, selectedCategory, userUid } = options;
    if (!allVideos || allVideos.length === 0) return [];

    const notInterestedIds = this.getNotInterestedIds(userUid);
    const { categoryCounts, creatorCounts: dismissedCreators } = this.getNotInterestedPenaltySignals(userUid);

    // Exclude current video, shorts, and 30-day not-interested videos
    let pool = allVideos.filter(v =>
      v &&
      v.videoId &&
      v.videoId !== currentVideo?.videoId &&
      !v.isShort &&
      !notInterestedIds.has(v.videoId)
    );

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

    interface ScoredCandidate {
      video: Video;
      score: number;
    }

    const scored: ScoredCandidate[] = pool.map(v => {
      const views = Number(v.viewsCount) || 0;
      const likes = Number(v.likesCount) || 0;

      const engagement = (Math.log10(Math.max(1, views) + 1) * 35) + (Math.log10(Math.max(1, likes) + 1) * 20);

      const uploadTime = new Date(v.createdAt || 0).getTime();
      const ageHours = Number.isFinite(uploadTime) ? (now - uploadTime) / (1000 * 60 * 60) : Infinity;
      let freshness = 0;
      if (ageHours < 24) {
        freshness = 120;
      } else if (ageHours < 72) {
        freshness = 80;
      } else if (ageHours < 168) {
        freshness = 50;
      } else if (ageHours < 720) {
        freshness = 25;
      }

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

      if (watchedIds.has(v.videoId)) {
        totalScore *= 0.45;
      }

      const dismissedCreatorHits = v.creatorId ? (dismissedCreators.get(v.creatorId) || 0) : 0;
      if (dismissedCreatorHits > 0) {
        totalScore *= Math.max(0.45, 1 - dismissedCreatorHits * 0.15);
      }
      const dismissedCatHits = v.category ? (categoryCounts.get(v.category.trim().toLowerCase()) || 0) : 0;
      if (dismissedCatHits > 0) {
        totalScore *= Math.max(0.6, 1 - dismissedCatHits * 0.08);
      }

      const jitter = Math.random() * 20;
      totalScore += jitter;

      return {
        video: v,
        score: totalScore
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const sortedVideos = scored.map(s => s.video);

    const TOP_WINDOW = Math.min(6, sortedVideos.length);
    if (TOP_WINDOW > 1) {
      const topWindow = sortedVideos.slice(0, TOP_WINDOW);
      for (let i = topWindow.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topWindow[i], topWindow[j]] = [topWindow[j], topWindow[i]];
      }

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
   */
  getShortsRecommendations(options: ShortsRecommendationOptions): Video[] {
    const { allShorts, currentShortId, excludeIds = [], userUid, limit } = options;
    if (!allShorts || allShorts.length === 0) return [];

    const notInterestedIds = this.getNotInterestedIds(userUid);
    const excludeSet = new Set(excludeIds);
    notInterestedIds.forEach(id => excludeSet.add(id));
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
