import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { ChatMessage, ChatSession } from '../types';
import { 
  Search, 
  Trash2, 
  Send, 
  MessageSquare, 
  User as UserIcon, 
  Loader2, 
  ArrowLeft,
  Lock,
  Compass,
  Smile,
  Paperclip
} from 'lucide-react';
import { getInitials } from '../utils/videoUtils';
import { useTranslation } from '../i18n';

export const ChatPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { route, navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  // Selected chat partner ID
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChatSession | null>(null);

  // Chat lists & messages with instant localStorage cache hydration
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    return currentUser ? chatService.getCachedSessions(currentUser.uid) : [];
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(() => {
    return currentUser ? chatService.getCachedSessions(currentUser.uid).length === 0 : true;
  });
  const [isSending, setIsSending] = useState(false);

  // Refs for scroll container
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat sessions on mount & refresh dynamically in background
  useEffect(() => {
    if (!currentUser) return;

    // Immediately hydrate from cache if not already loaded
    const cached = chatService.getCachedSessions(currentUser.uid);
    if (cached.length > 0) {
      setSessions(cached);
      setLoadingSessions(false);
    }

    const loadSessions = async () => {
      try {
        const data = await chatService.getChatSessions(currentUser.uid);
        setSessions(data);
      } catch (err) {
        console.error('Failed to load chat sessions:', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle selected user parameter route mapping
  useEffect(() => {
    if (!route.param) return;
    
    const targetId = route.param;
    setSelectedUserId(targetId);

    // Try finding the user details in already loaded sessions
    const target = sessions.find(s => s.userId === targetId);
    if (target) {
      setSelectedUser(target);
    } else {
      // Fetch profile dynamically from database to start chat
      const fetchTarget = async () => {
        try {
          const profile = await userService.getUserProfile(targetId);
          if (profile) {
            setSelectedUser({
              userId: profile.uid,
              displayName: profile.displayName,
              username: profile.username,
              photoURL: profile.photoURL,
              unreadCount: 0
            });
          }
        } catch (err) {
          console.error('Failed to pre-fetch partner user profile:', err);
        }
      };
      fetchTarget();
    }
  }, [route.param, sessions]);

  // Real-time listener for current selected chat with instant cache preload
  useEffect(() => {
    if (!currentUser || !selectedUserId) {
      setMessages([]);
      return;
    }

    // 1. Immediately hydrate cached conversation messages (0ms instant display!)
    const cachedMsgs = chatService.getCachedMessages(currentUser.uid, selectedUserId);
    if (cachedMsgs.length > 0) {
      setMessages(cachedMsgs);
    }

    // 2. Set up Firestore real-time snapshot listener
    const unsubscribe = chatService.listenToMessages(
      currentUser.uid,
      selectedUserId,
      (incomingMsgs) => {
        setMessages(incomingMsgs);
        // Mark as read asynchronously
        chatService.markAsRead(currentUser.uid, selectedUserId);
      }
    );

    return () => unsubscribe();
  }, [currentUser, selectedUserId]);

  // Auto scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUserId || !messageText.trim()) return;

    setIsSending(true);
    const content = messageText.trim();
    setMessageText('');

    // Instant optimistic message rendering
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      senderId: currentUser.uid,
      receiverId: selectedUserId,
      text: content,
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages(prev => {
      const updated = [...prev, optimisticMessage];
      chatService.setCachedMessages(currentUser.uid, selectedUserId, updated);
      return updated;
    });

    // Update local session preview instantly
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.userId === selectedUserId) {
          return { ...s, lastMessage: content, lastMessageTime: new Date().toISOString() };
        }
        return s;
      });
      chatService.setCachedSessions(currentUser.uid, updated);
      return updated;
    });

    try {
      await chatService.sendMessage(currentUser.uid, selectedUserId, content);
    } catch (err) {
      console.error('Failed to deliver message:', err);
      addToast('Failed to deliver message.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!currentUser || !selectedUserId) return;

    const confirmDelete = window.confirm(`Are you sure you want to permanently delete your conversation history with ${selectedUser?.displayName}? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      await chatService.deleteChatHistory(currentUser.uid, selectedUserId);
      setMessages([]);
      addToast('Conversation cleared successfully.', 'success');
    } catch (err) {
      addToast('Failed to delete history.', 'error');
    }
  };

  // Helper format for timestamp
  const formatMsgTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

    const formatMsgDay = (isoString: string, prevIso?: string): string | null => {
    try {
      const d = new Date(isoString);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (prevIso) {
        const p = new Date(prevIso);
        const prevStart = new Date(p.getFullYear(), p.getMonth(), p.getDate()).getTime();
        if (dayStart === prevStart) return null; // same day, no divider
      }
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diff = Math.round((todayStart - dayStart) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return null; }
  };
  
  const formatSessionTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const now = new Date();
      const date = new Date(isoString);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins} m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} h`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Filter sessions based on search query input
  const filteredSessions = sessions.filter(s => 
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-full text-blue-600 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Secure Workspace Messages</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          Please sign in to access your direct chat workspace, talk to creators, and send instant real-time messages.
        </p>
        <button 
          onClick={() => navigate('login')} 
          className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      
      {/* LEFT CHAT DIRECTORY LIST */}
      <div className={`w-full md:w-80 shrink-0 border-r border-slate-200 dark:border-[#222] flex flex-col h-full bg-white dark:bg-[#0f0f0f] ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Search header bar */}
        <div className="p-4 border-b border-slate-100 dark:border-[#222] space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('home')}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-[#1e1e1e] rounded-xl text-slate-500 shrink-0 cursor-pointer"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-black text-sm tracking-tight uppercase">Direct Messages</span>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chat partners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#222] rounded-xl text-xs font-bold focus:outline-none focus:border-blue-600 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {/* Sessions user directory lists */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-[#222] scrollbar-none p-2 space-y-1">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold">No active conversations</p>
              <p className="text-[10px] mt-0.5">Search above to message other users!</p>
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isSelected = selectedUserId === s.userId;
              return (
                <button
                  key={s.userId}
                  onClick={() => {
                    setSelectedUserId(s.userId);
                    setSelectedUser(s);
                  }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-blue-600' 
                      : 'hover:bg-slate-50 dark:hover:bg-[#1a1a1a]/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 relative overflow-hidden">
                    {s.photoURL ? (
                      <img src={s.photoURL} className="w-full h-full object-cover" alt="" />
                    ) : (
                      getInitials(s.displayName)
                    )}
                    {s.unreadCount > 0 && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-600 border border-white dark:border-[#0f0f0f] rounded-full flex items-center justify-center text-[8px] text-white font-black">
                        {s.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">{s.displayName}</p>
                      <span className="text-[9px] font-bold text-slate-400 shrink-0">{formatSessionTime(s.lastMessageTime)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-semibold">
                      {s.lastMessage || `@${s.username}`}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT MESSAGE WORKSPACE PANE */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#121212] ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        {selectedUserId && selectedUser ? (
          <>
            {/* Header bar */}
            <div className="h-14 shrink-0 bg-white dark:bg-[#0f0f0f] border-b border-slate-200 dark:border-[#222] px-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button on mobile */}
                <button
                  onClick={() => {
                    setSelectedUserId(null);
                    setSelectedUser(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1e1e1e] rounded-xl text-slate-500 shrink-0 cursor-pointer md:hidden"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {selectedUser.photoURL ? (
                    <img src={selectedUser.photoURL} className="w-full h-full object-cover" alt="" />
                  ) : (
                    getInitials(selectedUser.displayName)
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{selectedUser.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">@{selectedUser.username}</p>
                </div>
              </div>

              <button
                onClick={handleDeleteConversation}
                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-xl transition-colors cursor-pointer"
                title="Delete Conversation History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable messages bubble board */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 scrollbar-none bg-[#f8fafc] dark:bg-[#101010]">
              {messages.length === 0 ? (
                <div className="py-20 text-center text-slate-400 dark:text-slate-500 max-w-sm mx-auto space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">Send a friendly message!</p>
                  <p className="text-[11px] leading-relaxed">Introduce yourself, collaborate on content, or discuss awesome video ideas together.</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMine = m.senderId === currentUser.uid;
                  const dayLabel = formatMsgDay(m.createdAt, messages[idx - 1]?.createdAt);
                  return (
                    <React.Fragment key={m.id}>
                      {dayLabel && (
                        <div className="flex justify-center my-3">
                          <span className="px-3 py-1 bg-slate-200/80 dark:bg-[#1e1e1e] text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-slate-100 dark:border-[#2a2a2a]">
                            {dayLabel}
                          </span>
                        </div>
                      )}
                      <div className={`flex gap-2.5 w-fit max-w-[85%] md:max-w-[70%] min-w-0 ${isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden">
                          {isMine ? (
                            currentUserProfile?.photoURL ? (
                              <img src={currentUserProfile.photoURL} className="w-full h-full object-cover" alt="" />
                            ) : (
                              getInitials(currentUserProfile?.displayName || 'Me')
                            )
                          ) : (
                            selectedUser.photoURL ? (
                              <img src={selectedUser.photoURL} className="w-full h-full object-cover" alt="" />
                            ) : (
                              getInitials(selectedUser.displayName)
                            )
                          )}
                        </div>
                        <div className="space-y-1">
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-xs ${
                              isMine
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-[#222] rounded-tl-none'
                            }`}
                          >
                            <p className="break-words whitespace-pre-wrap">{m.text}</p>
                          </div>
                          <span className={`text-[9px] text-slate-400 font-bold block ${isMine ? 'text-right' : 'text-left'}`}>
                            {formatMsgTime(m.createdAt)}
                            {isMine && (m.read ? ' ✓✓' : ' ✓')}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input message form bar */}
            <div className="p-4 bg-white dark:bg-[#0f0f0f] border-t border-slate-200 dark:border-[#222] shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-[#1e1e1e] rounded-xl text-slate-400 cursor-pointer"
                  title="Attach asset"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-[#1e1e1e] rounded-xl text-slate-400 cursor-pointer"
                  title="Emojis"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  required
                  placeholder="Write a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#222] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 placeholder-slate-400 dark:placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={isSending || !messageText.trim()}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl cursor-pointer shadow-md disabled:opacity-50 transition-all shrink-0"
                  aria-label="Send Message"
                >
                  <Send className="w-4 h-4 fill-white" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 select-none">
            <Compass className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Your Active Messages</p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1">Select an active contact thread from the left directory list to start messaging!</p>
          </div>
        )}
      </div>

    </div>
  );
};
