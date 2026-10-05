import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { userService } from '../services/userService';
import { SoundTrack } from '../types';
import { formatDuration, captureFrameFromVideoFile } from '../utils/videoUtils';
import { categoriesList } from './Home';
import { soundService } from '../services/soundService';
import { SoundLibraryModal } from '../components/SoundLibraryModal';
import { 
  Upload, 
  FileText, 
  Sliders, 
  Globe, 
  Film, 
  Zap, 
  Check, 
  Edit3, 
  ArrowRight, 
  ChevronRight, 
  Image as ImageIcon, 
  CheckCircle2, 
  Music, 
  DollarSign, 
  MessageSquare, 
  EyeOff, 
  Lock, 
  Loader2, 
  X,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

export const UploadPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast, refreshProfile } = useApp();
  const { route, navigate } = useRouter();

  // Multi-step Wizard Step (1: Upload, 2: Details, 3: Video Elements, 4: Visibility)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [uploadMode, setUploadMode] = useState<'video' | 'short'>('video');

  // Form Fields
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('All');
  const [tagsInput, setTagsInput] = useState('');
  const [duration, setDuration] = useState(120);
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isShort, setIsShort] = useState(false);
  const [selectedSoundTrack, setSelectedSoundTrack] = useState<SoundTrack | null>(null);
  const [soundModalOpen, setSoundModalOpen] = useState(false);
  const [isMonetized, setIsMonetized] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number>(10);
  const [commentsMode, setCommentsMode] = useState<'allow' | 'hold' | 'disabled'>('allow');

  // File Upload & Preview States
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedThumbFile, setSelectedThumbFile] = useState<File | null>(null);
  const [capturedThumbBlob, setCapturedThumbBlob] = useState<Blob | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [isAutoCapturedThumb, setIsAutoCapturedThumb] = useState(false);
  
  // Publishing Progress State
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStageText, setUploadStageText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect mode from query params
  useEffect(() => {
    if (route.searchParams?.mode === 'short' || route.searchParams?.type === 'short') {
      setUploadMode('short');
      setIsShort(true);
    }
    if (route.searchParams?.soundId) {
      soundService.getSoundWithVideos(route.searchParams.soundId).then(res => {
        if (res.sound) {
          setSelectedSoundTrack(res.sound);
          setUploadMode('short');
          setIsShort(true);
        }
      }).catch(console.warn);
    }
  }, [route.searchParams]);

  // Prevent accidental page reload or closing while upload is actively running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPublishing) {
        e.preventDefault();
        e.returnValue = 'Video upload is currently in progress. Leaving this page will cancel the upload.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPublishing]);

  // Handle Video Selection from Gallery/Device
  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      addToast('Please select a valid video file (MP4, WebM, MOV, etc.).', 'error');
      return;
    }

    setSelectedVideoFile(file);
    setVideoFileName(file.name);

    // Auto-fill title from filename if empty
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const localBlobUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(localBlobUrl);

    // Extract duration & auto-detect Shorts
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = localBlobUrl;
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration && !isNaN(tempVideo.duration)) {
        setDuration(Math.round(tempVideo.duration));
        if (tempVideo.videoHeight > tempVideo.videoWidth || uploadMode === 'short') {
          setIsShort(true);
          setUploadMode('short');
        }
      }
    };

    // Auto-capture real frame from video for thumbnail preview locally
    if (!selectedThumbFile && !thumbnailUrl) {
      captureFrameFromVideoFile(file, 1.5).then((captured) => {
        if (captured) {
          setThumbnailPreviewUrl(captured.dataUrl);
          setCapturedThumbBlob(captured.blob);
          setIsAutoCapturedThumb(true);
        }
      }).catch(console.error);
    }

    // Auto advance to Details step
    setCurrentStep(2);
  };

  // Handle Custom Thumbnail Selection from Gallery/Device
  const handleThumbnailFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file (JPG, PNG, WebP) for thumbnail.', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      addToast('Thumbnail image size should be under 15MB.', 'error');
      return;
    }

    setSelectedThumbFile(file);
    const localImgUrl = URL.createObjectURL(file);
    setThumbnailPreviewUrl(localImgUrl);
    setIsAutoCapturedThumb(false);
  };

  // Publish Handler with Direct High-Speed Streaming
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to publish video.', 'error');
      return;
    }

    if (!title.trim() || title.length < 3 || title.length > 100) {
      addToast('Title must be between 3 and 100 characters.', 'error');
      setCurrentStep(2);
      return;
    }

    if (!videoUrl && !selectedVideoFile) {
      addToast('Please select a video file from your device first.', 'error');
      setCurrentStep(1);
      return;
    }

    setIsPublishing(true);
    setUploadProgress(0);
    setUploadStageText('Preparing video streaming...');

    try {
      let finalVideoUrl = videoUrl;
      let finalDuration = duration;
      let finalThumbnailUrl = thumbnailUrl;

      // 1. Upload Video File directly via high-speed chunked stream
      if (selectedVideoFile) {
        setUploadStageText('Uploading video... 0%');
        const uploadRes = await videoService.uploadVideo(selectedVideoFile, (progress, stage) => {
          setUploadProgress(progress);
          if (stage) {
            setUploadStageText(stage);
          } else if (progress >= 100) {
            setUploadStageText('Finalizing video processing on CDN...');
          } else {
            setUploadStageText(`Uploading video... ${progress}%`);
          }
        });
        finalVideoUrl = uploadRes.videoUrl;
        if (uploadRes.duration) {
          finalDuration = uploadRes.duration;
        }
      }

      // 2. Upload Thumbnail if picked
      if (selectedThumbFile) {
        setUploadStageText('Uploading thumbnail...');
        const thumbUrl = await videoService.uploadThumbnail(selectedThumbFile);
        finalThumbnailUrl = thumbUrl;
      } else if (capturedThumbBlob && !finalThumbnailUrl) {
        setUploadStageText('Processing thumbnail...');
        try {
          const autoThumbUrl = await videoService.uploadThumbnail(capturedThumbBlob);
          finalThumbnailUrl = autoThumbUrl;
        } catch (_) {
          if (finalVideoUrl) {
            finalThumbnailUrl = finalVideoUrl;
          }
        }
      }

      if (!finalThumbnailUrl && finalVideoUrl) {
        finalThumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
      }

      const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0, 8);

      setUploadStageText('Publishing to SocialIndia Feed...');
      setUploadProgress(100);

      await videoService.publishVideo({
        title: title.trim(),
        description: description.trim(),
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        category,
        tags,
        duration: finalDuration,
        visibility,
        isShort,
        soundId: selectedSoundTrack?.soundId,
        soundTitle: selectedSoundTrack?.title,
        soundArtist: selectedSoundTrack?.artist,
        soundCoverUrl: selectedSoundTrack?.coverUrl,
        soundAudioUrl: selectedSoundTrack?.audioUrl,
        isMonetized,
        isPaid: isPaid && (currentUserProfile?.isMonetized || currentUserProfile?.role === 'admin'),
        price: isPaid ? Number(price || 0) : 0,
        paidSalesCount: 0,
        paidEarnings: 0,
        creatorId: currentUser.uid,
        creatorUsername: currentUserProfile.username,
        creatorDisplayName: currentUserProfile.displayName,
        creatorPhotoURL: currentUserProfile.photoURL || '',
      });

      addToast('Video published successfully on SocialIndia! (+20 Points)', 'success');
      await userService.awardPoints(currentUser.uid, 20);
      await refreshProfile();
      navigate(isShort ? 'shorts' : 'home');
    } catch (err: any) {
      console.error('Publish error:', err);
      if (err.message === 'CLOUDINARY_CONFIG_REQUIRED' || err.message?.includes('CLOUDINARY_CONFIG_REQUIRED')) {
        addToast('Cloud Storage is not configured yet. Please contact Admin in Admin Panel.', 'error');
      } else {
        addToast(err.message || 'Failed to upload and publish video.', 'error');
      }
    } finally {
      setIsPublishing(false);
      setUploadProgress(0);
      setUploadStageText('');
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-md">
          <Upload className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sign in to Upload Videos</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-sm mx-auto">
          Share your videos, reels and shorts with millions of viewers across SocialIndia.
        </p>
        <button
          onClick={() => navigate('home')}
          className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-full shadow-md transition-all cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Page Header Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('home')}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 active:scale-95"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Upload Video</span>
              {uploadMode === 'short' && (
                <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 text-[10px] font-black rounded-lg uppercase tracking-wider">
                  ⚡ Shorts
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              Direct high-speed streaming CDN to your channel feed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('studio')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition-all cursor-pointer"
          >
            Go to Studio
          </button>
        </div>
      </div>

      {/* 1. PlayTube / YouTube Studio Style Connected Stepper Progress Bar Card */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-md">
        <div className="flex items-center justify-between max-w-3xl mx-auto relative px-2">
          
          {/* Background Connecting Track Line */}
          <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
          <div 
            className="absolute top-1/2 left-8 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 z-0"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />

          {[
            { step: 1, label: 'Upload', icon: Upload },
            { step: 2, label: 'Details', icon: FileText },
            { step: 3, label: 'Elements', icon: Sliders },
            { step: 4, label: 'Visibility', icon: Globe }
          ].map((s) => {
            const isCompleted = currentStep > s.step;
            const isActive = currentStep === s.step;
            const canClick = !isPublishing && (s.step < currentStep || (s.step === 2 && (selectedVideoFile || videoUrl)));

            return (
              <button
                key={s.step}
                type="button"
                disabled={!canClick && !isActive}
                onClick={() => {
                  if (s.step === 2 && !selectedVideoFile && !videoUrl) {
                    addToast('Please select a video file first.', 'info');
                    return;
                  }
                  if (s.step > 2 && !title.trim()) {
                    addToast('Please enter a video title first.', 'info');
                    setCurrentStep(2);
                    return;
                  }
                  setCurrentStep(s.step as any);
                }}
                className={`relative z-10 flex flex-col items-center gap-2 transition-all group ${
                  canClick || isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-xs sm:text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white ring-4 ring-blue-600/20 shadow-lg shadow-blue-600/30 scale-105'
                    : isCompleted
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                  ) : (
                    <span>{s.step}</span>
                  )}
                </div>
                <span className={`text-[9px] sm:text-xs font-black uppercase tracking-wider transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : isCompleted 
                    ? 'text-slate-800 dark:text-slate-200' 
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Step Content Container (Card Format) */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-7 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl">
        <form onSubmit={handlePublish} className="space-y-6">

          {/* STEP 1: UPLOAD & SELECT MEDIA */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Mode Switcher Tabs */}
              <div className="flex items-center justify-center">
                <div className="flex sm:inline-flex flex-col sm:flex-row w-full sm:w-auto p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700 gap-1.5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode('video');
                      setIsShort(false);
                    }}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer w-full sm:w-auto ${
                      uploadMode === 'video'
                        ? 'bg-white dark:bg-[#1E293B] text-blue-600 dark:text-blue-400 shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-blue-400'
                    }`}
                  >
                    <Film className="w-4 h-4" />
                    <span>🎥 Standard Video (16:9)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode('short');
                      setIsShort(true);
                    }}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer w-full sm:w-auto ${
                      uploadMode === 'short'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-blue-400'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>⚡ SocialIndia Shorts (9:16)</span>
                  </button>
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleVideoFileSelect} 
                accept="video/*" 
                disabled={isPublishing}
                className="hidden" 
              />

              {/* Big Drag & Drop / Device File Picker Box (Matches PlayTube Layout) */}
              {videoPreviewUrl ? (
                <div className="space-y-5">
                  <div className="relative rounded-3xl overflow-hidden border-2 border-blue-500/40 bg-black max-w-2xl mx-auto shadow-2xl flex items-center justify-center group" style={{ aspectRatio: isShort ? '9/16' : '16/9', maxHeight: isShort ? '400px' : '340px' }}>
                    <video 
                      src={videoPreviewUrl} 
                      className="w-full h-full object-contain" 
                      controls
                      muted
                      playsInline
                    />

                    {!isPublishing && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute top-3 right-3 px-4 py-2 bg-black/80 hover:bg-black text-white text-xs font-black rounded-xl backdrop-blur-md transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Change Video</span>
                      </button>
                    )}
                  </div>

                  {/* Video Meta Info Card */}
                  <div className="max-w-2xl mx-auto p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {videoFileName || 'Selected Video'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-bold">
                        <span>Duration: {formatDuration(duration)}</span>
                        <span>•</span>
                        <span>{isShort ? '⚡ Shorts (9:16)' : '🎥 Standard Video (16:9)'}</span>
                        {selectedVideoFile && (
                          <>
                            <span>•</span>
                            <span>{(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-full cursor-pointer shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-wider"
                    >
                      <span>Continue to Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !isPublishing && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-400/80 dark:border-blue-800 hover:border-blue-600 dark:hover:border-blue-500 rounded-3xl p-10 sm:p-16 flex flex-col items-center justify-center text-center gap-5 bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 transition-all cursor-pointer group min-h-[320px]"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 group-hover:scale-110 transition-transform">
                    {uploadMode === 'short' ? <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300" /> : <Upload className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />}
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Drag and drop video files to upload
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold">
                      Your Videos Will Be Private Until You Publish Them.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="mt-2 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black rounded-full shadow-lg shadow-blue-600/30 transition-all active:scale-95 uppercase tracking-wider"
                  >
                    Select Media from Device
                  </button>

                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                    MP4 • WebM • MOV • High-Speed Direct Cloud CDN
                  </p>
                </div>
              )}

            </div>
          )}

          {/* STEP 2: DETAILS (Title, Description, Category, Tags, Thumbnail) */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
              
              {/* Left Column: Video Metadata Form */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Video Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-black">
                      Video Title *
                    </label>
                    <span className={`text-[11px] font-mono font-bold ${title.length > 90 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {title.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder={uploadMode === 'short' ? 'Add catchy short title... #shorts' : 'Enter an engaging video title...'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3.5 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-extrabold text-sm shadow-2xs"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-black">
                      Description
                    </label>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      {description.length}/5000
                    </span>
                  </div>
                  <textarea
                    placeholder="Tell viewers what your video is about, add links, credits and timestamps..."
                    rows={5}
                    maxLength={5000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3.5 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium text-xs leading-relaxed shadow-2xs"
                  />
                </div>

                {/* Category & Tags Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider text-[11px] font-black">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-extrabold text-xs appearance-none cursor-pointer shadow-2xs"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider text-[11px] font-black">
                      Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. gaming, tech, india, vlog"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-bold text-xs shadow-2xs"
                    />
                  </div>
                </div>

              </div>

              {/* Right Column: Thumbnail & Preview */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Thumbnail Picker */}
                <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-black flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Thumbnail</span>
                    </label>
                    {(thumbnailPreviewUrl || thumbnailUrl) && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isAutoCapturedThumb ? 'Auto Scene' : 'Custom Image'}
                      </span>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={thumbnailInputRef} 
                    onChange={handleThumbnailFileSelect} 
                    accept="image/*" 
                    disabled={isPublishing}
                    className="hidden" 
                  />

                  {thumbnailPreviewUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-slate-900 aspect-video flex items-center justify-center group shadow-md">
                      <img 
                        src={thumbnailPreviewUrl} 
                        alt="Thumbnail Preview" 
                        className="w-full h-full object-cover" 
                      />

                      {isAutoCapturedThumb && (
                        <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-white text-[9px] font-black uppercase tracking-wider border border-white/10 shadow-xs flex items-center gap-1">
                          <Film className="w-3 h-3 text-white" />
                          <span>Auto Frame</span>
                        </div>
                      )}

                      {!isPublishing && (
                        <button
                          type="button"
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="absolute top-2 right-2 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-[10px] font-black rounded-lg backdrop-blur-md transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isAutoCapturedThumb ? 'Upload Custom' : 'Change Image'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => !isPublishing && thumbnailInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 bg-white dark:bg-slate-900/80 hover:bg-blue-50/30 transition-all cursor-pointer group min-h-[140px]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">Upload Custom Thumbnail</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          JPG, PNG or WebP
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Info Summary */}
                <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-200">
                    <span>Streaming Status:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Ready</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-bold space-y-1.5">
                    <p className="truncate">File: <span className="text-slate-700 dark:text-slate-300">{videoFileName || 'Selected Video'}</span></p>
                    <p>Duration: <span className="text-slate-700 dark:text-slate-300">{formatDuration(duration)}</span></p>
                    <p>Format: <span className="text-slate-700 dark:text-slate-300">{isShort ? '⚡ Short (9:16)' : '🎥 Standard Video (16:9)'}</span></p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* STEP 3: VIDEO ELEMENTS (Music, Monetization, Comments, Shorts) */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-2xl mx-auto animate-in fade-in">
              
              {/* 1. Background Music / Audio Track */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Music className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Background Music & Sound</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Attach audio or royalty-free background track from library</p>
                    </div>
                  </div>

                  {selectedSoundTrack && (
                    <button
                      type="button"
                      onClick={() => setSelectedSoundTrack(null)}
                      className="text-rose-500 hover:text-rose-600 text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div 
                  onClick={() => setSoundModalOpen(true)}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 rounded-2xl cursor-pointer transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedSoundTrack ? (
                      <img src={selectedSoundTrack.coverUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Music className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {selectedSoundTrack ? selectedSoundTrack.title : 'No background track selected'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate mt-0.5">
                        {selectedSoundTrack ? selectedSoundTrack.artist : 'Original video audio will play. Click to choose from library.'}
                      </p>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shrink-0 shadow-xs cursor-pointer"
                  >
                    {selectedSoundTrack ? 'Change Track' : 'Choose Music'}
                  </button>
                </div>
              </div>

              {/* 2. Make Video Paid (Exclusively Visible to Monetized Channels) */}
              {(currentUserProfile?.isMonetized || currentUserProfile?.role === 'admin') ? (
                <div className="p-5 bg-linear-to-r from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 rounded-3xl border border-emerald-300/80 dark:border-emerald-800/60 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                        <Lock className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Make Video Paid
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            ✓ Monetized
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                          Charge viewers to watch this video. Revenue is credited 100% directly to your wallet.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPaid(!isPaid)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                        isPaid ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {isPaid && (
                    <div className="pt-3 border-t border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between gap-4 flex-wrap animate-in fade-in duration-200">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1.5">
                          Set Video Access Price (₹ INR) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600 dark:text-emerald-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            value={price}
                            onChange={(e) => setPrice(Math.max(1, Number(e.target.value)))}
                            placeholder="e.g. 10"
                            className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-[#1A1A1A] border-2 border-emerald-400 dark:border-emerald-600 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">Quick Presets:</span>
                        <div className="flex gap-1.5 items-center flex-wrap">
                          {[5, 10, 20, 50, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setPrice(preset)}
                              className={`px-3 py-1.5 text-[11px] font-black rounded-lg cursor-pointer transition-all ${
                                price === preset
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-[#1E1E1E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                              }`}
                            >
                              ₹{preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* 3. Shorts Vertical Format Toggle */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">SocialIndia Shorts Format</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Publish to the dedicated Shorts vertical swipe feed (9:16)</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsShort(!isShort)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    isShort ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isShort ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* 4. Comments Settings */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Comments & Community</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Choose how viewers can engage with this video</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {[
                    { id: 'allow', label: 'Allow All' },
                    { id: 'hold', label: 'Hold for Review' },
                    { id: 'disabled', label: 'Disable' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCommentsMode(opt.id as any)}
                      className={`p-3.5 rounded-2xl text-xs font-black text-center transition-all cursor-pointer border-2 ${
                        commentsMode === opt.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: VISIBILITY & PUBLISH */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in">
              
              {/* Visibility Options */}
              <div className="space-y-3">
                <label className="block text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-black">
                  Choose Visibility *
                </label>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      id: 'public',
                      title: 'Public',
                      desc: 'Everyone can watch your video. It will appear on the Home feed, search results, and your channel.',
                      icon: Globe
                    },
                    {
                      id: 'unlisted',
                      title: 'Unlisted',
                      desc: 'Anyone with the video link can watch. It will not appear on public feeds or search.',
                      icon: EyeOff
                    },
                    {
                      id: 'private',
                      title: 'Private',
                      desc: 'Only you can watch this video. You can change visibility anytime.',
                      icon: Lock
                    }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = visibility === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setVisibility(item.id as any)}
                        className={`p-4 sm:p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                          isSelected 
                            ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 shadow-md' 
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">{item.title}</h4>
                            <input 
                              type="radio" 
                              name="visibility" 
                              checked={isSelected} 
                              onChange={() => setVisibility(item.id as any)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pre-Publish Review Card */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Summary Review</h4>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-700">
                    <img 
                      src={thumbnailPreviewUrl || thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{title || 'Untitled Video'}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md font-black">{category}</span>
                      <span>•</span>
                      <span>{formatDuration(duration)}</span>
                      <span>•</span>
                      <span>{isShort ? '⚡ Shorts' : '🎥 Standard Video'}</span>
                      {selectedSoundTrack && (
                        <>
                          <span>•</span>
                          <span className="text-purple-600 dark:text-purple-400">🎵 {selectedSoundTrack.title}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Upload Progress Screen */}
              {isPublishing && (
                <div className="p-5 bg-blue-50/80 dark:bg-blue-950/40 rounded-3xl border-2 border-blue-300 dark:border-blue-900 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        {uploadStageText || `Uploading Video... ${uploadProgress}%`}
                      </span>
                    </div>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-linear-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${Math.max(4, uploadProgress)}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium text-center">
                    Please keep this window open while the video is streaming to Cloud CDN...
                  </p>
                </div>
              )}

            </div>
          )}

          {/* Navigation Bottom Footer */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            
            {/* Left: Back / Cancel */}
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={() => navigate('home')}
                disabled={isPublishing}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-full cursor-pointer transition-all uppercase text-xs tracking-wider disabled:opacity-50"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                disabled={isPublishing}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-full cursor-pointer transition-all uppercase text-xs tracking-wider disabled:opacity-50 flex items-center gap-1.5"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Back</span>
              </button>
            )}

            {/* Right: Next / Publish Action */}
            <div className="flex items-center gap-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  disabled={currentStep === 1 && !selectedVideoFile && !videoUrl}
                  onClick={() => {
                    if (currentStep === 1 && !selectedVideoFile && !videoUrl) {
                      addToast('Please select a video file first.', 'error');
                      return;
                    }
                    if (currentStep === 2 && !title.trim()) {
                      addToast('Please enter a video title.', 'error');
                      return;
                    }
                    setCurrentStep((prev) => (prev + 1) as any);
                  }}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-black rounded-full cursor-pointer shadow-lg shadow-blue-600/30 transition-all active:scale-95 uppercase text-xs tracking-wider disabled:opacity-50 flex items-center gap-2"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isPublishing || (!videoUrl && !selectedVideoFile) || !title.trim()}
                  className="px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-black rounded-full cursor-pointer shadow-xl shadow-blue-600/40 transition-all active:scale-95 uppercase text-xs tracking-wider disabled:opacity-50 flex items-center gap-2"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Publish to Feed</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>

        </form>
      </div>

      {/* Sound Library Modal */}
      <SoundLibraryModal
        isOpen={soundModalOpen}
        onClose={() => setSoundModalOpen(false)}
        onSelectSound={(sound) => {
          setSelectedSoundTrack(sound);
          addToast(`Selected "${sound.title}" background track!`, 'success');
        }}
        selectedSoundId={selectedSoundTrack?.soundId}
      />

    </div>
  );
};
