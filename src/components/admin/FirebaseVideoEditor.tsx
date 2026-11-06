import React, { useState, useEffect, useMemo } from 'react';
import { Video } from '../../types';
import { adminService } from '../../services/adminService';
import { videoService } from '../../services/videoService';
import { db } from '../../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { 
  Database, 
  Search, 
  RefreshCw, 
  Edit3, 
  Check, 
  X, 
  ExternalLink, 
  Copy, 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Film, 
  Smartphone, 
  Sparkles, 
  Flame, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Globe, 
  TrendingUp, 
  Plus, 
  SlidersHorizontal,
  FileCode2,
  Play
} from 'lucide-react';
import { formatViews, formatDuration, formatTimeAgo, getInitials } from '../../utils/videoUtils';
import { useRouter } from '../../hooks/useRouter';

interface Props {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshParentVideos?: () => void;
}

export const FirebaseVideoEditor: React.FC<Props> = ({ addToast, onRefreshParentVideos }) => {
  const { navigate } = useRouter();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'short' | 'high_views' | 'low_views' | 'high_likes'>('all');
  
  // Direct Document ID Lookup
  const [docIdInput, setDocIdInput] = useState('');
  const [isSearchingDocId, setIsSearchingDocId] = useState(false);

  // Active editing modal state
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [formViews, setFormViews] = useState<number>(0);
  const [formLikes, setFormLikes] = useState<number>(0);
  const [formComments, setFormComments] = useState<number>(0);
  const [formShares, setFormShares] = useState<number>(0);
  const [formTitle, setFormTitle] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formCategory, setFormCategory] = useState('Entertainment');
  const [formVisibility, setFormVisibility] = useState<Video['visibility']>('public');
  const [formStatus, setFormStatus] = useState<Video['status']>('published');
  const [formIsShort, setFormIsShort] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [quickBoostingId, setQuickBoostingId] = useState<string | null>(null);

  // Fetch all videos directly from Firestore
  const loadVideosFromFirestore = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const snap = await getDocs(collection(db, 'videos'));
      const list = snap.docs.map(d => ({ ...(d.data() as Video), videoId: d.id }));
      setVideos(list);
      if (isManual) {
        addToast(`Synced ${list.length} videos live from Firebase Firestore!`, 'success');
        if (onRefreshParentVideos) onRefreshParentVideos();
      }
    } catch (err: any) {
      console.error('Failed to fetch videos from Firestore:', err);
      addToast(`Error loading from Firestore: ${err?.message || 'Permission or network error'}`, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVideosFromFirestore();
  }, []);

  // Quick direct ID search
  const handleLookupDocId = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = docIdInput.trim();
    if (!id) return;

    setIsSearchingDocId(true);
    try {
      const snap = await getDoc(doc(db, 'videos', id));
      if (snap.exists()) {
        const found = { ...(snap.data() as Video), videoId: snap.id };
        openEditModal(found);
        addToast(`Document "${id}" loaded from Firestore!`, 'success');
      } else {
        addToast(`Document ID "${id}" not found in "videos" collection.`, 'error');
      }
    } catch (err: any) {
      addToast(`Lookup failed: ${err.message}`, 'error');
    } finally {
      setIsSearchingDocId(false);
    }
  };

  // Open edit modal and populate fields
  const openEditModal = (video: Video) => {
    setEditingVideo(video);
    setFormViews(video.viewsCount || 0);
    setFormLikes(video.likesCount || 0);
    setFormComments(video.commentsCount || 0);
    setFormShares(video.sharesCount || 0);
    setFormTitle(video.title || '');
    setFormThumbnailUrl(video.thumbnailUrl || '');
    setFormCategory(video.category || 'Entertainment');
    setFormVisibility(video.visibility || 'public');
    setFormStatus(video.status || 'published');
    setFormIsShort(Boolean(video.isShort));
    setFormDescription(video.description || '');
  };

  // Quick 1-click Boost directly in Firestore
  const handleQuickBoost = async (videoId: string, field: 'views' | 'likes', amount: number) => {
    setQuickBoostingId(videoId);
    try {
      const target = videos.find(v => v.videoId === videoId);
      if (!target) return;

      const currentVal = field === 'views' ? (target.viewsCount || 0) : (target.likesCount || 0);
      const newVal = Math.max(0, currentVal + amount);

      await adminService.updateVideoDetails(videoId, {
        [field === 'views' ? 'viewsCount' : 'likesCount']: newVal
      });

      // Update local state instantly
      setVideos(prev => prev.map(v => v.videoId === videoId ? {
        ...v,
        [field === 'views' ? 'viewsCount' : 'likesCount']: newVal
      } : v));

      addToast(`Updated Firestore! +${amount.toLocaleString()} ${field} added to "${target.title.slice(0, 25)}..."`, 'success');
      if (onRefreshParentVideos) onRefreshParentVideos();
    } catch (err: any) {
      console.error(err);
      addToast(`Boost failed: ${err?.message || 'Database error'}`, 'error');
    } finally {
      setQuickBoostingId(null);
    }
  };

  // Save full edits to Firestore
  const handleSaveToFirestore = async () => {
    if (!editingVideo) return;
    setIsSaving(true);

    try {
      await adminService.updateVideoDetails(editingVideo.videoId, {
        viewsCount: formViews,
        likesCount: formLikes,
        commentsCount: formComments,
        sharesCount: formShares,
        title: formTitle,
        thumbnailUrl: formThumbnailUrl,
        category: formCategory,
        visibility: formVisibility,
        status: formStatus,
        isShort: formIsShort,
        description: formDescription
      });

      // Update local list
      setVideos(prev => prev.map(v => v.videoId === editingVideo.videoId ? {
        ...v,
        viewsCount: formViews,
        likesCount: formLikes,
        commentsCount: formComments,
        sharesCount: formShares,
        title: formTitle,
        thumbnailUrl: formThumbnailUrl,
        category: formCategory,
        visibility: formVisibility,
        status: formStatus,
        isShort: formIsShort,
        description: formDescription
      } : v));

      addToast(`✅ Real changes saved to Firestore! Views: ${formViews.toLocaleString()}, Likes: ${formLikes.toLocaleString()}`, 'success');
      setEditingVideo(null);
      if (onRefreshParentVideos) onRefreshParentVideos();
    } catch (err: any) {
      console.error('Failed to save to Firestore:', err);
      addToast(`Save failed: ${err?.message || 'Failed to update document'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered and searched videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(v => 
        (v.title || '').toLowerCase().includes(q) ||
        (v.videoId || '').toLowerCase().includes(q) ||
        (v.creatorUsername || '').toLowerCase().includes(q) ||
        (v.creatorDisplayName || '').toLowerCase().includes(q) ||
        (v.category || '').toLowerCase().includes(q)
      );
    }

    if (filterType === 'short') {
      result = result.filter(v => v.isShort);
    } else if (filterType === 'video') {
      result = result.filter(v => !v.isShort);
    } else if (filterType === 'high_views') {
      result = result.filter(v => (v.viewsCount || 0) >= 10000);
      result.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    } else if (filterType === 'low_views') {
      result = result.filter(v => (v.viewsCount || 0) < 1000);
      result.sort((a, b) => (a.viewsCount || 0) - (b.viewsCount || 0));
    } else if (filterType === 'high_likes') {
      result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    }

    return result;
  }, [videos, searchTerm, filterType]);

  // Platform statistics
  const totalViews = useMemo(() => videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0), [videos]);
  const totalLikes = useMemo(() => videos.reduce((acc, v) => acc + (v.likesCount || 0), 0), [videos]);
  const totalShorts = useMemo(() => videos.filter(v => v.isShort).length, [videos]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard!`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Tool Header */}
      <div className="bg-linear-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider">
            <Database className="w-3.5 h-3.5 text-amber-200" />
            <span>Firestore Direct Database Sync</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Firebase Video Editor (लाइव फायरबेस डेटाबेस टूल)
          </h2>
          <p className="text-sm text-amber-100 max-w-2xl font-medium leading-relaxed">
            Real Firestore database tool to edit video metrics directly. Changes made here to <strong>Views</strong>, <strong>Likes</strong>, <strong>Comments</strong>, <strong>Title</strong>, and <strong>Thumbnail</strong> are written permanently to Firestore and reflect platform-wide in real-time.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">Total Videos</span>
              <span className="text-xl font-black">{videos.length}</span>
            </div>
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">Shorts Count</span>
              <span className="text-xl font-black">{totalShorts}</span>
            </div>
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">Platform Views</span>
              <span className="text-xl font-black">{formatViews(totalViews)}</span>
            </div>
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">Platform Likes</span>
              <span className="text-xl font-black">{totalLikes.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Strip & Search */}
      <div className="bg-white dark:bg-[#16171a] p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by Title, Video ID, Creator username or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202124] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900 dark:text-white"
            />
          </div>

          {/* Direct Doc ID Fetch Bar */}
          <form onSubmit={handleLookupDocId} className="flex items-center gap-2">
            <div className="relative">
              <input 
                type="text"
                placeholder="Direct Firestore ID..."
                value={docIdInput}
                onChange={(e) => setDocIdInput(e.target.value)}
                className="w-48 sm:w-56 px-3.5 py-2.5 bg-slate-50 dark:bg-[#202124] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-semibold focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingDocId || !docIdInput.trim()}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              {isSearchingDocId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              <span>Fetch Doc</span>
            </button>

            {/* Sync Firestore button */}
            <button
              type="button"
              onClick={() => loadVideosFromFirestore(true)}
              disabled={refreshing}
              className="px-4 py-2.5 bg-slate-100 dark:bg-[#27272a] hover:bg-slate-200 dark:hover:bg-[#323236] text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Pull fresh snapshots directly from Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
              <span className="hidden sm:inline">Sync Live</span>
            </button>
          </form>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider mr-1">Filter:</span>
          
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Videos ({videos.length})
          </button>

          <button
            onClick={() => setFilterType('video')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'video' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Film className="w-3 h-3" />
            <span>Regular Videos ({videos.length - totalShorts})</span>
          </button>

          <button
            onClick={() => setFilterType('short')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'short' 
                ? 'bg-rose-600 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Shorts ({totalShorts})</span>
          </button>

          <button
            onClick={() => setFilterType('high_views')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'high_views' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>High Views (≥ 10k)</span>
          </button>

          <button
            onClick={() => setFilterType('low_views')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'low_views' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Low Views (&lt; 1k)
          </button>

          <button
            onClick={() => setFilterType('high_likes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'high_likes' 
                ? 'bg-purple-600 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
            <span>Top Liked</span>
          </button>

          <span className="ml-auto text-xs font-bold text-slate-400">
            Showing {filteredVideos.length} matching video documents
          </span>
        </div>
      </div>

      {/* Videos List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-sm font-bold text-slate-500">Loading videos directly from Firebase Firestore...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="bg-white dark:bg-[#16171a] p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Database className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No videos matched</h3>
          <p className="text-xs text-slate-500">Try adjusting your search query or reset filter to "All Videos".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredVideos.map((video) => (
            <div 
              key={video.videoId}
              className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-3xl p-4 sm:p-5 transition-all shadow-xs flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
            >
              {/* Left: Thumbnail & Main Info */}
              <div className="flex items-start gap-4 min-w-0 flex-1">
                {/* Thumbnail */}
                <div 
                  onClick={() => openEditModal(video)}
                  className="relative w-28 sm:w-36 aspect-video shrink-0 rounded-2xl overflow-hidden bg-slate-900 cursor-pointer group shadow-xs"
                >
                  <img 
                    src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'} 
                    alt={video.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Edit3 className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  {video.isShort ? (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider">
                      Short
                    </span>
                  ) : (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-white text-[9px] font-bold">
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {video.category || 'General'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      video.visibility === 'public' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>
                      {video.visibility || 'public'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(video.videoId, 'Video ID')}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                      title="Click to copy Firestore Document ID"
                    >
                      <span>ID: {video.videoId.slice(0, 14)}...</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <h4 
                    onClick={() => openEditModal(video)}
                    className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer line-clamp-1"
                    title={video.title}
                  >
                    {video.title}
                  </h4>

                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <span>By @{video.creatorUsername}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(video.createdAt)}</span>
                  </p>

                  {/* Live Firestore metrics tags */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#202124] px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      <strong className="text-slate-900 dark:text-white">{(video.viewsCount || 0).toLocaleString()}</strong> views
                    </span>

                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#202124] px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <ThumbsUp className="w-3.5 h-3.5 text-rose-500" />
                      <strong className="text-slate-900 dark:text-white">{(video.likesCount || 0).toLocaleString()}</strong> likes
                    </span>

                    <span className="hidden sm:inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#202124] px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      <strong>{(video.commentsCount || 0).toLocaleString()}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Boost Actions & Full Edit Button */}
              <div className="flex flex-wrap md:flex-col lg:flex-row items-center gap-2 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                {/* Quick Views Boosters */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleQuickBoost(video.videoId, 'views', 500)}
                    disabled={quickBoostingId === video.videoId}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95 border border-blue-200/60 dark:border-blue-900/50"
                    title="Add 500 views directly in Firestore"
                  >
                    +500 Views
                  </button>
                  <button
                    onClick={() => handleQuickBoost(video.videoId, 'views', 1000)}
                    disabled={quickBoostingId === video.videoId}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95 border border-blue-200/60 dark:border-blue-900/50"
                    title="Add 1,000 views directly in Firestore"
                  >
                    +1K Views
                  </button>
                </div>

                {/* Quick Likes Boosters */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleQuickBoost(video.videoId, 'likes', 100)}
                    disabled={quickBoostingId === video.videoId}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95 border border-rose-200/60 dark:border-rose-900/50"
                    title="Add 100 likes directly in Firestore"
                  >
                    +100 Likes
                  </button>
                  <button
                    onClick={() => handleQuickBoost(video.videoId, 'likes', 500)}
                    disabled={quickBoostingId === video.videoId}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95 border border-rose-200/60 dark:border-rose-900/50"
                    title="Add 500 likes directly in Firestore"
                  >
                    +500 Likes
                  </button>
                </div>

                {/* Primary Edit Button */}
                <button
                  onClick={() => openEditModal(video)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 ml-auto md:ml-0"
                >
                  <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Firebase Edit</span>
                </button>

                {/* Watch video link */}
                <button
                  onClick={() => video.isShort ? navigate('shorts') : navigate('watch', undefined, { v: video.videoId })}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Watch on SocialIndia"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL FIRESTORE DOCUMENT EDIT MODAL */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#16171a] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#16171a]/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-2xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Firestore Video Editor
                    <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      videos/{editingVideo.videoId}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Edit live document data. Changes persist permanently to Firebase.</p>
                </div>
              </div>

              <button
                onClick={() => setEditingVideo(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1">
              
              {/* Thumbnail & Video Header Preview */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#1f2024] border border-slate-200/80 dark:border-slate-800">
                <div className="w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-black shrink-0 relative shadow-sm">
                  <img 
                    src={formThumbnailUrl || editingVideo.thumbnailUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80';
                    }}
                  />
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    {formIsShort ? 'SHORT' : formatDuration(editingVideo.duration)}
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Preview</span>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2">
                    {formTitle || editingVideo.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-bold">
                    Creator: @{editingVideo.creatorUsername} ({editingVideo.creatorDisplayName})
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Created: {new Date(editingVideo.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 1. VIEWS COUNT EDITOR */}
              <div className="bg-slate-50/80 dark:bg-[#1b1c20] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>Views Count (viewsCount)</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Current: {(editingVideo.viewsCount || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    min="0"
                    step="1"
                    value={formViews}
                    onChange={(e) => setFormViews(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#25262b] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0">
                    ≈ {formatViews(formViews)}
                  </span>
                </div>

                {/* Quick Preset / Add Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 self-center mr-1">Quick Add:</span>
                  {[+100, +500, +1000, +5000, +10000, +50000].map(add => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => setFormViews(v => Math.max(0, v + add))}
                      className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                    >
                      +{add >= 1000 ? `${add / 1000}K` : add}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormViews(0)}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer ml-auto"
                  >
                    Reset (0)
                  </button>
                </div>
              </div>

              {/* 2. LIKES COUNT EDITOR */}
              <div className="bg-slate-50/80 dark:bg-[#1b1c20] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Likes Count (likesCount)</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Current: {(editingVideo.likesCount || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    min="0"
                    step="1"
                    value={formLikes}
                    onChange={(e) => setFormLikes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#25262b] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0">
                    {formLikes.toLocaleString()} likes
                  </span>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 self-center mr-1">Quick Add:</span>
                  {[+20, +50, +100, +500, +1000, +5000].map(add => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => setFormLikes(l => Math.max(0, l + add))}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                    >
                      +{add >= 1000 ? `${add / 1000}K` : add}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormLikes(0)}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer ml-auto"
                  >
                    Reset (0)
                  </button>
                </div>
              </div>

              {/* 3. COMMENTS & SHARES METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Comments Count</label>
                  <input 
                    type="number"
                    min="0"
                    value={formComments}
                    onChange={(e) => setFormComments(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#202124] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Shares Count</label>
                  <input 
                    type="number"
                    min="0"
                    value={formShares}
                    onChange={(e) => setFormShares(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#202124] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 4. TITLE & THUMBNAIL URL */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Video Title (title)</label>
                  <input 
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#202124] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Thumbnail Image URL (thumbnailUrl)</label>
                  <input 
                    type="text"
                    value={formThumbnailUrl}
                    onChange={(e) => setFormThumbnailUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or Cloudinary URL"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#202124] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 5. CATEGORY, VISIBILITY, FORMAT & STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#202124] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="Entertainment">Entertainment</option>
                    <option value="Music">Music</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Comedy">Comedy</option>
                    <option value="News & Politics">News & Politics</option>
                    <option value="Education">Education</option>
                    <option value="Tech & Gadgets">Tech & Gadgets</option>
                    <option value="Vlog & Lifestyle">Vlog & Lifestyle</option>
                    <option value="Sports">Sports</option>
                    <option value="Film & Animation">Film & Animation</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Visibility</label>
                  <select
                    value={formVisibility}
                    onChange={(e) => setFormVisibility(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#202124] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="public">Public (Visible to All)</option>
                    <option value="unlisted">Unlisted (Link Only)</option>
                    <option value="private">Private (Only Creator)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Video Format Type</label>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormIsShort(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        !formIsShort 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      🎬 Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormIsShort(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        formIsShort 
                          ? 'bg-rose-600 text-white shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      📱 Short
                    </button>
                  </div>
                </div>
              </div>

              {/* 6. CHANGES DIFF SUMMARY */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs space-y-1.5">
                <span className="font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider block text-[10px]">
                  Firestore Commit Preview:
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <div>
                    Views: {editingVideo.viewsCount || 0} ➔ <strong>{formViews.toLocaleString()}</strong> ({formViews - (editingVideo.viewsCount || 0) >= 0 ? `+${(formViews - (editingVideo.viewsCount || 0)).toLocaleString()}` : (formViews - (editingVideo.viewsCount || 0)).toLocaleString()})
                  </div>
                  <div>
                    Likes: {editingVideo.likesCount || 0} ➔ <strong>{formLikes.toLocaleString()}</strong> ({formLikes - (editingVideo.likesCount || 0) >= 0 ? `+${(formLikes - (editingVideo.likesCount || 0)).toLocaleString()}` : (formLikes - (editingVideo.likesCount || 0)).toLocaleString()})
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#121215] rounded-b-3xl">
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveToFirestore}
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-600/20 flex items-center gap-2 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Writing to Firestore...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save to Firebase Firestore</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
