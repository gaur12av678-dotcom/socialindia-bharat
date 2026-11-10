import { historyService } from './historyService';

export interface VideoPlaybackProgress {
  videoId: string;
  progressSeconds: number;
  duration: number;
  updatedAt: number;
}

const STORAGE_KEY = 'socialindia_playback_progress';
const MAX_RESUMABLE_VIDEOS = 3;
const progressCache = new Map<string, VideoPlaybackProgress>();

function pruneToRecentLimit(limit: number = MAX_RESUMABLE_VIDEOS): boolean {
  if (progressCache.size <= limit) return false;
  const sorted = Array.from(progressCache.values()).sort(
    (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
  );
  const keepIds = new Set(sorted.slice(0, limit).map(item => item.videoId));
  let removed = false;
  for (const key of Array.from(progressCache.keys())) {
    if (!keepIds.has(key)) {
      progressCache.delete(key);
      removed = true;
    }
  }
  return removed;
}

// Initialize in-memory cache synchronously from localStorage for instant 0ms access (capped at last 3 watched)
try {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: Record<string, VideoPlaybackProgress> = JSON.parse(raw);
      Object.entries(parsed).forEach(([id, item]) => {
        if (id && item && typeof item.progressSeconds === 'number') {
          progressCache.set(id, item);
        }
      });
      if (pruneToRecentLimit(MAX_RESUMABLE_VIDEOS)) {
        const obj: Record<string, VideoPlaybackProgress> = {};
        progressCache.forEach((val, key) => {
          obj[key] = val;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      }
    }
  }
} catch (e) {
  console.warn('Failed to parse playback progress from storage', e);
}

function persistToStorage() {
  try {
    if (typeof window === 'undefined') return;
    pruneToRecentLimit(MAX_RESUMABLE_VIDEOS);
    const obj: Record<string, VideoPlaybackProgress> = {};
    progressCache.forEach((val, key) => {
      obj[key] = val;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('Failed to persist playback progress to storage', e);
  }
}

let lastFirestoreSyncTime = 0;
let lastFirestoreSyncVideoId = '';

export const playbackProgressService = {
  MAX_RESUMABLE_VIDEOS,

  /**
   * Save playback progress for any video (only the last 3 watched videos are retained for resume).
   * Works for both Guests (localStorage) and Logged-In users (localStorage + Firestore).
   * Automatically clears progress if video was watched to near completion (>95% or last 5s),
   * or if video was barely started (<5s).
   */
  saveProgress(videoId: string, seconds: number, duration: number, userUid?: string): void {
    if (!videoId) return;

    const roundedSeconds = Math.max(0, Math.floor(seconds));
    const roundedDuration = Math.max(0, Math.floor(duration));

    // YouTube standard reset rules:
    // 1. Barely started (< 5 seconds): treat as not started
    // 2. Video finished or nearly finished (> 95% or within last 5 seconds): reset to 0
    const isFinished = (roundedDuration > 10 && roundedSeconds >= roundedDuration - 5) || 
                       (roundedDuration > 10 && roundedSeconds / roundedDuration >= 0.95);
    const isBarelyStarted = roundedSeconds < 5;

    if (isFinished || isBarelyStarted) {
      this.clearProgress(videoId, userUid);
      return;
    }

    const item: VideoPlaybackProgress = {
      videoId,
      progressSeconds: roundedSeconds,
      duration: roundedDuration,
      updatedAt: Date.now()
    };

    progressCache.set(videoId, item);
    pruneToRecentLimit(MAX_RESUMABLE_VIDEOS);
    persistToStorage();

    // Notify components like VideoCard or sidebar to update red progress bar in real time
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socialindia:playback-progress-updated', {
        detail: { videoId, progressSeconds: roundedSeconds, duration: roundedDuration }
      }));
    }

    // Sync to Firestore for logged-in users (throttled to at most once every 6 seconds or video switch)
    if (userUid) {
      const now = Date.now();
      if (lastFirestoreSyncVideoId !== videoId || (now - lastFirestoreSyncTime > 6000)) {
        lastFirestoreSyncTime = now;
        lastFirestoreSyncVideoId = videoId;
        historyService.updatePlaybackProgress(userUid, videoId, roundedSeconds).catch(console.warn);
      }
    }
  },

  /**
   * Returns the resume playback position in seconds (or 0 if not in last 3 watched / expired).
   * Works synchronously (0ms) from memory & localStorage across all cases.
   */
  getProgress(videoId: string, expectedDuration?: number): number {
    if (!videoId) return 0;
    const recentTopIds = Array.from(progressCache.values())
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, MAX_RESUMABLE_VIDEOS)
      .map(entry => entry.videoId);
    if (!recentTopIds.includes(videoId)) return 0;

    const item = progressCache.get(videoId);
    if (!item) return 0;

    const dur = expectedDuration || item.duration || 0;
    const sec = item.progressSeconds;

    // Failsafe check against duration
    if (sec < 5) return 0;
    if (dur > 10 && (sec >= dur - 5 || sec / dur >= 0.95)) {
      return 0;
    }

    return sec;
  },

  /**
   * Returns the percentage (0 to 100) of video watched, for drawing the red progress bar (last 3 watched only).
   */
  getProgressPercent(videoId: string, videoDuration?: number): number {
    if (!videoId) return 0;
    const item = progressCache.get(videoId);
    if (!item || item.progressSeconds < 5) return 0;

    const effectiveDur = videoDuration || item.duration || 0;
    if (effectiveDur <= 0) return 0;

    const percent = Math.min(100, Math.max(0, (item.progressSeconds / effectiveDur) * 100));
    // If > 95%, resets or marks as fully watched
    if (percent >= 95) return 0;

    return percent;
  },

  /**
   * Clear progress (e.g. When user selects "Play from beginning" or video finishes)
   */
  clearProgress(videoId: string, userUid?: string): void {
    if (!videoId) return;
    progressCache.delete(videoId);
    persistToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socialindia:playback-progress-updated', {
        detail: { videoId, progressSeconds: 0, duration: 0 }
      }));
    }

    if (userUid) {
      historyService.updatePlaybackProgress(userUid, videoId, 0).catch(console.warn);
    }
  },

  /**
   * Sync from Firestore watch history when loaded (strictly keeps only the last 3 watched videos with valid progress)
   */
  syncFromHistoryItems(items: Array<{ videoId: string; progressSeconds?: number; duration?: number; watchedAt?: string }>): void {
    if (!items || items.length === 0) return;
    let modified = false;

    const recentValid = [...items]
      .filter(it => {
        if (!it.videoId) return false;
        const sec = it.progressSeconds || 0;
        const dur = it.duration || 0;
        return sec >= 5 && (!dur || sec < dur * 0.95);
      })
      .sort((a, b) => {
        const ta = a.watchedAt ? new Date(a.watchedAt).getTime() || 0 : 0;
        const tb = b.watchedAt ? new Date(b.watchedAt).getTime() || 0 : 0;
        return tb - ta;
      })
      .slice(0, MAX_RESUMABLE_VIDEOS);

    for (const it of recentValid) {
      const sec = it.progressSeconds || 0;
      const dur = it.duration || 0;
      const ts = it.watchedAt ? new Date(it.watchedAt).getTime() || Date.now() : Date.now();
      const existing = progressCache.get(it.videoId);
      if (!existing || ts > (existing.updatedAt || 0)) {
        progressCache.set(it.videoId, {
          videoId: it.videoId,
          progressSeconds: sec,
          duration: dur,
          updatedAt: ts
        });
        modified = true;
      }
    }

    if (pruneToRecentLimit(MAX_RESUMABLE_VIDEOS)) {
      modified = true;
    }

    if (modified) {
      persistToStorage();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socialindia:playback-progress-updated', { detail: {} }));
      }
    }
  }
};
