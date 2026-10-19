import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { playlistService } from '../services/playlistService';
import { videoService } from '../services/videoService';
import { Playlist, Video } from '../types';
import { formatTimeAgo, formatViews, formatDuration } from '../utils/videoUtils';
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
  Bookmark
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

  // Create playlist modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

    // Search & sort toolbar
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'videos'>('newest');

  const filteredPlaylists = [...playlists]
    .filter(p => p.title.toLowerCase().includes(playlistSearch.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'az') return a.title.localeCompare(b.title);
      if (sortBy === 'videos') return (b.videoIds?.length || 0) - (a.videoIds?.length || 0);
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return sortBy === 'newest' ? tb - ta : ta - tb;
    });

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
    setLoadingVideos(true);
    try {
      const vids: Video[] = [];
      for (const id of playlist.videoIds) {
        const v = await videoService.getVideo(id);
        if (v) {
          vids.push(v);
        }
      }
      setPlaylistVideos(vids);
    } catch (err) {
      console.error('Failed to load playlist videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  };

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
      addToast(`Playlist "${created.title}" created!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to create playlist.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Delete playlist handler
  const handleDeletePlaylist = async (playlistId: string, title: string) => {
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
      addToast('Video removed from playlist.', 'info');
    } catch (err) {
      console.error(err);
      addToast('Failed to remove video.', 'error');
    }
  };

  // Play All: Starts watch page on first video with playlist queue
  const handlePlayAll = () => {
    if (playlistVideos.length > 0 && selectedPlaylist) {
      navigate('watch', playlistVideos[0].videoId, { list: selectedPlaylist.playlistId });
    } else {
      addToast('This playlist has no videos yet.', 'info');
    }
  };

  // Share playlist link
  const handleSharePlaylist = (playlist: Playlist) => {
    const url = `${window.location.origin}/#/playlists/${playlist.playlistId}`;
    navigator.clipboard.writeText(url).then(() => {
      addToast('Playlist link copied to clipboard!', 'success');
    });
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-[#0070f3] dark:text-[#00d2ff] flex items-center justify-center mb-4 shadow-sm border border-blue-100 dark:border-blue-900/50">
          <ListVideo className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Sign In for Playlists</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
          Create custom playlists, save videos to watch later, and organize your favorite content anytime.
        </p>
        <button
          onClick={() => navigate('login')}
          className="mt-6 px-6 py-2.5 bg-[#0070f3] hover:bg-[#005cd6] text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md transition-all cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {selectedPlaylist ? (
            <button
              onClick={() => {
                setSelectedPlaylist(null);
                setPlaylistVideos([]);
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
              title="Back to all playlists"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-[#0070f3] dark:text-[#00d2ff] rounded-2xl border border-blue-100/80 dark:border-blue-900/40">
              <ListVideo className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {selectedPlaylist ? selectedPlaylist.title : 'My Playlists'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {selectedPlaylist 
                ? `${selectedPlaylist.videoIds.length} ${selectedPlaylist.videoIds.length === 1 ? 'video' : 'videos'} • ${selectedPlaylist.isPrivate ? 'Private' : 'Public'}`
                : `${playlists.length} playlists created • Organize & share your content`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!selectedPlaylist && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-[#0070f3] hover:bg-[#005cd6] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Playlist</span>
            </button>
          )}

          <button
            onClick={() => navigate('downloads')}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Offline Downloads
          </button>
        </div>
      </div>

            {/* Search & Sort Toolbar */}
      {!selectedPlaylist && playlists.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder={isHindi ? 'प्लेलिस्ट खोजें...' : 'Search playlists...'}
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <option value="newest">{isHindi ? 'नई पहले' : 'Newest first'}</option>
            <option value="oldest">{isHindi ? 'पुरानी पहले' : 'Oldest first'}</option>
            <option value="az">A → Z</option>
            <option value="videos">{isHindi ? 'सबसे ज़्यादा वीडियो' : 'Most videos'}</option>
          </select>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {filteredPlaylists.length} / {playlists.length}
          </span>
        </div>
      )}

      {/* VIEW 1: SELECTED PLAYLIST DETAIL VIEW */}
      {selectedPlaylist ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Playlist Card & Info */}
          <div className="lg:col-span-1 space-y-4">
            <div 
              className="p-5 rounded-3xl shadow-xl space-y-4 relative overflow-hidden text-white"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 50%, #6d28d9 100%)' }}
            >
              <div className="aspect-video w-full rounded-2xl bg-black/40 overflow-hidden relative border border-white/20 shadow-md">
                {playlistVideos[0]?.thumbnailUrl || selectedPlaylist.thumbnailUrl ? (
                  <img
                    src={playlistVideos[0]?.thumbnailUrl || selectedPlaylist.thumbnailUrl}
                    alt={selectedPlaylist.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/70">
                    <Film className="w-10 h-10 mb-2 opacity-60" />
                    <span className="text-xs font-bold">Empty Playlist</span>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/10 text-white">
                  <ListVideo className="w-3.5 h-3.5" />
                  <span>{selectedPlaylist.videoIds.length} Videos</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white">
                    {selectedPlaylist.isPrivate ? 'Private Playlist' : 'Public Playlist'}
                  </span>
                </div>
                <h2 className="text-xl font-black leading-tight text-white drop-shadow-sm">{selectedPlaylist.title}</h2>
                {selectedPlaylist.description && (
                  <p className="text-xs text-white/90 font-medium mt-1 leading-relaxed line-clamp-3">
                    {selectedPlaylist.description}
                  </p>
                )}
                <p className="text-[11px] text-white/75 font-semibold mt-2">
                  Created by @{selectedPlaylist.creatorUsername} • Updated {formatTimeAgo(selectedPlaylist.updatedAt)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={handlePlayAll}
                  disabled={playlistVideos.length === 0}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current text-blue-600" />
                  <span>Play All</span>
                </button>

                <button
                  onClick={() => handleSharePlaylist(selectedPlaylist)}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all cursor-pointer text-white border border-white/20 active:scale-95"
                  title="Share Playlist"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeletePlaylist(selectedPlaylist.playlistId, selectedPlaylist.title)}
                  className="p-2.5 bg-rose-600/30 hover:bg-rose-600/50 text-white rounded-xl transition-all cursor-pointer border border-rose-400/30 active:scale-95"
                  title="Delete Playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Playlist Video Items */}
          <div className="lg:col-span-2 space-y-3">
            {loadingVideos ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0070f3] mb-2" />
                <p className="text-xs font-semibold">Loading playlist videos...</p>
              </div>
            ) : playlistVideos.length === 0 ? (
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
                <Film className="w-10 h-10 text-slate-400 mx-auto opacity-70" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No videos in this playlist yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When watching any video, click the <strong>Save</strong> button to add it to "{selectedPlaylist.title}".
                </p>
                <button
                  onClick={() => navigate('home')}
                  className="px-4 py-2 bg-[#0070f3] hover:bg-[#005cd6] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Explore Videos
                </button>
              </div>
            ) : (
              playlistVideos.map((vid, idx) => (
                <div
                  key={vid.videoId}
                  onClick={() => navigate('watch', vid.videoId, selectedPlaylist ? { list: selectedPlaylist.playlistId } : undefined)}
                  className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/90 hover:border-[#0070f3]/60 dark:hover:border-[#00d2ff]/50 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 sm:gap-4 transition-all hover:shadow-xs cursor-pointer group"
                >
                  {/* Rank Index */}
                  <span className="text-xs font-black text-slate-400 group-hover:text-[#0070f3] w-4 text-center shrink-0">
                    {idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-28 sm:w-36 aspect-video bg-black rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {vid.duration && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-bold text-white">
                        {formatDuration(vid.duration)}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>

                  {/* Video Meta */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-[#0070f3] dark:group-hover:text-[#00d2ff] transition-colors line-clamp-2 leading-snug">
                      {vid.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {vid.creatorDisplayName}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 mt-0.5">
                      <span>{formatViews(vid.viewsCount || 0)} views</span>
                      <span>•</span>
                      <span>{formatTimeAgo(vid.createdAt)}</span>
                    </div>
                  </div>

                  {/* Remove Video action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveVideo(vid.videoId);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                    title="Remove from playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      ) : (
        /* VIEW 2: ALL USER PLAYLISTS GRID */
        <div>
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0070f3] mb-2" />
              <p className="text-xs font-semibold">Loading your playlists...</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0070f3] flex items-center justify-center mx-auto">
                <FolderPlus className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No playlists found</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You haven't created any playlists yet. Create playlists to group your favorite Indian music, news, technology or creator content!
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-5 py-2.5 bg-[#0070f3] hover:bg-[#005cd6] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Playlist</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredPlaylists.map((pl) => (
                <div
                  key={pl.playlistId}
                  onClick={() => selectPlaylist(pl)}
                  className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-[#0070f3]/60 dark:hover:border-[#00d2ff]/40 transition-all duration-200 cursor-pointer group flex flex-col"
                >
                  {/* Thumbnail / Cover */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    {pl.thumbnailUrl ? (
                      <img
                        src={pl.thumbnailUrl}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex flex-col items-center justify-center text-white/70"
                        style={{ background: 'linear-gradient(135deg, #1e293b 0%, #312e81 100%)' }}
                      >
                        <ListVideo className="w-10 h-10 mb-1 opacity-70 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold">Playlist</span>
                      </div>
                    )}

                    {/* Overlay badge with video count */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                      <ListVideo className="w-3 h-3 text-[#00d2ff]" />
                      <span>{pl.videoIds.length} videos</span>
                    </div>

                    {pl.isPrivate ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-bold text-amber-300 flex items-center gap-1 border border-white/10">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Private</span>
                      </span>
                    ) : (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-bold text-emerald-300 flex items-center gap-1 border border-white/10">
                        <Globe className="w-2.5 h-2.5" />
                        <span>Public</span>
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-[#0070f3] dark:group-hover:text-[#00d2ff] transition-colors truncate">
                        {pl.title}
                      </h3>
                      {pl.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
                          {pl.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                      <span>Updated {formatTimeAgo(pl.updatedAt)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(pl.playlistId, pl.title);
                        }}
                        className="p-1 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Delete Playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#16171a] border border-slate-200 dark:border-[#27272a] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-zoom-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ListVideo className="w-5 h-5 text-[#0070f3]" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Create New Playlist</h3>
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Playlist Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Best of Bollywood, Coding Tutorials..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0070f3]/30 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="What is this playlist about?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0070f3]/30 font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  {isPrivate ? (
                    <Lock className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Globe className="w-4 h-4 text-emerald-500" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isPrivate ? 'Private Playlist' : 'Public Playlist'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {isPrivate ? 'Only you can view this playlist' : 'Anyone can view this playlist'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0070f3]" />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="px-5 py-2 bg-[#0070f3] hover:bg-[#005cd6] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
