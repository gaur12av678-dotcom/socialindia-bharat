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
  RotateCw 
} from 'lucide-react';

interface CustomVideoPlayerProps {
  video: Video;
  onEnded?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ video, onEnded }) => {
  const { navigate } = useRouter();
  const parsedMedia = parseVideoUrl(video.videoUrl);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);

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

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  };

  const skipSeconds = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);

    if (parsedMedia.type === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(newTime, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-[#334155] group select-none"
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

      {/* VIDEO IFRAME / VIDEO LAYER (Cropped with scale-128 to completely push YouTube's native top title bar, center play icon, and bottom watermark/share buttons out of bounds) */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
        {parsedMedia.type === 'youtube' ? (
          <div className="absolute -inset-[14%] w-[128%] h-[128%] scale-[1.28] pointer-events-none flex items-center justify-center">
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

      {/* INVISIBLE CLICK SHIELD (Toggles play/pause on video click) */}
      <div 
        onClick={togglePlay}
        className="absolute inset-0 z-20 cursor-pointer"
      />

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
