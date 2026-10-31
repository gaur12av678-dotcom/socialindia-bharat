import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { historyService } from '../services/historyService';
import { playbackProgressService } from '../services/playbackProgressService';
import { HistoryItem } from '../types';
import { History, Trash2, X } from 'lucide-react';
import { useTranslation } from '../i18n';

export const WatchHistory: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi, formatTime } = useTranslation();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchHistory = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const items = await historyService.getHistory(currentUser.uid);
      setHistory(items);
      playbackProgressService.syncFromHistoryItems(items);
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
      addToast(isHindi ? 'वॉच हिस्ट्री से हटा दिया गया।' : 'Removed from watch history.', 'info');
    } catch (err) {
      addToast(isHindi ? 'हटाने में विफल।' : 'Failed to remove item.', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!currentUser) return;
    try {
      await historyService.clearHistory(currentUser.uid);
      setHistory([]);
      setShowClearConfirm(false);
      addToast(isHindi ? 'वॉच हिस्ट्री साफ़ कर दी गई।' : 'Watch history cleared.', 'success');
    } catch (err) {
      addToast(isHindi ? 'हिस्ट्री साफ़ करने में विफल।' : 'Failed to clear watch history.', 'error');
    }
  };

    const getGroupLabel = (isoString: string): string => {
    const d = new Date(isoString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfItem = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfToday - startOfItem) / 86400000);
    if (diffDays === 0) return isHindi ? 'आज' : 'Today';
    if (diffDays === 1) return isHindi ? 'कल' : 'Yesterday';
    if (diffDays < 7) return isHindi ? 'इस सप्ताह' : 'This Week';
    return isHindi ? 'पहले' : 'Earlier';
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <History className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          {isHindi ? 'वॉच हिस्ट्री देखने के लिए साइन इन करें' : 'Sign in to view watch history'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {isHindi ? 'SocialIndia पर देखे गए वीडियो का रिकॉर्ड रखें।' : "Track what you've watched on SocialIndia."}
        </p>
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
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              {t('history_title', 'Watch History')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
              {isHindi ? 'आपके द्वारा देखे गए सभी वीडियो की सूची' : 'Keep track of the creative videos you have watched'}
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2">
            {showClearConfirm ? (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 px-1">
                  {isHindi ? 'पूरी हिस्ट्री साफ़ करें?' : 'Clear all?'}
                </span>
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isHindi ? 'हाँ' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isHindi ? 'नहीं' : 'No'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/35 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('history_clear', 'Clear History')}</span>
              </button>
            )}
          </div>
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
          <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
            {t('history_empty', 'Your history is empty')}
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            {isHindi ? 'आपने अभी तक कोई वीडियो नहीं देखा है! होम फ़ीड पर शानदार वीडियो देखें।' : "You haven't watched any videos yet! Go ahead and browse the home feed to discover amazing content."}
          </p>
          <button
            onClick={() => navigate('home')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
          >
            {isHindi ? 'वीडियो देखना शुरू करें' : 'Start Browsing'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {(['Today', 'Yesterday', 'This Week', 'Earlier'] as const).map(group => {
            const items = history.filter(item => getGroupLabel(item.watchedAt) === (isHindi
              ? { Today: 'आज', Yesterday: 'कल', 'This Week': 'इस सप्ताह', Earlier: 'पहले' }[group]
              : group));
            if (items.length === 0) return null;
            return (
              <div key={group} className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                  {isHindi
                    ? { Today: 'आज', Yesterday: 'कल', 'This Week': 'इस सप्ताह', Earlier: 'पहले' }[group]
                    : group}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
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
                          {isHindi ? `${formatTime(item.watchedAt)} देखा गया` : `Watched ${formatTime(item.watchedAt)}`}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleRemoveItem(e, item.videoId)}
                        className="absolute top-3 right-3 p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 dark:bg-slate-950 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer transition-colors"
                        title={isHindi ? 'हिस्ट्री से हटाएं' : 'Remove from history'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
