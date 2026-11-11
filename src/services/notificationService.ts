import { 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Notification, User } from '../types';

export const notificationService = {
  // Create an event-based notification (safe: skips if actor is recipient)
  async createNotification(
    recipientId: string,
    actor: User,
    type: 'like' | 'comment' | 'follow' | 'upload',
    details: { videoId?: string; videoTitle?: string; commentId?: string; message?: string }
  ): Promise<void> {
    if (recipientId === actor.uid) return; // Never notify user about their own actions

    const notificationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();

    let message = '';
    switch (type) {
      case 'like':
        message = `${actor.displayName} liked your video "${details.videoTitle || 'Untitled'}"`;
        break;
      case 'comment':
        message = `${actor.displayName} commented on your video: "${details.message || ''}"`;
        break;
      case 'follow':
        message = `${actor.displayName} started following your channel`;
        break;
      case 'upload':
        message = `${actor.displayName} published a new video: "${details.videoTitle || 'Untitled'}"`;
        break;
    }

    const notification: Notification = {
      notificationId,
      recipientId,
      actorId: actor.uid,
      actorUsername: actor.username,
      actorDisplayName: actor.displayName,
      actorPhotoURL: actor.photoURL || '',
      type,
      videoId: details.videoId || '',
      videoTitle: details.videoTitle || '',
      commentId: details.commentId || '',
      message: details.message || message,
      read: false,
      createdAt: now,
    };

    try {
      await setDoc(doc(db, 'users', recipientId, 'notifications', notificationId), notification);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${recipientId}/notifications/${notificationId}`);
    }
  },

  // Send system or financial notification to a user
  async sendSystemNotification(recipientId: string, title: string, message: string): Promise<void> {
    if (!recipientId) return;
    const notificationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();

    const notification: Notification = {
      notificationId,
      recipientId,
      actorId: 'system',
      actorUsername: 'SocialIndia',
      actorDisplayName: title || 'SocialIndia System',
      actorPhotoURL: '',
      type: 'system',
      message,
      read: false,
      createdAt: now,
    };

    try {
      await setDoc(doc(db, 'users', recipientId, 'notifications', notificationId), notification);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${recipientId}/notifications/${notificationId}`);
    }
  },

  // Get notifications for a user
  async getNotifications(recipientId: string): Promise<Notification[]> {
    const colRef = collection(db, 'users', recipientId, 'notifications');
    try {
      const snap = await getDocs(colRef);
      const notifications = snap.docs.map((d: any) => d.data() as Notification);
      return notifications.sort((a: Notification, b: Notification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${recipientId}/notifications`);
      return [];
    }
  },

  // Mark notification as read
  async markAsRead(recipientId: string, notificationId: string): Promise<void> {
    const docRef = doc(db, 'users', recipientId, 'notifications', notificationId);
    try {
      await updateDoc(docRef, { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${recipientId}/notifications/${notificationId}`);
    }
  },

  // Mark all notifications as read
  async markAllAsRead(recipientId: string): Promise<void> {
    const colRef = collection(db, 'users', recipientId, 'notifications');
    try {
      const snap = await getDocs(colRef);
      const unreadDocs = snap.docs.filter((d: any) => !d.data().read);
      if (unreadDocs.length === 0) return;

      const batch = writeBatch(db);
      unreadDocs.forEach((d: any) => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${recipientId}/notifications`);
    }
  }
};
