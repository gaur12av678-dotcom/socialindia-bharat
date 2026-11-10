import React, { useEffect } from 'react';
import { 
  Upload, 
  SquarePen, 
  X
} from 'lucide-react';
import { ShortsLogo } from '../ShortsLogo';
import { useTranslation } from '../../i18n';

interface CreateActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateShort: () => void;
  onUploadVideo: () => void;
  onCreatePost: () => void;
}

/**
 * YouTube-style Mobile Create Action Sheet
 * Clean bottom sheet with circular action buttons, authentic Shorts logo,
 * and direct routing to video upload, shorts studio, and profile post creation.
 */
export const CreateActionSheet: React.FC<CreateActionSheetProps> = ({
  isOpen,
  onClose,
  onCreateShort,
  onUploadVideo,
  onCreatePost,
}) => {
  const { isHindi } = useTranslation();

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
      {/* Dimmed YouTube-style Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Sheet */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-label={isHindi ? 'बनाएं' : 'Create'}
        className="relative w-full max-w-lg bg-white dark:bg-[#212121] rounded-t-[24px] shadow-2xl pt-2 pb-8 sm:pb-6 z-10 animate-in slide-in-from-bottom duration-200 border-t border-slate-100 dark:border-white/5"
      >
        {/* Grab Handle Pill */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-[#717171] rounded-full mx-auto mt-1 mb-2" />

        {/* Header: Title & Close Button */}
        <div className="flex items-center justify-between px-5 py-2">
          <h2 className="text-[17px] font-bold text-slate-900 dark:text-[#f1f1f1] tracking-tight">
            {isHindi ? 'बनाएं' : 'Create'}
          </h2>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#383838] transition-colors cursor-pointer"
            aria-label={isHindi ? 'बंद करें' : 'Close'}
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Action Options List (YouTube standard rows with 48px circle icons) */}
        <div className="mt-1 space-y-0.5 px-2">
          
          {/* 1. Create a Short (With official SocialIndia Clips / Shorts logo) */}
          <button
            onClick={() => {
              onClose();
              onCreateShort();
            }}
            className="w-full flex items-center gap-4 px-3.5 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-[#303030] active:bg-slate-200 dark:active:bg-[#383838] text-left transition-colors cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50/80 dark:bg-blue-950/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-[#235DE5]">
              <ShortsLogo className="w-6 h-6" fill="#235DE5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[15px] font-medium text-slate-900 dark:text-[#f1f1f1] block">
                {isHindi ? 'शॉर्ट्स बनाएं' : 'Create a Short'}
              </span>
            </div>
          </button>

          {/* 2. Upload a Video */}
          <button
            onClick={() => {
              onClose();
              onUploadVideo();
            }}
            className="w-full flex items-center gap-4 px-3.5 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-[#303030] active:bg-slate-200 dark:active:bg-[#383838] text-left transition-colors cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#2f2f2f] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-slate-800 dark:text-slate-100">
              <Upload className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[15px] font-medium text-slate-900 dark:text-[#f1f1f1] block">
                {isHindi ? 'वीडियो अपलोड करें' : 'Upload a video'}
              </span>
            </div>
          </button>

          {/* 3. Create a Post (Routes to profile community tab) */}
          <button
            onClick={() => {
              onClose();
              onCreatePost();
            }}
            className="w-full flex items-center gap-4 px-3.5 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-[#303030] active:bg-slate-200 dark:active:bg-[#383838] text-left transition-colors cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#2f2f2f] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-slate-800 dark:text-slate-100">
              <SquarePen className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[15px] font-medium text-slate-900 dark:text-[#f1f1f1] block">
                {isHindi ? 'पोस्ट बनाएं' : 'Create a post'}
              </span>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
};
