import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { WithdrawalRequest, User } from '../types';
import { userService } from './userService';
import { notificationService } from './notificationService';

export const payoutService = {
  // Create a new UPI Withdrawal Request
  async createWithdrawalRequest(
    userId: string, 
    amount: number, 
    upiId: string, 
    accountHolderName?: string, 
    phone?: string
  ): Promise<WithdrawalRequest> {
    if (!userId) throw new Error('You must be signed in to request a withdrawal.');
    const cleanUpi = (upiId || '').trim();
    if (!cleanUpi) throw new Error('Please enter a valid UPI ID (e.g. yourname@upi / phone@paytm).');
    
    const withdrawAmount = Number(Number(amount).toFixed(2));
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      throw new Error('Please enter a valid withdrawal amount.');
    }

    // Fetch user profile
    const user = await userService.getUserProfile(userId);
    if (!user) throw new Error('User account not found.');

    // Balance available for withdrawal (mainBalance or walletBalance fallback if mainBalance is not yet set)
    const currentBalance = Number(user.mainBalance ?? 0);
    if (currentBalance < withdrawAmount) {
      throw new Error(
        `Insufficient Balance. You have ₹${currentBalance.toFixed(2)} in your Balance, but requested ₹${withdrawAmount.toFixed(2)}.`
      );
    }

    const now = new Date().toISOString();
    const newBalance = Number(Math.max(0, currentBalance - withdrawAmount).toFixed(2));

    // Deduct immediately from Balance to prevent double withdrawal
    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, {
        mainBalance: newBalance,
        upiId: cleanUpi,
        updatedAt: now
      });
    } catch (e) {
      await setDoc(userRef, {
        mainBalance: newBalance,
        upiId: cleanUpi,
        updatedAt: now
      }, { merge: true });
    }

    // Create withdrawal request doc
    const reqRef = doc(collection(db, 'withdrawal_requests'));
    const requestData: WithdrawalRequest = {
      id: reqRef.id,
      userId,
      username: user.username || 'user',
      displayName: user.displayName || user.username || 'User',
      userEmail: user.email || '',
      userPhotoURL: user.photoURL || '',
      amount: withdrawAmount,
      upiId: cleanUpi,
      accountHolderName: accountHolderName?.trim() || user.displayName || '',
      phone: phone?.trim() || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    await setDoc(reqRef, requestData);

    // Ledger record in wallet_transactions
    try {
      const txRef = doc(collection(db, 'wallet_transactions'));
      await setDoc(txRef, {
        txId: txRef.id,
        userId,
        username: user.username,
        amount: -withdrawAmount,
        type: 'withdrawal_request',
        description: `Requested ₹${withdrawAmount.toFixed(2)} UPI Withdrawal to ${cleanUpi}`,
        status: 'pending',
        createdAt: now
      });
    } catch (e) {
      console.warn('Could not record withdrawal transaction:', e);
    }

    // Send user in-app notification
    try {
      await notificationService.sendSystemNotification(
        userId,
        'Withdrawal Request Submitted',
        `Your withdrawal request of ₹${withdrawAmount.toFixed(2)} to ${cleanUpi} is submitted. Admin will process via Paytm/UPI shortly.`
      );
    } catch (e) {
      console.warn('Notification send failed:', e);
    }

    return requestData;
  },

  // Move money from Wallet (Purchases) -> Balance (Withdrawable)
  async transferWalletToBalance(userId: string, amount: number): Promise<{ newWallet: number; newBalance: number }> {
    if (!userId) throw new Error('User required.');
    const transferAmt = Number(Number(amount).toFixed(2));
    if (isNaN(transferAmt) || transferAmt <= 0) {
      throw new Error('Please enter a valid amount to transfer.');
    }

    const user = await userService.getUserProfile(userId);
    if (!user) throw new Error('User profile not found.');

    const wallet = Number(user.walletBalance || 0);
    const balance = Number(user.mainBalance ?? 0);

    if (wallet < transferAmt) {
      throw new Error(`Insufficient Wallet funds. You have ₹${wallet.toFixed(2)} in Wallet, but requested ₹${transferAmt.toFixed(2)}.`);
    }

    const newWallet = Number(Math.max(0, wallet - transferAmt).toFixed(2));
    const newBalance = Number((balance + transferAmt).toFixed(2));
    const now = new Date().toISOString();

    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, {
        walletBalance: newWallet,
        mainBalance: newBalance,
        updatedAt: now
      });
    } catch (e) {
      await setDoc(userRef, {
        walletBalance: newWallet,
        mainBalance: newBalance,
        updatedAt: now
      }, { merge: true });
    }

    // Record in ledger
    try {
      const txRef = doc(collection(db, 'wallet_transactions'));
      await setDoc(txRef, {
        txId: txRef.id,
        userId,
        username: user.username,
        amount: transferAmt,
        type: 'wallet_to_balance',
        description: `Replenished / Transferred ₹${transferAmt.toFixed(2)} from Wallet to Withdrawable Balance`,
        createdAt: now
      });
    } catch (e) {
      console.warn('Could not record transfer transaction:', e);
    }

    return { newWallet, newBalance };
  },

  // Get all withdrawal requests (or filtered by user)
  async getWithdrawalRequests(userId?: string): Promise<WithdrawalRequest[]> {
    try {
      let q;
      if (userId) {
        q = query(
          collection(db, 'withdrawal_requests'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      } else {
        q = query(
          collection(db, 'withdrawal_requests'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as WithdrawalRequest));
    } catch (err) {
      console.warn('Error fetching withdrawal requests:', err);
      // Fallback without composite index if needed
      try {
        const snap = await getDocs(collection(db, 'withdrawal_requests'));
        let list = snap.docs.map(d => ({ ...d.data(), id: d.id } as WithdrawalRequest));
        if (userId) {
          list = list.filter(r => r.userId === userId);
        }
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (e) {
        return [];
      }
    }
  },

  // Admin marks withdrawal as PAID / Completed (Tick)
  async approveWithdrawal(requestId: string, adminNotes: string = 'Paid via Paytm / UPI'): Promise<void> {
    const docRef = doc(db, 'withdrawal_requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Withdrawal request not found.');

    const reqData = snap.data() as WithdrawalRequest;
    if (reqData.status === 'completed') {
      throw new Error('This request has already been marked as paid.');
    }

    const now = new Date().toISOString();
    await updateDoc(docRef, {
      status: 'completed',
      adminNotes: adminNotes.trim(),
      paidAt: now,
      updatedAt: now
    });

    // Notify user
    try {
      await notificationService.sendSystemNotification(
        reqData.userId,
        'Withdrawal Paid Successfully! 💰',
        `Your withdrawal of ₹${reqData.amount.toFixed(2)} has been transferred to UPI (${reqData.upiId}). Status: Paid.`
      );
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  },

  // Admin rejects withdrawal & automatically refunds money back to user's Balance
  async rejectWithdrawal(requestId: string, reason: string = 'Invalid UPI details or criteria not met'): Promise<void> {
    const docRef = doc(db, 'withdrawal_requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Withdrawal request not found.');

    const reqData = snap.data() as WithdrawalRequest;
    if (reqData.status === 'completed') {
      throw new Error('Cannot reject an already completed payment.');
    }
    if (reqData.status === 'rejected') {
      throw new Error('This request has already been rejected.');
    }

    const now = new Date().toISOString();

    // 1. Refund amount back to user's mainBalance
    const user = await userService.getUserProfile(reqData.userId);
    if (user) {
      const currentBal = Number(user.mainBalance ?? 0);
      const refundedBal = Number((currentBal + reqData.amount).toFixed(2));
      const userRef = doc(db, 'users', reqData.userId);
      try {
        await updateDoc(userRef, {
          mainBalance: refundedBal,
          updatedAt: now
        });
      } catch (e) {
        await setDoc(userRef, {
          mainBalance: refundedBal,
          updatedAt: now
        }, { merge: true });
      }
    }

    // 2. Update request doc
    await updateDoc(docRef, {
      status: 'rejected',
      adminNotes: reason.trim(),
      rejectedAt: now,
      updatedAt: now
    });

    // 3. Notify user
    try {
      await notificationService.sendSystemNotification(
        reqData.userId,
        'Withdrawal Request Rejected & Refunded ❌',
        `Your withdrawal of ₹${reqData.amount.toFixed(2)} was rejected (${reason}). The amount has been refunded back to your Balance.`
      );
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }
};
