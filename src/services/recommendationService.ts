import { Video } from '../types';
import { historyService } from './historyService';

const WATCHED_STORAGE_KEY = 'socialindia_watched_ids';

export const recommendationService = {
  // Save watched video ID to local session + firestore
  recordVideoWatch(videoId: string, uid?: string) {
    if (!videoId) return;
    try {
      const existingStr = localStorage.getItem(WATCHED_STORAGE_KEY);
      const ids: string[] = existingStr ? JSON.parse(existingStr) : [];
      if (!ids.includes(videoId)) {
        ids.push(videoId);
        // Keep last 200 watched video IDs
        if (ids.length > 200) ids.shift();
        localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(ids));
      }
    } catch (e) {
      console.warn('LocalStorage save watched failed:', e);
    }
  },

  // Get list of watched video IDs
  getWatchedVideoIds(): Set<string> {
    try {
      const existingStr = localStorage.getItem(WATCHED_STORAGE_KEY);
      const ids: string[] = existingStr ? JSON.parse(existingStr) : [];
      return new Set(ids);
    } catch (e) {
      return new Set();
    }
  },

  // AI Recommendation Engine: Ranks, Anti-repeats, and Dynamic Shuffles videos
  rankAndFilterVideos(videos: Video[], options?: { isShortsOnly?: boolean; userUid?: string }): Video[] {
    if (!videos || videos.length === 0) return [];

    const watchedSet = this.getWatchedVideoIds();

    // Filter by Shorts vs Standard if required
    let pool = [...videos];
    if (options?.isShortsOnly) {
      pool = pool.filter(v => v.isShort);
    }

    // Separate into Unwatched and Watched pools
    const unwatched: Video[] = [];
    const watched: Video[] = [];

    pool.forEach(v => {
      if (watchedSet.has(v.videoId)) {
        watched.push(v);
      } else {
        unwatched.push(v);
      }
    });

    // Function to calculate AI Engagement & Freshness Score
    const calculateAIScore = (video: Video) => {
      const views = video.viewsCount || 0;
      const likes = video.likesCount || 0;
      const comments = video.commentsCount || 0;
      const shares = video.sharesCount || 0;

      // Base Engagement Score
      const engagement = (views * 1) + (likes * 3) + (comments * 5) + (shares * 8);

      // Freshness factor based on creation date
      const ageHours = (Date.now() - new Date(video.createdAt || Date.now()).getTime()) / (1000 * 60 * 60);
      const freshnessBoost = Math.max(0, 100 - ageHours);

      // Random exploration factor (prevents static ordering on every refresh!)
      const randomNoise = Math.random() * (engagement * 0.3 + 20);

      return engagement + freshnessBoost + randomNoise;
    };

    // Sort unwatched videos by AI Score descending
    unwatched.sort((a, b) => calculateAIScore(b) - calculateAIScore(a));

    // Sort watched videos by AI Score descending
    watched.sort((a, b) => calculateAIScore(b) - calculateAIScore(a));

    // Combine: Unwatched FIRST, then Watched (at the bottom only if needed)
    return [...unwatched, ...watched];
  }
};
