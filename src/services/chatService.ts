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
  updateDoc,
  setDoc,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ChatMessage, ChatSession, User } from '../types';
import { userService } from './userService';
import { isUserVerified } from '../utils/userUtils';
import { getCloudinaryConfigAsync } from './videoService';

const getChatCacheKey = (userA: string, userB: string) => {
  const sorted = [userA, userB].sort().join('_');
  return `socialindia_chat_msgs_${sorted}`;
};

const getConversationId = (userA: string, userB: string) =>
  [userA, userB].sort().join('_');

const partnerProfileCache = new Map<string, { profile: User | null; expiresAt: number }>();
const partnerProfileRequests = new Map<string, Promise<User | null>>();

const getChatPartnerProfile = (uid: string): Promise<User | null> => {
  const cached = partnerProfileCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.profile);

  const pending = partnerProfileRequests.get(uid);
  if (pending) return pending;

  const request = userService.getUserProfile(uid, true).then(profile => {
    partnerProfileCache.set(uid, { profile, expiresAt: Date.now() + 60_000 });
    return profile;
  }).finally(() => {
    partnerProfileRequests.delete(uid);
  });
  partnerProfileRequests.set(uid, request);
  return request;
};

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
    let directSessions: ChatSession[] = this.getCachedSessions(currentUserId);
    let groupSessions: ChatSession[] = [];
    const publishSessions = () => {
      const merged = [...directSessions, ...groupSessions].sort((a, b) => {
        if (a.lastMessageTime && b.lastMessageTime) {
          return new Date(b.lastMessageTime).getTime() -
            new Date(a.lastMessageTime).getTime();
        }
        if (a.lastMessageTime) return -1;
        if (b.lastMessageTime) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      this.setCachedSessions(currentUserId, merged);
      callback(merged);
    };

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );

    const unsubscribeConversations = onSnapshot(
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

              const profile = await getChatPartnerProfile(partnerId);
              if (!profile) return null;

              const lastMessageTime = data.lastMessageAt?.toDate
                ? data.lastMessageAt.toDate().toISOString()
                : undefined;

              return {
                userId: partnerId,
                displayName: profile.displayName,
                username: profile.username,
                photoURL: profile.photoURL,
                isVerified: isUserVerified(profile),
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

          directSessions = [...merged.values()];
          publishSessions();
        } catch (error) {
          console.error('Conversation listener processing failed:', error);
          directSessions = this.getCachedSessions(currentUserId).filter(session => !session.isGroup && !session.isPocket);
          publishSessions();
        }
      },
      error => {
        console.error('Conversation listener failed:', error);
        directSessions = this.getCachedSessions(currentUserId).filter(session => !session.isGroup && !session.isPocket);
        publishSessions();
      }
    );

    const groupsQuery = query(
      collection(db, 'groupChats'),
      where('participants', 'array-contains', currentUserId)
    );
    const unsubscribeGroups = onSnapshot(
      groupsQuery,
      async snapshot => {
        try {
          groupSessions = snapshot.docs.map(groupDoc => {
            const data = groupDoc.data();
            const lastMessageTime = data.lastMessageAt?.toDate
              ? data.lastMessageAt.toDate().toISOString()
              : undefined;
            return {
              userId: groupDoc.id,
              displayName: data.name || 'Group',
              username: 'group',
              photoURL: data.photoURL || undefined,
              isGroup: true,
              participantIds: Array.isArray(data.participants) ? data.participants : [],
              lastMessage: data.lastMessage || undefined,
              lastMessageTime,
              unreadCount: 0
            };
          });
          publishSessions();
        } catch (error) {
          console.error('Group conversation listener processing failed:', error);
        }
      },
      error => {
        console.error('Group conversation listener failed:', error);
      }
    );

    return () => {
      unsubscribeConversations();
      unsubscribeGroups();
    };
  },

  async createGroup(currentUserId: string, name: string, memberIds: string[]): Promise<ChatSession> {
    const cleanName = name.trim();
    const participants = [...new Set([currentUserId, ...memberIds])];
    if (!cleanName) throw new Error('Group name cannot be empty.');
    if (participants.length < 2) throw new Error('Choose at least one other member.');

    const groupRef = doc(collection(db, 'groupChats'));
    await setDoc(groupRef, {
      name: cleanName,
      createdBy: currentUserId,
      participants,
      lastMessage: '',
      lastMessageAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return {
      userId: groupRef.id,
      displayName: cleanName,
      username: 'group',
      isGroup: true,
      participantIds: participants,
      unreadCount: 0
    };
  },

  listenToGroupMessages(groupId: string, callback: (messages: ChatMessage[]) => void, cacheOwnerId: string) {
    const messagesQuery = query(
      collection(db, 'groupChats', groupId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(
      messagesQuery,
      snapshot => {
        callback(snapshot.docs.map(messageDoc => {
          const data = messageDoc.data();
          return {
            id: messageDoc.id,
            senderId: data.senderId,
            senderDisplayName: data.senderDisplayName || '',
            receiverId: groupId,
            groupId,
            text: data.text || '',
            mediaUrl: data.mediaUrl || undefined,
            mediaType: data.mediaType || undefined,
            replyTo: data.replyTo || undefined,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
            editedAt: data.editedAt?.toDate
              ? data.editedAt.toDate().toISOString()
              : data.editedAt || undefined,
            read: false
          } as ChatMessage;
        }));
      },
      error => {
        console.error(`Group message listener failed for ${groupId}:`, error);
        callback(this.getCachedMessages(cacheOwnerId, groupId));
      }
    );
  },

  async sendGroupMessage(
    groupId: string,
    senderId: string,
    senderDisplayName: string,
    text: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video',
    replyTo?: ChatMessage['replyTo']
  ): Promise<string> {
    const trimmedText = text.trim();
    if (!trimmedText && !mediaUrl) return '';
    const messagesRef = collection(db, 'groupChats', groupId, 'messages');
    const payload: Record<string, unknown> = {
      senderId,
      senderDisplayName,
      text: trimmedText,
      createdAt: Timestamp.now()
    };
    if (mediaUrl) payload.mediaUrl = mediaUrl;
    if (mediaType) payload.mediaType = mediaType;
    if (replyTo) payload.replyTo = replyTo;

    const messageRef = await addDoc(messagesRef, payload);
    try {
      await updateDoc(doc(db, 'groupChats', groupId), {
        lastMessage: trimmedText || (mediaType === 'image' ? '📷 Photo' : '🎥 Video'),
        lastMessageAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Group message sent, but group preview update failed:', error);
    }
    return messageRef.id;
  },

  listenToPocketMessages(userId: string, callback: (messages: ChatMessage[]) => void) {
    const pocketKey = `pocket_${userId}`;
    const privatePocketRef = doc(db, 'users', userId, 'private', 'pocket');
    let unsubscribed = false;
    let activeUnsubscribe: (() => void) | null = null;
    let fallbackMessages: ChatMessage[] = [];
    let subcollectionMessages: ChatMessage[] = [];

    const normalizeStoredPocketMsg = (raw: any): ChatMessage => ({
      id: String(raw?.id || `pocket_${Date.now()}`),
      senderId: userId,
      receiverId: userId,
      text: raw?.text || '',
      mediaUrl: raw?.mediaUrl || undefined,
      mediaType: raw?.mediaType || undefined,
      replyTo: raw?.replyTo || undefined,
      createdAt: raw?.createdAt?.toDate
        ? raw.createdAt.toDate().toISOString()
        : raw?.createdAt || new Date().toISOString(),
      editedAt: raw?.editedAt?.toDate
        ? raw.editedAt.toDate().toISOString()
        : raw?.editedAt || undefined,
      ...(raw?.clientTempId ? { clientTempId: String(raw.clientTempId) } : {}),
      read: true
    });

    const publishMerged = (fromSubcollection: boolean) => {
      if (unsubscribed) return;
      const mergedMap = new Map<string, ChatMessage>();
      for (const msg of fallbackMessages) mergedMap.set(msg.id, msg);
      if (fromSubcollection) {
        for (const msg of subcollectionMessages) mergedMap.set(msg.id, msg);
      }
      const merged = [...mergedMap.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      this.setCachedMessages(userId, pocketKey, merged);
      callback(merged);
    };

    const startPrivateDocListener = () => {
      if (unsubscribed) return;
      activeUnsubscribe = onSnapshot(
        privatePocketRef,
        snapshot => {
          const rawList = snapshot.exists() && Array.isArray(snapshot.data()?.messages)
            ? snapshot.data().messages
            : [];
          fallbackMessages = rawList.map(normalizeStoredPocketMsg);
          publishMerged(false);
        },
        err => {
          console.error('Pocket fallback listener failed:', err);
          if (!unsubscribed) {
            callback(this.getCachedMessages(userId, pocketKey));
          }
        }
      );
    };

    // Preload any messages stored in the private pocket doc so they stay visible across rule states
    getDoc(privatePocketRef)
      .then(snap => {
        if (unsubscribed) return;
        if (snap.exists() && Array.isArray(snap.data()?.messages)) {
          fallbackMessages = snap.data().messages.map(normalizeStoredPocketMsg);
          if (fallbackMessages.length > 0 && subcollectionMessages.length === 0) {
            publishMerged(false);
          }
        }
      })
      .catch(() => {});

    const messagesQuery = query(
      collection(db, 'users', userId, 'pocketMessages'),
      orderBy('createdAt', 'asc')
    );
    const subUnsub = onSnapshot(
      messagesQuery,
      snapshot => {
        subcollectionMessages = snapshot.docs.map(messageDoc => {
          const data = messageDoc.data();
          return normalizeStoredPocketMsg({ id: messageDoc.id, ...data });
        });
        publishMerged(true);
      },
      error => {
        console.warn('Pocket subcollection listener failed, using private pocket storage:', error);
        subUnsub();
        startPrivateDocListener();
      }
    );
    activeUnsubscribe = subUnsub;

    return () => {
      unsubscribed = true;
      if (activeUnsubscribe) activeUnsubscribe();
    };
  },

  async sendPocketMessage(
    userId: string,
    text: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video',
    replyTo?: ChatMessage['replyTo'],
    clientTempId?: string
  ): Promise<string> {
    const trimmedText = text.trim();
    if (!trimmedText && !mediaUrl) return '';
    if (auth.currentUser && auth.currentUser.uid !== userId) {
      throw new Error('Authenticated user mismatch for My Pocket.');
    }

    const pocketKey = `pocket_${userId}`;
    const cleanReplyTo: ChatMessage['replyTo'] | undefined = replyTo
      ? {
          messageId: replyTo.messageId,
          senderId: replyTo.senderId,
          text: replyTo.text ?? '',
          ...(replyTo.mediaType !== undefined ? { mediaType: replyTo.mediaType } : {})
        }
      : undefined;

    const payload: Record<string, unknown> = {
      text: trimmedText,
      createdAt: Timestamp.now()
    };
    if (mediaUrl) payload.mediaUrl = mediaUrl;
    if (mediaType) payload.mediaType = mediaType;
    if (cleanReplyTo) payload.replyTo = cleanReplyTo;
    if (clientTempId) payload.clientTempId = clientTempId;

    const nowIso = new Date().toISOString();
    const buildPocketMsg = (id: string): ChatMessage => ({
      id,
      senderId: userId,
      receiverId: userId,
      text: trimmedText,
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(mediaType ? { mediaType } : {}),
      ...(cleanReplyTo ? { replyTo: cleanReplyTo } : {}),
      ...(clientTempId ? { clientTempId } : {}),
      createdAt: nowIso,
      read: true
    });

    try {
      const messageRef = await addDoc(collection(db, 'users', userId, 'pocketMessages'), payload);
      const existing = this.getCachedMessages(userId, pocketKey).filter(m => !m.id.startsWith('temp_'));
      if (!existing.some(m => m.id === messageRef.id)) {
        this.setCachedMessages(userId, pocketKey, [...existing, buildPocketMsg(messageRef.id)]);
      }
      return messageRef.id;
    } catch (subErr) {
      console.warn('Pocket subcollection write failed, saving to private pocket doc:', subErr);
      const privatePocketRef = doc(db, 'users', userId, 'private', 'pocket');
      let existingMessages: ChatMessage[] = [];
      try {
        const snap = await getDoc(privatePocketRef);
        if (snap.exists() && Array.isArray(snap.data()?.messages)) {
          existingMessages = snap.data().messages;
        } else {
          existingMessages = this.getCachedMessages(userId, pocketKey).filter(m => !m.id.startsWith('temp_'));
        }
      } catch {
        existingMessages = this.getCachedMessages(userId, pocketKey).filter(m => !m.id.startsWith('temp_'));
      }

      const newId = `pocket_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newMsg = buildPocketMsg(newId);
      const nextMessages = [...existingMessages, newMsg].slice(-500);

      await setDoc(
        privatePocketRef,
        {
          messages: nextMessages,
          updatedAt: Timestamp.now()
        },
        { merge: true }
      );
      this.setCachedMessages(userId, pocketKey, nextMessages);
      return newId;
    }
  },

  async editGroupMessage(groupId: string, messageId: string, senderId: string, text: string): Promise<string> {
    const trimmedText = text.trim();
    if (!trimmedText) throw new Error('Message text cannot be empty.');
    const messageRef = doc(db, 'groupChats', groupId, 'messages', messageId);
    const snapshot = await getDoc(messageRef);
    if (!snapshot.exists() || snapshot.data().senderId !== senderId) {
      throw new Error('You can only edit your own messages.');
    }
    const editedAt = Timestamp.now();
    await updateDoc(messageRef, { text: trimmedText, editedAt });
    return editedAt.toDate().toISOString();
  },

  async deleteGroupMessage(groupId: string, messageId: string, senderId: string): Promise<void> {
    const messageRef = doc(db, 'groupChats', groupId, 'messages', messageId);
    const snapshot = await getDoc(messageRef);
    if (!snapshot.exists() || snapshot.data().senderId !== senderId) {
      throw new Error('You can only delete your own messages.');
    }
    await deleteDoc(messageRef);
  },

  async editPocketMessage(userId: string, messageId: string, text: string): Promise<string> {
    const trimmedText = text.trim();
    if (!trimmedText) throw new Error('Message text cannot be empty.');
    const editedAt = Timestamp.now();
    const editedAtIso = editedAt.toDate().toISOString();
    const pocketKey = `pocket_${userId}`;

    if (!messageId.startsWith('pocket_')) {
      try {
        await updateDoc(doc(db, 'users', userId, 'pocketMessages', messageId), {
          text: trimmedText,
          editedAt
        });
        const cached = this.getCachedMessages(userId, pocketKey).map(m =>
          m.id === messageId ? { ...m, text: trimmedText, editedAt: editedAtIso } : m
        );
        this.setCachedMessages(userId, pocketKey, cached);
        return editedAtIso;
      } catch (err) {
        console.warn('Pocket subcollection edit failed, trying private pocket doc:', err);
      }
    }

    const privatePocketRef = doc(db, 'users', userId, 'private', 'pocket');
    const snap = await getDoc(privatePocketRef);
    const currentList: ChatMessage[] = snap.exists() && Array.isArray(snap.data()?.messages)
      ? snap.data().messages
      : this.getCachedMessages(userId, pocketKey);
    const nextList = currentList.map(m =>
      m.id === messageId ? { ...m, text: trimmedText, editedAt: editedAtIso } : m
    );
    await setDoc(privatePocketRef, { messages: nextList, updatedAt: editedAt }, { merge: true });
    this.setCachedMessages(userId, pocketKey, nextList);
    return editedAtIso;
  },

  async deletePocketMessage(userId: string, messageId: string): Promise<void> {
    const pocketKey = `pocket_${userId}`;
    if (!messageId.startsWith('pocket_')) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'pocketMessages', messageId));
        const cached = this.getCachedMessages(userId, pocketKey).filter(m => m.id !== messageId);
        this.setCachedMessages(userId, pocketKey, cached);
        return;
      } catch (err) {
        console.warn('Pocket subcollection delete failed, trying private pocket doc:', err);
      }
    }

    const privatePocketRef = doc(db, 'users', userId, 'private', 'pocket');
    const snap = await getDoc(privatePocketRef);
    const currentList: ChatMessage[] = snap.exists() && Array.isArray(snap.data()?.messages)
      ? snap.data().messages
      : this.getCachedMessages(userId, pocketKey);
    const nextList = currentList.filter(m => m.id !== messageId);
    await setDoc(privatePocketRef, { messages: nextList, updatedAt: Timestamp.now() }, { merge: true });
    this.setCachedMessages(userId, pocketKey, nextList);
  },

  async clearPocket(userId: string): Promise<void> {
    try {
      const snapshot = await getDocs(collection(db, 'users', userId, 'pocketMessages'));
      for (let i = 0; i < snapshot.docs.length; i += 450) {
        const batch = writeBatch(db);
        snapshot.docs.slice(i, i + 450).forEach(messageDoc => batch.delete(messageDoc.ref));
        await batch.commit();
      }
    } catch (err) {
      console.warn('Pocket subcollection clear skipped:', err);
    }
    try {
      const privatePocketRef = doc(db, 'users', userId, 'private', 'pocket');
      await setDoc(privatePocketRef, { messages: [], updatedAt: Timestamp.now() }, { merge: true });
    } catch (err) {
      console.warn('Private pocket doc clear skipped:', err);
    }
    this.setCachedMessages(userId, `pocket_${userId}`, []);
  },

  // Send a direct chat message (with optional media attachment)
  async sendMessage(
    senderId: string, 
    receiverId: string, 
    text: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video',
    replyTo?: ChatMessage['replyTo']
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
      replyTo: replyTo || undefined,
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
    if (replyTo) docPayload.replyTo = replyTo;

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
    const serverSyncedPairs = new Set<string>();

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
        where('senderId', '==', senderId),
        where('receiverId', '==', receiverId)
      );

      return onSnapshot(
        q,
        { includeMetadataChanges: true },
        snapshot => {
          if (snapshot.metadata.fromCache) return;

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
                replyTo: data.replyTo || undefined,
                createdAt,
                editedAt: data.editedAt?.toDate
                  ? data.editedAt.toDate().toISOString()
                  : data.editedAt || undefined,
                read: Boolean(data.read)
              } as ChatMessage;
            })
          );

          serverSyncedPairs.add(pairKey);
          if (serverSyncedPairs.size === 2) publishMessages();
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
      partnerIds.map(uid => getChatPartnerProfile(uid))
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
        isVerified: isUserVerified(user),
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

  async editMessage(messageId: string, senderId: string, text: string): Promise<string> {
    const trimmedText = text.trim();
    if (!trimmedText) throw new Error('Message text cannot be empty.');

    const messageRef = doc(db, 'chats', messageId);
    const messageSnapshot = await getDoc(messageRef);
    if (!messageSnapshot.exists() || messageSnapshot.data().senderId !== senderId) {
      throw new Error('You can only edit your own messages.');
    }

    const editedAt = Timestamp.now();
    await updateDoc(messageRef, { text: trimmedText, editedAt });
    return editedAt.toDate().toISOString();
  },

  async deleteMessage(messageId: string, senderId: string): Promise<void> {
    const messageRef = doc(db, 'chats', messageId);
    const messageSnapshot = await getDoc(messageRef);
    if (!messageSnapshot.exists() || messageSnapshot.data().senderId !== senderId) {
      throw new Error('You can only delete your own messages.');
    }
    await deleteDoc(messageRef);
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
