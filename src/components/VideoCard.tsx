import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { formatViews, formatTimeAgo, formatDuration, getInitials, extractYoutubeThumbnail } from '../utils/videoUtils';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { downloadService } from '../services/downloadService';
import { savedVideoService } from '../services/savedVideoService';
import { videoService } from '../services/videoService';
import { UserAvatar } from './UserAvatar';
import { userService } from '../services/userService';
import { useTranslation } from '../i18n';
import { 
  MoreVertical, 
  Share2, 
  ArrowDownToLine, 
  Bookmark, 
  Clock, 
  Ban 
} from 'lucide-react';

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
  const { currentUser, addToast } = useApp();
  const { t, isHindi, formatTime } = useTranslation();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleOutsideClick = () => setShowMenu(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!video.creatorId) return;

    // Pre-cache creator profile info for instant loading across channels, avatars and names
    if (video.creatorDisplayName || video.creatorPhotoURL || video.creatorUsername) {
      userService.cacheUserProfile({
        uid: video.creatorId,
        displayName: video.creatorDisplayName,
        username: video.creatorUsername,
        photoURL: video.creatorPhotoURL
      });
    }
    
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
  }, [video.creatorId, video.creatorDisplayName, video.creatorPhotoURL, video.creatorUsername]);

  const handleCardClick = () => {
    videoService.cacheVideo(video);
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
              <span>{formatViews(video.viewsCount)} {isHindi ? 'व्यूज़' : ''}</span>
              <span className="text-[8px] opacity-40">•</span>
              <span>{formatTime(video.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 3-Dots Menu Button (⋮) */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title={isHindi ? 'वीडियो विकल्प' : 'Video options'}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* 3-Dots Dropdown Popover */}
          {showMenu && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-7 w-48 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in"
            >
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/#/watch/${video.videoId}`;
                  if (navigator.share) {
                    navigator.share({ title: video.title, url: shareUrl }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(shareUrl);
                    addToast(t('link_copied', 'Link copied to clipboard!'), 'success');
                  }
                  setShowMenu(false);
                }}
                className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('action_share', 'Share')}</span>
              </button>

              <button
                onClick={async () => {
                  addToast(isHindi ? 'वीडियो डाउनलोड हो रहा है...' : 'Downloading video...', 'info');
                  try {
                    await downloadService.downloadVideo(video, () => {});
                    addToast(isHindi ? 'वीडियो डाउनलोड्स में सहेज लिया गया!' : 'Video saved to Downloads!', 'success');
                  } catch (err) {
                    addToast(isHindi ? 'डाउनलोड प्रारंभ!' : 'Download initiated!', 'info');
                  }
                  setShowMenu(false);
                }}
                className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('action_download', 'Download')}</span>
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    addToast(isHindi ? 'वीडियो सहेजने के लिए कृपया साइन इन करें' : 'Please sign in to save videos', 'info');
                  } else {
                    savedVideoService.saveVideo(currentUser.uid, video);
                    addToast(isHindi ? 'प्लेलिस्ट में सहेजा गया!' : 'Saved to playlist!', 'success');
                  }
                  setShowMenu(false);
                }}
                className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                <span>{isHindi ? 'प्लेलिस्ट में सहेजें' : 'Save to Playlist'}</span>
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    addToast(isHindi ? 'वीडियो सहेजने के लिए कृपया साइन इन करें' : 'Please sign in to save videos', 'info');
                  } else {
                    savedVideoService.saveVideo(currentUser.uid, video);
                    addToast(isHindi ? 'बाद में देखने के लिए सहेजा गया!' : 'Saved to Watch Later!', 'success');
                  }
                  setShowMenu(false);
                }}
                className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{isHindi ? 'बाद में देखें (Watch Later)' : 'Save to Watch Later'}</span>
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

              <button
                onClick={() => {
                  addToast(isHindi ? 'आपकी प्रतिक्रिया नोट की गई। ऐसे वीडियो कम दिखाए जाएंगे।' : 'Feedback noted. We will recommend fewer videos like this.', 'info');
                  setShowMenu(false);
                }}
                className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-500 font-medium cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5 text-slate-400" />
                <span>{isHindi ? 'रुचि नहीं है' : 'Not interested'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
