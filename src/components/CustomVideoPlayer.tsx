import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video } from '../types';
import { parseVideoUrl, formatDuration, getInitials } from '../utils/videoUtils';
import { useRouter } from '../hooks/useRouter';
import { useTranslation } from '../i18n';
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
  Settings,
  Clock,
  Share2,
  MoreVertical,
  Check,
  Repeat,
  Subtitles,
  ChevronRight,
  ArrowLeft as ArrowLeftIcon,
  X as XIcon,
  Copy,
  Sliders,
  Sparkles,
  Sun,
  Flag
} from 'lucide-react';

interface CustomVideoPlayerProps {
  video: Video;
  onEnded?: () => void;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  seekToTime?: number;
  onNextVideo?: () => void;
  hasNextVideo?: boolean;
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
  hasNextVideo = false,
  onReport,
  onProgress
}) => {
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  const parsedMedia = parseVideoUrl(video.videoUrl);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);

  // Ambient Mode (Enhanced YouTube Ambient Light)
  const ambientVideoRef = useRef<HTMLVideoElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const ytAmbientPlayerRef = useRef<any>(null);

  const [isAmbientMode, setIsAmbientMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('socialindia_ambient_mode');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Dynamic ambient glow spread, blur, and opacity settings based on user-chosen intensity
  const ambientConfig = React.useMemo(() => {
    switch (ambientIntensity) {
      case 'subtle':
        return {
          blur: 'blur(36px)',
          saturate: 'saturate(150%)',
          opacity: isPlaying ? 0.6 : 0.35,
          scale: 'scale(1.08)',
          spreadClass: '-inset-3 sm:-inset-5 md:-inset-8'
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
          spreadClass: '-inset-5 sm:-inset-8 md:-inset-12'
        };
    }
  }, [ambientIntensity, isPlaying]);

  // Handle external seekToTime request (e.g. description timestamp click)
  useEffect(() => {
    if (seekToTime !== undefined && seekToTime >= 0) {
      if (parsedMedia.type === 'direct' && videoRef.current) {
        videoRef.current.currentTime = seekToTime;
        if (ambientVideoRef.current) {
          ambientVideoRef.current.currentTime = seekToTime;
          ambientVideoRef.current.play().catch(() => {});
        }
        setCurrentTime(seekToTime);
        videoRef.current.play().catch(console.error);
        setIsPlaying(true);
      } else if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo(seekToTime, true);
          ytPlayerRef.current.playVideo();
          if (ytAmbientPlayerRef.current?.seekTo) {
            ytAmbientPlayerRef.current.seekTo(seekToTime, true);
            ytAmbientPlayerRef.current.playVideo();
          }
          setIsPlaying(true);
        } catch (e) {
          console.warn('YouTube seek failed:', e);
        }
      }
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
  const [selectedQuality, setSelectedQuality] = useState('1080p HD');
  const [linkCopied, setLinkCopied] = useState(false);

  const toggleLoop = () => {
    setIsLooping(prev => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.loop = next;
      }
      return next;
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
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

  const handleTimelineSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    setCurrentTime(targetTime);

    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(targetTime, true);
        if (ytAmbientPlayerRef.current?.seekTo) {
          ytAmbientPlayerRef.current.seekTo(targetTime, true);
        }
      } catch (err) {
        console.warn('YT seek error', err);
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      if (ambientVideoRef.current) {
        ambientVideoRef.current.currentTime = targetTime;
      }
    }
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

    const initYTPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        // If not ready yet, wait and retry once
        setTimeout(initYTPlayer, 100);
        return;
      }

      const playerElementId = `yt-player-${video.videoId}`;
      const element = document.getElementById(playerElementId);
      if (!element) return;

      ytPlayerRef.current = new window.YT.Player(playerElementId, {
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
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            setIsMediaReady(true);
            const d = event.target.getDuration();
            if (d) setDuration(d);
            
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
            if (event.data === 1) {
              setIsMediaReady(true);
              setIsPlaying(true);
              try {
                ytAmbientPlayerRef.current?.playVideo();
              } catch (_) {}
            } else if (event.data === 2) {
              setIsPlaying(false);
              try {
                ytAmbientPlayerRef.current?.pauseVideo();
              } catch (_) {}
            } else if (event.data === 0) {
              setIsPlaying(false);
              try {
                ytAmbientPlayerRef.current?.pauseVideo();
              } catch (_) {}
              if (onEnded) onEnded();
            }
          }
        }
      });

      // Synchronized Ambient YouTube Player for authentic live blurred backdrop
      const ambientElementId = `yt-ambient-player-${video.videoId}`;
      const ambientEl = document.getElementById(ambientElementId);
      if (ambientEl) {
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
                if (!isMounted) return;
                try {
                  event.target.mute();
                  event.target.playVideo();
                } catch (_) {}
              }
            }
          });
        } catch (e) {
          console.warn('Ambient YT player init error:', e);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initYTPlayer();
    } else {
      const existingCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof existingCb === 'function') existingCb();
        initYTPlayer();
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
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
      }
      if (ytAmbientPlayerRef.current && ytAmbientPlayerRef.current.destroy) {
        try {
          ytAmbientPlayerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [video.videoId, video.videoUrl]);

  // Track YouTube Player Progress
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
        } catch (e) {
          // ignore
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [parsedMedia.type]);

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

  // Direct HTML5 Video Handlers
  const handleDirectTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      setDuration(videoRef.current.duration || video.duration || 0);
      if (onProgress) onProgress(cur);

      if (ambientVideoRef.current) {
        const diff = Math.abs(ambientVideoRef.current.currentTime - cur);
        if (diff > 0.35) {
          ambientVideoRef.current.currentTime = cur;
        }
      }
    }
  };

  const togglePlay = () => {
    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        try {
          ytAmbientPlayerRef.current?.pauseVideo();
        } catch (_) {}
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        try {
          ytAmbientPlayerRef.current?.playVideo();
        } catch (_) {}
        setIsPlaying(true);
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        ambientVideoRef.current?.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          ambientVideoRef.current?.play().catch(() => {});
          setIsPlaying(true);
        }).catch(console.error);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);

    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(targetTime, true);
      try {
        ytAmbientPlayerRef.current?.seekTo(targetTime, true);
      } catch (_) {}
    } else if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      if (ambientVideoRef.current) {
        ambientVideoRef.current.currentTime = targetTime;
      }
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      if (nextMuted) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
      }
    } else if (videoRef.current) {
      videoRef.current.muted = nextMuted;
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

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        // Force Landscape screen orientation lock on mobile devices (YouTube style)
        if (window.screen && window.screen.orientation && typeof (window.screen.orientation as any).lock === 'function') {
          (window.screen.orientation as any).lock('landscape').catch(() => {
            // Fallback for browsers with strict orientation policies
          });
        }
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
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
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);

    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(newTime, true);
        if (ytAmbientPlayerRef.current?.seekTo) {
          ytAmbientPlayerRef.current.seekTo(newTime, true);
        }
      } catch (err) {
        console.warn('YT seek error', err);
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      if (ambientVideoRef.current) {
        ambientVideoRef.current.currentTime = newTime;
      }
    }
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

  // Handle pointer down (both mouse double-click and mobile touch double-tap)
  const handleShieldPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary click/touch
    if (e.button !== 0) return;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const width = rect.width;

    let side: 'left' | 'right' | 'center' = 'center';
    if (relativeX < width * 0.4) side = 'left';
    else if (relativeX > width * 0.6) side = 'right';

    const now = Date.now();
    const isDouble =
      (e.detail >= 2 && (side === 'left' || side === 'right')) ||
      (now - lastTapRef.current.time < 350 &&
        lastTapRef.current.side === side &&
        (side === 'left' || side === 'right'));

    if (isDouble && (side === 'left' || side === 'right')) {
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
      singleClickTimeoutRef.current = setTimeout(() => {
        togglePlay();
        singleClickTimeoutRef.current = null;
      }, 260);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full group select-none transition-all ${
        isFullscreen 
          ? 'h-screen w-screen bg-black overflow-hidden flex items-center justify-center' 
          : 'aspect-video'
      }`}
    >
      {/* REAL AMBIENT LIGHT BACKDROP (Radiates into the page when not fullscreen, and fills letterbox gaps in fullscreen) */}
      <div 
        className={`absolute pointer-events-none select-none z-0 transition-all duration-700 ease-out ${
          isFullscreen ? 'inset-0 overflow-hidden' : `${ambientConfig.spreadClass} overflow-visible`
        } ${isAmbientMode ? 'opacity-100' : 'opacity-0'}`}
        style={{
          opacity: isAmbientMode ? (isPlaying ? ambientConfig.opacity : ambientConfig.opacity * 0.5) : 0,
          filter: `${ambientConfig.blur} ${ambientConfig.saturate}`,
          transform: `${ambientConfig.scale} translateZ(0)`,
          willChange: 'filter, transform, opacity'
        }}
      >
        {parsedMedia.type === 'youtube' ? (
          <div className="w-full h-full scale-125 overflow-hidden flex items-center justify-center opacity-90">
            <div id={`yt-ambient-player-${video.videoId}`} className="w-full h-full pointer-events-none" />
          </div>
        ) : parsedMedia.type === 'direct' ? (
          <div className="w-full h-full scale-125 overflow-hidden flex items-center justify-center">
            <video
              ref={ambientVideoRef}
              src={parsedMedia.embedUrl}
              muted
              playsInline
              autoPlay
              loop={isLooping}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
        ) : video.thumbnailUrl ? (
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
          isFullscreen 
            ? 'rounded-none border-none flex items-center justify-center' 
            : 'rounded-none sm:rounded-2xl border-none sm:border border-slate-200 dark:border-[#334155]'
        }`}
      >
      {/* SKELETON LOADING OVERLAY (Displayed until media stream is ready) */}
      <AnimatePresence>
        {!isMediaReady && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-40 bg-slate-900 flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Background thumbnail blur preview */}
            {video.thumbnailUrl && (
              <img 
                src={video.thumbnailUrl} 
                alt={video.title} 
                className="absolute inset-0 w-full h-full object-cover filter blur-md opacity-40 scale-105"
              />
            )}

            {/* Shimmer pulse line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-pulse" />

            {/* Center Spinner */}
            <div className="relative z-10 flex flex-col items-center gap-3 p-6 text-center">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-[#2563eb]/30 border-t-[#2563eb] animate-spin" />
                <Play className="w-5 h-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-current ml-0.5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black tracking-wider text-white uppercase">
                  Loading SocialIndia Stream...
                </p>
                <p className="text-[11px] text-slate-300 font-medium truncate max-w-xs">
                  {video.title}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div id={`yt-player-${video.videoId}`} className="w-full h-full" />
          </div>
        ) : parsedMedia.type === 'drive' ? (
          <iframe
            src={parsedMedia.embedUrl}
            title={video.title}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            onLoad={() => setIsMediaReady(true)}
            className="w-full h-full"
          />
        ) : (
          <video
            ref={videoRef}
            src={parsedMedia.embedUrl}
            autoPlay
            playsInline
            preload="auto"
            onCanPlay={() => {
              setIsMediaReady(true);
              if (videoRef.current) {
                videoRef.current.play().then(() => {
                  setIsPlaying(true);
                }).catch(() => {
                  // If browser policy requires mute first for autoplay
                  if (videoRef.current) {
                    videoRef.current.muted = true;
                    setIsMuted(true);
                    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                  }
                });
              }
            }}
            onTimeUpdate={handleDirectTimeUpdate}
            onEnded={() => {
              if (isLooping) {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                }
                return;
              }
              setIsPlaying(false);
              if (onEnded) onEnded();
            }}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* INVISIBLE CLICK SHIELD (Single-tap play/pause, Double-click / Double-tap 10s seek) */}
      <div 
        onPointerDown={handleShieldPointerDown}
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

      {/* TOP HEADER OVERLAY WITH MOTION (Title, Creator Avatar, Watch Later, Share & 3-Dots) */}
      <AnimatePresence>
        {(showControls || !isPlaying) && isMediaReady && (
          <motion.div 
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className={`absolute top-0 inset-x-0 z-30 p-3 sm:p-4 ${
              isAmbientMode 
                ? 'bg-gradient-to-b from-black/50 via-black/20 to-transparent backdrop-blur-[2px]' 
                : 'bg-gradient-to-b from-black/90 via-black/40 to-transparent'
            } pointer-events-auto flex items-center justify-between transition-colors duration-300`}
          >
            {/* Left: Channel Avatar & Title */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('creator', video.creatorUsername);
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-extrabold text-xs cursor-pointer border border-white/20 shadow-xs hover:scale-105 transition-transform shrink-0"
              >
                {video.creatorPhotoURL ? (
                  <img src={video.creatorPhotoURL} alt={video.creatorUsername} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>{getInitials(video.creatorDisplayName)}</span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-md drop-shadow-md">
                  {video.title}
                </h3>
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('creator', video.creatorUsername);
                  }}
                  className="text-[10px] sm:text-[11px] text-blue-300 font-bold hover:underline cursor-pointer truncate"
                >
                  {video.creatorDisplayName} (@{video.creatorUsername})
                </p>
              </div>
            </div>

            {/* Right: Watch Later, Share, and 3-Dots Menu */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSavedWatchLater(!isSavedWatchLater);
                }}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                title={isSavedWatchLater ? "Saved to Watch Later" : "Watch Later"}
              >
                <Clock className={`w-4 h-4 ${isSavedWatchLater ? 'text-blue-400 fill-blue-400/40' : 'text-white'}`} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (navigator.share) {
                    navigator.share({ title: video.title, url: window.location.href }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayerMenuAnchor('top');
                  setShowPlayerMenu(!showPlayerMenu);
                  setPlayerSubMenu('main');
                }}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                title="Playback Settings & More"
              >
                <MoreVertical className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER PLAY/PAUSE BUTTON WITH MOTION */}
      <AnimatePresence>
        {(showControls || !isPlaying) && isMediaReady && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-16 h-16 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-2xl shadow-blue-600/40 border-2 border-white/20 backdrop-blur-md transition-transform hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
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
            {/* Custom Interactive Timeline (Electric Blue Played Track + Hover Preview Tooltip) */}
            <div 
              ref={timelineRef}
              onClick={handleTimelineSeekClick}
              onMouseMove={handleTimelineMouseMove}
              onMouseLeave={handleTimelineMouseLeave}
              className="relative w-full h-4 flex items-center group/timeline cursor-pointer"
            >
              {/* Tooltip on hover */}
              {isTimelineHovered && hoverTime !== null && (
                <div 
                  className="absolute bottom-6 -translate-x-1/2 px-2 py-0.5 bg-black/90 text-white text-[10px] font-bold rounded-md shadow-lg pointer-events-none whitespace-nowrap border border-white/10"
                  style={{ left: `${hoverPercent}%` }}
                >
                  {formatDuration(hoverTime)}
                </div>
              )}

              {/* Background Track */}
              <div className="w-full h-1 group-hover/timeline:h-1.5 rounded-full bg-white/20 relative transition-all overflow-hidden">
                {/* Buffered Amount */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-white/40 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, ((currentTime + 20) / (duration || 1)) * 100))}%` }}
                />
                {/* Played Portion (Royal Electric Blue #2563eb) */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-[#2563eb] rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100))}%` }}
                />
              </div>

              {/* Scrubber Handle Dot (Electric Blue with White Rim) */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#2563eb] border-2 border-white shadow-md pointer-events-none transition-transform scale-0 group-hover/timeline:scale-100"
                style={{ left: `${Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100))}%` }}
              />
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                {/* Next Video Button (Skips to next video in playlist queue, or seeks +10s) */}
                <button
                  onClick={() => {
                    if (hasNextVideo && onNextVideo) {
                      onNextVideo();
                    } else {
                      skipSeconds(10);
                    }
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
                  title={hasNextVideo ? "Next Video in Playlist (Shift+N)" : "Skip 10s"}
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-14 sm:w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
                  />
                </div>

                {/* Timeline Time Display */}
                <div className="text-[11px] font-bold tracking-wider text-slate-200">
                  <span>{formatDuration(currentTime)}</span>
                  <span className="mx-1 text-slate-400">/</span>
                  <span className="text-slate-400">{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Right Side: CC, Settings (with HD Badge), Theater, Fullscreen */}
              <div className="flex items-center gap-1.5 sm:gap-2 relative">
                {/* Closed Captions CC Badge */}
                <button
                  onClick={() => setIsCaptionsOn(!isCaptionsOn)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border transition-colors cursor-pointer ${
                    isCaptionsOn 
                      ? 'bg-white text-black border-white' 
                      : 'border-white/50 text-white/80 hover:border-white hover:text-white'
                  }`}
                  title="Subtitles / CC"
                >
                  CC
                </button>

                {/* Ambient Mode Quick Toggle (Enhanced YouTube Ambient Light) */}
                <button
                  onClick={toggleAmbientMode}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                    isAmbientMode 
                      ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50 shadow-sm shadow-amber-500/20' 
                      : 'hover:bg-white/20 text-slate-300'
                  }`}
                  title={isHindi ? (isAmbientMode ? 'अम्बिएंट मोड: चालू' : 'अम्बिएंट मोड: बंद') : (isAmbientMode ? 'Ambient Mode: On' : 'Ambient Mode: Off')}
                >
                  <Sun className={`w-4 h-4 ${isAmbientMode ? 'text-amber-400 animate-spin-slow' : 'text-slate-300'}`} />
                </button>

                {/* Settings with HD Badge (YouTube Style) */}
                <button
                  onClick={() => {
                    setPlayerMenuAnchor('bottom');
                    setShowPlayerMenu(!showPlayerMenu);
                    setPlayerSubMenu('main');
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-white"
                  title="Playback Settings"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-[9px] font-black bg-[#2563eb] text-white px-1 py-0.2 rounded shadow-xs">
                    HD
                  </span>
                </button>

                {/* Theater Mode Button */}
                {onToggleTheaterMode && (
                  <button
                    onClick={onToggleTheaterMode}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isTheaterMode ? 'bg-[#2563eb] text-white' : 'hover:bg-white/20 text-slate-200'
                    }`}
                    title={isTheaterMode ? "Default View (t)" : "Theater Mode (t)"}
                  >
                    <Tv className="w-4 h-4" />
                  </button>
                )}

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
                  title="Toggle Fullscreen (f)"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPACT DROPDOWN POPUP MENU (BOTH MOBILE & DESKTOP - NO SWIPE DRAWER) */}
      <AnimatePresence>
        {showPlayerMenu && (
          <>
            {/* Click-away backdrop */}
            <div 
              onClick={() => setShowPlayerMenu(false)}
              className="absolute inset-0 z-45 cursor-default bg-black/20 backdrop-blur-[0.5px]"
            />

            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: playerMenuAnchor === 'top' ? -6 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: playerMenuAnchor === 'top' ? -6 : 6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`absolute ${
                playerMenuAnchor === 'top' ? 'top-12 right-3' : 'bottom-12 right-3'
              } w-52 sm:w-60 max-w-[calc(100%-1.5rem)] bg-[#18181c]/95 backdrop-blur-md border border-white/20 rounded-2xl p-2 shadow-2xl text-white select-none z-50 text-xs overflow-hidden`}
            >
              {playerSubMenu === 'main' && (
                <div className="space-y-0.5">
                  {/* Compact Header */}
                  <div className="flex items-center justify-between pb-1.5 px-1 border-b border-white/10 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                      {isHindi ? 'वीडियो विकल्प' : 'Video Options'}
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

                  {['1080p HD (Auto)', '1080p Premium 60fps', '720p HD', '480p High', '360p Data Saver', 'Auto'].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setSelectedQuality(q);
                        setPlayerSubMenu('main');
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer text-left"
                    >
                      <span className={`text-xs ${selectedQuality === q ? 'font-black text-blue-400' : 'font-medium text-slate-300'}`}>
                        {q === 'Auto' ? (isHindi ? 'ऑटो (Auto)' : 'Auto') : q}
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
