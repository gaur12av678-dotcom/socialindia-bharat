import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { userService } from '../services/userService';
import { videoService } from '../services/videoService';
import { subscriptionService } from '../services/subscriptionService';
import { playlistService } from '../services/playlistService';
import { reportService } from '../services/reportService';
import { User, Video, Playlist, ReportCategory } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { getInitials, formatSubscribers } from '../utils/videoUtils';
import { compressBanner, compressAvatar } from '../utils/imageUtils';
import { updateUserAvatarCache } from '../components/UserAvatar';
import { useTranslation } from '../i18n';
import { 
  Video as VideoIcon, 
  Film, 
  Zap, 
  Info, 
  UserX, 
  Camera, 
  Settings as SettingsIcon, 
  Bookmark, 
  MessageSquare, 
  ArrowLeft,
  Upload,
  Check,
  X,
  Flag,
  Share2,
  Sparkles,
  Loader2
} from 'lucide-react';

const BANNER_PRESETS = [
  { name: 'Bharat Neon Skyline', url: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Cyber Delhi Gate', url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Himalayan Sunrise', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Mumbai Tech Matrix', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Vibrant Festival Beats', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Minimal Dark Studio', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80' },
];

export const CreatorProfile: React.FC = () => {
  const { route, navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast, loading: appLoading, refreshProfile, updateUserProfileState } = useApp();
  const { t, isHindi } = useTranslation();
  
  // Resolve target username safely (remove leading @ and fallback to current logged-in profile if empty)
  const rawParam = route.param;
  const targetUsername = (rawParam || currentUserProfile?.username || '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();

  const [creator, setCreator] = useState<User | null>(() => {
    if (currentUserProfile && (currentUserProfile.username.toLowerCase() === targetUsername || currentUserProfile.uid === rawParam)) {
      return currentUserProfile;
    }
    const cachedByUsername = userService.getCachedUserByUsername(targetUsername);
    if (cachedByUsername) return cachedByUsername;
    if (rawParam) {
      const cachedByUid = userService.getCachedUserProfile(rawParam);
      if (cachedByUid) return cachedByUid;
    }
    return null;
  });
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(!creator);
  const [activeTab, setActiveTab] = useState<'videos' | 'shorts' | 'playlists' | 'about'>('videos');
  const [subscribed, setSubscribed] = useState(() => {
    if (currentUser && creator) {
      return subscriptionService.isSubscribedSync(currentUser.uid, creator.uid);
    }
    return false;
  });
  const [subscribing, setSubscribing] = useState(false);

  // Banner Customization Modal State
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string>(() => creator?.bannerURL || '');
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Channel Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportCategory>('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    if (!targetUsername) {
      if (!appLoading) setLoading(false);
      return;
    }

    let isMounted = true;

    const loadCreatorProfile = async () => {
      // Check cache first so no loading flash occurs
      const cached = userService.getCachedUserByUsername(targetUsername) || (rawParam ? userService.getCachedUserProfile(rawParam) : null);
      if (cached) {
        setCreator(cached);
        setBannerPreview(cached.bannerURL || '');
        setLoading(false);
        if (currentUser) {
          setSubscribed(subscriptionService.isSubscribedSync(currentUser.uid, cached.uid));
        }
      } else if (!creator) {
        setLoading(true);
      }

      try {
        let uProfile: User | null = null;
        if (currentUserProfile && (currentUserProfile.username.toLowerCase() === targetUsername || currentUserProfile.uid === rawParam)) {
          uProfile = currentUserProfile;
        } else {
          uProfile = await userService.getUserByUsername(targetUsername);
          if (!uProfile && rawParam) {
            uProfile = await userService.getUserProfile(rawParam);
          }
        }

        if (!isMounted) return;

        if (!uProfile) {
          if (!cached) setCreator(null);
          setLoading(false);
          return;
        }

        setCreator(uProfile);
        setBannerPreview(uProfile.bannerURL || '');

        // Fetch subscriptions, videos, and playlists in PARALLEL (No waterfall!)
        const [subResult, vidsResult, plsResult] = await Promise.allSettled([
          currentUser ? subscriptionService.isSubscribed(currentUser.uid, uProfile.uid) : Promise.resolve(false),
          videoService.getCreatorVideos(uProfile.uid),
          playlistService.getUserPlaylists(uProfile.uid, uProfile.username, uProfile.displayName)
        ]);

        if (isMounted) {
          if (subResult.status === 'fulfilled') {
            setSubscribed(subResult.value);
          }
          if (vidsResult.status === 'fulfilled') {
            const publicVids = vidsResult.value.filter(v => v.visibility === 'public');
            setVideos(publicVids.filter(v => !v.isShort));
            setShorts(publicVids.filter(v => v.isShort));
          }
          if (plsResult.status === 'fulfilled') {
            setPlaylists(plsResult.value);
          }
        }

      } catch (err) {
        console.error('Failed to load creator profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCreatorProfile();

    return () => { isMounted = false; };
  }, [targetUsername, currentUser, currentUserProfile]);

  // Loading skeleton
  if (loading && !creator) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8 animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-48 md:h-72 bg-slate-200 dark:bg-[#1E293B] rounded-3xl w-full" />
        
        {/* Channel Details Skeleton */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 px-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-slate-300 dark:bg-[#334155] rounded-full shrink-0 -mt-12 sm:-mt-16 border-4 border-white dark:border-[#0f172a]" />
          <div className="flex-1 space-y-3 text-center sm:text-left pt-2">
            <div className="h-7 bg-slate-200 dark:bg-[#1E293B] rounded-xl w-48 mx-auto sm:mx-0" />
            <div className="h-4 bg-slate-200 dark:bg-[#1E293B] rounded-lg w-36 mx-auto sm:mx-0" />
            <div className="h-4 bg-slate-200 dark:bg-[#1E293B] rounded-lg w-64 mx-auto sm:mx-0" />
            <div className="flex gap-3 pt-2 justify-center sm:justify-start">
              <div className="h-10 w-32 bg-slate-200 dark:bg-[#1E293B] rounded-2xl" />
              <div className="h-10 w-28 bg-slate-200 dark:bg-[#1E293B] rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800 pb-3 px-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-slate-200 dark:bg-[#1E293B] rounded-lg" />
          ))}
        </div>

        {/* Video Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-video bg-slate-200 dark:bg-[#1E293B] rounded-2xl w-full" />
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-[#1E293B] rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-[#1E293B] rounded-lg w-[90%]" />
                  <div className="h-3 bg-slate-200 dark:bg-[#1E293B] rounded-lg w-[60%]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <UserX className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-bold">Creator Profile Not Found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          No channel was found registered with username "<strong>{targetUsername || 'unknown'}</strong>".
        </p>
        <button 
          onClick={() => navigate('home')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isOwner = currentUser?.uid === creator.uid;

  const handleShareChannel = () => {
    if (!creator) return;
    const shareData = {
      title: creator.displayName,
      text: isHindi ? `SocialIndia पर @${creator.username} का चैनल देखें!` : `Check out @${creator.username}'s channel on SocialIndia!`,
      url: window.location.href,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast(isHindi ? 'चैनल लिंक क्लिपबोर्ड पर कॉपी हो गया!' : 'Channel link copied to clipboard!', 'success');
    }
  };

  const handleSubscribeToggle = async () => {
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to subscribe to this channel.', 'info');
      navigate('signin');
      return;
    }
    if (subscribing) return;
    setSubscribing(true);

    const previousSub = subscribed;
    const nextSub = !previousSub;

    // Instant optimistic update (YouTube style)
    setSubscribed(nextSub);
    setCreator(prev => prev ? { ...prev, followersCount: Math.max(0, (prev.followersCount || 0) + (nextSub ? 1 : -1)) } : null);

    try {
      const isSub = await subscriptionService.toggleSubscription(currentUser.uid, creator.uid, {
        username: creator.username,
        displayName: creator.displayName,
        photoURL: creator.photoURL
      }, nextSub);
      setSubscribed(isSub);
    } catch (err) {
      setSubscribed(previousSub);
      setCreator(prev => prev ? { ...prev, followersCount: Math.max(0, (prev.followersCount || 0) + (previousSub ? 1 : -1)) } : null);
      addToast('Subscription change failed.', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      addToast('Compressing banner image...', 'info');
      const compressed = await compressBanner(file);
      setBannerPreview(compressed);
    } catch (err) {
      console.error(err);
      addToast('Failed to process banner image.', 'error');
    }
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creator) return;

    const targetUid = currentUser?.uid || creator.uid;

    try {
      addToast(isHindi ? 'अवतार इमेज प्रोसेस हो रही है...' : 'Compressing avatar image...', 'info');
      const compressed = await compressAvatar(file);
      updateUserProfileState({ photoURL: compressed });
      setCreator(prev => prev ? { ...prev, photoURL: compressed } : null);
      updateUserAvatarCache(targetUid, compressed, creator.displayName || creator.username);
      
      // Update Firestore profile
      await userService.updateProfile(targetUid, { photoURL: compressed });
      
      // Sync to all uploaded videos by this creator so they don't show old avatar
      videoService.syncCreatorProfileToVideos(targetUid, { photoURL: compressed }).catch(console.warn);
      
      await refreshProfile();
      addToast(isHindi ? '🎉 चैनल अवतार स्थायी रूप से अपडेट हो गया!' : '🎉 Channel avatar updated permanently!', 'success');
    } catch (err) {
      console.error(err);
      addToast(isHindi ? 'अवतार अपडेट करने में विफल।' : 'Failed to update avatar image.', 'error');
    }
  };

  const handleSaveBanner = async () => {
    if (!creator) return;
    const targetUid = currentUser?.uid || creator.uid;
    setIsSavingBanner(true);
    try {
      let finalBanner = bannerPreview;
      if (finalBanner && finalBanner.startsWith('data:image')) {
        finalBanner = await compressBanner(finalBanner);
      }
      updateUserProfileState({ bannerURL: finalBanner });
      setCreator(prev => prev ? { ...prev, bannerURL: finalBanner } : null);
      await userService.updateProfile(targetUid, {
        bannerURL: finalBanner,
      });
      await refreshProfile();
      setBannerModalOpen(false);
      addToast(isHindi ? '🎉 चैनल बैनर स्थायी रूप से अपडेट हो गया!' : '🎉 Channel banner updated permanently!', 'success');
    } catch (err) {
      console.error(err);
      addToast(isHindi ? 'चैनल बैनर सेव करने में विफल।' : 'Failed to save channel banner.', 'error');
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!creator) return;
    const targetUid = currentUser?.uid || creator.uid;
    setIsSavingBanner(true);
    try {
      updateUserProfileState({ bannerURL: '' });
      setCreator(prev => prev ? { ...prev, bannerURL: '' } : null);
      setBannerPreview('');
      await userService.updateProfile(targetUid, {
        bannerURL: '',
      });
      await refreshProfile();
      setBannerModalOpen(false);
      addToast(isHindi ? 'चैनल बैनर डिफ़ॉल्ट पर रीसेट हो गया।' : 'Channel banner reset to default.', 'info');
    } catch (err) {
      addToast(isHindi ? 'बैनर हटाने में विफल।' : 'Failed to remove banner.', 'error');
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleReportChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      addToast('Please sign in to report this channel.', 'info');
      navigate('signin');
      return;
    }

    setIsSubmittingReport(true);
    try {
      await reportService.submitReport(
        currentUser.uid,
        'creator',
        creator.uid,
        reportReason,
        reportDetails,
        false,
        currentUserProfile?.username,
        `Channel: @${creator.username} (${creator.displayName})`
      );
      setReportModalOpen(false);
      setReportDetails('');
      addToast('Grievance & Channel Report submitted. Our Trust & Safety team will review within 24 hours.', 'success');
    } catch (err) {
      addToast('Failed to submit channel report.', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      
      {/* YOUTUBE-STYLE CHANNEL HEADER CONTAINER */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] rounded-3xl overflow-hidden shadow-xs">
        
        {/* 1. CHANNEL BANNER (YouTube 16:9 / 6:1 Responsive Panoramic Aspect) */}
        <div className="relative w-full h-40 sm:h-52 md:h-64 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-950 overflow-hidden flex items-center justify-center group/banner">
          
          {/* Mobile Back Button */}
          <button
            onClick={() => navigate('home')}
            className="absolute top-3 left-3 md:hidden p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-xl flex items-center justify-center transition-all border border-white/20 cursor-pointer shadow-xs z-20"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {creator.bannerURL ? (
            <img 
              src={creator.bannerURL} 
              alt={`${creator.displayName} Banner`} 
              className="w-full h-full object-cover group-hover/banner:scale-101 transition-transform duration-500"
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-800 via-indigo-900 to-slate-950 text-white/40 font-black text-2xl md:text-5xl tracking-widest uppercase select-none px-6 text-center">
              <span className="drop-shadow-lg">{creator.displayName}</span>
            </div>
          )}

          {/* Gradient shadow overlay at banner bottom for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* Quick YouTube-Style Customize Banner Button for Channel Owner */}
          {isOwner && (
            <button
              onClick={() => {
                setBannerPreview(creator.bannerURL || '');
                setBannerModalOpen(true);
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 px-3.5 py-2 bg-black/70 hover:bg-black/90 backdrop-blur-md text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all border border-white/20 cursor-pointer shadow-lg active:scale-95 z-20 group"
              title="Customize YouTube-style Channel Banner"
            >
              <Camera className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform" />
              <span>Change Banner</span>
            </button>
          )}
        </div>

        {/* 2. CHANNEL DETAILS ROW */}
        <div className="p-4 sm:p-6 pt-0 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left relative">
          
          {/* Compact YouTube-Style Avatar Overlapping Banner */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl border-4 border-white dark:border-[#111827] shadow-xl overflow-hidden shrink-0 -mt-10 sm:-mt-12 z-10 relative group">
            {creator.photoURL ? (
              <img src={creator.photoURL} alt={creator.username} className="w-full h-full object-cover" />
            ) : (
              <span>{getInitials(creator.displayName)}</span>
            )}
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer rounded-full"
                  title="Change Avatar"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] font-bold mt-0.5">Edit</span>
                </button>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Details & Metadata */}
          <div className="flex-1 min-w-0 space-y-1.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC] flex items-center justify-center sm:justify-start gap-1.5">
                <span>{creator.displayName}</span>
                {(creator.role === 'creator' || creator.role === 'admin') && (
                  <span className="inline-flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-[10px] w-4.5 h-4.5 rounded-full font-black shrink-0 shadow-sm" title="Verified Channel">✓</span>
                )}
              </h1>
            </div>

            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-bold">
              @{creator.username}
            </p>

            <div className="flex items-center gap-3 justify-center sm:justify-start text-xs font-bold text-slate-600 dark:text-[#94A3B8]">
              <span>{isHindi ? `${formatSubscribers(creator.followersCount).replace(/subscribers/i, '').trim()} सब्सक्राइबर्स` : formatSubscribers(creator.followersCount)}</span>
              <span>•</span>
              <span>{creator.videosCount} {isHindi ? 'वीडियो' : (creator.videosCount === 1 ? 'video' : 'videos')}</span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 max-w-2xl font-medium line-clamp-2 pt-1">
              {creator.bio || (isHindi ? "SocialIndia पर मेरे आधिकारिक चैनल में आपका स्वागत है! बेहतरीन वीडियो के लिए जुड़े रहें।" : "Welcome to my SocialIndia official channel! Stay tuned for awesome videos.")}
            </p>
          </div>

          {/* Action Buttons: Subscribe OR Edit Settings / Banner */}
          <div className="shrink-0 pt-2 sm:pt-4 flex items-center gap-2">
            {isOwner ? (
              <>
                <button
                  onClick={() => {
                    setBannerPreview(creator.bannerURL || '');
                    setBannerModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isHindi ? 'बैनर बदलें' : 'Banner'}</span>
                </button>
                <button
                  onClick={() => navigate('studio')}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-[#F8FAFC] font-extrabold text-xs rounded-xl flex items-center gap-2 border border-slate-200 dark:border-[#334155] cursor-pointer shadow-xs transition-all"
                >
                  <SettingsIcon className="w-4 h-4 text-blue-500" />
                  <span>{t('nav_studio', 'Creator Studio')}</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('chat', creator.uid)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-[#F8FAFC] font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-[#334155] cursor-pointer shadow-xs transition-all"
                  title={`Message ${creator.displayName}`}
                >
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>{isHindi ? 'मैसेज' : 'Message'}</span>
                </button>
                <button
                  onClick={handleShareChannel}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-[#F8FAFC] font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-[#334155] cursor-pointer shadow-xs transition-all"
                  title={isHindi ? 'चैनल शेयर करें' : 'Share Channel'}
                >
                  <Share2 className="w-4 h-4 text-blue-500" />
                  <span>{isHindi ? 'शेयर' : 'Share'}</span>
                </button>
                <button
                  onClick={handleSubscribeToggle}
                  disabled={subscribing}
                  className={`px-6 py-2.5 rounded-xl font-extrabold text-xs tracking-wide transition-all cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-2 ${
                    subscribed 
                      ? 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#334155] hover:bg-slate-200' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  }`}
                >
                  {subscribed ? (
                    <>
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{t('action_subscribed', 'Subscribed')}</span>
                    </>
                  ) : (
                    <span>{t('action_subscribe', 'Subscribe')}</span>
                  )}
                </button>
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="p-2.5 bg-slate-100 dark:bg-[#1E293B] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-[#334155]"
                  title={isHindi ? 'चैनल रिपोर्ट करें' : 'Report Channel'}
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Sections navigation tab */}
      <div className="flex border-b border-slate-200 dark:border-[#334155] gap-6">
        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer relative ${activeTab === 'videos' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <VideoIcon className="w-4 h-4" />
          <span>{t('tab_videos', 'Videos')} ({videos.length})</span>
          {activeTab === 'videos' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
        </button>
        <button
          onClick={() => setActiveTab('shorts')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer relative ${activeTab === 'shorts' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Zap className="w-4 h-4" />
          <span>{t('tab_shorts', 'Shorts')} ({shorts.length})</span>
          {activeTab === 'shorts' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer relative ${activeTab === 'playlists' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Bookmark className="w-4 h-4" />
          <span>{t('tab_playlists', 'Playlists')} ({playlists.length})</span>
          {activeTab === 'playlists' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer relative ${activeTab === 'about' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Info className="w-4 h-4" />
          <span>{t('tab_about', 'About')}</span>
          {activeTab === 'about' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
        </button>
      </div>

      {/* Tab views layout */}
      <div className="pt-2">
        {activeTab === 'videos' && (
          <VideoGrid 
            videos={videos} 
            loading={false} 
            emptyHeading={isHindi ? "कोई सामान्य वीडियो नहीं" : "No standard videos"}
            emptyMessage={isHindi ? "इस क्रिएटर ने अभी तक कोई सामान्य वीडियो प्रकाशित नहीं किया है।" : "This creator has not published any standard videos yet."}
          />
        )}

        {activeTab === 'shorts' && (
          <VideoGrid 
            videos={shorts} 
            loading={false} 
            emptyHeading={isHindi ? "कोई शॉर्ट वीडियो नहीं" : "No short videos"}
            emptyMessage={isHindi ? "इस क्रिएटर ने अभी तक कोई शॉर्ट वीडियो प्रकाशित नहीं किया है।" : "This creator has not published any short videos yet."}
          />
        )}

        {activeTab === 'playlists' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 font-bold">
                {isHindi ? "इस चैनल द्वारा अभी तक कोई प्लेलिस्ट नहीं बनाई गई है।" : "No public playlists created by this channel yet."}
              </div>
            ) : (
              playlists.map(pl => (
                <div 
                  key={pl.playlistId}
                  onClick={() => {
                    if (pl.videoIds && pl.videoIds.length > 0) {
                      navigate('watch', pl.videoIds[0]);
                    } else {
                      addToast(isHindi ? 'यह प्लेलिस्ट अभी खाली है।' : 'This playlist is currently empty.', 'info');
                    }
                  }}
                  className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {pl.thumbnailUrl ? (
                      <img src={pl.thumbnailUrl} alt={pl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <Film className="w-10 h-10 text-slate-600" />
                    )}
                    <div className="absolute inset-y-0 right-0 w-1/3 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2">
                      <span className="font-mono font-black text-sm">{pl.videoIds?.length || 0}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-300">{isHindi ? 'वीडियो' : 'Videos'}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-1">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                      {pl.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
                      {pl.description || (isHindi ? "SocialIndia पर निर्मित" : "Created on SocialIndia")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl space-y-4 max-w-xl shadow-xs">
            <h3 className="text-xs font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC] tracking-wider">
              {isHindi ? "चैनल के बारे में" : "About this Channel"}
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {creator.bio || (isHindi ? "इस क्रिएटर ने अभी तक चैनल का कोई अतिरिक्त विवरण नहीं दिया है।" : "This creator has not provided any additional channel biography.")}
            </p>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">
              <div className="flex justify-between">
                <span>{isHindi ? "देश" : "Country"}</span>
                <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{creator.country || 'India 🇮🇳'}</span>
              </div>
              <div className="flex justify-between">
                <span>{isHindi ? "SocialIndia से जुड़े" : "Joined SocialIndia"}</span>
                <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{new Date(creator.createdAt).toLocaleDateString(isHindi ? 'hi-IN' : 'en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span>{isHindi ? "कुल चैनल सब्सक्राइबर्स" : "Total Channel Subscribers"}</span>
                <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{creator.followersCount}</span>
              </div>
              <div className="flex justify-between">
                <span>{isHindi ? "कुल अपलोड किए गए वीडियो" : "Total Videos Uploaded"}</span>
                <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{creator.videosCount}</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={handleShareChannel}
                className="w-full py-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-900 cursor-pointer transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>{isHindi ? 'चैनल शेयर करें' : 'Share Channel'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* YOUTUBE-STYLE CHANNEL BANNER CUSTOMIZER MODAL */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16171d] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Channel Banner Customizer
                </h3>
              </div>
              <button 
                onClick={() => setBannerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Banner Preview Box */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Live Banner Preview (Recommended: 2048 x 1152 px)
              </label>
              <div className="w-full h-36 sm:h-44 rounded-2xl bg-slate-950 overflow-hidden relative border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-slate-500">No Banner Image Selected</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md overflow-hidden">
                    {creator.photoURL ? <img src={creator.photoURL} className="w-full h-full object-cover" /> : getInitials(creator.displayName)}
                  </div>
                  <span className="text-xs font-bold text-white drop-shadow-md">{creator.displayName}</span>
                </div>
              </div>
            </div>

            {/* Upload Custom File */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                1. Upload from Your Device
              </span>
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleBannerFileSelect} 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose Image File...</span>
                </button>
                <span className="text-[11px] text-slate-400">JPG, PNG, WebP up to 5MB</span>
              </div>
            </div>

            {/* Curated Indian Creator Preset Gallery */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                2. Or Select a Curated Creator Theme Preset
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setBannerPreview(preset.url)}
                    className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer group text-left ${
                      bannerPreview === preset.url 
                        ? 'border-blue-500 ring-2 ring-blue-500/30' 
                        : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-end">
                      <span className="text-[10px] font-black text-white truncate">{preset.name}</span>
                    </div>
                    {bannerPreview === preset.url && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                3. Or Paste Banner Image URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/channel-banner.jpg"
                value={bannerPreview}
                onChange={(e) => setBannerPreview(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleRemoveBanner}
                disabled={isSavingBanner || !creator.bannerURL}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 transition-colors"
              >
                Remove Banner
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  disabled={isSavingBanner || !bannerPreview}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95 transition-all"
                >
                  {isSavingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Save Banner</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CHANNEL REPORT MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleReportChannel} className="bg-white dark:bg-[#16171d] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600">
                <Flag className="w-5 h-5" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Report Channel: @{creator.username}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Reporting:
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as ReportCategory)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="harassment">Harassment or Cyberbullying</option>
                <option value="impersonation">Impersonation / Fake Identity</option>
                <option value="copyright">Copyright Infringement</option>
                <option value="illegal">Illegal or Dangerous Content</option>
                <option value="privacy">Privacy Violation / Doxxing</option>
                <option value="child_safety">Child Harmful / Child Safety</option>
                <option value="spam">Spam, Scams or Bots</option>
                <option value="sensitive_24h">Urgent 24h Takedown (Intimate / Sexual content)</option>
                <option value="other">Other Violation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Additional Details:
              </label>
              <textarea
                required
                rows={3}
                placeholder="Please describe why this channel violates SocialIndia guidelines..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReport}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                <span>Submit Grievance</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
