import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { Video, User } from '../types';
import { 
  Search as SearchIcon, 
  ArrowLeft, 
  Trash2, 
  Clock, 
  X, 
  Flame, 
  Check, 
  Smartphone, 
  Film, 
  Users, 
  Play, 
  Sparkles,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import { userService } from '../services/userService';
import { subscriptionService } from '../services/subscriptionService';
import { playbackProgressService } from '../services/playbackProgressService';
import { 
  getInitials, 
  formatSubscribers, 
  formatViews, 
  formatTimeAgo, 
  formatDuration 
} from '../utils/videoUtils';
import { isUserVerified } from '../utils/userUtils';
import { useTranslation } from '../i18n';
import { ExternalAdBanner } from '../components/ads/ExternalAdBanner';
import { UserAvatar } from '../components/UserAvatar';
import { searchHistoryService, SearchHistoryEntry, POPULAR_SEARCH_SUGGESTIONS } from '../services/searchHistoryService';
import { useApp } from '../context/AppContext';

// YouTube Channel Search Result Card
const YouTubeChannelCard: React.FC<{ user: User }> = ({ user }) => {
  const { navigate } = useRouter();
  const { currentUser, addToast } = useApp();
  const { isHindi } = useTranslation();

  const [isSubbed, setIsSubbed] = useState<boolean>(() => {
    return currentUser ? subscriptionService.isSubscribedSync(currentUser.uid, user.uid) : false;
  });
  const [subCount, setSubCount] = useState<number>(user.followersCount || 0);
  const [isTogglingSub, setIsTogglingSub] = useState(false);

  useEffect(() => {
    if (currentUser) {
      subscriptionService.isSubscribed(currentUser.uid, user.uid).then(setIsSubbed);
    }
  }, [currentUser, user.uid]);

  const handleSubClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      addToast(isHindi ? 'सदस्यता लेने के लिए कृपया साइन इन करें' : 'Please sign in to subscribe to channels', 'info');
      return;
    }
    if (currentUser.uid === user.uid) {
      addToast(isHindi ? 'आप अपने स्वयं के चैनल की सदस्यता नहीं ले सकते' : 'You cannot subscribe to your own channel', 'info');
      return;
    }

    setIsTogglingSub(true);
    const willSub = !isSubbed;
    setIsSubbed(willSub);
    setSubCount(prev => willSub ? prev + 1 : Math.max(0, prev - 1));

    try {
      const res = await subscriptionService.toggleSubscription(currentUser.uid, user.uid, user, willSub);
      setIsSubbed(res);
      if (res) {
        addToast(isHindi ? `${user.displayName} की सदस्यता ली गई!` : `Subscribed to ${user.displayName}!`, 'success');
      } else {
        addToast(isHindi ? `${user.displayName} की सदस्यता समाप्त की गई` : `Unsubscribed from ${user.displayName}`, 'info');
      }
    } catch (err: any) {
      setIsSubbed(!willSub);
      setSubCount(prev => willSub ? Math.max(0, prev - 1) : prev + 1);
      addToast('Failed to update subscription', 'error');
    } finally {
      setIsTogglingSub(false);
    }
  };

  return (
    <div 
      onClick={() => navigate('creator', user.username)}
      className="flex flex-col sm:flex-row items-center justify-between gap-5 p-5 sm:p-6 bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-slate-800 rounded-3xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group shadow-xs"
    >
      <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left min-w-0">
        <div className="relative shrink-0">
          <UserAvatar 
            uid={user.uid}
            fallbackPhotoURL={user.photoURL}
            fallbackDisplayName={user.displayName}
            size="xl"
            className="w-20 h-20 sm:w-24 sm:h-24 text-2xl border-4 border-slate-100 dark:border-slate-800 shadow-md group-hover:scale-105 transition-transform"
          />
        </div>

        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {user.displayName}
            </h3>
            {isUserVerified(user) && (
              <span className="p-0.5 rounded-full bg-blue-500 text-white" title="Verified Channel">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 font-bold">
            @{user.username} • {formatSubscribers(subCount)} • {user.videosCount || 0} {isHindi ? 'वीडियो' : 'videos'}
          </p>

          {user.bio ? (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-xl font-medium">
              {user.bio}
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">
              {isHindi ? 'सोशलइंडिया आधिकारिक चैनल' : 'Official creator channel on SocialIndia'}
            </p>
          )}
        </div>
      </div>

      {/* YouTube-style Subscribe Button */}
      <div className="shrink-0 w-full sm:w-auto">
        <button
          type="button"
          onClick={handleSubClick}
          disabled={isTogglingSub}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer active:scale-95 shadow-sm ${
            isSubbed 
              ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200' 
              : 'bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black'
          }`}
        >
          {isSubbed ? (isHindi ? 'सदस्यता ली गई' : 'Subscribed') : (isHindi ? 'सदस्यता लें' : 'Subscribe')}
        </button>
      </div>
    </div>
  );
};

// YouTube Shorts Vertical Card
const YouTubeShortCard: React.FC<{ video: Video }> = ({ video }) => {
  const { navigate } = useRouter();

  return (
    <div 
      onClick={() => navigate('shorts', undefined, { v: video.videoId })}
      className="group relative flex flex-col cursor-pointer transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-md">
        <img 
          src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80';
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-between p-3">
          <div className="flex justify-end">
            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
              <Smartphone className="w-2.5 h-2.5" />
              Shorts
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 drop-shadow-md group-hover:underline">
              {video.title}
            </h4>
            <p className="text-[11px] font-bold text-slate-300 drop-shadow-sm">
              {formatViews(video.viewsCount || 0)}
            </p>
          </div>
        </div>

        {/* Hover play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

// YouTube Search Video Card (Horizontal on desktop, stack on mobile)
const YouTubeSearchVideoCard: React.FC<{ video: Video }> = ({ video }) => {
  const { navigate } = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [watchProgress] = useState<number>(() => {
    return playbackProgressService.getProgressPercent(video.videoId, video.duration);
  });

  useEffect(() => {
    if (video.creatorId) {
      const profile = userService.getCachedUserProfile(video.creatorId);
      if (profile) setIsVerified(isUserVerified(profile));
    }
  }, [video.creatorId]);

  return (
    <div 
      onClick={() => navigate('watch', undefined, { v: video.videoId })}
      className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-3 sm:p-4 rounded-3xl hover:bg-slate-100/80 dark:hover:bg-[#16171a] transition-all cursor-pointer group"
    >
      {/* Thumbnail */}
      <div className="relative w-full sm:w-72 md:w-80 lg:w-96 aspect-video shrink-0 rounded-2xl overflow-hidden bg-slate-900 shadow-xs">
        <img 
          src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80';
          }}
        />

        <div className="absolute bottom-2 right-2 bg-black/85 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
          {formatDuration(video.duration)}
        </div>

        {/* Watch progress bar */}
        {watchProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
            <div className="h-full bg-rose-600" style={{ width: `${watchProgress}%` }} />
          </div>
        )}

        {/* Paid Badge */}
        {video.isPaid && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider shadow-sm">
            Paid ₹{video.price || 0}
          </span>
        )}
      </div>

      {/* Video Info */}
      <div className="flex-1 space-y-2 min-w-0">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
          {video.title}
        </h3>

        <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
          <span>{formatViews(video.viewsCount || 0)}</span>
          <span>•</span>
          <span>{formatTimeAgo(video.createdAt)}</span>
        </p>

        {/* Channel info */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            navigate('creator', video.creatorUsername);
          }}
          className="flex items-center gap-2.5 py-1 hover:opacity-80 transition-opacity w-fit"
        >
          <UserAvatar 
            uid={video.creatorId}
            fallbackPhotoURL={video.creatorPhotoURL}
            fallbackDisplayName={video.creatorDisplayName}
            size="sm"
            className="w-6 h-6 text-xs"
          />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {video.creatorDisplayName}
          </span>
          {isVerified && (
            <span className="p-0.5 rounded-full bg-blue-500 text-white" title="Verified Creator">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          )}
        </div>

        {/* Description snippet */}
        {video.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
            {video.description}
          </p>
        )}

        {/* Category & Tags */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {video.category && (
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-md">
              {video.category}
            </span>
          )}
          {video.tags && video.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
              #{tag.replace(/^#/, '')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Search: React.FC = () => {
  const { route, navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [matchingUsers, setMatchingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'all' | 'channels' | 'videos' | 'shorts'>('all');
  const [recentSearches, setRecentSearches] = useState<SearchHistoryEntry[]>(() => searchHistoryService.getHistory());

  // Listen for search history updates
  useEffect(() => {
    const handleUpdate = () => {
      setRecentSearches(searchHistoryService.getHistory());
    };
    window.addEventListener('socialindia:search_history_updated', handleUpdate);
    return () => {
      window.removeEventListener('socialindia:search_history_updated', handleUpdate);
    };
  }, []);

  const executeSearch = async (term: string) => {
    setLoading(true);
    try {
      const [vResults, uResults] = await Promise.all([
        videoService.searchVideos(term),
        userService.searchUsers(term)
      ]);
      setVideos(vResults);
      setMatchingUsers(uResults);
      if (term.trim()) {
        searchHistoryService.addQuery(term.trim());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = route.searchParams?.q || '';
    setSearchTerm(q);
    executeSearch(q);
  }, [route.searchParams?.q]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      searchHistoryService.addQuery(searchTerm.trim());
      navigate('search', undefined, { q: searchTerm.trim() });
    }
  };

  const handleRecentClick = (term: string) => {
    setSearchTerm(term);
    searchHistoryService.addQuery(term);
    navigate('search', undefined, { q: term });
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    searchHistoryService.removeQuery(id);
  };

  const handleClearAll = () => {
    searchHistoryService.clearHistory();
  };

  // Separate regular videos and shorts
  const regularVideos = useMemo(() => videos.filter(v => !v.isShort), [videos]);
  const shortsVideos = useMemo(() => videos.filter(v => v.isShort), [videos]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Mobile search bar header */}
      <div className="flex items-center gap-3 md:hidden">
        <button 
          onClick={() => navigate('home')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <form onSubmit={handleFormSubmit} className="flex-1 relative">
          <input
            type="text"
            required
            placeholder={isHindi ? "वीडियो, चैनल, शॉर्ट्स खोजें..." : "Search videos, channels, shorts..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 dark:text-[#F8FAFC]"
          />
          <button type="submit" className="absolute right-3 top-2.5 text-blue-600 dark:text-blue-400">
            <SearchIcon className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* When no query is entered: Search history & Trending tags */}
      {!route.searchParams?.q && (
        <div className="space-y-6 max-w-2xl">
          {recentSearches.length > 0 ? (
            <div className="bg-white dark:bg-[#16171a] p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {isHindi ? 'हाल की खोजें (Search History)' : 'Recent Searches'}
                  </span>
                </div>
                <button 
                  onClick={handleClearAll}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isHindi ? 'सभी साफ़ करें' : 'Clear All'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {recentSearches.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleRecentClick(item.query)}
                    className="group inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-blue-50 dark:bg-[#202124] dark:hover:bg-[#2b2d31] border border-slate-200/90 dark:border-slate-700/80 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shadow-2xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span className="truncate max-w-[200px]">{item.query}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveItem(item.id, e)}
                      title={isHindi ? 'हटाएं' : 'Remove'}
                      className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Trending suggestions */}
          <div className="bg-white dark:bg-[#16171a] p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {isHindi ? 'लोकप्रिय खोज सुझाव' : 'Trending Search Suggestions'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCH_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleRecentClick(sug)}
                  className="px-3.5 py-1.5 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ad Banner */}
      <div className="my-2 max-w-xl">
        <ExternalAdBanner type="search-box" locationTag="search-page" />
      </div>

      {/* Search Results Area */}
      {route.searchParams?.q && (
        <div className="space-y-6">
          
          {/* Top Title & YouTube Filter Chips Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <SearchIcon className="w-4 h-4 text-blue-600" />
                <span>{isHindi ? 'खोज परिणाम: ' : 'Search Results for: '}</span>
                <span className="text-blue-600 dark:text-blue-400">"{route.searchParams.q}"</span>
              </h2>

              <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {matchingUsers.length} {isHindi ? 'चैनल' : 'channels'} • {videos.length} {isHindi ? 'वीडियो' : 'videos'}
              </span>
            </div>

            {/* YouTube Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSearchFilter('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  searchFilter === 'all' 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {isHindi ? 'सभी (All)' : 'All'}
              </button>

              <button
                onClick={() => setSearchFilter('channels')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  searchFilter === 'channels' 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isHindi ? 'चैनल' : 'Channels'} ({matchingUsers.length})</span>
              </button>

              <button
                onClick={() => setSearchFilter('videos')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  searchFilter === 'videos' 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{isHindi ? 'वीडियो' : 'Videos'} ({regularVideos.length})</span>
              </button>

              <button
                onClick={() => setSearchFilter('shorts')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  searchFilter === 'shorts' 
                    ? 'bg-rose-600 text-white shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Shorts ({shortsVideos.length})</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Searching across videos, creators & shorts...</p>
            </div>
          ) : (
            <div className="space-y-8">

              {/* 1. MATCHING CHANNELS / USERS (Shown if searchFilter is 'all' or 'channels') */}
              {(searchFilter === 'all' || searchFilter === 'channels') && matchingUsers.length > 0 && (
                <div className="space-y-4">
                  {searchFilter === 'channels' && (
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      {isHindi ? 'मिलते-जुलते चैनल' : 'Matching Channels'} ({matchingUsers.length})
                    </h3>
                  )}

                  <div className="space-y-3">
                    {(searchFilter === 'all' ? matchingUsers.slice(0, 1) : matchingUsers).map((user) => (
                      <YouTubeChannelCard key={user.uid} user={user} />
                    ))}
                  </div>

                  {searchFilter === 'all' && matchingUsers.length > 1 && (
                    <button
                      onClick={() => setSearchFilter('channels')}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {isHindi ? `अन्य ${matchingUsers.length - 1} चैनल देखें ➔` : `View ${matchingUsers.length - 1} more matching channels ➔`}
                    </button>
                  )}

                  <div className="h-px bg-slate-200/80 dark:border-slate-800 my-4" />
                </div>
              )}

              {/* 2. YOUTUBE SHORTS SHELF (Shown if searchFilter is 'all' or 'shorts') */}
              {(searchFilter === 'all' || searchFilter === 'shorts') && shortsVideos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Shorts
                    </h3>
                  </div>

                  {/* Vertical grid of Shorts */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {(searchFilter === 'all' ? shortsVideos.slice(0, 6) : shortsVideos).map((short) => (
                      <YouTubeShortCard key={short.videoId} video={short} />
                    ))}
                  </div>

                  {searchFilter === 'all' && shortsVideos.length > 6 && (
                    <button
                      onClick={() => setSearchFilter('shorts')}
                      className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                    >
                      {isHindi ? `सभी ${shortsVideos.length} शॉर्ट्स देखें ➔` : `View all ${shortsVideos.length} shorts ➔`}
                    </button>
                  )}

                  {searchFilter === 'all' && <div className="h-px bg-slate-200/80 dark:border-slate-800 my-4" />}
                </div>
              )}

              {/* 3. REGULAR VIDEOS (Shown if searchFilter is 'all' or 'videos') */}
              {(searchFilter === 'all' || searchFilter === 'videos') && (
                <div className="space-y-4">
                  {searchFilter === 'videos' && (
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      {isHindi ? 'वीडियो परिणाम' : 'Video Results'} ({regularVideos.length})
                    </h3>
                  )}

                  {regularVideos.length > 0 ? (
                    <div className="space-y-3">
                      {regularVideos.map((video) => (
                        <YouTubeSearchVideoCard key={video.videoId} video={video} />
                      ))}
                    </div>
                  ) : (
                    searchFilter === 'videos' && (
                      <div className="py-12 text-center text-slate-500 font-bold text-xs">
                        {isHindi ? 'कोई नियमित वीडियो नहीं मिला' : 'No long-form videos matched your search.'}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Empty Results state */}
              {matchingUsers.length === 0 && videos.length === 0 && (
                <div className="py-16 text-center space-y-3 bg-white dark:bg-[#16171a] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-8">
                  <SearchIcon className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {isHindi ? 'कोई परिणाम नहीं मिला' : 'No matching results found'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {isHindi 
                      ? 'कृपया अपनी वर्तनी जांचें या कोई अन्य कीवर्ड जैसे चैनल नाम, वीडियो शीर्षक या विषय खोजें।' 
                      : 'Try different search keywords, check for typos, or search for creator handles.'}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
};
