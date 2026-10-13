import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { useApp } from '../context/AppContext';
import { getInitials } from '../utils/videoUtils';

interface UserAvatarProps {
  uid?: string;
  fallbackPhotoURL?: string;
  fallbackDisplayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

// 8 Vibrant colors for fallback avatar backgrounds
const avatarColors = [
  '#2563eb', // Blue
  '#e11d48', // Rose
  '#059669', // Emerald
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#4f46e5', // Indigo
];

function getColorForName(str: string): string {
  if (!str) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
}

// Global in-memory cache to sync profile avatars across all components
const profileCache: Record<string, { photoURL: string; displayName: string }> = {};

export function updateUserAvatarCache(uid: string, photoURL: string, displayName: string = '') {
  if (!uid) return;
  profileCache[uid] = { photoURL, displayName };
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

  // Check if this avatar belongs to the currently logged in user
  const isCurrentLoggedInUser = Boolean(
    (uid && currentUser?.uid && currentUser.uid === uid) || 
    (fallbackDisplayName && currentUserProfile?.username && currentUserProfile.username.toLowerCase() === fallbackDisplayName.toLowerCase()) ||
    (fallbackDisplayName && currentUserProfile?.displayName && currentUserProfile.displayName.toLowerCase() === fallbackDisplayName.toLowerCase()) ||
    (uid && currentUserProfile?.username && currentUserProfile.username.toLowerCase() === uid.toLowerCase())
  );

  const [fetchedPhoto, setFetchedPhoto] = useState<string>(() => {
    if (isCurrentLoggedInUser && currentUserProfile?.photoURL) return currentUserProfile.photoURL;
    if (uid && profileCache[uid]?.photoURL) return profileCache[uid].photoURL;
    if (uid) {
      const u = userService.getCachedUserProfile(uid);
      if (u?.photoURL) return u.photoURL;
    }
    return fallbackPhotoURL || '';
  });
  const [fetchedName, setFetchedName] = useState<string>(() => {
    if (isCurrentLoggedInUser && (currentUserProfile?.displayName || currentUserProfile?.username)) {
      return currentUserProfile.displayName || currentUserProfile.username;
    }
    if (uid && profileCache[uid]?.displayName) return profileCache[uid].displayName;
    if (uid) {
      const u = userService.getCachedUserProfile(uid);
      if (u) return u.displayName || u.username;
    }
    return fallbackDisplayName || '';
  });
  const [imgError, setImgError] = useState(false);

  // Sync current user profile into cache whenever it updates
  useEffect(() => {
    if (currentUser?.uid && currentUserProfile) {
      if (currentUserProfile.photoURL) {
        profileCache[currentUser.uid] = {
          photoURL: currentUserProfile.photoURL,
          displayName: currentUserProfile.displayName || currentUserProfile.username || ''
        };
      }
    }
  }, [currentUser?.uid, currentUserProfile?.photoURL, currentUserProfile?.displayName]);

  // Fetch or retrieve from cache for any UID
  useEffect(() => {
    setImgError(false);

    if (isCurrentLoggedInUser && currentUserProfile?.photoURL) {
      setFetchedPhoto(currentUserProfile.photoURL);
      return;
    }

    if (uid) {
      if (profileCache[uid]?.photoURL) {
        setFetchedPhoto(profileCache[uid].photoURL);
        setFetchedName(profileCache[uid].displayName);
      }
      
      // Always fetch latest profile in background to keep avatar up-to-date
      userService.getUserProfile(uid).then(profile => {
        if (profile) {
          if (profile.photoURL) {
            profileCache[uid] = { 
              photoURL: profile.photoURL, 
              displayName: profile.displayName || profile.username 
            };
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
              profileCache[uProfile.uid] = { 
                photoURL: uProfile.photoURL, 
                displayName: uProfile.displayName || uProfile.username 
              };
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
  // 1. Live Context Photo if it matches current logged in creator (from Settings!)
  // 2. Freshly fetched or cached Photo from Firestore User Document (so settings updates reflect on all videos!)
  // 3. Directly provided fallbackPhotoURL
  const liveUserPhoto = isCurrentLoggedInUser && currentUserProfile?.photoURL ? currentUserProfile.photoURL : '';
  const cachedPhoto = uid && profileCache[uid]?.photoURL ? profileCache[uid].photoURL : '';
  const resolvedPhoto = liveUserPhoto || fetchedPhoto || cachedPhoto || fallbackPhotoURL;

  const liveUserName = isCurrentLoggedInUser && (currentUserProfile?.displayName || currentUserProfile?.username) 
    ? (currentUserProfile.displayName || currentUserProfile.username) 
    : '';
  const effectiveDisplayName = liveUserName || fetchedName || fallbackDisplayName || uid || 'User';

  const hasValidPhoto = Boolean(resolvedPhoto && resolvedPhoto.trim() && !imgError);
  const bgColor = getColorForName(effectiveDisplayName);

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

  return (
    <div 
      onClick={onClick}
      style={{
        backgroundColor: hasValidPhoto ? 'transparent' : bgColor,
        color: '#ffffff'
      }}
      className={`${sizeStyle} rounded-full overflow-hidden flex items-center justify-center font-black shrink-0 select-none shadow-xs transition-transform ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} ${className}`}
    >
      {hasValidPhoto ? (
        <img 
          src={resolvedPhoto} 
          alt={effectiveDisplayName} 
          className="w-full h-full object-cover rounded-full" 
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-white font-bold leading-none select-none tracking-wider">
          {getInitials(effectiveDisplayName)}
        </span>
      )}
    </div>
  );
};
