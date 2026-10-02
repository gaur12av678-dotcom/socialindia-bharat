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

  // Direct MP4 / WebM video files
  if (cleanUrl.match(/\.(mp4|webm|ogg|mov)$/i) || cleanUrl.startsWith('https://assets.mixkit.co/')) {
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

// Automatically extract high quality YouTube thumbnail scene from video URL
export function extractYoutubeThumbnail(url: string): string | null {
  if (!url) return null;
  const parsed = parseVideoUrl(url);
  if (parsed.type === 'youtube' && parsed.youtubeId) {
    return `https://img.youtube.com/vi/${parsed.youtubeId}/hqdefault.jpg`;
  }
  return null;
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
  if (count === undefined || count === null) return '0 followers';
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
