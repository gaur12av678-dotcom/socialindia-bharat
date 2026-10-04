import { 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  collection, 
  query, 
  increment 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Comment } from '../types';

export const commentService = {
  // Get comments on a video
  async getComments(videoId: string): Promise<Comment[]> {
    const colRef = collection(db, 'videos', videoId, 'comments');
    try {
      const snap = await getDocs(colRef);
      const comments = snap.docs.map((d: any) => d.data() as Comment);
      // Sort comments: Pinned comment first, then newest first
      return comments.sort((a: Comment, b: Comment) => {
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

      // 3. Award +2 SocialCoins for genuine comments (>5 chars)
      if (comment.uid && comment.text.trim().length >= 5) {
        try {
          const { walletService } = await import('./walletService');
          walletService.awardCoins(comment.uid, 'comment', 'Commented on video', videoId).catch(console.warn);
        } catch (e) {
          console.warn(e);
        }
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
