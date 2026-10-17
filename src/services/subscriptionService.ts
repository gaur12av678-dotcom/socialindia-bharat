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
    const subs = getStoredSubs(subscriberId);
    if (subs.has(creatorId)) return true;
    if (creatorId === 'RTUVtjrw5sPWaiq10OIMiloF8HQ2' && subs.has('socialindia')) return true;
    if (creatorId === 'socialindia' && subs.has('RTUVtjrw5sPWaiq10OIMiloF8HQ2')) return true;
    return false;
  },

  // Check if subscribed to a creator (instant cache with background revalidation and alias resolution)
  async isSubscribed(subscriberId: string, creatorId: string): Promise<boolean> {
    if (!subscriberId || !creatorId) return false;
    if (subscriberId === creatorId) return false;

    const subs = getStoredSubs(subscriberId);
    const isLocallySubbed = this.isSubscribedSync(subscriberId, creatorId);

    const docRef = doc(db, 'users', subscriberId, 'subscriptions', creatorId);
    try {
      const snap = await getDoc(docRef);
      let exists = snap.exists();

      // If checking official account, verify if subscribed under alias or real UID
      if (!exists && (creatorId === 'RTUVtjrw5sPWaiq10OIMiloF8HQ2' || creatorId === 'socialindia')) {
        const altId = creatorId === 'RTUVtjrw5sPWaiq10OIMiloF8HQ2' ? 'socialindia' : 'RTUVtjrw5sPWaiq10OIMiloF8HQ2';
        const altDoc = await getDoc(doc(db, 'users', subscriberId, 'subscriptions', altId));
        if (altDoc.exists()) {
          exists = true;
          // Migrate to real official UID doc and delete dummy alias
          const targetDocRef = doc(db, 'users', subscriberId, 'subscriptions', 'RTUVtjrw5sPWaiq10OIMiloF8HQ2');
          setDoc(targetDocRef, { ...altDoc.data(), creatorId: 'RTUVtjrw5sPWaiq10OIMiloF8HQ2' }).catch(() => {});
          deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', 'socialindia')).catch(() => {});
        }
      }

      if (exists !== isLocallySubbed) {
        if (exists) {
          subs.add(creatorId);
          if (creatorId === 'RTUVtjrw5sPWaiq10OIMiloF8HQ2') subs.add('socialindia');
        } else {
          subs.delete(creatorId);
          if (creatorId === 'RTUVtjrw5sPWaiq10OIMiloF8HQ2' || creatorId === 'socialindia') {
            subs.delete('socialindia');
            subs.delete('RTUVtjrw5sPWaiq10OIMiloF8HQ2');
          }
        }
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

    // Normalize official SocialIndia account UID
    const resolvedCreatorId = (creatorId === 'socialindia' || (creatorData.username || '').toLowerCase() === 'socialindia')
      ? 'RTUVtjrw5sPWaiq10OIMiloF8HQ2'
      : creatorId;

    const docRef = doc(db, 'users', subscriberId, 'subscriptions', resolvedCreatorId);
    try {
      const alreadySubbed = await this.isSubscribed(subscriberId, resolvedCreatorId);
      const shouldSubscribe = targetState !== undefined ? targetState : !alreadySubbed;

      if (!shouldSubscribe) {
        // Unsubscribe
        if (alreadySubbed) {
          await deleteDoc(docRef);
          // Also clean up any legacy alias doc
          if (resolvedCreatorId === 'RTUVtjrw5sPWaiq10OIMiloF8HQ2') {
            deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', 'socialindia')).catch(() => {});
          }

          const subs = getStoredSubs(subscriberId);
          subs.delete(resolvedCreatorId);
          subs.delete(creatorId);
          if (resolvedCreatorId === 'RTUVtjrw5sPWaiq10OIMiloF8HQ2') {
            subs.delete('socialindia');
          }
          saveStoredSubs(subscriberId, subs);

          // Decrement following count of subscriber
          try {
            await updateDoc(doc(db, 'users', subscriberId), {
              followingCount: increment(-1)
            });
          } catch {}
          // Decrement followers count of creator
          try {
            await updateDoc(doc(db, 'users', resolvedCreatorId), {
              followersCount: increment(-1)
            });
            const cProfile = userService.getCachedUserProfile(resolvedCreatorId);
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
          creatorId: resolvedCreatorId,
          creatorUsername: creatorData.username || 'socialindia',
          creatorDisplayName: creatorData.displayName || 'SocialIndia',
          creatorPhotoURL: creatorData.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, subData);

        // Delete any redundant dummy alias if present
        if (resolvedCreatorId === 'RTUVtjrw5sPWaiq10OIMiloF8HQ2') {
          deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', 'socialindia')).catch(() => {});
        }

        const subs = getStoredSubs(subscriberId);
        subs.add(resolvedCreatorId);
        if (resolvedCreatorId === 'RTUVtjrw5sPWaiq10OIMiloF8HQ2') {
          subs.add('socialindia');
        }
        saveStoredSubs(subscriberId, subs);

        if (!alreadySubbed) {
          // Increment following count of subscriber
          try {
            await updateDoc(doc(db, 'users', subscriberId), {
              followingCount: increment(1)
            });
          } catch {}
          // Increment followers count of creator
          try {
            await updateDoc(doc(db, 'users', resolvedCreatorId), {
              followersCount: increment(1)
            });
            const cProfile = userService.getCachedUserProfile(resolvedCreatorId);
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
      handleFirestoreError(err, OperationType.WRITE, `users/${subscriberId}/subscriptions/${resolvedCreatorId}`);
      throw err;
    }
  },

  // Get creators user is subscribed to (Automatically deduplicates duplicate accounts)
  async getSubscriptions(subscriberId: string): Promise<Subscription[]> {
    const colRef = collection(db, 'users', subscriberId, 'subscriptions');
    try {
      const snap = await getDocs(colRef);
      const rawList = snap.docs.map((d: any) => d.data() as Subscription);

      // Clean up and deduplicate (especially if dummy 'socialindia' was saved alongside real 'RTUVtjrw5sPWaiq10OIMiloF8HQ2')
      const seenIds = new Set<string>();
      const seenUsernames = new Set<string>();
      const deduplicated: Subscription[] = [];

      for (const item of rawList) {
        const uName = (item.creatorUsername || '').toLowerCase();
        
        // If dummy 'socialindia' doc exists alongside real account, delete and skip dummy
        if (item.creatorId === 'socialindia' && rawList.some(other => other.creatorId !== 'socialindia' && (other.creatorUsername || '').toLowerCase() === 'socialindia')) {
          deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', 'socialindia')).catch(() => {});
          continue;
        }

        if (seenIds.has(item.creatorId) || (uName && seenUsernames.has(uName))) {
          // Redundant duplicate! Delete redundant doc from Firestore
          deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', item.creatorId)).catch(() => {});
          continue;
        }

        seenIds.add(item.creatorId);
        if (uName) seenUsernames.add(uName);
        deduplicated.push(item);
      }

      // Sync local subs set and persistent list
      const subs = getStoredSubs(subscriberId);
      deduplicated.forEach(d => {
        subs.add(d.creatorId);
        // Pre-cache creator avatar and details
        userService.cacheUserProfile({
          uid: d.creatorId,
          username: d.creatorUsername || '',
          displayName: d.creatorDisplayName || '',
          photoURL: d.creatorPhotoURL || '',
          role: 'creator',
          status: 'active'
        });
      });
      if (subs.has('socialindia') && seenIds.has('RTUVtjrw5sPWaiq10OIMiloF8HQ2')) {
        subs.delete('socialindia');
      }
      saveStoredSubs(subscriberId, subs);

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`si_subs_list_${subscriberId}`, JSON.stringify(deduplicated));
        }
      } catch (_) {}

      return deduplicated;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${subscriberId}/subscriptions`);
      return this.getCachedSubscriptions(subscriberId);
    }
  },

  // Synchronous 0ms retrieval of cached subscribed channels for instant Subscriptions page boot
  getCachedSubscriptions(subscriberId: string): Subscription[] {
    if (!subscriberId || typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`si_subs_list_${subscriberId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (_) {}
    return [];
  }
};
