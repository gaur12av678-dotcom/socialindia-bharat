import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { TrashItem, Video, User } from '../types';
import { userService } from './userService';

const VAULT_RETENTION_DAYS = 180; // 180 Days Indian IT Rules 2021 Data Retention

export const trashService = {
  // Move an item (Video, Short, User) to the 180-Day Compliance Trash Vault
  async moveToTrash(params: {
    itemId: string;
    itemType: 'video' | 'short' | 'user';
    title: string;
    subtitle?: string;
    thumbnailUrl?: string;
    photoURL?: string;
    deletedBy: string;
    deletedByName?: string;
    details?: string;
    dataSnapshot: any;
  }): Promise<string> {
    const trashId = `trash_${params.itemType}_${params.itemId}_${Date.now()}`;
    const now = new Date();
    const scheduledPurge = new Date(now.getTime() + VAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Deep sanitize dataSnapshot so no undefined fields cause Firestore setDoc error
    const cleanSnapshot = JSON.parse(JSON.stringify(params.dataSnapshot || {}));

    const trashItem: TrashItem = {
      id: trashId,
      itemId: params.itemId,
      itemType: params.itemType,
      title: params.title || 'Deleted Item',
      subtitle: params.subtitle || '',
      thumbnailUrl: params.thumbnailUrl || '',
      photoURL: params.photoURL || '',
      deletedAt: now.toISOString(),
      scheduledPurgeDate: scheduledPurge.toISOString(),
      deletedBy: params.deletedBy || 'admin',
      deletedByName: params.deletedByName || 'Administrator',
      status: 'trashed',
      details: params.details || 'Moved to 180-Day Compliance Vault',
      dataSnapshot: cleanSnapshot
    };

    try {
      await setDoc(doc(db, 'trash', trashId), trashItem);
      return trashId;
    } catch (err) {
      console.warn('Warning archiving item to trash collection:', err);
      return trashId;
    }
  },

  // Fetch all items currently in Trash / Compliance Archive
  async getAllTrash(): Promise<TrashItem[]> {
    try {
      const q = query(collection(db, 'trash'), orderBy('deletedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TrashItem);
    } catch (err) {
      console.warn('Could not fetch trash items:', err);
      return [];
    }
  },

  // Restore an item from Trash back to active platform status (Undo Delete / Resume)
  async restoreItem(trashId: string): Promise<TrashItem> {
    try {
      const trashRef = doc(db, 'trash', trashId);
      const trashSnap = await getDoc(trashRef);
      if (!trashSnap.exists()) {
        throw new Error('Item not found in Trash Vault.');
      }

      const item = trashSnap.data() as TrashItem;
      const snapshot = item.dataSnapshot;

      if (item.itemType === 'video' || item.itemType === 'short') {
        // Restore Video in videos collection
        const videoData: Video = {
          ...snapshot,
          status: 'published',
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'videos', item.itemId), videoData);
        if (videoData.creatorId) {
          await userService.incrementVideoCount(videoData.creatorId, 1);
        }
      } else if (item.itemType === 'user') {
        // Restore User in users collection
        const userData: User = {
          ...snapshot,
          status: 'active',
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', item.itemId), userData);
      }

      // Update Trash Item Status
      await updateDoc(trashRef, {
        status: 'restored',
        restoredAt: new Date().toISOString()
      });

      return item;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `trash/${trashId}`);
      throw err;
    }
  },

  // Permanently purge an item from Trash (Hard Delete)
  async permanentlyPurge(trashId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'trash', trashId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `trash/${trashId}`);
      throw err;
    }
  },

  // Calculate days left for IT Rules retention
  getDaysRemaining(scheduledPurgeDate: string): number {
    const target = new Date(scheduledPurgeDate).getTime();
    const now = Date.now();
    const diff = target - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
};
