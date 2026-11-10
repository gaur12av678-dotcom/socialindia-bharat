import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection
} from 'firebase/firestore';
import { db } from '../firebase';
import { SavedVideo, Video } from '../types';

const memorySavedMap = new Map<string, SavedVideo[]>(); // uid -> SavedVideo[]
const memoryDirtySaved = new Map<string, Record<string, boolean>>(); // uid -> { [videoId]: shouldBeSaved }

function getStoredSavedList(uid: string): SavedVideo[] {
  if (!uid || typeof window === 'undefined') return [];
  const mem = memorySavedMap.get(uid);
  if (mem) return [...mem];
  try {
    const raw = localStorage.getItem(`si_saved_videos_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedVideo[];
      if (Array.isArray(parsed)) {
        memorySavedMap.set(uid, parsed);
        return [...parsed];
      }
    }
  } catch (_) {}
  return [];
}

function saveStoredSavedList(uid: string, list: SavedVideo[]) {
  if (!uid || typeof window === 'undefined') return;
  const copy = [...list];
  memorySavedMap.set(uid, copy);
  try {
    localStorage.setItem(`si_saved_videos_${uid}`, JSON.stringify(copy.slice(0, 200)));
  } catch (_) {}
}

function getDirtySaved(uid: string): Record<string, boolean> {
  if (!uid || typeof window === 'undefined') return {};
  const mem = memoryDirtySaved.get(uid);
  if (mem) return { ...mem };
  try {
    const raw = localStorage.getItem(`si_saved_dirty_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      if (parsed && typeof parsed === 'object') {
        memoryDirtySaved.set(uid, parsed);
        return { ...parsed };
      }
    }
  } catch (_) {}
  return {};
}

function setDirtySaved(uid: string, videoId: string, state: boolean | null) {
  if (!uid || !videoId || typeof window === 'undefined') return;
  const dirty = getDirtySaved(uid);
  if (state === null) {
    delete dirty[videoId];
  } else {
    dirty[videoId] = state;
  }
  memoryDirtySaved.set(uid, dirty);
  try {
    localStorage.setItem(`si_saved_dirty_${uid}`, JSON.stringify(dirty));
  } catch (_) {}
}

export const savedVideoService = {
  // Synchronous 0ms check for instant initial render
  isSavedSync(uid: string, videoId: string): boolean {
    if (!uid || !videoId) return false;
    const dirty = getDirtySaved(uid);
    if (Object.prototype.hasOwnProperty.call(dirty, videoId)) {
      return Boolean(dirty[videoId]);
    }
    return getStoredSavedList(uid).some(v => v.videoId === videoId);
  },

  // Synchronous 0ms retrieval for Saved page boot
  getCachedSavedVideos(uid: string): SavedVideo[] {
    if (!uid) return [];
    const dirty = getDirtySaved(uid);
    return getStoredSavedList(uid)
      .filter(v => v?.videoId && dirty[v.videoId] !== false)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  },

  // Check if a video is saved (respects dirty local toggles + revalidates Firestore)
  async isSaved(uid: string, videoId: string): Promise<boolean> {
    if (!uid || !videoId) return false;
    const dirty = getDirtySaved(uid);
    const localList = getStoredSavedList(uid);
    const docRef = doc(db, 'users', uid, 'savedVideos', videoId);

    if (Object.prototype.hasOwnProperty.call(dirty, videoId)) {
      const desiredState = Boolean(dirty[videoId]);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists() === desiredState) {
          setDirtySaved(uid, videoId, null);
        } else if (desiredState) {
          const item = localList.find(v => v.videoId === videoId);
          if (item) {
            await setDoc(docRef, item);
            setDirtySaved(uid, videoId, null);
          }
        } else {
          await deleteDoc(docRef);
          setDirtySaved(uid, videoId, null);
        }
      } catch (_) {}
      return desiredState;
    }

    const isLocallySaved = localList.some(v => v.videoId === videoId);
    try {
      const snap = await getDoc(docRef);
      const exists = snap.exists();
      if (exists && !isLocallySaved) {
        const data = snap.data() as SavedVideo;
        saveStoredSavedList(uid, [data, ...localList.filter(v => v.videoId !== videoId)]);
      } else if (!exists && isLocallySaved) {
        saveStoredSavedList(uid, localList.filter(v => v.videoId !== videoId));
      }
      return exists;
    } catch (_) {
      return isLocallySaved;
    }
  },

  // Save video for watch later / saved list
  async saveVideo(uid: string, video: Video): Promise<void> {
    if (!uid || !video?.videoId) return;
    const savedItem: SavedVideo = {
      videoId: video.videoId,
      title: video.title || 'Video',
      thumbnailUrl: video.thumbnailUrl || '',
      creatorUsername: video.creatorUsername || '',
      creatorDisplayName: video.creatorDisplayName || 'Creator',
      savedAt: new Date().toISOString()
    };

    const existing = getStoredSavedList(uid).filter(v => v.videoId !== video.videoId);
    saveStoredSavedList(uid, [savedItem, ...existing]);
    setDirtySaved(uid, video.videoId, true);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('socialindia:saved_changed', { detail: { videoId: video.videoId, saved: true } })
      );
    }

    const docRef = doc(db, 'users', uid, 'savedVideos', video.videoId);
    try {
      await setDoc(docRef, savedItem);
      setDirtySaved(uid, video.videoId, null);
    } catch (err) {
      console.warn('Saved video persisted locally; Firestore sync deferred:', err);
    }
  },

  // Unsave a video
  async unsaveVideo(uid: string, videoId: string): Promise<void> {
    if (!uid || !videoId) return;
    const remaining = getStoredSavedList(uid).filter(v => v.videoId !== videoId);
    saveStoredSavedList(uid, remaining);
    setDirtySaved(uid, videoId, false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('socialindia:saved_changed', { detail: { videoId, saved: false } })
      );
    }

    const docRef = doc(db, 'users', uid, 'savedVideos', videoId);
    try {
      await deleteDoc(docRef);
      setDirtySaved(uid, videoId, null);
    } catch (err) {
      console.warn('Unsave persisted locally; Firestore sync deferred:', err);
    }
  },

  // Get all saved videos (merges Firestore + local cache cleanly)
  async getSavedVideos(uid: string): Promise<SavedVideo[]> {
    if (!uid) return [];
    const dirty = getDirtySaved(uid);
    const localList = getStoredSavedList(uid);
    const map = new Map<string, SavedVideo>();

    for (const item of localList) {
      if (item?.videoId && dirty[item.videoId] !== false) {
        map.set(item.videoId, item);
      }
    }

    try {
      const colRef = collection(db, 'users', uid, 'savedVideos');
      const snap = await getDocs(colRef);
      snap.docs.forEach((d: any) => {
        const data = d.data() as SavedVideo;
        if (data?.videoId && dirty[data.videoId] !== false) {
          map.set(data.videoId, data);
        }
      });
    } catch (err) {
      console.warn('Failed to load saved videos from Firestore, using local cache:', err);
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
    saveStoredSavedList(uid, merged);
    return merged;
  }
};
