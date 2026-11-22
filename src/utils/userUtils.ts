import { User } from '../types';
import { parseDateMs } from './videoUtils';

/**
 * Checks whether a given user profile has the official Blue Tick verification badge.
 * A user ONLY qualifies for the verified blue tick badge if:
 * 1. They are explicitly marked verified (`isVerified === true` or `verified === true` or `verificationStatus === 'approved'`)
 * 2. They have subscribed to SocialIndia Pro (`isPro === true`)
 * 3. They are a platform administrator (`role === 'admin'`)
 * 
 * Note: A regular creator (`role === 'creator'`) does NOT get a blue tick automatically.
 */
export const OFFICIAL_SOCIALINDIA_UID = 'RTUVtjrw5sPWaiq10OIMiloF8HQ2';

export function isOfficialSocialIndiaAccount(
  user?: { uid?: string; userId?: string; username?: string } | null | any
): boolean {
  if (!user) return false;
  const rawUid = typeof user.uid === 'string'
    ? user.uid.trim()
    : (typeof user.userId === 'string' ? user.userId.trim() : '');
  if (rawUid === OFFICIAL_SOCIALINDIA_UID) return true;
  const username = typeof user.username === 'string'
    ? user.username.replace(/^@/, '').trim().toLowerCase()
    : '';
  return username === 'socialindia';
}

export function isUserVerified(user?: Partial<User> | null | any): boolean {
  if (!user) return false;
  const username = typeof user.username === 'string' ? user.username.trim().toLowerCase() : '';
  if (username === 'socialindia') return true;
  if (user.isVerified === true || user.verified === true) return true;
  if (user.is_verified === true || user.is_verified === 'true') return true;
  if (user.isPro === true) return true;
  if (user.is_pro === true || user.is_pro === 'true') return true;
  if (user.role === 'admin') return true;
  if (
    String(user.verificationStatus || user.verification_status || '').trim().toLowerCase() === 'approved'
  ) return true;
  return false;
}

const PRESENCE_STALE_MS = 150_000; // 2.5 minutes heartbeat freshness window

export function isUserCurrentlyOnline(isOnline?: boolean, lastSeen?: unknown): boolean {
  if (isOnline !== true) return false;
  const lastSeenMs = parseDateMs(lastSeen);
  if (!lastSeenMs) return true;
  return Date.now() - lastSeenMs <= PRESENCE_STALE_MS;
}

export function formatWhatsAppPresence(
  isOnline?: boolean,
  lastSeen?: unknown,
  isHindi: boolean = false
): { online: boolean; label: string } {
  if (isUserCurrentlyOnline(isOnline, lastSeen)) {
    return {
      online: true,
      label: isHindi ? 'ऑनलाइन' : 'Online'
    };
  }

  const lastSeenMs = parseDateMs(lastSeen);
  if (!lastSeenMs) {
    return {
      online: false,
      label: isHindi ? 'ऑफलाइन' : 'Offline'
    };
  }

  const d = new Date(lastSeenMs);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const seenDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((todayStart - seenDayStart) / 86_400_000);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (dayDiff === 0) {
    return {
      online: false,
      label: isHindi ? `ऑफलाइन · आज ${timeStr}` : `Offline · last seen today at ${timeStr}`
    };
  }
  if (dayDiff === 1) {
    return {
      online: false,
      label: isHindi ? `ऑफलाइन · कल ${timeStr}` : `Offline · last seen yesterday at ${timeStr}`
    };
  }

  const dateStr = d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', { day: 'numeric', month: 'short' });
  return {
    online: false,
    label: isHindi ? `ऑफलाइन · ${dateStr}` : `Offline · last seen ${dateStr}`
  };
}
