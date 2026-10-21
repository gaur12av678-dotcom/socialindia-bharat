import React, { useEffect } from 'react';
import { 
  Zap, 
  Video, 
  FileText, 
  X, 
  ChevronRight,
  Sparkles,
  Camera
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface CreateActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateShort: () => void;
  onUploadVideo: () => void;
  onCreatePost: () => void;
}

export const CreateActionSheet: React.FC<CreateActionSheetProps> = ({
  isOpen,
  onClose,
  onCreateShort,
  onUploadVideo,
  onCreatePost,
}) => {
  const { t, isHindi } = useTranslation();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Dimmed Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-Up Bottom Sheet */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#18181b] rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl p-5 pb-8 space-y-4 z-10 animate-in slide-in-from-bottom duration-300">
        
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />

        {/* Sheet Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              {isHindi ? 'नया कंटेंट बनाएं' : 'Create'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Options List */}
        <div className="space-y-2.5 pt-1">
          
          {/* 1. Create a Short (Dedicated YouTube Shorts Style Studio) */}
          <button
            onClick={() => {
              onClose();
              onCreateShort();
            }}
            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-rose-500/10 via-red-500/5 to-transparent hover:from-rose-500/20 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 text-left transition-all active:scale-98 cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0 group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {isHindi ? 'शॉर्ट बनाएं' : 'Create a Short'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white uppercase tracking-wider">
                    {isHindi ? 'कैमरा' : 'Camera'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  {isHindi 
                    ? 'कैमरे से रिकॉर्ड करें या गैलरी से 60s तक का शॉर्ट चुनें' 
                    : 'Record live with camera or pick from gallery'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors shrink-0" />
          </button>

          {/* 2. Upload a Video */}
          <button
            onClick={() => {
              onClose();
              onUploadVideo();
            }}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/80 hover:bg-blue-50/50 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 text-left transition-all active:scale-98 cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
                <Video className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {isHindi ? 'वीडियो अपलोड करें' : 'Upload a Video'}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  {isHindi 
                    ? 'लंबा वीडियो, ट्यूटोरियल या ब्लॉग पोस्ट करें' 
                    : 'Publish regular or landscape video with monetization'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
          </button>

          {/* 3. Create a Community Post */}
          <button
            onClick={() => {
              onClose();
              onCreatePost();
            }}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/80 hover:bg-amber-50/50 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 text-left transition-all active:scale-98 cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {isHindi ? 'कम्युनिटी पोस्ट बनाएं' : 'Create a Post'}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  {isHindi 
                    ? 'फ़ोटो, पोल या विचार अपने सब्सक्राइबर्स से साझा करें' 
                    : 'Share photo, poll, or announcement with community'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
          </button>

        </div>

      </div>
    </div>
  );
};
