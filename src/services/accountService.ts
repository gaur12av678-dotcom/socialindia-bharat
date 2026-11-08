import { authService } from './authService';
import { userService } from './userService';
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
  saveAccount(userProfile: User, password?: string, provider: 'password' | 'google' = 'password'): void {
    if (!userProfile || !userProfile.uid) return;

    // CRITICAL: Unverified accounts must NEVER be saved to local saved accounts
    if (userProfile.email && !userProfile.email.endsWith('@socialindia.com') && !userProfile.emailVerified) {
      return;
    }

    const accounts = this.getSavedAccounts();
    const existingIndex = accounts.findIndex((a) => a.uid === userProfile.uid);

    let savedPassToken = existingIndex >= 0 ? accounts[existingIndex].savedPassToken : undefined;
    if (password) {
      savedPassToken = obfuscate(password);
    }

    const updatedAccount: SavedAccount = {
      uid: userProfile.uid,
      email: userProfile.email || '',
      username: userProfile.username || '',
      displayName: userProfile.displayName || userProfile.username || 'User',
      photoURL: userProfile.photoURL,
      subscribersCount: userProfile.followersCount || 0,
      points: userProfile.points || 0,
      walletBalance: userProfile.walletBalance || 0,
      role: userProfile.role || 'user',
      lastActiveAt: Date.now(),
      authProvider: provider,
      savedPassToken,
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = updatedAccount;
    } else {
      accounts.push(updatedAccount);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Could not persist saved accounts:', e);
    }
  }

  /**
   * Sync the currently logged in user profile with the saved accounts list
   */
  syncCurrentProfile(userProfile: User | null): void {
    if (!userProfile) return;
    if (userProfile.email && !userProfile.email.endsWith('@socialindia.com') && !userProfile.emailVerified) {
      return;
    }
    this.saveAccount(userProfile);
  }

  /**
   * Switch to a saved account.
   * If saved credentials exist, authenticates immediately.
   * If credentials are required, returns { requiresPassword: true }.
   */
  async switchToAccount(
    targetAccount: SavedAccount,
    passwordOverride?: string
  ): Promise<{ success: boolean; error?: string; requiresPassword?: boolean }> {
    const password = passwordOverride || (targetAccount.savedPassToken ? deobfuscate(targetAccount.savedPassToken) : '');

    if (!password) {
      if (targetAccount.authProvider === 'google') {
        try {
          await authService.signInWithGoogle();
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Google sign-in failed' };
        }
      }
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
