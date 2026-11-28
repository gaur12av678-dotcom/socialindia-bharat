import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
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
  HardDrive,
  Camera,
  Shield,
  UserPlus,
  UserMinus,
  LogOut,
  Info,
  CheckCircle2,
  AlertCircle,
  Link2,
  ExternalLink,
  Globe,
  Play
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { EmojiText } from '../components/EmojiGraphic';
const EmojiPicker = lazy(() => import('../components/chat/EmojiPicker').then(m => ({ default: m.EmojiPicker })));
import { ChatMediaLightbox, ChatMediaItem } from '../components/chat/ChatMediaLightbox';
import { downloadChatMedia, shareChatMedia } from '../utils/mediaDownloadShare';
import { UserAvatar } from '../components/UserAvatar';
import { formatWhatsAppPresence, isOfficialSocialIndiaAccount, isUserCurrentlyOnline } from '../utils/userUtils';
import { tokenizeTextWithUrls, extractUrlsFromText, normalizeLinkUrl, formatLinkHost } from '../utils/linkUtils';

const ChatMessageText: React.FC<{ text: string; isMine: boolean }> = ({ text, isMine }) => {
  if (!text) return null;
  return (
    <>
      {text.split(/\n/).map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {tokenizeTextWithUrls(line).map((token, idx) =>
            token.type === 'url' && token.href ? (
              <a
                key={`u_${idx}`}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`underline font-bold break-all cursor-pointer transition-colors ${
                  isMine
                    ? 'text-[#027eb5] dark:text-[#53bdeb] hover:opacity-80'
                    : 'text-[#027eb5] dark:text-[#53bdeb] hover:opacity-80'
                }`}
              >
                {token.value}
              </a>
            ) : (
              <EmojiText key={`t_${idx}`} text={token.value} />
            )
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export const ChatPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast, loading: appLoading } = useApp();
  const { route, navigate } = useRouter();
  const { t, isHindi } = useTranslation();
  const activeUid = currentUser?.uid || currentUserProfile?.uid || '';

  // Selected chat partner ID
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChatSession | null>(null);

  // Chat lists & messages with instant localStorage cache hydration
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    return activeUid ? chatService.getCachedSessions(activeUid) : [];
  });
  const [chatStateUid, setChatStateUid] = useState<string | null>(() => activeUid || null);
  const prevChatUidRef = useRef<string | null>(activeUid || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageActionId, setMessageActionId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupResults, setGroupResults] = useState<User[]>([]);
  const [suggestedGroupContacts, setSuggestedGroupContacts] = useState<User[]>([]);
  const [loadingGroupContacts, setLoadingGroupContacts] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<User[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  // WhatsApp-style Group Info & Admin Management Modal state
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [groupMembersDetails, setGroupMembersDetails] = useState<User[]>([]);
  const [loadingGroupInfo, setLoadingGroupInfo] = useState(false);
  const [editingGroupInfo, setEditingGroupInfo] = useState(false);
  const [editGroupNameInput, setEditGroupNameInput] = useState('');
  const [editGroupDescInput, setEditGroupDescInput] = useState('');
  const [savingGroupInfo, setSavingGroupInfo] = useState(false);
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);
  const [showAddMembersPicker, setShowAddMembersPicker] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberPool, setAddMemberPool] = useState<User[]>([]);
  const [loadingAddPool, setLoadingAddPool] = useState(false);
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [memberActionUid, setMemberActionUid] = useState<string | null>(null);
  const [confirmLeaveGroup, setConfirmLeaveGroup] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [groupInfoError, setGroupInfoError] = useState<string | null>(null);
  const [groupInfoNotice, setGroupInfoNotice] = useState<string | null>(null);
  const createGroupAvatarInputRef = useRef<HTMLInputElement>(null);
  const editGroupAvatarInputRef = useRef<HTMLInputElement>(null);

  const [presenceMap, setPresenceMap] = useState<Record<string, { isOnline?: boolean; lastSeen?: string }>>({});
  const [, setPresenceTick] = useState(0);
  const [unreadBySender, setUnreadBySender] = useState<Record<string, number>>({});
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'groups' | 'direct'>('all');
  const [messageText, setMessageText] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(() => {
    return activeUid ? chatService.getCachedSessions(activeUid).length === 0 : true;
  });
  const [isSending, setIsSending] = useState(false);
  const isCurrentSession = Boolean(activeUid && chatStateUid === activeUid);

  // Media attachment, Link & Emoji states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [chatLinkInput, setChatLinkInput] = useState('');
  const [chatLinkError, setChatLinkError] = useState<string | null>(null);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [activeMediaMessageId, setActiveMediaMessageId] = useState<string | null>(null);

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
  const sessionsRef = useRef<ChatSession[]>(sessions);
  sessionsRef.current = sessions;
  const shouldInstantScrollRef = useRef<boolean>(true);
  const prevSelectedChatForScrollRef = useRef<string | null>(null);
  const prevMsgCountForScrollRef = useRef<number>(0);
  const [visibleMessageLimit, setVisibleMessageLimit] = useState<number>(80);
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

  // Load suggested contacts when Create Group modal opens
  useEffect(() => {
    if (!showCreateGroup) return;
    setGroupError(null);
    let active = true;
    const fromSessions: User[] = sessions
      .filter(s => !s.isGroup && !s.isPocket && s.userId && s.userId !== currentUser?.uid)
      .map(s => ({
        uid: s.userId,
        username: s.username,
        displayName: s.displayName,
        photoURL: s.photoURL,
        followersCount: 0,
        followingCount: 0,
        videosCount: 0,
        role: 'user',
        status: 'active',
        createdAt: '',
        updatedAt: ''
      }));
    setSuggestedGroupContacts(fromSessions);
    setLoadingGroupContacts(true);
    userService.getAllUsers()
      .then(all => {
        if (!active) return;
        const map = new Map<string, User>();
        fromSessions.forEach(u => map.set(u.uid, u));
        all.forEach(u => {
          if (u.uid && u.uid !== currentUser?.uid && !map.has(u.uid)) {
            map.set(u.uid, u);
          }
        });
        setSuggestedGroupContacts(Array.from(map.values()).slice(0, 25));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingGroupContacts(false);
      });
    return () => {
      active = false;
    };
  }, [showCreateGroup, sessions, currentUser?.uid]);

  useEffect(() => {
    if (!showCreateGroup || groupSearch.trim().length < 2) {
      setGroupResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      userService.searchUsers(groupSearch).then(results => {
        setGroupResults(results.filter(user => user.uid && user.uid !== currentUser?.uid));
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [showCreateGroup, groupSearch, currentUser?.uid]);

  // Stabilized list of DM partner UIDs so updating lastMessage doesn't tear down & re-subscribe listeners
  const dmPresenceIdsKey = useMemo(() => {
    if (!currentUser) return '';
    const dmUserIds: string[] = [];
    const seen = new Set<string>();
    if (
      selectedUserId &&
      !selectedUser?.isGroup &&
      !selectedUser?.isPocket &&
      !isOfficialSocialIndiaAccount(selectedUser || { uid: selectedUserId })
    ) {
      seen.add(selectedUserId);
      dmUserIds.push(selectedUserId);
    }
    for (const s of sessions) {
      if (dmUserIds.length >= 16) break;
      if (
        !s.isGroup &&
        !s.isPocket &&
        s.userId &&
        !seen.has(s.userId) &&
        !isOfficialSocialIndiaAccount(s)
      ) {
        seen.add(s.userId);
        dmUserIds.push(s.userId);
      }
    }
    return dmUserIds.join(',');
  }, [currentUser?.uid, selectedUserId, selectedUser?.isGroup, selectedUser?.isPocket, sessions]);

  // Real-time WhatsApp-style presence subscriptions for selected user & visible DM contacts
  useEffect(() => {
    if (!currentUser || !dmPresenceIdsKey) return;
    const ids = dmPresenceIdsKey.split(',').filter(Boolean);
    const unsubs = ids.map(uid =>
      userService.subscribeToUserPresence(uid, presence => {
        setPresenceMap(prev => ({ ...prev, [uid]: presence }));
      })
    );

    const refreshTicker = window.setInterval(() => {
      setPresenceTick(v => v + 1);
    }, 30_000);

    return () => {
      unsubs.forEach(unsub => unsub());
      window.clearInterval(refreshTicker);
    };
  }, [currentUser?.uid, dmPresenceIdsKey]);

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
    if (!activeUid) {
      if (!appLoading) {
        prevChatUidRef.current = null;
        setChatStateUid(null);
        setSessions([]);
        setLoadingSessions(false);
        setSelectedUserId(null);
        setSelectedUser(null);
        setMessages([]);
      }
      return;
    }

    const isAccountSwitch = Boolean(prevChatUidRef.current && prevChatUidRef.current !== activeUid);
    prevChatUidRef.current = activeUid;

    const cached = chatService.getCachedSessions(activeUid);
    setChatStateUid(activeUid);
    setSessions(cached);
    setLoadingSessions(cached.length === 0);

    if (isAccountSwitch) {
      setSelectedUserId(null);
      setSelectedUser(null);
      setMessages([]);
      setReplyTo(null);
      setEditingMessageId(null);
      setMessageActionId(null);
    }

    if (!currentUser?.uid) {
      return;
    }

    const unsubscribe = chatService.listenToConversations(
      currentUser.uid,
      data => {
        setSessions(data);
        setLoadingSessions(false);
      }
    );

    const unsubscribeUnread = chatService.listenToUnreadBySender(
      currentUser.uid,
      counts => {
        setUnreadBySender(counts);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeUnread();
    };
  }, [activeUid, currentUser?.uid, appLoading]);

  // Keep selectedUser synced with live session updates (group avatar/name/description/admins/members)
  useEffect(() => {
    if (!selectedUserId) return;
    const match = sessions.find(s => s.userId === selectedUserId);
    if (match) {
      setSelectedUser(match);
    }
  }, [sessions, selectedUserId]);

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
    if (!activeUid || !isCurrentSession || !selectedUserId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const uid = activeUid;
    const deduplicateMessages = (list: ChatMessage[]): ChatMessage[] => {
      const seenIds = new Set<string>();
      const seenTempIds = new Set<string>();
      const result: ChatMessage[] = [];
      for (const msg of list) {
        if (!msg?.id || seenIds.has(msg.id)) continue;
        if (msg.clientTempId && seenTempIds.has(msg.clientTempId)) continue;
        seenIds.add(msg.id);
        if (msg.clientTempId) seenTempIds.add(msg.clientTempId);
        result.push(msg);
      }
      return result;
    };

    const mergeIncomingWithPending = (incomingMsgs: ChatMessage[], persistCache: boolean) => {
      setMessages(prev => {
        const pending = prev.filter(m => {
          if (!pendingSendTempIdsRef.current.has(m.id)) return false;
          const alreadyInIncoming = incomingMsgs.some(
            inc =>
              inc.id === m.id ||
              inc.clientTempId === m.id ||
              (m.clientTempId && inc.clientTempId === m.clientTempId)
          );
          if (alreadyInIncoming) {
            pendingSendTempIdsRef.current.delete(m.id);
            return false;
          }
          return true;
        });
        const merged = deduplicateMessages([...incomingMsgs, ...pending]);
        if (persistCache) {
          chatService.setCachedMessages(uid, selectedUserId, merged);
        }
        return merged;
      });
      setLoadingMessages(false);
    };

    // Reset message window & scroll instantly when switching chats
    setVisibleMessageLimit(80);
    shouldInstantScrollRef.current = true;
    prevMsgCountForScrollRef.current = 0;

    // 1. Immediately hydrate cached conversation messages (0ms instant display!)
    const cachedMsgs = chatService.getCachedMessages(uid, selectedUserId);
    setMessages(cachedMsgs);
    setLoadingMessages(cachedMsgs.length === 0);

    if (!currentUser?.uid) {
      return;
    }

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

    // Only ensureConversation if this partner isn't already in our loaded sessions
    const hasExistingSession = sessionsRef.current.some(
      s => s.userId === selectedUserId && !s.isGroup && !s.isPocket
    );
    if (!hasExistingSession) {
      chatService.ensureConversation(uid, selectedUserId)
        .catch(err => console.error('Failed to ensure conversation:', err));
    }

    if ((unreadBySender[selectedUserId] || 0) > 0) {
      void chatService.markAsRead(uid, selectedUserId);
    }

    const unsubscribe = chatService.listenToMessages(
      uid,
      selectedUserId,
      incomingMsgs => {
        mergeIncomingWithPending(incomingMsgs, false);
        const hasUnreadFromPartner = incomingMsgs.some(
          m => m.senderId === selectedUserId && !m.read
        );
        if (hasUnreadFromPartner) {
          void chatService.markAsRead(uid, selectedUserId);
        }
      }
    );

    return () => unsubscribe();
  }, [activeUid, currentUser?.uid, isCurrentSession, selectedUser?.isGroup, selectedUser?.isPocket, selectedUserId]);

  // Also clear newly arriving unread messages automatically while that direct chat is already open
  useEffect(() => {
    if (!currentUser || !isCurrentSession || !selectedUserId) return;
    if (selectedUser?.isPocket || selectedUser?.isGroup) return;
    if (selectedUserId.startsWith('pocket_') || selectedUserId.startsWith('grp_')) return;
    if ((unreadBySender[selectedUserId] || 0) > 0) {
      void chatService.markAsRead(currentUser.uid, selectedUserId);
    }
  }, [currentUser?.uid, isCurrentSession, selectedUser?.isGroup, selectedUser?.isPocket, selectedUserId, unreadBySender]);

  // Auto scroll to bottom (instant on chat switch/initial load, smooth only for new messages)
  useEffect(() => {
    const switchedChat = prevSelectedChatForScrollRef.current !== selectedUserId;
    prevSelectedChatForScrollRef.current = selectedUserId;

    if (messages.length === 0 && !mediaPreviewUrl) return;

    const behavior: ScrollBehavior =
      switchedChat || shouldInstantScrollRef.current || prevMsgCountForScrollRef.current === 0
        ? 'auto'
        : 'smooth';

    prevMsgCountForScrollRef.current = messages.length;
    if (messages.length > 0) {
      shouldInstantScrollRef.current = false;
    }

    messagesEndRef.current?.scrollIntoView({ behavior });
  }, [messages.length, mediaPreviewUrl, selectedUserId]);

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

  // Insert a validated link into the chat message composer
  const handleInsertChatLink = () => {
    const normalized = normalizeLinkUrl(chatLinkInput);
    if (!normalized) {
      setChatLinkError(isHindi ? 'कृपया सही लिंक दर्ज करें (उदा. https://example.com)' : 'Please enter a valid link (e.g. https://example.com)');
      return;
    }
    setMessageText((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${normalized}` : normalized;
    });
    setChatLinkInput('');
    setChatLinkError(null);
    setShowLinkInput(false);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 10);
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
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    pendingSendTempIdsRef.current.add(tempId);
    const reply = replyTo
      ? { messageId: replyTo.id, senderId: replyTo.senderId, text: replyTo.text, mediaType: replyTo.mediaType }
      : undefined;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      clientTempId: tempId,
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
            reply,
            tempId
          )
          : await chatService.sendMessage(
            currentUser.uid,
            selectedUserId,
            content,
            finalMediaUrl,
            finalMediaType,
            reply,
            tempId
          );

      pendingSendTempIdsRef.current.delete(tempId);
      setMessages(prev => {
        const alreadySynced = Boolean(
          sentMessageId &&
          prev.some(
            message =>
              message.id === sentMessageId ||
              (message.id !== tempId && message.clientTempId === tempId)
          )
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
    if (!currentUser) return;
    if (!groupName.trim()) {
      setGroupError(isHindi ? 'कृपया ग्रुप का नाम लिखें।' : 'Please enter a group name.');
      return;
    }
    if (selectedGroupMembers.length === 0) {
      setGroupError(isHindi ? 'कृपया कम से कम 1 सदस्य चुनें।' : 'Please select at least 1 member to add.');
      return;
    }
    setGroupError(null);
    setIsCreatingGroup(true);
    try {
      let uploadedAvatarUrl = '';
      if (groupAvatarFile) {
        uploadedAvatarUrl = await chatService.uploadGroupAvatar(groupAvatarFile);
      }
      const group = await chatService.createGroup(
        currentUser.uid,
        groupName,
        selectedGroupMembers.map(member => member.uid),
        groupDescription,
        uploadedAvatarUrl
      );
      setSessions(previous => {
        const updated = [group, ...previous.filter(session => session.userId !== group.userId)];
        chatService.setCachedSessions(currentUser.uid, updated);
        return updated;
      });
      setSelectedUserId(group.userId);
      setSelectedUser(group);
      setGroupName('');
      setGroupDescription('');
      if (groupAvatarPreview?.startsWith('blob:')) URL.revokeObjectURL(groupAvatarPreview);
      setGroupAvatarFile(null);
      setGroupAvatarPreview(null);
      setGroupSearch('');
      setSelectedGroupMembers([]);
      setGroupError(null);
      setShowCreateGroup(false);
      addToast(isHindi ? 'ग्रुप बन गया।' : 'Group created.', 'success');
    } catch (error: any) {
      console.error('Failed to create group chat:', error);
      const msg = error?.message || (isHindi ? 'ग्रुप नहीं बन सका। फिर से कोशिश करें।' : 'Could not create the group. Please try again.');
      setGroupError(msg);
      addToast(msg, 'error');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const toggleGroupMember = (member: User) => {
    if (!member?.uid) return;
    setGroupError(null);
    setSelectedGroupMembers(previous => previous.some(item => item.uid === member.uid)
      ? previous.filter(item => item.uid !== member.uid)
      : [...previous, member]);
  };

  const syncGroupSessionPatch = (groupId: string, patch: Partial<ChatSession>) => {
    setSelectedUser(prev => (prev && prev.userId === groupId ? { ...prev, ...patch } : prev));
    setSessions(prev => {
      const updated = prev.map(s => (s.userId === groupId ? { ...s, ...patch } : s));
      if (currentUser?.uid) chatService.setCachedSessions(currentUser.uid, updated);
      return updated;
    });
  };

  const openGroupInfoModal = async () => {
    if (!selectedUser?.isGroup || !selectedUserId) return;
    setShowGroupInfoModal(true);
    setEditingGroupInfo(false);
    setShowAddMembersPicker(false);
    setSelectedNewMemberIds([]);
    setAddMemberSearch('');
    setConfirmLeaveGroup(false);
    setGroupInfoError(null);
    setGroupInfoNotice(null);
    setEditGroupNameInput(selectedUser.displayName || '');
    setEditGroupDescInput(selectedUser.description || '');
    setLoadingGroupInfo(true);
    try {
      const details = await chatService.getGroupDetails(selectedUserId);
      syncGroupSessionPatch(selectedUserId, details.group);
      setEditGroupNameInput(details.group.displayName || '');
      setEditGroupDescInput(details.group.description || '');
      setGroupMembersDetails(details.members);
    } catch (err: any) {
      setGroupInfoError(err?.message || (isHindi ? 'ग्रुप जानकारी लोड नहीं हो सकी।' : 'Could not load group details.'));
    } finally {
      setLoadingGroupInfo(false);
    }
  };

  const isCurrentUserGroupAdmin = Boolean(
    currentUser?.uid &&
    selectedUser?.isGroup &&
    (
      selectedUser.createdBy === currentUser.uid ||
      selectedUser.adminIds?.includes(currentUser.uid)
    )
  );

  const handleGroupAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.uid || !selectedUserId) return;
    if (!file.type.startsWith('image/')) {
      setGroupInfoError(isHindi ? 'कृपया एक इमेज फ़ाइल चुनें।' : 'Please choose an image file.');
      return;
    }
    setUploadingGroupAvatar(true);
    setGroupInfoError(null);
    setGroupInfoNotice(null);
    try {
      const url = await chatService.uploadGroupAvatar(file);
      const patch = await chatService.updateGroupInfo(selectedUserId, currentUser.uid, { photoURL: url });
      syncGroupSessionPatch(selectedUserId, patch);
      setGroupInfoNotice(isHindi ? 'ग्रुप अवतार अपडेट हो गया।' : 'Group avatar updated.');
    } catch (err: any) {
      setGroupInfoError(err?.message || (isHindi ? 'अवतार अपडेट नहीं हो सका।' : 'Could not update group avatar.'));
    } finally {
      setUploadingGroupAvatar(false);
      if (editGroupAvatarInputRef.current) editGroupAvatarInputRef.current.value = '';
    }
  };

  const handleRemoveGroupAvatar = async () => {
    if (!currentUser?.uid || !selectedUserId) return;
    setUploadingGroupAvatar(true);
    setGroupInfoError(null);
    setGroupInfoNotice(null);
    try {
      const patch = await chatService.updateGroupInfo(selectedUserId, currentUser.uid, { photoURL: '' });
      syncGroupSessionPatch(selectedUserId, patch);
      setGroupInfoNotice(isHindi ? 'ग्रुप अवतार हटाया गया।' : 'Group avatar removed.');
    } catch (err: any) {
      setGroupInfoError(err?.message || 'Could not remove avatar.');
    } finally {
      setUploadingGroupAvatar(false);
    }
  };

  const handleSaveGroupDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !selectedUserId) return;
    if (!editGroupNameInput.trim()) {
      setGroupInfoError(isHindi ? 'ग्रुप का नाम खाली नहीं हो सकता।' : 'Group name cannot be empty.');
      return;
    }
    setSavingGroupInfo(true);
    setGroupInfoError(null);
    setGroupInfoNotice(null);
    try {
      const patch = await chatService.updateGroupInfo(selectedUserId, currentUser.uid, {
        name: editGroupNameInput,
        description: editGroupDescInput
      });
      syncGroupSessionPatch(selectedUserId, patch);
      setEditingGroupInfo(false);
      setGroupInfoNotice(isHindi ? 'ग्रुप विवरण सेव हो गया।' : 'Group info updated.');
    } catch (err: any) {
      setGroupInfoError(err?.message || (isHindi ? 'ग्रुप अपडेट करने में त्रुटि।' : 'Could not update group info.'));
    } finally {
      setSavingGroupInfo(false);
    }
  };

  const handleOpenAddMembers = async () => {
    const nextOpen = !showAddMembersPicker;
    setShowAddMembersPicker(nextOpen);
    setSelectedNewMemberIds([]);
    setAddMemberSearch('');
    if (!nextOpen) return;
    setLoadingAddPool(true);
    try {
      const all = await userService.getAllUsers();
      const existing = new Set(selectedUser?.participantIds || []);
      setAddMemberPool(all.filter(u => u.uid && !existing.has(u.uid)));
    } catch {
      setAddMemberPool([]);
    } finally {
      setLoadingAddPool(false);
    }
  };

  const handleConfirmAddMembers = async () => {
    if (!currentUser?.uid || !selectedUserId || selectedNewMemberIds.length === 0) return;
    setAddingMembers(true);
    setGroupInfoError(null);
    setGroupInfoNotice(null);
    try {
      const nextParticipants = await chatService.addGroupMembers(selectedUserId, currentUser.uid, selectedNewMemberIds);
      syncGroupSessionPatch(selectedUserId, { participantIds: nextParticipants });
      const details = await chatService.getGroupDetails(selectedUserId);
      setGroupMembersDetails(details.members);
      setShowAddMembersPicker(false);
      setSelectedNewMemberIds([]);
      setGroupInfoNotice(isHindi ? 'नए सदस्य जोड़े गए।' : 'Members added to group.');
    } catch (err: any) {
      setGroupInfoError(err?.message || (isHindi ? 'सदस्य जोड़ने में त्रुटि।' : 'Could not add members.'));
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveGroupMember = async (targetUid: string) => {
    if (!currentUser?.uid || !selectedUserId) return;
    setMemberActionUid(targetUid);
    setGroupInfoError(null);
    setGroupInfoNotice(null);
    try {
      const res = await chatService.removeGroupMember(selectedUserId, currentUser.uid, targetUid);
      syncGroupSessionPatch(selectedUserId, res);
      setGroupMembersDetails(prev => prev.filter(m => m.uid !== targetUid));
      setGroupInfoNotice(isHindi ? 'सदस्य को ग्रुप से हटाया गया।' : 'Member removed from group.');
    } catch (err: any) {
      setGroupInfoError(err?.message || (isHindi ? 'सदस्य को हटाने में त्रुटि।' : 'Could not remove member.'));
    } finally {
      setMemberActionUid(null);
    }
  };

  const handleToggleGroupMemberAdmin = async (targetUid: string, makeAdmin: boolean) => {
    if (!currentUser?.uid || !selectedUserId) return;
    setMemberActionUid(targetUid);
    setGroupInfoError(null);
    setGroupInfoNotice(null);
    try {
      const nextAdmins = await chatService.setGroupMemberAdmin(selectedUserId, currentUser.uid, targetUid, makeAdmin);
      syncGroupSessionPatch(selectedUserId, { adminIds: nextAdmins });
      setGroupInfoNotice(
        makeAdmin
          ? (isHindi ? 'सदस्य को ग्रुप एडमिन बनाया गया।' : 'Member is now a group admin.')
          : (isHindi ? 'एडमिन भूमिका हटाई गई।' : 'Admin role removed.')
      );
    } catch (err: any) {
      setGroupInfoError(err?.message || (isHindi ? 'एडमिन बदलने में त्रुटि।' : 'Could not update admin role.'));
    } finally {
      setMemberActionUid(null);
    }
  };

  const handleTransferGroupAdmin = async (targetUid: string) => {
    if (!currentUser?.uid || !selectedUserId) return;
    setMemberActionUid(targetUid);
    setGroupInfoError(null);
    setGroupInfoNotice(null);
    try {
      const nextAdmins = await chatService.transferGroupAdmin(selectedUserId, currentUser.uid, targetUid);
      syncGroupSessionPatch(selectedUserId, { adminIds: nextAdmins });
      setGroupInfoNotice(isHindi ? 'ग्रुप एडमिन सफलतापूर्वक ट्रांसफर किया गया।' : 'Admin role transferred to selected member.');
    } catch (err: any) {
      setGroupInfoError(err?.message || (isHindi ? 'एडमिन ट्रांसफर नहीं हो सका।' : 'Could not transfer admin role.'));
    } finally {
      setMemberActionUid(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser?.uid || !selectedUserId) return;
    setLeavingGroup(true);
    setGroupInfoError(null);
    try {
      await chatService.leaveGroup(selectedUserId, currentUser.uid);
      const leftGroupId = selectedUserId;
      setShowGroupInfoModal(false);
      setConfirmLeaveGroup(false);
      setSelectedUserId(null);
      setSelectedUser(null);
      setMessages([]);
      setSessions(prev => {
        const updated = prev.filter(s => s.userId !== leftGroupId);
        chatService.setCachedSessions(currentUser.uid, updated);
        return updated;
      });
      addToast(isHindi ? 'आप ग्रुप से बाहर आ गए हैं।' : 'You left the group.', 'info');
    } catch (err: any) {
      setGroupInfoError(err?.message || (isHindi ? 'ग्रुप छोड़ने में त्रुटि।' : 'Could not leave group.'));
    } finally {
      setLeavingGroup(false);
    }
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
      addToast(isHindi ? 'संदेश हटाने में विफल। कृपया पुनः प्रयास करें।' : 'Failed to delete message. Please try again.', 'error');
    } finally {
      setMessageActionId(null);
    }
  };

  const handleDownloadMessageMedia = async (message: ChatMessage) => {
    if (!message.mediaUrl || (message.mediaType !== 'image' && message.mediaType !== 'video')) return;
    setMessageActionId(null);
    try {
      const mode = await downloadChatMedia({
        url: message.mediaUrl,
        mediaType: message.mediaType,
        id: message.id,
      });
      if (mode === 'direct' || mode === 'bridge') {
        addToast(isHindi ? 'डाउनलोड शुरू हो गया है!' : 'Download started!', 'success');
      } else {
        addToast(
          message.mediaType === 'video'
            ? (isHindi ? 'वीडियो आपके डिवाइस में सेव हो गया!' : 'Video saved to your device!')
            : (isHindi ? 'फ़ोटो आपके डिवाइस में सेव हो गई!' : 'Photo saved to your device!'),
          'success'
        );
      }
    } catch (err) {
      console.error('Failed to download message media:', err);
      addToast(isHindi ? 'डाउनलोड करने में समस्या आई।' : 'Failed to download media.', 'error');
    }
  };

  const handleShareMessage = async (message: ChatMessage) => {
    const shareText = message.text || (isHindi ? 'SocialIndia पर साझा किया गया संदेश' : 'A message shared on SocialIndia');
    try {
      if (message.mediaUrl && (message.mediaType === 'image' || message.mediaType === 'video')) {
        const result = await shareChatMedia({
          url: message.mediaUrl,
          mediaType: message.mediaType,
          text: message.text,
          id: message.id,
          title: isHindi ? 'SocialIndia मीडिया' : 'SocialIndia Media',
        });
        if (result === 'copied') {
          addToast(isHindi ? 'मीडिया लिंक कॉपी किया गया।' : 'Media link copied.', 'success');
        }
      } else if (navigator.share) {
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

  const chatMediaItems = useMemo<ChatMediaItem[]>(() => {
    return messages
      .filter(
        (m): m is ChatMessage & { mediaUrl: string; mediaType: 'image' | 'video' } =>
          Boolean(m.mediaUrl) &&
          (m.mediaType === 'image' || m.mediaType === 'video') &&
          m.deliveryStatus !== 'uploading'
      )
      .map((m) => {
        const isSenderMe = m.senderId === activeUid;
        const senderName = isSenderMe
          ? (currentUserProfile?.displayName || (isHindi ? 'आप' : 'You'))
          : (m.senderDisplayName || selectedUser?.displayName || (isHindi ? 'यूज़र' : 'User'));
        return {
          id: m.id,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          senderName,
          createdAt: m.createdAt,
          text: m.text,
        };
      });
  }, [messages, activeUid, currentUserProfile?.displayName, selectedUser?.displayName, isHindi]);

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
      if (diffMins < 1) return isHindi ? 'अभी' : 'now';
      if (diffMins < 60) return isHindi ? `${diffMins} मि` : `${diffMins} m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return isHindi ? `${diffHours} घं` : `${diffHours} h`;
      return date.toLocaleDateString(isHindi ? 'hi-IN' : [], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Filter sessions based on search query input and WhatsApp-style category filter
  const activeSessionsList = isCurrentSession ? sessions : [];
  const getSessionUnreadCount = (session: ChatSession): number => {
    if (session.isPocket || session.isGroup) return 0;
    if (selectedUserId === session.userId) return 0;
    return unreadBySender[session.userId] ?? 0;
  };
  const unreadChatsCount = activeSessionsList.filter(s => getSessionUnreadCount(s) > 0).length;
  const filteredSessions = activeSessionsList.filter(s =>
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pocketPreviewMessages = useMemo(() => {
    if (!activeUid) return [];
    if (selectedUser?.isPocket) return messages;
    return chatService.getCachedMessages(activeUid, `pocket_${activeUid}`);
  }, [activeUid, selectedUser?.isPocket, messages]);
  const lastPocketMsg = pocketPreviewMessages[pocketPreviewMessages.length - 1];
  const pocketSession: ChatSession = activeUid ? {
    userId: `pocket_${activeUid}`,
    displayName: isHindi ? 'मेरा Pocket' : 'My Pocket',
    username: isHindi ? 'आपकी निजी जगह' : 'Personal storage',
    isPocket: true,
    lastMessage: lastPocketMsg
      ? (lastPocketMsg.text || (lastPocketMsg.mediaType === 'image' ? (isHindi ? '📷 फ़ोटो' : '📷 Photo') : lastPocketMsg.mediaType === 'video' ? (isHindi ? '🎥 वीडियो' : '🎥 Video') : (isHindi ? 'सिर्फ़ आपके लिए सेव किया गया' : 'Saved just for you')))
      : (isHindi ? 'सिर्फ़ आपके लिए सेव किया गया' : 'Saved just for you'),
    lastMessageTime: lastPocketMsg?.createdAt,
    unreadCount: 0
  } : {
    userId: '',
    displayName: '',
    username: '',
    unreadCount: 0
  };
  const pocketMatchesSearch =
    Boolean(pocketSession.userId) &&
    (pocketSession.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pocketSession.username.toLowerCase().includes(searchQuery.toLowerCase()));

  const visibleSessions = (() => {
    const baseSessions =
      chatFilter === 'unread'
        ? filteredSessions.filter(s => getSessionUnreadCount(s) > 0)
        : chatFilter === 'groups'
          ? filteredSessions.filter(s => Boolean(s.isGroup))
          : chatFilter === 'direct'
            ? filteredSessions.filter(s => !s.isGroup)
            : filteredSessions;

    const includePocket = (chatFilter === 'all' || chatFilter === 'direct') && pocketMatchesSearch;
    return [
      ...(includePocket ? [pocketSession] : []),
      ...baseSessions
    ];
  })();

  if (appLoading && !activeUid) {
    return (
      <div className="h-[100dvh] flex bg-white dark:bg-[#0f0f0f] overflow-hidden animate-pulse">
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-full w-2/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:flex flex-1 items-center justify-center p-8">
          <div className="w-64 h-40 rounded-3xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  if (!activeUid) {
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
              title={isHindi ? 'होम पर वापस जाएं' : 'Back to Home'}
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

          {/* WhatsApp-style chat filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5" role="tablist" aria-label={isHindi ? 'चैट फ़िल्टर' : 'Chat filters'}>
            {(
              [
                { id: 'all', label: isHindi ? 'सभी' : 'All' },
                { id: 'unread', label: isHindi ? 'अपठित' : 'Unread', badge: unreadChatsCount },
                { id: 'groups', label: isHindi ? 'ग्रुप्स' : 'Groups' },
                { id: 'direct', label: isHindi ? 'डायरेक्ट' : 'Direct' },
              ] as Array<{ id: 'all' | 'unread' | 'groups' | 'direct'; label: string; badge?: number }>
            ).map(tab => {
              const active = chatFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setChatFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-[#242424]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className={`inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full text-[10px] font-black ${
                        active
                          ? 'bg-white/25 text-white dark:bg-slate-950/20 dark:text-slate-950'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
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
              const rowUnreadCount = getSessionUnreadCount(s);
              return (
                <button
                  key={s.userId}
                  onClick={() => {
                    if (route.param) lastAppliedRouteParamRef.current = route.param;
                    if (selectedUserId !== s.userId) {
                      const cached = activeUid ? chatService.getCachedMessages(activeUid, s.userId) : [];
                      setMessages(cached);
                      setLoadingMessages(cached.length === 0);
                      setVisibleMessageLimit(80);
                      shouldInstantScrollRef.current = true;
                      setReplyTo(null);
                      setEditingMessageId(null);
                      setMessageActionId(null);
                    }
                    setSelectedUserId(s.userId);
                    setSelectedUser(s);
                    if (currentUser?.uid && !s.isPocket && !s.isGroup && (unreadBySender[s.userId] || 0) > 0) {
                      void chatService.markAsRead(currentUser.uid, s.userId);
                    }
                  }}
                  className={`w-full p-3.5 flex items-center gap-3 transition-colors text-left cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-r-2 border-blue-600' 
                      : 'hover:bg-slate-50 dark:hover:bg-[#161616]'
                  }`}
                >
                  <div className="relative shrink-0">
                    {s.isPocket || s.isGroup ? (
                      s.isGroup && s.photoURL ? (
                        <img
                          src={s.photoURL}
                          alt={s.displayName}
                          className="h-11 w-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${
                          s.isPocket
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        }`}>
                          {s.isPocket ? <HardDrive className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
                        </div>
                      )
                    ) : (
                      <>
                        <UserAvatar
                          key={s.userId}
                          uid={s.userId}
                          fallbackPhotoURL={s.photoURL}
                          fallbackDisplayName={s.displayName || s.username}
                          size="sm"
                          className="w-11 h-11"
                        />
                        {!isOfficialSocialIndiaAccount(s) && (() => {
                          const p = presenceMap[s.userId];
                          const online = isUserCurrentlyOnline(p?.isOnline ?? s.isOnline, p?.lastSeen ?? s.lastSeen);
                          return (
                            <span
                              title={online ? (isHindi ? 'ऑनलाइन' : 'Online') : (isHindi ? 'ऑफलाइन' : 'Offline')}
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#0f0f0f] ${
                                online ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                            />
                          );
                        })()}
                      </>
                    )}
                    {rowUnreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-blue-600 border border-white dark:border-[#0f0f0f] rounded-full flex items-center justify-center text-[8px] text-white font-black">
                        {rowUnreadCount}
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
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-semibold emoji-font">
                      <EmojiText text={s.lastMessage || (s.isGroup ? (isHindi ? 'ग्रुप चैट' : 'Group chat') : `@${s.username}`)} />
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

                <div
                  onClick={() => {
                    if (selectedUser.isGroup) void openGroupInfoModal();
                  }}
                  className={`flex items-center gap-3 min-w-0 flex-1 ${selectedUser.isGroup ? 'cursor-pointer group/hdr' : ''}`}
                  title={selectedUser.isGroup ? (isHindi ? 'ग्रुप जानकारी देखें' : 'Tap for group info') : undefined}
                >
                  {selectedUser.isGroup || selectedUser.isPocket ? (
                    selectedUser.isGroup && selectedUser.photoURL ? (
                      <img
                        src={selectedUser.photoURL}
                        alt={selectedUser.displayName}
                        className="h-9 w-9 shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        selectedUser.isPocket
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      }`}>
                        {selectedUser.isPocket ? <HardDrive className="h-4 w-4" /> : <UsersRound className="h-4 w-4" />}
                      </div>
                    )
                  ) : (
                    <div className="relative shrink-0">
                      <UserAvatar
                        key={selectedUser.userId}
                        uid={selectedUser.userId}
                        fallbackPhotoURL={selectedUser.photoURL}
                        fallbackDisplayName={selectedUser.displayName || selectedUser.username}
                        size="sm"
                        className="w-9 h-9"
                      />
                      {!isOfficialSocialIndiaAccount(selectedUser) && (() => {
                        const p = presenceMap[selectedUser.userId];
                        const online = isUserCurrentlyOnline(
                          p?.isOnline ?? selectedUser.isOnline,
                          p?.lastSeen ?? selectedUser.lastSeen
                        );
                        return (
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0f0f0f] ${
                              online ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                            }`}
                          />
                        );
                      })()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-xs font-black text-slate-900 dark:text-white group-hover/hdr:text-blue-600 dark:group-hover/hdr:text-blue-400 transition-colors">
                      <span className="truncate">{selectedUser.displayName}</span>
                      {selectedUser.isVerified && (
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white" title="Verified account" aria-label="Verified account">
                          <Check className="h-2.5 w-2.5 stroke-[4]" />
                        </span>
                      )}
                    </p>
                    {selectedUser.isPocket ? (
                      <p className="text-[10px] text-slate-500 truncate">
                        {isHindi ? 'आपकी निजी जगह' : 'Only you can see these messages'}
                      </p>
                    ) : selectedUser.isGroup ? (
                      <p className="text-[10px] text-slate-500 truncate">
                        {`${selectedUser.participantIds?.length || 0} ${isHindi ? 'सदस्य' : 'members'}`}
                        {selectedUser.description ? ` · ${selectedUser.description}` : ` · ${isHindi ? 'ग्रुप जानकारी के लिए टैप करें' : 'Tap for group info'}`}
                      </p>
                    ) : isOfficialSocialIndiaAccount(selectedUser) ? (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-semibold">
                        @{selectedUser.username || 'socialindia'}
                      </p>
                    ) : (() => {
                      const p = presenceMap[selectedUser.userId];
                      const status = formatWhatsAppPresence(
                        p?.isOnline ?? selectedUser.isOnline,
                        p?.lastSeen ?? selectedUser.lastSeen,
                        isHindi
                      );
                      return (
                        <p className={`text-[10px] truncate flex items-center gap-1.5 font-semibold ${
                          status.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                            status.online ? 'bg-emerald-500' : 'bg-slate-400'
                          }`} />
                          <span className="truncate">{status.label}</span>
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {selectedUser.isGroup ? (
                  <button
                    type="button"
                    onClick={() => void openGroupInfoModal()}
                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#1c1c20] hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    title={isHindi ? 'ग्रुप जानकारी और एडमिन सेटिंग्स' : 'Group Info & Settings'}
                  >
                    <Info className="h-4 w-4" />
                    <span className="hidden sm:inline">{isHindi ? 'ग्रुप जानकारी' : 'Group Info'}</span>
                  </button>
                ) : (
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
              ) : (() => {
                const hiddenCount = Math.max(0, messages.length - visibleMessageLimit);
                const displayedMessages = hiddenCount > 0 ? messages.slice(-visibleMessageLimit) : messages;
                return (
                  <>
                    {hiddenCount > 0 && (
                      <div className="flex justify-center pb-2">
                        <button
                          type="button"
                          onClick={() => setVisibleMessageLimit(prev => prev + 80)}
                          className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#202c33] text-[11px] font-bold text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-[#2a3942] hover:bg-white dark:hover:bg-[#2a3942] transition-colors cursor-pointer"
                        >
                          {isHindi ? `पुराने ${Math.min(80, hiddenCount)} संदेश लोड करें` : `Load earlier messages (${hiddenCount})`}
                        </button>
                      </div>
                    )}
                    {displayedMessages.map((m, idx) => {
                  const isMine = m.senderId === activeUid;
                  const dayLabel = formatMsgDay(m.createdAt, displayedMessages[idx - 1]?.createdAt);
                  const uploadProgressValue = Math.min(100, Math.max(0, m.uploadProgress || 0));
                  const isVideoMessage = Boolean(m.mediaUrl && m.mediaType === 'video');
                  const isStandaloneVideo = isVideoMessage && !m.text && !m.replyTo;
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
                          key={`${m.id}_${m.senderId}`}
                          uid={m.senderId}
                          fallbackPhotoURL={
                            isMine
                              ? currentUserProfile?.photoURL
                              : (!selectedUser.isGroup && m.senderId === selectedUser.userId ? selectedUser.photoURL : undefined)
                          }
                          fallbackDisplayName={
                            isMine
                              ? (currentUserProfile?.displayName || 'Me')
                              : (m.senderDisplayName || (m.senderId === selectedUser.userId ? selectedUser.displayName : 'User'))
                          }
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
                            className={
                              isStandaloneVideo
                                ? `p-0 overflow-hidden rounded-2xl bg-black shadow-sm ${isMine ? 'rounded-tr-lg' : 'rounded-tl-lg'}`
                                : `${isVideoMessage ? 'p-1' : 'p-3'} rounded-2xl text-xs font-semibold leading-relaxed shadow-xs ${
                                    isMine
                                      ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-white rounded-tr-lg'
                                      : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 border border-[#e9edef] dark:border-[#263238] rounded-tl-lg'
                                  }`
                            }
                          >
                            {m.replyTo && (
                              <div className={`mb-2 rounded-lg border-l-2 border-blue-500 bg-black/5 dark:bg-white/10 px-2 py-1.5 ${isVideoMessage ? 'mx-1 mt-1' : ''}`}>
                                <p className="text-[9px] font-black text-blue-700 dark:text-blue-300">
                                  {m.replyTo.senderId === activeUid
                                    ? (isHindi ? 'आप' : 'You')
                                    : selectedUser.displayName}
                                </p>
                                <p className="truncate text-[10px] opacity-75 emoji-font">
                                  <EmojiText text={m.replyTo.text || (m.replyTo.mediaType === 'image' ? '📷 Photo' : m.replyTo.mediaType === 'video' ? '🎥 Video' : '')} />
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
                                  referrerPolicy="no-referrer"
                                  onClick={() => m.deliveryStatus !== 'uploading' && setActiveMediaMessageId(m.id)}
                                  className="max-h-72 w-full object-cover rounded-xl cursor-pointer transition-transform group-hover:scale-102"
                                />
                                {m.deliveryStatus !== 'uploading' && (
                                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleDownloadMessageMedia(m);
                                      }}
                                      className="p-1.5 bg-black/65 hover:bg-black/85 text-white rounded-lg backdrop-blur-xs cursor-pointer"
                                      title={isHindi ? 'डाउनलोड करें' : 'Download'}
                                      aria-label={isHindi ? 'डाउनलोड करें' : 'Download'}
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMediaMessageId(m.id);
                                      }}
                                      className="p-1.5 bg-black/65 hover:bg-black/85 text-white rounded-lg backdrop-blur-xs cursor-pointer"
                                      title={isHindi ? 'फ़ुलस्क्रीन देखें' : 'View Fullscreen'}
                                      aria-label={isHindi ? 'फ़ुलस्क्रीन देखें' : 'View Fullscreen'}
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
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

                            {/* Media content: Video (WhatsApp-style tap-to-play video only) */}
                            {m.mediaUrl && m.mediaType === 'video' && (
                              <div
                                className={`relative group overflow-hidden bg-black cursor-pointer ${
                                  isStandaloneVideo ? 'rounded-2xl' : 'mb-1.5 rounded-xl'
                                }`}
                                onClick={() => m.deliveryStatus !== 'uploading' && setActiveMediaMessageId(m.id)}
                              >
                                <video
                                  src={m.mediaUrl.startsWith('http') && !m.mediaUrl.includes('#') ? `${m.mediaUrl}#t=0.1` : m.mediaUrl}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="max-h-72 w-full bg-black object-cover pointer-events-none block"
                                />
                                {m.deliveryStatus !== 'uploading' && (
                                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/15 transition-colors flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-xs flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
                                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                                    </div>
                                  </div>
                                )}
                                {isStandaloneVideo && (
                                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-2.5 pb-1.5 pt-6 text-[10px] leading-none text-white/95 select-none">
                                    {m.editedAt && (
                                      <span
                                        className="italic font-medium opacity-85"
                                        title={formatMsgTime(String(m.editedAt))}
                                      >
                                        {isHindi ? 'संशोधित' : 'edited'}
                                      </span>
                                    )}
                                    <span className="font-semibold drop-shadow-xs">{formatMsgTime(m.createdAt)}</span>
                                    {isMine && (
                                      m.deliveryStatus ? (
                                        <Loader2 className="inline h-2.5 w-2.5 animate-spin" />
                                      ) : (
                                        <span className={m.read && !isGroup && !isPocket ? 'text-[#53bdeb] font-extrabold' : 'font-bold text-white/95'}>
                                          {m.read && !isGroup && !isPocket ? '✓✓' : '✓'}
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}
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

                            {/* Text message with WhatsApp-style clickable links */}
                            {m.text && (() => {
                              const detectedUrls = extractUrlsFromText(m.text);
                              const primaryLink = detectedUrls[0];
                              return (
                                <div className={isVideoMessage ? 'px-2 pt-0.5' : ''}>
                                  <p className="break-words whitespace-pre-wrap emoji-font select-text">
                                    <ChatMessageText text={m.text} isMine={isMine} />
                                  </p>
                                  {primaryLink && (
                                    <a
                                      href={primaryLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className={`mt-2 flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 border transition-colors cursor-pointer ${
                                        isMine
                                          ? 'bg-black/5 dark:bg-black/25 border-emerald-700/15 dark:border-white/15 hover:bg-black/10 dark:hover:bg-black/35'
                                          : 'bg-slate-50 dark:bg-[#182229] border-slate-200 dark:border-[#2a3942] hover:bg-slate-100 dark:hover:bg-[#1f2c34]'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-[#027eb5]/12 dark:bg-[#53bdeb]/15 text-[#027eb5] dark:text-[#53bdeb] flex items-center justify-center shrink-0">
                                          <Globe className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-bold truncate">
                                            {formatLinkHost(primaryLink)}
                                          </p>
                                          <p className="text-[10px] text-[#027eb5] dark:text-[#53bdeb] truncate">
                                            {primaryLink}
                                          </p>
                                        </div>
                                      </div>
                                      <ExternalLink className="w-3.5 h-3.5 text-[#027eb5] dark:text-[#53bdeb] shrink-0" />
                                    </a>
                                  )}
                                </div>
                              );
                            })()}

                            {/* WhatsApp-style bottom-right bubble metadata: Edited label + Time + Ticks */}
                            {!isStandaloneVideo && (
                              <div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] leading-none select-none ${
                                isVideoMessage ? 'px-2 pb-1' : ''
                              } ${
                                isMine
                                  ? 'text-[#55666e] dark:text-[#a6c8bf]'
                                  : 'text-slate-400 dark:text-slate-400'
                              }`}>
                                {m.editedAt && (
                                  <span
                                    className="italic font-medium opacity-85"
                                    title={formatMsgTime(String(m.editedAt))}
                                  >
                                    {isHindi ? 'संशोधित' : 'edited'}
                                  </span>
                                )}
                                <span className="font-semibold">{formatMsgTime(m.createdAt)}</span>
                                {isMine && (
                                  m.deliveryStatus ? (
                                    <Loader2 className="inline h-2.5 w-2.5 animate-spin" />
                                  ) : (
                                    <span className={m.read && !isGroup && !isPocket ? 'text-[#2563eb] dark:text-[#53bdeb] font-extrabold' : 'font-bold'}>
                                      {m.read && !isGroup && !isPocket ? '✓✓' : '✓'}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                          </div>

                          {!m.id.startsWith('temp_') && (
                            <div className={`flex items-center ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <button
                                type="button"
                                onClick={() => setMessageActionId(current => current === m.id ? null : m.id)}
                                className="inline-flex h-5 w-6 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                                aria-label={isHindi ? 'संदेश विकल्प' : 'Message options'}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
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
                              {m.mediaUrl && (m.mediaType === 'image' || m.mediaType === 'video') && (
                                <button
                                  type="button"
                                  onClick={() => void handleDownloadMessageMedia(m)}
                                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-white/10"
                                >
                                  <Download className="h-3.5 w-3.5" /> {isHindi ? 'डाउनलोड' : 'Download'}
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
                })}
                  </>
                );
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Input message form bar */}
            <div className="p-3 sm:p-4 bg-white dark:bg-[#0f0f0f] border-t border-slate-200 dark:border-[#222] shrink-0 relative">
              
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <Suspense fallback={null}>
                  <EmojiPicker
                    onSelectEmoji={handleInsertEmoji}
                    onClose={() => setShowEmojiPicker(false)}
                    toggleButtonRef={emojiButtonRef}
                  />
                </Suspense>
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
                        : `${isHindi ? 'जवाब' : 'Replying to'} ${replyTo?.senderId === activeUid ? (isHindi ? 'आप' : 'yourself') : selectedUser.displayName}`}
                    </p>
                    <p className="truncate text-[11px] text-slate-600 dark:text-slate-300 emoji-font">
                      <EmojiText
                        text={editingMessageId
                          ? messageText
                          : (replyTo?.text || (replyTo?.mediaType === 'image' ? '📷 Photo' : replyTo?.mediaType === 'video' ? '🎥 Video' : ''))}
                      />
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

              {/* Add Link Quick Bar (WhatsApp style) */}
              {showLinkInput && (
                <div className="mb-2.5 p-2.5 bg-slate-50 dark:bg-[#1a1a1e] rounded-2xl border border-slate-200 dark:border-[#2a2a2e] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#027eb5] dark:text-[#53bdeb] shrink-0 ml-1" />
                    <input
                      type="text"
                      value={chatLinkInput}
                      onChange={(e) => {
                        setChatLinkInput(e.target.value);
                        if (chatLinkError) setChatLinkError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleInsertChatLink();
                        }
                      }}
                      placeholder={isHindi ? 'https://example.com या कोई भी लिंक पेस्ट करें' : 'Paste or type a URL (e.g. https://example.com)'}
                      className="flex-1 min-w-0 bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#2f3136] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleInsertChatLink}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      {isHindi ? 'जोड़ें' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLinkInput(false);
                        setChatLinkInput('');
                        setChatLinkError(null);
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-200/70 dark:hover:bg-[#252528] cursor-pointer shrink-0"
                      aria-label={isHindi ? 'बंद करें' : 'Close'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {chatLinkError && (
                    <p className="text-[10px] font-bold text-rose-500 px-1">{chatLinkError}</p>
                  )}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
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

                {/* Add Link Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkInput(prev => !prev);
                    setShowEmojiPicker(false);
                    setChatLinkError(null);
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                    showLinkInput
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-900'
                      : 'hover:bg-slate-100 dark:hover:bg-[#1e1e1e] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title={isHindi ? 'लिंक जोड़ें' : 'Add Link'}
                  aria-label={isHindi ? 'लिंक जोड़ें' : 'Add Link'}
                >
                  <Link2 className="w-4 h-4" />
                </button>

                {/* Emoji Button */}
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(prev => !prev);
                    setShowLinkInput(false);
                  }}
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
                  className="flex-1 min-w-0 px-4 py-3 bg-[#efefef] dark:bg-[#202124] border-0 rounded-full text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-slate-500 dark:placeholder-slate-400 emoji-font"
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
              {groupError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  {groupError}
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  ref={createGroupAvatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f || !f.type.startsWith('image/')) return;
                    if (groupAvatarPreview?.startsWith('blob:')) URL.revokeObjectURL(groupAvatarPreview);
                    setGroupAvatarFile(f);
                    setGroupAvatarPreview(URL.createObjectURL(f));
                  }}
                />
                <button
                  type="button"
                  onClick={() => createGroupAvatarInputRef.current?.click()}
                  className="relative h-12 w-12 shrink-0 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-dashed border-blue-300 dark:border-blue-800 flex items-center justify-center overflow-hidden text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                  title={isHindi ? 'ग्रुप अवतार चुनें (वैकल्पिक)' : 'Set group avatar (optional)'}
                >
                  {groupAvatarPreview ? (
                    <img src={groupAvatarPreview} alt="Group avatar preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1 space-y-2 min-w-0">
                  <input
                    value={groupName}
                    onChange={event => {
                      setGroupName(event.target.value);
                      if (groupError) setGroupError(null);
                    }}
                    maxLength={80}
                    placeholder={isHindi ? 'ग्रुप का नाम' : 'Group name'}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1216] dark:text-white"
                  />
                  <input
                    value={groupDescription}
                    onChange={event => setGroupDescription(event.target.value)}
                    maxLength={300}
                    placeholder={isHindi ? 'ग्रुप विवरण (वैकल्पिक)' : 'Group description (optional)'}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1216] dark:text-white"
                  />
                </div>
              </div>
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
                {(() => {
                  const trimmedQuery = groupSearch.trim().toLowerCase().replace(/^@/, '');
                  const listToShow = trimmedQuery.length >= 2
                    ? groupResults
                    : trimmedQuery.length === 1
                      ? suggestedGroupContacts.filter(u =>
                          (u.displayName || '').toLowerCase().includes(trimmedQuery) ||
                          (u.username || '').toLowerCase().includes(trimmedQuery)
                        )
                      : suggestedGroupContacts;

                  if (loadingGroupContacts && listToShow.length === 0) {
                    return (
                      <p className="p-4 text-center text-[11px] text-slate-500">
                        {isHindi ? 'सदस्य लोड हो रहे हैं...' : 'Loading people...'}
                      </p>
                    );
                  }
                  if (listToShow.length === 0) {
                    return (
                      <p className="p-4 text-center text-[11px] text-slate-500">
                        {isHindi ? 'कोई यूज़र नहीं मिला।' : 'No people found.'}
                      </p>
                    );
                  }
                  return listToShow.map(member => {
                    const isSelected = selectedGroupMembers.some(item => item.uid === member.uid);
                    return (
                      <button
                        key={member.uid}
                        type="button"
                        onClick={() => toggleGroupMember(member)}
                        className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <UserAvatar
                          key={member.uid}
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
                  });
                })()}
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setGroupError(null);
                  setShowCreateGroup(false);
                }}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void handleCreateGroup()}
                disabled={isCreatingGroup}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isCreatingGroup && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isHindi ? 'ग्रुप बनाएं' : 'Create group'}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* WhatsApp-style Group Info, Admin Controls & Leave Group Modal */}
      {showGroupInfoModal && selectedUser?.isGroup && (
        <div
          className="fixed inset-0 z-[125] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setShowGroupInfoModal(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-info-modal-title"
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#15191e]"
            onClick={event => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <UsersRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 id="group-info-modal-title" className="text-sm font-black text-slate-900 dark:text-white">
                  {isHindi ? 'ग्रुप जानकारी' : 'Group Info'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupInfoModal(false)}
                className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                aria-label={isHindi ? 'बंद करें' : 'Close'}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {groupInfoError && (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{groupInfoError}</span>
                </div>
              )}
              {groupInfoNotice && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{groupInfoNotice}</span>
                </div>
              )}

              {/* Group Avatar + Name + Description Card */}
              <div className="flex flex-col items-center text-center space-y-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101418] p-5">
                <div className="relative">
                  <input
                    ref={editGroupAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => void handleGroupAvatarChange(e)}
                  />
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center ring-4 ring-white dark:ring-[#15191e] shadow-md">
                    {uploadingGroupAvatar ? (
                      <Loader2 className="h-7 w-7 animate-spin" />
                    ) : selectedUser.photoURL ? (
                      <img
                        src={selectedUser.photoURL}
                        alt={selectedUser.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UsersRound className="h-10 w-10" />
                    )}
                  </div>
                  {isCurrentUserGroupAdmin && (
                    <button
                      type="button"
                      disabled={uploadingGroupAvatar}
                      onClick={() => editGroupAvatarInputRef.current?.click()}
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#15191e] cursor-pointer disabled:opacity-50"
                      title={isHindi ? 'ग्रुप अवतार बदलें' : 'Change group avatar'}
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {isCurrentUserGroupAdmin && selectedUser.photoURL && !uploadingGroupAvatar && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveGroupAvatar()}
                    className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    {isHindi ? 'अवतार हटाएं' : 'Remove avatar'}
                  </button>
                )}

                {!editingGroupInfo ? (
                  <div className="w-full space-y-1.5">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white break-words">
                        {selectedUser.displayName}
                      </h3>
                      {isCurrentUserGroupAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditGroupNameInput(selectedUser.displayName || '');
                            setEditGroupDescInput(selectedUser.description || '');
                            setEditingGroupInfo(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                          title={isHindi ? 'नाम और विवरण बदलें' : 'Edit name & description'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 break-words max-w-sm mx-auto">
                      {selectedUser.description
                        ? selectedUser.description
                        : (isCurrentUserGroupAdmin
                            ? (isHindi ? 'ग्रुप विवरण जोड़ने के लिए एडिट बटन दबाएं' : 'Tap edit to add a group description')
                            : (isHindi ? 'कोई ग्रुप विवरण नहीं' : 'No group description'))}
                    </p>
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {isHindi ? 'ग्रुप' : 'Group'} · {groupMembersDetails.length || selectedUser.participantIds?.length || 0} {isHindi ? 'सदस्य' : 'members'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={e => void handleSaveGroupDetails(e)} className="w-full space-y-2.5 text-left">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        {isHindi ? 'ग्रुप का नाम' : 'Group Name'}
                      </label>
                      <input
                        value={editGroupNameInput}
                        onChange={e => setEditGroupNameInput(e.target.value)}
                        maxLength={80}
                        required
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15191e] px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        {isHindi ? 'ग्रुप विवरण' : 'Group Description'}
                      </label>
                      <textarea
                        value={editGroupDescInput}
                        onChange={e => setEditGroupDescInput(e.target.value)}
                        maxLength={300}
                        rows={2}
                        placeholder={isHindi ? 'ग्रुप के बारे में लिखें...' : 'Write about this group...'}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15191e] px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingGroupInfo(false)}
                        className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 cursor-pointer"
                      >
                        {isHindi ? 'रद्द करें' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={savingGroupInfo}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-black text-white disabled:opacity-50 cursor-pointer"
                      >
                        {savingGroupInfo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {isHindi ? 'सेव करें' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Members Header + Add Members button for Admins */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {groupMembersDetails.length || selectedUser.participantIds?.length || 0} {isHindi ? 'सदस्य' : 'Participants'}
                  </h4>
                  {isCurrentUserGroupAdmin && (
                    <button
                      type="button"
                      onClick={() => void handleOpenAddMembers()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-[11px] font-black text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>{isHindi ? 'सदस्य जोड़ें' : 'Add members'}</span>
                    </button>
                  )}
                </div>

                {/* Add Members Picker */}
                {showAddMembersPicker && isCurrentUserGroupAdmin && (
                  <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-blue-700 dark:text-blue-300">
                        {isHindi ? 'ग्रुप में जोड़ने के लिए यूज़र चुनें' : 'Select users to add to group'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddMembersPicker(false)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                      >
                        {isHindi ? 'बंद करें' : 'Close'}
                      </button>
                    </div>
                    <input
                      value={addMemberSearch}
                      onChange={e => setAddMemberSearch(e.target.value)}
                      placeholder={isHindi ? 'नाम या @यूज़रनेम खोजें...' : 'Search by name or @username...'}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#15191e] px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                    <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#15191e]">
                      {loadingAddPool ? (
                        <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{isHindi ? 'लोड हो रहा है...' : 'Loading users...'}</span>
                        </div>
                      ) : (() => {
                        const q = addMemberSearch.trim().toLowerCase().replace(/^@/, '');
                        const pool = q
                          ? addMemberPool.filter(u =>
                              (u.displayName || '').toLowerCase().includes(q) ||
                              (u.username || '').toLowerCase().includes(q)
                            )
                          : addMemberPool;
                        if (pool.length === 0) {
                          return (
                            <p className="p-4 text-center text-[11px] text-slate-400">
                              {isHindi ? 'जोड़ने के लिए कोई अन्य यूज़र नहीं मिला।' : 'No more users found to add.'}
                            </p>
                          );
                        }
                        return pool.slice(0, 30).map(u => {
                          const checked = selectedNewMemberIds.includes(u.uid);
                          return (
                            <button
                              key={u.uid}
                              type="button"
                              onClick={() =>
                                setSelectedNewMemberIds(prev =>
                                  prev.includes(u.uid) ? prev.filter(id => id !== u.uid) : [...prev, u.uid]
                                )
                              }
                              className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                            >
                              <UserAvatar
                                uid={u.uid}
                                fallbackPhotoURL={u.photoURL}
                                fallbackDisplayName={u.displayName || u.username}
                                size="xs"
                                className="h-8 w-8"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{u.displayName || u.username}</p>
                                <p className="truncate text-[10px] text-slate-500">@{u.username}</p>
                              </div>
                              <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black ${
                                checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-600'
                              }`}>
                                ✓
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                    {selectedNewMemberIds.length > 0 && (
                      <button
                        type="button"
                        disabled={addingMembers}
                        onClick={() => void handleConfirmAddMembers()}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {addingMembers && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>
                          {isHindi
                            ? `${selectedNewMemberIds.length} सदस्य जोड़ें`
                            : `Add ${selectedNewMemberIds.length} member${selectedNewMemberIds.length > 1 ? 's' : ''}`}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Member List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  {loadingGroupInfo && groupMembersDetails.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span>{isHindi ? 'सदस्य लोड हो रहे हैं...' : 'Loading members...'}</span>
                    </div>
                  ) : (
                    groupMembersDetails.map(member => {
                      const isSelf = member.uid === activeUid;
                      const isCreator = selectedUser.createdBy === member.uid;
                      const isMemberAdmin = isCreator || Boolean(selectedUser.adminIds?.includes(member.uid));
                      const isBusy = memberActionUid === member.uid;

                      return (
                        <div
                          key={member.uid}
                          className="p-3 bg-white dark:bg-[#15191e] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              uid={member.uid}
                              fallbackPhotoURL={member.photoURL}
                              fallbackDisplayName={member.displayName || member.username}
                              size="sm"
                              className="h-9 w-9 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {member.displayName || member.username}
                                  {isSelf ? (isHindi ? ' (आप)' : ' (You)') : ''}
                                </p>
                                {isCreator && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase">
                                    {isHindi ? 'निर्माता' : 'Creator'}
                                  </span>
                                )}
                                {isMemberAdmin && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase">
                                    <Shield className="h-2.5 w-2.5" />
                                    {isHindi ? 'एडमिन' : 'Admin'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">@{member.username}</p>
                            </div>
                          </div>

                          {isCurrentUserGroupAdmin && !isSelf && (
                            <div className="flex items-center gap-1.5 flex-wrap shrink-0 pl-12 sm:pl-0">
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleGroupMemberAdmin(member.uid, !isMemberAdmin)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    title={isMemberAdmin ? 'Dismiss as Admin' : 'Make Admin'}
                                  >
                                    {isMemberAdmin
                                      ? (isHindi ? 'एडमिन हटाएं' : 'Dismiss Admin')
                                      : (isHindi ? 'एडमिन बनाएं' : 'Make Admin')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleTransferGroupAdmin(member.uid)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 cursor-pointer"
                                    title={isHindi ? 'अपना एडमिन अधिकार इन्हें दें' : 'Transfer admin to this member'}
                                  >
                                    {isHindi ? 'एडमिन दें' : 'Transfer Admin'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleRemoveGroupMember(member.uid)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/70 cursor-pointer"
                                    title={isHindi ? 'ग्रुप से हटाएं' : 'Remove from group'}
                                  >
                                    <UserMinus className="h-3 w-3" />
                                    <span>{isHindi ? 'हटाएं' : 'Remove'}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* WhatsApp-style Leave Group Action */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {!confirmLeaveGroup ? (
                  <button
                    type="button"
                    onClick={() => setConfirmLeaveGroup(true)}
                    className="w-full py-3 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isHindi ? 'ग्रुप छोड़ें (Leave Group)' : 'Leave Group'}</span>
                  </button>
                ) : (
                  <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3.5 space-y-2.5">
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-300 text-center">
                      {isHindi
                        ? `क्या आप "${selectedUser.displayName}" ग्रुप छोड़ना चाहते हैं?`
                        : `Leave "${selectedUser.displayName}" group?`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={leavingGroup}
                        onClick={() => setConfirmLeaveGroup(false)}
                        className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        {isHindi ? 'रद्द करें' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        disabled={leavingGroup}
                        onClick={() => void handleLeaveGroup()}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {leavingGroup && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>{isHindi ? 'हाँ, छोड़ें' : 'Leave'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* WhatsApp-style Fullscreen Image Viewer & Custom Video Player */}
      {activeMediaMessageId && chatMediaItems.length > 0 && (
        <ChatMediaLightbox
          items={chatMediaItems}
          initialMessageId={activeMediaMessageId}
          isHindi={isHindi}
          onClose={() => setActiveMediaMessageId(null)}
          onReplyMessage={(msgId) => {
            const target = messages.find((item) => item.id === msgId);
            if (target) handleReplyToMessage(target);
          }}
          onToast={addToast}
        />
      )}

    </div>
  );
};
