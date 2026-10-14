import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment,
  collection,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Like, Video } from '../types';

export interface LikedVideoItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  creatorUsername?: string;
  creatorDisplayName?: string;
  duration?: number;
  viewsCount?: number;
  isShort?: boolean;
  likedAt: string;
}

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
  async likeVideo(videoId: string, uid: string, videoInfo?: Partial<Video>): Promise<void> {
    if (!uid || !videoId) return;
    const likes = getStoredLikes(uid);
    likes.add(videoId);
    saveStoredLikes(uid, likes);

    const docRef = doc(db, 'videos', videoId, 'likes', uid);
    const now = new Date().toISOString();
    const likeData: Like = {
      uid,
      videoId,
      createdAt: now,
    };

    // Also persist to users/{uid}/likedVideos/{videoId}
    const userLikedDocRef = doc(db, 'users', uid, 'likedVideos', videoId);
    const likedItem: LikedVideoItem = {
      videoId,
      title: videoInfo?.title || 'Video',
      thumbnailUrl: videoInfo?.thumbnailUrl || '',
      creatorUsername: videoInfo?.creatorUsername || '',
      creatorDisplayName: videoInfo?.creatorDisplayName || '',
      duration: videoInfo?.duration || 0,
      viewsCount: videoInfo?.viewsCount || 0,
      isShort: videoInfo?.isShort || false,
      likedAt: now
    };

    try {
      await Promise.all([
        setDoc(docRef, likeData),
        setDoc(userLikedDocRef, likedItem).catch(() => {}),
        updateDoc(doc(db, 'videos', videoId), {
          likesCount: increment(1)
        }).catch(() => {})
      ]);
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
    const userLikedDocRef = doc(db, 'users', uid, 'likedVideos', videoId);
    try {
      await Promise.all([
        deleteDoc(docRef),
        deleteDoc(userLikedDocRef).catch(() => {}),
        updateDoc(doc(db, 'videos', videoId), {
          likesCount: increment(-1)
        }).catch(() => {})
      ]);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `videos/${videoId}/likes/${uid}`);
    }
  },

  // Get all liked videos for a user
  async getLikedVideos(uid: string): Promise<LikedVideoItem[]> {
    if (!uid) return [];
    try {
      const colRef = collection(db, 'users', uid, 'likedVideos');
      const snap = await getDocs(colRef);
      let items: LikedVideoItem[] = snap.docs.map((d: any) => d.data() as LikedVideoItem);

      // If user had local likes that are not in Firestore subcollection yet, enrich with cached video data
      const storedIds = Array.from(getStoredLikes(uid));
      const existingIds = new Set(items.map(it => it.videoId));
      const missingIds = storedIds.filter(id => !existingIds.has(id));

      if (missingIds.length > 0) {
        const { videoService } = await import('./videoService');
        for (const missingId of missingIds.slice(0, 20)) {
          try {
            const v = videoService.getCachedVideo(missingId) || await videoService.getVideo(missingId);
            if (v) {
              const fallbackItem: LikedVideoItem = {
                videoId: v.videoId,
                title: v.title,
                thumbnailUrl: v.thumbnailUrl,
                creatorUsername: v.creatorUsername,
                creatorDisplayName: v.creatorDisplayName,
                duration: v.duration,
                viewsCount: v.viewsCount,
                isShort: v.isShort,
                likedAt: new Date().toISOString()
              };
              items.push(fallbackItem);
              setDoc(doc(db, 'users', uid, 'likedVideos', v.videoId), fallbackItem).catch(() => {});
            }
          } catch (_) {}
        }
      }

      return items.sort((a, b) => new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime());
    } catch (err) {
      console.warn('Failed to fetch liked videos from Firestore, falling back to local:', err);
      const storedIds = Array.from(getStoredLikes(uid));
      if (storedIds.length > 0) {
        try {
          const { videoService } = await import('./videoService');
          const list: LikedVideoItem[] = [];
          for (const vid of storedIds.slice(0, 25)) {
            const v = videoService.getCachedVideo(vid) || await videoService.getVideo(vid);
            if (v) {
              list.push({
                videoId: v.videoId,
                title: v.title,
                thumbnailUrl: v.thumbnailUrl,
                creatorUsername: v.creatorUsername,
                creatorDisplayName: v.creatorDisplayName,
                duration: v.duration,
                viewsCount: v.viewsCount,
                isShort: v.isShort,
                likedAt: new Date().toISOString()
              });
            }
          }
          return list;
        } catch (_) {}
      }
      return [];
    }
  }
};
