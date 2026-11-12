import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { playlistService } from '../services/playlistService';
import { videoService } from '../services/videoService';
import { Playlist, Video } from '../types';
import { formatTimeAgo, formatViews, formatDuration } from '../utils/videoUtils';
import { isUserVerified } from '../utils/userUtils';
import { UserAvatar } from '../components/UserAvatar';
import { 
  ListVideo, 
  Play, 
  Plus, 
  Trash2, 
  Lock, 
  Globe, 
  Clock, 
  ArrowLeft, 
  X, 
  Loader2, 
  FolderPlus,
  Film,
  Sparkles,
  Share2,
  Bookmark,
  Shuffle,
  Edit3,
  MoreVertical,
  Check,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from '../i18n';

export const PlaylistsPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate, route } = useRouter();
  const { t, isHindi } = useTranslation();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Search & Filter Toolbar
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [videoSearch, setVideoSearch] = useState('');
  const [filterPrivacy, setFilterPrivacy] = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'videos'>('newest');
  const [videoSortBy, setVideoSortBy] = useState<'default' | 'views' | 'az' | 'newest'>('default');

  // Description expand toggle
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Create playlist modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit playlist modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Options Dropdown Menu for Playlist
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);

  // Load playlists for user
  const loadPlaylists = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await playlistService.getUserPlaylists(
        currentUser.uid,
        currentUserProfile?.username,
        currentUserProfile?.displayName
      );
      setPlaylists(list);

      // If route has param for specific playlist ID, select it
      if (route.param) {
        const found = list.find(p => p.playlistId === route.param);
        if (found) {
          selectPlaylist(found);
        } else {
          // Try fetching playlist by ID from backend if not in user's list (e.g. shared playlist link)
          playlistService.getPlaylistWithVideos(route.param).then(({ playlist, videos }) => {
            if (playlist) {
              setSelectedPlaylist(playlist);
              setPlaylistVideos(videos);
            }
          }).catch(console.error);
        }
      }
    } catch (err) {
      console.error('Failed to load playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, [currentUser]);

  // Load videos for selected playlist
  const selectPlaylist = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsDescExpanded(false);
    setVideoSearch('');
    setLoadingVideos(true);
    try {
      const { videos } = await playlistService.getPlaylistWithVideos(playlist.playlistId);
      setPlaylistVideos(videos);
    } catch (err) {
      console.error('Failed to load playlist videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Filtered & Sorted playlists for Grid view
  const filteredPlaylists = useMemo(() => {
    return [...playlists]
      .filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(playlistSearch.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(playlistSearch.toLowerCase());
        const matchesPrivacy = filterPrivacy === 'all' 
          ? true 
          : filterPrivacy === 'private' ? p.isPrivate : !p.isPrivate;
        return matchesSearch && matchesPrivacy;
      })
      .sort((a, b) => {
        if (sortBy === 'az') return a.title.localeCompare(b.title);
        if (sortBy === 'videos') return (b.videoIds?.length || 0) - (a.videoIds?.length || 0);
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return sortBy === 'newest' ? tb - ta : ta - tb;
      });
  }, [playlists, playlistSearch, filterPrivacy, sortBy]);

  // Filtered & Sorted videos within selected playlist
  const displayedVideos = useMemo(() => {
    let list = [...playlistVideos];
    if (videoSearch.trim()) {
      const q = videoSearch.toLowerCase();
      list = list.filter(v => v.title.toLowerCase().includes(q) || (v.creatorDisplayName || '').toLowerCase().includes(q));
    }
    if (videoSortBy === 'views') {
      list.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    } else if (videoSortBy === 'az') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (videoSortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return list;
  }, [playlistVideos, videoSearch, videoSortBy]);

  // Total views across playlist videos
  const totalPlaylistViews = useMemo(() => {
    return playlistVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
  }, [playlistVideos]);

  // Create new playlist handler
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newTitle.trim()) return;

    setCreating(true);
    try {
      const created = await playlistService.createPlaylist({
        title: newTitle.trim(),
        description: newDescription.trim(),
        creatorId: currentUser.uid,
        creatorUsername: currentUserProfile?.username || 'user',
        creatorDisplayName: currentUserProfile?.displayName || 'SocialIndia Creator',
        creatorPhotoURL: currentUserProfile?.photoURL || '',
        isPrivate
      });

      setPlaylists(prev => [created, ...prev]);
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setIsPrivate(false);
      addToast(isHindi ? `प्लेलिस्ट "${created.title}" बनाई गई!` : `Playlist "${created.title}" created!`, 'success');
      selectPlaylist(created);
    } catch (err) {
      console.error(err);
      addToast(isHindi ? 'प्लेलिस्ट बनाने में विफल।' : 'Failed to create playlist.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = () => {
    if (!selectedPlaylist) return;
    setEditTitle(selectedPlaylist.title);
    setEditDescription(selectedPlaylist.description || '');
    setEditIsPrivate(!!selectedPlaylist.isPrivate);
    setEditModalOpen(true);
    setPlaylistMenuOpen(false);
  };

  // Save Playlist Edits
  const handleUpdatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaylist || !editTitle.trim()) return;

    setUpdating(true);
    try {
      const updates = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        isPrivate: editIsPrivate
      };
      await playlistService.updatePlaylist(selectedPlaylist.playlistId, updates);
      
      const updated: Playlist = {
        ...selectedPlaylist,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      setSelectedPlaylist(updated);
      setPlaylists(prev => prev.map(p => p.playlistId === updated.playlistId ? updated : p));
      setEditModalOpen(false);
      addToast(isHindi ? 'प्लेलिस्ट विवरण अपडेट हो गया!' : 'Playlist updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update playlist.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Delete playlist handler
  const handleDeletePlaylist = async (playlistId: string, title: string) => {
    if (!window.confirm(isHindi ? `क्या आप वाकई प्लेलिस्ट "${title}" हटाना चाहते हैं?` : `Are you sure you want to delete "${title}"?`)) {
      return;
    }
    try {
      await playlistService.deletePlaylist(playlistId);
      setPlaylists(prev => prev.filter(p => p.playlistId !== playlistId));
      if (selectedPlaylist?.playlistId === playlistId) {
        setSelectedPlaylist(null);
        setPlaylistVideos([]);
      }
      addToast(isHindi ? `प्लेलिस्ट "${title}" हटा दी गई।` : 'Playlist deleted.', 'info');
    } catch (err) {
      console.error(err);
      addToast(isHindi ? 'प्लेलिस्ट हटाने में विफल।' : 'Failed to delete playlist.', 'error');
    }
  };

  // Remove video from playlist
  const handleRemoveVideo = async (videoId: string) => {
    if (!selectedPlaylist) return;

    try {
      await playlistService.removeVideoFromPlaylist(selectedPlaylist.playlistId, videoId);
      const updatedIds = selectedPlaylist.videoIds.filter(id => id !== videoId);
      const updatedPlaylist = { ...selectedPlaylist, videoIds: updatedIds };
      setSelectedPlaylist(updatedPlaylist);
      setPlaylistVideos(prev => prev.filter(v => v.videoId !== videoId));
      setPlaylists(prev => prev.map(p => p.playlistId === selectedPlaylist.playlistId ? updatedPlaylist : p));
      addToast(isHindi ? 'वीडियो प्लेलिस्ट से हटा दिया गया।' : 'Video removed from playlist.', 'info');
    } catch (err) {
      console.error(err);
      addToast('Failed to remove video.', 'error');
    }
  };

  // YouTube Play All: Starts watch page on first video with playlist queue
  const handlePlayAll = () => {
    if (playlistVideos.length > 0 && selectedPlaylist) {
      navigate('watch', playlistVideos[0].videoId, { list: selectedPlaylist.playlistId });
    } else {
      addToast(isHindi ? 'इस प्लेलिस्ट में अभी कोई वीडियो नहीं है।' : 'This playlist has no videos yet.', 'info');
    }
  };

  // YouTube Shuffle: Randomize video start and jump to watch queue
  const handleShufflePlay = () => {
    if (playlistVideos.length > 0 && selectedPlaylist) {
      const randomIndex = Math.floor(Math.random() * playlistVideos.length);
      const randomVid = playlistVideos[randomIndex];
      navigate('watch', randomVid.videoId, { list: selectedPlaylist.playlistId, shuffle: '1' });
    } else {
      addToast(isHindi ? 'इस प्लेलिस्ट में कोई वीडियो नहीं है।' : 'This playlist has no videos yet.', 'info');
    }
  };

  // Share playlist link
  const handleSharePlaylist = (playlist: Playlist) => {
    const url = `${window.location.origin}/playlists/${playlist.playlistId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        addToast(isHindi ? 'प्लेलिस्ट लिंक क्लिपबोर्ड पर कॉपी हो गया!' : 'Playlist link copied to clipboard!', 'success');
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] dark:text-[#38bdf8] flex items-center justify-center mb-5 shadow-sm border border-blue-100 dark:border-blue-900/50">
          <ListVideo className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {isHindi ? 'प्लेलिस्ट के लिए साइन इन करें' : 'Sign in to access playlists'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2.5 leading-relaxed font-medium">
          {isHindi 
            ? 'कस्टम प्लेलिस्ट बनाएं, पसंदीदा वीडियो सेव करें और कभी भी अपनी पसंदीदा सामग्री देखें।'
            : 'Create custom playlists, save videos to watch later, and organize your favorite creator content.'}
        </p>
        <button
          onClick={() => navigate('login')}
          className="mt-6 px-8 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
        >
          {isHindi ? 'साइन इन करें' : 'Sign In Now'}
        </button>
      </div>
    );
  }

  // Cover image for selected playlist
  const coverThumbnail = playlistVideos[0]?.thumbnailUrl || selectedPlaylist?.thumbnailUrl || '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100">
      
      {/* =========================================================
          VIEW 1: YOUTUBE 2-PANEL PLAYLIST DETAIL VIEW
          ========================================================= */}
      {selectedPlaylist ? (
        <div className="max-w-[1700px] mx-auto p-4 sm:p-6 lg:p-8">
          
          {/* Top Breadcrumb Navigation */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800">
            <button
              onClick={() => {
                setSelectedPlaylist(null);
                setPlaylistVideos([]);
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#2563eb] dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>{isHindi ? 'सभी प्लेलिस्ट पर वापस जाएं' : 'Back to all playlists'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={openEditModal}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isHindi ? 'संपादित करें' : 'Edit'}</span>
              </button>
              <button
                onClick={() => handleSharePlaylist(selectedPlaylist)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition-all"
                title="Share Playlist"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: YOUTUBE STICKY PLAYLIST HERO PANEL */}
            <div className="lg:col-span-4 lg:sticky lg:top-20">
              <div className="relative rounded-3xl p-6 overflow-hidden shadow-2xl border border-white/10 text-white"
                   style={{
                     background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                   }}>
                
                {/* Ambient glow backdrop */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-2xl scale-125 -z-10"
                  style={{ backgroundImage: coverThumbnail ? `url(${coverThumbnail})` : undefined }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black/90 -z-10" />

                {/* YOUTUBE SIGNATURE STACKED CARDS OVERLAY */}
                <div className="relative w-full mb-5 pt-3">
                  {/* Layer 2 (smallest, top-most stack) */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-[86%] h-3 bg-white/20 backdrop-blur-md rounded-t-2xl border-t border-x border-white/20 -z-1" />
                  {/* Layer 1 (middle stack) */}
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-[93%] h-3 bg-white/30 backdrop-blur-md rounded-t-2xl border-t border-x border-white/25 -z-1" />

                  {/* Main Playlist 16:9 Thumbnail Card */}
                  <div 
                    onClick={handlePlayAll}
                    className="aspect-video w-full rounded-2xl bg-slate-900 overflow-hidden relative border border-white/20 shadow-xl cursor-pointer group"
                  >
                    {coverThumbnail ? (
                      <img
                        src={coverThumbnail}
                        alt={selectedPlaylist.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/70">
                        <Film className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-xs font-bold uppercase tracking-wider">{isHindi ? 'खाली प्लेलिस्ट' : 'Empty Playlist'}</span>
                      </div>
                    )}

                    {/* YouTube Dark Scrim + Hover "PLAY ALL" Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-xs">
                      <div className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5 text-blue-600" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-white drop-shadow">
                        {isHindi ? 'सभी चलाएं' : 'Play All'}
                      </span>
                    </div>

                    {/* Translucent Bottom Right Badge */}
                    <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/10 text-white">
                      <ListVideo className="w-3.5 h-3.5 text-blue-400" />
                      <span>{selectedPlaylist.videoIds.length} {isHindi ? 'वीडियो' : 'Videos'}</span>
                    </div>
                  </div>
                </div>

                {/* Playlist Info */}
                <div className="space-y-3">
                  <h1 className="text-2xl font-black text-white leading-tight tracking-tight drop-shadow-sm">
                    {selectedPlaylist.title}
                  </h1>

                  {/* Creator Info */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <UserAvatar
                      uid={selectedPlaylist.creatorId}
                      fallbackPhotoURL={selectedPlaylist.creatorPhotoURL}
                      fallbackDisplayName={selectedPlaylist.creatorDisplayName}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-white hover:underline cursor-pointer truncate">
                          {selectedPlaylist.creatorDisplayName}
                        </span>
                        {isUserVerified(selectedPlaylist.creatorUsername) && (
                          <CheckCircle2 className="w-3 h-3 text-blue-400 fill-blue-400/20" />
                        )}
                      </div>
                      <span className="text-[11px] text-white/70 font-medium">@{selectedPlaylist.creatorUsername}</span>
                    </div>
                  </div>

                  {/* YouTube Stats Line */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/75 pt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20">
                      {selectedPlaylist.isPrivate ? (
                        <>
                          <Lock className="w-3 h-3 text-amber-300" />
                          <span>{isHindi ? 'निजी' : 'Private'}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3 h-3 text-emerald-300" />
                          <span>{isHindi ? 'सार्वजनिक' : 'Public'}</span>
                        </>
                      )}
                    </span>
                    <span>•</span>
                    <span>{selectedPlaylist.videoIds.length} {isHindi ? 'वीडियो' : 'videos'}</span>
                    <span>•</span>
                    <span>{formatViews(totalPlaylistViews)} {isHindi ? 'व्यूज' : 'views'}</span>
                    <span>•</span>
                    <span>{isHindi ? 'अपडेट' : 'Updated'} {formatTimeAgo(selectedPlaylist.updatedAt)}</span>
                  </div>

                  {/* Description with Expand toggle */}
                  {selectedPlaylist.description && (
                    <div className="pt-2 text-xs text-white/85 font-medium leading-relaxed">
                      <p className={isDescExpanded ? 'whitespace-pre-line' : 'line-clamp-3'}>
                        {selectedPlaylist.description}
                      </p>
                      {selectedPlaylist.description.length > 120 && (
                        <button
                          onClick={() => setIsDescExpanded(!isDescExpanded)}
                          className="mt-1 text-[11px] font-bold text-blue-300 hover:text-white cursor-pointer"
                        >
                          {isDescExpanded ? (isHindi ? 'कम दिखाएं' : 'Show less') : (isHindi ? 'और दिखाएं' : 'Show more')}
                        </button>
                      )}
                    </div>
                  )}

                  {/* YOUTUBE PRIMARY ACTION BUTTONS (PLAY ALL & SHUFFLE) */}
                  <div className="pt-4 flex flex-wrap gap-2.5">
                    <button
                      onClick={handlePlayAll}
                      disabled={playlistVideos.length === 0}
                      className="flex-1 py-3 px-5 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-wider rounded-full shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current text-slate-900" />
                      <span>{isHindi ? 'सभी चलाएं' : 'Play All'}</span>
                    </button>

                    <button
                      onClick={handleShufflePlay}
                      disabled={playlistVideos.length === 0}
                      className="py-3 px-5 bg-white/15 hover:bg-white/25 text-white font-black text-xs uppercase tracking-wider rounded-full backdrop-blur-md border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                      title="Shuffle Playlist"
                    >
                      <Shuffle className="w-4 h-4" />
                      <span>{isHindi ? 'शफ़ल' : 'Shuffle'}</span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={() => handleSharePlaylist(selectedPlaylist)}
                      className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95"
                      title="Share Playlist"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* More Menu Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setPlaylistMenuOpen(!playlistMenuOpen)}
                        className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95"
                        title="More Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {playlistMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-[#1a1b20] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 z-30 text-slate-800 dark:text-slate-100 text-xs font-bold animate-in fade-in zoom-in-95">
                          <button
                            onClick={openEditModal}
                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4 text-slate-500" />
                            <span>{isHindi ? 'प्लेलिस्ट संपादित करें' : 'Edit details'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setPlaylistMenuOpen(false);
                              handleSharePlaylist(selectedPlaylist);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Share2 className="w-4 h-4 text-slate-500" />
                            <span>{isHindi ? 'लिंक कॉपी करें' : 'Copy link'}</span>
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                          <button
                            onClick={() => {
                              setPlaylistMenuOpen(false);
                              handleDeletePlaylist(selectedPlaylist.playlistId, selectedPlaylist.title);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>{isHindi ? 'प्लेलिस्ट हटाएं' : 'Delete playlist'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: YOUTUBE VIDEO LIST */}
            <div className="lg:col-span-8 space-y-3">
              
              {/* List Toolbar: Search & Sort inside Playlist */}
              <div className="bg-white dark:bg-[#141416] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={isHindi ? 'प्लेलिस्ट में खोजें...' : 'Filter videos in playlist...'}
                    value={videoSearch}
                    onChange={(e) => setVideoSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-[#1c1d22] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {videoSearch && (
                    <button
                      onClick={() => setVideoSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isHindi ? 'क्रमबद्ध:' : 'Sort:'}</span>
                  </div>
                  <select
                    value={videoSortBy}
                    onChange={(e) => setVideoSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 dark:bg-[#1c1d22] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
                  >
                    <option value="default">{isHindi ? 'डिफ़ॉल्ट क्रम' : 'Default Order'}</option>
                    <option value="views">{isHindi ? 'सबसे लोकप्रिय' : 'Most Popular'}</option>
                    <option value="newest">{isHindi ? 'हाल ही में जोड़े गए' : 'Date Added'}</option>
                    <option value="az">A → Z</option>
                  </select>
                </div>
              </div>

              {/* Video List Items */}
              {loadingVideos ? (
                <div className="py-24 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#2563eb] mb-2.5" />
                  <p className="text-xs font-bold">{isHindi ? 'प्लेलिस्ट वीडियो लोड हो रहे हैं...' : 'Loading playlist videos...'}</p>
                </div>
              ) : displayedVideos.length === 0 ? (
                <div className="bg-white dark:bg-[#141416] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3.5 shadow-sm">
                  <Film className="w-12 h-12 text-slate-400 mx-auto opacity-60" />
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {videoSearch ? (isHindi ? 'कोई वीडियो नहीं मिला' : 'No matching videos found') : (isHindi ? 'इस प्लेलिस्ट में अभी कोई वीडियो नहीं है' : 'No videos in this playlist yet')}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                    {isHindi 
                      ? 'वीडियो देखते समय "सेव" बटन पर क्लिक करके उन्हें इस प्लेलिस्ट में जोड़ें।'
                      : 'Browse videos and tap the "Save" button below the player to add them to this playlist.'}
                  </p>
                  <button
                    onClick={() => navigate('home')}
                    className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    {isHindi ? 'वीडियो खोजें' : 'Browse Videos'}
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {displayedVideos.map((vid, idx) => {
                    const vidWatchUrl = `#/watch/${vid.videoId}?list=${selectedPlaylist.playlistId}`;
                    return (
                      <div
                        key={vid.videoId}
                        className="bg-white dark:bg-[#141416] hover:bg-slate-50 dark:hover:bg-[#1a1b20] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 sm:gap-4 transition-all group"
                      >
                        {/* YouTube Index Number or Hover Play Button */}
                        <div className="w-6 text-center shrink-0 flex items-center justify-center">
                          <span className="text-xs font-black text-slate-400 group-hover:hidden">
                            {idx + 1}
                          </span>
                          <button
                            onClick={() => navigate('watch', vid.videoId, { list: selectedPlaylist.playlistId })}
                            className="hidden group-hover:flex items-center justify-center w-6 h-6 text-blue-600 dark:text-blue-400 hover:scale-110 transition-transform cursor-pointer"
                            title="Play"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        </div>

                        {/* 16:9 Thumbnail with Duration Pill */}
                        <a
                          href={vidWatchUrl}
                          title={vid.title}
                          onClick={(e) => {
                            if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                            e.preventDefault();
                            navigate('watch', vid.videoId, { list: selectedPlaylist.playlistId });
                          }}
                          className="relative block w-28 sm:w-40 aspect-video bg-black rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-2xs group-hover:shadow-sm"
                        >
                          <img
                            src={vid.thumbnailUrl}
                            alt={vid.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          {vid.duration && (
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/85 backdrop-blur-xs rounded text-[9px] font-black text-white">
                              {formatDuration(vid.duration)}
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-6 h-6 text-white fill-white drop-shadow" />
                          </div>
                        </a>

                        {/* Video Metadata */}
                        <div className="flex-1 min-w-0 pr-1">
                          <a
                            href={vidWatchUrl}
                            title={vid.title}
                            onClick={(e) => {
                              if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
                              e.preventDefault();
                              navigate('watch', vid.videoId, { list: selectedPlaylist.playlistId });
                            }}
                            className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-[#2563eb] dark:group-hover:text-[#38bdf8] transition-colors line-clamp-2 leading-snug cursor-pointer"
                          >
                            {vid.title}
                          </a>

                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate hover:underline cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (vid.creatorUsername) navigate('creator', vid.creatorUsername);
                                  }}>
                              {vid.creatorDisplayName}
                            </span>
                            {isUserVerified(vid.creatorUsername) && (
                              <CheckCircle2 className="w-3 h-3 text-blue-500 fill-blue-500/20 shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                            <span>{formatViews(vid.viewsCount || 0)} {isHindi ? 'व्यूज' : 'views'}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(vid.createdAt)}</span>
                          </div>
                        </div>

                        {/* Action buttons on right */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => navigate('watch', vid.videoId, { list: selectedPlaylist.playlistId })}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer hidden sm:block"
                            title="Play Video"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                          
                          <button
                            onClick={() => handleRemoveVideo(vid.videoId)}
                            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title={isHindi ? 'प्लेलिस्ट से हटाएं' : 'Remove from playlist'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* =========================================================
            VIEW 2: YOUTUBE PLAYLISTS OVERVIEW & GRID VIEW
            ========================================================= */
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] dark:text-[#38bdf8] flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shadow-xs">
                <ListVideo className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isHindi ? 'मेरी प्लेलिस्ट' : 'My Playlists'}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'} • {isHindi ? 'अपनी पसंदीदा वीडियो व्यवस्थित करें' : 'Organize and share your favorite videos'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-extrabold rounded-2xl shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{isHindi ? 'नई प्लेलिस्ट' : 'New Playlist'}</span>
              </button>

              <button
                onClick={() => navigate('downloads')}
                className="px-4 py-2.5 bg-white dark:bg-[#1a1b20] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {isHindi ? 'डाउनलोड्स' : 'Downloads'}
              </button>
            </div>
          </div>

          {/* YouTube Filter Chips & Search Bar */}
          {playlists.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#141416] border border-slate-200/80 dark:border-slate-800 p-3 rounded-2xl shadow-2xs">
              
              {/* Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setFilterPrivacy('all')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterPrivacy === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-[#1f2024] dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {isHindi ? 'सभी' : 'All'}
                </button>
                <button
                  onClick={() => setFilterPrivacy('public')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    filterPrivacy === 'public'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-[#1f2024] dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'सार्वजनिक' : 'Public'}</span>
                </button>
                <button
                  onClick={() => setFilterPrivacy('private')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    filterPrivacy === 'private'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-[#1f2024] dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'निजी' : 'Private'}</span>
                </button>
              </div>

              {/* Search input & Sort */}
              <div className="flex items-center gap-2.5 flex-1 max-w-md ml-auto">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={isHindi ? 'प्लेलिस्ट खोजें...' : 'Search playlists...'}
                    value={playlistSearch}
                    onChange={(e) => setPlaylistSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-[#1c1d22] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-[#1c1d22] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
                >
                  <option value="newest">{isHindi ? 'नई पहले' : 'Newest'}</option>
                  <option value="oldest">{isHindi ? 'पुरानी पहले' : 'Oldest'}</option>
                  <option value="az">A → Z</option>
                  <option value="videos">{isHindi ? 'सबसे ज़्यादा वीडियो' : 'Most Videos'}</option>
                </select>
              </div>
            </div>
          )}

          {/* PLAYLISTS GRID */}
          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#2563eb] mb-2.5" />
              <p className="text-xs font-bold">{isHindi ? 'प्लेलिस्ट लोड हो रही हैं...' : 'Loading playlists...'}</p>
            </div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] flex items-center justify-center mx-auto shadow-inner">
                <FolderPlus className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {playlistSearch ? (isHindi ? 'कोई प्लेलिस्ट नहीं मिली' : 'No playlists match your search') : (isHindi ? 'अभी कोई प्लेलिस्ट नहीं है' : 'No playlists yet')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {isHindi 
                  ? 'अपनी पसंदीदा संगीत, समाचार, कॉमेडी या क्रिएटर वीडियो को एक जगह इकट्ठा करने के लिए पहली प्लेलिस्ट बनाएं!'
                  : 'Organize your favorite music, tutorials, and creators into playlists for easy replay.'}
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-extrabold rounded-2xl shadow-md inline-flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{isHindi ? 'पहली प्लेलिस्ट बनाएं' : 'Create First Playlist'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlaylists.map((pl) => {
                const videoCount = pl.videoIds?.length || 0;
                return (
                  <div
                    key={pl.playlistId}
                    onClick={() => selectPlaylist(pl)}
                    className="group cursor-pointer flex flex-col space-y-3"
                  >
                    {/* YOUTUBE SIGNATURE STACKED THUMBNAIL CARD */}
                    <div className="relative pt-2">
                      {/* Top Stack Layer 2 */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[88%] h-2.5 bg-slate-200 dark:bg-slate-700/80 rounded-t-xl group-hover:-top-1 transition-all" />
                      {/* Top Stack Layer 1 */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[94%] h-2.5 bg-slate-300 dark:bg-slate-800 rounded-t-xl group-hover:top-0 transition-all" />

                      {/* Main Aspect-Video Thumbnail */}
                      <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                        {pl.thumbnailUrl ? (
                          <img
                            src={pl.thumbnailUrl}
                            alt={pl.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex flex-col items-center justify-center text-white/70"
                            style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
                          >
                            <ListVideo className="w-10 h-10 mb-1 opacity-70 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-bold">Playlist</span>
                          </div>
                        )}

                        {/* YOUTUBE SIGNATURE RIGHT-SIDE TRANSLUCENT OVERLAY BAR */}
                        <div className="absolute inset-y-0 right-0 w-2/5 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1 border-l border-white/10 group-hover:opacity-0 transition-opacity">
                          <ListVideo className="w-6 h-6 text-blue-400" />
                          <span className="text-xs font-black">{videoCount}</span>
                          <span className="text-[9px] uppercase tracking-widest font-bold opacity-80">{isHindi ? 'वीडियो' : 'videos'}</span>
                        </div>

                        {/* HOVER "PLAY ALL" OVERLAY */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white backdrop-blur-xs">
                          <div className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 fill-current ml-0.5 text-blue-600" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider">{isHindi ? 'सभी चलाएं' : 'Play All'}</span>
                        </div>

                        {/* Privacy Pill Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-[9px] font-bold text-white flex items-center gap-1 border border-white/10">
                          {pl.isPrivate ? (
                            <>
                              <Lock className="w-2.5 h-2.5 text-amber-300" />
                              <span>{isHindi ? 'निजी' : 'Private'}</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-2.5 h-2.5 text-emerald-300" />
                              <span>{isHindi ? 'सार्वजनिक' : 'Public'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <div className="flex items-start justify-between gap-2 px-0.5">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-[#2563eb] dark:group-hover:text-[#38bdf8] transition-colors line-clamp-2 leading-snug">
                          {pl.title}
                        </h3>
                        
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {pl.creatorDisplayName || 'SocialIndia Creator'}
                        </p>

                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                          <span className="hover:text-blue-500 font-extrabold text-[#2563eb] dark:text-blue-400">
                            {isHindi ? 'पूरी प्लेलिस्ट देखें' : 'View full playlist'}
                          </span>
                          <span>•</span>
                          <span>{formatTimeAgo(pl.updatedAt)}</span>
                        </div>
                      </div>

                      {/* Delete Quick Action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(pl.playlistId, pl.title);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer shrink-0"
                        title={isHindi ? 'प्लेलिस्ट हटाएं' : 'Delete playlist'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* =========================================================
          YOUTUBE STYLE CREATE PLAYLIST MODAL
          ========================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#16171a] border border-slate-200 dark:border-[#27272a] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563eb] flex items-center justify-center">
                  <ListVideo className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isHindi ? 'नई प्लेलिस्ट बनाएं' : 'New Playlist'}
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {isHindi ? 'शीर्षक (Title) *' : 'Title *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={isHindi ? 'जैसे: मेरी पसंदीदा संगीत, टेक वीडियो...' : 'e.g. My Favorite Music, Tech Tutorials...'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {isHindi ? 'विवरण (Description)' : 'Description (Optional)'}
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={isHindi ? 'इस प्लेलिस्ट के बारे में कुछ बताएं...' : 'Tell viewers about this playlist...'}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* YouTube Privacy Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {isHindi ? 'गोपनीयता (Privacy)' : 'Privacy'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                      !isPrivate
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Globe className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">{isHindi ? 'सार्वजनिक' : 'Public'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
                        {isHindi ? 'कोई भी खोज सकता है' : 'Anyone can search and view'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                      isPrivate
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">{isHindi ? 'निजी' : 'Private'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
                        {isHindi ? 'केवल आप देख सकते हैं' : 'Only you can view'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl cursor-pointer"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isHindi ? 'बनाएं' : 'Create'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* =========================================================
          YOUTUBE STYLE EDIT PLAYLIST MODAL
          ========================================================= */}
      {editModalOpen && selectedPlaylist && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#16171a] border border-slate-200 dark:border-[#27272a] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563eb] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isHindi ? 'प्लेलिस्ट संपादित करें' : 'Edit Playlist'}
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {isHindi ? 'शीर्षक (Title) *' : 'Title *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {isHindi ? 'विवरण (Description)' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* YouTube Privacy Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {isHindi ? 'गोपनीयता (Privacy)' : 'Privacy'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditIsPrivate(false)}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                      !editIsPrivate
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Globe className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">{isHindi ? 'सार्वजनिक' : 'Public'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
                        {isHindi ? 'कोई भी खोज सकता है' : 'Anyone can search and view'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditIsPrivate(true)}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                      editIsPrivate
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">{isHindi ? 'निजी' : 'Private'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
                        {isHindi ? 'केवल आप देख सकते हैं' : 'Only you can view'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl cursor-pointer"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={updating || !editTitle.trim()}
                  className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isHindi ? 'सहेजें' : 'Save'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
