import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../hooks/useRouter';
import { postService } from '../../services/postService';
import { compressImage } from '../../utils/imageUtils';
import { UserAvatar } from '../UserAvatar';
import { useTranslation } from '../../i18n';
import { 
  Image as ImageIcon, 
  BarChart2, 
  Smile, 
  X, 
  Plus, 
  Trash2, 
  Loader2, 
  Sparkles,
  Send,
  CheckCircle2
} from 'lucide-react';

interface CreatePostBoxProps {
  onPostCreated?: () => void;
  className?: string;
}

export const CreatePostBox: React.FC<CreatePostBoxProps> = ({ onPostCreated, className = '' }) => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  const [postType, setPostType] = useState<'text' | 'image' | 'poll'>('text');
  const [content, setContent] = useState('');
  
  // Image attachments
  const [images, setImages] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll options
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Submit state
  const [isPosting, setIsPosting] = useState(false);

  if (!currentUser) {
    return (
      <div className={`bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center ${className}`}>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          {isHindi ? 'कम्युनिटी पोस्ट, इमेज या पोल शेयर करने के लिए साइन इन करें।' : 'Sign in to publish community posts, share images, or create polls.'}
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
      addToast(isHindi ? 'आप एक पोस्ट में अधिकतम 4 इमेजेस जोड़ सकते हैं।' : 'You can attach up to 4 images per post.', 'error');
      return;
    }

    setIsProcessingImage(true);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i], 1200, 1200, 0.82);
        compressedList.push(compressed);
      }
      setImages(prev => [...prev, ...compressedList].slice(0, 4));
      setPostType('image');
    } catch {
      addToast(isHindi ? 'इमेज प्रोसेस करने में विफल।' : 'Failed to process image file.', 'error');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (images.length <= 1) {
      setPostType('text');
    }
  };

  const handlePollOptionChange = (index: number, val: string) => {
    setPollOptions(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleAddPollOption = () => {
    if (pollOptions.length >= 5) {
      addToast(isHindi ? 'अधिकतम 5 पोल विकल्प जोड़ सकते हैं।' : 'Maximum 5 poll options allowed.', 'info');
      return;
    }
    setPollOptions(prev => [...prev, '']);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length <= 2) {
      addToast(isHindi ? 'पोल में कम से कम 2 विकल्प होने चाहिए।' : 'A poll requires at least 2 options.', 'info');
      return;
    }
    setPollOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isPosting) return;

    const trimmedContent = content.trim();

    if (!trimmedContent && postType === 'text') {
      addToast(isHindi ? 'कृपया पोस्ट में कुछ टेक्स्ट लिखें।' : 'Please enter post content.', 'error');
      return;
    }

    if (postType === 'poll') {
      const validOptions = pollOptions.map(o => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        addToast(isHindi ? 'पोल के लिए कम से कम 2 विकल्प लिखें।' : 'Please fill in at least 2 poll options.', 'error');
        return;
      }
    }

    if (postType === 'image' && images.length === 0) {
      addToast(isHindi ? 'कृपया कम से कम एक इमेज जोड़ें।' : 'Please attach an image.', 'error');
      return;
    }

    setIsPosting(true);
    try {
      await postService.createPost({
        authorId: currentUser.uid,
        authorUsername: currentUserProfile?.username || currentUser.displayName?.trim().replace(/\s+/g, '').toLowerCase() || currentUser.email?.split('@')[0] || currentUser.uid,
        authorDisplayName: currentUserProfile?.displayName || currentUser.displayName || currentUserProfile?.username || currentUser.email?.split('@')[0] || 'SocialIndia User',
        authorPhotoURL: currentUserProfile?.photoURL || currentUser.photoURL || '',
        authorRole: currentUserProfile?.role || 'user',
        content: trimmedContent,
        postType,
        images: postType === 'image' ? images : undefined,
        pollOptions: postType === 'poll' ? pollOptions.map(o => o.trim()).filter(Boolean) : undefined
      });

      addToast(isHindi ? '🎉 कम्युनिटी पोस्ट सफलतापूर्वक प्रकाशित हो गई!' : '🎉 Community post published successfully!', 'success');
      
      // Reset form
      setContent('');
      setImages([]);
      setPollOptions(['', '']);
      setPostType('text');

      onPostCreated?.();
    } catch (err: any) {
      console.error('Community post publish failed:', err);
      const errorCode = typeof err?.code === 'string' ? err.code : '';
      addToast(
        isHindi
          ? `पोस्ट सेव नहीं हुई। कृपया दोबारा कोशिश करें। ${errorCode}`.trim()
          : `Post could not be saved. Please try again. ${errorCode}`.trim(),
        'error'
      );
    } finally {
      setIsPosting(false);
    }
  };

  const canSubmit = Boolean(
    content.trim() || 
    (postType === 'image' && images.length > 0) || 
    (postType === 'poll' && pollOptions.filter(o => o.trim()).length >= 2)
  );

  return (
    <div className={`bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs ${className}`}>
      
      {/* Hidden file input for images */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileSelect}
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        accept="image/*"
        multiple
        className="hidden"
      />

      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-extrabold text-slate-900 dark:text-white">
          {isHindi ? 'पोस्ट शेयर करें' : 'Share a photo or video'}
        </p>
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {isHindi ? 'पब्लिक' : 'Public'}
        </span>
      </div>

      {/* Top author row */}
      <div className="flex items-center gap-3 mb-3">
        <UserAvatar
          uid={currentUser.uid}
          fallbackPhotoURL={currentUserProfile?.photoURL || currentUser.photoURL || undefined}
          fallbackDisplayName={currentUserProfile?.displayName || currentUser.displayName || currentUserProfile?.username || currentUser.email || 'SocialIndia User'}
          size="sm"
          className="w-9 h-9"
        />
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {currentUserProfile?.displayName || currentUser.displayName || currentUserProfile?.username || currentUser.email?.split('@')[0] || 'SocialIndia User'}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {isHindi ? 'पब्लिक कम्युनिटी पोस्ट' : 'Public Community Post'}
          </p>
        </div>
      </div>

      {/* Text Area */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          postType === 'poll' 
            ? (isHindi ? 'अपने सब्सक्राइबर्स से कोई सवाल पूछें या पोल का विषय लिखें...' : 'Ask a question or topic for your poll...')
            : (isHindi ? 'अपने सब्सक्राइबर्स के साथ अपडेट, विचार या फ़ोटो शेयर करें...' : 'Give a shout-out to your subscribers or share an update...')
        }
        rows={postType === 'text' ? 3 : 2}
        className="w-full bg-slate-50 dark:bg-[#18181d] border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 resize-none font-medium leading-relaxed"
      />

      {/* Image Previews if postType === 'image' */}
      {postType === 'image' && (
        <div className="mt-3">
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 group border border-slate-200 dark:border-slate-800">
                  <img src={img} alt="Attachment" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < 4 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImage}
              className="px-3.5 py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
            >
              {isProcessingImage ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <ImageIcon className="w-4 h-4 text-blue-500" />}
              <span>{isHindi ? 'फ़ोटो जोड़ें (अधिकतम 4)' : 'Add Photo (Up to 4)'}</span>
            </button>
          )}
        </div>
      )}

      {/* Poll Options Form if postType === 'poll' */}
      {postType === 'poll' && (
        <div className="mt-3 space-y-2 bg-slate-50 dark:bg-[#18181d] p-3 rounded-xl border border-slate-200 dark:border-slate-700/80">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {isHindi ? 'पोल के विकल्प (कम से कम 2)' : 'Poll Options (Min 2, Max 5)'}
          </p>

          <div className="space-y-2">
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-5 text-[11px] font-bold text-slate-400 text-center">{idx + 1}.</span>
                <input
                  type="text"
                  placeholder={`${isHindi ? 'विकल्प' : 'Option'} ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePollOption(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Remove option"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {pollOptions.length < 5 && (
            <button
              type="button"
              onClick={handleAddPollOption}
              className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isHindi ? 'अन्य विकल्प जोड़ें' : 'Add another option'}</span>
            </button>
          )}
        </div>
      )}

      {/* Action Bar (Type switchers + Submit) */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        {/* Post Type Selector Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPostType('image');
              if (images.length === 0) {
                fileInputRef.current?.click();
              }
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              postType === 'image'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span>{isHindi ? 'इमेज' : 'Image'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPostType('poll')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              postType === 'poll'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <span>{isHindi ? 'पोल' : 'Poll'}</span>
          </button>

          {postType !== 'text' && (
            <button
              type="button"
              onClick={() => {
                setPostType('text');
                setImages([]);
              }}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              {isHindi ? 'केवल टेक्स्ट' : 'Text only'}
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isPosting}
          className="min-w-[92px] justify-center px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-600 disabled:opacity-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:cursor-not-allowed"
        >
          {isPosting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{isHindi ? 'प्रकाशित हो रहा है...' : 'Posting...'}</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>{isHindi ? 'पोस्ट करें' : 'Post'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
