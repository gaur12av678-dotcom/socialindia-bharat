import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  collection, 
  increment 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Subscription, User } from '../types';

export const subscriptionService = {
  // Check if subscribed to a creator
  async isSubscribed(subscriberId: string, creatorId: string): Promise<boolean> {
    if (!subscriberId || !creatorId) return false;
    if (subscriberId === creatorId) return false;
    const docRef = doc(db, 'users', subscriberId, 'subscriptions', creatorId);
    try {
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${subscriberId}/subscriptions/${creatorId}`);
      return false;
    }
  },

  // Toggle subscription/follow
  async toggleSubscription(
    subscriberId: string, 
    creatorId: string, 
    creatorData: Partial<User>
  ): Promise<boolean> {
    if (subscriberId === creatorId) return false;

    const docRef = doc(db, 'users', subscriberId, 'subscriptions', creatorId);
    try {
      const alreadySubbed = await this.isSubscribed(subscriberId, creatorId);

      if (alreadySubbed) {
        // Unsubscribe
        await deleteDoc(docRef);
        // Decrement following count of subscriber
        await updateDoc(doc(db, 'users', subscriberId), {
          followingCount: increment(-1)
        });
        // Decrement followers count of creator
        await updateDoc(doc(db, 'users', creatorId), {
          followersCount: increment(-1)
        });
        return false;
      } else {
        // Subscribe
        const subData: Subscription = {
          subscriberId,
          creatorId,
          creatorUsername: creatorData.username || '',
          creatorDisplayName: creatorData.displayName || '',
          creatorPhotoURL: creatorData.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, subData);
        // Increment following count of subscriber
        await updateDoc(doc(db, 'users', subscriberId), {
          followingCount: increment(1)
        });
        // Increment followers count of creator
        await updateDoc(doc(db, 'users', creatorId), {
          followersCount: increment(1)
        });
        return true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${subscriberId}/subscriptions/${creatorId}`);
      return false;
    }
  },

  // Get creators user is subscribed to
  async getSubscriptions(subscriberId: string): Promise<Subscription[]> {
    const colRef = collection(db, 'users', subscriberId, 'subscriptions');
    try {
      const snap = await getDocs(colRef);
      return snap.docs.map((d: any) => d.data() as Subscription);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${subscriberId}/subscriptions`);
      return [];
    }
  }
};
