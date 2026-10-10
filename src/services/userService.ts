import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User, PrivateUserInfo } from '../types';
import { compressAvatar, compressBanner } from '../utils/imageUtils';

export const userService = {
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

  // Get user profile by UID
  async getUserProfile(uid: string): Promise<User | null> {
    const docRef = doc(db, 'users', uid);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as User;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      return null;
    }
  },

  // Get user profile by username
  async getUserByUsername(username: string): Promise<User | null> {
    if (!username) return null;
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    const q = query(
      collection(db, 'users'),
      where('username', '==', cleanUsername),
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
      country: '',
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

  // Ensure the main official Social India channel account exists
  async ensureSocialIndiaAccount(): Promise<string> {
    const docRef = doc(db, 'users', 'socialindia');
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const now = new Date().toISOString();
        const socialIndiaUser: User = {
          uid: 'socialindia',
          username: 'socialindia',
          email: 'official@socialindia.us.ci',
          emailVerified: true,
          displayName: 'Social India',
          bio: 'Official SocialIndia Channel - Connect, Share, and Discover with India\'s Own Video Platform.',
          photoURL: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          bannerURL: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80',
          followersCount: 0,
          followingCount: 0,
          videosCount: 0,
          role: 'admin',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(docRef, socialIndiaUser);
      }
      return 'socialindia';
    } catch (err) {
      console.error('Ensure SocialIndia account error:', err);
      return 'socialindia';
    }
  },

  // Ensure every user account has SocialIndia subscribed by default unless explicitly unsubscribed
  async ensureDefaultSubscription(userId: string): Promise<void> {
    if (!userId || userId === 'socialindia') return;
    try {
      const privateInfo = await this.getPrivateInfo(userId);
      if (privateInfo && privateInfo.socialIndiaDefaultSubbed) {
        return;
      }

      const socialIndiaId = await this.ensureSocialIndiaAccount();
      if (userId === socialIndiaId) return;

      const subRef = doc(db, 'users', userId, 'subscriptions', socialIndiaId);
      const subSnap = await getDoc(subRef);

      if (!subSnap.exists()) {
        const socialIndiaUser = await this.getUserProfile(socialIndiaId);
        const subData = {
          subscriberId: userId,
          creatorId: socialIndiaId,
          creatorUsername: socialIndiaUser?.username || 'socialindia',
          creatorDisplayName: socialIndiaUser?.displayName || 'Social India',
          creatorPhotoURL: socialIndiaUser?.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        await setDoc(subRef, subData);

        try {
          await updateDoc(doc(db, 'users', userId), {
            followingCount: increment(1)
          });
        } catch {}
        try {
          await updateDoc(doc(db, 'users', socialIndiaId), {
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
