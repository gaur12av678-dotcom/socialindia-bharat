import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, limit, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User, PrivateUserInfo, Subscription } from '../types';
import { compressAvatar, compressBanner } from '../utils/imageUtils';

// Ultra-fast in-memory and session caches for YouTube-like instant profile & subscriber rendering
const userProfileMemoryCache = new Map<string, { data: User; timestamp: number }>();
const usernameToUidMap = new Map<string, string>();
const USER_CACHE_TTL_MS = 60000; // 60 seconds TTL with stale-while-revalidate

function saveToLocalUserCache(user: Partial<User> & { uid: string }) {
  if (!user || !user.uid) return;
  const existing = userProfileMemoryCache.get(user.uid)?.data || getFromLocalUserCache(user.uid);
  const merged: User = existing ? {
    ...existing,
    ...user,
    // Preserve existing real subscriber count if incoming partial has 0 or undefined
    followersCount: typeof user.followersCount === 'number' && user.followersCount > 0
      ? user.followersCount
      : (existing.followersCount ?? (typeof user.followersCount === 'number' ? user.followersCount : 0)),
    followingCount: typeof user.followingCount === 'number' && user.followingCount > 0
      ? user.followingCount
      : (existing.followingCount ?? (typeof user.followingCount === 'number' ? user.followingCount : 0)),
    videosCount: typeof user.videosCount === 'number' && user.videosCount > 0
      ? user.videosCount
      : (existing.videosCount ?? (typeof user.videosCount === 'number' ? user.videosCount : 0)),
  } : (user as User);

  userProfileMemoryCache.set(user.uid, { data: merged, timestamp: Date.now() });
  if (merged.username) {
    usernameToUidMap.set(merged.username.trim().toLowerCase(), user.uid);
  }
  try {
    if (typeof window !== 'undefined') {
      const serialized = JSON.stringify(merged);
      if (window.localStorage) {
        localStorage.setItem(`si_u_${user.uid}`, serialized);
        if (merged.username) {
          localStorage.setItem(`si_un_${merged.username.trim().toLowerCase()}`, user.uid);
        }
        // Save to lightweight directory for instant lookup across the app
        try {
          const dirRaw = localStorage.getItem('si_users_directory');
          const dir = dirRaw ? JSON.parse(dirRaw) : {};
          dir[user.uid] = {
            displayName: merged.displayName || merged.username || 'User',
            username: merged.username || '',
            photoURL: merged.photoURL || '',
            followersCount: merged.followersCount || 0,
            country: merged.country || 'India'
          };
          const keys = Object.keys(dir);
          if (keys.length > 250) {
            delete dir[keys[0]];
          }
          localStorage.setItem('si_users_directory', JSON.stringify(dir));
        } catch (_) {}
      }
      if (window.sessionStorage) {
        sessionStorage.setItem(`si_u_${user.uid}`, serialized);
        if (merged.username) {
          sessionStorage.setItem(`si_un_${merged.username.trim().toLowerCase()}`, user.uid);
        }
      }
    }
  } catch (_) {}
}

function getFromLocalUserCache(uid: string): User | null {
  if (!uid) return null;
  const mem = userProfileMemoryCache.get(uid);
  if (mem) return mem.data;
  try {
    if (typeof window !== 'undefined') {
      let raw = window.localStorage ? localStorage.getItem(`si_u_${uid}`) : null;
      if (!raw && window.sessionStorage) {
        raw = sessionStorage.getItem(`si_u_${uid}`);
      }
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        userProfileMemoryCache.set(uid, { data: parsed, timestamp: Date.now() });
        return parsed;
      }
      // Check lightweight directory fallback
      if (window.localStorage) {
        const dirRaw = localStorage.getItem('si_users_directory');
        if (dirRaw) {
          const dir = JSON.parse(dirRaw);
          if (dir && dir[uid]) {
            const entry = dir[uid];
            const fallbackUser: User = {
              uid,
              displayName: entry.displayName || 'User',
              username: entry.username || '',
              photoURL: entry.photoURL || '',
              followersCount: entry.followersCount || 0,
              email: '',
              followingCount: 0,
              videosCount: 0,
              role: 'user',
              status: 'active',
              points: 0,
              walletBalance: 0,
              country: entry.country || 'India',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            return fallbackUser;
          }
        }
      }
    }
  } catch (_) {}
  return null;
}

function getFromLocalUsernameCache(username: string): User | null {
  if (!username) return null;
  const clean = username.replace(/^@/, '').trim().toLowerCase();
  let uid = usernameToUidMap.get(clean);
  if (!uid && typeof window !== 'undefined') {
    if (window.localStorage) {
      uid = localStorage.getItem(`si_un_${clean}`) || undefined;
    }
    if (!uid && window.sessionStorage) {
      uid = sessionStorage.getItem(`si_un_${clean}`) || undefined;
    }
  }
  if (uid) {
    return getFromLocalUserCache(uid);
  }
  // Search in lightweight directory
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const dirRaw = localStorage.getItem('si_users_directory');
      if (dirRaw) {
        const dir = JSON.parse(dirRaw);
        for (const [dirUid, entry] of Object.entries<any>(dir)) {
          if (entry.username && entry.username.trim().toLowerCase() === clean) {
            return getFromLocalUserCache(dirUid);
          }
        }
      }
    }
  } catch (_) {}
  return null;
}

export const userService = {
  // Expose cache manually for prefetching from video/comment payloads
  cacheUserProfile(user: Partial<User> & { uid: string }) {
    saveToLocalUserCache(user);
  },

  // Synchronous 0ms retrieval for instant initial state
  getCachedUserProfile(uid: string): User | null {
    return getFromLocalUserCache(uid);
  },

  getCachedUserByUsername(username: string): User | null {
    return getFromLocalUsernameCache(username);
  },

  // Check if a username is already taken
  async isUsernameTaken(username: string): Promise<boolean> {
    const cleanUsername = username.trim().toLowerCase();
    const q = query(
      collection(db, 'users'),
      where('username', '==', cleanUsername),
      limit(1)
    );
    try {
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
      return true;
    }
  },

  // Get user profile by UID (Fast cache + real Firestore fetch to prevent 0 subscribers bug)
  async getUserProfile(uid: string, forceFresh: boolean = false): Promise<User | null> {
    if (!uid) return null;
    const cached = userProfileMemoryCache.get(uid);
    const now = Date.now();

    // If fresh in memory cache, has positive subscribers, and not forced, return immediately
    if (!forceFresh && cached && now - cached.timestamp < USER_CACHE_TTL_MS && (cached.data.followersCount !== undefined && cached.data.followersCount > 0)) {
      return cached.data;
    }

    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const freshData = snap.data() as User;
        saveToLocalUserCache(freshData);
        return freshData;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      return getFromLocalUserCache(uid);
    }
  },

  // Get user profile by username (Fast cache + real Firestore fetch)
  async getUserByUsername(username: string, forceFresh: boolean = false): Promise<User | null> {
    if (!username) return null;
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    const cached = getFromLocalUsernameCache(cleanUsername);
    const now = Date.now();

    if (!forceFresh && cached) {
      const mem = userProfileMemoryCache.get(cached.uid);
      if (mem && now - mem.timestamp < USER_CACHE_TTL_MS && (cached.followersCount !== undefined && cached.followersCount > 0)) {
        return cached;
      }
    }

    try {
      const q = query(
        collection(db, 'users'),
        where('username', '==', cleanUsername),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const freshData = snap.docs[0].data() as User;
        saveToLocalUserCache(freshData);
        return freshData;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
      return cached;
    }
  },

  // Get user profile by email
  async getUserByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    const q = query(
      collection(db, 'users'),
      where('email', '==', cleanEmail),
      limit(1)
    );
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as User;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
      return null;
    }
  },

  // Create user profile
  async createUserProfile(uid: string, profile: Partial<User>): Promise<void> {
    const docRef = doc(db, 'users', uid);
    const now = new Date().toISOString();
    
    const data: User = {
      uid,
      username: (profile.username || '').trim().toLowerCase(),
      email: profile.email || '',
      emailVerified: profile.emailVerified || false,
      displayName: profile.displayName || profile.username || 'User',
      bio: profile.bio || '',
      photoURL: profile.photoURL || '',
      followersCount: 0,
      followingCount: 0,
      videosCount: 0,
      points: 10, // Welcome points
      walletBalance: 0.00,
      gender: 'Male',
      country: profile.country || 'India',
      age: '',
      paypalEmail: profile.email || '',
      // Admin assignment must be done manually in the Firebase console or Firestore editor for maximum security.
      role: profile.role || 'user',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(docRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  },

  // Update user profile details
  async updateProfile(uid: string, updates: Partial<User>): Promise<void> {
    const docRef = doc(db, 'users', uid);
    try {
      const sanitizedUpdates = { ...updates };

      // Ensure avatar is compressed if raw base64 data URL
      if (sanitizedUpdates.photoURL && sanitizedUpdates.photoURL.startsWith('data:image')) {
        try {
          sanitizedUpdates.photoURL = await compressAvatar(sanitizedUpdates.photoURL);
        } catch (e) {
          console.warn('Avatar compression fallback:', e);
        }
      }

      // Ensure banner is compressed if raw base64 data URL
      if (sanitizedUpdates.bannerURL && sanitizedUpdates.bannerURL.startsWith('data:image')) {
        try {
          sanitizedUpdates.bannerURL = await compressBanner(sanitizedUpdates.bannerURL);
        } catch (e) {
          console.warn('Banner compression fallback:', e);
        }
      }

      await setDoc(docRef, {
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      saveToLocalUserCache({ uid, ...sanitizedUpdates });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  },

  // Increment video count
  async incrementVideoCount(uid: string, amount: number = 1): Promise<void> {
    const docRef = doc(db, 'users', uid);
    try {
      await updateDoc(docRef, {
        videosCount: increment(amount),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  },

  // Award points to user
  async awardPoints(uid: string, amount: number): Promise<void> {
    if (!uid || amount <= 0) return;
    const docRef = doc(db, 'users', uid);
    try {
      await setDoc(docRef, {
        points: increment(amount),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Award points failed:', err);
    }
  },

  // Convert points to wallet balance (100 points = ₹1.00 / $1.00 balance)
  async convertPointsToWallet(uid: string, pointsToConvert: number): Promise<{ newPoints: number; newWalletBalance: number }> {
    if (!uid) throw new Error('User UID is missing');
    const user = await this.getUserProfile(uid);
    if (!user) throw new Error('User profile not found');
    
    const currentPoints = Number(user.points || 0);
    const requestedPoints = Math.floor(Number(pointsToConvert));

    if (requestedPoints <= 0) {
      throw new Error('Please enter a positive number of points to convert.');
    }
    if (currentPoints < requestedPoints) {
      throw new Error(`Insufficient points balance. You have ${currentPoints} points, but requested ${requestedPoints}.`);
    }

    // Rate: 100 points = 1.00 unit (0.01 per point)
    const addedAmount = Number((requestedPoints * 0.01).toFixed(2));
    const newPoints = Math.max(0, currentPoints - requestedPoints);
    const newWalletBalance = Number(((Number(user.walletBalance) || 0) + addedAmount).toFixed(2));

    const userRef = doc(db, 'users', uid);
    try {
      await updateDoc(userRef, {
        points: newPoints,
        walletBalance: newWalletBalance,
        updatedAt: new Date().toISOString()
      });
    } catch (updateErr) {
      await setDoc(userRef, {
        points: newPoints,
        walletBalance: newWalletBalance,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // Record in wallet_transactions ledger safely
    try {
      const txRef = doc(collection(db, 'wallet_transactions'));
      await setDoc(txRef, {
        txId: txRef.id,
        userId: uid,
        username: user.username || 'user',
        amount: addedAmount,
        pointsConverted: requestedPoints,
        type: 'points_to_wallet',
        description: `Converted ${requestedPoints} Points to ₹${addedAmount.toFixed(2)} Wallet Balance`,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not record points conversion transaction:', e);
    }

    return { newPoints, newWalletBalance };
  },

  // Top up / replenish wallet balance
  async replenishWallet(uid: string, amount: number): Promise<number> {
    const user = await this.getUserProfile(uid);
    if (!user) throw new Error('User not found');
    const newBalance = Number(((user.walletBalance || 0) + amount).toFixed(2));
    await this.updateProfile(uid, { walletBalance: newBalance });
    return newBalance;
  },

  // Retrieve private user info
  async getPrivateInfo(uid: string): Promise<PrivateUserInfo | null> {
    const docRef = doc(db, 'users', uid, 'private', 'info');
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as PrivateUserInfo;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`);
      return null;
    }
  },

  // Set or update private info
  async setPrivateInfo(uid: string, info: PrivateUserInfo): Promise<void> {
    const docRef = doc(db, 'users', uid, 'private', 'info');
    try {
      await setDoc(docRef, info);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/info`);
    }
  },

  // Search users by username or display name
  async searchUsers(term: string): Promise<User[]> {
    if (!term.trim()) return [];
    const cleanTerm = term.trim().toLowerCase();
    const q = query(collection(db, 'users'));
    try {
      const snap = await getDocs(q);
      const allUsers = snap.docs.map(d => d.data() as User);
      return allUsers.filter(u => 
        u.username.toLowerCase().includes(cleanTerm) || 
        u.displayName.toLowerCase().includes(cleanTerm)
      ).slice(0, 5); // Limit to top 5 matches
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  // Get all registered users
  async getAllUsers(): Promise<User[]> {
    const q = query(collection(db, 'users'));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as User);
    } catch (err) {
      console.error('Failed to fetch all users:', err);
      return [];
    }
  },

  // Recover or create a profile for an authenticated Firebase user
  async recoverOrCreateProfile(fbUser: any): Promise<User> {
    const existing = await this.getUserProfile(fbUser.uid);
    if (existing) return existing;

    let baseUsername = (fbUser.email?.split('@')[0] || fbUser.displayName || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 15);
    if (baseUsername.length < 3) baseUsername = `user_${baseUsername}`;

    let finalUsername = baseUsername;
    let counter = 1;
    while (await this.isUsernameTaken(finalUsername)) {
      finalUsername = `${baseUsername.slice(0, 13)}_${counter}`;
      counter++;
    }

    const email = fbUser.email || `${finalUsername}@socialindia.com`;
    const displayName = fbUser.displayName || finalUsername;
    const photoURL = fbUser.photoURL || '';

    const newProfile: Partial<User> = {
      username: finalUsername,
      displayName,
      email,
      photoURL,
      emailVerified: fbUser.emailVerified || false,
      role: 'user',
    };

    await this.createUserProfile(fbUser.uid, newProfile);
    const created = await this.getUserProfile(fbUser.uid);
    if (created) {
      await this.ensureDefaultSubscription(created.uid);
    }
    return created || (newProfile as User);
  },

  // Find the official SocialIndia channel account
  async getOfficialSocialIndiaAccount(): Promise<User | null> {
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '==', 'socialindia'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const u = snap.docs[0].data() as User;
        saveToLocalUserCache(u);
        return u;
      }
      const directDoc = await getDoc(doc(db, 'users', 'RTUVtjrw5sPWaiq10OIMiloF8HQ2'));
      if (directDoc.exists()) {
        const u = directDoc.data() as User;
        saveToLocalUserCache(u);
        return u;
      }
      return null;
    } catch (err) {
      console.warn('Error fetching official SocialIndia account:', err);
      return null;
    }
  },

  // Backward compatibility alias
  async ensureSocialIndiaAccount(): Promise<string> {
    const acc = await this.getOfficialSocialIndiaAccount();
    return acc?.uid || 'RTUVtjrw5sPWaiq10OIMiloF8HQ2';
  },

  // Ensure every user account has SocialIndia subscribed by default unless explicitly unsubscribed
  async ensureDefaultSubscription(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const officialUser = await this.getOfficialSocialIndiaAccount();
      const officialUid = officialUser?.uid || 'RTUVtjrw5sPWaiq10OIMiloF8HQ2';

      if (userId === officialUid || userId === 'socialindia') return;

      const privateInfo = await this.getPrivateInfo(userId);
      if (privateInfo && privateInfo.socialIndiaDefaultSubbed) {
        // User has already had default subscription initialized.
        // If they chose to unsubscribe later, respect their decision!
        return;
      }

      // 1. Clean up any stale dummy subscription using 'socialindia' as doc ID
      try {
        const dummyRef = doc(db, 'users', userId, 'subscriptions', 'socialindia');
        const dummySnap = await getDoc(dummyRef);
        if (dummySnap.exists()) {
          await deleteDoc(dummyRef);
        }
      } catch (_) {}

      // 2. Ensure official subscription using the real account UID
      const subRef = doc(db, 'users', userId, 'subscriptions', officialUid);
      const subSnap = await getDoc(subRef);

      if (!subSnap.exists()) {
        const subData: Subscription = {
          subscriberId: userId,
          creatorId: officialUid,
          creatorUsername: officialUser?.username || 'socialindia',
          creatorDisplayName: officialUser?.displayName || 'SocialIndia',
          creatorPhotoURL: officialUser?.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        await setDoc(subRef, subData);

        try {
          await updateDoc(doc(db, 'users', userId), {
            followingCount: increment(1)
          });
        } catch {}
        try {
          await updateDoc(doc(db, 'users', officialUid), {
            followersCount: increment(1)
          });
        } catch {}
      }

      const updatedPrivate = {
        ...(privateInfo || { email: '', theme: 'system' }),
        socialIndiaDefaultSubbed: true
      };
      await this.setPrivateInfo(userId, updatedPrivate);
    } catch (err) {
      console.warn('Ensure default subscription error:', err);
    }
  }
};
