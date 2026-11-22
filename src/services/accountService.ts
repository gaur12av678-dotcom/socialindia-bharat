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

class AccountService {
  /**
   * Get all registered/saved accounts on this device
   */
  getSavedAccounts(): SavedAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const list: SavedAccount[] = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      // Sort by last active descending (most recently used first)
      return list.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
    } catch {
      return [];
    }
  }

  /**
   * Record or update an account in the saved list
   */
  saveAccount(userProfile: User, password?: string, provider?: 'password' | 'google'): void {
    if (!userProfile || !userProfile.uid) return;

    const fbUser = auth.currentUser?.uid === userProfile.uid ? auth.currentUser : null;
    const effectiveEmail = (userProfile.email || fbUser?.email || '').trim();
    const isEffectiveVerified = Boolean(
      userProfile.emailVerified ||
      fbUser?.emailVerified ||
      !effectiveEmail ||
      effectiveEmail.endsWith('@socialindia.com')
    );

    // Unverified real-email accounts must NOT be saved
    if (!isEffectiveVerified) {
      return;
    }

    const accounts = this.getSavedAccounts();
    const existingIndex = accounts.findIndex((a) => a.uid === userProfile.uid);
    const existing = existingIndex >= 0 ? accounts[existingIndex] : undefined;
    const existingProvider = existing?.authProvider;

    const isFirebaseGoogleUser = Boolean(
      fbUser?.providerData?.some((p) => p.providerId === 'google.com')
    );

    const resolvedProvider: 'password' | 'google' =
      provider ||
      (isFirebaseGoogleUser ? 'google' : undefined) ||
      (existingProvider === 'google' ? 'google' : 'password');

    let savedPassToken = existing?.savedPassToken;
    if (password) {
      savedPassToken = obfuscate(password);
    }

    const updatedAccount: SavedAccount = {
      uid: userProfile.uid,
      email: effectiveEmail || existing?.email || '',
      username: userProfile.username || existing?.username || '',
      displayName: userProfile.displayName || userProfile.username || existing?.displayName || 'User',
      photoURL: userProfile.photoURL ?? existing?.photoURL,
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

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('si_saved_accounts_changed'));
      }
    } catch (e) {
      console.warn('Could not persist saved accounts:', e);
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
      if (fallbackEmail && !fallbackEmail.endsWith('@socialindia.com') && !fbUser.emailVerified) {
        return;
      }
      const existing = this.getSavedAccounts().find((a) => a.uid === fbUser.uid);
      const isGoogle = Boolean(fbUser.providerData?.some((p) => p.providerId === 'google.com'));
      this.saveAccount(
        {
          uid: fbUser.uid,
          email: fallbackEmail || existing?.email || '',
          emailVerified: fbUser.emailVerified || fallbackEmail.endsWith('@socialindia.com'),
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
        emailVerified: Boolean(userProfile.emailVerified || (fbUser?.uid === userProfile.uid && fbUser.emailVerified))
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      } catch {}
    }
  }

  /**
   * Remove an account from the saved list
   */
  removeAccount(uid: string): void {
    const accounts = this.getSavedAccounts().filter((a) => a.uid !== uid);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('si_saved_accounts_changed'));
      }
    } catch {}
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
