import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Video } from '../types';
import { userService } from './userService';

// Default official Live India Account definition
export const LIVE_INDIA_USER: User = {
  uid: 'user_liveindia_official',
  username: 'liveindia',
  displayName: 'Live India',
  email: 'liveindia@socialindia.com',
  bio: 'Official Live India 24/7 Channel. Live breaking news, national events, debates and continuous broadcast.',
  photoURL: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
  bannerURL: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80',
  followersCount: 18500,
  followingCount: 3,
  videosCount: 1,
  role: 'creator',
  status: 'active',
  isVerified: true,
  verified: true,
  isMonetized: true,
  monetizationStatus: 'approved',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString()
};

// Default official Live India Live Stream Video
export const LIVE_INDIA_VIDEO: Video = {
  videoId: 'live_XGym1ByjKHw',
  title: 'Live India 24/7 - Live Broadcast & Stream | ताज़ा समाचार और लाइव प्रसारण',
  description: '🔴 Welcome to Live India Official Live Stream! Watch live national news, breaking headlines, special analysis and 24/7 continuous stream directly on SocialIndia.\n\n#LiveIndia #Live #BreakingNews #SocialIndia #24x7Live #IndiaLive',
  videoUrl: 'https://www.youtube.com/live/XGym1ByjKHw?si=IKh1b4dHLFNKParU',
  thumbnailUrl: 'https://img.youtube.com/vi/XGym1ByjKHw/maxresdefault.jpg',
  duration: 0,
  creatorId: 'user_liveindia_official',
  creatorUsername: 'liveindia',
  creatorDisplayName: 'Live India',
  creatorPhotoURL: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
  category: 'News',
  tags: ['LiveIndia', 'Live', 'News', 'BreakingNews', 'Stream', '24x7'],
  visibility: 'public',
  viewsCount: 2450,
  likesCount: 380,
  commentsCount: 94,
  sharesCount: 120,
  isShort: false,
  isLive: true,
  liveViewers: 1280,
  status: 'published',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

let isSeedingInProgress = false;

export const liveBroadcastService = {
  getUser(): User {
    return LIVE_INDIA_USER;
  },

  // Use the current in-memory broadcast state.
  // Old localStorage flags can become stale when a broadcast is still active after a reload.
  isLiveEnded(_videoId?: string): boolean {
    return !LIVE_INDIA_VIDEO.isLive;
  },

  getVideo(): Video {
    const isEnded = this.isLiveEnded(LIVE_INDIA_VIDEO.videoId);
    let duration = LIVE_INDIA_VIDEO.duration;
    if (isEnded && typeof window !== 'undefined') {
      try {
        const savedDur = localStorage.getItem(`socialindia_live_duration_${LIVE_INDIA_VIDEO.videoId}`);
        if (savedDur) duration = Number(savedDur);
      } catch (_) {}
    }
    return {
      ...LIVE_INDIA_VIDEO,
      isLive: !isEnded,
      duration: isEnded ? (duration || 3600) : 0
    };
  },

  // Mark the live broadcast as completed - transforms it into a standard recorded video
  async markLiveEnded(videoId: string, duration?: number): Promise<void> {
    const dur = duration && duration > 0 ? duration : 3600;
    LIVE_INDIA_VIDEO.isLive = false;
    LIVE_INDIA_VIDEO.duration = dur;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`socialindia_live_ended_${videoId}`, 'true');
        localStorage.setItem(`socialindia_live_duration_${videoId}`, String(dur));
      } catch (_) {}
    }

    try {
      const { videoService } = await import('./videoService');
      const cached = videoService.getCachedVideo(videoId);
      if (cached) {
        videoService.cacheVideo({
          ...cached,
          isLive: false,
          duration: dur
        });
      }
    } catch (_) {}

    try {
      await setDoc(doc(db, 'videos', videoId), {
        isLive: false,
        duration: dur,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Could not update live status in Firestore:', err);
    }

    // Broadcast stream ended event so all open views immediately update to normal video UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socialindia:live-stream-ended', {
        detail: { videoId, duration: dur }
      }));
    }
  },

  // Ensure Live India user profile & video exist in database and local cache
  async ensureLiveIndiaSeeded(): Promise<void> {
    if (isSeedingInProgress) return;
    isSeedingInProgress = true;

    try {
      // 1. Pre-cache profile locally for zero-latency retrieval
      userService.cacheUserProfile(LIVE_INDIA_USER);

      // 2. Check if Firestore user document exists, seed if missing
      try {
        const userRef = doc(db, 'users', LIVE_INDIA_USER.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, LIVE_INDIA_USER, { merge: true });
        }
      } catch (err) {
        console.warn('Live India user Firestore seed skipped:', err);
      }

      // 3. Check if Firestore live video exists, seed if missing
      try {
        const videoRef = doc(db, 'videos', LIVE_INDIA_VIDEO.videoId);
        const videoSnap = await getDoc(videoRef);
        if (!videoSnap.exists()) {
          await setDoc(videoRef, LIVE_INDIA_VIDEO, { merge: true });
        }
      } catch (err) {
        console.warn('Live India video Firestore seed skipped:', err);
      }
    } finally {
      isSeedingInProgress = false;
    }
  },

  // Called when liveindia signs in with password to attach real auth UID
  async syncLiveIndiaAccountWithAuth(uid: string): Promise<User> {
    const updatedUser: User = {
      ...LIVE_INDIA_USER,
      uid,
      updatedAt: new Date().toISOString()
    };

    // Cache with new UID
    userService.cacheUserProfile(updatedUser);

    try {
      await setDoc(doc(db, 'users', uid), updatedUser, { merge: true });
    } catch (e) {
      console.warn('Could not sync user profile to Firestore:', e);
    }

    try {
      // Also update video creatorId to new UID so creator permissions work
      const updatedVideo: Video = {
        ...LIVE_INDIA_VIDEO,
        creatorId: uid,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'videos', LIVE_INDIA_VIDEO.videoId), updatedVideo, { merge: true });
    } catch (e) {
      console.warn('Could not sync video creatorId in Firestore:', e);
    }

    return updatedUser;
  }
};
