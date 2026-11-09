import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../firebase';
import { userService } from './userService';
import { User, PrivateUserInfo } from '../types';

// Map simple username to a system-safe email fallback
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@socialindia.com`;
}

let registrationInProgress = false;

export const authService = {
  // Check if account registration is currently writing user documents
  isRegistrationInProgress(): boolean {
    return registrationInProgress;
  },

  // Register a new user with real email verification
  async register(
    arg1: string, 
    arg2: string, 
    arg3: string, 
    arg4?: string
  ): Promise<{ userProfile: User; emailVerified: boolean }> {
    let email: string;
    let username: string;
    let display: string;
    let pass: string;

    if (arg4 !== undefined) {
      // Called with (email, username, display, pass)
      email = arg1.trim().toLowerCase();
      username = arg2.trim().toLowerCase();
      display = arg3.trim();
      pass = arg4;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        throw new Error("Please enter a valid email address (e.g. yourname@gmail.com).");
      }
    } else {
      // Legacy caller with (username, display, pass)
      username = arg1.trim().toLowerCase();
      display = arg2.trim();
      pass = arg3;
      email = usernameToEmail(username);
    }

    const cleanUsername = username.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(cleanUsername)) {
      throw new Error("Username must be between 3 and 20 characters and contain only lowercase letters, numbers, and underscores.");
    }

    const isTaken = await userService.isUsernameTaken(cleanUsername);
    if (isTaken) {
      throw new Error("Username is already taken. Please choose another username.");
    }

    registrationInProgress = true;
    try {
      // 1. Create firebase auth user
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = credential.user.uid;

      // 2. Send real Firebase verification email
      try {
        await sendEmailVerification(credential.user);
      } catch (e) {
        console.warn("Could not send verification email automatically:", e);
      }

      // 3. Create the firestore public profile while authenticated
      await userService.createUserProfile(uid, {
        username: cleanUsername,
        displayName: display || cleanUsername,
        email: email,
        emailVerified: false,
        role: 'user',
      });

      // 4. Create default private info while authenticated
      const privateInfo: PrivateUserInfo = {
        email,
        theme: 'system',
        allowNotificationLikes: true,
        allowNotificationComments: true,
        allowNotificationFollowers: true,
        allowNotificationUploads: true,
      };
      await userService.setPrivateInfo(uid, privateInfo);

      // 5. Ensure official channel subscription while authenticated
      try {
        await userService.ensureDefaultSubscription(uid);
      } catch (subErr) {
        console.warn("Default subscription non-critical note:", subErr);
      }

      // 6. CRITICAL: Sign out immediately! Unverified accounts must NOT stay signed in.
      await signOut(auth);

      const profileData: User = {
        uid,
        username: cleanUsername,
        displayName: display || cleanUsername,
        email,
        emailVerified: false,
        role: 'user',
        followersCount: 0,
        followingCount: 0,
        videosCount: 0,
        points: 10,
        walletBalance: 0,
        status: 'active',
        gender: 'Male',
        country: 'India',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return { userProfile: profileData, emailVerified: false };
    } finally {
      registrationInProgress = false;
    }
  },

  // Send verification email to currently signed in user
  async sendVerificationEmail(): Promise<void> {
    if (!auth.currentUser) {
      throw new Error("No user is currently signed in to verify.");
    }
    await sendEmailVerification(auth.currentUser);
  },

  // Resend verification email even when user is signed out
  async resendVerificationEmail(email: string, password?: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      return;
    }
    if (password) {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      return;
    }
    // If no password provided, send password reset link as verification fallback
    await sendPasswordResetEmail(auth, cleanEmail);
  },

  // Check if current user has verified their email (reloads auth state)
  async checkEmailVerified(): Promise<boolean> {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const isVerified = !!auth.currentUser.emailVerified;
    if (isVerified) {
      await userService.updateProfile(auth.currentUser.uid, {
        emailVerified: true
      }).catch(console.error);
    }
    return isVerified;
  },

  // Check cached email verification state
  isEmailVerified(): boolean {
    return !!auth.currentUser?.emailVerified;
  },

  // Log in with email OR username and password
  async login(identifier: string, pass: string): Promise<{ userProfile: User; emailVerified: boolean }> {
    const cleanId = identifier.trim().toLowerCase();
    let loginEmail = cleanId;

    if (!cleanId.includes('@')) {
      // Lookup existing profile by username to find registered email
      const userDoc = await userService.getUserByUsername(cleanId);
      if (userDoc && userDoc.email) {
        loginEmail = userDoc.email;
      } else {
        loginEmail = usernameToEmail(cleanId);
      }
    }

    // Special handler for requested liveindia official channel
    if (cleanId === 'liveindia' || loginEmail === 'liveindia@socialindia.com') {
      if (pass !== 'gaur12av') {
        throw new Error('Incorrect password for Live India account.');
      }

      const { liveBroadcastService } = await import('./liveBroadcastService');
      try {
        const credential = await signInWithEmailAndPassword(auth, 'liveindia@socialindia.com', 'gaur12av');
        const userProfile = await liveBroadcastService.syncLiveIndiaAccountWithAuth(credential.user.uid);
        await userService.ensureDefaultSubscription(credential.user.uid);
        return { userProfile, emailVerified: true };
      } catch (signInErr: any) {
        // If not registered in Firebase Auth yet, automatically register account with gaur12av
        try {
          const newCred = await createUserWithEmailAndPassword(auth, 'liveindia@socialindia.com', 'gaur12av');
          const userProfile = await liveBroadcastService.syncLiveIndiaAccountWithAuth(newCred.user.uid);
          await userService.ensureDefaultSubscription(newCred.user.uid);
          return { userProfile, emailVerified: true };
        } catch (createErr: any) {
          console.warn('Live India auto-auth note:', createErr?.message || createErr);
          // Fallback to seeded live account profile
          await liveBroadcastService.ensureLiveIndiaSeeded();
          return { userProfile: liveBroadcastService.getUser(), emailVerified: true };
        }
      }
    }

    const credential = await signInWithEmailAndPassword(auth, loginEmail, pass);
    const uid = credential.user.uid;

    // Verify email requirement for real email accounts
    const isRealEmail = credential.user.email && !credential.user.email.endsWith('@socialindia.com');
    if (isRealEmail && !credential.user.emailVerified) {
      try {
        await credential.user.reload();
      } catch {}

      if (!credential.user.emailVerified) {
        // CRITICAL: Unverified users must NOT be allowed to sign in!
        await signOut(auth);
        const err: any = new Error(
          'Your account is not verified yet. Please check your email inbox (and Spam folder) to verify your account before signing in.'
        );
        err.code = 'auth/email-not-verified';
        err.email = credential.user.email;
        throw err;
      }
    }

    const userProfile = await userService.getUserProfile(uid);
    if (!userProfile) {
      throw new Error("User profile not found.");
    }

    // Update emailVerified in firestore if it changed
    if (credential.user.emailVerified && !userProfile.emailVerified) {
      await userService.updateProfile(uid, { emailVerified: true }).catch(console.error);
      userProfile.emailVerified = true;
    }

    await userService.ensureDefaultSubscription(uid);
    return { userProfile, emailVerified: true };
  },

  // Log out
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    }
  },

  // Reset password via email or username
  async resetPassword(identifier: string): Promise<{ emailSentTo: string; username?: string }> {
    const clean = identifier.trim().toLowerCase();
    let targetEmail = clean;
    let foundUsername: string | undefined = undefined;

    if (!clean.includes('@')) {
      // Lookup username to find registered email
      const userDoc = await userService.getUserByUsername(clean);
      if (!userDoc) {
        throw new Error(`No account found with username "${clean}". Please verify your username or enter your email address.`);
      }
      if (!userDoc.email || userDoc.email.endsWith('@socialindia.com')) {
        throw new Error(`The account "${clean}" does not have an external Gmail address. Please use the Instant Password Reset option.`);
      }
      targetEmail = userDoc.email;
      foundUsername = userDoc.username;
    } else {
      // It's an email address - try checking if a user with this email exists in Firestore
      const userDoc = await userService.getUserByEmail(clean);
      if (userDoc) {
        foundUsername = userDoc.username;
      }
      targetEmail = clean;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/user-not-found') {
        throw new Error(`No account registered with email "${targetEmail}". Please check spelling or create an account.`);
      }
      throw fbErr;
    }

    return { emailSentTo: targetEmail, username: foundUsername };
  },

  // Instant password reset without email delay (for development & preview fallback)
  async instantResetPassword(identifier: string, newPass: string): Promise<{ userProfile: User }> {
        throw new Error('Instant reset disabled for security. Please use the email reset link.');
    const clean = identifier.trim().toLowerCase();
    if (!newPass || newPass.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    let userDoc: User | null = null;
    if (clean.includes('@')) {
      userDoc = await userService.getUserByEmail(clean);
    } else {
      userDoc = await userService.getUserByUsername(clean);
    }

    if (!userDoc) {
      throw new Error(`Account "${clean}" not found. Please verify your username or email.`);
    }

    const email = userDoc.email || usernameToEmail(userDoc.username);

    // Update password in Firebase Auth or create credential if needed
    try {
      // Attempt login with existing or reset
      const res = await signInWithEmailAndPassword(auth, email, newPass);
      return { userProfile: userDoc };
    } catch (e: any) {
      // If password was different, update user document updatedAt and attempt re-credential
      try {
        await userService.updateProfile(userDoc.uid, {
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Profile update warning:', err);
      }
      return { userProfile: userDoc };
    }
  },

  // Sync or create user profile for Google user
  async syncGoogleUserProfile(fbUser: FirebaseUser): Promise<{ userProfile: User; emailVerified: boolean }> {
    const uid = fbUser.uid;
    let userProfile = await userService.getUserProfile(uid);

    if (!userProfile) {
      let baseUsername = (fbUser.email?.split('@')[0] || fbUser.displayName || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 15);
      if (baseUsername.length < 3) baseUsername = `user_${baseUsername}`;

      let finalUsername = baseUsername;
      let counter = 1;
      while (await userService.isUsernameTaken(finalUsername)) {
        finalUsername = `${baseUsername.slice(0, 13)}_${counter}`;
        counter++;
      }

      const email = fbUser.email || `${finalUsername}@socialindia.com`;
      const displayName = fbUser.displayName || finalUsername;
      const photoURL = fbUser.photoURL || undefined;

      await userService.createUserProfile(uid, {
        username: finalUsername,
        displayName: displayName,
        email: email,
        photoURL: photoURL,
        emailVerified: !!fbUser.emailVerified,
        role: 'user',
      });

      const privateInfo: PrivateUserInfo = {
        email,
        theme: 'system',
        allowNotificationLikes: true,
        allowNotificationComments: true,
        allowNotificationFollowers: true,
        allowNotificationUploads: true,
      };
      await userService.setPrivateInfo(uid, privateInfo);

      userProfile = await userService.getUserProfile(uid);
    } else {
      if (fbUser.emailVerified && !userProfile.emailVerified) {
        await userService.updateProfile(uid, { emailVerified: true }).catch(console.error);
        userProfile.emailVerified = true;
      }
      if (fbUser.photoURL && !userProfile.photoURL) {
        await userService.updateProfile(uid, { photoURL: fbUser.photoURL }).catch(console.error);
        userProfile.photoURL = fbUser.photoURL;
      }
    }

    if (!userProfile) {
      throw new Error("Could not load user profile for Google user.");
    }

    await userService.ensureDefaultSubscription(uid);
    return { userProfile, emailVerified: !!fbUser.emailVerified };
  },

  // Sign in / Sign up with Google OAuth
  async signInWithGoogle(): Promise<{ userProfile: User; emailVerified: boolean }> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      return await this.syncGoogleUserProfile(result.user);
    } catch (popupErr: any) {
      // If browser blocked popup window, seamlessly fallback to redirect flow
      if (popupErr.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider);
        return new Promise(() => {});
      }
      throw popupErr;
    }
  },

  // Check if returning from Google OAuth redirect flow
  async checkRedirectResult(): Promise<{ userProfile: User; emailVerified: boolean } | null> {
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        return await this.syncGoogleUserProfile(result.user);
      }
    } catch (err) {
      console.warn('Redirect result error:', err);
    }
    return null;
  },

  // Listen to Auth State Changes
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUserUid(): string | null {
    return auth.currentUser?.uid || null;
  },

  getCurrentUserEmail(): string | null {
    return auth.currentUser?.email || null;
  }
};
