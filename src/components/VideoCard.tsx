import React from 'react';
import { Video } from '../types';
import { formatViews, formatTimeAgo, formatDuration, getInitials, extractYoutubeThumbnail } from '../utils/videoUtils';
import { useRouter } from '../hooks/useRouter';
import { UserAvatar } from './UserAvatar';

interface VideoCardProps {
  video: Video;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const { navigate } = useRouter();

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
      className="group cursor-pointer flex flex-col transition-all duration-200"
    >
      {/* Thumbnail area with duration badge */}
      <div className={`relative ${video.isShort ? 'aspect-[9/16] max-w-[240px]' : 'aspect-video'} bg-slate-100 dark:bg-[#1e293b] shrink-0 rounded-xl overflow-hidden`}>
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
      <div className="mt-3 flex gap-3">
        {/* Creator avatar - using centralized sync component */}
        <UserAvatar 
          uid={video.creatorId}
          fallbackPhotoURL={video.creatorPhotoURL}
          fallbackDisplayName={video.creatorDisplayName}
          size="sm"
          onClick={handleCreatorClick}
          className="border border-slate-100 dark:border-slate-800"
        />

        {/* Video metadata */}
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-[1.3] line-clamp-2 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {video.title}
          </h3>
          <div className="flex flex-col text-[13px] text-slate-500 dark:text-[#94a3b8] font-medium leading-relaxed">
            <p 
              onClick={handleCreatorClick}
              className="hover:text-slate-900 dark:hover:text-white transition-colors truncate w-fit"
            >
              {video.creatorDisplayName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span>{formatViews(video.viewsCount)} views</span>
              <span className="text-[8px] opacity-40">•</span>
              <span>{formatTimeAgo(video.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
