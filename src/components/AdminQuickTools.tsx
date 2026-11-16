import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  addToast: (msg: string, type?: any) => void;
}

export const AdminQuickTools: React.FC<Props> = ({ addToast }) => {
  const clearBrowserCache = () => {
    const cacheKeys = Object.keys(localStorage).filter(key =>
      key.startsWith('socialindia_') &&
      !key.includes('watched_ids') &&
      !key.includes('recent_searches')
    );
    cacheKeys.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    addToast(`Browser cache cleared (${cacheKeys.length} keys).`, 'success');
  };

  const resetAdSession = () => {
    sessionStorage.removeItem('socialindia_ad_session');
    addToast('Ad rotation reset for this browser session.', 'success');
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2 text-[#800080] dark:text-[#800080]">
            <Trash2 className="h-5 w-5" />
            <h3 className="text-sm font-bold">Clear browser cache</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Clear this browser&apos;s cached app data. Watch history and recent searches are kept.
          </p>
        </div>
        <button
          type="button"
          onClick={clearBrowserCache}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700"
        >
          <Trash2 className="h-4 w-4" /> Clear browser cache
        </button>
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <RefreshCw className="h-5 w-5" />
            <h3 className="text-sm font-bold">Reset ad rotation</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Reset the per-session ad cap for testing in this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAdSession}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
        >
          <RefreshCw className="h-4 w-4" /> Reset ad session
        </button>
      </section>
    </div>
  );
};
