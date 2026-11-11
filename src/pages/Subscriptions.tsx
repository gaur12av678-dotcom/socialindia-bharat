import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { subscriptionService } from '../services/subscriptionService';
import { videoService } from '../services/videoService';
import { playbackProgressService } from '../services/playbackProgressService';
import { Video, Subscription } from '../types';
import { VideoCard } from '../components/VideoCard';
import { UserAvatar } from '../components/UserAvatar';
import { useTranslation } from '../i18n';
import { formatViews, formatTimeAgo, formatDuration } from '../utils/videoUtils';
import { 
  Users, 
  Compass, 
  Grid, 
  List, 
  Bell, 
  BellRing, 
  BellOff, 
  ChevronRight, 
  Check, 
  X, 
  Loader2, 
  Sparkles,
  ExternalLink,
  User as UserIcon
} from 'lucide-react';

type SubscriptionsFilter = 'all' | 'today' | 'videos' | 'shorts' | 'continue' | 'unwatched';
type ViewMode = 'grid' | 'list';
type BellState = 'all' | 'personalized' | 'none';

interface SubscriptionsProps {
  embedded?: boolean;
  onSwitchToAll?: () => void;
}

const OFFICIAL_SOCIALINDIA_UID = 'RTUVtjrw5sPWaiq10OIMiloF8HQ2';

// Check if an ID or username refers to the official SocialIndia channel
const isOfficialSocialIndia = (val?: string): boolean => {
  if (!val) return false;
  const clean = val.toLowerCase().trim().replace(/^@/, '');
  return clean === 'socialindia' || clean === OFFICIAL_SOCIALINDIA_UID.toLowerCase();
};

// Check if a video belongs to a specific creator (handles UIDs, handles, and official aliases)
const doesVideoBelongToCreator = (
  video: Video,
  creatorId: string,
  creatorUsername?: string
): boolean => {
  const vId = (video.creatorId || '').toLowerCase().trim();
  const vUser = (video.creatorUsername || '').toLowerCase().trim().replace(/^@/, '');
  const targetId = (creatorId || '').toLowerCase().trim();
  const targetUser = (creatorUsername || '').toLowerCase().trim().replace(/^@/, '');

  if (targetId && (vId === targetId || vUser === targetId)) return true;
  if (targetUser && (vUser === targetUser || vId === targetUser)) return true;

  if (
    (isOfficialSocialIndia(targetId) || isOfficialSocialIndia(targetUser)) &&
    (isOfficialSocialIndia(vId) || isOfficialSocialIndia(vUser))
  ) {
    return true;
  }

  return false;
};

// Check if a video belongs to any of the user's followed creators
const doesVideoBelongToSubscriptions = (
  video: Video,
  subscriptions: Subscription[]
): boolean => {
  if (!subscriptions || subscriptions.length === 0) return false;
  return subscriptions.some(sub => 
    doesVideoBelongToCreator(video, sub.creatorId, sub.creatorUsername)
  );
};

// YouTube-Grade Responsive Skeletons
const SubscriptionsGridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="space-y-3">
        <div className="relative aspect-video bg-slate-200 dark:bg-[#272727] rounded-2xl overflow-hidden">
          <div className="absolute bottom-2 right-2 w-10 h-4 bg-slate-300 dark:bg-[#333333] rounded" />
        </div>
        <div className="flex gap-3 px-1">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-[#272727] shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-4 bg-slate-200 dark:bg-[#272727] rounded-md w-11/12" />
            <div className="h-3.5 bg-slate-200 dark:bg-[#272727] rounded-md w-2/3" />
            <div className="h-3 bg-slate-200 dark:bg-[#272727] rounded-md w-1/3 pt-1" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const SubscriptionsListSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-[#181818] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-4"
      >
        <div className="w-full sm:w-64 aspect-video bg-slate-200 dark:bg-[#272727] rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-5 bg-slate-200 dark:bg-[#272727] rounded-md w-5/6" />
          <div className="h-3.5 bg-slate-200 dark:bg-[#272727] rounded-md w-1/3" />
          <div className="flex items-center gap-2 pt-1">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-[#272727]" />
            <div className="h-3 bg-slate-200 dark:bg-[#272727] rounded w-24" />
          </div>
          <div className="h-3 bg-slate-200 dark:bg-[#272727] rounded w-full hidden sm:block" />
        </div>
      </div>
    ))}
  </div>
);

const SubscriptionsCarouselSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 animate-pulse">
    {[...Array(7)].map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-slate-200 dark:bg-[#272727]" />
        <div className="w-12 h-2.5 bg-slate-200 dark:bg-[#272727] rounded" />
      </div>
    ))}
  </div>
);

export const Subscriptions: React.FC<SubscriptionsProps> = ({ embedded = false, onSwitchToAll }) => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  const activeUid = currentUser?.uid || currentUserProfile?.uid || '';

  // Instant synchronous cache initialization (0ms initial render)
  const cachedSubs = useMemo(() => {
    return activeUid ? subscriptionService.getCachedSubscriptions(activeUid) : [];
  }, [activeUid]);

  const initialCachedVideos = useMemo(() => {
    const list = videoService.getCachedVideos();
    if (list.length > 0 && cachedSubs.length > 0) {
      return list.filter(v => doesVideoBelongToSubscriptions(v, cachedSubs));
    }
    return [];
  }, [cachedSubs]);

  // Main state
  const [followedCreators, setFollowedCreators] = useState<Subscription[]>(() => cachedSubs);
  const [allVideos, setAllVideos] = useState<Video[]>(() => videoService.getCachedVideos());
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => initialCachedVideos.length === 0);
  const [isFilterSwitching, setIsFilterSwitching] = useState<boolean>(false);
  
  // Following feed filters
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SubscriptionsFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('socialindia_subs_view') as ViewMode) || 'grid';
    }
    return 'grid';
  });

  // Manage Channels Modal state
  const [showManageModal, setShowManageModal] = useState(false);
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);
  
  // Notification bell preferences per channel (persisted locally)
  const [bellPreferences, setBellPreferences] = useState<Record<string, BellState>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('socialindia_sub_bells');
        return raw ? JSON.parse(raw) : {};
      } catch {}
    }
    return {};
  });

  const [activeBellDropdownId, setActiveBellDropdownId] = useState<string | null>(null);

  // Sync viewMode preference to localStorage
  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('socialindia_subs_view', mode);
    } catch {}
  };

  // Toggle bell preference (All, Personalized, None)
  const handleSetBell = (creatorId: string, state: BellState) => {
    const updated = { ...bellPreferences, [creatorId]: state };
    setBellPreferences(updated);
    setActiveBellDropdownId(null);
    try {
      localStorage.setItem('socialindia_sub_bells', JSON.stringify(updated));
    } catch {}
    
    const label = state === 'all' 
      ? (isHindi ? 'सभी सूचनाएं चालू की गईं' : 'All notifications enabled')
      : state === 'personalized'
      ? (isHindi ? 'निजीकृत सूचनाएं सेट की गईं' : 'Personalized notifications set')
      : (isHindi ? 'सूचनाएं बंद की गईं' : 'Notifications muted');
    addToast(label, 'info');
  };

  // Smooth filter & creator selection with micro skeleton feedback
  const handleSelectCreator = (creatorId: string | null) => {
    if (selectedCreatorId === creatorId) return;
    setIsFilterSwitching(true);
    setSelectedCreatorId(creatorId);
    setTimeout(() => setIsFilterSwitching(false), 150);
  };

  const handleSelectFilter = (filter: SubscriptionsFilter) => {
    if (activeFilter === filter) return;
    setIsFilterSwitching(true);
    setActiveFilter(filter);
    setTimeout(() => setIsFilterSwitching(false), 150);
  };

  // Fetch subscriptions and feed in background with PARALLEL execution (zero waterfall delay)
  useEffect(() => {
    if (!activeUid) {
      setIsInitialLoading(false);
      return;
    }

    let isMounted = true;

    const loadSubscriptionsFeed = async () => {
      try {
        // Run both network queries in parallel to eliminate waterfall delay
        const [subs, fetchedVideos] = await Promise.all([
          currentUser?.uid
            ? subscriptionService.getSubscriptions(currentUser.uid)
            : Promise.resolve(subscriptionService.getCachedSubscriptions(activeUid)),
          videoService.getVideos()
        ]);

        if (!isMounted) return;

        setFollowedCreators(subs);
        setAllVideos(fetchedVideos);
      } catch (err) {
        console.error('Failed to load subscriptions feed:', err);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    loadSubscriptionsFeed();

    const handleSubChanged = () => {
      loadSubscriptionsFeed();
    };
    window.addEventListener('socialindia:subscription_changed', handleSubChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('socialindia:subscription_changed', handleSubChanged);
    };
  }, [activeUid, currentUser?.uid]);

  // Unsubscribe handler inside Manage Modal
  const handleUnsubscribe = async (creatorId: string, creatorName: string) => {
    if (!currentUser) return;
    setUnsubscribingId(creatorId);
    try {
      await subscriptionService.toggleSubscription(currentUser.uid, creatorId, { displayName: creatorName }, false);
      const updated = followedCreators.filter(c => c.creatorId !== creatorId);
      setFollowedCreators(updated);
      if (selectedCreatorId === creatorId) {
        setSelectedCreatorId(null);
      }
      addToast(isHindi ? `@${creatorName} को अनफ़ॉलो किया गया` : `Unfollowed ${creatorName}`, 'info');
    } catch (e) {
      addToast(isHindi ? 'अनफ़ॉलो नहीं हो सका।' : 'Failed to unfollow.', 'error');
    } finally {
      setUnsubscribingId(null);
    }
  };

  // Videos belonging to any subscribed creator
  const followedVideos = useMemo(() => {
    if (followedCreators.length === 0) return [];
    return allVideos.filter(v => doesVideoBelongToSubscriptions(v, followedCreators));
  }, [allVideos, followedCreators]);

  // Selected Creator Profile details
  const selectedCreator = useMemo(() => {
    if (!selectedCreatorId) return null;
    return followedCreators.find(c => 
      c.creatorId === selectedCreatorId || 
      (c.creatorUsername && c.creatorUsername.toLowerCase() === selectedCreatorId.toLowerCase())
    );
  }, [selectedCreatorId, followedCreators]);

  // Videos scoped to selected creator (or all followed creators)
  const scopedVideos = useMemo(() => {
    if (!selectedCreator) return followedVideos;
    return allVideos.filter(v => 
      doesVideoBelongToCreator(v, selectedCreator.creatorId, selectedCreator.creatorUsername)
    );
  }, [selectedCreator, allVideos, followedVideos]);

  // Filtered videos based on Selected Creator & YouTube Filter Chips with Graceful Fallback
  const { filteredVideos, hasFilterFallback, fallbackFilterName } = useMemo(() => {
    if (scopedVideos.length === 0) {
      return { filteredVideos: [], hasFilterFallback: false, fallbackFilterName: '' };
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let result: Video[] = [];

    switch (activeFilter) {
      case 'today':
        result = scopedVideos.filter(v => {
          const vDate = v.createdAt ? new Date(v.createdAt).getTime() : 0;
          return vDate >= oneDayAgo;
        });
        break;
      case 'videos':
        result = scopedVideos.filter(v => !v.isShort && (v.duration || 0) > 60);
        break;
      case 'shorts':
        result = scopedVideos.filter(v => v.isShort || (v.duration || 0) <= 60 || (v.title || '').toLowerCase().includes('#shorts'));
        break;
      case 'continue':
        result = scopedVideos.filter(v => {
          const pct = playbackProgressService.getProgressPercent(v.videoId, v.duration);
          return pct > 5 && pct < 90;
        });
        break;
      case 'unwatched':
        result = scopedVideos.filter(v => {
          const pct = playbackProgressService.getProgressPercent(v.videoId, v.duration);
          return pct === 0;
        });
        break;
      case 'all':
      default:
        result = scopedVideos;
        break;
    }

    // Graceful Fallback: When a narrow filter like 'today', 'continue', or 'unwatched' has 0 matches,
    // don't leave the user facing an ugly empty state error box. Show the followed videos with a polite banner!
    if (result.length === 0 && scopedVideos.length > 0 && activeFilter !== 'all') {
      return {
        filteredVideos: scopedVideos,
        hasFilterFallback: true,
        fallbackFilterName: activeFilter
      };
    }

    return { filteredVideos: result, hasFilterFallback: false, fallbackFilterName: '' };
  }, [scopedVideos, activeFilter]);

  // Chronological Grouping (YouTube Feed Organization: Today, Yesterday, This Week, Older)
  const chronologicalGroups = useMemo(() => {
    if (selectedCreatorId || activeFilter === 'shorts' || hasFilterFallback) {
      return null;
    }

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const twoDays = 48 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;

    const todayVideos: Video[] = [];
    const yesterdayVideos: Video[] = [];
    const thisWeekVideos: Video[] = [];
    const olderVideos: Video[] = [];

    filteredVideos.forEach((v) => {
      const vTime = v.createdAt ? new Date(v.createdAt).getTime() : 0;
      const diff = now - vTime;

      if (diff <= oneDay) {
        todayVideos.push(v);
      } else if (diff <= twoDays) {
        yesterdayVideos.push(v);
      } else if (diff <= sevenDays) {
        thisWeekVideos.push(v);
      } else {
        olderVideos.push(v);
      }
    });

    const groups: { key: string; title: string; videos: Video[] }[] = [];
    if (todayVideos.length > 0) {
      groups.push({ key: 'today', title: isHindi ? 'आज (Today)' : 'Today', videos: todayVideos });
    }
    if (yesterdayVideos.length > 0) {
      groups.push({ key: 'yesterday', title: isHindi ? 'कल (Yesterday)' : 'Yesterday', videos: yesterdayVideos });
    }
    if (thisWeekVideos.length > 0) {
      groups.push({ key: 'week', title: isHindi ? 'इस सप्ताह (This week)' : 'This week', videos: thisWeekVideos });
    }
    if (olderVideos.length > 0) {
      groups.push({ key: 'older', title: isHindi ? 'पहले के (Older)' : 'Older', videos: olderVideos });
    }

    return groups.length > 0 ? groups : null;
  }, [filteredVideos, selectedCreatorId, activeFilter, hasFilterFallback, isHindi]);

  // =========================================================================
  // VIEW: NOT SIGNED IN (YouTube Authentic Empty State)
  // =========================================================================
  if (!activeUid) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-[28px] p-8 sm:p-10 text-center space-y-5 shadow-xs">
          <div className="relative w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-[#065fd4] dark:text-[#3ea6ff] mx-auto shadow-sm">
            <BellRing className="w-10 h-10 animate-pulse stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isHindi ? 'नए वीडियो कभी न चूकें' : "Don't miss new videos"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              {isHindi 
                ? 'अपने पसंदीदा सोशलइंडिया चैनलों के नवीनतम वीडियो और अपडेट देखने के लिए साइन इन करें।' 
                : 'Sign in to see updates from your favorite SocialIndia creators and channels.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('signin')}
              className="h-11 px-8 rounded-full bg-[#065fd4] hover:bg-[#054fb1] text-white text-sm font-semibold transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs active:scale-98"
            >
              <UserIcon className="w-4 h-4" />
              <span>{isHindi ? 'साइन इन करें' : 'Sign in'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: SIGNED IN WITH 0 SUBSCRIPTIONS (Only after loading is fully completed)
  // =========================================================================
  if (!isInitialLoading && followedCreators.length === 0) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-[28px] p-8 sm:p-10 text-center space-y-5 shadow-xs">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-[#272727] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mx-auto">
            <Users className="w-10 h-10 stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isHindi ? 'नए वीडियो कभी न चूकें' : "Don't miss new videos"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              {isHindi 
                ? 'अपने पसंदीदा क्रिएटर्स को फ़ॉलो करें ताकि उनके नए वीडियो और क्लिप्स यहाँ दिखाई दें।' 
                : 'Follow your favorite creators to see their latest videos and clips here.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              onClick={() => navigate('trending')}
              className="h-11 px-6 rounded-full bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs active:scale-98"
            >
              <Compass className="w-4 h-4" />
              <span>{isHindi ? 'ट्रेंडिंग चैनल खोजें' : 'Discover Channels'}</span>
            </button>

            <button
              onClick={() => (onSwitchToAll ? onSwitchToAll() : navigate('home'))}
              className="h-11 px-5 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {isHindi ? 'होमपेज पर जाएं' : 'Go to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f0f] text-slate-900 dark:text-[#f1f1f1] font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      
      {/* ========================================================================= */}
      {/* 1. YOUTUBE TOP SUB CHANNELS CAROUSEL (Mobile & Web)                       */}
      {/* ========================================================================= */}
      <section className={`bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-slate-800/80 shadow-xs ${embedded ? 'relative z-10' : 'sticky top-14 sm:top-16 z-30'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
          
          {isInitialLoading && followedCreators.length === 0 ? (
            <SubscriptionsCarouselSkeleton />
          ) : (
            <>
              {/* "All" Avatar Button */}
              <button
                type="button"
                onClick={() => handleSelectCreator(null)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
              >
                <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  selectedCreatorId === null
                    ? 'bg-[#065fd4] text-white ring-2 ring-[#065fd4] ring-offset-2 dark:ring-offset-[#121212] shadow-sm'
                    : 'bg-slate-100 dark:bg-[#272727] text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-[#333333]'
                }`}>
                  <Users className="w-6 h-6" />
                </div>
                <span className={`text-[11px] font-semibold truncate max-w-[64px] ${
                  selectedCreatorId === null ? 'text-[#065fd4] dark:text-[#3ea6ff]' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {isHindi ? 'सभी' : 'All'}
                </span>
              </button>

              {/* Subscribed Creators Horizontal List with YouTube unread blue dot */}
              {followedCreators.map((sub) => {
                const isSelected = selectedCreatorId === sub.creatorId || 
                  (sub.creatorUsername && selectedCreatorId === sub.creatorUsername);
                return (
                  <button
                    key={sub.creatorId}
                    type="button"
                    onClick={() => handleSelectCreator(isSelected ? null : sub.creatorId)}
                    className="relative flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
                  >
                    <div className="relative">
                      <UserAvatar
                        uid={sub.creatorId}
                        fallbackPhotoURL={sub.creatorPhotoURL}
                        fallbackDisplayName={sub.creatorDisplayName || sub.creatorUsername}
                        size="lg"
                        className={`w-13 h-13 sm:w-14 sm:h-14 transition-all shadow-xs ${
                          isSelected
                            ? 'ring-2 ring-[#065fd4] dark:ring-[#3ea6ff] ring-offset-2 dark:ring-offset-[#121212] scale-105'
                            : 'group-hover:ring-2 group-hover:ring-slate-300 dark:group-hover:ring-slate-700'
                        }`}
                      />
                      {/* YouTube Unread Blue Dot Indicator */}
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-[#065fd4] dark:bg-[#3ea6ff] ring-2 ring-white dark:ring-[#121212]" />
                    </div>
                    <span className={`text-[11px] font-medium truncate max-w-[68px] ${
                      isSelected ? 'text-[#065fd4] dark:text-[#3ea6ff] font-bold' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {sub.creatorDisplayName || sub.creatorUsername}
                    </span>
                  </button>
                );
              })}

              {/* Manage Channels Pill Button (YouTube Mobile / Web) */}
              <div className="shrink-0 pl-1">
                <button
                  type="button"
                  onClick={() => setShowManageModal(true)}
                  className="h-10 px-4 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-[#065fd4] dark:text-[#3ea6ff] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>{isHindi ? 'प्रबंधित करें' : 'Manage'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. YOUTUBE HEADER & FILTER CHIPS ROW                                      */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2">
        
        {/* Header with Title + "Manage" link + Grid/List View switcher (Desktop) */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {selectedCreator ? (selectedCreator.creatorDisplayName || selectedCreator.creatorUsername) : t('nav_subscriptions', 'Following')}
            </h1>
            {selectedCreator && (
              <button
                type="button"
                onClick={() => navigate('creator', selectedCreator.creatorUsername || selectedCreator.creatorId)}
                className="text-xs font-semibold text-[#065fd4] dark:text-[#3ea6ff] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{isHindi ? 'चैनल पर जाएं' : 'View channel'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Manage link (Desktop view) */}
            <button
              type="button"
              onClick={() => setShowManageModal(true)}
              className="hidden sm:inline-flex text-xs font-bold uppercase tracking-wider text-[#065fd4] dark:text-[#3ea6ff] hover:bg-[#065fd4]/10 dark:hover:bg-[#3ea6ff]/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              {isHindi ? 'प्रबंधित करें' : 'Manage'}
            </button>

            {/* YouTube View Switcher: Grid vs List (Desktop) */}
            <div className="hidden sm:flex items-center bg-slate-200/80 dark:bg-[#272727] p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                title="Grid view"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#181818] text-[#065fd4] dark:text-[#3ea6ff] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('list')}
                title="List view"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#181818] text-[#065fd4] dark:text-[#3ea6ff] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* YouTube Subscription Filter Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {[
            { id: 'all', label: isHindi ? 'सभी' : 'All' },
            { id: 'today', label: isHindi ? 'आज' : 'Today' },
            { id: 'videos', label: isHindi ? 'वीडियो' : 'Videos' },
            { id: 'shorts', label: isHindi ? 'क्लिप्स' : 'Clips' },
            { id: 'continue', label: isHindi ? 'देखना जारी रखें' : 'Continue watching' },
            { id: 'unwatched', label: isHindi ? 'अनदेखे' : 'Unwatched' },
          ].map((chip) => (
            <button
              type="button"
              key={chip.id}
              onClick={() => handleSelectFilter(chip.id as SubscriptionsFilter)}
              className={`px-3.5 py-1.5 rounded-full border text-xs shrink-0 transition-colors cursor-pointer ${
                activeFilter === chip.id
                  ? 'yt-chip-active shadow-xs font-semibold'
                  : 'yt-chip-inactive'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. SUBSCRIPTIONS VIDEO FEED                                               */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
        
        {/* Filter Fallback Informational Banner (Preventing Empty Frustration) */}
        {hasFilterFallback && !isFilterSwitching && (
          <div className="mb-5 p-3.5 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-200">
              <Sparkles className="w-4 h-4 text-[#065fd4] dark:text-[#3ea6ff] shrink-0" />
              <span>
                {isHindi 
                  ? `इस फ़िल्टर के लिए कोई वीडियो नहीं मिला। आपके द्वारा फ़ॉलो किए गए चैनलों के हालिया वीडियो दिखाए जा रहे हैं:`
                  : `No uploads matched '${fallbackFilterName}'. Showing latest videos from creators you follow:`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectFilter('all')}
              className="self-start sm:self-auto px-3.5 py-1 rounded-full bg-[#065fd4] hover:bg-[#054fb1] text-white font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              {isHindi ? 'सभी देखें' : 'View All'}
            </button>
          </div>
        )}

        {/* LOADING & SKELETON STATE */}
        {isInitialLoading && scopedVideos.length === 0 ? (
          viewMode === 'list' ? <SubscriptionsListSkeleton /> : <SubscriptionsGridSkeleton />
        ) : isFilterSwitching ? (
          viewMode === 'list' ? <SubscriptionsListSkeleton /> : <SubscriptionsGridSkeleton />
        ) : filteredVideos.length === 0 ? (
          /* Real Empty State (Only if genuinely no videos exist for followed creators) */
          <div className="py-20 text-center bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <Users className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {isHindi ? 'कोई वीडियो नहीं मिला' : 'No videos found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {selectedCreator 
                ? (isHindi ? `${selectedCreator.creatorDisplayName || selectedCreator.creatorUsername} ने अभी तक कोई वीडियो अपलोड नहीं किया है।` : `No videos uploaded yet by this creator.`)
                : (isHindi ? 'आपके द्वारा फ़ॉलो किए गए क्रिएटर्स ने अभी कोई वीडियो प्रकाशित नहीं किया है।' : 'Creators you follow haven’t uploaded any videos yet.')}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedCreatorId(null);
                  setActiveFilter('all');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {isHindi ? 'सभी देखें' : 'Reset filter'}
              </button>
              <button
                type="button"
                onClick={() => navigate('trending')}
                className="px-4 py-2 text-xs font-semibold rounded-full bg-[#065fd4] hover:bg-[#054fb1] text-white transition-colors cursor-pointer"
              >
                {isHindi ? 'ट्रेंडिंग वीडियो खोजें' : 'Explore Trending'}
              </button>
            </div>
          </div>
        ) : chronologicalGroups ? (
          /* ======================================================================= */
          /* CHRONOLOGICAL SECTIONS (YouTube Style: Today, Yesterday, This Week...)  */
          /* ======================================================================= */
          <div className="space-y-8">
            {chronologicalGroups.map((group) => (
              <section key={group.key} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {group.title}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    ({group.videos.length})
                  </span>
                </div>

                {viewMode === 'list' ? (
                  /* YouTube List View */
                  <div className="space-y-4">
                    {group.videos.map((video) => {
                      const watchUrl = `#/watch/${video.videoId}`;
                      const creatorUrl = `/#/@${video.creatorUsername || video.creatorId}`;
                      return (
                        <div
                          key={video.videoId}
                          className="bg-white dark:bg-[#181818] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all group shadow-xs"
                        >
                          {/* Thumbnail */}
                          <a
                            href={watchUrl}
                            draggable={true}
                            title={video.title}
                            onClick={(e) => {
                              if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                              e.preventDefault();
                              navigate('watch', video.videoId);
                            }}
                            className="relative w-full sm:w-64 aspect-video bg-slate-900 rounded-xl overflow-hidden shrink-0 cursor-pointer block"
                          >
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              draggable={false}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                              loading="lazy"
                            />
                            <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[11px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
                              {formatDuration(video.duration || 0)}
                            </span>
                          </a>

                          {/* Video Info */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <a
                              href={watchUrl}
                              draggable={true}
                              title={video.title}
                              onClick={(e) => {
                                if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                                e.preventDefault();
                                navigate('watch', video.videoId);
                              }}
                              className="block text-sm sm:text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#065fd4] dark:group-hover:text-[#3ea6ff] transition-colors leading-snug cursor-pointer"
                            >
                              {video.title}
                            </a>

                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span>{formatViews(video.viewsCount || 0)} views</span>
                              <span>•</span>
                              <span>{formatTimeAgo(video.createdAt)}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <a
                                href={creatorUrl}
                                onClick={(e) => {
                                  if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                                  e.preventDefault();
                                  navigate('creator', video.creatorUsername || video.creatorId);
                                }}
                                className="flex items-center gap-2 group/creator cursor-pointer"
                              >
                                <UserAvatar
                                  uid={video.creatorId}
                                  fallbackPhotoURL={video.creatorPhotoURL}
                                  fallbackDisplayName={video.creatorDisplayName}
                                  size="sm"
                                  className="w-6 h-6"
                                />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover/creator:text-blue-600 dark:group-hover/creator:text-blue-400">
                                  {video.creatorDisplayName || video.creatorUsername}
                                </span>
                              </a>
                            </div>

                            {video.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pt-1 leading-relaxed hidden sm:block">
                                {video.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* YouTube Grid View */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {group.videos.map((video) => (
                      <VideoCard key={video.videoId} video={video} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : (
          /* Single Creator or Filter View (Unsectioned Grid or List) */
          viewMode === 'list' ? (
            <div className="space-y-4">
              {filteredVideos.map((video) => {
                const watchUrl = `#/watch/${video.videoId}`;
                const creatorUrl = `/#/@${video.creatorUsername || video.creatorId}`;
                return (
                  <div
                    key={video.videoId}
                    className="bg-white dark:bg-[#181818] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all group shadow-xs"
                  >
                    {/* Thumbnail */}
                    <a
                      href={watchUrl}
                      draggable={true}
                      title={video.title}
                      onClick={(e) => {
                        if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                        e.preventDefault();
                        navigate('watch', video.videoId);
                      }}
                      className="relative w-full sm:w-64 aspect-video bg-slate-900 rounded-xl overflow-hidden shrink-0 cursor-pointer block"
                    >
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        draggable={false}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[11px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
                        {formatDuration(video.duration || 0)}
                      </span>
                    </a>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <a
                        href={watchUrl}
                        draggable={true}
                        title={video.title}
                        onClick={(e) => {
                          if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                          e.preventDefault();
                          navigate('watch', video.videoId);
                        }}
                        className="block text-sm sm:text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#065fd4] dark:group-hover:text-[#3ea6ff] transition-colors leading-snug cursor-pointer"
                      >
                        {video.title}
                      </a>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatViews(video.viewsCount || 0)} views</span>
                        <span>•</span>
                        <span>{formatTimeAgo(video.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={creatorUrl}
                          onClick={(e) => {
                            if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                            e.preventDefault();
                            navigate('creator', video.creatorUsername || video.creatorId);
                          }}
                          className="flex items-center gap-2 group/creator cursor-pointer"
                        >
                          <UserAvatar
                            uid={video.creatorId}
                            fallbackPhotoURL={video.creatorPhotoURL}
                            fallbackDisplayName={video.creatorDisplayName}
                            size="sm"
                            className="w-6 h-6"
                          />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover/creator:text-blue-600 dark:group-hover/creator:text-blue-400">
                            {video.creatorDisplayName || video.creatorUsername}
                          </span>
                        </a>
                      </div>

                      {video.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pt-1 leading-relaxed hidden sm:block">
                          {video.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredVideos.map((video) => (
                <VideoCard key={video.videoId} video={video} />
              ))}
            </div>
          )
        )}

      </div>

      {/* ========================================================================= */}
      {/* 4. YOUTUBE "MANAGE CHANNELS" MODAL (Notifications & Unsubscribe)          */}
      {/* ========================================================================= */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#1e1f20] rounded-[28px] max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#065fd4] dark:text-[#3ea6ff]" />
                  <span>{isHindi ? 'फ़ॉलो किए गए चैनल प्रबंधित करें' : 'Manage Following'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {followedCreators.length} {isHindi ? 'क्रिएटर्स फ़ॉलो किए गए हैं' : 'creators followed'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  setActiveBellDropdownId(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {followedCreators.map((creator) => {
                const bellState = bellPreferences[creator.creatorId] || 'personalized';
                const isBellOpen = activeBellDropdownId === creator.creatorId;

                return (
                  <div
                    key={creator.creatorId}
                    className="py-3.5 flex items-center justify-between gap-3"
                  >
                    {/* Left: Avatar + Names */}
                    <div 
                      onClick={() => {
                        setShowManageModal(false);
                        navigate('creator', creator.creatorUsername || creator.creatorId);
                      }}
                      className="flex items-center gap-3 min-w-0 cursor-pointer group"
                    >
                      <UserAvatar
                        uid={creator.creatorId}
                        fallbackPhotoURL={creator.creatorPhotoURL}
                        fallbackDisplayName={creator.creatorDisplayName || creator.creatorUsername}
                        size="md"
                        className="w-10 h-10 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#065fd4] dark:group-hover:text-[#3ea6ff] truncate">
                          {creator.creatorDisplayName || creator.creatorUsername}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          @{creator.creatorUsername || 'creator'}
                        </div>
                      </div>
                    </div>

                    {/* Right: Notification Bell Dropdown + Subscribed Button */}
                    <div className="flex items-center gap-2 shrink-0 relative">
                      
                      {/* Bell Button */}
                      <button
                        type="button"
                        onClick={() => setActiveBellDropdownId(isBellOpen ? null : creator.creatorId)}
                        title={bellState === 'all' ? 'All notifications' : bellState === 'none' ? 'None' : 'Personalized'}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                      >
                        {bellState === 'all' ? (
                          <BellRing className="w-4 h-4 text-[#065fd4] dark:text-[#3ea6ff]" />
                        ) : bellState === 'none' ? (
                          <BellOff className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </button>

                      {/* Bell Dropdown Menu */}
                      {isBellOpen && (
                        <div className="absolute right-24 top-10 w-44 bg-white dark:bg-[#252525] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 z-50 animate-in zoom-in-95">
                          <button
                            type="button"
                            onClick={() => handleSetBell(creator.creatorId, 'all')}
                            className="w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <BellRing className="w-3.5 h-3.5 text-[#065fd4]" />
                              {isHindi ? 'सभी सूचनाएं' : 'All'}
                            </span>
                            {bellState === 'all' && <Check className="w-3.5 h-3.5 text-[#065fd4]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetBell(creator.creatorId, 'personalized')}
                            className="w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Bell className="w-3.5 h-3.5" />
                              {isHindi ? 'निजीकृत' : 'Personalized'}
                            </span>
                            {bellState === 'personalized' && <Check className="w-3.5 h-3.5 text-[#065fd4]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetBell(creator.creatorId, 'none')}
                            className="w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <BellOff className="w-3.5 h-3.5 text-slate-400" />
                              {isHindi ? 'बंद' : 'None'}
                            </span>
                            {bellState === 'none' && <Check className="w-3.5 h-3.5 text-[#065fd4]" />}
                          </button>
                        </div>
                      )}

                      {/* Subscribed / Unsubscribe Button */}
                      <button
                        type="button"
                        disabled={unsubscribingId === creator.creatorId}
                        onClick={() => handleUnsubscribe(creator.creatorId, creator.creatorDisplayName || creator.creatorUsername || 'Creator')}
                        className="h-8 px-3.5 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-[#272727] dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer group/btn"
                      >
                        {unsubscribingId === creator.creatorId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span className="group-hover/btn:hidden">{isHindi ? 'फ़ॉलो कर रहे हैं' : 'Following'}</span>
                            <span className="hidden group-hover/btn:inline">{isHindi ? 'अनफ़ॉलो करें' : 'Unfollow'}</span>
                          </>
                        )}
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Done Button */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  setActiveBellDropdownId(null);
                }}
                className="h-9 px-6 bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs font-semibold rounded-full cursor-pointer transition-colors"
              >
                {isHindi ? 'पूर्ण' : 'Done'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

