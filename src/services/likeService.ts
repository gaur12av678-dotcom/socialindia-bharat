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
import { db } from '../firebase';
import { Like, Video } from '../types';
import { videoService } from './videoService';

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
const memoryLikedItems = new Map<string, LikedVideoItem[]>(); // uid -> LikedVideoItem[]
const memoryDirtyLikes = new Map<string, Record<string, boolean>>(); // uid -> { [videoId]: shouldBeLiked }

function getStoredLikes(uid: string): Set<string> {
  if (!uid || typeof window === 'undefined') return new Set();
  const mem = memoryLikedSet.get(uid);
  if (mem) return new Set(mem);
  try {
    const raw = localStorage.getItem(`si_vlikes_${uid}`);
    if (raw) {
      const set = new Set<string>(JSON.parse(raw));
      memoryLikedSet.set(uid, set);
      return new Set(set);
    }
  } catch (_) {}
  const empty = new Set<string>();
  memoryLikedSet.set(uid, empty);
  return new Set();
}

function saveStoredLikes(uid: string, set: Set<string>) {
  if (!uid || typeof window === 'undefined') return;
  const copy = new Set(set);
  memoryLikedSet.set(uid, copy);
  try {
    localStorage.setItem(`si_vlikes_${uid}`, JSON.stringify(Array.from(copy)));
  } catch (_) {}
}

function getStoredLikedItems(uid: string): LikedVideoItem[] {
  if (!uid || typeof window === 'undefined') return [];
  const mem = memoryLikedItems.get(uid);
  if (mem) return [...mem];
  try {
    const raw = localStorage.getItem(`si_vlikes_items_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw) as LikedVideoItem[];
      if (Array.isArray(parsed)) {
        memoryLikedItems.set(uid, parsed);
        return [...parsed];
      }
    }
  } catch (_) {}
  return [];
}

function saveStoredLikedItems(uid: string, items: LikedVideoItem[]) {
  if (!uid || typeof window === 'undefined') return;
  const copy = [...items];
  memoryLikedItems.set(uid, copy);
  try {
    localStorage.setItem(`si_vlikes_items_${uid}`, JSON.stringify(copy.slice(0, 200)));
  } catch (_) {}
}

function getDirtyLikes(uid: string): Record<string, boolean> {
  if (!uid || typeof window === 'undefined') return {};
  const mem = memoryDirtyLikes.get(uid);
  if (mem) return { ...mem };
  try {
    const raw = localStorage.getItem(`si_vlikes_dirty_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      if (parsed && typeof parsed === 'object') {
        memoryDirtyLikes.set(uid, parsed);
        return { ...parsed };
      }
    }
  } catch (_) {}
  return {};
}

function setDirtyLike(uid: string, videoId: string, state: boolean | null) {
  if (!uid || !videoId || typeof window === 'undefined') return;
  const dirty = getDirtyLikes(uid);
  if (state === null) {
    delete dirty[videoId];
  } else {
    dirty[videoId] = state;
  }
  memoryDirtyLikes.set(uid, dirty);
  try {
    localStorage.setItem(`si_vlikes_dirty_${uid}`, JSON.stringify(dirty));
  } catch (_) {}
}

function updateCachedVideoLikesCount(videoId: string, delta: number) {
  try {
    const cached = videoService.getCachedVideo(videoId);
    if (cached) {
      videoService.cacheVideo({
        ...cached,
        likesCount: Math.max(0, (cached.likesCount || 0) + delta)
      });
    }
  } catch (_) {}
}

export const likeService = {
  // Synchronous 0ms check for instant initial state on video mount
  hasLikedSync(videoId: string, uid: string): boolean {
    if (!uid || !videoId) return false;
    const dirty = getDirtyLikes(uid);
    if (Object.prototype.hasOwnProperty.call(dirty, videoId)) {
      return Boolean(dirty[videoId]);
    }
    return getStoredLikes(uid).has(videoId);
  },

  // Check if a user liked a video (respects pending local toggles + revalidates Firestore)
  async hasLiked(videoId: string, uid: string): Promise<boolean> {
    if (!uid || !videoId) return false;
    const dirty = getDirtyLikes(uid);
    const localLikes = getStoredLikes(uid);

    // If we have an unsynced local toggle, honour it and retry syncing to Firestore
    if (Object.prototype.hasOwnProperty.call(dirty, videoId)) {
      const desiredState = Boolean(dirty[videoId]);
      const docRef = doc(db, 'videos', videoId, 'likes', uid);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists() === desiredState) {
          setDirtyLike(uid, videoId, null);
        } else if (desiredState) {
          await setDoc(docRef, { uid, videoId, createdAt: new Date().toISOString() });
          setDirtyLike(uid, videoId, null);
        } else {
          await deleteDoc(docRef);
          setDirtyLike(uid, videoId, null);
        }
      } catch (_) {}
      return desiredState;
    }

    const isLocallyLiked = localLikes.has(videoId);
    const docRef = doc(db, 'videos', videoId, 'likes', uid);
    try {
      const snap = await getDoc(docRef);
      let exists = snap.exists();

      if (!exists) {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid, 'likedVideos', videoId));
          if (userSnap.exists()) {
            exists = true;
            setDoc(docRef, { uid, videoId, createdAt: new Date().toISOString() }).catch(() => {});
          }
        } catch (_) {}
      }

      if (exists !== isLocallyLiked) {
        if (exists) localLikes.add(videoId);
        else localLikes.delete(videoId);
        saveStoredLikes(uid, localLikes);
      }
      return exists;
    } catch (_) {
      return isLocallyLiked;
    }
  },

  // Like a video (Instant local persistence + resilient Firestore sync)
  async likeVideo(videoId: string, uid: string, videoInfo?: Partial<Video>): Promise<void> {
    if (!uid || !videoId) return;
    const now = new Date().toISOString();
    const likes = getStoredLikes(uid);
    const wasAlreadyLiked = likes.has(videoId);

    likes.add(videoId);
    saveStoredLikes(uid, likes);
    setDirtyLike(uid, videoId, true);

    const likedItem: LikedVideoItem = {
      videoId,
      title: videoInfo?.title || 'Video',
      thumbnailUrl: videoInfo?.thumbnailUrl || '',
      creatorUsername: videoInfo?.creatorUsername || '',
      creatorDisplayName: videoInfo?.creatorDisplayName || '',
      duration: videoInfo?.duration || 0,
      viewsCount: videoInfo?.viewsCount || 0,
      isShort: Boolean(videoInfo?.isShort),
      likedAt: now
    };

    const existingItems = getStoredLikedItems(uid).filter(it => it.videoId !== videoId);
    saveStoredLikedItems(uid, [likedItem, ...existingItems]);

    if (!wasAlreadyLiked) {
      updateCachedVideoLikesCount(videoId, 1);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socialindia:likes_changed', { detail: { videoId, liked: true } }));
    }

    const docRef = doc(db, 'videos', videoId, 'likes', uid);
    const userLikedDocRef = doc(db, 'users', uid, 'likedVideos', videoId);
    const likeData: Like = { uid, videoId, createdAt: now };

    try {
      let primaryOk = false;
      let userSubOk = false;

      await Promise.all([
        setDoc(docRef, likeData).then(() => { primaryOk = true; }).catch((e) => {
          console.warn('Could not sync video like doc:', e);
        }),
        setDoc(userLikedDocRef, likedItem).then(() => { userSubOk = true; }).catch((e) => {
          console.warn('Could not sync user likedVideos doc:', e);
        }),
        !wasAlreadyLiked
          ? updateDoc(doc(db, 'videos', videoId), { likesCount: increment(1) }).catch(() => {})
          : Promise.resolve()
      ]);

      if (primaryOk || userSubOk) {
        setDirtyLike(uid, videoId, null);
      }
    } catch (err) {
      console.warn('Like persisted locally; Firestore sync deferred:', err);
    }
  },

  // Unlike a video (Instant local persistence + resilient Firestore sync)
  async unlikeVideo(videoId: string, uid: string): Promise<void> {
    if (!uid || !videoId) return;
    const likes = getStoredLikes(uid);
    const wasLiked = likes.has(videoId);

    likes.delete(videoId);
    saveStoredLikes(uid, likes);
    setDirtyLike(uid, videoId, false);

    const remainingItems = getStoredLikedItems(uid).filter(it => it.videoId !== videoId);
    saveStoredLikedItems(uid, remainingItems);

    if (wasLiked) {
      updateCachedVideoLikesCount(videoId, -1);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socialindia:likes_changed', { detail: { videoId, liked: false } }));
    }

    const docRef = doc(db, 'videos', videoId, 'likes', uid);
    const userLikedDocRef = doc(db, 'users', uid, 'likedVideos', videoId);

    try {
      let primaryOk = false;
      let userSubOk = false;

      await Promise.all([
        deleteDoc(docRef).then(() => { primaryOk = true; }).catch((e) => {
          console.warn('Could not delete video like doc:', e);
        }),
        deleteDoc(userLikedDocRef).then(() => { userSubOk = true; }).catch((e) => {
          console.warn('Could not delete user likedVideos doc:', e);
        }),
        wasLiked
          ? updateDoc(doc(db, 'videos', videoId), { likesCount: increment(-1) }).catch(() => {})
          : Promise.resolve()
      ]);

      if (primaryOk || userSubOk) {
        setDirtyLike(uid, videoId, null);
      }
    } catch (err) {
      console.warn('Unlike persisted locally; Firestore sync deferred:', err);
    }
  },

  // Synchronously get cached liked videos for instant UI render
  getCachedLikedVideos(uid: string): LikedVideoItem[] {
    if (!uid) return [];
    const dirty = getDirtyLikes(uid);
    return getStoredLikedItems(uid)
      .filter(it => dirty[it.videoId] !== false)
      .sort((a, b) => new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime());
  },

  // Get all liked videos for a user (merges Firestore + local cache cleanly)
  async getLikedVideos(uid: string): Promise<LikedVideoItem[]> {
    if (!uid) return [];
    const dirty = getDirtyLikes(uid);
    const localItems = getStoredLikedItems(uid);
    const itemMap = new Map<string, LikedVideoItem>();

    // Seed with local items that are not explicitly unliked
    for (const item of localItems) {
      if (item?.videoId && dirty[item.videoId] !== false) {
        itemMap.set(item.videoId, item);
      }
    }

    try {
      const colRef = collection(db, 'users', uid, 'likedVideos');
      const snap = await getDocs(colRef);
      snap.docs.forEach((d: any) => {
        const data = d.data() as LikedVideoItem;
        if (data?.videoId && dirty[data.videoId] !== false) {
          itemMap.set(data.videoId, data);
        }
      });
    } catch (err) {
      console.warn('Failed to fetch liked videos from Firestore, using local cache:', err);
    }

    // Enrich any stored IDs that don't yet have item metadata
    const storedIds = Array.from(getStoredLikes(uid));
    const missingIds = storedIds.filter(id => !itemMap.has(id) && dirty[id] !== false);
    if (missingIds.length > 0) {
      for (const missingId of missingIds.slice(0, 25)) {
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
            itemMap.set(v.videoId, fallbackItem);
            setDoc(doc(db, 'users', uid, 'likedVideos', v.videoId), fallbackItem).catch(() => {});
          }
        } catch (_) {}
      }
    }

    const merged = Array.from(itemMap.values()).sort(
      (a, b) => new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime()
    );

    saveStoredLikedItems(uid, merged);
    const syncedSet = getStoredLikes(uid);
    merged.forEach(m => syncedSet.add(m.videoId));
    saveStoredLikes(uid, syncedSet);

    return merged;
  }
};
