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
      // Sort comments by newest first in memory
      return comments.sort((a: Comment, b: Comment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      parentCommentId: commentData.parentCommentId || undefined,
      createdAt: now,
      updatedAt: now,
    };

    try {
      // 1. Save the comment document
      await setDoc(doc(db, 'videos', videoId, 'comments', commentId), comment);
      
      // 2. Increment commentsCount on parent video
      await updateDoc(doc(db, 'videos', videoId), {
        commentsCount: increment(1)
      });
      
      return comment;
    } catch (err) {
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
  }
};
