import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video } from '../types';
import {
  parseVideoUrl,
  formatDuration,
  getInitials,
  getOptimizedVideoStreamUrl,
  markCloudinaryTransformFailed,
} from '../utils/videoUtils';
import { useRouter } from '../hooks/useRouter';
import { useTranslation } from '../i18n';
import { playbackProgressService } from '../services/playbackProgressService';
import { liveBroadcastService } from '../services/liveBroadcastService';
import { userService } from '../services/userService';
import { UserAvatar } from './UserAvatar';
import { isUserVerified } from '../utils/userUtils';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw,
  ChevronsLeft,
  ChevronsRight,
  Tv,
  SkipForward,
  SkipBack,
  Settings,
  Clock,
  Share2,
  MoreVertical,
  Check,
  Repeat,
  Subtitles,
  ChevronRight,
  ChevronDown,
  ArrowLeft as ArrowLeftIcon,
  X as XIcon,
  Copy,
  Sliders,
  Sparkles,
  Sun,
  Flag,
  Lock,
  Unlock
} from 'lucide-react';

interface CustomVideoPlayerProps {
  video: Video;
  onEnded?: () => void;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  seekToTime?: number;
  onNextVideo?: () => void;
  onPreviousVideo?: () => void;
  hasNextVideo?: boolean;
  hasPreviousVideo?: boolean;
  onReport?: () => void;
  onProgress?: (seconds: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
  video, 
  onEnded, 
  isTheaterMode = false, 
  onToggleTheaterMode,
  seekToTime,
  onNextVideo,
  onPreviousVideo,
  hasNextVideo = false,
  hasPreviousVideo = false,
  onReport,
  onProgress
}) => {
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  const parsedMedia = parseVideoUrl(video.videoUrl);
  const videoParts = React.useMemo(() => {
    if (parsedMedia.type !== 'direct') return null;
    return Array.isArray(video.videoParts) && video.videoParts.length > 1 ? video.videoParts : null;
  }, [parsedMedia.type, video.videoParts]);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const isUserPausedRef = useRef<boolean>(false);
  const hasStartedInitialAutoplayRef = useRef<boolean>(false);
  const pendingPartSeekRef = useRef<{ partIndex: number; localTime: number; shouldPlay: boolean } | null>(null);

  // Ambient Mode (Enhanced YouTube Ambient Light)
  const ambientVideoRef = useRef<HTMLVideoElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const ytAmbientPlayerRef = useRef<any>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [isAmbientMode, setIsAmbientMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('socialindia_ambient_mode');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('socialindia:ambient-mode-change', { detail: { enabled: isAmbientMode } }));
    } catch {}
  }, [isAmbientMode]);

  const [ambientIntensity, setAmbientIntensity] = useState<'subtle' | 'balanced' | 'ultra'>(() => {
    try {
      const saved = localStorage.getItem('socialindia_ambient_intensity');
      return (saved === 'subtle' || saved === 'balanced' || saved === 'ultra') ? saved : 'balanced';
    } catch {
      return 'balanced';
    }
  });

  const toggleAmbientMode = () => {
    setIsAmbientMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('socialindia_ambient_mode', String(next));
      } catch {}
      return next;
    });
  };

  const handleAmbientIntensityChange = (level: 'subtle' | 'balanced' | 'ultra') => {
    setAmbientIntensity(level);
    try {
      localStorage.setItem('socialindia_ambient_intensity', level);
    } catch {}
  };

  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [forceRawPlayback, setForceRawPlayback] = useState(false);
  const [retrySeed, setRetrySeed] = useState(0);
  const bufferingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearBufferingTimer = React.useCallback(() => {
    if (bufferingTimerRef.current) {
      clearTimeout(bufferingTimerRef.current);
      bufferingTimerRef.current = null;
    }
  }, []);

  const scheduleBufferingSpinner = React.useCallback(() => {
    clearBufferingTimer();
    bufferingTimerRef.current = setTimeout(() => {
      const vid = videoRef.current;
      if (vid && !isUserPausedRef.current && (vid.readyState < 3 || vid.seeking)) {
        setIsBuffering(true);
      }
    }, 380);
  }, [clearBufferingTimer]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [activePartIndex, setActivePartIndex] = useState(0);
  const [partDurations, setPartDurations] = useState<number[]>(() => {
    if (!videoParts) return [];
    if (Array.isArray(video.videoPartDurations) && video.videoPartDurations.length === videoParts.length) {
      return video.videoPartDurations.map((d) => (Number.isFinite(Number(d)) && Number(d) > 0 ? Number(d) : 0));
    }
    const fallbackPerPart = (video.duration || 0) / videoParts.length;
    return videoParts.map(() => fallbackPerPart);
  });

  const rawActivePartSrc = videoParts ? (videoParts[activePartIndex] || parsedMedia.embedUrl) : parsedMedia.embedUrl;
  const approxPartBytes = videoParts && video.fileSizeBytes
    ? Math.round(video.fileSizeBytes / videoParts.length)
    : video.fileSizeBytes;
  const approxPartDuration = videoParts
    ? (partDurations[activePartIndex] || Math.round((video.duration || 0) / videoParts.length))
    : video.duration;
  const activePartSrc = forceRawPlayback
    ? rawActivePartSrc
    : getOptimizedVideoStreamUrl(rawActivePartSrc, {
        quality: selectedQuality,
        isShort: video.isShort,
        fileSizeBytes: approxPartBytes,
        duration: approxPartDuration,
      });

  const partOffsets = React.useMemo(() => {
    if (!videoParts) return [0];
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < videoParts.length; i++) {
      offsets.push(acc);
      acc += partDurations[i] || 0;
    }
    return offsets;
  }, [videoParts, partDurations]);

  const totalMultiPartDuration = React.useMemo(() => {
    if (!videoParts) return 0;
    const sum = partDurations.reduce((a, b) => a + (b || 0), 0);
    return sum > 0 ? sum : (video.duration || 0);
  }, [videoParts, partDurations, video.duration]);
  const [isCreatorVerified, setIsCreatorVerified] = useState(() =>
    isUserVerified(userService.getCachedUserProfile(video.creatorId))
  );
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // YouTube Mobile Features State
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [showUnlockPill, setShowUnlockPill] = useState(false);
  const unlockPillTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isHolding2x, setIsHolding2x] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState<boolean>(() => {
    try {
      return localStorage.getItem('socialindia_autoplay') !== 'false';
    } catch {
      return true;
    }
  });
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerMovedRef = useRef(false);
  const isLongPressTriggeredRef = useRef(false);

  useEffect(() => {
    let active = true;
    const cachedProfile = userService.getCachedUserProfile(video.creatorId);
    setIsCreatorVerified(isUserVerified(cachedProfile));

    userService.getUserProfile(video.creatorId, !isUserVerified(cachedProfile))
      .then(profile => {
        if (active) setIsCreatorVerified(isUserVerified(profile));
      })
      .catch(error => console.error('Failed to load creator verification status:', error));

    return () => {
      active = false;
    };
  }, [video.creatorId]);

  // Reset the player UI immediately when navigating to a different video.
  // This prevents the previous video's ready/playing state leaking into the next one.
  useEffect(() => {
    isUserPausedRef.current = false;
    hasStartedInitialAutoplayRef.current = false;
    pendingPartSeekRef.current = null;
    clearBufferingTimer();
    setForceRawPlayback(false);
    setMediaError(null);
    setActivePartIndex(0);
    if (videoParts) {
      if (Array.isArray(video.videoPartDurations) && video.videoPartDurations.length === videoParts.length) {
        setPartDurations(video.videoPartDurations.map((d) => (Number.isFinite(Number(d)) && Number(d) > 0 ? Number(d) : 0)));
      } else {
        const fallbackPerPart = (video.duration || 0) / videoParts.length;
        setPartDurations(videoParts.map(() => fallbackPerPart));
      }
    } else {
      setPartDurations([]);
    }
    setIsMediaReady(false);
    setIsBuffering(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(video.duration || 0);
    setShowControls(true);
    setIsScreenLocked(false);
    setShowUnlockPill(false);
    setIsHolding2x(false);
    hasAppliedSeekRef.current = false;
    setShowResumeBadge(false);
  }, [video.videoId, video.videoUrl, clearBufferingTimer]);

  // Strict media cleanup on unmount or source change so audio never leaks in background
  useEffect(() => {
    return () => {
      const vid = videoRef.current;
      if (vid) {
        try {
          vid.pause();
          vid.muted = true;
          vid.removeAttribute('src');
          vid.load();
        } catch (_) {}
      }
      const amb = ambientVideoRef.current;
      if (amb) {
        try {
          amb.pause();
          amb.muted = true;
          amb.removeAttribute('src');
          amb.load();
        } catch (_) {}
      }
    };
  }, [video.videoId, parsedMedia.embedUrl]);

  // Dynamic Live Stream Status (auto-detects when stream ends on YouTube)
  const [isLiveStream, setIsLiveStream] = useState<boolean>(() =>
    Boolean(video.isLive && !liveBroadcastService.isLiveEnded(video.videoId))
  );

  useEffect(() => {
    setIsLiveStream(Boolean(video.isLive && !liveBroadcastService.isLiveEnded(video.videoId)));
  }, [video.videoId, video.isLive]);

  useEffect(() => {
    const handleStreamEnded = (e: any) => {
      if (!e.detail?.videoId || e.detail.videoId === video.videoId) {
        setIsLiveStream(false);
        if (e.detail?.duration) {
          setDuration(e.detail.duration);
        }
      }
    };
    window.addEventListener('socialindia:live-stream-ended', handleStreamEnded);
    return () => window.removeEventListener('socialindia:live-stream-ended', handleStreamEnded);
  }, [video.videoId]);

  // Resume Playback from Last Watched Position (YouTube Style)
  const [showResumeBadge, setShowResumeBadge] = useState(false);
  const hasAppliedSeekRef = useRef(false);

  // Reset seek applied state when switching videos
  useEffect(() => {
    hasAppliedSeekRef.current = false;
    setShowResumeBadge(false);
  }, [video.videoId]);

  // Auto-dismiss resume notification badge after 6 seconds
  useEffect(() => {
    if (showResumeBadge) {
      const timer = setTimeout(() => setShowResumeBadge(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [showResumeBadge]);

  const seekToGlobalTime = React.useCallback((targetTime: number, shouldPlayAfterSeek?: boolean) => {
    const clampedTarget = Math.max(0, targetTime);
    setCurrentTime(clampedTarget);

    if (parsedMedia.type === 'youtube' && ytPlayerRef.current?.seekTo) {
      try {
        ytPlayerRef.current.seekTo(clampedTarget, true);
        if (ytAmbientPlayerRef.current?.seekTo) {
          ytAmbientPlayerRef.current.seekTo(clampedTarget, true);
        }
        if (shouldPlayAfterSeek && !isUserPausedRef.current) {
          ytPlayerRef.current.playVideo?.();
          if (isAmbientMode) ytAmbientPlayerRef.current?.playVideo?.();
          setIsPlaying(true);
        }
      } catch (err) {
        console.warn('YT seek failed:', err);
      }
      return;
    }

    if (videoParts && videoParts.length > 1) {
      let targetIdx = videoParts.length - 1;
      for (let i = 0; i < videoParts.length; i++) {
        const start = partOffsets[i] || 0;
        const end = start + (partDurations[i] || 0);
        if (clampedTarget < end || i === videoParts.length - 1) {
          targetIdx = i;
          break;
        }
      }
      const localTime = Math.max(0, clampedTarget - (partOffsets[targetIdx] || 0));
      if (targetIdx === activePartIndex && videoRef.current) {
        videoRef.current.currentTime = localTime;
        if (ambientVideoRef.current) {
          ambientVideoRef.current.currentTime = localTime;
        }
        if (shouldPlayAfterSeek && !isUserPausedRef.current) {
          videoRef.current.play().then(() => {
            if (!isMountedRef.current || isUserPausedRef.current) {
              videoRef.current?.pause();
              return;
            }
            if (isAmbientMode) ambientVideoRef.current?.play().catch(() => {});
            setIsPlaying(true);
          }).catch(() => {});
        }
      } else {
        pendingPartSeekRef.current = {
          partIndex: targetIdx,
          localTime,
          shouldPlay: shouldPlayAfterSeek ?? !isUserPausedRef.current,
        };
        setIsBuffering(true);
        setActivePartIndex(targetIdx);
      }
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = clampedTarget;
      if (ambientVideoRef.current) {
        ambientVideoRef.current.currentTime = clampedTarget;
      }
      if (shouldPlayAfterSeek && !isUserPausedRef.current) {
        videoRef.current.play().then(() => {
          if (!isMountedRef.current || isUserPausedRef.current) {
            videoRef.current?.pause();
            return;
          }
          if (isAmbientMode) ambientVideoRef.current?.play().catch(() => {});
          setIsPlaying(true);
        }).catch(() => {});
      }
    }
  }, [parsedMedia.type, videoParts, partOffsets, partDurations, activePartIndex, isAmbientMode]);

  // Apply initial seek if seekToTime is provided (>5s)
  useEffect(() => {
    if (!seekToTime || seekToTime <= 5 || hasAppliedSeekRef.current) return;
    if (parsedMedia.type === 'youtube' && ytPlayerRef.current?.seekTo) {
      try {
        seekToGlobalTime(seekToTime, false);
        hasAppliedSeekRef.current = true;
        setShowResumeBadge(true);
      } catch (_) {}
    } else if (videoRef.current && videoRef.current.readyState >= 1) {
      try {
        seekToGlobalTime(seekToTime, false);
        hasAppliedSeekRef.current = true;
        setShowResumeBadge(true);
      } catch (_) {}
    }
  }, [seekToTime, parsedMedia.type, seekToGlobalTime]);

  // Monitor network connectivity for automatic buffering indication
  useEffect(() => {
    const handleOffline = () => setIsBuffering(true);
    const handleOnline = () => {
      if (isPlaying) setIsBuffering(false);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [isPlaying]);

  // Dynamic ambient glow spread, blur, and opacity settings based on user-chosen intensity
  const ambientConfig = React.useMemo(() => {
    switch (ambientIntensity) {
      case 'subtle':
        return {
          blur: 'blur(36px)',
          saturate: 'saturate(150%)',
          opacity: isPlaying ? 0.6 : 0.35,
          scale: 'scale(1.08)',
          spreadClass: '-top-12 sm:-inset-5 md:-inset-8 md:-top-16'
        };
      case 'ultra':
        return {
          blur: 'blur(76px)',
          saturate: 'saturate(220%)',
          opacity: isPlaying ? 0.95 : 0.55,
          scale: 'scale(1.22)',
          spreadClass: '-inset-8 sm:-inset-12 md:-inset-18'
        };
      case 'balanced':
      default:
        return {
          blur: 'blur(56px)',
          saturate: 'saturate(180%)',
          opacity: isPlaying ? 0.8 : 0.45,
          scale: 'scale(1.15)',
          spreadClass: '-inset-5 -top-12 sm:-inset-8 md:-inset-12 md:-top-16'
        };
    }
  }, [ambientIntensity, isPlaying]);

  // Keep ambient video element paused unless both ambient mode and primary playback are active
  useEffect(() => {
    const amb = ambientVideoRef.current;
    if (!amb) return;
    if (isPlaying && isAmbientMode && !isUserPausedRef.current) {
      if (videoRef.current) {
        amb.currentTime = videoRef.current.currentTime;
      }
      amb.play().catch(() => {});
    } else {
      amb.pause();
    }
  }, [isPlaying, isAmbientMode]);

  // Handle external seekToTime request (e.g. description timestamp click)
  useEffect(() => {
    if (seekToTime !== undefined && seekToTime >= 0) {
      seekToGlobalTime(seekToTime, true);
    }
  }, [seekToTime]);

  // Custom Timeline & Controls State
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isTimelineHovered, setIsTimelineHovered] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [isSavedWatchLater, setIsSavedWatchLater] = useState(false);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  const [playerMenuAnchor, setPlayerMenuAnchor] = useState<'top' | 'bottom'>('top');
  const [playerSubMenu, setPlayerSubMenu] = useState<'main' | 'speed' | 'quality' | 'ambient'>('main');
  const [isLooping, setIsLooping] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const toggleLoop = () => {
    setIsLooping(prev => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.loop = !videoParts && next;
      }
      return next;
    });
  };

  const handleCopyLink = () => {
    const shareUrl = video.isShort
      ? `${window.location.origin}/#/clips/${video.videoId}`
      : window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2200);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPercent(pos * 100);
    setHoverTime(pos * duration);
    setIsTimelineHovered(true);
  };

  const handleTimelineMouseLeave = () => {
    setIsTimelineHovered(false);
    setHoverTime(null);
  };

  const handleTimelineTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDraggingTimeline(true);
    handleTimelineTouchMove(e);
  };

  const handleTimelineTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    setHoverPercent(pos * 100);
    setHoverTime(targetTime);
    setIsTimelineHovered(true);
    seekToGlobalTime(targetTime);
  };

  const handleTimelineTouchEnd = () => {
    setIsDraggingTimeline(false);
    setIsTimelineHovered(false);
    setHoverTime(null);
  };

  const handleTimelineSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    seekToGlobalTime(targetTime);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (parsedMedia.type === 'youtube' && ytPlayerRef.current?.setPlaybackRate) {
      ytPlayerRef.current.setPlaybackRate(speed);
      try {
        ytAmbientPlayerRef.current?.setPlaybackRate(speed);
      } catch (_) {}
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      if (ambientVideoRef.current) {
        ambientVideoRef.current.playbackRate = speed;
      }
    }
    setShowPlayerMenu(false);
  };

  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls smoothly after 2.5s of mouse inactivity while playing
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      handleMouseMove();
    } else {
      setShowControls(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    }
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Handle YouTube IFrame API Initialization (Primary Player + Synchronized Ambient Player)
  useEffect(() => {
    if (parsedMedia.type !== 'youtube' || !parsedMedia.youtubeId) return;

    let isMounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const initYTPlayer = () => {
      if (!isMounted) return;
      if (!window.YT || !window.YT.Player) {
        retryTimer = setTimeout(() => {
          if (isMounted) initYTPlayer();
        }, 100);
        return;
      }

      const playerElementId = `si-player-${video.videoId}`;
      const element = document.getElementById(playerElementId);
      if (!element) return;

      ytPlayerRef.current = new window.YT.Player(playerElementId, {
        videoId: parsedMedia.youtubeId,
        playerVars: {
          autoplay: 1,
          // Keep YouTube's native controls hidden for ALL videos, including live streams.
          // SocialIndia renders its own timeline, playback controls, and fullscreen button.
          controls: 0,
          rel: 0,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          playsinline: 1
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
            // Force the YouTube iframe to fill the responsive 16:9 player frame.
            const playerIframe = event.target.getIframe?.();
            if (playerIframe) {
              playerIframe.style.width = '100%';
              playerIframe.style.height = '100%';
              playerIframe.style.position = 'absolute';
              playerIframe.style.inset = '0';
            }
            setIsMediaReady(true);
            setIsBuffering(false);
            const d = event.target.getDuration();
            if (d) setDuration(d);

            // Resume from last watched position if seekToTime is provided
            if (seekToTime && seekToTime > 5 && !hasAppliedSeekRef.current) {
              try {
                event.target.seekTo(seekToTime, true);
                setCurrentTime(seekToTime);
                hasAppliedSeekRef.current = true;
                setShowResumeBadge(true);
              } catch (_) {}
            }

            if (isUserPausedRef.current) {
              try {
                event.target.pauseVideo();
                ytAmbientPlayerRef.current?.pauseVideo();
              } catch (_) {}
              setIsPlaying(false);
              return;
            }

            // Try standard autoplay
            try {
              event.target.playVideo();
              setIsPlaying(true);
              ytAmbientPlayerRef.current?.playVideo();
            } catch (e) {
              // Fallback to muted autoplay if browser blocks audio
              try {
                event.target.mute();
                setIsMuted(true);
                event.target.playVideo();
                setIsPlaying(true);
                ytAmbientPlayerRef.current?.playVideo();
              } catch (err) {
                console.warn('Autoplay fallback error', err);
              }
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            if (event.data === 1) { // PLAYING
              if (isUserPausedRef.current) {
                try {
                  event.target.pauseVideo();
                  ytAmbientPlayerRef.current?.pauseVideo();
                } catch (_) {}
                return;
              }
              setIsMediaReady(true);
              setIsPlaying(true);
              setIsBuffering(false);
              try {
                ytAmbientPlayerRef.current?.playVideo();
              } catch (_) {}
            } else if (event.data === 2) { // PAUSED
              setIsMediaReady(true);
              setIsPlaying(false);
              setIsBuffering(false);
              try {
                ytAmbientPlayerRef.current?.pauseVideo();
              } catch (_) {}
            } else if (event.data === -1 || event.data === 5) { // UNSTARTED / CUED (e.g. autoplay blocked on mobile)
              setIsMediaReady(true);
              setIsBuffering(false);
            } else if (event.data === 3) { // BUFFERING (Network slow or video stalling)
              setIsBuffering(true);
            } else if (event.data === 0) { // ENDED
              setIsPlaying(false);
              setIsBuffering(false);
              try {
                ytAmbientPlayerRef.current?.pauseVideo();
              } catch (_) {}
              // When stream ends on YouTube, transition to regular video
              if (isLiveStream) {
                const finalDur = event.target.getDuration?.() || duration || 0;
                liveBroadcastService.markLiveEnded(video.videoId, finalDur);
                setIsLiveStream(false);
                if (finalDur) setDuration(finalDur);
              }
              if (onEnded) onEnded();
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initYTPlayer();
    } else {
      const existingCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof existingCb === 'function') existingCb();
        if (isMounted) initYTPlayer();
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
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.mute?.();
          ytPlayerRef.current.pauseVideo?.();
          ytPlayerRef.current.stopVideo?.();
          ytPlayerRef.current.destroy?.();
        } catch (e) {
          console.error(e);
        }
        ytPlayerRef.current = null;
      }
    };
  }, [video.videoId, video.videoUrl]);

  // Only initialize Ambient YouTube Player when Ambient Mode is explicitly enabled (prevents 2x bandwidth waste!)
  useEffect(() => {
    if (!isAmbientMode || parsedMedia.type !== 'youtube' || !parsedMedia.youtubeId) {
      if (ytAmbientPlayerRef.current) {
        try {
          ytAmbientPlayerRef.current.pauseVideo?.();
          ytAmbientPlayerRef.current.stopVideo?.();
          ytAmbientPlayerRef.current.destroy?.();
        } catch (_) {}
        ytAmbientPlayerRef.current = null;
      }
      return;
    }

    let isMounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const initAmbientYT = () => {
      if (!isMounted) return;
      if (!window.YT || !window.YT.Player) {
        retryTimer = setTimeout(initAmbientYT, 150);
        return;
      }
      const ambientElementId = `si-ambient-player-${video.videoId}`;
      const ambientEl = document.getElementById(ambientElementId);
      if (!ambientEl) return;

      try {
        ytAmbientPlayerRef.current = new window.YT.Player(ambientElementId, {
          videoId: parsedMedia.youtubeId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            mute: 1,
            playsinline: 1,
            loop: 1,
            playlist: parsedMedia.youtubeId
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) {
                try {
                  event.target.pauseVideo?.();
                  event.target.destroy?.();
                } catch (_) {}
                return;
              }
              try {
                event.target.mute();
                const mainTime = ytPlayerRef.current?.getCurrentTime?.();
                if (typeof mainTime === 'number' && mainTime > 0) {
                  event.target.seekTo?.(mainTime, true);
                }
                if (!isUserPausedRef.current) {
                  event.target.playVideo();
                } else {
                  event.target.pauseVideo();
                }
              } catch (_) {}
            }
          }
        });
      } catch (e) {
        console.warn('Ambient YT player init error:', e);
      }
    };

    initAmbientYT();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (ytAmbientPlayerRef.current) {
        try {
          ytAmbientPlayerRef.current.pauseVideo?.();
          ytAmbientPlayerRef.current.stopVideo?.();
          ytAmbientPlayerRef.current.destroy?.();
        } catch (_) {}
        ytAmbientPlayerRef.current = null;
      }
    };
  }, [isAmbientMode, parsedMedia.type, parsedMedia.youtubeId, video.videoId]);

  // Track YouTube Player Progress & auto-detect stream completion
  useEffect(() => {
    if (parsedMedia.type !== 'youtube') return;

    const interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const cur = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          if (cur !== undefined) {
            setCurrentTime(cur);
            if (onProgress) onProgress(cur);
          }
          if (dur) setDuration(dur);

          // Do not infer that a live stream has ended from currentTime >= duration.
          // For YouTube live broadcasts, duration is the elapsed stream time and currentTime
          // can reach the live edge while the broadcast is STILL live. The authoritative
          // player-side end signal is handled by the ENDED state event below.
        } catch (e) {
          // ignore
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [parsedMedia.type, isLiveStream, video.videoId]);

  // Real-time Canvas Frame Sampling for authentic Ambient Light (Direct Videos)
  useEffect(() => {
    if (!isAmbientMode || parsedMedia.type !== 'direct') return;

    let animId: number;
    const canvas = ambientCanvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: false });
    if (!canvas || !ctx) return;

    const renderCanvas = () => {
      if (
        videoRef.current &&
        !videoRef.current.paused &&
        !videoRef.current.ended &&
        videoRef.current.readyState >= 2
      ) {
        try {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        } catch (_) {
          // If canvas tainted by remote CORS, the blurred background video element handles it natively
        }
      }
      animId = requestAnimationFrame(renderCanvas);
    };

    if (isPlaying) {
      animId = requestAnimationFrame(renderCanvas);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isAmbientMode, isPlaying, parsedMedia.type]);

  // Direct HTML5 Video Handlers (supports both single MP4 and seamless multi-part segments)
  const handleDirectTimeUpdate = () => {
    if (videoRef.current) {
      const localCur = videoRef.current.currentTime;
      if (videoRef.current.readyState >= 2) {
        clearBufferingTimer();
        setIsBuffering(false);
        setIsMediaReady(true);
        setMediaError(null);
      }
      const globalCur = videoParts ? (partOffsets[activePartIndex] || 0) + localCur : localCur;
      const totalDur = videoParts
        ? (totalMultiPartDuration || video.duration || videoRef.current.duration || 0)
        : (videoRef.current.duration || video.duration || 0);
      setCurrentTime(globalCur);
      setDuration(totalDur);
      if (onProgress) onProgress(globalCur);

      if (ambientVideoRef.current && isAmbientMode) {
        const diff = Math.abs(ambientVideoRef.current.currentTime - localCur);
        if (diff > 0.35) {
          ambientVideoRef.current.currentTime = localCur;
        }
      }
    }
  };

  const togglePlay = () => {
    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      if (isPlaying) {
        isUserPausedRef.current = true;
        try {
          ytPlayerRef.current.pauseVideo();
          ytAmbientPlayerRef.current?.pauseVideo();
        } catch (_) {}
        setIsPlaying(false);
      } else {
        isUserPausedRef.current = false;
        try {
          ytPlayerRef.current.playVideo();
          if (isAmbientMode) {
            ytAmbientPlayerRef.current?.playVideo();
          }
        } catch (_) {}
        setIsPlaying(true);
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        isUserPausedRef.current = true;
        videoRef.current.pause();
        ambientVideoRef.current?.pause();
        setIsPlaying(false);
      } else {
        isUserPausedRef.current = false;
        videoRef.current.play().then(() => {
          if (!isMountedRef.current || isUserPausedRef.current) {
            videoRef.current?.pause();
            ambientVideoRef.current?.pause();
            return;
          }
          if (isAmbientMode) {
            ambientVideoRef.current?.play().catch(() => {});
          }
          setIsPlaying(true);
        }).catch(console.error);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    seekToGlobalTime(targetTime);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    const restoredVol = !nextMuted && volume === 0 ? 1 : volume;
    if (!nextMuted && volume === 0) {
      setVolume(1);
    }
    setIsMuted(nextMuted);

    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      if (nextMuted) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(restoredVol * 100);
      }
    } else if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted) {
        videoRef.current.volume = restoredVol;
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);

    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(newVol * 100);
      if (newVol === 0) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } else if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        if (window.screen && window.screen.orientation && typeof window.screen.orientation.unlock === 'function') {
          try {
            window.screen.orientation.unlock();
          } catch (e) {}
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      const enterPromise = containerRef.current.requestFullscreen
        ? containerRef.current.requestFullscreen()
        : (containerRef.current as any).webkitRequestFullscreen
        ? (containerRef.current as any).webkitRequestFullscreen()
        : Promise.resolve();

      Promise.resolve(enterPromise).then(() => {
        setIsFullscreen(true);
        // Force Landscape screen orientation lock on mobile devices (YouTube style)
        if (window.screen && window.screen.orientation && typeof (window.screen.orientation as any).lock === 'function') {
          (window.screen.orientation as any).lock('landscape').catch(() => {
            // Orientation lock may require user authorization or standalone mode
          });
        }
      }).catch(console.error);
    } else {
      const exitPromise = document.exitFullscreen
        ? document.exitFullscreen()
        : (document as any).webkitExitFullscreen
        ? (document as any).webkitExitFullscreen()
        : Promise.resolve();

      Promise.resolve(exitPromise).then(() => {
        setIsFullscreen(false);
        if (window.screen && window.screen.orientation && typeof window.screen.orientation.unlock === 'function') {
          try {
            window.screen.orientation.unlock();
          } catch (e) {}
        }
      }).catch(console.error);
    }
  };

  const skipSeconds = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration || 0, currentTime + seconds));
    seekToGlobalTime(newTime);
  };

  // Double-tap & Keyboard Seeking Feedback state (YouTube Style)
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{
    side: 'left' | 'right';
    amount: number;
    key: number;
  } | null>(null);

  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | 'center' }>({ time: 0, side: 'center' });
  const singleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekAccumulatorRef = useRef<{ side: 'left' | 'right'; amount: number }>({ side: 'right', amount: 0 });

  const triggerFeedback = (side: 'left' | 'right', amount: number = 10) => {
    setDoubleTapFeedback({
      side,
      amount,
      key: Date.now()
    });
    if (doubleTapFeedbackTimeoutRef.current) {
      clearTimeout(doubleTapFeedbackTimeoutRef.current);
    }
    doubleTapFeedbackTimeoutRef.current = setTimeout(() => {
      setDoubleTapFeedback(null);
      seekAccumulatorRef.current = { side: 'right', amount: 0 };
    }, 750);
  };

  // Keyboard Navigation & Shortcuts (ArrowLeft, ArrowRight, J, L, Space, K, F, M, ArrowUp, ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts when typing in inputs/textareas
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          skipSeconds(10);
          triggerFeedback('right', 10);
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          skipSeconds(-10);
          triggerFeedback('left', 10);
          break;
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.min(1, Math.round((prev + 0.1) * 10) / 10);
            if (videoRef.current) videoRef.current.volume = next;
            if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(next * 100);
            return next;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.max(0, Math.round((prev - 0.1) * 10) / 10);
            if (videoRef.current) videoRef.current.volume = next;
            if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(next * 100);
            return next;
          });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, currentTime, isPlaying, isMuted, volume]);

  // Handle pointer down (both mouse double-click and mobile touch double-tap, plus YouTube 2x speed long-press)
  const handleShieldPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary click/touch
    if (e.button !== 0) return;

    if (isScreenLocked) {
      setShowUnlockPill(true);
      if (unlockPillTimerRef.current) clearTimeout(unlockPillTimerRef.current);
      unlockPillTimerRef.current = setTimeout(() => setShowUnlockPill(false), 3000);
      return;
    }

    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    pointerMovedRef.current = false;
    isLongPressTriggeredRef.current = false;

    // Start 2x speed long-press timer if media is playing
    if (isPlaying) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (!pointerMovedRef.current) {
          isLongPressTriggeredRef.current = true;
          setIsHolding2x(true);
          if (parsedMedia.type === 'youtube' && ytPlayerRef.current?.setPlaybackRate) {
            try { ytPlayerRef.current.setPlaybackRate(2); } catch (_) {}
          } else if (videoRef.current) {
            videoRef.current.playbackRate = 2;
          }
          if (navigator.vibrate) {
            try { navigator.vibrate(20); } catch (_) {}
          }
        }
      }, 400);
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const width = rect.width;

    let side: 'left' | 'right' | 'center' = 'center';
    if (relativeX < width * 0.35) side = 'left';
    else if (relativeX > width * 0.65) side = 'right';

    const now = Date.now();
    const isDouble =
      (e.detail >= 2 && (side === 'left' || side === 'right')) ||
      (now - lastTapRef.current.time < 350 &&
        lastTapRef.current.side === side &&
        (side === 'left' || side === 'right'));

    if (isDouble && (side === 'left' || side === 'right')) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (singleClickTimeoutRef.current) {
        clearTimeout(singleClickTimeoutRef.current);
        singleClickTimeoutRef.current = null;
      }

      const isSameRecent =
        seekAccumulatorRef.current.side === side && now - lastTapRef.current.time < 800;
      const newAmount = isSameRecent ? seekAccumulatorRef.current.amount + 10 : 10;
      seekAccumulatorRef.current = { side, amount: newAmount };

      skipSeconds(side === 'left' ? -10 : 10);
      triggerFeedback(side, newAmount);
      lastTapRef.current = { time: now, side };
    } else {
      lastTapRef.current = { time: now, side };

      if (singleClickTimeoutRef.current) {
        clearTimeout(singleClickTimeoutRef.current);
      }
      const isTouch = e.pointerType === 'touch';
      singleClickTimeoutRef.current = setTimeout(() => {
        if (isLongPressTriggeredRef.current) return;
        if (isTouch) {
          // On mobile touch: tap toggles controls visibility like YouTube mobile
          setShowControls(prev => {
            const next = !prev;
            if (next && isPlaying) {
              handleMouseMove();
            }
            return next;
          });
        } else {
          togglePlay();
        }
        singleClickTimeoutRef.current = null;
      }, 240);
    }
  };

  const handleShieldPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
    if (dx > 12 || dy > 12) {
      pointerMovedRef.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    }
  };

  const handleShieldPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (isLongPressTriggeredRef.current) {
      // Restore playback rate
      if (parsedMedia.type === 'youtube' && ytPlayerRef.current?.setPlaybackRate) {
        try { ytPlayerRef.current.setPlaybackRate(playbackSpeed); } catch (_) {}
      } else if (videoRef.current) {
        videoRef.current.playbackRate = playbackSpeed;
      }
      setIsHolding2x(false);
      isLongPressTriggeredRef.current = false;
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseMove}
      onTouchMove={handleMouseMove}
      className={`relative w-full group select-none transition-all ${
        isFullscreen 
          ? 'h-screen w-screen bg-black overflow-hidden flex items-center justify-center' 
          : isTheaterMode
            ? 'w-full h-[min(calc(100vh-140px),56.25vw)] min-h-[380px] sm:min-h-[480px] max-h-[calc(100vh-100px)] bg-black flex items-center justify-center'
            : 'aspect-video w-full max-h-[calc(100vh-169px)] min-h-[220px] sm:min-h-[360px]'
      }`}
    >
      {/* REAL AMBIENT LIGHT BACKDROP (Radiates into the page and up behind the Watch header) */}
      <div 
        className={`absolute pointer-events-none select-none z-0 transition-all duration-700 ease-out ${
          isFullscreen || isTheaterMode ? 'inset-0 overflow-hidden' : `${ambientConfig.spreadClass} overflow-visible`
        } ${isAmbientMode ? 'opacity-100' : 'opacity-0'}`}
        style={{
          opacity: isAmbientMode ? ambientConfig.opacity : 0,
          filter: `${ambientConfig.blur} ${ambientConfig.saturate}`,
          transform: `${ambientConfig.scale} translateZ(0)`,
          willChange: 'filter, transform, opacity'
        }}
      >
        {isAmbientMode && parsedMedia.type === 'youtube' ? (
          <div className="w-full h-full scale-125 overflow-hidden flex items-center justify-center opacity-90">
            <div id={`si-ambient-player-${video.videoId}`} className="w-full h-full pointer-events-none" />
          </div>
        ) : isAmbientMode && parsedMedia.type === 'direct' ? (
          <div className="w-full h-full scale-125 overflow-hidden flex items-center justify-center">
            <video
              ref={ambientVideoRef}
              src={activePartSrc}
              muted
              playsInline
              preload="metadata"
              loop={isLooping && !videoParts}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
        ) : isAmbientMode && video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover scale-125"
          />
        ) : null}
        <canvas ref={ambientCanvasRef} className="hidden" width={64} height={36} />
      </div>

      {/* INNER VIDEO BOX */}
      <div 
        className={`relative w-full h-full z-10 bg-slate-950 overflow-hidden shadow-2xl ${
          isFullscreen || isTheaterMode
            ? 'rounded-none border-none flex items-center justify-center' 
            : 'rounded-none sm:rounded-2xl border-none sm:border border-slate-200 dark:border-[#334155]'
        }`}
      >
      {/* SOCIALINDIA LIVE STATUS BADGE — stays visible inside the video frame */}
      {isLiveStream && (
        <div className="absolute top-4 left-4 z-40 inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-white text-xs font-black tracking-wider shadow-lg pointer-events-none">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      )}

      {/* YOUTUBE-STYLE RESUME PLAYBACK NOTIFICATION BADGE */}
      <AnimatePresence>
        {showResumeBadge && seekToTime && seekToTime > 5 && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 left-4 z-40 bg-black/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-2xl border border-white/20 select-none"
          >
            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-semibold text-[11px] sm:text-xs">
              {isHindi 
                ? `${formatDuration(seekToTime)} से फिर से शुरू किया गया` 
                : `Resumed from ${formatDuration(seekToTime)}`}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                seekToGlobalTime(0, true);
                setShowResumeBadge(false);
                playbackProgressService.clearProgress(video.videoId);
              }}
              className="ml-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              {isHindi ? 'शुरू से चलाएं' : 'Start over'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowResumeBadge(false);
              }}
              className="p-0.5 hover:bg-white/20 rounded-md text-slate-400 hover:text-white cursor-pointer ml-1"
              aria-label="Dismiss resume notice"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YOUTUBE-STYLE CENTER CIRCULAR BUFFER SPINNER */}
      <AnimatePresence>
        {(isBuffering || !isMediaReady) && !mediaError && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-35 flex items-center justify-center pointer-events-none"
          >
            {/* Authentic YouTube circular buffering ring */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-[3.5px] border-white/20 border-t-[#2563eb] animate-spin drop-shadow-xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MEDIA ERROR / NETWORK RECOVERY OVERLAY */}
      {mediaError && (
        <div className="absolute inset-0 z-45 flex flex-col items-center justify-center gap-3 bg-black/80 px-4 text-center">
          <p className="text-xs sm:text-sm font-bold text-slate-200 max-w-sm">{mediaError}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMediaError(null);
              setIsBuffering(true);
              setForceRawPlayback(true);
              setRetrySeed((s) => s + 1);
            }}
            className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-lg cursor-pointer transition-colors"
          >
            {isHindi ? 'फिर से चलाएं (Retry)' : 'Retry Video'}
          </button>
        </div>
      )}

      {/* VIDEO IFRAME / VIDEO LAYER */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
        {/* Crisp poster thumbnail shown while media buffers to prevent black flash */}
        {!isMediaReady && video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover z-5 pointer-events-none"
          />
        )}

        {parsedMedia.type === 'youtube' ? (
          <div className="w-full h-full flex items-center justify-center">
            <div id={`si-player-${video.videoId}`} className="relative w-full h-full" />
          </div>
        ) : parsedMedia.type === 'drive' ? (
          <iframe
            src={parsedMedia.embedUrl}
            title={video.title}
            frameBorder="0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={() => {
              setIsMediaReady(true);
              setIsBuffering(false);
            }}
            // Drive is cross-origin: its native player must receive clicks and
            // report its own real duration. Keep it above SocialIndia's custom
            // click shield and controls, which cannot control a Drive iframe.
            className="relative z-[60] w-full h-full"
          />
        ) : (
          <>
            <video
              key={`${video.videoId}-${activePartIndex}-${retrySeed}`}
              ref={videoRef}
              src={activePartSrc}
              playsInline
              preload="auto"
              onWaiting={() => scheduleBufferingSpinner()}
              onSeeking={() => scheduleBufferingSpinner()}
              onSeeked={() => {
                clearBufferingTimer();
                setIsBuffering(false);
              }}
              onLoadedData={() => {
                clearBufferingTimer();
                setIsMediaReady(true);
                setIsBuffering(false);
                setMediaError(null);
              }}
              onCanPlayThrough={() => {
                clearBufferingTimer();
                setIsMediaReady(true);
                setIsBuffering(false);
                setMediaError(null);
              }}
              onError={() => {
                clearBufferingTimer();
                if (!forceRawPlayback && activePartSrc !== rawActivePartSrc) {
                  markCloudinaryTransformFailed(activePartSrc);
                  pendingPartSeekRef.current = {
                    partIndex: activePartIndex,
                    localTime: videoRef.current?.currentTime || 0,
                    shouldPlay: !isUserPausedRef.current,
                  };
                  setForceRawPlayback(true);
                  return;
                }
                setIsBuffering(false);
                setIsMediaReady(true);
                setMediaError(
                  isHindi
                    ? 'नेटवर्क धीमा है या वीडियो लोड नहीं हो सका। कृपया पुनः प्रयास करें।'
                    : 'Video could not load due to slow network or stream error.'
                );
              }}
              onPlay={() => {
                if (!isMountedRef.current || isUserPausedRef.current) {
                  videoRef.current?.pause();
                  ambientVideoRef.current?.pause();
                  return;
                }
                setIsPlaying(true);
                setMediaError(null);
                if (isAmbientMode) {
                  ambientVideoRef.current?.play().catch(() => {});
                }
              }}
              onPause={() => {
                setIsPlaying(false);
                if (!videoRef.current?.seeking) {
                  clearBufferingTimer();
                  setIsBuffering(false);
                }
                ambientVideoRef.current?.pause();
              }}
              onPlaying={() => {
                if (!isMountedRef.current || isUserPausedRef.current) {
                  videoRef.current?.pause();
                  ambientVideoRef.current?.pause();
                  return;
                }
                clearBufferingTimer();
                setIsBuffering(false);
                setIsPlaying(true);
                setIsMediaReady(true);
                setMediaError(null);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  const dur = videoRef.current.duration;
                  if (videoParts) {
                    if (Number.isFinite(dur) && dur > 0) {
                      setPartDurations((prev) => {
                        if (Math.abs((prev[activePartIndex] || 0) - dur) < 0.1) return prev;
                        const next = [...prev];
                        next[activePartIndex] = dur;
                        const newTotal = next.reduce((a, b) => a + (b || 0), 0);
                        if (newTotal > 0) setDuration(newTotal);
                        return next;
                      });
                    }
                  } else if (dur) {
                    setDuration(dur);
                  }
                  videoRef.current.playbackRate = isHolding2x ? 2 : playbackSpeed;
                  videoRef.current.muted = isMuted;
                  videoRef.current.volume = volume;

                  const pending = pendingPartSeekRef.current;
                  if (pending && pending.partIndex === activePartIndex) {
                    videoRef.current.currentTime = pending.localTime;
                    if (ambientVideoRef.current) {
                      ambientVideoRef.current.currentTime = pending.localTime;
                    }
                    setCurrentTime((partOffsets[activePartIndex] || 0) + pending.localTime);
                  } else if (seekToTime && seekToTime > 5 && !hasAppliedSeekRef.current) {
                    hasAppliedSeekRef.current = true;
                    seekToGlobalTime(seekToTime, false);
                    setShowResumeBadge(true);
                  }
                }
              }}
              onCanPlay={() => {
                clearBufferingTimer();
                setIsMediaReady(true);
                setIsBuffering(false);
                setMediaError(null);
                if (videoRef.current) {
                  videoRef.current.playbackRate = isHolding2x ? 2 : playbackSpeed;
                  videoRef.current.muted = isMuted;
                  videoRef.current.volume = volume;

                  const pending = pendingPartSeekRef.current;
                  if (pending && pending.partIndex === activePartIndex) {
                    pendingPartSeekRef.current = null;
                    if (Math.abs(videoRef.current.currentTime - pending.localTime) > 0.35) {
                      videoRef.current.currentTime = pending.localTime;
                    }
                    if (pending.shouldPlay && !isUserPausedRef.current && isMountedRef.current) {
                      videoRef.current.play().then(() => {
                        if (!isMountedRef.current || isUserPausedRef.current) {
                          videoRef.current?.pause();
                          return;
                        }
                        if (isAmbientMode) ambientVideoRef.current?.play().catch(() => {});
                        setIsPlaying(true);
                      }).catch(() => {});
                    }
                    return;
                  }

                  if (seekToTime && seekToTime > 5 && !hasAppliedSeekRef.current) {
                    hasAppliedSeekRef.current = true;
                    seekToGlobalTime(seekToTime, false);
                    setShowResumeBadge(true);
                  }
                  if (!hasStartedInitialAutoplayRef.current && !isUserPausedRef.current && isMountedRef.current) {
                    hasStartedInitialAutoplayRef.current = true;
                    videoRef.current.play().then(() => {
                      if (!isMountedRef.current || isUserPausedRef.current) {
                        videoRef.current?.pause();
                        return;
                      }
                      setIsPlaying(true);
                    }).catch(() => {
                      if (!isMountedRef.current || isUserPausedRef.current || !videoRef.current) return;
                      // If browser policy requires mute first for autoplay
                      videoRef.current.muted = true;
                      setIsMuted(true);
                      videoRef.current.play().then(() => {
                        if (!isMountedRef.current || isUserPausedRef.current) {
                          videoRef.current?.pause();
                          return;
                        }
                        setIsPlaying(true);
                      }).catch(() => {});
                    });
                  }
                }
              }}
              onTimeUpdate={handleDirectTimeUpdate}
              onEnded={() => {
                clearBufferingTimer();
                setIsBuffering(false);
                if (videoParts && activePartIndex < videoParts.length - 1) {
                  const nextIdx = activePartIndex + 1;
                  pendingPartSeekRef.current = {
                    partIndex: nextIdx,
                    localTime: 0,
                    shouldPlay: !isUserPausedRef.current,
                  };
                  setIsBuffering(true);
                  setActivePartIndex(nextIdx);
                  return;
                }
                if (isLooping) {
                  if (videoParts && activePartIndex !== 0) {
                    pendingPartSeekRef.current = {
                      partIndex: 0,
                      localTime: 0,
                      shouldPlay: !isUserPausedRef.current,
                    };
                    setActivePartIndex(0);
                  } else if (videoRef.current && !isUserPausedRef.current && isMountedRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play().catch(() => {});
                  }
                  return;
                }
                setIsPlaying(false);
                ambientVideoRef.current?.pause();
                if (onEnded) {
                  onEnded();
                } else if (isAutoplay && hasNextVideo && onNextVideo) {
                  onNextVideo();
                }
              }}
              className="w-full h-full object-contain"
            />
            {videoParts && activePartIndex + 1 < videoParts.length && isMediaReady && (
              <video
                key={videoParts[activePartIndex + 1]}
                src={videoParts[activePartIndex + 1]}
                preload={
                  (partDurations[activePartIndex] || 0) > 0 &&
                  currentTime - (partOffsets[activePartIndex] || 0) >= Math.max(0, (partDurations[activePartIndex] || 0) - 25)
                    ? 'auto'
                    : 'none'
                }
                muted
                playsInline
                className="hidden"
                aria-hidden="true"
              />
            )}
          </>
        )}
      </div>

      {/* INVISIBLE CLICK SHIELD (Single-tap play/pause, Double-click / Double-tap 10s seek, Long-press 2x speed) */}
      <div 
        onPointerDown={handleShieldPointerDown}
        onPointerMove={handleShieldPointerMove}
        onPointerUp={handleShieldPointerUp}
        onPointerCancel={handleShieldPointerUp}
        className="absolute inset-0 z-20 cursor-pointer"
      />

      {/* DOUBLE TAP ANIMATED OVERLAYS (YouTube Style) */}
      <AnimatePresence>
        {doubleTapFeedback && doubleTapFeedback.side === 'left' && (
          <motion.div
            key={`left-${doubleTapFeedback.key}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 bottom-0 left-0 w-2/5 flex items-center justify-center z-35 pointer-events-none rounded-r-full bg-white/10 backdrop-blur-xs"
          >
            <div className="flex flex-col items-center justify-center text-white drop-shadow-md">
              <div className="flex items-center -space-x-1 text-white">
                <ChevronsLeft className="w-10 h-10 animate-pulse text-white" />
              </div>
              <span className="text-xs font-black tracking-wider mt-1 text-white uppercase">
                -{doubleTapFeedback.amount} seconds
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {doubleTapFeedback && doubleTapFeedback.side === 'right' && (
          <motion.div
            key={`right-${doubleTapFeedback.key}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 bottom-0 right-0 w-2/5 flex items-center justify-center z-35 pointer-events-none rounded-l-full bg-white/10 backdrop-blur-xs"
          >
            <div className="flex flex-col items-center justify-center text-white drop-shadow-md">
              <div className="flex items-center -space-x-1 text-white">
                <ChevronsRight className="w-10 h-10 animate-pulse text-white" />
              </div>
              <span className="text-xs font-black tracking-wider mt-1 text-white uppercase">
                +{doubleTapFeedback.amount} seconds
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2X SPEED LONG PRESS BADGE (YouTube Mobile signature) */}
      <AnimatePresence>
        {isHolding2x && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute top-4 inset-x-0 mx-auto w-max z-40 bg-black/85 backdrop-blur-md text-white text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-white/20 shadow-2xl pointer-events-none select-none"
          >
            <span>2X Speed</span>
            <ChevronsRight className="w-4 h-4 text-blue-400 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCREEN LOCKED UNLOCK PILL (YouTube Mobile signature) */}
      <AnimatePresence>
        {isScreenLocked && showUnlockPill && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-6 inset-x-0 mx-auto w-max z-45"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsScreenLocked(false);
                setShowUnlockPill(false);
              }}
              className="px-4 py-2 bg-black/90 hover:bg-black text-white text-xs font-extrabold rounded-full border border-white/20 backdrop-blur-md flex items-center gap-2 shadow-2xl active:scale-95 transition-transform cursor-pointer"
            >
              <Unlock className="w-4 h-4 text-blue-400" />
              <span>{isHindi ? 'स्क्रीन अनलॉक करें' : 'Tap to unlock'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER OVERLAY WITH MOTION (YouTube Mobile App style: Minimize/Back, Title, Autoplay, CC, Settings) */}
      <AnimatePresence>
        {(showControls || !isPlaying) && isMediaReady && !isScreenLocked && (
          <motion.div 
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className={`absolute top-0 inset-x-0 z-30 p-2.5 sm:p-4 ${
              isAmbientMode 
                ? 'bg-[linear-gradient(to_bottom,rgba(0,0,0,0.7),transparent)] backdrop-blur-[2px]'
                : 'bg-[linear-gradient(to_bottom,rgba(0,0,0,0.7),transparent)]'
            } pointer-events-auto flex items-center justify-between transition-colors duration-300`}
          >
            {/* Left: Minimize / Back Arrow + Video Details */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate('home');
                  }
                }}
                className="p-1 sm:p-1.5 text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer shrink-0"
                title={isHindi ? "पीछे जाएं / मिनिमाइज़" : "Back / Minimize"}
              >
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </button>

              <UserAvatar 
                uid={video.creatorId}
                fallbackPhotoURL={video.creatorPhotoURL}
                fallbackDisplayName={video.creatorDisplayName || video.creatorUsername}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('creator', video.creatorUsername);
                }}
                className="hidden sm:flex w-8 h-8 cursor-pointer border border-white/20 shadow-xs hover:scale-105 transition-transform shrink-0 text-xs"
              />
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[170px] sm:max-w-md drop-shadow-md">
                  {video.title}
                </h3>
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('creator', video.creatorUsername);
                  }}
                  style={{ color: '#d1d5db' }}
                  className="text-[10px] sm:text-[11px] text-gray-300 font-bold hover:underline drop-shadow-sm cursor-pointer truncate"
                >
                  {video.creatorDisplayName} (@{video.creatorUsername})
                  {isCreatorVerified && (
                    <span
                      className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 align-middle text-[8px] font-black text-white shadow-sm"
                      title="Verified Creator"
                      aria-label="Verified Creator"
                    >
                      ✓
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Right: Autoplay Toggle, Captions CC & Settings */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
              {/* YouTube Autoplay Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAutoplay(prev => {
                    const next = !prev;
                    try { localStorage.setItem('socialindia_autoplay', String(next)); } catch {}
                    return next;
                  });
                }}
                className="flex items-center gap-1.5 p-1 hover:bg-white/10 rounded-full cursor-pointer transition-transform active:scale-95"
                title={isAutoplay ? (isHindi ? "ऑटो-प्ले चालू है" : "Autoplay: ON") : (isHindi ? "ऑटो-प्ले बंद है" : "Autoplay: OFF")}
                aria-label={isAutoplay ? "Autoplay ON" : "Autoplay OFF"}
                aria-pressed={isAutoplay}
              >
                <div className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${isAutoplay ? 'bg-blue-600' : 'bg-white/30'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform flex items-center justify-center shadow-xs ${isAutoplay ? 'translate-x-3' : 'translate-x-0'}`}>
                    <Play className="w-1.5 h-1.5 fill-current text-blue-600" />
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-white">{isAutoplay ? 'ON' : 'OFF'}</span>
              </button>

              {/* Subtitles / CC Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCaptionsOn(!isCaptionsOn);
                }}
                className={`sm:hidden px-1.5 py-0.5 rounded text-[10px] font-black border transition-all cursor-pointer ${
                  isCaptionsOn 
                    ? 'bg-white text-black border-white shadow-xs' 
                    : 'border-white/50 text-white/80 hover:border-white hover:text-white'
                }`}
                title="Subtitles / CC"
              >
                CC
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER CONTROLS TRIO (YouTube Mobile App Style: Previous/Rewind 10s, Big Center Play/Pause, Next/Skip 10s) */}
      <AnimatePresence>
        {(showControls || !isPlaying) && isMediaReady && !isBuffering && !isScreenLocked && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 z-[40] flex items-center justify-center gap-3 sm:gap-10 pointer-events-none"
          >
            {/* Rewind 10s / Previous Video */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                skipSeconds(-10);
                triggerFeedback('left', 10);
              }}
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/35 hover:bg-black/65 text-white flex items-center justify-center border border-white/30 backdrop-blur-md shadow-lg active:scale-90 transition-transform cursor-pointer pointer-events-auto"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="absolute bottom-1 text-[8px] font-black leading-none">10</span>
            </button>

            {/* Big Center Play / Pause Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-2xl border-2 border-white/30 backdrop-blur-md active:scale-95 transition-transform cursor-pointer pointer-events-auto"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              ) : (
                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-0.5 sm:ml-1" />
              )}
            </button>

            {/* Fast Forward 10s / Next Video */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                skipSeconds(10);
                triggerFeedback('right', 10);
              }}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/35 hover:bg-black/65 text-white flex items-center justify-center border border-white/30 backdrop-blur-md shadow-lg active:scale-90 transition-transform cursor-pointer pointer-events-auto"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="absolute bottom-1 text-[8px] font-black leading-none">10</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM CONTROLS & TIMELINE BAR WITH MOTION */}
      <AnimatePresence>
        {(showControls || !isPlaying) && isMediaReady && (
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className={`absolute bottom-0 inset-x-0 z-30 px-3 sm:px-4 py-2.5 sm:py-3 ${
              isAmbientMode 
                ? 'bg-gradient-to-t from-black/60 via-black/30 to-transparent backdrop-blur-[3px]' 
                : 'bg-gradient-to-t from-black/95 via-black/60 to-transparent'
            } pointer-events-auto space-y-1.5 transition-colors duration-300`}
          >
            {!isLiveStream && (
            <>
            {/* Custom Interactive Timeline (Electric Blue Played Track + Touch Scrubbing + Hover Preview Tooltip) */}
            <div 
              ref={timelineRef}
              onClick={handleTimelineSeekClick}
              onMouseMove={handleTimelineMouseMove}
              onMouseLeave={handleTimelineMouseLeave}
              onTouchStart={handleTimelineTouchStart}
              onTouchMove={handleTimelineTouchMove}
              onTouchEnd={handleTimelineTouchEnd}
              className="relative w-full h-5 py-2 -my-2 flex items-center group/timeline cursor-pointer touch-none"
            >
              {/* Tooltip on hover/drag */}
              {(isTimelineHovered || isDraggingTimeline) && hoverTime !== null && (
                <div 
                  className="absolute bottom-6 -translate-x-1/2 px-2 py-0.5 bg-black/90 text-white text-[10px] font-bold rounded-md shadow-lg pointer-events-none whitespace-nowrap border border-white/10"
                  style={{ left: `${hoverPercent}%` }}
                >
                  {formatDuration(hoverTime)}
                </div>
              )}

              <div className="relative w-full h-1 group-hover/timeline:h-2 rounded-full bg-black/75 border border-white/50 shadow-[0_1px_4px_rgba(0,0,0,0.85)] transition-all overflow-visible">
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-full bg-[#2563eb] pointer-events-none"
                  style={{ width: `${Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100))}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#2563eb] border-2 border-white shadow-md pointer-events-none"
                  style={{ left: `calc(${Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100))}% - 7px)` }}
                />
              </div>
            </div>

            </>
            )}
            {/* Controls Bar */}
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play/Pause Button - Desktop */}
                <button
                  onClick={togglePlay}
                  className="hidden sm:flex p-1.5 bg-black/65 hover:bg-black/90 rounded-lg transition-colors cursor-pointer text-white opacity-100 shadow-md"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current text-white opacity-100" /> : <Play className="w-4 h-4 fill-current text-white opacity-100" />}
                </button>

                {/* Next Video Button - Desktop */}
                <button
                  onClick={() => {
                    if (hasNextVideo && onNextVideo) {
                      onNextVideo();
                    } else {
                      skipSeconds(10);
                    }
                  }}
                  className="flex p-1.5 bg-black/65 hover:bg-black/90 rounded-lg transition-colors cursor-pointer text-white opacity-100 shrink-0 shadow-md"
                  title={hasNextVideo ? "Next Video in Playlist (Shift+N)" : "Skip 10s"}
                >
                  <SkipForward className="w-4 h-4 fill-current text-white opacity-100" />
                </button>

                {/* Timeline Time Display */}
                {isLiveStream ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (ytPlayerRef.current?.seekTo) {
                        try {
                          const dur = ytPlayerRef.current.getDuration();
                          ytPlayerRef.current.seekTo(dur || 999999, true);
                          ytPlayerRef.current.playVideo();
                        } catch (_) {}
                      }
                    }}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-black tracking-wider shadow-sm transition-all cursor-pointer"
                    title="Jump to live edge"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>LIVE</span>
                  </button>
                ) : (
                  <div className="text-[11px] font-bold tracking-wider text-slate-200 whitespace-nowrap">
                    <span>{formatDuration(currentTime)}</span>
                    <span className="mx-1 text-slate-400">/</span>
                    <span className="text-slate-400">{formatDuration(duration)}</span>
                  </div>
                )}

                {/* Volume Button & Slider - Grouped on the right side of video duration */}
                <div className="hidden sm:flex items-center gap-2 bg-black/55 hover:bg-black/80 px-2 py-1 rounded-lg transition-colors group/vol shadow-md">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-0.5 text-white opacity-100 cursor-pointer flex items-center justify-center shrink-0"
                    title={isMuted || volume === 0 ? "Unmute (m)" : "Mute (m)"}
                    aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-white opacity-100" /> : <Volume2 className="w-4 h-4 text-white opacity-100" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Volume"
                    style={{
                      background: `linear-gradient(to right, #3ea6ff 0%, #3ea6ff ${Math.round((isMuted ? 0 : volume) * 100)}%, rgba(255, 255, 255, 0.28) ${Math.round((isMuted ? 0 : volume) * 100)}%, rgba(255, 255, 255, 0.28) 100%)`
                    }}
                    className="w-20 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(0,0,0,0.8)] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_4px_rgba(0,0,0,0.8)]"
                  />
                  <span className="text-[10px] font-bold text-slate-200 tabular-nums min-w-[2.1rem] text-right select-none">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>

              </div>

              {/* Right Side: Settings, Theater, Fullscreen */}
              <div className="flex items-center gap-1.5 sm:gap-2 relative">
                {/* Settings with HD Badge (YouTube Style) */}
                <button
                  onClick={() => {
                    setPlayerMenuAnchor('bottom');
                    setShowPlayerMenu(!showPlayerMenu);
                    setPlayerSubMenu('main');
                  }}
                  className="p-1.5 bg-black/65 hover:bg-black/90 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-white opacity-100 shadow-md"
                  title="Playback Settings"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-[9px] font-black bg-[#2563eb] text-white px-1 py-0.2 rounded shadow-xs">
                    HD
                  </span>
                </button>

                {/* Theater Mode Button - Hidden on mobile screens */}
                {onToggleTheaterMode && (
                  <button
                    onClick={onToggleTheaterMode}
                    className={`hidden sm:flex p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isTheaterMode ? 'bg-[#2563eb] text-white' : 'hover:bg-white/20 text-slate-200'
                    }`}
                    title={isTheaterMode ? "Default View (t)" : "Theater Mode (t)"}
                  >
                    <Tv className="w-4 h-4" />
                  </button>
                )}

                {/* Fullscreen Button - Always clearly visible on mobile and desktop */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 bg-black/65 hover:bg-black/90 rounded-lg transition-colors cursor-pointer text-white opacity-100 shrink-0 shadow-md"
                  title="Toggle Fullscreen (f)"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIVE CAPTIONS / SUBTITLES OVERLAY (YouTube Style with Timestamps) */}
      {isCaptionsOn && (
        <div className="absolute bottom-[76px] sm:bottom-[88px] inset-x-0 z-[35] flex items-center justify-center pointer-events-none px-4">
          {(() => {
            const cue = (video.captions || []).find(
              (c) => currentTime >= c.start && currentTime <= c.end
            );
            if (cue) {
              return (
                <div className="bg-black/85 text-white text-xs sm:text-sm font-semibold px-3 py-1 rounded shadow-lg backdrop-blur-xs text-center max-w-lg border border-white/10 animate-in fade-in">
                  {cue.text}
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* COMPACT POPUP MENU (MOBILE IN-BOUNDS CARD & DESKTOP ANCHORED DROPDOWN) */}
      <AnimatePresence>
        {showPlayerMenu && (
          <>
            {/* Click-away backdrop */}
            <div 
              onClick={() => setShowPlayerMenu(false)}
              className="absolute inset-0 z-45 cursor-default bg-black/40 backdrop-blur-[1px]"
            />

            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`absolute z-50 bg-[#16161b]/98 backdrop-blur-xl border border-white/20 text-white select-none text-xs shadow-2xl overflow-y-auto max-h-[85%] ${
                isFullscreen
                  ? 'bottom-14 right-4 w-64 rounded-2xl p-3'
                  : 'inset-x-0 bottom-0 rounded-t-3xl sm:rounded-2xl sm:inset-auto sm:w-64 p-3.5 sm:p-2.5 ' +
                    (playerMenuAnchor === 'top' ? 'sm:top-12 sm:right-3 sm:bottom-auto' : 'sm:bottom-12 sm:right-3 sm:top-auto')
              }`}
            >
              {/* YouTube Mobile Bottom Sheet Drag Handle */}
              <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-2.5 sm:hidden" />

              {playerSubMenu === 'main' && (
                <div className="space-y-0.5">
                  {/* Compact Header */}
                  <div className="flex items-center justify-between pb-1.5 px-1 border-b border-white/10 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                      {isHindi ? 'प्लेबैक विकल्प' : 'Playback Options'}
                    </span>
                    <button
                      onClick={() => setShowPlayerMenu(false)}
                      className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={t('close', 'Close')}
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 1. Quality */}
                  <button
                    onClick={() => setPlayerSubMenu('quality')}
                    className="w-full py-2 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold">{t('player_quality', 'Quality')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>{selectedQuality.split(' ')[0]}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </button>

                  {/* 2. Playback Speed */}
                  <button
                    onClick={() => setPlayerSubMenu('speed')}
                    className="w-full py-2 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Play className="w-4 h-4 text-blue-400 fill-current" />
                      <span className="text-xs font-semibold">{t('player_speed', 'Playback speed')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>{playbackSpeed === 1 ? (isHindi ? 'सामान्य' : 'Normal') : `${playbackSpeed}x`}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </button>

                  {/* 3. Lock Screen (YouTube Mobile Signature Feature) */}
                  <button
                    onClick={() => {
                      setIsScreenLocked(true);
                      setShowPlayerMenu(false);
                      setShowUnlockPill(true);
                      if (unlockPillTimerRef.current) clearTimeout(unlockPillTimerRef.current);
                      unlockPillTimerRef.current = setTimeout(() => setShowUnlockPill(false), 3000);
                    }}
                    className="w-full py-2 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold">{isHindi ? 'स्क्रीन लॉक करें' : 'Lock screen'}</span>
                    </div>
                  </button>

                  {/* 3. Ambient Mode (Enhanced YouTube Ambient Light) */}
                  <button
                    onClick={() => setPlayerSubMenu('ambient')}
                    className="w-full py-2 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sun className={`w-4 h-4 ${isAmbientMode ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold">{t('player_ambient_mode', 'Ambient mode')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAmbientMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400'
                      }`}>
                        {isAmbientMode ? (isHindi ? 'चालू' : 'On') : (isHindi ? 'बंद' : 'Off')}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </button>

                  {/* 3. Subtitles / CC */}
                  <button
                    onClick={() => setIsCaptionsOn(!isCaptionsOn)}
                    className="w-full py-2 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Subtitles className={`w-4 h-4 ${isCaptionsOn ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold">{t('player_captions', 'Captions')}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${isCaptionsOn ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                      {isCaptionsOn ? (isHindi ? 'चालू' : 'English') : (isHindi ? 'बंद' : 'Off')}
                    </span>
                  </button>

                  {/* 4. Loop Video */}
                  <button
                    onClick={toggleLoop}
                    className="w-full py-2 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Repeat className={`w-4 h-4 ${isLooping ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold">{t('player_loop', 'Loop video')}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${isLooping ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                      {isLooping ? (isHindi ? 'चालू' : 'On') : (isHindi ? 'बंद' : 'Off')}
                    </span>
                  </button>

                  {/* 5. Watch Later */}
                  <button
                    onClick={() => setIsSavedWatchLater(!isSavedWatchLater)}
                    className="w-full py-2 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className={`w-4 h-4 ${isSavedWatchLater ? 'text-blue-400 fill-blue-400/40' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold">
                        {isSavedWatchLater ? (isHindi ? 'वॉच लेटर से हटाएं' : 'Remove Watch Later') : (isHindi ? 'बाद में देखें' : 'Watch Later')}
                      </span>
                    </div>
                    {isSavedWatchLater && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>

                  {/* 6. Copy Video Link */}
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Copy className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold">{isHindi ? 'वीडियो लिंक कॉपी करें' : 'Copy video link'}</span>
                    </div>
                    {linkCopied && (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> {isHindi ? 'कॉपी हो गया' : 'Copied'}
                      </span>
                    )}
                  </button>

                  {/* 7. Report Video (YouTube Style) */}
                  <div className="pt-1 mt-1 border-t border-white/10">
                    <button
                      onClick={() => {
                        setShowPlayerMenu(false);
                        if (onReport) {
                          onReport();
                        } else {
                          const event = new CustomEvent('socialindia_report_video', { detail: { videoId: video.videoId } });
                          window.dispatchEvent(event);
                        }
                      }}
                      className="w-full py-2 px-2.5 rounded-xl hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                    >
                      <Flag className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-bold">{t('action_report', 'Report Video')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-menu: Quality */}
              {playerSubMenu === 'quality' && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1 px-1">
                    <button
                      onClick={() => setPlayerSubMenu('main')}
                      className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeftIcon className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                      {t('player_quality', 'Quality')}
                    </span>
                  </div>

                  {['Auto', '1080p HD', '720p HD', '480p High', '360p Data Saver'].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        if (q !== selectedQuality) {
                          if (parsedMedia.type === 'direct' && videoRef.current) {
                            pendingPartSeekRef.current = {
                              partIndex: activePartIndex,
                              localTime: videoRef.current.currentTime || 0,
                              shouldPlay: isPlaying && !isUserPausedRef.current,
                            };
                            setIsBuffering(true);
                            setForceRawPlayback(false);
                          }
                          setSelectedQuality(q);
                        }
                        setPlayerSubMenu('main');
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                    >
                      <span className={`text-xs ${selectedQuality === q ? 'font-black text-blue-400' : 'font-medium text-slate-300'}`}>
                        {q === 'Auto' ? (isHindi ? 'ऑटो (तेज़ स्ट्रीमिंग)' : 'Auto (Fast)') : q}
                      </span>
                      {selectedQuality === q && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Sub-menu: Speed */}
              {playerSubMenu === 'speed' && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1 px-1">
                    <button
                      onClick={() => setPlayerSubMenu('main')}
                      className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeftIcon className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                      {t('player_speed', 'Playback speed')}
                    </span>
                  </div>

                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        handleSpeedChange(s);
                        setPlayerSubMenu('main');
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                    >
                      <span className={`text-xs ${playbackSpeed === s ? 'font-black text-blue-400' : 'font-medium text-slate-300'}`}>
                        {s === 1 ? (isHindi ? 'सामान्य (Normal)' : 'Normal') : `${s}x`}
                      </span>
                      {playbackSpeed === s && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Sub-menu: Ambient Mode (Enhanced YouTube Ambient Light) */}
              {playerSubMenu === 'ambient' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10 px-1">
                    <button
                      onClick={() => setPlayerSubMenu('main')}
                      className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeftIcon className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                        {t('player_ambient_mode', 'Ambient Mode')}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-white">
                        {isHindi ? 'अम्बिएंट लाइटिंग' : 'Ambient Lighting'}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {isHindi 
                          ? 'वीडियो के रंगों को बैकग्राउंड में ब्लर करके इमर्सिव अनुभव प्रदान करता है' 
                          : 'Projects blurred video colors into the background for high immersion'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAmbientMode}
                      onClick={toggleAmbientMode}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isAmbientMode ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isAmbientMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Intensity Presets (YouTube Better Ambient style) */}
                  {isAmbientMode && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                        {isHindi ? 'रोशनी की तीव्रता (Glow Intensity)' : 'Glow Intensity'}
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'subtle', label: isHindi ? 'सूक्ष्म' : 'Subtle', desc: '36px' },
                          { id: 'balanced', label: isHindi ? 'संतुलित' : 'Balanced', desc: '56px' },
                          { id: 'ultra', label: isHindi ? 'अल्ट्रा' : 'Ultra', desc: '76px' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleAmbientIntensityChange(item.id as any)}
                            className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                              ambientIntensity === item.id
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 font-medium'
                            }`}
                          >
                            <div className="text-[11px] truncate">{item.label}</div>
                            <div className="text-[9px] text-slate-400">{item.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
};
