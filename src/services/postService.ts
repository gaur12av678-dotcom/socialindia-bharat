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
  increment 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
    isPinned: true,
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

function getLocalPosts(): CommunityPost[] {
  if (typeof window === 'undefined') return DEFAULT_COMMUNITY_POSTS;
  try {
    const raw = localStorage.getItem('si_community_posts');
    if (raw) {
      const parsed = JSON.parse(raw) as CommunityPost[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_COMMUNITY_POSTS;
}

function saveLocalPosts(posts: CommunityPost[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('si_community_posts', JSON.stringify(posts));
  } catch {}
}

export const postService = {
  // Generate random safe unique ID
  generateId(): string {
    return 'post_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
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
    postType: 'text' | 'image' | 'poll';
    images?: string[];
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

    const newPost: CommunityPost = {
      postId,
      authorId: data.authorId,
      authorUsername: data.authorUsername,
      authorDisplayName: data.authorDisplayName,
      authorPhotoURL: data.authorPhotoURL || '',
      authorRole: data.authorRole || 'user',
      content: data.content.trim(),
      postType: data.postType,
      images: data.images && data.images.length > 0 ? data.images : undefined,
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

    if (data.postType === 'image' && data.images && data.images.length > 0) {
      firestoreData.images = data.images;
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

    // Persist to Firestore cloud database
    try {
      await setDoc(doc(db, 'posts', postId), firestoreData);
    } catch (err) {
      console.warn('Community post Firestore sync notice:', err);
    }

    return newPost;
  },

  // Fetch all posts or filtered by author
  async getPosts(filter?: { authorId?: string; authorUsername?: string }): Promise<CommunityPost[]> {
    let allPosts: CommunityPost[] = [];

    try {
      let q = collection(db, 'posts');
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestorePosts = snap.docs.map(d => d.data() as CommunityPost);
        // Merge with defaults to guarantee rich experience
        const existingIds = new Set(firestorePosts.map(p => p.postId));
        const combined = [...firestorePosts];
        for (const def of DEFAULT_COMMUNITY_POSTS) {
          if (!existingIds.has(def.postId)) {
            combined.push(def);
          }
        }
        allPosts = combined;
        saveLocalPosts(allPosts);
        memoryPostsCache = allPosts;
      } else {
        allPosts = getLocalPosts();
      }
    } catch (err) {
      allPosts = getLocalPosts();
    }

    // Sort newest first
    allPosts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
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

  // Delete a post
  async deletePost(postId: string, uid: string): Promise<void> {
    const local = getLocalPosts();
    const updated = local.filter(p => p.postId !== postId);
    saveLocalPosts(updated);
    memoryPostsCache = updated;

    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.warn('Could not delete post from Firestore:', err);
    }
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
