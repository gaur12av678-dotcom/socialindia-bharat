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
      console.warn('Cloudinary upload skipped or failed, using local resilient processing:', cldErr);
    }

    // 2. Resilient Fallback:
    // If image, compress via canvas to optimize storage and transfer
    if (!isVideo) {
      const compressedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(e.target?.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve(dataUrl);
          };
          img.onerror = () => resolve(e.target?.result as string);
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      return { url: compressedDataUrl, type: 'image' };
    } else {
      // For video fallback: read as data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { url: dataUrl, type: 'video' };
    }
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

    // Store in local cache immediately
    const existing = this.getCachedMessages(senderId, receiverId);
    this.setCachedMessages(senderId, receiverId, [...existing, newMsg]);

    try {
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

      const docRef = await addDoc(messagesCol, docPayload);
      return docRef.id;
    } catch (err) {
      console.warn('Firestore sendMessage failed, saved locally in cache:', err);
      return newMsg.id;
    }
  },

  // Listen for messages between two users in real-time with instant cache persistence
  listenToMessages(userA: string, userB: string, callback: (messages: ChatMessage[]) => void) {
    const messagesCol = collection(db, 'chats');
    
    // We fetch all messages related to either participant
    const q = query(
      messagesCol,
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const allMsgs = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            senderId: data.senderId,
            receiverId: data.receiverId,
            text: data.text || '',
            mediaUrl: data.mediaUrl || undefined,
            mediaType: data.mediaType || undefined,
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            read: data.read || false
          } as ChatMessage;
        });

        // Filter local memory list to only messages belonging to userA and userB
        const filtered = allMsgs.filter(m => 
          (m.senderId === userA && m.receiverId === userB) ||
          (m.senderId === userB && m.receiverId === userA)
        );

        // Persist to local cache for instant future loads
        this.setCachedMessages(userA, userB, filtered);
        callback(filtered);
      },
      (error) => {
        console.warn('Real-time chat snapshot listener notice (serving cached messages):', error);
        const cached = this.getCachedMessages(userA, userB);
        callback(cached);
      }
    );
  },

  // Retrieve list of chat sessions (users whom the current user has chatted with, or can chat with)
  async getChatSessions(currentUserId: string): Promise<ChatSession[]> {
    // 1. Get all registered users to populate the contact pool
    let otherUsers: User[] = [];
    try {
      const users = await userService.getAllUsers();
      otherUsers = users.filter(u => u.uid !== currentUserId);
    } catch (err) {
      console.warn('Failed to load registered users for chat sessions:', err);
    }

    // 2. Fetch all messages to identify thread history
    let allMsgs: any[] = [];
    try {
      const messagesCol = collection(db, 'chats');
      const q = query(messagesCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      allMsgs = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          read: data.read || false
        };
      });
    } catch (err) {
      console.warn('Failed to load chat messages from Firestore, attempting cached sessions:', err);
      const cached = this.getCachedSessions(currentUserId);
      if (cached.length > 0) {
        return cached;
      }
    }

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

  // Delete chat history between two users
  async deleteChatHistory(userA: string, userB: string): Promise<void> {
    this.setCachedMessages(userA, userB, []);
    try {
      const messagesCol = collection(db, 'chats');
      const snapshot = await getDocs(messagesCol);
      
      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const s = data.senderId;
        const r = data.receiverId;
        
        if ((s === userA && r === userB) || (s === userB && r === userA)) {
          batch.delete(docSnap.ref);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.warn('Firestore deleteChatHistory failed, cleared locally:', err);
    }
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
