import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const LS_KEY = 'socialindia_admin_settings_v1';

export const adminConfigService = {
  // Settings load karo — pehle Firestore, fail ho toh localStorage
  async load(): Promise<Record<string, any>> {
    let local: Record<string, any> = {};
    try {
      local = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    } catch { /* ignore */ }

    try {
      const snap = await getDoc(doc(db, 'adminSettings', 'site'));
      if (snap.exists()) {
        const remote = snap.data() as Record<string, any>;
        try { localStorage.setItem(LS_KEY, JSON.stringify(remote)); } catch { /* ignore */ }
        return remote;
      }
    } catch (e) {
      console.warn('Firestore settings load failed, using local copy:', e);
    }
    return local;
  },

  // Settings save karo — localStorage (turant) + Firestore (permanent)
  async save(settings: Record<string, any>): Promise<boolean> {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }

    try {
      await setDoc(doc(db, 'adminSettings', 'site'), {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.warn('Firestore settings save failed, saved locally only:', e);
      return false;
    }
  },
};
