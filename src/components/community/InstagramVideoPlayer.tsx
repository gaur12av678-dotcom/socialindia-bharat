import React, { useEffect, useRef, useState } from 'react';
import { Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface InstagramVideoPlayerProps {
  src: string;
  poster?: string;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

export const InstagramVideoPlayer: React.FC<InstagramVideoPlayerProps> = ({ src, poster }) => {
  const { isHindi } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef(Symbol('community-video-player'));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.load();
    }
  }, [src]);

  useEffect(() => {
    const handleOtherPlayerStarted = (event: Event) => {
      const activePlayerId = (event as CustomEvent<symbol>).detail;
      if (activePlayerId !== playerIdRef.current) {
        videoRef.current?.pause();
      }
    };

    window.addEventListener('socialindia:community-video-playing', handleOtherPlayerStarted);
    return () => window.removeEventListener('socialindia:community-video-playing', handleOtherPlayerStarted);
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => {
      const video = videoRef.current;
      if (!video || !entry) return;

      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
        if (video.paused) {
          void video.play().catch(error => {
            console.warn('Could not autoplay community video:', error);
          });
        }
      } else if (entry.intersectionRatio < 0.25) {
        video.pause();
      }
    }, { threshold: [0, 0.25, 0.65] });

    observer.observe(player);
    return () => observer.disconnect();
  }, [src]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play().catch(error => {
        console.warn('Could not start community video playback:', error);
        setPlaying(false);
      });
    } else {
      video.pause();
    }
  };

  const toggleFullscreen = async () => {
    const player = videoRef.current?.parentElement;
    if (!player) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await player.requestFullscreen();
      }
    } catch (error) {
      console.warn('Could not change community video fullscreen state:', error);
    }
  };

  return (
    <div ref={playerRef} className="relative mb-3.5 aspect-[4/5] max-h-[min(70vh,720px)] overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        muted={muted}
        onClick={togglePlayback}
        onPlay={() => {
          setPlaying(true);
          window.dispatchEvent(new CustomEvent('socialindia:community-video-playing', {
            detail: playerIdRef.current
          }));
        }}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={event => {
          const nextDuration = event.currentTarget.duration;
          setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
        }}
        onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
        onError={() => setHasError(true)}
        className="h-full w-full cursor-pointer object-contain"
      />

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-5 text-center text-sm text-rose-200">
          {isHindi ? 'यह वीडियो नहीं चलाया जा सका।' : 'This video could not be played.'}
        </div>
      ) : (
        <>
          {!playing && (
            <button
              type="button"
              onClick={togglePlayback}
              className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label={isHindi ? 'वीडियो चलाएं' : 'Play video'}
            >
              <Play className="ml-1 h-6 w-6 fill-current" />
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-3 pt-8 text-white">
            <button
              type="button"
              onClick={togglePlayback}
              className="rounded-full p-1.5 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label={playing
                ? (isHindi ? 'वीडियो रोकें' : 'Pause video')
                : (isHindi ? 'वीडियो चलाएं' : 'Play video')}
            >
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            <span className="min-w-[4.5rem] text-xs tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={event => {
                const nextTime = Number(event.currentTarget.value);
                if (videoRef.current) videoRef.current.currentTime = nextTime;
                setCurrentTime(nextTime);
              }}
              disabled={!duration}
              aria-label={isHindi ? 'वीडियो की स्थिति' : 'Video position'}
              className="min-w-0 flex-1 accent-fuchsia-400"
            />

            <button
              type="button"
              onClick={() => setMuted(value => !value)}
              className="rounded-full p-1.5 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label={muted
                ? (isHindi ? 'आवाज़ चालू करें' : 'Unmute video')
                : (isHindi ? 'आवाज़ बंद करें' : 'Mute video')}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-full p-1.5 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label={isHindi ? 'पूर्ण स्क्रीन में देखें' : 'View fullscreen'}
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
