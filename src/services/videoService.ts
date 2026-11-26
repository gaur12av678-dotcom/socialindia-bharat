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
  startAfter,
  increment,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from '../firebase';
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

function canViewVideo(video: Video): boolean {
  return video.visibility !== 'private' || auth.currentUser?.uid === video.creatorId;
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

function rankVideoSearchResults(term: string, videos: Video[]): Video[] {
  const cleanTerm = term.trim().toLowerCase();
  const tokens = cleanTerm.split(/\s+/).map(token => token.replace(/^[@#]/, '')).filter(Boolean);
  if (!cleanTerm || tokens.length === 0) return [];

  const candidates = videos.flatMap(video => {
    const title = (video.title || '').toLowerCase();
    const description = (video.description || '').toLowerCase();
    const username = (video.creatorUsername || '').toLowerCase().replace(/^@/, '');
    const displayName = (video.creatorDisplayName || '').toLowerCase();
    const category = (video.category || '').toLowerCase();
    const tags = Array.isArray(video.tags) ? video.tags.map(tag => String(tag).toLowerCase().replace(/^#/, '')) : [];
    const searchableText = [title, description, username, displayName, category, ...tags].join(' ');
    const matchedTokens = tokens.filter(token => searchableText.includes(token));

    if (!searchableText.includes(cleanTerm) && matchedTokens.length !== tokens.length) return [];

    let score = 0;
    if (title === cleanTerm) score += 180;
    else if (title.startsWith(cleanTerm)) score += 130;
    else if (title.includes(cleanTerm)) score += 100;
    const titleTokenMatches = tokens.filter(token => title.includes(token)).length;
    score += titleTokenMatches * 18;

    if (tags.includes(cleanTerm.replace(/^#/, ''))) score += 95;
    else if (tags.some(tag => tag.includes(cleanTerm.replace(/^#/, '')))) score += 55;
    if (username === cleanTerm.replace(/^@/, '')) score += 100;
    else if (username.startsWith(cleanTerm.replace(/^@/, ''))) score += 65;
    else if (username.includes(cleanTerm.replace(/^@/, '')) || displayName.includes(cleanTerm)) score += 40;
    if (category === cleanTerm) score += 50;
    else if (category.includes(cleanTerm)) score += 28;
    if (description.includes(cleanTerm)) score += 30;
    score += matchedTokens.length * 5;

    const views = Math.max(0, Number(video.viewsCount) || 0);
    const likes = Math.max(0, Number(video.likesCount) || 0);
    const comments = Math.max(0, Number(video.commentsCount) || 0);
    const engagementRate = Math.min(12, ((likes + comments * 2 + 1) / (views + 100)) * 400);
    score += engagementRate + Math.min(14, Math.log10(views + 1) * 2);

    const uploadTime = new Date(video.createdAt || 0).getTime();
    if (Number.isFinite(uploadTime)) {
      const ageDays = Math.max(0, (Date.now() - uploadTime) / 86_400_000);
      score += Math.max(0, 12 - ageDays / 7);
    }

    return [{ video, score }];
  });

  const creatorCounts = new Map<string, number>();
  candidates.forEach(({ video }) => {
    const creator = video.creatorId || video.creatorUsername;
    if (creator) creatorCounts.set(creator, (creatorCounts.get(creator) || 0) + 1);
  });

  return candidates
    .map(candidate => {
      const creator = candidate.video.creatorId || candidate.video.creatorUsername;
      const repetitionPenalty = creator ? Math.log2(creatorCounts.get(creator) || 1) * 4 : 0;
      return { ...candidate, score: candidate.score - repetitionPenalty };
    })
    .sort((a, b) => b.score - a.score)
    .map(candidate => candidate.video);
}

function getPersistedVideos(): Video[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem('si_cached_public_videos') || localStorage.getItem('si_cached_public_videos');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((v: any) => 
          v && 
          typeof v.videoId === 'string' && 
          !v.videoId.startsWith('sample-') &&
          v.videoId !== 'live_XGym1ByjKHw' &&
          v.videoId !== 'XGym1ByjKHw'
        );
      }
    }
  } catch (_) {}
  return [];
}

function sanitizeVideoDuration(val: unknown): number {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 && num < 864000 ? Math.round(num) : 0;
}

function cleanVideoForPersistence(v: Video): Video {
  return {
    videoId: v.videoId,
    title: v.title || '',
    description: (v.description || '').slice(0, 120),
    videoUrl: v.videoUrl || '',
    ...(Array.isArray(v.videoParts) && v.videoParts.length > 1 ? { videoParts: v.videoParts } : {}),
    ...(Array.isArray(v.videoPartDurations) && v.videoPartDurations.length > 1 ? { videoPartDurations: v.videoPartDurations } : {}),
    thumbnailUrl: v.thumbnailUrl || '',
    duration: sanitizeVideoDuration(v.duration),
    ...(typeof v.fileSizeBytes === 'number' && Number.isFinite(v.fileSizeBytes) && v.fileSizeBytes > 0
      ? { fileSizeBytes: Math.round(v.fileSizeBytes) }
      : {}),
    creatorId: v.creatorId || '',
    creatorUsername: v.creatorUsername || '',
    creatorDisplayName: v.creatorDisplayName || '',
    creatorPhotoURL: v.creatorPhotoURL || '',
    category: v.category || 'Other',
    tags: (v.tags || []).slice(0, 4),
    visibility: 'public',
    viewsCount: v.viewsCount || 0,
    likesCount: v.likesCount || 0,
    commentsCount: v.commentsCount || 0,
    sharesCount: v.sharesCount || 0,
    isShort: Boolean(v.isShort),
    status: 'published',
    isLive: Boolean(v.isLive),
    liveViewers: v.liveViewers || 0,
    createdAt: v.createdAt || new Date().toISOString(),
    updatedAt: v.updatedAt || new Date().toISOString(),
  };
}

function savePersistedVideos(videos: Video[]) {
  if (typeof window === 'undefined' || !videos || videos.length === 0) return;
  try {
    const filtered = videos
      .filter(v => v && v.videoId && v.videoId !== 'live_XGym1ByjKHw' && v.videoId !== 'XGym1ByjKHw')
      .slice(0, 45)
      .map(cleanVideoForPersistence);
    const serialized = JSON.stringify(filtered);
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
        return parsed.filter((v: any) => 
          v && 
          typeof v.videoId === 'string' && 
          !v.videoId.startsWith('sample-') &&
          v.videoId !== 'live_XGym1ByjKHw' &&
          v.videoId !== 'XGym1ByjKHw'
        );
      }
    }
  } catch (_) {}
  return [];
}

function savePersistedShorts(shorts: Video[]) {
  if (typeof window === 'undefined' || !shorts || shorts.length === 0) return;
  try {
    const filtered = shorts
      .filter(v => v && v.videoId && v.videoId !== 'live_XGym1ByjKHw' && v.videoId !== 'XGym1ByjKHw')
      .slice(0, 30)
      .map(cleanVideoForPersistence);
    const serialized = JSON.stringify(filtered);
    sessionStorage.setItem('si_cached_public_shorts', serialized);
    localStorage.setItem('si_cached_public_shorts', serialized);
  } catch (_) {}
}

export const clearVideoCache = () => {
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
      sessionStorage.removeItem('si_v_live_XGym1ByjKHw');
      sessionStorage.removeItem('si_v_XGym1ByjKHw');
    } catch (_) {}
  }
};

export const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
export const MAX_VIDEO_SIZE_LABEL = '2 GB';
const CLOUDINARY_CHUNK_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB chunks (>= 5MB min, safely < 100MB request limit)
const CLOUDINARY_PROBE_CHUNK_BYTES = 5 * 1024 * 1024; // 5 MB exact Cloudinary min chunk for fast >100MB plan probe
const CLOUDINARY_FREE_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB (104,857,600 bytes)

function isCloudinaryPlanLimitError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  return (
    Boolean((err as any)?.isPlanLimit) ||
    msg.includes('file size too large') ||
    msg.includes('104857600') ||
    msg.includes('maximum is') ||
    msg.includes('account limit') ||
    msg.includes('413') ||
    msg.includes('payload too large')
  );
}

export interface VideoUploadResult {
  videoUrl: string;
  videoParts?: string[];
  videoPartDurations?: number[];
  duration?: number;
  bytes?: number;
}

export const videoService = {
  // Generate safe random video ID
  generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  // Upload Video File seamlessly with strictly monotonic YouTube-style progress
  async uploadVideo(
    file: File,
    onProgress?: (progress: number, stage?: string) => void,
    options?: { folder?: string; firebasePath?: string; allowMultiPart?: boolean }
  ): Promise<VideoUploadResult> {
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      throw new Error(`Please upload a video smaller than ${MAX_VIDEO_SIZE_LABEL}.`);
    }

    const folder = options?.folder || 'socialindia_videos';
    const firebasePath = options?.firebasePath || 'videos';
    const allowMultiPart = options?.allowMultiPart !== false;
    let cloudinaryLimitHit = false;
    let cloudinaryErrMessage = '';

    // Strictly monotonic YouTube-style progress emitter (never drops backward or shows internal chunk/part text)
    let highWaterPct = 1;
    const reportProgress = (rawPct: number, done = false) => {
      const clamped = done ? 100 : Math.min(99, Math.max(1, Math.round(rawPct)));
      if (clamped > highWaterPct) {
        highWaterPct = clamped;
      }
      const label = highWaterPct >= 100
        ? 'Processing video...'
        : `Uploading video... ${highWaterPct}%`;
      onProgress?.(highWaterPct, label);
    };

    reportProgress(1);

    const { cloudName, preset } = await getCloudinaryConfigAsync();

    if (cloudName && preset) {
      const capCacheKey = `si_cld_plan_cap_${cloudName}`;
      const isKnown100MbCap = (() => {
        if (typeof window === 'undefined' || file.size <= CLOUDINARY_FREE_LIMIT_BYTES) return false;
        try {
          const cached = sessionStorage.getItem(capCacheKey);
          if (!cached) return false;
          const parsed = JSON.parse(cached);
          return parsed?.cap === '100mb' && Date.now() - (parsed?.ts || 0) < 30 * 60 * 1000;
        } catch {
          return false;
        }
      })();

      if (isKnown100MbCap) {
        cloudinaryLimitHit = true;
      } else {
        try {
          if (file.size <= CLOUDINARY_CHUNK_SIZE_BYTES) {
            const singleRes = await this.uploadSingleVideo(
              file,
              cloudName,
              preset,
              (pct, done) => reportProgress(pct, done),
              folder
            );
            reportProgress(100, true);
            return { ...singleRes, bytes: singleRes.bytes || file.size };
          }

          const isLargeFile = file.size > CLOUDINARY_FREE_LIMIT_BYTES;
          const chunkedRes = await this.uploadChunkedVideo(
            file,
            cloudName,
            preset,
            CLOUDINARY_CHUNK_SIZE_BYTES,
            (pct, done) => {
              // For >100MB files before plan is confirmed, map probe smoothly in 1%..4% so there's no jump if Free cap triggers
              const mapped = isLargeFile && pct < 5 ? Math.min(4, pct) : pct;
              reportProgress(mapped, done);
            },
            folder
          );
          reportProgress(100, true);
          return { ...chunkedRes, bytes: chunkedRes.bytes || file.size };
        } catch (cldErr: any) {
          cloudinaryLimitHit = isCloudinaryPlanLimitError(cldErr);
          cloudinaryErrMessage = cldErr?.message || '';
          if (cloudinaryLimitHit && typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(capCacheKey, JSON.stringify({ cap: '100mb', ts: Date.now() }));
            } catch {}
          }
          console.warn('Primary video upload retry/fallback:', cldErr);
        }
      }

      if (cloudinaryLimitHit) {
        let creepTimer: ReturnType<typeof setInterval> | null = null;
        try {
          reportProgress(Math.max(highWaterPct, 4));
          // Keep bar gently alive during fast browser video preparation so it never looks frozen
          creepTimer = setInterval(() => {
            if (highWaterPct < 24) {
              reportProgress(highWaterPct + 1);
            }
          }, 700);

          const { prepareVideoForCloudinary } = await import('../utils/videoProcessor');
          const prepared = await prepareVideoForCloudinary(
            file,
            (prepPct) => {
              // Map preparation cleanly across current highWater -> 28%
              const scaled = 4 + prepPct * 0.24;
              reportProgress(scaled);
            },
            allowMultiPart
          );

          if (creepTimer) {
            clearInterval(creepTimer);
            creepTimer = null;
          }

          const uploadStartPct = Math.max(4, highWaterPct);

          const totalPreparedBytes = prepared.files.reduce((sum, f) => sum + f.size, 0) || file.size;
          const uploadedUrls: string[] = [];
          let uploadedBytesSoFar = 0;

          for (let idx = 0; idx < prepared.files.length; idx++) {
            const partFile = prepared.files[idx];
            const partProgressHandler = (pct: number) => {
              const partUploaded = uploadedBytesSoFar + (partFile.size * Math.min(99, pct)) / 100;
              const uploadRatio = totalPreparedBytes > 0 ? partUploaded / totalPreparedBytes : 0;
              const overallPct = uploadStartPct + uploadRatio * (99 - uploadStartPct);
              reportProgress(overallPct);
            };

            const res = partFile.size <= CLOUDINARY_CHUNK_SIZE_BYTES
              ? await this.uploadSingleVideo(partFile, cloudName, preset, partProgressHandler, folder)
              : await this.uploadChunkedVideo(partFile, cloudName, preset, CLOUDINARY_CHUNK_SIZE_BYTES, partProgressHandler, folder);

            uploadedUrls.push(res.videoUrl);
            uploadedBytesSoFar += partFile.size;
          }

          reportProgress(100, true);
          return {
            videoUrl: uploadedUrls[0],
            ...(uploadedUrls.length > 1
              ? { videoParts: uploadedUrls, videoPartDurations: prepared.durations }
              : {}),
            duration: Math.round(prepared.totalDuration) || undefined,
            bytes: totalPreparedBytes,
          };
        } catch (prepErr: any) {
          if (creepTimer) clearInterval(creepTimer);
          console.warn('Video preparation fallback notice:', prepErr);
          cloudinaryErrMessage = prepErr?.message || cloudinaryErrMessage;
        }
      }
    }

    // Secondary cloud storage fallback (with 8s zero-progress stall guard so it never hangs at 0%)
    try {
      const url = await this.uploadToFirebase(file, firebasePath, (pct) => {
        reportProgress(pct);
      });
      reportProgress(100, true);
      return { videoUrl: url, bytes: file.size };
    } catch (fbErr: any) {
      console.error('Video storage upload failed:', fbErr);
      if (cloudinaryLimitHit) {
        throw new Error(
          cloudinaryErrMessage ||
            'Could not process this video for upload. Please try an MP4 file or a smaller video.'
        );
      }
      throw new Error(fbErr?.message || cloudinaryErrMessage || 'Failed to upload video. Please try again.');
    }
  },

  // Direct single-request upload for video clips (<= 20MB)
  uploadSingleVideo(
    file: File,
    cloudName: string,
    preset: string,
    onProgress?: (progress: number, done?: boolean) => void,
    folder: string = 'socialindia_videos'
  ): Promise<{ videoUrl: string; duration?: number; bytes?: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    formData.append('folder', folder);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.min(99, Math.max(1, Math.round((e.loaded / e.total) * 100)));
          onProgress(percent, false);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            onProgress?.(100, true);
            const cleanDuration = sanitizeVideoDuration(response.duration);
            const cleanBytes = typeof response.bytes === 'number' && Number.isFinite(response.bytes) && response.bytes > 0
              ? Math.round(response.bytes)
              : file.size;
            resolve({
              videoUrl: response.secure_url,
              duration: cleanDuration > 0 ? cleanDuration : undefined,
              bytes: cleanBytes
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
          const errorObj: any = new Error(errMsg);
          if (xhr.status === 413 || isCloudinaryPlanLimitError(errMsg)) {
            errorObj.isPlanLimit = true;
          }
          reject(errorObj);
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload. Please check your connection and try again.'));
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
      xhr.send(formData);
    });
  },

  // Internal chunked upload for large videos
  async uploadChunkedVideo(
    file: File,
    cloudName: string,
    preset: string,
    chunkSize: number,
    onProgress?: (progress: number, done?: boolean) => void,
    folder: string = 'socialindia_videos'
  ): Promise<{ videoUrl: string; duration?: number; bytes?: number }> {
    const uniqueUploadId = `si_${Date.now()}_${Math.random().toString(36).replace(/[^a-z0-9]/gi, '')}`;
    const totalSize = file.size;
    // Use 5MB probe on chunk 1 for >100MB files so plan cap is detected cleanly
    const firstChunkSize = totalSize > CLOUDINARY_FREE_LIMIT_BYTES
      ? Math.min(CLOUDINARY_PROBE_CHUNK_BYTES, chunkSize)
      : chunkSize;
    const remainingBytesAfterFirst = Math.max(0, totalSize - firstChunkSize);
    const totalChunks = 1 + Math.ceil(remainingBytesAfterFirst / chunkSize);

    let start = 0;
    let chunkIndex = 0;
    let finalResult: { videoUrl: string; duration?: number; bytes?: number } | null = null;

    while (start < totalSize) {
      const currentChunkSize = chunkIndex === 0 ? firstChunkSize : chunkSize;
      const end = Math.min(start + currentChunkSize, totalSize);
      const isLastChunk = end >= totalSize;
      const chunkBlob = file.slice(start, end);

      let chunkRes: { videoUrl: string; duration?: number; bytes?: number } | null = null;
      const maxAttempts = 3;
      let lastChunkErr: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          chunkRes = await this.uploadSingleChunk(
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
            onProgress,
            folder
          );
          lastChunkErr = null;
          break;
        } catch (err: any) {
          lastChunkErr = err;
          if (err?.nonRetryable || isCloudinaryPlanLimitError(err) || attempt === maxAttempts) {
            throw err;
          }
          const delayMs = 1200 * attempt;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      if (lastChunkErr) throw lastChunkErr;

      if (isLastChunk && chunkRes) {
        finalResult = chunkRes;
      }

      start = end;
      chunkIndex++;
    }

    if (!finalResult || !finalResult.videoUrl) {
      throw new Error('Video upload did not return a playable URL. Please try again.');
    }

    onProgress?.(100, true);
    return {
      ...finalResult,
      bytes: finalResult.bytes || file.size
    };
  },

  // Internal segment sender
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
    onProgress?: (progress: number, done?: boolean) => void,
    folder: string = 'socialindia_videos'
  ): Promise<{ videoUrl: string; duration?: number; bytes?: number }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', chunkBlob, fileName);
      formData.append('upload_preset', preset);
      formData.append('folder', folder);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const currentLoaded = start + e.loaded;
          const percent = Math.min(99, Math.max(1, Math.round((currentLoaded / totalSize) * 100)));
          onProgress(percent, false);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText || '{}');
            if (isLastChunk) {
              if (onProgress) onProgress(100, true);
              const cleanDuration = sanitizeVideoDuration(res.duration);
              const cleanBytes = typeof res.bytes === 'number' && Number.isFinite(res.bytes) && res.bytes > 0
                ? Math.round(res.bytes)
                : totalSize;
              resolve({
                videoUrl: res.secure_url,
                duration: cleanDuration > 0 ? cleanDuration : undefined,
                bytes: cleanBytes
              });
            } else {
              resolve({ videoUrl: '' });
            }
          } catch (jsonErr) {
            if (isLastChunk) reject(jsonErr);
            else resolve({ videoUrl: '' });
          }
        } else {
          let errMsg = `Upload failed (HTTP ${xhr.status})`;
          try {
            const err = JSON.parse(xhr.responseText);
            if (err.error?.message) {
              errMsg = err.error.message;
            }
          } catch (_) {}
          const errorObj: any = new Error(errMsg);
          if (xhr.status === 413 || isCloudinaryPlanLimitError(errMsg)) {
            errorObj.isPlanLimit = true;
            errorObj.nonRetryable = true;
          } else if (xhr.status >= 400 && xhr.status < 500 && xhr.status !== 408 && xhr.status !== 429) {
            errorObj.nonRetryable = true;
          }
          reject(errorObj);
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error while uploading video. Please check your connection.'));
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
              let errMsg = `Thumbnail upload error (${xhr.status})`;
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

  // Fallback Firebase Storage Upload (Supporting File or Blob) with 8s zero-progress stall guard
  async uploadToFirebase(
    fileOrBlob: File | Blob, 
    path: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const filename = (fileOrBlob as File).name || `${Date.now()}_media.bin`;
    const contentType = fileOrBlob.type || 'application/octet-stream';
    const fileRef = ref(storage, `${path}/${Date.now()}_${filename}`);
    return new Promise((resolve, reject) => {
      let settled = false;
      const uploadTask = uploadBytesResumable(fileRef, fileOrBlob, { contentType });

      const stallTimer = setTimeout(() => {
        if (!settled && uploadTask.snapshot.bytesTransferred === 0) {
          settled = true;
          try {
            uploadTask.cancel();
          } catch {}
          reject(new Error('Backup Firebase Storage did not respond (bucket may not be provisioned).'));
        }
      }, 8000);

      uploadTask.on('state_changed', 
        (snapshot) => {
          if (snapshot.bytesTransferred > 0) {
            clearTimeout(stallTimer);
          }
          const progress = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          if (onProgress && progress > 0) onProgress(progress);
        },
        (error) => {
          clearTimeout(stallTimer);
          if (settled) return;
          settled = true;
          console.error('Firebase Storage upload error:', error);
          reject(error);
        },
        async () => {
          clearTimeout(stallTimer);
          if (settled) return;
          settled = true;
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

    if (videoData.isShort && !soundId && (videoData.visibility || 'public') === 'public') {
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

    const cleanDuration = sanitizeVideoDuration(videoData.duration);
    const cleanFileSizeBytes = typeof videoData.fileSizeBytes === 'number' && Number.isFinite(videoData.fileSizeBytes) && videoData.fileSizeBytes > 0
      ? Math.round(videoData.fileSizeBytes)
      : undefined;

    const fullVideo: Video = {
      videoId,
      title: videoData.title || 'Untitled Video',
      description: videoData.description || '',
      videoUrl: videoData.videoUrl || '',
      ...(Array.isArray(videoData.videoParts) && videoData.videoParts.length > 1
        ? { videoParts: videoData.videoParts }
        : {}),
      ...(Array.isArray(videoData.videoPartDurations) && videoData.videoPartDurations.length > 1
        ? { videoPartDurations: videoData.videoPartDurations }
        : {}),
      thumbnailUrl: finalThumbnail,
      duration: cleanDuration,
      ...(cleanFileSizeBytes ? { fileSizeBytes: cleanFileSizeBytes } : {}),
      creatorId: videoData.creatorId || '',
      creatorUsername: videoData.creatorUsername || '',
      creatorDisplayName: videoData.creatorDisplayName || '',
      creatorPhotoURL: videoData.creatorPhotoURL || '',
      category: videoData.category || 'Other',
      tags: videoData.tags || [],
      visibility: videoData.visibility || 'public',
      commentsMode: videoData.commentsMode || 'allow',
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

  // Delete a video. The video document is the primary operation; optional
  // profile-counter maintenance must never turn a successful deletion into a
  // failed UI action.
  async deleteVideo(videoId: string, creatorId: string): Promise<void> {
    let videoData: Video | null = null;

    try {
      const videoRef = doc(db, 'videos', videoId);
      const videoSnap = await getDoc(videoRef);
      if (videoSnap.exists()) {
        videoData = videoSnap.data() as Video;

        // Archive is best-effort: the Trash collection is admin-restricted in
        // Firestore rules, so regular creators may not be allowed to write it.
        try {
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
        } catch (archiveError) {
          console.warn('Video deleted without Trash archive:', archiveError);
        }
      }

      // Firestore rules allow creators to delete their own video documents.
      await deleteDoc(videoRef);
      clearVideoCache();

      // Keep the user's content deletion successful even if their profile
      // counter cannot be updated (e.g. a restricted/legacy profile).
      try {
        await userService.incrementVideoCount(creatorId, -1);
      } catch (counterError) {
        console.warn('Video deleted; profile video counter update failed:', counterError);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `videos/${videoId}`);
    }
  },

  // Cache a video object in memory and sessionStorage for 0ms transitions
  cacheVideo(video: Video) {
    if (!video || !video.videoId) return;
    memoryVideoDetailCache.set(video.videoId, { data: video, timestamp: Date.now() });
    try {
      if (video.visibility === 'private') return;
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
    if (!videoId || videoId === 'live_XGym1ByjKHw' || videoId === 'XGym1ByjKHw') return null;
    const mem = memoryVideoDetailCache.get(videoId);
    if (mem) return canViewVideo(mem.data) ? mem.data : null;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = sessionStorage.getItem(`si_v_${videoId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as Video;
          if (!canViewVideo(parsed)) return null;
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
      return null;
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
        if (!canViewVideo(vData)) return null;
        this.cacheVideo(vData);
        return vData;
      }
      return cached || null;
    } catch (err) {
      if ((err as { code?: string })?.code === 'permission-denied') return null;
      if (cached && canViewVideo(cached)) return cached;
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
  getCachedVideos(filters?: { category?: string; creatorId?: string; creatorUsername?: string; isShort?: boolean }): Video[] {
    const cacheKey = `${filters?.category || 'All'}_${filters?.creatorId || filters?.creatorUsername || 'all'}_${filters?.isShort !== undefined ? filters.isShort : 'all'}`;
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
    if (filters?.creatorId || filters?.creatorUsername) {
      const cleanUsername = filters.creatorUsername ? filters.creatorUsername.toLowerCase().replace(/^@/, '') : '';
      filtered = filtered.filter(v => {
        if (filters.creatorId && v.creatorId === filters.creatorId) return true;
        if (cleanUsername && v.creatorUsername && v.creatorUsername.toLowerCase().replace(/^@/, '') === cleanUsername) return true;
        return false;
      });
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
        let videos = snap.docs
          .map((d: any) => d.data() as Video)
          .filter((v: Video) => v && v.videoId !== 'live_XGym1ByjKHw' && v.videoId !== 'XGym1ByjKHw');

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

  // Cursor-based paginated public video fetch for smooth YouTube infinite scroll
  async getVideosPage(filters?: {
    category?: string;
    creatorId?: string;
    isShort?: boolean;
    limit?: number;
    afterDoc?: QueryDocumentSnapshot<DocumentData> | null;
  }): Promise<{ videos: Video[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
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
    if (filters?.afterDoc) {
      q = query(q, startAfter(filters.afterDoc));
    }

    const queryLimit = filters?.limit || (filters?.isShort ? 40 : 60);
    q = query(q, limit(queryLimit));

    const snap = await getDocs(q);
    const videos = snap.docs
      .map((d: any) => d.data() as Video)
      .filter((v: Video) => v && v.videoId !== 'live_XGym1ByjKHw' && v.videoId !== 'XGym1ByjKHw');

    const sorted = videos.sort((a: Video, b: Video) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    sorted.forEach(v => {
      if (v.videoId) this.cacheVideo(v);
    });

    if (!filters?.creatorId && (!filters?.category || filters.category === 'All') && sorted.length > 0) {
      if (filters?.isShort === true) {
        const cached = getPersistedShorts();
        const ordered = filters.afterDoc ? [...cached, ...sorted] : [...sorted, ...cached];
        const merged = new Map(ordered.map(video => [video.videoId, video]));
        savePersistedShorts([...merged.values()]);
      } else if (filters?.isShort === false) {
        const cached = getPersistedVideos().filter(video => !video.isShort);
        const ordered = filters.afterDoc ? [...cached, ...sorted] : [...sorted, ...cached];
        const merged = new Map(ordered.map(video => [video.videoId, video]));
        savePersistedVideos([...merged.values()]);
      }
    }

    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length >= queryLimit;
    return { videos: sorted, lastDoc, hasMore };
  },

  // Progressive public video loader for ultra-fast homepage boot:
  // 1. Immediately returns cached videos if available (0ms)
  // 2. Rapidly queries a fast initial batch (6-8 videos) in ~150-250ms and notifies onBatch
  // 3. Immediately follows up with the remaining batch in background and notifies onBatch
  async getVideosProgressive(
    filters?: { category?: string; creatorId?: string; isShort?: boolean; limit?: number; forceFresh?: boolean },
    onBatch?: (batch: Video[], isFirstBatch: boolean) => void
  ): Promise<Video[]> {
    const cacheKey = `${filters?.category || 'All'}_${filters?.creatorId || 'all'}_${filters?.isShort !== undefined ? filters.isShort : 'all'}`;

    if (!filters?.forceFresh) {
      // 1. Instant cache notification (0ms)
      const cached = this.getCachedVideos(filters);
      if (cached && cached.length > 0 && onBatch) {
        onBatch(cached, true);
      }

      const mem = memoryVideoCache.get(cacheKey);
      if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
        if (onBatch) onBatch(mem.data, false);
        return mem.data;
      }
    }

    let baseQ = query(collection(db, 'videos'), where('visibility', '==', 'public'));
    if (filters?.category && filters.category !== 'All') {
      baseQ = query(baseQ, where('category', '==', filters.category));
    }
    if (filters?.creatorId) {
      baseQ = query(baseQ, where('creatorId', '==', filters.creatorId));
    }
    if (filters?.isShort !== undefined) {
      baseQ = query(baseQ, where('isShort', '==', filters.isShort));
    }

    const targetLimit = filters?.limit || (filters?.isShort ? 25 : 60);
    const fastLimit = Math.min(12, targetLimit);

    try {
      // Step A: Ultra-fast initial batch (12 documents) for immediate rendering
      const fastQ = query(baseQ, limit(fastLimit));
      const fastSnap = await getDocs(fastQ);
      
      const fastDocs = fastSnap.docs
        .map((d: any) => d.data() as Video)
        .filter((v: Video) => v && v.videoId !== 'live_XGym1ByjKHw' && v.videoId !== 'XGym1ByjKHw');

      const fastSorted = fastDocs.sort((a: Video, b: Video) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      if (fastSorted.length > 0) {
        fastSorted.forEach(v => {
          if (v.videoId) this.cacheVideo(v);
        });
        if (onBatch) {
          onBatch(fastSorted, true);
        }
      }

      // Step B: If fast batch already got all items or targetLimit was small, we're done
      if (fastSorted.length >= targetLimit || fastDocs.length < fastLimit) {
        memoryVideoCache.set(cacheKey, { data: fastSorted, timestamp: Date.now() });
        if (!filters?.creatorId && (!filters?.category || filters.category === 'All')) {
          if (filters?.isShort === true) {
            savePersistedShorts(fastSorted);
          } else if (filters?.isShort === false) {
            savePersistedVideos(fastSorted);
          }
        }
        return fastSorted;
      }

      // Step C: Full query to retrieve the complete feed in background
      const fullQ = query(baseQ, limit(targetLimit));
      const fullSnap = await getDocs(fullQ);

      const fullDocs = fullSnap.docs
        .map((d: any) => d.data() as Video)
        .filter((v: Video) => v && v.videoId !== 'live_XGym1ByjKHw' && v.videoId !== 'XGym1ByjKHw');

      const fullSorted = fullDocs.sort((a: Video, b: Video) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      memoryVideoCache.set(cacheKey, { data: fullSorted, timestamp: Date.now() });

      if (!filters?.creatorId && (!filters?.category || filters.category === 'All')) {
        if (filters?.isShort === true) {
          savePersistedShorts(fullSorted);
        } else if (filters?.isShort === false) {
          savePersistedVideos(fullSorted);
        } else {
          savePersistedVideos(fullSorted.filter(v => !v.isShort));
          const onlyShorts = fullSorted.filter(v => Boolean(v.isShort));
          if (onlyShorts.length > 0) {
            savePersistedShorts(onlyShorts);
          }
        }
      }

      fullSorted.forEach(v => {
        if (v.videoId) this.cacheVideo(v);
      });

      if (onBatch) {
        onBatch(fullSorted, false);
      }

      return fullSorted;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'videos');
      return this.getCachedVideos(filters);
    }
  },

  searchCachedVideos(term: string): Video[] {
    return rankVideoSearchResults(term, this.getCachedVideos());
  },

  // Search by textual relevance first, with bounded engagement and freshness signals.
  async searchVideos(term: string): Promise<Video[]> {
    if (!term.trim()) return this.getVideos();
    const cleanTerm = term.trim().toLowerCase();

    const cachedSearch = memorySearchCache.get(cleanTerm);
    if (cachedSearch && Date.now() - cachedSearch.timestamp < CACHE_TTL_MS) {
      return cachedSearch.data;
    }

    try {
      const cachedVideos = this.getCachedVideos();
      const fetchedVideos = await this.getVideos();
      const videosById = new Map<string, Video>();
      [...cachedVideos, ...fetchedVideos].forEach(video => {
        if (video.videoId) videosById.set(video.videoId, video);
      });

      const ranked = rankVideoSearchResults(cleanTerm, [...videosById.values()]);

      memorySearchCache.set(cleanTerm, { data: ranked, timestamp: Date.now() });
      return ranked;
    } catch (err) {
      console.error('Search error:', err);
      return this.searchCachedVideos(cleanTerm);
    }
  },

  // Retrieve creator's dashboard content including private/unlisted videos (supports creatorId & creatorUsername)
  async getCreatorVideos(
    creatorId: string,
    creatorUsername?: string,
    includePrivate = auth.currentUser?.uid === creatorId
  ): Promise<Video[]> {
    if (!creatorId && !creatorUsername) return [];
    const map = new Map<string, Video>();

    try {
      // 1. Query by creatorId
      if (creatorId) {
        const q1 = includePrivate
          ? query(collection(db, 'videos'), where('creatorId', '==', creatorId))
          : query(
              collection(db, 'videos'),
              where('creatorId', '==', creatorId),
              where('visibility', '==', 'public')
            );
        const snap1 = await getDocs(q1);
        snap1.docs.forEach((d: any) => {
          const v = d.data() as Video;
          if (v && v.videoId) map.set(v.videoId, v);
        });
      }

      // 2. Also query by creatorUsername to ensure all videos assigned to this handle are retrieved
      if (!includePrivate && creatorUsername && creatorUsername.trim()) {
        const cleanUser = creatorUsername.trim().toLowerCase().replace(/^@/, '');
        const q2 = query(
          collection(db, 'videos'),
          where('creatorUsername', '==', cleanUser),
          where('visibility', '==', 'public')
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
          if ((idMatch || userMatch) && (includePrivate || v.visibility === 'public')) {
            map.set(v.videoId, v);
          }
        }
      });

      const parseTime = (dateVal: any): number => {
        if (!dateVal) return 0;
        if (typeof dateVal === 'number') return dateVal;
        if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
        if (dateVal.seconds) return dateVal.seconds * 1000;
        const t = new Date(dateVal).getTime();
        return isNaN(t) ? 0 : t;
      };

      const videos = Array.from(map.values()).filter(v =>
        v &&
        v.videoId !== 'live_XGym1ByjKHw' &&
        v.videoId !== 'XGym1ByjKHw' &&
        (includePrivate || v.visibility === 'public')
      );
      const sorted = videos.sort((a: Video, b: Video) => parseTime(b.createdAt) - parseTime(a.createdAt));
      sorted.forEach(v => {
        if (v && v.videoId) {
          memoryVideoDetailCache.set(v.videoId, { data: v, timestamp: Date.now() });
        }
      });
      return sorted;
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

