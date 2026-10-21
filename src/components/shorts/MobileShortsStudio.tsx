import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  RotateCcw, 
  Sparkles, 
  Music, 
  Clock, 
  Gauge, 
  Image as ImageIcon, 
  Check, 
  ArrowLeft, 
  Sliders, 
  Type, 
  Smile, 
  Volume2, 
  Share2, 
  Eye, 
  Upload, 
  Loader2, 
  AlertCircle,
  Play,
  Pause,
  Trash2,
  Undo2,
  Flame,
  Zap,
  Globe,
  Lock,
  EyeOff,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../hooks/useRouter';
import { videoService } from '../../services/videoService';
import { userService } from '../../services/userService';
import { soundService, DEFAULT_SOUNDS } from '../../services/soundService';
import { SoundTrack } from '../../types';
import { useTranslation } from '../../i18n';
import { categoriesList } from '../../pages/Home';

interface MobileShortsStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialSound?: SoundTrack | null;
}

interface OverlayText {
  id: string;
  text: string;
  color: string;
  bgColor: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
}

const FILTER_PRESETS = [
  { id: 'normal', name: 'Normal', filter: 'none' },
  { id: 'vivid', name: 'Vivid', filter: 'saturate(1.4) contrast(1.1)' },
  { id: 'cinematic', name: 'Cinematic', filter: 'contrast(1.2) brightness(0.95) saturate(1.1)' },
  { id: 'warm', name: 'Warm', filter: 'sepia(0.3) saturate(1.2) hue-rotate(-10deg)' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(0.5) contrast(1.1) brightness(0.9)' },
  { id: 'mono', name: 'B&W', filter: 'grayscale(1) contrast(1.2)' },
  { id: 'sunset', name: 'Sunset', filter: 'saturate(1.5) hue-rotate(-20deg) brightness(1.05)' },
  { id: 'cyber', name: 'Cyber', filter: 'contrast(1.3) hue-rotate(90deg) saturate(1.3)' },
];

const QUICK_HASHTAGS = [
  '#Shorts',
  '#Trending',
  '#Bharat',
  '#Viral',
  '#Desi',
  '#Comedy',
  '#India',
  '#SocialIndia',
];

const QUICK_EMOJIS = ['🔥', '🇮🇳', '❤️', '😂', '⚡', '👏', '🎉', '🚀', '💯', '🤩', '✨', '🙌'];

export const MobileShortsStudio: React.FC<MobileShortsStudioProps> = ({
  isOpen,
  onClose,
  initialSound,
}) => {
  const { currentUser, currentUserProfile, addToast, refreshProfile } = useApp();
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  // Phase State: 'record' -> 'edit' -> 'details'
  const [phase, setPhase] = useState<'record' | 'edit' | 'details'>('record');

  // ==========================================
  // CAMERA & RECORDING STATES
  // ==========================================
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [permissionError, setPermissionError] = useState<string>('');
  const [maxDuration, setMaxDuration] = useState<15 | 60>(15);
  const [recordingSpeed, setRecordingSpeed] = useState<number>(1);
  const [countdownTimer, setCountdownTimer] = useState<0 | 3 | 10>(0);
  const [activeCountdown, setActiveCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [activeFilterId, setActiveFilterId] = useState('normal');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  // Sound States
  const [selectedSound, setSelectedSound] = useState<SoundTrack | null>(initialSound || null);
  const [soundModalOpen, setSoundModalOpen] = useState(false);
  const [playingPreviewSoundId, setPlayingPreviewSoundId] = useState<string | null>(null);
  const soundAudioRef = useRef<HTMLAudioElement | null>(null);

  // DOM Refs
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const customThumbInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // EDITING STATES
  // ==========================================
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(15);
  const [videoVolume, setVideoVolume] = useState<number>(100);
  const [soundVolume, setSoundVolume] = useState<number>(100);
  const [editTab, setEditTab] = useState<'none' | 'trim' | 'sound' | 'text' | 'filter'>('none');
  const [overlays, setOverlays] = useState<OverlayText[]>([]);
  const [inputTextModalOpen, setInputTextModalOpen] = useState(false);
  const [newTextValue, setNewTextValue] = useState('');
  const [newTextColor, setNewTextColor] = useState('#FFFFFF');
  const [newTextBg, setNewTextBg] = useState('rgba(0,0,0,0.6)');
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const editVideoRef = useRef<HTMLVideoElement>(null);

  // ==========================================
  // DETAILS & THUMBNAIL STATES
  // ==========================================
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string>('');
  const [framePickerOpen, setFramePickerOpen] = useState(false);
  const [scrubberTime, setScrubberTime] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [madeForKids, setMadeForKids] = useState(false);

  // Publishing Progress
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');

  // ------------------------------------------
  // Initialize Camera Stream
  // ------------------------------------------
  const startCamera = async (targetFacing: 'user' | 'environment' = facingMode) => {
    // Stop existing stream if any
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('unsupported');
      setPermissionError('Camera is not supported on this browser/device.');
      return;
    }

    try {
      setPermissionState('prompt');
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: targetFacing,
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setPermissionState('granted');
      setPermissionError('');

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(console.warn);
      }

      // Check torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) as any;
        if (capabilities && capabilities.torch) {
          setHasTorchSupport(true);
        } else {
          setHasTorchSupport(false);
        }
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setPermissionState('denied');
      setPermissionError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera/Microphone permission was denied. Please allow camera access in browser permissions or pick a video from your gallery.'
          : err.message || 'Unable to access camera.'
      );
    }
  };

  // Stop camera helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Switch Camera Front / Back
  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Toggle Torch if supported
  const toggleTorch = async () => {
    if (!cameraStream) return;
    const videoTrack = cameraStream.getVideoTracks()[0];
    if (videoTrack && hasTorchSupport) {
      try {
        const nextState = !torchOn;
        await (videoTrack as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle error:', e);
      }
    }
  };

  // Trigger camera on mount if studio is open and in 'record' phase
  useEffect(() => {
    if (isOpen && phase === 'record') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, phase]);

  // Sync background sound playback during recording
  useEffect(() => {
    if (!soundAudioRef.current) {
      soundAudioRef.current = new Audio();
    }
    const audio = soundAudioRef.current;

    if (selectedSound && isRecording) {
      audio.src = selectedSound.audioUrl;
      audio.currentTime = 0;
      audio.playbackRate = recordingSpeed;
      audio.play().catch(console.warn);
    } else {
      audio.pause();
    }

    return () => {
      audio.pause();
    };
  }, [isRecording, selectedSound, recordingSpeed]);

  // ------------------------------------------
  // Record Trigger (with optional countdown)
  // ------------------------------------------
  const handleRecordButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (countdownTimer > 0) {
        runCountdown(countdownTimer);
      } else {
        startRecording();
      }
    }
  };

  const runCountdown = (seconds: number) => {
    setActiveCountdown(seconds);
    let count = seconds;
    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setActiveCountdown(count);
      } else {
        clearInterval(timer);
        setActiveCountdown(null);
        startRecording();
      }
    }, 1000);
  };

  const startRecording = () => {
    if (!cameraStream) {
      addToast('Camera stream is not active. Please grant camera permission.', 'error');
      return;
    }

    recordedChunksRef.current = [];
    setRecordedSeconds(0);

    // Pick supported MIME type
    const mimeTypes = [
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
      'video/quicktime'
    ];
    let selectedMime = '';
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    try {
      const options: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(cameraStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = selectedMime || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        setRecordedBlob(blob);
        const file = new File([blob], `short_camera_${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`, { type: mime });
        setVideoFile(file);
        handleLoadedVideo(blob, file);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Progress Tracker Interval
      const startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordedSeconds(elapsed);

        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 100);
    } catch (e: any) {
      console.error('Failed to start MediaRecorder:', e);
      addToast('Failed to start video recording: ' + e.message, 'error');
    }
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // ------------------------------------------
  // Gallery Video Selection
  // ------------------------------------------
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      addToast('Please select a valid video file from your gallery.', 'error');
      return;
    }

    setVideoFile(file);
    setRecordedBlob(file);
    handleLoadedVideo(file, file);
  };

  // Load video into preview and extract initial thumbnail
  const handleLoadedVideo = (blob: Blob, file: File) => {
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);

    // Stop camera now that we have video
    stopCamera();

    // Create temp video element to inspect duration and capture initial thumbnail
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.muted = true;
    tempVideo.playsInline = true;

    tempVideo.onloadedmetadata = () => {
      const dur = Math.max(1, Math.round(tempVideo.duration || 15));
      setVideoDuration(dur);
      setTrimStart(0);
      setTrimEnd(dur);

      // Seek to 1s or 0.1s to capture initial frame
      tempVideo.currentTime = Math.min(1, dur * 0.2);
    };

    tempVideo.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = tempVideo.videoWidth || 720;
        canvas.height = tempVideo.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => {
            if (b) {
              setThumbnailBlob(b);
              setThumbnailPreviewUrl(URL.createObjectURL(b));
            }
          }, 'image/jpeg', 0.85);
        }
      } catch (err) {
        console.warn('Initial frame capture notice:', err);
      }
    };

    // Transition to Edit phase
    setPhase('edit');
  };

  // ------------------------------------------
  // Edit & Trim Video Playback Looper
  // ------------------------------------------
  useEffect(() => {
    const v = editVideoRef.current;
    if (!v) return;

    const handleTimeUpdate = () => {
      if (v.currentTime >= trimEnd) {
        v.currentTime = trimStart;
        v.play().catch(console.warn);
      }
      if (v.currentTime < trimStart) {
        v.currentTime = trimStart;
      }
    };

    v.addEventListener('timeupdate', handleTimeUpdate);
    return () => v.removeEventListener('timeupdate', handleTimeUpdate);
  }, [trimStart, trimEnd, phase]);

  // Adjust volume on edit video
  useEffect(() => {
    if (editVideoRef.current) {
      editVideoRef.current.volume = videoVolume / 100;
    }
  }, [videoVolume]);

  // ------------------------------------------
  // Frame Scrubber Capture (Interactive Thumbnail!)
  // ------------------------------------------
  const captureFrameAtTime = (timestamp: number) => {
    if (!previewUrl) return;
    const v = document.createElement('video');
    v.src = previewUrl;
    v.muted = true;
    v.currentTime = timestamp;
    v.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth || 720;
      canvas.height = v.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Apply active CSS filter to canvas if chosen
        const activeFilter = FILTER_PRESETS.find(f => f.id === activeFilterId);
        if (activeFilter && activeFilter.filter !== 'none') {
          ctx.filter = activeFilter.filter;
        }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => {
          if (b) {
            setThumbnailBlob(b);
            setThumbnailPreviewUrl(URL.createObjectURL(b));
          }
        }, 'image/jpeg', 0.9);
      }
    };
  };

  const handleCustomThumbFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailBlob(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
    setFramePickerOpen(false);
    addToast('Custom thumbnail selected!', 'success');
  };

  // ------------------------------------------
  // Add Text / Emoji Overlay
  // ------------------------------------------
  const handleAddOverlayText = () => {
    if (!newTextValue.trim()) return;
    const newOverlay: OverlayText = {
      id: Math.random().toString(36).substring(2, 9),
      text: newTextValue.trim(),
      color: newTextColor,
      bgColor: newTextBg,
      x: 50, // center
      y: 40 + (overlays.length * 10), // stagger
    };
    setOverlays([...overlays, newOverlay]);
    setNewTextValue('');
    setInputTextModalOpen(false);
  };

  const handleAddEmoji = (emoji: string) => {
    const newOverlay: OverlayText = {
      id: Math.random().toString(36).substring(2, 9),
      text: emoji,
      color: '#FFFFFF',
      bgColor: 'transparent',
      x: 50,
      y: 50 + (overlays.length * 8),
    };
    setOverlays([...overlays, newOverlay]);
  };

  const handleUndoOverlay = () => {
    setOverlays(prev => prev.slice(0, -1));
  };

  // ------------------------------------------
  // PUBLISH SHORT (Full Real Upload)
  // ------------------------------------------
  const handlePublishShort = async () => {
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to publish Shorts.', 'error');
      navigate('login');
      return;
    }

    if (!videoFile) {
      addToast('No video file to publish.', 'error');
      return;
    }

    const finalTitle = title.trim() || `Short by ${currentUserProfile.displayName || currentUserProfile.username} #${category}`;

    setIsPublishing(true);
    setUploadProgress(5);
    setUploadStage('Preparing your Short...');

    try {
      // 1. Upload Video
      setUploadStage('Uploading Short video...');
      const videoResult = await videoService.uploadVideo(videoFile, (pct, stage) => {
        setUploadProgress(Math.min(75, Math.round(5 + (pct * 0.7))));
        if (stage) setUploadStage(stage);
      });

      // 2. Upload Thumbnail
      setUploadStage('Generating & uploading thumbnail cover...');
      let finalThumbUrl = '';
      if (thumbnailBlob) {
        try {
          finalThumbUrl = await videoService.uploadThumbnail(thumbnailBlob, (pct) => {
            setUploadProgress(75 + Math.round((pct * 0.15)));
          });
        } catch (thumbErr) {
          console.warn('Thumbnail upload warning, using placeholder or default:', thumbErr);
        }
      }

      // 3. Publish to Firestore
      setUploadProgress(95);
      setUploadStage('Publishing Short to SocialIndia...');

      const effectiveDuration = Math.round(trimEnd - trimStart) || Math.round(videoDuration) || 15;

      const createdVideo = await videoService.publishVideo({
        title: finalTitle,
        description: description.trim(),
        videoUrl: videoResult.videoUrl,
        thumbnailUrl: finalThumbUrl || videoResult.videoUrl,
        duration: effectiveDuration,
        category: category,
        tags: [category, 'Shorts', 'Bharat', ...finalTitle.split(' ').filter(w => w.startsWith('#'))],
        visibility: visibility,
        isShort: true,
        commentsCount: 0,
        likesCount: 0,
        viewsCount: 0,
        sharesCount: 0,
        creatorId: currentUser.uid,
        creatorUsername: currentUserProfile.username,
        creatorDisplayName: currentUserProfile.displayName,
        creatorPhotoURL: currentUserProfile.photoURL || '',
        soundTitle: selectedSound ? selectedSound.title : undefined,
        soundArtist: selectedSound ? selectedSound.artist : undefined,
        soundCoverUrl: selectedSound ? selectedSound.coverUrl : undefined,
      });

      // Award creator points
      await userService.awardPoints(currentUser.uid, 20);
      await refreshProfile();

      setUploadProgress(100);
      setUploadStage('Published successfully! 🎉');
      addToast('Short published successfully! (+20 Points)', 'success');

      // Reset and navigate to shorts feed
      setTimeout(() => {
        onClose();
        navigate('shorts');
      }, 500);

    } catch (err: any) {
      console.error('Failed to publish Short:', err);
      addToast(err.message || 'Failed to upload and publish Short. Please try again.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  const activeFilter = FILTER_PRESETS.find(f => f.id === activeFilterId)?.filter || 'none';

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* PHASE 1: CAMERA & RECORDING VIEW                         */}
      {/* ======================================================== */}
      {phase === 'record' && (
        <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black">
          
          {/* Live Camera Viewfinder */}
          <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
            {permissionState === 'granted' ? (
              <video
                ref={liveVideoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: activeFilter }}
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            ) : permissionState === 'denied' ? (
              <div className="max-w-xs p-6 text-center space-y-4 z-10 bg-slate-900/90 backdrop-blur-md rounded-3xl border border-white/10 mx-4">
                <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-white">
                    {isHindi ? 'कैमरा अनुमति आवश्यक है' : 'Camera Permission Required'}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {permissionError || (isHindi 
                      ? 'शॉर्ट्स रिकॉर्ड करने के लिए कैमरा और माइक अनुमति दें, या सीधे गैलरी से वीडियो चुनें।' 
                      : 'Please allow camera and mic permissions to record live, or select a video from your gallery.')}
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer active:scale-95 transition-all shadow-md"
                  >
                    {isHindi ? 'पुनः प्रयास करें' : 'Try Again'}
                  </button>
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full py-2.5 bg-white/15 hover:bg-white/20 text-white text-xs font-black rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>{isHindi ? 'गैलरी से वीडियो चुनें' : 'Choose from Gallery'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-xs font-bold text-slate-300">
                  {isHindi ? 'कैमरा शुरू हो रहा है...' : 'Starting camera...'}
                </p>
              </div>
            )}
          </div>

          {/* Active Countdown Overlay (3.. 2.. 1..) */}
          {activeCountdown !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-xs pointer-events-none">
              <span className="text-9xl font-black text-white animate-ping drop-shadow-2xl">
                {activeCountdown}
              </span>
            </div>
          )}

          {/* TOP BAR: Duration, Sound Pill, Close */}
          <div className="relative z-20 pt-safe px-4 pt-4 flex flex-col gap-2 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
            
            {/* Top Multi-Segment Progress Bar */}
            <div className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 transition-all duration-100 ease-linear"
                style={{ width: `${Math.min(100, (recordedSeconds / maxDuration) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center cursor-pointer active:scale-90 transition-transform border border-white/10"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Music / Sound Pill */}
              <button
                onClick={() => setSoundModalOpen(true)}
                className="px-4 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer active:scale-95 transition-all border border-white/15 max-w-[200px]"
              >
                <Music className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">
                  {selectedSound ? selectedSound.title : (isHindi ? 'साउंड जोड़ें' : 'Add sound')}
                </span>
                {selectedSound && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSound(null);
                    }}
                    className="ml-1 text-white/60 hover:text-white"
                  >
                    ×
                  </span>
                )}
              </button>

              {/* Duration Toggle Pill (15s / 60s) */}
              <button
                disabled={isRecording}
                onClick={() => setMaxDuration(prev => prev === 15 ? 60 : 15)}
                className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-extrabold text-white cursor-pointer active:scale-90 transition-all border border-white/15"
              >
                {maxDuration}s
              </button>
            </div>
          </div>

          {/* RIGHT SIDEBAR TOOLS (Flip, Speed, Timer, Effects, Flash) */}
          <div className="relative z-20 self-end mr-4 mb-2 flex flex-col items-center gap-4 bg-black/40 backdrop-blur-md px-2 py-3 rounded-full border border-white/10">
            
            {/* Flip Camera */}
            <button
              disabled={isRecording}
              onClick={toggleFacingMode}
              className="flex flex-col items-center gap-0.5 cursor-pointer active:scale-90 transition-transform"
              title="Flip Camera"
            >
              <RotateCcw className="w-5 h-5 text-white" />
              <span className="text-[9px] font-bold text-white/80">{isHindi ? 'पलटें' : 'Flip'}</span>
            </button>

            {/* Speed Toggle */}
            <button
              disabled={isRecording}
              onClick={() => {
                const speeds = [0.5, 1, 2, 3];
                const nextIdx = (speeds.indexOf(recordingSpeed) + 1) % speeds.length;
                setRecordingSpeed(speeds[nextIdx]);
              }}
              className="flex flex-col items-center gap-0.5 cursor-pointer active:scale-90 transition-transform"
              title="Speed"
            >
              <Gauge className="w-5 h-5 text-white" />
              <span className="text-[9px] font-bold text-white/80">{recordingSpeed}x</span>
            </button>

            {/* Timer Toggle */}
            <button
              disabled={isRecording}
              onClick={() => {
                const timers: (0 | 3 | 10)[] = [0, 3, 10];
                const nextIdx = (timers.indexOf(countdownTimer) + 1) % timers.length;
                setCountdownTimer(timers[nextIdx]);
              }}
              className="flex flex-col items-center gap-0.5 cursor-pointer active:scale-90 transition-transform"
              title="Timer"
            >
              <Clock className={`w-5 h-5 ${countdownTimer > 0 ? 'text-amber-400' : 'text-white'}`} />
              <span className="text-[9px] font-bold text-white/80">
                {countdownTimer === 0 ? (isHindi ? 'टाइमर' : 'Timer') : `${countdownTimer}s`}
              </span>
            </button>

            {/* Filters / Effects Carousel Button */}
            <button
              onClick={() => {
                const ids = FILTER_PRESETS.map(f => f.id);
                const nextIdx = (ids.indexOf(activeFilterId) + 1) % ids.length;
                setActiveFilterId(ids[nextIdx]);
              }}
              className="flex flex-col items-center gap-0.5 cursor-pointer active:scale-90 transition-transform"
              title="Filters"
            >
              <Sparkles className={`w-5 h-5 ${activeFilterId !== 'normal' ? 'text-rose-400' : 'text-white'}`} />
              <span className="text-[9px] font-bold text-white/80">
                {FILTER_PRESETS.find(f => f.id === activeFilterId)?.name}
              </span>
            </button>

            {/* Flash / Torch */}
            {hasTorchSupport && (
              <button
                onClick={toggleTorch}
                className="flex flex-col items-center gap-0.5 cursor-pointer active:scale-90 transition-transform"
                title="Torch"
              >
                <Zap className={`w-5 h-5 ${torchOn ? 'text-amber-400 fill-amber-400' : 'text-white'}`} />
                <span className="text-[9px] font-bold text-white/80">{torchOn ? 'On' : 'Flash'}</span>
              </button>
            )}

          </div>

          {/* BOTTOM CONTROLS (Gallery, Record Button, Checkmark) */}
          <div className="relative z-20 pb-safe px-6 pb-6 pt-3 flex items-center justify-between bg-gradient-to-t from-black/85 via-black/40 to-transparent">
            
            {/* Gallery Upload Input & Button */}
            <input 
              type="file" 
              ref={galleryInputRef} 
              onChange={handleGallerySelect} 
              accept="video/*" 
              className="hidden" 
            />
            <button
              disabled={isRecording}
              onClick={() => galleryInputRef.current?.click()}
              className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all text-white"
              title="Choose from Gallery"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase mt-0.5">{isHindi ? 'गैलरी' : 'Gallery'}</span>
            </button>

            {/* BIG RED SHORTS RECORD BUTTON */}
            <div className="relative flex items-center justify-center">
              <button
                onClick={handleRecordButtonClick}
                className={`relative rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 select-none ${
                  isRecording 
                    ? 'w-20 h-20 bg-rose-600/30 ring-4 ring-rose-500 scale-105' 
                    : 'w-20 h-20 bg-white/20 ring-4 ring-white/60 active:scale-95'
                }`}
                aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                <div className={`transition-all duration-200 ${
                  isRecording 
                    ? 'w-7 h-7 bg-red-600 rounded-md animate-pulse' 
                    : 'w-14 h-14 bg-red-600 rounded-full shadow-lg shadow-red-600/50'
                }`} />
              </button>
            </div>

            {/* Checkmark button (if a clip is recorded) */}
            <div className="w-12 h-12 flex items-center justify-center">
              {recordedBlob ? (
                <button
                  onClick={() => setPhase('edit')}
                  className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 cursor-pointer active:scale-90 transition-all"
                  title="Next to Edit"
                >
                  <Check className="w-6 h-6 stroke-[3]" />
                </button>
              ) : (
                <div className="w-12 h-12" />
              )}
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* PHASE 2: EDITING, TRIMMING & OVERLAYS VIEW               */}
      {/* ======================================================== */}
      {phase === 'edit' && (
        <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black">
          
          {/* Main Video Preview with Filter & Overlays */}
          <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
            <video
              ref={editVideoRef}
              src={previewUrl}
              autoPlay
              loop
              playsInline
              style={{ filter: activeFilter }}
              onClick={() => {
                if (editVideoRef.current) {
                  if (editVideoRef.current.paused) {
                    editVideoRef.current.play();
                    setIsVideoPlaying(true);
                  } else {
                    editVideoRef.current.pause();
                    setIsVideoPlaying(false);
                  }
                }
              }}
              className="w-full h-full object-cover cursor-pointer"
            />

            {/* Play/Pause indicator overlay on tap */}
            {!isVideoPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md">
                  <Play className="w-8 h-8 ml-1" />
                </div>
              </div>
            )}

            {/* Draggable / Positioned Text & Emoji Overlays */}
            {overlays.map((ov) => (
              <div
                key={ov.id}
                style={{
                  top: `${ov.y}%`,
                  left: `${ov.x}%`,
                  transform: 'translate(-50%, -50%)',
                  color: ov.color,
                  backgroundColor: ov.bgColor,
                }}
                className="absolute px-3 py-1.5 rounded-xl font-black text-lg drop-shadow-md z-10 pointer-events-none text-center select-none max-w-[80%]"
              >
                {ov.text}
              </div>
            ))}
          </div>

          {/* TOP BAR: Back, Undo, Next */}
          <div className="relative z-20 pt-safe px-4 pt-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
            <button
              onClick={() => {
                // Return to camera
                setPhase('record');
                startCamera(facingMode);
              }}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center cursor-pointer active:scale-90 transition-transform border border-white/15"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Action title or Undo */}
            <div className="flex items-center gap-2">
              {overlays.length > 0 && (
                <button
                  onClick={handleUndoOverlay}
                  className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border border-white/10 cursor-pointer active:scale-95"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'हटाएं' : 'Undo'}</span>
                </button>
              )}
            </div>

            {/* NEXT BUTTON */}
            <button
              onClick={() => setPhase('details')}
              className="px-5 py-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/30 cursor-pointer active:scale-95 transition-all"
            >
              <span>{isHindi ? 'आगे बढ़ें' : 'Next'}</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* EDIT TOOLS SUBPANEL (When a tool tab is active) */}
          <div className="relative z-20 px-4">
            
            {/* 1. TRIM SUBPANEL */}
            {editTab === 'trim' && (
              <div className="p-4 bg-black/80 backdrop-blur-md rounded-2xl border border-white/15 space-y-3 animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{isHindi ? 'शॉर्ट ट्रिम करें' : 'Trim Video'}</span>
                  <span className="text-blue-400">{trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s ({(trimEnd - trimStart).toFixed(1)}s)</span>
                </div>
                
                {/* Visual Trim Sliders */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 w-12">{isHindi ? 'शुरुआत' : 'Start'}</span>
                    <input 
                      type="range"
                      min={0}
                      max={Math.max(0, trimEnd - 1)}
                      step={0.1}
                      value={trimStart}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimStart(val);
                        if (editVideoRef.current) editVideoRef.current.currentTime = val;
                      }}
                      className="flex-1 accent-blue-500"
                    />
                    <span className="text-xs font-mono">{trimStart.toFixed(1)}s</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 w-12">{isHindi ? 'अंत' : 'End'}</span>
                    <input 
                      type="range"
                      min={trimStart + 1}
                      max={videoDuration}
                      step={0.1}
                      value={trimEnd}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimEnd(val);
                        if (editVideoRef.current) editVideoRef.current.currentTime = val;
                      }}
                      className="flex-1 accent-rose-500"
                    />
                    <span className="text-xs font-mono">{trimEnd.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SOUND MIX SUBPANEL */}
            {editTab === 'sound' && (
              <div className="p-4 bg-black/80 backdrop-blur-md rounded-2xl border border-white/15 space-y-3 animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{isHindi ? 'ऑडियो वॉल्यूम' : 'Audio Mix'}</span>
                  <button 
                    onClick={() => setSoundModalOpen(true)}
                    className="text-xs text-rose-400 hover:underline cursor-pointer"
                  >
                    {selectedSound ? (isHindi ? 'गाना बदलें' : 'Change music') : (isHindi ? 'संगीत जोड़ें' : 'Add music')}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 w-24 truncate">{isHindi ? 'मूल आवाज़' : 'Original Audio'}</span>
                    <input 
                      type="range"
                      min={0}
                      max={100}
                      value={videoVolume}
                      onChange={(e) => setVideoVolume(parseInt(e.target.value))}
                      className="flex-1 accent-blue-500"
                    />
                    <span className="text-xs font-mono">{videoVolume}%</span>
                  </div>

                  {selectedSound && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 w-24 truncate">{selectedSound.title}</span>
                      <input 
                        type="range"
                        min={0}
                        max={100}
                        value={soundVolume}
                        onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                        className="flex-1 accent-rose-500"
                      />
                      <span className="text-xs font-mono">{soundVolume}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. FILTERS SUBPANEL */}
            {editTab === 'filter' && (
              <div className="p-3 bg-black/80 backdrop-blur-md rounded-2xl border border-white/15 overflow-x-auto scrollbar-none animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center gap-2.5 min-w-max">
                  {FILTER_PRESETS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilterId(f.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        activeFilterId === f.id
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                          : 'bg-white/10 hover:bg-white/20 text-white/80'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* BOTTOM EDIT TOOLBAR BUTTONS */}
          <div className="relative z-20 pb-safe px-4 pb-4 pt-2 flex items-center justify-around bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            
            {/* Trim Button */}
            <button
              onClick={() => setEditTab(prev => prev === 'trim' ? 'none' : 'trim')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                editTab === 'trim' ? 'text-blue-400 font-bold' : 'text-white/80 hover:text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <span className="text-[10px]">{isHindi ? 'ट्रिम' : 'Trim'}</span>
            </button>

            {/* Sound Button */}
            <button
              onClick={() => setEditTab(prev => prev === 'sound' ? 'none' : 'sound')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                editTab === 'sound' ? 'text-rose-400 font-bold' : 'text-white/80 hover:text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Music className="w-5 h-5" />
              </div>
              <span className="text-[10px]">{isHindi ? 'साउंड' : 'Sound'}</span>
            </button>

            {/* Text Overlay Button */}
            <button
              onClick={() => setInputTextModalOpen(true)}
              className="flex flex-col items-center gap-1 cursor-pointer text-white/80 hover:text-white transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Type className="w-5 h-5" />
              </div>
              <span className="text-[10px]">{isHindi ? 'टेक्स्ट' : 'Text'}</span>
            </button>

            {/* Emoji Button */}
            <button
              onClick={() => setEditTab(prev => prev === 'filter' ? 'none' : 'filter')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                editTab === 'filter' ? 'text-amber-400 font-bold' : 'text-white/80 hover:text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px]">{isHindi ? 'फ़िल्टर' : 'Filters'}</span>
            </button>

          </div>

          {/* Quick Emoji Bar in Edit Screen */}
          <div className="relative z-20 px-4 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              <span className="text-[10px] text-slate-400 shrink-0 font-bold">Quick:</span>
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddEmoji(emoji)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-base flex items-center justify-center cursor-pointer active:scale-90 transition-transform shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* PHASE 3: DETAILS & THUMBNAIL PUBLISH SCREEN              */}
      {/* ======================================================== */}
      {phase === 'details' && (
        <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-slate-950 text-white">
          
          {/* Header */}
          <div className="sticky top-0 z-20 pt-safe px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                disabled={isPublishing}
                onClick={() => setPhase('edit')}
                className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-base font-black text-white">
                {isHindi ? 'विवरण जोड़ें' : 'Add details'}
              </h3>
            </div>

            {/* Sound attribution indicator */}
            {selectedSound && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800 text-purple-300 text-[11px] font-bold max-w-[150px] truncate">
                <Music className="w-3 h-3 shrink-0" />
                <span className="truncate">{selectedSound.title}</span>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="p-4 space-y-5 max-w-lg mx-auto w-full pb-32">
            
            {/* THUMBNAIL / COVER SELECTOR (YouTube Shorts Style with Frame Scrubber) */}
            <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span>{isHindi ? 'शॉर्ट थंबनेल / कवर' : 'Short Thumbnail / Cover'}</span>
                </label>
                <span className="text-[10px] text-blue-400 font-bold">
                  {isHindi ? 'फ़्रेम चुनें' : 'Frame selectable'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Thumbnail Preview Card */}
                <div className="relative w-24 h-36 rounded-2xl overflow-hidden bg-slate-800 border-2 border-blue-500/50 shadow-md shrink-0 group">
                  {thumbnailPreviewUrl ? (
                    <img 
                      src={thumbnailPreviewUrl} 
                      alt="Thumbnail Preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                      <ImageIcon className="w-6 h-6 mb-1" />
                      <span className="text-[9px]">No Frame</span>
                    </div>
                  )}

                  {/* Pencil edit overlay */}
                  <button
                    disabled={isPublishing}
                    onClick={() => setFramePickerOpen(true)}
                    className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white cursor-pointer transition-colors"
                    title="Change Frame"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  </button>
                </div>

                {/* Explanatory text & frame scrubber button */}
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-xs text-slate-300 leading-snug">
                    {isHindi 
                      ? 'वीडियो का कोई भी पसंदीदा फ़्रेम चुनें या अपनी गैलरी से कस्टम फ़ोटो लगाएं।' 
                      : 'Pick any frame from your video or upload a custom image from gallery.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={() => setFramePickerOpen(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{isHindi ? 'फ़्रेम चुनें' : 'Scrub Frame'}</span>
                    </button>

                    <input 
                      type="file" 
                      ref={customThumbInputRef} 
                      onChange={handleCustomThumbFile} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={() => customThumbInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isHindi ? 'अपलोड करें' : 'Upload'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* TITLE & CAPTION INPUT */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>{isHindi ? 'कैप्शन / शीर्षक *' : 'Caption / Title *'}</span>
                <span className="text-[10px] text-slate-500">{title.length}/100</span>
              </label>

              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                disabled={isPublishing}
                placeholder={isHindi ? 'अपने शॉर्ट का शीर्षक लिखें... #Shorts' : 'Caption your short... #Shorts'}
                rows={2}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
              />

              {/* Quick Hashtags Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                {QUICK_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={isPublishing}
                    onClick={() => {
                      if (!title.includes(tag)) {
                        setTitle(prev => prev ? `${prev} ${tag}` : tag);
                      }
                    }}
                    className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-blue-600/30 border border-slate-800 hover:border-blue-500 text-blue-400 text-xs font-bold whitespace-nowrap cursor-pointer active:scale-95 transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* DESCRIPTION INPUT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isHindi ? 'विवरण (वैकल्पिक)' : 'Description (Optional)'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPublishing}
                placeholder={isHindi ? 'वीडियो के बारे में कुछ और बताएं...' : 'Tell viewers about your Short...'}
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* CATEGORY SELECTOR */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isHindi ? 'श्रेणी' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isPublishing}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none cursor-pointer"
              >
                {categoriesList.filter(c => c !== 'All').map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* VISIBILITY (Public, Unlisted, Private) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                {isHindi ? 'दृश्यता (विजिबिलिटी)' : 'Visibility'}
              </label>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'public', label: isHindi ? 'पब्लिक' : 'Public', icon: Globe },
                  { id: 'unlisted', label: isHindi ? 'अनलिस्टेड' : 'Unlisted', icon: EyeOff },
                  { id: 'private', label: isHindi ? 'प्राइवेट' : 'Private', icon: Lock },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={isPublishing}
                    onClick={() => setVisibility(id as any)}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                      visibility === id
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* COMMENTS & AUDIENCE SETTINGS */}
            <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">
                    {isHindi ? 'कमेंट्स की अनुमति दें' : 'Allow Comments'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {isHindi ? 'दर्शक आपके शॉर्ट पर टिप्पणी कर सकेंगे' : 'Viewers can leave comments on your Short'}
                  </p>
                </div>
                <input 
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  disabled={isPublishing}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <p className="text-xs font-bold text-white">
                    {isHindi ? 'बच्चों के लिए उपयुक्त (Made for Kids)' : 'Made for Kids'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {isHindi ? 'आयु-प्रतिबंधित सामग्री नहीं है' : 'Content is suitable for all ages'}
                  </p>
                </div>
                <input 
                  type="checkbox"
                  checked={madeForKids}
                  onChange={(e) => setMadeForKids(e.target.checked)}
                  disabled={isPublishing}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* PUBLISH BOTTOM ACTION BAR */}
          <div className="fixed bottom-0 left-0 right-0 z-30 pb-safe px-4 py-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800">
            {isPublishing ? (
              <div className="space-y-2 max-w-lg mx-auto">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-400 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {uploadStage || (isHindi ? 'अपलोड हो रहा है...' : 'Uploading...')}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-lg mx-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPhase('edit')}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl cursor-pointer active:scale-95 transition-all"
                >
                  {isHindi ? 'पीछे' : 'Back'}
                </button>

                <button
                  type="button"
                  onClick={handlePublishShort}
                  className="flex-1 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>{isHindi ? 'शॉर्ट अपलोड करें' : 'Publish Short'}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INTERACTIVE THUMBNAIL FRAME SCRUBBER              */}
      {/* ======================================================== */}
      {framePickerOpen && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col justify-between p-4 font-sans animate-in fade-in duration-200">
          <div className="flex items-center justify-between pt-safe pb-2">
            <h4 className="text-sm font-black text-white">
              {isHindi ? 'थंबनेल फ़्रेम चुनें' : 'Choose Thumbnail Frame'}
            </h4>
            <button
              onClick={() => setFramePickerOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Scrubbed Frame Preview */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <div className="relative aspect-[9/16] max-h-[60vh] rounded-3xl overflow-hidden border-2 border-blue-500 shadow-2xl bg-black">
              {thumbnailPreviewUrl && (
                <img 
                  src={thumbnailPreviewUrl} 
                  alt="Scrubbed frame" 
                  className="w-full h-full object-cover" 
                />
              )}
            </div>
          </div>

          {/* Scrubber Range Slider */}
          <div className="space-y-4 pb-safe bg-slate-900/90 p-4 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>{isHindi ? 'समय स्लाइडर' : 'Time Scrubber'}</span>
              <span className="text-blue-400 font-mono">{scrubberTime.toFixed(1)}s / {videoDuration.toFixed(1)}s</span>
            </div>

            <input 
              type="range"
              min={0}
              max={videoDuration}
              step={0.1}
              value={scrubberTime}
              onChange={(e) => {
                const time = parseFloat(e.target.value);
                setScrubberTime(time);
                captureFrameAtTime(time);
              }}
              className="w-full accent-blue-500 cursor-pointer h-2"
            />

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setFramePickerOpen(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl cursor-pointer active:scale-95 transition-all shadow-md"
              >
                {isHindi ? 'यह फ़्रेम सेट करें' : 'Set as Thumbnail'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD TEXT OVERLAY MODAL                            */}
      {/* ======================================================== */}
      {inputTextModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white">
                {isHindi ? 'टेक्स्ट जोड़ें' : 'Add Text Overlay'}
              </h4>
              <button 
                onClick={() => setInputTextModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input 
              type="text"
              autoFocus
              value={newTextValue}
              onChange={(e) => setNewTextValue(e.target.value)}
              placeholder={isHindi ? 'यहाँ टेक्स्ट टाइप करें...' : 'Type text here...'}
              className="w-full px-4 py-3 bg-slate-800 rounded-2xl text-white text-base font-bold focus:outline-none border border-slate-700 focus:border-blue-500"
            />

            {/* Color Palette */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{isHindi ? 'रंग' : 'Color'}</span>
              <div className="flex items-center gap-2">
                {['#FFFFFF', '#FFDD00', '#FF3B30', '#007AFF', '#34C759', '#000000'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewTextColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                      newTextColor === c ? 'scale-115 border-white ring-2 ring-blue-500' : 'border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Background Style */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{isHindi ? 'बैकग्राउंड' : 'Background'}</span>
              <div className="flex items-center gap-2">
                {[
                  { label: 'None', val: 'transparent' },
                  { label: 'Dark', val: 'rgba(0,0,0,0.7)' },
                  { label: 'Bright', val: 'rgba(255,255,255,0.85)' },
                ].map(({ label, val }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setNewTextBg(val)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      newTextBg === val ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddOverlayText}
              disabled={!newTextValue.trim()}
              className="w-full py-2.5 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer active:scale-95 transition-all shadow-md"
            >
              {isHindi ? 'जोड़ें' : 'Add to Video'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MUSIC & SOUND TRACK SELECTOR                      */}
      {/* ======================================================== */}
      {soundModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex flex-col justify-end">
          <div className="w-full max-w-lg mx-auto bg-slate-900 rounded-t-3xl border-t border-slate-800 p-5 pb-8 space-y-4 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-rose-500" />
                <h4 className="text-sm font-black text-white">
                  {isHindi ? 'साउंड ट्रैक चुनें' : 'Choose Sound'}
                </h4>
              </div>
              <button 
                onClick={() => setSoundModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Sounds */}
            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {DEFAULT_SOUNDS.map((sound) => {
                const isSelected = selectedSound?.soundId === sound.soundId;
                const isPlaying = playingPreviewSoundId === sound.soundId;

                return (
                  <div
                    key={sound.soundId}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'bg-rose-500/20 border-rose-500' 
                        : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 group">
                        <img src={sound.coverUrl} alt="" className="w-full h-full object-cover" />
                        
                        {/* Play/Stop Preview Button */}
                        <button
                          onClick={() => {
                            if (isPlaying) {
                              soundAudioRef.current?.pause();
                              setPlayingPreviewSoundId(null);
                            } else {
                              if (!soundAudioRef.current) soundAudioRef.current = new Audio();
                              soundAudioRef.current.src = sound.audioUrl;
                              soundAudioRef.current.play().catch(console.warn);
                              setPlayingPreviewSoundId(sound.soundId);
                            }
                          }}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center text-white cursor-pointer"
                        >
                          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                        </button>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{sound.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{sound.artist} · {sound.duration}s</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedSound(sound);
                        soundAudioRef.current?.pause();
                        setPlayingPreviewSoundId(null);
                        setSoundModalOpen(false);
                        addToast(`Selected: ${sound.title}`, 'success');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer active:scale-95 transition-all ${
                        isSelected 
                          ? 'bg-rose-500 text-white' 
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {isSelected ? (isHindi ? 'चुना गया' : 'Selected') : (isHindi ? 'चुनें' : 'Use')}
                    </button>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
