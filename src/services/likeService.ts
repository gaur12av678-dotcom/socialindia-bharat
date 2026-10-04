import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Like } from '../types';

export const likeService = {
  // Check if a user liked a video
  async hasLiked(videoId: string, uid: string): Promise<boolean> {
    if (!uid) return false;
    const docRef = doc(db, 'videos', videoId, 'likes', uid);
    try {
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `videos/${videoId}/likes/${uid}`);
      return false;
    }
  },

  // Like a video
  async likeVideo(videoId: string, uid: string): Promise<void> {
    const docRef = doc(db, 'videos', videoId, 'likes', uid);
    const likeData: Like = {
      uid,
      videoId,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(docRef, likeData);
      // Increment likes count on video
      await updateDoc(doc(db, 'videos', videoId), {
        likesCount: increment(1)
      });

      // Award +1 SocialCoin reward
      try {
        const { walletService } = await import('./walletService');
        walletService.awardCoins(uid, 'like', 'Liked video', videoId).catch(console.warn);
      } catch (e) {
        console.warn(e);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `videos/${videoId}/likes/${uid}`);
    }
  },

  // Unlike a video
  async unlikeVideo(videoId: string, uid: string): Promise<void> {
    const docRef = doc(db, 'videos', videoId, 'likes', uid);
    try {
      await deleteDoc(docRef);
      // Decrement likes count on video
      await updateDoc(doc(db, 'videos', videoId), {
        likesCount: increment(-1)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `videos/${videoId}/likes/${uid}`);
    }
  }
};
