import { collection, addDoc, getDocs, orderBy, query, limit, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface FeedbackEntry {
  id?: string;
  uid: string;
  username: string;
  type: 'help' | 'feedback';
  subject: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export const feedbackService = {
  async submitFeedback(data: Omit<FeedbackEntry, 'id' | 'status' | 'createdAt'>): Promise<void> {
    try {
      await addDoc(collection(db, 'feedback'), {
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'feedback');
    }
  },

  async getAllFeedback(): Promise<FeedbackEntry[]> {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackEntry));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'feedback');
      return [];
    }
  },

  async updateFeedbackStatus(id: string, status: FeedbackEntry['status']): Promise<void> {
    try {
      await updateDoc(doc(db, 'feedback', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `feedback/${id}`);
    }
  }
};
