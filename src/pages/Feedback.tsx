import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { feedbackService } from '../services/feedbackService';
import { postService } from '../services/postService';
import { useTranslation } from '../i18n';
import {
  MessageSquare,
  CheckCircle2,
  Loader2,
  Camera,
  ImagePlus,
  ChevronDown,
  ChevronUp,
  X,
  Monitor,
  HelpCircle,
  PenTool,
  Trash2,
  Undo2,
  Square,
  Highlighter
} from 'lucide-react';

interface SelectedScreenshot {
  id: string;
  name: string;
  dataUrl: string;
}

interface AnnotationBox {
  mode: 'highlight' | 'blackout';
  x: number; // normalized 0..1
  y: number;
  w: number;
  h: number;
}

const MAX_SCREENSHOTS = 3;

function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i.test(file.name || '');
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

async function compressScreenshotFile(file: File): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (!width || !height) {
        resolve(rawDataUrl);
        return;
      }

      const maxDim = 1280;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        let compressed = canvas.toDataURL('image/jpeg', 0.8);
        if (compressed.length > 220000) {
          compressed = canvas.toDataURL('image/jpeg', 0.65);
        }
        if (compressed.length > 280000) {
          compressed = canvas.toDataURL('image/jpeg', 0.5);
        }
        resolve(compressed);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => {
      if (rawDataUrl.startsWith('data:image/') && rawDataUrl.length < 350000) {
        resolve(rawDataUrl);
      } else {
        reject(new Error('Unsupported image format'));
      }
    };
    img.src = rawDataUrl;
  });
}

export const FeedbackPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  // Feedback fields
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'playback' | 'creator' | 'general'>('feature');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [screenshots, setScreenshots] = useState<SelectedScreenshot[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [includeSystemInfo, setIncludeSystemInfo] = useState(true);
  const [showSystemInfoDetails, setShowSystemInfoDetails] = useState(false);

  // Highlight / Redact modal state
  const [editingScreenshotId, setEditingScreenshotId] = useState<string | null>(null);
  const [annotationMode, setAnnotationMode] = useState<'highlight' | 'blackout'>('highlight');
  const [annotations, setAnnotations] = useState<AnnotationBox[]>([]);
  const [draftBox, setDraftBox] = useState<AnnotationBox | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Gather actual system info
  const [systemInfo, setSystemInfo] = useState({
    userAgent: '',
    os: '',
    screenResolution: '',
    currentUrl: '',
    language: '',
    theme: 'light'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setSystemInfo({
        userAgent: navigator.userAgent,
        os: navigator.userAgent.includes('Windows') ? 'Windows' :
            navigator.userAgent.includes('Android') ? 'Android' :
            navigator.userAgent.includes('Mac') ? 'macOS' :
            navigator.userAgent.includes('iPhone') ? 'iOS' : 'Linux',
        screenResolution: `${window.innerWidth} x ${window.innerHeight}`,
        currentUrl: window.location.href,
        language: navigator.language || 'en',
        theme: isDark ? 'Dark Mode' : 'Light Mode'
      });
    }
  }, []);

  const processSelectedFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const availableSlots = MAX_SCREENSHOTS - screenshots.length;
    if (availableSlots <= 0) {
      addToast(
        isHindi
          ? `आप अधिकतम ${MAX_SCREENSHOTS} स्क्रीनशॉट ही जोड़ सकते हैं।`
          : `You can attach up to ${MAX_SCREENSHOTS} screenshots.`,
        'error'
      );
      return;
    }

    const validImages = incoming.filter(isImageFile);
    if (validImages.length === 0) {
      addToast(
        isHindi ? 'कृपया गैलरी से एक मान्य इमेज या स्क्रीनशॉट चुनें।' : 'Please choose a valid image or screenshot from your gallery.',
        'error'
      );
      return;
    }

    const filesToProcess = validImages.slice(0, availableSlots);
    setIncludeScreenshot(true);
    setIsProcessingImage(true);

    try {
      const processed: SelectedScreenshot[] = [];
      for (const file of filesToProcess) {
        const dataUrl = await compressScreenshotFile(file);
        processed.push({
          id: `shot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name || 'screenshot.jpg',
          dataUrl
        });
      }

      setScreenshots((prev) => [...prev, ...processed].slice(0, MAX_SCREENSHOTS));
      addToast(
        isHindi
          ? `${processed.length} स्क्रीनशॉट जोड़ा गया।`
          : `${processed.length} screenshot${processed.length > 1 ? 's' : ''} added.`,
        'success'
      );
    } catch {
      addToast(
        isHindi ? 'गैलरी से स्क्रीनशॉट जोड़ने में समस्या आई।' : 'Could not load the selected screenshot.',
        'error'
      );
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleGalleryInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processSelectedFiles(files);
    }
    // Reset input value so picking the same image again still triggers onChange
    e.target.value = '';
  };

  const openGalleryPicker = () => {
    if (isProcessingImage) return;
    fileInputRef.current?.click();
  };

  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((item) => item.id !== id));
    if (editingScreenshotId === id) {
      setEditingScreenshotId(null);
      setAnnotations([]);
      setDraftBox(null);
    }
  };

  const openHighlightEditor = (id: string) => {
    setEditingScreenshotId(id);
    setAnnotations([]);
    setDraftBox(null);
    setAnnotationMode('highlight');
  };

  const editingScreenshot = screenshots.find((s) => s.id === editingScreenshotId) || null;

  const getRelativeCoords = (clientX: number, clientY: number) => {
    const el = editorContainerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height)));
    return { x, y };
  };

  const handleEditorPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getRelativeCoords(e.clientX, e.clientY);
    drawStartRef.current = pt;
    setDraftBox({ mode: annotationMode, x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const handleEditorPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawStartRef.current) return;
    const pt = getRelativeCoords(e.clientX, e.clientY);
    const start = drawStartRef.current;
    setDraftBox({
      mode: annotationMode,
      x: Math.min(start.x, pt.x),
      y: Math.min(start.y, pt.y),
      w: Math.abs(pt.x - start.x),
      h: Math.abs(pt.y - start.y)
    });
  };

  const handleEditorPointerUp = () => {
    if (draftBox && draftBox.w > 0.015 && draftBox.h > 0.015) {
      setAnnotations((prev) => [...prev, draftBox]);
    }
    drawStartRef.current = null;
    setDraftBox(null);
  };

  const applyAnnotationsAndClose = async () => {
    if (!editingScreenshot) {
      setEditingScreenshotId(null);
      return;
    }

    if (annotations.length === 0) {
      setEditingScreenshotId(null);
      return;
    }

    try {
      const updatedUrl = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 800;
          canvas.height = img.height || 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(editingScreenshot.dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          for (const box of annotations) {
            const bx = box.x * canvas.width;
            const by = box.y * canvas.height;
            const bw = box.w * canvas.width;
            const bh = box.h * canvas.height;

            if (box.mode === 'blackout') {
              ctx.fillStyle = '#000000';
              ctx.fillRect(bx, by, bw, bh);
            } else {
              ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
              ctx.fillRect(bx, by, bw, bh);
              ctx.lineWidth = Math.max(3, Math.round(canvas.width * 0.005));
              ctx.strokeStyle = '#f59e0b';
              ctx.strokeRect(bx, by, bw, bh);
            }
          }

          try {
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } catch {
            resolve(editingScreenshot.dataUrl);
          }
        };
        img.onerror = () => resolve(editingScreenshot.dataUrl);
        img.src = editingScreenshot.dataUrl;
      });

      setScreenshots((prev) =>
        prev.map((item) =>
          item.id === editingScreenshot.id ? { ...item, dataUrl: updatedUrl } : item
        )
      );
      addToast(isHindi ? 'स्क्रीनशॉट अपडेट हो गया।' : 'Screenshot updated.', 'success');
    } finally {
      setEditingScreenshotId(null);
      setAnnotations([]);
      setDraftBox(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      addToast(isHindi ? 'कृपया अपनी प्रतिक्रिया लिखें।' : 'Please enter your feedback description.', 'error');
      return;
    }

    setSubmitting(true);
    setUploadStatusText('');
    try {
      const formattedSubject = subject.trim() || `${feedbackType.toUpperCase()}: Feedback from ${currentUserProfile?.username || 'User'}`;
      const systemInfoSummary = includeSystemInfo
        ? `\n\n--- System Info ---\nOS: ${systemInfo.os}\nResolution: ${systemInfo.screenResolution}\nTheme: ${systemInfo.theme}\nLanguage: ${systemInfo.language}\nURL: ${systemInfo.currentUrl}`
        : '';

      const activeScreenshots = includeScreenshot ? screenshots : [];
      const uploadedScreenshotUrls: string[] = [];

      if (activeScreenshots.length > 0) {
        for (let i = 0; i < activeScreenshots.length; i++) {
          setUploadStatusText(
            isHindi
              ? `स्क्रीनशॉट अपलोड हो रहा है (${i + 1}/${activeScreenshots.length})...`
              : `Uploading screenshot (${i + 1}/${activeScreenshots.length})...`
          );
          try {
            const url = await postService.uploadPostMedia(activeScreenshots[i].dataUrl, false);
            uploadedScreenshotUrls.push(url);
          } catch {
            // Keep compressed data URL fallback if cloud upload fails
            uploadedScreenshotUrls.push(activeScreenshots[i].dataUrl);
          }
        }
      }

      setUploadStatusText(isHindi ? 'प्रतिक्रिया भेजी जा रही है...' : 'Sending feedback...');

      const screenshotNotice =
        uploadedScreenshotUrls.length > 0
          ? `\n[${uploadedScreenshotUrls.length} screenshot${uploadedScreenshotUrls.length > 1 ? 's' : ''} attached]`
          : '';

      await feedbackService.submitFeedback({
        uid: currentUser?.uid || currentUserProfile?.uid || 'guest-feedback',
        username: currentUserProfile?.username || 'Community Member',
        type: 'feedback',
        subject: `[${feedbackType.toUpperCase()}] ${formattedSubject}`,
        message: `${message.trim()}${screenshotNotice}${systemInfoSummary}`,
        ...(uploadedScreenshotUrls.length > 0
          ? {
              screenshotUrl: uploadedScreenshotUrls[0],
              screenshotUrls: uploadedScreenshotUrls
            }
          : {})
      });

      setSubmitted(true);
      setScreenshots([]);
      addToast(isHindi ? 'प्रतिक्रिया भेजने के लिए धन्यवाद!' : 'Thank you for your feedback!', 'success');
    } catch {
      addToast(isHindi ? 'प्रतिक्रिया भेजने में विफल।' : 'Failed to send feedback.', 'error');
    } finally {
      setSubmitting(false);
      setUploadStatusText('');
    }
  };

  // Success view (Exact YouTube style)
  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-[28px] p-8 sm:p-10 text-center space-y-5 shadow-xs animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isHindi ? 'प्रतिक्रिया के लिए धन्यवाद' : 'Thank you for the feedback'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              {isHindi
                ? 'आपकी प्रतिक्रिया सोशलइंडिया को सभी के लिए बेहतर बनाने में मदद करती है। हमारी टीम का जवाब आपको सीधे आपकी सूचनाओं (Notifications) में मिलेगा।'
                : 'Your feedback helps make SocialIndia better for everyone. Any reply from our team will appear directly in your Notifications.'}
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setMessage('');
                setSubject('');
                setScreenshots([]);
              }}
              className="h-10 px-5 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {isHindi ? 'और प्रतिक्रिया भेजें' : 'Send more feedback'}
            </button>

            <button
              type="button"
              onClick={() => navigate('home')}
              className="h-10 px-6 rounded-full bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              {isHindi ? 'होमपेज पर वापस जाएं' : 'Return to SocialIndia'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f0f] text-slate-900 dark:text-[#f1f1f1] font-['Plus_Jakarta_Sans',sans-serif] py-6 sm:py-10 px-4 sm:px-6">
      {/* Hidden Gallery Input (No capture attr so Android/iOS opens Gallery & Photos chooser directly) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleGalleryInputChange}
        className="hidden"
      />

      {/* Centered YouTube "Send Feedback" Dialog Container */}
      <div className="max-w-xl mx-auto bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-xs">
        {/* Header Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#065fd4] dark:text-[#3ea6ff] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isHindi ? 'सोशलइंडिया को प्रतिक्रिया भेजें' : 'Send feedback to SocialIndia'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-10">
              {isHindi
                ? 'हम आपकी प्रतिक्रिया की सराहना करते हैं। यह हमारे उत्पादों को बेहतर बनाने में मदद करती है।'
                : 'We appreciate your feedback. It helps us improve our product for creators and viewers.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('home')}
            aria-label="Close"
            className="p-1.5 -mr-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Feedback Type Selector (Pills) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {isHindi ? 'आप किस विषय में प्रतिक्रिया दे रहे हैं?' : 'What kind of feedback do you have?'}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'feature', label: isHindi ? 'सुझाव / विचार' : 'Feature suggestion' },
                { id: 'bug', label: isHindi ? 'समस्या / बग रिपोर्ट' : 'Report an issue' },
                { id: 'playback', label: isHindi ? 'वीडियो व ऑडियो' : 'Video playback' },
                { id: 'creator', label: isHindi ? 'क्रिएटर व अपलोड' : 'Creator & Upload' },
                { id: 'general', label: isHindi ? 'सामान्य' : 'General thought' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFeedbackType(pill.id as any)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs transition-colors cursor-pointer ${
                    feedbackType === pill.id
                      ? 'yt-chip-active shadow-xs'
                      : 'yt-chip-inactive'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Short Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isHindi ? 'शीर्षक (वैकल्पिक)' : 'Summary (optional)'}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isHindi ? 'उदा. डार्क मोड में वीडियो प्लेयर कंट्रोल...' : 'e.g. Player controls in dark mode, Upload speed...'}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#272727] text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff]"
            />
          </div>

          {/* Main Feedback Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isHindi ? 'प्रतिक्रिया विवरण' : 'Describe your feedback'}
              </label>
              <span className="text-[11px] text-slate-400">
                {message.length}/2,000
              </span>
            </div>
            <textarea
              required
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isHindi
                  ? 'अपनी प्रतिक्रिया साझा करें। कृपया पासवर्ड या निजी जानकारी न लिखें। यदि सहायता चाहिए तो सहायता केंद्र पर जाएं।'
                  : "Have feedback? We'd love to hear it, but please don't share sensitive information. Have questions or need help? Go to the Help Center."
              }
              className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#272727] text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff] focus:ring-1 focus:ring-[#065fd4] resize-none leading-relaxed"
            />
          </div>

          {/* Screenshot Attachment from Gallery */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#222222] border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeScreenshot}
                  onChange={(e) => setIncludeScreenshot(e.target.checked)}
                  className="w-4 h-4 rounded text-[#065fd4] focus:ring-[#065fd4]"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  {isHindi ? 'स्क्रीनशॉट शामिल करें' : 'Include screenshot'}
                </span>
              </label>

              <button
                type="button"
                onClick={openGalleryPicker}
                disabled={isProcessingImage || screenshots.length >= MAX_SCREENSHOTS}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#065fd4] dark:text-[#3ea6ff] hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5" />
                )}
                <span>
                  {screenshots.length > 0
                    ? isHindi
                      ? 'गैलरी से और जोड़ें'
                      : 'Add from gallery'
                    : isHindi
                      ? 'गैलरी से चुनें'
                      : 'Choose from gallery'}
                </span>
              </button>
            </div>

            {includeScreenshot && (
              <>
                {screenshots.length === 0 ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={openGalleryPicker}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openGalleryPicker();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                      if (e.dataTransfer.files?.length) {
                        await processSelectedFiles(e.dataTransfer.files);
                      }
                    }}
                    className={`relative min-h-[112px] w-full rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 p-4 text-center ${
                      isDraggingOver
                        ? 'border-[#065fd4] bg-blue-50/70 dark:bg-blue-950/30'
                        : 'border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-[#181818] hover:border-[#065fd4] dark:hover:border-[#3ea6ff]'
                    }`}
                  >
                    {isProcessingImage ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin text-[#065fd4] dark:text-[#3ea6ff]" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {isHindi ? 'स्क्रीनशॉट तैयार हो रहा है...' : 'Loading screenshot...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#065fd4] dark:text-[#3ea6ff] flex items-center justify-center">
                          <ImagePlus className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {isHindi ? 'गैलरी से स्क्रीनशॉट चुनने के लिए टैप करें' : 'Tap to choose a screenshot from your gallery'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {isHindi
                              ? `PNG, JPG या WebP · अधिकतम ${MAX_SCREENSHOTS} स्क्रीनशॉट`
                              : `PNG, JPG or WebP · Up to ${MAX_SCREENSHOTS} screenshots`}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {screenshots.map((shot) => (
                      <div
                        key={shot.id}
                        className="relative group rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 aspect-video sm:aspect-[4/3]"
                      >
                        <img
                          src={shot.dataUrl}
                          alt={shot.name}
                          onClick={() => openHighlightEditor(shot.id)}
                          className="w-full h-full object-cover cursor-pointer"
                        />

                        <button
                          type="button"
                          onClick={() => removeScreenshot(shot.id)}
                          aria-label={isHindi ? 'स्क्रीनशॉट हटाएं' : 'Remove screenshot'}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/75 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openHighlightEditor(shot.id)}
                          className="absolute inset-x-1.5 bottom-1.5 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black/90 text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>{isHindi ? 'हाइलाइट / छुपाएं' : 'Highlight / Hide'}</span>
                        </button>
                      </div>
                    ))}

                    {screenshots.length < MAX_SCREENSHOTS && (
                      <button
                        type="button"
                        onClick={openGalleryPicker}
                        disabled={isProcessingImage}
                        className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#065fd4] dark:hover:border-[#3ea6ff] bg-white/70 dark:bg-[#181818] aspect-video sm:aspect-[4/3] flex flex-col items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-[#065fd4] dark:hover:text-[#3ea6ff] transition-colors cursor-pointer"
                      >
                        <ImagePlus className="w-5 h-5" />
                        <span className="text-[11px] font-semibold">
                          {isHindi ? 'और जोड़ें' : 'Add another'}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* System Information Toggle & Drawer */}
          <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden">
            <div className="p-3.5 bg-slate-50 dark:bg-[#222222] flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSystemInfo}
                  onChange={(e) => setIncludeSystemInfo(e.target.checked)}
                  className="w-4 h-4 rounded text-[#065fd4] focus:ring-[#065fd4]"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-slate-500" />
                  {isHindi ? 'सिस्टम जानकारी शामिल करें' : 'Include system information'}
                </span>
              </label>

              {includeSystemInfo && (
                <button
                  type="button"
                  onClick={() => setShowSystemInfoDetails(!showSystemInfoDetails)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full cursor-pointer"
                >
                  {showSystemInfoDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {includeSystemInfo && showSystemInfoDetails && (
              <div className="p-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181818] text-[11px] text-slate-600 dark:text-slate-400 space-y-1 font-mono">
                <div><strong className="text-slate-900 dark:text-slate-200">OS:</strong> {systemInfo.os}</div>
                <div><strong className="text-slate-900 dark:text-slate-200">Resolution:</strong> {systemInfo.screenResolution}</div>
                <div><strong className="text-slate-900 dark:text-slate-200">Theme:</strong> {systemInfo.theme}</div>
                <div><strong className="text-slate-900 dark:text-slate-200">Language:</strong> {systemInfo.language}</div>
                <div className="truncate"><strong className="text-slate-900 dark:text-slate-200">URL:</strong> {systemInfo.currentUrl}</div>
              </div>
            )}
          </div>

          {/* Standard Legal Privacy Disclaimer */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {isHindi ? (
              <>
                कुछ खाता और सिस्टम जानकारी सोशलइंडिया को भेजी जा सकती है। हम इसे समस्याओं को ठीक करने और अपनी सेवाओं को बेहतर बनाने के लिए हमारी{' '}
                <button type="button" onClick={() => navigate('privacy')} className="text-[#065fd4] dark:text-[#3ea6ff] hover:underline">
                  गोपनीयता नीति
                </button>{' '}
                और{' '}
                <button type="button" onClick={() => navigate('terms')} className="text-[#065fd4] dark:text-[#3ea6ff] hover:underline">
                  सेवा की शर्तों
                </button>{' '}
                के अनुसार उपयोग करेंगे।
              </>
            ) : (
              <>
                Some account and system info may be sent to SocialIndia. We will use it to fix problems and improve our services, subject to our{' '}
                <button type="button" onClick={() => navigate('privacy')} className="text-[#065fd4] dark:text-[#3ea6ff] hover:underline">
                  Privacy Policy
                </button>{' '}
                and{' '}
                <button type="button" onClick={() => navigate('terms')} className="text-[#065fd4] dark:text-[#3ea6ff] hover:underline">
                  Terms of Service
                </button>.
              </>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate('help')}
              className="text-xs font-semibold text-[#065fd4] dark:text-[#3ea6ff] hover:underline cursor-pointer flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{isHindi ? 'सहायता केंद्र पर जाएं' : 'Go to Help Center'}</span>
            </button>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="h-10 px-4 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="h-10 px-6 rounded-full bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 active:scale-98"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                <span>{submitting && uploadStatusText ? uploadStatusText : isHindi ? 'भेजें' : 'Send'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SCREENSHOT HIGHLIGHT / PRIVACY BLACKOUT MODAL */}
      {editingScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#1e1f20] rounded-[24px] max-w-lg w-full p-5 sm:p-6 space-y-4 border border-slate-300 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[#065fd4] dark:text-[#3ea6ff]" />
                <span>{isHindi ? 'स्क्रीनशॉट हाइलाइट या ब्लैकआउट करें' : 'Highlight or hide info'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingScreenshotId(null);
                  setAnnotations([]);
                  setDraftBox(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isHindi
                ? 'समस्या वाले हिस्से पर बॉक्स खींचकर हाइलाइट करें या निजी जानकारी छुपाने के लिए ब्लैकआउट करें।'
                : 'Drag across the screenshot to highlight an issue or blackout sensitive details.'}
            </p>

            {/* Tool Toggle */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnnotationMode('highlight')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                    annotationMode === 'highlight'
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'हाइलाइट' : 'Highlight'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationMode('blackout')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                    annotationMode === 'blackout'
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{isHindi ? 'जानकारी छुपाएं' : 'Hide info'}</span>
                </button>
              </div>

              {annotations.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
                    className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title={isHindi ? 'अंतिम हटाएं' : 'Undo'}
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnotations([])}
                    className="p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                    title={isHindi ? 'सब साफ करें' : 'Clear all'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Screenshot Canvas Area */}
            <div className="flex justify-center bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden p-2">
              <div
                ref={editorContainerRef}
                onPointerDown={handleEditorPointerDown}
                onPointerMove={handleEditorPointerMove}
                onPointerUp={handleEditorPointerUp}
                onPointerCancel={handleEditorPointerUp}
                className="relative inline-block max-h-[55vh] select-none touch-none cursor-crosshair"
              >
                <img
                  src={editingScreenshot.dataUrl}
                  alt={editingScreenshot.name}
                  draggable={false}
                  className="max-h-[52vh] w-auto max-w-full rounded-lg block pointer-events-none"
                />
                {[...annotations, ...(draftBox ? [draftBox] : [])].map((box, idx) => (
                  <div
                    key={idx}
                    style={{
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.w * 100}%`,
                      height: `${box.h * 100}%`
                    }}
                    className={
                      box.mode === 'blackout'
                        ? 'absolute bg-black rounded-xs pointer-events-none'
                        : 'absolute bg-amber-400/30 border-2 border-amber-500 rounded-xs pointer-events-none'
                    }
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => removeScreenshot(editingScreenshot.id)}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isHindi ? 'स्क्रीनशॉट हटाएं' : 'Remove screenshot'}</span>
              </button>

              <button
                type="button"
                onClick={applyAnnotationsAndClose}
                className="h-9 px-5 bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs font-semibold rounded-full cursor-pointer"
              >
                {isHindi ? 'पूर्ण' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
