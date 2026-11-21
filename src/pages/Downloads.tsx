import React, { useState, useEffect, useRef } from 'react';
import { DownloadedVideo } from '../types';
import { downloadService } from '../services/downloadService';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { formatDuration, formatTimeAgo } from '../utils/videoUtils';
import { 
  Trash2, 
  Play, 
  Film, 
  CheckCircle2, 
  ArrowDownToLine,
  ArrowLeft
} from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { useTranslation } from '../i18n';

export const Downloads: React.FC = () => {
  const { navigate } = useRouter();
  const { addToast } = useApp();
  const { t, isHindi } = useTranslation();

  const [downloads, setDownloads] = useState<DownloadedVideo[]>([]);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'videos' | 'shorts'>('all');
  const createdThumbUrlsRef = useRef<string[]>([]);

  const revokeThumbUrls = () => {
    createdThumbUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore cleanup errors
      }
    });
    createdThumbUrlsRef.current = [];
  };

  const loadDownloads = async () => {
    setLoading(true);
    try {
      const items = await downloadService.getAllDownloads();
      revokeThumbUrls();
      const thumbMap: Record<string, string> = {};
      for (const item of items) {
        if (item.thumbnailBlob) {
          const objectUrl = URL.createObjectURL(item.thumbnailBlob);
          createdThumbUrlsRef.current.push(objectUrl);
          thumbMap[item.videoId] = objectUrl;
        } else if (item.thumbnailUrl) {
          thumbMap[item.videoId] = item.thumbnailUrl;
        }
      }
      setThumbnailUrls(thumbMap);
      setDownloads(items);
    } catch (err) {
      console.error('Failed to load downloads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownloads();
    return () => {
      revokeThumbUrls();
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) {
      return `${mb.toFixed(1)} MB`;
    }
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const handleDelete = async (videoId: string, title: string) => {
    try {
      await downloadService.deleteDownload(videoId);
      setDownloads(prev => prev.filter(d => d.videoId !== videoId));
      addToast(isHindi ? `"${title}" को ऑफ़लाइन स्टोरेज से हटा दिया गया।` : `"${title}" removed from offline storage.`, 'info');
    } catch (err) {
      addToast(isHindi ? 'डाउनलोड हटाने में विफल।' : 'Failed to delete download.', 'error');
    }
  };

  const handlePlayDownloaded = (item: DownloadedVideo) => {
    if (item.isShort) {
      navigate('shorts', item.videoId);
    } else {
      navigate('watch', item.videoId);
    }
  };

  const filteredDownloads = downloads.filter(d => {
    if (filter === 'videos') return !d.isShort;
    if (filter === 'shorts') return d.isShort;
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Mobile Top Navigation Bar (YouTube style) */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={() => navigate('home')}
          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-black text-slate-900 dark:text-white">
          {t('downloads_title', 'Downloads')}
        </span>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            style={{ backgroundColor: filter === 'all' ? '#2563eb' : undefined }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isHindi ? `सभी डाउनलोड (${downloads.length})` : `All Downloads (${downloads.length})`}
          </button>
          <button
            onClick={() => setFilter('videos')}
            style={{ backgroundColor: filter === 'videos' ? '#2563eb' : undefined }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'videos'
                ? 'text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isHindi ? `वीडियो (${downloads.filter(d => !d.isShort).length})` : `Videos (${downloads.filter(d => !d.isShort).length})`}
          </button>
          <button
            onClick={() => setFilter('shorts')}
            style={{ backgroundColor: filter === 'shorts' ? '#2563eb' : undefined }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'shorts'
                ? 'text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isHindi ? `क्लिप्स (${downloads.filter(d => d.isShort).length})` : `Clips (${downloads.filter(d => d.isShort).length})`}
          </button>
        </div>
      </div>

      {/* DOWNLOADS CONTENT LIST */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-64 animate-pulse p-4" />
          ))}
        </div>
      ) : filteredDownloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50 dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
            <ArrowDownToLine className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {t('downloads_empty', 'No offline downloads yet')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 font-medium leading-relaxed">
            {isHindi 
              ? 'बिना इंटरनेट देखने के लिए किसी भी वीडियो या क्लिप पर डाउनलोड बटन दबाएं!'
              : 'Click the Download button on any video or clip to save it for offline watching anytime!'}
          </p>
          <button
            onClick={() => navigate('home')}
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition-all"
          >
            {isHindi ? 'वीडियो एक्सप्लोर करें' : 'Explore Videos'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDownloads.map((item) => {
            const thumbSrc = thumbnailUrls[item.videoId] || item.thumbnailUrl;
            return (
              <div
                key={item.videoId}
                className="bg-white dark:bg-[#111827] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col group"
              >
                {/* Thumbnail / Poster Area */}
                <div 
                  className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer shrink-0" 
                  onClick={() => handlePlayDownloaded(item)}
                >
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white p-4">
                      <Film className="w-10 h-10 text-slate-400 mb-1" />
                      <span className="text-[11px] font-bold text-slate-300 text-center line-clamp-1">Offline Video</span>
                    </div>
                  )}

                  {/* Duration badge */}
                  {item.duration > 0 && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-black rounded-md">
                      {formatDuration(item.duration)}
                    </div>
                  )}

                  {/* Shorts badge */}
                  {item.isShort && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider shadow-sm">
                      Clips
                    </div>
                  )}

                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Card Metadata & Actions */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white dark:bg-[#111827]">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <UserAvatar
                        uid={item.creatorId}
                        fallbackPhotoURL={item.creatorPhotoURL}
                        fallbackDisplayName={item.creatorDisplayName || item.creatorUsername}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 
                          onClick={() => handlePlayDownloaded(item)}
                          className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-blue-600 cursor-pointer leading-snug"
                          title={item.title}
                        >
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
                          {item.creatorDisplayName || item.creatorUsername}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-medium border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {formatFileSize(item.sizeBytes)}
                      </span>
                      <span>Downloaded {formatTimeAgo(item.downloadedAt)}</span>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handlePlayDownloaded(item)}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {item.isShort ? (isHindi ? 'क्लिप चलाएं' : 'Play Clip') : (isHindi ? 'वीडियो चलाएं' : 'Play Video')}
                    </button>

                    <button
                      onClick={() => handleDelete(item.videoId, item.title)}
                      className="p-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl cursor-pointer transition-colors"
                      title="Delete offline file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
