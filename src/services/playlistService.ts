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

export const playlistService = {
  generateId(): string {
    return 'pl_' + Math.random().toString(36).substring(2, 11);
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
      return newPlaylist;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `playlists/${playlistId}`);
      throw err;
    }
  },

  // Get user playlists (automatically creates default "Saved Videos" playlist if missing)
  async getUserPlaylists(creatorId: string, creatorUsername?: string, creatorDisplayName?: string): Promise<Playlist[]> {
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

      // Sort by updatedAt descending
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'playlists');
      return [];
    }
  },

  // Get single playlist by ID
  async getPlaylistById(playlistId: string): Promise<Playlist | null> {
    try {
      const snap = await getDoc(doc(db, 'playlists', playlistId));
      if (snap.exists()) {
        return snap.data() as Playlist;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `playlists/${playlistId}`);
      return null;
    }
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
      handleFirestoreError(err, OperationType.UPDATE, `playlists/${playlistId}`);
      throw err;
    }
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
      handleFirestoreError(err, OperationType.UPDATE, `playlists/${playlistId}`);
      throw err;
    }
  },

  // Delete a playlist
  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'playlists', playlistId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `playlists/${playlistId}`);
      throw err;
    }
  },

  // Fetch playlist along with populated video objects
  async getPlaylistWithVideos(playlistId: string): Promise<{ playlist: Playlist | null; videos: Video[] }> {
    const playlist = await this.getPlaylistById(playlistId);
    if (!playlist || !playlist.videoIds || playlist.videoIds.length === 0) {
      return { playlist, videos: [] };
    }

    const videos: Video[] = [];
    for (const vidId of playlist.videoIds) {
      try {
        const snap = await getDoc(doc(db, 'videos', vidId));
        if (snap.exists()) {
          videos.push(snap.data() as Video);
        }
      } catch (err) {
        console.warn(`Could not load playlist video ${vidId}:`, err);
      }
    }
    return { playlist, videos };
  }
};
