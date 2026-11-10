import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { userService } from '../services/userService';
import { SoundTrack } from '../types';
import { formatDuration, captureFrameFromVideoFile, parseVideoUrl } from '../utils/videoUtils';
import { categoriesList } from './Home';
import { soundService } from '../services/soundService';
import { SoundLibraryModal } from '../components/SoundLibraryModal';
import { useTranslation } from '../i18n';
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
  ArrowLeft,
  CloudUpload,
  FolderOpen,
  Eye,
  PlayCircle,
  Lightbulb,
  Video,
  Info,
  HelpCircle,
  BarChart2
} from 'lucide-react';
import { CreatePostBox } from '../components/community/CreatePostBox';
import { PostCard } from '../components/community/PostCard';
import { postService } from '../services/postService';
import { CommunityPost } from '../types';

export const UploadPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast, refreshProfile } = useApp();
  const { route, navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  // Multi-step Wizard Step (1: Upload, 2: Details, 3: Video Elements, 4: Visibility)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [uploadMode, setUploadMode] = useState<'video' | 'short' | 'post'>('video');
  const [userRecentPosts, setUserRecentPosts] = useState<CommunityPost[]>([]);
  const [loadingUserPosts, setLoadingUserPosts] = useState(false);

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

  // Only monetized creators can publish paid videos
  const isUserMonetized = Boolean(
    currentUserProfile?.isMonetized || 
    currentUserProfile?.monetizationStatus === 'approved' || 
    currentUserProfile?.role === 'admin'
  );

  // File Upload & Preview States
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedThumbFile, setSelectedThumbFile] = useState<File | null>(null);
  const [capturedThumbBlob, setCapturedThumbBlob] = useState<Blob | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [isAutoCapturedThumb, setIsAutoCapturedThumb] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Publishing Progress State
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStageText, setUploadStageText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect mode from query params
  useEffect(() => {
    if (route.searchParams?.mode === 'post' || route.searchParams?.tab === 'post' || route.searchParams?.type === 'post') {
      setUploadMode('post');
    } else if (route.searchParams?.mode === 'short' || route.searchParams?.type === 'short') {
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

  const loadUserPosts = async () => {
    if (!currentUser) return;
    setLoadingUserPosts(true);
    try {
      const list = await postService.getPosts({ 
        authorId: currentUser.uid, 
        authorUsername: currentUserProfile?.username 
      });
      setUserRecentPosts(list);
    } catch (err) {
      console.error('Failed to load user community posts:', err);
    } finally {
      setLoadingUserPosts(false);
    }
  };

  useEffect(() => {
    if (uploadMode === 'post') {
      loadUserPosts();
    }
  }, [uploadMode, currentUser?.uid]);

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

  const processSelectedFile = (file: File) => {
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

  // Handle Video Selection from Device
  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Handle Custom Thumbnail Selection from Device
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

  // Publish Handler - strictly requires user to be on Step 4 (Visibility) and explicitly click Publish
  const handlePublish = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (isPublishing) return;
    if (currentStep !== 4) {
      return;
    }
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to publish video.', 'error');
      return;
    }

    if (!title.trim() || title.length < 3 || title.length > 100) {
      addToast('Title must be between 3 and 100 characters.', 'error');
      setCurrentStep(2);
      return;
    }

    if (!selectedVideoFile) {
      addToast(isHindi ? 'कृपया पहले अपनी डिवाइस से एक वीडियो फ़ाइल चुनें।' : 'Please select a video file from your device first.', 'error');
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
        isPaid: isPaid && isUserMonetized,
        price: (isPaid && isUserMonetized) ? Number(price || 0) : 0,
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
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-[#065fd4] flex items-center justify-center mx-auto mb-4 shadow-md">
          <Upload className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
          {isHindi ? 'वीडियो अपलोड करने के लिए साइन इन करें' : 'Sign in to Upload Videos'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-sm mx-auto">
          {isHindi 
            ? 'सोशलइंडिया पर अपने वीडियो, रील्स और शॉर्ट्स लाखों दर्शकों के साथ साझा करें।' 
            : 'Share your videos and clips with viewers across SocialIndia.'}
        </p>
        <button
          onClick={() => navigate('login')}
          className="mt-6 px-6 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs font-black rounded-full shadow-md transition-all cursor-pointer"
        >
          {isHindi ? 'अभी साइन इन करें' : 'Sign In Now'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* 1. TOP PREMIUM HERO BANNER (Hidden on mobile per user request) */}
      <div className="hidden md:flex relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50/90 via-white to-amber-50/30 dark:from-[#131722] dark:via-[#161b26] dark:to-[#1a1720] border border-blue-100/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        {/* Left Side: Icon & Titles */}
        <div className="flex items-center gap-4 sm:gap-5 z-10 max-w-xl">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100/80 dark:bg-blue-950/70 text-[#065fd4] dark:text-[#3b82f6] flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/60 shadow-inner">
            <CloudUpload className="w-8 h-8 sm:w-10 sm:h-10 text-[#065fd4] dark:text-[#3b82f6] stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] dark:text-white tracking-tight">
              {isHindi ? 'वीडियो अपलोड करें' : 'Upload Video'}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-snug">
              {isHindi ? 'अपने विचार, रचनात्मकता और वीडियो पूरी दुनिया के साथ साझा करें।' : 'Share your thoughts, ideas and creativity with the world.'}
            </p>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {isHindi ? 'भारत के तेजी से बढ़ते डिजिटल समुदाय का हिस्सा बनें।' : "Be part of India's growing digital community."}
            </p>
          </div>
        </div>

        {/* Right Side: Elegant Indian Tricolor Wave & Landmarks Silhouette (India Gate, Qutub Minar, Taj Mahal) */}
        <div className="w-full md:w-auto flex-1 h-24 sm:h-28 relative flex items-end justify-end pointer-events-none opacity-85 dark:opacity-60 overflow-hidden">
          <svg viewBox="0 0 500 120" className="w-full max-w-md h-full" preserveAspectRatio="xMaxYMid meet" aria-hidden="true">
            <defs>
              {/* Saffron Wave */}
              <linearGradient id="saffronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF9933" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FF7700" stopOpacity="0.4" />
              </linearGradient>
              {/* Green Wave */}
              <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#138808" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0B5505" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Flying Birds in Sky */}
            <path d="M420,25 Q425,20 430,25 Q435,20 440,25" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <path d="M445,18 Q448,14 452,18 Q456,14 460,18" fill="none" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            <path d="M465,30 Q468,27 472,30 Q476,27 480,30" fill="none" stroke="#64748b" strokeWidth="1" strokeLinecap="round" opacity="0.4" />

            {/* Indian Landmarks Silhouettes in warm architectural tones */}
            {/* India Gate */}
            <g fill="#94a3b8" opacity="0.35">
              <rect x="290" y="55" width="46" height="55" rx="3" />
              <rect x="294" y="48" width="38" height="7" rx="2" />
              <rect x="297" y="44" width="32" height="4" />
              <path d="M305,110 L305,75 Q313,67 321,75 L321,110 Z" fill="#ffffff" opacity="0.9" />
            </g>

            {/* Qutub Minar */}
            <g fill="#94a3b8" opacity="0.45">
              <polygon points="360,110 366,110 363,22" />
              <rect x="361" y="40" width="4" height="2" />
              <rect x="360.5" y="60" width="5" height="2" />
              <rect x="360" y="80" width="6" height="2" />
              <circle cx="363" cy="20" r="1.5" />
            </g>

            {/* Taj Mahal Dome & Minarets */}
            <g fill="#94a3b8" opacity="0.3">
              <path d="M410,110 L410,75 C410,60 417,55 425,50 C433,55 440,60 440,75 L440,110 Z" />
              <circle cx="425" cy="46" r="3" />
              {/* Taj Minarets */}
              <rect x="396" y="50" width="3" height="60" />
              <circle cx="397.5" cy="48" r="2" />
              <rect x="451" y="50" width="3" height="60" />
              <circle cx="452.5" cy="48" r="2" />
            </g>

            {/* Tricolor Flowing Waves */}
            <path d="M100,105 C200,60 300,10 490,20 C420,50 320,80 200,115 Z" fill="url(#saffronGrad)" />
            <path d="M130,115 C230,75 330,30 495,35 C430,70 330,95 210,120 Z" fill="#ffffff" opacity="0.6" />
            <path d="M160,120 C250,85 350,45 500,50 C440,85 340,105 220,125 Z" fill="url(#greenGrad)" />
          </svg>
        </div>
      </div>

      {/* 2. UPLOAD PROGRESS STEPPER (Hidden on mobile per user request) */}
      <div className="hidden md:block bg-white dark:bg-[#16171a] rounded-2xl p-4 sm:p-5 border border-blue-100/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto select-none scrollbar-none py-1">
          
          {[
            { step: 1, title: isHindi ? 'फ़ाइल अपलोड' : 'Upload', sub: isHindi ? 'वीडियो फ़ाइल जोड़ें' : 'Add your video file', icon: CloudUpload },
            { step: 2, title: isHindi ? 'विवरण' : 'Details', sub: isHindi ? 'शीर्षक, विवरण, टैग' : 'Title, description, tags', icon: FileText },
            { step: 3, title: isHindi ? 'एलिमेंट्स' : 'Video Elements', sub: isHindi ? 'थंबनेल और साउंड' : 'Thumbnail, end screen, cards', icon: PlayCircle },
            { step: 4, title: isHindi ? 'दृश्यता' : 'Visibility', sub: isHindi ? 'सार्वजनिक / निजी' : 'Public / Unlisted / Private', icon: Eye }
          ].map((s, index) => {
            const isActive = currentStep === s.step;
            const isDone = currentStep > s.step;
            const Icon = s.icon;
            const canNavigate = !isPublishing && (s.step < currentStep || (s.step === 2 && Boolean(selectedVideoFile)));

            return (
              <React.Fragment key={s.step}>
                <div 
                  onClick={() => {
                    if (canNavigate) setCurrentStep(s.step as any);
                  }}
                  className={`flex items-center gap-3 min-w-fit px-2 py-1 transition-all ${
                    canNavigate ? 'cursor-pointer hover:opacity-90' : isActive ? '' : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Step Number Circle */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                    isActive 
                      ? 'bg-[#065fd4] text-white shadow-xs scale-105' 
                      : isDone 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                  </div>

                  {/* Step Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'text-[#065fd4] dark:text-[#3b82f6]'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>

                  {/* Step Label & Subtitle */}
                  <div className="min-w-0">
                    <p className={`text-xs font-bold leading-tight ${
                      isActive ? 'text-[#065fd4] dark:text-[#3b82f6]' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                      {s.sub}
                    </p>
                  </div>
                </div>

                {/* Arrow Divider between steps */}
                {index < 3 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mx-1" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Active Progress Line Indicator */}
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
          <div 
            className="h-full bg-[#065fd4] transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* 3. MAIN UPLOAD AREA / STEP CONTAINER */}
      <div className="bg-white dark:bg-[#16171a] rounded-3xl p-6 sm:p-10 border border-blue-100/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
        
        {/* Subtle Decorative Indian Tricolor brush strokes in bottom corners */}
        <div className="absolute -bottom-8 -left-8 w-28 h-28 pointer-events-none opacity-40">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M0,60 Q30,70 50,50 Q70,30 100,40" fill="none" stroke="#FF9933" strokeWidth="12" strokeLinecap="round" />
            <path d="M0,75 Q30,85 50,65 Q70,45 100,55" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
            <path d="M0,90 Q30,100 50,80 Q70,60 100,70" fill="none" stroke="#138808" strokeWidth="12" strokeLinecap="round" />
          </svg>
        </div>

        {/* Subtle Ashoka Chakra 24-spoke navy wheel in bottom right corner */}
        <div className="absolute -bottom-10 -right-10 w-36 h-36 pointer-events-none opacity-25 dark:opacity-10 text-[#000080]">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-current" strokeWidth="1.5">
            <circle cx="50" cy="50" r="42" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="8" fill="currentColor" />
            {[...Array(24)].map((_, i) => (
              <line 
                key={i} 
                x1="50" 
                y1="50" 
                x2="50" 
                y2="9" 
                transform={`rotate(${i * 15} 50 50)`} 
                strokeWidth="1.2"
              />
            ))}
          </svg>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
          }} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
              e.preventDefault();
            }
          }}
          className="space-y-6 relative z-10"
        >

          {/* STEP 1: MAIN UPLOAD CARD (Exact Match to Capture.PNG) */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleVideoFileSelect} 
                accept="video/*" 
                disabled={isPublishing}
                className="hidden" 
              />

              {videoPreviewUrl ? (
                /* Video Selected Preview Block */
                <div className="space-y-5 max-w-2xl mx-auto">
                  <div 
                    className="relative rounded-3xl overflow-hidden border-2 border-blue-500/40 bg-black shadow-xl flex items-center justify-center group" 
                    style={{ aspectRatio: isShort ? '9/16' : '16/9', maxHeight: isShort ? '400px' : '320px' }}
                  >
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
                        className="absolute top-3 right-3 px-3.5 py-1.5 bg-black/80 hover:bg-black text-white text-xs font-bold rounded-xl backdrop-blur-md transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isHindi ? 'वीडियो बदलें' : 'Change Video'}</span>
                      </button>
                    )}
                  </div>

                  {/* Video Meta Info Bar */}
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {videoFileName || (isHindi ? 'चुनी गई वीडियो फ़ाइल' : 'Selected Video File')}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>{isHindi ? 'अवधि:' : 'Duration:'} {formatDuration(duration)}</span>
                        <span>•</span>
                        <span>{isShort ? (isHindi ? '⚡ शॉर्ट्स (9:16)' : '⚡ Clips (9:16)') : (isHindi ? '🎥 वीडियो (16:9)' : '🎥 Video (16:9)')}</span>
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
                      className="px-6 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs font-bold rounded-full cursor-pointer shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                      <span>{isHindi ? 'विवरण पर जारी रखें' : 'Continue to Details'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Primary Large Drag & Drop Box with Floating Media Badges */
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-14 flex flex-col items-center justify-center text-center transition-all min-h-[380px] relative ${
                    isDragging 
                      ? 'border-[#065fd4] bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01]' 
                      : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/15 dark:bg-slate-900/30 hover:border-[#065fd4]'
                  }`}
                >
                  
                  {/* Center Upload Circle with Floating Media Badges */}
                  <div className="relative mb-3">
                    {/* Floating Badges */}
                    <div className="absolute -top-3 -left-6 w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/80 text-red-500 flex items-center justify-center shadow-xs border border-red-200/50 animate-bounce" style={{ animationDuration: '3s' }}>
                      <Film className="w-3.5 h-3.5" />
                    </div>
                    <div className="absolute -top-3 -right-6 w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-500 flex items-center justify-center shadow-xs border border-indigo-200/50 animate-bounce" style={{ animationDuration: '3.5s' }}>
                      <Video className="w-3.5 h-3.5" />
                    </div>
                    <div className="absolute -bottom-1 -left-7 w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-600 flex items-center justify-center shadow-xs border border-teal-200/50">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="absolute -bottom-1 -right-7 w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shadow-xs border border-emerald-200/50">
                      <Music className="w-3.5 h-3.5" />
                    </div>

                    {/* Main Blue Cloud Circle */}
                    <div 
                      onClick={() => !isPublishing && fileInputRef.current?.click()}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#065fd4] hover:bg-[#054fb1] text-white flex items-center justify-center shadow-lg shadow-blue-500/25 transition-transform duration-300 hover:scale-105 cursor-pointer"
                    >
                      <CloudUpload className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2]" />
                    </div>
                  </div>

                  {/* Heading & Subtitle */}
                  <div className="space-y-1 mt-3 max-w-md">
                    <h3 className="text-xl sm:text-2xl font-black text-[#0f172a] dark:text-white tracking-tight">
                      {isHindi ? 'अपलोड करने के लिए वीडियो फ़ाइल खींचें और छोड़ें' : 'Drag and drop video files to upload'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {isHindi ? 'जब तक आप प्रकाशित नहीं करते, आपके वीडियो निजी रहेंगे।' : 'Your videos will be private until you publish them.'}
                    </p>
                  </div>

                  {/* Primary Blue Button */}
                  <button
                    type="button"
                    onClick={() => !isPublishing && fileInputRef.current?.click()}
                    style={{ color: '#ffffff' }}
                    className="mt-6 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-full shadow-md shadow-blue-600/25 flex items-center gap-2.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>{isHindi ? 'डिवाइस से मीडिया चुनें' : 'Select Media from Device'}</span>
                  </button>


                  {/* Supported Formats & Max Size Bar */}
                  <div className="flex items-center justify-center gap-2.5 flex-wrap mt-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>{isHindi ? 'समर्थित प्रारूप:' : 'Supported formats:'}</span>
                    {['MP4', 'WebM', 'MOV', 'AVI', 'MKV'].map((fmt) => (
                      <span 
                        key={fmt}
                        className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold"
                      >
                        {fmt}
                      </span>
                    ))}
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                      <CloudUpload className="w-3.5 h-3.5 text-[#065fd4]" />
                      {isHindi ? 'अधिकतम फ़ाइल आकार:' : 'Max file size:'} <strong className="text-slate-800 dark:text-white">10 GB</strong>
                    </span>
                  </div>

                  {/* Pro Tip Bar (Hidden on mobile per user request) */}
                  <div className="mt-6 w-full max-w-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl px-4 py-2.5 hidden sm:flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="text-amber-500">💡</span>
                      <span><strong>{isHindi ? 'सुझाव:' : 'Pro Tip:'}</strong> {isHindi ? 'अधिक व्यूज पाने के लिए आकर्षक थंबनेल लगाएं!' : 'Use a high-quality thumbnail to get more views!'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToast(isHindi ? 'अनुशंसित थंबनेल आकार: 1280x720 पिक्सल (16:9 अनुपात) 5MB से कम।' : 'Recommended thumbnail size: 1280x720 pixels (16:9 ratio) under 5MB.', 'info')}
                      className="text-[#065fd4] dark:text-[#3b82f6] font-bold hover:underline shrink-0 cursor-pointer"
                    >
                      {isHindi ? 'और जानें →' : 'Learn more →'}
                    </button>
                  </div>

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
                    <label className="text-slate-700 dark:text-slate-300 text-xs font-bold">
                      {isHindi ? 'वीडियो का शीर्षक *' : 'Video Title *'}
                    </label>
                    <span className={`text-[11px] font-mono font-bold ${title.length > 90 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {title.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder={uploadMode === 'short' ? (isHindi ? 'आकर्षक शॉर्ट्स शीर्षक जोड़ें... #shorts' : 'Add catchy clip title... #shorts') : (isHindi ? 'आकर्षक वीडियो शीर्षक दर्ज करें...' : 'Enter an engaging video title...')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] bg-slate-50/70 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#065fd4]/20 focus:border-[#065fd4] font-semibold text-sm transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300 text-xs font-bold">
                      {isHindi ? 'विवरण' : 'Description'}
                    </label>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      {description.length}/5000
                    </span>
                  </div>
                  <textarea
                    placeholder={isHindi ? 'दर्शकों को बताएं कि आपका वीडियो किस बारे में है, हैशटैग, लिंक और क्रेडिट जोड़ें...' : 'Tell viewers what your video is about, add hashtags, links, credits and timestamps...'}
                    rows={4}
                    maxLength={5000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] bg-slate-50/70 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#065fd4]/20 focus:border-[#065fd4] font-medium text-xs leading-relaxed transition-all"
                  />
                </div>

                {/* Category & Tags Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1.5 text-xs font-bold">
                      {isHindi ? 'श्रेणी *' : 'Category *'}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] bg-slate-50/70 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#065fd4]/20 focus:border-[#065fd4] font-bold text-xs cursor-pointer"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1.5 text-xs font-bold">
                      {isHindi ? 'टैग्स (अल्पविराम से अलग करें)' : 'Tags (Comma separated)'}
                    </label>
                    <input
                      type="text"
                      placeholder={isHindi ? 'उदा. tech, india, gaming, vlog' : 'e.g. tech, india, gaming, vlog'}
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] bg-slate-50/70 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#065fd4]/20 focus:border-[#065fd4] font-medium text-xs"
                    />
                  </div>
                </div>

              </div>

              {/* Right Column: Thumbnail & Video Overview */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Thumbnail Picker */}
                <div className="p-5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#065fd4]" />
                      <span>{isHindi ? 'थंबनेल' : 'Thumbnail'}</span>
                    </label>
                    {(thumbnailPreviewUrl || thumbnailUrl) && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isAutoCapturedThumb ? (isHindi ? 'ऑटो फ़्रेम' : 'Auto Scene') : (isHindi ? 'कस्टम इमेज' : 'Custom Image')}
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
                    <div className="relative rounded-xl overflow-hidden border border-blue-500/30 bg-slate-900 aspect-video flex items-center justify-center group shadow-xs">
                      <img 
                        src={thumbnailPreviewUrl} 
                        alt="Thumbnail Preview" 
                        className="w-full h-full object-cover" 
                      />

                      {isAutoCapturedThumb && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-white text-[9px] font-bold uppercase tracking-wider border border-white/10 flex items-center gap-1">
                          <Film className="w-3 h-3 text-blue-400" />
                          <span>{isHindi ? 'ऑटो फ़्रेम' : 'Auto Frame'}</span>
                        </div>
                      )}

                      {!isPublishing && (
                        <button
                          type="button"
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="absolute top-2 right-2 px-3 py-1 bg-black/75 hover:bg-black text-white text-[10px] font-bold rounded-lg backdrop-blur-md transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isAutoCapturedThumb ? (isHindi ? 'कस्टम अपलोड करें' : 'Upload Custom') : (isHindi ? 'इमेज बदलें' : 'Change Image')}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => !isPublishing && thumbnailInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#065fd4] rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 bg-white dark:bg-slate-900/80 hover:bg-blue-50/20 transition-all cursor-pointer group min-h-[130px]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#065fd4] group-hover:text-white transition-all shadow-2xs">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {isHindi ? 'कस्टम थंबनेल अपलोड करें' : 'Upload Custom Thumbnail'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">JPG, PNG or WebP</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Info Summary Card */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p className="truncate">{isHindi ? 'फ़ाइल:' : 'File:'} <span className="font-semibold text-slate-800 dark:text-slate-200">{videoFileName || (isHindi ? 'चुनी गई वीडियो' : 'Selected Video')}</span></p>
                  <p>{isHindi ? 'अवधि:' : 'Duration:'} <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDuration(duration)}</span></p>
                  <p>{isHindi ? 'प्रारूप:' : 'Format:'} <span className="font-semibold text-slate-800 dark:text-slate-200">{isShort ? (isHindi ? '⚡ शॉर्ट्स (9:16)' : '⚡ Clips (9:16)') : (isHindi ? '🎥 वीडियो (16:9)' : '🎥 Video (16:9)')}</span></p>
                </div>

              </div>

            </div>
          )}

          {/* STEP 3: VIDEO ELEMENTS (Music, Monetization, Comments) */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-2xl mx-auto animate-in fade-in">
              
              {/* 1. Background Music / Audio Track */}
              <div className="p-5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Music className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {isHindi ? 'बैकग्राउंड संगीत और साउंड' : 'Background Music & Sound'}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {isHindi ? 'ऑडियो या कॉपीराइट-मुक्त बैकग्राउंड ट्रैक जोड़ें' : 'Attach audio or royalty-free background track'}
                      </p>
                    </div>
                  </div>

                  {selectedSoundTrack && (
                    <button
                      type="button"
                      onClick={() => setSelectedSoundTrack(null)}
                      className="text-rose-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isHindi ? 'हटाएं' : 'Remove'}</span>
                    </button>
                  )}
                </div>

                <div 
                  onClick={() => setSoundModalOpen(true)}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-purple-500 rounded-xl cursor-pointer transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedSoundTrack ? (
                      <img src={selectedSoundTrack.coverUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 shadow-xs" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedSoundTrack ? selectedSoundTrack.title : (isHindi ? 'कोई बैकग्राउंड ट्रैक नहीं चुना गया' : 'No background track selected')}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {selectedSoundTrack ? selectedSoundTrack.artist : (isHindi ? 'मूल वीडियो ऑडियो बजेगा। लाइब्रेरी से चुनने के लिए क्लिक करें।' : 'Original video audio will play. Click to choose from library.')}
                      </p>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs cursor-pointer"
                  >
                    {selectedSoundTrack ? (isHindi ? 'बदलें' : 'Change') : (isHindi ? 'संगीत चुनें' : 'Choose Music')}
                  </button>
                </div>
              </div>

              {/* 2. Monetized Paywall (Only for Monetized Channels) */}
              {isUserMonetized && (
                <div className="p-5 bg-gradient-to-r from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 rounded-2xl border border-emerald-300/80 dark:border-emerald-800/60 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Lock className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {isHindi ? 'वीडियो को पेड (सशुल्क) बनाएं' : 'Make Video Paid'}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            {isHindi ? '✓ मुद्रीकृत' : '✓ Monetized'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {isHindi 
                            ? 'दर्शकों से इस वीडियो को देखने का शुल्क लें। कमाई सीधे 100% आपके वॉलेट में जमा होगी।' 
                            : 'Charge viewers to watch this video. Revenue is credited 100% directly to your wallet.'}
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
                    <div className="pt-3 border-t border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                          {isHindi ? 'एक्सेस शुल्क सेट करें (₹ INR) *' : 'Set Access Price (₹ INR) *'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            value={price}
                            onChange={(e) => setPrice(Math.max(1, Number(e.target.value)))}
                            placeholder="10"
                            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-[#1A1A1A] border border-emerald-400 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">{isHindi ? 'प्रीसेट:' : 'Presets:'}</span>
                        <div className="flex gap-1.5 items-center flex-wrap">
                          {[5, 10, 20, 50, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setPrice(preset)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                                price === preset
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-[#1E1E1E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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
              )}

              {/* 3. Comments Settings */}
              <div className="p-5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#065fd4] dark:text-[#3b82f6] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {isHindi ? 'कमेंट्स और कम्युनिटी' : 'Comments & Community'}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {isHindi ? 'तय करें कि दर्शक इस वीडियो पर कैसे प्रतिक्रिया दे सकते हैं' : 'Choose how viewers can engage with this video'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: 'allow', label: isHindi ? 'सभी की अनुमति दें' : 'Allow All' },
                    { id: 'hold', label: isHindi ? 'समीक्षा के लिए रोकें' : 'Hold Review' },
                    { id: 'disabled', label: isHindi ? 'अक्षम करें' : 'Disabled' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCommentsMode(opt.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border ${
                        commentsMode === opt.id
                          ? 'bg-[#065fd4] text-white border-[#065fd4] shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
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
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold">
                  {isHindi ? 'दृश्यता चुनें *' : 'Choose Visibility *'}
                </label>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      id: 'public',
                      title: isHindi ? 'सार्वजनिक' : 'Public',
                      desc: isHindi 
                        ? 'हर कोई आपका वीडियो देख सकता है। यह होम फ़ीड, सर्च परिणामों और आपके चैनल पर दिखेगा।' 
                        : 'Everyone can watch your video. It will appear on the Home feed, search results, and your channel.',
                      icon: Globe
                    },
                    {
                      id: 'unlisted',
                      title: isHindi ? 'अनलिस्टेड' : 'Unlisted',
                      desc: isHindi 
                        ? 'केवल वीडियो लिंक वाले व्यक्ति ही इसे देख सकते हैं। यह सार्वजनिक फ़ीड या सर्च में नहीं दिखेगा।' 
                        : 'Anyone with the video link can watch. It will not appear on public feeds or search.',
                      icon: EyeOff
                    },
                    {
                      id: 'private',
                      title: isHindi ? 'निजी' : 'Private',
                      desc: isHindi 
                        ? 'केवल आप इस वीडियो को देख सकते हैं। आप कभी भी दृश्यता बदल सकते हैं।' 
                        : 'Only you can watch this video. You can change visibility anytime.',
                      icon: Lock
                    }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = visibility === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setVisibility(item.id as any)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                          isSelected 
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-[#065fd4] shadow-xs' 
                            : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#065fd4] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
                            <input 
                              type="radio" 
                              name="visibility" 
                              checked={isSelected} 
                              onChange={() => setVisibility(item.id as any)}
                              className="w-4 h-4 text-[#065fd4] focus:ring-[#065fd4] cursor-pointer"
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pre-Publish Review Summary */}
              <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {isHindi ? 'सारांश समीक्षा' : 'Summary Review'}
                </h4>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-700">
                    <img 
                      src={thumbnailPreviewUrl || thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{title || (isHindi ? 'शीर्षकहीन वीडियो' : 'Untitled Video')}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                      <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-[#065fd4] dark:text-[#3b82f6] rounded font-bold">{category}</span>
                      <span>•</span>
                      <span>{formatDuration(duration)}</span>
                      <span>•</span>
                      <span>{isShort ? (isHindi ? '⚡ शॉर्ट्स' : '⚡ Shorts') : (isHindi ? '🎥 वीडियो' : '🎥 Video')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Streaming Upload Progress Screen */}
              {isPublishing && (
                <div className="p-5 bg-blue-50/90 dark:bg-blue-950/40 rounded-2xl border-2 border-blue-400 dark:border-blue-900 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-[#065fd4] animate-spin" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {uploadStageText || (isHindi ? `वीडियो अपलोड हो रहा है... ${uploadProgress}%` : `Uploading Video... ${uploadProgress}%`)}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#065fd4] font-mono">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-[#065fd4] rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(5, uploadProgress)}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium text-center">
                    {isHindi 
                      ? 'कृपया वीडियो अपलोड होने तक इस विंडो को खुला रखें...' 
                      : 'Please keep this window open while the video is uploading to SocialIndia...'}
                  </p>
                </div>
              )}

            </div>
          )}

          {/* Navigation Bottom Action Bar */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            
            {/* Left Action */}
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={() => navigate('home')}
                disabled={isPublishing}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-full cursor-pointer transition-all text-xs disabled:opacity-50"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                disabled={isPublishing}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-full cursor-pointer transition-all text-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                <span>{isHindi ? 'वापस' : 'Back'}</span>
              </button>
            )}

            {/* Right Action */}
            <div className="flex items-center gap-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  disabled={currentStep === 1 && !selectedVideoFile && !videoUrl}
                  onClick={() => {
                    if (currentStep === 1 && !selectedVideoFile && !videoUrl) {
                      addToast(isHindi ? 'कृपया पहले एक वीडियो फ़ाइल चुनें।' : 'Please select a video file first.', 'error');
                      return;
                    }
                    if (currentStep === 2 && !title.trim()) {
                      addToast(isHindi ? 'कृपया वीडियो का शीर्षक दर्ज करें।' : 'Please enter a video title.', 'error');
                      return;
                    }
                    setCurrentStep((prev) => (prev + 1) as any);
                  }}
                  className="px-6 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white font-bold text-xs rounded-full shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
                >
                  <span>{isHindi ? 'अगला चरण' : 'Next Step'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPublishing || !title.trim()}
                  className="px-7 py-3 bg-gradient-to-r from-[#065fd4] to-[#2563eb] hover:from-[#054fb1] hover:to-[#1d4ed8] text-white font-extrabold text-xs sm:text-sm rounded-full shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isHindi ? 'वीडियो प्रकाशित हो रहा है...' : 'Publishing Video...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{isHindi ? 'वीडियो प्रकाशित करें (+20 पॉइंट्स)' : 'Publish Video (+20 Pts)'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>

        </form>
      </div>

      {/* Sound Library Selection Modal */}
      {soundModalOpen && (
        <SoundLibraryModal
          isOpen={soundModalOpen}
          onClose={() => setSoundModalOpen(false)}
          onSelectSound={(sound) => {
            setSelectedSoundTrack(sound);
            setSoundModalOpen(false);
            addToast(`Selected track: ${sound.title}`, 'info');
          }}
          selectedSoundId={selectedSoundTrack?.soundId}
        />
      )}

    </div>
  );
};
