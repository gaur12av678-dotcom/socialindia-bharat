import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { recommendationService } from '../services/recommendationService';
import { userService } from '../services/userService';
import { likeService } from '../services/likeService';
import { commentService } from '../services/commentService';
import { downloadService } from '../services/downloadService';
import { subscriptionService } from '../services/subscriptionService';
import { DEFAULT_SOUNDS } from '../services/soundService';
import { Video, Comment, User } from '../types';
import { parseVideoUrl, getInitials, formatTimeAgo, formatViews } from '../utils/videoUtils';
import { UserAvatar } from '../components/UserAvatar';
import { useTranslation } from '../i18n';
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
import { DEFAULT_CURATED_SHORTS } from './Home';

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
  onMuteChange?: (muted: boolean) => void
}> = ({ short, isPlaying, volume, isMuted, onMediaReady, onPlaybackStateChange, onMuteChange }) => {
  const parsedMedia = parseVideoUrl(short.videoUrl);
  const containerId = `yt-short-${short.videoId}`;
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const soundAudioRef = useRef<HTMLAudioElement>(null);

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

  // Sync play/pause for direct video with auto-mute fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || parsedMedia.type !== 'direct') return;

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsFrameReady(true);
          })
          .catch((err) => {
            console.warn('Playback with audio restricted by browser policy, falling back to muted playback:', err);
            video.muted = true;
            onMuteChange?.(true);
            video.play()
              .then(() => setIsFrameReady(true))
              .catch(e => console.error('Muted playback retry failed:', e));
          });
      }
    } else {
      video.pause();
    }
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

  // Keep sound alive when user switches browser tabs or returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (soundAudioRef.current && isPlaying && !isMuted && resolvedSoundAudioUrl) {
          soundAudioRef.current.play().catch(() => {});
        }
        if (videoRef.current && isPlaying) {
          videoRef.current.play().catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              onMuteChange?.(true);
              videoRef.current.play().catch(() => {});
            }
          });
        }
        if (playerRef.current && typeof playerRef.current.playVideo === 'function' && isPlaying) {
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
      if (!window.YT || !window.YT.Player) return;

      const element = document.getElementById(containerId);
      if (!element) return;

      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch (_) {}
      }

      playerRef.current = new window.YT.Player(containerId, {
        videoId: parsedMedia.youtubeId,
        playerVars: {
          autoplay: 1,
          mute: isMuted ? 1 : 0,
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
            if (!isMounted) return;
            onMediaReady();
            if (resolvedSoundAudioUrl || isMuted) {
              try { event.target.mute(); } catch (_) {}
            } else {
              try {
                event.target.setVolume(volume * 100);
                event.target.unMute();
              } catch (_) {}
            }
            if (isPlaying) {
              try {
                event.target.playVideo();
              } catch (e) {
                try {
                  event.target.mute();
                  onMuteChange?.(true);
                  event.target.playVideo();
                } catch (_) {}
              }
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            if (event.data === 1) { // Playing
              setIsFrameReady(true);
              onMediaReady();
              onPlaybackStateChange?.(true);
              if (!isMuted && !resolvedSoundAudioUrl) {
                try {
                  event.target.unMute();
                  event.target.setVolume(volume * 100);
                } catch (_) {}
              }
              if (soundAudioRef.current && isPlaying && !isMuted && resolvedSoundAudioUrl) {
                soundAudioRef.current.play().catch(() => {});
              }
            } else if (event.data === 2) { // Paused
              onPlaybackStateChange?.(false);
              if (soundAudioRef.current) {
                soundAudioRef.current.pause();
              }
            } else if (event.data === 0) { // Ended
              event.target.playVideo(); // Loop
              if (soundAudioRef.current) {
                soundAudioRef.current.currentTime = 0;
                soundAudioRef.current.play().catch(() => {});
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
        initShortPlayer();
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
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch (e) {}
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
    if (video && isPlaying && video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsFrameReady(true);
          })
          .catch(() => {
            video.muted = true;
            onMuteChange?.(true);
            video.play().then(() => setIsFrameReady(true)).catch(() => {});
          });
      }
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
      {/* Instant poster thumbnail backdrop (smoothly fades away as soon as live video frames render) */}
      {short.thumbnailUrl && (
        <img
          src={short.thumbnailUrl}
          alt={short.title}
          className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-300 ${
            isFrameReady ? 'opacity-0' : 'opacity-100 filter blur-xs scale-105'
          }`}
        />
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
          autoPlay
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
            setIsFrameReady(true);
            onMediaReady();
            onPlaybackStateChange?.(true);
          }}
          onPlay={() => {
            setIsFrameReady(true);
            onMediaReady();
            onPlaybackStateChange?.(true);
            if (soundAudioRef.current && isPlaying && !isMuted && resolvedSoundAudioUrl) {
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
  const targetShortId = route.param;

  // Instant synchronous cache retrieval (0ms initial frame render)
  const initialCachedShort = targetShortId ? videoService.getCachedVideo(targetShortId) : null;
  const [shorts, setShorts] = useState<Video[]>(() => initialCachedShort ? [initialCachedShort] : []);
  const [loading, setLoading] = useState<boolean>(() => !initialCachedShort);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setTransitionDirection] = useState<'up' | 'down' | null>(null);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [creator, setCreator] = useState<User | null>(null);

  // Like & Comment drawer state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
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

  // Subscription State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const fetchShorts = async () => {
    setLoading(true);
    try {
      const data = await videoService.getVideos({ isShort: true });
      let allShorts = data;
      if (allShorts.length < 5) {
        const curated = DEFAULT_CURATED_SHORTS as Video[];
        const existingIds = new Set(data.map(v => v.videoId));
        const filteredCurated = curated.filter(c => !existingIds.has(c.videoId));
        allShorts = [...data, ...filteredCurated];
      }

      if (allShorts.length > 0) {
        // AI Recommendation Ranking & Anti-Repeat Filter
        const ranked = recommendationService.rankAndFilterVideos(allShorts, {
          isShortsOnly: true,
          userUid: currentUser?.uid
        });

        // If route specifies a short ID, find index or fetch
        if (targetShortId) {
          const idx = ranked.findIndex(s => s.videoId === targetShortId);
          if (idx !== -1) {
            setShorts(ranked);
            setCurrentIndex(idx);
          } else {
            const matchedCurated = (DEFAULT_CURATED_SHORTS as Video[]).find(s => s.videoId === targetShortId);
            if (matchedCurated) {
              setShorts([matchedCurated, ...ranked]);
              setCurrentIndex(0);
            } else {
              const singleShort = await videoService.getVideo(targetShortId);
              if (singleShort && singleShort.isShort) {
                setShorts([singleShort, ...ranked]);
                setCurrentIndex(0);
              } else {
                setShorts(ranked);
                setCurrentIndex(0);
              }
            }
          }
        } else {
          setShorts(ranked);
          setCurrentIndex(0);
        }
      } else {
        setShorts(DEFAULT_CURATED_SHORTS as Video[]);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error(err);
      setShorts(DEFAULT_CURATED_SHORTS as Video[]);
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShorts();
  }, [targetShortId]);

  const activeShort = shorts[currentIndex];

  const isShortOwner = currentUser?.uid === activeShort?.creatorId;
  const isShortAdmin = currentUserProfile?.role === 'admin';
  const isShortPaid = !!(activeShort?.isPaid && (activeShort?.price || 0) > 0);
  const isShortLocked = isShortPaid && !isShortOwner && !isShortAdmin && !isShortUnlocked;
  const viewerTotalBalance = (currentUserProfile?.walletBalance || 0) + (currentUserProfile?.bonusBalance || 0);

  // Sync like and comments stats for active short & increment view count
  useEffect(() => {
    if (!activeShort) return;

    // Trigger view count increment (protected by 24h Anti-Spam View Guard!)
    videoService.incrementViewCount(activeShort.videoId).catch(console.error);

    // Record watch ID for AI Anti-Repeat Recommendation Engine
    recommendationService.recordVideoWatch(activeShort.videoId, currentUser?.uid);

    setLikesCount(activeShort.likesCount || 0);
    setCommentsCount(activeShort.commentsCount || 0);
    setShowComments(false);
    setCreator(null);
    
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

    if (currentUser) {
      likeService.hasLiked(activeShort.videoId, currentUser.uid).then(setIsLiked).catch(console.error);
    } else {
      setIsLiked(false);
    }

    // Check offline download status
    downloadService.isDownloaded(activeShort.videoId).then(setIsDownloaded).catch(() => {});
    setOptionsMenuOpen(false);

    // Check subscription status
    if (currentUser?.uid && activeShort.creatorId && currentUser.uid !== activeShort.creatorId) {
      subscriptionService.isSubscribed(currentUser.uid, activeShort.creatorId)
        .then(setIsSubscribed)
        .catch(() => setIsSubscribed(false));
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
  }, [activeShort?.videoId, activeShort?.creatorId, currentUser?.uid, currentUserProfile?.role]);

  const handleSubscribeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      addToast('Please sign in to subscribe to creators.', 'info');
      navigate('signin');
      return;
    }
    if (subscribing) return;
    if (!activeShort?.creatorId || activeShort.creatorId === currentUser.uid) {
      return;
    }
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
      setIsSubscribed(newStatus);
    } catch (err) {
      setIsSubscribed(!nextSub);
      addToast('Could not update subscription.', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnlockShort = async () => {
    if (!currentUser) {
      addToast('Please sign in to unlock this exclusive Short.', 'info');
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
      addToast(`🎉 Payment successful! Short unlocked for ₹${price}. Enjoy watching!`, 'success');
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
      if (window.confirm('Delete this short from offline downloads?')) {
        try {
          await downloadService.deleteDownload(activeShort.videoId);
          setIsDownloaded(false);
          addToast('Short removed from offline downloads.', 'info');
        } catch {
          addToast('Failed to remove download.', 'error');
        }
      }
      return;
    }

    if (downloadProgress !== null) return;
    setDownloadProgress(0);
    addToast('Downloading Short for offline viewing...', 'info');

    try {
      await downloadService.downloadVideo(activeShort, (percent) => {
        setDownloadProgress(percent);
      });
      setIsDownloaded(true);
      setDownloadProgress(null);
      addToast('Short downloaded! Watch offline anytime in Downloads.', 'success');
    } catch (err) {
      console.error('Download error:', err);
      setDownloadProgress(null);
      addToast('Failed to download short stream.', 'error');
    }
  };

  const handleNext = () => {
    if (currentIndex < shorts.length - 1) {
      setIsMediaReady(false);
      setIsPlaying(true);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsMediaReady(false);
      setIsPlaying(true);
      setCurrentIndex(prev => prev - 1);
    }
  };

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
      const minSwipeDistance = 45;
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
      addToast('Please sign in to like Shorts.', 'info');
      return;
    }

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

    if (nextShow && activeShort) {
      setLoadingComments(true);
      try {
        const comms = await commentService.getComments(activeShort.videoId);
        setComments(comms);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleShare = () => {
    if (!activeShort) return;
    const shareUrl = `${window.location.origin}/#/shorts/${activeShort.videoId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast('Shorts link copied to clipboard!', 'success');
    });
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to comment.', 'info');
      return;
    }

    setSubmittingComment(true);
    try {
      const created = await commentService.addComment(activeShort.videoId, {
        uid: currentUser.uid,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL,
        text: newCommentText.trim()
      });

      setComments(prev => [created, ...prev]);
      setCommentsCount(prev => prev + 1);
      setNewCommentText('');
      addToast('Comment posted!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to post comment', 'error');
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
    if (!currentUser || !currentUserProfile || !replyText.trim()) return;
    const currentReplyText = replyText.trim();
    const tempReplyId = `temp-reply-${Date.now()}`;
    const now = new Date().toISOString();

    const tempReply: Comment = {
      commentId: tempReplyId,
      videoId: activeShort.videoId,
      uid: currentUser.uid,
      username: currentUserProfile.username,
      displayName: currentUserProfile.displayName,
      photoURL: currentUserProfile.photoURL || '',
      text: currentReplyText,
      likesCount: 0,
      parentCommentId,
      createdAt: now,
      updatedAt: now
    };

    // 100% INSTANT OPTIMISTIC UPDATE (0ms latency!)
    setComments(prev => [...prev, tempReply]);
    setCommentsCount(prev => prev + 1);
    setReplyText('');
    setReplyingTo(null);
    addToast('Reply posted!', 'success');

    try {
      const created = await commentService.addComment(activeShort.videoId, {
        uid: currentUser.uid,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL || '',
        text: currentReplyText,
        parentCommentId
      });
      setComments(prev => prev.map(c => c.commentId === tempReplyId ? created : c));
    } catch (err) {
      setComments(prev => prev.filter(c => c.commentId !== tempReplyId));
      setCommentsCount(prev => Math.max(0, prev - 1));
      setReplyText(currentReplyText);
      setReplyingTo(parentCommentId);
      addToast('Failed to post reply', 'error');
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (window.confirm('Delete this comment?')) {
      try {
        await commentService.deleteComment(activeShort.videoId, commentId);
        setComments(prev => prev.filter(c => c.commentId !== commentId));
        setCommentsCount(prev => prev - 1);
        addToast('Comment deleted', 'info');
      } catch (err) {
        addToast('Failed to delete', 'error');
      }
    }
  };

  const handleLikeComment = async (targetComment: Comment) => {
    if (!currentUser) {
      addToast('Please sign in to like comments.', 'info');
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
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="w-85 sm:w-96 h-[550px] bg-slate-200 dark:bg-[#111827] rounded-3xl animate-pulse flex flex-col justify-end p-6 space-y-4">
          <div className="h-6 bg-slate-300 dark:bg-[#1E293B] rounded w-2/3" />
          <div className="h-4 bg-slate-300 dark:bg-[#1E293B] rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (shorts.length === 0 || !activeShort) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[calc(100vh-8rem)]">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/30 shadow-xs">
          <Zap className="w-7 h-7 fill-current" />
        </div>
        <h4 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">No short videos available yet</h4>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 max-w-sm font-medium">
          Short vertical videos published on SocialIndia will appear here.
        </p>
        <button
          onClick={() => navigate('studio')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs"
        >
          Publish a Short
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start md:justify-center p-0 md:p-3 md:py-2 h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4.5rem)] relative select-none max-w-6xl mx-auto overflow-hidden">
      
      <div className="flex flex-col md:flex-row items-center md:items-center justify-center gap-6 w-full h-[calc(100dvh-3.5rem)] md:h-[min(calc(100vh-5.5rem),660px)]">
        
        {/* Navigation Arrows for desktop (Left side) */}
        <div className="hidden md:flex flex-col justify-center gap-4">
          <button
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className="p-4 bg-white dark:bg-[#111827] hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-[1.5rem] disabled:opacity-20 cursor-pointer shadow-xl transition-all active:scale-90"
            title="Previous Short"
          >
            <ChevronUp className="w-6 h-6 text-slate-700 dark:text-slate-300 stroke-[2.5]" />
          </button>
          <button
            disabled={currentIndex === shorts.length - 1}
            onClick={handleNext}
            className="p-4 bg-white dark:bg-[#111827] hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-[1.5rem] disabled:opacity-20 cursor-pointer shadow-xl transition-all active:scale-90"
            title="Next Short"
          >
            <ChevronDown className="w-6 h-6 text-slate-700 dark:text-slate-300 stroke-[2.5]" />
          </button>
        </div>

        {/* Vertical Shorts Player Container (Full Screen Edge-to-Edge on Mobile) */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className="relative w-full max-w-full md:max-w-[390px] h-[calc(100dvh-3.5rem)] md:h-[min(calc(100vh-5.5rem),660px)] md:aspect-[9/16] bg-black rounded-none md:rounded-[2rem] shadow-2xl border-none md:border border-slate-200 dark:border-[#334155] overflow-hidden flex flex-col group touch-pan-y"
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
              Shorts
            </span>
          </div>
          
          {/* Media Player Component Wrapper with Smooth Sliding Transitions */}
          <div className={`w-full h-full transition-all duration-200 ease-out transform ${
            swipeDirection === 'up' 
              ? '-translate-y-full opacity-20 scale-95' 
              : swipeDirection === 'down' 
              ? 'translate-y-full opacity-20 scale-95' 
              : 'translate-y-0 opacity-100 scale-100 animate-in fade-in duration-300'
          }`}>
            <ShortVideoMedia 
              key={activeShort.videoId} 
              short={activeShort} 
              isPlaying={isPlaying && !swipeDirection && !isShortLocked}
              volume={volume}
              isMuted={isMuted}
              onMediaReady={() => setIsMediaReady(true)}
              onPlaybackStateChange={setIsPlaying}
              onMuteChange={setIsMuted}
            />
          </div>

          {/* Tap to Unmute Floating Prompt if browser restricted initial audio */}
          {isMuted && isPlaying && !isShortLocked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(false);
              }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-35 px-3.5 py-1.5 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white text-[11px] font-black tracking-wide flex items-center gap-1.5 transition-all shadow-xl cursor-pointer active:scale-95"
            >
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>{isHindi ? 'आवाज़ चालू करें' : 'Tap to unmute'}</span>
            </button>
          )}

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
                    Exclusive Paid Short
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
              title={isHindi ? 'नया शॉर्ट बनाएं' : 'Create a Short'}
              aria-label="Create a Short"
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
                className="absolute top-12 right-0 w-60 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2 shadow-2xl z-50 text-white animate-zoom-in"
              >
                <button
                  onClick={() => {
                    setOptionsMenuOpen(false);
                    handleDownloadShort();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/10 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer"
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
                      <span>Download Short</span>
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
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/10 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer"
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
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/10 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Copy Short Link</span>
                </button>

                <div className="h-px bg-white/10 my-1" />

                <button
                  onClick={() => {
                    setOptionsMenuOpen(false);
                    addToast('Report submitted for review.', 'info');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-rose-500/20 text-rose-400 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer"
                >
                  <Flag className="w-4 h-4" />
                  <span>Report Short</span>
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
          <div className="absolute right-3 sm:right-3.5 bottom-20 md:bottom-22 flex flex-col gap-3.5 text-white z-30">
            {/* LIKE BUTTON */}
            <button 
              onClick={handleLikeToggle}
              className="group/btn flex flex-col items-center gap-1 cursor-pointer"
            >
              <div className={`w-11 h-11 sm:w-12 sm:h-12 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95 ${isLiked ? 'bg-rose-600/30 border-rose-500/50' : 'hover:bg-black/65'}`}>
                <Heart className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'}`} />
              </div>
              <span className="text-[11px] font-bold drop-shadow-md">{likesCount}</span>
            </button>

            {/* COMMENTS BUTTON */}
            <button 
              onClick={handleToggleComments}
              className="group/btn flex flex-col items-center gap-1 cursor-pointer"
            >
              <div className={`w-11 h-11 sm:w-12 sm:h-12 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95 ${showComments ? 'bg-blue-600/30 border-blue-500/50' : 'hover:bg-black/65'}`}>
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-[11px] font-bold drop-shadow-md">{commentsCount}</span>
            </button>

            {/* SHARE BUTTON */}
            <button 
              onClick={handleShare}
              className="group/btn flex flex-col items-center gap-1 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-black/45 backdrop-blur-md hover:bg-black/65 rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-[11px] font-bold drop-shadow-md">{t('action_share', 'Share')}</span>
            </button>

            {/* DOWNLOAD BUTTON */}
            <button 
              onClick={handleDownloadShort}
              disabled={downloadProgress !== null}
              className="group/btn flex flex-col items-center gap-1 cursor-pointer"
              title={isDownloaded ? "Downloaded offline" : "Download short"}
            >
              <div className={`w-11 h-11 sm:w-12 sm:h-12 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95 ${
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
              <span className="text-[11px] font-bold drop-shadow-md">
                {downloadProgress !== null ? `${downloadProgress}%` : isDownloaded ? (isHindi ? 'सहेजा गया' : 'Saved') : (isHindi ? 'डाउनलोड' : 'Download')}
              </span>
            </button>

            {/* SAVE TO PLAYLIST BUTTON */}
            <button 
              onClick={() => setPlaylistModalOpen(true)}
              className="group/btn flex flex-col items-center gap-1 cursor-pointer"
              title={isHindi ? 'प्लेलिस्ट में सहेजें' : 'Save to Playlist'}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-black/45 backdrop-blur-md hover:bg-black/65 rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-110 active:scale-95">
                <Bookmark className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-bold drop-shadow-md">{isHindi ? 'सहेजें' : 'Save'}</span>
            </button>
          </div>

          {/* Details Overlay bottom */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 sm:p-5 pb-4 sm:pb-5 md:pb-4 text-white flex flex-col gap-2 z-25 pointer-events-none">
            {/* Creator Row + Subscribe Button */}
            <div className="flex items-center justify-between gap-3 pointer-events-auto">
              <div className="flex items-center gap-2.5 min-w-0">
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
                    {(creator?.role === 'creator' || creator?.role === 'admin') && (
                      <span className="inline-flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-[8px] w-3.5 h-3.5 rounded-full font-black shrink-0 shadow-md" title="Verified Creator">✓</span>
                    )}
                  </h4>
                  <p className="text-[11px] text-white/80 font-bold truncate drop-shadow-sm">@{activeShort.creatorUsername}</p>
                </div>
              </div>

              {/* Subscribe button (Screenshot 2 styling) */}
              {currentUser?.uid !== activeShort.creatorId && (
                <button
                  onClick={handleSubscribeToggle}
                  disabled={subscribing}
                  className={`px-4 py-1.5 rounded-full text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ${
                    isSubscribed
                      ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/20'
                      : 'bg-white text-[#0F172A] hover:bg-slate-100 hover:scale-105'
                  }`}
                >
                  {isSubscribed ? t('action_subscribed', 'Subscribed') : t('action_subscribe', 'Subscribe')}
                </button>
              )}
            </div>

            <div className="pr-14">
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
          <div className="fixed inset-x-0 bottom-14 md:bottom-0 top-1/3 md:top-auto md:right-4 md:inset-x-auto md:w-[380px] md:h-[580px] bg-white dark:bg-[#111827] rounded-t-3xl md:rounded-3xl border border-slate-200 dark:border-[#334155] shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-10 duration-250">
            {/* Top Drag Handle indicator for Mobile */}
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 md:hidden" />
            {/* Comments Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                  Comments
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{commentsCount} interactions</p>
              </div>
              <button 
                onClick={() => setShowComments(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Comment List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
              {loadingComments ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-8 h-8 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gathering thoughts...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-20 px-6 space-y-3">
                  <MessageSquare className="w-12 h-12 text-slate-100 dark:text-slate-800 mx-auto" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Silent Zone</p>
                  <p className="text-[10px] text-slate-500 font-bold">Be the first to break the silence!</p>
                </div>
              ) : (
                comments.filter(c => !c.parentCommentId).map(c => (
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
                        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium break-words">
                          {renderCommentText(c.text)}
                        </p>
                        {/* YouTube-Style Comment Action Row */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
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
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium break-words">{renderCommentText(r.text)}</p>
                            
                            <div className="flex items-center gap-2 mt-2">
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
                ))
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
          </div>
        )}

      </div>
    </div>
  );
};
