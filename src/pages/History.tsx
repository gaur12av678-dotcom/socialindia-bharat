import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { historyService } from '../services/historyService';
import { HistoryItem } from '../types';
import { History, Trash2, X, AlertCircle } from 'lucide-react';
import { formatTimeAgo } from '../utils/videoUtils';

export const WatchHistory: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { navigate } = useRouter();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const items = await historyService.getHistory(currentUser.uid);
      setHistory(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  const handleRemoveItem = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      await historyService.removeFromHistory(currentUser.uid, videoId);
      setHistory(prev => prev.filter(item => item.videoId !== videoId));
      addToast('Removed from watch history.', 'info');
    } catch (err) {
      addToast('Failed to remove item.', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!currentUser) return;
    if (window.confirm('Clear your entire watch history?')) {
      try {
        await historyService.clearHistory(currentUser.uid);
        setHistory([]);
        addToast('Watch history cleared.', 'success');
      } catch (err) {
        addToast('Failed to clear watch history.', 'error');
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <History className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Sign in to view watch history</h3>
        <p className="text-xs text-slate-500 mt-1">Track what you've watched on SocialIndia.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      
      {/* Title Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-indigo-500 rounded-xl">
            <History className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Watch History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Keep track of the creative videos you have watched</p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/35 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex gap-4 p-4 border border-slate-100 rounded-2xl">
              <div className="w-40 aspect-video bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4.5 bg-slate-200 dark:bg-slate-800 rounded-lg w-2/3" />
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-900/20 shadow-sm">
            <History className="w-7 h-7" />
          </div>
          <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Your history is empty</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            You haven't watched any videos yet! Go ahead and browse the home feed to discover amazing content.
          </p>
          <button
            onClick={() => navigate('home')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
          >
            Start Browsing
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.videoId}
              onClick={() => navigate('watch', item.videoId)}
              className="flex gap-4 p-3 bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#272727] rounded-2xl cursor-pointer hover:shadow-md transition-all group relative"
            >
              <div className="w-32 sm:w-44 aspect-video bg-slate-100 dark:bg-[#272727] rounded-xl overflow-hidden shrink-0">
                <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1 pr-8">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1 truncate">
                    {item.creatorDisplayName}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Watched {formatTimeAgo(item.watchedAt)}
                </p>
              </div>

              {/* Delete button from History row */}
              <button
                onClick={(e) => handleRemoveItem(e, item.videoId)}
                className="absolute top-3 right-3 p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 dark:bg-slate-950 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer transition-colors"
                title="Remove from history"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
