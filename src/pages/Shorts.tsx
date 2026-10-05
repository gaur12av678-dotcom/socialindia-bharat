import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { recommendationService } from '../services/recommendationService';
import { userService } from '../services/userService';
import { likeService } from '../services/likeService';
import { commentService } from '../services/commentService';
import { downloadService } from '../services/downloadService';
import { DEFAULT_SOUNDS } from '../services/soundService';
import { Video, Comment, User } from '../types';
import { parseVideoUrl, getInitials, formatTimeAgo } from '../utils/videoUtils';
import { UserAvatar } from '../components/UserAvatar';
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
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { paidVideoService } from '../services/paidVideoService';
import { SoundLibraryModal } from '../components/SoundLibraryModal';
import { SoundDetailsModal } from '../components/SoundDetailsModal';
import { SaveToPlaylistModal } from '../components/SaveToPlaylistModal';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Inner player for Shorts that autoplays & crops YouTube overlays cleanly, and plays attached sound library tracks
const ShortVideoMedia: React.FC<{ 
  short: Video, 
  isPlaying: boolean, 
  volume: number, 
  isMuted: boolean,
  onMediaReady: () => void
}> = ({ short, isPlaying, volume, isMuted, onMediaReady }) => {
  const parsedMedia = parseVideoUrl(short.videoUrl);
  const containerId = `yt-short-${short.videoId}`;
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const soundAudioRef = useRef<HTMLAudioElement>(null);

  // Resolve valid audio track URL (handles soundId fallback and excludes broken pixabay links)
  const resolvedSoundAudioUrl = useMemo(() => {
    let url = short.soundAudioUrl;
    if (url && url.includes('pixabay.com')) {
      const fallback = DEFAULT_SOUNDS.find(s => s.soundId === short.soundId);
      url = fallback ? fallback.audioUrl : undefined;
    }
    if (!url && short.soundId && !short.soundId.startsWith('orig_sound_')) {
      const fallback = DEFAULT_SOUNDS.find(s => s.soundId === short.soundId);
      if (fallback) url = fallback.audioUrl;
    }
    // Only return if it's an audio link and not a YouTube/video link
    if (url && !url.includes('youtube.com') && !url.includes('youtu.be')) {
      return url;
    }
    return null;
  }, [short.soundAudioUrl, short.soundId]);

  // Sync volume and mute for direct video
  useEffect(() => {
    if (videoRef.current) {
      // If a soundtrack is attached, keep direct video muted so custom soundtrack plays crystal clear
      videoRef.current.volume = resolvedSoundAudioUrl ? 0 : volume;
      videoRef.current.muted = resolvedSoundAudioUrl ? true : isMuted;
    }
  }, [volume, isMuted, resolvedSoundAudioUrl]);

  // Sync play/pause for direct video
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [isPlaying]);

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
      if (resolvedSoundAudioUrl) {
        playerRef.current.mute();
      } else {
        playerRef.current.setVolume(isMuted ? 0 : volume * 100);
      }
    }
  }, [volume, isMuted, resolvedSoundAudioUrl]);

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (parsedMedia.type !== 'youtube' || !parsedMedia.youtubeId) return;

    let isMounted = true;

    const initShortPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initShortPlayer, 100);
        return;
      }

      const element = document.getElementById(containerId);
      if (!element) return;

      playerRef.current = new window.YT.Player(containerId, {
        videoId: parsedMedia.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          loop: 1,
          playlist: parsedMedia.youtubeId,
          disablekb: 1,
          fs: 0,
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            onMediaReady();
            if (resolvedSoundAudioUrl) {
              event.target.mute();
              if (soundAudioRef.current && isPlaying && !isMuted) {
                soundAudioRef.current.play().catch(() => {});
              }
            } else {
              event.target.setVolume(isMuted ? 0 : volume * 100);
            }
            try {
              if (isPlaying) event.target.playVideo();
            } catch (e) {
              event.target.mute();
              if (isPlaying) event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            if (event.data === 1) { // Playing
              if (soundAudioRef.current && isPlaying && !isMuted) {
                soundAudioRef.current.play().catch(() => {});
              }
            } else if (event.data === 2) { // Paused
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

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initShortPlayer();
      };
    } else {
      initShortPlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
      if (soundAudioRef.current) {
        soundAudioRef.current.pause();
      }
    };
  }, [short.videoId, short.videoUrl, resolvedSoundAudioUrl]);

  return (
    <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
      {/* Attached Sound Library Audio Element */}
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
        /* Reduced crop from 22% to 12% and scale from 1.44 to 1.15 to prevent important content from being cut off while still hiding some YT UI */
        <div className="absolute -inset-[12%] w-[124%] h-[124%] scale-[1.15] pointer-events-none flex items-center justify-center">
          <div id={containerId} className="w-full h-full" />
        </div>
      ) : parsedMedia.type === 'drive' ? (
        <iframe
          src={`${parsedMedia.embedUrl}?autoplay=1`}
          title={short.title}
          frameBorder="0"
          allow="autoplay; encrypted-media"
          onLoad={onMediaReady}
          className="w-full h-full object-cover scale-110"
        />
      ) : parsedMedia.type === 'direct' ? (
        <video
          ref={videoRef}
          src={parsedMedia.embedUrl}
          autoPlay
          loop
          playsInline
          muted={resolvedSoundAudioUrl ? true : isMuted}
          onCanPlay={() => {
            onMediaReady();
            if (videoRef.current && isPlaying) {
              videoRef.current.play().catch(() => {});
            }
            if (soundAudioRef.current && isPlaying && !isMuted) {
              soundAudioRef.current.play().catch(() => {});
            }
          }}
          onPlay={() => {
            if (soundAudioRef.current && isPlaying && !isMuted) {
              soundAudioRef.current.play().catch(() => {});
            }
          }}
          onPause={() => {
            if (soundAudioRef.current) {
              soundAudioRef.current.pause();
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current && soundAudioRef.current) {
              const vTime = videoRef.current.currentTime;
              const dur = soundAudioRef.current.duration || 30;
              if (Math.abs((vTime % dur) - soundAudioRef.current.currentTime) > 1.5) {
                soundAudioRef.current.currentTime = vTime % dur;
              }
            }
          }}
          className="w-full h-full object-cover"
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
  
  const [shorts, setShorts] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
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

  const targetShortId = route.param;

  const fetchShorts = async () => {
    setLoading(true);
    try {
      const data = await videoService.getVideos({ isShort: true });
      if (data.length > 0) {
        // AI Recommendation Ranking & Anti-Repeat Filter
        const ranked = recommendationService.rankAndFilterVideos(data, {
          isShortsOnly: true,
          userUid: currentUser?.uid
        });

        setShorts(ranked);

        // If route specifies a short ID, find index or fetch
        if (targetShortId) {
          const idx = ranked.findIndex(s => s.videoId === targetShortId);
          if (idx !== -1) {
            setCurrentIndex(idx);
          } else {
            const singleShort = await videoService.getVideo(targetShortId);
            if (singleShort && singleShort.isShort) {
              setShorts([singleShort, ...ranked]);
              setCurrentIndex(0);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
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
    
    // Fetch latest creator profile for up-to-date avatar
    userService.getUserProfile(activeShort.creatorId).then(crProfile => {
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
  }, [activeShort?.videoId, currentUser?.uid, currentUserProfile?.role]);

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
    if (swipeDirection) return;
    if (currentIndex < shorts.length - 1) {
      setTransitionDirection('up');
      setTimeout(() => {
        setIsMediaReady(false);
        setIsPlaying(true);
        setCurrentIndex(prev => prev + 1);
        setTransitionDirection(null);
      }, 220);
    }
  };

  const handlePrev = () => {
    if (swipeDirection) return;
    if (currentIndex > 0) {
      setTransitionDirection('down');
      setTimeout(() => {
        setIsMediaReady(false);
        setIsPlaying(true);
        setCurrentIndex(prev => prev - 1);
        setTransitionDirection(null);
      }, 220);
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
        addToast('Removed from liked videos', 'info');
      } else {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        await likeService.likeVideo(activeShort.videoId, currentUser.uid);
        await userService.awardPoints(currentUser.uid, 5);
        await refreshProfile();
        addToast('Added to liked videos! (+5 Points)', 'success');
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
    try {
      const created = await commentService.addComment(activeShort.videoId, {
        uid: currentUser.uid,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL,
        text: replyText.trim(),
        parentCommentId
      });
      setComments(prev => [...prev, created]);
      setCommentsCount(prev => prev + 1);
      setReplyText('');
      setReplyingTo(null);
      addToast('Reply posted!', 'success');
    } catch (err) {
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
    <div className="flex flex-col items-center justify-center p-4 md:p-6 min-h-[calc(100vh-4rem)] relative select-none max-w-6xl mx-auto">
      
      <div className="flex flex-col md:flex-row items-center md:items-stretch justify-center gap-6 w-full h-[650px] md:h-[750px]">
        
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

        {/* Vertical Shorts Player Container */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-[#334155] overflow-hidden flex flex-col group touch-pan-y"
        >
          
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
            />
          </div>

          {/* PAID SHORT PAYWALL OVERLAY */}
          {isShortLocked && (
            <div className="absolute inset-0 z-35 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
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
                      <span>Top Up Wallet (Need ₹{((activeShort.price || 0) - viewerTotalBalance).toFixed(2)})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TOP BAR: YouTube-style 3-Dot More Options Menu */}
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOptionsMenuOpen(!optionsMenuOpen);
              }}
              className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-all cursor-pointer shadow-lg active:scale-95"
              title="More options"
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>

            {/* YouTube-style Options Dropdown Menu */}
            {optionsMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute top-12 right-0 w-60 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2 shadow-2xl z-40 text-white animate-zoom-in"
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
            className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
          >
            {!isPlaying && !isShortLocked && (
              <div className="w-20 h-20 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white animate-zoom-in">
                <Play className="w-10 h-10 fill-current ml-1" />
              </div>
            )}
          </div>

          {/* Interaction Side Overlay */}
          <div className="absolute right-4 bottom-24 flex flex-col gap-5 text-white z-20">
            {/* VOLUME BUTTON */}
            <div className="group/volume relative flex flex-col items-center">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
              </button>
              
              {/* Vertical Volume Slider on Hover */}
              <div className="absolute bottom-14 hidden group-hover/volume:flex h-32 w-10 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 items-center justify-center p-3 animate-in slide-in-from-bottom-2">
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    setIsMuted(val === 0);
                  }}
                  className="w-24 h-1.5 accent-blue-500 -rotate-90 cursor-pointer origin-center"
                />
              </div>
            </div>

            <button 
              onClick={handleLikeToggle}
              className="group/btn flex flex-col items-center gap-1"
            >
              <div className={`w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95 ${isLiked ? 'bg-rose-600/20 border-rose-600/40' : 'hover:bg-black/60'}`}>
                <Heart className={`w-6 h-6 transition-colors ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'}`} />
              </div>
              <span className="text-[10px] font-black drop-shadow-md">{likesCount}</span>
            </button>

            <button 
              onClick={handleToggleComments}
              className="group/btn flex flex-col items-center gap-1"
            >
              <div className={`w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95 ${showComments ? 'bg-blue-600/20 border-blue-600/40' : 'hover:bg-black/60'}`}>
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black drop-shadow-md">{commentsCount}</span>
            </button>

            <button 
              onClick={handleShare}
              className="group/btn flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black drop-shadow-md">Share</span>
            </button>

            {/* DOWNLOAD BUTTON */}
            <button 
              onClick={handleDownloadShort}
              disabled={downloadProgress !== null}
              className="group/btn flex flex-col items-center gap-1"
              title={isDownloaded ? "Downloaded offline" : "Download short"}
            >
              <div className={`w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95 ${
                isDownloaded ? 'bg-emerald-600/30 border-emerald-500/50' : 'hover:bg-black/60'
              }`}>
                {downloadProgress !== null ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : isDownloaded ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowDownToLine className="w-5 h-5 text-white" />
                )}
              </div>
              <span className="text-[10px] font-black drop-shadow-md">
                {downloadProgress !== null ? `${downloadProgress}%` : isDownloaded ? 'Saved' : 'Download'}
              </span>
            </button>

            {/* SAVE TO PLAYLIST BUTTON */}
            <button 
              onClick={() => setPlaylistModalOpen(true)}
              className="group/btn flex flex-col items-center gap-1"
              title="Save to Playlist"
            >
              <div className="w-12 h-12 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95">
                <Bookmark className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-black drop-shadow-md">Save</span>
            </button>
          </div>

          {/* Details Overlay bottom */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 text-white flex flex-col gap-3 z-10 pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <UserAvatar 
                uid={activeShort.creatorId}
                fallbackPhotoURL={activeShort.creatorPhotoURL}
                fallbackDisplayName={activeShort.creatorDisplayName}
                size="md"
                onClick={() => navigate('creator', activeShort.creatorUsername)}
                className="rounded-[1rem] border-2 border-white/10 shadow-lg"
              />
              <div className="min-w-0">
                <h4 onClick={() => navigate('creator', activeShort.creatorUsername)} className="text-xs font-black hover:underline cursor-pointer truncate drop-shadow-md flex items-center gap-1">
                  <span>{activeShort.creatorDisplayName}</span>
                  {(creator?.role === 'creator' || creator?.role === 'admin') && (
                    <span className="inline-flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-[8px] w-3.5 h-3.5 rounded-full font-black shrink-0 shadow-md" title="Verified Creator">✓</span>
                  )}
                </h4>
                <p className="text-[10px] text-blue-400 font-bold truncate drop-shadow-sm">@{activeShort.creatorUsername}</p>
              </div>
            </div>

            <div className="pr-14">
              <h3 className="text-xs font-bold leading-relaxed line-clamp-2 drop-shadow-lg">
                {activeShort.title}
              </h3>
              <p className="text-[10px] text-blue-500 font-black mt-1 uppercase tracking-widest drop-shadow-sm">#{activeShort.category}</p>

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

        {/* SIDE-OPENING COMMENTS DRAWER (WEB) */}
        {showComments && (
          <div className="flex-1 max-w-[400px] bg-white dark:bg-[#111827] rounded-[2.5rem] border border-slate-200 dark:border-[#334155] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
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
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-sm text-white shrink-0 shadow-lg border border-white/10">
                        {c.photoURL ? (
                          <img src={c.photoURL} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          <span>{getInitials(c.displayName)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-black text-[11px] text-slate-900 dark:text-white truncate">@{c.username}</span>
                          <span className="text-[9px] text-slate-400 font-bold shrink-0">{formatTimeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium break-words">
                          {renderCommentText(c.text)}
                        </p>
                        <div className="flex items-center gap-5 mt-2.5">
                          <button 
                            onClick={() => setReplyingTo(c.commentId)}
                            className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors cursor-pointer"
                          >
                            Reply
                          </button>
                          {currentUser?.uid === c.uid && (
                            <button 
                              onClick={() => handleCommentDelete(c.commentId)}
                              className="text-[9px] font-black text-slate-400 hover:text-rose-600 uppercase tracking-widest transition-colors cursor-pointer"
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
                              className="flex-1 px-4 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handlePostReply(c.commentId)}
                              className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase rounded-xl cursor-pointer"
                            >
                              X
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nested Replies */}
                    <div className="ml-14 space-y-4">
                      {comments.filter(r => r.parentCommentId === c.commentId).map(r => (
                        <div key={r.commentId} className="flex gap-3 items-start group">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-black text-[10px] text-slate-500 shrink-0 border border-slate-200 dark:border-slate-800">
                            {r.photoURL ? <img src={r.photoURL} alt="" className="w-full h-full object-cover rounded-xl" /> : getInitials(r.displayName)}
                          </div>
                          <div className="flex-1 min-w-0 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black text-slate-900 dark:text-white truncate">@{r.username}</span>
                              <span className="text-[8px] text-slate-400 font-bold">{formatTimeAgo(r.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium break-words">{renderCommentText(r.text)}</p>
                            {currentUser?.uid === r.uid && (
                              <button onClick={() => handleCommentDelete(r.commentId)} className="mt-1 text-[8px] font-black text-rose-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                            )}
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
