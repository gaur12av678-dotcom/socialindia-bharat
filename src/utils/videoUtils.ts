// Utility functions for video link conversion, numbers formatting, durations and time-ago.

export type VideoType = 'youtube' | 'drive' | 'direct' | 'unsupported';

export interface ParsedVideo {
  type: VideoType;
  embedUrl: string;
  youtubeId?: string;
}

export type PlaybackQuality = 'Auto' | '1080p' | '720p' | '480p' | '360p';

const failedCloudinaryPlaybackTransforms = new Set<string>();

export function markCloudinaryTransformFailed(url: string): void {
  if (url) failedCloudinaryPlaybackTransforms.add(url);
}

export function normalizePlaybackQuality(label?: string): PlaybackQuality {
  const s = (label || '').toLowerCase();
  if (s.includes('360')) return '360p';
  if (s.includes('480')) return '480p';
  if (s.includes('720')) return '720p';
  if (s.includes('1080') && !s.includes('auto')) return '1080p';
  return 'Auto';
}

export function getOptimizedVideoStreamUrl(
  rawUrl: string,
  options?: {
    quality?: string;
    isShort?: boolean;
    fileSizeBytes?: number;
    duration?: number;
  }
): string {
  if (!rawUrl || !rawUrl.includes('res.cloudinary.com') || !rawUrl.includes('/video/upload/')) {
    return rawUrl;
  }
  if (/\.m3u8(\?.*)?$/i.test(rawUrl) || /\.mpd(\?.*)?$/i.test(rawUrl)) {
    return rawUrl;
  }

  const uploadMarker = '/video/upload/';
  const markerIdx = rawUrl.indexOf(uploadMarker);
  if (markerIdx === -1) return rawUrl;

  const afterUpload = rawUrl.slice(markerIdx + uploadMarker.length);
  const firstSegment = afterUpload.split('/')[0] || '';
  const hasExistingTransform =
    !/^v\d+$/.test(firstSegment) &&
    afterUpload.includes('/') &&
    (firstSegment.includes(',') || /^(f_|q_|vc_|w_|h_|c_|so_|sp_)/.test(firstSegment));
  if (hasExistingTransform) {
    return rawUrl;
  }

  const quality = normalizePlaybackQuality(options?.quality);
  const sizeBytes = options?.fileSizeBytes || 0;
  const durationSec = options?.duration || 0;

  let transform = '';
  if (quality === '360p') {
    transform = 'f_mp4,vc_h264,q_auto:eco,c_limit,h_360';
  } else if (quality === '480p') {
    transform = 'f_mp4,vc_h264,q_auto:eco,c_limit,h_480';
  } else if (quality === '720p') {
    transform = 'f_mp4,vc_h264,q_auto:good,c_limit,h_720';
  } else if (quality === '1080p') {
    if (sizeBytes > 40 * 1024 * 1024 || durationSec > 240) {
      return rawUrl;
    }
    transform = 'f_mp4,vc_h264,q_auto:good,c_limit,h_1080';
  } else {
    // Auto mode: shrink high-bitrate short/community clips so mobile playback starts fast without risking Cloudinary Free 423 sync errors
    if (options?.isShort) {
      if (sizeBytes > 55 * 1024 * 1024) return rawUrl;
      transform = 'f_mp4,vc_h264,q_auto:good,c_limit,w_720';
    } else if (sizeBytes > 0 && sizeBytes <= 38 * 1024 * 1024 && (durationSec === 0 || durationSec <= 240)) {
      transform = 'f_mp4,vc_h264,q_auto:good,c_limit,h_1080';
    } else if (!sizeBytes && durationSec > 0 && durationSec <= 120) {
      transform = 'f_mp4,vc_h264,q_auto:good,c_limit,h_1080';
    } else {
      return rawUrl;
    }
  }

  const optimizedUrl = `${rawUrl.slice(0, markerIdx + uploadMarker.length)}${transform}/${afterUpload}`.replace(
    /\.(mov|mkv|avi|webm|m4v)(\?.*)?$/i,
    '.mp4$2'
  );
  if (failedCloudinaryPlaybackTransforms.has(optimizedUrl)) {
    return rawUrl;
  }
  return optimizedUrl;
}

function getVideoSourceDuration(source: File | string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const mediaUrl = typeof source === 'string' ? source : URL.createObjectURL(source);
    let settled = false;
    let seekFallbackTimer: number | undefined;
    const timeout = window.setTimeout(() => {
      finish(new Error('Could not determine the video duration. Please try another video file.'));
    }, 120000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      if (seekFallbackTimer !== undefined) window.clearTimeout(seekFallbackTimer);
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (typeof source !== 'string') URL.revokeObjectURL(mediaUrl);
    };

    const finish = (error?: Error, duration?: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else if (duration && Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error('Could not determine the video duration. Please try another video file.'));
    };

    const readFiniteDuration = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        finish(undefined, video.duration);
      }
    };

    const playToEnd = () => {
      if (settled || !video.paused) return;
      video.muted = true;
      video.play().catch(error => {
        finish(error instanceof Error ? error : new Error('Could not read the video duration.'));
      });
    };

    video.preload = 'auto';
    video.muted = true;
    video.onloadedmetadata = () => {
      readFiniteDuration();
      if (!settled && !Number.isFinite(video.duration)) {
        try {
          const lastSeekableRange = video.seekable.length - 1;
          const seekEnd = lastSeekableRange >= 0 ? video.seekable.end(lastSeekableRange) : NaN;
          video.currentTime = Number.isFinite(seekEnd) && seekEnd > 0 ? seekEnd : Number.MAX_SAFE_INTEGER;
          seekFallbackTimer = window.setTimeout(playToEnd, 1500);
        } catch {
          playToEnd();
        }
      }
    };
    video.ondurationchange = readFiniteDuration;
    video.onseeked = () => {
      readFiniteDuration();
      if (!settled && !Number.isFinite(video.duration)) {
        if (seekFallbackTimer !== undefined) window.clearTimeout(seekFallbackTimer);
        playToEnd();
      }
    };
    video.ontimeupdate = () => {
      readFiniteDuration();
      if (!settled && video.ended && Number.isFinite(video.currentTime) && video.currentTime > 0) {
        finish(undefined, video.currentTime);
      }
    };
    video.onended = () => {
      readFiniteDuration();
      if (!settled && Number.isFinite(video.currentTime) && video.currentTime > 0) {
        finish(undefined, video.currentTime);
      }
    };
    video.onerror = () => finish(new Error('Could not read the selected video file.'));
    video.src = mediaUrl;
  });
}

export function getVideoFileDuration(file: File): Promise<number> {
  return getVideoSourceDuration(file);
}

export function getVideoUrlDuration(url: string): Promise<number> {
  return getVideoSourceDuration(url);
}

export function parseVideoUrl(url: string): ParsedVideo {
  if (!url) return { type: 'unsupported', embedUrl: '' };

  const cleanUrl = url.trim();

  // YouTube Live matchers (e.g. https://www.youtube.com/live/XGym1ByjKHw?si=...)
  const liveRegExp = /\/live\/([a-zA-Z0-9\-_]{11})/;
  const liveMatch = cleanUrl.match(liveRegExp);
  if (liveMatch && liveMatch[1]) {
    const videoId = liveMatch[1];
    return {
      type: 'youtube',
      youtubeId: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&live=1`
    };
  }

  // YouTube matchers
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|live\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = cleanUrl.match(ytRegExp);

  if (match && match[2].length === 11) {
    const videoId = match[2];
    return {
      type: 'youtube',
      youtubeId: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1`
    };
  }

  // YouTube Shorts matchers
  const shortsRegExp = /\/shorts\/([a-zA-Z0-9\-_]{11})/;
  const shortsMatch = cleanUrl.match(shortsRegExp);
  if (shortsMatch && shortsMatch[1]) {
    const videoId = shortsMatch[1];
    return {
      type: 'youtube',
      youtubeId: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&loop=1&playlist=${videoId}`
    };
  }

  // Google Drive matchers
  if (cleanUrl.includes('drive.google.com')) {
    const driveRegExp = /\/file\/d\/([a-zA-Z0-9\-_]+)/;
    const driveMatch = cleanUrl.match(driveRegExp);
    if (driveMatch && driveMatch[1]) {
      return {
        type: 'drive',
        embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`
      };
    }
  }

  // Direct MP4 / WebM / Cloudinary video files
  if (
    cleanUrl.includes('cloudinary.com') ||
    cleanUrl.includes('firebasestorage.googleapis.com') ||
    cleanUrl.match(/\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i) || 
    cleanUrl.startsWith('https://assets.mixkit.co/') ||
    cleanUrl.startsWith('blob:')
  ) {
    return {
      type: 'direct',
      embedUrl: cleanUrl
    };
  }

  // Generic direct fallback if url is https and not matching embeds
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return {
      type: 'direct',
      embedUrl: cleanUrl
    };
  }

  // Unsupported url format
  return {
    type: 'unsupported',
    embedUrl: ''
  };
}

// Automatically extract thumbnail scene from video URL (Cloudinary or YouTube)
export function extractVideoThumbnail(url: string): string | null {
  if (!url) return null;
  
  // 1. YouTube thumbnail
  const parsed = parseVideoUrl(url);
  if (parsed.type === 'youtube' && parsed.youtubeId) {
    return `https://img.youtube.com/vi/${parsed.youtubeId}/hqdefault.jpg`;
  }

  // 2. Cloudinary native frame scene capture at 1.5 seconds
  if (url.includes('cloudinary.com')) {
    if (url.includes('/video/upload/')) {
      return url
        .replace('/video/upload/', '/video/upload/so_1.5,f_jpg/')
        .replace(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i, '.jpg');
    }
    return url.replace(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i, '.jpg');
  }

  return null;
}

// Automatically extract high quality YouTube thumbnail scene from video URL (alias)
export function extractYoutubeThumbnail(url: string): string | null {
  return extractVideoThumbnail(url);
}

// Helper to capture a real frame from a video file using HTML5 Canvas
export function captureFrameFromVideoFile(file: File, seekTimeSeconds: number = 1.5): Promise<{ blob: Blob; dataUrl: string } | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      const blobUrl = URL.createObjectURL(file);
      video.src = blobUrl;

      video.onloadedmetadata = () => {
        // Seek to safe position (either 1.5s or 25% of duration)
        const duration = video.duration || 5;
        const targetTime = Math.min(seekTimeSeconds, Math.max(0.5, duration * 0.2));
        video.currentTime = targetTime;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(blobUrl);
            return resolve(null);
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(blobUrl);
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.9);
        } catch (canvasErr) {
          console.error('Canvas frame extraction failed:', canvasErr);
          URL.revokeObjectURL(blobUrl);
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        resolve(null);
      };
    } catch (err) {
      console.error('Frame capture setup error:', err);
      resolve(null);
    }
  });
}

// Convert numbers like 14200 into "14.2K"
export function formatViews(count: number): string {
  if (count === undefined || count === null) return '0 views';
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M views';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K views';
  }
  return `${count} ${count === 1 ? 'view' : 'views'}`;
}

export function formatSubscribers(count: number): string {
  if (count === undefined || count === null || count < 0) return '0 followers';
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M followers';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K followers';
  }
  return `${count} ${count === 1 ? 'follower' : 'followers'}`;
}

// Convert duration seconds into "mm:ss" or "hh:mm:ss"
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const formattedSecs = secs < 10 ? `0${secs}` : secs;

  if (hrs > 0) {
    const formattedMins = mins < 10 ? `0${mins}` : mins;
    return `${hrs}:${formattedMins}:${formattedSecs}`;
  }
  return `${mins}:${formattedSecs}`;
}

export function parseDateMs(input: unknown): number {
  if (input === null || input === undefined || input === '') return 0;
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) return 0;
    return input < 1e12 ? input * 1000 : input;
  }
  if (input instanceof Date) {
    const ms = input.getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof input === 'string') {
    const ms = Date.parse(input);
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof input === 'object') {
    const obj = input as {
      toMillis?: () => number;
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
      _seconds?: number;
      _nanoseconds?: number;
    };
    if (typeof obj.toMillis === 'function') {
      const ms = obj.toMillis();
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof obj.toDate === 'function') {
      const ms = obj.toDate().getTime();
      return Number.isFinite(ms) ? ms : 0;
    }
    const secs = typeof obj.seconds === 'number' ? obj.seconds : obj._seconds;
    if (typeof secs === 'number' && Number.isFinite(secs)) {
      const nanos = typeof obj.nanoseconds === 'number'
        ? obj.nanoseconds
        : (typeof obj._nanoseconds === 'number' ? obj._nanoseconds : 0);
      return secs * 1000 + Math.floor(nanos / 1e6);
    }
  }
  return 0;
}

export function formatShortDate(input: unknown): string {
  const ms = parseDateMs(input);
  if (!ms) return 'Unknown';
  return new Date(ms).toLocaleDateString();
}

// Relative time format e.g. "2 hours ago"
export function formatTimeAgo(dateInput: unknown): string {
  const ms = parseDateMs(dateInput);
  if (!ms) return '';
  const seconds = Math.floor((Date.now() - ms) / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}yr ago`;
}

// Get user profile initial letter (YouTube single-letter standard)
export function getInitials(name: string): string {
  if (!name) return 'S';
  const clean = name.replace(/^@/, '').trim();
  if (!clean) return 'S';
  const match = clean.match(/[a-zA-Z0-9\u0900-\u097F]/);
  return (match ? match[0] : clean[0]).toUpperCase();
}
