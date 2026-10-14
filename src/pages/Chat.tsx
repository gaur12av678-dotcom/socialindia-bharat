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
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Maximize2,
  Download
} from 'lucide-react';
import { getInitials } from '../utils/videoUtils';
import { useTranslation } from '../i18n';
import { EmojiPicker } from '../components/chat/EmojiPicker';

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

  // Media attachment & Emoji states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

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
  }, [messages, mediaPreviewUrl]);

  // Handle Media File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');

    if (!isImg && !isVid) {
      addToast('Please select a valid image or video file.', 'error');
      return;
    }

    // Check size limit (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      addToast('Media file too large. Maximum size is 50MB.', 'error');
      return;
    }

    // Clean up old preview object URL if any
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    setSelectedMediaFile(file);
    setMediaType(isVid ? 'video' : 'image');
    const objectUrl = URL.createObjectURL(file);
    setMediaPreviewUrl(objectUrl);
    setShowEmojiPicker(false);

    // Focus text input for optional caption
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 50);
  };

  const handleClearMedia = () => {
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setSelectedMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Image Paste from Clipboard
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(mediaPreviewUrl);
          }
          setSelectedMediaFile(file);
          setMediaType('image');
          setMediaPreviewUrl(URL.createObjectURL(file));
          setShowEmojiPicker(false);
          addToast('Image attached from clipboard!', 'info');
          break;
        }
      }
    }
  };

  // Handle Emoji Insertion at current cursor position
  const handleInsertEmoji = (emoji: string) => {
    if (textInputRef.current) {
      const input = textInputRef.current;
      const start = input.selectionStart ?? messageText.length;
      const end = input.selectionEnd ?? messageText.length;
      const nextText = messageText.slice(0, start) + emoji + messageText.slice(end);
      setMessageText(nextText);
      
      setTimeout(() => {
        input.focus();
        const nextPos = start + emoji.length;
        input.setSelectionRange(nextPos, nextPos);
      }, 10);
    } else {
      setMessageText(prev => prev + emoji);
    }
  };

  // Send Message with optional Media
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUserId) return;

    const trimmedText = messageText.trim();
    if (!trimmedText && !selectedMediaFile) return;

    setIsSending(true);
    setShowEmojiPicker(false);

    const content = trimmedText;
    const mediaFileToSend = selectedMediaFile;
    const localPreview = mediaPreviewUrl;
    const currentMediaType = mediaType;

    // Reset input fields immediately for snappy feel
    setMessageText('');
    handleClearMedia();

    // Instant optimistic message rendering
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      senderId: currentUser.uid,
      receiverId: selectedUserId,
      text: content,
      mediaUrl: localPreview || undefined,
      mediaType: currentMediaType || undefined,
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages(prev => {
      const updated = [...prev, optimisticMessage];
      chatService.setCachedMessages(currentUser.uid, selectedUserId, updated);
      return updated;
    });

    // Update local session preview instantly
    const previewSummary = content || (currentMediaType === 'image' ? '📷 Photo' : '🎥 Video');
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.userId === selectedUserId) {
          return { ...s, lastMessage: previewSummary, lastMessageTime: new Date().toISOString() };
        }
        return s;
      });
      chatService.setCachedSessions(currentUser.uid, updated);
      return updated;
    });

    try {
      let finalMediaUrl: string | undefined = undefined;
      let finalMediaType: 'image' | 'video' | undefined = undefined;

      // Upload media if present
      if (mediaFileToSend) {
        setIsUploadingMedia(true);
        const uploadResult = await chatService.uploadChatMedia(mediaFileToSend, (pct) => {
          setUploadProgress(pct);
        });
        finalMediaUrl = uploadResult.url;
        finalMediaType = uploadResult.type;
      }

      await chatService.sendMessage(
        currentUser.uid, 
        selectedUserId, 
        content,
        finalMediaUrl,
        finalMediaType
      );
    } catch (err) {
      console.error('Failed to deliver message:', err);
      addToast('Failed to deliver message.', 'error');
    } finally {
      setIsSending(false);
      setIsUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteConversation = async () => {
    if (!currentUser || !selectedUserId) return;

    const confirmDelete = window.confirm(
      isHindi 
        ? `क्या आप ${selectedUser?.displayName} के साथ बातचीत का इतिहास हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।` 
        : `Are you sure you want to permanently delete your conversation history with ${selectedUser?.displayName}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await chatService.deleteChatHistory(currentUser.uid, selectedUserId);
      setMessages([]);
      addToast(isHindi ? 'बातचीत का इतिहास साफ़ हो गया।' : 'Conversation cleared successfully.', 'success');
    } catch (err) {
      addToast(isHindi ? 'इतिहास हटाने में विफल।' : 'Failed to delete history.', 'error');
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
      if (diff === 0) return t('chat_today', 'Today');
      if (diff === 1) return t('chat_yesterday', 'Yesterday');
      return d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          {isHindi ? 'सुरक्षित संदेश कार्यक्षेत्र' : 'Secure Workspace Messages'}
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          {isHindi 
            ? 'सीधे चैट करने, क्रिएटर्स से बात करने और तुरंत मैसेज भेजने के लिए कृपया साइन इन करें।' 
            : 'Please sign in to access your direct chat workspace, talk to creators, and send instant real-time messages.'}
        </p>
        <button 
          onClick={() => navigate('login')} 
          className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
        >
          {t('sign_in', 'Sign In Now')}
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      
      {/* Hidden File Input for Media Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
        accept="image/*,video/*"
        className="hidden"
      />

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
            <span className="font-black text-sm tracking-tight uppercase">{t('chat_direct_messages', 'Direct Messages')}</span>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('chat_search_placeholder', 'Search chat partners...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#222] rounded-xl text-xs font-bold focus:outline-none focus:border-blue-600 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {/* User directory contacts feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1a1a1a]">
          {loadingSessions ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">{t('chat_loading', 'Loading contacts...')}</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              {t('chat_no_conversations', 'No matching conversations found')}
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
                  className={`w-full p-3.5 flex items-center gap-3 transition-colors text-left cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50/70 dark:bg-blue-950/20 border-r-2 border-blue-600' 
                      : 'hover:bg-slate-50 dark:hover:bg-[#161616]'
                  }`}
                >
                  <div className="relative w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs">
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
                title={t('chat_delete_history', 'Delete Conversation History')}
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
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">{t('chat_empty_title', 'Send a friendly message!')}</p>
                  <p className="text-[11px] leading-relaxed">{t('chat_empty_desc', 'Introduce yourself, share photos, videos, or discuss awesome ideas together.')}</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMine = m.senderId === currentUser.uid;
                  const dayLabel = formatMsgDay(m.createdAt, messages[idx - 1]?.createdAt);
                  return (
                    <React.Fragment key={m.id}>
                      {dayLabel && (
                        <div className="flex justify-center my-3">
                          <span className="px-3 py-1 bg-slate-200/80 dark:bg-[#222] text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-bold shadow-xs">
                            {dayLabel}
                          </span>
                        </div>
                      )}

                      <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden ${isMine ? 'order-2' : 'order-1'}`}>
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

                        <div className={`space-y-1 max-w-[85%] sm:max-w-[70%] ${isMine ? 'order-1' : 'order-2'}`}>
                          <div
                            className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-xs ${
                              isMine
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-[#222] rounded-tl-none'
                            }`}
                          >
                            {/* Media content: Image */}
                            {m.mediaUrl && m.mediaType === 'image' && (
                              <div className="mb-2 relative group overflow-hidden rounded-xl bg-black/5 dark:bg-black/30">
                                <img
                                  src={m.mediaUrl}
                                  alt="Shared photo"
                                  loading="lazy"
                                  onClick={() => setFullscreenImage(m.mediaUrl!)}
                                  className="max-h-72 w-full object-cover rounded-xl cursor-pointer transition-transform group-hover:scale-102"
                                />
                                <button
                                  type="button"
                                  onClick={() => setFullscreenImage(m.mediaUrl!)}
                                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                                  title="View Fullscreen"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Media content: Video */}
                            {m.mediaUrl && m.mediaType === 'video' && (
                              <div className="mb-2 overflow-hidden rounded-xl bg-black">
                                <video
                                  src={m.mediaUrl}
                                  controls
                                  playsInline
                                  className="max-h-72 w-full rounded-xl bg-black"
                                />
                              </div>
                            )}

                            {/* Text message */}
                            {m.text && (
                              <p className="break-words whitespace-pre-wrap">{m.text}</p>
                            )}
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
            <div className="p-3 sm:p-4 bg-white dark:bg-[#0f0f0f] border-t border-slate-200 dark:border-[#222] shrink-0 relative">
              
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <EmojiPicker
                  onSelectEmoji={handleInsertEmoji}
                  onClose={() => setShowEmojiPicker(false)}
                  toggleButtonRef={emojiButtonRef}
                />
              )}

              {/* Uploading Progress Indicator */}
              {isUploadingMedia && (
                <div className="mb-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-600 animate-pulse">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-bold">
                      {isHindi ? 'मीडिया अपलोड हो रहा है...' : 'Uploading media...'} {uploadProgress > 0 ? `${uploadProgress}%` : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Media Attachment Preview Bar */}
              {mediaPreviewUrl && (
                <div className="mb-2.5 p-2 bg-slate-100 dark:bg-[#1a1a1e] rounded-2xl border border-slate-200 dark:border-[#2a2a2e] flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    {mediaType === 'image' ? (
                      <img
                        src={mediaPreviewUrl}
                        alt="Upload preview"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#333] shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-600 flex items-center justify-center shrink-0">
                        <VideoIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedMediaFile?.name || (isHindi ? 'चुना गया मीडिया' : 'Selected media')}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {selectedMediaFile ? `${(selectedMediaFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                        </span>
                        <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md">
                          {mediaType === 'image' ? (isHindi ? 'फ़ोटो' : 'Photo') : (isHindi ? 'वीडियो' : 'Video')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearMedia}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-[#252528] rounded-xl cursor-pointer transition-colors"
                    title={isHindi ? 'मीडिया हटाएं' : 'Remove media'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* Media Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                    selectedMediaFile
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-900'
                      : 'hover:bg-slate-100 dark:hover:bg-[#1e1e1e] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title={isHindi ? 'फ़ोटो या वीडियो जोड़ें' : 'Attach Photo or Video'}
                  aria-label={isHindi ? 'फ़ोटो या वीडियो जोड़ें' : 'Attach Photo or Video'}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Emoji Button */}
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                    showEmojiPicker
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-[#1e1e1e] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title={isHindi ? 'इमोजी' : 'Emojis'}
                  aria-label={isHindi ? 'इमोजी' : 'Emojis'}
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Text Message Input */}
                <input
                  ref={textInputRef}
                  type="text"
                  placeholder={selectedMediaFile ? (isHindi ? 'कैप्शन जोड़ें...' : 'Add a caption...') : (isHindi ? 'संदेश लिखें...' : 'Write a message...')}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onPaste={handlePaste}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#222] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 placeholder-slate-400 dark:placeholder-slate-500"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={isSending || isUploadingMedia || (!messageText.trim() && !selectedMediaFile)}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                  aria-label={isHindi ? 'संदेश भेजें' : 'Send Message'}
                >
                  {isSending || isUploadingMedia ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 fill-white" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 select-none">
            <Compass className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {isHindi ? 'आपके सक्रिय संदेश' : 'Your Active Messages'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
              {isHindi ? 'मैसेज शुरू करने के लिए बाईं ओर की सूची से कोई संपर्क चुनें!' : 'Select an active contact thread from the left directory list to start messaging!'}
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-100 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <a
                href={fullscreenImage}
                target="_blank"
                rel="noopener noreferrer"
                download="shared-photo.jpg"
                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-xs transition-colors"
                title={isHindi ? 'छवि डाउनलोड करें' : 'Download image'}
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => setFullscreenImage(null)}
                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-xs transition-colors cursor-pointer"
                title={isHindi ? 'बंद करें' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={fullscreenImage}
              alt="Shared photo full view"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};
