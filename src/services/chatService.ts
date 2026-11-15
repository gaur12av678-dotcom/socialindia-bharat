import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { ChatMessage, ChatSession, User } from '../types';
import { userService } from './userService';
import { getCloudinaryConfigAsync } from './videoService';

const getChatCacheKey = (userA: string, userB: string) => {
  const sorted = [userA, userB].sort().join('_');
  return `socialindia_chat_msgs_${sorted}`;
};

const getConversationId = (userA: string, userB: string) =>
  [userA, userB].sort().join('_');

export const chatService = {
  // Local storage cache helpers for instant zero-latency loading
  getCachedSessions(currentUserId: string): ChatSession[] {
    try {
      const saved = localStorage.getItem(`socialindia_chat_sessions_${currentUserId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  setCachedSessions(currentUserId: string, sessions: ChatSession[]): void {
    try {
      localStorage.setItem(`socialindia_chat_sessions_${currentUserId}`, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Error saving chat sessions to cache:', e);
    }
  },

  getCachedMessages(userA: string, userB: string): ChatMessage[] {
    try {
      const key = getChatCacheKey(userA, userB);
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  setCachedMessages(userA: string, userB: string, messages: ChatMessage[]): void {
    try {
      const key = getChatCacheKey(userA, userB);
      // Keep up to 200 most recent messages in cache to keep localStorage light & snappy
      const trimmed = messages.slice(-200);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Error saving messages to cache:', e);
    }
  },

  // Upload chat media (image or video) with Cloudinary and resilient client-side fallback
  async uploadChatMedia(
    file: File, 
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; type: 'image' | 'video' }> {
    const isVideo = file.type.startsWith('video/');
    const type: 'image' | 'video' = isVideo ? 'video' : 'image';

    // 1. Try Cloudinary if configured
    try {
      const { cloudName, preset } = await getCloudinaryConfigAsync();
      if (cloudName && preset) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', preset);
        formData.append('folder', 'socialindia_chats');

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`;

        const res = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });
          xhr.addEventListener('error', () => reject(new Error('Network error during media upload')));
          xhr.open('POST', uploadUrl);
          xhr.send(formData);
        });

        if (res.secure_url) {
          return { url: res.secure_url, type };
        }
      }
    } catch (cldErr) {
      console.warn('Cloudinary media upload failed:', cldErr);
    }

    throw new Error(
      'Media upload failed. Please check Cloudinary configuration and try again.'
    );
  },

  // Create an empty conversation when a user opens a chat.
  async ensureConversation(userA: string, userB: string): Promise<void> {
    if (!userA || !userB || userA === userB) return;

    const participants = [userA, userB].sort();
    const conversationRef = doc(
      db,
      'conversations',
      getConversationId(userA, userB)
    );

    const existing = await getDoc(conversationRef);

    if (!existing.exists()) {
      await setDoc(conversationRef, {
        participants,
        lastMessage: '',
        lastMessageAt: null,
        updatedAt: Timestamp.now()
      });
    }
  },

  // Listen to conversations involving the signed-in user.
  listenToConversations(
    currentUserId: string,
    callback: (sessions: ChatSession[]) => void
  ) {
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );

    return onSnapshot(
      conversationsQuery,
      async snapshot => {
        try {
          const conversationSessions = await Promise.all(
            snapshot.docs.map(async conversationDoc => {
              const data = conversationDoc.data();
              const partnerId = (data.participants || []).find(
                (uid: string) => uid !== currentUserId
              );

              if (!partnerId) return null;

              const profile = await userService.getUserProfile(partnerId);
              if (!profile) return null;

              const lastMessageTime = data.lastMessageAt?.toDate
                ? data.lastMessageAt.toDate().toISOString()
                : undefined;

              return {
                userId: partnerId,
                displayName: profile.displayName,
                username: profile.username,
                photoURL: profile.photoURL,
                lastMessage: data.lastMessage || undefined,
                lastMessageTime,
                unreadCount: 0
              } as ChatSession;
            })
          );

          const legacySessions = await this.getChatSessions(currentUserId);
          const merged = new Map<string, ChatSession>();

          legacySessions.forEach(session => merged.set(session.userId, session));
          conversationSessions.forEach(session => {
            if (session) {
              const previous = merged.get(session.userId);
              merged.set(session.userId, {
                ...previous,
                ...session,
                lastMessage: session.lastMessage || previous?.lastMessage,
                lastMessageTime: session.lastMessageTime || previous?.lastMessageTime,
                unreadCount: previous?.unreadCount || 0
              });
            }
          });

          const sorted = [...merged.values()].sort((a, b) => {
            if (a.lastMessageTime && b.lastMessageTime) {
              return new Date(b.lastMessageTime).getTime() -
                new Date(a.lastMessageTime).getTime();
            }
            if (a.lastMessageTime) return -1;
            if (b.lastMessageTime) return 1;
            return a.displayName.localeCompare(b.displayName);
          });

          this.setCachedSessions(currentUserId, sorted);
          callback(sorted);
        } catch (error) {
          console.error('Conversation listener processing failed:', error);
          callback(this.getCachedSessions(currentUserId));
        }
      },
      error => {
        console.error('Conversation listener failed:', error);
        callback(this.getCachedSessions(currentUserId));
      }
    );
  },

  // Send a direct chat message (with optional media attachment)
  async sendMessage(
    senderId: string, 
    receiverId: string, 
    text: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video'
  ): Promise<string> {
    const trimmedText = text.trim();
    if (!trimmedText && !mediaUrl) return '';

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId,
      receiverId,
      text: trimmedText,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || undefined,
      createdAt: new Date().toISOString(),
      read: false
    };

    const messagesCol = collection(db, 'chats');
    const docPayload: any = {
      senderId,
      receiverId,
      text: trimmedText,
      createdAt: Timestamp.now(),
      read: false
    };

    if (mediaUrl) docPayload.mediaUrl = mediaUrl;
    if (mediaType) docPayload.mediaType = mediaType;

    try {
      const docRef = await addDoc(messagesCol, docPayload);

      // Update the inbox preview without treating a preview failure
      // as a failed message delivery.
      try {
        const participants = [senderId, receiverId].sort();
        await setDoc(
          doc(db, 'conversations', getConversationId(senderId, receiverId)),
          {
            participants,
            lastMessage: trimmedText || (
              mediaType === 'image' ? '📷 Photo' :
              mediaType === 'video' ? '🎥 Video' : 'Attachment'
            ),
            lastMessageAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          },
          { merge: true }
        );
      } catch (conversationError) {
        console.error('Message sent, but inbox preview update failed:', conversationError);
      }

      const savedMessage: ChatMessage = {
        ...newMsg,
        id: docRef.id
      };

      const existing = this.getCachedMessages(senderId, receiverId);
      const withoutDuplicate = existing.filter(message => !message.id.startsWith('temp_'));
      this.setCachedMessages(senderId, receiverId, [...withoutDuplicate, savedMessage]);

      return docRef.id;
    } catch (err) {
      console.error('Firestore sendMessage failed:', err);
      throw err;
    }
  },

  // Listen only to messages exchanged between the selected two users.
  listenToMessages(userA: string, userB: string, callback: (messages: ChatMessage[]) => void) {
    const messagesCol = collection(db, 'chats');
    const messagesByPair = new Map<string, ChatMessage[]>();

    const publishMessages = () => {
      const merged = [...messagesByPair.values()]
        .flat()
        .sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeA - timeB;
        });

      const unique = Array.from(
        new Map(merged.map(message => [message.id, message])).values()
      );

      this.setCachedMessages(userA, userB, unique);
      callback(unique);
    };

    const createListener = (senderId: string, receiverId: string) => {
      const pairKey = `${senderId}_${receiverId}`;
      // Use a single-field query to avoid requiring a composite Firestore index.
      const q = query(
        messagesCol,
        where('senderId', '==', senderId)
      );

      return onSnapshot(
        q,
        snapshot => {
          const matchingDocs = snapshot.docs.filter(
            d => d.data().receiverId === receiverId
          );

          messagesByPair.set(
            pairKey,
            matchingDocs.map(d => {
              const data = d.data();
              const createdAt = data.createdAt?.toDate
                ? data.createdAt.toDate().toISOString()
                : data.createdAt || new Date().toISOString();

              return {
                id: d.id,
                senderId: data.senderId,
                receiverId: data.receiverId,
                text: data.text || '',
                mediaUrl: data.mediaUrl || undefined,
                mediaType: data.mediaType || undefined,
                createdAt,
                read: Boolean(data.read)
              } as ChatMessage;
            })
          );

          publishMessages();
        },
        error => {
          console.error(`Chat listener failed for ${pairKey}:`, error);
          if (messagesByPair.size === 0) {
            callback(this.getCachedMessages(userA, userB));
          }
        }
      );
    };

    const unsubscribeOutgoing = createListener(userA, userB);
    const unsubscribeIncoming = createListener(userB, userA);

    return () => {
      unsubscribeOutgoing();
      unsubscribeIncoming();
    };
  },

  // Retrieve list of chat sessions (users whom the current user has chatted with, or can chat with)
  async getChatSessions(currentUserId: string): Promise<ChatSession[]> {
    // 1. Conversation partners are discovered from this user's messages.
    // 2. Fetch only messages involving the current user.
    let allMsgs: any[] = [];
    try {
      const messagesCol = collection(db, 'chats');

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(query(messagesCol, where('senderId', '==', currentUserId))),
        getDocs(query(messagesCol, where('receiverId', '==', currentUserId)))
      ]);

      const messageMap = new Map<string, any>();

      [...sentSnapshot.docs, ...receivedSnapshot.docs].forEach(d => {
        const data = d.data();
        messageMap.set(d.id, {
          id: d.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text || '',
          mediaType: data.mediaType || undefined,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt || new Date().toISOString(),
          read: Boolean(data.read)
        });
      });

      allMsgs = [...messageMap.values()].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.warn('Failed to load current user chat messages:', err);
      const cached = this.getCachedSessions(currentUserId);
      if (cached.length > 0) return cached;
    }

    // 3. Fetch profiles only for users who have exchanged messages.
    const partnerIds = [...new Set(
      allMsgs
        .map(m => m.senderId === currentUserId ? m.receiverId : m.senderId)
        .filter((uid): uid is string => Boolean(uid) && uid !== currentUserId)
    )];

    const profileResults = await Promise.all(
      partnerIds.map(uid => userService.getUserProfile(uid))
    );

    const otherUsers: User[] = profileResults.filter(
      (user): user is User => user !== null
    );

    const sessions: ChatSession[] = [];

    for (const user of otherUsers) {
      // Find messages between currentUser and this user
      const userMsgs = allMsgs.filter(m => 
        (m.senderId === currentUserId && m.receiverId === user.uid) ||
        (m.senderId === user.uid && m.receiverId === currentUserId)
      );

      const lastMsg = userMsgs[0]; // Since messages are ordered desc, the first is the latest
      const unread = userMsgs.filter(m => m.senderId === user.uid && !m.read).length;

      const lastPreview = lastMsg
        ? (lastMsg.text || (lastMsg.mediaType === 'image' ? '📷 Photo' : lastMsg.mediaType === 'video' ? '🎥 Video' : 'Attachment'))
        : undefined;

      sessions.push({
        userId: user.uid,
        displayName: user.displayName,
        username: user.username,
        photoURL: user.photoURL,
        lastMessage: lastPreview,
        lastMessageTime: lastMsg ? lastMsg.createdAt : undefined,
        unreadCount: unread
      });
    }

    // If Firestore message list was empty, check if we have cached sessions with messages
    const cachedSessions = this.getCachedSessions(currentUserId);
    if (sessions.length === 0 && cachedSessions.length > 0) {
      return cachedSessions;
    }

    // Merge cached conversation previews if available
    for (const s of sessions) {
      const cachedMatch = cachedSessions.find(cs => cs.userId === s.userId);
      if (cachedMatch && !s.lastMessage && cachedMatch.lastMessage) {
        s.lastMessage = cachedMatch.lastMessage;
        s.lastMessageTime = cachedMatch.lastMessageTime;
      }
    }

    // Sort active conversations to the top
    const sorted = sessions.sort((a, b) => {
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    this.setCachedSessions(currentUserId, sorted);
    return sorted;
  },

  // Delete only messages exchanged between the selected two users.
  async deleteChatHistory(userA: string, userB: string): Promise<void> {
    const messagesCol = collection(db, 'chats');

    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      getDocs(query(
        messagesCol,
        where('senderId', '==', userA),
        where('receiverId', '==', userB)
      )),
      getDocs(query(
        messagesCol,
        where('senderId', '==', userB),
        where('receiverId', '==', userA)
      ))
    ]);

    const docs = [...sentSnapshot.docs, ...receivedSnapshot.docs];

    // Firestore batches support at most 500 writes.
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      docs.slice(i, i + 450).forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    }

    this.setCachedMessages(userA, userB, []);
  },

  // Mark all messages from a partner user as read
  async markAsRead(receiverId: string, senderId: string): Promise<void> {
    try {
      const messagesCol = collection(db, 'chats');
      const q = query(
        messagesCol, 
        where('senderId', '==', senderId), 
        where('receiverId', '==', receiverId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.warn('Firestore markAsRead failed:', err);
    }
  }
};
