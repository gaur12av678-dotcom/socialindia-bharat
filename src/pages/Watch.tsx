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
import { playlistService } from '../services/playlistService';
import { recommendationService } from '../services/recommendationService';
import { playbackProgressService } from '../services/playbackProgressService';
import { Video, Comment, User, AdCampaign, Playlist } from '../types';
import { SponsoredAdCard } from '../components/ads/SponsoredAdCard';
import { ExternalAdBanner } from '../components/ads/ExternalAdBanner';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import { SaveToPlaylistModal } from '../components/SaveToPlaylistModal';
import { UserAvatar } from '../components/UserAvatar';
import { parseVideoUrl, formatViews, formatTimeAgo, formatDuration, formatSubscribers, getInitials } from '../utils/videoUtils';
import { RichText } from '../components/RichText';
import { useTranslation } from '../i18n';
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
  Check,
  ListVideo,
  Shuffle,
  Repeat,
  Play as PlayIcon,
  SkipForward
} from 'lucide-react';

export const Watch: React.FC = () => {
  const { route, navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast, refreshProfile } = useApp();
  const { t, isHindi, formatTime } = useTranslation();
  const videoId = route.param;

  // Instant synchronous cache resolution (0ms, no loading spinner flash!)
  const cachedInitialVid = videoService.getCachedVideo(videoId);
  const [video, setVideo] = useState<Video | null>(() => cachedInitialVid);
  const [creator, setCreator] = useState<User | null>(() => {
    if (cachedInitialVid?.creatorId) {
      return userService.getCachedUserProfile(cachedInitialVid.creatorId);
    }
    return null;
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [candidateVideoPool, setCandidateVideoPool] = useState<Video[]>(() => {
    return videoService.getCachedVideos({ isShort: false });
  });
  const [sidebarDisplayCount, setSidebarDisplayCount] = useState<number>(8);
  const [isLoadingMoreSidebar, setIsLoadingMoreSidebar] = useState<boolean>(false);
  const sidebarSentinelRef = useRef<HTMLDivElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Status states - instantly ready if video was in cache
  const [loading, setLoading] = useState<boolean>(() => !cachedInitialVid);
  const [liked, setLiked] = useState<boolean>(() => {
    return !!(currentUser?.uid && videoId && likeService.hasLikedSync(videoId, currentUser.uid));
  });
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean>(() => {
    return !!(currentUser?.uid && cachedInitialVid?.creatorId && subscriptionService.isSubscribedSync(currentUser.uid, cachedInitialVid.creatorId));
  });
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [activeRelatedMenuId, setActiveRelatedMenuId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [savedWatchLaterMap, setSavedWatchLaterMap] = useState<Record<string, boolean>>({});

  // YouTube-style smart recommendation algorithm for Watch sidebar
  const recommendedSidebarVideos = React.useMemo(() => {
    if (!video || candidateVideoPool.length === 0) return [];
    return recommendationService.getWatchSidebarRecommendations({
      currentVideo: video,
      allVideos: candidateVideoPool,
      selectedCategory: selectedCategoryFilter,
      userUid: currentUser?.uid,
    });
  }, [video, candidateVideoPool, selectedCategoryFilter, currentUser?.uid]);

  const displayedSidebarVideos = React.useMemo(() => {
    return recommendedSidebarVideos.slice(0, sidebarDisplayCount);
  }, [recommendedSidebarVideos, sidebarDisplayCount]);

  const hasMoreSidebarVideos = sidebarDisplayCount < recommendedSidebarVideos.length;

  // Infinite scroll trigger for Watch sidebar videos
  useEffect(() => {
    if (!hasMoreSidebarVideos || isLoadingMoreSidebar) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0] && entries[0].isIntersecting) {
        setIsLoadingMoreSidebar(true);
        setTimeout(() => {
          setSidebarDisplayCount(prev => prev + 8);
          setIsLoadingMoreSidebar(false);
        }, 180);
      }
    }, { rootMargin: '300px' });

    const el = sidebarSentinelRef.current;
    if (el) {
      observer.observe(el);
    }
    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [hasMoreSidebarVideos, isLoadingMoreSidebar, recommendedSidebarVideos.length]);

  // Dynamic category pills list for Watch page sidebar
  const categoryPills = React.useMemo(() => {
    const pills: { id: string; label: string }[] = [
      { id: 'All', label: isHindi ? 'सभी' : 'All' }
    ];

    if (video?.category && video.category !== 'All' && video.category !== 'Other') {
      pills.push({
        id: video.category,
        label: video.category
      });
    }

    if (video?.creatorDisplayName) {
      const creatorFirstName = video.creatorDisplayName.split(' ')[0] || 'Creator';
      pills.push({
        id: `From ${video.creatorDisplayName}`,
        label: isHindi ? `${creatorFirstName} से` : `From ${creatorFirstName}`
      });
    }

    // Add popular categories from candidate video pool that have videos
    const popularCats = ['Music', 'Gaming', 'Technology', 'Education', 'Entertainment', 'News', 'Comedy', 'Sports', 'Science'];
    const presentCats = new Set(
      candidateVideoPool
        .map(v => v.category?.trim())
        .filter((c): c is string => !!c && c !== 'All' && c !== 'Other' && c !== video?.category)
    );

    for (const cat of popularCats) {
      if (presentCats.has(cat) && !pills.some(p => p.id.toLowerCase() === cat.toLowerCase())) {
        pills.push({ id: cat, label: cat });
      }
      if (pills.length >= 7) break;
    }

    // Always include 'Related' as fallback
    if (!pills.some(p => p.id === 'Related')) {
      pills.push({ id: 'Related', label: isHindi ? 'संबंधित' : 'Related' });
    }

    return pills;
  }, [video?.category, video?.creatorDisplayName, candidateVideoPool, isHindi]);

  const handleCategoryFilterChange = (newCat: string) => {
    setSelectedCategoryFilter(newCat);
    setSidebarDisplayCount(8);
  };
  
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
  const [seekToTime, setSeekToTime] = useState<number | undefined>(() => {
    return videoId ? (playbackProgressService.getProgress(videoId, cachedInitialVid?.duration) || undefined) : undefined;
  });

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

  // Comment reactions state (YouTube-Style likes, dislikes)
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [dislikedCommentIds, setDislikedCommentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentUser?.uid) {
      const { likedCommentIds: lIds, dislikedCommentIds: dIds } = commentService.getUserReactions(currentUser.uid);
      setLikedCommentIds(lIds);
      setDislikedCommentIds(dIds);
    } else {
      setLikedCommentIds(new Set());
      setDislikedCommentIds(new Set());
    }
  }, [currentUser?.uid]);

  // Active Playlist Queue State (YouTube Style) with 0ms instant cache display
  const playlistId = route.searchParams?.list;
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(() => {
    return playlistId ? playlistService.getCachedPlaylist(playlistId) : null;
  });
  const [playlistVideos, setPlaylistVideos] = useState<Video[]>(() => {
    if (!playlistId) return [];
    const cached = playlistService.getCachedPlaylist(playlistId);
    if (!cached || !cached.videoIds) return [];
    return cached.videoIds
      .map(id => videoService.getCachedVideo(id))
      .filter((v): v is Video => v !== null && v !== undefined);
  });
  const [isPlaylistLoop, setIsPlaylistLoop] = useState(false);
  const [isPlaylistShuffle, setIsPlaylistShuffle] = useState(false);
  const [isPlaylistPanelOpen, setIsPlaylistPanelOpen] = useState(true);

  // Load Playlist details & videos if playlistId is present (parallel non-blocking)
  useEffect(() => {
    if (!playlistId) {
      setActivePlaylist(null);
      setPlaylistVideos([]);
      return;
    }
    let isMounted = true;
    
    // Fast initial check: if cache exists, hydrate immediately
    const cachedPl = playlistService.getCachedPlaylist(playlistId);
    if (cachedPl && isMounted) {
      setActivePlaylist(cachedPl);
      if (cachedPl.videoIds) {
        const cachedVids = cachedPl.videoIds
          .map(id => videoService.getCachedVideo(id))
          .filter((v): v is Video => v !== null && v !== undefined);
        if (cachedVids.length > 0) {
          setPlaylistVideos(cachedVids);
        }
      }
    }

    playlistService.getPlaylistWithVideos(playlistId).then(({ playlist, videos }) => {
      if (isMounted) {
        if (playlist) {
          setActivePlaylist(playlist);
        } else if (videos.length > 0) {
          setActivePlaylist({
            playlistId,
            title: 'Playlist Queue',
            description: '',
            creatorId: '',
            creatorUsername: 'playlist',
            creatorDisplayName: 'SocialIndia',
            creatorPhotoURL: '',
            videoIds: videos.map(v => v.videoId),
            isPrivate: false,
            thumbnailUrl: videos[0]?.thumbnailUrl || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        if (videos && videos.length > 0) {
          setPlaylistVideos(videos);
        }
      }
    }).catch(err => {
      console.warn('Failed to load playlist queue:', err);
    });

    return () => { isMounted = false; };
  }, [playlistId]);

  // Current Playlist Navigation Logic
  const currentPlaylistIndex = playlistVideos.findIndex(v => v.videoId === videoId);
  const hasNextPlaylistVideo = playlistVideos.length > 1 && (
    (currentPlaylistIndex >= 0 && currentPlaylistIndex < playlistVideos.length - 1) || isPlaylistLoop
  );
  const nextPlaylistVideo = currentPlaylistIndex >= 0
    ? (currentPlaylistIndex < playlistVideos.length - 1
        ? playlistVideos[currentPlaylistIndex + 1]
        : (isPlaylistLoop ? playlistVideos[0] : null))
    : (playlistVideos.length > 0 ? playlistVideos[0] : null);

  const handlePlayNextInPlaylist = () => {
    if (nextPlaylistVideo) {
      navigate('watch', nextPlaylistVideo.videoId, playlistId ? { list: playlistId } : undefined);
    }
  };

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
  const lastSavedProgressRef = useRef<number>(0);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;

    const loadVideoDetails = async () => {
      const cached = videoService.getCachedVideo(videoId);
      if (cached) {
        setVideo(cached);
        setLoading(false);
        if (cached.creatorId) {
          const cr = userService.getCachedUserProfile(cached.creatorId);
          if (cr) setCreator(cr);
        }
      } else {
        setLoading(true);
      }
      try {
        const vid = await videoService.getVideo(videoId);
        if (!isMounted) return;

        if (!vid) {
          if (!cached) setVideo(null);
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
        recommendationService.recordVideoWatch(videoId, currentUser?.uid);
        
        // Fetch last watched time (from synchronous local storage cache first, then Firestore history)
        const localProgress = playbackProgressService.getProgress(videoId, vid.duration);
        if (localProgress > 5) {
          setSeekToTime(localProgress);
        }
        if (currentUser) {
          historyService.getHistory(currentUser.uid).then(history => {
            playbackProgressService.syncFromHistoryItems(history);
            const item = history.find(h => h.videoId === videoId);
            if (item && item.progressSeconds && item.progressSeconds > 5) {
              setSeekToTime(item.progressSeconds);
            }
          }).catch(console.error);
        }

        userService.getUserProfile(vid.creatorId, true).then(crProfile => {
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

        commentService.getComments(videoId).then(commList => {
          if (isMounted) setComments(commList);
        }).catch(console.error);

        // Fetch full library of public videos for sidebar recommendation algorithm
        videoService.getVideos({ isShort: false, limit: 120 }).then(pool => {
          if (isMounted && pool.length > 0) {
            setCandidateVideoPool(pool);
          }
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
  }, [videoId]);

  // Separate non-blocking user interaction checks (liked, saved, subscribed, history)
  useEffect(() => {
    if (!videoId || !currentUser?.uid) return;
    let isMounted = true;

    if (video) {
      historyService.addToHistory(currentUser.uid, video).catch(console.error);
    }
    likeService.hasLiked(videoId, currentUser.uid).then(isL => isMounted && setLiked(isL)).catch(console.error);
    savedVideoService.isSaved(currentUser.uid, videoId).then(isS => isMounted && setSaved(isS)).catch(console.error);
    if (video?.creatorId) {
      subscriptionService.isSubscribed(currentUser.uid, video.creatorId).then(isSub => isMounted && setSubscribed(isSub)).catch(console.error);
    }
    // Award 2 points for watching quietly
    userService.awardPoints(currentUser.uid, 2).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [videoId, currentUser?.uid, video?.creatorId]);

  // Save playback progress on page exit, back button, or tab switch (YouTube Style)
  useEffect(() => {
    const handleSaveCurrentProgress = () => {
      if (video && lastSavedProgressRef.current > 0) {
        playbackProgressService.saveProgress(video.videoId, lastSavedProgressRef.current, video.duration || 0, currentUser?.uid);
      }
    };
    window.addEventListener('beforeunload', handleSaveCurrentProgress);
    document.addEventListener('visibilitychange', handleSaveCurrentProgress);
    return () => {
      window.removeEventListener('beforeunload', handleSaveCurrentProgress);
      document.removeEventListener('visibilitychange', handleSaveCurrentProgress);
      handleSaveCurrentProgress();
    };
  }, [video, currentUser?.uid]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-black rounded-2xl w-full flex items-center justify-center p-6 text-center shadow-xl relative overflow-hidden border border-slate-800">
            <div className="w-14 h-14 rounded-full border-[3.5px] border-white/20 border-t-[#2563eb] animate-spin shadow-lg" />
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
        likesCount: Math.max(0, prev.likesCount + (previouslyLiked ? -1 : 1))
      };
    });

    try {
      if (previouslyLiked) {
        await likeService.unlikeVideo(video.videoId, currentUser.uid);
      } else {
        await likeService.likeVideo(video.videoId, currentUser.uid, video);
        // Award 5 points for liking video quietly in background
        userService.awardPoints(currentUser.uid, 5).catch(console.error);

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
      } else {
        await savedVideoService.saveVideo(currentUser.uid, video);
        setSaved(true);
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
    if (isSubscribing) return;
    setIsSubscribing(true);

    const previousSubState = subscribed;
    const nextSubState = !previousSubState;

    // 100% INSTANT OPTIMISTIC UPDATE (0ms latency, YouTube style!)
    setSubscribed(nextSubState);
    setCreator(prev => prev ? { 
      ...prev, 
      followersCount: Math.max(0, (prev.followersCount || 0) + (nextSubState ? 1 : -1)) 
    } : null);

    try {
      const isSub = await subscriptionService.toggleSubscription(currentUser.uid, video.creatorId, {
        username: video.creatorUsername,
        displayName: video.creatorDisplayName,
        photoURL: video.creatorPhotoURL
      }, nextSubState);
      setSubscribed(isSub);

      if (isSub) {
        notificationService.createNotification(video.creatorId, currentUserProfile, 'follow', {}).catch(console.error);
      }
    } catch (err) {
      // Rollback on failure
      setSubscribed(previousSubState);
      setCreator(prev => prev ? { 
        ...prev, 
        followersCount: Math.max(0, (prev.followersCount || 0) + (previousSubState ? 1 : -1)) 
      } : null);
      addToast('Subscription change failed.', 'error');
    } finally {
      setIsSubscribing(false);
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
    if (isPostingComment) return;
    const textToPost = newCommentText.trim();
    if (!textToPost) return;

    setIsPostingComment(true);

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
      userService.awardPoints(currentUser.uid, 10).catch(console.warn);

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
    } finally {
      setIsPostingComment(false);
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

  const handleLikeComment = async (targetComment: Comment) => {
    if (!currentUser) {
      addToast('Please sign in to like comments.', 'info');
      return;
    }
    const isCurrentlyLiked = likedCommentIds.has(targetComment.commentId);
    const isCurrentlyDisliked = dislikedCommentIds.has(targetComment.commentId);

    // Optimistic reaction update
    setLikedCommentIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyLiked) {
        next.delete(targetComment.commentId);
      } else {
        next.add(targetComment.commentId);
      }
      return next;
    });

    if (isCurrentlyDisliked) {
      setDislikedCommentIds(prev => {
        const next = new Set(prev);
        next.delete(targetComment.commentId);
        return next;
      });
    }

    setComments(prev => prev.map(c => {
      if (c.commentId === targetComment.commentId) {
        const diff = isCurrentlyLiked ? -1 : 1;
        return {
          ...c,
          likesCount: Math.max(0, (c.likesCount || 0) + diff)
        };
      }
      return c;
    }));

    try {
      if (isCurrentlyLiked) {
        await commentService.unlikeComment(video.videoId, targetComment.commentId, currentUser.uid);
      } else {
        await commentService.likeComment(video.videoId, targetComment.commentId, currentUser.uid);
      }
    } catch (err) {
      console.warn('Failed to update comment like:', err);
    }
  };

  const handleDislikeComment = async (targetComment: Comment) => {
    if (!currentUser) {
      addToast('Please sign in to dislike comments.', 'info');
      return;
    }
    const isCurrentlyDisliked = dislikedCommentIds.has(targetComment.commentId);
    const isCurrentlyLiked = likedCommentIds.has(targetComment.commentId);

    // Optimistic reaction update
    setDislikedCommentIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyDisliked) {
        next.delete(targetComment.commentId);
      } else {
        next.add(targetComment.commentId);
      }
      return next;
    });

    if (isCurrentlyLiked) {
      setLikedCommentIds(prev => {
        const next = new Set(prev);
        next.delete(targetComment.commentId);
        return next;
      });
      setComments(prev => prev.map(c => {
        if (c.commentId === targetComment.commentId) {
          return {
            ...c,
            likesCount: Math.max(0, (c.likesCount || 0) - 1)
          };
        }
        return c;
      }));
    }

    try {
      if (isCurrentlyDisliked) {
        await commentService.undislikeComment(video.videoId, targetComment.commentId, currentUser.uid);
      } else {
        await commentService.dislikeComment(video.videoId, targetComment.commentId, currentUser.uid);
      }
    } catch (err) {
      console.warn('Failed to update comment dislike:', err);
    }
  };

  const handleHeartComment = async (targetComment: Comment) => {
    if (!currentUser || currentUser.uid !== video?.creatorId) return;
    const nextHeart = !targetComment.hasCreatorHeart;

    // Optimistic heart update
    setComments(prev => prev.map(c => {
      if (c.commentId === targetComment.commentId) {
        return {
          ...c,
          hasCreatorHeart: nextHeart
        };
      }
      return c;
    }));

    try {
      await commentService.heartComment(video.videoId, targetComment.commentId, nextHeart);
      addToast(nextHeart ? 'Loved this comment ❤️' : 'Removed heart from comment', 'success');
    } catch (err) {
      console.warn('Failed to heart comment:', err);
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

    const replyText = editingCommentText.trim();
    const tempReplyId = `temp-reply-${Date.now()}`;
    const now = new Date().toISOString();

    const tempReply: Comment = {
      commentId: tempReplyId,
      videoId: video!.videoId,
      uid: currentUser.uid,
      username: currentUserProfile.username,
      displayName: currentUserProfile.displayName,
      photoURL: currentUserProfile.photoURL || '',
      text: replyText,
      likesCount: 0,
      parentCommentId,
      createdAt: now,
      updatedAt: now
    };

    // Instant optimistic render (0ms!)
    setComments(prev => [...prev, tempReply]);
    setExpandedReplies(prev => ({ ...prev, [parentCommentId]: true }));
    setEditingCommentId(null);
    setEditingCommentText('');
    setVideo(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);

    try {
      const newReply = await commentService.addComment(video!.videoId, {
        uid: currentUser.uid,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL || '',
        text: replyText,
        parentCommentId
      });

      setComments(prev => prev.map(c => c.commentId === tempReplyId ? newReply : c));
    } catch (err) {
      // Rollback on error
      setComments(prev => prev.filter(c => c.commentId !== tempReplyId));
      setVideo(prev => prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : null);
      setEditingCommentText(replyText);
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
                      <span>Go to Wallet</span>
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
            onEnded={() => {
              if (activePlaylist && nextPlaylistVideo) {
                handlePlayNextInPlaylist();
              }
            }}
            onNextVideo={nextPlaylistVideo ? handlePlayNextInPlaylist : undefined}
            hasNextVideo={!!nextPlaylistVideo}
            onReport={() => {
              setReportType('video');
              setReportTargetId(video.videoId);
              setReportModalOpen(true);
            }}
            onProgress={(seconds) => {
              if (video) {
                lastSavedProgressRef.current = seconds;
                playbackProgressService.saveProgress(video.videoId, seconds, video.duration || 0, currentUser?.uid);
              }
            }}
          />
        )}

        {/* MOBILE COLLAPSIBLE PLAYLIST BAR (YouTube Style) */}
        {activePlaylist && (
          <div className="block lg:hidden px-3.5 sm:px-0">
            <div 
              onClick={() => setIsPlaylistPanelOpen(!isPlaylistPanelOpen)}
              className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ListVideo className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-black truncate text-slate-900 dark:text-white">
                    Playlist: {activePlaylist.title}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Video {currentPlaylistIndex >= 0 ? currentPlaylistIndex + 1 : 1} of {playlistVideos.length} • @{activePlaylist.creatorUsername}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hasNextPlaylistVideo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayNextInPlaylist();
                    }}
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Next in Playlist"
                  >
                    <SkipForward className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}
                {isPlaylistPanelOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isPlaylistPanelOpen && (
              <div className="mt-2 bg-white dark:bg-[#111827] text-slate-900 dark:text-white p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-64 overflow-y-auto space-y-1.5 scrollbar-thin">
                {playlistVideos.map((pVid, pIdx) => {
                  const isCurrent = pVid.videoId === videoId;
                  return (
                    <div
                      key={pVid.videoId}
                      onClick={() => navigate('watch', pVid.videoId, { list: activePlaylist.playlistId })}
                      className={`flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <div className="w-5 text-center shrink-0">
                        {isCurrent ? (
                          <PlayIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 fill-current mx-auto animate-pulse" />
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{pIdx + 1}</span>
                        )}
                      </div>
                      <img src={pVid.thumbnailUrl} alt={pVid.title} className="w-16 aspect-video rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-800" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs truncate ${isCurrent ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-900 dark:text-slate-100 font-bold'}`}>
                          {pVid.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{pVid.creatorDisplayName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                  {creator ? (isHindi ? `${formatSubscribers(creator.followersCount).replace(/subscribers/i, '').trim()} सब्सक्राइबर्स` : formatSubscribers(creator.followersCount)) : (isHindi ? '0 सब्सक्राइबर्स' : '0 subscribers')}
                </p>
              </div>

              {currentUser?.uid === video.creatorId ? (
                <button
                  type="button"
                  onClick={() => navigate('studio')}
                  className="ml-3 px-4 py-2 text-xs font-bold rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-slate-800 text-slate-800 dark:text-[#F8FAFC] border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95"
                  title={t('nav_studio', 'Creator Studio')}
                >
                  {t('nav_studio', 'Creator Studio')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubscribeToggle}
                  disabled={isSubscribing}
                  className={`ml-3 px-5 py-2 text-xs font-extrabold rounded-full transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60 ${
                    subscribed 
                      ? 'bg-slate-200 dark:bg-[#1E293B] text-slate-800 dark:text-[#F8FAFC] hover:bg-slate-300' 
                      : 'bg-[#0f0f0f] dark:bg-white text-white dark:text-black hover:bg-black/85 dark:hover:bg-slate-200'
                  }`}
                  title={subscribed ? 'Subscribed' : 'Subscribe'}
                >
                  {subscribed ? t('action_subscribed', 'Subscribed') : t('action_subscribe', 'Subscribe')}
                </button>
              )}
            </div>

            {/* Video Social controls (Likes/Dislike Split Pill, Share, Download, Save, 3-Dots) */}
            <div className="relative">
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1 max-w-full">
                {/* Like / Dislike Split Pill */}
                <div className="bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-full flex items-center text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors shadow-xs shrink-0">
                  <button
                    onClick={handleLikeToggle}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-l-full cursor-pointer transition-colors"
                    title={t('action_like', 'Like')}
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
                    title={t('action_dislike', 'Dislike')}
                  >
                    <ThumbsDown className={`w-4 h-4 ${disliked ? 'fill-slate-700 text-slate-700 dark:fill-white dark:text-white' : ''}`} />
                  </button>
                </div>

                {/* Share Pill */}
                <button
                  onClick={handleShare}
                  className="bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-full px-3.5 sm:px-4 py-2 flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer shadow-xs shrink-0"
                  title={t('action_share', 'Share')}
                >
                  <Share2 className="w-4 h-4" />
                  <span>{t('action_share', 'Share')}</span>
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
                  title={isDownloaded ? t('action_downloaded', 'Downloaded') : t('action_download', 'Download')}
                >
                  {downloadProgress !== null ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>{downloadProgress}%</span>
                    </>
                  ) : isDownloaded ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{t('action_downloaded', 'Downloaded')}</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-4 h-4" />
                      <span>{t('action_download', 'Download')}</span>
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
                  title={isHindi ? 'प्लेलिस्ट में सहेजें' : 'Save to Playlist'}
                >
                  <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  <span>{saved ? t('action_saved', 'Saved') : t('action_save', 'Save')}</span>
                </button>

                {/* 3-Dots More Button (YouTube Style) */}
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoreActions(!showMoreActions);
                    }}
                    className={`rounded-full w-9 h-9 flex items-center justify-center transition-colors cursor-pointer shadow-xs ${
                      showMoreActions 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100'
                    }`}
                    title={isHindi ? 'अधिक विकल्प' : 'More actions'}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* YouTube-Style Floating 3-Dots Dropdown Menu (Screenshot 3 Matching) */}
              {showMoreActions && (
                <>
                  <div 
                    onClick={() => setShowMoreActions(false)}
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
                  />
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-12 w-60 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in space-y-0.5"
                  >
                    {/* 1. Watch Ad-free / Premium (YouTube style) */}
                    <button
                      onClick={() => {
                        setShowMoreActions(false);
                        navigate('pro');
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-left text-slate-800 dark:text-slate-100 font-bold cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="font-bold text-xs">{isHindi ? 'विज्ञापन-मुक्त देखें' : 'Watch ad-free'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{isHindi ? 'SocialIndia Pro आजमाएं' : 'Try Premium for ₹0'}</div>
                      </div>
                    </button>

                    {/* 2. Download */}
                    <button
                      onClick={() => {
                        handleDownloadToggle();
                        setShowMoreActions(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-left text-slate-800 dark:text-slate-100 font-bold cursor-pointer transition-colors"
                    >
                      <ArrowDownToLine className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{t('action_download', 'Download')}</span>
                    </button>

                    {/* 3. Save to Playlist */}
                    <button
                      onClick={() => {
                        setPlaylistModalOpen(true);
                        setShowMoreActions(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-left text-slate-800 dark:text-slate-100 font-bold cursor-pointer transition-colors"
                    >
                      <Bookmark className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>{isHindi ? 'प्लेलिस्ट में सहेजें' : 'Save to Playlist'}</span>
                    </button>

                    {/* 4. Copy Link */}
                    <button
                      onClick={() => {
                        handleShare();
                        setShowMoreActions(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-left text-slate-800 dark:text-slate-100 font-bold cursor-pointer transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>{isHindi ? 'वीडियो लिंक कॉपी करें' : 'Copy video link'}</span>
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-slate-700/60 my-1" />

                    {/* 5. Report */}
                    <button
                      onClick={() => {
                        setReportType('video');
                        setReportTargetId(video.videoId);
                        setReportModalOpen(true);
                        setShowMoreActions(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-3 text-left text-rose-600 dark:text-rose-400 font-bold cursor-pointer transition-colors"
                    >
                      <Flag className="w-4 h-4 shrink-0" />
                      <span>{t('action_report', 'Report')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Video Description Box (Shows real views, createdAt date, database tags, and real description) */}
        <div className="p-4 bg-slate-100/90 dark:bg-[#1E293B]/70 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
            <span>{formatViews(video.viewsCount || 0)} {isHindi ? 'दृश्य (व्यूज़)' : 'views'}</span>
            <span>•</span>
            <span>{video.createdAt ? (isHindi ? new Date(video.createdAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(video.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })) : (isHindi ? 'अभी-अभी' : 'Just now')}</span>
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
                    {isHindi ? 'कम दिखाएं' : 'Show less'}
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
                    {isHindi ? '...और दिखाएं' : '...more'}
                  </button>
                </div>
              )
            ) : (
              <p className="text-slate-400 dark:text-slate-500 italic">{isHindi ? 'इस वीडियो के लिए कोई विवरण नहीं दिया गया है।' : 'No description provided for this video.'}</p>
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
                {t('comments', 'Comments')} ({video.commentsCount})
              </h3>
              <span className="text-[10px] text-slate-500 font-bold">
                • {commentsCollapsed ? (isHindi ? 'खोलने के लिए टैप करें' : 'Tap to open') : (isHindi ? 'बंद करने के लिए टैप करें' : 'Tap to close')}
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
              <form onSubmit={handlePostComment} className="flex gap-2 sm:gap-3">
            <UserAvatar 
              uid={currentUser?.uid}
              fallbackPhotoURL={currentUserProfile?.photoURL}
              fallbackDisplayName={currentUserProfile?.displayName || currentUserProfile?.username}
              size="sm"
              className="max-sm:hidden hidden sm:flex w-9 h-9 border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder={t('add_comment_placeholder', 'Add a public comment...')}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-medium"
              />
              <button 
                type="submit"
                disabled={isPostingComment || !newCommentText.trim()}
                className="px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center cursor-pointer shadow-xs transition-colors"
                title={t('comment_btn', 'Comment')}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-[#94A3B8] py-6 text-center font-medium">
                {t('be_first_comment', 'No comments yet. Be the first to share your thoughts!')}
              </p>
            ) : (
              comments.filter(c => !c.parentCommentId).map((comm) => (
                <div key={comm.commentId} className="space-y-3">
                  <div className="flex gap-3 items-start group">
                    {/* User Avatar with real-time profile sync */}
                    <UserAvatar 
                      uid={comm.uid}
                      fallbackPhotoURL={comm.photoURL}
                      fallbackDisplayName={comm.displayName}
                      size="sm"
                      className="shrink-0 border border-slate-200 dark:border-slate-800"
                    />

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
                          
                          {/* YouTube-Style Comment Action Row: Like, Dislike, Creator Heart, Reply */}
                          <div className="flex items-center gap-1 sm:gap-2 mt-3 flex-wrap">
                            {/* Like (Thumbs Up) */}
                            <button
                              onClick={() => handleLikeComment(comm)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-90 ${
                                likedCommentIds.has(comm.commentId)
                                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title="Like"
                              aria-label="Like comment"
                            >
                              <ThumbsUp
                                className={`w-3.5 h-3.5 transition-transform ${
                                  likedCommentIds.has(comm.commentId) ? 'fill-current scale-110' : ''
                                }`}
                              />
                              {(comm.likesCount || 0) > 0 && (
                                <span className="text-[11px] font-bold">
                                  {formatViews(comm.likesCount)}
                                </span>
                              )}
                            </button>

                            {/* Dislike (Thumbs Down) */}
                            <button
                              onClick={() => handleDislikeComment(comm)}
                              className={`p-1.5 rounded-full text-xs transition-all cursor-pointer active:scale-90 ${
                                dislikedCommentIds.has(comm.commentId)
                                  ? 'text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700'
                                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title="Dislike"
                              aria-label="Dislike comment"
                            >
                              <ThumbsDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  dislikedCommentIds.has(comm.commentId) ? 'fill-current scale-110' : ''
                                }`}
                              />
                            </button>

                            {/* Creator Heart: if channel owner, clickable; otherwise creator badge */}
                            {isVideoOwner ? (
                              <button
                                onClick={() => handleHeartComment(comm)}
                                className={`p-1.5 rounded-full transition-all cursor-pointer active:scale-90 relative ${
                                  comm.hasCreatorHeart
                                    ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                                    : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title={comm.hasCreatorHeart ? "Remove creator heart" : "Heart this comment as creator"}
                              >
                                <Heart className={`w-3.5 h-3.5 ${comm.hasCreatorHeart ? 'fill-rose-500 text-rose-500' : ''}`} />
                              </button>
                            ) : comm.hasCreatorHeart ? (
                              <div 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/50 text-[10px] font-bold text-rose-600 dark:text-rose-400"
                                title={`Loved by ${video.creatorDisplayName}`}
                              >
                                <UserAvatar
                                  uid={video.creatorId}
                                  fallbackPhotoURL={video.creatorPhotoURL}
                                  fallbackDisplayName={video.creatorDisplayName}
                                  size="xs"
                                  className="w-3.5 h-3.5 rounded-full"
                                />
                                <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                              </div>
                            ) : null}

                            {/* Reply Button */}
                            <button 
                              onClick={() => handleReplyClick(comm.commentId)}
                              className="px-2.5 py-1 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer"
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && editingCommentText.trim()) {
                                e.preventDefault();
                                handlePostReply(comm.commentId);
                              }
                            }}
                            className="flex-1 px-4 py-2 text-xs border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handlePostReply(comm.commentId)}
                            disabled={!editingCommentText.trim()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer transition-colors shadow-xs"
                          >
                            Reply
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentText('');
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase rounded-xl cursor-pointer"
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
                                <UserAvatar 
                                  uid={reply.uid}
                                  fallbackPhotoURL={reply.photoURL}
                                  fallbackDisplayName={reply.displayName}
                                  size="xs"
                                  className="shrink-0 border border-slate-200 dark:border-slate-800"
                                />
                                <div className="flex-1 min-w-0 bg-slate-50/50 dark:bg-[#0f0f0f]/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 relative">
                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                    <span className="text-[11px] font-black text-slate-900 dark:text-[#F8FAFC]">{reply.displayName}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">• {formatTimeAgo(reply.createdAt)}</span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                    {renderCommentText(reply.text)}
                                  </p>

                                  {/* Action row for reply */}
                                  <div className="flex items-center gap-1 sm:gap-2 mt-2">
                                    <button
                                      onClick={() => handleLikeComment(reply)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-90 ${
                                        likedCommentIds.has(reply.commentId)
                                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                                      }`}
                                      title="Like reply"
                                    >
                                      <ThumbsUp className={`w-3 h-3 ${likedCommentIds.has(reply.commentId) ? 'fill-current' : ''}`} />
                                      {(reply.likesCount || 0) > 0 && (
                                        <span className="text-[10px]">
                                          {formatViews(reply.likesCount)}
                                        </span>
                                      )}
                                    </button>

                                    <button
                                      onClick={() => handleDislikeComment(reply)}
                                      className={`p-1 rounded-full text-xs transition-all cursor-pointer active:scale-90 ${
                                        dislikedCommentIds.has(reply.commentId)
                                          ? 'text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700'
                                          : 'text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                                      }`}
                                      title="Dislike reply"
                                    >
                                      <ThumbsDown className={`w-3 h-3 ${dislikedCommentIds.has(reply.commentId) ? 'fill-current' : ''}`} />
                                    </button>

                                    {isVideoOwner ? (
                                      <button
                                        onClick={() => handleHeartComment(reply)}
                                        className={`p-1 rounded-full transition-all cursor-pointer active:scale-90 ${
                                          reply.hasCreatorHeart
                                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                                            : 'text-slate-400 hover:text-rose-500'
                                        }`}
                                        title={reply.hasCreatorHeart ? "Remove heart" : "Heart reply"}
                                      >
                                        <Heart className={`w-3 h-3 ${reply.hasCreatorHeart ? 'fill-rose-500 text-rose-500' : ''}`} />
                                      </button>
                                    ) : reply.hasCreatorHeart ? (
                                      <div 
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[9px] font-bold text-rose-500"
                                        title={`Loved by ${video.creatorDisplayName}`}
                                      >
                                        <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                                      </div>
                                    ) : null}
                                  </div>
                                  
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
        
        {/* YOUTUBE-STYLE PLAYLIST QUEUE CARD (Desktop) */}
        {activePlaylist && (
          <div className="hidden lg:block bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            {/* Playlist Header */}
            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-[#1a2234] border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1 text-[#2563eb] dark:text-[#38bdf8]">
                  <ListVideo className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {isHindi ? 'प्लेलिस्ट' : 'Now Playing Playlist'}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate" title={activePlaylist.title}>
                  {activePlaylist.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
                  @{activePlaylist.creatorUsername} • {currentPlaylistIndex >= 0 ? currentPlaylistIndex + 1 : 1} / {playlistVideos.length}
                </p>
              </div>

              {/* Action Buttons: Loop, Shuffle, Collapse */}
              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  onClick={() => setIsPlaylistLoop(!isPlaylistLoop)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isPlaylistLoop 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
                  }`}
                  title={isPlaylistLoop ? "Loop Playlist (On)" : "Loop Playlist (Off)"}
                >
                  <Repeat className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaylistShuffle(!isPlaylistShuffle)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isPlaylistShuffle 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
                  }`}
                  title={isPlaylistShuffle ? "Shuffle (On)" : "Shuffle (Off)"}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaylistPanelOpen(!isPlaylistPanelOpen)}
                  className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                  title={isPlaylistPanelOpen ? "Collapse Queue" : "Expand Queue"}
                >
                  {isPlaylistPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Scrollable Playlist Video Queue */}
            {isPlaylistPanelOpen && (
              <div className="max-h-96 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                {playlistVideos.map((pVid, pIdx) => {
                  const isCurrent = pVid.videoId === videoId;
                  return (
                    <div
                      key={pVid.videoId}
                      onClick={() => navigate('watch', pVid.videoId, { list: activePlaylist.playlistId })}
                      className={`flex items-center gap-2.5 p-2 rounded-2xl transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 shadow-xs'
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      {/* Track index / Playing indicator */}
                      <div className="w-5 text-center shrink-0">
                        {isCurrent ? (
                          <PlayIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 fill-current mx-auto animate-pulse" />
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{pIdx + 1}</span>
                        )}
                      </div>

                      {/* Thumbnail */}
                      <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-800">
                        <img src={pVid.thumbnailUrl} alt={pVid.title} className="w-full h-full object-cover" />
                        {pVid.duration ? (
                          <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/80 text-[8px] font-bold rounded text-white">
                            {formatDuration(pVid.duration)}
                          </span>
                        ) : null}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs line-clamp-2 leading-snug ${
                          isCurrent 
                            ? 'font-extrabold text-blue-600 dark:text-blue-400' 
                            : 'font-bold text-slate-900 dark:text-slate-100'
                        }`}>
                          {pVid.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {pVid.creatorDisplayName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* Promoted / Sponsored User Ad */}
        {activeAds.length > 0 && (
          <SponsoredAdCard ad={activeAds[0]} layout="sidebar" />
        )}

        {/* Category Filter Pills (YouTube Style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categoryPills.map((pill) => {
            const isActive = selectedCategoryFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => handleCategoryFilterChange(pill.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-xs ${
                  isActive
                    ? 'bg-[#0f0f0f] dark:bg-white text-white dark:text-black font-black'
                    : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* External Native / Iframe Ad Banner (YouTube Style, rotating sidebar position) */}
        <ExternalAdBanner type="random" locationTag="watch-sidebar" />
        
        {/* Related Videos List with YouTube-style Dynamic Algorithm & Infinite Scroll */}
        <div className="space-y-3">
          {displayedSidebarVideos.length === 0 ? (
            <div className="py-8 px-4 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 font-medium">
                {isHindi ? 'इस श्रेणी में कोई संबंधित वीडियो नहीं है।' : 'No related videos in this category.'}
              </p>
              {selectedCategoryFilter !== 'All' && (
                <button
                  onClick={() => handleCategoryFilterChange('All')}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  {isHindi ? 'सभी वीडियो देखें' : 'View all videos'}
                </button>
              )}
            </div>
          ) : (
            displayedSidebarVideos.map((v) => (
              <div 
                key={v.videoId}
                onClick={() => {
                  navigate('watch', v.videoId);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
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

                  {/* YouTube Red Watch Progress Bar */}
                  {playbackProgressService.getProgressPercent(v.videoId, v.duration) > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/25 overflow-hidden z-10">
                      <div 
                        className="h-full bg-red-600" 
                        style={{ width: `${playbackProgressService.getProgressPercent(v.videoId, v.duration)}%` }} 
                      />
                    </div>
                  )}
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

                    {/* Views Count and Upload Date */}
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium">
                      {formatViews(v.viewsCount)} {isHindi ? 'व्यूज' : 'views'} • {formatTimeAgo(v.createdAt)}
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
                            addToast(isHindi ? 'लिंक क्लिपबोर्ड पर कॉपी हो गया!' : 'Link copied to clipboard!', 'success');
                          }
                          setActiveRelatedMenuId(null);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{t('action_share', 'Share')}</span>
                      </button>

                      <button
                        onClick={async () => {
                          addToast(isHindi ? 'वीडियो डाउनलोड हो रहा है...' : 'Downloading video...', 'info');
                          try {
                            await downloadService.downloadVideo(v, () => {});
                            addToast(isHindi ? 'वीडियो डाउनलोड्स में सहेजा गया!' : 'Video saved to Downloads!', 'success');
                          } catch (err) {
                            addToast(isHindi ? 'डाउनलोड शुरू हुआ!' : 'Download initiated!', 'info');
                          }
                          setActiveRelatedMenuId(null);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{t('action_download', 'Download')}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!currentUser) {
                            addToast(isHindi ? 'वीडियो सहेजने के लिए कृपया साइन इन करें' : 'Please sign in to save videos', 'info');
                          } else {
                            savedVideoService.saveVideo(currentUser.uid, v);
                            addToast(isHindi ? 'प्लेलिस्ट में सहेजा गया!' : 'Saved to playlist!', 'success');
                          }
                          setActiveRelatedMenuId(null);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                        <span>{isHindi ? 'प्लेलिस्ट में सहेजें' : 'Save to Playlist'}</span>
                      </button>

                      <button
                        onClick={() => {
                          handleWatchLaterToggle(v);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{savedWatchLaterMap[v.videoId] ? (isHindi ? 'बाद में देखें से हटाएं' : 'Remove Watch Later') : (isHindi ? 'बाद में देखें में सहेजें' : 'Save to Watch Later')}</span>
                      </button>

                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                      <button
                        onClick={() => {
                          addToast(isHindi ? 'प्रतिक्रिया नोट की गई। हम ऐसे वीडियो कम दिखाएंगे।' : 'Feedback noted. We will recommend fewer videos like this.', 'info');
                          setActiveRelatedMenuId(null);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left text-slate-500 font-medium cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isHindi ? 'रुचि नहीं है' : 'Not interested'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Infinite Scroll Sentinel & Loader */}
          {hasMoreSidebarVideos && (
            <div ref={sidebarSentinelRef} className="py-4 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>{isHindi ? 'और वीडियो लोड हो रहे हैं...' : 'Loading more videos...'}</span>
              </div>
            </div>
          )}

          {!hasMoreSidebarVideos && displayedSidebarVideos.length >= 8 && (
            <div className="py-4 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-blue-500" />
              <span>{isHindi ? 'सभी संबंधित वीडियो लोड हो चुके हैं' : 'You are all caught up'}</span>
            </div>
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
