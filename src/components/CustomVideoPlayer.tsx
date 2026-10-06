import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video } from '../types';
import { parseVideoUrl, formatDuration, getInitials } from '../utils/videoUtils';
import { useRouter } from '../hooks/useRouter';
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
  Tv
} from 'lucide-react';

interface CustomVideoPlayerProps {
  video: Video;
  onEnded?: () => void;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  seekToTime?: number;
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
  seekToTime 
}) => {
  const { navigate } = useRouter();
  const parsedMedia = parseVideoUrl(video.videoUrl);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);

  // Handle external seekToTime request (e.g. description timestamp click)
  useEffect(() => {
    if (seekToTime !== undefined && seekToTime >= 0) {
      if (parsedMedia.type === 'direct' && videoRef.current) {
        videoRef.current.currentTime = seekToTime;
        setCurrentTime(seekToTime);
        videoRef.current.play().catch(console.error);
        setIsPlaying(true);
      } else if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo(seekToTime, true);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch (e) {
          console.warn('YouTube seek failed:', e);
        }
      }
    }
  }, [seekToTime]);

  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

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

  // Handle YouTube IFrame API Initialization
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
            } catch (e) {
              // Fallback to muted autoplay if browser blocks audio
              try {
                event.target.mute();
                setIsMuted(true);
                event.target.playVideo();
                setIsPlaying(true);
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
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              setIsPlaying(false);
              if (onEnded) onEnded();
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
        initYTPlayer();
      };
    } else {
      initYTPlayer();
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
          if (cur !== undefined) setCurrentTime(cur);
          if (dur) setDuration(dur);
        } catch (e) {
          // ignore
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [parsedMedia.type]);

  // Direct HTML5 Video Handlers
  const handleDirectTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || video.duration || 0);
    }
  };

  const togglePlay = () => {
    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);

    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(targetTime, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
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
      } catch (err) {
        console.warn('YT seek error', err);
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
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
      className={`relative w-full bg-slate-950 overflow-hidden shadow-2xl group select-none transition-all ${
        isFullscreen 
          ? 'h-screen w-screen rounded-none border-none max-w-none max-h-none flex items-center justify-center' 
          : 'aspect-video rounded-none sm:rounded-2xl border-none sm:border border-slate-200 dark:border-[#334155]'
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

      {/* TOP HEADER OVERLAY WITH MOTION (OUR Title, Creator Avatar & Display Name) */}
      <AnimatePresence>
        {(showControls || !isPlaying) && isMediaReady && (
          <motion.div 
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('creator', video.creatorUsername);
                }}
                className="w-9 h-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-extrabold text-xs cursor-pointer border border-white/20 shadow-xs hover:scale-105 transition-transform"
              >
                {video.creatorPhotoURL ? (
                  <img src={video.creatorPhotoURL} alt={video.creatorUsername} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span>{getInitials(video.creatorDisplayName)}</span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-xs sm:max-w-md drop-shadow-md">
                  {video.title}
                </h3>
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('creator', video.creatorUsername);
                  }}
                  className="text-[11px] text-blue-300 font-bold hover:underline cursor-pointer truncate"
                >
                  {video.creatorDisplayName} (@{video.creatorUsername})
                </p>
              </div>
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
              className="w-16 h-16 rounded-full bg-[#2563eb]/90 hover:bg-[#2563eb] text-white flex items-center justify-center shadow-2xl backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer pointer-events-auto"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
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
            className="absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto space-y-2"
          >
            {/* OUR Custom Timeline Seek Bar */}
            <div className="relative flex items-center group/timeline">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/30 hover:h-2.5 rounded-lg appearance-none cursor-pointer accent-[#2563eb] transition-all"
              />
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between text-white text-xs pt-1">
              <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                {/* Skip 10s */}
                <button
                  onClick={() => skipSeconds(-10)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer hidden sm:block"
                  title="Rewind 10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => skipSeconds(10)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer hidden sm:block"
                  title="Forward 10s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
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
                    className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
                  />
                </div>

                {/* OUR Timeline Time Display */}
                <div className="text-[11px] font-extrabold tracking-wider text-slate-200">
                  <span>{formatDuration(currentTime)}</span>
                  <span className="mx-1 text-slate-400">/</span>
                  <span className="text-slate-400">{formatDuration(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Theater Mode Button */}
                {onToggleTheaterMode && (
                  <button
                    onClick={onToggleTheaterMode}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isTheaterMode ? 'bg-blue-600 text-white' : 'hover:bg-white/20 text-slate-200'
                    }`}
                    title={isTheaterMode ? "Default View (t)" : "Theater Mode (t)"}
                  >
                    <Tv className="w-4 h-4" />
                  </button>
                )}

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
