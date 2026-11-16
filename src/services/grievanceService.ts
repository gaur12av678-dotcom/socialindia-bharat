import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export const GRIEVANCE_CATEGORIES = [
  'Copyright Infringement',
  'Privacy Violation / Personal Data Exposure',
  'Child Safety Concern',
  'Impersonation / Identity Theft',
  'Cyberbullying / Harassment',
  'Threatening or Illegal Content',
  'Account-Related Complaint',
  'Other Grievance',
] as const;

export type GrievanceCategory = typeof GRIEVANCE_CATEGORIES[number];
export type GrievanceStatus = 'new' | 'pending' | 'under_review' | 'action_taken' | 'resolved' | 'rejected';

export interface GrievanceSubmission {
  id: string;
  trackingId: string;
  complainantName: string;
  email: string;
  category: GrievanceCategory;
  targetUrl: string;
  emergency: boolean;
  description: string;
  evidenceReference: string;
  submittedAt: unknown;
  status: GrievanceStatus;
  adminNotes: string;
  resolutionDetails: string;
  updatedAt: unknown;
}

export interface GrievanceHistoryEntry {
  id: string;
  action: string;
  fromStatus?: GrievanceStatus;
  toStatus?: GrievanceStatus;
  notes?: string;
  resolutionDetails?: string;
  adminUid: string;
  createdAt: unknown;
}

export const grievanceService = {
  async submit(data: Omit<GrievanceSubmission, 'id' | 'trackingId' | 'submittedAt' | 'status' | 'adminNotes' | 'resolutionDetails' | 'updatedAt'>): Promise<string> {
    const grievanceRef = doc(collection(db, 'grievances'));
    const trackingId = `SI-${grievanceRef.id}`;

    try {
      await setDoc(grievanceRef, {
        ...data,
        trackingId,
        submittedAt: serverTimestamp(),
        status: 'new',
        adminNotes: '',
        resolutionDetails: '',
        updatedAt: serverTimestamp(),
      });
      return trackingId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `grievances/${grievanceRef.id}`);
      throw error;
    }
  },

  async getAll(): Promise<GrievanceSubmission[]> {
    try {
      const snapshot = await getDocs(query(collection(db, 'grievances'), orderBy('submittedAt', 'desc')));
      return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as GrievanceSubmission));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'grievances');
      throw error;
    }
  },

  async update(
    trackingId: string,
    documentId: string,
    adminUid: string,
    changes: { status?: GrievanceStatus; adminNotes?: string; resolutionDetails?: string },
    previousStatus: GrievanceStatus,
  ): Promise<void> {
    const grievanceRef = doc(db, 'grievances', documentId);
    const historyRef = doc(collection(grievanceRef, 'history'));
    const batch = writeBatch(db);
    const cleanChanges = {
      ...changes,
      ...(changes.adminNotes !== undefined ? { adminNotes: changes.adminNotes.trim() } : {}),
      ...(changes.resolutionDetails !== undefined ? { resolutionDetails: changes.resolutionDetails.trim() } : {}),
      updatedAt: serverTimestamp(),
    };

    batch.update(grievanceRef, cleanChanges);
    batch.set(historyRef, {
      action: changes.status && changes.status !== previousStatus ? 'status_updated' : 'admin_note_updated',
      fromStatus: previousStatus,
      ...(changes.status ? { toStatus: changes.status } : {}),
      ...(changes.adminNotes !== undefined ? { notes: changes.adminNotes.trim() } : {}),
      ...(changes.resolutionDetails !== undefined ? { resolutionDetails: changes.resolutionDetails.trim() } : {}),
      adminUid,
      trackingId,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `grievances/${documentId}`);
      throw error;
    }
  },

  async getHistory(documentId: string): Promise<GrievanceHistoryEntry[]> {
    try {
      const snapshot = await getDocs(query(
        collection(db, 'grievances', documentId, 'history'),
        orderBy('createdAt', 'desc'),
      ));
      return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as GrievanceHistoryEntry));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `grievances/${documentId}/history`);
      throw error;
    }
  },
};
