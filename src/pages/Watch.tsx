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
import { paidVideoService } from '../services/paidVideoService';
import { adService } from '../services/adService';
import { Video, Comment, User, AdCampaign } from '../types';
import { SponsoredAdCard } from '../components/ads/SponsoredAdCard';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import { SaveToPlaylistModal } from '../components/SaveToPlaylistModal';
import { UserAvatar } from '../components/UserAvatar';
import { parseVideoUrl, formatViews, formatTimeAgo, formatDuration, formatSubscribers, getInitials } from '../utils/videoUtils';
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
  MoreHorizontal,
  AlertTriangle,
  X,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
  Pin,
  Lock,
  Wallet,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Ban,
  Check
} from 'lucide-react';

export const Watch: React.FC = () => {
  const { route, navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast, refreshProfile } = useApp();
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
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [activeRelatedMenuId, setActiveRelatedMenuId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [savedWatchLaterMap, setSavedWatchLaterMap] = useState<Record<string, boolean>>({});
  
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

  // Paid Video Unlock & Paywall states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // Active User-Sponsored Ads
  const [activeAds, setActiveAds] = useState<AdCampaign[]>([]);

  useEffect(() => {
    adService.getActiveAds(5).then(setActiveAds).catch(console.warn);
  }, []);

  // Keyboard shortcut listener for 't' (Theater Mode)
  const [commentsCollapsed, setCommentsCollapsed] = useState(false);
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

        // Check Paid Video Access
        if (vid.isPaid && (vid.price || 0) > 0) {
          if (currentUser?.uid === vid.creatorId || currentUserProfile?.role === 'admin') {
            setIsUnlocked(true);
            setCheckingUnlock(false);
          } else if (currentUser) {
            paidVideoService.hasUserPurchasedVideo(currentUser.uid, vid.videoId).then(unlocked => {
              if (isMounted) {
                setIsUnlocked(unlocked);
                setCheckingUnlock(false);
              }
            }).catch(() => {
              if (isMounted) setCheckingUnlock(false);
            });
          } else {
            setIsUnlocked(false);
            setCheckingUnlock(false);
          }
        } else {
          setIsUnlocked(true);
          setCheckingUnlock(false);
        }

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
          // Award 2 points for watching video & update wallet/points state
          userService.awardPoints(currentUser.uid, 2).then(() => refreshProfile()).catch(console.error);
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
        // Award 5 points for liking video & refresh profile
        await userService.awardPoints(currentUser.uid, 5);
        await refreshProfile();
        addToast('Added to liked videos! (+5 Points)', 'success');

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

  const handleWatchLaterToggle = (targetVideo: Video) => {
    const isCurrentlySaved = !!savedWatchLaterMap[targetVideo.videoId];
    setSavedWatchLaterMap(prev => ({
      ...prev,
      [targetVideo.videoId]: !isCurrentlySaved
    }));
    addToast(isCurrentlySaved ? 'Removed from Watch Later' : 'Saved to Watch Later!', 'success');
    setActiveRelatedMenuId(null);
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

      // Award 10 points for commenting & refresh profile
      await userService.awardPoints(currentUser.uid, 10);
      await refreshProfile();

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

  const handleUnlockVideo = async () => {
    if (!currentUser) {
      addToast('Please sign in to unlock this video.', 'info');
      navigate('signin');
      return;
    }
    if (!video) return;

    const walletBal = currentUserProfile?.walletBalance || 0;
    const bonusBal = currentUserProfile?.bonusBalance || 0;
    const totalBal = Number((walletBal + bonusBal).toFixed(2));
    const price = video.price || 0;

    if (totalBal < price) {
      addToast(`Insufficient balance! Price is ₹${price}, your balance is ₹${totalBal.toFixed(2)}. Please top up your wallet.`, 'error');
      return;
    }

    setIsPurchasing(true);
    setUnlockError('');
    try {
      await paidVideoService.purchaseVideo(currentUser.uid, video);
      setIsUnlocked(true);
      await refreshProfile();
      addToast(`🎉 Payment successful! Video unlocked for ₹${price}. Enjoy watching!`, 'success');
    } catch (err: any) {
      setUnlockError(err.message || 'Payment failed.');
      addToast(err.message || 'Payment failed.', 'error');
    } finally {
      setIsPurchasing(false);
    }
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
    <div className={`p-0 sm:p-4 md:p-6 grid grid-cols-1 ${isTheaterMode ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-4 md:gap-6 max-w-7xl mx-auto pb-12 transition-all`}>
      
      {/* LEFT COLUMN: Player + Details + Comments */}
      <div className={`${isTheaterMode ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-4 md:space-y-6`}>
        
        {/* SocialIndia Custom Video Player or Paid Paywall Lock */}
        {video?.isPaid && (video?.price || 0) > 0 && !isUnlocked && !isVideoOwner && currentUserProfile?.role !== 'admin' ? (
          <div className="relative aspect-video w-full rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center p-6 text-center">
            {video.thumbnailUrl && (
              <img 
                src={video.thumbnailUrl} 
                alt={video.title} 
                className="absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/60" />

            <div className="relative z-10 max-w-md w-full space-y-4 text-white">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-amber-500/25">
                <Lock className="w-7 h-7 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Exclusive Paid Video
                </span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight line-clamp-1">{video.title}</h2>
                <p className="text-xs text-slate-300 font-medium">
                  By <strong>@{video.creatorUsername}</strong>. Unlock full video access for lifetime.
                </p>
              </div>

              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Access Fee:</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    ₹{video.price} INR
                  </span>
                </div>

                <div className="h-px bg-white/10" />

                <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
                  <span>Your Wallet Balance:</span>
                  <span className="font-mono font-bold text-white">
                    ₹{(currentUserProfile?.walletBalance || 0).toFixed(2)}
                  </span>
                </div>
                {(currentUserProfile?.bonusBalance || 0) > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-medium text-amber-300">
                    <span>Bonus Money Available:</span>
                    <span className="font-mono font-bold">
                      +₹{(currentUserProfile?.bonusBalance || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {unlockError && (
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold">
                  {unlockError}
                </div>
              )}

              <div className="flex flex-col gap-2.5 pt-1">
                {((currentUserProfile?.walletBalance || 0) + (currentUserProfile?.bonusBalance || 0)) >= (video.price || 0) ? (
                  <button
                    onClick={handleUnlockVideo}
                    disabled={isPurchasing}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isPurchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Pay ₹{video.price} & Unlock Video</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-300">
                      Insufficient Balance (Need ₹{((video.price || 0) - ((currentUserProfile?.walletBalance || 0) + (currentUserProfile?.bonusBalance || 0))).toFixed(2)} more)
                    </div>
                    <button
                      onClick={() => navigate('settings')}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Top Up Wallet Now</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <CustomVideoPlayer 
            video={video} 
            isTheaterMode={isTheaterMode}
            onToggleTheaterMode={() => setIsTheaterMode(prev => !prev)}
            seekToTime={seekToTime}
          />
        )}

        {/* Video Title and Social Interactions block */}
        <div className="px-3.5 sm:px-0 space-y-4">
          <h1 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC] leading-snug">
            <RichText text={video.title} onTimestampClick={(seconds) => setSeekToTime(seconds)} />
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-y border-slate-200 dark:border-[#334155]">
            {/* Creator Channel Card (Left Side) */}
            <div className="flex items-center gap-3">
              <UserAvatar 
                uid={video.creatorId}
                fallbackPhotoURL={video.creatorPhotoURL}
                fallbackDisplayName={video.creatorDisplayName}
                size="md"
                onClick={() => navigate('creator', video.creatorUsername)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-xs cursor-pointer hover:scale-105 transition-transform"
              />
              <div className="min-w-0">
                <h4 
                  onClick={() => navigate('creator', video.creatorUsername)}
                  className="text-xs sm:text-sm font-black text-slate-900 dark:text-[#F8FAFC] hover:underline cursor-pointer truncate flex items-center gap-1.5"
                >
                  <span>{video.creatorDisplayName}</span>
                  <span className="inline-flex items-center justify-center bg-blue-600 text-white text-[8px] w-3.5 h-3.5 rounded-full font-black shrink-0" title="Verified Creator">✓</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium leading-none mt-1">
                  {creator ? formatSubscribers(creator.followersCount) : '0 subscribers'}
                </p>
              </div>

              {currentUser?.uid !== video.creatorId && (
                <button
                  onClick={handleSubscribeToggle}
                  className={`ml-3 px-5 py-2 text-xs font-extrabold rounded-full transition-all cursor-pointer shadow-xs active:scale-95 ${
                    subscribed 
                      ? 'bg-slate-200 dark:bg-[#1E293B] text-slate-800 dark:text-[#F8FAFC] hover:bg-slate-300' 
                      : 'bg-[#0f0f0f] dark:bg-white text-white dark:text-black hover:bg-black/85 dark:hover:bg-slate-200'
                  }`}
                >
                  {subscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>

            {/* Video Social controls (Likes/Dislike Split Pill, Share, Download, Save, 3-Dots) */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 max-w-full relative">
              {/* Like / Dislike Split Pill */}
              <div className="bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-full flex items-center text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors shadow-xs">
                <button
                  onClick={handleLikeToggle}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-l-full cursor-pointer transition-colors"
                  title="Like"
                >
                  <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-[#2563eb] text-[#2563eb]' : ''}`} />
                  <span>{formatViews(video.likesCount || 0)}</span>
                </button>

                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

                <button
                  onClick={() => {
                    setDisliked(!disliked);
                    if (liked) {
                      setLiked(false);
                      setVideo(prev => prev ? { ...prev, likesCount: Math.max(0, prev.likesCount - 1) } : null);
                    }
                  }}
                  className="px-3 sm:px-3.5 py-2 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-r-full cursor-pointer transition-colors"
                  title="Dislike"
                >
                  <ThumbsDown className={`w-4 h-4 ${disliked ? 'fill-slate-700 text-slate-700 dark:fill-white dark:text-white' : ''}`} />
                </button>
              </div>

              {/* Share Pill */}
              <button
                onClick={handleShare}
                className="bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-full px-3.5 sm:px-4 py-2 flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer shadow-xs shrink-0"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              {/* Download Pill */}
              <button
                onClick={handleDownloadToggle}
                disabled={downloadProgress !== null}
                className={`rounded-full px-3.5 sm:px-4 py-2 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0 ${
                  isDownloaded
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100'
                }`}
                title={isDownloaded ? 'Downloaded offline' : 'Download video'}
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

              {/* Save Pill */}
              <button
                onClick={() => setPlaylistModalOpen(true)}
                className={`rounded-full px-3.5 sm:px-4 py-2 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0 ${
                  saved
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100'
                }`}
                title="Save to Playlist"
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                <span>Save</span>
              </button>

              {/* 3-Dots More Button */}
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreActions(!showMoreActions);
                  }}
                  className="bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-full w-9 h-9 flex items-center justify-center text-slate-800 dark:text-slate-100 transition-colors cursor-pointer shadow-xs"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {/* More Actions Dropdown Menu */}
                {showMoreActions && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-11 w-48 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-50 text-xs animate-in fade-in"
                  >
                    <button
                      onClick={() => {
                        handleShare();
                        setShowMoreActions(false);
                      }}
                      className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Share Video</span>
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadToggle();
                        setShowMoreActions(false);
                      }}
                      className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Download Video</span>
                    </button>
                    <button
                      onClick={() => {
                        setPlaylistModalOpen(true);
                        setShowMoreActions(false);
                      }}
                      className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                      <span>Save to Playlist</span>
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                    <button
                      onClick={() => {
                        setReportType('video');
                        setReportTargetId(video.videoId);
                        setReportModalOpen(true);
                        setShowMoreActions(false);
                      }}
                      className="w-full px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 text-left text-rose-600 font-bold cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report Video</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Video Description Box (Shows real views, createdAt date, database tags, and real description) */}
        <div className="p-4 bg-slate-100/90 dark:bg-[#1E293B]/70 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
            <span>{formatViews(video.viewsCount || 0)} views</span>
            <span>•</span>
            <span>{video.createdAt ? new Date(video.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Just now'}</span>
            {video.category && (
              <>
                <span>•</span>
                <span 
                  onClick={() => navigate('home', undefined, { category: video.category })}
                  className="uppercase text-[#0070f3] dark:text-[#00d2ff] hover:text-[#005cd6] dark:hover:text-[#67e8f9] hover:underline cursor-pointer font-bold transition-colors"
                >
                  #{video.category}
                </span>
              </>
            )}
          </div>

          {/* Real Hashtags from Database if tags exist (Electric Blue) */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {video.tags.map((t, idx) => (
                <span 
                  key={idx}
                  onClick={() => navigate('search', undefined, { q: `#${t}` })}
                  className="text-[#0070f3] dark:text-[#00d2ff] hover:text-[#005cd6] dark:hover:text-[#67e8f9] hover:underline cursor-pointer transition-colors"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Real Video Description from Database */}
          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed pt-1">
            {video.description ? (
              video.description.length <= 150 ? (
                <RichText text={video.description} onTimestampClick={(seconds) => setSeekToTime(seconds)} />
              ) : isDescriptionExpanded ? (
                <div>
                  <RichText text={video.description} onTimestampClick={(seconds) => setSeekToTime(seconds)} />
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(false)}
                    className="mt-2 font-black text-[#0070f3] dark:text-[#00d2ff] hover:underline cursor-pointer block text-xs"
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
                    className="ml-1 font-black text-[#0070f3] dark:text-[#00d2ff] hover:underline cursor-pointer inline-block text-xs"
                  >
                    ...more
                  </button>
                </div>
              )
            ) : (
              <p className="text-slate-400 dark:text-slate-500 italic">No description provided for this video.</p>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-4 bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200/80 dark:border-[#334155] shadow-xs">
          <div 
            onClick={() => setCommentsCollapsed(!commentsCollapsed)}
            className="flex items-center justify-between cursor-pointer select-none pb-1"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC] tracking-wider">
                Comments ({video.commentsCount})
              </h3>
              <span className="text-[10px] text-slate-500 font-bold">
                • Tap to {commentsCollapsed ? 'open' : 'close'}
              </span>
            </div>

            <button
              type="button"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors cursor-pointer"
            >
              {commentsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {!commentsCollapsed && (
            <>
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
        </>
      )}
    </div>
      </div>

      {/* RIGHT COLUMN: Recommended Sidebar (Matches Reference UI with Category Pills, Upload Dates, and 3-Dots Menu) */}
      <div className="px-3.5 sm:px-0 space-y-4">
        {/* Promoted / Sponsored User Ad */}
        {activeAds.length > 0 && (
          <SponsoredAdCard ad={activeAds[0]} layout="sidebar" />
        )}

        {/* Category Filter Pills (Matches Reference) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['All', `From ${video.creatorDisplayName?.split(' ')[0] || 'Creator'}`, 'Politics', 'Related'].map((pill) => (
            <button
              key={pill}
              onClick={() => setSelectedCategoryFilter(pill)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-xs ${
                selectedCategoryFilter === pill
                  ? 'bg-[#0f0f0f] dark:bg-white text-white dark:text-black font-black'
                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
        
        {/* Related Videos List */}
        <div className="space-y-3">
          {(() => {
            const displayList = relatedVideos.filter(v => {
              if (selectedCategoryFilter === 'All') return true;
              if (selectedCategoryFilter.startsWith('From')) return v.creatorId === video.creatorId;
              if (selectedCategoryFilter === 'Related') return true;
              return v.category?.toLowerCase() === selectedCategoryFilter.toLowerCase();
            });

            if (displayList.length === 0) {
              return <p className="text-xs text-slate-400 font-medium py-4 text-center">No related videos in this category.</p>;
            }

            return displayList.map((v) => (
              <div 
                key={v.videoId}
                onClick={() => navigate('watch', v.videoId)}
                className="flex items-start gap-3 bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-[#334155] p-2.5 rounded-2xl cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group relative"
              >
                {/* 16:9 Thumbnail with Duration Badge */}
                <div className="relative w-36 sm:w-40 aspect-video bg-slate-900 shrink-0 rounded-xl overflow-hidden shadow-xs">
                  <img 
                    src={v.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'} 
                    alt={v.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  {/* Duration Badge */}
                  {v.duration ? (
                    <span className="absolute bottom-1 right-1 bg-black/85 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs">
                      {formatDuration(v.duration)}
                    </span>
                  ) : null}
                </div>

                {/* Video Info */}
                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {v.title}
                  </h4>
                  
                  <div className="mt-1 space-y-0.5">
                    {/* Creator Display Name with Verified Checkmark */}
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium truncate flex items-center gap-1">
                      <span>{v.creatorDisplayName}</span>
                      <span className="inline-flex items-center justify-center bg-blue-600 text-white text-[7px] w-3 h-3 rounded-full font-black shrink-0">✓</span>
                    </p>

                    {/* Views Count and Upload Date (e.g. 10.3M views • 1 day ago) */}
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium">
                      {formatViews(v.viewsCount)} views • {formatTimeAgo(v.createdAt)}
                    </p>
                  </div>
                </div>

                {/* 3-Dots Menu Button (⋮) */}
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRelatedMenuId(activeRelatedMenuId === v.videoId ? null : v.videoId);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Action menu"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* 3-Dots Dropdown Popover */}
                  {activeRelatedMenuId === v.videoId && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-7 w-44 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in"
                    >
                      <button
                        onClick={() => {
                          const shareUrl = `${window.location.origin}/#/watch/${v.videoId}`;
                          if (navigator.share) {
                            navigator.share({ title: v.title, url: shareUrl }).catch(() => {});
                          } else {
                            navigator.clipboard.writeText(shareUrl);
                            addToast('Link copied to clipboard!', 'success');
                          }
                          setActiveRelatedMenuId(null);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>Share</span>
                      </button>

                      <button
                        onClick={async () => {
                          addToast('Downloading video...', 'info');
                          try {
                            await downloadService.downloadVideo(v, () => {});
                            addToast('Video saved to Downloads!', 'success');
                          } catch (err) {
                            addToast('Download initiated!', 'info');
                          }
                          setActiveRelatedMenuId(null);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Download</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!currentUser) {
                            addToast('Please sign in to save videos', 'info');
                          } else {
                            savedVideoService.saveVideo(currentUser.uid, v);
                            addToast('Saved to playlist!', 'success');
                          }
                          setActiveRelatedMenuId(null);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                        <span>Save to Playlist</span>
                      </button>

                      <button
                        onClick={() => {
                          handleWatchLaterToggle(v);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{savedWatchLaterMap[v.videoId] ? 'Remove Watch Later' : 'Save to Watch Later'}</span>
                      </button>

                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                      <button
                        onClick={() => {
                          addToast('Feedback noted. We will recommend fewer videos like this.', 'info');
                          setActiveRelatedMenuId(null);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-500 font-medium cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5 text-slate-400" />
                        <span>Not interested</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ));
          })()}
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
