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

  // Send a direct chat message
  async sendMessage(senderId: string, receiverId: string, text: string): Promise<string> {
    if (!text.trim()) return '';

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId,
      receiverId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      read: false
    };

    // Store in local cache immediately
    const existing = this.getCachedMessages(senderId, receiverId);
    this.setCachedMessages(senderId, receiverId, [...existing, newMsg]);

    try {
      const messagesCol = collection(db, 'chats');
      const docRef = await addDoc(messagesCol, {
        senderId,
        receiverId,
        text: text.trim(),
        createdAt: Timestamp.now(),
        read: false
      });
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
            text: data.text,
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

      sessions.push({
        userId: user.uid,
        displayName: user.displayName,
        username: user.username,
        photoURL: user.photoURL,
        lastMessage: lastMsg ? lastMsg.text : undefined,
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
