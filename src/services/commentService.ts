import {
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  collection,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { Comment } from '../types';
import { userService } from './userService';
import { updateUserAvatarCache } from '../components/UserAvatar';
import { videoService } from './videoService';

// Local user cache to prevent redundant fetches
const commentUserCache = new Map<string, { photoURL?: string; displayName?: string; username?: string; fetchedAt: number }>();
const memoryCommentsCache = new Map<string, Comment[]>(); // videoId -> Comment[]

function getStoredVideoComments(videoId: string): Comment[] {
  if (!videoId || typeof window === 'undefined') return [];
  const mem = memoryCommentsCache.get(videoId);
  if (mem) return [...mem];
  try {
    const raw = localStorage.getItem(`si_video_comments_${videoId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Comment[];
      if (Array.isArray(parsed)) {
        memoryCommentsCache.set(videoId, parsed);
        return [...parsed];
      }
    }
  } catch (_) {}
  return [];
}

function saveStoredVideoComments(videoId: string, list: Comment[]) {
  if (!videoId || typeof window === 'undefined') return;
  const copy = [...list];
  memoryCommentsCache.set(videoId, copy);
  try {
    localStorage.setItem(`si_video_comments_${videoId}`, JSON.stringify(copy.slice(0, 200)));
  } catch (_) {}
}

function getDeletedCommentIds(videoId: string): Set<string> {
  if (!videoId || typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`si_video_comments_deleted_${videoId}`);
    if (raw) return new Set<string>(JSON.parse(raw));
  } catch (_) {}
  return new Set();
}

function addDeletedCommentId(videoId: string, commentId: string) {
  if (!videoId || !commentId || typeof window === 'undefined') return;
  const deleted = getDeletedCommentIds(videoId);
  deleted.add(commentId);
  try {
    localStorage.setItem(`si_video_comments_deleted_${videoId}`, JSON.stringify(Array.from(deleted).slice(-100)));
  } catch (_) {}
}

function sortVideoComments(list: Comment[]): Comment[] {
  return [...list].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function hydrateAuthorsFromCache(list: Comment[]): Comment[] {
  return list.map(c => {
    const cached = commentUserCache.get(c.uid) || (c.uid ? userService.getCachedUserProfile(c.uid) : null);
    if (cached) {
      return {
        ...c,
        photoURL: cached.photoURL || c.photoURL,
        displayName: cached.displayName || c.displayName,
        username: cached.username || c.username
      };
    }
    return c;
  });
}

function updateCachedVideoCommentsCount(videoId: string, delta: number) {
  try {
    const cached = videoService.getCachedVideo(videoId);
    if (cached) {
      videoService.cacheVideo({
        ...cached,
        commentsCount: Math.max(0, (cached.commentsCount || 0) + delta)
      });
    }
  } catch (_) {}
}

const getStoredLikedComments = (uid: string): Set<string> => {
  if (typeof window === 'undefined' || !uid) return new Set();
  try {
    const raw = localStorage.getItem(`socialindia_comment_likes_${uid}`);
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
};

const saveStoredLikedComments = (uid: string, set: Set<string>) => {
  if (typeof window === 'undefined' || !uid) return;
  try {
    localStorage.setItem(`socialindia_comment_likes_${uid}`, JSON.stringify(Array.from(set)));
  } catch (_) {}
};

const getStoredDislikedComments = (uid: string): Set<string> => {
  if (typeof window === 'undefined' || !uid) return new Set();
  try {
    const raw = localStorage.getItem(`socialindia_comment_dislikes_${uid}`);
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
};

const saveStoredDislikedComments = (uid: string, set: Set<string>) => {
  if (typeof window === 'undefined' || !uid) return;
  try {
    localStorage.setItem(`socialindia_comment_dislikes_${uid}`, JSON.stringify(Array.from(set)));
  } catch (_) {}
};

export const commentService = {
  // Synchronous 0ms cache lookup for instant comment rendering
  getCachedComments(videoId: string): Comment[] {
    if (!videoId) return [];
    const deleted = getDeletedCommentIds(videoId);
    return sortVideoComments(
      hydrateAuthorsFromCache(getStoredVideoComments(videoId).filter(c => !deleted.has(c.commentId)))
    );
  },

  // Read reactions from local storage
  getUserReactions(uid: string): { likedCommentIds: Set<string>; dislikedCommentIds: Set<string> } {
    return {
      likedCommentIds: getStoredLikedComments(uid),
      dislikedCommentIds: getStoredDislikedComments(uid)
    };
  },

  // Like a comment (YouTube Thumbs Up)
  async likeComment(videoId: string, commentId: string, uid: string): Promise<void> {
    if (!uid) return;
    const likedSet = getStoredLikedComments(uid);
    const dislikedSet = getStoredDislikedComments(uid);
    const wasLiked = likedSet.has(commentId);
    likedSet.add(commentId);
    dislikedSet.delete(commentId);
    saveStoredLikedComments(uid, likedSet);
    saveStoredDislikedComments(uid, dislikedSet);

    if (!wasLiked) {
      const cached = getStoredVideoComments(videoId).map(c =>
        c.commentId === commentId ? { ...c, likesCount: Math.max(0, (c.likesCount || 0) + 1) } : c
      );
      saveStoredVideoComments(videoId, cached);
    }

    try {
      const likeDocRef = doc(db, 'videos', videoId, 'comments', commentId, 'likes', uid);
      await setDoc(likeDocRef, {
        uid,
        videoId,
        commentId,
        createdAt: new Date().toISOString()
      });

      if (!wasLiked) {
        const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);
        await updateDoc(commentDocRef, {
          likesCount: increment(1)
        }).catch(() => {});
      }

      const dislikeDocRef = doc(db, 'videos', videoId, 'comments', commentId, 'dislikes', uid);
      await deleteDoc(dislikeDocRef).catch(() => {});
    } catch (err) {
      console.warn('Could not persist comment like to Firestore:', err);
    }
  },

  // Unlike a comment (Remove YouTube Thumbs Up)
  async unlikeComment(videoId: string, commentId: string, uid: string): Promise<void> {
    if (!uid) return;
    const likedSet = getStoredLikedComments(uid);
    const wasLiked = likedSet.has(commentId);
    likedSet.delete(commentId);
    saveStoredLikedComments(uid, likedSet);

    if (wasLiked) {
      const cached = getStoredVideoComments(videoId).map(c =>
        c.commentId === commentId ? { ...c, likesCount: Math.max(0, (c.likesCount || 0) - 1) } : c
      );
      saveStoredVideoComments(videoId, cached);
    }

    try {
      const likeDocRef = doc(db, 'videos', videoId, 'comments', commentId, 'likes', uid);
      await deleteDoc(likeDocRef);

      if (wasLiked) {
        const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);
        await updateDoc(commentDocRef, {
          likesCount: increment(-1)
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Could not remove comment like from Firestore:', err);
    }
  },

  // Dislike a comment (YouTube Thumbs Down)
  async dislikeComment(videoId: string, commentId: string, uid: string): Promise<void> {
    if (!uid) return;
    const dislikedSet = getStoredDislikedComments(uid);
    const likedSet = getStoredLikedComments(uid);
    const wasLiked = likedSet.has(commentId);

    dislikedSet.add(commentId);
    likedSet.delete(commentId);
    saveStoredDislikedComments(uid, dislikedSet);
    saveStoredLikedComments(uid, likedSet);

    if (wasLiked) {
      const cached = getStoredVideoComments(videoId).map(c =>
        c.commentId === commentId ? { ...c, likesCount: Math.max(0, (c.likesCount || 0) - 1) } : c
      );
      saveStoredVideoComments(videoId, cached);
    }

    try {
      const dislikeDocRef = doc(db, 'videos', videoId, 'comments', commentId, 'dislikes', uid);
      await setDoc(dislikeDocRef, {
        uid,
        videoId,
        commentId,
        createdAt: new Date().toISOString()
      });

      if (wasLiked) {
        const likeDocRef = doc(db, 'videos', videoId, 'comments', commentId, 'likes', uid);
        await deleteDoc(likeDocRef).catch(() => {});
        const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);
        await updateDoc(commentDocRef, {
          likesCount: increment(-1)
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Could not persist comment dislike to Firestore:', err);
    }
  },

  // Undislike a comment (Remove YouTube Thumbs Down)
  async undislikeComment(videoId: string, commentId: string, uid: string): Promise<void> {
    if (!uid) return;
    const dislikedSet = getStoredDislikedComments(uid);
    dislikedSet.delete(commentId);
    saveStoredDislikedComments(uid, dislikedSet);

    try {
      const dislikeDocRef = doc(db, 'videos', videoId, 'comments', commentId, 'dislikes', uid);
      await deleteDoc(dislikeDocRef);
    } catch (err) {
      console.warn('Could not remove comment dislike from Firestore:', err);
    }
  },

  // Creator Heart a comment (YouTube creator ❤️ badge)
  async heartComment(videoId: string, commentId: string, shouldHeart: boolean): Promise<void> {
    const cached = getStoredVideoComments(videoId).map(c =>
      c.commentId === commentId ? { ...c, hasCreatorHeart: shouldHeart } : c
    );
    saveStoredVideoComments(videoId, cached);

    const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);
    try {
      await updateDoc(commentDocRef, {
        hasCreatorHeart: shouldHeart,
        heartedAt: shouldHeart ? new Date().toISOString() : null
      });
    } catch (err) {
      console.warn('Could not sync creator heart to Firestore:', err);
    }
  },

  // Get comments on a video (merges Firestore + local cache so user comments never disappear)
  async getComments(videoId: string): Promise<Comment[]> {
    if (!videoId) return [];
    const deletedIds = getDeletedCommentIds(videoId);
    const localComments = getStoredVideoComments(videoId);
    const colRef = collection(db, 'videos', videoId, 'comments');

    try {
      const snap = await getDocs(colRef);
      const remoteComments = snap.docs.map((d: any) => d.data() as Comment);

      // Merge: remoteComments + any local comments not yet in Firestore (or retry writing them)
      const byId = new Map<string, Comment>();
      for (const c of remoteComments) {
        if (c?.commentId && !deletedIds.has(c.commentId)) {
          byId.set(c.commentId, c);
        }
      }
      for (const lc of localComments) {
        if (lc?.commentId && !deletedIds.has(lc.commentId) && !byId.has(lc.commentId)) {
          byId.set(lc.commentId, lc);
          // Background retry sync for pending local comment
          setDoc(doc(db, 'videos', videoId, 'comments', lc.commentId), lc).catch(() => {});
        }
      }

      const merged = sortVideoComments(hydrateAuthorsFromCache(Array.from(byId.values())));
      saveStoredVideoComments(videoId, merged);

      // Background non-blocking hydration to refresh changed avatars
      const uniqueUids = Array.from(new Set(merged.map(c => c.uid).filter(Boolean)));
      const now = Date.now();
      Promise.all(
        uniqueUids.map(async (uid) => {
          const cached = commentUserCache.get(uid);
          if (cached && now - cached.fetchedAt < 60000) return;
          try {
            const userProfile = await userService.getUserProfile(uid);
            if (userProfile) {
              commentUserCache.set(uid, {
                photoURL: userProfile.photoURL,
                displayName: userProfile.displayName,
                username: userProfile.username,
                fetchedAt: now
              });
              if (userProfile.photoURL) {
                updateUserAvatarCache(uid, userProfile.photoURL, userProfile.displayName || userProfile.username);
              }
            }
          } catch (_) {}
        })
      ).catch(() => {});

      return merged;
    } catch (err) {
      console.warn('Could not load comments from Firestore, returning cached comments:', err);
      return this.getCachedComments(videoId);
    }
  },

  // Add comment to video (instant local persistence + Firestore sync)
  async addComment(videoId: string, commentData: Partial<Comment>): Promise<Comment> {
    const commentId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();

    const comment: Comment = {
      commentId,
      videoId,
      uid: commentData.uid || '',
      username: commentData.username || 'user',
      displayName: commentData.displayName || commentData.username || 'User',
      photoURL: commentData.photoURL || '',
      text: commentData.text || '',
      likesCount: 0,
      createdAt: now,
      updatedAt: now
    };

    if (commentData.parentCommentId) {
      comment.parentCommentId = commentData.parentCommentId;
    }

    // 1. Immediately persist to local cache so comment stays visible across reloads
    const existing = getStoredVideoComments(videoId).filter(c => c.commentId !== commentId);
    saveStoredVideoComments(videoId, sortVideoComments([comment, ...existing]));
    updateCachedVideoCommentsCount(videoId, 1);

    // 2. Sync to Firestore cleanly (never throw away user comment on transient network/rule failure)
    try {
      await setDoc(doc(db, 'videos', videoId, 'comments', commentId), comment);
      try {
        await updateDoc(doc(db, 'videos', videoId), {
          commentsCount: increment(1)
        });
      } catch (countErr) {
        console.warn('Could not increment comments count on video:', countErr);
      }
    } catch (err) {
      console.warn('Comment persisted locally; Firestore sync deferred:', err);
    }

    return comment;
  },

  // Update existing comment
  async editComment(videoId: string, commentId: string, text: string): Promise<void> {
    const now = new Date().toISOString();
    const cached = getStoredVideoComments(videoId).map(c =>
      c.commentId === commentId ? { ...c, text, updatedAt: now } : c
    );
    saveStoredVideoComments(videoId, cached);

    const docRef = doc(db, 'videos', videoId, 'comments', commentId);
    try {
      await updateDoc(docRef, {
        text,
        updatedAt: now
      });
    } catch (err) {
      console.warn('Could not sync comment edit to Firestore:', err);
    }
  },

  // Delete comment from video
  async deleteComment(videoId: string, commentId: string): Promise<void> {
    addDeletedCommentId(videoId, commentId);
    const remaining = getStoredVideoComments(videoId).filter(c => c.commentId !== commentId);
    saveStoredVideoComments(videoId, remaining);
    updateCachedVideoCommentsCount(videoId, -1);

    try {
      await deleteDoc(doc(db, 'videos', videoId, 'comments', commentId));
    } catch (err) {
      console.warn('Could not delete comment from Firestore:', err);
    }

    try {
      await updateDoc(doc(db, 'videos', videoId), {
        commentsCount: increment(-1)
      });
    } catch (_) {}
  },

  // Pin or unpin a comment (Channel owner only, max 1 pinned comment per video)
  async pinComment(videoId: string, commentId: string, shouldPin: boolean): Promise<void> {
    const now = new Date().toISOString();
    const cached = getStoredVideoComments(videoId).map(c => {
      if (c.commentId === commentId) return { ...c, isPinned: shouldPin };
      if (shouldPin && c.isPinned) return { ...c, isPinned: false };
      return c;
    });
    saveStoredVideoComments(videoId, sortVideoComments(cached));

    try {
      if (shouldPin) {
        const colRef = collection(db, 'videos', videoId, 'comments');
        const snap = await getDocs(colRef);
        const updates: Promise<any>[] = [];
        snap.docs.forEach((d: any) => {
          const data = d.data() as Comment;
          if (data.isPinned && data.commentId !== commentId) {
            updates.push(
              updateDoc(doc(db, 'videos', videoId, 'comments', data.commentId), {
                isPinned: false
              })
            );
          }
        });
        await Promise.all(updates);

        await updateDoc(doc(db, 'videos', videoId, 'comments', commentId), {
          isPinned: true,
          pinnedAt: now
        });
      } else {
        await updateDoc(doc(db, 'videos', videoId, 'comments', commentId), {
          isPinned: false
        });
      }
    } catch (err) {
      console.warn('Could not sync comment pin state to Firestore:', err);
    }
  },

  // Get comments across multiple videos for Creator Studio
  async getCommentsForVideos(videos: { videoId: string; title: string; isShort?: boolean }[]): Promise<(Comment & { videoTitle: string; isShort?: boolean })[]> {
    const results: (Comment & { videoTitle: string; isShort?: boolean })[] = [];
    await Promise.all(
      videos.map(async (v) => {
        try {
          const comms = await this.getComments(v.videoId);
          comms.forEach((c) => {
            results.push({
              ...c,
              videoTitle: v.title,
              isShort: v.isShort
            });
          });
        } catch (e) {
          console.warn(`Could not load comments for ${v.videoId}`, e);
        }
      })
    );
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};
