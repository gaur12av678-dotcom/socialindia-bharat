import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  collection 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SavedVideo, Video } from '../types';

export const savedVideoService = {
  // Check if a video is saved
  async isSaved(uid: string, videoId: string): Promise<boolean> {
    if (!uid || !videoId) return false;
    const docRef = doc(db, 'users', uid, 'savedVideos', videoId);
    try {
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}/savedVideos/${videoId}`);
      return false;
    }
  },

  // Save video for watch later
  async saveVideo(uid: string, video: Video): Promise<void> {
    const docRef = doc(db, 'users', uid, 'savedVideos', video.videoId);
    const savedItem: SavedVideo = {
      videoId: video.videoId,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl,
      creatorUsername: video.creatorUsername,
      creatorDisplayName: video.creatorDisplayName,
      savedAt: new Date().toISOString()
    };
    try {
      await setDoc(docRef, savedItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/savedVideos/${video.videoId}`);
    }
  },

  // Unsave a video
  async unsaveVideo(uid: string, videoId: string): Promise<void> {
    const docRef = doc(db, 'users', uid, 'savedVideos', videoId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/savedVideos/${videoId}`);
    }
  },

  // Get all saved videos
  async getSavedVideos(uid: string): Promise<SavedVideo[]> {
    const colRef = collection(db, 'users', uid, 'savedVideos');
    try {
      const snap = await getDocs(colRef);
      const items = snap.docs.map((d: any) => d.data() as SavedVideo);
      return items.sort((a: SavedVideo, b: SavedVideo) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/savedVideos`);
      return [];
    }
  }
};
