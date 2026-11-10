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
import { db } from '../firebase';
import { Subscription, User } from '../types';
import { userService } from './userService';

const OFFICIAL_SOCIALINDIA_UID = 'RTUVtjrw5sPWaiq10OIMiloF8HQ2';
const memorySubSet = new Map<string, Set<string>>(); // subscriberId -> Set of creatorIds
const memoryConfirmedSubSet = new Map<string, Set<string>>(); // subscriberId -> Set of creatorIds confirmed synced to Firestore
const memorySubUsernames = new Map<string, Set<string>>(); // subscriberId -> Set of lowercase usernames
const memorySubList = new Map<string, Subscription[]>(); // subscriberId -> Subscription[]
const memoryDirtySubs = new Map<string, Record<string, boolean>>(); // subscriberId -> { [resolvedCreatorId]: shouldSub }

function normalizeCreatorId(creatorId: string, creatorUsername?: string): string {
  if (creatorId === 'socialindia' || (creatorUsername || '').toLowerCase() === 'socialindia') {
    return OFFICIAL_SOCIALINDIA_UID;
  }
  return creatorId;
}

function getStoredSubs(subscriberId: string): Set<string> {
  if (!subscriberId || typeof window === 'undefined') return new Set();
  const mem = memorySubSet.get(subscriberId);
  if (mem) return new Set(mem);
  try {
    const raw = localStorage.getItem(`si_subs_${subscriberId}`);
    if (raw) {
      const set = new Set<string>(JSON.parse(raw));
      memorySubSet.set(subscriberId, set);
      return new Set(set);
    }
  } catch (_) {}
  const empty = new Set<string>();
  memorySubSet.set(subscriberId, empty);
  return new Set();
}

function saveStoredSubs(subscriberId: string, set: Set<string>) {
  if (!subscriberId || typeof window === 'undefined') return;
  const copy = new Set(set);
  memorySubSet.set(subscriberId, copy);
  try {
    localStorage.setItem(`si_subs_${subscriberId}`, JSON.stringify(Array.from(copy)));
  } catch (_) {}
}

function getConfirmedSubs(subscriberId: string): Set<string> {
  if (!subscriberId || typeof window === 'undefined') return new Set();
  const mem = memoryConfirmedSubSet.get(subscriberId);
  if (mem) return new Set(mem);
  try {
    const raw = localStorage.getItem(`si_subs_confirmed_${subscriberId}`);
    if (raw) {
      const set = new Set<string>(JSON.parse(raw));
      memoryConfirmedSubSet.set(subscriberId, set);
      return new Set(set);
    }
  } catch (_) {}
  const empty = new Set<string>();
  memoryConfirmedSubSet.set(subscriberId, empty);
  return new Set();
}

function saveConfirmedSubs(subscriberId: string, set: Set<string>) {
  if (!subscriberId || typeof window === 'undefined') return;
  const copy = new Set(set);
  memoryConfirmedSubSet.set(subscriberId, copy);
  try {
    localStorage.setItem(`si_subs_confirmed_${subscriberId}`, JSON.stringify(Array.from(copy)));
  } catch (_) {}
}

function getStoredSubUsernames(subscriberId: string): Set<string> {
  if (!subscriberId || typeof window === 'undefined') return new Set();
  const mem = memorySubUsernames.get(subscriberId);
  if (mem) return new Set(mem);
  try {
    const raw = localStorage.getItem(`si_subs_usernames_${subscriberId}`);
    if (raw) {
      const set = new Set<string>(JSON.parse(raw));
      memorySubUsernames.set(subscriberId, set);
      return new Set(set);
    }
  } catch (_) {}
  const empty = new Set<string>();
  memorySubUsernames.set(subscriberId, empty);
  return new Set();
}

function saveStoredSubUsernames(subscriberId: string, set: Set<string>) {
  if (!subscriberId || typeof window === 'undefined') return;
  const copy = new Set(set);
  memorySubUsernames.set(subscriberId, copy);
  try {
    localStorage.setItem(`si_subs_usernames_${subscriberId}`, JSON.stringify(Array.from(copy)));
  } catch (_) {}
}

function getStoredSubList(subscriberId: string): Subscription[] {
  if (!subscriberId || typeof window === 'undefined') return [];
  const mem = memorySubList.get(subscriberId);
  if (mem) return [...mem];
  try {
    const raw = localStorage.getItem(`si_subs_list_${subscriberId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Subscription[];
      if (Array.isArray(parsed)) {
        memorySubList.set(subscriberId, parsed);
        return [...parsed];
      }
    }
  } catch (_) {}
  return [];
}

function saveStoredSubList(subscriberId: string, list: Subscription[]) {
  if (!subscriberId || typeof window === 'undefined') return;
  const copy = [...list];
  memorySubList.set(subscriberId, copy);
  try {
    localStorage.setItem(`si_subs_list_${subscriberId}`, JSON.stringify(copy));
  } catch (_) {}
}

function getDirtySubs(subscriberId: string): Record<string, boolean> {
  if (!subscriberId || typeof window === 'undefined') return {};
  const mem = memoryDirtySubs.get(subscriberId);
  if (mem) return { ...mem };
  try {
    const raw = localStorage.getItem(`si_subs_dirty_${subscriberId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      if (parsed && typeof parsed === 'object') {
        memoryDirtySubs.set(subscriberId, parsed);
        return { ...parsed };
      }
    }
  } catch (_) {}
  return {};
}

function setDirtySub(subscriberId: string, creatorId: string, state: boolean | null) {
  if (!subscriberId || !creatorId || typeof window === 'undefined') return;
  const dirty = getDirtySubs(subscriberId);
  if (state === null) {
    delete dirty[creatorId];
  } else {
    dirty[creatorId] = state;
  }
  memoryDirtySubs.set(subscriberId, dirty);
  try {
    localStorage.setItem(`si_subs_dirty_${subscriberId}`, JSON.stringify(dirty));
  } catch (_) {}
}

export const subscriptionService = {
  // Synchronous 0ms check for instant subscription rendering on page load
  isSubscribedSync(subscriberId: string, creatorId: string, creatorUsername?: string): boolean {
    if (!subscriberId || !creatorId || subscriberId === creatorId) return false;
    const resolved = normalizeCreatorId(creatorId, creatorUsername);
    const dirty = getDirtySubs(subscriberId);
    if (Object.prototype.hasOwnProperty.call(dirty, resolved)) {
      return Boolean(dirty[resolved]);
    }
    if (Object.prototype.hasOwnProperty.call(dirty, creatorId)) {
      return Boolean(dirty[creatorId]);
    }
    const subs = getStoredSubs(subscriberId);
    if (subs.has(creatorId) || subs.has(resolved)) return true;
    if (resolved === OFFICIAL_SOCIALINDIA_UID && subs.has('socialindia')) return true;
    if (creatorId === 'socialindia' && subs.has(OFFICIAL_SOCIALINDIA_UID)) return true;

    const cleanUsername = (creatorUsername || '').trim().toLowerCase();
    if (cleanUsername) {
      const usernames = getStoredSubUsernames(subscriberId);
      if (usernames.has(cleanUsername)) return true;
      const subList = getStoredSubList(subscriberId);
      if (subList.some(s => (s.creatorUsername || '').trim().toLowerCase() === cleanUsername)) {
        return true;
      }
    }
    return false;
  },

  // Check if subscribed to a creator (respects local state + confirmed sync + revalidates Firestore)
  async isSubscribed(subscriberId: string, creatorId: string, creatorUsername?: string): Promise<boolean> {
    if (!subscriberId || !creatorId) return false;
    if (subscriberId === creatorId) return false;

    const resolvedId = normalizeCreatorId(creatorId, creatorUsername);
    const cleanUsername = (creatorUsername || '').trim().toLowerCase();
    const dirty = getDirtySubs(subscriberId);
    const subs = getStoredSubs(subscriberId);
    const confirmed = getConfirmedSubs(subscriberId);
    const usernames = getStoredSubUsernames(subscriberId);
    const subList = getStoredSubList(subscriberId);

    // If there is a pending local toggle, honour it and try to flush it in background
    if (Object.prototype.hasOwnProperty.call(dirty, resolvedId)) {
      const desiredState = Boolean(dirty[resolvedId]);
      const docRef = doc(db, 'users', subscriberId, 'subscriptions', resolvedId);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists() === desiredState) {
          setDirtySub(subscriberId, resolvedId, null);
          if (desiredState) {
            confirmed.add(resolvedId);
            saveConfirmedSubs(subscriberId, confirmed);
          }
        } else if (desiredState) {
          const cachedItem = subList.find(s => normalizeCreatorId(s.creatorId, s.creatorUsername) === resolvedId);
          await setDoc(docRef, cachedItem || {
            subscriberId,
            creatorId: resolvedId,
            creatorUsername: creatorUsername || 'creator',
            creatorDisplayName: creatorUsername || 'Creator',
            creatorPhotoURL: '',
            createdAt: new Date().toISOString()
          });
          setDirtySub(subscriberId, resolvedId, null);
          confirmed.add(resolvedId);
          saveConfirmedSubs(subscriberId, confirmed);
        } else {
          await deleteDoc(docRef);
          setDirtySub(subscriberId, resolvedId, null);
          confirmed.delete(resolvedId);
          saveConfirmedSubs(subscriberId, confirmed);
        }
      } catch (_) {}
      return desiredState;
    }

    const isLocallySubbed = this.isSubscribedSync(subscriberId, creatorId, creatorUsername);
    const docRef = doc(db, 'users', subscriberId, 'subscriptions', resolvedId);

    try {
      const snap = await getDoc(docRef);
      let exists = snap.exists();

      // Fallback check by raw creatorId if different from resolvedId
      if (!exists && creatorId !== resolvedId) {
        const rawSnap = await getDoc(doc(db, 'users', subscriberId, 'subscriptions', creatorId));
        if (rawSnap.exists()) {
          exists = true;
        }
      }

      // Check legacy alias for official SocialIndia account
      if (!exists && (resolvedId === OFFICIAL_SOCIALINDIA_UID || creatorId === 'socialindia')) {
        const altId = resolvedId === OFFICIAL_SOCIALINDIA_UID ? 'socialindia' : OFFICIAL_SOCIALINDIA_UID;
        const altDoc = await getDoc(doc(db, 'users', subscriberId, 'subscriptions', altId));
        if (altDoc.exists()) {
          exists = true;
          const targetDocRef = doc(db, 'users', subscriberId, 'subscriptions', OFFICIAL_SOCIALINDIA_UID);
          setDoc(targetDocRef, { ...altDoc.data(), creatorId: OFFICIAL_SOCIALINDIA_UID }).catch(() => {});
          deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', 'socialindia')).catch(() => {});
        }
      }

      if (exists) {
        subs.add(resolvedId);
        if (creatorId) subs.add(creatorId);
        if (resolvedId === OFFICIAL_SOCIALINDIA_UID) subs.add('socialindia');
        saveStoredSubs(subscriberId, subs);

        confirmed.add(resolvedId);
        if (creatorId) confirmed.add(creatorId);
        saveConfirmedSubs(subscriberId, confirmed);

        if (cleanUsername) {
          usernames.add(cleanUsername);
          saveStoredSubUsernames(subscriberId, usernames);
        }
        return true;
      }

      // Firestore returned !exists
      if (isLocallySubbed) {
        const wasConfirmedOnServer = confirmed.has(resolvedId) || confirmed.has(creatorId);
        if (!wasConfirmedOnServer) {
          // Local follow has never been confirmed on Firestore yet (e.g., transient sync issue or reload before write flushed).
          // NEVER wipe it on reload — keep true locally and retry syncing to Firestore!
          const cachedItem = subList.find(
            s => normalizeCreatorId(s.creatorId, s.creatorUsername) === resolvedId ||
                 (cleanUsername && (s.creatorUsername || '').trim().toLowerCase() === cleanUsername)
          );
          const retryData: Subscription = cachedItem
            ? { ...cachedItem, subscriberId, creatorId: resolvedId }
            : {
                subscriberId,
                creatorId: resolvedId,
                creatorUsername: creatorUsername || 'creator',
                creatorDisplayName: creatorUsername || 'Creator',
                creatorPhotoURL: '',
                createdAt: new Date().toISOString()
              };
          setDoc(docRef, retryData)
            .then(() => {
              const nextConfirmed = getConfirmedSubs(subscriberId);
              nextConfirmed.add(resolvedId);
              if (creatorId) nextConfirmed.add(creatorId);
              saveConfirmedSubs(subscriberId, nextConfirmed);
            })
            .catch(() => {});
          return true;
        }

        // Was previously confirmed on Firestore, now absent remotely -> sync removal
        subs.delete(resolvedId);
        subs.delete(creatorId);
        confirmed.delete(resolvedId);
        confirmed.delete(creatorId);
        if (resolvedId === OFFICIAL_SOCIALINDIA_UID || creatorId === 'socialindia') {
          subs.delete('socialindia');
          subs.delete(OFFICIAL_SOCIALINDIA_UID);
          confirmed.delete('socialindia');
          confirmed.delete(OFFICIAL_SOCIALINDIA_UID);
        }
        if (cleanUsername) {
          usernames.delete(cleanUsername);
          saveStoredSubUsernames(subscriberId, usernames);
        }
        saveStoredSubs(subscriberId, subs);
        saveConfirmedSubs(subscriberId, confirmed);
      }

      return false;
    } catch (_) {
      return isLocallySubbed;
    }
  },

  // Toggle subscription/follow (Instant local persistence + resilient Firestore sync)
  async toggleSubscription(
    subscriberId: string,
    creatorId: string,
    creatorData: Partial<User>,
    targetState?: boolean
  ): Promise<boolean> {
    if (!subscriberId || !creatorId || subscriberId === creatorId) return false;

    const resolvedCreatorId = normalizeCreatorId(creatorId, creatorData.username);
    const cleanUsername = (creatorData.username || '').trim().toLowerCase();
    const currentlySubbed = this.isSubscribedSync(subscriberId, creatorId, creatorData.username);
    const shouldSubscribe = targetState !== undefined ? targetState : !currentlySubbed;

    // 1. Update local storage & caches immediately
    const subs = getStoredSubs(subscriberId);
    const confirmed = getConfirmedSubs(subscriberId);
    const usernames = getStoredSubUsernames(subscriberId);
    const existingList = getStoredSubList(subscriberId);

    if (!shouldSubscribe) {
      subs.delete(resolvedCreatorId);
      subs.delete(creatorId);
      confirmed.delete(resolvedCreatorId);
      confirmed.delete(creatorId);
      if (resolvedCreatorId === OFFICIAL_SOCIALINDIA_UID) {
        subs.delete('socialindia');
        confirmed.delete('socialindia');
      }
      if (cleanUsername) {
        usernames.delete(cleanUsername);
        saveStoredSubUsernames(subscriberId, usernames);
      }
      saveStoredSubs(subscriberId, subs);
      saveConfirmedSubs(subscriberId, confirmed);
      setDirtySub(subscriberId, resolvedCreatorId, false);
      if (creatorId !== resolvedCreatorId) setDirtySub(subscriberId, creatorId, false);

      const filteredList = existingList.filter(
        s => s.creatorId !== resolvedCreatorId &&
             s.creatorId !== creatorId &&
             s.creatorId !== 'socialindia' &&
             (!cleanUsername || (s.creatorUsername || '').trim().toLowerCase() !== cleanUsername)
      );
      saveStoredSubList(subscriberId, filteredList);

      if (currentlySubbed) {
        const cProfile = userService.getCachedUserProfile(resolvedCreatorId);
        if (cProfile) {
          userService.cacheUserProfile({
            ...cProfile,
            followersCount: Math.max(0, (cProfile.followersCount || 1) - 1)
          });
        }
      }
    } else {
      subs.add(resolvedCreatorId);
      if (creatorId) subs.add(creatorId);
      if (resolvedCreatorId === OFFICIAL_SOCIALINDIA_UID) {
        subs.add('socialindia');
      }
      if (cleanUsername) {
        usernames.add(cleanUsername);
        saveStoredSubUsernames(subscriberId, usernames);
      }
      saveStoredSubs(subscriberId, subs);
      setDirtySub(subscriberId, resolvedCreatorId, true);

      const cachedCreator = userService.getCachedUserProfile(resolvedCreatorId);
      const subData: Subscription = {
        subscriberId,
        creatorId: resolvedCreatorId,
        creatorUsername: creatorData.username || cachedCreator?.username || 'creator',
        creatorDisplayName: creatorData.displayName || cachedCreator?.displayName || creatorData.username || 'Creator',
        creatorPhotoURL: creatorData.photoURL || cachedCreator?.photoURL || '',
        createdAt: new Date().toISOString()
      };

      const filteredList = existingList.filter(
        s => s.creatorId !== resolvedCreatorId && s.creatorId !== creatorId
      );
      saveStoredSubList(subscriberId, [subData, ...filteredList]);

      if (!currentlySubbed) {
        if (cachedCreator) {
          userService.cacheUserProfile({
            ...cachedCreator,
            followersCount: (cachedCreator.followersCount || 0) + 1
          });
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('socialindia:subscription_changed', {
          detail: { creatorId: resolvedCreatorId, rawCreatorId: creatorId, creatorUsername: cleanUsername, subscribed: shouldSubscribe }
        })
      );
    }

    // 2. Sync to Firestore without failing or rolling back user state
    const docRef = doc(db, 'users', subscriberId, 'subscriptions', resolvedCreatorId);
    try {
      if (!shouldSubscribe) {
        await deleteDoc(docRef);
        if (creatorId !== resolvedCreatorId) {
          deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', creatorId)).catch(() => {});
        }
        if (resolvedCreatorId === OFFICIAL_SOCIALINDIA_UID) {
          deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', 'socialindia')).catch(() => {});
        }
        setDirtySub(subscriberId, resolvedCreatorId, null);
        setDirtySub(subscriberId, creatorId, null);

        if (currentlySubbed) {
          updateDoc(doc(db, 'users', subscriberId), { followingCount: increment(-1) }).catch(() => {});
          updateDoc(doc(db, 'users', resolvedCreatorId), { followersCount: increment(-1) }).catch(() => {});
        }
      } else {
        const subData: Subscription = {
          subscriberId,
          creatorId: resolvedCreatorId,
          creatorUsername: creatorData.username || 'creator',
          creatorDisplayName: creatorData.displayName || creatorData.username || 'Creator',
          creatorPhotoURL: creatorData.photoURL || '',
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, subData);
        if (resolvedCreatorId === OFFICIAL_SOCIALINDIA_UID) {
          deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', 'socialindia')).catch(() => {});
        }
        setDirtySub(subscriberId, resolvedCreatorId, null);
        setDirtySub(subscriberId, creatorId, null);

        const nextConfirmed = getConfirmedSubs(subscriberId);
        nextConfirmed.add(resolvedCreatorId);
        if (creatorId) nextConfirmed.add(creatorId);
        saveConfirmedSubs(subscriberId, nextConfirmed);

        if (!currentlySubbed) {
          updateDoc(doc(db, 'users', subscriberId), { followingCount: increment(1) }).catch(() => {});
          updateDoc(doc(db, 'users', resolvedCreatorId), { followersCount: increment(1) }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Subscription persisted locally; Firestore sync deferred:', err);
    }

    return shouldSubscribe;
  },

  // Get creators user is subscribed to (merges Firestore + pending/unconfirmed local follows, deduplicates)
  async getSubscriptions(subscriberId: string): Promise<Subscription[]> {
    if (!subscriberId) return [];
    const dirty = getDirtySubs(subscriberId);
    const localList = getStoredSubList(subscriberId);
    const confirmed = getConfirmedSubs(subscriberId);
    const colRef = collection(db, 'users', subscriberId, 'subscriptions');

    let rawList: Subscription[] = [];
    let fetchedFromFirestore = false;

    try {
      const snap = await getDocs(colRef);
      rawList = snap.docs.map((d: any) => d.data() as Subscription);
      fetchedFromFirestore = true;
    } catch (err) {
      console.warn('Could not fetch subscriptions from Firestore, using local cache:', err);
      rawList = localList;
    }

    // Mark Firestore-present subs as confirmed
    if (fetchedFromFirestore) {
      for (const r of rawList) {
        if (r?.creatorId) {
          confirmed.add(normalizeCreatorId(r.creatorId, r.creatorUsername));
          confirmed.add(r.creatorId);
        }
      }
      saveConfirmedSubs(subscriberId, confirmed);
    }

    // Merge pending or unconfirmed local follows so reloads never drop locally followed creators
    const combinedRaw = [...rawList];
    const seenRawIds = new Set(rawList.map(r => normalizeCreatorId(r.creatorId, r.creatorUsername)));

    for (const localItem of localList) {
      const normId = normalizeCreatorId(localItem.creatorId, localItem.creatorUsername);
      const isExplicitlyUnfollowed = dirty[normId] === false || dirty[localItem.creatorId] === false;
      const isPendingOrUnconfirmed = dirty[normId] === true || (!confirmed.has(normId) && !confirmed.has(localItem.creatorId));
      if (!seenRawIds.has(normId) && !isExplicitlyUnfollowed && (isPendingOrUnconfirmed || !fetchedFromFirestore)) {
        combinedRaw.push(localItem);
        seenRawIds.add(normId);
        if (fetchedFromFirestore) {
          setDoc(doc(db, 'users', subscriberId, 'subscriptions', normId), {
            ...localItem,
            subscriberId,
            creatorId: normId
          }).catch(() => {});
        }
      }
    }

    const seenIds = new Set<string>();
    const seenUsernames = new Set<string>();
    const deduplicated: Subscription[] = [];

    for (const item of combinedRaw) {
      if (!item?.creatorId) continue;
      const normId = normalizeCreatorId(item.creatorId, item.creatorUsername);

      // Skip items that were explicitly unfollowed locally
      if (dirty[normId] === false || dirty[item.creatorId] === false) {
        continue;
      }

      const uName = (item.creatorUsername || '').trim().toLowerCase();

      if (
        item.creatorId === 'socialindia' &&
        combinedRaw.some(
          other => other.creatorId !== 'socialindia' && (other.creatorUsername || '').toLowerCase() === 'socialindia'
        )
      ) {
        deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', 'socialindia')).catch(() => {});
        continue;
      }

      if (seenIds.has(normId) || (uName && seenUsernames.has(uName))) {
        if (item.creatorId !== normId) {
          deleteDoc(doc(db, 'users', subscriberId, 'subscriptions', item.creatorId)).catch(() => {});
        }
        continue;
      }

      seenIds.add(normId);
      if (uName) seenUsernames.add(uName);
      deduplicated.push({ ...item, creatorId: normId });
    }

    // Sync local subs set, usernames, and persistent list
    const subs = getStoredSubs(subscriberId);
    const usernames = getStoredSubUsernames(subscriberId);
    for (const [id, isSub] of Object.entries(dirty)) {
      if (isSub === false) subs.delete(id);
    }
    deduplicated.forEach(d => {
      subs.add(d.creatorId);
      if (d.creatorUsername) usernames.add(d.creatorUsername.trim().toLowerCase());
      const existing = userService.getCachedUserProfile(d.creatorId);
      userService.cacheUserProfile({
        uid: d.creatorId,
        username: d.creatorUsername || existing?.username || '',
        displayName: d.creatorDisplayName || existing?.displayName || '',
        photoURL: d.creatorPhotoURL || existing?.photoURL || '',
        role: existing?.role || 'user',
        isVerified: existing?.isVerified || false,
        isPro: existing?.isPro || false,
        status: 'active'
      });
    });
    if (subs.has('socialindia') && seenIds.has(OFFICIAL_SOCIALINDIA_UID)) {
      subs.delete('socialindia');
    }
    saveStoredSubs(subscriberId, subs);
    saveStoredSubUsernames(subscriberId, usernames);
    saveStoredSubList(subscriberId, deduplicated);

    return deduplicated;
  },

  // Synchronous 0ms retrieval of cached subscribed channels for instant Subscriptions page boot
  getCachedSubscriptions(subscriberId: string): Subscription[] {
    if (!subscriberId || typeof window === 'undefined') return [];
    const dirty = getDirtySubs(subscriberId);
    return getStoredSubList(subscriberId).filter(item => {
      const normId = normalizeCreatorId(item.creatorId, item.creatorUsername);
      return dirty[normId] !== false && dirty[item.creatorId] !== false;
    });
  }
};
