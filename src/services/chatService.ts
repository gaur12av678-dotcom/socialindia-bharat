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

export const chatService = {
  // Send a direct chat message
  async sendMessage(senderId: string, receiverId: string, text: string): Promise<void> {
    if (!text.trim()) return;

    const messagesCol = collection(db, 'chats');
    await addDoc(messagesCol, {
      senderId,
      receiverId,
      text: text.trim(),
      createdAt: Timestamp.now(),
      read: false
    });
  },

  // Listen for messages between two users in real-time
  listenToMessages(userA: string, userB: string, callback: (messages: ChatMessage[]) => void) {
    const messagesCol = collection(db, 'chats');
    
    // We fetch all messages related to either participant
    const q = query(
      messagesCol,
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
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

      callback(filtered);
    });
  },

  // Retrieve list of chat sessions (users whom the current user has chatted with, or can chat with)
  async getChatSessions(currentUserId: string): Promise<ChatSession[]> {
    // 1. Get all registered users to populate the contact pool
    const users = await userService.getAllUsers();
    const otherUsers = users.filter(u => u.uid !== currentUserId);

    // 2. Fetch all messages to identify thread history
    const messagesCol = collection(db, 'chats');
    const q = query(messagesCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const allMsgs = snapshot.docs.map(d => {
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

    // Sort active conversations to the top
    return sessions.sort((a, b) => {
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  },

  // Delete chat history between two users
  async deleteChatHistory(userA: string, userB: string): Promise<void> {
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
  },

  // Mark all messages from a partner user as read
  async markAsRead(receiverId: string, senderId: string): Promise<void> {
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
  }
};
