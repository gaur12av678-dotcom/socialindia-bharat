import { authService } from './authService';
import { auth } from '../firebase';
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
  savedPassToken?: string; // Obfuscated session token for instant 1-click switch
}

const STORAGE_KEY = 'socialindia_saved_accounts';
const BACKUP_STORAGE_KEY = 'socialindia_saved_accounts_backup';

// Simple obfuscation helper to avoid storing plain text in localStorage
function obfuscate(text: string): string {
  try {
    return btoa(encodeURIComponent(text));
  } catch {
    return text;
  }
}

function deobfuscate(text: string): string {
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
   * Record or update an account in the saved list
   */
  saveAccount(userProfile: User, password?: string, provider?: 'password' | 'google'): void {
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

    let savedPassToken = existing?.savedPassToken;
    if (password) {
      savedPassToken = obfuscate(password);
    }

    const safePhoto = sanitizeStoredPhoto(userProfile.photoURL) ?? sanitizeStoredPhoto(existing?.photoURL);

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
      savedPassToken,
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = updatedAccount;
    } else {
      accounts.push(updatedAccount);
    }

    this.writeSavedAccounts(accounts);
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
   * Switch to a saved account.
   * If Google account, triggers Google OAuth directly without asking for a password.
   * If saved credentials exist, authenticates immediately.
   * If credentials are required, returns { requiresPassword: true }.
   */
  async switchToAccount(
    targetAccount: SavedAccount,
    passwordOverride?: string
  ): Promise<{ success: boolean; error?: string; requiresPassword?: boolean }> {
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
        return { success: true };
      } catch (err: any) {
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          return { success: false, error: '' };
        }
        return { success: false, error: err.message || 'Google sign-in failed' };
      }
    }

    const password = passwordOverride || (targetAccount.savedPassToken ? deobfuscate(targetAccount.savedPassToken) : '');

    if (!password) {
      return { success: false, requiresPassword: true };
    }

    try {
      const identifier = targetAccount.username || targetAccount.email;
      const { userProfile } = await authService.login(identifier, password);
      // Update saved accounts with successful credential
      this.saveAccount(userProfile, password, 'password');
      return { success: true };
    } catch (err: any) {
      console.warn('Account switch failed with saved credential:', err);
      // If credential expired or invalid, clear stored pass token
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
   * Remove an account from the saved list
   */
  removeAccount(uid: string): void {
    const accounts = this.getSavedAccounts().filter((a) => a.uid !== uid);
    this.writeSavedAccounts(accounts);
  }

  /**
   * Sign out of all accounts
   */
  async signOutAll(): Promise<void> {
    await authService.logout();
    // Keep saved accounts list so user can easily sign back in like Google/YouTube,
    // or optionally clear passwords
  }
}

export const accountService = new AccountService();
