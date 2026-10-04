import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User, PrivateUserInfo } from '../types';

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
    const cleanUsername = username.trim().toLowerCase();
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

  // Create user profile
  async createUserProfile(uid: string, profile: Partial<User>): Promise<void> {
    const docRef = doc(db, 'users', uid);
    const now = new Date().toISOString();
    
    const data: User = {
      uid,
      username: (profile.username || '').trim().toLowerCase(),
      email: profile.email || '',
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
      await setDoc(docRef, {
        ...updates,
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

  // Convert points to wallet balance (e.g., 100 points = $1.00 balance)
  async convertPointsToWallet(uid: string, pointsToConvert: number): Promise<{ newPoints: number; newWalletBalance: number }> {
    const user = await this.getUserProfile(uid);
    if (!user) throw new Error('User not found');
    const currentPoints = user.points || 0;
    if (pointsToConvert <= 0 || currentPoints < pointsToConvert) {
      throw new Error(`Insufficient points balance. You need at least ${pointsToConvert} points.`);
    }

    // Rate: 100 points = $1.00 USD (i.e. $0.01 per point)
    const dollarAmount = pointsToConvert * 0.01;
    const newPoints = currentPoints - pointsToConvert;
    const newWalletBalance = Number(((user.walletBalance || 0) + dollarAmount).toFixed(2));

    await this.updateProfile(uid, {
      points: newPoints,
      walletBalance: newWalletBalance
    });

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
  }
};
