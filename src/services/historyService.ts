import { 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  collection, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { HistoryItem, Video } from '../types';

export const historyService = {
  // Add a video to watch history
  async addToHistory(uid: string, video: Video, progressSeconds: number = 0): Promise<void> {
    const docRef = doc(db, 'users', uid, 'history', video.videoId);
    const historyItem: HistoryItem = {
      videoId: video.videoId,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl,
      creatorUsername: video.creatorUsername,
      creatorDisplayName: video.creatorDisplayName,
      watchedAt: new Date().toISOString(),
      progressSeconds
    };
    try {
      await setDoc(docRef, historyItem, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/history/${video.videoId}`);
    }
  },

  // Update playback progress
  async updatePlaybackProgress(uid: string, videoId: string, progressSeconds: number): Promise<void> {
    const docRef = doc(db, 'users', uid, 'history', videoId);
    try {
      await setDoc(docRef, { progressSeconds, watchedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/history/${videoId}`);
    }
  },

  // Get user watch history
  async getHistory(uid: string): Promise<HistoryItem[]> {
    const colRef = collection(db, 'users', uid, 'history');
    try {
      const snap = await getDocs(colRef);
      const items = snap.docs.map((d: any) => d.data() as HistoryItem);
      return items.sort((a: HistoryItem, b: HistoryItem) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/history`);
      return [];
    }
  },

  // Remove single video from history
  async removeFromHistory(uid: string, videoId: string): Promise<void> {
    const docRef = doc(db, 'users', uid, 'history', videoId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/history/${videoId}`);
    }
  },

  // Clear all watch history
  async clearHistory(uid: string): Promise<void> {
    const colRef = collection(db, 'users', uid, 'history');
    try {
      const snap = await getDocs(colRef);
      if (snap.empty) return;

      const batch = writeBatch(db);
      snap.docs.forEach((d: any) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/history`);
    }
  }
};
