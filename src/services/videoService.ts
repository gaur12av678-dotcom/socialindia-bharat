import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  increment 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { Video } from '../types';
import { userService } from './userService';
import { trashService } from './trashService';
import { extractVideoThumbnail, extractYoutubeThumbnail } from '../utils/videoUtils';

// Cloudinary Configuration Helper (supports Firestore global settings, LocalStorage & Env fallback)
let cachedCloudinaryConfig: { cloudName: string; preset: string } | null = null;

export function getCloudinaryConfig() {
  if (cachedCloudinaryConfig && (cachedCloudinaryConfig.cloudName || cachedCloudinaryConfig.preset)) {
    return cachedCloudinaryConfig;
  }
  const cloudName = (typeof window !== 'undefined' && localStorage.getItem('CLOUDINARY_CLOUD_NAME')) 
    || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME 
    || '';
  const preset = (typeof window !== 'undefined' && localStorage.getItem('CLOUDINARY_UPLOAD_PRESET')) 
    || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET 
    || '';
  return { cloudName: cloudName.trim(), preset: preset.trim() };
}

export function setCloudinaryConfig(cloudName: string, preset: string) {
  cachedCloudinaryConfig = { cloudName: cloudName.trim(), preset: preset.trim() };
  if (typeof window !== 'undefined') {
    localStorage.setItem('CLOUDINARY_CLOUD_NAME', cloudName.trim());
    localStorage.setItem('CLOUDINARY_UPLOAD_PRESET', preset.trim());
  }
}

export async function getCloudinaryConfigAsync(): Promise<{ cloudName: string; preset: string }> {
  // If we have cached values, return them
  if (cachedCloudinaryConfig && cachedCloudinaryConfig.cloudName && cachedCloudinaryConfig.preset) {
    return cachedCloudinaryConfig;
  }

  // Check localStorage first
  const localConfig = getCloudinaryConfig();
  if (localConfig.cloudName && localConfig.preset) {
    cachedCloudinaryConfig = localConfig;
  }

  // Fetch admin-configured global settings from Firestore
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'cloudinary'));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.cloudName && data?.uploadPreset) {
        const globalCfg = { cloudName: data.cloudName.trim(), preset: data.uploadPreset.trim() };
        setCloudinaryConfig(globalCfg.cloudName, globalCfg.preset);
        cachedCloudinaryConfig = globalCfg;
        return globalCfg;
      }
    }
  } catch (err) {
    console.warn('Could not read global storage settings from Firestore, using local fallback:', err);
  }

  return cachedCloudinaryConfig || localConfig;
}

// In-memory session viewed set as a secondary guard layer if localStorage is blocked
const sessionViewedSet = new Set<string>();

// High-performance in-memory cache for ultra-fast page transitions & instant queries
const memoryVideoCache = new Map<string, { data: Video[]; timestamp: number }>();
const memoryVideoDetailCache = new Map<string, { data: Video; timestamp: number }>();
const memorySearchCache = new Map<string, { data: Video[]; timestamp: number }>();
const inFlightVideoQueryPromises = new Map<string, Promise<Video[]>>();
const CACHE_TTL_MS = 60000; // 60 seconds memory cache

function getPersistedVideos(): Video[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem('si_cached_public_videos') || localStorage.getItem('si_cached_public_videos');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((v: any) => v && typeof v.videoId === 'string' && !v.videoId.startsWith('sample-'));
      }
    }
  } catch (_) {}
  return [];
}

function savePersistedVideos(videos: Video[]) {
  if (typeof window === 'undefined' || !videos || videos.length === 0) return;
  try {
    const slice = videos.slice(0, 60);
    const serialized = JSON.stringify(slice);
    sessionStorage.setItem('si_cached_public_videos', serialized);
    localStorage.setItem('si_cached_public_videos', serialized);
  } catch (_) {}
}

function getPersistedShorts(): Video[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem('si_cached_public_shorts') || localStorage.getItem('si_cached_public_shorts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((v: any) => v && typeof v.videoId === 'string' && !v.videoId.startsWith('sample-'));
      }
    }
  } catch (_) {}
  return [];
}

function savePersistedShorts(shorts: Video[]) {
  if (typeof window === 'undefined' || !shorts || shorts.length === 0) return;
  try {
    const slice = shorts.slice(0, 60);
    const serialized = JSON.stringify(slice);
    sessionStorage.setItem('si_cached_public_shorts', serialized);
    localStorage.setItem('si_cached_public_shorts', serialized);
  } catch (_) {}
}

export const clearVideoCache = () => {
  memoryVideoCache.clear();
  memoryVideoDetailCache.clear();
  memorySearchCache.clear();
  inFlightVideoQueryPromises.clear();
};

export const videoService = {
  // Generate safe random video ID
  generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  // Upload Video File to Cloudinary with maximum speed chunked streaming
  async uploadVideo(
    file: File, 
    onProgress?: (progress: number, stage?: string) => void
  ): Promise<{ videoUrl: string; duration?: number }> {
    try {
      const { cloudName, preset } = await getCloudinaryConfigAsync();
      
      if (cloudName && preset) {
        // Cloudinary Free Account strictly limits video files to 100MB (104,857,600 bytes)
        if (file.size > 104857600) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
          throw new Error(`File size too large (${sizeMB}MB). Cloudinary Free accounts strictly limit video files to 100MB (104,857,600 bytes). For larger videos, please use the "Paste Video Link" tab (supports Google Drive & YouTube with unlimited size).`);
        }

        console.log(`Starting high-speed video upload to Cloudinary (${cloudName}): ${file.name} (${file.size} bytes)`);

        // 25MB chunks for high-speed streaming with minimal HTTP roundtrips
        const CHUNK_SIZE = 25 * 1024 * 1024;

        if (file.size <= CHUNK_SIZE) {
          return await this.uploadSingleVideo(file, cloudName, preset, onProgress);
        }

        return await this.uploadChunkedVideo(file, cloudName, preset, CHUNK_SIZE, onProgress);
      }
    } catch (cldErr: any) {
      console.warn('Cloudinary upload unavailable or failed, falling back to Firebase Storage:', cldErr);
      if (cldErr.message?.includes('File size too large')) {
        throw cldErr;
      }
    }

    // Direct Firebase Storage Fallback
    try {
      if (onProgress) onProgress(10, 'Uploading video to secure storage...');
      const url = await this.uploadToFirebase(file, 'videos', (pct) => {
        if (onProgress) onProgress(pct, `Uploading video... ${pct}%`);
      });
      return { videoUrl: url };
    } catch (fbErr: any) {
      console.error('Firebase storage upload failed:', fbErr);
      throw new Error(fbErr.message || 'Failed to upload video to media storage.');
    }
  },

  // Direct single-request upload for small video clips
  uploadSingleVideo(
    file: File,
    cloudName: string,
    preset: string,
    onProgress?: (progress: number, stage?: string) => void
  ): Promise<{ videoUrl: string; duration?: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    formData.append('folder', 'socialindia_videos');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          const stage = percent >= 100 ? 'Encoding video stream on Cloud CDN...' : `Uploading video... ${percent}%`;
          onProgress(percent, stage);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('Cloudinary Video Upload Success:', response.secure_url);
            onProgress?.(100, 'Video ready!');
            resolve({
              videoUrl: response.secure_url,
              duration: response.duration ? Math.round(response.duration) : undefined
            });
          } catch (jsonErr) {
            reject(jsonErr);
          }
        } else {
          let errMsg = `Upload error (${xhr.status})`;
          try {
            const err = JSON.parse(xhr.responseText);
            if (err.error?.message) errMsg = err.error.message;
          } catch (_) {}
          reject(new Error(errMsg));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error connecting to media storage server. Please try again.'));
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
      xhr.send(formData);
    });
  },

  // Chunked Upload for large / long videos (adha-adha karke)
  async uploadChunkedVideo(
    file: File,
    cloudName: string,
    preset: string,
    chunkSize: number,
    onProgress?: (progress: number, stage?: string) => void
  ): Promise<{ videoUrl: string; duration?: number }> {
    const uniqueUploadId = `${Date.now()}${Math.random().toString(36).replace(/[^a-z0-9]/gi, '')}`;
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / chunkSize);

    let start = 0;
    let chunkIndex = 0;
    let finalResult: { videoUrl: string; duration?: number } | null = null;

    while (start < totalSize) {
      const end = Math.min(start + chunkSize, totalSize);
      const isLastChunk = end >= totalSize;
      const chunkBlob = file.slice(start, end);

      const chunkRes = await this.uploadSingleChunk(
        chunkBlob,
        file.name,
        cloudName,
        preset,
        uniqueUploadId,
        start,
        end,
        totalSize,
        chunkIndex,
        totalChunks,
        isLastChunk,
        onProgress
      );

      if (isLastChunk) {
        finalResult = chunkRes;
      }

      start = end;
      chunkIndex++;
    }

    if (!finalResult || !finalResult.videoUrl) {
      throw new Error('Video chunk upload completed but video URL was not received.');
    }

    onProgress?.(100, 'Video ready!');
    return finalResult;
  },

  // Upload an individual chunk with Range header
  uploadSingleChunk(
    chunkBlob: Blob,
    fileName: string,
    cloudName: string,
    preset: string,
    uniqueUploadId: string,
    start: number,
    end: number,
    totalSize: number,
    chunkIndex: number,
    totalChunks: number,
    isLastChunk: boolean,
    onProgress?: (progress: number, stage?: string) => void
  ): Promise<{ videoUrl: string; duration?: number }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', chunkBlob, fileName);
      formData.append('upload_preset', preset);
      formData.append('folder', 'socialindia_videos');

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const currentLoaded = start + e.loaded;
          const percent = Math.min(99, Math.round((currentLoaded / totalSize) * 100));
          const stage = `Uploading part ${chunkIndex + 1}/${totalChunks} (${percent}%)...`;
          onProgress(percent, stage);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText || '{}');
            if (isLastChunk) {
              if (onProgress) onProgress(100, 'Processing video stream on Cloud CDN...');
              resolve({
                videoUrl: res.secure_url,
                duration: res.duration ? Math.round(res.duration) : undefined
              });
            } else {
              resolve({ videoUrl: '' });
            }
          } catch (jsonErr) {
            if (isLastChunk) reject(jsonErr);
            else resolve({ videoUrl: '' });
          }
        } else {
          let errMsg = `Chunk ${chunkIndex + 1}/${totalChunks} upload failed (HTTP ${xhr.status})`;
          try {
            const err = JSON.parse(xhr.responseText);
            if (err.error?.message) {
              if (err.error.message.includes('File size too large') || err.error.message.includes('104857600') || err.error.message.includes('account limit')) {
                errMsg = 'Video file size exceeds direct upload limit (100MB). For larger videos, please use the "Paste Video Link" tab (supports Google Drive & YouTube with unlimited size).';
              } else {
                errMsg = err.error.message;
              }
            }
          } catch (_) {}
          reject(new Error(errMsg));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error(`Network error uploading video chunk ${chunkIndex + 1}/${totalChunks}. Please check your connection.`));
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
      xhr.setRequestHeader('X-Unique-Upload-Id', uniqueUploadId);
      xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${totalSize}`);
      xhr.send(formData);
    });
  },

  // Upload Thumbnail Image File or Blob with automatic fallback
  async uploadThumbnail(
    fileOrBlob: File | Blob, 
    onProgress?: (progress: number, stage?: string) => void
  ): Promise<string> {
    const { cloudName, preset } = await getCloudinaryConfigAsync();
    
    if (cloudName && preset) {
      try {
        const filename = (fileOrBlob as File).name || `thumbnail_${Date.now()}.jpg`;
        console.log(`Starting thumbnail image upload to Cloudinary (${cloudName}): ${filename}`);
        
        const formData = new FormData();
        formData.append('file', fileOrBlob, filename);
        formData.append('upload_preset', preset);
        formData.append('folder', 'socialindia_thumbnails');

        return await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
              const percent = Math.round((e.loaded / e.total) * 100);
              onProgress(percent, `Uploading thumbnail... ${percent}%`);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                console.log('Cloudinary Thumbnail Upload Success:', response.secure_url);
                resolve(response.secure_url);
              } catch (jsonErr) {
                reject(jsonErr);
              }
            } else {
              let errMsg = `Cloudinary HTTP Error ${xhr.status}`;
              try {
                const err = JSON.parse(xhr.responseText);
                if (err.error?.message) errMsg = err.error.message;
              } catch (_) {}
              reject(new Error(errMsg));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during thumbnail upload.'));
          });

          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
          xhr.send(formData);
        });
      } catch (cldErr) {
        console.warn('Cloudinary thumbnail error or limit, falling back to Firebase Storage:', cldErr);
      }
    }

    // Fallback to Firebase Storage
    try {
      const filename = `thumb_${Date.now()}.jpg`;
      const fileRef = ref(storage, `thumbnails/${filename}`);
      const uploadTask = await uploadBytesResumable(fileRef, fileOrBlob, { contentType: 'image/jpeg' });
      return await getDownloadURL(uploadTask.ref);
    } catch (fbErr) {
      // Base64 DataURL fallback
      if (fileOrBlob instanceof Blob && fileOrBlob.size < 5 * 1024 * 1024) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(fileOrBlob);
        });
      }
      throw fbErr;
    }
  },

  // Backward compatibility alias for uploadFile
  async uploadFile(
    file: File, 
    _path?: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (file.type.startsWith('image/')) {
      return this.uploadThumbnail(file, onProgress);
    }
    const result = await this.uploadVideo(file, onProgress);
    return result.videoUrl;
  },

  // Fallback Firebase Storage Upload (Supporting File or Blob)
  async uploadToFirebase(
    fileOrBlob: File | Blob, 
    path: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const filename = (fileOrBlob as File).name || `${Date.now()}_media.bin`;
    const contentType = fileOrBlob.type || 'application/octet-stream';
    const fileRef = ref(storage, `${path}/${Date.now()}_${filename}`);
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, fileOrBlob, { contentType });
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('Firebase Storage upload error:', error);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  },

  // Publish a video (automatically extracts real video scene thumbnail if not provided)
  async publishVideo(videoData: Partial<Video>): Promise<Video> {
    const videoId = this.generateId();
    const now = new Date().toISOString();
    
    // Extract real scene thumbnail from the video URL itself (Cloudinary/YouTube)
    const autoSceneThumbnail = extractVideoThumbnail(videoData.videoUrl || '');
    const finalThumbnail = (videoData.thumbnailUrl && videoData.thumbnailUrl.trim().length > 0)
      ? videoData.thumbnailUrl.trim()
      : (autoSceneThumbnail || videoData.videoUrl || '');

    // Original Sound auto-generation for Shorts
    let soundId = videoData.soundId || '';
    let soundTitle = videoData.soundTitle || '';
    let soundArtist = videoData.soundArtist || '';
    let soundCoverUrl = videoData.soundCoverUrl || '';
    let soundAudioUrl = videoData.soundAudioUrl || '';

    if (videoData.isShort && !soundId) {
      soundId = `orig_sound_${videoId}`;
      soundTitle = `Original Sound - ${videoData.creatorDisplayName || 'Creator'}`;
      soundArtist = videoData.creatorDisplayName || 'Original Audio';
      soundCoverUrl = videoData.creatorPhotoURL || finalThumbnail;
      soundAudioUrl = videoData.videoUrl || '';

      // Register in sound library
      try {
        const { soundService } = await import('./soundService');
        await soundService.createOriginalSound({
          soundId,
          title: soundTitle,
          artist: soundArtist,
          coverUrl: soundCoverUrl,
          audioUrl: soundAudioUrl,
          category: 'Original Sound',
          duration: videoData.duration || 30,
          creatorUid: videoData.creatorId
        });
      } catch (err) {
        console.warn('Could not save original sound:', err);
      }
    }

    const fullVideo: Video = {
      videoId,
      title: videoData.title || 'Untitled Video',
      description: videoData.description || '',
      videoUrl: videoData.videoUrl || '',
      thumbnailUrl: finalThumbnail,
      duration: videoData.duration || 0,
      creatorId: videoData.creatorId || '',
      creatorUsername: videoData.creatorUsername || '',
      creatorDisplayName: videoData.creatorDisplayName || '',
      creatorPhotoURL: videoData.creatorPhotoURL || '',
      category: videoData.category || 'Other',
      tags: videoData.tags || [],
      visibility: videoData.visibility || 'public',
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isShort: videoData.isShort || false,
      status: 'published',
      isLive: videoData.isLive || false,
      liveViewers: videoData.liveViewers || (videoData.isLive ? 1 : 0),
      soundId,
      soundTitle,
      soundArtist,
      soundCoverUrl,
      soundAudioUrl,
      isMonetized: videoData.isMonetized !== undefined ? videoData.isMonetized : true,
      estimatedEarnings: 0,
      isPaid: videoData.isPaid || false,
      price: videoData.price || 0,
      paidSalesCount: 0,
      paidEarnings: 0,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'videos', videoId), fullVideo);
      await userService.incrementVideoCount(fullVideo.creatorId, 1);
      clearVideoCache();
      return fullVideo;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `videos/${videoId}`);
      throw err;
    }
  },

  // Edit a video
  async editVideo(videoId: string, updates: Partial<Video>): Promise<void> {
    const docRef = doc(db, 'videos', videoId);
    try {
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      clearVideoCache();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `videos/${videoId}`);
    }
  },

  // Delete a video (Safely archives to 180-Day Compliance Trash Vault before removal)
  async deleteVideo(videoId: string, creatorId: string): Promise<void> {
    try {
      // First capture snapshot for 180-Day Legal Compliance Vault
      const videoSnap = await getDoc(doc(db, 'videos', videoId));
      if (videoSnap.exists()) {
        const videoData = videoSnap.data() as Video;
        await trashService.moveToTrash({
          itemId: videoId,
          itemType: videoData.isShort ? 'short' : 'video',
          title: videoData.title,
          subtitle: `@${videoData.creatorUsername} • ${videoData.category}`,
          thumbnailUrl: videoData.thumbnailUrl,
          deletedBy: creatorId,
          deletedByName: videoData.creatorDisplayName || videoData.creatorUsername,
          details: `Deleted by creator @${videoData.creatorUsername}. Preserved for 180-day compliance.`,
          dataSnapshot: videoData
        });
      }

      await deleteDoc(doc(db, 'videos', videoId));
      await userService.incrementVideoCount(creatorId, -1);
      clearVideoCache();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `videos/${videoId}`);
    }
  },

  // Cache a video object in memory and sessionStorage for 0ms transitions
  cacheVideo(video: Video) {
    if (!video || !video.videoId) return;
    memoryVideoDetailCache.set(video.videoId, { data: video, timestamp: Date.now() });
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(`si_v_${video.videoId}`, JSON.stringify(video));
      }
    } catch (_) {}

    // Also populate creator info cache for instant avatar & handle rendering!
    if (video.creatorId) {
      const existing = userService.getCachedUserProfile(video.creatorId);
      userService.cacheUserProfile({
        uid: video.creatorId,
        username: video.creatorUsername || existing?.username || '',
        displayName: video.creatorDisplayName || existing?.displayName || '',
        photoURL: video.creatorPhotoURL || existing?.photoURL || '',
        role: existing?.role || 'user',
        isVerified: existing?.isVerified || false,
        isPro: existing?.isPro || false,
        status: existing?.status || 'active',
        createdAt: existing?.createdAt || video.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  },

  // Synchronously retrieve cached video in 0ms (no spinner/skeleton delay!)
  getCachedVideo(videoId: string): Video | null {
    if (!videoId) return null;
    const mem = memoryVideoDetailCache.get(videoId);
    if (mem) return mem.data;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = sessionStorage.getItem(`si_v_${videoId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as Video;
          memoryVideoDetailCache.set(videoId, { data: parsed, timestamp: Date.now() });
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  },

  // Get a specific video with instant memory cache & background revalidation
  async getVideo(videoId: string): Promise<Video | null> {
    if (videoId === 'live_XGym1ByjKHw' || videoId === 'XGym1ByjKHw') {
      const { liveBroadcastService } = await import('./liveBroadcastService');
      const liveVideo = liveBroadcastService.getVideo();
      const cached = this.getCachedVideo(liveVideo.videoId) || liveVideo;
      return cached;
    }

    const cached = this.getCachedVideo(videoId);
    const cachedEntry = memoryVideoDetailCache.get(videoId);

    // If fresh within TTL, return immediately without network call
    if (cached && cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      return cached;
    }

    const docRef = doc(db, 'videos', videoId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const vData = snap.data() as Video;
        this.cacheVideo(vData);
        return vData;
      }
      return cached || null;
    } catch (err) {
      if (cached) return cached;
      handleFirestoreError(err, OperationType.GET, `videos/${videoId}`);
      return null;
    }
  },

  // Increment view count safely with 24-hour Anti-Spam View Guard
  async incrementViewCount(videoId: string): Promise<void> {
    const VIEWED_KEY = 'socialindia_viewed_videos';
    let isAlreadyViewed = false;

    // First layer: memory guard check
    if (sessionViewedSet.has(videoId)) {
      isAlreadyViewed = true;
    }

    try {
      const saved = localStorage.getItem(VIEWED_KEY);
      const viewedMap: Record<string, number> = saved ? JSON.parse(saved) : {};
      const now = Date.now();

      // Clean up old records (> 24 hours) to keep storage light
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const cleanedMap: Record<string, number> = {};
      for (const [id, timestamp] of Object.entries(viewedMap)) {
        if (now - timestamp < ONE_DAY_MS) {
          cleanedMap[id] = timestamp;
        }
      }

      if (cleanedMap[videoId] || isAlreadyViewed) {
        // Already viewed in the last 24 hours - skip incrementing to prevent fake view spam!
        if (import.meta.env.DEV) {
          console.log(`[Anti-Spam View Guard] Suppressed repeat view for video: ${videoId}`);
        }
        sessionViewedSet.add(videoId);
        return;
      }

      // Record view with timestamp
      cleanedMap[videoId] = now;
      localStorage.setItem(VIEWED_KEY, JSON.stringify(cleanedMap));
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('Anti-spam local storage error:', e);
      }
      if (isAlreadyViewed) {
        return;
      }
    }

    // Always register in session memory
    sessionViewedSet.add(videoId);

    const docRef = doc(db, 'videos', videoId);
    try {
      await updateDoc(docRef, {
        viewsCount: increment(1)
      });
    } catch (err: any) {
      // Don't interrupt video viewing for background analytics if document is missing or offline
      if (err?.code === 'permission-denied') {
        console.warn(`[Views Counter] Permission denied incrementing view count for video: ${videoId}`);
      } else if (err?.code === 'not-found') {
        console.warn(`[Views Counter] Video document not found in database: ${videoId}`);
      } else {
        console.warn(`[Views Counter] Could not sync view count:`, err);
      }
    }
  },

  // Synchronous 0ms retrieval of cached videos for instant page boot
  getCachedVideos(filters?: { category?: string; creatorId?: string; isShort?: boolean }): Video[] {
    const cacheKey = `${filters?.category || 'All'}_${filters?.creatorId || 'all'}_${filters?.isShort !== undefined ? filters.isShort : 'all'}`;
    const mem = memoryVideoCache.get(cacheKey);
    if (mem && mem.data.length > 0) return mem.data;

    let all: Video[] = [];
    if (filters?.isShort === true) {
      all = getPersistedShorts();
      if (!all || all.length === 0) {
        // Fallback: search regular persisted video cache for shorts
        all = getPersistedVideos().filter(v => Boolean(v.isShort));
      }
    } else if (filters?.isShort === false) {
      all = getPersistedVideos().filter(v => !v.isShort);
    } else {
      all = getPersistedVideos();
    }

    if (!all || all.length === 0) return [];

    let filtered = all;
    if (filters?.category && filters.category !== 'All') {
      filtered = filtered.filter(v => v.category === filters.category);
    }
    if (filters?.creatorId) {
      filtered = filtered.filter(v => v.creatorId === filters.creatorId);
    }
    if (filters?.isShort !== undefined) {
      filtered = filtered.filter(v => Boolean(v.isShort) === filters.isShort);
    }
    return filtered;
  },

  // Get public videos with instant memory cache, persistent disk storage & query deduplication
  async getVideos(filters?: { category?: string; creatorId?: string; isShort?: boolean; limit?: number }): Promise<Video[]> {
    const cacheKey = `${filters?.category || 'All'}_${filters?.creatorId || 'all'}_${filters?.isShort !== undefined ? filters.isShort : 'all'}`;
    const cached = memoryVideoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // Deduplicate in-flight queries
    if (inFlightVideoQueryPromises.has(cacheKey)) {
      return inFlightVideoQueryPromises.get(cacheKey)!;
    }

    const queryPromise = (async () => {
      let q = query(collection(db, 'videos'), where('visibility', '==', 'public'));

      if (filters?.category && filters.category !== 'All') {
        q = query(q, where('category', '==', filters.category));
      }
      if (filters?.creatorId) {
        q = query(q, where('creatorId', '==', filters.creatorId));
      }
      if (filters?.isShort !== undefined) {
        q = query(q, where('isShort', '==', filters.isShort));
      }

      // Add sensible limit: 30 for shorts to provide smooth lightweight loading without thread lag
      const queryLimit = filters?.limit || (filters?.isShort ? 30 : 60);
      q = query(q, limit(queryLimit));

      try {
        const snap = await getDocs(q);
        let videos = snap.docs.map((d: any) => d.data() as Video);
        
        // Ensure Live India broadcast is active in public and news feeds
        const shouldIncludeLive = filters?.isShort !== true && 
          (!filters?.creatorId || filters.creatorId === 'user_liveindia_official') &&
          (!filters?.category || filters.category === 'All' || filters.category === 'News');

        if (shouldIncludeLive) {
          const { liveBroadcastService } = await import('./liveBroadcastService');
          const liveVideo = liveBroadcastService.getVideo();
          if (!videos.some(v => v.videoId === liveVideo.videoId)) {
            videos = [liveVideo, ...videos];
          }
        }

        // Sort: Live streams first, then newest first
        const sorted = videos.sort((a: Video, b: Video) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // Store in memory cache
        memoryVideoCache.set(cacheKey, { data: sorted, timestamp: Date.now() });

        // Save general public feed to persistent storage for instant future loads
        if (!filters?.creatorId && (!filters?.category || filters.category === 'All')) {
          if (filters?.isShort === true) {
            savePersistedShorts(sorted);
          } else if (filters?.isShort === false) {
            savePersistedVideos(sorted);
          } else {
            savePersistedVideos(sorted.filter(v => !v.isShort));
            const onlyShorts = sorted.filter(v => Boolean(v.isShort));
            if (onlyShorts.length > 0) {
              savePersistedShorts(onlyShorts);
            }
          }
        }

        // Pre-populate individual video caches and creator user profiles
        sorted.forEach(v => {
          if (v.videoId) {
            this.cacheVideo(v);
          }
        });

        return sorted;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'videos');
        return this.getCachedVideos(filters);
      } finally {
        inFlightVideoQueryPromises.delete(cacheKey);
      }
    })();

    inFlightVideoQueryPromises.set(cacheKey, queryPromise);
    return queryPromise;
  },

  // Search videos across titles, description, creators, tags, category with instant query cache
  async searchVideos(term: string): Promise<Video[]> {
    if (!term.trim()) return this.getVideos();
    const cleanTerm = term.trim().toLowerCase();
    const cleanTagTerm = cleanTerm.replace('#', '');

    const cachedSearch = memorySearchCache.get(cleanTerm);
    if (cachedSearch && Date.now() - cachedSearch.timestamp < CACHE_TTL_MS) {
      return cachedSearch.data;
    }

    try {
      // Get all public videos (from memory cache if available!)
      const videos = await this.getVideos();
      
      // Perform strict multi-field search in-memory to deliver accurate user queries
      const results = videos.filter(v => {
        const titleMatch = v.title.toLowerCase().includes(cleanTerm);
        const descMatch = v.description.toLowerCase().includes(cleanTerm);
        const creatorMatch = v.creatorUsername.toLowerCase().includes(cleanTerm) || v.creatorDisplayName.toLowerCase().includes(cleanTerm);
        const categoryMatch = v.category.toLowerCase().includes(cleanTerm);
        const tagMatch = v.tags.some(tag => tag.toLowerCase().includes(cleanTerm) || tag.toLowerCase().includes(cleanTagTerm));
        return titleMatch || descMatch || creatorMatch || categoryMatch || tagMatch;
      });

      memorySearchCache.set(cleanTerm, { data: results, timestamp: Date.now() });
           // Rank results: best match first, then engagement
      const scoreMatch = (v: Video): number => {
        const title = v.title.toLowerCase();
        let s = 0;
        if (title === cleanTerm) s += 120;
        else if (title.startsWith(cleanTerm)) s += 80;
        else if (title.includes(cleanTerm)) s += 60;
        if (v.tags.some(t => t.toLowerCase() === cleanTagTerm)) s += 45;
        else if (v.tags.some(t => t.toLowerCase().includes(cleanTagTerm))) s += 35;
        if (v.creatorUsername.toLowerCase().includes(cleanTerm) || v.creatorDisplayName.toLowerCase().includes(cleanTerm)) s += 30;
        if (v.category.toLowerCase().includes(cleanTerm)) s += 20;
        if (v.description.toLowerCase().includes(cleanTerm)) s += 10;
        s += Math.min((v.likesCount || 0) * 2 + (v.viewsCount || 0) * 0.05, 40); // capped popularity
        return s;
      };
      const ranked = results.sort((a, b) => scoreMatch(b) - scoreMatch(a));

      memorySearchCache.set(cleanTerm, { data: ranked, timestamp: Date.now() });
      return ranked;
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  },

  // Retrieve creator's dashboard content including private/unlisted videos (supports creatorId & creatorUsername)
  async getCreatorVideos(creatorId: string, creatorUsername?: string): Promise<Video[]> {
    if (!creatorId && !creatorUsername) return [];
    const map = new Map<string, Video>();

    try {
      // 1. Query by creatorId
      if (creatorId) {
        const q1 = query(
          collection(db, 'videos'),
          where('creatorId', '==', creatorId)
        );
        const snap1 = await getDocs(q1);
        snap1.docs.forEach((d: any) => {
          const v = d.data() as Video;
          if (v && v.videoId) map.set(v.videoId, v);
        });
      }

      // 2. Also query by creatorUsername to ensure all videos assigned to this handle are retrieved
      if (creatorUsername && creatorUsername.trim()) {
        const cleanUser = creatorUsername.trim().toLowerCase().replace(/^@/, '');
        const q2 = query(
          collection(db, 'videos'),
          where('creatorUsername', '==', cleanUser)
        );
        const snap2 = await getDocs(q2);
        snap2.docs.forEach((d: any) => {
          const v = d.data() as Video;
          if (v && v.videoId) map.set(v.videoId, v);
        });
      }

      // 3. Fallback: Check memory cache for freshly published videos that might not be indexed in Firestore yet
      memoryVideoDetailCache.forEach(entry => {
        const v = entry.data;
        if (v && v.videoId && !map.has(v.videoId)) {
          const idMatch = creatorId && v.creatorId === creatorId;
          const userMatch = creatorUsername && v.creatorUsername && v.creatorUsername.toLowerCase() === creatorUsername.toLowerCase();
          if (idMatch || userMatch) {
            map.set(v.videoId, v);
          }
        }
      });

      // Include Live India broadcast if queried for liveindia channel
      if ((creatorUsername && creatorUsername.toLowerCase() === 'liveindia') || creatorId === 'user_liveindia_official') {
        const { liveBroadcastService } = await import('./liveBroadcastService');
        const liveVideo = liveBroadcastService.getVideo();
        map.set(liveVideo.videoId, liveVideo);
      }

      const parseTime = (dateVal: any): number => {
        if (!dateVal) return 0;
        if (typeof dateVal === 'number') return dateVal;
        if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
        if (dateVal.seconds) return dateVal.seconds * 1000;
        const t = new Date(dateVal).getTime();
        return isNaN(t) ? 0 : t;
      };

      const videos = Array.from(map.values());
      return videos.sort((a: Video, b: Video) => parseTime(b.createdAt) - parseTime(a.createdAt));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'videos');
      return [];
    }
  },

  // Synchronize creator metadata (avatar, name) across all their videos
  async syncCreatorProfileToVideos(creatorId: string, updates: { photoURL?: string; displayName?: string; username?: string }): Promise<void> {
    const q = query(collection(db, 'videos'), where('creatorId', '==', creatorId));
    try {
      const snap = await getDocs(q);
      const batchPromises = snap.docs.map(vDoc => {
        const videoRef = doc(db, 'videos', vDoc.id);
        const videoUpdates: any = {};
        if (updates.photoURL !== undefined) videoUpdates.creatorPhotoURL = updates.photoURL;
        if (updates.displayName !== undefined) videoUpdates.creatorDisplayName = updates.displayName;
        if (updates.username !== undefined) videoUpdates.creatorUsername = updates.username;
        return updateDoc(videoRef, videoUpdates);
      });
      await Promise.all(batchPromises);
    } catch (err) {
      console.error('Metadata sync failed:', err);
    }
  },

  // Invalidate all video caches (in-memory, sessionStorage, localStorage)
  clearAllCaches(): void {
    memoryVideoCache.clear();
    memoryVideoDetailCache.clear();
    memorySearchCache.clear();
    inFlightVideoQueryPromises.clear();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('si_cached_public_videos');
        localStorage.removeItem('si_cached_public_videos');
        sessionStorage.removeItem('si_cached_public_shorts');
        localStorage.removeItem('si_cached_public_shorts');
      } catch (_) {}
    }
  },

  // Admin Direct Update to Firestore video document
  async adminUpdateVideo(videoId: string, updates: Partial<Video>): Promise<void> {
    const videoRef = doc(db, 'videos', videoId);
    const cleanUpdates: any = {
      updatedAt: new Date().toISOString()
    };
    if (updates.viewsCount !== undefined) cleanUpdates.viewsCount = Number(updates.viewsCount);
    if (updates.likesCount !== undefined) cleanUpdates.likesCount = Number(updates.likesCount);
    if (updates.commentsCount !== undefined) cleanUpdates.commentsCount = Number(updates.commentsCount);
    if (updates.sharesCount !== undefined) cleanUpdates.sharesCount = Number(updates.sharesCount);
    if (updates.title !== undefined) cleanUpdates.title = updates.title.trim();
    if (updates.thumbnailUrl !== undefined) cleanUpdates.thumbnailUrl = updates.thumbnailUrl.trim();
    if (updates.category !== undefined) cleanUpdates.category = updates.category;
    if (updates.visibility !== undefined) cleanUpdates.visibility = updates.visibility;
    if (updates.status !== undefined) cleanUpdates.status = updates.status;
    if (updates.isShort !== undefined) cleanUpdates.isShort = Boolean(updates.isShort);
    if (updates.description !== undefined) cleanUpdates.description = updates.description;

    await updateDoc(videoRef, cleanUpdates);
    this.clearAllCaches();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socialindia:videos_updated', { detail: { videoId, cleanUpdates } }));
    }
  }
};

// Listen for global video updates event
if (typeof window !== 'undefined') {
  window.addEventListener('socialindia:videos_updated', () => {
    videoService.clearAllCaches();
  });
}

