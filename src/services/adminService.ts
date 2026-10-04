import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User, Video, Report } from '../types';
import { userService } from './userService';
import { getCloudinaryConfig, setCloudinaryConfig } from './videoService';
import { trashService } from './trashService';

export const adminService = {
  // Get Global Storage / Cloudinary Configuration
  async getStorageConfig(): Promise<{ cloudName: string; uploadPreset: string; updatedAt?: string }> {
    try {
      const snap = await getDoc(doc(db, 'system_settings', 'cloudinary'));
      if (snap.exists()) {
        const data = snap.data();
        if (data?.cloudName || data?.uploadPreset) {
          const cfg = {
            cloudName: data.cloudName || '',
            uploadPreset: data.uploadPreset || '',
            updatedAt: data.updatedAt
          };
          setCloudinaryConfig(cfg.cloudName, cfg.uploadPreset);
          return cfg;
        }
      }
    } catch (err) {
      console.warn('Failed to load storage config from Firestore:', err);
    }
    const local = getCloudinaryConfig();
    return {
      cloudName: local.cloudName || '',
      uploadPreset: local.preset || ''
    };
  },

  // Save Global Storage / Cloudinary Configuration for all users
  async saveStorageConfig(cloudName: string, uploadPreset: string): Promise<void> {
    try {
      await setDoc(doc(db, 'system_settings', 'cloudinary'), {
        cloudName: cloudName.trim(),
        uploadPreset: uploadPreset.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setCloudinaryConfig(cloudName, uploadPreset);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_settings/cloudinary');
      throw err;
    }
  },

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

  // Update user role (e.g., user, creator, moderator, admin)
  async updateUserRole(uid: string, role: User['role']): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      throw err;
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

  // Delete a video (Safely archives to 180-Day Compliance Trash Vault before removal)
  async deleteVideo(videoId: string, creatorId?: string, adminUid?: string): Promise<void> {
    try {
      const videoSnap = await getDoc(doc(db, 'videos', videoId));
      if (videoSnap.exists()) {
        const videoData = videoSnap.data() as Video;
        await trashService.moveToTrash({
          itemId: videoId,
          itemType: videoData.isShort ? 'short' : 'video',
          title: videoData.title,
          subtitle: `@${videoData.creatorUsername} • ${videoData.category}`,
          thumbnailUrl: videoData.thumbnailUrl,
          deletedBy: adminUid || 'admin',
          deletedByName: 'Administrator',
          details: `Admin deleted video "${videoData.title}". Retained in 180-day compliance vault.`,
          dataSnapshot: videoData
        });
      }

      await deleteDoc(doc(db, 'videos', videoId));
      if (creatorId) {
        try {
          await userService.incrementVideoCount(creatorId, -1);
        } catch (e) {
          console.warn('Could not decrement video count:', e);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `videos/${videoId}`);
      throw err;
    }
  },

  // Delete / Archive a User (Safely archives to 180-Day Compliance Trash Vault)
  async deleteUser(uid: string, adminUid?: string): Promise<void> {
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        await trashService.moveToTrash({
          itemId: uid,
          itemType: 'user',
          title: userData.displayName || userData.username,
          subtitle: `@${userData.username} • ${userData.role}`,
          photoURL: userData.photoURL,
          deletedBy: adminUid || 'admin',
          deletedByName: 'Administrator',
          details: `User account @${userData.username} archived to 180-day compliance vault.`,
          dataSnapshot: userData
        });
      }

      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
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
  },

  // Get Site-wide Broadcast Announcement
  async getAnnouncement(): Promise<{ active: boolean; message: string; type: 'info' | 'alert' | 'success'; linkText?: string; linkUrl?: string }> {
    try {
      const snap = await getDoc(doc(db, 'system_settings', 'announcement'));
      if (snap.exists()) {
        return snap.data() as any;
      }
    } catch (err) {
      console.warn('Failed to load announcement:', err);
    }
    return {
      active: false,
      message: '',
      type: 'info'
    };
  },

  // Fetch all Ad Campaigns across the platform for admin overview
  async getAllAdCampaigns(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'ad_campaigns'));
      return snap.docs.map(d => d.data());
    } catch (err) {
      console.warn('Failed to load ad campaigns:', err);
      return [];
    }
  },

  // Save Site-wide Broadcast Announcement
  async saveAnnouncement(announcement: { active: boolean; message: string; type: 'info' | 'alert' | 'success'; linkText?: string; linkUrl?: string }): Promise<void> {
    try {
      await setDoc(doc(db, 'system_settings', 'announcement'), {
        ...announcement,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_settings/announcement');
      throw err;
    }
  }
};
