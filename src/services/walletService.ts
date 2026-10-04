import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CoinTransaction, User, Video } from '../types';

// ANTI-SPAM CONSTANTS
export const DAILY_COIN_CAP = 50; // Maximum 50 SocialCoins earnable per day!

export const REWARD_RATES = {
  watch: 2,       // +2 Coins for watching a video
  like: 1,        // +1 Coin for liking a video
  comment: 2,     // +2 Coins for genuine comment (>5 chars)
  subscribe: 3,   // +3 Coins for subscribing to a channel
  daily: 5,       // +5 Coins for daily login bonus
};

export const SPEND_RATES = {
  promote_video: 50,     // 50 Coins = Boost video for 7 days
  buy_verification: 200, // 200 Coins = Unlock Official Creator Verified Badge ✓
};

export const walletService = {
  generateId(): string {
    return 'tx_' + Math.random().toString(36).substring(2, 11);
  },

  // Get current user coin balance & daily stats
  async getUserWallet(uid: string): Promise<{ coinBalance: number; dailyCoinsEarned: number; lastEarnDate: string }> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const u = snap.data() as User;
        const todayStr = new Date().toISOString().split('T')[0];

        let dailyEarned = u.dailyCoinsEarned || 0;
        let lastDate = u.lastEarnDate || todayStr;

        // Reset daily limit if new day
        if (lastDate !== todayStr) {
          dailyEarned = 0;
          lastDate = todayStr;
          updateDoc(doc(db, 'users', uid), {
            dailyCoinsEarned: 0,
            lastEarnDate: todayStr
          }).catch(console.warn);
        }

        return {
          coinBalance: u.coinBalance || 0,
          dailyCoinsEarned: dailyEarned,
          lastEarnDate: lastDate
        };
      }
      return { coinBalance: 0, dailyCoinsEarned: 0, lastEarnDate: new Date().toISOString().split('T')[0] };
    } catch (err) {
      console.warn('Failed to fetch wallet info:', err);
      return { coinBalance: 0, dailyCoinsEarned: 0, lastEarnDate: new Date().toISOString().split('T')[0] };
    }
  },

  // ANTI-SPAM SAFEGUARD & COIN REWARD SYSTEM
  async awardCoins(
    uid: string, 
    actionType: keyof typeof REWARD_RATES, 
    reason: string, 
    videoId?: string
  ): Promise<{ success: boolean; coinsAwarded: number; message: string }> {
    if (!uid) return { success: false, coinsAwarded: 0, message: 'User not logged in' };

    const rewardAmount = REWARD_RATES[actionType] || 0;
    if (rewardAmount <= 0) return { success: false, coinsAwarded: 0, message: 'Invalid reward' };

    const todayStr = new Date().toISOString().split('T')[0];

    try {
      // 1. Anti-Spam Check: Verify if this specific action/video was already rewarded today
      if (videoId) {
        const q = query(
          collection(db, 'users', uid, 'coin_transactions'),
          where('actionType', '==', actionType),
          where('videoId', '==', videoId)
        );
        const existingTxSnap = await getDocs(q);
        if (!existingTxSnap.empty) {
          return { success: false, coinsAwarded: 0, message: 'Already rewarded for this video' };
        }
      }

      // 2. Fetch User Wallet State
      const wallet = await this.getUserWallet(uid);

      // 3. Daily Cap Safeguard (Max 50 Coins per day)
      if (wallet.dailyCoinsEarned >= DAILY_COIN_CAP) {
        return { 
          success: false, 
          coinsAwarded: 0, 
          message: `Daily reward cap reached (${DAILY_COIN_CAP}/${DAILY_COIN_CAP} Coins). Come back tomorrow!` 
        };
      }

      // Cap reward amount if close to daily cap
      const actualAward = Math.min(rewardAmount, DAILY_COIN_CAP - wallet.dailyCoinsEarned);
      if (actualAward <= 0) return { success: false, coinsAwarded: 0, message: 'Daily limit reached' };

      // 4. Update Firestore User Document
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        coinBalance: increment(actualAward),
        dailyCoinsEarned: increment(actualAward),
        lastEarnDate: todayStr
      });

      // 5. Log Transaction Entry
      const txId = this.generateId();
      const tx: CoinTransaction = {
        id: txId,
        uid,
        type: 'earn',
        amount: actualAward,
        reason,
        actionType,
        timestamp: new Date().toISOString(),
        videoId: videoId || ''
      };

      await setDoc(doc(db, 'users', uid, 'coin_transactions', txId), tx);

      return { 
        success: true, 
        coinsAwarded: actualAward, 
        message: `+${actualAward} SocialCoins earned! (${wallet.dailyCoinsEarned + actualAward}/${DAILY_COIN_CAP} Today)` 
      };

    } catch (err) {
      console.error('Error awarding coins:', err);
      return { success: false, coinsAwarded: 0, message: 'Failed to process reward' };
    }
  },

  // Spend Coins (for Promoting Videos or Unlocking Verification Badge)
  async spendCoins(
    uid: string, 
    amount: number, 
    actionType: 'promote_video' | 'buy_verification' | 'tip', 
    reason: string,
    videoId?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!uid) return { success: false, message: 'User not logged in' };

    try {
      const wallet = await this.getUserWallet(uid);
      if (wallet.coinBalance < amount) {
        return { 
          success: false, 
          message: `Insufficient balance! You need 🪙 ${amount} Coins (Current Balance: 🪙 ${wallet.coinBalance})` 
        };
      }

      // Deduct coins from balance
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        coinBalance: increment(-amount)
      });

      // Log transaction
      const txId = this.generateId();
      const tx: CoinTransaction = {
        id: txId,
        uid,
        type: 'spend',
        amount,
        reason,
        actionType,
        timestamp: new Date().toISOString(),
        videoId: videoId || ''
      };

      await setDoc(doc(db, 'users', uid, 'coin_transactions', txId), tx);

      return { success: true, message: `Successfully spent 🪙 ${amount} SocialCoins!` };

    } catch (err) {
      console.error('Error spending coins:', err);
      return { success: false, message: 'Transaction failed' };
    }
  },

  // Promote / Boost Video using Coins
  async promoteVideoWithCoins(uid: string, videoId: string): Promise<{ success: boolean; message: string }> {
    const cost = SPEND_RATES.promote_video; // 50 Coins
    const res = await this.spendCoins(uid, cost, 'promote_video', 'Promote & Boost Video to Top Featured Feed', videoId);
    
    if (res.success) {
      try {
        const videoRef = doc(db, 'videos', videoId);
        const future7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await updateDoc(videoRef, {
          isPromoted: true,
          promotedUntil: future7Days
        });
        return { success: true, message: `Video boosted for 7 days! Featured on Home feed.` };
      } catch (err) {
        console.error('Could not update video promotion flag:', err);
      }
    }
    return res;
  },

  // Buy Creator Verification Badge using Coins
  async buyVerificationBadgeWithCoins(uid: string): Promise<{ success: boolean; message: string }> {
    const cost = SPEND_RATES.buy_verification; // 200 Coins
    const res = await this.spendCoins(uid, cost, 'buy_verification', 'Unlock Official Creator Verified Badge');

    if (res.success) {
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          role: 'creator'
        });
        return { success: true, message: '🎉 Congratulations! Official Creator Verified Badge ✓ unlocked!' };
      } catch (err) {
        console.error('Could not update user verified role:', err);
      }
    }
    return res;
  },

  // Fetch Coin Transaction History
  async getTransactions(uid: string): Promise<CoinTransaction[]> {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'coin_transactions'));
      const list: CoinTransaction[] = [];
      snap.forEach(d => list.push(d.data() as CoinTransaction));
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      console.warn('Failed to fetch transactions:', err);
      return [];
    }
  }
};
