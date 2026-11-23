import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as any).firestoreDatabaseId;

let firestoreInstance;
try {
  firestoreInstance = databaseId
    ? initializeFirestore(app, { ignoreUndefinedProperties: true }, databaseId)
    : initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  firestoreInstance = databaseId
    ? getFirestore(app, databaseId)
    : getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);

const vaultAuthCache = new Map<string, Auth>();

/**
 * Returns an isolated Firebase Auth instance scoped to a specific UID.
 * Each named app persists its own Firebase session (refresh + ID tokens)
 * in browser IndexedDB, enabling instant YouTube-style account switching
 * without re-entering passwords or storing credentials in localStorage.
 */
export function getVaultAuth(uid: string): Auth {
  const cached = vaultAuthCache.get(uid);
  if (cached) return cached;

  const appName = `si_vault_${uid}`;
  let vaultApp: FirebaseApp | undefined = getApps().find((a) => a.name === appName);
  if (!vaultApp) {
    vaultApp = initializeApp(firebaseConfig, appName);
  }

  let vaultAuth: Auth;
  try {
    vaultAuth = initializeAuth(vaultApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    vaultAuth = getAuth(vaultApp);
  }

  vaultAuthCache.set(uid, vaultAuth);
  return vaultAuth;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
