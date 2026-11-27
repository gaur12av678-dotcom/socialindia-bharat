import { DownloadedVideo, Video } from '../types';

const DB_NAME = 'SocialIndiaOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'downloaded_videos';

export interface ActiveDownloadItem {
  videoId: string;
  title: string;
  isShort?: boolean;
  progress: number;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
  updatedAt: number;
}

type DownloadListener = (items: ActiveDownloadItem[]) => void;

const activeDownloadsMap = new Map<string, ActiveDownloadItem>();
const listeners = new Set<DownloadListener>();
const clearTimers = new Map<string, number>();

function notifyListeners(): void {
  const snapshot = Array.from(activeDownloadsMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      // Ignore subscriber errors
    }
  });
}

function updateDownloadTracker(item: ActiveDownloadItem): void {
  const existingTimer = clearTimers.get(item.videoId);
  if (existingTimer !== undefined && typeof window !== 'undefined') {
    window.clearTimeout(existingTimer);
    clearTimers.delete(item.videoId);
  }

  activeDownloadsMap.set(item.videoId, item);
  notifyListeners();

  if ((item.status === 'completed' || item.status === 'error') && typeof window !== 'undefined') {
    const duration = item.status === 'completed' ? 6000 : 8000;
    const timer = window.setTimeout(() => {
      activeDownloadsMap.delete(item.videoId);
      clearTimers.delete(item.videoId);
      notifyListeners();
    }, duration);
    clearTimers.set(item.videoId, timer);
  }
}

function isAllowedMediaUrl(rawUrl?: string): boolean {
  if (!rawUrl) return false;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported on this browser.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        store.createIndex('isShort', 'isShort', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export const downloadService = {
  getActiveDownloads(): ActiveDownloadItem[] {
    return Array.from(activeDownloadsMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getDownloadState(videoId: string): ActiveDownloadItem | undefined {
    return activeDownloadsMap.get(videoId);
  },

  subscribeDownloads(listener: DownloadListener): () => void {
    listeners.add(listener);
    listener(this.getActiveDownloads());
    return () => {
      listeners.delete(listener);
    };
  },

  dismissDownloadStatus(videoId: string): void {
    const existingTimer = clearTimers.get(videoId);
    if (existingTimer !== undefined && typeof window !== 'undefined') {
      window.clearTimeout(existingTimer);
      clearTimers.delete(videoId);
    }
    if (activeDownloadsMap.delete(videoId)) {
      notifyListeners();
    }
  },

  // Check if a video is stored offline
  async isDownloaded(videoId: string): Promise<boolean> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(videoId);
        req.onsuccess = () => resolve(Boolean(req.result));
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  },

  // Get a single downloaded video with local Blob
  async getDownloadedVideo(videoId: string): Promise<DownloadedVideo | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(videoId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('Failed to get downloaded video:', err);
      return null;
    }
  },

  // Get all offline videos & shorts
  async getAllDownloads(): Promise<DownloadedVideo[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as DownloadedVideo[];
          // Sort newest downloaded first
          list.sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('Failed to fetch offline downloads:', err);
      return [];
    }
  },

  // Download video stream with live progress tracking & store in IndexedDB
  async downloadVideo(
    video: Video,
    onProgress?: (percent: number) => void
  ): Promise<DownloadedVideo> {
    if (!isAllowedMediaUrl(video.videoUrl)) {
      const errMsg = 'Offline download is not supported for this stream.';
      updateDownloadTracker({
        videoId: video.videoId,
        title: video.title || 'Video',
        isShort: Boolean(video.isShort),
        progress: 0,
        status: 'error',
        error: errMsg,
        updatedAt: Date.now()
      });
      throw new Error(errMsg);
    }

    const emitProgress = (percent: number) => {
      const clamped = Math.max(1, Math.min(100, Math.round(percent)));
      if (onProgress) onProgress(clamped);
      updateDownloadTracker({
        videoId: video.videoId,
        title: video.title || 'Video',
        isShort: Boolean(video.isShort),
        progress: clamped,
        status: 'downloading',
        updatedAt: Date.now()
      });
    };

    emitProgress(3);

    try {
      const db = await openDB();

      // 1. Fetch Video Blob with progress
      let videoBlob: Blob;
      let pulseTimer: number | undefined;

      const startPulseProgress = () => {
        if (typeof window === 'undefined' || pulseTimer !== undefined) return;
        let current = 8;
        emitProgress(current);
        pulseTimer = window.setInterval(() => {
          current = Math.min(88, current + Math.max(2, Math.round((90 - current) * 0.12)));
          emitProgress(current);
        }, 350);
      };

      const stopPulseProgress = () => {
        if (pulseTimer !== undefined && typeof window !== 'undefined') {
          window.clearInterval(pulseTimer);
          pulseTimer = undefined;
        }
      };

      try {
        const response = await fetch(video.videoUrl, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`Failed to download stream: HTTP ${response.status}`);
        }

        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

        if (!response.body || totalBytes === 0) {
          startPulseProgress();
          try {
            videoBlob = await response.blob();
          } finally {
            stopPulseProgress();
          }
          emitProgress(95);
        } else {
          const reader = response.body.getReader();
          const chunks: BlobPart[] = [];
          let receivedBytes = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer);
              receivedBytes += value.length;
              const percent = Math.max(5, Math.min(95, Math.round((receivedBytes / totalBytes) * 95)));
              emitProgress(percent);
            }
          }

          videoBlob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });
          emitProgress(96);
        }
      } catch (fetchErr) {
        stopPulseProgress();
        startPulseProgress();
        try {
          const res = await fetch(video.videoUrl);
          if (!res.ok) {
            throw fetchErr instanceof Error ? fetchErr : new Error(`HTTP ${res.status}`);
          }
          videoBlob = await res.blob();
        } finally {
          stopPulseProgress();
        }
        emitProgress(96);
      }

      if (!videoBlob || videoBlob.size === 0) {
        throw new Error('Downloaded file was empty.');
      }

      // 2. Fetch thumbnail blob for 100% offline poster display
      let thumbnailBlob: Blob | undefined;
      if (video.thumbnailUrl && isAllowedMediaUrl(video.thumbnailUrl)) {
        try {
          const thumbRes = await fetch(video.thumbnailUrl, { mode: 'cors' });
          if (thumbRes.ok) {
            thumbnailBlob = await thumbRes.blob();
          }
        } catch {
          // Non-fatal if thumbnail fails
        }
      }

      emitProgress(99);

      const downloadedItem: DownloadedVideo = {
        videoId: video.videoId,
        title: video.title,
        description: video.description || '',
        videoBlob,
        thumbnailBlob,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration || 0,
        creatorId: video.creatorId,
        creatorUsername: video.creatorUsername,
        creatorDisplayName: video.creatorDisplayName,
        creatorPhotoURL: video.creatorPhotoURL,
        isShort: Boolean(video.isShort),
        category: video.category || 'General',
        sizeBytes: videoBlob.size,
        downloadedAt: new Date().toISOString(),
        videoUrl: video.videoUrl
      };

      // 3. Save into IndexedDB
      const saved = await new Promise<DownloadedVideo>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(downloadedItem);

        req.onsuccess = () => resolve(downloadedItem);
        req.onerror = () => reject(req.error);
      });

      if (onProgress) onProgress(100);
      updateDownloadTracker({
        videoId: video.videoId,
        title: video.title || 'Video',
        isShort: Boolean(video.isShort),
        progress: 100,
        status: 'completed',
        updatedAt: Date.now()
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socialindia:downloads_changed'));
      }
      return saved;
    } catch (err: any) {
      updateDownloadTracker({
        videoId: video.videoId,
        title: video.title || 'Video',
        isShort: Boolean(video.isShort),
        progress: 0,
        status: 'error',
        error: err?.message || 'Download failed.',
        updatedAt: Date.now()
      });
      throw err;
    }
  },

  // Delete an offline video
  async deleteDownload(videoId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(videoId);
      req.onsuccess = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socialindia:downloads_changed'));
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },

  // Clear all offline videos
  async clearAllOfflineDownloads(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socialindia:downloads_changed'));
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },

  // Calculate total storage size in bytes
  async getTotalStorageUsage(): Promise<number> {
    const all = await this.getAllDownloads();
    return all.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
  },

  // Export / Save file directly to device storage
  async exportToDevice(video: DownloadedVideo | Video): Promise<void> {
    let blob: Blob;
    if ('videoBlob' in video && video.videoBlob) {
      blob = video.videoBlob;
    } else {
      const url = video.videoUrl;
      if (!url || !isAllowedMediaUrl(url)) throw new Error('Video URL is missing or unsupported.');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      blob = await res.blob();
    }

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const sanitizedTitle = (video.title || 'video').replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${sanitizedTitle}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
};
