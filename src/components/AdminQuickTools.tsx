import React, { useState } from 'react';
import { Trash2, Megaphone, RefreshCw, Database, Check, Edit3, Flame } from 'lucide-react';

interface Props { 
  addToast: (msg: string, type?: any) => void; 
  onSelectSection?: (section: string) => void;
}

export const AdminQuickTools: React.FC<Props> = ({ addToast, onSelectSection }) => {
  const [announcement, setAnnouncement] = useState(
    localStorage.getItem('socialindia_announcement') || ''
  );

  const clearSiteCache = () => {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(k =>
      k.startsWith('socialindia_') &&
      !k.includes('watched_ids') &&
      !k.includes('recent_searches')
    );
    cacheKeys.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    addToast(`Site cache cleared (${cacheKeys.length} keys). Users will see fresh data.`, 'success');
  };

  const resetAdSession = () => {
    sessionStorage.removeItem('socialindia_ad_session');
    addToast('Ad session reset. Ad rotation will restart fresh.', 'success');
  };

  const saveAnnouncement = () => {
    if (announcement.trim()) {
      localStorage.setItem('socialindia_announcement', announcement.trim());
    } else {
      localStorage.removeItem('socialindia_announcement');
    }
    addToast('Announcement saved. It shows on users\' next page load.', 'success');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Tool 1: Firebase Video Editor */}
      <div className="bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl p-5 space-y-3 flex flex-col justify-between shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Database className="w-5 h-5" />
            <h3 className="font-black text-sm uppercase tracking-wide">Firebase Edit Tool</h3>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            Search videos, view thumbnails, and directly edit real views & likes in Firestore. No mocks or fake counts.
          </p>
        </div>
        <button 
          onClick={() => onSelectSection ? onSelectSection('firebase_edit') : window.location.hash = '#firebase_edit'} 
          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
        >
          <Edit3 className="w-4 h-4 stroke-[2.5]" /> Launch Live Editor
        </button>
      </div>

      {/* Tool 2: Site-wide announcement */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Megaphone className="w-5 h-5" />
          <h3 className="font-black text-sm uppercase tracking-wide">Announcement Banner</h3>
        </div>
        <textarea
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          placeholder="Type a site-wide announcement for all users..."
          rows={2}
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
        />
        <button onClick={saveAnnouncement} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> Save Banner
        </button>
      </div>

      {/* Tool 3: Cache cleaner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <Database className="w-5 h-5" />
          <h3 className="font-black text-sm uppercase tracking-wide">Clear Site Cache</h3>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Clears cached videos and search results on this browser. User watch history is NOT deleted.
        </p>
        <button onClick={clearSiteCache} className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4" /> Clear Cache Now
        </button>
      </div>

      {/* Tool 4: Ad session reset */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <RefreshCw className="w-5 h-5" />
          <h3 className="font-black text-sm uppercase tracking-wide">Reset Ad Rotation</h3>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Resets the per-session ad cap (10 ads/session). Use if ads stopped showing during testing.
        </p>
        <button onClick={resetAdSession} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> Reset Ad Session
        </button>
      </div>
    </div>
  );
};
