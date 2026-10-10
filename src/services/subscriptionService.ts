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
    creatorData: Partial<User>,
    targetState?: boolean
  ): Promise<boolean> {
    if (subscriberId === creatorId) return false;

    const docRef = doc(db, 'users', subscriberId, 'subscriptions', creatorId);
    try {
      const alreadySubbed = await this.isSubscribed(subscriberId, creatorId);
      const shouldSubscribe = targetState !== undefined ? targetState : !alreadySubbed;

      if (!shouldSubscribe) {
        // Unsubscribe
        if (alreadySubbed) {
          await deleteDoc(docRef);
          // Decrement following count of subscriber
          try {
            await updateDoc(doc(db, 'users', subscriberId), {
              followingCount: increment(-1)
            });
          } catch {}
          // Decrement followers count of creator
          try {
            await updateDoc(doc(db, 'users', creatorId), {
              followersCount: increment(-1)
            });
          } catch {}
        }
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
        if (!alreadySubbed) {
          // Increment following count of subscriber
          try {
            await updateDoc(doc(db, 'users', subscriberId), {
              followingCount: increment(1)
            });
          } catch {}
          // Increment followers count of creator
          try {
            await updateDoc(doc(db, 'users', creatorId), {
              followersCount: increment(1)
            });
          } catch {}
        }
        return true;
      }
    } catch (err) {
      console.error('Subscription error:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${subscriberId}/subscriptions/${creatorId}`);
      throw err;
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
