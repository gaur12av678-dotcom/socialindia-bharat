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
import { userService } from './userService';

const memorySubSet = new Map<string, Set<string>>(); // subscriberId -> Set of creatorIds

function getStoredSubs(subscriberId: string): Set<string> {
  if (!subscriberId || typeof window === 'undefined') return new Set();
  const mem = memorySubSet.get(subscriberId);
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(`si_subs_${subscriberId}`);
    if (raw) {
      const set = new Set<string>(JSON.parse(raw));
      memorySubSet.set(subscriberId, set);
      return set;
    }
  } catch (_) {}
  const empty = new Set<string>();
  memorySubSet.set(subscriberId, empty);
  return empty;
}

function saveStoredSubs(subscriberId: string, set: Set<string>) {
  if (!subscriberId || typeof window === 'undefined') return;
  memorySubSet.set(subscriberId, set);
  try {
    localStorage.setItem(`si_subs_${subscriberId}`, JSON.stringify(Array.from(set)));
  } catch (_) {}
}

export const subscriptionService = {
  // Synchronous 0ms check for instant subscription rendering on page load
  isSubscribedSync(subscriberId: string, creatorId: string): boolean {
    if (!subscriberId || !creatorId || subscriberId === creatorId) return false;
    return getStoredSubs(subscriberId).has(creatorId);
  },

  // Check if subscribed to a creator (instant cache with background revalidation)
  async isSubscribed(subscriberId: string, creatorId: string): Promise<boolean> {
    if (!subscriberId || !creatorId) return false;
    if (subscriberId === creatorId) return false;

    const subs = getStoredSubs(subscriberId);
    const isLocallySubbed = subs.has(creatorId);

    const docRef = doc(db, 'users', subscriberId, 'subscriptions', creatorId);
    try {
      const snap = await getDoc(docRef);
      const exists = snap.exists();
      if (exists !== isLocallySubbed) {
        if (exists) subs.add(creatorId);
        else subs.delete(creatorId);
        saveStoredSubs(subscriberId, subs);
      }
      return exists;
    } catch (err) {
      return isLocallySubbed;
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
            const cProfile = userService.getCachedUserProfile(creatorId);
            if (cProfile) {
              userService.cacheUserProfile({
                ...cProfile,
                followersCount: Math.max(0, (cProfile.followersCount || 1) - 1)
              });
            }
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
            const cProfile = userService.getCachedUserProfile(creatorId);
            if (cProfile) {
              userService.cacheUserProfile({
                ...cProfile,
                followersCount: (cProfile.followersCount || 0) + 1
              });
            }
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
