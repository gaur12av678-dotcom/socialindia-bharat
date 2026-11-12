import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Playlist, Video } from '../types';
import { videoService } from './videoService';

export const playlistService = {
  generateId(): string {
    return 'pl_' + Math.random().toString(36).substring(2, 11);
  },

  // Instant synchronous cache retrieval for 0ms initial render
  getCachedPlaylist(playlistId: string): Playlist | null {
    if (typeof window === 'undefined') return null;
    try {
      const direct = localStorage.getItem(`si_playlist_${playlistId}`);
      if (direct) {
        return JSON.parse(direct);
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('socialindia_playlists_')) {
          const list: Playlist[] = JSON.parse(localStorage.getItem(key) || '[]');
          const match = list.find(p => p.playlistId === playlistId);
          if (match) return match;
        }
      }
    } catch {}
    return null;
  },

  // Cache playlist item synchronously
  cachePlaylist(playlist: Playlist): void {
    if (typeof window === 'undefined' || !playlist?.playlistId) return;
    try {
      localStorage.setItem(`si_playlist_${playlist.playlistId}`, JSON.stringify(playlist));
    } catch {}
  },

  // Create a new playlist
  async createPlaylist(data: {
    title: string;
    description?: string;
    creatorId: string;
    creatorUsername: string;
    creatorDisplayName: string;
    creatorPhotoURL?: string;
    isPrivate?: boolean;
    initialVideoId?: string;
    thumbnailUrl?: string;
  }): Promise<Playlist> {
    const playlistId = this.generateId();
    const now = new Date().toISOString();

    const newPlaylist: Playlist = {
      playlistId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      creatorId: data.creatorId,
      creatorUsername: data.creatorUsername,
      creatorDisplayName: data.creatorDisplayName,
      creatorPhotoURL: data.creatorPhotoURL || '',
      videoIds: data.initialVideoId ? [data.initialVideoId] : [],
      isPrivate: !!data.isPrivate,
      thumbnailUrl: data.thumbnailUrl || '',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'playlists', playlistId), newPlaylist);
    } catch (err) {
      console.warn('Firestore setDoc failed for playlist, persisting locally:', err);
    }

    // Always update local cache so the playlist exists immediately
    try {
      const cacheKey = `socialindia_playlists_${data.creatorId}`;
      const existing: Playlist[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      localStorage.setItem(cacheKey, JSON.stringify([newPlaylist, ...existing.filter(p => p.playlistId !== playlistId)]));
    } catch (e) {
      console.warn('Failed to cache playlist locally:', e);
    }

    return newPlaylist;
  },

  // Get user playlists (automatically creates default "Saved Videos" playlist if missing)
  async getUserPlaylists(creatorId: string, creatorUsername?: string, creatorDisplayName?: string): Promise<Playlist[]> {
    const cacheKey = `socialindia_playlists_${creatorId}`;
    const getLocalFallback = (): Playlist[] => {
      try {
        const raw = localStorage.getItem(cacheKey);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    };

    try {
      const q = query(
        collection(db, 'playlists'),
        where('creatorId', '==', creatorId)
      );
      const snap = await getDocs(q);
      const list: Playlist[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Playlist);
      });

      // Check if default "Saved Videos" playlist exists
      const hasSavedPlaylist = list.some(p => p.title.toLowerCase() === 'saved videos');

      if (!hasSavedPlaylist && creatorId) {
        try {
          const defaultPlaylist = await this.createPlaylist({
            title: 'Saved Videos',
            description: 'Your default private saved videos playlist',
            creatorId,
            creatorUsername: creatorUsername || 'user',
            creatorDisplayName: creatorDisplayName || 'User',
            isPrivate: true
          });
          list.unshift(defaultPlaylist);
        } catch (e) {
          console.warn('Could not auto-create Saved Videos playlist:', e);
        }
      }

      // Sync to local cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(list));
      } catch {}

      // Sort by updatedAt descending
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      console.warn('Could not fetch playlists from Firestore, falling back to local cache:', err);
      const fallbackList = getLocalFallback();
      return fallbackList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  },

  // Get single playlist by ID (Instant cache + background revalidation)
  async getPlaylistById(playlistId: string): Promise<Playlist | null> {
    const cached = this.getCachedPlaylist(playlistId);
    if (cached) {
      // Revalidate in background without blocking caller
      getDoc(doc(db, 'playlists', playlistId)).then(snap => {
        if (snap.exists()) {
          const fresh = snap.data() as Playlist;
          this.cachePlaylist(fresh);
        }
      }).catch(console.warn);
      return cached;
    }

    try {
      const snap = await getDoc(doc(db, 'playlists', playlistId));
      if (snap.exists()) {
        const pData = snap.data() as Playlist;
        this.cachePlaylist(pData);
        return pData;
      }
    } catch (err) {
      console.warn(`Could not fetch playlist ${playlistId} from Firestore:`, err);
    }

    // Fallback: search localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('socialindia_playlists_')) {
          const list: Playlist[] = JSON.parse(localStorage.getItem(key) || '[]');
          const match = list.find(p => p.playlistId === playlistId);
          if (match) {
            this.cachePlaylist(match);
            return match;
          }
        }
      }
    } catch {}

    return null;
  },

  // Add video to playlist
  async addVideoToPlaylist(playlistId: string, videoId: string, thumbnailUrl?: string): Promise<void> {
    const docRef = doc(db, 'playlists', playlistId);
    const now = new Date().toISOString();
    try {
      const updates: any = {
        videoIds: arrayUnion(videoId),
        updatedAt: now
      };
      if (thumbnailUrl) {
        updates.thumbnailUrl = thumbnailUrl;
      }
      await updateDoc(docRef, updates);
    } catch (err) {
      console.warn(`Firestore updateDoc failed for playlist ${playlistId}:`, err);
    }

    // Update local cache
    try {
      const cached = this.getCachedPlaylist(playlistId);
      if (cached) {
        const cIds = cached.videoIds || [];
        if (!cIds.includes(videoId)) cached.videoIds = [...cIds, videoId];
        if (thumbnailUrl) cached.thumbnailUrl = thumbnailUrl;
        cached.updatedAt = now;
        this.cachePlaylist(cached);
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('socialindia_playlists_')) {
          const list: Playlist[] = JSON.parse(localStorage.getItem(key) || '[]');
          const idx = list.findIndex(p => p.playlistId === playlistId);
          if (idx !== -1) {
            const currentIds = list[idx].videoIds || [];
            if (!currentIds.includes(videoId)) {
              list[idx].videoIds = [...currentIds, videoId];
            }
            if (thumbnailUrl) list[idx].thumbnailUrl = thumbnailUrl;
            list[idx].updatedAt = now;
            localStorage.setItem(key, JSON.stringify(list));
            break;
          }
        }
      }
    } catch {}
  },

  // Remove video from playlist
  async removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
    const docRef = doc(db, 'playlists', playlistId);
    try {
      await updateDoc(docRef, {
        videoIds: arrayRemove(videoId),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn(`Firestore updateDoc remove video failed for playlist ${playlistId}:`, err);
    }

    // Update local cache
    try {
      const cached = this.getCachedPlaylist(playlistId);
      if (cached) {
        cached.videoIds = (cached.videoIds || []).filter(id => id !== videoId);
        cached.updatedAt = new Date().toISOString();
        this.cachePlaylist(cached);
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('socialindia_playlists_')) {
          const list: Playlist[] = JSON.parse(localStorage.getItem(key) || '[]');
          const idx = list.findIndex(p => p.playlistId === playlistId);
          if (idx !== -1) {
            list[idx].videoIds = (list[idx].videoIds || []).filter(id => id !== videoId);
            list[idx].updatedAt = new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(list));
            break;
          }
        }
      }
    } catch {}
  },

  // Update playlist metadata (title, description, isPrivate)
  async updatePlaylist(playlistId: string, updates: { title?: string; description?: string; isPrivate?: boolean }): Promise<void> {
    const docRef = doc(db, 'playlists', playlistId);
    const now = new Date().toISOString();
    try {
      await updateDoc(docRef, { ...updates, updatedAt: now });
    } catch (err) {
      console.warn(`Firestore updateDoc failed for playlist ${playlistId}:`, err);
    }

    try {
      const cached = this.getCachedPlaylist(playlistId);
      if (cached) {
        Object.assign(cached, updates, { updatedAt: now });
        this.cachePlaylist(cached);
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('socialindia_playlists_')) {
          const list: Playlist[] = JSON.parse(localStorage.getItem(key) || '[]');
          const idx = list.findIndex(p => p.playlistId === playlistId);
          if (idx !== -1) {
            Object.assign(list[idx], updates, { updatedAt: now });
            localStorage.setItem(key, JSON.stringify(list));
            break;
          }
        }
      }
    } catch {}
  },

  // Delete a playlist
  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'playlists', playlistId));
    } catch (err) {
      console.warn(`Firestore deleteDoc failed for playlist ${playlistId}:`, err);
    }

    // Remove from local cache
    try {
      localStorage.removeItem(`si_playlist_${playlistId}`);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('socialindia_playlists_')) {
          const list: Playlist[] = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = list.filter(p => p.playlistId !== playlistId);
          if (filtered.length !== list.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
            break;
          }
        }
      }
    } catch {}
  },

  // Fetch playlist along with populated video objects (High-performance parallel fetch)
  async getPlaylistWithVideos(playlistId: string): Promise<{ playlist: Playlist | null; videos: Video[] }> {
    const playlist = await this.getPlaylistById(playlistId);
    if (!playlist || !playlist.videoIds || playlist.videoIds.length === 0) {
      return { playlist, videos: [] };
    }

    // PARALLEL PROMISE RESOLUTION with instant cache check: 0ms for cached, parallel for network
    const videoPromises = playlist.videoIds.map(async (vidId) => {
      const cached = videoService.getCachedVideo(vidId);
      if (cached) return cached;
      try {
        return await videoService.getVideo(vidId);
      } catch (err) {
        console.warn(`Could not load playlist video ${vidId}:`, err);
        return null;
      }
    });

    const results = await Promise.all(videoPromises);
    const videos: Video[] = results.filter((v): v is Video => v !== null && v !== undefined);

    return { playlist, videos };
  }
};
