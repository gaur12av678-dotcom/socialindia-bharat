import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { formatViews, formatTimeAgo, formatDuration, getInitials, extractYoutubeThumbnail } from '../utils/videoUtils';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { downloadService } from '../services/downloadService';
import { savedVideoService } from '../services/savedVideoService';
import { videoService } from '../services/videoService';
import { UserAvatar } from './UserAvatar';
import { ShortsLogo } from './ShortsLogo';
import { userService } from '../services/userService';
import { playbackProgressService } from '../services/playbackProgressService';
import { liveBroadcastService } from '../services/liveBroadcastService';
import { useTranslation } from '../i18n';
import { isUserVerified } from '../utils/userUtils';
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
  index?: number;
  priority?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, index = 0, priority = false }) => {
  const { navigate } = useRouter();
  const { currentUser, addToast } = useApp();
  const { t, isHindi, formatTime } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    if (!video.creatorId) return false;
    const cached = creatorVerificationCache[video.creatorId];
    if (cached) return cached.verified;
    const profile = userService.getCachedUserProfile(video.creatorId);
    if (profile) return isUserVerified(profile);
    return false;
  });
  const [showMenu, setShowMenu] = useState(false);

  // Dynamic live stream status - reacts immediately when live stream ends on YouTube
  const [isLive, setIsLive] = useState<boolean>(() => 
    Boolean(video.isLive && !liveBroadcastService.isLiveEnded(video.videoId))
  );
  const [videoDuration, setVideoDuration] = useState<number>(video.duration || 0);

  useEffect(() => {
    setIsLive(Boolean(video.isLive && !liveBroadcastService.isLiveEnded(video.videoId)));
    setVideoDuration(video.duration || 0);
  }, [video.videoId, video.isLive, video.duration]);

  useEffect(() => {
    const handleStreamEnded = (e: any) => {
      if (!e.detail?.videoId || e.detail.videoId === video.videoId) {
        setIsLive(false);
        if (e.detail?.duration) {
          setVideoDuration(e.detail.duration);
        }
      }
    };
    window.addEventListener('socialindia:live-stream-ended', handleStreamEnded);
    return () => window.removeEventListener('socialindia:live-stream-ended', handleStreamEnded);
  }, [video.videoId]);

  // YouTube-style watch progress percentage
  const [watchProgressPercent, setWatchProgressPercent] = useState<number>(() => {
    return playbackProgressService.getProgressPercent(video.videoId, video.duration);
  });

  useEffect(() => {
    const onProgressUpdated = (e: any) => {
      if (!e.detail?.videoId || e.detail.videoId === video.videoId) {
        setWatchProgressPercent(playbackProgressService.getProgressPercent(video.videoId, video.duration));
      }
    };
    window.addEventListener('socialindia:playback-progress-updated', onProgressUpdated);
    return () => window.removeEventListener('socialindia:playback-progress-updated', onProgressUpdated);
  }, [video.videoId, video.duration]);

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

    // Check memory profile cache before initiating network request
    const existing = userService.getCachedUserProfile(video.creatorId);
    if (existing) {
      const verified = isUserVerified(existing);
      creatorVerificationCache[video.creatorId] = {
        verified,
        expiry: Date.now() + 10 * 60 * 1000
      };
      setIsVerified(verified);
      return;
    }

    // Defer network fetch by 1s so initial feed rendering & image downloads are never blocked
    const timer = setTimeout(() => {
      userService.getUserProfile(video.creatorId).then(profile => {
        const verified = isUserVerified(profile);
        creatorVerificationCache[video.creatorId] = {
          verified,
          expiry: Date.now() + 10 * 60 * 1000
        };
        setIsVerified(verified);
      }).catch(() => {
        creatorVerificationCache[video.creatorId] = {
          verified: false,
          expiry: Date.now() + 10 * 60 * 1000
        };
        setIsVerified(false);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [video.creatorId, video.creatorDisplayName, video.creatorPhotoURL, video.creatorUsername]);

  const watchUrl = video.isShort ? `#/shorts/${video.videoId}` : `#/watch/${video.videoId}`;
  const creatorUrl = video.creatorUsername ? `#/@${video.creatorUsername}` : `#/creator/${video.creatorId}`;

  const handleCardClick = (e?: React.MouseEvent) => {
    // If middle click or Cmd/Ctrl/Shift key, let the browser handle opening in a new tab natively!
    if (e && (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey)) {
      return;
    }
    if (e) e.preventDefault();
    videoService.cacheVideo(video);
    if (video.isShort) {
      navigate('shorts', video.videoId);
    } else {
      navigate('watch', video.videoId);
    }
  };

  const handleCreatorClick = (e: React.MouseEvent) => {
    if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    navigate('creator', video.creatorUsername || video.creatorId);
  };

  return (
    <div 
      style={{
        animationDelay: `${Math.min(index, 12) * 45}ms`
      }}
      className="yt-card-animate group flex flex-col transition-all duration-200 w-full"
    >
      {/* Thumbnail area with duration badge (wrapped in anchor tag with draggable image disabled so dragging transfers the video watch link, opening the actual video page with title & creator!) */}
      <a
        href={watchUrl}
        onClick={handleCardClick}
        draggable={true}
        title={video.title}
        className={`relative block w-full ${video.isShort ? 'aspect-[9/16] max-w-[240px]' : 'aspect-video'} bg-slate-100 dark:bg-[#1a2333] shrink-0 rounded-2xl overflow-hidden shadow-xs border border-slate-100 dark:border-slate-800/80 cursor-pointer`}
      >
        {/* Progressive shimmer placeholder while image loads */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700/50" />
          </div>
        )}

        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          draggable={false}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 pointer-events-none select-none ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onError={(e) => {
            setImageLoaded(true);
            const ytThumb = extractYoutubeThumbnail(video.videoUrl);
            e.currentTarget.src = ytThumb || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60";
          }}
        />
        {isLive ? (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-md tracking-wider shadow-md flex items-center gap-1.5 uppercase pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        ) : (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white font-bold text-[11px] rounded-md backdrop-blur-sm pointer-events-none">
            {formatDuration(videoDuration)}
          </div>
        )}
        
        {video.isShort && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white font-black text-[9px] rounded-md uppercase tracking-widest shadow-sm pointer-events-none flex items-center gap-1.5">
            <ShortsLogo className="w-3 h-3" />
            <span>Shorts</span>
          </div>
        )}

        {/* YouTube Red Watch Progress Bar */}
        {watchProgressPercent > 0 && !video.isShort && !isLive && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/25 overflow-hidden z-10 pointer-events-none">
            <div 
              className="h-full bg-red-600 transition-all duration-300"
              style={{ width: `${watchProgressPercent}%` }}
            />
          </div>
        )}
      </a>

      {/* Content block */}
      <div className="mt-3 flex items-start gap-3">
        {/* Creator avatar - using centralized sync component */}
        <a 
          href={creatorUrl}
          onClick={handleCreatorClick}
          className="shrink-0 block"
          title={video.creatorDisplayName || video.creatorUsername}
        >
          <UserAvatar 
            uid={video.creatorId}
            fallbackPhotoURL={video.creatorPhotoURL}
            fallbackDisplayName={video.creatorDisplayName || video.creatorUsername}
            size="sm"
            className="border border-slate-100 dark:border-slate-800 shadow-xs cursor-pointer hover:opacity-90"
          />
        </a>

        {/* Video metadata */}
        <div className="flex-1 min-w-0 pr-1">
          <a
            href={watchUrl}
            onClick={handleCardClick}
            draggable={true}
            title={video.title}
            className="block text-[14px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
          >
            {video.title}
          </a>
          <div className="flex flex-col text-[12px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            <a 
              href={creatorUrl}
              onClick={handleCreatorClick}
              className="hover:text-slate-900 dark:hover:text-white transition-colors truncate w-fit font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{video.creatorDisplayName || video.creatorUsername || 'Creator'}</span>
              {isVerified && (
                <span className="inline-flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-[8px] w-3.5 h-3.5 rounded-full font-black shrink-0" title="Verified Creator">✓</span>
              )}
            </a>
            <div className="flex items-center gap-1 mt-0.5 text-slate-500 dark:text-slate-400">
              {isLive ? (
                <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  {formatViews(video.viewsCount || 0)} {isHindi ? 'लाइव देख रहे हैं' : 'watching now'}
                </span>
              ) : (
                <>
                  <span>{formatViews(video.viewsCount)} {isHindi ? 'व्यूज़' : ''}</span>
                  <span className="text-[8px] opacity-40">•</span>
                  <span>{formatTime(video.createdAt)}</span>
                </>
              )}
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
                  setShowMenu(false);
                  if (!currentUser) {
                    addToast(isHindi ? 'वीडियो सहेजने के लिए कृपया साइन इन करें' : 'Please sign in to save videos', 'info');
                    navigate('signin');
                    return;
                  }
                  savedVideoService.saveVideo(currentUser.uid, video);
                  addToast(isHindi ? 'प्लेलिस्ट में सहेजा गया!' : 'Saved to playlist!', 'success');
                }}
                className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                <span>{isHindi ? 'प्लेलिस्ट में सहेजें' : 'Save to Playlist'}</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  if (!currentUser) {
                    addToast(isHindi ? 'वीडियो सहेजने के लिए कृपया साइन इन करें' : 'Please sign in to save videos', 'info');
                    navigate('signin');
                    return;
                  }
                  savedVideoService.saveVideo(currentUser.uid, video);
                  addToast(isHindi ? 'बाद में देखने के लिए सहेजा गया!' : 'Saved to Watch Later!', 'success');
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
