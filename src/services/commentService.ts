import { 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  updateDoc, 
  collection, 
  query, 
  increment 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Comment, User } from '../types';
import { userService } from './userService';
import { updateUserAvatarCache } from '../components/UserAvatar';

// Local user cache to prevent redundant fetches
const commentUserCache = new Map<string, { photoURL?: string; displayName?: string; username?: string; fetchedAt: number }>();

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
    // Update local cache
    const likedSet = getStoredLikedComments(uid);
    const dislikedSet = getStoredDislikedComments(uid);
    likedSet.add(commentId);
    dislikedSet.delete(commentId);
    saveStoredLikedComments(uid, likedSet);
    saveStoredDislikedComments(uid, dislikedSet);

    try {
      const likeDocRef = doc(db, 'videos', videoId, 'comments', commentId, 'likes', uid);
      await setDoc(likeDocRef, {
        uid,
        videoId,
        commentId,
        createdAt: new Date().toISOString()
      });

      const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);
      await updateDoc(commentDocRef, {
        likesCount: increment(1)
      });

      // If disliked before, delete dislike doc
      try {
        const dislikeDocRef = doc(db, 'videos', videoId, 'comments', commentId, 'dislikes', uid);
        await deleteDoc(dislikeDocRef);
      } catch (_) {}
    } catch (err) {
      console.warn('Could not persist comment like to Firestore:', err);
    }
  },

  // Unlike a comment (Remove YouTube Thumbs Up)
  async unlikeComment(videoId: string, commentId: string, uid: string): Promise<void> {
    if (!uid) return;
    const likedSet = getStoredLikedComments(uid);
    likedSet.delete(commentId);
    saveStoredLikedComments(uid, likedSet);

    try {
      const likeDocRef = doc(db, 'videos', videoId, 'comments', commentId, 'likes', uid);
      await deleteDoc(likeDocRef);

      const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);
      await updateDoc(commentDocRef, {
        likesCount: increment(-1)
      });
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
        await deleteDoc(likeDocRef);
        const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);
        await updateDoc(commentDocRef, {
          likesCount: increment(-1)
        });
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
    const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);
    try {
      await updateDoc(commentDocRef, {
        hasCreatorHeart: shouldHeart,
        heartedAt: shouldHeart ? new Date().toISOString() : null
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `videos/${videoId}/comments/${commentId}`);
      throw err;
    }
  },
  // Get comments on a video with synchronized, latest user avatars
  async getComments(videoId: string): Promise<Comment[]> {
    const colRef = collection(db, 'videos', videoId, 'comments');
    try {
      const snap = await getDocs(colRef);
      const comments = snap.docs.map((d: any) => d.data() as Comment);

      // Hydrate with latest avatars for all authors so changed avatars update across all old comments!
      const uniqueUids = Array.from(new Set(comments.map(c => c.uid).filter(Boolean)));
      const now = Date.now();

      await Promise.all(
        uniqueUids.map(async (uid) => {
          const cached = commentUserCache.get(uid);
          if (cached && now - cached.fetchedAt < 60000) {
            return;
          }
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
      );

      // Apply latest author details to comments
      const hydratedComments = comments.map(c => {
        const freshUser = commentUserCache.get(c.uid);
        if (freshUser) {
          return {
            ...c,
            photoURL: freshUser.photoURL || c.photoURL,
            displayName: freshUser.displayName || c.displayName,
            username: freshUser.username || c.username
          };
        }
        return c;
      });

      // Sort comments: Pinned comment first, then newest first
      return hydratedComments.sort((a: Comment, b: Comment) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `videos/${videoId}/comments`);
      return [];
    }
  },

  // Add comment to video
  async addComment(videoId: string, commentData: Partial<Comment>): Promise<Comment> {
    const commentId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();
    
    const comment: Comment = {
      commentId,
      videoId,
      uid: commentData.uid || '',
      username: commentData.username || '',
      displayName: commentData.displayName || '',
      photoURL: commentData.photoURL || '',
      text: commentData.text || '',
      likesCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (commentData.parentCommentId) {
      comment.parentCommentId = commentData.parentCommentId;
    }

    try {
      // 1. Save the comment document
      await setDoc(doc(db, 'videos', videoId, 'comments', commentId), comment);
      
      // 2. Increment commentsCount on parent video (non-blocking)
      try {
        await updateDoc(doc(db, 'videos', videoId), {
          commentsCount: increment(1)
        });
      } catch (countErr) {
        console.warn('Could not increment comments count on video:', countErr);
      }
      
      return comment;
    } catch (err) {
      console.error('Comment creation error:', err);
      handleFirestoreError(err, OperationType.CREATE, `videos/${videoId}/comments/${commentId}`);
      throw err;
    }
  },

  // Update existing comment
  async editComment(videoId: string, commentId: string, text: string): Promise<void> {
    const docRef = doc(db, 'videos', videoId, 'comments', commentId);
    try {
      await updateDoc(docRef, {
        text,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `videos/${videoId}/comments/${commentId}`);
    }
  },

  // Delete comment from video
  async deleteComment(videoId: string, commentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'videos', videoId, 'comments', commentId));
      await updateDoc(doc(db, 'videos', videoId), {
        commentsCount: increment(-1)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `videos/${videoId}/comments/${commentId}`);
    }
  },

  // Pin or unpin a comment (Channel owner only, max 1 pinned comment per video)
  async pinComment(videoId: string, commentId: string, shouldPin: boolean): Promise<void> {
    try {
      if (shouldPin) {
        // Unpin any existing pinned comment on this video
        const colRef = collection(db, 'videos', videoId, 'comments');
        const snap = await getDocs(colRef);
        const updates: Promise<any>[] = [];
        snap.docs.forEach((d: any) => {
          const data = d.data() as Comment;
          if (data.isPinned && data.commentId !== commentId) {
            updates.push(updateDoc(doc(db, 'videos', videoId, 'comments', data.commentId), {
              isPinned: false
            }));
          }
        });
        await Promise.all(updates);

        // Pin the selected comment
        await updateDoc(doc(db, 'videos', videoId, 'comments', commentId), {
          isPinned: true,
          pinnedAt: new Date().toISOString()
        });
      } else {
        // Unpin
        await updateDoc(doc(db, 'videos', videoId, 'comments', commentId), {
          isPinned: false
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `videos/${videoId}/comments/${commentId}`);
      throw err;
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
