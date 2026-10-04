import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../firebase';
import { userService } from './userService';
import { User, PrivateUserInfo } from '../types';

// Map simple username to a system-safe email
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@socialindia.com`;
}

export const authService = {
  // Register a new user
  async register(username: string, display: string, pass: string): Promise<User> {
    const cleanUsername = username.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(cleanUsername)) {
      throw new Error("Username must be between 3 and 20 characters and contain only lowercase letters, numbers, and underscores.");
    }

    const isTaken = await userService.isUsernameTaken(cleanUsername);
    if (isTaken) {
      throw new Error("Username is already taken.");
    }

    const email = usernameToEmail(cleanUsername);
    
    // 1. Create firebase auth user
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = credential.user.uid;

    // 2. Create the firestore public profile
    await userService.createUserProfile(uid, {
      username: username.toLowerCase().trim(),
      displayName: display.trim(),
      email: email, // Pass email to determine admin role
      role: 'user', // Defaults to 'user' unless email matches admin
    });

    // 3. Create default private info
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

    return userProfile;
  },

  // Log in with username and password
  async login(username: string, pass: string): Promise<User> {
    const email = usernameToEmail(username);
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    const uid = credential.user.uid;

    const userProfile = await userService.getUserProfile(uid);
    if (!userProfile) {
      throw new Error("User profile not found.");
    }
    return userProfile;
  },

  // Log out
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // Listen to Auth State Changes
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUserUid(): string | null {
    return auth.currentUser?.uid || null;
  }
};
