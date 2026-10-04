import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { formatViews, formatTimeAgo, formatDuration, getInitials, extractYoutubeThumbnail } from '../utils/videoUtils';
import { useRouter } from '../hooks/useRouter';
import { UserAvatar } from './UserAvatar';
import { userService } from '../services/userService';

interface CacheEntry {
  verified: boolean;
  expiry: number;
}

// Simple in-memory cache to store verified creator status with 5-minute TTL
const creatorVerificationCache: Record<string, CacheEntry> = {};

interface VideoCardProps {
  video: Video;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const { navigate } = useRouter();
  const [isVerified, setIsVerified] = useState<boolean>(false);

  useEffect(() => {
    if (!video.creatorId) return;
    
    const now = Date.now();
    const cached = creatorVerificationCache[video.creatorId];
    if (cached && cached.expiry > now) {
      setIsVerified(cached.verified);
      return;
    }

    userService.getUserProfile(video.creatorId).then(profile => {
      const verified = profile?.role === 'creator' || profile?.role === 'admin';
      creatorVerificationCache[video.creatorId] = {
        verified,
        expiry: Date.now() + 5 * 60 * 1000 // 5 minutes TTL
      };
      setIsVerified(verified);
    }).catch(() => {
      creatorVerificationCache[video.creatorId] = {
        verified: false,
        expiry: Date.now() + 5 * 60 * 1000
      };
      setIsVerified(false);
    });
  }, [video.creatorId]);

  const handleCardClick = () => {
    if (video.isShort) {
      navigate('shorts', video.videoId);
    } else {
      navigate('watch', video.videoId);
    }
  };

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('creator', video.creatorUsername);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group cursor-pointer flex flex-col transition-all duration-200 w-full"
    >
      {/* Thumbnail area with duration badge */}
      <div className={`relative w-full ${video.isShort ? 'aspect-[9/16] max-w-[240px]' : 'aspect-video'} bg-slate-900 dark:bg-[#1e293b] shrink-0 rounded-2xl overflow-hidden shadow-xs border border-slate-100 dark:border-slate-800/80`}>
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            const ytThumb = extractYoutubeThumbnail(video.videoUrl);
            e.currentTarget.src = ytThumb || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60";
          }}
        />
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white font-bold text-[11px] rounded-md backdrop-blur-sm">
          {formatDuration(video.duration)}
        </div>
        
        {video.isShort && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white font-black text-[9px] rounded-md uppercase tracking-widest shadow-sm">
            Shorts
          </div>
        )}
      </div>

      {/* Content block */}
      <div className="mt-3 flex items-start gap-3">
        {/* Creator avatar - using centralized sync component */}
        <UserAvatar 
          uid={video.creatorId}
          fallbackPhotoURL={video.creatorPhotoURL}
          fallbackDisplayName={video.creatorDisplayName || video.creatorUsername}
          size="sm"
          onClick={handleCreatorClick}
          className="border border-slate-100 dark:border-slate-800 shadow-xs"
        />

        {/* Video metadata */}
        <div className="flex-1 min-w-0 pr-1">
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {video.title}
          </h3>
          <div className="flex flex-col text-[12px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            <p 
              onClick={handleCreatorClick}
              className="hover:text-slate-900 dark:hover:text-white transition-colors truncate w-fit font-semibold flex items-center gap-1"
            >
              <span>{video.creatorDisplayName || video.creatorUsername || 'Creator'}</span>
              {isVerified && (
                <span className="inline-flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-[8px] w-3.5 h-3.5 rounded-full font-black shrink-0" title="Verified Creator">✓</span>
              )}
            </p>
            <div className="flex items-center gap-1 mt-0.5 text-slate-500 dark:text-slate-400">
              <span>{formatViews(video.viewsCount)}</span>
              <span className="text-[8px] opacity-40">•</span>
              <span>{formatTimeAgo(video.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
