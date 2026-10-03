// Utility functions for video link conversion, numbers formatting, durations and time-ago.

export type VideoType = 'youtube' | 'drive' | 'direct' | 'unsupported';

export interface ParsedVideo {
  type: VideoType;
  embedUrl: string;
  youtubeId?: string;
}

export function parseVideoUrl(url: string): ParsedVideo {
  if (!url) return { type: 'unsupported', embedUrl: '' };

  const cleanUrl = url.trim();

  // YouTube matchers
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
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
  if (count === undefined || count === null || count < 0) return '0 subscribers';
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M subscribers';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K subscribers';
  }
  return `${count} ${count === 1 ? 'subscriber' : 'subscribers'}`;
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

// Relative time format e.g. "2 hours ago"
export function formatTimeAgo(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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

// Get user profile initial letters
export function getInitials(name: string): string {
  if (!name) return 'SI';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}
