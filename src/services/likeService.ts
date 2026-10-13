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

const memoryLikedSet = new Map<string, Set<string>>(); // uid -> Set of videoIds

function getStoredLikes(uid: string): Set<string> {
  if (!uid || typeof window === 'undefined') return new Set();
  const mem = memoryLikedSet.get(uid);
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(`si_vlikes_${uid}`);
    if (raw) {
      const set = new Set<string>(JSON.parse(raw));
      memoryLikedSet.set(uid, set);
      return set;
    }
  } catch (_) {}
  const empty = new Set<string>();
  memoryLikedSet.set(uid, empty);
  return empty;
}

function saveStoredLikes(uid: string, set: Set<string>) {
  if (!uid || typeof window === 'undefined') return;
  memoryLikedSet.set(uid, set);
  try {
    localStorage.setItem(`si_vlikes_${uid}`, JSON.stringify(Array.from(set)));
  } catch (_) {}
}

export const likeService = {
  // Synchronous 0ms check for instant initial state on video mount
  hasLikedSync(videoId: string, uid: string): boolean {
    if (!uid || !videoId) return false;
    return getStoredLikes(uid).has(videoId);
  },

  // Check if a user liked a video (instant return from cache + background revalidation)
  async hasLiked(videoId: string, uid: string): Promise<boolean> {
    if (!uid || !videoId) return false;
    const localLikes = getStoredLikes(uid);
    const isLocallyLiked = localLikes.has(videoId);

    // Revalidate with Firestore in background or if not in cache
    const docRef = doc(db, 'videos', videoId, 'likes', uid);
    try {
      const snap = await getDoc(docRef);
      const exists = snap.exists();
      if (exists !== isLocallyLiked) {
        if (exists) localLikes.add(videoId);
        else localLikes.delete(videoId);
        saveStoredLikes(uid, localLikes);
      }
      return exists;
    } catch (err) {
      return isLocallyLiked;
    }
  },

  // Like a video (Instant local update + non-blocking firestore commit)
  async likeVideo(videoId: string, uid: string): Promise<void> {
    if (!uid || !videoId) return;
    const likes = getStoredLikes(uid);
    likes.add(videoId);
    saveStoredLikes(uid, likes);

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
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `videos/${videoId}/likes/${uid}`);
    }
  },

  // Unlike a video (Instant local update + non-blocking firestore commit)
  async unlikeVideo(videoId: string, uid: string): Promise<void> {
    if (!uid || !videoId) return;
    const likes = getStoredLikes(uid);
    likes.delete(videoId);
    saveStoredLikes(uid, likes);

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
