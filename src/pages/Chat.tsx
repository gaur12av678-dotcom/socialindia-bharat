import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { ChatMessage, ChatSession, User } from '../types';
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
  X,
  Maximize2,
  Download,
  Mic,
  MicOff,
  Check,
  Reply,
  Edit2,
  MoreHorizontal,
  Share2,
  UsersRound,
  Plus,
  HardDrive
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { EmojiPicker } from '../components/chat/EmojiPicker';
import { UserAvatar } from '../components/UserAvatar';

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
  const [chatStateUid, setChatStateUid] = useState<string | null>(() => currentUser?.uid || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageActionId, setMessageActionId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupResults, setGroupResults] = useState<User[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<User[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(() => {
    return currentUser ? chatService.getCachedSessions(currentUser.uid).length === 0 : true;
  });
  const [isSending, setIsSending] = useState(false);
  const isCurrentSession = Boolean(currentUser && chatStateUid === currentUser.uid);

  // Media attachment & Emoji states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Voice input state
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const voiceRecognitionRef = useRef<any>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const messageLongPressTimerRef = useRef<number | null>(null);
  const pendingSendTempIdsRef = useRef<Set<string>>(new Set());
  const lastAppliedRouteParamRef = useRef<string | undefined>(undefined);
  const isPocket = Boolean(selectedUser?.isPocket);
  const isGroup = Boolean(selectedUser?.isGroup);

  const startMessageLongPress = (messageId: string) => {
    if (messageLongPressTimerRef.current !== null) {
      window.clearTimeout(messageLongPressTimerRef.current);
    }
    messageLongPressTimerRef.current = window.setTimeout(() => {
      setMessageActionId(messageId);
      messageLongPressTimerRef.current = null;
    }, 450);
  };

  const cancelMessageLongPress = () => {
    if (messageLongPressTimerRef.current !== null) {
      window.clearTimeout(messageLongPressTimerRef.current);
      messageLongPressTimerRef.current = null;
    }
  };

  useEffect(() => () => cancelMessageLongPress(), []);

  useEffect(() => {
    if (!showCreateGroup || groupSearch.trim().length < 2) {
      setGroupResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      userService.searchUsers(groupSearch).then(results => {
        setGroupResults(results.filter(user => user.uid !== currentUser?.uid));
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [showCreateGroup, groupSearch, currentUser?.uid]);

  // Voice recording toggle handler
  const toggleVoiceRecording = () => {
    if (isVoiceRecording) {
      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.stop(); } catch {}
      }
      setIsVoiceRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast(
        isHindi
          ? 'आपके ब्राउज़र में वॉइस टाइपिंग समर्थित नहीं है। कृपया Chrome का उपयोग करें।'
          : 'Voice input is not supported in this browser. Please use Chrome.',
        'error'
      );
      return;
    }

    try {
      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = isHindi ? 'hi-IN' : 'en-IN';
      voiceRecognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsVoiceRecording(true);
        addToast(isHindi ? 'बोलना शुरू करें...' : 'Listening... Speak now', 'info');
      };

      recognition.onresult = (event: any) => {
        let accumulated = '';
        for (let i = 0; i < event.results.length; i++) {
          accumulated += event.results[i][0].transcript;
        }
        if (accumulated.trim()) {
          setMessageText(accumulated.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Chat voice recognition error:', event.error);
        setIsVoiceRecording(false);
        if (event.error === 'not-allowed') {
          addToast(
            isHindi ? 'माइक्रोफ़ोन अनुमति बंद है।' : 'Microphone permission blocked.',
            'error'
          );
        }
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Failed to start chat voice recognition:', err);
      setIsVoiceRecording(false);
    }
  };

  // Load and listen to chat sessions in real time.
  useEffect(() => {
    if (!currentUser) {
      setChatStateUid(null);
      setSessions([]);
      setLoadingSessions(false);
      setSelectedUserId(null);
      setSelectedUser(null);
      setMessages([]);
      return;
    }

    const cached = chatService.getCachedSessions(currentUser.uid);
    setChatStateUid(currentUser.uid);
    setSessions(cached);
    setLoadingSessions(cached.length === 0);
    setSelectedUserId(null);
    setSelectedUser(null);
    setMessages([]);
    setReplyTo(null);
    setEditingMessageId(null);
    setMessageActionId(null);

    const unsubscribe = chatService.listenToConversations(
      currentUser.uid,
      data => {
        setSessions(data);
        setLoadingSessions(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Handle selected user parameter route mapping
  useEffect(() => {
    if (!route.param) {
      lastAppliedRouteParamRef.current = undefined;
      return;
    }

    const targetId = route.param;
    const isNewRouteParam = lastAppliedRouteParamRef.current !== targetId;
    if (isNewRouteParam) {
      lastAppliedRouteParamRef.current = targetId;
      setSelectedUserId(targetId);
    } else if (selectedUserId !== targetId) {
      // User manually selected a different conversation (e.g. My Pocket) in the sidebar
      return;
    }

    // Try finding the user details in already loaded sessions
    const target = sessions.find(s => s.userId === targetId);
    if (target) {
      setSelectedUser(target);
    } else if (isNewRouteParam || !selectedUser || selectedUser.userId !== targetId) {
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
  }, [route.param, sessions, selectedUserId, selectedUser]);

  // Real-time listener for current selected chat with instant cache preload
  useEffect(() => {
    if (!currentUser || !isCurrentSession || !selectedUserId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const uid = currentUser.uid;
    const mergeIncomingWithPending = (incomingMsgs: ChatMessage[], persistCache: boolean) => {
      setMessages(prev => {
        const pending = prev.filter(m => {
          if (!pendingSendTempIdsRef.current.has(m.id)) return false;
          const alreadyInIncoming = incomingMsgs.some(
            inc => inc.id === m.id || inc.clientTempId === m.id
          );
          if (alreadyInIncoming) {
            pendingSendTempIdsRef.current.delete(m.id);
            return false;
          }
          return true;
        });
        const merged = [...incomingMsgs, ...pending];
        if (persistCache) {
          chatService.setCachedMessages(uid, selectedUserId, merged);
        }
        return merged;
      });
      setLoadingMessages(false);
    };

    // 1. Immediately hydrate cached conversation messages (0ms instant display!)
    const cachedMsgs = chatService.getCachedMessages(uid, selectedUserId);
    setMessages(cachedMsgs);
    setLoadingMessages(cachedMsgs.length === 0);

    if (selectedUser?.isPocket) {
      const unsubscribe = chatService.listenToPocketMessages(uid, incomingMsgs => {
        mergeIncomingWithPending(incomingMsgs, true);
      });
      return () => unsubscribe();
    }

    if (selectedUser?.isGroup) {
      const unsubscribe = chatService.listenToGroupMessages(selectedUserId, incomingMsgs => {
        mergeIncomingWithPending(incomingMsgs, true);
      }, uid);
      return () => unsubscribe();
    }

    chatService.ensureConversation(uid, selectedUserId)
      .catch(err => console.error('Failed to ensure conversation:', err));

    const unsubscribe = chatService.listenToMessages(
      uid,
      selectedUserId,
      incomingMsgs => {
        mergeIncomingWithPending(incomingMsgs, false);
        chatService.markAsRead(uid, selectedUserId);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, isCurrentSession, selectedUser?.isGroup, selectedUser?.isPocket, selectedUserId]);

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

  const handleClearMedia = (revokePreview = true) => {
    if (revokePreview && mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setSelectedMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
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
    if (!currentUser || !isCurrentSession || !selectedUserId) return;

    const trimmedText = messageText.trim();
    if (!trimmedText && !selectedMediaFile) return;
    if (!navigator.onLine) {
      addToast(isHindi ? 'संदेश भेजने के लिए ऑनलाइन आएं।' : 'Connect to the internet to send a message.', 'error');
      return;
    }

    setIsSending(true);
    setShowEmojiPicker(false);

    const content = trimmedText;
    const mediaFileToSend = selectedMediaFile;
    const localPreview = mediaPreviewUrl;
    const currentMediaType = mediaType;

    if (editingMessageId) {
      try {
        const editedAt = selectedUser?.isPocket
          ? await chatService.editPocketMessage(currentUser.uid, editingMessageId, trimmedText)
          : selectedUser?.isGroup
            ? await chatService.editGroupMessage(selectedUserId, editingMessageId, currentUser.uid, trimmedText)
            : await chatService.editMessage(editingMessageId, currentUser.uid, trimmedText);
        setMessages(prev => {
          const updated = prev.map(message =>
            message.id === editingMessageId ? { ...message, text: trimmedText, editedAt } : message
          );
          chatService.setCachedMessages(currentUser.uid, selectedUserId, updated);
          return updated;
        });
        setMessageText('');
        setEditingMessageId(null);
        handleClearMedia();
      } catch (err) {
        console.error('Failed to edit message:', err);
        addToast('Failed to edit message. Please try again.', 'error');
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Reset input fields immediately for snappy feel
    setMessageText('');
    handleClearMedia(false);

    // Instant optimistic message rendering
    const tempId = `temp_${Date.now()}`;
    pendingSendTempIdsRef.current.add(tempId);
    const reply = replyTo
      ? { messageId: replyTo.id, senderId: replyTo.senderId, text: replyTo.text, mediaType: replyTo.mediaType }
      : undefined;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      senderId: currentUser.uid,
      receiverId: selectedUser?.isPocket ? currentUser.uid : selectedUserId,
      groupId: selectedUser?.isGroup ? selectedUserId : undefined,
      senderDisplayName: currentUserProfile?.displayName || currentUser.displayName || 'You',
      text: content,
      mediaUrl: localPreview || undefined,
      mediaType: currentMediaType || undefined,
      replyTo: reply,
      deliveryStatus: mediaFileToSend ? 'uploading' : undefined,
      uploadProgress: mediaFileToSend ? 0 : undefined,
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages(prev => {
      const updated = [...prev, optimisticMessage];
      chatService.setCachedMessages(currentUser.uid, selectedUserId, updated);
      return updated;
    });
    setReplyTo(null);

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
      const updatePendingMessage = (updates: Partial<ChatMessage>) => {
        setMessages(prev => {
          const updated = prev.map(message =>
            message.id === tempId ? { ...message, ...updates } : message
          );
          chatService.setCachedMessages(currentUser.uid, selectedUserId, updated);
          return updated;
        });
      };

      // Upload media if present
      if (mediaFileToSend) {
        setIsUploadingMedia(true);
        const uploadResult = await chatService.uploadChatMedia(mediaFileToSend, (pct) => {
          updatePendingMessage({ uploadProgress: pct });
        });
        finalMediaUrl = uploadResult.url;
        finalMediaType = uploadResult.type;
        updatePendingMessage({
          mediaUrl: finalMediaUrl,
          deliveryStatus: 'sending',
          uploadProgress: 100
        });
      }

      const sentMessageId = selectedUser?.isPocket
        ? await chatService.sendPocketMessage(currentUser.uid, content, finalMediaUrl, finalMediaType, reply, tempId)
        : selectedUser?.isGroup
          ? await chatService.sendGroupMessage(
            selectedUserId,
            currentUser.uid,
            currentUserProfile?.displayName || currentUser.displayName || 'You',
            content,
            finalMediaUrl,
            finalMediaType,
            reply
          )
          : await chatService.sendMessage(
            currentUser.uid,
            selectedUserId,
            content,
            finalMediaUrl,
            finalMediaType,
            reply
          );

      pendingSendTempIdsRef.current.delete(tempId);
      setMessages(prev => {
        const alreadySynced = Boolean(
          sentMessageId &&
          prev.some(message => message.id === sentMessageId || message.clientTempId === tempId)
        );
        const updated = alreadySynced
          ? prev.filter(message => message.id !== tempId)
          : prev.map(message =>
              message.id === tempId
                ? { ...message, id: sentMessageId || message.id, deliveryStatus: undefined, uploadProgress: undefined }
                : message
            );
        chatService.setCachedMessages(currentUser.uid, selectedUserId, updated);
        return updated;
      });
    } catch (err) {
      console.error('Failed to deliver message:', err);
      pendingSendTempIdsRef.current.delete(tempId);

      // Remove the optimistic message because delivery did not succeed.
      setMessages(prev => {
        const updated = prev.filter(message => message.id !== tempId);
        chatService.setCachedMessages(currentUser.uid, selectedUserId, updated);
        return updated;
      });

      // Refresh the conversation preview from persisted data.
      try {
        const refreshedSessions = await chatService.getChatSessions(currentUser.uid);
        setSessions(refreshedSessions);
        chatService.setCachedSessions(currentUser.uid, refreshedSessions);
      } catch (refreshError) {
        console.warn('Could not refresh chat sessions:', refreshError);
      }

      addToast('Failed to deliver message. Please try again.', 'error');
    } finally {
      if (localPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview);
      }
      setIsSending(false);
      setIsUploadingMedia(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!currentUser || !isCurrentSession || !selectedUserId) return;

    const confirmDelete = window.confirm(
      isHindi 
        ? `क्या आप ${selectedUser?.displayName} के साथ बातचीत का इतिहास हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।` 
        : `Are you sure you want to permanently delete your conversation history with ${selectedUser?.displayName}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      if (selectedUser?.isPocket) {
        await chatService.clearPocket(currentUser.uid);
      } else {
        await chatService.deleteChatHistory(currentUser.uid, selectedUserId);
      }
      setMessages([]);
      addToast(isHindi ? 'बातचीत का इतिहास साफ़ हो गया।' : 'Conversation cleared successfully.', 'success');
    } catch (err) {
      addToast(isHindi ? 'इतिहास हटाने में विफल।' : 'Failed to delete history.', 'error');
    }
  };

  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim() || selectedGroupMembers.length === 0) return;
    setIsCreatingGroup(true);
    try {
      const group = await chatService.createGroup(
        currentUser.uid,
        groupName,
        selectedGroupMembers.map(member => member.uid)
      );
      setSessions(previous => {
        const updated = [group, ...previous.filter(session => session.userId !== group.userId)];
        chatService.setCachedSessions(currentUser.uid, updated);
        return updated;
      });
      setSelectedUserId(group.userId);
      setSelectedUser(group);
      setGroupName('');
      setGroupSearch('');
      setSelectedGroupMembers([]);
      setShowCreateGroup(false);
      addToast(isHindi ? 'ग्रुप बन गया।' : 'Group created.', 'success');
    } catch (error) {
      console.error('Failed to create group chat:', error);
      addToast(isHindi ? 'ग्रुप नहीं बन सका। फिर से कोशिश करें।' : 'Could not create the group. Please try again.', 'error');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const toggleGroupMember = (member: User) => {
    setSelectedGroupMembers(previous => previous.some(item => item.uid === member.uid)
      ? previous.filter(item => item.uid !== member.uid)
      : [...previous, member]);
  };

  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyTo(message);
    setEditingMessageId(null);
    setMessageActionId(null);
    setTimeout(() => textInputRef.current?.focus(), 0);
  };

  const handleEditMessage = (message: ChatMessage) => {
    if (message.senderId !== currentUser?.uid || !message.text) return;
    setMessageText(message.text);
    setEditingMessageId(message.id);
    setReplyTo(null);
    setMessageActionId(null);
    handleClearMedia();
    setTimeout(() => textInputRef.current?.focus(), 0);
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    if (!currentUser || message.senderId !== currentUser.uid) return;
    const confirmed = window.confirm(isHindi ? 'क्या आप यह संदेश हटाना चाहते हैं?' : 'Delete this message?');
    if (!confirmed) {
      setMessageActionId(null);
      return;
    }

    try {
      if (selectedUser?.isPocket) {
        await chatService.deletePocketMessage(currentUser.uid, message.id);
      } else if (selectedUser?.isGroup) {
        await chatService.deleteGroupMessage(selectedUserId || '', message.id, currentUser.uid);
      } else {
        await chatService.deleteMessage(message.id, currentUser.uid);
      }
      setMessages(prev => {
        const updated = prev.filter(item => item.id !== message.id);
        chatService.setCachedMessages(currentUser.uid, selectedUserId || message.receiverId, updated);
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
      addToast('Failed to delete message. Please try again.', 'error');
    } finally {
      setMessageActionId(null);
    }
  };

  const handleShareMessage = async (message: ChatMessage) => {
    const shareText = message.text || (isHindi ? 'SocialIndia पर साझा किया गया संदेश' : 'A message shared on SocialIndia');
    try {
      if (navigator.share) {
        await navigator.share({
          title: isHindi ? 'SocialIndia संदेश' : 'SocialIndia message',
          text: shareText,
          ...(message.mediaUrl ? { url: message.mediaUrl } : {})
        });
      } else {
        await navigator.clipboard.writeText(
          [shareText, message.mediaUrl].filter(Boolean).join('\n')
        );
        addToast(isHindi ? 'संदेश कॉपी किया गया।' : 'Message copied.', 'success');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Failed to share message:', err);
      addToast(isHindi ? 'संदेश साझा नहीं हो सका।' : 'Could not share message.', 'error');
    } finally {
      setMessageActionId(null);
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
  const filteredSessions = (isCurrentSession ? sessions : []).filter(s =>
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pocketPreviewMessages = currentUser
    ? (selectedUser?.isPocket ? messages : chatService.getCachedMessages(currentUser.uid, `pocket_${currentUser.uid}`))
    : [];
  const lastPocketMsg = pocketPreviewMessages[pocketPreviewMessages.length - 1];
  const pocketSession: ChatSession = currentUser ? {
    userId: `pocket_${currentUser.uid}`,
    displayName: isHindi ? 'मेरा Pocket' : 'My Pocket',
    username: isHindi ? 'आपकी निजी जगह' : 'Personal storage',
    isPocket: true,
    lastMessage: lastPocketMsg
      ? (lastPocketMsg.text || (lastPocketMsg.mediaType === 'image' ? '📷 Photo' : lastPocketMsg.mediaType === 'video' ? '🎥 Video' : (isHindi ? 'सिर्फ़ आपके लिए सेव किया गया' : 'Saved just for you')))
      : (isHindi ? 'सिर्फ़ आपके लिए सेव किया गया' : 'Saved just for you'),
    lastMessageTime: lastPocketMsg?.createdAt,
    unreadCount: 0
  } : {
    userId: '',
    displayName: '',
    username: '',
    unreadCount: 0
  };
  const visibleSessions = [
    ...(pocketSession.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pocketSession.username.toLowerCase().includes(searchQuery.toLowerCase()) ? [pocketSession] : []),
    ...filteredSessions
  ];

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
    <div className="h-[100dvh] flex bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      
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
      <div className={`w-full md:w-80 shrink-0 border-r border-slate-200 dark:border-[#222] flex flex-col h-full bg-white dark:bg-[#0f0f0f] ${isCurrentSession && selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        
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
            <span className="min-w-0 flex-1 truncate font-black text-sm tracking-tight uppercase">{t('chat_direct_messages', 'Direct Messages')}</span>
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-[10px] font-black text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950"
              title={isHindi ? 'नया ग्रुप बनाएं' : 'Create a group'}
            >
              <Plus className="h-3.5 w-3.5" />
              <UsersRound className="h-3.5 w-3.5" />
            </button>
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
          ) : visibleSessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              {t('chat_no_conversations', 'No matching conversations found')}
            </div>
          ) : (
            visibleSessions.map((s) => {
              const isSelected = selectedUserId === s.userId;
              return (
                <button
                  key={s.userId}
                  onClick={() => {
                    if (route.param) lastAppliedRouteParamRef.current = route.param;
                    setSelectedUserId(s.userId);
                    setSelectedUser(s);
                  }}
                  className={`w-full p-3.5 flex items-center gap-3 transition-colors text-left cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50/70 dark:bg-blue-950/20 border-r-2 border-blue-600' 
                      : 'hover:bg-slate-50 dark:hover:bg-[#161616]'
                  }`}
                >
                  <div className="relative shrink-0">
                    {s.isPocket || s.isGroup ? (
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        s.isPocket
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      }`}>
                        {s.isPocket ? <HardDrive className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
                      </div>
                    ) : (
                      <UserAvatar
                        uid={s.userId}
                        fallbackPhotoURL={s.photoURL}
                        fallbackDisplayName={s.displayName || s.username}
                        size="sm"
                        className="w-11 h-11"
                      />
                    )}
                    {s.unreadCount > 0 && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-600 border border-white dark:border-[#0f0f0f] rounded-full flex items-center justify-center text-[8px] text-white font-black">
                        {s.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="min-w-0 flex items-center gap-1 text-xs font-black text-slate-900 dark:text-white">
                        <span className="truncate">{s.displayName}</span>
                        {s.isVerified && (
                          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white" title="Verified account" aria-label="Verified account">
                            <Check className="h-2.5 w-2.5 stroke-[4]" />
                          </span>
                        )}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 shrink-0">{formatSessionTime(s.lastMessageTime)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-semibold">
                      {s.lastMessage || (s.isGroup ? (isHindi ? 'ग्रुप चैट' : 'Group chat') : `@${s.username}`)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT MESSAGE WORKSPACE PANE */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#121212] ${!isCurrentSession || !selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        {isCurrentSession && selectedUserId && selectedUser ? (
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

                {selectedUser.isGroup || selectedUser.isPocket ? (
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    selectedUser.isPocket
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  }`}>
                    {selectedUser.isPocket ? <HardDrive className="h-4 w-4" /> : <UsersRound className="h-4 w-4" />}
                  </div>
                ) : (
                  <UserAvatar
                    uid={selectedUser.userId}
                    fallbackPhotoURL={selectedUser.photoURL}
                    fallbackDisplayName={selectedUser.displayName || selectedUser.username}
                    size="sm"
                    className="w-9 h-9"
                  />
                )}

                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-xs font-black text-slate-900 dark:text-white">
                    <span className="truncate">{selectedUser.displayName}</span>
                    {selectedUser.isVerified && (
                      <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white" title="Verified account" aria-label="Verified account">
                        <Check className="h-2.5 w-2.5 stroke-[4]" />
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {selectedUser.isPocket
                      ? (isHindi ? 'आपकी निजी जगह' : 'Only you can see these messages')
                      : selectedUser.isGroup
                        ? `${selectedUser.participantIds?.length || 0} ${isHindi ? 'सदस्य' : 'members'}`
                        : `@${selectedUser.username}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!selectedUser.isGroup && (
                  <button
                    onClick={() => void handleDeleteConversation()}
                    className="rounded-xl p-2 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title={t('chat_delete_history', 'Delete Conversation History')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable messages bubble board */}
            <div className="dm-message-board flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 scrollbar-none bg-[#efeae2] dark:bg-[#0b141a]">
              {loadingMessages && messages.length === 0 ? (
                <div className="dm-loading-state max-w-sm mx-auto space-y-3 py-8" aria-label="Loading messages">
                  <div className="h-12 w-3/4 rounded-xl bg-white/70 dark:bg-white/10 animate-pulse" />
                  <div className="h-12 w-2/3 ml-auto rounded-xl bg-white/70 dark:bg-white/10 animate-pulse" />
                  <div className="h-12 w-3/4 rounded-xl bg-white/70 dark:bg-white/10 animate-pulse" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-20 text-center text-slate-400 dark:text-slate-500 max-w-sm mx-auto space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {selectedUser ? `Say hi 👋 to ${selectedUser.displayName}` : 'No messages yet'}
                  </p>
                  <p className="text-[11px] leading-relaxed">{t('chat_empty_desc', 'Introduce yourself, share photos, videos, or discuss awesome ideas together.')}</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMine = m.senderId === currentUser.uid;
                  const dayLabel = formatMsgDay(m.createdAt, messages[idx - 1]?.createdAt);
                  const uploadProgressValue = Math.min(100, Math.max(0, m.uploadProgress || 0));
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
                        <UserAvatar
                          uid={m.senderId}
                          fallbackPhotoURL={isMine ? currentUserProfile?.photoURL : (selectedUser.isGroup ? undefined : selectedUser.photoURL)}
                          fallbackDisplayName={isMine ? (currentUserProfile?.displayName || 'Me') : (m.senderDisplayName || selectedUser.displayName)}
                          size="xs"
                          className={`w-7 h-7 ${isMine ? 'order-2' : 'order-1'}`}
                        />

                        <div className={`dm-message-enter relative space-y-1 max-w-[85%] sm:max-w-[70%] ${isMine ? 'order-1' : 'order-2'}`}>
                          {selectedUser.isGroup && (
                            <p className={`px-1 text-[9px] font-black text-slate-600 dark:text-slate-300 ${isMine ? 'text-right' : 'text-left'}`}>
                              {isMine ? (isHindi ? 'आप' : 'You') : (m.senderDisplayName || (isHindi ? 'ग्रुप सदस्य' : 'Group member'))}
                            </p>
                          )}
                          <div
                            onContextMenu={(event) => {
                              event.preventDefault();
                              if (!m.id.startsWith('temp_')) setMessageActionId(m.id);
                            }}
                            onTouchStart={() => {
                              if (!m.id.startsWith('temp_')) startMessageLongPress(m.id);
                            }}
                            onTouchEnd={cancelMessageLongPress}
                            onTouchCancel={cancelMessageLongPress}
                            onTouchMove={cancelMessageLongPress}
                            className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-xs ${
                              isMine
                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-white rounded-tr-lg'
                                : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 border border-[#e9edef] dark:border-[#263238] rounded-tl-lg'
                            }`}
                          >
                            {m.replyTo && (
                              <div className="mb-2 rounded-lg border-l-2 border-blue-500 bg-black/5 dark:bg-white/10 px-2 py-1.5">
                                <p className="text-[9px] font-black text-blue-700 dark:text-blue-300">
                                  {m.replyTo.senderId === currentUser.uid
                                    ? (isHindi ? 'आप' : 'You')
                                    : selectedUser.displayName}
                                </p>
                                <p className="truncate text-[10px] opacity-75">
                                  {m.replyTo.text || (m.replyTo.mediaType === 'image' ? '📷 Photo' : m.replyTo.mediaType === 'video' ? '🎥 Video' : '')}
                                </p>
                              </div>
                            )}
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
                                {m.deliveryStatus === 'uploading' && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span className="text-[11px] font-bold">
                                      {isHindi ? `भेजा जा रहा है ${uploadProgressValue}%` : `Sending ${uploadProgressValue}%`}
                                    </span>
                                    <div className="h-1 w-2/3 overflow-hidden rounded-full bg-white/30">
                                      <div className="h-full bg-white transition-[width]" style={{ width: `${uploadProgressValue}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Media content: Video */}
                            {m.mediaUrl && m.mediaType === 'video' && (
                              <div className="relative mb-2 overflow-hidden rounded-xl bg-black">
                                <video
                                  src={m.mediaUrl}
                                  controls
                                  playsInline
                                  className="max-h-72 w-full rounded-xl bg-black"
                                />
                                {m.deliveryStatus === 'uploading' && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span className="text-[11px] font-bold">
                                      {isHindi ? `भेजा जा रहा है ${uploadProgressValue}%` : `Sending ${uploadProgressValue}%`}
                                    </span>
                                    <div className="h-1 w-2/3 overflow-hidden rounded-full bg-white/30">
                                      <div className="h-full bg-white transition-[width]" style={{ width: `${uploadProgressValue}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Text message */}
                            {m.text && (
                              <p className="break-words whitespace-pre-wrap">{m.text}</p>
                            )}
                          </div>

                          <span className={`text-[9px] text-slate-400 font-bold block ${isMine ? 'text-right' : 'text-left'}`}>
                            {formatMsgTime(m.createdAt)}
                            {m.editedAt ? (isHindi ? ' · संशोधित' : ' · edited') : null}
                            {isMine && m.deliveryStatus ? (
                              <Loader2 className="ml-1 inline h-2.5 w-2.5 animate-spin" />
                            ) : isMine ? (m.read && !isGroup && !isPocket ? ' ✓✓' : ' ✓') : null}
                            {!m.id.startsWith('temp_') && (
                              <button
                                type="button"
                                onClick={() => setMessageActionId(current => current === m.id ? null : m.id)}
                                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 hover:bg-black/10 dark:hover:bg-white/10"
                                aria-label={isHindi ? 'संदेश विकल्प' : 'Message options'}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </span>
                          {messageActionId === m.id && (
                            <div className={`absolute bottom-full z-30 mb-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-[#202c33] ${isMine ? 'right-0' : 'left-0'}`}>
                              <button
                                type="button"
                                onClick={() => handleReplyToMessage(m)}
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-white/10"
                              >
                                <Reply className="h-3.5 w-3.5" /> {isHindi ? 'जवाब' : 'Reply'}
                              </button>
                              {isMine && m.text && (
                                <button
                                  type="button"
                                  onClick={() => handleEditMessage(m)}
                                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-white/10"
                                >
                                  <Edit2 className="h-3.5 w-3.5" /> {isHindi ? 'बदलें' : 'Edit'}
                                </button>
                              )}
                              {isMine && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteMessage(m)}
                                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> {isHindi ? 'हटाएं' : 'Delete'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleShareMessage(m)}
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-white/10"
                              >
                                <Share2 className="h-3.5 w-3.5" /> {isHindi ? 'शेयर' : 'Share'}
                              </button>
                            </div>
                          )}
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
                      <video
                        src={mediaPreviewUrl}
                        muted
                        playsInline
                        preload="metadata"
                        aria-label={isHindi ? 'वीडियो पूर्वावलोकन' : 'Video preview'}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#333] shrink-0"
                      />
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
                    onClick={() => handleClearMedia()}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-[#252528] rounded-xl cursor-pointer transition-colors"
                    title={isHindi ? 'मीडिया हटाएं' : 'Remove media'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(replyTo || editingMessageId) && (
                <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border-l-2 border-blue-600 bg-blue-50 px-3 py-2 dark:bg-blue-950/30">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-blue-700 dark:text-blue-300">
                      {editingMessageId
                        ? (isHindi ? 'संदेश बदल रहे हैं' : 'Editing message')
                        : `${isHindi ? 'जवाब' : 'Replying to'} ${replyTo?.senderId === currentUser.uid ? (isHindi ? 'आप' : 'yourself') : selectedUser.displayName}`}
                    </p>
                    <p className="truncate text-[11px] text-slate-600 dark:text-slate-300">
                      {editingMessageId
                        ? messageText
                        : (replyTo?.text || (replyTo?.mediaType === 'image' ? '📷 Photo' : replyTo?.mediaType === 'video' ? '🎥 Video' : ''))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(null);
                      setEditingMessageId(null);
                      setMessageText('');
                    }}
                    className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    aria-label={isHindi ? 'बंद करें' : 'Cancel'}
                  >
                    <X className="h-4 w-4" />
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
                  placeholder={editingMessageId
                    ? (isHindi ? 'संदेश बदलें...' : 'Edit message...')
                    : selectedMediaFile
                      ? (isHindi ? 'कैप्शन जोड़ें...' : 'Add a caption...')
                      : (isHindi ? 'संदेश लिखें...' : 'Write a message...')}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onPaste={handlePaste}
                  className="flex-1 min-w-0 px-4 py-3 bg-[#efefef] dark:bg-[#202124] border-0 rounded-full text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-slate-500 dark:placeholder-slate-400"
                />

                {messageText.trim() || selectedMediaFile ? (
                  <button type="submit" disabled={isSending || isUploadingMedia} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50 shrink-0" aria-label="Send Message">
                    {isSending || isUploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                ) : (
                  <button type="button" onClick={toggleVoiceRecording} className={`p-3 rounded-full cursor-pointer ${isVoiceRecording ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-[#252525]'}`} aria-label="Voice typing">
                    <Mic className="w-4 h-4" />
                  </button>
                )}
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

      {showCreateGroup && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setShowCreateGroup(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-chat-group-title"
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#15191e]"
            onClick={event => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div>
                <h2 id="create-chat-group-title" className="text-sm font-black text-slate-900 dark:text-white">
                  {isHindi ? 'नया ग्रुप बनाएं' : 'Create a group'}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  {isHindi ? 'दोस्तों को जोड़कर साथ में चैट करें।' : 'Add people and start chatting together.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label={isHindi ? 'बंद करें' : 'Close'}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-3 overflow-y-auto p-4">
              <input
                value={groupName}
                onChange={event => setGroupName(event.target.value)}
                maxLength={80}
                placeholder={isHindi ? 'ग्रुप का नाम' : 'Group name'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1216] dark:text-white"
              />
              <input
                value={groupSearch}
                onChange={event => setGroupSearch(event.target.value)}
                placeholder={isHindi ? 'यूज़र खोजें...' : 'Search people to add...'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1216] dark:text-white"
              />
              {selectedGroupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedGroupMembers.map(member => (
                    <button
                      key={member.uid}
                      type="button"
                      onClick={() => toggleGroupMember(member)}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                      {member.displayName || member.username}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
              <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {groupSearch.trim().length < 2 ? (
                  <p className="p-4 text-center text-[11px] text-slate-500">
                    {isHindi ? 'खोजने के लिए कम से कम 2 अक्षर लिखें।' : 'Type at least 2 characters to search.'}
                  </p>
                ) : groupResults.length === 0 ? (
                  <p className="p-4 text-center text-[11px] text-slate-500">
                    {isHindi ? 'कोई यूज़र नहीं मिला।' : 'No people found.'}
                  </p>
                ) : groupResults.map(member => {
                  const isSelected = selectedGroupMembers.some(item => item.uid === member.uid);
                  return (
                    <button
                      key={member.uid}
                      type="button"
                      onClick={() => toggleGroupMember(member)}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <UserAvatar
                        uid={member.uid}
                        fallbackPhotoURL={member.photoURL}
                        fallbackDisplayName={member.displayName || member.username}
                        size="xs"
                        className="h-8 w-8"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-900 dark:text-white">{member.displayName || member.username}</span>
                        <span className="block truncate text-[10px] text-slate-500">@{member.username}</span>
                      </span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-600'}`}>
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void handleCreateGroup()}
                disabled={!groupName.trim() || selectedGroupMembers.length === 0 || isCreatingGroup}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingGroup && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isHindi ? 'ग्रुप बनाएं' : 'Create group'}
              </button>
            </footer>
          </section>
        </div>
      )}

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
