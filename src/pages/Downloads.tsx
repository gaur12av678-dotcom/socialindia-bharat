import React, { useState, useEffect } from 'react';
import { DownloadedVideo } from '../types';
import { downloadService } from '../services/downloadService';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { formatDuration, formatTimeAgo } from '../utils/videoUtils';
import { 
  Trash2, 
  Play, 
  Film, 
  HardDrive, 
  WifiOff, 
  Save, 
  CheckCircle2, 
  X,
  ArrowDownToLine,
  Download,
  ArrowLeft
} from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { useTranslation } from '../i18n';

export const Downloads: React.FC = () => {
  const { navigate } = useRouter();
  const { addToast } = useApp();
  const { t, isHindi } = useTranslation();

  const [downloads, setDownloads] = useState<DownloadedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'videos' | 'shorts'>('all');
  const [storageUsage, setStorageUsage] = useState(0);

  // Active video playing in offline modal
  const [activePlayingVideo, setActivePlayingVideo] = useState<{
    item: DownloadedVideo;
    blobUrl: string;
  } | null>(null);

  const loadDownloads = async () => {
    setLoading(true);
    try {
      const items = await downloadService.getAllDownloads();
      setDownloads(items);
      const usage = await downloadService.getTotalStorageUsage();
      setStorageUsage(usage);
    } catch (err) {
      console.error('Failed to load downloads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownloads();
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
      const updatedUsage = await downloadService.getTotalStorageUsage();
      setStorageUsage(updatedUsage);
      addToast(isHindi ? `"${title}" को ऑफ़लाइन स्टोरेज से हटा दिया गया।` : `"${title}" removed from offline storage.`, 'info');
    } catch (err) {
      addToast(isHindi ? 'डाउनलोड हटाने में विफल।' : 'Failed to delete download.', 'error');
    }
  };

  const handlePlayOffline = (item: DownloadedVideo) => {
    try {
      const blobUrl = URL.createObjectURL(item.videoBlob);
      setActivePlayingVideo({ item, blobUrl });
    } catch (err) {
      addToast('Could not open video stream.', 'error');
    }
  };

  const handleClosePlayer = () => {
    if (activePlayingVideo) {
      URL.revokeObjectURL(activePlayingVideo.blobUrl);
      setActivePlayingVideo(null);
    }
  };

  const handleExportFile = async (item: DownloadedVideo) => {
    try {
      await downloadService.exportToDevice(item);
      addToast('Saving MP4 to device downloads...', 'success');
    } catch (err) {
      addToast('Failed to export file.', 'error');
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

      {/* TOP STORAGE HEADER BANNER - Guaranteed High Contrast */}
      <div 
        style={{ backgroundColor: '#0f172a' }}
        className="rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-black uppercase tracking-wider">
              <WifiOff className="w-3.5 h-3.5" />
              {isHindi ? '100% असली ऑफ़लाइन मोड' : '100% Real Offline Mode'}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {isHindi ? 'ऑफ़लाइन डाउनलोड्स वॉल्ट' : 'Offline Downloads Vault'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
              {isHindi 
                ? 'डाउनलोड किए गए वीडियो और शॉर्ट्स आपके डिवाइस में सुरक्षित रहते हैं। बिना इंटरनेट कनेक्शन के कभी भी देखें।'
                : 'Downloaded videos & shorts are saved locally in your device storage. You can watch them anytime, even without an active internet connection or mobile data.'}
            </p>
          </div>

          {/* Storage Meter Widget */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 md:p-5 flex items-center gap-4 shrink-0 shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">
                {isHindi ? 'डिवाइस स्टोरेज उपयोग' : 'Device Storage Used'}
              </div>
              <div className="text-xl md:text-2xl font-black text-white">{formatFileSize(storageUsage)}</div>
              <div className="text-[11px] font-semibold text-blue-400 mt-0.5">
                {isHindi ? `${downloads.length} वीडियो ऑफ़लाइन सहेजे गए` : `${downloads.length} items saved offline`}
              </div>
            </div>
          </div>
        </div>
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
            {isHindi ? `शॉर्ट्स (${downloads.filter(d => d.isShort).length})` : `Shorts (${downloads.filter(d => d.isShort).length})`}
          </button>
        </div>
      </div>

      {/* DOWNLOADS CONTENT LIST */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
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
              ? 'बिना इंटरनेट देखने के लिए किसी भी वीडियो या शॉर्ट पर डाउनलोड बटन दबाएं!' 
              : 'Click the Download button on any video or short to save it for offline watching anytime!'}
          </p>
          <button
            onClick={() => navigate('home')}
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition-all"
          >
            {isHindi ? 'वीडियो एक्सप्लोर करें' : 'Explore Videos'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredDownloads.map((item) => (
            <div
              key={item.videoId}
              className="bg-white dark:bg-[#111827] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col group"
            >
              {/* Thumbnail / Poster Area - Consistent 16:9 ratio so card details are never pushed offscreen */}
              <div 
                className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer shrink-0" 
                onClick={() => handlePlayOffline(item)}
              >
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
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
                    Shorts
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
                        onClick={() => handlePlayOffline(item)}
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
                    onClick={() => handlePlayOffline(item)}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play Offline
                  </button>

                  <button
                    onClick={() => handleExportFile(item)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer transition-colors"
                    title="Export MP4 to device"
                  >
                    <Save className="w-4 h-4" />
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
          ))}
        </div>
      )}

      {/* REAL OFFLINE VIDEO PLAYER MODAL */}
      {activePlayingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-10 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  Offline Playback
                </div>
                <h3 className="text-sm md:text-base font-bold truncate text-white">
                  {activePlayingVideo.item.title}
                </h3>
              </div>
              <button
                onClick={handleClosePlayer}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Offline Video Element */}
            <div className="relative w-full bg-black flex items-center justify-center min-h-[300px] max-h-[70vh]">
              <video
                src={activePlayingVideo.blobUrl}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[70vh] object-contain rounded-b-2xl shadow-2xl"
              />
            </div>

            {/* Modal Bottom Bar */}
            <div className="px-6 py-3 bg-slate-900/90 text-white flex items-center justify-between text-xs font-semibold border-t border-white/10">
              <div className="flex items-center gap-2">
                <span>Creator: <strong>{activePlayingVideo.item.creatorDisplayName}</strong></span>
                <span className="opacity-40">•</span>
                <span>Size: <strong>{formatFileSize(activePlayingVideo.item.sizeBytes)}</strong></span>
              </div>
              <button
                onClick={() => handleExportFile(activePlayingVideo.item)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save MP4 to Phone/PC
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
