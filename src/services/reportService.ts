import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Report } from '../types';

export const reportService = {
  // Submit content report
  async submitReport(
    reporterId: string,
    targetType: 'video' | 'comment' | 'creator',
    targetId: string,
    reason: 'spam' | 'misleading' | 'harassment' | 'copyright' | 'inappropriate' | 'other',
    details?: string
  ): Promise<void> {
    const reportId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const report: Report = {
      reportId,
      reporterId,
      targetType,
      targetId,
      reason,
      details: details || '',
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    try {
      await setDoc(doc(db, 'reports', reportId), report);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
    }
  }
};
