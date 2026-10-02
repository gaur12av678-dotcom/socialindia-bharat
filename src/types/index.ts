export interface User {
  uid: string;
  username: string;
  email?: string;
  displayName: string;
  bio?: string;
  photoURL?: string;
  bannerURL?: string;
  followersCount: number;
  followingCount: number;
  videosCount: number;
  role: 'user' | 'creator' | 'moderator' | 'admin';
  status: 'active' | 'suspended';
  createdAt: any; // Firestore Timestamp or Date string
  updatedAt: any;
}

export interface PrivateUserInfo {
  email: string;
  theme: 'light' | 'dark' | 'system';
  allowNotificationLikes?: boolean;
  allowNotificationComments?: boolean;
  allowNotificationFollowers?: boolean;
  allowNotificationUploads?: boolean;
}

export interface Video {
  videoId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorPhotoURL?: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isShort: boolean;
  status: 'published' | 'processing' | 'hidden' | 'removed';
  createdAt: any;
  updatedAt: any;
}

export interface Comment {
  commentId: string;
  videoId: string;
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  text: string;
  likesCount: number;
  parentCommentId?: string; // For replies
  createdAt: any;
  updatedAt: any;
}

export interface Like {
  uid: string;
  videoId: string;
  createdAt: any;
}

export interface Subscription {
  subscriberId: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorPhotoURL?: string;
  createdAt: any;
}

export interface Notification {
  notificationId: string;
  recipientId: string;
  actorId: string;
  actorUsername: string;
  actorDisplayName: string;
  actorPhotoURL?: string;
  type: 'like' | 'comment' | 'follow' | 'upload';
  videoId?: string;
  videoTitle?: string;
  commentId?: string;
  message: string;
  read: boolean;
  createdAt: any;
}

export interface HistoryItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  creatorUsername: string;
  creatorDisplayName: string;
  watchedAt: any;
}

export interface SavedVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  creatorUsername: string;
  creatorDisplayName: string;
  savedAt: any;
}

export interface Report {
  reportId: string;
  reporterId: string;
  targetType: 'video' | 'comment' | 'creator';
  targetId: string;
  reason: 'spam' | 'misleading' | 'harassment' | 'copyright' | 'inappropriate' | 'other';
  details?: string;
  createdAt: any;
  status: 'pending' | 'reviewed' | 'resolved';
}
