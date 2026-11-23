import { signOut, updateCurrentUser, User as FirebaseUser } from 'firebase/auth';
import { authService } from './authService';
import { auth, getVaultAuth } from '../firebase';
import { User } from '../types';

export interface SavedAccount {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL?: string;
  subscribersCount?: number;
  points?: number;
  walletBalance?: number;
  role?: string;
  lastActiveAt: number;
  authProvider?: 'password' | 'google' | string;
  savedPassToken?: string; // Legacy migration-only field; cleared once session is vaulted
}

const STORAGE_KEY = 'socialindia_saved_accounts';
const BACKUP_STORAGE_KEY = 'socialindia_saved_accounts_backup';

// Legacy migration-only decoder for accounts saved before session vaulting
function deobfuscateLegacy(text: string): string {
  try {
    return decodeURIComponent(atob(text));
  } catch {
    return text;
  }
}

function sanitizeStoredPhoto(photoURL?: string): string | undefined {
  if (!photoURL) return undefined;
  // Avoid blowing up localStorage quota with huge base64 avatars (UserAvatar fetches by uid anyway)
  if (photoURL.startsWith('data:') && photoURL.length > 8192) {
    return undefined;
  }
  return photoURL;
}

class AccountService {
  private vaultLocks = new Map<string, Promise<void>>();

  private withVaultLock(uid: string, task: () => Promise<void>): Promise<void> {
    const prev = this.vaultLocks.get(uid) || Promise.resolve();
    const next = prev.then(task, task).finally(() => {
      if (this.vaultLocks.get(uid) === next) {
        this.vaultLocks.delete(uid);
      }
    });
    this.vaultLocks.set(uid, next);
    return next;
  }

  private writeSavedAccounts(accounts: SavedAccount[]): void {
    const serialized = JSON.stringify(accounts);
    const tryWrite = () => {
      localStorage.setItem(STORAGE_KEY, serialized);
      try {
        localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
      } catch {}
    };

    try {
      tryWrite();
    } catch (e) {
      // Prune disposable caches if localStorage quota is full, never drop saved accounts
      try {
        const disposablePrefixes = ['socialindia_chat_', 'socialindia_cached_profile_', 'si_u_'];
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && disposablePrefixes.some((prefix) => k.startsWith(prefix))) {
            localStorage.removeItem(k);
          }
        }
        tryWrite();
      } catch (retryErr) {
        console.warn('Could not persist saved accounts:', retryErr || e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('si_saved_accounts_changed'));
    }
  }

  /**
   * Snapshot a Firebase Auth user's live session (refresh + ID tokens) into its
   * isolated IndexedDB-backed Firebase Auth vault so future switches are instant
   * and never prompt for a password.
   */
  async snapshotAuthSession(fbUser?: FirebaseUser | null): Promise<void> {
    const targetUser = fbUser ?? auth.currentUser;
    if (!targetUser || !targetUser.uid) return;

    const isRealEmail = Boolean(targetUser.email && !targetUser.email.endsWith('@socialindia.com'));
    if (isRealEmail && !targetUser.emailVerified) {
      return;
    }

    const uid = targetUser.uid;
    return this.withVaultLock(uid, async () => {
      try {
        const vaultAuth = getVaultAuth(uid);
        await vaultAuth.authStateReady();
        const currentVaultUser = vaultAuth.currentUser;
        if (
          !currentVaultUser ||
          currentVaultUser.uid !== uid ||
          currentVaultUser.refreshToken !== targetUser.refreshToken
        ) {
          await updateCurrentUser(vaultAuth, targetUser);
        }
      } catch (err) {
        console.warn('Could not snapshot auth session to vault:', err);
      }
    });
  }

  /**
   * Preserve the currently active Firebase Auth session before logging into or
   * switching to another account.
   */
  async preserveCurrentSession(): Promise<void> {
    if (auth.currentUser) {
      await this.snapshotAuthSession(auth.currentUser);
    }
  }

  /**
   * Clear the isolated vault session for a single UID.
   */
  async clearVaultSession(uid?: string | null): Promise<void> {
    if (!uid) return;
    return this.withVaultLock(uid, async () => {
      try {
        const vaultAuth = getVaultAuth(uid);
        await vaultAuth.authStateReady();
        if (vaultAuth.currentUser) {
          await signOut(vaultAuth);
        }
      } catch (err) {
        console.warn('Could not clear vault session:', err);
      }
    });
  }

  /**
   * Clear all isolated vault sessions on this device.
   */
  async clearAllVaultSessions(): Promise<void> {
    const uids = new Set<string>(this.getSavedAccounts().map((a) => a.uid));
    if (auth.currentUser?.uid) {
      uids.add(auth.currentUser.uid);
    }
    await Promise.all(Array.from(uids).map((uid) => this.clearVaultSession(uid)));
  }

  /**
   * Get all registered/saved accounts on this device
   */
  getSavedAccounts(): SavedAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_STORAGE_KEY);
      if (!raw) return [];
      const list: SavedAccount[] = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      const valid = list.filter((item) => item && typeof item.uid === 'string' && item.uid.length > 0);
      // Sort by last active descending (most recently used first)
      return valid.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
    } catch {
      return [];
    }
  }

  /**
   * Record or update an account in the saved list (and snapshot its active session if signed in)
   */
  saveAccount(userProfile: User, _password?: string, provider?: 'password' | 'google'): void {
    if (!userProfile || !userProfile.uid) return;

    const accounts = this.getSavedAccounts();
    const existingIndex = accounts.findIndex((a) => a.uid === userProfile.uid);
    const existing = existingIndex >= 0 ? accounts[existingIndex] : undefined;

    const fbUser = auth.currentUser?.uid === userProfile.uid ? auth.currentUser : null;
    const effectiveEmail = (userProfile.email || fbUser?.email || existing?.email || '').trim();
    const isFirebaseGoogleUser = Boolean(
      provider === 'google' ||
      existing?.authProvider === 'google' ||
      fbUser?.providerData?.some((p) => p.providerId === 'google.com')
    );

    const isEffectiveVerified = Boolean(
      userProfile.emailVerified ||
      fbUser?.emailVerified ||
      fbUser !== null ||
      existing !== undefined ||
      isFirebaseGoogleUser ||
      !effectiveEmail ||
      effectiveEmail.endsWith('@socialindia.com')
    );

    // Unverified real-email accounts that have never completed sign-in must NOT be saved
    if (!isEffectiveVerified) {
      return;
    }

    const existingProvider = existing?.authProvider;

    const resolvedProvider: 'password' | 'google' =
      provider ||
      (isFirebaseGoogleUser ? 'google' : undefined) ||
      (existingProvider === 'google' ? 'google' : 'password');

    const safePhoto = sanitizeStoredPhoto(userProfile.photoURL) ?? sanitizeStoredPhoto(existing?.photoURL);

    // Never store passwords in localStorage; keep legacy token only until vault snapshot succeeds
    const updatedAccount: SavedAccount = {
      uid: userProfile.uid,
      email: effectiveEmail || '',
      username: userProfile.username || existing?.username || '',
      displayName: userProfile.displayName || userProfile.username || existing?.displayName || 'User',
      photoURL: safePhoto,
      subscribersCount: userProfile.followersCount ?? existing?.subscribersCount ?? 0,
      points: userProfile.points ?? existing?.points ?? 0,
      walletBalance: userProfile.walletBalance ?? existing?.walletBalance ?? 0,
      role: userProfile.role || existing?.role || 'user',
      lastActiveAt: Date.now(),
      authProvider: resolvedProvider,
      ...(fbUser ? {} : existing?.savedPassToken ? { savedPassToken: existing.savedPassToken } : {}),
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = updatedAccount;
    } else {
      accounts.push(updatedAccount);
    }

    this.writeSavedAccounts(accounts);

    if (fbUser) {
      void this.snapshotAuthSession(fbUser);
    }
  }

  private touchAccountAndClearLegacyToken(uid: string): void {
    const accounts = this.getSavedAccounts();
    const idx = accounts.findIndex((a) => a.uid === uid);
    if (idx >= 0) {
      accounts[idx] = {
        ...accounts[idx],
        lastActiveAt: Date.now(),
      };
      delete accounts[idx].savedPassToken;
      this.writeSavedAccounts(accounts);
    }
  }

  /**
   * Sync the currently logged in user profile (or Firebase Auth user fallback) with the saved accounts list
   */
  syncCurrentProfile(userProfile: User | null): void {
    const fbUser = auth.currentUser;
    if (!userProfile) {
      if (!fbUser) return;
      const fallbackEmail = fbUser.email || '';
      const existing = this.getSavedAccounts().find((a) => a.uid === fbUser.uid);
      const isGoogle = Boolean(fbUser.providerData?.some((p) => p.providerId === 'google.com'));
      if (fallbackEmail && !fallbackEmail.endsWith('@socialindia.com') && !fbUser.emailVerified && !isGoogle && !existing) {
        return;
      }
      this.saveAccount(
        {
          uid: fbUser.uid,
          email: fallbackEmail || existing?.email || '',
          emailVerified: fbUser.emailVerified || isGoogle || fallbackEmail.endsWith('@socialindia.com') || Boolean(existing),
          username: existing?.username || (fallbackEmail ? fallbackEmail.split('@')[0] : 'user'),
          displayName: fbUser.displayName || existing?.displayName || 'User',
          photoURL: fbUser.photoURL || existing?.photoURL,
          followersCount: existing?.subscribersCount || 0,
          followingCount: 0,
          videosCount: 0,
          role: (existing?.role as User['role']) || 'user',
          status: 'active',
          createdAt: '',
          updatedAt: ''
        },
        undefined,
        isGoogle ? 'google' : undefined
      );
      return;
    }
    const isFirebaseGoogleUser = Boolean(
      fbUser?.uid === userProfile.uid &&
      fbUser.providerData?.some((p) => p.providerId === 'google.com')
    );
    this.saveAccount(
      {
        ...userProfile,
        emailVerified: Boolean(
          userProfile.emailVerified ||
          (fbUser?.uid === userProfile.uid && (fbUser.emailVerified || isFirebaseGoogleUser))
        )
      },
      undefined,
      isFirebaseGoogleUser ? 'google' : undefined
    );
  }

  /**
   * Switch to a saved account instantaneously using its vaulted Firebase Auth session.
   * Falls back to one-time Google/credential sign-in only if no valid vault session exists yet,
   * and immediately vaults the refreshed session so future switches never prompt again.
   */
  async switchToAccount(
    targetAccount: SavedAccount,
    passwordOverride?: string
  ): Promise<{ success: boolean; error?: string; requiresPassword?: boolean; instant?: boolean }> {
    // 1. If already active on this exact UID, just ensure vault + timestamp are updated
    if (auth.currentUser?.uid === targetAccount.uid && !passwordOverride) {
      await this.snapshotAuthSession(auth.currentUser);
      this.touchAccountAndClearLegacyToken(targetAccount.uid);
      return { success: true, instant: true };
    }

    // 2. Always preserve the outgoing active account's session before switching
    await this.preserveCurrentSession();

    // 3. Fast YouTube-style switch via isolated Firebase Auth session vault (0 passwords, 0 popups)
    if (!passwordOverride) {
      try {
        const vaultAuth = getVaultAuth(targetAccount.uid);
        await vaultAuth.authStateReady();
        const vaultUser = vaultAuth.currentUser;

        if (vaultUser && vaultUser.uid === targetAccount.uid) {
          await updateCurrentUser(auth, vaultUser);

          let sessionValid = true;
          if (typeof navigator === 'undefined' || navigator.onLine) {
            try {
              await auth.currentUser?.getIdToken(false);
              if (auth.currentUser && auth.currentUser.uid === targetAccount.uid) {
                await this.snapshotAuthSession(auth.currentUser);
              }
            } catch (tokenErr: any) {
              const code = tokenErr?.code || '';
              if (
                code === 'auth/user-token-expired' ||
                code === 'auth/invalid-user-token' ||
                code === 'auth/user-disabled' ||
                code === 'auth/user-not-found'
              ) {
                sessionValid = false;
                await this.clearVaultSession(targetAccount.uid);
              } else {
                console.warn('Token check skipped during account switch:', tokenErr);
              }
            }
          }

          if (sessionValid) {
            this.touchAccountAndClearLegacyToken(targetAccount.uid);
            return { success: true, instant: true };
          }
        }
      } catch (vaultErr) {
        console.warn('Vault session switch fallback:', vaultErr);
      }
    }

    // 4. Fallback for accounts without a vaulted session yet (e.g. legacy or post-sign-out)
    const isGoogleAccount =
      targetAccount.authProvider === 'google' ||
      Boolean(
        auth.currentUser?.uid === targetAccount.uid &&
        auth.currentUser.providerData?.some((p) => p.providerId === 'google.com')
      );

    if (isGoogleAccount && !passwordOverride) {
      try {
        const { userProfile } = await authService.signInWithGoogle(targetAccount.email);
        this.saveAccount(userProfile, undefined, 'google');
        await this.snapshotAuthSession(auth.currentUser);
        return { success: true };
      } catch (err: any) {
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          return { success: false, error: '' };
        }
        return { success: false, error: err.message || 'Google sign-in failed' };
      }
    }

    const password = passwordOverride || (targetAccount.savedPassToken ? deobfuscateLegacy(targetAccount.savedPassToken) : '');

    if (!password) {
      return { success: false, requiresPassword: true };
    }

    try {
      const identifier = targetAccount.username || targetAccount.email;
      const { userProfile } = await authService.login(identifier, password);
      this.saveAccount(userProfile, undefined, 'password');
      await this.snapshotAuthSession(auth.currentUser);
      this.touchAccountAndClearLegacyToken(userProfile.uid);
      return { success: true };
    } catch (err: any) {
      console.warn('Account switch failed with credential:', err);
      if (err.message && (err.message.includes('password') || err.message.includes('credential'))) {
        this.clearSavedPassword(targetAccount.uid);
        return { success: false, requiresPassword: true, error: 'Password required or changed.' };
      }
      return { success: false, error: err.message || 'Failed to switch account.' };
    }
  }

  /**
   * Clear saved password token for an account
   */
  clearSavedPassword(uid: string): void {
    const accounts = this.getSavedAccounts();
    const idx = accounts.findIndex((a) => a.uid === uid);
    if (idx >= 0) {
      delete accounts[idx].savedPassToken;
      this.writeSavedAccounts(accounts);
    }
  }

  /**
   * Remove an account from the saved list and clear its local session vault
   */
  removeAccount(uid: string): void {
    const accounts = this.getSavedAccounts().filter((a) => a.uid !== uid);
    this.writeSavedAccounts(accounts);
    void this.clearVaultSession(uid);
  }

  /**
   * Sign out of all accounts on this device
   */
  async signOutAll(): Promise<void> {
    await this.clearAllVaultSessions();
    await authService.logout();
  }
}

export const accountService = new AccountService();
