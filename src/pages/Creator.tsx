import React, { useState, useEffect } from 'react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { userService } from '../services/userService';
import { videoService } from '../services/videoService';
import { subscriptionService } from '../services/subscriptionService';
import { User, Video } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { getInitials, formatSubscribers } from '../utils/videoUtils';
import { Video as VideoIcon, Film, Info, UserX, Camera, Settings as SettingsIcon } from 'lucide-react';

export const CreatorProfile: React.FC = () => {
  const { route, navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast } = useApp();
  const username = route.param;

  const [creator, setCreator] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'shorts' | 'about'>('videos');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!username) return;

    const loadCreatorProfile = async () => {
      setLoading(true);
      try {
        const uProfile = await userService.getUserByUsername(username);
        if (!uProfile) {
          setCreator(null);
          setLoading(false);
          return;
        }
        setCreator(uProfile);

        if (currentUser) {
          const isSub = await subscriptionService.isSubscribed(currentUser.uid, uProfile.uid);
          setSubscribed(isSub);
        }

        const creatorVideos = await videoService.getCreatorVideos(uProfile.uid);
        const publicVids = creatorVideos.filter(v => v.visibility === 'public');
        setVideos(publicVids.filter(v => !v.isShort));
        setShorts(publicVids.filter(v => v.isShort));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCreatorProfile();
  }, [username, currentUser]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-36 md:h-52 bg-slate-200 dark:bg-[#1E293B] rounded-2xl w-full" />
        <div className="flex flex-col sm:flex-row items-center gap-6 px-4">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-300 dark:bg-[#334155] rounded-full shrink-0 -mt-10" />
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="h-6 bg-slate-200 dark:bg-[#1E293B] rounded-lg w-1/3" />
            <div className="h-4 bg-slate-200 dark:bg-[#1E293B] rounded-lg w-1/4" />
          </div>
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
          No channel was found registered with the username "<strong>{username}</strong>".
        </p>
        <button 
          onClick={() => navigate('home')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isOwner = currentUser?.uid === creator.uid;

  const handleSubscribeToggle = async () => {
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to follow this creator.', 'info');
      return;
    }

    try {
      const isSub = await subscriptionService.toggleSubscription(currentUser.uid, creator.uid, {
        username: creator.username,
        displayName: creator.displayName,
        photoURL: creator.photoURL
      });
      setSubscribed(isSub);
      setCreator(prev => prev ? { ...prev, followersCount: prev.followersCount + (isSub ? 1 : -1) } : null);
      addToast(isSub ? `Subscribed to ${creator.displayName}!` : `Unsubscribed from ${creator.displayName}.`, 'success');
    } catch (err) {
      addToast('Subscription change failed.', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      
      {/* YOUTUBE-STYLE CHANNEL HEADER CONTAINER */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] rounded-3xl overflow-hidden shadow-xs">
        
        {/* 1. CHANNEL BANNER */}
        <div className="relative w-full h-36 sm:h-48 md:h-56 bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900 overflow-hidden flex items-center justify-center">
          {creator.bannerURL ? (
            <img 
              src={creator.bannerURL} 
              alt={`${creator.displayName} Banner`} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 text-white/30 font-black text-2xl md:text-4xl tracking-widest uppercase select-none">
              {creator.displayName} Channel
            </div>
          )}

          {/* Quick Customize Banner button for Owner */}
          {isOwner && (
            <button
              onClick={() => navigate('settings')}
              className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer shadow-xs"
              title="Change Channel Banner"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Edit Banner</span>
            </button>
          )}
        </div>

        {/* 2. CHANNEL DETAILS ROW */}
        <div className="p-4 sm:p-6 pt-0 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left relative">
          
          {/* Compact YouTube-Style Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl border-4 border-white dark:border-[#111827] shadow-lg overflow-hidden shrink-0 -mt-10 sm:-mt-12 z-10">
            {creator.photoURL ? (
              <img src={creator.photoURL} alt={creator.username} className="w-full h-full object-cover" />
            ) : (
              <span>{getInitials(creator.displayName)}</span>
            )}
          </div>

          {/* Details & Metadata */}
          <div className="flex-1 min-w-0 space-y-1.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                {creator.displayName}
              </h1>
            </div>

            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-bold">
              @{creator.username}
            </p>

            <div className="flex items-center gap-3 justify-center sm:justify-start text-xs font-bold text-slate-600 dark:text-[#94A3B8]">
              <span>{formatSubscribers(creator.followersCount)}</span>
              <span>•</span>
              <span>{creator.videosCount} {creator.videosCount === 1 ? 'video' : 'videos'}</span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 max-w-2xl font-medium line-clamp-2 pt-1">
              {creator.bio || "Welcome to my SocialIndia official channel! Stay tuned for awesome videos."}
            </p>
          </div>

          {/* Action Buttons: Subscribe OR Edit Settings */}
          <div className="shrink-0 pt-2 sm:pt-4">
            {isOwner ? (
              <button
                onClick={() => navigate('settings')}
                className="px-5 py-2.5 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-[#F8FAFC] font-extrabold text-xs rounded-xl flex items-center gap-2 border border-slate-200 dark:border-[#334155] cursor-pointer shadow-xs transition-all"
              >
                <SettingsIcon className="w-4 h-4 text-blue-500" />
                <span>Customize Channel</span>
              </button>
            ) : (
              <button
                onClick={handleSubscribeToggle}
                className={`px-6 py-2.5 rounded-xl font-extrabold text-xs tracking-wide transition-all cursor-pointer shadow-xs ${
                  subscribed 
                    ? 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#334155]' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </button>
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
          <span>Videos ({videos.length})</span>
          {activeTab === 'videos' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
        </button>
        <button
          onClick={() => setActiveTab('shorts')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer relative ${activeTab === 'shorts' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Film className="w-4 h-4" />
          <span>Shorts ({shorts.length})</span>
          {activeTab === 'shorts' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer relative ${activeTab === 'about' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Info className="w-4 h-4" />
          <span>About</span>
          {activeTab === 'about' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
        </button>
      </div>

      {/* Tab views layout */}
      <div className="pt-2">
        {activeTab === 'videos' && (
          <VideoGrid 
            videos={videos} 
            loading={false} 
            emptyHeading="No standard videos"
            emptyMessage="This creator has not published any standard videos yet."
          />
        )}

        {activeTab === 'shorts' && (
          <VideoGrid 
            videos={shorts} 
            loading={false} 
            emptyHeading="No short videos"
            emptyMessage="This creator has not published any short videos yet."
          />
        )}

        {activeTab === 'about' && (
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl space-y-4 max-w-xl shadow-xs">
            <h3 className="text-xs font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC] tracking-wider">About this Channel</h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {creator.bio || "This creator has not provided any additional channel biography."}
            </p>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">
              <div className="flex justify-between">
                <span>Joined SocialIndia</span>
                <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{new Date(creator.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Channel Followers</span>
                <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{creator.followersCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Videos Uploaded</span>
                <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{creator.videosCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
