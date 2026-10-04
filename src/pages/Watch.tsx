import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { videoService } from '../services/videoService';
import { userService } from '../services/userService';
import { commentService } from '../services/commentService';
import { likeService } from '../services/likeService';
import { subscriptionService } from '../services/subscriptionService';
import { savedVideoService } from '../services/savedVideoService';
import { historyService } from '../services/historyService';
import { notificationService } from '../services/notificationService';
import { reportService } from '../services/reportService';
import { downloadService } from '../services/downloadService';
import { Video, Comment, User } from '../types';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import { SaveToPlaylistModal } from '../components/SaveToPlaylistModal';
import { UserAvatar } from '../components/UserAvatar';
import { parseVideoUrl, formatViews, formatTimeAgo, formatSubscribers, getInitials } from '../utils/videoUtils';
import { RichText } from '../components/RichText';
import { 
  Heart, 
  Share2, 
  Bookmark, 
  Flag, 
  Trash2, 
  Edit3,
  Send,
  MoreVertical,
  AlertTriangle,
  X,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
  Pin
} from 'lucide-react';

export const Watch: React.FC = () => {
  const { route, navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast } = useApp();
  const videoId = route.param;

  const [video, setVideo] = useState<Video | null>(null);
  const [creator, setCreator] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  
  // Reporting state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'video' | 'comment'>('video');
  const [reportTargetId, setReportTargetId] = useState('');
  const [reportReason, setReportReason] = useState<'spam' | 'misleading' | 'harassment' | 'copyright' | 'inappropriate' | 'other'>('spam');
  const [reportDetails, setReportDetails] = useState('');

  // Offline Download & Theater Mode state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined);

  // Keyboard shortcut listener for 't' (Theater Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input, textarea, or contentEditable
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        setIsTheaterMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Comment edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const isVideoOwner = !!(
    currentUser &&
    video &&
    video.creatorId &&
    (currentUser.uid === video.creatorId ||
      (currentUserProfile &&
        currentUserProfile.username &&
        video.creatorUsername &&
        currentUserProfile.username === video.creatorUsername))
  );

  const commentDropdownRef = useRef<Record<string, boolean>>({});
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;

    const loadVideoDetails = async () => {
      setLoading(true);
      try {
        const vid = await videoService.getVideo(videoId);
        if (!isMounted) return;

        if (!vid) {
          setVideo(null);
          setLoading(false);
          return;
        }

        // If this is a short video, redirect to vertical Shorts viewer!
        if (vid.isShort) {
          navigate('shorts', videoId);
          return;
        }

        // Set video object and close page loading IMMEDIATELY!
        setVideo(vid);
        setLoading(false);

        // Secondary background fetches (Non-blocking)
        videoService.incrementViewCount(videoId).catch(console.error);

        userService.getUserProfile(vid.creatorId).then(crProfile => {
          if (isMounted && crProfile) {
            setCreator(crProfile);
            
            // NEW: Lazy migration - Sync video metadata if it's outdated
            if (vid.creatorPhotoURL !== crProfile.photoURL || 
                vid.creatorDisplayName !== crProfile.displayName || 
                vid.creatorUsername !== crProfile.username) {
              videoService.editVideo(vid.videoId, {
                creatorPhotoURL: crProfile.photoURL,
                creatorDisplayName: crProfile.displayName,
                creatorUsername: crProfile.username
              }).catch(console.error);
            }
          }
        }).catch(console.error);

        // Check offline downloaded status
        downloadService.isDownloaded(videoId).then(isD => {
          if (isMounted) setIsDownloaded(isD);
        }).catch(console.error);

        if (currentUser) {
          historyService.addToHistory(currentUser.uid, vid).catch(console.error);
          likeService.hasLiked(videoId, currentUser.uid).then(isL => isMounted && setLiked(isL)).catch(console.error);
          savedVideoService.isSaved(currentUser.uid, videoId).then(isS => isMounted && setSaved(isS)).catch(console.error);
          subscriptionService.isSubscribed(currentUser.uid, vid.creatorId).then(isSub => isMounted && setSubscribed(isSub)).catch(console.error);
        }

        commentService.getComments(videoId).then(commList => {
          if (isMounted) setComments(commList);
        }).catch(console.error);

        videoService.getVideos({ category: vid.category }).then(rel => {
          if (isMounted) setRelatedVideos(rel.filter(v => v.videoId !== videoId).slice(0, 6));
        }).catch(console.error);

      } catch (err) {
        console.error('Watch loading error:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadVideoDetails();

    return () => {
      isMounted = false;
    };
  }, [videoId, currentUser]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-slate-200 dark:bg-[#111827] rounded-[2rem] w-full flex flex-col items-center justify-center p-6 text-center shadow-xl relative overflow-hidden animate-pulse border border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
              <div className="w-8 h-8 rounded-full border-4 border-blue-600/30 border-t-blue-600 animate-spin" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Experience</p>
          </div>
          <div className="space-y-3 pt-4">
            <div className="h-8 bg-slate-100 dark:bg-[#1e293b] rounded-2xl w-3/4 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-10 w-10 bg-slate-100 dark:bg-[#1e293b] rounded-full animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-100 dark:bg-[#1e293b] rounded-lg w-1/4 animate-pulse" />
                <div className="h-3 bg-slate-100 dark:bg-[#1e293b] rounded-lg w-1/6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-slate-100 dark:bg-[#1e293b] rounded-lg w-1/3 animate-pulse mb-6" />
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex gap-3 animate-pulse">
              <div className="w-32 h-20 bg-slate-100 dark:bg-[#1e293b] rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-100 dark:bg-[#1e293b] rounded-lg" />
                <div className="h-3 bg-slate-100 dark:bg-[#1e293b] rounded-lg w-2/3" />
                <div className="h-3 bg-slate-100 dark:bg-[#1e293b] rounded-lg w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-bold">Video Could Not Be Found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">This video may have been removed or set to private by the creator.</p>
        <button 
          onClick={() => navigate('home')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs"
        >
          Return Home
        </button>
      </div>
    );
  }

  const parsedMedia = parseVideoUrl(video.videoUrl);

  const handleLikeToggle = async () => {
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to like videos.', 'info');
      return;
    }

    const previouslyLiked = liked;
    
    // Optimistic Update (INSTANT reaction!)
    setLiked(!previouslyLiked);
    setVideo(prev => {
      if (!prev) return null;
      return {
        ...prev,
        likesCount: prev.likesCount + (previouslyLiked ? -1 : 1)
      };
    });

    try {
      if (previouslyLiked) {
        await likeService.unlikeVideo(video.videoId, currentUser.uid);
        addToast('Removed from liked videos.', 'info');
      } else {
        await likeService.likeVideo(video.videoId, currentUser.uid);
        addToast('Added to liked videos!', 'success');

        notificationService.createNotification(video.creatorId, currentUserProfile, 'like', {
          videoId: video.videoId,
          videoTitle: video.title
        }).catch(console.error);
      }
    } catch (err) {
      // Rollback on failure
      setLiked(previouslyLiked);
      setVideo(prev => {
        if (!prev) return null;
        return {
          ...prev,
          likesCount: prev.likesCount + (previouslyLiked ? 1 : -1)
        };
      });
      addToast('Failed to complete like operation.', 'error');
    }
  };

  const handleSaveToggle = async () => {
    if (!currentUser) {
      addToast('Please sign in to save videos.', 'info');
      return;
    }

    try {
      if (saved) {
        await savedVideoService.unsaveVideo(currentUser.uid, video.videoId);
        setSaved(false);
        addToast('Removed from saved videos.', 'info');
      } else {
        await savedVideoService.saveVideo(currentUser.uid, video);
        setSaved(true);
        addToast('Saved to Watch Later!', 'success');
      }
    } catch (err) {
      addToast('Failed to save video.', 'error');
    }
  };

  const handleSubscribeToggle = async () => {
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to subscribe.', 'info');
      return;
    }

    try {
      const isSub = await subscriptionService.toggleSubscription(currentUser.uid, video.creatorId, {
        username: video.creatorUsername,
        displayName: video.creatorDisplayName,
        photoURL: video.creatorPhotoURL
      });
      setSubscribed(isSub);
      setCreator(prev => prev ? { ...prev, followersCount: prev.followersCount + (isSub ? 1 : -1) } : null);
      
      addToast(isSub ? `Subscribed to ${video.creatorDisplayName}!` : `Unsubscribed from ${video.creatorDisplayName}.`, 'success');

      if (isSub) {
        await notificationService.createNotification(video.creatorId, currentUserProfile, 'follow', {});
      }
    } catch (err) {
      addToast('Subscription change failed.', 'error');
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/#/watch/${video.videoId}`;
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: shareUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        addToast('Video link copied to clipboard!', 'success');
      });
    }
  };

  const handleDownloadToggle = async () => {
    if (!video) return;

    if (isDownloaded) {
      if (window.confirm('Delete this video from offline downloads?')) {
        try {
          await downloadService.deleteDownload(video.videoId);
          setIsDownloaded(false);
          addToast('Video removed from offline downloads.', 'info');
        } catch (err) {
          addToast('Failed to remove download.', 'error');
        }
      }
      return;
    }

    if (downloadProgress !== null) return; // already in progress

    setDownloadProgress(0);
    addToast('Starting offline download...', 'info');

    try {
      await downloadService.downloadVideo(video, (percent) => {
        setDownloadProgress(percent);
      });
      setIsDownloaded(true);
      setDownloadProgress(null);
      addToast('Video downloaded! You can now watch it offline without internet in Downloads.', 'success');
    } catch (err) {
      console.error('Download error:', err);
      setDownloadProgress(null);
      addToast('Failed to download video stream.', 'error');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to leave comments.', 'info');
      return;
    }
    const textToPost = newCommentText.trim();
    if (!textToPost) return;

    // Generate a temporary unique ID for optimistic rendering
    const tempCommentId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const tempComment: Comment = {
      commentId: tempCommentId,
      videoId: video.videoId,
      uid: currentUser.uid,
      username: currentUserProfile.username,
      displayName: currentUserProfile.displayName,
      photoURL: currentUserProfile.photoURL || '',
      text: textToPost,
      likesCount: 0,
      createdAt: now,
      updatedAt: now
    };

    // Optimistic state update (0 milliseconds!)
    setComments(prev => [tempComment, ...prev]);
    setNewCommentText('');
    setVideo(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);

    try {
      const realComment = await commentService.addComment(video.videoId, {
        uid: currentUser.uid,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL || '',
        text: textToPost
      });

      // Replace the temporary comment with the real saved comment in the UI list
      setComments(prev => prev.map(c => c.commentId === tempCommentId ? realComment : c));

      notificationService.createNotification(video.creatorId, currentUserProfile, 'comment', {
        videoId: video.videoId,
        commentId: realComment.commentId,
        message: textToPost
      }).catch(console.error);

    } catch (err) {
      // Rollback on failure
      setComments(prev => prev.filter(c => c.commentId !== tempCommentId));
      setVideo(prev => prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : null);
      // Restore input text so they don't lose what they typed
      setNewCommentText(textToPost);
      addToast('Failed to post comment. Please try again.', 'error');
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (window.confirm('Delete this comment?')) {
      try {
        await commentService.deleteComment(video.videoId, commentId);
        setComments(prev => prev.filter(c => c.commentId !== commentId));
        setVideo(prev => prev ? { ...prev, commentsCount: prev.commentsCount - 1 } : null);
        addToast('Comment deleted.', 'info');
      } catch (err) {
        addToast('Failed to delete comment.', 'error');
      }
    }
  };

  const handleCommentEdit = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await commentService.editComment(video.videoId, commentId, editingCommentText.trim());
      setComments(prev => prev.map(c => c.commentId === commentId ? { ...c, text: editingCommentText.trim() } : c));
      setEditingCommentId(null);
      addToast('Comment updated successfully.', 'success');
    } catch (err) {
      addToast('Failed to edit comment.', 'error');
    }
  };

  const handlePinComment = async (commentId: string, shouldPin: boolean) => {
    if (!video) return;
    try {
      await commentService.pinComment(video.videoId, commentId, shouldPin);
      setComments(prev => {
        const updated = prev.map(c => {
          if (c.commentId === commentId) {
            return { ...c, isPinned: shouldPin };
          }
          if (shouldPin && c.isPinned) {
            return { ...c, isPinned: false };
          }
          return c;
        });
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
      addToast(shouldPin ? 'Comment pinned to the top!' : 'Comment unpinned.', 'success');
    } catch (err) {
      console.error('Pin error', err);
      addToast('Failed to update pinned comment.', 'error');
    }
  };

  const submitReportHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      addToast('Please sign in to report content.', 'info');
      return;
    }

    try {
      await reportService.submitReport(
        currentUser.uid,
        reportType,
        reportTargetId,
        reportReason,
        reportDetails
      );
      setReportModalOpen(false);
      setReportDetails('');
      addToast('Content reported successfully. Review team has been notified.', 'success');
    } catch (err) {
      addToast('Failed to submit report.', 'error');
    }
  };

  // Helper to render text with clickable links and hashtags
  const renderCommentText = (text: string) => {
    return <RichText text={text} />;
  };

  const handleReplyClick = (commentId: string) => {
    setEditingCommentId(`reply-${commentId}`);
    setEditingCommentText('');
  };

  const handlePostReply = async (parentCommentId: string) => {
    if (!currentUser || !currentUserProfile || !editingCommentText.trim()) return;

    try {
      const newReply = await commentService.addComment(video!.videoId, {
        uid: currentUser.uid,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL || '',
        text: editingCommentText.trim(),
        parentCommentId
      });

      setComments(prev => [...prev, newReply]);
      setEditingCommentId(null);
      setEditingCommentText('');
      setVideo(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
      addToast('Reply posted!', 'success');
    } catch (err) {
      addToast('Failed to post reply.', 'error');
    }
  };

  const toggleCommentDropdown = (id: string) => {
    commentDropdownRef.current[id] = !commentDropdownRef.current[id];
    forceUpdate({});
  };

  return (
    <div className={`p-4 md:p-6 grid grid-cols-1 ${isTheaterMode ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 max-w-7xl mx-auto pb-20 transition-all`}>
      
      {/* LEFT COLUMN: Player + Details + Comments */}
      <div className={`${isTheaterMode ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-6`}>
        
        {/* SocialIndia Custom Video Player */}
        <CustomVideoPlayer 
          video={video} 
          isTheaterMode={isTheaterMode}
          onToggleTheaterMode={() => setIsTheaterMode(prev => !prev)}
          seekToTime={seekToTime}
        />

        {/* Video Title and Social Interactions block */}
        <div className="space-y-4">
          <h1 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC] leading-snug">
            <RichText text={video.title} onTimestampClick={(seconds) => setSeekToTime(seconds)} />
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 py-2.5 border-y border-slate-200 dark:border-[#334155]">
            {/* Creator Channel Card */}
            <div className="flex items-center gap-3">
              <UserAvatar 
                uid={video.creatorId}
                fallbackPhotoURL={video.creatorPhotoURL}
                fallbackDisplayName={video.creatorDisplayName}
                size="md"
                onClick={() => navigate('creator', video.creatorUsername)}
                className="rounded-full shadow-xs"
              />
              <div className="min-w-0">
                <h4 
                  onClick={() => navigate('creator', video.creatorUsername)}
                  className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] hover:underline cursor-pointer truncate flex items-center gap-1"
                >
                  <span>{video.creatorDisplayName}</span>
                  {(creator?.role === 'creator' || creator?.role === 'admin') && (
                    <span className="inline-flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-[8px] w-3.5 h-3.5 rounded-full font-black shrink-0" title="Verified Creator">✓</span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-bold leading-none mt-1">
                  {creator ? formatSubscribers(creator.followersCount) : '0 subscribers'}
                </p>
              </div>

              {currentUser?.uid !== video.creatorId && (
                <button
                  onClick={handleSubscribeToggle}
                  className={`ml-4 px-4.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer border ${
                    subscribed 
                      ? 'bg-slate-200 dark:bg-[#1E293B] text-slate-800 dark:text-[#F8FAFC] border-slate-300 dark:border-[#334155] shadow-xs' 
                      : 'bg-[#065fd4] hover:bg-[#0556bf] text-white border-transparent shadow-md'
                  }`}
                >
                  {subscribed ? '✓ Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>

            {/* Video Social controls (Likes, Saves, Share, Report) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLikeToggle}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                  liked 
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-extrabold' 
                    : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#334155] hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-[#F8FAFC]'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400' : ''}`} />
                <span>{video.likesCount}</span>
              </button>

              <button
                onClick={() => setPlaylistModalOpen(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                  saved 
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
                    : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#334155] hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-[#F8FAFC]'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400' : ''}`} />
                <span>Save to Playlist</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-[#F8FAFC] transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <button
                onClick={handleDownloadToggle}
                disabled={downloadProgress !== null}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  isDownloaded 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' 
                    : downloadProgress !== null 
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-600 animate-pulse'
                      : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#334155] hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-[#F8FAFC]'
                }`}
                title={isDownloaded ? 'Downloaded offline' : 'Download for offline viewing'}
              >
                {downloadProgress !== null ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>{downloadProgress}%</span>
                  </>
                ) : isDownloaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Downloaded</span>
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Download</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setReportType('video');
                  setReportTargetId(video.videoId);
                  setReportModalOpen(true);
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                title="Report Video"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Video Description Box */}
        <div className="p-4 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-[#334155] shadow-xs space-y-3">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-[#94A3B8]">
            <span>{formatViews(video.viewsCount)}</span>
            <span>•</span>
            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span className="uppercase text-blue-600 dark:text-blue-400 font-extrabold">{video.category}</span>
          </div>

          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            {video.description ? (
              video.description.length <= 150 ? (
                <RichText text={video.description} onTimestampClick={(seconds) => setSeekToTime(seconds)} />
              ) : isDescriptionExpanded ? (
                <div>
                  <RichText text={video.description} onTimestampClick={(seconds) => setSeekToTime(seconds)} />
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(false)}
                    className="mt-2 font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer block text-xs"
                  >
                    Show less
                  </button>
                </div>
              ) : (
                <div>
                  <RichText text={video.description.slice(0, 150) + '...'} onTimestampClick={(seconds) => setSeekToTime(seconds)} className="inline" />
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(true)}
                    className="ml-1 font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer inline-block text-xs"
                  >
                    ...more
                  </button>
                </div>
              )
            ) : (
              "No description provided."
            )}
          </div>

          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {video.tags.map((tag, i) => (
                <span key={i} className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC] tracking-wider">
            Comments ({video.commentsCount})
          </h3>

          {/* Form to submit comment */}
          <form onSubmit={handlePostComment} className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 shrink-0 flex items-center justify-center text-white font-bold text-xs select-none border border-slate-200 dark:border-slate-700">
              {currentUserProfile ? getInitials(currentUserProfile.displayName) : 'SI'}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Add a public comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-medium"
              />
              <button 
                type="submit"
                className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-[#94A3B8] py-6 text-center font-medium">No comments yet. Be the first to share your thoughts!</p>
            ) : (
              comments.filter(c => !c.parentCommentId).map((comm) => (
                <div key={comm.commentId} className="space-y-3">
                  <div className="flex gap-3 items-start group">
                    {/* User Initial Circle */}
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1E293B] shrink-0 flex items-center justify-center text-slate-700 dark:text-slate-300 font-black text-xs select-none border border-slate-200 dark:border-slate-800">
                      {comm.photoURL ? (
                        <img src={comm.photoURL} alt={comm.displayName} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        getInitials(comm.displayName)
                      )}
                    </div>

                    {/* Body content */}
                    <div className="flex-1 min-w-0 bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200/80 dark:border-[#334155] relative shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                      {comm.isPinned && (
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-[11px] font-black mb-1.5">
                          <Pin className="w-3.5 h-3.5 rotate-45 fill-current" />
                          <span>Pinned by {video.creatorDisplayName}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-[#F8FAFC]">
                          {comm.displayName}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-bold truncate">
                          @{comm.username}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          • {formatTimeAgo(comm.createdAt)}
                        </span>
                      </div>

                      {editingCommentId === comm.commentId ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="flex-1 px-4 py-2 text-xs border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] rounded-xl font-bold"
                          />
                          <button
                            onClick={() => handleCommentEdit(comm.commentId)}
                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 text-[10px] font-black uppercase rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-medium">
                            {renderCommentText(comm.text)}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-3">
                            <button 
                              onClick={() => handleReplyClick(comm.commentId)}
                              className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors cursor-pointer"
                            >
                              Reply
                            </button>
                          </div>
                        </>
                      )}

                      {/* Reply Input Form */}
                      {editingCommentId === `reply-${comm.commentId}` && (
                        <div className="mt-4 flex gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Write a reply..."
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="flex-1 px-4 py-2 text-xs border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handlePostReply(comm.commentId)}
                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 text-[10px] font-black uppercase rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Dropdown controls */}
                      <div className="absolute top-3 right-3 flex items-center">
                        <button
                          onClick={() => toggleCommentDropdown(comm.commentId)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {commentDropdownRef.current[comm.commentId] && (
                          <div className="absolute right-0 top-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl shadow-xl z-10 py-1.5 min-w-36 text-[10px] font-black uppercase tracking-widest overflow-hidden">
                            {/* Pin / Unpin Button (Channel Creator or Admin only) */}
                            {isVideoOwner && (
                              <button
                                onClick={() => {
                                  handlePinComment(comm.commentId, !comm.isPinned);
                                  toggleCommentDropdown(comm.commentId);
                                }}
                                className="w-full px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-800 text-left flex items-center gap-2 text-blue-600 dark:text-blue-400 transition-colors"
                              >
                                <Pin className={`w-3.5 h-3.5 rotate-45 ${comm.isPinned ? 'fill-current' : ''}`} />
                                {comm.isPinned ? 'Unpin Comment' : 'Pin Comment'}
                              </button>
                            )}

                            {currentUser?.uid === comm.uid ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comm.commentId);
                                    setEditingCommentText(comm.text);
                                    toggleCommentDropdown(comm.commentId);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-800 text-left flex items-center gap-2 text-slate-700 dark:text-slate-300 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleCommentDelete(comm.commentId);
                                    toggleCommentDropdown(comm.commentId);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-left flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </>
                            ) : isVideoOwner ? (
                              <button
                                onClick={() => {
                                  handleCommentDelete(comm.commentId);
                                  toggleCommentDropdown(comm.commentId);
                                }}
                                className="w-full px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-left flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setReportType('comment');
                                  setReportTargetId(comm.commentId);
                                  setReportModalOpen(true);
                                  toggleCommentDropdown(comm.commentId);
                                }}
                                className="w-full px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-left flex items-center gap-2 transition-colors"
                              >
                                <Flag className="w-3.5 h-3.5" />
                                Report
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Render Replies (Collapsible YouTube-Style) */}
                  {(() => {
                    const commentReplies = comments.filter(reply => reply.parentCommentId === comm.commentId);
                    const repliesCount = commentReplies.length;
                    const isExpanded = expandedReplies[comm.commentId];

                    if (repliesCount === 0) return null;

                    return (
                      <div className="ml-12 mt-2 space-y-3">
                        <button
                          onClick={() => setExpandedReplies(prev => ({ ...prev, [comm.commentId]: !isExpanded }))}
                          className="text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer transition-colors select-none py-1 focus:outline-none"
                        >
                          <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                          <span>{isExpanded ? 'Hide replies' : `Show ${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}`}</span>
                        </button>

                        {isExpanded && (
                          <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 duration-200">
                            {commentReplies.map(reply => (
                              <div key={reply.commentId} className="flex gap-3 items-start group">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#1E293B] shrink-0 flex items-center justify-center text-slate-700 dark:text-slate-300 font-black text-[10px] select-none border border-slate-200 dark:border-slate-800">
                                  {reply.photoURL ? (
                                    <img src={reply.photoURL} alt="" className="w-full h-full object-cover rounded-lg" />
                                  ) : (
                                    getInitials(reply.displayName)
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 bg-slate-50/50 dark:bg-[#0f0f0f]/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 relative">
                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                    <span className="text-[11px] font-black text-slate-900 dark:text-[#F8FAFC]">{reply.displayName}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">• {formatTimeAgo(reply.createdAt)}</span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                    {renderCommentText(reply.text)}
                                  </p>
                                  
                                  {/* Dropdown for replies (only delete for owner) */}
                                  {currentUser?.uid === reply.uid && (
                                    <button 
                                      onClick={() => handleCommentDelete(reply.commentId)}
                                      className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Recommended Sidebar */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Related Videos</h3>
        
        <div className="space-y-3">
          {relatedVideos.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium">No related videos in this category.</p>
          ) : (
            relatedVideos.map((v) => (
              <div 
                key={v.videoId}
                onClick={() => navigate('watch', v.videoId)}
                className="flex gap-3 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-2.5 rounded-2xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="relative w-28 aspect-video bg-slate-100 dark:bg-[#1E293B] shrink-0 rounded-xl overflow-hidden">
                  <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-103 transition-transform" />
                </div>
                <div className="min-w-0 flex flex-col justify-between py-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {v.title}
                  </h4>
                  <div className="space-y-0.5 mt-1">
                    <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] truncate font-semibold">{v.creatorDisplayName}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{formatViews(v.viewsCount)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Content Reporting Modal Popups */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setReportModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-[#334155]">
            <h3 className="text-sm font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC] mb-4">
              Report Inappropriate Content
            </h3>
            <form onSubmit={submitReportHandler} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1.5">Select Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] rounded-xl font-semibold"
                >
                  <option value="spam">Spam / Advertisements</option>
                  <option value="misleading">Misleading or Scam</option>
                  <option value="harassment">Harassment or Hate Speech</option>
                  <option value="copyright">Intellectual Property Theft</option>
                  <option value="inappropriate">Inappropriate adult content</option>
                  <option value="other">Other issues</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1.5">Details (optional)</label>
                <textarea
                  placeholder="Explain your concern clearly..."
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] rounded-xl font-medium"
                />
              </div>
              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#F8FAFC] rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save to Playlist Modal */}
      <SaveToPlaylistModal
        video={video}
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
      />
    </div>
  );
};
