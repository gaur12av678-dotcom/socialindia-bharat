import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
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

export const authService = {
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

    // 1. Create firebase auth user
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = credential.user.uid;

    // 2. Send real Firebase verification email
    try {
      await sendEmailVerification(credential.user);
    } catch (e) {
      console.warn("Could not send verification email automatically:", e);
    }

    // 3. Create the firestore public profile
    await userService.createUserProfile(uid, {
      username: cleanUsername,
      displayName: display || cleanUsername,
      email: email,
      emailVerified: credential.user.emailVerified,
      role: 'user',
    });

    // 4. Create default private info
    const privateInfo: PrivateUserInfo = {
      email,
      theme: 'system',
      allowNotificationLikes: true,
      allowNotificationComments: true,
      allowNotificationFollowers: true,
      allowNotificationUploads: true,
    };
    await userService.setPrivateInfo(uid, privateInfo);

    const userProfile = await userService.getUserProfile(uid);
    if (!userProfile) {
      throw new Error("Failed to create user profile.");
    }

    return { userProfile, emailVerified: credential.user.emailVerified };
  },

  // Send verification email to currently signed in user
  async sendVerificationEmail(): Promise<void> {
    if (!auth.currentUser) {
      throw new Error("No user is currently signed in to verify.");
    }
    await sendEmailVerification(auth.currentUser);
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

    const credential = await signInWithEmailAndPassword(auth, loginEmail, pass);
    const uid = credential.user.uid;

    const userProfile = await userService.getUserProfile(uid);
    if (!userProfile) {
      throw new Error("User profile not found.");
    }

    // Update emailVerified in firestore if it changed
    if (credential.user.emailVerified && !userProfile.emailVerified) {
      await userService.updateProfile(uid, { emailVerified: true }).catch(console.error);
      userProfile.emailVerified = true;
    }

    return { userProfile, emailVerified: credential.user.emailVerified };
  },

  // Log out
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // Reset password via email or username
  async resetPassword(identifier: string): Promise<{ emailSentTo: string }> {
    const clean = identifier.trim().toLowerCase();
    let targetEmail = clean;

    if (!clean.includes('@')) {
      // Lookup username to find registered email
      const userDoc = await userService.getUserByUsername(clean);
      if (!userDoc) {
        throw new Error(`No account found with username "${clean}". Please verify your username.`);
      }
      if (!userDoc.email || userDoc.email.endsWith('@socialindia.com')) {
        throw new Error(`The account "${clean}" has no verified Gmail address associated with it.`);
      }
      targetEmail = userDoc.email;
    } else {
      // It's an email address - check if a user with this email exists in Firestore
      const userDoc = await userService.getUserByEmail(clean);
      if (!userDoc) {
        throw new Error(`No account registered with the email "${clean}". Please check your email or enter your username instead.`);
      }
      targetEmail = clean;
    }

    await sendPasswordResetEmail(auth, targetEmail);
    return { emailSentTo: targetEmail };
  },

  // Sign in / Sign up with Google OAuth
  async signInWithGoogle(): Promise<{ userProfile: User; emailVerified: boolean }> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
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

    return { userProfile, emailVerified: !!fbUser.emailVerified };
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
