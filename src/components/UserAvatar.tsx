import React, { useState, useEffect, useRef, useMemo } from 'react';
import { userService } from '../services/userService';
import { useApp } from '../context/AppContext';

export interface UserAvatarProps {
  uid?: string;
  fallbackPhotoURL?: string;
  fallbackDisplayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

// YouTube / Google Material solid color palette for letter avatars
export const YOUTUBE_AVATAR_COLORS = [
  '#c5221f', // YouTube Red
  '#e37400', // Deep Orange
  '#b06000', // Amber / Ochre
  '#137333', // Google Forest Green
  '#007b83', // Deep Teal
  '#00897b', // Teal Green
  '#1a73e8', // YouTube / Google Blue
  '#3949ab', // Indigo
  '#7b1fa2', // Purple
  '#c2185b', // Pink / Rose
  '#5f6368', // Slate Neutral Grey
];

export function getYouTubeColor(str: string): string {
  if (!str) return '#5f6368';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % YOUTUBE_AVATAR_COLORS.length;
  return YOUTUBE_AVATAR_COLORS[index];
}

// Single uppercase letter avatar (YouTube standard)
export function getYouTubeInitial(name: string): string {
  if (!name) return '';
  const clean = name.replace(/^@/, '').trim();
  if (!clean) return '';
  const match = clean.match(/[a-zA-Z0-9\u0900-\u097F]/);
  return (match ? match[0] : clean[0]).toUpperCase();
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
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if this avatar belongs to current logged in user
  const currentUsernameLower = (currentUserProfile?.username || '').trim().toLowerCase();
  const currentDisplayNameLower = (currentUserProfile?.displayName || '').trim().toLowerCase();
  const fallbackNameLower = (fallbackDisplayName || '').trim().toLowerCase();
  const uidLower = (uid || '').trim().toLowerCase();

  const activeLoggedUid = currentUser?.uid || currentUserProfile?.uid;
  const isCurrentLoggedInUser = Boolean(
    (uid && activeLoggedUid && activeLoggedUid === uid) ||
    (!uid && (
      (fallbackNameLower && currentUsernameLower && currentUsernameLower === fallbackNameLower) ||
      (fallbackNameLower && currentDisplayNameLower && currentDisplayNameLower === fallbackNameLower)
    )) ||
    (uidLower && currentUsernameLower && currentUsernameLower === uidLower)
  );

  const resolveInitialPhoto = () => {
    if (isCurrentLoggedInUser) return (currentUserProfile?.photoURL || '').trim();
    if (fallbackPhotoURL && fallbackPhotoURL.trim()) return fallbackPhotoURL.trim();
    if (uid) {
      const u = userService.getCachedUserProfile(uid);
      if (u && typeof u.photoURL === 'string') return u.photoURL.trim();
      const persisted = getPersistedAvatar(uid);
      if (persisted?.photoURL) return persisted.photoURL;
    }
    return '';
  };

  const resolveInitialName = () => {
    if (isCurrentLoggedInUser && (currentUserProfile?.displayName || currentUserProfile?.username)) {
      return currentUserProfile.displayName || currentUserProfile.username;
    }
    if (fallbackDisplayName && fallbackDisplayName.trim()) return fallbackDisplayName.trim();
    if (uid) {
      const u = userService.getCachedUserProfile(uid);
      if (u) return u.displayName || u.username;
      const persisted = getPersistedAvatar(uid);
      if (persisted?.displayName) return persisted.displayName;
    }
    return '';
  };

  const initialPhoto = resolveInitialPhoto();

  const [livePhoto, setLivePhoto] = useState<string>(initialPhoto);
  const [liveDisplayName, setLiveDisplayName] = useState<string>(resolveInitialName);

  const [imgError, setImgError] = useState(false);
  // Default to true if we already have a photo URL, eliminating avatar flicker/delay!
  const [isImgLoaded, setIsImgLoaded] = useState<boolean>(() => Boolean(initialPhoto));

  // Pre-seed cache if valid fallback photo is passed
  useEffect(() => {
    if (uid && fallbackPhotoURL && fallbackPhotoURL.trim()) {
      updateUserAvatarCache(uid, fallbackPhotoURL.trim(), fallbackDisplayName || '');
    }
  }, [uid, fallbackPhotoURL, fallbackDisplayName]);

  // Synchronize when current user profile updates
  useEffect(() => {
    if (isCurrentLoggedInUser && currentUserProfile) {
      if (currentUserProfile.photoURL) {
        setLivePhoto(currentUserProfile.photoURL);
        setImgError(false);
        setIsImgLoaded(true);
        if (currentUser?.uid) {
          updateUserAvatarCache(
            currentUser.uid,
            currentUserProfile.photoURL,
            currentUserProfile.displayName || currentUserProfile.username || ''
          );
        }
      } else {
        setLivePhoto('');
        setIsImgLoaded(false);
      }
      if (currentUserProfile.displayName || currentUserProfile.username) {
        setLiveDisplayName(currentUserProfile.displayName || currentUserProfile.username);
      }
    }
  }, [isCurrentLoggedInUser, currentUser?.uid, currentUserProfile?.photoURL, currentUserProfile?.displayName, currentUserProfile?.username]);

  // Reset and synchronize whenever uid or fallback props change so another user's avatar never leaks through
  useEffect(() => {
    if (!isCurrentLoggedInUser) {
      const nextPhoto = resolveInitialPhoto();
      const nextName = resolveInitialName();
      setLivePhoto(nextPhoto);
      setLiveDisplayName(nextName);
      setImgError(false);
      setIsImgLoaded(Boolean(nextPhoto));
    }
  }, [uid, fallbackPhotoURL, fallbackDisplayName, isCurrentLoggedInUser]);

  // Listen for global user avatar updates
  useEffect(() => {
    if (!uid) return;
    const handleAvatarUpdate = (e: any) => {
      const detail = e.detail;
      if (detail && detail.uid === uid) {
        if (detail.photoURL) {
          setLivePhoto(detail.photoURL);
          setImgError(false);
          setIsImgLoaded(true);
        }
        if (detail.displayName) {
          setLiveDisplayName(detail.displayName);
        }
      }
    };

    window.addEventListener('si_user_avatar_updated', handleAvatarUpdate);
    return () => {
      window.removeEventListener('si_user_avatar_updated', handleAvatarUpdate);
    };
  }, [uid]);

  // Background fetch for remote profiles only if no photo or name is available
  useEffect(() => {
    if (isCurrentLoggedInUser) return;
    let active = true;

    if (uid) {
      const cachedProfile = userService.getCachedUserProfile(uid);
      const cachedHasExplicitPhoto = Boolean(cachedProfile && typeof cachedProfile.photoURL === 'string');
      const persisted = getPersistedAvatar(uid);

      if (!fallbackPhotoURL && !cachedHasExplicitPhoto && persisted?.photoURL) {
        setLivePhoto(persisted.photoURL);
        setImgError(false);
        setIsImgLoaded(true);
      }
      if (!fallbackDisplayName && persisted?.displayName) {
        setLiveDisplayName(persisted.displayName);
      }

      // Fetch from Firestore once per session if not already cached in userService memory cache
      if (!fallbackPhotoURL && !cachedHasExplicitPhoto) {
        userService.getUserProfile(uid).then(profile => {
          if (!active || !profile) return;
          const cleanPhoto = (profile.photoURL || '').trim();
          const cleanName = profile.displayName || profile.username || '';
          updateUserAvatarCache(uid, cleanPhoto, cleanName);
          setLivePhoto(cleanPhoto);
          setImgError(false);
          setIsImgLoaded(Boolean(cleanPhoto));
          if (cleanName) {
            setLiveDisplayName(cleanName);
          }
        }).catch(() => {});
      }
    } else if (fallbackDisplayName && !fallbackPhotoURL) {
      userService.getUserByUsername(fallbackDisplayName).then(uProfile => {
        if (!active || !uProfile) return;
        if (uProfile.photoURL) {
          if (uProfile.uid) {
            updateUserAvatarCache(uProfile.uid, uProfile.photoURL, uProfile.displayName || uProfile.username || '');
          }
          setLivePhoto(uProfile.photoURL);
          setImgError(false);
          setIsImgLoaded(true);
        }
        if (uProfile.displayName || uProfile.username) {
          setLiveDisplayName(uProfile.displayName || uProfile.username);
        }
      }).catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [uid, fallbackDisplayName, fallbackPhotoURL, isCurrentLoggedInUser]);

  // Compute final effective photo & name
  const effectivePhoto = useMemo(() => {
    if (isCurrentLoggedInUser) {
      return (currentUserProfile?.photoURL || livePhoto || fallbackPhotoURL || '').trim();
    }
    const cachedUser = uid ? userService.getCachedUserProfile(uid) : null;
    if (fallbackPhotoURL && fallbackPhotoURL.trim()) {
      return fallbackPhotoURL.trim();
    }
    if (cachedUser && typeof cachedUser.photoURL === 'string') {
      return (livePhoto || cachedUser.photoURL).trim();
    }
    const raw =
      livePhoto ||
      (uid ? (profileCache[uid]?.photoURL || getPersistedAvatar(uid)?.photoURL || '') : '') ||
      '';

    return raw.trim();
  }, [isCurrentLoggedInUser, currentUserProfile?.photoURL, livePhoto, uid, fallbackPhotoURL]);

  const effectiveDisplayName = useMemo(() => {
    return (
      (isCurrentLoggedInUser && (currentUserProfile?.displayName || currentUserProfile?.username)
        ? (currentUserProfile.displayName || currentUserProfile.username)
        : '') ||
      liveDisplayName ||
      fallbackDisplayName ||
      'User'
    ).trim();
  }, [isCurrentLoggedInUser, currentUserProfile?.displayName, currentUserProfile?.username, liveDisplayName, fallbackDisplayName]);

  // Check image readiness upon source changes
  useEffect(() => {
    setImgError(false);
    if (!effectivePhoto) {
      setIsImgLoaded(false);
      return;
    }
    // Check if the image element is already cached and loaded
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsImgLoaded(true);
    } else {
      setIsImgLoaded(false);
    }
  }, [effectivePhoto]);

  const hasPhoto = Boolean(effectivePhoto && !imgError);
  const initial = getYouTubeInitial(effectiveDisplayName);
  const solidColor = getYouTubeColor(effectiveDisplayName || uid || 'User');

  // Sizing maps matching YouTube specifications
  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'w-6 h-6 min-w-[24px] min-h-[24px] text-[11px]';
      case 'sm':
        return 'w-9 h-9 min-w-[36px] min-h-[36px] text-sm';
      case 'lg':
        return 'w-12 h-12 min-w-[48px] min-h-[48px] text-lg';
      case 'xl':
        return 'w-16 h-16 min-w-[64px] min-h-[64px] text-2xl';
      case 'md':
      default:
        return 'w-10 h-10 min-w-[40px] min-h-[40px] text-base';
    }
  };

  const sizeStyle = getSizeStyles();

  return (
    <div 
      onClick={onClick}
      style={{
        backgroundColor: solidColor,
        color: '#ffffff'
      }}
      className={`relative ${sizeStyle} !rounded-full overflow-hidden flex items-center justify-center font-medium shrink-0 select-none shadow-xs transition-transform ${
        onClick ? 'cursor-pointer hover:opacity-95 active:scale-95' : ''
      } ${className}`}
    >
      {/* YouTube Default Fallback: Authentic Single Letter or Classic YouTube Silhouette */}
      <div className="w-full h-full flex items-center justify-center font-semibold text-white leading-none select-none tracking-normal !rounded-full">
        {initial ? (
          <span className="uppercase transform translate-y-[-0.5px]">{initial}</span>
        ) : (
          <svg 
            viewBox="0 0 24 24" 
            className="w-[60%] h-[60%] fill-current text-white/95" 
            aria-hidden="true"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>

      {/* Real Image Layer: Smoothly layered on top with no-referrer for reliable CDN/Google photo loading */}
      {hasPhoto && (
        <img 
          ref={imgRef}
          src={effectivePhoto} 
          alt={effectiveDisplayName} 
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onLoad={() => {
            setIsImgLoaded(true);
            setImgError(false);
          }}
          onError={() => {
            setImgError(true);
            setIsImgLoaded(false);
          }}
          className={`absolute inset-0 w-full h-full object-cover !rounded-full pointer-events-none transition-opacity duration-150 ${
            isImgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
