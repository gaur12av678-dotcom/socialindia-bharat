import { 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  collection, 
  onSnapshot,
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Notification, User, NewsletterCampaign } from '../types';
import { parseDateMs } from '../utils/videoUtils';

export const notificationService = {
  // Create an event-based notification (safe: skips if actor is recipient)
  async createNotification(
    recipientId: string,
    actor: User,
    type: 'like' | 'comment' | 'follow' | 'upload',
    details: { videoId?: string; videoTitle?: string; commentId?: string; message?: string }
  ): Promise<void> {
    if (!recipientId || !actor?.uid || recipientId === actor.uid) return; // Never notify user about their own actions

    const actorIsAdminSystem = actor.role === 'admin' && type !== 'follow';
    const actorDisplayName = actorIsAdminSystem
      ? 'Team SocialIndia'
      : (actor.displayName || actor.username || 'Someone');
    const actorUsername = actorIsAdminSystem
      ? 'team_socialindia'
      : (actor.username || '');
    const notificationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();

    let message = '';
    switch (type) {
      case 'like':
        message = `${actorDisplayName} liked your video "${details.videoTitle || 'Untitled'}"`;
        break;
      case 'comment':
        message = `${actorDisplayName} commented on your video: "${details.message || ''}"`;
        break;
      case 'follow':
        message = `${actorDisplayName} followed your channel`;
        break;
      case 'upload':
        message = `${actorDisplayName} published a new video: "${details.videoTitle || 'Untitled'}"`;
        break;
    }

    const notification: Notification = {
      notificationId,
      recipientId,
      actorId: actor.uid,
      actorUsername,
      actorDisplayName,
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
      actorUsername: 'team_socialindia',
      actorDisplayName: 'Team SocialIndia',
      actorPhotoURL: '/socialindia-icon.png',
      type: 'system',
      title: title || undefined,
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

  // Activate newsletter: true for any existing users who do not yet have it set
  async activateNewsletterForMissingUsers(users: User[]): Promise<number> {
    const missing = users.filter((u) => Boolean(u.uid) && u.newsletter === undefined);
    if (missing.length === 0) return 0;

    const now = new Date().toISOString();
    const CHUNK_SIZE = 400;
    let updatedCount = 0;

    for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
      const chunk = missing.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((u) => {
        batch.update(doc(db, 'users', u.uid), {
          newsletter: true,
          updatedAt: now
        });
      });
      await batch.commit();
      updatedCount += chunk.length;
    }

    return updatedCount;
  },

  // Fetch past newsletter tip campaigns sent by admins
  async getNewsletterCampaigns(): Promise<NewsletterCampaign[]> {
    try {
      const snap = await getDoc(doc(db, 'system_settings', 'newsletter_campaigns'));
      if (snap.exists()) {
        const list = snap.data()?.campaigns;
        if (Array.isArray(list)) {
          return list as NewsletterCampaign[];
        }
      }
    } catch (err) {
      console.warn('Could not load newsletter campaigns:', err);
    }
    return [];
  },

  // Send a Newsletter Tip notification as Team SocialIndia to all users with active newsletter
  async sendNewsletterTips(
    allUsers: User[],
    title: string,
    message: string,
    adminUid?: string
  ): Promise<{ recipientCount: number; activatedLegacyCount: number; campaign: NewsletterCampaign }> {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    if (!cleanTitle || !cleanMessage) {
      throw new Error('Please enter both a tip title and message.');
    }

    // Backfill legacy users missing newsletter field so everyone without explicit opt-out is active
    const activatedLegacyCount = await this.activateNewsletterForMissingUsers(allUsers).catch(() => 0);

    // Deduplicate recipients by uid and include everyone with active newsletter (newsletter !== false)
    const uniqueRecipientsMap = new Map<string, User>();
    allUsers.forEach((u) => {
      if (u?.uid && u.newsletter !== false && u.status !== 'suspended') {
        uniqueRecipientsMap.set(u.uid, u);
      }
    });
    const recipients = Array.from(uniqueRecipientsMap.values());

    if (recipients.length === 0) {
      throw new Error('No active newsletter subscribers found.');
    }

    const now = new Date().toISOString();
    const CHUNK_SIZE = 400;

    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((recipient) => {
        const notificationId =
          'nl_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        const notification: Notification = {
          notificationId,
          recipientId: recipient.uid,
          actorId: 'system',
          actorUsername: 'team_socialindia',
          actorDisplayName: 'Team SocialIndia',
          actorPhotoURL: '/socialindia-icon.png',
          type: 'system',
          title: cleanTitle,
          message: cleanMessage,
          read: false,
          createdAt: now,
        };
        batch.set(doc(db, 'users', recipient.uid, 'notifications', notificationId), notification);
      });
      await batch.commit();
    }

    const campaign: NewsletterCampaign = {
      id: 'camp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      title: cleanTitle,
      message: cleanMessage,
      recipientCount: recipients.length,
      sentAt: now,
      sentBy: adminUid || 'admin',
      senderName: 'Team SocialIndia',
    };

    try {
      const existing = await this.getNewsletterCampaigns();
      const updated = [campaign, ...existing].slice(0, 50);
      await setDoc(
        doc(db, 'system_settings', 'newsletter_campaigns'),
        { campaigns: updated, updatedAt: now },
        { merge: true }
      );
    } catch (err) {
      console.warn('Newsletter sent, but campaign history write warned:', err);
    }

    return {
      recipientCount: recipients.length,
      activatedLegacyCount,
      campaign,
    };
  },

  // Get notifications for a user
  async getNotifications(recipientId: string): Promise<Notification[]> {
    const colRef = collection(db, 'users', recipientId, 'notifications');
    try {
      const snap = await getDocs(colRef);
      const notifications = snap.docs.map((d: any) => d.data() as Notification);
      return notifications.sort((a: Notification, b: Notification) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${recipientId}/notifications`);
      return [];
    }
  },

  // Real-time notifications listener so users receive subscribe/other notifications immediately
  subscribeToNotifications(
    recipientId: string,
    onUpdate: (notifications: Notification[]) => void
  ): () => void {
    if (!recipientId) return () => {};
    const colRef = collection(db, 'users', recipientId, 'notifications');
    return onSnapshot(
      colRef,
      (snap) => {
        const notifications = snap.docs.map((d: any) => d.data() as Notification);
        notifications.sort((a: Notification, b: Notification) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt));
        onUpdate(notifications);
      },
      (err) => {
        console.warn('Notification listener warning:', err);
      }
    );
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
