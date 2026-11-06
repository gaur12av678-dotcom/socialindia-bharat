import { User } from '../types';

/**
 * Checks whether a given user profile has the official Blue Tick verification badge.
 * A user ONLY qualifies for the verified blue tick badge if:
 * 1. They are explicitly marked verified (`isVerified === true` or `verified === true` or `verificationStatus === 'approved'`)
 * 2. They have subscribed to SocialIndia Pro (`isPro === true`)
 * 3. They are a platform administrator (`role === 'admin'`)
 * 
 * Note: A regular creator (`role === 'creator'`) does NOT get a blue tick automatically.
 */
export function isUserVerified(user?: Partial<User> | null | any): boolean {
  if (!user) return false;
  if (user.isVerified === true || user.verified === true) return true;
  if (user.isPro === true) return true;
  if (user.role === 'admin') return true;
  if (user.verificationStatus === 'approved') return true;
  return false;
}
