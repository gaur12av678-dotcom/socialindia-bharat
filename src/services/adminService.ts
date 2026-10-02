import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User, Video, Report } from '../types';
import { userService } from './userService';

export const adminService = {
  // Fetch all users for administrative overview
  async getAllUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => d.data() as User);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
      return [];
    }
  },

  // Fetch all videos for administrative control
  async getAllVideos(): Promise<Video[]> {
    try {
      const snap = await getDocs(collection(db, 'videos'));
      return snap.docs.map(d => d.data() as Video);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'videos');
      return [];
    }
  },

  // Fetch all reports submitted by users
  async getAllReports(): Promise<Report[]> {
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as Report);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'reports');
      return [];
    }
  },

  // Update a report's resolution status
  async updateReportStatus(reportId: string, status: Report['status']): Promise<void> {
    try {
      await updateDoc(doc(db, 'reports', reportId), { 
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  },

  // Update user status (e.g., active, suspended)
  async updateUserStatus(uid: string, status: User['status']): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },

  // Update video status (e.g., published, hidden, removed)
  async updateVideoStatus(videoId: string, status: Video['status']): Promise<void> {
    try {
      await updateDoc(doc(db, 'videos', videoId), { 
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `videos/${videoId}`);
    }
  },

  // Delete a video permanently
  async deleteVideo(videoId: string, creatorId?: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'videos', videoId));
      if (creatorId) {
        await userService.incrementVideoCount(creatorId, -1);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `videos/${videoId}`);
      throw err;
    }
  },

  // Delete a report
  async deleteReport(reportId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reports/${reportId}`);
    }
  }
};
