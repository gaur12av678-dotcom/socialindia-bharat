import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { VerificationRequest, User } from '../types';
import { notificationService } from './notificationService';

export const verificationService = {
  // Submit a new verification request
  async submitVerificationRequest(
    data: Omit<VerificationRequest, 'id' | 'status' | 'submittedAt' | 'updatedAt'>
  ): Promise<string> {
    const requestId = 'vreq_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    const now = new Date().toISOString();

    const requestPayload: VerificationRequest = {
      ...data,
      id: requestId,
      status: 'pending',
      submittedAt: now,
      updatedAt: now
    };

    try {
      // 1. Save to verification_requests collection
      await setDoc(doc(db, 'verification_requests', requestId), requestPayload);

      // 2. Update user profile verification status
      try {
        await updateDoc(doc(db, 'users', data.userId), {
          verificationStatus: 'pending',
          verificationRequestedAt: now,
          verificationRequestId: requestId,
          updatedAt: now
        });
      } catch (userErr) {
        console.warn('Could not update user doc verificationStatus directly:', userErr);
      }

      return requestId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `verification_requests/${requestId}`);
      throw err;
    }
  },

  // Get active or latest verification request for a specific user
  async getUserVerificationRequest(userId: string): Promise<VerificationRequest | null> {
    if (!userId) return null;
    try {
      const q = query(
        collection(db, 'verification_requests'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const items: VerificationRequest[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as VerificationRequest;
        items.push({ ...item, id: d.id });
      });

      // Sort by submittedAt descending to get the latest
      items.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      return items[0] || null;
    } catch (err) {
      console.warn('Error fetching user verification request:', err);
      return null;
    }
  },

  // Get all verification requests for Admin Panel
  async getAllVerificationRequests(): Promise<VerificationRequest[]> {
    try {
      const snapshot = await getDocs(collection(db, 'verification_requests'));
      const items: VerificationRequest[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as VerificationRequest;
        items.push({ ...item, id: d.id });
      });

      // Sort by submittedAt descending (newest first)
      items.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      return items;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'verification_requests');
      return [];
    }
  },

  // Approve a verification request and grant Blue Tick
  async approveVerificationRequest(
    request: VerificationRequest,
    reviewerUid?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    try {
      // 1. Update verification request document
      await updateDoc(doc(db, 'verification_requests', request.id), {
        status: 'approved',
        reviewedBy: reviewerUid || 'admin',
        reviewedAt: now,
        updatedAt: now
      });

      // 2. Update user profile to verified
      await updateDoc(doc(db, 'users', request.userId), {
        isVerified: true,
        verified: true,
        verificationStatus: 'approved',
        updatedAt: now
      });

      // 3. Notify user
      const adminActor: User = {
        uid: reviewerUid || 'system_admin',
        username: 'SocialIndia',
        displayName: 'SocialIndia Official',
        followersCount: 0,
        followingCount: 0,
        videosCount: 0,
        role: 'admin',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };

      notificationService.createNotification(
        request.userId,
        adminActor,
        'comment',
        {
          message: 'Congratulations! Your channel verification request has been approved. You now have the verified Blue Tick badge on SocialIndia.'
        }
      ).catch(console.warn);

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `verification_requests/${request.id}`);
      throw err;
    }
  },

  // Reject a verification request with reason
  async rejectVerificationRequest(
    request: VerificationRequest,
    rejectionReason: string,
    reviewerUid?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    try {
      // 1. Update verification request document
      await updateDoc(doc(db, 'verification_requests', request.id), {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        reviewedBy: reviewerUid || 'admin',
        reviewedAt: now,
        updatedAt: now
      });

      // 2. Update user profile verification status
      await updateDoc(doc(db, 'users', request.userId), {
        isVerified: false,
        verified: false,
        verificationStatus: 'rejected',
        updatedAt: now
      });

      // 3. Notify user with the reason
      const adminActor: User = {
        uid: reviewerUid || 'system_admin',
        username: 'SocialIndia',
        displayName: 'SocialIndia Official',
        followersCount: 0,
        followingCount: 0,
        videosCount: 0,
        role: 'admin',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };

      notificationService.createNotification(
        request.userId,
        adminActor,
        'comment',
        {
          message: `Your channel verification request was reviewed. Reason: "${rejectionReason.trim()}". You may update your details and re-apply in Settings.`
        }
      ).catch(console.warn);

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `verification_requests/${request.id}`);
      throw err;
    }
  },

  // Revoke user verification (removes Blue Tick)
  async revokeVerification(userId: string, requestId?: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: false,
        verified: false,
        verificationStatus: 'none',
        updatedAt: now
      });

      if (requestId) {
        await updateDoc(doc(db, 'verification_requests', requestId), {
          status: 'rejected',
          rejectionReason: 'Verification badge revoked by administrator.',
          updatedAt: now
        }).catch(console.warn);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      throw err;
    }
  }
};
