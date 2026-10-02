import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { userService } from '../services/userService';
import { likeService } from '../services/likeService';
import { commentService } from '../services/commentService';
import { Video, Comment, User } from '../types';
import { parseVideoUrl, getInitials, formatTimeAgo } from '../utils/videoUtils';
import { UserAvatar } from '../components/UserAvatar';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  AlertCircle,
  Film, 
  X, 
  Send, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Inner player for Shorts that autoplays & crops YouTube overlays cleanly
const ShortVideoMedia: React.FC<{ 
  short: Video, 
  isPlaying: boolean, 
  volume: number, 
  isMuted: boolean,
  onMediaReady: () => void
}> = ({ short, isPlaying, volume, isMuted, onMediaReady }) => {
  const parsedMedia = parseVideoUrl(short.videoUrl);
  const containerId = `yt-short-${short.videoId}`;
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync volume and mute for direct video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Sync play/pause for direct video
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync for YouTube
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(isMuted ? 0 : volume * 100);
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (parsedMedia.type !== 'youtube' || !parsedMedia.youtubeId) return;

    let isMounted = true;

    const initShortPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initShortPlayer, 100);
        return;
      }

      const element = document.getElementById(containerId);
      if (!element) return;

      playerRef.current = new window.YT.Player(containerId, {
        videoId: parsedMedia.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          loop: 1,
          playlist: parsedMedia.youtubeId,
          disablekb: 1,
          fs: 0,
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            onMediaReady();
            event.target.setVolume(isMuted ? 0 : volume * 100);
            try {
              if (isPlaying) event.target.playVideo();
            } catch (e) {
              event.target.mute();
              if (isPlaying) event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            // Handle loop manually if needed or other states
            if (event.data === 0) { // Ended
              event.target.playVideo(); // Loop
            }
          }
        }
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initShortPlayer();
      };
    } else {
      initShortPlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [short.videoId, short.videoUrl]);

  return (
    <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
      {parsedMedia.type === 'youtube' ? (
        /* Increased crop from 18% to 22% and scale from 1.36 to 1.5 to hide all YT UI including share/title */
        <div className="absolute -inset-[22%] w-[144%] h-[144%] scale-[1.44] pointer-events-none flex items-center justify-center">
          <div id={containerId} className="w-full h-full" />
        </div>
      ) : parsedMedia.type === 'drive' ? (
        <iframe
          src={`${parsedMedia.embedUrl}?autoplay=1`}
          title={short.title}
          frameBorder="0"
          allow="autoplay; encrypted-media"
          onLoad={onMediaReady}
          className="w-full h-full object-cover scale-110"
        />
      ) : parsedMedia.type === 'direct' ? (
        <video
          ref={videoRef}
          src={parsedMedia.embedUrl}
          autoPlay
          loop
          playsInline
          muted={isMuted}
          onCanPlay={onMediaReady}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
          <p className="text-xs font-bold text-white">Media player error.</p>
        </div>
      )}
    </div>
  );
};

export const Shorts: React.FC = () => {
  const { route, navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast } = useApp();
  
  const [shorts, setShorts] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [creator, setCreator] = useState<User | null>(null);

  // Like & Comment drawer state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const targetShortId = route.param;

  const fetchShorts = async () => {
    setLoading(true);
    try {
      const data = await videoService.getVideos({ isShort: true });
      if (data.length > 0) {
        setShorts(data);

        // If route specifies a short ID, find index or fetch
        if (targetShortId) {
          const idx = data.findIndex(s => s.videoId === targetShortId);
          if (idx !== -1) {
            setCurrentIndex(idx);
          } else {
            const singleShort = await videoService.getVideo(targetShortId);
            if (singleShort && singleShort.isShort) {
              setShorts([singleShort, ...data]);
              setCurrentIndex(0);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShorts();
  }, [targetShortId]);

  const activeShort = shorts[currentIndex];

  // Sync like and comments stats for active short
  useEffect(() => {
    if (!activeShort) return;

    setLikesCount(activeShort.likesCount || 0);
    setCommentsCount(activeShort.commentsCount || 0);
    setShowComments(false);
    setCreator(null);
    
    // Fetch latest creator profile for up-to-date avatar
    userService.getUserProfile(activeShort.creatorId).then(crProfile => {
      if (crProfile) {
        setCreator(crProfile);
        
        // NEW: Lazy migration - Sync video metadata if it's outdated
        if (activeShort.creatorPhotoURL !== crProfile.photoURL || 
            activeShort.creatorDisplayName !== crProfile.displayName || 
            activeShort.creatorUsername !== crProfile.username) {
          videoService.editVideo(activeShort.videoId, {
            creatorPhotoURL: crProfile.photoURL,
            creatorDisplayName: crProfile.displayName,
            creatorUsername: crProfile.username
          }).catch(console.error);
        }
      }
    }).catch(console.error);

    if (currentUser) {
      likeService.hasLiked(activeShort.videoId, currentUser.uid).then(setIsLiked).catch(console.error);
    } else {
      setIsLiked(false);
    }
  }, [activeShort?.videoId, currentUser?.uid]);

  const handleNext = () => {
    if (currentIndex < shorts.length - 1) {
      setIsMediaReady(false);
      setIsPlaying(true);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsMediaReady(false);
      setIsPlaying(true);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleLikeToggle = async () => {
    if (!currentUser) {
      addToast('Please sign in to like Shorts.', 'info');
      return;
    }

    try {
      if (isLiked) {
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        await likeService.unlikeVideo(activeShort.videoId, currentUser.uid);
        addToast('Removed from liked videos', 'info');
      } else {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        await likeService.likeVideo(activeShort.videoId, currentUser.uid);
        addToast('Added to liked videos!', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);

    if (nextShow && activeShort) {
      setLoadingComments(true);
      try {
        const comms = await commentService.getComments(activeShort.videoId);
        setComments(comms);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleShare = () => {
    if (!activeShort) return;
    const shareUrl = `${window.location.origin}/#/shorts/${activeShort.videoId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast('Shorts link copied to clipboard!', 'success');
    });
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to comment.', 'info');
      return;
    }

    setSubmittingComment(true);
    try {
      const created = await commentService.addComment(activeShort.videoId, {
        uid: currentUser.uid,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL,
        text: newCommentText.trim()
      });

      setComments(prev => [created, ...prev]);
      setCommentsCount(prev => prev + 1);
      setNewCommentText('');
      addToast('Comment posted!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to post comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Helper to render text with clickable links
  const renderCommentText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handlePostReply = async (parentCommentId: string) => {
    if (!currentUser || !currentUserProfile || !replyText.trim()) return;
    try {
      const created = await commentService.addComment(activeShort.videoId, {
        uid: currentUser.uid,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL,
        text: replyText.trim(),
        parentCommentId
      });
      setComments(prev => [...prev, created]);
      setCommentsCount(prev => prev + 1);
      setReplyText('');
      setReplyingTo(null);
      addToast('Reply posted!', 'success');
    } catch (err) {
      addToast('Failed to post reply', 'error');
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (window.confirm('Delete this comment?')) {
      try {
        await commentService.deleteComment(activeShort.videoId, commentId);
        setComments(prev => prev.filter(c => c.commentId !== commentId));
        setCommentsCount(prev => prev - 1);
        addToast('Comment deleted', 'info');
      } catch (err) {
        addToast('Failed to delete', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="w-85 sm:w-96 h-[550px] bg-slate-200 dark:bg-[#111827] rounded-3xl animate-pulse flex flex-col justify-end p-6 space-y-4">
          <div className="h-6 bg-slate-300 dark:bg-[#1E293B] rounded w-2/3" />
          <div className="h-4 bg-slate-300 dark:bg-[#1E293B] rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (shorts.length === 0 || !activeShort) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[calc(100vh-8rem)]">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/30 shadow-xs">
          <Film className="w-7 h-7" />
        </div>
        <h4 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">No short videos available yet</h4>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 max-w-sm font-medium">
          Short vertical videos published on SocialIndia will appear here.
        </p>
        <button
          onClick={() => navigate('studio')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs"
        >
          Publish a Short
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-6 min-h-[calc(100vh-4rem)] relative select-none max-w-6xl mx-auto">
      
      <div className="flex flex-col md:flex-row items-center md:items-stretch justify-center gap-6 w-full h-[650px] md:h-[750px]">
        
        {/* Navigation Arrows for desktop (Left side) */}
        <div className="hidden md:flex flex-col justify-center gap-4">
          <button
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className="p-4 bg-white dark:bg-[#111827] hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-[1.5rem] disabled:opacity-20 cursor-pointer shadow-xl transition-all active:scale-90"
            title="Previous Short"
          >
            <ChevronUp className="w-6 h-6 text-slate-700 dark:text-slate-300 stroke-[2.5]" />
          </button>
          <button
            disabled={currentIndex === shorts.length - 1}
            onClick={handleNext}
            className="p-4 bg-white dark:bg-[#111827] hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-[1.5rem] disabled:opacity-20 cursor-pointer shadow-xl transition-all active:scale-90"
            title="Next Short"
          >
            <ChevronDown className="w-6 h-6 text-slate-700 dark:text-slate-300 stroke-[2.5]" />
          </button>
        </div>

        {/* Vertical Shorts Player Container */}
        <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-[#334155] overflow-hidden flex flex-col group">
          
          {/* Media Player Component */}
          <ShortVideoMedia 
            key={activeShort.videoId} 
            short={activeShort} 
            isPlaying={isPlaying}
            volume={volume}
            isMuted={isMuted}
            onMediaReady={() => setIsMediaReady(true)}
          />

          {/* PLAY/PAUSE OVERLAY ON VIDEO */}
          <div 
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
          >
            {!isPlaying && (
              <div className="w-20 h-20 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white animate-zoom-in">
                <Play className="w-10 h-10 fill-current ml-1" />
              </div>
            )}
          </div>

          {/* Interaction Side Overlay */}
          <div className="absolute right-4 bottom-24 flex flex-col gap-5 text-white z-20">
            {/* VOLUME BUTTON */}
            <div className="group/volume relative flex flex-col items-center">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
              </button>
              
              {/* Vertical Volume Slider on Hover */}
              <div className="absolute bottom-14 hidden group-hover/volume:flex h-32 w-10 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 items-center justify-center p-3 animate-in slide-in-from-bottom-2">
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    setIsMuted(val === 0);
                  }}
                  className="w-24 h-1.5 accent-blue-500 -rotate-90 cursor-pointer origin-center"
                />
              </div>
            </div>

            <button 
              onClick={handleLikeToggle}
              className="group/btn flex flex-col items-center gap-1"
            >
              <div className={`w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95 ${isLiked ? 'bg-rose-600/20 border-rose-600/40' : 'hover:bg-black/60'}`}>
                <Heart className={`w-6 h-6 transition-colors ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'}`} />
              </div>
              <span className="text-[10px] font-black drop-shadow-md">{likesCount}</span>
            </button>

            <button 
              onClick={handleToggleComments}
              className="group/btn flex flex-col items-center gap-1"
            >
              <div className={`w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95 ${showComments ? 'bg-blue-600/20 border-blue-600/40' : 'hover:bg-black/60'}`}>
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black drop-shadow-md">{commentsCount}</span>
            </button>

            <button 
              onClick={handleShare}
              className="group/btn flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full flex items-center justify-center border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black drop-shadow-md">Share</span>
            </button>
          </div>

          {/* Details Overlay bottom */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 text-white flex flex-col gap-3 z-10 pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <UserAvatar 
                uid={activeShort.creatorId}
                fallbackPhotoURL={activeShort.creatorPhotoURL}
                fallbackDisplayName={activeShort.creatorDisplayName}
                size="md"
                onClick={() => navigate('creator', activeShort.creatorUsername)}
                className="rounded-[1rem] border-2 border-white/10 shadow-lg"
              />
              <div className="min-w-0">
                <h4 onClick={() => navigate('creator', activeShort.creatorUsername)} className="text-xs font-black hover:underline cursor-pointer truncate drop-shadow-md">
                  {activeShort.creatorDisplayName}
                </h4>
                <p className="text-[10px] text-blue-400 font-bold truncate drop-shadow-sm">@{activeShort.creatorUsername}</p>
              </div>
            </div>

            <div className="pr-14">
              <h3 className="text-xs font-bold leading-relaxed line-clamp-2 drop-shadow-lg">
                {activeShort.title}
              </h3>
              <p className="text-[10px] text-blue-500 font-black mt-1 uppercase tracking-widest drop-shadow-sm">#{activeShort.category}</p>
            </div>
          </div>
        </div>

        {/* SIDE-OPENING COMMENTS DRAWER (WEB) */}
        {showComments && (
          <div className="flex-1 max-w-[400px] bg-white dark:bg-[#111827] rounded-[2.5rem] border border-slate-200 dark:border-[#334155] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
            {/* Comments Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                  Comments
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{commentsCount} interactions</p>
              </div>
              <button 
                onClick={() => setShowComments(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Comment List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
              {loadingComments ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-8 h-8 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gathering thoughts...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-20 px-6 space-y-3">
                  <MessageSquare className="w-12 h-12 text-slate-100 dark:text-slate-800 mx-auto" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Silent Zone</p>
                  <p className="text-[10px] text-slate-500 font-bold">Be the first to break the silence!</p>
                </div>
              ) : (
                comments.filter(c => !c.parentCommentId).map(c => (
                  <div key={c.commentId} className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-sm text-white shrink-0 shadow-lg border border-white/10">
                        {c.photoURL ? (
                          <img src={c.photoURL} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          <span>{getInitials(c.displayName)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-black text-[11px] text-slate-900 dark:text-white truncate">@{c.username}</span>
                          <span className="text-[9px] text-slate-400 font-bold shrink-0">{formatTimeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium break-words">
                          {renderCommentText(c.text)}
                        </p>
                        <div className="flex items-center gap-5 mt-2.5">
                          <button 
                            onClick={() => setReplyingTo(c.commentId)}
                            className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors cursor-pointer"
                          >
                            Reply
                          </button>
                          {currentUser?.uid === c.uid && (
                            <button 
                              onClick={() => handleCommentDelete(c.commentId)}
                              className="text-[9px] font-black text-slate-400 hover:text-rose-600 uppercase tracking-widest transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        {/* Reply Input Form */}
                        {replyingTo === c.commentId && (
                          <div className="mt-4 flex gap-2">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Write a reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="flex-1 px-4 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handlePostReply(c.commentId)}
                              className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase rounded-xl cursor-pointer"
                            >
                              X
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nested Replies */}
                    <div className="ml-14 space-y-4">
                      {comments.filter(r => r.parentCommentId === c.commentId).map(r => (
                        <div key={r.commentId} className="flex gap-3 items-start group">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-black text-[10px] text-slate-500 shrink-0 border border-slate-200 dark:border-slate-800">
                            {r.photoURL ? <img src={r.photoURL} alt="" className="w-full h-full object-cover rounded-xl" /> : getInitials(r.displayName)}
                          </div>
                          <div className="flex-1 min-w-0 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black text-slate-900 dark:text-white truncate">@{r.username}</span>
                              <span className="text-[8px] text-slate-400 font-bold">{formatTimeAgo(r.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium break-words">{renderCommentText(r.text)}</p>
                            {currentUser?.uid === r.uid && (
                              <button onClick={() => handleCommentDelete(r.commentId)} className="mt-1 text-[8px] font-black text-rose-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input Form */}
            <form onSubmit={handlePostComment} className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 items-center bg-slate-50/50 dark:bg-[#0f0f0f]/40">
              <input
                type="text"
                placeholder="Share your thoughts..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-bold transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={submittingComment || !newCommentText.trim()}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-xl shadow-blue-600/20 transition-all active:scale-90 shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
