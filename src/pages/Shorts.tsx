import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { recommendationService } from '../services/recommendationService';
import { userService } from '../services/userService';
import { likeService } from '../services/likeService';
import { commentService } from '../services/commentService';
import { downloadService } from '../services/downloadService';
import { subscriptionService } from '../services/subscriptionService';
import { savedVideoService } from '../services/savedVideoService';
import { DEFAULT_SOUNDS } from '../services/soundService';
import { Video, Comment, User } from '../types';
import { parseVideoUrl, getInitials, formatTimeAgo, formatViews } from '../utils/videoUtils';
import { isUserVerified } from '../utils/userUtils';
import { UserAvatar } from '../components/UserAvatar';
import { useTranslation } from '../i18n';
import {
  SITE_URL,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  applySeoMetadata,
  truncateSeoDescription,
} from '../utils/seo';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  AlertCircle,
  Film, 
  Zap,
  X, 
  Send, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  MoreVertical,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
  Save,
  Flag,
  Copy,
  Music,
  Bookmark,
  Lock,
  Wallet,
  Sparkles,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { paidVideoService } from '../services/paidVideoService';
import { SoundLibraryModal } from '../components/SoundLibraryModal';
import { SoundDetailsModal } from '../components/SoundDetailsModal';
import { SaveToPlaylistModal } from '../components/SaveToPlaylistModal';
import { ShortsLogo } from '../components/ShortsLogo';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Inner player for Shorts that autoplays reliably, handles browser audio autoplay restrictions, and synchronizes playback
const ShortVideoMedia: React.FC<{ 
  short: Video, 
  isPlaying: boolean, 
  volume: number, 
  isMuted: boolean,
  onMediaReady: () => void,
  onPlaybackStateChange?: (playing: boolean) => void,
}> = ({ short, isPlaying, volume, isMuted, onMediaReady, onPlaybackStateChange }) => {
  const parsedMedia = parseVideoUrl(short.videoUrl);
  const containerId = `yt-short-${short.videoId}`;
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const soundAudioRef = useRef<HTMLAudioElement>(null);
  const isMountedRef = useRef(true);
  const isPlayingRef = useRef(isPlaying);
  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);

  isPlayingRef.current = isPlaying;
  isMutedRef.current = isMuted;
  volumeRef.current = volume;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const vid = videoRef.current;
      if (vid) {
        try {
          vid.pause();
          vid.muted = true;
          vid.removeAttribute('src');
          vid.load();
        } catch (_) {}
      }
      const aud = soundAudioRef.current;
      if (aud) {
        try {
          aud.pause();
          aud.muted = true;
          aud.removeAttribute('src');
          aud.load();
        } catch (_) {}
      }
    };
  }, [short.videoId, short.videoUrl]);

  const [isFrameReady, setIsFrameReady] = useState(false);

  // A custom soundtrack is only used when the short explicitly references a non-original sound
  // or an external audio URL that is distinct from the video file itself.
  const resolvedSoundAudioUrl = useMemo(() => {
    // If sound is original audio (orig_sound_* or same as videoUrl), the sound is already inside the video!
    if (!short.soundId || short.soundId.startsWith('orig_sound_')) {
      return null;
    }
    if (short.soundAudioUrl && short.soundAudioUrl === short.videoUrl) {
      return null;
    }

    let url = short.soundAudioUrl;
    if (url && url.includes('pixabay.com')) {
      const fallback = DEFAULT_SOUNDS.find(s => s.soundId === short.soundId);
      url = fallback ? fallback.audioUrl : undefined;
    }
    if (!url && short.soundId) {
      const fallback = DEFAULT_SOUNDS.find(s => s.soundId === short.soundId);
      if (fallback) url = fallback.audioUrl;
    }
    // Only return if it's an audio link and not a YouTube/video link
    if (url && !url.includes('youtube.com') && !url.includes('youtu.be')) {
      return url;
    }
    return null;
  }, [short.soundAudioUrl, short.soundId, short.videoUrl]);

  // Sync volume and mute for direct video
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = resolvedSoundAudioUrl ? true : isMuted;
      video.defaultMuted = resolvedSoundAudioUrl ? true : isMuted;
    }
  }, [volume, isMuted, resolvedSoundAudioUrl]);

  // Sync play/pause for direct video with auto-mute fallback & async race protection
  useEffect(() => {
    const video = videoRef.current;
    if (!video || parsedMedia.type !== 'direct') return;

    let cancelled = false;
    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (cancelled || !isMountedRef.current || !isPlayingRef.current) {
              video.pause();
              return;
            }
            setIsFrameReady(true);
          })
          .catch((err) => {
            if (cancelled || !isMountedRef.current || !isPlayingRef.current) return;
            console.warn('Playback with audio restricted by browser policy, falling back to muted playback:', err);
            video.muted = true;
            video.play()
              .then(() => {
                if (cancelled || !isMountedRef.current || !isPlayingRef.current) {
                  video.pause();
                  return;
                }
                setIsFrameReady(true);
              })
              .catch(e => console.error('Muted playback retry failed:', e));
          });
      }
    } else {
      video.pause();
    }
    return () => {
      cancelled = true;
    };
  }, [isPlaying, short.videoId]);

  // Sync volume and mute for attached sound track
  useEffect(() => {
    if (soundAudioRef.current) {
      soundAudioRef.current.volume = volume;
      soundAudioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Sync play/pause for attached sound track
  useEffect(() => {
    if (soundAudioRef.current && resolvedSoundAudioUrl) {
      if (isPlaying && !isMuted) {
        soundAudioRef.current.play().catch(e => {
          console.warn('Autoplay sound audio pending interaction:', e);
        });
      } else {
        soundAudioRef.current.pause();
      }
    }
  }, [isPlaying, isMuted, resolvedSoundAudioUrl]);

  // Sync for YouTube
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      if (resolvedSoundAudioUrl || isMuted) {
        try { playerRef.current.mute(); } catch (_) {}
      } else {
        if (volume > 0) {
          try {
            if (typeof playerRef.current.unMute === 'function') {
              playerRef.current.unMute();
            }
            playerRef.current.setVolume(volume * 100);
          } catch (_) {}
        } else {
          try { playerRef.current.mute(); } catch (_) {}
        }
      }
    }
  }, [volume, isMuted, resolvedSoundAudioUrl]);

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      if (isPlaying) {
        try { playerRef.current.playVideo(); } catch (_) {}
      } else {
        try { playerRef.current.pauseVideo(); } catch (_) {}
      }
    }
  }, [isPlaying]);

  // Keep sound alive when user returns to browser tab ONLY if still mounted & playing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isMountedRef.current && isPlayingRef.current) {
        if (soundAudioRef.current && !isMutedRef.current && resolvedSoundAudioUrl) {
          soundAudioRef.current.play().catch(() => {});
        }
        if (videoRef.current) {
          videoRef.current.play().catch(() => {
            if (videoRef.current && isMountedRef.current && isPlayingRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          });
        }
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          try {
            playerRef.current.playVideo();
          } catch (_) {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, isMuted, volume, resolvedSoundAudioUrl]);

  useEffect(() => {
    if (parsedMedia.type !== 'youtube' || !parsedMedia.youtubeId) return;

    let isMounted = true;
    let pollInterval: any = null;
    let pollTimeout: any = null;

    const initShortPlayer = () => {
      if (!isMounted) return;
      if (!window.YT || !window.YT.Player) return;

      const element = document.getElementById(containerId);
      if (!element) return;

      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.mute?.();
          playerRef.current.pauseVideo?.();
          playerRef.current.stopVideo?.();
          playerRef.current.destroy();
        } catch (_) {}
      }

      playerRef.current = new window.YT.Player(containerId, {
        videoId: parsedMedia.youtubeId,
        playerVars: {
          autoplay: isPlayingRef.current ? 1 : 0,
          mute: isMutedRef.current ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          loop: 1,
          playlist: parsedMedia.youtubeId,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) {
              try {
                event.target.mute?.();
                event.target.pauseVideo?.();
                event.target.stopVideo?.();
                event.target.destroy?.();
              } catch (_) {}
              return;
            }
            onMediaReady();
            if (resolvedSoundAudioUrl || isMutedRef.current) {
              try { event.target.mute(); } catch (_) {}
            } else {
              try {
                event.target.setVolume(volumeRef.current * 100);
                event.target.unMute();
              } catch (_) {}
            }
            if (isPlayingRef.current) {
              try {
                event.target.playVideo();
              } catch (e) {
                try {
                  event.target.mute();
                  event.target.playVideo();
                } catch (_) {}
              }
            } else {
              try {
                event.target.pauseVideo();
              } catch (_) {}
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            if (event.data === 1) { // Playing
              if (!isPlayingRef.current) {
                try { event.target.pauseVideo(); } catch (_) {}
                return;
              }
              setIsFrameReady(true);
              onMediaReady();
              onPlaybackStateChange?.(true);
              if (!isMutedRef.current && !resolvedSoundAudioUrl) {
                try {
                  event.target.unMute();
                  event.target.setVolume(volumeRef.current * 100);
                } catch (_) {}
              }
              if (soundAudioRef.current && !isMutedRef.current && resolvedSoundAudioUrl) {
                soundAudioRef.current.play().catch(() => {});
              }
            } else if (event.data === 2) { // Paused
              onPlaybackStateChange?.(false);
              if (soundAudioRef.current) {
                soundAudioRef.current.pause();
              }
            } else if (event.data === 0) { // Ended
              if (isPlayingRef.current) {
                event.target.playVideo(); // Loop
                if (soundAudioRef.current && !isMutedRef.current) {
                  soundAudioRef.current.currentTime = 0;
                  soundAudioRef.current.play().catch(() => {});
                }
              }
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initShortPlayer();
    } else {
      pollInterval = setInterval(() => {
        if (!isMounted) {
          clearInterval(pollInterval);
          clearTimeout(pollTimeout);
          return;
        }
        if (window.YT && window.YT.Player) {
          clearInterval(pollInterval);
          clearTimeout(pollTimeout);
          initShortPlayer();
        }
      }, 60);
      pollTimeout = setTimeout(() => {
        clearInterval(pollInterval);
      }, 10000);

      const existingCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        clearInterval(pollInterval);
        clearTimeout(pollTimeout);
        if (typeof existingCb === 'function') existingCb();
        if (isMounted) initShortPlayer();
      };
      if (!document.querySelector('script[src*="iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (pollTimeout) clearTimeout(pollTimeout);
      if (playerRef.current) {
        try {
          playerRef.current.mute?.();
          playerRef.current.pauseVideo?.();
          playerRef.current.stopVideo?.();
          playerRef.current.destroy?.();
        } catch (e) {}
        playerRef.current = null;
      }
      if (soundAudioRef.current) {
        soundAudioRef.current.pause();
      }
    };
  }, [short.videoId, short.videoUrl, resolvedSoundAudioUrl]);

  const handleMediaReadyAndPlay = () => {
    setIsFrameReady(true);
    onMediaReady();
    const video = videoRef.current;
    if (video && isMountedRef.current && isPlayingRef.current && video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (!isMountedRef.current || !isPlayingRef.current) {
              video.pause();
              return;
            }
            setIsFrameReady(true);
          })
          .catch(() => {
            if (!isMountedRef.current || !isPlayingRef.current) return;
            video.muted = true;
            video.play().then(() => {
              if (!isMountedRef.current || !isPlayingRef.current) {
                video.pause();
                return;
              }
              setIsFrameReady(true);
            }).catch(() => {});
          });
      }
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
      {/* Instant poster thumbnail backdrop + buffering indicator until live frames render */}
      {short.thumbnailUrl && (
        <img
          src={short.thumbnailUrl}
          alt={short.title}
          className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-300 ${
            isFrameReady ? 'opacity-0' : 'opacity-100 filter blur-xs scale-105'
          }`}
        />
      )}
      {!isFrameReady && isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/25">
          <div className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-lg">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Attached Sound Library Audio Element (only if custom track selected) */}
      {resolvedSoundAudioUrl && (
        <audio
          ref={soundAudioRef}
          src={resolvedSoundAudioUrl}
          loop
          playsInline
          preload="auto"
          onCanPlay={() => {
            if (isPlaying && !isMuted && soundAudioRef.current) {
              soundAudioRef.current.play().catch(() => {});
            }
          }}
        />
      )}

      {parsedMedia.type === 'youtube' ? (
        <div className="relative z-10 w-full h-full flex items-center justify-center bg-black">
          <div id={containerId} className="w-full h-full" />
        </div>
      ) : parsedMedia.type === 'drive' ? (
        <iframe
          src={`${parsedMedia.embedUrl}?autoplay=1`}
          title={short.title}
          frameBorder="0"
          allow="autoplay; encrypted-media"
          onLoad={() => {
            setIsFrameReady(true);
            onMediaReady();
          }}
          className="relative z-10 w-full h-full object-cover scale-110"
        />
      ) : parsedMedia.type === 'direct' ? (
        <video
          ref={videoRef}
          src={parsedMedia.embedUrl}
          loop
          playsInline
          // @ts-ignore
          webkit-playsinline="true"
          preload="auto"
          muted={resolvedSoundAudioUrl ? true : isMuted}
          onCanPlay={handleMediaReadyAndPlay}
          onLoadedData={handleMediaReadyAndPlay}
          onLoadedMetadata={() => {
            onMediaReady();
          }}
          onPlaying={() => {
            if (!isMountedRef.current || !isPlayingRef.current) {
              videoRef.current?.pause();
              return;
            }
            setIsFrameReady(true);
            onMediaReady();
            onPlaybackStateChange?.(true);
          }}
          onPlay={() => {
            if (!isMountedRef.current || !isPlayingRef.current) {
              videoRef.current?.pause();
              soundAudioRef.current?.pause();
              return;
            }
            setIsFrameReady(true);
            onMediaReady();
            onPlaybackStateChange?.(true);
            if (soundAudioRef.current && !isMutedRef.current && resolvedSoundAudioUrl) {
              soundAudioRef.current.play().catch(() => {});
            }
          }}
          onPause={() => {
            onPlaybackStateChange?.(false);
            if (soundAudioRef.current) {
              soundAudioRef.current.pause();
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current && videoRef.current.currentTime > 0) {
              setIsFrameReady(true);
            }
            if (videoRef.current && soundAudioRef.current && resolvedSoundAudioUrl) {
              const vTime = videoRef.current.currentTime;
              const dur = soundAudioRef.current.duration || 30;
              if (Math.abs((vTime % dur) - soundAudioRef.current.currentTime) > 1.5) {
                soundAudioRef.current.currentTime = vTime % dur;
              }
            }
          }}
          className="relative z-10 w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
          <p className="text-xs font-bold text-white">Media player error.</p>
        </div>
      )}
    </div>
  );
};

export const Shorts: React.FC = () => {
  const { route, navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast, refreshProfile } = useApp();
  const { t, isHindi, formatTime } = useTranslation();
  const targetShortId = route.param || route.searchParams?.v || route.searchParams?.id;

  // Instant synchronous cache retrieval (0ms initial frame render)
  const initialCachedShort = targetShortId ? videoService.getCachedVideo(targetShortId) : null;
  const initialCachedShorts = videoService.getCachedVideos({ isShort: true });
  const allShortsPoolRef = useRef<Video[]>(initialCachedShorts);
  const isExpandingRef = useRef(false);
  const offlineBlobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      offlineBlobUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore cleanup errors
        }
      });
      offlineBlobUrlsRef.current = [];
    };
  }, []);

  const [shorts, setShorts] = useState<Video[]>(() => {
    if (initialCachedShort) {
      // Put target short FIRST, then follow immediately with cached next shorts for seamless 0ms downward scroll!
      const otherCached = initialCachedShorts.filter(s => s.videoId !== initialCachedShort.videoId);
      const rankedOthers = recommendationService.getShortsRecommendations({
        allShorts: otherCached,
        currentShortId: initialCachedShort.videoId,
        userUid: currentUser?.uid,
        limit: 8
      });
      return [initialCachedShort, ...rankedOthers];
    }
    if (initialCachedShorts.length > 0) {
      return recommendationService.getShortsRecommendations({
        allShorts: initialCachedShorts,
        userUid: currentUser?.uid,
        limit: 8
      });
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => !initialCachedShort && initialCachedShorts.length === 0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [creator, setCreator] = useState<User | null>(null);

  // Like & Comment drawer state
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const likeSyncVersionRef = useRef(0);
  const subscriptionSyncVersionRef = useRef(0);

  const COMMENTS_PAGE_SIZE = 10;
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState<number>(COMMENTS_PAGE_SIZE);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Comment reactions state (YouTube Thumbs Up & Thumbs Down)
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [dislikedCommentIds, setDislikedCommentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentUser?.uid) {
      const { likedCommentIds: lIds, dislikedCommentIds: dIds } = commentService.getUserReactions(currentUser.uid);
      setLikedCommentIds(lIds);
      setDislikedCommentIds(dIds);
    } else {
      setLikedCommentIds(new Set());
      setDislikedCommentIds(new Set());
    }
  }, [currentUser?.uid]);

  // Offline Download state & 3-dot menu state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [soundModalOpen, setSoundModalOpen] = useState(false);
  const [soundDetailsModalOpen, setSoundDetailsModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

  // Paid Short Unlock States
  const [isShortUnlocked, setIsShortUnlocked] = useState(false);
  const [isPurchasingShort, setIsPurchasingShort] = useState(false);
  const [shortUnlockError, setShortUnlockError] = useState('');

  const activeUid = currentUser?.uid || currentUserProfile?.uid || '';

  // Subscription State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const effectiveUserProfile: User | null = currentUser
    ? (currentUserProfile || {
        uid: currentUser.uid,
        username: currentUser.email?.split('@')[0] || 'user',
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        photoURL: currentUser.photoURL || '',
        role: 'user',
        isVerified: false,
        isPro: false,
        status: 'active',
        followersCount: 0,
        followingCount: 0,
        videosCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    : null;

  const fetchShorts = async () => {
    const hasInitialShorts = shorts.length > 0;
    if (!hasInitialShorts) {
      setLoading(true);
    }

    const offlineShortMap = new Map<string, Video>();
    try {
      const allDownloads = await downloadService.getAllDownloads();
      for (const d of allDownloads) {
        if (!d.isShort && d.videoId !== targetShortId) continue;
        const blobVideoUrl = d.videoBlob ? URL.createObjectURL(d.videoBlob) : (d.videoUrl || '');
        if (d.videoBlob) offlineBlobUrlsRef.current.push(blobVideoUrl);
        let blobThumbUrl = d.thumbnailUrl || '';
        if (d.thumbnailBlob) {
          blobThumbUrl = URL.createObjectURL(d.thumbnailBlob);
          offlineBlobUrlsRef.current.push(blobThumbUrl);
        }
        offlineShortMap.set(d.videoId, {
          videoId: d.videoId,
          title: d.title,
          description: d.description || '',
          videoUrl: blobVideoUrl,
          thumbnailUrl: blobThumbUrl,
          duration: Number.isFinite(d.duration) ? d.duration : 0,
          creatorId: d.creatorId,
          creatorUsername: d.creatorUsername,
          creatorDisplayName: d.creatorDisplayName,
          creatorPhotoURL: d.creatorPhotoURL,
          category: d.category || 'General',
          tags: [],
          visibility: 'public',
          viewsCount: 0,
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          isShort: true,
          status: 'published',
          createdAt: d.downloadedAt,
          updatedAt: d.downloadedAt
        });
      }

      if (targetShortId && offlineShortMap.has(targetShortId)) {
        const offlineTarget = offlineShortMap.get(targetShortId)!;
        const otherOffline = Array.from(offlineShortMap.values()).filter(s => s.videoId !== targetShortId);
        setShorts(prev => {
          const existingOthers = prev.filter(s => s.videoId !== targetShortId);
          return [offlineTarget, ...(existingOthers.length > 0 ? existingOthers : otherOffline)];
        });
        setCurrentIndex(0);
        setLoading(false);
      }
    } catch (offlineErr) {
      console.warn('Could not load offline shorts:', offlineErr);
    }

    const applyOfflineMedia = (item: Video): Video => {
      const offline = offlineShortMap.get(item.videoId);
      if (!offline) return item;
      return {
        ...item,
        videoUrl: offline.videoUrl || item.videoUrl,
        thumbnailUrl: offline.thumbnailUrl || item.thumbnailUrl
      };
    };

    try {
      // Chunked fetch (limit: 25) prevents UI lag and network choking
      const data = await videoService.getVideos({ isShort: true, limit: 25 });
      const hydratedData = data.map(applyOfflineMedia);
      allShortsPoolRef.current = hydratedData;

      if (hydratedData.length > 0) {
        const ranked = recommendationService.getShortsRecommendations({
          allShorts: hydratedData,
          currentShortId: targetShortId,
          userUid: currentUser?.uid
        });

        // If a short is already playing from instant cache or offline storage, keep it uninterrupted and append unseen items
        if (hasInitialShorts || (targetShortId && offlineShortMap.has(targetShortId))) {
          setShorts(prev => {
            if (prev.length === 0) return ranked.slice(0, 8);
            const mergedPrev = prev.map(item => {
              const live = hydratedData.find(h => h.videoId === item.videoId);
              return live ? applyOfflineMedia(live) : item;
            });
            const existingIds = new Set(mergedPrev.map(s => s.videoId));
            const newTail = ranked.filter(s => !existingIds.has(s.videoId)).slice(0, 8);
            return newTail.length > 0 ? [...mergedPrev, ...newTail] : mergedPrev;
          });
          return;
        }

        // If route specifies a short ID, put it first
        if (targetShortId) {
          const target = hydratedData.find(s => s.videoId === targetShortId) || offlineShortMap.get(targetShortId);
          if (target) {
            const others = ranked.filter(s => s.videoId !== targetShortId).slice(0, 8);
            setShorts([target, ...others]);
            setCurrentIndex(0);
          } else {
            const singleShort = await videoService.getVideo(targetShortId);
            if (singleShort && singleShort.isShort) {
              const others = ranked.filter(s => s.videoId !== singleShort.videoId).slice(0, 8);
              setShorts([applyOfflineMedia(singleShort), ...others]);
              setCurrentIndex(0);
            } else {
              setShorts(ranked.slice(0, 8));
              setCurrentIndex(0);
            }
          }
        } else {
          setShorts(ranked.slice(0, 8));
          setCurrentIndex(0);
        }
      } else if (offlineShortMap.size > 0) {
        const offlineList = Array.from(offlineShortMap.values());
        if (targetShortId && offlineShortMap.has(targetShortId)) {
          const target = offlineShortMap.get(targetShortId)!;
          setShorts([target, ...offlineList.filter(s => s.videoId !== targetShortId)]);
        } else {
          setShorts(offlineList);
        }
        setCurrentIndex(0);
      } else if (!hasInitialShorts) {
        setShorts([]);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error(err);
      if (offlineShortMap.size > 0) {
        const offlineList = Array.from(offlineShortMap.values());
        if (targetShortId && offlineShortMap.has(targetShortId)) {
          const target = offlineShortMap.get(targetShortId)!;
          setShorts([target, ...offlineList.filter(s => s.videoId !== targetShortId)]);
        } else if (shorts.length === 0) {
          setShorts(offlineList);
        }
        setCurrentIndex(0);
      } else if (shorts.length === 0) {
        setShorts([]);
        setCurrentIndex(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetShortId && shorts.length > 0 && shorts[currentIndex]?.videoId !== targetShortId) {
      const existingIdx = shorts.findIndex(s => s.videoId === targetShortId);
      if (existingIdx !== -1) {
        setCurrentIndex(existingIdx);
      } else {
        const cached = videoService.getCachedVideo(targetShortId);
        if (cached) {
          setShorts(prev => [cached, ...prev.filter(s => s.videoId !== targetShortId)]);
          setCurrentIndex(0);
        }
      }
    }
    fetchShorts();
  }, [targetShortId]);

  const activeShort = shorts[currentIndex];

  // Sync document title and social/SEO metadata with active Clip
  useEffect(() => {
    if (activeShort?.title) {
      const creatorPart = activeShort.creatorDisplayName ? ` - ${activeShort.creatorDisplayName}` : '';
      const pageTitle = `${activeShort.title}${creatorPart} | Clips - SocialIndia`;
      const canonicalUrl = targetShortId || activeShort.videoId
        ? `${SITE_URL}/shorts/${encodeURIComponent(targetShortId || activeShort.videoId)}`
        : `${SITE_URL}/shorts`;
      applySeoMetadata({
        title: pageTitle,
        description: truncateSeoDescription(
          activeShort.description,
          `Watch "${activeShort.title}" Clips on SocialIndia, India’s own social media and video platform.`
        ),
        canonicalUrl,
        image: activeShort.thumbnailUrl || undefined,
        imageAlt: activeShort.title,
        ogType: 'video.other',
        noIndex: activeShort.visibility === 'private' || activeShort.visibility === 'unlisted',
      });
    }
    return () => {
      applySeoMetadata({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        canonicalUrl: `${SITE_URL}/`,
      });
    };
  }, [
    targetShortId,
    activeShort?.videoId,
    activeShort?.title,
    activeShort?.creatorDisplayName,
    activeShort?.description,
    activeShort?.thumbnailUrl,
    activeShort?.visibility,
  ]);

  const isShortOwner = currentUser?.uid === activeShort?.creatorId;
  const isShortAdmin = currentUserProfile?.role === 'admin';
  const isShortPaid = !!(activeShort?.isPaid && (activeShort?.price || 0) > 0);
  const isShortLocked = isShortPaid && !isShortOwner && !isShortAdmin && !isShortUnlocked;
  const viewerTotalBalance = (currentUserProfile?.walletBalance || 0) + (currentUserProfile?.bonusBalance || 0);

  // Sync like and comments stats for active short & increment view count
  useEffect(() => {
    const likeSyncVersion = ++likeSyncVersionRef.current;
    const subscriptionSyncVersion = ++subscriptionSyncVersionRef.current;
    if (!activeShort) return;

    // Trigger view count increment (protected by 24h Anti-Spam View Guard!)
    videoService.incrementViewCount(activeShort.videoId).catch(console.error);

    // Record watch ID for AI Anti-Repeat Recommendation Engine
    recommendationService.recordVideoWatch(activeShort.videoId, currentUser?.uid);

    setLikesCount(activeShort.likesCount || 0);
    setCommentsCount(activeShort.commentsCount || 0);
    setShowComments(false);
    setVisibleCommentsCount(COMMENTS_PAGE_SIZE);
    setCreator(userService.getCachedUserProfile(activeShort.creatorId));

    // Pre-hydrate and prefetch comments immediately so opening comment drawer is instant (0ms)
    if (activeShort.commentsMode === 'disabled') {
      setComments([]);
    } else {
      const cachedComms = commentService.getCachedComments(activeShort.videoId, isShortOwner);
      setComments(cachedComms);
      if (cachedComms.length > 0) {
        setCommentsCount(prev => Math.max(prev, cachedComms.filter(comment => comment.status !== 'pending').length));
      }
      commentService.getComments(activeShort.videoId, isShortOwner, activeShort.commentsMode === 'hold').then(comms => {
        setComments(prev => {
          const seen = new Set(comms.map(c => c.commentId));
          const pending = prev.filter(c => c.commentId.startsWith('temp-') && !seen.has(c.commentId));
          return [...pending, ...comms];
        });
        setCommentsCount(prev => Math.max(prev, comms.filter(comment => comment.status !== 'pending').length));
      }).catch(console.error);
    }
    
    // Fetch latest creator profile for up-to-date avatar & subscriber count
    userService.getUserProfile(activeShort.creatorId, true).then(crProfile => {
      if (crProfile) {
        setCreator(crProfile);
        
        // NEW: Lazy migration - Sync video metadata if it's outdated
        if (activeShort.creatorPhotoURL !== crProfile.photoURL || 
            activeShort.creatorDisplayName !== crProfile.displayName || 
            activeShort.creatorUsername !== crProfile.username) {
          videoService.editVideo(activeShort.videoId, {
            creatorPhotoURL: crProfile.photoURL,
            creatorDisplayName: crProfile.displayName,
            creatorUsername: crProfile.username
          }).catch(console.error);
        }
      }
    }).catch(console.error);

    if (activeUid) {
      setIsLiked(likeService.hasLikedSync(activeShort.videoId, activeUid));
      setIsSaved(savedVideoService.isSavedSync(activeUid, activeShort.videoId));
      if (currentUser?.uid) {
        likeService.hasLiked(activeShort.videoId, currentUser.uid)
          .then(liked => {
            if (likeSyncVersionRef.current === likeSyncVersion) setIsLiked(liked);
          })
          .catch(console.error);
        savedVideoService.isSaved(currentUser.uid, activeShort.videoId).then(setIsSaved).catch(console.error);
      }
    } else {
      setIsLiked(false);
      setIsSaved(false);
    }

    // Check offline download status
    downloadService.isDownloaded(activeShort.videoId).then(setIsDownloaded).catch(() => {});
    setOptionsMenuOpen(false);

    // Check subscription status (synchronous hydration first so Follow never resets on reload)
    if (activeUid && activeShort.creatorId && activeUid !== activeShort.creatorId) {
      setIsSubscribed(subscriptionService.isSubscribedSync(activeUid, activeShort.creatorId, activeShort.creatorUsername));
      if (currentUser?.uid) {
        subscriptionService.isSubscribed(currentUser.uid, activeShort.creatorId, activeShort.creatorUsername)
          .then(subscribed => {
            if (subscriptionSyncVersionRef.current === subscriptionSyncVersion) setIsSubscribed(subscribed);
          })
          .catch(() => {});
      }
    } else {
      setIsSubscribed(false);
    }

    // Paid Short Verification
    if (activeShort.isPaid && (activeShort.price || 0) > 0) {
      if (currentUser?.uid === activeShort.creatorId || currentUserProfile?.role === 'admin') {
        setIsShortUnlocked(true);
      } else if (currentUser) {
        paidVideoService.hasUserPurchasedVideo(currentUser.uid, activeShort.videoId)
          .then(setIsShortUnlocked)
          .catch(() => setIsShortUnlocked(false));
      } else {
        setIsShortUnlocked(false);
      }
    } else {
      setIsShortUnlocked(true);
    }
  }, [activeShort?.videoId, activeShort?.creatorId, activeUid, currentUser?.uid, currentUserProfile?.role, activeShort?.commentsMode, isShortOwner]);

  const handleSubscribeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      addToast('Please sign in to follow creators.', 'info');
      navigate('signin');
      return;
    }
    if (subscribing) return;
    if (!activeShort?.creatorId || activeShort.creatorId === currentUser.uid) {
      return;
    }
    const subscriptionActionVersion = ++subscriptionSyncVersionRef.current;
    const nextSub = !isSubscribed;
    setIsSubscribed(nextSub);
    setSubscribing(true);
    try {
      const newStatus = await subscriptionService.toggleSubscription(
        currentUser.uid,
        activeShort.creatorId,
        {
          username: activeShort.creatorUsername,
          displayName: activeShort.creatorDisplayName,
          photoURL: activeShort.creatorPhotoURL
        },
        nextSub
      );
      if (subscriptionSyncVersionRef.current === subscriptionActionVersion) {
        setIsSubscribed(newStatus);
      }
    } catch (err) {
      console.warn('Shorts subscription sync warning:', err);
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnlockShort = async () => {
    if (!currentUser) {
      addToast('Please sign in to unlock this exclusive Clip.', 'info');
      navigate('signin');
      return;
    }
    if (!activeShort) return;

    const walletBal = currentUserProfile?.walletBalance || 0;
    const bonusBal = currentUserProfile?.bonusBalance || 0;
    const totalBal = Number((walletBal + bonusBal).toFixed(2));
    const price = activeShort.price || 0;

    if (totalBal < price) {
      addToast(`Insufficient balance! Price is ₹${price}, your balance is ₹${totalBal.toFixed(2)}. Please top up your wallet.`, 'error');
      return;
    }

    setIsPurchasingShort(true);
    setShortUnlockError('');
    try {
      await paidVideoService.purchaseVideo(currentUser.uid, activeShort);
      setIsShortUnlocked(true);
      setIsPlaying(true);
      await refreshProfile();
      addToast(`🎉 Payment successful! Clip unlocked for ₹${price}. Enjoy watching!`, 'success');
    } catch (err: any) {
      setShortUnlockError(err.message || 'Payment failed.');
      addToast(err.message || 'Payment failed.', 'error');
    } finally {
      setIsPurchasingShort(false);
    }
  };

  const handleDownloadShort = async () => {
    if (!activeShort) return;

    if (isDownloaded) {
      if (window.confirm('Delete this clip from offline downloads?')) {
        try {
          await downloadService.deleteDownload(activeShort.videoId);
          setIsDownloaded(false);
          addToast('Clip removed from offline downloads.', 'info');
        } catch {
          addToast('Failed to remove download.', 'error');
        }
      }
      return;
    }

    if (downloadProgress !== null) return;
    setDownloadProgress(0);
    addToast('Downloading Clip for offline viewing...', 'info');

    try {
      await downloadService.downloadVideo(activeShort, (percent) => {
        setDownloadProgress(percent);
      });
      setIsDownloaded(true);
      setDownloadProgress(null);
      addToast('Clip downloaded! Watch offline anytime in Downloads.', 'success');
    } catch (err) {
      console.error('Download error:', err);
      setDownloadProgress(null);
      addToast('Failed to download clip stream.', 'error');
    }
  };

  const expandShortsQueue = async (advance = false) => {
    if (isExpandingRef.current) return;
    isExpandingRef.current = true;
    try {
      let pool = allShortsPoolRef.current;
      if (!pool || pool.length === 0) {
        pool = await videoService.getVideos({ isShort: true, limit: 25 });
        allShortsPoolRef.current = pool;
      }

      if (pool.length > 0) {
        const currentIds = new Set(shorts.map(s => s.videoId));
        // Remaining unshown candidates from pool
        const remaining = pool.filter(s => !currentIds.has(s.videoId));

        let nextBatch: Video[] = [];
        if (remaining.length > 0) {
          nextBatch = recommendationService.getShortsRecommendations({
            allShorts: remaining,
            userUid: currentUser?.uid,
            limit: 6
          });
        }

        // If all pool items have been shown, dynamically generate fresh rotated recommendations
        if (nextBatch.length === 0) {
          nextBatch = recommendationService.getShortsRecommendations({
            allShorts: pool,
            userUid: currentUser?.uid,
            limit: 6
          });
        }

        if (nextBatch.length > 0) {
          setShorts(prev => [...prev, ...nextBatch]);
          if (advance) {
            if (isTransitioning) return;
            setIsTransitioning(true);
            setSwipeDirection('up');
            setIsMediaReady(false);
            setTimeout(() => {
              setCurrentIndex(prev => prev + 1);
              setSwipeDirection(null);
              setIsPlaying(true);
              setIsTransitioning(false);
            }, 140);
          }
        }
      }
    } catch (e) {
      console.warn('Could not expand shorts queue:', e);
    } finally {
      isExpandingRef.current = false;
    }
  };

  const handleNext = () => {
    if (isTransitioning) return;
    if (currentIndex < shorts.length - 1) {
      setIsTransitioning(true);
      setSwipeDirection('up');
      setIsMediaReady(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setSwipeDirection(null);
        setIsPlaying(true);
        setIsTransitioning(false);
      }, 140);
    } else if (shorts.length > 0) {
      expandShortsQueue(true);
    }
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setSwipeDirection('down');
      setIsMediaReady(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setSwipeDirection(null);
        setIsPlaying(true);
        setIsTransitioning(false);
      }, 140);
    }
  };

  // Background infinite buffer: whenever user is within 3 items of bottom, silently load next batch so scrolling never stops
  useEffect(() => {
    if (shorts.length > 0 && currentIndex >= shorts.length - 3) {
      expandShortsQueue(false);
    }
  }, [currentIndex, shorts.length]);

  // Pre-warm the next short's poster image for zero-latency instant transition
  useEffect(() => {
    const nextShort = shorts[currentIndex + 1];
    if (nextShort?.thumbnailUrl) {
      const img = new Image();
      img.src = nextShort.thumbnailUrl;
    }
  }, [currentIndex, shorts]);

  // Touch Swipe (Mobile / Tablet)
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const lastWheelTime = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchEndY.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current !== null && touchEndY.current !== null) {
      const diffY = touchStartY.current - touchEndY.current;
      const minSwipeDistance = 35; // Sensitive YouTube-like mobile swipe threshold
      if (diffY > minSwipeDistance) {
        // Swiped UP -> Next Short
        handleNext();
      } else if (diffY < -minSwipeDistance) {
        // Swiped DOWN -> Previous Short
        handlePrev();
      }
    }
    touchStartY.current = null;
    touchEndY.current = null;
  };

  // Mouse Wheel Scroll (Web)
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 500) return;
    if (Math.abs(e.deltaY) > 35) {
      lastWheelTime.current = now;
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, shorts.length]);

  const handleLikeToggle = async () => {
    if (!currentUser) {
      addToast('Please sign in to like Clips.', 'info');
      navigate('signin');
      return;
    }

    likeSyncVersionRef.current += 1;
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        await likeService.unlikeVideo(activeShort.videoId, currentUser.uid);
      } else {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        await likeService.likeVideo(activeShort.videoId, currentUser.uid, activeShort);
        userService.awardPoints(currentUser.uid, 5).catch(console.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);

    if (nextShow && activeShort && activeShort.commentsMode !== 'disabled') {
      const cached = commentService.getCachedComments(activeShort.videoId, isShortOwner);
      if (cached.length > 0) {
        setComments(cached);
        setLoadingComments(false);
      } else {
        setLoadingComments(true);
      }
      try {
        const comms = await commentService.getComments(activeShort.videoId, isShortOwner, activeShort.commentsMode === 'hold');
        setComments(prev => {
          const seen = new Set(comms.map(c => c.commentId));
          const pending = prev.filter(c => c.commentId.startsWith('temp-') && !seen.has(c.commentId));
          return [...pending, ...comms];
        });
        setCommentsCount(prev => Math.max(prev, comms.filter(comment => comment.status !== 'pending').length));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleShare = () => {
    if (!activeShort) return;
    const shareUrl = `${window.location.origin}/#/clips/${activeShort.videoId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast('Clip link copied to clipboard!', 'success');
    });
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToPost = newCommentText.trim();
    if (!textToPost) return;

    if (!currentUser || !effectiveUserProfile) {
      addToast('Please sign in to comment.', 'info');
      navigate('signin');
      return;
    }
    if (activeShort.commentsMode === 'disabled') return;
    if (submittingComment) return;

    setSubmittingComment(true);
    const tempCommentId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const tempComment: Comment = {
      commentId: tempCommentId,
      videoId: activeShort.videoId,
      uid: currentUser.uid,
      username: effectiveUserProfile.username,
      displayName: effectiveUserProfile.displayName,
      photoURL: effectiveUserProfile.photoURL || '',
      text: textToPost,
      status: activeShort.commentsMode === 'hold' ? 'pending' : 'published',
      likesCount: 0,
      createdAt: now,
      updatedAt: now
    };

    setComments(prev => [tempComment, ...prev]);
    setVisibleCommentsCount(prev => Math.max(prev, COMMENTS_PAGE_SIZE));
    if (tempComment.status === 'published') {
      setCommentsCount(prev => prev + 1);
    }
    setNewCommentText('');

    try {
      const created = await commentService.addComment(activeShort.videoId, {
        uid: currentUser.uid,
        username: effectiveUserProfile.username,
        displayName: effectiveUserProfile.displayName,
        photoURL: effectiveUserProfile.photoURL || '',
        text: textToPost,
        status: activeShort.commentsMode === 'hold' ? 'pending' : 'published'
      });

      setComments(prev => prev.map(c => c.commentId === tempCommentId ? created : c));
      addToast(created.status === 'pending' ? 'Your comment was sent for review.' : 'Comment posted!', created.status === 'pending' ? 'info' : 'success');
    } catch (err) {
      console.warn('Shorts comment sync warning:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Helper to render text with clickable links
  const renderCommentText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handlePostReply = async (parentCommentId: string) => {
    if (!currentUser || !effectiveUserProfile) {
      addToast('Please sign in to reply.', 'info');
      navigate('signin');
      return;
    }
    if (activeShort.commentsMode === 'disabled') return;
    if (!replyText.trim()) return;
    const currentReplyText = replyText.trim();
    const tempReplyId = `temp-reply-${Date.now()}`;
    const now = new Date().toISOString();

    const tempReply: Comment = {
      commentId: tempReplyId,
      videoId: activeShort.videoId,
      uid: currentUser.uid,
      username: effectiveUserProfile.username,
      displayName: effectiveUserProfile.displayName,
      photoURL: effectiveUserProfile.photoURL || '',
      text: currentReplyText,
      status: activeShort.commentsMode === 'hold' ? 'pending' : 'published',
      likesCount: 0,
      parentCommentId,
      createdAt: now,
      updatedAt: now
    };

    // 100% INSTANT OPTIMISTIC UPDATE (0ms latency!)
    setComments(prev => [...prev, tempReply]);
    if (tempReply.status === 'published') {
      setCommentsCount(prev => prev + 1);
    }
    setReplyText('');
    setReplyingTo(null);
    addToast(tempReply.status === 'pending' ? 'Your reply was sent for review.' : 'Reply posted!', tempReply.status === 'pending' ? 'info' : 'success');

    try {
      const created = await commentService.addComment(activeShort.videoId, {
        uid: currentUser.uid,
        username: effectiveUserProfile.username,
        displayName: effectiveUserProfile.displayName,
        photoURL: effectiveUserProfile.photoURL || '',
        text: currentReplyText,
        status: activeShort.commentsMode === 'hold' ? 'pending' : 'published',
        parentCommentId
      });
      setComments(prev => prev.map(c => c.commentId === tempReplyId ? created : c));
    } catch (err) {
      console.warn('Shorts reply sync warning:', err);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (window.confirm('Delete this comment?')) {
      try {
        const deletedComment = comments.find(comment => comment.commentId === commentId);
        await commentService.deleteComment(activeShort.videoId, commentId);
        setComments(prev => prev.filter(c => c.commentId !== commentId));
        if (deletedComment?.status !== 'pending') {
          setCommentsCount(prev => Math.max(0, prev - 1));
        }
        addToast('Comment deleted', 'info');
      } catch (err) {
        addToast('Failed to delete', 'error');
      }
    }
  };

  const handleApproveComment = async (commentId: string) => {
    if (!activeShort || !isShortOwner) return;
    try {
      await commentService.approveComment(activeShort.videoId, commentId);
      setComments(prev => prev.map(comment =>
        comment.commentId === commentId ? { ...comment, status: 'published' } : comment
      ));
      setCommentsCount(prev => prev + 1);
      addToast('Comment approved.', 'success');
    } catch (error) {
      console.error('Failed to approve Clip comment:', error);
      addToast('Could not approve this comment.', 'error');
    }
  };

  const handleLikeComment = async (targetComment: Comment) => {
    if (!currentUser) {
      addToast('Please sign in to like comments.', 'info');
      navigate('signin');
      return;
    }
    const isCurrentlyLiked = likedCommentIds.has(targetComment.commentId);
    const isCurrentlyDisliked = dislikedCommentIds.has(targetComment.commentId);

    setLikedCommentIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyLiked) next.delete(targetComment.commentId);
      else next.add(targetComment.commentId);
      return next;
    });

    if (isCurrentlyDisliked) {
      setDislikedCommentIds(prev => {
        const next = new Set(prev);
        next.delete(targetComment.commentId);
        return next;
      });
    }

    setComments(prev => prev.map(c => {
      if (c.commentId === targetComment.commentId) {
        const diff = isCurrentlyLiked ? -1 : 1;
        return {
          ...c,
          likesCount: Math.max(0, (c.likesCount || 0) + diff)
        };
      }
      return c;
    }));

    try {
      if (isCurrentlyLiked) {
        await commentService.unlikeComment(activeShort.videoId, targetComment.commentId, currentUser.uid);
      } else {
        await commentService.likeComment(activeShort.videoId, targetComment.commentId, currentUser.uid);
      }
    } catch (err) {
      console.warn('Failed to like comment:', err);
    }
  };

  const handleDislikeComment = async (targetComment: Comment) => {
    if (!currentUser) {
      addToast('Please sign in to dislike comments.', 'info');
      navigate('signin');
      return;
    }
    const isCurrentlyDisliked = dislikedCommentIds.has(targetComment.commentId);
    const isCurrentlyLiked = likedCommentIds.has(targetComment.commentId);

    setDislikedCommentIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyDisliked) next.delete(targetComment.commentId);
      else next.add(targetComment.commentId);
      return next;
    });

    if (isCurrentlyLiked) {
      setLikedCommentIds(prev => {
        const next = new Set(prev);
        next.delete(targetComment.commentId);
        return next;
      });
      setComments(prev => prev.map(c => {
        if (c.commentId === targetComment.commentId) {
          return {
            ...c,
            likesCount: Math.max(0, (c.likesCount || 0) - 1)
          };
        }
        return c;
      }));
    }

    try {
      if (isCurrentlyDisliked) {
        await commentService.undislikeComment(activeShort.videoId, targetComment.commentId, currentUser.uid);
      } else {
        await commentService.dislikeComment(activeShort.videoId, targetComment.commentId, currentUser.uid);
      }
    } catch (err) {
      console.warn('Failed to dislike comment:', err);
    }
  };

  const handleHeartComment = async (targetComment: Comment) => {
    if (!currentUser || currentUser.uid !== activeShort?.creatorId) return;
    const nextHeart = !targetComment.hasCreatorHeart;

    setComments(prev => prev.map(c => {
      if (c.commentId === targetComment.commentId) {
        return { ...c, hasCreatorHeart: nextHeart };
      }
      return c;
    }));

    try {
      await commentService.heartComment(activeShort.videoId, targetComment.commentId, nextHeart);
      addToast(nextHeart ? 'Loved this comment ❤️' : 'Removed heart from comment', 'success');
    } catch (err) {
      console.warn('Failed to heart comment:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-0 md:p-4 h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4.5rem)] max-w-6xl mx-auto">
        <div className="relative w-full max-w-full md:max-w-[390px] h-[calc(100dvh-3.5rem)] md:h-[min(calc(100vh-5.5rem),660px)] md:aspect-[9/16] bg-[#dbe2ee] dark:bg-[#181a20] rounded-none md:rounded-[2rem] overflow-hidden animate-pulse flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <div className="h-7 w-20 rounded-full bg-slate-300/80 dark:bg-slate-800" />
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-300/80 dark:bg-slate-800" />
              <div className="w-8 h-8 rounded-full bg-slate-300/80 dark:bg-slate-800" />
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 pb-2">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-300/80 dark:bg-slate-800 shrink-0" />
                <div className="h-3.5 w-28 rounded-full bg-slate-300/80 dark:bg-slate-800" />
                <div className="h-7 w-16 rounded-full bg-slate-300/80 dark:bg-slate-800" />
              </div>
              <div className="h-3.5 w-4/5 rounded-full bg-slate-300/80 dark:bg-slate-800" />
              <div className="h-3 w-3/5 rounded-full bg-slate-300/80 dark:bg-slate-800" />
            </div>

            <div className="flex flex-col items-center gap-4 pb-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-slate-300/80 dark:bg-slate-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (shorts.length === 0 || !activeShort) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[calc(100vh-8rem)]">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/30 shadow-xs">
          <ShortsLogo className="w-10 h-10" />
        </div>
        <h4 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">No clips available yet</h4>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 max-w-sm font-medium">
          Vertical clips published on SocialIndia will appear here.
        </p>
        <button
          onClick={() => navigate('studio')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs"
        >
          Publish a Clip
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start md:justify-center p-0 md:p-3 md:py-2 h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4.5rem)] relative select-none max-w-6xl mx-auto overflow-hidden">
      
      <div className={`flex flex-col md:flex-row items-center md:items-center justify-center gap-6 w-full h-[calc(100dvh-3.5rem)] md:h-[min(calc(100vh-5.5rem),660px)] transition-transform duration-300 ${showComments ? 'md:-translate-x-40' : ''}`}>
        
        {/* Navigation Arrows for desktop (Left side) */}
        <div className="hidden md:flex flex-col justify-center gap-4 shrink-0">
          <button
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className="p-4 bg-white dark:bg-[#111827] hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-[1.5rem] disabled:opacity-20 cursor-pointer shadow-xl transition-all active:scale-90"
            title="Previous Clip"
          >
            <ChevronUp className="w-6 h-6 text-slate-700 dark:text-slate-300 stroke-[2.5]" />
          </button>
          <button
            onClick={handleNext}
            className="p-4 bg-white dark:bg-[#111827] hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-[1.5rem] disabled:opacity-20 cursor-pointer shadow-xl transition-all active:scale-90"
            title="Next Clip"
          >
            <ChevronDown className="w-6 h-6 text-slate-700 dark:text-slate-300 stroke-[2.5]" />
          </button>
        </div>

        {/* Vertical Clips Player Container (Full Screen Edge-to-Edge on Mobile) */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className="relative w-full max-w-full md:max-w-[390px] h-[calc(100dvh-3.5rem)] md:h-[min(calc(100vh-5.5rem),660px)] md:aspect-[9/16] bg-black rounded-none md:rounded-[2rem] shadow-2xl border-none md:border border-slate-200 dark:border-[#334155] overflow-hidden flex flex-col group touch-none select-none shrink-0"
        >
          {/* Top Mobile Overlay: Back to Home Button (YouTube Shorts Style) */}
          <div className="absolute top-3 left-3 md:hidden z-35 flex items-center gap-2">
            <button
              onClick={() => navigate('home')}
              className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/15 hover:bg-black/65 transition-all cursor-pointer shadow-lg active:scale-95"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <span className="text-xs font-black uppercase tracking-wider text-white drop-shadow-md">
              Clips
            </span>
          </div>
          
          {/* Media Player Component Wrapper with Smooth Sliding Transitions */}
          <div className={`w-full h-full transition-all duration-150 ease-out transform ${
            swipeDirection === 'up' 
              ? '-translate-y-full opacity-30 scale-95' 
              : swipeDirection === 'down' 
              ? 'translate-y-full opacity-30 scale-95' 
              : 'translate-y-0 opacity-100 scale-100'
          }`}>
            <ShortVideoMedia 
              key={activeShort.videoId} 
              short={activeShort} 
              isPlaying={isPlaying && !swipeDirection && !isShortLocked}
              volume={volume}
              isMuted={isMuted}
              onMediaReady={() => setIsMediaReady(true)}
              onPlaybackStateChange={setIsPlaying}
            />
          </div>

          {/* PAID SHORT PAYWALL OVERLAY */}
          {isShortLocked && (
            <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
              {activeShort.thumbnailUrl && (
                <img 
                  src={activeShort.thumbnailUrl} 
                  alt={activeShort.title} 
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-110 pointer-events-none"
                />
              )}
              <div className="relative z-10 max-w-xs w-full space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-linear-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-amber-500/25">
                  <Lock className="w-7 h-7 stroke-[2.5]" />
                </div>

                <div className="space-y-1">
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Exclusive Paid Clip
                  </span>
                  <h3 className="text-base font-black tracking-tight line-clamp-2">{activeShort.title}</h3>
                  <p className="text-xs text-slate-300 font-medium">
                    By <strong>@{activeShort.creatorUsername}</strong>
                  </p>
                </div>

                <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-2 text-left text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold">Access Price:</span>
                    <span className="font-mono font-black text-emerald-400 text-base">
                      ₹{activeShort.price} INR
                    </span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Wallet Balance:</span>
                    <span className="font-mono font-bold text-white">
                      ₹{(currentUserProfile?.walletBalance || 0).toFixed(2)}
                    </span>
                  </div>
                  {(currentUserProfile?.bonusBalance || 0) > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-amber-300">
                      <span>Bonus Money:</span>
                      <span className="font-mono font-bold">
                        +₹{(currentUserProfile?.bonusBalance || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {shortUnlockError && (
                  <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold">
                    {shortUnlockError}
                  </div>
                )}

                <div className="pt-1">
                  {viewerTotalBalance >= (activeShort.price || 0) ? (
                    <button
                      onClick={handleUnlockShort}
                      disabled={isPurchasingShort}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      {isPurchasingShort ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>Pay ₹{activeShort.price} & Unlock</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('settings')}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Go to Wallet (Need ₹{((activeShort.price || 0) - viewerTotalBalance).toFixed(2)})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TOP BAR: Create Short Shortcut, Sound / Volume Button & YouTube-style 3-Dot More Options Menu */}
          <div className="absolute top-4 right-4 z-35 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('socialindia:open-shorts-studio'));
              }}
              className="w-8.5 h-8.5 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/15 hover:bg-black/65 transition-all cursor-pointer shadow-lg active:scale-95"
              title={isHindi ? 'नई क्लिप बनाएं' : 'Create a Clip'}
              aria-label="Create a Clip"
            >
              <Zap className="w-4 h-4 text-rose-400 fill-rose-400" />
            </button>

            <div className="group/vol relative flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="w-8.5 h-8.5 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/15 hover:bg-black/65 transition-all cursor-pointer shadow-lg active:scale-95"
                title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>

              {/* Horizontal Volume Slider on Hover for Desktop */}
              <div className="hidden md:group-hover/vol:flex absolute right-10 items-center bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 animate-in fade-in duration-150 shadow-xl">
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    e.stopPropagation();
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    setIsMuted(val === 0);
                  }}
                  className="w-20 h-1.5 accent-blue-500 cursor-pointer"
                  title={`Volume: ${Math.round(volume * 100)}%`}
                />
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setOptionsMenuOpen(!optionsMenuOpen);
              }}
              className="w-8.5 h-8.5 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/15 hover:bg-black/65 transition-all cursor-pointer shadow-lg active:scale-95"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4 text-white" />
            </button>

            {/* YouTube-style Options Dropdown Menu */}
            {optionsMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
              className="absolute top-12 right-0 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-2xl p-2 shadow-2xl z-50 text-slate-900 dark:text-white animate-zoom-in"
              >
                <button
                  onClick={() => {
                    setOptionsMenuOpen(false);
                    handleDownloadShort();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer"
                >
                  {downloadProgress !== null ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Downloading ({downloadProgress}%)</span>
                    </>
                  ) : isDownloaded ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Downloaded Offline</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-4 h-4 text-blue-400" />
                      <span>Download Clip</span>
                    </>
                  )}
                </button>

                {currentUser?.uid && (currentUser.uid === activeShort.creatorId || currentUser.uid === (activeShort as any).userId) && (
                  <button
                    onClick={() => {
                      setOptionsMenuOpen(false);
                      downloadService.exportToDevice(activeShort);
                      addToast('Saving MP4 to device...', 'success');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Save to Phone / PC</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setOptionsMenuOpen(false);
                    handleShare();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                  <span>Copy Clip Link</span>
                </button>

                <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />

                <button
                  onClick={() => {
                    setOptionsMenuOpen(false);
                    addToast('Report submitted for review.', 'info');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer"
                >
                  <Flag className="w-4 h-4" />
                  <span>Report Clip</span>
                </button>
              </div>
            )}
          </div>

          {/* PLAY/PAUSE OVERLAY ON VIDEO */}
          <div 
            onClick={() => !isShortLocked && setIsPlaying(!isPlaying)}
            className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center"
          >
            {!isPlaying && !isShortLocked && (
              <div className="w-20 h-20 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white animate-zoom-in">
                <Play className="w-10 h-10 fill-current ml-1" />
              </div>
            )}
          </div>

          {/* Interaction Side Overlay */}
          <div className="absolute right-1.5 sm:right-2 bottom-[164px] w-12 sm:w-14 flex flex-col items-center gap-1.5 sm:gap-2 text-white z-30 md:hidden">
            {/* LIKE BUTTON */}
            <button 
              onClick={handleLikeToggle}
              className="group/btn w-full flex flex-col items-center gap-1 cursor-pointer"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95 ${isLiked ? 'bg-rose-600/30 border-rose-500/50' : 'hover:bg-black/65'}`}>
                <Heart className={`w-5 h-5 transition-colors ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'}`} />
              </div>
              <span className="text-[9px] sm:text-[10px] leading-none font-bold whitespace-nowrap drop-shadow-md">{likesCount}</span>
            </button>

            {/* COMMENTS BUTTON */}
            <button 
              onClick={handleToggleComments}
              className="group/btn w-full flex flex-col items-center gap-1 cursor-pointer"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95 ${showComments ? 'bg-blue-600/30 border-blue-500/50' : 'hover:bg-black/65'}`}>
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-[9px] sm:text-[10px] leading-none font-bold whitespace-nowrap drop-shadow-md">{commentsCount}</span>
            </button>

            {/* SHARE BUTTON */}
            <button 
              onClick={handleShare}
              className="group/btn w-full flex flex-col items-center gap-1 cursor-pointer"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black/45 backdrop-blur-md hover:bg-black/65 rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-[9px] sm:text-[10px] leading-none font-bold whitespace-nowrap drop-shadow-md">{t('action_share', 'Share')}</span>
            </button>

            {/* DOWNLOAD BUTTON */}
            <button 
              onClick={handleDownloadShort}
              disabled={downloadProgress !== null}
              className="group/btn w-full flex flex-col items-center gap-1 cursor-pointer"
              title={isDownloaded ? "Downloaded offline" : "Download clip"}
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95 ${
                isDownloaded ? 'bg-emerald-600/30 border-emerald-500/50' : 'hover:bg-black/65'
              }`}>
                {downloadProgress !== null ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : isDownloaded ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowDownToLine className="w-5 h-5 text-white" />
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] leading-none font-bold whitespace-nowrap drop-shadow-md">
                {downloadProgress !== null ? `${downloadProgress}%` : isDownloaded ? (isHindi ? 'सहेजा गया' : 'Saved') : (isHindi ? 'डाउनलोड' : 'Download')}
              </span>
            </button>

            {/* SAVE TO PLAYLIST BUTTON */}
            <button 
              onClick={() => setPlaylistModalOpen(true)}
              className="group/btn w-full flex flex-col items-center gap-1 cursor-pointer"
              title={isHindi ? 'प्लेलिस्ट में सहेजें' : 'Save to Playlist'}
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95 ${
                isSaved ? 'bg-blue-600/35 border-blue-400/60' : 'hover:bg-black/65'
              }`}>
                <Bookmark className={`w-5 h-5 ${isSaved ? 'text-blue-400 fill-blue-400' : 'text-white'}`} />
              </div>
              <span className="text-[9px] sm:text-[10px] leading-none font-bold whitespace-nowrap drop-shadow-md">
                {isSaved ? (isHindi ? 'सहेजा गया' : 'Saved') : (isHindi ? 'सहेजें' : 'Save')}
              </span>
            </button>
          </div>

          {/* Details Overlay bottom */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 sm:p-5 pb-4 sm:pb-5 md:pb-4 text-white flex flex-col gap-2 z-25 pointer-events-none">
            {/* Creator Row + Subscribe Button */}
            <div className="flex items-center justify-start gap-2.5 pr-16 md:pr-0 pointer-events-auto">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <UserAvatar 
                  uid={activeShort.creatorId}
                  fallbackPhotoURL={activeShort.creatorPhotoURL}
                  fallbackDisplayName={activeShort.creatorDisplayName}
                  size="md"
                  onClick={() => navigate('creator', activeShort.creatorUsername)}
                  className="rounded-full border-2 border-white/20 shadow-lg shrink-0 cursor-pointer"
                />
                <div className="min-w-0">
                  <h4 onClick={() => navigate('creator', activeShort.creatorUsername)} className="text-xs sm:text-sm font-black hover:underline cursor-pointer truncate drop-shadow-md flex items-center gap-1">
                    <span>{activeShort.creatorDisplayName}</span>
                    {(isUserVerified(creator) || isUserVerified(userService.getCachedUserProfile(activeShort.creatorId))) && (
                      <span className="inline-flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-[8px] w-3.5 h-3.5 rounded-full font-black shrink-0 shadow-md" title="Verified Creator">✓</span>
                    )}
                  </h4>
                  <p className="text-[11px] text-white/80 font-bold truncate drop-shadow-sm">@{activeShort.creatorUsername}</p>
                </div>
              </div>

              {/* Follow button */}
              {activeUid !== activeShort.creatorId && (
                <button
                  type="button"
                  onClick={handleSubscribeToggle}
                  disabled={subscribing}
                  className={`px-4 py-1.5 rounded-full border text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0 backdrop-blur-md ${
                    isSubscribed ? 'si-btn-following-overlay' : 'si-btn-follow'
                  }`}
                >
                  {isSubscribed ? t('action_subscribed', 'Following') : t('action_subscribe', 'Follow')}
                </button>
              )}
            </div>

            <div className="pr-16 md:pr-0">
              <h3 className="text-xs sm:text-[13px] font-bold leading-relaxed line-clamp-2 drop-shadow-lg">
                {activeShort.title}
              </h3>
              <p className="text-[11px] text-[#0070f3] dark:text-[#00d2ff] font-extrabold mt-1 uppercase tracking-wider drop-shadow-sm">#{activeShort.category}</p>

              {/* Sound / Music Track Banner & Rotating Vinyl Disk */}
              <div className="flex items-center justify-between gap-3 pt-2 pointer-events-auto">
                <div 
                  onClick={() => setSoundDetailsModalOpen(true)}
                  className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 cursor-pointer hover:bg-black/70 transition-all active:scale-95 w-fit max-w-[220px] shadow-lg"
                >
                  <Music className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
                  <span className="text-[10px] font-bold text-white/90 truncate">
                    {activeShort.soundTitle ? `${activeShort.soundTitle} • ${activeShort.soundArtist}` : 'Original Sound • SocialIndia Beats'}
                  </span>
                </div>

                {/* Rotating Vinyl Record Disk Icon */}
                <div 
                  onClick={() => setSoundDetailsModalOpen(true)}
                  className="w-9 h-9 rounded-full bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer animate-[spin_6s_linear_infinite] active:scale-90 transition-transform"
                  title="View Sound Track Details"
                >
                  <img 
                    src={activeShort.soundCoverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80'} 
                    alt="Sound Cover" 
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop actions stay beside the player instead of covering the video. */}
        <div className="hidden md:flex self-end mb-5 flex-col items-center gap-2 text-slate-800 dark:text-slate-100 shrink-0">
          <button onClick={handleLikeToggle} className="flex w-16 flex-col items-center gap-1 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Like">
            <Heart className={`h-6 w-6 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="text-[10px] font-bold">{likesCount}</span>
          </button>
          <button onClick={handleToggleComments} className="flex w-16 flex-col items-center gap-1 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Comment">
            <MessageSquare className="h-6 w-6" />
            <span className="text-[10px] font-bold">{commentsCount}</span>
          </button>
          <button onClick={handleShare} className="flex w-16 flex-col items-center gap-1 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Share">
            <Share2 className="h-6 w-6" />
            <span className="text-[10px] font-bold">Share</span>
          </button>
          <button onClick={() => setPlaylistModalOpen(true)} className="flex w-16 flex-col items-center gap-1 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Save">
            <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-blue-500 text-blue-500' : ''}`} />
            <span className="text-[10px] font-bold">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
          <button onClick={handleDownloadShort} disabled={downloadProgress !== null} className="flex w-16 flex-col items-center gap-1 rounded-xl p-2 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800" title="Download">
            {downloadProgress !== null ? <Loader2 className="h-6 w-6 animate-spin" /> : <ArrowDownToLine className="h-6 w-6" />}
            <span className="text-[10px] font-bold">{downloadProgress !== null ? `${downloadProgress}%` : 'Download'}</span>
          </button>
        </div>

        {/* Sound Details Modal (Sound Landing Page) */}
        <SoundDetailsModal 
          soundId={activeShort.soundId || `orig_sound_${activeShort.videoId}`}
          isOpen={soundDetailsModalOpen}
          onClose={() => setSoundDetailsModalOpen(false)}
          onUseSound={(sound) => {
            navigate('studio');
          }}
        />

        {/* Save to Playlist Modal */}
        <SaveToPlaylistModal
          video={activeShort}
          isOpen={playlistModalOpen}
          onClose={() => setPlaylistModalOpen(false)}
          onSavedChange={setIsSaved}
        />

        {/* Sound Library Modal */}
        <SoundLibraryModal 
          isOpen={soundModalOpen}
          onClose={() => setSoundModalOpen(false)}
          onSelectSound={(sound) => {
            addToast(`Selected "${sound.title}" sound track!`, 'success');
          }}
          selectedSoundId={activeShort.soundId}
        />

        {/* YOUTUBE SHORTS OVERLAY COMMENTS DRAWER */}
        {showComments && (
          <div className="fixed inset-x-0 bottom-14 md:bottom-4 top-1/3 md:top-1/2 md:-translate-y-1/2 md:right-4 md:inset-x-auto md:w-[380px] md:h-[min(580px,calc(100dvh-2rem))] bg-white dark:bg-[#111827] rounded-t-3xl md:rounded-3xl border border-slate-200 dark:border-[#334155] shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-10 duration-250">
            {/* Top Drag Handle indicator for Mobile */}
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 md:hidden" />
            {/* Comments Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                {activeShort.commentsMode !== 'disabled' && (
                  <>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                      Comments
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{commentsCount} interactions</p>
                  </>
                )}
              </div>
              <button 
                onClick={() => setShowComments(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeShort.commentsMode === 'disabled' ? (
              <p className="flex-1 px-5 py-8 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                This comment section is disabled.
              </p>
            ) : (
              <>
            {/* Scrollable Comment List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
              {loadingComments ? (
                <div className="space-y-5 py-2" aria-label={isHindi ? 'टिप्पणियां लोड हो रही हैं' : 'Loading comments'}>
                  {[0, 1, 2, 3].map((skelIdx) => (
                    <div key={skelIdx} className="flex gap-3.5 items-start animate-pulse">
                      <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-[#272727] shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-[#2f2f2f]" />
                          <div className="h-2.5 w-12 rounded-full bg-slate-200/80 dark:bg-[#272727]" />
                        </div>
                        <div className={`h-3 rounded-full bg-slate-200 dark:bg-[#2f2f2f] ${skelIdx % 2 === 0 ? 'w-11/12' : 'w-4/5'}`} />
                        <div className={`h-3 rounded-full bg-slate-200/80 dark:bg-[#272727] ${skelIdx === 1 ? 'w-3/5' : 'w-2/3'}`} />
                        <div className="flex items-center gap-4 pt-1">
                          <div className="h-2.5 w-9 rounded-full bg-slate-200/80 dark:bg-[#272727]" />
                          <div className="h-2.5 w-8 rounded-full bg-slate-200/80 dark:bg-[#272727]" />
                          <div className="h-2.5 w-10 rounded-full bg-slate-200/80 dark:bg-[#272727]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-20 px-6 space-y-3">
                  <MessageSquare className="w-12 h-12 text-slate-100 dark:text-slate-800 mx-auto" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Silent Zone</p>
                  <p className="text-[10px] text-slate-500 font-bold">Be the first to break the silence!</p>
                </div>
              ) : (
                (() => {
                  const topLevelShortsComments = comments.filter(c => !c.parentCommentId);
                  const visibleShortsComments = topLevelShortsComments.slice(0, visibleCommentsCount);
                  const remainingShortsComments = topLevelShortsComments.length - visibleShortsComments.length;
                  return (
                    <>
                      {visibleShortsComments.map(c => (
                  <div key={c.commentId} className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <UserAvatar 
                        uid={c.uid}
                        fallbackPhotoURL={c.photoURL}
                        fallbackDisplayName={c.displayName}
                        size="md"
                        className="rounded-2xl shrink-0 shadow-lg border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-black text-[11px] text-slate-900 dark:text-white truncate">@{c.username}</span>
                          <span className="text-[9px] text-slate-400 font-bold shrink-0">{formatTimeAgo(c.createdAt)}</span>
                        </div>
                        {c.status === 'pending' && isShortOwner && (
                          <span className="inline-block mb-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            Held for review
                          </span>
                        )}
                        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium break-words">
                          {renderCommentText(c.text)}
                        </p>
                        {/* YouTube-Style Comment Action Row */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          {isShortOwner && c.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleApproveComment(c.commentId)}
                              className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                          )}
                          {/* Thumbs Up (Like) */}
                          <button
                            onClick={() => handleLikeComment(c)}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-90 ${
                              likedCommentIds.has(c.commentId)
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="Like"
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${likedCommentIds.has(c.commentId) ? 'fill-current scale-110' : ''}`} />
                            {(c.likesCount || 0) > 0 && (
                              <span className="text-[10px] font-bold">
                                {formatViews(c.likesCount)}
                              </span>
                            )}
                          </button>

                          {/* Thumbs Down (Dislike) */}
                          <button
                            onClick={() => handleDislikeComment(c)}
                            className={`p-1.5 rounded-full text-xs transition-all cursor-pointer active:scale-90 ${
                              dislikedCommentIds.has(c.commentId)
                                ? 'text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="Dislike"
                          >
                            <ThumbsDown className={`w-3.5 h-3.5 ${dislikedCommentIds.has(c.commentId) ? 'fill-current scale-110' : ''}`} />
                          </button>

                          {/* Creator Heart */}
                          {currentUser?.uid === activeShort.creatorId ? (
                            <button
                              onClick={() => handleHeartComment(c)}
                              className={`p-1.5 rounded-full transition-all cursor-pointer active:scale-90 ${
                                c.hasCreatorHeart
                                  ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                                  : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title={c.hasCreatorHeart ? "Remove heart" : "Heart this comment"}
                            >
                              <Heart className={`w-3.5 h-3.5 ${c.hasCreatorHeart ? 'fill-rose-500 text-rose-500' : ''}`} />
                            </button>
                          ) : c.hasCreatorHeart ? (
                            <div 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[9px] font-bold text-rose-500"
                              title={`Loved by ${activeShort.creatorDisplayName}`}
                            >
                              <UserAvatar
                                uid={activeShort.creatorId}
                                fallbackPhotoURL={activeShort.creatorPhotoURL}
                                fallbackDisplayName={activeShort.creatorDisplayName}
                                size="xs"
                                className="w-3.5 h-3.5 rounded-full"
                              />
                              <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                            </div>
                          ) : null}

                          {/* Reply Button */}
                          <button 
                            onClick={() => setReplyingTo(c.commentId)}
                            className="px-2 py-0.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                          >
                            Reply
                          </button>

                          {/* Delete if owner */}
                          {currentUser?.uid === c.uid && (
                            <button 
                              onClick={() => handleCommentDelete(c.commentId)}
                              className="px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        {/* Reply Input Form */}
                        {replyingTo === c.commentId && (
                          <div className="mt-4 flex gap-2">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Write a reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                                  e.preventDefault();
                                  handlePostReply(c.commentId);
                                }
                              }}
                              className="flex-1 px-4 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handlePostReply(c.commentId)}
                              disabled={!replyText.trim()}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer transition-colors"
                            >
                              Send
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText('');
                              }}
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white text-[10px] font-black uppercase rounded-xl cursor-pointer transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nested Replies */}
                    <div className="ml-14 space-y-4">
                      {comments.filter(r => r.parentCommentId === c.commentId).map(r => (
                        <div key={r.commentId} className="flex gap-3 items-start group">
                          <UserAvatar 
                            uid={r.uid}
                            fallbackPhotoURL={r.photoURL}
                            fallbackDisplayName={r.displayName}
                            size="xs"
                            className="shrink-0 border border-slate-200 dark:border-slate-800"
                          />
                          <div className="flex-1 min-w-0 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black text-slate-900 dark:text-white truncate">@{r.username}</span>
                              <span className="text-[8px] text-slate-400 font-bold">{formatTimeAgo(r.createdAt)}</span>
                            </div>
                            {r.status === 'pending' && isShortOwner && (
                              <span className="inline-block mb-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                Held for review
                              </span>
                            )}
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium break-words">{renderCommentText(r.text)}</p>
                            
                            <div className="flex items-center gap-2 mt-2">
                              {isShortOwner && r.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveComment(r.commentId)}
                                  className="rounded-full bg-emerald-600 px-2 py-1 text-[9px] font-bold text-white hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                onClick={() => handleLikeComment(r)}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-90 ${
                                  likedCommentIds.has(r.commentId)
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                                }`}
                                title="Like"
                              >
                                <ThumbsUp className={`w-3 h-3 ${likedCommentIds.has(r.commentId) ? 'fill-current' : ''}`} />
                                {(r.likesCount || 0) > 0 && (
                                  <span className="text-[9px] font-bold">{formatViews(r.likesCount)}</span>
                                )}
                              </button>

                              <button
                                onClick={() => handleDislikeComment(r)}
                                className={`p-1 rounded-full text-xs transition-all cursor-pointer active:scale-90 ${
                                  dislikedCommentIds.has(r.commentId)
                                    ? 'text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700'
                                    : 'text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                                }`}
                                title="Dislike"
                              >
                                <ThumbsDown className={`w-3 h-3 ${dislikedCommentIds.has(r.commentId) ? 'fill-current' : ''}`} />
                              </button>

                              {currentUser?.uid === activeShort.creatorId ? (
                                <button
                                  onClick={() => handleHeartComment(r)}
                                  className={`p-1 rounded-full transition-all cursor-pointer active:scale-90 ${
                                    r.hasCreatorHeart
                                      ? 'text-rose-500'
                                      : 'text-slate-400 hover:text-rose-500'
                                  }`}
                                  title={r.hasCreatorHeart ? "Remove heart" : "Heart reply"}
                                >
                                  <Heart className={`w-3 h-3 ${r.hasCreatorHeart ? 'fill-rose-500 text-rose-500' : ''}`} />
                                </button>
                              ) : r.hasCreatorHeart ? (
                                <div 
                                  className="inline-flex items-center gap-1 px-1 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[8px] font-bold text-rose-500"
                                  title={`Loved by ${activeShort.creatorDisplayName}`}
                                >
                                  <Heart className="w-2 h-2 fill-rose-500 text-rose-500" />
                                </div>
                              ) : null}

                              {currentUser?.uid === r.uid && (
                                <button onClick={() => handleCommentDelete(r.commentId)} className="text-[9px] font-bold text-slate-400 hover:text-rose-600 transition-colors ml-auto cursor-pointer">Delete</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                      ))}
                      {remainingShortsComments > 0 && (
                        <div className="pt-2 flex justify-center">
                          <button
                            type="button"
                            onClick={() => setVisibleCommentsCount(prev => prev + 10)}
                            className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-extrabold text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>
                              {isHindi
                                ? `और कमेंट देखें (${remainingShortsComments} बाकी)`
                                : `Show more comments (${remainingShortsComments} remaining)`}
                            </span>
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>

            {/* Comment Input Form */}
            <form onSubmit={handlePostComment} className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 items-center bg-slate-50/50 dark:bg-[#0f0f0f]/40">
              <input
                type="text"
                placeholder="Share your thoughts..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-bold transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={submittingComment || !newCommentText.trim()}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-xl shadow-blue-600/20 transition-all active:scale-90 shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
