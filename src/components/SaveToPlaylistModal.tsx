import React, { useState, useEffect } from 'react';
import { Playlist, Video } from '../types';
import { playlistService } from '../services/playlistService';
import { savedVideoService } from '../services/savedVideoService';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { useTranslation } from '../i18n';
import { Plus, Lock, Globe, Check, X, Loader2, Bookmark, Clock } from 'lucide-react';

interface SaveToPlaylistModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onSavedChange?: (saved: boolean) => void;
}

export const SaveToPlaylistModal: React.FC<SaveToPlaylistModalProps> = ({
  video,
  isOpen,
  onClose,
  onSavedChange
}) => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInWatchLater, setIsInWatchLater] = useState(false);

  // New playlist form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen || !video) return;

    if (!currentUser) {
      setLoading(false);
      setPlaylists([]);
      setIsInWatchLater(false);
      return;
    }

    setIsInWatchLater(savedVideoService.isSavedSync(currentUser.uid, video.videoId));
    savedVideoService.isSaved(currentUser.uid, video.videoId).then(setIsInWatchLater).catch(() => {});
    loadPlaylists();
  }, [isOpen, currentUser?.uid, video?.videoId]);

  const computeAnySaved = (watchLater: boolean, list: Playlist[], videoId: string) => {
    return watchLater || list.some(p => (p.videoIds || []).includes(videoId));
  };

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWatchLater = async () => {
    if (!currentUser || !video) return;
    const nextSaved = !isInWatchLater;
    setIsInWatchLater(nextSaved);
    onSavedChange?.(computeAnySaved(nextSaved, playlists, video.videoId));

    try {
      if (nextSaved) {
        await savedVideoService.saveVideo(currentUser.uid, video);
        addToast(isHindi ? 'सहेजे गए वीडियो में जोड़ा गया' : 'Saved to Watch Later', 'success');
      } else {
        await savedVideoService.unsaveVideo(currentUser.uid, video.videoId);
        addToast(isHindi ? 'सहेजे गए वीडियो से हटाया गया' : 'Removed from Watch Later', 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePlaylist = async (pl: Playlist) => {
    if (!video || !currentUser) return;
    const isChecked = (pl.videoIds || []).includes(video.videoId);
    const updatedPlaylists = playlists.map(p => {
      if (p.playlistId !== pl.playlistId) return p;
      return {
        ...p,
        videoIds: isChecked
          ? (p.videoIds || []).filter(id => id !== video.videoId)
          : [...(p.videoIds || []), video.videoId]
      };
    });
    setPlaylists(updatedPlaylists);

    // Sync default "Saved Videos" playlist with savedVideoService as well
    const isSavedVideosPlaylist = pl.title.trim().toLowerCase() === 'saved videos';
    const nextWatchLater = isSavedVideosPlaylist ? !isChecked : isInWatchLater;
    if (isSavedVideosPlaylist) {
      setIsInWatchLater(nextWatchLater);
    }
    onSavedChange?.(computeAnySaved(nextWatchLater, updatedPlaylists, video.videoId));

    try {
      if (isChecked) {
        await playlistService.removeVideoFromPlaylist(pl.playlistId, video.videoId);
        if (isSavedVideosPlaylist) {
          await savedVideoService.unsaveVideo(currentUser.uid, video.videoId);
        }
        addToast(isHindi ? `"${pl.title}" से हटाया गया` : `Removed from "${pl.title}"`, 'info');
      } else {
        await playlistService.addVideoToPlaylist(pl.playlistId, video.videoId, video.thumbnailUrl);
        if (isSavedVideosPlaylist) {
          await savedVideoService.saveVideo(currentUser.uid, video);
        }
        addToast(isHindi ? `"${pl.title}" में सहेजा गया` : `Saved to "${pl.title}"`, 'success');
      }
    } catch (err) {
      addToast(isHindi ? 'प्लेलिस्ट अपडेट करने में विफल' : 'Failed to update playlist', 'error');
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newTitle.trim() || !video) return;

    setCreating(true);
    try {
      const created = await playlistService.createPlaylist({
        title: newTitle.trim(),
        creatorId: currentUser.uid,
        creatorUsername: currentUserProfile?.username || currentUser.email?.split('@')[0] || 'user',
        creatorDisplayName: currentUserProfile?.displayName || currentUser.displayName || 'User',
        creatorPhotoURL: currentUserProfile?.photoURL || currentUser.photoURL || '',
        isPrivate,
        initialVideoId: video.videoId,
        thumbnailUrl: video.thumbnailUrl
      });

      const nextPlaylists = [created, ...playlists];
      setPlaylists(nextPlaylists);
      onSavedChange?.(computeAnySaved(isInWatchLater, nextPlaylists, video.videoId));
      addToast(isHindi ? `प्लेलिस्ट "${created.title}" बनाई गई!` : `Playlist "${created.title}" created!`, 'success');
      setNewTitle('');
      setShowCreateForm(false);
    } catch (err) {
      addToast(isHindi ? 'प्लेलिस्ट बनाने में विफल' : 'Failed to create playlist', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen || !video) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {isHindi ? 'वीडियो सहेजें' : 'Save Video'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {!currentUser ? (
          <div className="p-7 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                {isHindi ? 'वीडियो सहेजने के लिए साइन इन करें' : 'Sign in to save videos'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isHindi ? 'बाद में देखने और प्लेलिस्ट बनाने के लिए साइन इन करें।' : 'Sign in to add videos to Watch Later or your playlists.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('signin');
              }}
              className="px-6 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs font-extrabold rounded-full shadow-md cursor-pointer"
            >
              {isHindi ? 'साइन इन करें' : 'Sign In'}
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 max-h-72 overflow-y-auto space-y-2.5">
              {/* Quick Watch Later / Saved Videos toggle */}
              <div
                onClick={handleToggleWatchLater}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isInWatchLater
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-[#1E293B]/40 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                    {isInWatchLater && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{isHindi ? 'सहेजे गए वीडियो (Watch Later)' : 'Watch Later (Saved Videos)'}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                      {isHindi ? 'आपकी सहेजी गई सूची में दिखता है' : 'Appears in your Saved Videos library'}
                    </p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-5 text-center space-y-2">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">
                    {isHindi ? 'प्लेलिस्ट लोड हो रही हैं...' : 'Loading playlists...'}
                  </p>
                </div>
              ) : playlists.length === 0 ? (
                <p className="text-center py-4 text-xs font-bold text-slate-400">
                  {isHindi ? 'कोई कस्टम प्लेलिस्ट नहीं मिली। नीचे नई प्लेलिस्ट बनाएं!' : 'No custom playlists yet. Create one below!'}
                </p>
              ) : (
                playlists.map((pl) => {
                  const isSaved = (pl.videoIds || []).includes(video.videoId);
                  return (
                    <div
                      key={pl.playlistId}
                      onClick={() => handleTogglePlaylist(pl)}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSaved
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-300'
                          : 'bg-slate-50 dark:bg-[#1E293B]/40 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                          {isSaved && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate">{pl.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                            {pl.isPrivate ? <Lock className="w-3 h-3 text-amber-500" /> : <Globe className="w-3 h-3 text-emerald-500" />}
                            <span>{(pl.videoIds || []).length} {isHindi ? 'वीडियो' : 'videos'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: Create New Playlist Form */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161616]/40">
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full py-3 bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isHindi ? 'नई प्लेलिस्ट बनाएं' : 'Create New Playlist'}</span>
                </button>
              ) : (
                <form onSubmit={handleCreatePlaylist} className="space-y-3 animate-in fade-in duration-200">
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={isHindi ? 'प्लेलिस्ट का शीर्षक दर्ज करें...' : 'Enter playlist title...'}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <span>{isHindi ? 'निजी प्लेलिस्ट (केवल आपको दिखाई देगी)' : 'Private Playlist (Only visible to you)'}</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      {isHindi ? 'रद्द करें' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !newTitle.trim()}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{isHindi ? 'बनाएं और सहेजें' : 'Create & Save'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
