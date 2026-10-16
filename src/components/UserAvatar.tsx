import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { useApp } from '../context/AppContext';
import { getInitials } from '../utils/videoUtils';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  uid?: string;
  fallbackPhotoURL?: string;
  fallbackDisplayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

// 10 Vibrant gradients for avatar backgrounds
const avatarGradients = [
  'linear-gradient(135deg, #2563eb, #1d4ed8)', // Blue
  'linear-gradient(135deg, #e11d48, #be123c)', // Rose
  'linear-gradient(135deg, #059669, #047857)', // Emerald
  'linear-gradient(135deg, #7c3aed, #6d28d9)', // Purple
  'linear-gradient(135deg, #d97706, #b45309)', // Amber
  'linear-gradient(135deg, #0891b2, #0e7490)', // Cyan
  'linear-gradient(135deg, #ea580c, #c2410c)', // Orange
  'linear-gradient(135deg, #4f46e5, #4338ca)', // Indigo
  'linear-gradient(135deg, #db2777, #9d174d)', // Pink
  'linear-gradient(135deg, #0284c7, #0369a1)', // Sky
];

function getGradientForName(str: string): string {
  if (!str) return avatarGradients[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarGradients.length;
  return avatarGradients[index];
}

// Global in-memory cache initialized with localStorage
const profileCache: Record<string, { photoURL: string; displayName: string }> = {};

function getPersistedAvatar(uid: string): { photoURL: string; displayName: string } | null {
  if (!uid) return null;
  if (profileCache[uid]) return profileCache[uid];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(`si_av_${uid}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        profileCache[uid] = parsed;
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

export function updateUserAvatarCache(uid: string, photoURL: string, displayName: string = '') {
  if (!uid) return;
  profileCache[uid] = { photoURL, displayName };
  try {
    if (typeof window !== 'undefined') {
      if (window.localStorage) {
        localStorage.setItem(`si_av_${uid}`, JSON.stringify({ photoURL, displayName }));
      }
      window.dispatchEvent(new CustomEvent('si_user_avatar_updated', {
        detail: { uid, photoURL, displayName }
      }));
    }
  } catch (_) {}
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  uid, 
  fallbackPhotoURL = '', 
  fallbackDisplayName = '',
  size = 'md',
  className = '',
  onClick
}) => {
  const { currentUser, currentUserProfile } = useApp();

  // Check if this avatar belongs to the currently logged in user safely
  const currentUsernameLower = (currentUserProfile?.username || '').trim().toLowerCase();
  const currentDisplayNameLower = (currentUserProfile?.displayName || '').trim().toLowerCase();
  const fallbackNameLower = (fallbackDisplayName || '').trim().toLowerCase();
  const uidLower = (uid || '').trim().toLowerCase();

  const isCurrentLoggedInUser = Boolean(
    (uid && currentUser?.uid && currentUser.uid === uid) || 
    (fallbackNameLower && currentUsernameLower && currentUsernameLower === fallbackNameLower) ||
    (fallbackNameLower && currentDisplayNameLower && currentDisplayNameLower === fallbackNameLower) ||
    (uidLower && currentUsernameLower && currentUsernameLower === uidLower)
  );

  // Initial fast photo from memory or persistent localStorage
  const [fetchedPhoto, setFetchedPhoto] = useState<string>(() => {
    if (isCurrentLoggedInUser && currentUserProfile?.photoURL) return currentUserProfile.photoURL;
    if (uid) {
      const persisted = getPersistedAvatar(uid);
      if (persisted?.photoURL) return persisted.photoURL;
      const u = userService.getCachedUserProfile(uid);
      if (u?.photoURL) return u.photoURL;
    }
    return fallbackPhotoURL || '';
  });

  // Initial fast display name from memory or persistent localStorage
  const [fetchedName, setFetchedName] = useState<string>(() => {
    if (isCurrentLoggedInUser && (currentUserProfile?.displayName || currentUserProfile?.username)) {
      return currentUserProfile.displayName || currentUserProfile.username;
    }
    if (uid) {
      const persisted = getPersistedAvatar(uid);
      if (persisted?.displayName) return persisted.displayName;
      const u = userService.getCachedUserProfile(uid);
      if (u) return u.displayName || u.username;
    }
    return fallbackDisplayName || '';
  });

  const [imgError, setImgError] = useState(false);
  const [isImgLoaded, setIsImgLoaded] = useState(false);

  // Sync current user profile into cache whenever it updates
  useEffect(() => {
    if (currentUser?.uid && currentUserProfile) {
      if (currentUserProfile.photoURL) {
        updateUserAvatarCache(
          currentUser.uid,
          currentUserProfile.photoURL,
          currentUserProfile.displayName || currentUserProfile.username || ''
        );
      }
    }
  }, [currentUser?.uid, currentUserProfile?.photoURL, currentUserProfile?.displayName, currentUserProfile?.username]);

  // Listen for external cache update events
  useEffect(() => {
    if (!uid) return;
    const handleAvatarUpdate = (e: any) => {
      const detail = e.detail;
      if (detail && detail.uid === uid) {
        if (detail.photoURL) {
          setFetchedPhoto(detail.photoURL);
          setImgError(false);
        }
        if (detail.displayName) {
          setFetchedName(detail.displayName);
        }
      }
    };

    window.addEventListener('si_user_avatar_updated', handleAvatarUpdate);
    return () => {
      window.removeEventListener('si_user_avatar_updated', handleAvatarUpdate);
    };
  }, [uid]);

  // Fetch or retrieve from cache for any UID
  useEffect(() => {
    setImgError(false);
    setIsImgLoaded(false);

    if (isCurrentLoggedInUser && currentUserProfile?.photoURL) {
      setFetchedPhoto(currentUserProfile.photoURL);
      return;
    }

    if (uid) {
      const persisted = getPersistedAvatar(uid);
      if (persisted?.photoURL) {
        setFetchedPhoto(persisted.photoURL);
      }
      if (persisted?.displayName) {
        setFetchedName(persisted.displayName);
      }
      
      // Always fetch latest profile in background to keep avatar up-to-date
      userService.getUserProfile(uid).then(profile => {
        if (profile) {
          if (profile.photoURL) {
            updateUserAvatarCache(uid, profile.photoURL, profile.displayName || profile.username || '');
            setFetchedPhoto(profile.photoURL);
          }
          if (profile.displayName || profile.username) {
            setFetchedName(profile.displayName || profile.username);
          }
        }
      }).catch(() => {});
    } else if (fallbackDisplayName) {
      userService.getUserByUsername(fallbackDisplayName).then(uProfile => {
        if (uProfile) {
          if (uProfile.photoURL) {
            if (uProfile.uid) {
              updateUserAvatarCache(uProfile.uid, uProfile.photoURL, uProfile.displayName || uProfile.username || '');
            }
            setFetchedPhoto(uProfile.photoURL);
          }
          if (uProfile.displayName || uProfile.username) {
            setFetchedName(uProfile.displayName || uProfile.username);
          }
        }
      }).catch(() => {});
    }
  }, [uid, fallbackDisplayName, isCurrentLoggedInUser, currentUserProfile?.photoURL]);

  // Priority order for photo:
  const liveUserPhoto = isCurrentLoggedInUser && currentUserProfile?.photoURL ? currentUserProfile.photoURL : '';
  const cachedPhoto = uid ? (profileCache[uid]?.photoURL || getPersistedAvatar(uid)?.photoURL || '') : '';
  const resolvedPhoto = (liveUserPhoto || fetchedPhoto || cachedPhoto || fallbackPhotoURL || '').trim();

  const liveUserName = isCurrentLoggedInUser && (currentUserProfile?.displayName || currentUserProfile?.username) 
    ? (currentUserProfile.displayName || currentUserProfile.username) 
    : '';
  const effectiveDisplayName = liveUserName || fetchedName || fallbackDisplayName || uid || 'User';

  const hasValidPhoto = Boolean(resolvedPhoto && !imgError);
  const bgGradient = getGradientForName(effectiveDisplayName);

  // Explicit pixel / rem sizing mappings
  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'w-6 h-6 min-w-[24px] min-h-[24px] text-[9px]';
      case 'sm':
        return 'w-9 h-9 min-w-[36px] min-h-[36px] text-xs';
      case 'lg':
        return 'w-12 h-12 min-w-[48px] min-h-[48px] text-sm';
      case 'xl':
        return 'w-16 h-16 min-w-[64px] min-h-[64px] text-base';
      case 'md':
      default:
        return 'w-10 h-10 min-w-[40px] min-h-[40px] text-xs';
    }
  };

  const sizeStyle = getSizeStyles();
  const initials = getInitials(effectiveDisplayName);

  return (
    <div 
      onClick={onClick}
      style={{
        background: bgGradient,
        color: '#ffffff'
      }}
      className={`relative ${sizeStyle} rounded-full overflow-hidden flex items-center justify-center font-black shrink-0 select-none shadow-xs transition-transform ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} ${className}`}
    >
      {/* Base Layer: Beautiful crisp initials or sleek fallback icon (NEVER blank or broken) */}
      <span className="text-white font-black leading-none select-none tracking-wider flex items-center justify-center w-full h-full">
        {initials && initials !== 'SI' ? (
          initials
        ) : (
          <UserIcon className="w-1/2 h-1/2 text-white/90" />
        )}
      </span>

      {/* Image Layer: Renders over the background and only fades in on successful load */}
      {hasValidPhoto && (
        <img 
          src={resolvedPhoto} 
          alt={effectiveDisplayName} 
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setIsImgLoaded(true);
            setImgError(false);
          }}
          onError={() => {
            setImgError(true);
            setIsImgLoaded(false);
          }}
          className={`absolute inset-0 w-full h-full object-cover rounded-full pointer-events-none transition-opacity duration-300 ${
            isImgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Subtle shimmer placeholder while image is resolving across network */}
      {hasValidPhoto && !isImgLoaded && (
        <div className="absolute inset-0 bg-white/20 dark:bg-black/20 animate-pulse pointer-events-none rounded-full" />
      )}
    </div>
  );
};
