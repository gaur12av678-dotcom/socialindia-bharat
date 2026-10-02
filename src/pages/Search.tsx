import React, { useState, useEffect } from 'react';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { Video, User } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { Search as SearchIcon, ArrowLeft, Trash2, Users } from 'lucide-react';
import { userService } from '../services/userService';
import { getInitials, formatSubscribers } from '../utils/videoUtils';

export const Search: React.FC = () => {
  const { route, navigate } = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [matchingUsers, setMatchingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('socialindia_recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveSearchTerm = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const filtered = recentSearches.filter(s => s !== clean);
    const updated = [clean, ...filtered].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('socialindia_recent_searches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('socialindia_recent_searches');
  };

  const executeSearch = async (term: string) => {
    setLoading(true);
    try {
      const [vResults, uResults] = await Promise.all([
        videoService.searchVideos(term),
        userService.searchUsers(term)
      ]);
      setVideos(vResults);
      setMatchingUsers(uResults);
      if (term) {
        saveSearchTerm(term);
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
    navigate('search', undefined, { q: searchTerm.trim() });
  };

  const handleRecentClick = (term: string) => {
    setSearchTerm(term);
    navigate('search', undefined, { q: term });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      
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
            placeholder="Search videos, creators, categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 dark:text-[#F8FAFC]"
          />
          <button type="submit" className="absolute right-3 top-2.5 text-blue-600 dark:text-blue-400">
            <SearchIcon className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Recent Searches Panel */}
      {recentSearches.length > 0 && !route.searchParams?.q && (
        <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200/80 dark:border-[#334155] max-w-xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recent Searches</span>
            <button 
              onClick={clearRecentSearches}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term, idx) => (
              <button
                key={idx}
                onClick={() => handleRecentClick(term)}
                className="px-3.5 py-1.5 bg-slate-50 hover:bg-blue-50 dark:bg-[#1E293B] dark:hover:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results view */}
      <div className="space-y-6">
        {route.searchParams?.q && (
          <h2 className="text-sm font-black text-slate-900 dark:text-[#F8FAFC] uppercase tracking-widest flex items-center gap-2">
            <SearchIcon className="w-4 h-4 text-blue-600" />
            Search Results for: <span className="text-blue-600 dark:text-blue-400">"{route.searchParams.q}"</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 lowercase ml-auto font-black tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{videos.length} videos found</span>
          </h2>
        )}

        {/* Matching Channels (Profiles) */}
        {matchingUsers.length > 0 && (
          <div className="space-y-4 pb-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Matching Channels</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchingUsers.map((user) => (
                <div 
                  key={user.uid}
                  onClick={() => navigate('creator', user.username)}
                  className="flex items-center gap-5 p-5 bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[2rem] hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
                >
                  <div className="w-20 h-20 rounded-full bg-blue-600 shrink-0 overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-lg group-hover:scale-110 transition-transform">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl bg-gradient-to-br from-blue-600 to-indigo-700">{getInitials(user.displayName)}</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">{user.displayName}</h4>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">@{user.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase rounded-lg tracking-wider border border-blue-100 dark:border-blue-900/30">
                        {formatSubscribers(user.followersCount)} Fans
                      </span>
                      <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[9px] font-black uppercase rounded-lg tracking-wider border border-slate-100 dark:border-slate-700">
                        {user.videosCount} Videos
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
          emptyHeading="No matching videos found"
          emptyMessage="Try adjusting your search terms or exploring categories from the menu."
        />
      </div>
    </div>
  );
};
