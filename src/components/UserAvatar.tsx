import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { userService } from '../services/userService';
import { getInitials } from '../utils/videoUtils';

interface UserAvatarProps {
  uid: string;
  fallbackPhotoURL?: string;
  fallbackDisplayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

// Session-based cache to avoid redundant fetches
const profileCache: Record<string, { photoURL: string; displayName: string }> = {};

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  uid, 
  fallbackPhotoURL = '', 
  fallbackDisplayName = '',
  size = 'md',
  className = '',
  onClick
}) => {
  const [photoURL, setPhotoURL] = useState(profileCache[uid]?.photoURL || fallbackPhotoURL);
  const [displayName, setDisplayName] = useState(profileCache[uid]?.displayName || fallbackDisplayName);

  useEffect(() => {
    // If we have a uid and no cached photo, or we want to ensure it's fresh
    if (uid && !profileCache[uid]) {
      userService.getUserProfile(uid).then(profile => {
        if (profile) {
          const updatedPhoto = profile.photoURL || '';
          const updatedName = profile.displayName || '';
          
          profileCache[uid] = { photoURL: updatedPhoto, displayName: updatedName };
          setPhotoURL(updatedPhoto);
          setDisplayName(updatedName);
        }
      }).catch(err => {
        console.warn(`Failed to fetch profile for avatar sync: ${uid}`, err);
      });
    }
  }, [uid]);

  const sizeClasses = {
    'xs': 'w-6 h-6 text-[8px]',
    'sm': 'w-8 h-8 text-[10px]',
    'md': 'w-10 h-10 text-xs',
    'lg': 'w-12 h-12 text-sm',
    'xl': 'w-16 h-16 text-base'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses['md'];

  return (
    <div 
      onClick={onClick}
      className={`${currentSizeClass} rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white font-black shrink-0 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
    >
      {photoURL ? (
        <img 
          src={photoURL} 
          alt={displayName} 
          className="w-full h-full object-cover" 
          onError={() => setPhotoURL('')}
        />
      ) : (
        <span>{getInitials(displayName || 'U')}</span>
      )}
    </div>
  );
};
