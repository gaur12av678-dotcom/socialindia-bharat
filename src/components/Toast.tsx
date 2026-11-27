import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react';
import { ActiveDownloadItem, downloadService } from '../services/downloadService';
import { useTranslation } from '../i18n';
import { useRouter } from '../hooks/useRouter';

export const ToastContainer: React.FC = () => {
  const [downloads, setDownloads] = useState<ActiveDownloadItem[]>([]);
  const { isHindi } = useTranslation();
  const { navigate } = useRouter();

  useEffect(() => {
    return downloadService.subscribeDownloads(setDownloads);
  }, []);

  if (downloads.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 right-3 sm:right-5 z-[95] flex flex-col gap-2.5 w-[calc(100vw-24px)] max-w-sm pointer-events-none"
    >
      {downloads.map((item) => (
        <div
          key={item.videoId}
          className="pointer-events-auto bg-white/95 dark:bg-[#161822]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3.5 space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  item.status === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : item.status === 'error'
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                }`}
              >
                {item.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : item.status === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <ArrowDownToLine className="w-4 h-4 animate-bounce" />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {item.title}
                </p>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {item.status === 'downloading'
                    ? isHindi
                      ? `डाउनलोड हो रहा है... ${item.progress}%`
                      : `Downloading... ${item.progress}%`
                    : item.status === 'completed'
                      ? isHindi
                        ? 'डाउनलोड पूरा हुआ! ऑफ़लाइन सहेजा गया'
                        : 'Download complete! Saved for offline'
                      : isHindi
                        ? 'डाउनलोड विफल हुआ (केवल सीधे वीडियो उपलब्ध)'
                        : 'Download failed for this stream'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => downloadService.dismissDownloadStatus(item.videoId)}
              aria-label={isHindi ? 'बंद करें' : 'Dismiss'}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {item.status === 'downloading' && (
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-200"
                style={{ width: `${Math.max(4, item.progress)}%` }}
              />
            </div>
          )}

          {item.status === 'completed' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  downloadService.dismissDownloadStatus(item.videoId);
                  navigate('downloads');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <span>{isHindi ? 'डाउनलोड्स खोलें' : 'Open Downloads'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
