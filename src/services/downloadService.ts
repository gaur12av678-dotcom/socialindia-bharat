import { DownloadedVideo, Video } from '../types';

const DB_NAME = 'SocialIndiaOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'downloaded_videos';

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

  // Download video stream with progress tracking & store in IndexedDB
  async downloadVideo(
    video: Video,
    onProgress?: (percent: number) => void
  ): Promise<DownloadedVideo> {
    const db = await openDB();

    // 1. Fetch Video Blob with progress
    let videoBlob: Blob;
    try {
      const response = await fetch(video.videoUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to download stream: HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body || totalBytes === 0) {
        // Simple blob fallback
        videoBlob = await response.blob();
        if (onProgress) onProgress(100);
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
            if (onProgress) {
              const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
              onProgress(percent);
            }
          }
        }

        videoBlob = new Blob(chunks, { type: 'video/mp4' });
        if (onProgress) onProgress(100);
      }
    } catch (fetchErr) {
      console.warn('Direct stream fetch issue, attempting secondary download:', fetchErr);
      const res = await fetch(video.videoUrl);
      videoBlob = await res.blob();
      if (onProgress) onProgress(100);
    }

    // 2. Fetch thumbnail blob for 100% offline poster display
    let thumbnailBlob: Blob | undefined;
    if (video.thumbnailUrl) {
      try {
        const thumbRes = await fetch(video.thumbnailUrl, { mode: 'cors' });
        if (thumbRes.ok) {
          thumbnailBlob = await thumbRes.blob();
        }
      } catch {
        // Non-fatal if thumbnail fails
      }
    }

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
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(downloadedItem);

      req.onsuccess = () => resolve(downloadedItem);
      req.onerror = () => reject(req.error);
    });
  },

  // Delete an offline video
  async deleteDownload(videoId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(videoId);
      req.onsuccess = () => resolve();
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
      if (!url) throw new Error('Video URL is missing.');
      const res = await fetch(url);
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
