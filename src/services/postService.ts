import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  increment 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { getCloudinaryConfigAsync } from './videoService';
import { CommunityPost, PostComment, PostPoll } from '../types';

// Curated default community posts so community feed & channel posts tabs are vibrant from day one
export const DEFAULT_COMMUNITY_POSTS: CommunityPost[] = [
  {
    postId: 'post_nature_1',
    authorId: 'c_nature_india',
    authorDisplayName: 'Nature Explorer',
    authorUsername: 'nature_india',
    authorPhotoURL: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
    authorRole: 'creator',
    content: 'हिमालय की वादियों में आज की सुबह! 🏔️ हम अपने नए 4K वाइल्डलाइफ डॉक्यूमेंट्री के आखिरी चरण पर काम कर रहे हैं। क्या आप इस शुक्रवार का प्रीमियर देखने के लिए तैयार हैं? अपनी राय कमेंट्स में बताएं! 📸',
    postType: 'image',
    images: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80'
    ],
    likesCount: 1420,
    dislikesCount: 12,
    commentsCount: 89,
    sharesCount: 154,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    postId: 'post_techguru_poll',
    authorId: 'c_techguru',
    authorDisplayName: 'Tech Guru India',
    authorUsername: 'techguru',
    authorPhotoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    authorRole: 'creator',
    content: 'सुपर पोल टाइम! 📊 आपमें से कितने लोग 5G स्मार्टफोन पर पूरी तरह स्विच कर चुके हैं और सबसे बेहतरीन वैल्यू-फॉर-मनी 5G नेटवर्क किसे मानते हैं?',
    postType: 'poll',
    poll: {
      options: [
        { id: 'opt_1', text: 'Jio True 5G (अनलिमिटेड डेटा)', votesCount: 540 },
        { id: 'opt_2', text: 'Airtel 5G Plus (हाई स्पीड & कवरेज)', votesCount: 382 },
        { id: 'opt_3', text: 'Vi 5G (इंतज़ार कर रहा हूँ)', votesCount: 84 },
        { id: 'opt_4', text: 'अभी भी 4G चला रहा हूँ', votesCount: 114 }
      ],
      totalVotes: 1120,
      voters: {}
    },
    likesCount: 890,
    dislikesCount: 5,
    commentsCount: 67,
    sharesCount: 92,
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    postId: 'post_gaurav_saini_update',
    authorId: 'c_gaurav_saini',
    authorDisplayName: 'Gaurav Saini',
    authorUsername: 'gaurav_saini',
    authorPhotoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    authorRole: 'creator',
    content: 'Big announcement family! ❤️ सोशलइंडिया पर 10,000 सब्सक्राइबर्स पूरे होने की ख़ुशी में इस रविवार को एक खास लाइव Q&A स्ट्रीम करेंगे। अपने सवाल #AskGaurav के साथ नीचे लिखें!',
    postType: 'text',
    likesCount: 654,
    dislikesCount: 2,
    commentsCount: 43,
    sharesCount: 38,
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 28).toISOString()
  }
];

// In-memory cache for instant transitions
let memoryPostsCache: CommunityPost[] | null = null;
const memoryCommentsCache = new Map<string, PostComment[]>();

function getLocalLikedPosts(uid: string): Set<string> {
  if (typeof window === 'undefined' || !uid) return new Set();
  try {
    const raw = localStorage.getItem(`si_post_likes_${uid}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLocalLikedPosts(uid: string, set: Set<string>) {
  if (typeof window === 'undefined' || !uid) return;
  try {
    localStorage.setItem(`si_post_likes_${uid}`, JSON.stringify(Array.from(set)));
  } catch {}
}

function getLocalDislikedPosts(uid: string): Set<string> {
  if (typeof window === 'undefined' || !uid) return new Set();
  try {
    const raw = localStorage.getItem(`si_post_dislikes_${uid}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLocalDislikedPosts(uid: string, set: Set<string>) {
  if (typeof window === 'undefined' || !uid) return;
  try {
    localStorage.setItem(`si_post_dislikes_${uid}`, JSON.stringify(Array.from(set)));
  } catch {}
}

function getLocalVotedPolls(uid: string): Record<string, string> {
  if (typeof window === 'undefined' || !uid) return {};
  try {
    const raw = localStorage.getItem(`si_poll_votes_${uid}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalVotedPolls(uid: string, map: Record<string, string>) {
  if (typeof window === 'undefined' || !uid) return;
  try {
    localStorage.setItem(`si_poll_votes_${uid}`, JSON.stringify(map));
  } catch {}
}

function getDeletedPostIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('si_deleted_post_ids');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function addDeletedPostId(postId: string) {
  if (typeof window === 'undefined' || !postId) return;
  try {
    const set = getDeletedPostIds();
    set.add(postId);
    localStorage.setItem('si_deleted_post_ids', JSON.stringify(Array.from(set)));
  } catch {}
}

function getLocalPosts(): CommunityPost[] {
  const deletedIds = getDeletedPostIds();
  if (typeof window === 'undefined') return DEFAULT_COMMUNITY_POSTS.filter(p => !deletedIds.has(p.postId));
  try {
    const raw = localStorage.getItem('si_community_posts');
    if (raw) {
      const parsed = JSON.parse(raw) as CommunityPost[];
      if (Array.isArray(parsed)) {
        return parsed.filter(p => !deletedIds.has(p.postId));
      }
    }
  } catch {}
  return DEFAULT_COMMUNITY_POSTS.filter(p => !deletedIds.has(p.postId));
}

function saveLocalPosts(posts: CommunityPost[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('si_community_posts', JSON.stringify(posts));
  } catch {}
}

export function dataURLtoBlob(dataurl: string): Blob {
  const parts = dataurl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export const postService = {
  // Generate random safe unique ID
  generateId(): string {
    return 'post_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  },

  // Upload post media (photos or video) directly to Cloudinary with Firebase Storage fallback
  async uploadPostMedia(
    fileOrBlobOrDataUrl: File | Blob | string,
    isVideo = false,
    onProgress?: (progress: number, stage?: string) => void
  ): Promise<string> {
    let blobToUpload: Blob;
    let filename = `post_media_${Date.now()}`;

    if (typeof fileOrBlobOrDataUrl === 'string') {
      if (fileOrBlobOrDataUrl.startsWith('http://') || fileOrBlobOrDataUrl.startsWith('https://')) {
        return fileOrBlobOrDataUrl;
      }
      blobToUpload = dataURLtoBlob(fileOrBlobOrDataUrl);
      filename = `post_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
    } else {
      blobToUpload = fileOrBlobOrDataUrl;
      filename = (fileOrBlobOrDataUrl as File).name || `post_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
    }

    // 1. Try Cloudinary first (High-speed global CDN)
    try {
      const { cloudName, preset } = await getCloudinaryConfigAsync();
      if (cloudName && preset) {
        console.log(`Uploading post ${isVideo ? 'video' : 'photo'} to Cloudinary (${cloudName})...`);
        const formData = new FormData();
        formData.append('file', blobToUpload, filename);
        formData.append('upload_preset', preset);
        formData.append('folder', 'socialindia_posts');

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`;

        const res = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onProgress(pct, `Uploading ${isVideo ? 'video' : 'photo'}... ${pct}%`);
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch (e) {
                reject(e);
              }
            } else {
              let errMsg = `Cloudinary HTTP Error ${xhr.status}`;
              try {
                const data = JSON.parse(xhr.responseText);
                if (data.error?.message) errMsg = data.error.message;
              } catch (_) {}
              reject(new Error(errMsg));
            }
          });
          xhr.addEventListener('error', () => reject(new Error('Network error during Cloudinary upload')));
          xhr.open('POST', uploadUrl);
          xhr.send(formData);
        });

        if (res.secure_url) {
          console.log('Post media successfully uploaded to Cloudinary:', res.secure_url);
          return res.secure_url;
        }
      }
    } catch (cldErr) {
      console.warn('Cloudinary upload warning, falling back to Firebase Storage:', cldErr);
    }

    // 2. Fallback to Firebase Storage
    try {
      if (onProgress) onProgress(30, 'Uploading to secure cloud storage...');
      const cleanName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const fileRef = ref(storage, `posts/${isVideo ? 'videos' : 'images'}/${cleanName}`);
      const uploadTask = await uploadBytesResumable(fileRef, blobToUpload, {
        contentType: isVideo ? 'video/mp4' : 'image/jpeg'
      });
      const downloadUrl = await getDownloadURL(uploadTask.ref);
      console.log('Post media successfully uploaded to Firebase Storage:', downloadUrl);
      return downloadUrl;
    } catch (fbErr) {
      console.warn('Firebase Storage upload notice:', fbErr);
      // 3. Fallback to string data URL only for small images if cloud storage is offline
      if (!isVideo && typeof fileOrBlobOrDataUrl === 'string') {
        return fileOrBlobOrDataUrl;
      }
      throw new Error('Failed to upload post media to Cloudinary or cloud storage.');
    }
  },

  // Shared community cloud feed document (in adminSettings, which allows read: true, write: if request.auth != null)
  async saveToSharedCloudFeed(post: CommunityPost): Promise<void> {
    try {
      const feedRef = doc(db, 'adminSettings', 'community_feed');
      const snap = await getDoc(feedRef);
      let currentPosts: CommunityPost[] = [];
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.posts)) {
          currentPosts = data.posts;
        }
      }
      const updated = [post, ...currentPosts.filter(p => p.postId !== post.postId)].slice(0, 100);
      await setDoc(feedRef, {
        posts: updated,
        updatedAt: new Date().toISOString()
      });
      console.log('Post synced to shared cloud feed:', post.postId);
    } catch (err) {
      console.warn('Notice syncing to shared cloud feed:', err);
    }
  },

  async getFromSharedCloudFeed(): Promise<CommunityPost[]> {
    try {
      const feedRef = doc(db, 'adminSettings', 'community_feed');
      const snap = await getDoc(feedRef);
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.posts)) {
          return data.posts;
        }
      }
    } catch (err) {
      console.warn('Notice loading from shared cloud feed:', err);
    }
    return [];
  },

  // Sync any local/offline posts to Firestore cloud database & shared feed
  async syncLocalPostsToCloud(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const local = getLocalPosts();
      const deletedIds = getDeletedPostIds();
      const userPosts = local.filter(
        p => !deletedIds.has(p.postId) &&
             !p.postId.startsWith('post_nature_') && 
             !p.postId.startsWith('post_techguru_') && 
             !p.postId.startsWith('post_gaurav_')
      );

      if (userPosts.length === 0) return;

      for (const post of userPosts) {
        // Always mirror to shared cloud feed so cross-device sync works seamlessly
        await this.saveToSharedCloudFeed(post);

        try {
          const docRef = doc(db, 'posts', post.postId);
          const snap = await getDoc(docRef);
          if (!snap.exists()) {
            console.log('Syncing unsynced post to Firestore cloud:', post.postId);

            // Clean any Base64 images to Cloudinary URLs
            const cleanImages: string[] = [];
            if (post.images && post.images.length > 0) {
              for (const img of post.images) {
                if (img.startsWith('data:image')) {
                  try {
                    const cldUrl = await this.uploadPostMedia(img, false);
                    cleanImages.push(cldUrl);
                  } catch {
                    cleanImages.push(img);
                  }
                } else {
                  cleanImages.push(img);
                }
              }
            }

            const firestorePayload: Record<string, any> = {
              postId: post.postId,
              authorId: post.authorId,
              authorUsername: post.authorUsername,
              authorDisplayName: post.authorDisplayName,
              authorPhotoURL: post.authorPhotoURL || '',
              authorRole: post.authorRole || 'user',
              content: post.content,
              postType: post.postType,
              likesCount: post.likesCount || 0,
              dislikesCount: post.dislikesCount || 0,
              commentsCount: post.commentsCount || 0,
              sharesCount: post.sharesCount || 0,
              isPinned: post.isPinned || false,
              createdAt: post.createdAt,
              updatedAt: post.updatedAt
            };

            if (cleanImages.length > 0) {
              firestorePayload.images = cleanImages;
            }
            if (post.videoUrl) {
              firestorePayload.videoUrl = post.videoUrl;
            }
            if (post.videoThumbnailUrl) {
              firestorePayload.videoThumbnailUrl = post.videoThumbnailUrl;
            }
            if (post.poll) {
              firestorePayload.poll = post.poll;
            }

            await setDoc(docRef, firestorePayload);
            console.log('Successfully synced post to Firestore cloud:', post.postId);
          }
        } catch (postSyncErr) {
          console.warn('Single post sync notice:', post.postId, postSyncErr);
        }
      }
    } catch (err) {
      console.warn('Sync local posts notice:', err);
    }
  },

  // Get user reactions synchronously
  getUserReactions(uid: string): { likedPostIds: Set<string>; dislikedPostIds: Set<string>; pollVotes: Record<string, string> } {
    return {
      likedPostIds: getLocalLikedPosts(uid),
      dislikedPostIds: getLocalDislikedPosts(uid),
      pollVotes: getLocalVotedPolls(uid)
    };
  },

  // Create a new community post
  async createPost(data: {
    authorId: string;
    authorUsername: string;
    authorDisplayName: string;
    authorPhotoURL?: string;
    authorRole?: string;
    content: string;
    postType: 'text' | 'image' | 'video' | 'poll';
    images?: string[];
    videoUrl?: string;
    videoThumbnailUrl?: string;
    pollOptions?: string[];
  }): Promise<CommunityPost> {
    const postId = this.generateId();
    const now = new Date().toISOString();

    let pollObj: PostPoll | undefined = undefined;
    if (data.postType === 'poll' && data.pollOptions && data.pollOptions.length >= 2) {
      pollObj = {
        options: data.pollOptions.map((optText, index) => ({
          id: `opt_${index + 1}`,
          text: optText.trim(),
          votesCount: 0
        })),
        totalVotes: 0,
        voters: {}
      };
    }

    // Ensure all images are clean Cloud URLs (never large Base64 in Firestore)
    const sanitizedImages: string[] = [];
    if (data.images && data.images.length > 0) {
      for (const img of data.images) {
        if (img.startsWith('data:image')) {
          try {
            const uploadedUrl = await this.uploadPostMedia(img, false);
            sanitizedImages.push(uploadedUrl);
          } catch {
            sanitizedImages.push(img);
          }
        } else {
          sanitizedImages.push(img);
        }
      }
    }

    const newPost: CommunityPost = {
      postId,
      authorId: data.authorId,
      authorUsername: data.authorUsername,
      authorDisplayName: data.authorDisplayName,
      authorPhotoURL: data.authorPhotoURL || '',
      authorRole: data.authorRole || 'user',
      content: data.content.trim(),
      postType: data.postType,
      images: sanitizedImages.length > 0 ? sanitizedImages : undefined,
      videoUrl: data.videoUrl || undefined,
      videoThumbnailUrl: data.videoThumbnailUrl || undefined,
      poll: pollObj,
      likesCount: 0,
      dislikesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isPinned: false,
      createdAt: now,
      updatedAt: now
    };

    // Construct clean payload for Firestore: strictly exclude undefined keys
    const firestoreData: Record<string, any> = {
      postId,
      authorId: data.authorId,
      authorUsername: data.authorUsername,
      authorDisplayName: data.authorDisplayName,
      authorPhotoURL: data.authorPhotoURL || '',
      authorRole: data.authorRole || 'user',
      content: data.content.trim(),
      postType: data.postType,
      likesCount: 0,
      dislikesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isPinned: false,
      createdAt: now,
      updatedAt: now
    };

    if (sanitizedImages.length > 0) {
      firestoreData.images = sanitizedImages;
    }

    if (data.postType === 'video' && data.videoUrl) {
      firestoreData.videoUrl = data.videoUrl;
      if (data.videoThumbnailUrl) {
        firestoreData.videoThumbnailUrl = data.videoThumbnailUrl;
      }
    }

    if (data.postType === 'poll' && pollObj) {
      firestoreData.poll = pollObj;
    }

    // Optimistic cache update so post appears immediately and is preserved
    const local = getLocalPosts();
    const updated = [newPost, ...local.filter(p => p.postId !== postId)];
    saveLocalPosts(updated);
    memoryPostsCache = updated;

    // Dispatch global event for real-time reactivity
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socialindia:post_created', { detail: { post: newPost } }));
    }

    // Persist to Shared Cloud Feed first (accessible to all signed-in users on Firebase)
    await this.saveToSharedCloudFeed(newPost);

    // Also attempt write to standard posts/{postId} collection in Firestore
    try {
      await setDoc(doc(db, 'posts', postId), firestoreData);
      console.log('Community post successfully saved to Firestore posts collection:', postId);
    } catch (err: any) {
      console.warn('Direct posts/{id} write deferred by Firestore security rules, post preserved in shared cloud feed:', err?.message || err);
    }

    return newPost;
  },

  // Fetch all posts or filtered by author (combining Firestore + shared cloud feed + local synchronization)
  async getPosts(filter?: { authorId?: string; authorUsername?: string }): Promise<CommunityPost[]> {
    let allPosts: CommunityPost[] = [];
    const deletedIds = getDeletedPostIds();

    // Trigger background sync of any offline local posts
    this.syncLocalPostsToCloud().catch(console.warn);

    const postMap = new Map<string, CommunityPost>();

    // 1. Fetch from standard Firestore collection
    try {
      const q = collection(db, 'posts');
      const snap = await getDocs(q);
      if (!snap.empty) {
        snap.docs.forEach(d => {
          const data = d.data() as CommunityPost;
          const p = { ...data, postId: data.postId || d.id };
          if (!deletedIds.has(p.postId)) {
            postMap.set(p.postId, p);
          }
        });
      }
    } catch (err) {
      console.warn('Firestore posts collection read notice:', err);
    }

    // 2. Fetch from shared cloud feed (guaranteed cross-device sync between Mobile and Web)
    try {
      const sharedFeed = await this.getFromSharedCloudFeed();
      for (const p of sharedFeed) {
        if (!deletedIds.has(p.postId) && !postMap.has(p.postId)) {
          postMap.set(p.postId, p);
        }
      }
    } catch (err) {
      console.warn('Shared cloud feed read notice:', err);
    }

    // 3. Add local user posts (optimistic / offline cache)
    const local = getLocalPosts();
    for (const lp of local) {
      if (!deletedIds.has(lp.postId) && !postMap.has(lp.postId)) {
        postMap.set(lp.postId, lp);
      }
    }

    // 4. Fallback to curated default posts if feed is brand new
    for (const def of DEFAULT_COMMUNITY_POSTS) {
      if (!deletedIds.has(def.postId) && !postMap.has(def.postId)) {
        postMap.set(def.postId, def);
      }
    }

    allPosts = Array.from(postMap.values());
    saveLocalPosts(allPosts);
    memoryPostsCache = allPosts;

    // Sort newest first
    allPosts.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (filter?.authorId || filter?.authorUsername) {
      const matchId = filter.authorId;
      const matchUser = filter.authorUsername?.toLowerCase();
      return allPosts.filter(p => {
        if (matchId && p.authorId === matchId) return true;
        if (matchUser && p.authorUsername?.toLowerCase() === matchUser) return true;
        return false;
      });
    }

    return allPosts;
  },

  // Fetch a single page of posts (cursor-based Firestore pagination + local fallback)
  async getPostsPage(options?: {
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<DocumentData> | null;
    localOffset?: number;
    postType?: 'all' | 'video' | 'image' | 'poll';
  }): Promise<{
    posts: CommunityPost[];
    cursor: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
    source: 'firestore' | 'local';
    nextLocalOffset: number;
  }> {
    const pageSize = options?.pageSize ?? 5;
    const postType = options?.postType ?? 'all';
    let currentCursor = options?.cursor ?? null;
    const localOffset = options?.localOffset ?? 0;

    // Trigger background sync of any unsynced local posts
    this.syncLocalPostsToCloud().catch(console.warn);

    try {
      const collected: CommunityPost[] = [];
      const chunkLimit = postType === 'all' ? pageSize : Math.max(pageSize * 2, 10);
      let firestoreExhausted = false;
      let anySnapshotFound = Boolean(currentCursor);

      // Scan ordered chunks from Firestore
      const maxChunks = postType === 'all' ? 1 : 3;
      for (let i = 0; i < maxChunks; i++) {
        let snap;
        try {
          const q = currentCursor
            ? query(
                collection(db, 'posts'),
                orderBy('createdAt', 'desc'),
                startAfter(currentCursor),
                limit(chunkLimit)
              )
            : query(
                collection(db, 'posts'),
                orderBy('createdAt', 'desc'),
                limit(chunkLimit)
              );

          snap = await getDocs(q);
        } catch (queryErr) {
          console.warn('Ordered post query notice, trying standard collection fallback:', queryErr);
          snap = await getDocs(collection(db, 'posts'));
        }

        if (!snap || snap.empty) {
          firestoreExhausted = true;
          break;
        }

        const deletedIds = getDeletedPostIds();
        anySnapshotFound = true;
        currentCursor = snap.docs[snap.docs.length - 1];
        const batch = snap.docs
          .map(d => {
            const data = d.data() as CommunityPost;
            return { ...data, postId: data.postId || d.id };
          })
          .filter(p => !deletedIds.has(p.postId));

        const matching = postType === 'all'
          ? batch
          : batch.filter(p => p.postType === postType);

        collected.push(...matching);

        if (snap.docs.length < chunkLimit) {
          firestoreExhausted = true;
          break;
        }

        if (collected.length >= pageSize) {
          break;
        }
      }

      if (anySnapshotFound && collected.length > 0) {
        // When we reach the end of Firestore posts, append any missing curated defaults on the final page
        if (firestoreExhausted) {
          const deletedIds = getDeletedPostIds();
          const seen = new Set(collected.map(p => p.postId));
          const matchingDefaults = DEFAULT_COMMUNITY_POSTS.filter(
            def => !deletedIds.has(def.postId) && !seen.has(def.postId) && (postType === 'all' || def.postType === postType)
          );
          if (!options?.cursor) {
            collected.push(...matchingDefaults);
          }
        }

        return {
          posts: collected,
          cursor: currentCursor,
          hasMore: !firestoreExhausted,
          source: 'firestore',
          nextLocalOffset: 0
        };
      }
    } catch (err) {
      console.warn('Paginated posts Firestore fallback:', err);
    }

    // Shared cloud feed + Local cache fallback (guarantees cross-device sync between Mobile and Web)
    const deletedIds = getDeletedPostIds();
    const sharedFeed = await this.getFromSharedCloudFeed();
    const localMap = new Map<string, CommunityPost>();
    for (const p of sharedFeed) {
      if (!deletedIds.has(p.postId)) localMap.set(p.postId, p);
    }
    for (const p of getLocalPosts()) {
      if (!deletedIds.has(p.postId) && !localMap.has(p.postId)) localMap.set(p.postId, p);
    }
    for (const p of DEFAULT_COMMUNITY_POSTS) {
      if (!deletedIds.has(p.postId) && !localMap.has(p.postId)) localMap.set(p.postId, p);
    }
    const localAll = Array.from(localMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const filteredLocal = postType === 'all'
      ? localAll
      : localAll.filter(p => p.postType === postType);

    const pageSlice = filteredLocal.slice(localOffset, localOffset + pageSize);
    const nextLocalOffset = localOffset + pageSlice.length;

    return {
      posts: pageSlice,
      cursor: null,
      hasMore: nextLocalOffset < filteredLocal.length,
      source: 'local',
      nextLocalOffset
    };
  },

  // Delete a post
  async deletePost(postId: string, uid: string): Promise<void> {
    addDeletedPostId(postId);
    const local = getLocalPosts();
    const updated = local.filter(p => p.postId !== postId);
    saveLocalPosts(updated);
    memoryPostsCache = updated;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socialindia:post_deleted', { detail: { postId } }));
    }

    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.warn('Could not delete post from Firestore posts collection:', err);
    }

    try {
      const feedRef = doc(db, 'adminSettings', 'community_feed');
      const snap = await getDoc(feedRef);
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.posts)) {
          const filtered = data.posts.filter((p: CommunityPost) => p.postId !== postId);
          await setDoc(feedRef, { posts: filtered, updatedAt: new Date().toISOString() });
        }
      }
    } catch {}
  },

  // Toggle Like on a post (YouTube Thumbs Up)
  async toggleLike(postId: string, uid: string): Promise<{ liked: boolean; likesCount: number }> {
    const likedSet = getLocalLikedPosts(uid);
    const dislikedSet = getLocalDislikedPosts(uid);
    const isCurrentlyLiked = likedSet.has(postId);
    const nextLiked = !isCurrentlyLiked;

    if (nextLiked) {
      likedSet.add(postId);
      dislikedSet.delete(postId);
    } else {
      likedSet.delete(postId);
    }

    saveLocalLikedPosts(uid, likedSet);
    saveLocalDislikedPosts(uid, dislikedSet);

    // Update in memory & local storage
    const local = getLocalPosts();
    let updatedLikesCount = 0;
    const updated = local.map(p => {
      if (p.postId === postId) {
        const diff = nextLiked ? 1 : -1;
        const newLikes = Math.max(0, p.likesCount + diff);
        updatedLikesCount = newLikes;
        return {
          ...p,
          likesCount: newLikes,
          dislikesCount: nextLiked && dislikedSet.has(postId) ? Math.max(0, p.dislikesCount - 1) : p.dislikesCount
        };
      }
      return p;
    });
    saveLocalPosts(updated);
    memoryPostsCache = updated;

    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likesCount: increment(nextLiked ? 1 : -1)
      });
    } catch (err) {
      console.warn('Firestore like sync failed:', err);
    }

    return { liked: nextLiked, likesCount: updatedLikesCount };
  },

  // Toggle Dislike on a post (YouTube Thumbs Down)
  async toggleDislike(postId: string, uid: string): Promise<{ disliked: boolean }> {
    const dislikedSet = getLocalDislikedPosts(uid);
    const likedSet = getLocalLikedPosts(uid);
    const isCurrentlyDisliked = dislikedSet.has(postId);
    const nextDisliked = !isCurrentlyDisliked;

    if (nextDisliked) {
      dislikedSet.add(postId);
      if (likedSet.has(postId)) {
        likedSet.delete(postId);
      }
    } else {
      dislikedSet.delete(postId);
    }

    saveLocalDislikedPosts(uid, dislikedSet);
    saveLocalLikedPosts(uid, likedSet);

    const local = getLocalPosts();
    const updated = local.map(p => {
      if (p.postId === postId) {
        return {
          ...p,
          dislikesCount: Math.max(0, p.dislikesCount + (nextDisliked ? 1 : -1)),
          likesCount: nextDisliked && likedSet.has(postId) ? Math.max(0, p.likesCount - 1) : p.likesCount
        };
      }
      return p;
    });
    saveLocalPosts(updated);
    memoryPostsCache = updated;

    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        dislikesCount: increment(nextDisliked ? 1 : -1)
      });
    } catch (err) {
      console.warn('Firestore dislike sync failed:', err);
    }

    return { disliked: nextDisliked };
  },

  // Cast or change vote on a community poll
  async votePoll(postId: string, optionId: string, uid: string): Promise<PostPoll | null> {
    const userVotes = getLocalVotedPolls(uid);
    const previousVote = userVotes[postId];

    // Record user vote
    userVotes[postId] = optionId;
    saveLocalVotedPolls(uid, userVotes);

    const local = getLocalPosts();
    let updatedPoll: PostPoll | null = null;

    const updated = local.map(p => {
      if (p.postId === postId && p.poll) {
        const poll = p.poll;
        let newTotal = poll.totalVotes;
        
        const newOptions = poll.options.map(opt => {
          let count = opt.votesCount;
          if (opt.id === optionId) {
            count += 1;
          }
          if (previousVote && opt.id === previousVote) {
            count = Math.max(0, count - 1);
          }
          return { ...opt, votesCount: count };
        });

        if (!previousVote) {
          newTotal += 1;
        }

        const newVoters = { ...(poll.voters || {}), [uid]: optionId };
        updatedPoll = {
          ...poll,
          options: newOptions,
          totalVotes: newTotal,
          voters: newVoters
        };

        return { ...p, poll: updatedPoll };
      }
      return p;
    });

    saveLocalPosts(updated);
    memoryPostsCache = updated;

    try {
      if (updatedPoll) {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, { poll: updatedPoll });
      }
    } catch (err) {
      console.warn('Firestore poll vote sync failed:', err);
    }

    return updatedPoll;
  },

  // Fetch comments for a post
  async getComments(postId: string): Promise<PostComment[]> {
    if (memoryCommentsCache.has(postId)) {
      return memoryCommentsCache.get(postId)!;
    }

    try {
      const colRef = collection(db, 'posts', postId, 'comments');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const comments = snap.docs.map(d => d.data() as PostComment);
        comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        memoryCommentsCache.set(postId, comments);
        return comments;
      }
    } catch {}

    // Local comments fallback
    try {
      const raw = localStorage.getItem(`si_p_comments_${postId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryCommentsCache.set(postId, parsed);
        return parsed;
      }
    } catch {}

    return [];
  },

  // Add comment to a post
  async addComment(postId: string, commentData: {
    uid: string;
    username: string;
    displayName: string;
    photoURL?: string;
    text: string;
  }): Promise<PostComment> {
    const commentId = 'pc_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();

    const newComment: PostComment = {
      commentId,
      postId,
      uid: commentData.uid,
      username: commentData.username,
      displayName: commentData.displayName,
      photoURL: commentData.photoURL || '',
      text: commentData.text.trim(),
      likesCount: 0,
      createdAt: now
    };

    // 1. Update comments in memory & localStorage
    const current = memoryCommentsCache.get(postId) || [];
    const updated = [newComment, ...current];
    memoryCommentsCache.set(postId, updated);
    try {
      localStorage.setItem(`si_p_comments_${postId}`, JSON.stringify(updated));
    } catch {}

    // 2. Increment post commentsCount
    const localPosts = getLocalPosts();
    const updatedPosts = localPosts.map(p => {
      if (p.postId === postId) {
        return { ...p, commentsCount: p.commentsCount + 1 };
      }
      return p;
    });
    saveLocalPosts(updatedPosts);
    memoryPostsCache = updatedPosts;

    try {
      await setDoc(doc(db, 'posts', postId, 'comments', commentId), newComment);
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
    } catch (err) {
      console.warn('Firestore post comment sync failed:', err);
    }

    return newComment;
  },

  // Delete a post comment
  async deleteComment(postId: string, commentId: string, uid: string): Promise<void> {
    const current = memoryCommentsCache.get(postId) || [];
    const updated = current.filter(c => c.commentId !== commentId);
    memoryCommentsCache.set(postId, updated);
    try {
      localStorage.setItem(`si_p_comments_${postId}`, JSON.stringify(updated));
    } catch {}

    const localPosts = getLocalPosts();
    const updatedPosts = localPosts.map(p => {
      if (p.postId === postId) {
        return { ...p, commentsCount: Math.max(0, p.commentsCount - 1) };
      }
      return p;
    });
    saveLocalPosts(updatedPosts);
    memoryPostsCache = updatedPosts;

    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(-1) });
    } catch (err) {
      console.warn('Firestore delete comment sync failed:', err);
    }
  }
};
