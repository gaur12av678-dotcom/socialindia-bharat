import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { likeService, LikedVideoItem } from '../services/likeService';
import { ThumbsUp, Play, Trash2, Clock, Eye, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n';
import { formatDuration, formatTimeAgo, formatViews } from '../utils/videoUtils';

export const LikedVideos: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  const [likedVideos, setLikedVideos] = useState<LikedVideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLikedVideos = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await likeService.getLikedVideos(currentUser.uid);
      setLikedVideos(items);
    } catch (err) {
      console.error('Error fetching liked videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLikedVideos();
  }, [currentUser]);

  const handleUnlike = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      await likeService.unlikeVideo(videoId, currentUser.uid);
      setLikedVideos(prev => prev.filter(item => item.videoId !== videoId));
      addToast(isHindi ? 'पसंद किए गए वीडियो से हटा दिया गया।' : 'Removed from Liked videos.', 'info');
    } catch (err) {
      addToast(isHindi ? 'हटाने में विफल।' : 'Failed to remove.', 'error');
    }
  };

  const handlePlayAll = () => {
    if (likedVideos.length === 0) return;
    const first = likedVideos[0];
    if (first.isShort) {
      navigate('shorts', first.videoId);
    } else {
      navigate('watch', first.videoId);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <ThumbsUp className="w-8 h-8 fill-current" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">
          {isHindi ? 'पसंद किए गए वीडियो देखने के लिए साइन इन करें' : 'Sign in to view your Liked Videos'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          {isHindi 
            ? 'जब आप सोशलइंडिया पर किसी वीडियो को पसंद करते हैं, तो वह यहाँ सुरक्षित रहेगा ताकि आप कभी भी दोबारा देख सकें।'
            : 'Videos you like across SocialIndia will appear here so you can easily find and rewatch them anytime.'}
        </p>
        <button
          onClick={() => navigate('login')}
          className="mt-5 px-6 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white font-bold text-sm rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
        >
          {t('sign_in', 'Sign In')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      
      {/* Title Header Card */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-[#121215] border border-blue-100 dark:border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <ThumbsUp className="w-6 h-6 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('nav_liked_videos', isHindi ? 'पसंद किए गए वीडियो' : 'Liked Videos')}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-black">
                {likedVideos.length} {likedVideos.length === 1 ? 'video' : 'videos'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isHindi 
                ? 'आपके द्वारा लाइक किए गए सभी पसंदीदा वीडियो और शॉर्ट्स'
                : 'All videos and shorts you gave a thumbs up to across SocialIndia'}
            </p>
          </div>
        </div>

        {likedVideos.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="px-5 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isHindi ? 'सभी चलाएं' : 'Play All'}</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex gap-4 p-3.5 bg-white dark:bg-[#16171a] border border-slate-200/80 dark:border-slate-800 rounded-2xl animate-pulse">
              <div className="w-40 sm:w-48 aspect-video bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : likedVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-[#16171a] border border-slate-200/80 dark:border-slate-800 rounded-3xl">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/30 shadow-xs">
            <ThumbsUp className="w-7 h-7" />
          </div>
          <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
            {isHindi ? 'अभी कोई पसंद किया गया वीडियो नहीं है' : 'No liked videos yet'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            {isHindi 
              ? 'जब आप किसी वीडियो को देखते समय लाइक बटन दबाएंगे, तो वह यहाँ दिखाई देगा।' 
              : 'Tap the thumbs-up like button on any video or short to save it to your liked playlist.'}
          </p>
          <button
            onClick={() => navigate('home')}
            className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {isHindi ? 'वीडियो एक्सप्लोर करें' : 'Explore Videos'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {likedVideos.map((video, index) => (
            <div
              key={video.videoId}
              onClick={() => {
                if (video.isShort) {
                  navigate('shorts', video.videoId);
                } else {
                  navigate('watch', video.videoId);
                }
              }}
              className="group flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 sm:p-3.5 bg-white dark:bg-[#16171a] hover:bg-slate-50 dark:hover:bg-[#1e2025] border border-slate-200/80 dark:border-slate-800 rounded-2xl transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs relative"
            >
              {/* Order Number on Desktop */}
              <span className="hidden sm:inline-block w-6 text-center text-xs font-black text-slate-400 dark:text-slate-500 shrink-0">
                {index + 1}
              </span>

              {/* Video Thumbnail */}
              <div className="relative w-full sm:w-44 md:w-48 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0">
                <img
                  src={video.thumbnailUrl || '/logo.svg'}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                {video.duration ? (
                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded-md">
                    {formatDuration(video.duration)}
                  </span>
                ) : null}
                {video.isShort && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md">
                    Short
                  </span>
                )}
                {/* Play Hover Overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/90 text-blue-600 flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Video Info */}
              <div className="flex-1 min-w-0 pr-10 sm:pr-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {video.title || 'Untitled Video'}
                </h3>
                
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {video.creatorDisplayName && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (video.creatorUsername) {
                          navigate('creator', video.creatorUsername);
                        }
                      }}
                      className="font-semibold hover:text-blue-600 hover:underline truncate max-w-[180px] cursor-pointer"
                    >
                      {video.creatorDisplayName}
                    </button>
                  )}
                  {video.viewsCount !== undefined && (
                    <>
                      <span>•</span>
                      <span>{formatViews(video.viewsCount)}</span>
                    </>
                  )}
                  {video.likedAt && (
                    <>
                      <span>•</span>
                      <span className="hidden sm:inline">Liked {formatTimeAgo(video.likedAt)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions: Remove / Unlike button */}
              <div className="sm:ml-auto shrink-0">
                <button
                  onClick={(e) => handleUnlike(e, video.videoId)}
                  className="p-2 sm:p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                  title={isHindi ? 'पसंद से हटाएं' : 'Remove from Liked videos'}
                  aria-label="Remove from Liked videos"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
