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
import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { Video } from '../types';
import { userService } from './userService';
import { extractVideoThumbnail, extractYoutubeThumbnail } from '../utils/videoUtils';

// Cloudinary Configuration from Env
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'socialindia';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'social_india_unsigned';

export const videoService = {
  // Generate safe random video ID
  generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  // Upload Video File to Cloudinary with automatic Firebase Storage backup fallback
  async uploadVideo(
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<{ videoUrl: string; duration?: number }> {
    console.log(`Starting video upload: ${file.name} (${file.size} bytes) from origin: ${typeof window !== 'undefined' ? window.location.origin : 'server'}`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'socialindia_videos');

      const cloudinaryResult = await new Promise<{ videoUrl: string; duration?: number }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track real-time progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Cloudinary Video Upload Success:', response.secure_url);
              resolve({
                videoUrl: response.secure_url,
                duration: response.duration ? Math.round(response.duration) : undefined
              });
            } catch (jsonErr) {
              reject(jsonErr);
            }
          } else {
            let errMsg = `Cloudinary HTTP Error ${xhr.status}`;
            try {
              const err = JSON.parse(xhr.responseText);
              if (err.error?.message) errMsg = err.error.message;
            } catch (_) {}
            reject(new Error(errMsg));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error(`Network/CORS direct upload restriction on ${typeof window !== 'undefined' ? window.location.origin : 'domain'}`));
        });

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`);
        xhr.send(formData);
      });

      return cloudinaryResult;
    } catch (cloudinaryErr: any) {
      console.warn('Cloudinary upload failed on custom domain. Activating automatic secure Firebase Storage backup fallback:', cloudinaryErr?.message || cloudinaryErr);
      
      // Automatic reliable fallback to Firebase Storage
      const firebaseVideoUrl = await this.uploadToFirebase(file, 'videos', onProgress);
      console.log('Firebase Storage Backup Video Upload Success:', firebaseVideoUrl);
      return {
        videoUrl: firebaseVideoUrl
      };
    }
  },

  // Upload Thumbnail Image File or Blob with automatic Firebase Storage backup fallback
  async uploadThumbnail(
    fileOrBlob: File | Blob, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const filename = (fileOrBlob as File).name || `thumbnail_${Date.now()}.jpg`;
    console.log(`Starting thumbnail image upload: ${filename}`);
    
    try {
      const formData = new FormData();
      formData.append('file', fileOrBlob, filename);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'socialindia_thumbnails');

      const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Cloudinary Thumbnail Upload Success:', response.secure_url);
              resolve(response.secure_url);
            } catch (jsonErr) {
              reject(jsonErr);
            }
          } else {
            let errMsg = `Cloudinary HTTP Error ${xhr.status}`;
            try {
              const err = JSON.parse(xhr.responseText);
              if (err.error?.message) errMsg = err.error.message;
            } catch (_) {}
            reject(new Error(errMsg));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error(`Network/CORS direct thumbnail upload restriction on ${typeof window !== 'undefined' ? window.location.origin : 'domain'}`));
        });

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
        xhr.send(formData);
      });

      return cloudinaryUrl;
    } catch (cloudinaryErr: any) {
      console.warn('Cloudinary thumbnail upload issue on custom domain. Activating automatic secure Firebase Storage backup fallback:', cloudinaryErr?.message || cloudinaryErr);
      const fallbackUrl = await this.uploadToFirebase(fileOrBlob, 'thumbnails', onProgress);
      return fallbackUrl;
    }
  },

  // Backward compatibility alias for uploadFile
  async uploadFile(
    file: File, 
    _path?: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (file.type.startsWith('image/')) {
      return this.uploadThumbnail(file, onProgress);
    }
    const result = await this.uploadVideo(file, onProgress);
    return result.videoUrl;
  },

  // Fallback Firebase Storage Upload (Supporting File or Blob)
  async uploadToFirebase(
    fileOrBlob: File | Blob, 
    path: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const filename = (fileOrBlob as File).name || `${Date.now()}_media.bin`;
    const contentType = fileOrBlob.type || 'application/octet-stream';
    const fileRef = ref(storage, `${path}/${Date.now()}_${filename}`);
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, fileOrBlob, { contentType });
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('Firebase Storage upload error:', error);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  },

  // Publish a video (automatically extracts real video scene thumbnail if not provided)
  async publishVideo(videoData: Partial<Video>): Promise<Video> {
    const videoId = this.generateId();
    const now = new Date().toISOString();
    
    // Extract real scene thumbnail from the video URL itself (Cloudinary/YouTube)
    const autoSceneThumbnail = extractVideoThumbnail(videoData.videoUrl || '');
    const finalThumbnail = (videoData.thumbnailUrl && videoData.thumbnailUrl.trim().length > 0)
      ? videoData.thumbnailUrl.trim()
      : (autoSceneThumbnail || videoData.videoUrl || '');

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
