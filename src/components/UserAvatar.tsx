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

  const isCurrentLoggedInUser = Boolean(
    (uid && currentUser?.uid && currentUser.uid === uid) || 
    (fallbackNameLower && currentUsernameLower && currentUsernameLower === fallbackNameLower) ||
    (fallbackNameLower && currentDisplayNameLower && currentDisplayNameLower === fallbackNameLower) ||
    (uidLower && currentUsernameLower && currentUsernameLower === uidLower)
  );

  const initialPhoto = (() => {
    if (isCurrentLoggedInUser && currentUserProfile?.photoURL) return currentUserProfile.photoURL;
    if (uid) {
      const persisted = getPersistedAvatar(uid);
      if (persisted?.photoURL) return persisted.photoURL;
      const u = userService.getCachedUserProfile(uid);
      if (u?.photoURL) return u.photoURL;
    }
    return (fallbackPhotoURL || '').trim();
  })();

  const [livePhoto, setLivePhoto] = useState<string>(initialPhoto);

  const [liveDisplayName, setLiveDisplayName] = useState<string>(() => {
    if (isCurrentLoggedInUser && (currentUserProfile?.displayName || currentUserProfile?.username)) {
      return currentUserProfile.displayName || currentUserProfile.username;
    }
    if (uid) {
      const persisted = getPersistedAvatar(uid);
      if (persisted?.displayName) return persisted.displayName;
      const u = userService.getCachedUserProfile(uid);
      if (u) return u.displayName || u.username;
    }
    return (fallbackDisplayName || '').trim();
  });

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
      }
      if (currentUserProfile.displayName || currentUserProfile.username) {
        setLiveDisplayName(currentUserProfile.displayName || currentUserProfile.username);
      }
    }
  }, [isCurrentLoggedInUser, currentUserProfile?.photoURL, currentUserProfile?.displayName, currentUserProfile?.username]);

  // Synchronize when fallback props change
  useEffect(() => {
    if (!isCurrentLoggedInUser) {
      if (fallbackPhotoURL && fallbackPhotoURL.trim()) {
        setLivePhoto(fallbackPhotoURL.trim());
        setImgError(false);
        setIsImgLoaded(true);
      }
      if (fallbackDisplayName && fallbackDisplayName.trim()) {
        setLiveDisplayName(fallbackDisplayName.trim());
      }
    }
  }, [fallbackPhotoURL, fallbackDisplayName, isCurrentLoggedInUser]);

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

    if (uid) {
      const persisted = getPersistedAvatar(uid);
      if (persisted?.photoURL) {
        setLivePhoto(persisted.photoURL);
        setIsImgLoaded(true);
      }
      if (persisted?.displayName) setLiveDisplayName(persisted.displayName);

      // If we already have a valid photo from props or persisted cache, DO NOT flood Firestore!
      if (!persisted?.photoURL && !fallbackPhotoURL) {
        userService.getUserProfile(uid).then(profile => {
          if (profile) {
            if (profile.photoURL) {
              updateUserAvatarCache(uid, profile.photoURL, profile.displayName || profile.username || '');
              setLivePhoto(profile.photoURL);
              setImgError(false);
              setIsImgLoaded(true);
            }
            if (profile.displayName || profile.username) {
              setLiveDisplayName(profile.displayName || profile.username);
            }
          }
        }).catch(() => {});
      }
    } else if (fallbackDisplayName && !fallbackPhotoURL) {
      userService.getUserByUsername(fallbackDisplayName).then(uProfile => {
        if (uProfile) {
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
        }
      }).catch(() => {});
    }
  }, [uid, fallbackDisplayName, fallbackPhotoURL, isCurrentLoggedInUser]);

  // Compute final effective photo & name
  const effectivePhoto = useMemo(() => {
    const raw = (
      (isCurrentLoggedInUser && currentUserProfile?.photoURL ? currentUserProfile.photoURL : '') ||
      livePhoto ||
      (uid ? (profileCache[uid]?.photoURL || getPersistedAvatar(uid)?.photoURL || '') : '') ||
      fallbackPhotoURL ||
      ''
    ).trim();

    return raw;
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
