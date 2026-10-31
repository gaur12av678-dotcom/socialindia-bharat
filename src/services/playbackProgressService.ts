import { historyService } from './historyService';

export interface VideoPlaybackProgress {
  videoId: string;
  progressSeconds: number;
  duration: number;
  updatedAt: number;
}

const STORAGE_KEY = 'socialindia_playback_progress';
const progressCache = new Map<string, VideoPlaybackProgress>();

// Initialize in-memory cache synchronously from localStorage for instant 0ms access
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
    }
  }
} catch (e) {
  console.warn('Failed to parse playback progress from storage', e);
}

function persistToStorage() {
  try {
    if (typeof window === 'undefined') return;
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
  /**
   * Save playback progress for any video.
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
   * Returns the resume playback position in seconds (or 0 if none/expired).
   * Works synchronously (0ms) from memory & localStorage across all cases.
   */
  getProgress(videoId: string, expectedDuration?: number): number {
    if (!videoId) return 0;
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
   * Returns the percentage (0 to 100) of video watched, for drawing the YouTube red bar.
   */
  getProgressPercent(videoId: string, videoDuration?: number): number {
    if (!videoId) return 0;
    const item = progressCache.get(videoId);
    if (!item || item.progressSeconds < 5) return 0;

    const effectiveDur = videoDuration || item.duration || 0;
    if (effectiveDur <= 0) return 0;

    const percent = Math.min(100, Math.max(0, (item.progressSeconds / effectiveDur) * 100));
    // If > 95%, YouTube usually resets or marks as fully watched
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
   * Sync from Firestore watch history when loaded
   */
  syncFromHistoryItems(items: Array<{ videoId: string; progressSeconds?: number; duration?: number }>): void {
    if (!items || items.length === 0) return;
    let modified = false;

    for (const it of items) {
      if (!it.videoId) continue;
      const sec = it.progressSeconds || 0;
      const dur = it.duration || 0;
      if (sec >= 5 && (!dur || sec < dur * 0.95)) {
        if (!progressCache.has(it.videoId)) {
          progressCache.set(it.videoId, {
            videoId: it.videoId,
            progressSeconds: sec,
            duration: dur,
            updatedAt: Date.now()
          });
          modified = true;
        }
      }
    }

    if (modified) {
      persistToStorage();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socialindia:playback-progress-updated', { detail: {} }));
      }
    }
  }
};
