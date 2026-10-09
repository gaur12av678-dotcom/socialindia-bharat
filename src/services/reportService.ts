import { doc, getDoc, setDoc, updateDoc, collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Report, ReportCategory, ModerationAction, GrievanceTicket, ContentAppeal } from '../types';
import { notificationService } from './notificationService';

export const reportService = {
  // Submit content report with comprehensive categories & urgent 24h flag (IT Rules 2021 compliant)
  async submitReport(
    reporterId: string,
    targetType: 'video' | 'comment' | 'creator',
    targetId: string,
    reason: ReportCategory,
    details?: string,
    isUrgent24h: boolean = false,
    reporterUsername?: string,
    targetTitle?: string
  ): Promise<string> {
    const reportId = 'rep_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const report: Report = {
      reportId,
      reporterId,
      reporterUsername: reporterUsername || 'anonymous',
      targetType,
      targetId,
      targetTitle: targetTitle || `${targetType} #${targetId}`,
      reason,
      details: details || '',
      isUrgent24h: isUrgent24h || reason === 'sensitive_24h' || reason === 'child_safety',
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    try {
      await setDoc(doc(db, 'reports', reportId), report);
      return reportId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
      return reportId;
    }
  },

  // Get all submitted reports for admin moderation
  async getReports(): Promise<Report[]> {
    try {
      const q = query(collection(db, 'reports'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as Report);
      // Sort newest and urgent first
      return list.sort((a, b) => {
        if (a.isUrgent24h && !b.isUrgent24h) return -1;
        if (!a.isUrgent24h && b.isUrgent24h) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch (err) {
      console.warn('Get reports error:', err);
      return [];
    }
  },

  // Content Moderation Action: Report -> Review -> Action (no_violation | warning | content_removed | account_restricted | account_suspended)
  async takeModerationAction(
    reportId: string,
    action: ModerationAction,
    actionReason: string,
    adminUid: string
  ): Promise<void> {
    const reportRef = doc(db, 'reports', reportId);
    const snap = await getDoc(reportRef);
    if (!snap.exists()) return;

    const report = snap.data() as Report;
    const now = new Date().toISOString();

    // 1. Update report status
    await updateDoc(reportRef, {
      status: action === 'no_violation' ? 'reviewed' : 'resolved',
      actionTaken: action,
      actionReason: actionReason || 'Reviewed under Community Guidelines',
      actionTakenAt: now,
      actionTakenBy: adminUid,
    }).catch(console.error);

    // 2. Enforce action on the target entity
    if (report.targetType === 'video' && action === 'content_removed') {
      try {
        await updateDoc(doc(db, 'videos', report.targetId), {
          status: 'removed',
          visibility: 'private',
          removedReason: actionReason,
          removedAt: now,
        });
      } catch (e) {
        console.warn('Video takedown warning:', e);
      }
    }

    if (report.targetType === 'creator') {
      if (action === 'account_restricted' || action === 'account_suspended') {
        try {
          await updateDoc(doc(db, 'users', report.targetId), {
            status: action === 'account_suspended' ? 'suspended' : 'restricted',
            sanctionReason: actionReason,
            sanctionedAt: now,
          });
        } catch (e) {
          console.warn('User sanction warning:', e);
        }
      }
    }

    // 3. Transparency & Appeal Notice: Notify target creator/user
    const targetUserId = report.targetCreatorId || (report.targetType === 'creator' ? report.targetId : undefined);
    if (targetUserId && action !== 'no_violation') {
      const actionLabels: Record<ModerationAction, string> = {
        no_violation: 'No Violation Found',
        warning: 'Warning Issued',
        content_removed: 'Content Removed for Violation',
        account_restricted: 'Account Restricted',
        account_suspended: 'Account Suspended',
      };

      await notificationService.sendSystemNotification(
        targetUserId,
        'SocialIndia Trust & Safety',
        `Transparency Notice: Your ${report.targetType} received moderation action "${actionLabels[action]}". Reason: ${actionReason}. You have the legal right to submit an appeal.`
      ).catch(console.error);
    }
  },

  // Submit Content/Account Appeal (Rule 3(2) IT Rules Transparency & Redressal)
  async submitAppeal(
    reportId: string,
    userId: string,
    username: string,
    targetType: 'video' | 'comment' | 'creator',
    targetId: string,
    actionReceived: ModerationAction,
    appealReason: string,
    evidenceText?: string
  ): Promise<string> {
    const appealId = 'app_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const appeal: ContentAppeal = {
      appealId,
      reportId,
      userId,
      username,
      targetType,
      targetId,
      actionReceived,
      appealReason,
      evidenceText: evidenceText || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'appeals', appealId), appeal);
      // Mark report as appealed
      await updateDoc(doc(db, 'reports', reportId), {
        appealStatus: 'pending',
        appealReason: appealReason
      }).catch(() => {});
      return appealId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `appeals/${appealId}`);
      return appealId;
    }
  },

  // Fetch all user appeals for admin review
  async getAppeals(): Promise<ContentAppeal[]> {
    try {
      const q = query(collection(db, 'appeals'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as ContentAppeal);
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('Get appeals error:', err);
      return [];
    }
  },

  // Admin resolves appeal: Approve (restore content/account) or Reject (uphold action)
  async resolveAppeal(
    appealId: string,
    decision: 'approved' | 'rejected',
    adminDecisionNotes: string,
    adminUid: string
  ): Promise<void> {
    const appealRef = doc(db, 'appeals', appealId);
    const snap = await getDoc(appealRef);
    if (!snap.exists()) return;

    const appeal = snap.data() as ContentAppeal;
    const now = new Date().toISOString();

    await updateDoc(appealRef, {
      status: decision,
      adminDecisionNotes: adminDecisionNotes || `Appeal ${decision}`,
      decidedAt: now,
      decidedBy: adminUid,
    }).catch(console.error);

    // If appeal approved, restore content or account
    if (decision === 'approved') {
      if (appeal.targetType === 'video') {
        try {
          await updateDoc(doc(db, 'videos', appeal.targetId), {
            status: 'published',
            visibility: 'public',
            restoredAt: now,
          });
        } catch (e) {
          console.warn('Video restore error:', e);
        }
      }

      if (appeal.targetType === 'creator') {
        try {
          await updateDoc(doc(db, 'users', appeal.targetId), {
            status: 'active',
            restoredAt: now,
          });
        } catch (e) {
          console.warn('User restore error:', e);
        }
      }
    }

    // Notify user of appeal outcome
    await notificationService.sendSystemNotification(
      appeal.userId,
      'SocialIndia Trust & Safety',
      `Appeal Decision: Your appeal for ${appeal.targetType} #${appeal.targetId} has been ${decision.toUpperCase()}. ${adminDecisionNotes}`
    ).catch(console.error);
  },

  // Grievance Redressal Ticket submission (MeitY IT Rules 2021 compliance: 24h ack & 15-day disposal)
  async submitGrievanceTicket(
    data: Omit<GrievanceTicket, 'ticketId' | 'status' | 'createdAt' | 'acknowledgementDeadline' | 'disposalDeadline'>
  ): Promise<GrievanceTicket> {
    const ticketId = 'GRV-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const now = new Date();
    
    // Acknowledgement deadline: 24 hours
    const ackDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    // Disposal deadline: 15 days
    const dispDeadline = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();

    const ticket: GrievanceTicket = {
      ...data,
      ticketId,
      acknowledgedAt: now.toISOString(),
      acknowledgementDeadline: ackDeadline,
      disposalDeadline: dispDeadline,
      status: 'acknowledged',
      createdAt: now.toISOString()
    };

    try {
      await setDoc(doc(db, 'grievances', ticketId), ticket);
      return ticket;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `grievances/${ticketId}`);
      return ticket;
    }
  },

  // Get all grievance tickets
  async getGrievanceTickets(): Promise<GrievanceTicket[]> {
    try {
      const q = query(collection(db, 'grievances'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as GrievanceTicket);
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('Get grievances error:', err);
      return [];
    }
  },

  // Resolve Grievance Ticket
  async resolveGrievanceTicket(
    ticketId: string,
    resolutionNotes: string
  ): Promise<void> {
    const docRef = doc(db, 'grievances', ticketId);
    await updateDoc(docRef, {
      status: 'resolved',
      resolutionNotes,
      resolvedAt: new Date().toISOString(),
    }).catch(console.error);
  }
};

