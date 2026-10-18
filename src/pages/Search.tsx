import React, { useState, useEffect } from 'react';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { Video, User } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { Search as SearchIcon, ArrowLeft, Trash2, Users, Clock, X, Flame } from 'lucide-react';
import { userService } from '../services/userService';
import { getInitials, formatSubscribers } from '../utils/videoUtils';
import { useTranslation } from '../i18n';
import { ExternalAdBanner } from '../components/ads/ExternalAdBanner';
import { UserAvatar } from '../components/UserAvatar';
import { searchHistoryService, SearchHistoryEntry, POPULAR_SEARCH_SUGGESTIONS } from '../services/searchHistoryService';

export const Search: React.FC = () => {
  const { route, navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [matchingUsers, setMatchingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Mobile-friendly search form header */}
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
            placeholder={isHindi ? "वीडियो, क्रिएटर, श्रेणी खोजें..." : "Search videos, creators, categories..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 dark:text-[#F8FAFC]"
          />
          <button type="submit" className="absolute right-3 top-2.5 text-blue-600 dark:text-blue-400">
            <SearchIcon className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* YouTube-style Search History Section */}
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

      {/* Search Page Sponsored Ad Banner */}
      <div className="my-4 max-w-xl">
        <ExternalAdBanner type="search-box" locationTag="search-page" />
      </div>

      {/* Results view */}
      <div className="space-y-6">
        {route.searchParams?.q && (
          <h2 className="text-sm font-black text-slate-900 dark:text-[#F8FAFC] uppercase tracking-widest flex items-center gap-2">
            <SearchIcon className="w-4 h-4 text-blue-600" />
            {isHindi ? 'खोज परिणाम: ' : 'Search Results for: '}
            <span className="text-blue-600 dark:text-blue-400">"{route.searchParams.q}"</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 lowercase ml-auto font-black tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {videos.length} {isHindi ? 'वीडियो मिले' : 'videos found'}
            </span>
          </h2>
        )}

        {/* Matching Channels (Profiles) */}
        {matchingUsers.length > 0 && (
          <div className="space-y-4 pb-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">
              {isHindi ? 'संबंधित चैनल' : 'Matching Channels'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchingUsers.map((user) => (
                <div 
                  key={user.uid}
                  onClick={() => navigate('creator', user.username)}
                  className="flex items-center gap-5 p-5 bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[2rem] hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
                >
                  <UserAvatar 
                    uid={user.uid}
                    fallbackPhotoURL={user.photoURL}
                    fallbackDisplayName={user.displayName}
                    size="xl"
                    className="w-20 h-20 min-w-[80px] min-h-[80px] text-2xl border-4 border-slate-50 dark:border-slate-800 shadow-lg group-hover:scale-110 transition-transform"
                  />
                  <div className="min-w-0">
                    <h4 className="text-base font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">{user.displayName}</h4>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">@{user.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase rounded-lg tracking-wider border border-blue-100 dark:border-blue-900/30">
                        {isHindi ? `${(user.followersCount || 0).toLocaleString()} प्रशंसक` : formatSubscribers(user.followersCount)}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[9px] font-black uppercase rounded-lg tracking-wider border border-slate-100 dark:border-slate-700">
                        {user.videosCount} {isHindi ? 'वीडियो' : 'Videos'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-4 mx-2" />
          </div>
        )}

        <VideoGrid 
          videos={videos} 
          loading={loading} 
          emptyHeading={isHindi ? 'कोई मेल खाता वीडियो नहीं मिला' : 'No matching videos found'}
          emptyMessage={isHindi ? 'कृपया दूसरे खोज शब्द आज़माएं या श्रेणियों में से वीडियो देखें।' : 'Try adjusting your search terms or exploring categories from the menu.'}
        />
      </div>
    </div>
  );
};
