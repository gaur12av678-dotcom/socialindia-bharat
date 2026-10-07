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
  
  // PlayTube Extended Settings & Rewards Fields
  points?: number;
  walletBalance?: number; // Used for shopping / website purchases
  mainBalance?: number;   // Balance available for withdraw (formerly withdrawable / earnings)
  bonusBalance?: number;
  isPro?: boolean;
  gender?: string;
  country?: string;
  age?: string;
  paypalEmail?: string;
  upiId?: string;
  isMonetized?: boolean;
  monetizationStatus?: 'not_eligible' | 'eligible' | 'requested' | 'approved';
  lastPasswordChangedAt?: string;

  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
    telegram?: string;
  };
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
  twoFactorEnabled?: boolean;
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
  
  // Sound Library Track metadata
  soundId?: string;
  soundTitle?: string;
  soundArtist?: string;
  soundCoverUrl?: string;
  soundAudioUrl?: string;

  // Monetization & Ad Revenue
  isMonetized?: boolean;
  estimatedEarnings?: number;

  // Paid Video Exclusive Access (In INR ₹)
  isPaid?: boolean;
  price?: number;
  paidSalesCount?: number;
  paidEarnings?: number;

  createdAt: any;
  updatedAt: any;
}

export interface VideoPurchase {
  purchaseId: string;
  videoId: string;
  videoTitle: string;
  videoThumbnailUrl?: string;
  creatorId: string;
  creatorUsername: string;
  userId: string;
  username: string;
  userDisplayName?: string;
  amount: number;
  paidWith?: 'wallet' | 'bonus' | 'hybrid';
  createdAt: any;
}

export interface SoundTrack {
  soundId: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  category: string;
  duration: number; // in seconds
  usesCount?: number; // Calculated dynamically from real videos count
  isOriginalSound?: boolean;
  creatorUid?: string;
  createdAt?: any;
}

export interface Playlist {
  playlistId: string;
  title: string;
  description: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorPhotoURL?: string;
  videoIds: string[];
  isPrivate: boolean;
  thumbnailUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface AdCampaign {
  adId: string;
  sponsorName: string;
  sponsorLogo: string;
  headline: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  videoUrl?: string;
  bannerUrl?: string;
  duration: number; // e.g. 15s
  skipAfter: number; // e.g. 5s
  cpm: number; // CPM rate in INR or USD
  
  // Extended Ad Management Fields
  name?: string;
  title?: string;
  targetAudience?: string;
  pricingType?: 'click' | 'view';
  placement?: string;
  dailyLimit?: number;
  totalLimit?: number;
  spent?: number;
  impressions?: number;
  clicks?: number;
  results?: number;
  status?: 'active' | 'paused' | 'ended';
  creatorUid?: string;
  creatorUsername?: string;
  createdAt?: string;
  updatedAt?: string;
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
  isPinned?: boolean; // Pinned by video creator
  pinnedAt?: any;
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
  type: 'like' | 'comment' | 'follow' | 'upload' | 'system';
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

export interface TrashItem {
  id: string; // trash doc id
  itemId: string; // original videoId or uid
  itemType: 'video' | 'short' | 'user';
  title: string;
  subtitle?: string; // username or category
  thumbnailUrl?: string;
  photoURL?: string;
  deletedAt: string; // ISO timestamp
  scheduledPurgeDate: string; // ISO timestamp (180 days after deletion)
  deletedBy: string; // UID or 'admin' / 'user'
  deletedByName?: string;
  status: 'trashed' | 'restored' | 'purged';
  details?: string;
  dataSnapshot: any; // Complete original document for 100% loss-free restore
}

export interface DownloadedVideo {
  videoId: string;
  title: string;
  description?: string;
  videoBlob: Blob;
  thumbnailBlob?: Blob;
  thumbnailUrl?: string;
  duration: number;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorPhotoURL?: string;
  isShort: boolean;
  category?: string;
  sizeBytes: number;
  downloadedAt: string;
  videoUrl?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: any;
  read: boolean;
}

export interface ChatSession {
  userId: string;
  displayName: string;
  username: string;
  photoURL?: string;
  lastMessage?: string;
  lastMessageTime?: any;
  unreadCount: number;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  userEmail?: string;
  userPhotoURL?: string;
  amount: number;
  upiId: string;
  accountHolderName?: string;
  phone?: string;
  status: 'pending' | 'completed' | 'rejected';
  adminNotes?: string;
  paidAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}
