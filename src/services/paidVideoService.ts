import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  increment, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Video, VideoPurchase, User } from '../types';
import { userService } from './userService';

export const paidVideoService = {
  // Check if a viewer has unlocked/purchased a video
  async hasUserPurchasedVideo(userId: string, videoId: string): Promise<boolean> {
    if (!userId || !videoId) return false;
    const docId = `${userId}_${videoId}`;
    const docRef = doc(db, 'video_purchases', docId);
    try {
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (err) {
      console.warn('hasUserPurchasedVideo check error:', err);
      return false;
    }
  },

  // Purchase / Unlock a paid video with viewer's wallet and/or bonus balance
  async purchaseVideo(buyerUid: string, video: Video): Promise<VideoPurchase> {
    if (!buyerUid) throw new Error('You must be signed in to purchase this video.');
    if (!video || !video.videoId) throw new Error('Invalid video.');

    const price = Number(video.price || 0);
    if (price <= 0) {
      throw new Error('This video is free.');
    }

    // Check if already purchased
    const purchaseDocId = `${buyerUid}_${video.videoId}`;
    const purchaseRef = doc(db, 'video_purchases', purchaseDocId);
    const existingSnap = await getDoc(purchaseRef);
    if (existingSnap.exists()) {
      return existingSnap.data() as VideoPurchase;
    }

    // Fetch buyer profile
    const buyer = await userService.getUserProfile(buyerUid);
    if (!buyer) throw new Error('User profile not found.');

    const walletBalance = Number(buyer.walletBalance || 0);
    const bonusBalance = Number(buyer.bonusBalance || 0);
    const totalAvailable = Number((walletBalance + bonusBalance).toFixed(2));

    if (totalAvailable < price) {
      throw new Error(
        `Insufficient balance. Video price is ₹${price.toFixed(2)}, but you only have ₹${totalAvailable.toFixed(2)} (Wallet: ₹${walletBalance.toFixed(2)}, Bonus: ₹${bonusBalance.toFixed(2)}).`
      );
    }

    // Deduct from buyer: use bonusBalance first, then walletBalance
    const bonusDeduct = Number(Math.min(bonusBalance, price).toFixed(2));
    const walletDeduct = Number((price - bonusDeduct).toFixed(2));
    const newBonus = Number(Math.max(0, bonusBalance - bonusDeduct).toFixed(2));
    const newWallet = Number(Math.max(0, walletBalance - walletDeduct).toFixed(2));

    // 1. Update buyer wallet & bonus
    await updateDoc(doc(db, 'users', buyerUid), {
      bonusBalance: newBonus,
      walletBalance: newWallet,
      updatedAt: new Date().toISOString()
    });

    // 2. 100% of price is credited to creator's wallet
    const creatorRef = doc(db, 'users', video.creatorId);
    try {
      await updateDoc(creatorRef, {
        walletBalance: increment(price),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Could not increment creator wallet directly, attempting setDoc merge:', err);
      const creator = await userService.getUserProfile(video.creatorId);
      if (creator) {
        const creatorNewBal = Number(((creator.walletBalance || 0) + price).toFixed(2));
        await updateDoc(creatorRef, {
          walletBalance: creatorNewBal,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 3. Increment video paid sales & earnings
    const videoRef = doc(db, 'videos', video.videoId);
    try {
      await updateDoc(videoRef, {
        paidSalesCount: increment(1),
        paidEarnings: increment(price),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to update video stats:', err);
    }

    // 4. Record the purchase transaction
    const now = new Date().toISOString();
    const purchaseData: VideoPurchase = {
      purchaseId: purchaseDocId,
      videoId: video.videoId,
      videoTitle: video.title || 'Paid Video',
      videoThumbnailUrl: video.thumbnailUrl || '',
      creatorId: video.creatorId,
      creatorUsername: video.creatorUsername,
      userId: buyerUid,
      username: buyer.username,
      userDisplayName: buyer.displayName || buyer.username,
      amount: price,
      paidWith: bonusDeduct > 0 ? (walletDeduct > 0 ? 'hybrid' : 'bonus') : 'wallet',
      createdAt: now
    };

    await setDoc(purchaseRef, purchaseData);

    return purchaseData;
  },

  // Get all purchases of videos made by a specific creator (for Creator Studio Earn tab)
  async getCreatorPurchases(creatorId: string): Promise<VideoPurchase[]> {
    if (!creatorId) return [];
    try {
      const q = query(
        collection(db, 'video_purchases'),
        where('creatorId', '==', creatorId)
      );
      const snap = await getDocs(q);
      const list: VideoPurchase[] = [];
      snap.forEach(d => list.push(d.data() as VideoPurchase));
      // Sort newest first
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('getCreatorPurchases error:', err);
      return [];
    }
  },

  // Get purchases made by a specific user
  async getUserPurchases(userId: string): Promise<VideoPurchase[]> {
    if (!userId) return [];
    try {
      const q = query(
        collection(db, 'video_purchases'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const list: VideoPurchase[] = [];
      snap.forEach(d => list.push(d.data() as VideoPurchase));
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('getUserPurchases error:', err);
      return [];
    }
  },

  // Get all paid videos on the platform (for Admin panel)
  async getAllPaidVideos(): Promise<Video[]> {
    try {
      const q = query(
        collection(db, 'videos'),
        where('isPaid', '==', true)
      );
      const snap = await getDocs(q);
      const list: Video[] = [];
      snap.forEach(d => list.push(d.data() as Video));
      return list.sort((a, b) => (b.paidEarnings || 0) - (a.paidEarnings || 0));
    } catch (err) {
      console.warn('getAllPaidVideos error:', err);
      return [];
    }
  },

  // Get all purchases on platform (for Admin oversight)
  async getAllPurchases(): Promise<VideoPurchase[]> {
    try {
      const snap = await getDocs(collection(db, 'video_purchases'));
      const list: VideoPurchase[] = [];
      snap.forEach(d => list.push(d.data() as VideoPurchase));
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('getAllPurchases error:', err);
      return [];
    }
  },

  // Admin Tool: Add Bonus Money or Direct Wallet Money to a user's account
  async addBonusMoney(
    userId: string, 
    amount: number, 
    reason: string = 'Admin Promotion Bonus',
    target: 'bonus' | 'wallet' = 'bonus'
  ): Promise<{ newBonus: number; newWallet: number }> {
    if (!userId || amount <= 0) throw new Error('Invalid user or amount.');
    const userRef = doc(db, 'users', userId);
    const user = await userService.getUserProfile(userId);
    if (!user) throw new Error('User not found.');

    const currentBonus = Number(user.bonusBalance || 0);
    const currentWallet = Number(user.walletBalance || 0);

    const newBonus = target === 'bonus' 
      ? Number((currentBonus + amount).toFixed(2)) 
      : currentBonus;
    const newWallet = target === 'wallet' 
      ? Number((currentWallet + amount).toFixed(2)) 
      : currentWallet;

    // Use setDoc with merge so it never fails even if fields were missing
    await setDoc(userRef, {
      bonusBalance: newBonus,
      walletBalance: newWallet,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Record in wallet_transactions ledger
    try {
      const txRef = doc(collection(db, 'wallet_transactions'));
      await setDoc(txRef, {
        txId: txRef.id,
        userId,
        username: user.username,
        amount,
        target,
        type: target === 'bonus' ? 'bonus_credit' : 'wallet_credit',
        description: reason || (target === 'bonus' ? 'Admin Added Bonus Money' : 'Admin Added Wallet Balance'),
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not record wallet transaction:', e);
    }

    return { newBonus, newWallet };
  },

  // Convert Bonus Money to Withdrawable Wallet Balance
  async convertBonusToWallet(userId: string, amount: number): Promise<{ newBonus: number; newWallet: number }> {
    if (!userId || amount <= 0) throw new Error('Invalid amount to convert.');
    const userRef = doc(db, 'users', userId);
    const user = await userService.getUserProfile(userId);
    if (!user) throw new Error('User not found.');

    const currentBonus = Number(user.bonusBalance || 0);
    const currentWallet = Number(user.walletBalance || 0);

    if (currentBonus < amount) {
      throw new Error(`Insufficient bonus balance. Available bonus is ₹${currentBonus.toFixed(2)}.`);
    }

    const newBonus = Number((currentBonus - amount).toFixed(2));
    const newWallet = Number((currentWallet + amount).toFixed(2));

    await setDoc(userRef, {
      bonusBalance: newBonus,
      walletBalance: newWallet,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    try {
      const txRef = doc(collection(db, 'wallet_transactions'));
      await setDoc(txRef, {
        txId: txRef.id,
        userId,
        username: user.username,
        amount,
        type: 'bonus_to_wallet',
        description: 'Converted Bonus Money to Wallet Balance',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not record wallet transaction:', e);
    }

    return { newBonus, newWallet };
  }
};
