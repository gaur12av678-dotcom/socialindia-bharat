import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  increment 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { Video } from '../types';
import { userService } from './userService';
import { extractYoutubeThumbnail } from '../utils/videoUtils';

export const videoService = {
  // Generate safe random video ID
  generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  // NEW: Upload file to storage and get URL
  // Simplified to use uploadBytes for maximum compatibility
  async uploadFile(file: File, path: string): Promise<string> {
    console.log(`Starting simplified upload: ${file.name} (${file.size} bytes) to ${path}`);
    const fileRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    
    try {
      const snapshot = await uploadBytes(fileRef, file, { contentType: file.type });
      console.log('Upload successful, getting download URL...');
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (error: any) {
      console.error('Upload error details:', {
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse
      });
      throw new Error(`Upload failed: ${error.message}`);
    }
  },

  // Publish a video
  async publishVideo(videoData: Partial<Video>): Promise<Video> {
    const videoId = this.generateId();
    const now = new Date().toISOString();
    
    const autoYtThumbnail = extractYoutubeThumbnail(videoData.videoUrl || '');
    const finalThumbnail = (videoData.thumbnailUrl && videoData.thumbnailUrl.trim().length > 0)
      ? videoData.thumbnailUrl.trim()
      : autoYtThumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';

    const fullVideo: Video = {
      videoId,
      title: videoData.title || 'Untitled Video',
      description: videoData.description || '',
      videoUrl: videoData.videoUrl || '',
      thumbnailUrl: finalThumbnail,
      duration: videoData.duration || 0,
      creatorId: videoData.creatorId || '',
      creatorUsername: videoData.creatorUsername || '',
      creatorDisplayName: videoData.creatorDisplayName || '',
      creatorPhotoURL: videoData.creatorPhotoURL || '',
      category: videoData.category || 'Other',
      tags: videoData.tags || [],
      visibility: videoData.visibility || 'public',
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isShort: videoData.isShort || false,
      status: 'published',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'videos', videoId), fullVideo);
      await userService.incrementVideoCount(fullVideo.creatorId, 1);
      return fullVideo;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `videos/${videoId}`);
      throw err;
    }
  },

  // Edit a video
  async editVideo(videoId: string, updates: Partial<Video>): Promise<void> {
    const docRef = doc(db, 'videos', videoId);
    try {
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `videos/${videoId}`);
    }
  },

  // Delete a video
  async deleteVideo(videoId: string, creatorId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'videos', videoId));
      await userService.incrementVideoCount(creatorId, -1);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `videos/${videoId}`);
    }
  },

  // Get a specific video
  async getVideo(videoId: string): Promise<Video | null> {
    const docRef = doc(db, 'videos', videoId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Video;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `videos/${videoId}`);
      return null;
    }
  },

  // Increment view count safely
  async incrementViewCount(videoId: string): Promise<void> {
    const docRef = doc(db, 'videos', videoId);
    try {
      await updateDoc(docRef, {
        viewsCount: increment(1)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `videos/${videoId}`);
    }
  },

  // Get public videos with optional filters
  async getVideos(filters?: { category?: string; creatorId?: string; isShort?: boolean }): Promise<Video[]> {
    let q = query(collection(db, 'videos'), where('visibility', '==', 'public'));

    if (filters?.category && filters.category !== 'All') {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.creatorId) {
      q = query(q, where('creatorId', '==', filters.creatorId));
    }
    if (filters?.isShort !== undefined) {
      q = query(q, where('isShort', '==', filters.isShort));
    }

    try {
      const snap = await getDocs(q);
      const videos = snap.docs.map((d: any) => d.data() as Video);
      
      // Sort newest first in memory to avoid needing complex composite Firestore indexes
      return videos.sort((a: Video, b: Video) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'videos');
      return [];
    }
  },

  // Search videos across titles, description, creators, tags, category
  async searchVideos(term: string): Promise<Video[]> {
    if (!term.trim()) return this.getVideos();
    const cleanTerm = term.trim().toLowerCase();

    try {
      // Get all public videos
      const videos = await this.getVideos();
      
      // Perform strict multi-field search in-memory to deliver accurate user queries
      return videos.filter(v => {
        const titleMatch = v.title.toLowerCase().includes(cleanTerm);
        const descMatch = v.description.toLowerCase().includes(cleanTerm);
        const creatorMatch = v.creatorUsername.toLowerCase().includes(cleanTerm) || v.creatorDisplayName.toLowerCase().includes(cleanTerm);
        const categoryMatch = v.category.toLowerCase().includes(cleanTerm);
        const tagMatch = v.tags.some(tag => tag.toLowerCase().includes(cleanTerm));
        return titleMatch || descMatch || creatorMatch || categoryMatch || tagMatch;
      });
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  },

  // Retrieve creator's dashboard content including private/unlisted videos
  async getCreatorVideos(creatorId: string): Promise<Video[]> {
    const q = query(
      collection(db, 'videos'),
      where('creatorId', '==', creatorId)
    );
    try {
      const snap = await getDocs(q);
      const videos = snap.docs.map((d: any) => d.data() as Video);
      return videos.sort((a: Video, b: Video) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'videos');
      return [];
    }
  },

  // NEW: Synchronize creator metadata (avatar, name) across all their videos
  async syncCreatorProfileToVideos(creatorId: string, updates: { photoURL?: string; displayName?: string; username?: string }): Promise<void> {
    const q = query(collection(db, 'videos'), where('creatorId', '==', creatorId));
    try {
      const snap = await getDocs(q);
      const batchPromises = snap.docs.map(vDoc => {
        const videoRef = doc(db, 'videos', vDoc.id);
        const videoUpdates: any = {};
        if (updates.photoURL !== undefined) videoUpdates.creatorPhotoURL = updates.photoURL;
        if (updates.displayName !== undefined) videoUpdates.creatorDisplayName = updates.displayName;
        if (updates.username !== undefined) videoUpdates.creatorUsername = updates.username;
        return updateDoc(videoRef, videoUpdates);
      });
      await Promise.all(batchPromises);
    } catch (err) {
      console.error('Metadata sync failed:', err);
    }
  }
};
