import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../hooks/useRouter';
import { postService } from '../../services/postService';
import { videoService, MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_SIZE_LABEL } from '../../services/videoService';
import { compressImage } from '../../utils/imageUtils';
import { normalizeLinkUrl, formatLinkHost } from '../../utils/linkUtils';
import { useTranslation } from '../../i18n';
import { 
  ImagePlus,
  Video,
  Smile,
  Link2,
  ExternalLink,
  Globe,
  X, 
  Loader2, 
  ArrowRight,
  CheckCircle2,
  Film
} from 'lucide-react';

const FEELINGS = [
  { emoji: '😊', label: 'Happy', labelHi: 'खुश' },
  { emoji: '🤩', label: 'Excited', labelHi: 'उत्साहित' },
  { emoji: '🙏', label: 'Grateful', labelHi: 'आभारी' },
  { emoji: '✨', label: 'Inspired', labelHi: 'प्रेरित' },
  { emoji: '😎', label: 'Chill', labelHi: 'कूल' },
  { emoji: '🇮🇳', label: 'Proud', labelHi: 'गर्वित' },
];

interface CreatePostBoxProps {
  onPostCreated?: () => void;
  className?: string;
}

export const CreatePostBox: React.FC<CreatePostBoxProps> = ({ onPostCreated, className = '' }) => {
  const { currentUser, currentUserProfile } = useApp();
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  const [content, setContent] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);

  // Link attachment
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  
  // Image attachments
  const [images, setImages] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video attachment (Instagram-style gallery pick)
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStageText, setUploadStageText] = useState<string>('');
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount or replacement
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Submit state
  const [isPosting, setIsPosting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const activeUser = currentUser || (currentUserProfile?.uid ? {
    uid: currentUserProfile.uid,
    displayName: currentUserProfile.displayName,
    photoURL: currentUserProfile.photoURL,
    email: currentUserProfile.email
  } : null);

  if (!activeUser) {
    return (
      <div className={`bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center ${className}`}>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          {isHindi ? 'कम्युनिटी पोस्ट, इमेज या वीडियो शेयर करने के लिए साइन इन करें।' : 'Sign in to publish community posts, share photos, or post videos.'}
        </p>
        <button
          onClick={() => navigate('login')}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          {isHindi ? 'साइन इन करें' : 'Sign In'}
        </button>
      </div>
    );
  }

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 4) {
      setStatusMsg({ text: isHindi ? 'आप एक पोस्ट में अधिकतम 4 इमेजेस जोड़ सकते हैं।' : 'You can attach up to 4 images per post.', type: 'error' });
      return;
    }

    // Clear selected video if switching to photo post
    if (selectedVideoFile) {
      handleRemoveVideo();
    }

    setIsProcessingImage(true);
    setStatusMsg(null);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i], 800, 800, 0.75);
        compressedList.push(compressed);
      }
      setImages(prev => [...prev, ...compressedList].slice(0, 4));
    } catch {
      setStatusMsg({ text: isHindi ? 'इमेज प्रोसेस करने में विफल।' : 'Failed to process image file.', type: 'error' });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setStatusMsg({
        text: isHindi ? 'कृपया केवल वैध वीडियो फ़ाइल चुनें।' : 'Please select a valid video file from your gallery.',
        type: 'error'
      });
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setStatusMsg({
        text: isHindi
          ? `कृपया ${MAX_VIDEO_SIZE_LABEL} से कम साइज का वीडियो अपलोड करें।`
          : `Please upload a video smaller than ${MAX_VIDEO_SIZE_LABEL}.`,
        type: 'error'
      });
      return;
    }

    // Replace any selected photos when choosing a video (Instagram-style)
    if (images.length > 0) {
      setImages([]);
    }
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    setStatusMsg(null);
    setSelectedVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setSelectedVideoFile(null);
    setVideoPreviewUrl(null);
    setUploadProgress(0);
    setUploadStageText('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isPosting) return;

    if (selectedVideoFile && selectedVideoFile.size > MAX_VIDEO_SIZE_BYTES) {
      setStatusMsg({
        text: isHindi
          ? `कृपया ${MAX_VIDEO_SIZE_LABEL} से कम साइज का वीडियो अपलोड करें।`
          : `Please upload a video smaller than ${MAX_VIDEO_SIZE_LABEL}.`,
        type: 'error'
      });
      return;
    }

    const trimmedBase = content.trim();
    const feelingPrefix = selectedFeeling ? `${selectedFeeling} ` : '';
    const finalContent = trimmedBase ? `${feelingPrefix}${trimmedBase}`.trim() : selectedFeeling || '';

    const rawLink = linkUrl.trim();
    const normalizedLink = rawLink ? normalizeLinkUrl(rawLink) : '';
    if (rawLink && !normalizedLink) {
      setStatusMsg({
        text: isHindi ? 'कृपया एक मान्य वेब लिंक (उदा. https://example.com) दर्ज करें।' : 'Please enter a valid web link (e.g. https://example.com).',
        type: 'error'
      });
      return;
    }

    if (!finalContent && images.length === 0 && !selectedVideoFile && !normalizedLink) {
      setStatusMsg({
        text: isHindi ? 'कृपया पोस्ट में कुछ लिखें, फ़ोटो/वीडियो जोड़ें या लिंक डालें।' : 'Please write something, attach a photo/video, or add a link to post.',
        type: 'error'
      });
      return;
    }

    setIsPosting(true);
    setStatusMsg(null);
    setUploadProgress(0);
    setUploadStageText('');

    try {
      let uploadedVideoUrl: string | undefined = undefined;
      let effectiveType: 'text' | 'image' | 'video' = images.length > 0 ? 'image' : 'text';

      // 1. Upload Video
      if (selectedVideoFile) {
        effectiveType = 'video';
        setUploadProgress(1);
        setUploadStageText(isHindi ? 'वीडियो अपलोड हो रहा है... 1%' : 'Uploading video... 1%');
        const uploadRes = await videoService.uploadVideo(
          selectedVideoFile,
          (progress) => {
            setUploadProgress((prev) => {
              const next = Math.max(prev, Math.min(100, progress));
              setUploadStageText(
                next >= 100
                  ? (isHindi ? 'वीडियो प्रोसेस हो रहा है...' : 'Processing video...')
                  : (isHindi ? `वीडियो अपलोड हो रहा है... ${next}%` : `Uploading video... ${next}%`)
              );
              return next;
            });
          },
          { allowMultiPart: false }
        );
        uploadedVideoUrl = uploadRes.videoUrl;
      }

      // 2. Upload Photos (Strictly prevents large Base64 in Firestore)
      const uploadedImageUrls: string[] = [];
      if (effectiveType === 'image' && images.length > 0) {
        setUploadStageText(isHindi ? 'फोटो अपलोड हो रही है...' : 'Uploading photos...');
        for (let i = 0; i < images.length; i++) {
          const imgItem = images[i];
          if (imgItem.startsWith('http://') || imgItem.startsWith('https://')) {
            uploadedImageUrls.push(imgItem);
          } else {
            const cloudUrl = await postService.uploadPostMedia(imgItem, false, (pct) => {
              setUploadProgress(pct);
              setUploadStageText(
                isHindi 
                  ? `फोटो ${i + 1}/${images.length} अपलोड हो रही है... ${pct}%` 
                  : `Uploading photo ${i + 1}/${images.length}... ${pct}%`
              );
            });
            uploadedImageUrls.push(cloudUrl);
          }
        }
      }

      const createdPost = await postService.createPost({
        authorId: activeUser.uid,
        authorUsername: currentUserProfile?.username || (activeUser.displayName ? activeUser.displayName.trim().replace(/\s+/g, '').toLowerCase() : '') || activeUser.email?.split('@')[0] || activeUser.uid,
        authorDisplayName: currentUserProfile?.displayName || activeUser.displayName || currentUserProfile?.username || activeUser.email?.split('@')[0] || 'SocialIndia User',
        authorPhotoURL: currentUserProfile?.photoURL || activeUser.photoURL || '',
        authorRole: currentUserProfile?.role || 'user',
        content: finalContent,
        postType: effectiveType,
        images: effectiveType === 'image' && uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        videoUrl: effectiveType === 'video' ? uploadedVideoUrl : undefined,
        linkUrl: normalizedLink || undefined,
        linkTitle: normalizedLink && linkTitle.trim() ? linkTitle.trim() : undefined,
      });

      setStatusMsg({
        text: isHindi ? '🎉 पोस्ट सफलतापूर्वक प्रकाशित और सिंक हो गई!' : '🎉 Post published & synced to cloud successfully!',
        type: 'success'
      });
      setTimeout(() => setStatusMsg(null), 4000);
      
      // Reset form
      setContent('');
      setImages([]);
      handleRemoveVideo();
      setSelectedFeeling(null);
      setShowFeelingPicker(false);
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkInput(false);

      onPostCreated?.();
    } catch (err: any) {
      console.error('Community post publish failed:', err);
      const errorMsg = typeof err?.message === 'string' && err.message ? err.message : '';
      const errorCode = typeof err?.code === 'string' ? err.code : '';
      setStatusMsg({
        text: isHindi
          ? `पोस्ट सेव करने में त्रुटि हुई। ${errorMsg || errorCode}`.trim()
          : `Error saving post. ${errorMsg || errorCode}`.trim(),
        type: 'error'
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white dark:bg-[#121215] rounded-[20px] px-4 py-4 sm:px-5 sm:py-4 border border-slate-200/60 dark:border-slate-800/90 shadow-xs ${className}`}
    >
      {/* Hidden file input for images */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileSelect}
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        accept="image/*"
        multiple
        disabled={isPosting}
        className="hidden"
      />

      {/* Hidden file input for device gallery videos */}
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoFileSelect}
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        accept="video/*"
        disabled={isPosting}
        className="hidden"
      />

      {/* Pill Input */}
      <input
        id="community-post-input"
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isPosting}
        placeholder={isHindi ? 'फोटो, वीडियो या लिंक शेयर करें' : 'Share a photo, video or link'}
        className="w-full rounded-full bg-[#F1F3F6] dark:bg-[#1b1b20] px-5 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/15 transition-all"
      />

      {/* Selected Feeling Chip */}
      {selectedFeeling && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-200/70 dark:border-amber-800/50">
            <span>{selectedFeeling}</span>
            <button
              type="button"
              onClick={() => setSelectedFeeling(null)}
              className="hover:text-amber-900 dark:hover:text-white cursor-pointer"
              aria-label="Remove feeling"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* Feeling Picker Row */}
      {showFeelingPicker && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-[#18181d] border border-slate-200/80 dark:border-slate-800">
          {FEELINGS.map((f) => {
            const tag = `${f.emoji} ${isHindi ? f.labelHi : f.label}`;
            const active = selectedFeeling === tag;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  setSelectedFeeling(active ? null : tag);
                  setShowFeelingPicker(false);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                    : 'bg-white dark:bg-[#121215] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Link Attachment Input & Preview */}
      {showLinkInput && (
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#18181d] border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              {isHindi ? 'क्लिकेबल लिंक जोड़ें' : 'Attach clickable link'}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl('');
                setLinkTitle('');
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
              title={isHindi ? 'लिंक हटाएं' : 'Remove link'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            disabled={isPosting}
            placeholder={isHindi ? 'https://example.com या कोई भी लिंक पेस्ट करें' : 'Paste URL (e.g. https://example.com)'}
            className="w-full rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-700/80 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <input
            type="text"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            disabled={isPosting}
            placeholder={isHindi ? 'लिंक का शीर्षक (वैकल्पिक)' : 'Link title / label (optional)'}
            className="w-full rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-700/80 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          {(() => {
            const previewHref = normalizeLinkUrl(linkUrl);
            if (!previewHref) return null;
            return (
              <a
                href={previewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 text-xs hover:bg-blue-100/60 dark:hover:bg-blue-950/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {linkTitle.trim() || formatLinkHost(previewHref)}
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 truncate">{previewHref}</p>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              </a>
            );
          })()}
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 group border border-slate-200 dark:border-slate-800">
              <img src={img} alt="Attachment" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                disabled={isPosting}
                className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Instagram-style Video Preview Card */}
      {videoPreviewUrl && selectedVideoFile && (
        <div className="mt-3 relative rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800">
          <video
            src={videoPreviewUrl}
            controls
            playsInline
            muted
            className="w-full max-h-[360px] object-contain bg-black"
          />
          {!isPosting && (
            <button
              type="button"
              onClick={handleRemoveVideo}
              className="absolute top-2.5 right-2.5 p-1.5 bg-black/75 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer shadow-md"
              title={isHindi ? 'वीडियो हटाएं' : 'Remove video'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="px-3 py-2 bg-[#111114] text-slate-200 text-xs flex items-center justify-between gap-2 border-t border-white/10">
            <span className="flex items-center gap-1.5 truncate font-medium">
              <Film className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{selectedVideoFile.name}</span>
            </span>
            <span className="text-[11px] text-slate-400 shrink-0">
              {(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>
      )}

      {/* Video Upload Progress Bar */}
      {isPosting && selectedVideoFile && (
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#18181d] border border-slate-200/80 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span>{uploadStageText || (isHindi ? 'वीडियो अपलोड हो रहा है...' : 'Uploading video...')}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-200 rounded-full"
              style={{ width: `${Math.max(4, uploadProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Divider + Bottom Action Bar */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/90 flex items-center justify-between gap-2 flex-wrap">
        {/* Left Action Items */}
        <div className="flex items-center gap-4 sm:gap-7 pl-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage || isPosting}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 disabled:opacity-50"
          >
            {isProcessingImage ? (
              <Loader2 className="w-[18px] h-[18px] animate-spin text-emerald-600 shrink-0" />
            ) : (
              <ImagePlus className="w-[18px] h-[18px] text-[#16a34a] shrink-0" />
            )}
            <span className="text-slate-700 dark:text-slate-200">{isHindi ? 'फोटो' : 'Photo'}</span>
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={isPosting}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 disabled:opacity-50"
          >
            <Video className="w-[18px] h-[18px] text-[#ef4444] shrink-0" />
            <span className="text-slate-700 dark:text-slate-200">{isHindi ? 'वीडियो' : 'Video'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFeelingPicker(prev => !prev)}
            disabled={isPosting}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 disabled:opacity-50"
          >
            <Smile className="w-[18px] h-[18px] text-[#f59e0b] shrink-0" />
            <span className="text-slate-700 dark:text-slate-200">{isHindi ? 'फीलिंग' : 'Feeling'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLinkInput(prev => !prev)}
            disabled={isPosting}
            className={`flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer py-1 disabled:opacity-50 ${
              showLinkInput || linkUrl.trim()
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link2 className="w-[18px] h-[18px] text-[#2563eb] shrink-0" />
            <span>{isHindi ? 'लिंक' : 'Link'}</span>
          </button>
        </div>

        {/* Right Submit Button */}
        <button
          type="submit"
          disabled={isPosting}
          className="px-5 py-2 bg-black hover:bg-[#1a1a1a] dark:bg-[#ffffff] dark:hover:bg-[#e5e5e5] text-white dark:text-black rounded-full text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          {isPosting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isHindi ? 'पोस्ट...' : 'Posting...'}</span>
            </>
          ) : (
            <>
              <span>{isHindi ? 'पोस्ट' : 'Post'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </>
          )}
        </button>
      </div>

      {/* Inline Feedback Banner */}
      {statusMsg && (
        <div className={`mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-slide-in ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <X className="w-4 h-4 shrink-0 text-rose-500" />}
          <span className="flex-1">{statusMsg.text}</span>
        </div>
      )}
    </form>
  );
};
