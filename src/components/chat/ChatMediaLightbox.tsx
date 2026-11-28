import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Maximize,
  Minimize,
  MoreVertical,
  Pause,
  PictureInPicture2,
  Play,
  Repeat,
  Reply,
  RotateCcw,
  RotateCw,
  Share2,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Check,
  AlertCircle,
  Film,
} from 'lucide-react';
import {
  downloadChatMedia,
  shareChatMedia,
  getAttachmentDownloadUrl,
  buildChatMediaFilename,
} from '../../utils/mediaDownloadShare';
import { formatDuration } from '../../utils/videoUtils';

export interface ChatMediaItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  senderName: string;
  senderPhotoURL?: string;
  createdAt: string;
  text?: string;
}

interface ChatMediaLightboxProps {
  items: ChatMediaItem[];
  initialMessageId: string;
  isHindi: boolean;
  onClose: () => void;
  onReplyMessage?: (messageId: string) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2];

export const ChatMediaLightbox: React.FC<ChatMediaLightboxProps> = ({
  items,
  initialMessageId,
  isHindi,
  onClose,
  onReplyMessage,
  onToast,
}) => {
  const initialIdx = Math.max(
    0,
    items.findIndex((item) => item.id === initialMessageId)
  );
  const [activeIndex, setActiveIndex] = useState(initialIdx);
  const activeItem = items[activeIndex] || items[0];

  // Chrome & menu state
  const [controlsVisible, setControlsVisible] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Image viewer state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  // Video player state
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<'back' | 'forward' | null>(null);
  const seekFeedbackTimerRef = useRef<number | null>(null);

  // Touch swipe / double-tap refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < items.length - 1;

  const scheduleAutoHide = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (activeItem?.mediaType === 'video' && isPlaying && !moreMenuOpen) {
      hideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [activeItem?.mediaType, isPlaying, moreMenuOpen]);

  useEffect(() => {
    scheduleAutoHide();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [scheduleAutoHide]);

  // Reset per-media state on item change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setImageError(false);
    setVideoError(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferedPercent(0);
    setIsPlaying(false);
    setIsBuffering(activeItem?.mediaType === 'video');
    setControlsVisible(true);
    setMoreMenuOpen(false);
    setDownloadDone(false);
  }, [activeIndex, activeItem?.id, activeItem?.mediaType]);

  // Sync activeIndex if items array shrinks
  useEffect(() => {
    if (activeIndex >= items.length && items.length > 0) {
      setActiveIndex(items.length - 1);
    }
  }, [items.length, activeIndex]);

  // Track fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) setActiveIndex((i) => i - 1);
  }, [activeIndex]);

  const goNext = useCallback(() => {
    if (activeIndex < items.length - 1) setActiveIndex((i) => i + 1);
  }, [activeIndex, items.length]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setControlsVisible(true);
    if (vid.paused || vid.ended) {
      vid.play().catch(() => {
        // Autoplay with audio blocked fallback: mute and retry
        vid.muted = true;
        setIsMuted(true);
        vid.play().catch(() => {});
      });
    } else {
      vid.pause();
    }
  }, []);

  const seekBy = useCallback((deltaSeconds: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    const target = Math.max(0, Math.min(vid.duration || 0, vid.currentTime + deltaSeconds));
    vid.currentTime = target;
    setCurrentTime(target);
    setControlsVisible(true);
    setSeekFeedback(deltaSeconds < 0 ? 'back' : 'forward');
    if (seekFeedbackTimerRef.current) window.clearTimeout(seekFeedbackTimerRef.current);
    seekFeedbackTimerRef.current = window.setTimeout(() => setSeekFeedback(null), 650);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (moreMenuOpen) {
          setMoreMenuOpen(false);
          return;
        }
        if (zoom > 1) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
          return;
        }
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (e.shiftKey && activeItem?.mediaType === 'video') {
          seekBy(-10);
        } else {
          goPrev();
        }
      } else if (e.key === 'ArrowRight') {
        if (e.shiftKey && activeItem?.mediaType === 'video') {
          seekBy(10);
        } else {
          goNext();
        }
      } else if (e.key === ' ' && activeItem?.mediaType === 'video') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, moreMenuOpen, zoom, goPrev, goNext, seekBy, togglePlay, activeItem?.mediaType]);

  // Autoplay video cleanly when opening or switching to a video
  useEffect(() => {
    if (activeItem?.mediaType !== 'video') return;
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = playbackRate;
    vid.loop = isLooping;
    vid.muted = isMuted;
    vid.volume = volume;
    const playPromise = vid.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Wait for user tap if browser blocks unmuted autoplay
        setIsPlaying(false);
        setIsBuffering(false);
      });
    }
  }, [activeItem?.id, activeItem?.mediaType]);

  const handleVideoTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime || 0);
    if (vid.buffered && vid.buffered.length > 0 && vid.duration > 0) {
      const end = vid.buffered.end(vid.buffered.length - 1);
      setBufferedPercent(Math.min(100, (end / vid.duration) * 100));
    }
  };

  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = val;
    setCurrentTime(val);
    scheduleAutoHide();
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (vid) {
      vid.muted = nextMuted;
      if (!nextMuted && vid.volume === 0) {
        vid.volume = 0.8;
        setVolume(0.8);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const cyclePlaybackRate = () => {
    const idx = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (videoRef.current) {
      videoRef.current.loop = next;
    }
  };

  const togglePictureInPicture = async () => {
    const vid = videoRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null;
    if (!vid || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (vid.requestPictureInPicture) {
        await vid.requestPictureInPicture();
      }
    } catch {
      onToast(isHindi ? 'PiP उपलब्ध नहीं है।' : 'Picture-in-Picture is not available.', 'info');
    }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }) | null;
    if (!el) return;
    try {
      if (!document.fullscreenElement && !(document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }
      }
    } catch {
      // Ignore fullscreen errors on restricted webviews
    }
  };

  const handleDownload = async () => {
    if (!activeItem || isDownloading) return;
    setIsDownloading(true);
    setMoreMenuOpen(false);
    try {
      const mode = await downloadChatMedia({
        url: activeItem.mediaUrl,
        mediaType: activeItem.mediaType,
        id: activeItem.id,
      });
      setDownloadDone(true);
      window.setTimeout(() => setDownloadDone(false), 2500);
      if (mode === 'direct' || mode === 'bridge') {
        onToast(
          isHindi
            ? 'डाउनलोड शुरू हो गया है!'
            : 'Download started!',
          'success'
        );
      } else {
        onToast(
          activeItem.mediaType === 'video'
            ? (isHindi ? 'वीडियो आपके डिवाइस में सेव हो गया!' : 'Video saved to your device!')
            : (isHindi ? 'फ़ोटो आपके डिवाइस में सेव हो गई!' : 'Photo saved to your device!'),
          'success'
        );
      }
    } catch (err) {
      console.error('Chat media download failed:', err);
      onToast(
        isHindi ? 'डाउनलोड करने में समस्या आई। कृपया पुनः प्रयास करें।' : 'Could not download media. Please try again.',
        'error'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!activeItem || isSharing) return;
    setIsSharing(true);
    setMoreMenuOpen(false);
    try {
      const result = await shareChatMedia({
        url: activeItem.mediaUrl,
        mediaType: activeItem.mediaType,
        text: activeItem.text,
        id: activeItem.id,
        title: isHindi ? 'SocialIndia मीडिया' : 'SocialIndia Media',
      });
      if (result === 'copied') {
        onToast(isHindi ? 'मीडिया लिंक कॉपी हो गया!' : 'Media link copied to clipboard!', 'success');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Chat media share failed:', err);
      onToast(isHindi ? 'शेयर करने में समस्या आई।' : 'Could not share media.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!activeItem) return;
    setMoreMenuOpen(false);
    try {
      await navigator.clipboard.writeText(activeItem.mediaUrl);
      onToast(isHindi ? 'लिंक कॉपी किया गया!' : 'Media link copied!', 'success');
    } catch {
      onToast(isHindi ? 'लिंक कॉपी नहीं हो सका।' : 'Could not copy link.', 'error');
    }
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1, Number((z - 0.5).toFixed(1)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningRef.current) return;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && now - last.time < 280) {
      // Double tap toggles zoom
      if (zoom > 1) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else {
        setZoom(2);
      }
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, x: e.clientX };
      setControlsVisible((v) => !v);
    }
  };

  const handleVideoSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
    const now = Date.now();
    const last = lastTapRef.current;

    if (last && now - last.time < 280) {
      if (relX < 0.35) {
        seekBy(-10);
      } else if (relX > 0.65) {
        seekBy(10);
      } else {
        togglePlay();
      }
      lastTapRef.current = null;
      return;
    }

    lastTapRef.current = { time: now, x: e.clientX };
    setControlsVisible((v) => !v);
  };

  // Horizontal swipe to navigate between media items (when not zoomed)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || zoom > 1 || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.time;
    if (dt < 500 && Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(isHindi ? 'hi-IN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (!activeItem) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[120] bg-black text-white flex flex-col select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={activeItem.mediaType === 'video' ? 'Video player' : 'Photo viewer'}
    >
      {/* TOP BAR (WhatsApp-style dark gradient scrim) */}
      <header
        className={`absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-black/85 via-black/50 to-transparent px-2 sm:px-4 pt-safe transition-opacity duration-200 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer shrink-0"
              aria-label={isHindi ? 'बंद करें' : 'Close'}
              title={isHindi ? 'बंद करें' : 'Close'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">
                  {activeItem.senderName}
                </span>
                {items.length > 1 && (
                  <span className="text-xs text-white/65 tabular-nums shrink-0">
                    · {activeIndex + 1}/{items.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/70 truncate">
                {formatTimestamp(activeItem.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 relative">
            {activeItem.mediaType === 'image' && (
              <>
                <button
                  type="button"
                  onClick={zoom > 1 ? handleZoomOut : handleZoomIn}
                  className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
                  title={zoom > 1 ? (isHindi ? 'ज़ूम आउट' : 'Zoom out') : (isHindi ? 'ज़ूम इन' : 'Zoom in')}
                  aria-label={zoom > 1 ? 'Zoom out' : 'Zoom in'}
                >
                  {zoom > 1 ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
                  title={isHindi ? 'घुमाएं' : 'Rotate'}
                  aria-label="Rotate"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer disabled:opacity-60"
              title={isHindi ? 'डाउनलोड करें' : 'Download'}
              aria-label={isHindi ? 'डाउनलोड करें' : 'Download'}
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : downloadDone ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={isSharing}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer disabled:opacity-60"
              title={isHindi ? 'शेयर करें' : 'Share'}
              aria-label={isHindi ? 'शेयर करें' : 'Share'}
            >
              {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => setMoreMenuOpen((v) => !v)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              title={isHindi ? 'और विकल्प' : 'More options'}
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {moreMenuOpen && (
              <div
                className="absolute right-0 top-12 w-52 rounded-2xl bg-[#1f2c34] border border-white/10 shadow-2xl py-1.5 z-50 text-xs font-semibold text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 text-left cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isHindi ? 'डिवाइस में सेव करें' : 'Save to device'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 text-left cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{isHindi ? 'शेयर करें' : 'Share'}</span>
                </button>
                {onReplyMessage && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onReplyMessage(activeItem.id);
                      onClose();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 text-left cursor-pointer"
                  >
                    <Reply className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{isHindi ? 'इस पर जवाब दें' : 'Reply'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleCopyLink()}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 text-left cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>{isHindi ? 'लिंक कॉपी करें' : 'Copy media link'}</span>
                </button>
                {activeItem.mediaType === 'image' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setRotation((r) => (r + 90) % 360);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 text-left cursor-pointer sm:hidden"
                  >
                    <RotateCw className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>{isHindi ? 'फ़ोटो घुमाएं' : 'Rotate photo'}</span>
                  </button>
                )}
                <a
                  href={getAttachmentDownloadUrl(
                    activeItem.mediaUrl,
                    buildChatMediaFilename(activeItem.mediaUrl, activeItem.mediaType, activeItem.id)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMoreMenuOpen(false)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 text-left cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>{isHindi ? 'ब्राउज़र में खोलें' : 'Open in browser'}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PREV / NEXT GALLERY ARROWS (Desktop) */}
      {hasPrev && controlsVisible && (
        <button
          type="button"
          onClick={goPrev}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 items-center justify-center transition-colors cursor-pointer"
          aria-label={isHindi ? 'पिछला' : 'Previous'}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {hasNext && controlsVisible && (
        <button
          type="button"
          onClick={goNext}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 items-center justify-center transition-colors cursor-pointer"
          aria-label={isHindi ? 'अगला' : 'Next'}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* MAIN MEDIA STAGE */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onClick={() => {
          if (moreMenuOpen) setMoreMenuOpen(false);
        }}
      >
        {activeItem.mediaType === 'image' ? (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={handleImageTap}
            onMouseDown={(e) => {
              if (zoom <= 1) return;
              isPanningRef.current = true;
              panStartRef.current = { x: e.clientX, y: e.clientY, origX: pan.x, origY: pan.y };
            }}
            onMouseMove={(e) => {
              if (!isPanningRef.current || zoom <= 1) return;
              setPan({
                x: panStartRef.current.origX + (e.clientX - panStartRef.current.x),
                y: panStartRef.current.origY + (e.clientY - panStartRef.current.y),
              });
            }}
            onMouseUp={() => {
              window.setTimeout(() => {
                isPanningRef.current = false;
              }, 20);
            }}
          >
            {imageError ? (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                </div>
                <p className="text-sm font-semibold text-white/90">
                  {isHindi ? 'फ़ोटो लोड नहीं हो सकी' : 'Could not load photo'}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDownload();
                  }}
                  className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold cursor-pointer"
                >
                  {isHindi ? 'डाउनलोड करके देखें' : 'Download instead'}
                </button>
              </div>
            ) : (
              <img
                src={activeItem.mediaUrl}
                alt={activeItem.text || 'Shared photo'}
                referrerPolicy="no-referrer"
                draggable={false}
                onError={() => setImageError(true)}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
                }}
                className="max-h-[82dvh] max-w-[96vw] object-contain transition-transform duration-150 ease-out"
              />
            )}
          </div>
        ) : (
          /* WHATSAPP-STYLE CUSTOM VIDEO PLAYER */
          <div
            className="relative w-full h-full flex items-center justify-center bg-black"
            onClick={handleVideoSurfaceClick}
          >
            {videoError ? (
              <div className="flex flex-col items-center gap-3 text-center px-6 z-20">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                </div>
                <p className="text-sm font-semibold text-white/90">
                  {isHindi ? 'वीडियो प्ले नहीं हो सका' : 'Could not play video'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoError(false);
                      videoRef.current?.load();
                    }}
                    className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                  >
                    {isHindi ? 'पुनः प्रयास करें' : 'Retry'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownload();
                    }}
                    className="px-4 py-2 rounded-full bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                  >
                    {isHindi ? 'डाउनलोड करें' : 'Download'}
                  </button>
                </div>
              </div>
            ) : (
              <video
                key={activeItem.id}
                ref={videoRef}
                src={activeItem.mediaUrl}
                playsInline
                preload="auto"
                loop={isLooping}
                onPlay={() => {
                  setIsPlaying(true);
                  setIsBuffering(false);
                  scheduleAutoHide();
                }}
                onPause={() => {
                  setIsPlaying(false);
                  setControlsVisible(true);
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  setControlsVisible(true);
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration || 0);
                  }
                }}
                onCanPlay={() => setIsBuffering(false)}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onTimeUpdate={handleVideoTimeUpdate}
                onError={() => {
                  setIsBuffering(false);
                  setVideoError(true);
                }}
                className="max-h-[84dvh] max-w-full w-auto h-auto object-contain"
              />
            )}

            {/* Double-tap seek feedback */}
            {seekFeedback && (
              <div
                className={`absolute top-1/2 -translate-y-1/2 z-20 px-4 py-2.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 pointer-events-none ${
                  seekFeedback === 'back' ? 'left-8 sm:left-16' : 'right-8 sm:right-16'
                }`}
              >
                {seekFeedback === 'back' ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>-10s</span>
                  </>
                ) : (
                  <>
                    <span>+10s</span>
                    <RotateCw className="w-4 h-4" />
                  </>
                )}
              </div>
            )}

            {/* Center Play / Pause / Buffering Circle */}
            {!videoError && (isBuffering || controlsVisible || !isPlaying) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-black/60 hover:bg-black/75 border border-white/25 backdrop-blur-md flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isBuffering ? (
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                ) : isPlaying ? (
                  <Pause className="w-7 h-7 fill-white text-white" />
                ) : (
                  <Play className="w-7 h-7 fill-white text-white ml-0.5" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM SCRIM: CAPTION + CUSTOM VIDEO CONTROLS + THUMBNAIL STRIP */}
      <footer
        className={`absolute bottom-0 inset-x-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 sm:px-6 pb-safe pt-8 transition-opacity duration-200 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Message Caption */}
        {activeItem.text && (
          <p className="max-w-2xl mx-auto text-center text-xs sm:text-sm text-white/95 font-medium mb-3 line-clamp-3 px-2">
            {activeItem.text}
          </p>
        )}

        {/* Video Progress & Custom Controls */}
        {activeItem.mediaType === 'video' && !videoError && (
          <div className="max-w-3xl mx-auto space-y-2 mb-3">
            {/* Seekbar */}
            <div className="relative h-5 flex items-center group">
              <div className="w-full h-1.5 rounded-full bg-white/25 overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
                  style={{ width: `${bufferedPercent}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-[#25d366] rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeekInput}
                aria-label="Seek video"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Control Buttons Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
                  title="-10s"
                  aria-label="Rewind 10 seconds"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
                  title="+10s"
                  aria-label="Forward 10 seconds"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
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
                    aria-label="Volume"
                    className="hidden sm:block w-16 h-1 accent-[#25d366] cursor-pointer"
                  />
                </div>

                <span className="text-[11px] sm:text-xs font-mono tabular-nums text-white/85 pl-1 whitespace-nowrap">
                  {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration || 0))}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={cyclePlaybackRate}
                  className="min-h-[36px] px-2.5 rounded-lg hover:bg-white/10 text-xs font-bold tabular-nums cursor-pointer"
                  title={isHindi ? 'प्लेबैक स्पीड' : 'Playback speed'}
                >
                  {playbackRate}x
                </button>

                <button
                  type="button"
                  onClick={toggleLoop}
                  className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer ${
                    isLooping ? 'text-[#25d366]' : 'text-white/80'
                  }`}
                  title={isHindi ? 'लूप' : 'Loop'}
                  aria-label="Toggle loop"
                >
                  <Repeat className="w-4 h-4" />
                </button>

                {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
                  <button
                    type="button"
                    onClick={() => void togglePictureInPicture()}
                    className="hidden sm:flex min-w-[40px] min-h-[40px] items-center justify-center rounded-full hover:bg-white/10 cursor-pointer text-white/85"
                    title="Picture-in-Picture"
                    aria-label="Picture in picture"
                  >
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer text-white/85"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  aria-label="Toggle fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Thumb-Zone Action Strip + Multi-Media Gallery Strip */}
        <div className="max-w-3xl mx-auto flex flex-col gap-2.5 pb-3">
          {items.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              {items.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#25d366] scale-105 opacity-100'
                        : 'border-transparent opacity-55 hover:opacity-90'
                    }`}
                    aria-label={`View media ${idx + 1}`}
                  >
                    {item.mediaType === 'image' ? (
                      <img
                        src={item.mediaUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <Film className="w-4 h-4 text-white/80" />
                      </div>
                    )}
                    {item.mediaType === 'video' && (
                      <span className="absolute bottom-0.5 right-0.5 bg-black/70 rounded p-0.5">
                        <Play className="w-2.5 h-2.5 fill-white text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Mobile & Web Thumb-Zone Action Bar */}
          <div className="flex items-center justify-around sm:justify-center sm:gap-6 border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              className="min-h-[44px] px-3 flex items-center gap-2 rounded-xl hover:bg-white/10 text-xs font-semibold text-white/90 cursor-pointer whitespace-nowrap"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : downloadDone ? (
                <Check className="w-4 h-4 text-[#25d366]" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isHindi ? 'डाउनलोड' : 'Download'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={isSharing}
              className="min-h-[44px] px-3 flex items-center gap-2 rounded-xl hover:bg-white/10 text-xs font-semibold text-white/90 cursor-pointer whitespace-nowrap"
            >
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span>{isHindi ? 'शेयर' : 'Share'}</span>
            </button>

            {onReplyMessage && (
              <button
                type="button"
                onClick={() => {
                  onReplyMessage(activeItem.id);
                  onClose();
                }}
                className="min-h-[44px] px-3 flex items-center gap-2 rounded-xl hover:bg-white/10 text-xs font-semibold text-white/90 cursor-pointer whitespace-nowrap"
              >
                <Reply className="w-4 h-4" />
                <span>{isHindi ? 'जवाब' : 'Reply'}</span>
              </button>
            )}

            {activeItem.mediaType === 'image' && (
              <button
                type="button"
                onClick={() => (zoom > 1 ? handleZoomOut() : handleZoomIn())}
                className="sm:hidden min-h-[44px] px-3 flex items-center gap-2 rounded-xl hover:bg-white/10 text-xs font-semibold text-white/90 cursor-pointer whitespace-nowrap"
              >
                {zoom > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                <span>{zoom > 1 ? '1x' : (isHindi ? 'ज़ूम' : 'Zoom')}</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
