import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { adminService } from '../services/adminService';
import { feedbackService, FeedbackEntry } from '../services/feedbackService';
import { User, Video, Report, TrashItem, SoundTrack, VideoPurchase, WithdrawalRequest } from '../types';
import { trashService } from '../services/trashService';
import { soundService } from '../services/soundService';
import { userService } from '../services/userService';
import { paidVideoService } from '../services/paidVideoService';
import { payoutService } from '../services/payoutService';
import { isUserVerified, isUserCurrentlyOnline, formatWhatsAppPresence } from '../utils/userUtils';
import { 
  Users, 
  Wallet, 
  DollarSign,
  Gift,
  Video as VideoIcon, 
  AlertTriangle, 
  LayoutDashboard, 
  Search, 
  CheckCircle, 
  XCircle, 
  MoreVertical,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  UserX,
  EyeOff,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Cloud,
  Database,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Key,
  Folder,
  Server,
  HelpCircle,
  Info,
  Loader2,
  Archive,
  RotateCcw,
  History,
  Calendar,
  FileText,
  Layers,
  Film,
  Zap,
  Check,
  Clock,
  Wrench,
  Megaphone,
  Activity,
  Radio,
  Sliders,
  CheckSquare,
  Music,
  Play,
  Pause,
  Plus,
  X,
  Palette,
  ArrowLeft,
  BookOpen,
  FolderTree,
  Globe,
  Smartphone,
  Map as MapIcon,
  Subtitles
} from 'lucide-react';
import { formatViews, formatTimeAgo, getInitials, parseDateMs, formatShortDate } from '../utils/videoUtils';
import { AdminExtraTabs } from '../components/AdminExtraTabs';
import { AdminQuickTools } from '../components/AdminQuickTools';
import { CaptionEditorModal } from '../components/CaptionEditorModal';
import { FirebaseVideoEditor } from '../components/admin/FirebaseVideoEditor';
import { verificationService } from '../services/verificationService';
import { VerificationRequest, NewsletterCampaign } from '../types';
import { notificationService } from '../services/notificationService';
import { videoService } from '../services/videoService';
import { GrievanceManagement } from '../components/admin/GrievanceManagement';
import { Mail, Send, Bell } from 'lucide-react';

type AdminSection = 
  | 'dashboard' 
  | 'users' 
  | 'videos' 
  | 'firebase_edit'
  | 'paid_videos'
  | 'withdrawals'
  | 'verification_requests'
  | 'newsletter'
  | 'reports' 
  | 'grievances'
  | 'help_requests'
  | 'feedback' 
  | 'storage' 
  | 'trash' 
  | 'tools' 
  | 'sounds' 
  | 'advertising' 
  | 'pro_members'
  | 'settings'
  | 'payments_ads'
  | 'languages'
  | 'movies'
  | 'articles'
  | 'categories'
  | 'design'
  | 'pages'
  | 'sitemap'
  | 'mobile_api'
  | 'backup'
  | 'system_status'
  | 'changelogs'
  | 'faq_docs';

const readImagePreview = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string'
    ? resolve(reader.result)
    : reject(new Error('Could not read the selected image.'));
  reader.onerror = () => reject(reader.error || new Error('Could not read the selected image.'));
  reader.readAsDataURL(file);
});

const safeFiniteDuration = (val: unknown): number => {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 && num < 864000 ? Math.round(num) : 0;
};

const isExternalEmbedUrl = (url?: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('drive.google.com') ||
    lower.includes('docs.google.com') ||
    lower.includes('vimeo.com') ||
    lower.includes('ytimg.com') ||
    lower.includes('googleusercontent.com') ||
    lower.includes('unsplash.com')
  );
};

const isPlatformHostedMediaUrl = (url?: string): boolean => {
  if (!url || isExternalEmbedUrl(url)) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('res.cloudinary.com') ||
    lower.includes('firebasestorage.googleapis.com') ||
    lower.includes('storage.googleapis.com') ||
    /\.(mp4|webm|mov|m4v|jpg|jpeg|png|webp)(\?|#|$)/i.test(lower)
  );
};

const formatStorageBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) {
    return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const probeMediaContentLength = async (url: string): Promise<number | null> => {
  if (!url || !isPlatformHostedMediaUrl(url)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (!res.ok) return null;
    const rawLen = res.headers.get('content-length');
    if (rawLen) {
      const parsed = Number(rawLen);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

let persistentAdminSnapshot: {
  users: User[];
  videos: Video[];
  reports: Report[];
  feedback: FeedbackEntry[];
  trashItems: TrashItem[];
  sounds: SoundTrack[];
  adCampaigns: any[];
  withdrawalRequests: WithdrawalRequest[];
  verificationRequests: VerificationRequest[];
  cloudName: string;
  uploadPreset: string;
  storageUpdatedAt?: string;
} | null = null;

export const AdminPanel: React.FC = () => {
  const { currentUser, currentUserProfile, addToast, refreshProfile } = useApp();
  const { navigate } = useRouter();

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const adminMainRef = React.useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(!persistentAdminSnapshot);
  const [users, setUsers] = useState<User[]>(() => persistentAdminSnapshot?.users || []);
  const [videos, setVideos] = useState<Video[]>(() => persistentAdminSnapshot?.videos || []);
  const [reports, setReports] = useState<Report[]>(() => persistentAdminSnapshot?.reports || []);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>(() => persistentAdminSnapshot?.feedback || []);
  const [previewFeedbackImage, setPreviewFeedbackImage] = useState<string | null>(null);
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => persistentAdminSnapshot?.trashItems || []);
  const [adCampaigns, setAdCampaigns] = useState<any[]>(() => persistentAdminSnapshot?.adCampaigns || []);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>(() => persistentAdminSnapshot?.withdrawalRequests || []);
  const [isProcessingPayoutId, setIsProcessingPayoutId] = useState<string | null>(null);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');

  // Verification Requests States
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>(() => persistentAdminSnapshot?.verificationRequests || []);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [verificationSearch, setVerificationSearch] = useState('');
  const [isProcessingVerificationId, setIsProcessingVerificationId] = useState<string | null>(null);
  const [rejectModalRequest, setRejectModalRequest] = useState<VerificationRequest | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [captionEditorVideo, setCaptionEditorVideo] = useState<Video | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Trash & Compliance Vault States
  const [selectedTrashDetail, setSelectedTrashDetail] = useState<TrashItem | null>(null);
  const [trashSubFilter, setTrashSubFilter] = useState<'all' | 'video' | 'short' | 'user'>('all');
  const [isRestoringTrashId, setIsRestoringTrashId] = useState<string | null>(null);
  const [isPurgingTrashId, setIsPurgingTrashId] = useState<string | null>(null);

  // Global Cloud Storage Settings State
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');
  const [storageUpdatedAt, setStorageUpdatedAt] = useState<string | undefined>();
  const [isSavingStorage, setIsSavingStorage] = useState(false);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [storageTestStatus, setStorageTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [storageTestMessage, setStorageTestMessage] = useState('');
  const [probedMediaBytes, setProbedMediaBytes] = useState<Record<string, number>>({});
  const [isProbingStorage, setIsProbingStorage] = useState(false);
  const [storageProbeNonce, setStorageProbeNonce] = useState(0);

  // Sound Library Management States
  const [sounds, setSounds] = useState<SoundTrack[]>([]);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');
  const [newSongCoverUrl, setNewSongCoverUrl] = useState('');
  const [newSongCoverFile, setNewSongCoverFile] = useState<File | null>(null);
  const [newSongCoverPreview, setNewSongCoverPreview] = useState('');
  const [newSongAudioUrl, setNewSongAudioUrl] = useState('');
  const [newSongCategory, setNewSongCategory] = useState('Punjabi & Bollywood');
  const [isAddingSong, setIsAddingSong] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefRef = React.useRef<HTMLAudioElement | null>(null);

  // Admin Wallet Credit Modal state
  const [walletModalUser, setWalletModalUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(10);
  const [isCrediting, setIsCrediting] = useState(false);

  // Admin Bonus Money Modal state
  const [bonusModalUser, setBonusModalUser] = useState<User | null>(null);
  const [bonusAmount, setBonusAmount] = useState<number>(50);
  const [bonusCreditTarget, setBonusCreditTarget] = useState<'bonus' | 'wallet'>('bonus');
  const [bonusReason, setBonusReason] = useState<string>('Admin Promotion Bonus');
  const [isAddingBonus, setIsAddingBonus] = useState(false);

  // Paid Videos oversight state
  const [paidVideosList, setPaidVideosList] = useState<Video[]>([]);
  const [purchasesList, setPurchasesList] = useState<VideoPurchase[]>([]);
  const [loadingPaidVideos, setLoadingPaidVideos] = useState(false);

  // In-app Payout Modal state (prevents iframe popup blocking!)
  const [payoutModalState, setPayoutModalState] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject';
    request: WithdrawalRequest | null;
    notes: string;
  }>({
    isOpen: false,
    type: 'approve',
    request: null,
    notes: ''
  });

  // Sound Track Edit Modal state
  const [editingSound, setEditingSound] = useState<SoundTrack | null>(null);
  const [editingSoundCoverFile, setEditingSoundCoverFile] = useState<File | null>(null);
  const [editingSoundCoverPreview, setEditingSoundCoverPreview] = useState('');
  const [isUpdatingSound, setIsUpdatingSound] = useState(false);
  const [reportMessages, setReportMessages] = useState<Record<string, string>>({});
  const [sendingReportUpdateId, setSendingReportUpdateId] = useState<string | null>(null);
  const [feedbackReplies, setFeedbackReplies] = useState<Record<string, string>>({});
  const [sendingFeedbackReplyId, setSendingFeedbackReplyId] = useState<string | null>(null);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'help' | 'feedback' | 'pending'>('all');

  // Newsletter Tool State
  const [newsletterTitle, setNewsletterTitle] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);
  const [isBackfillingNewsletter, setIsBackfillingNewsletter] = useState(false);
  const [newsletterCampaigns, setNewsletterCampaigns] = useState<NewsletterCampaign[]>([]);
  const [newsletterResultMsg, setNewsletterResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dashboard Online / Offline Users Presence State
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [presenceSearch, setPresenceSearch] = useState('');
  const [presenceTick, setPresenceTick] = useState(0);

  // Security Check: Only admins allowed
  useEffect(() => {
    if (currentUser && currentUserProfile && currentUserProfile.role !== 'admin') {
      addToast('Unauthorized access. Admins only.', 'error');
      navigate('home');
    }
  }, [currentUser, currentUserProfile]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentUserProfile?.role !== 'admin') return;
    const unsubscribe = adminService.subscribeAllUsers((liveUsers) => {
      setUsers(liveUsers);
      if (persistentAdminSnapshot) {
        persistentAdminSnapshot.users = liveUsers;
      }
    });
    const timer = window.setInterval(() => {
      setPresenceTick((prev) => prev + 1);
    }, 30_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [currentUserProfile?.role]);

  useEffect(() => {
    adminMainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'storage' || videos.length === 0) return;
    let cancelled = false;
    const urlsToProbe = new Set<string>();
    videos.forEach(v => {
      if (
        v.videoUrl &&
        !(typeof v.fileSizeBytes === 'number' && Number.isFinite(v.fileSizeBytes) && v.fileSizeBytes > 0) &&
        isPlatformHostedMediaUrl(v.videoUrl) &&
        probedMediaBytes[v.videoUrl] === undefined
      ) {
        urlsToProbe.add(v.videoUrl);
      }
      if (
        v.thumbnailUrl &&
        isPlatformHostedMediaUrl(v.thumbnailUrl) &&
        probedMediaBytes[v.thumbnailUrl] === undefined
      ) {
        urlsToProbe.add(v.thumbnailUrl);
      }
    });

    if (urlsToProbe.size === 0) return;

    const queue = Array.from(urlsToProbe);
    setIsProbingStorage(true);

    const runProbes = async () => {
      const results: Record<string, number> = {};
      const CONCURRENCY = 5;
      let cursor = 0;
      const worker = async () => {
        while (!cancelled && cursor < queue.length) {
          const idx = cursor++;
          const url = queue[idx];
          const bytes = await probeMediaContentLength(url);
          if (bytes !== null && bytes > 0) {
            results[url] = bytes;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()));
      if (!cancelled && Object.keys(results).length > 0) {
        setProbedMediaBytes(prev => ({ ...prev, ...results }));
      }
      if (!cancelled) {
        setIsProbingStorage(false);
      }
    };

    void runProbes();
    return () => {
      cancelled = true;
    };
  }, [activeSection, videos, storageProbeNonce]);

  const loadData = async () => {
    if (!persistentAdminSnapshot) {
      setLoading(true);
    }
    try {
      const loadResource = <T,>(
        resource: Promise<T>,
        update: (value: T) => void,
        previous: T,
        label: string
      ): Promise<T> => resource.then(value => {
        update(value);
        return value;
      }).catch(error => {
        console.error(`Failed to load admin ${label}:`, error);
        return previous;
      });

      const usersPromise = loadResource<User[]>(adminService.getAllUsers(), setUsers, users, 'users');
      const videosPromise = loadResource<Video[]>(adminService.getAllVideos(), setVideos, videos, 'videos');
      const reportsPromise = loadResource<Report[]>(adminService.getAllReports(), setReports, reports, 'reports');
      const coreDataPromise = Promise.all([usersPromise, videosPromise, reportsPromise]);

      const secondaryDataPromise = Promise.all([
        loadResource<WithdrawalRequest[]>(
          payoutService.getWithdrawalRequests(),
          setWithdrawalRequests,
          withdrawalRequests,
          'payout requests'
        ),
        loadResource<VerificationRequest[]>(
          verificationService.getAllVerificationRequests(),
          value => setVerificationRequests(value || []),
          verificationRequests,
          'verification requests'
        ),
        loadResource<FeedbackEntry[]>(feedbackService.getAllFeedback(), setFeedback, feedback, 'feedback'),
        loadResource<{ cloudName: string; uploadPreset: string; updatedAt?: string }>(
          adminService.getStorageConfig(),
          value => {
            setCloudName(value.cloudName || '');
            setUploadPreset(value.uploadPreset || '');
            setStorageUpdatedAt(value.updatedAt);
          },
          { cloudName, uploadPreset, updatedAt: storageUpdatedAt },
          'storage settings'
        ),
        loadResource<TrashItem[]>(trashService.getAllTrash(), setTrashItems, trashItems, 'trash'),
        loadResource<SoundTrack[]>(soundService.getSounds(), setSounds, sounds, 'sounds'),
        loadResource<any[]>(adminService.getAllAdCampaigns(), setAdCampaigns, adCampaigns, 'ad campaigns')
      ]);

      await Promise.race([usersPromise, videosPromise, reportsPromise]);
      setLoading(false);

      const [nextUsers, nextVideos, nextReports] = await coreDataPromise;
      const [nextPayouts, nextVReqs, nextFeedback, nextStorage, nextTrash, nextSounds, nextAds] = await secondaryDataPromise;

      persistentAdminSnapshot = {
        users: nextUsers,
        videos: nextVideos,
        reports: nextReports,
        feedback: nextFeedback,
        trashItems: nextTrash,
        sounds: nextSounds,
        adCampaigns: nextAds,
        withdrawalRequests: nextPayouts,
        verificationRequests: nextVReqs,
        cloudName: nextStorage.cloudName || '',
        uploadPreset: nextStorage.uploadPreset || '',
        storageUpdatedAt: nextStorage.updatedAt
      };
    } catch (err) {
      if (!persistentAdminSnapshot) {
        addToast('Failed to load administrative data.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Approve Verification Request & Grant Blue Tick
  const handleApproveVerification = async (req: VerificationRequest) => {
    setIsProcessingVerificationId(req.id);
    try {
      await verificationService.approveVerificationRequest(req, currentUser?.uid);
      addToast(`Approved verification for @${req.username} & granted Blue Tick badge!`, 'success');
      const [updatedReqs, updatedUsers] = await Promise.all([
        verificationService.getAllVerificationRequests(),
        adminService.getAllUsers()
      ]);
      setVerificationRequests(updatedReqs);
      setUsers(updatedUsers);
    } catch (err) {
      console.error(err);
      addToast('Failed to approve verification request.', 'error');
    } finally {
      setIsProcessingVerificationId(null);
    }
  };

  // Open Reject Modal for Verification Request
  const handleOpenRejectVerificationModal = (req: VerificationRequest) => {
    setRejectModalRequest(req);
    setRejectReasonInput('Document proof is unclear or details do not match public identity.');
  };

  // Confirm Reject Verification Request
  const handleConfirmRejectVerification = async () => {
    if (!rejectModalRequest) return;
    setIsProcessingVerificationId(rejectModalRequest.id);
    try {
      await verificationService.rejectVerificationRequest(
        rejectModalRequest,
        rejectReasonInput || 'Application does not meet current verification criteria.',
        currentUser?.uid
      );
      addToast(`Verification request rejected for @${rejectModalRequest.username}.`, 'info');
      setRejectModalRequest(null);
      const [updatedReqs, updatedUsers] = await Promise.all([
        verificationService.getAllVerificationRequests(),
        adminService.getAllUsers()
      ]);
      setVerificationRequests(updatedReqs);
      setUsers(updatedUsers);
    } catch (err) {
      console.error(err);
      addToast('Failed to reject verification request.', 'error');
    } finally {
      setIsProcessingVerificationId(null);
    }
  };

  // Revoke User Verification
  const handleRevokeVerification = async (userId: string, requestId?: string) => {
    try {
      await verificationService.revokeVerification(userId, requestId);
      addToast('Verification badge revoked.', 'info');
      const [updatedReqs, updatedUsers] = await Promise.all([
        verificationService.getAllVerificationRequests(),
        adminService.getAllUsers()
      ]);
      setVerificationRequests(updatedReqs);
      setUsers(updatedUsers);
    } catch (err) {
      console.error(err);
      addToast('Failed to revoke verification.', 'error');
    }
  };

  // Open Modal to Approve & Mark Withdrawal as Paid
  const handleOpenApproveModal = (req: WithdrawalRequest) => {
    setPayoutModalState({
      isOpen: true,
      type: 'approve',
      request: req,
      notes: 'Paid via Paytm / UPI app'
    });
  };

  // Open Modal to Reject Withdrawal & Refund
  const handleOpenRejectModal = (req: WithdrawalRequest) => {
    setPayoutModalState({
      isOpen: true,
      type: 'reject',
      request: req,
      notes: 'Invalid UPI ID or account verification needed'
    });
  };

  // Execute Payout Decision from Modal
  const handleConfirmPayoutAction = async () => {
    const { type, request, notes } = payoutModalState;
    if (!request) return;

    setIsProcessingPayoutId(request.id);
    try {
      if (type === 'approve') {
        await payoutService.approveWithdrawal(request.id, notes.trim() || 'Paid via Paytm / UPI app');
        setWithdrawalRequests(prev => prev.map(r => r.id === request.id ? { 
          ...r, 
          status: 'completed', 
          paidAt: new Date().toISOString(), 
          adminNotes: notes.trim() || 'Paid via Paytm / UPI' 
        } : r));
        addToast(`✓ Payout of ₹${request.amount.toFixed(2)} marked as Paid to @${request.username}!`, 'success');
      } else {
        await payoutService.rejectWithdrawal(request.id, notes.trim() || 'Rejected by Admin');
        setWithdrawalRequests(prev => prev.map(r => r.id === request.id ? { 
          ...r, 
          status: 'rejected', 
          adminNotes: notes.trim() || 'Rejected by Admin', 
          rejectedAt: new Date().toISOString() 
        } : r));
        addToast(`Withdrawal of ₹${request.amount.toFixed(2)} rejected and refunded to @${request.username}'s Balance.`, 'info');
        // refresh users list to show updated balance
        adminService.getAllUsers().then(setUsers);
      }
      setPayoutModalState({ isOpen: false, type: 'approve', request: null, notes: '' });
    } catch (err: any) {
      addToast(err.message || 'Operation failed. Please try again.', 'error');
    } finally {
      setIsProcessingPayoutId(null);
    }
  };

  // Permanently delete a fake or test withdrawal request
  const handleDeleteWithdrawalRequest = async (req: WithdrawalRequest) => {
    if (!window.confirm(`Permanently delete withdrawal request of ₹${req.amount.toFixed(2)} from @${req.username}? This cannot be undone.`)) {
      return;
    }
    try {
      await payoutService.deleteWithdrawalRequest(req.id);
      setWithdrawalRequests(prev => prev.filter(r => r.id !== req.id));
      addToast(`Permanently deleted withdrawal request for @${req.username}.`, 'info');
    } catch (err: any) {
      addToast(err.message || 'Failed to delete request.', 'error');
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongTitle.trim() || !newSongArtist.trim() || !newSongAudioUrl.trim()) {
      addToast('Please fill Song Title, Artist and Audio MP3 URL', 'error');
      return;
    }
    setIsAddingSong(true);
    try {
      const coverUrl = newSongCoverFile
        ? await videoService.uploadThumbnail(newSongCoverFile)
        : newSongCoverUrl.trim() || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80';
      const added = await soundService.addSoundTrack({
        title: newSongTitle.trim(),
        artist: newSongArtist.trim(),
        coverUrl,
        audioUrl: newSongAudioUrl.trim(),
        category: newSongCategory,
        duration: 30
      });
      setSounds(prev => [added, ...prev]);
      addToast(`Added "${added.title}" to platform Sound Library!`, 'success');
      setNewSongTitle('');
      setNewSongArtist('');
      setNewSongCoverUrl('');
      setNewSongCoverFile(null);
      setNewSongCoverPreview('');
      setNewSongAudioUrl('');
    } catch (err) {
      addToast('Failed to add sound track to library.', 'error');
    } finally {
      setIsAddingSong(false);
    }
  };

  const handleDeleteSong = async (soundId: string) => {
    try {
      await soundService.deleteSoundTrack(soundId);
      setSounds(prev => prev.filter(s => s.soundId !== soundId));
      addToast('Sound track removed from library.', 'info');
    } catch (err) {
      addToast('Failed to delete sound track.', 'error');
    }
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSound) return;
    if (!editingSound.title.trim() || !editingSound.artist.trim() || !editingSound.audioUrl.trim()) {
      addToast('Please fill Song Title, Artist and Audio MP3 URL', 'error');
      return;
    }
    setIsUpdatingSound(true);
    try {
      const coverUrl = editingSoundCoverFile
        ? await videoService.uploadThumbnail(editingSoundCoverFile)
        : editingSound.coverUrl.trim();
      await soundService.updateSoundTrack(editingSound.soundId, {
        title: editingSound.title.trim(),
        artist: editingSound.artist.trim(),
        category: editingSound.category,
        coverUrl,
        audioUrl: editingSound.audioUrl.trim(),
        duration: Number(editingSound.duration) || 30
      });
      setSounds(prev => prev.map(s => s.soundId === editingSound.soundId ? { ...s, ...editingSound, coverUrl } : s));
      addToast(`Sound "${editingSound.title}" updated successfully!`, 'success');
      setEditingSound(null);
      setEditingSoundCoverFile(null);
      setEditingSoundCoverPreview('');
    } catch (err: any) {
      addToast(err.message || 'Failed to update sound track.', 'error');
    } finally {
      setIsUpdatingSound(false);
    }
  };

  const handleRestoreTrash = async (item: TrashItem) => {
    setIsRestoringTrashId(item.id);
    try {
      await trashService.restoreItem(item.id);
      addToast(`"${item.title}" successfully restored to active platform!`, 'success');
      setTrashItems(prev => prev.map(t => t.id === item.id ? { ...t, status: 'restored' } : t));
      // Refresh live collections
      const [updatedUsers, updatedVideos] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllVideos()
      ]);
      setUsers(updatedUsers);
      setVideos(updatedVideos);
    } catch (err: any) {
      addToast(`Failed to restore item: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsRestoringTrashId(null);
    }
  };

  const handlePurgeTrash = async (item: TrashItem) => {
    if (!window.confirm(`Permanently purge "${item.title}" from Compliance Archive? This will completely destroy all metadata.`)) {
      return;
    }
    setIsPurgingTrashId(item.id);
    try {
      await trashService.permanentlyPurge(item.id);
      setTrashItems(prev => prev.filter(t => t.id !== item.id));
      if (selectedTrashDetail?.id === item.id) {
        setSelectedTrashDetail(null);
      }
      addToast(`"${item.title}" permanently purged from storage.`, 'info');
    } catch (err) {
      addToast('Failed to permanently purge item.', 'error');
    } finally {
      setIsPurgingTrashId(null);
    }
  };

  const handleAdminCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletModalUser || creditAmount <= 0) return;
    if (!walletModalUser.isMonetized) {
      addToast('Wallet Credit can only be granted to Monetized Creators.', 'error');
      return;
    }
    setIsCrediting(true);
    try {
      const current = walletModalUser.walletBalance || 0;
      const newBal = Number((current + creditAmount).toFixed(2));
      await userService.updateProfile(walletModalUser.uid, { walletBalance: newBal });
      addToast(`Added $${creditAmount.toFixed(2)} to @${walletModalUser.username}'s wallet!`, 'success');
      setWalletModalUser(null);
      const updated = await adminService.getAllUsers();
      setUsers(updated);
    } catch (err) {
      addToast('Failed to credit user wallet balance.', 'error');
    } finally {
      setIsCrediting(false);
    }
  };

  const handleAdminAddBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusModalUser || bonusAmount <= 0) return;
    if (!bonusModalUser.isMonetized) {
      addToast('Admin Reward can only be given to Monetized users. Please enable monetization first.', 'error');
      return;
    }
    setIsAddingBonus(true);
    try {
      const res = await paidVideoService.addBonusMoney(
        bonusModalUser.uid, 
        bonusAmount, 
        bonusReason,
        bonusCreditTarget
      );
      setUsers(prev => prev.map(u => u.uid === bonusModalUser.uid ? { 
        ...u, 
        bonusBalance: res.newBonus, 
        walletBalance: res.newWallet 
      } : u));

      if (bonusModalUser.uid === currentUser?.uid) {
        await refreshProfile();
      }

      addToast(
        bonusCreditTarget === 'bonus'
          ? `Added ₹${bonusAmount.toFixed(2)} Bonus Money to @${bonusModalUser.username}'s account!`
          : `Added ₹${bonusAmount.toFixed(2)} Direct Cash to @${bonusModalUser.username}'s wallet!`,
        'success'
      );
      setBonusModalUser(null);
    } catch (err: any) {
      addToast(err.message || 'Failed to credit funds.', 'error');
    } finally {
      setIsAddingBonus(false);
    }
  };

  // Load Paid Videos & Purchases when viewing paid_videos section
  useEffect(() => {
    if (activeSection === 'paid_videos') {
      setLoadingPaidVideos(true);
      Promise.all([
        paidVideoService.getAllPaidVideos(),
        paidVideoService.getAllPurchases()
      ]).then(([pv, purchases]) => {
        setPaidVideosList(pv);
        setPurchasesList(purchases);
      }).catch(console.warn).finally(() => setLoadingPaidVideos(false));
    }
  }, [activeSection]);

  // Load Newsletter campaigns & ensure legacy users missing newsletter field are activated
  useEffect(() => {
    if (activeSection === 'newsletter') {
      notificationService.getNewsletterCampaigns().then(setNewsletterCampaigns).catch(console.warn);
      const missingCount = users.filter((u) => u.newsletter === undefined).length;
      if (missingCount > 0) {
        notificationService.activateNewsletterForMissingUsers(users).then((updated) => {
          if (updated > 0) {
            setUsers((prev) => prev.map((u) => (u.newsletter === undefined ? { ...u, newsletter: true } : u)));
          }
        }).catch(console.warn);
      }
    }
  }, [activeSection, users.length]);

  const handleActivateNewsletterForAllMissing = async () => {
    setIsBackfillingNewsletter(true);
    setNewsletterResultMsg(null);
    try {
      const updated = await notificationService.activateNewsletterForMissingUsers(users);
      setUsers((prev) => prev.map((u) => (u.newsletter === undefined ? { ...u, newsletter: true } : u)));
      const msg = updated > 0
        ? `Activated newsletter for ${updated} existing user account(s).`
        : 'All existing users already have their newsletter preference active!';
      setNewsletterResultMsg({ type: 'success', text: msg });
      addToast(msg, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to activate newsletter for existing users.';
      setNewsletterResultMsg({ type: 'error', text: msg });
      addToast(msg, 'error');
    } finally {
      setIsBackfillingNewsletter(false);
    }
  };

  const handleSendNewsletterTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterTitle.trim() || !newsletterMessage.trim()) {
      setNewsletterResultMsg({ type: 'error', text: 'Please enter both a tip title and message.' });
      return;
    }
    setIsSendingNewsletter(true);
    setNewsletterResultMsg(null);
    try {
      const res = await notificationService.sendNewsletterTips(
        users,
        newsletterTitle,
        newsletterMessage,
        currentUser?.uid
      );
      setUsers((prev) => prev.map((u) => (u.newsletter === undefined ? { ...u, newsletter: true } : u)));
      setNewsletterCampaigns((prev) => [res.campaign, ...prev]);
      setNewsletterTitle('');
      setNewsletterMessage('');
      const msg = `Tip sent as Team SocialIndia to ${res.recipientCount} active subscriber(s)!`;
      setNewsletterResultMsg({ type: 'success', text: msg });
      addToast(msg, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to send newsletter tip notifications.';
      setNewsletterResultMsg({ type: 'error', text: msg });
      addToast(msg, 'error');
    } finally {
      setIsSendingNewsletter(false);
    }
  };

  const handleSaveStorage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cloudName.trim() || !uploadPreset.trim()) {
      addToast('Please enter both Cloud Name and Upload Preset.', 'error');
      return;
    }
    setIsSavingStorage(true);
    try {
      await adminService.saveStorageConfig(cloudName.trim(), uploadPreset.trim());
      setStorageUpdatedAt(new Date().toISOString());
      addToast('Global cloud storage configuration saved! All users will now upload using these credentials.', 'success');
    } catch (err) {
      addToast('Failed to save cloud storage configuration.', 'error');
    } finally {
      setIsSavingStorage(false);
    }
  };

  const handleTestStorageConnection = async () => {
    if (!cloudName.trim() || !uploadPreset.trim()) {
      addToast('Please enter both Cloud Name and Upload Preset to test.', 'error');
      return;
    }
    setIsTestingStorage(true);
    setStorageTestStatus('idle');
    setStorageTestMessage('');

    try {
      // Test Media CDN endpoint reachability
      const testFormData = new FormData();
      testFormData.append('upload_preset', uploadPreset.trim());
      // 1x1 transparent GIF base64 as tiny test payload
      testFormData.append('file', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName.trim()}/image/upload`, {
        method: 'POST',
        body: testFormData
      });

      if (res.ok) {
        await res.json();
        setStorageTestStatus('success');
        setStorageTestMessage(`Connection verified! Successfully uploaded test asset to "${cloudName.trim()}".`);
        addToast('Media CDN connection test successful!', 'success');
      } else {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP status ${res.status}`;
        setStorageTestStatus('error');
        setStorageTestMessage(`Media CDN responded with error: ${errMsg}. Please ensure the profile is set to 'Unsigned'.`);
        addToast(`Test failed: ${errMsg}`, 'error');
      }
    } catch (err: any) {
      setStorageTestStatus('error');
      setStorageTestMessage(`Network error connecting to Media CDN: ${err?.message || 'Check your internet connection and Account ID.'}`);
      addToast('Network error testing Media CDN connection.', 'error');
    } finally {
      setIsTestingStorage(false);
    }
  };

  const handleToggleMonetization = async (uid: string, currentMonetized: boolean) => {
    const nextMonetized = !currentMonetized;
    try {
      await userService.updateProfile(uid, {
        isMonetized: nextMonetized,
        monetizationStatus: nextMonetized ? 'approved' : 'not_eligible'
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isMonetized: nextMonetized, monetizationStatus: nextMonetized ? 'approved' : 'not_eligible' } : u));
      addToast(nextMonetized ? 'Monetization instantly activated!' : 'Monetization deactivated.', 'success');
    } catch {
      addToast('Failed to toggle user monetization.', 'error');
    }
  };

  const handleUpdateUserStatus = async (uid: string, currentStatus: User['status']) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await adminService.updateUserStatus(uid, newStatus);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
      addToast(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully.`, 'success');
    } catch (err) {
      addToast('Failed to update user status.', 'error');
    }
  };

  const handleUpdateVideoStatus = async (videoId: string, currentStatus: Video['status']) => {
    const newStatus = currentStatus === 'published' ? 'hidden' : 'published';
    try {
      await adminService.updateVideoStatus(videoId, newStatus);
      setVideos(prev => prev.map(v => v.videoId === videoId ? { ...v, status: newStatus } : v));
      addToast(`Video ${newStatus === 'published' ? 'published' : 'hidden'} successfully.`, 'success');
    } catch (err) {
      addToast('Failed to update video status.', 'error');
    }
  };

  const handleConfirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    setIsDeletingVideo(true);
    try {
      await adminService.deleteVideo(videoToDelete.videoId, videoToDelete.creatorId, currentUser?.uid || 'admin');
      setVideos(prev => prev.filter(v => v.videoId !== videoToDelete.videoId));
      const updatedTrash = await trashService.getAllTrash();
      setTrashItems(updatedTrash);
      addToast('Video permanently deleted from platform & moved to 180-Day Compliance Vault.', 'success');
      setVideoToDelete(null);
    } catch (err: any) {
      console.error('Delete video error:', err);
      // Optimistically remove from state if deleteDoc completed
      setVideos(prev => prev.filter(v => v.videoId !== videoToDelete.videoId));
      setVideoToDelete(null);
      addToast('Video removed from platform feed.', 'info');
    } finally {
      setIsDeletingVideo(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await adminService.deleteUser(userToDelete.uid, currentUser?.uid || 'admin');
      setUsers(prev => prev.filter(u => u.uid !== userToDelete.uid));
      const updatedTrash = await trashService.getAllTrash();
      setTrashItems(updatedTrash);
      addToast(`User @${userToDelete.username} permanently deleted from platform & archived to 180-Day Compliance Vault.`, 'success');
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Delete user error:', err);
      setUsers(prev => prev.filter(u => u.uid !== userToDelete.uid));
      setUserToDelete(null);
      addToast('User removed from platform.', 'info');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleReportUpdate = async (report: Report, status: Report['status']) => {
    const message = (reportMessages[report.reportId] || '').trim();
    try {
      await adminService.updateReportStatus(report.reportId, status, message);
      await notificationService.sendSystemNotification(
        report.reporterId,
        'Update on your report',
        message || `Your report about ${report.targetTitle || `${report.targetType} ${report.targetId}`} was marked ${status}.`
      );
      setReports(prev => prev.map(r => r.reportId === report.reportId
        ? { ...r, status, adminResponse: message }
        : r));
      setReportMessages(prev => ({ ...prev, [report.reportId]: '' }));
      addToast(`Report marked as ${status}.`, 'success');
    } catch (err) {
      addToast('Failed to update report or notify its reporter.', 'error');
    }
  };

  const handleSendReportUpdate = async (report: Report) => {
    const message = (reportMessages[report.reportId] || '').trim();
    if (!message) return;
    setSendingReportUpdateId(report.reportId);
    try {
      await adminService.updateReportStatus(report.reportId, report.status, message);
      await notificationService.sendSystemNotification(
        report.reporterId,
        'Update on your report',
        message
      );
      setReports(prev => prev.map(r => r.reportId === report.reportId
        ? { ...r, adminResponse: message }
        : r));
      setReportMessages(prev => ({ ...prev, [report.reportId]: '' }));
      addToast('Report update sent to the reporter.', 'success');
    } catch (err) {
      addToast('Failed to send report update.', 'error');
    } finally {
      setSendingReportUpdateId(null);
    }
  };

  const isRegisteredFeedbackUser = (uid?: string) =>
    Boolean(uid && uid !== 'guest-feedback' && uid !== 'guest-ticket');

  const parseHelpDetails = (entry: FeedbackEntry) => {
    const rawMsg = (entry.message || '').trim();
    const emailMatch = rawMsg.match(/^Email:\s*(.+)$/im);
    const categoryMatch = rawMsg.match(/^Category:\s*(.+)$/im);
    const subjectCatMatch = (entry.subject || '').match(/^\[([^\]]+)\]\s*(.*)$/);

    const email = (entry.email || (emailMatch ? emailMatch[1].trim() : '') || '').trim();
    const category = (
      entry.category ||
      (categoryMatch ? categoryMatch[1].trim() : '') ||
      (subjectCatMatch ? subjectCatMatch[1].trim() : '')
    ).trim();

    let detailedDescription = (entry.detailedDescription || '').trim();
    if (!detailedDescription) {
      const stripped = rawMsg
        .replace(/^Email:\s*.*\n?/im, '')
        .replace(/^Category:\s*.*\n?/im, '')
        .trim();
      detailedDescription = stripped || rawMsg;
    }

    const cleanSubject = subjectCatMatch && subjectCatMatch[2]
      ? subjectCatMatch[2].trim()
      : entry.subject;

    return {
      email: email && email !== 'Not provided' ? email : '',
      category,
      cleanSubject,
      detailedDescription
    };
  };

  const handleSendFeedbackReply = async (entry: FeedbackEntry) => {
    if (!entry.id) return;
    const replyText = (feedbackReplies[entry.id] || '').trim();
    if (!replyText) return;

    setSendingFeedbackReplyId(entry.id);
    try {
      const nextStatus: FeedbackEntry['status'] = entry.status === 'resolved' ? 'resolved' : 'reviewed';
      await feedbackService.replyToFeedback(
        entry.id,
        replyText,
        nextStatus,
        currentUserProfile?.username || currentUser?.uid || 'admin'
      );

      let notified = false;
      if (isRegisteredFeedbackUser(entry.uid)) {
        const label = entry.type === 'help' ? 'help request' : 'feedback';
        await notificationService.sendSystemNotification(
          entry.uid,
          `Reply to your ${label}${entry.subject ? ` (${entry.subject})` : ''}`,
          replyText
        );
        notified = true;
      }

      const nowIso = new Date().toISOString();
      setFeedback(prev => prev.map(f => f.id === entry.id
        ? { ...f, adminReply: replyText, repliedAt: nowIso, status: nextStatus }
        : f));
      setFeedbackReplies(prev => ({ ...prev, [entry.id!]: '' }));
      addToast(
        notified
          ? 'Reply sent to the user via notification!'
          : 'Reply saved (guest submission — no user account for notification).',
        notified ? 'success' : 'info'
      );
    } catch (err) {
      addToast('Failed to send reply.', 'error');
    } finally {
      setSendingFeedbackReplyId(null);
    }
  };

  const handleResolveFeedback = async (entry: FeedbackEntry, status: FeedbackEntry['status']) => {
    if (!entry.id) return;
    const typedReply = (feedbackReplies[entry.id] || '').trim();
    try {
      if (typedReply) {
        await feedbackService.replyToFeedback(
          entry.id,
          typedReply,
          status,
          currentUserProfile?.username || currentUser?.uid || 'admin'
        );
      } else {
        await feedbackService.updateFeedbackStatus(entry.id, status);
      }

      const canNotify = isRegisteredFeedbackUser(entry.uid);
      if (canNotify) {
        const isHelp = entry.type === 'help';
        const statusMsg = status === 'resolved'
          ? `Your ${isHelp ? 'support request' : 'feedback'} has been reviewed and resolved by Team SocialIndia. Thank you for reaching out!`
          : `Thank you! Team SocialIndia has received and reviewed your ${isHelp ? 'support request' : 'feedback'}.`;
        await notificationService.sendSystemNotification(
          entry.uid,
          `${isHelp ? 'Help Request' : 'Feedback'} ${status === 'resolved' ? 'Resolved' : 'Acknowledged'}`,
          typedReply || statusMsg
        );
      }

      const nowIso = new Date().toISOString();
      setFeedback(prev => prev.map(f => f.id === entry.id
        ? {
            ...f,
            status,
            ...(typedReply ? { adminReply: typedReply, repliedAt: nowIso } : {})
          }
        : f));
      if (typedReply) {
        setFeedbackReplies(prev => ({ ...prev, [entry.id!]: '' }));
      }
      addToast(
        canNotify
          ? `${entry.type === 'help' ? 'Help request' : 'Feedback'} marked as ${status} & user notified.`
          : `${entry.type === 'help' ? 'Help request' : 'Feedback'} marked as ${status}.`,
        'success'
      );
    } catch (err) {
      addToast('Failed to update status.', 'error');
    }
  };

  // Platform Tools & Broadcast Announcement State
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'alert' | 'success'>('info');
  const [announcementLinkText, setAnnouncementLinkText] = useState('');
  const [announcementLinkUrl, setAnnouncementLinkUrl] = useState('');
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // User Role Management Tool State
  const [selectedUserForRole, setSelectedUserForRole] = useState<string>('');
  const [selectedNewRole, setSelectedNewRole] = useState<User['role']>('creator');
  const [isUpdatingUserRole, setIsUpdatingUserRole] = useState(false);

  // Content Health Audit Scanner
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditStats, setAuditStats] = useState<{
    totalVideos: number;
    shortsCount: number;
    standardCount: number;
    missingThumbnails: number;
    emptyDescriptions: number;
    totalPlatformViews: number;
    totalLikes: number;
  } | null>(null);

  useEffect(() => {
    adminService.getAnnouncement().then(ann => {
      if (ann) {
        setAnnouncementActive(Boolean(ann.active));
        setAnnouncementText(typeof ann.message === 'string' ? ann.message : String(ann.message ?? ''));
        setAnnouncementType(ann.type === 'alert' || ann.type === 'success' ? ann.type : 'info');
        setAnnouncementLinkText(typeof ann.linkText === 'string' ? ann.linkText : String(ann.linkText ?? ''));
        setAnnouncementLinkUrl(typeof ann.linkUrl === 'string' ? ann.linkUrl : String(ann.linkUrl ?? ''));
      }
    }).catch(console.error);
  }, []);

  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
      await adminService.saveAnnouncement({
        active: announcementActive,
        message: String(announcementText ?? '').trim(),
        type: announcementType,
        linkText: String(announcementLinkText ?? '').trim(),
        linkUrl: String(announcementLinkUrl ?? '').trim()
      });
      addToast('Broadcast announcement updated successfully!', 'success');
    } catch {
      addToast('Failed to update broadcast.', 'error');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleQuickRoleChange = async () => {
    if (!selectedUserForRole) {
      addToast('Please choose a user to update.', 'info');
      return;
    }
    setIsUpdatingUserRole(true);
    try {
      await adminService.updateUserRole(selectedUserForRole, selectedNewRole);
      setUsers(prev => prev.map(u => u.uid === selectedUserForRole ? { ...u, role: selectedNewRole } : u));
      addToast(`Role updated to "${selectedNewRole}".`, 'success');
    } catch {
      addToast('Failed to update user role.', 'error');
    } finally {
      setIsUpdatingUserRole(false);
    }
  };

  const handleRunAuditScan = () => {
    setAuditRunning(true);
    setTimeout(() => {
      const shorts = videos.filter(v => v.isShort).length;
      const standard = videos.filter(v => !v.isShort).length;
      const missingThumbs = videos.filter(v => !v.thumbnailUrl || v.thumbnailUrl.trim() === '').length;
      const emptyDescs = videos.filter(v => !v.description || v.description.trim() === '').length;
      const totalViews = videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
      const totalLikes = videos.reduce((acc, v) => acc + (v.likesCount || 0), 0);

      setAuditStats({
        totalVideos: videos.length,
        shortsCount: shorts,
        standardCount: standard,
        missingThumbnails: missingThumbs,
        emptyDescriptions: emptyDescs,
        totalPlatformViews: totalViews,
        totalLikes: totalLikes
      });
      setAuditRunning(false);
      addToast('Platform diagnostic scan complete!', 'success');
    }, 600);
  };

  const sortedUsers = React.useMemo(() => {
    return [...users].sort((a, b) => {
      const createdDiff = parseDateMs(b.createdAt) - parseDateMs(a.createdAt);
      if (createdDiff !== 0) return createdDiff;
      const updatedDiff = parseDateMs(b.updatedAt) - parseDateMs(a.updatedAt);
      if (updatedDiff !== 0) return updatedDiff;
      return (a.username || '').localeCompare(b.username || '');
    });
  }, [users]);

  const newestCreators = React.useMemo(() => sortedUsers.slice(0, 10), [sortedUsers]);

  const { onlinePresenceUsers, offlinePresenceUsers } = React.useMemo(() => {
    const online: User[] = [];
    const offline: User[] = [];
    users.forEach((u) => {
      if (isUserCurrentlyOnline(u.isOnline, u.lastSeen)) {
        online.push(u);
      } else {
        offline.push(u);
      }
    });

    online.sort((a, b) => {
      const seenDiff = parseDateMs(b.lastSeen) - parseDateMs(a.lastSeen);
      if (seenDiff !== 0) return seenDiff;
      return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
    });

    offline.sort((a, b) => {
      const aSeen = parseDateMs(a.lastSeen);
      const bSeen = parseDateMs(b.lastSeen);
      if (aSeen !== bSeen) return bSeen - aSeen;
      const updatedDiff = parseDateMs(b.updatedAt) - parseDateMs(a.updatedAt);
      if (updatedDiff !== 0) return updatedDiff;
      return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
    });

    return { onlinePresenceUsers: online, offlinePresenceUsers: offline };
  }, [users, presenceTick]);

  const filteredPresenceUsers = React.useMemo(() => {
    const q = presenceSearch.trim().toLowerCase();
    const matchesQuery = (u: User) =>
      !q || `${u.displayName || ''} ${u.username || ''} ${u.email || ''}`.toLowerCase().includes(q);

    const onlineList = presenceFilter === 'offline' ? [] : onlinePresenceUsers.filter(matchesQuery);
    const offlineList = presenceFilter === 'online' ? [] : offlinePresenceUsers.filter(matchesQuery);
    return {
      onlineList,
      offlineList,
      combined: [
        ...onlineList.map((user) => ({ user, isOnline: true as const })),
        ...offlineList.map((user) => ({ user, isOnline: false as const })),
      ],
    };
  }, [onlinePresenceUsers, offlinePresenceUsers, presenceFilter, presenceSearch]);

  const sortedStandardVideos = React.useMemo(() => {
    return [...videos]
      .filter(v => !v.isShort)
      .sort((a, b) => {
        const createdDiff = parseDateMs(b.createdAt) - parseDateMs(a.createdAt);
        if (createdDiff !== 0) return createdDiff;
        return parseDateMs(b.updatedAt) - parseDateMs(a.updatedAt);
      });
  }, [videos]);

  const newestVideos = React.useMemo(() => sortedStandardVideos.slice(0, 10), [sortedStandardVideos]);

  const sortedClips = React.useMemo(() => {
    return [...videos]
      .filter(v => Boolean(v.isShort))
      .sort((a, b) => {
        const createdDiff = parseDateMs(b.createdAt) - parseDateMs(a.createdAt);
        if (createdDiff !== 0) return createdDiff;
        return parseDateMs(b.updatedAt) - parseDateMs(a.updatedAt);
      });
  }, [videos]);

  const newestClips = React.useMemo(() => sortedClips.slice(0, 10), [sortedClips]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredUsers = sortedUsers.filter(u =>
    `${u.username || ''} ${u.displayName || ''}`.toLowerCase().includes(normalizedSearchTerm)
  );

  const filteredVideos = videos.filter(v =>
    `${v.title || ''} ${v.creatorUsername || ''}`.toLowerCase().includes(normalizedSearchTerm)
  );

  if (currentUserProfile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <ShieldAlert className="w-16 h-16 text-[#800080] mb-4" />
        <h3 className="text-xl font-black">Access Denied</h3>
        <p className="text-sm text-slate-500 mt-2">You do not have administrative privileges.</p>
      </div>
    );
  }

  return (
    <div className="admin-workspace flex min-h-screen flex-col gap-5 bg-slate-100 p-3 dark:bg-slate-950 md:flex-row md:p-5">
      {/* Sidebar Navigation Card */}
      <aside className="admin-sidebar w-full shrink-0 self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:sticky md:top-4 md:w-72 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto scrollbar-none select-none">
        
        {/* Header Badging */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('home')}
                className="p-1.5 md:hidden bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 rounded-lg text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-xs"
                title="Back to Home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                <span>Admin Hub</span>
              </h1>
            </div>
            <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Super</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">SocialIndia Systems</p>
          
          <button
            onClick={() => navigate('home')}
            className="w-full mt-2.5 py-1.5 px-3 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border border-blue-200/80 dark:border-blue-900/60 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Main Website</span>
          </button>
        </div>

        {/* SECTION 1: CORE SYSTEMS */}
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1.5">Core Systems</p>
          
          <button 
            onClick={() => setActiveSection('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'dashboard' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'dashboard' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" style={{ color: activeSection === 'dashboard' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'dashboard' ? '#ffffff' : undefined }}>Dashboard</span>
          </button>

          <button 
            onClick={() => setActiveSection('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'settings' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <Sliders className="w-4 h-4 shrink-0" style={{ color: activeSection === 'settings' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'settings' ? '#ffffff' : undefined }}>Settings</span>
          </button>

          <button 
            onClick={() => setActiveSection('design')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'design' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <Palette className="w-4 h-4 shrink-0" style={{ color: activeSection === 'design' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'design' ? '#ffffff' : undefined }}>Design Layout</span>
          </button>

          <button 
            onClick={() => setActiveSection('pages')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'pages' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <FileText className="w-4 h-4 shrink-0" style={{ color: activeSection === 'pages' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'pages' ? '#ffffff' : undefined }}>Pages Markup</span>
          </button>

          <button 
            onClick={() => setActiveSection('sitemap')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'sitemap' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <MapIcon className="w-4 h-4 shrink-0" style={{ color: activeSection === 'sitemap' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'sitemap' ? '#ffffff' : undefined }}>Sitemap Index</span>
          </button>

          <button 
            onClick={() => setActiveSection('system_status')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'system_status' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <Activity className="w-4 h-4 shrink-0" style={{ color: activeSection === 'system_status' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'system_status' ? '#ffffff' : undefined }}>System Status</span>
          </button>

          <button 
            onClick={() => setActiveSection('changelogs')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'changelogs' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <History className="w-4 h-4 shrink-0" style={{ color: activeSection === 'changelogs' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'changelogs' ? '#ffffff' : undefined }}>Changelogs</span>
          </button>
        </div>

        {/* SECTION 2: MONETIZATION & ADS */}
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1.5">Monetization & Payouts</p>

          <button 
            onClick={() => setActiveSection('withdrawals')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'withdrawals' 
                ? 'bg-[#059669] hover:bg-[#047857] text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'withdrawals' ? { backgroundColor: '#059669', color: '#ffffff' } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 shrink-0" style={{ color: activeSection === 'withdrawals' ? '#ffffff' : '#34d399' }} />
              <span style={{ color: activeSection === 'withdrawals' ? '#ffffff' : undefined }}>Withdrawals (UPI)</span>
            </div>
            {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950 animate-pulse">
                {withdrawalRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveSection('paid_videos')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'paid_videos' 
                ? 'bg-[#059669] hover:bg-[#047857] text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'paid_videos' ? { backgroundColor: '#059669', color: '#ffffff' } : undefined}
          >
            <DollarSign className="w-4 h-4 shrink-0" style={{ color: activeSection === 'paid_videos' ? '#ffffff' : '#10b981' }} />
            <span style={{ color: activeSection === 'paid_videos' ? '#ffffff' : undefined }}>Paid Videos & Earnings</span>
          </button>

          <button 
            onClick={() => setActiveSection('payments_ads')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'payments_ads' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'payments_ads' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <Wallet className="w-4 h-4 shrink-0" style={{ color: activeSection === 'payments_ads' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'payments_ads' ? '#ffffff' : undefined }}>Payments & Ads Setup</span>
          </button>

          <button 
            onClick={() => setActiveSection('advertising')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'advertising' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'advertising' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <Megaphone className="w-4 h-4 shrink-0" style={{ color: activeSection === 'advertising' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'advertising' ? '#ffffff' : undefined }}>Ad Campaigns</span>
          </button>

          <button 
            onClick={() => setActiveSection('pro_members')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'pro_members' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'pro_members' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <Sparkles className="w-4 h-4 shrink-0" style={{ color: activeSection === 'pro_members' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'pro_members' ? '#ffffff' : undefined }}>Pro System (GoPro)</span>
          </button>

          <button 
            onClick={() => setActiveSection('verification_requests')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'verification_requests' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'verification_requests' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: activeSection === 'verification_requests' ? '#ffffff' : '#38bdf8' }} />
              <span style={{ color: activeSection === 'verification_requests' ? '#ffffff' : undefined }}>Verification Requests</span>
            </div>
            {verificationRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-500 text-white animate-pulse">
                {verificationRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* SECTION 3: CONTENT & MEDIA */}
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1.5">Content & Media</p>

          <button 
            onClick={() => setActiveSection('users')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'users' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'users' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <Users className="w-4 h-4 shrink-0" style={{ color: activeSection === 'users' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'users' ? '#ffffff' : undefined }}>Users Accounts</span>
          </button>

          <button 
            onClick={() => setActiveSection('videos')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'videos' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'videos' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <VideoIcon className="w-4 h-4 shrink-0" style={{ color: activeSection === 'videos' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'videos' ? '#ffffff' : undefined }}>Videos & Clips</span>
          </button>

          <button 
            onClick={() => setActiveSection('movies')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'movies' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <Film className="w-4 h-4 shrink-0" style={{ color: activeSection === 'movies' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'movies' ? '#ffffff' : undefined }}>Movies Catalog</span>
          </button>

          <button 
            onClick={() => setActiveSection('articles')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'articles' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <BookOpen className="w-4 h-4 shrink-0" style={{ color: activeSection === 'articles' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'articles' ? '#ffffff' : undefined }}>Articles</span>
          </button>

          <button 
            onClick={() => setActiveSection('categories')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'categories' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <FolderTree className="w-4 h-4 shrink-0" style={{ color: activeSection === 'categories' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'categories' ? '#ffffff' : undefined }}>Categories</span>
          </button>

          <button 
            onClick={() => setActiveSection('languages')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'languages' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <Globe className="w-4 h-4 shrink-0" style={{ color: activeSection === 'languages' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'languages' ? '#ffffff' : undefined }}>Languages</span>
          </button>

          <button 
            onClick={() => setActiveSection('sounds')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'sounds' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'sounds' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <Music className="w-4 h-4 shrink-0" style={{ color: activeSection === 'sounds' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'sounds' ? '#ffffff' : undefined }}>Sound Library</span>
          </button>
        </div>

        {/* SECTION 4: SAFETY & MAINTENANCE */}
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1.5">Compliance & Safety</p>

          <button 
            onClick={() => setActiveSection('reports')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'reports' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'reports' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: activeSection === 'reports' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'reports' ? '#ffffff' : undefined }}>Reports</span>
          </button>

          <button
            onClick={() => setActiveSection('grievances')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'grievances'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Grievance Management</span>
          </button>

          <button 
            onClick={() => setActiveSection('help_requests')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'help_requests' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'help_requests' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 shrink-0" style={{ color: activeSection === 'help_requests' ? '#ffffff' : undefined }} />
              <span style={{ color: activeSection === 'help_requests' ? '#ffffff' : undefined }}>Help Requests</span>
            </div>
            {feedback.filter(f => f.type === 'help' && f.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950">
                {feedback.filter(f => f.type === 'help' && f.status === 'pending').length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveSection('feedback')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'feedback' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'feedback' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 shrink-0" style={{ color: activeSection === 'feedback' ? '#ffffff' : undefined }} />
              <span style={{ color: activeSection === 'feedback' ? '#ffffff' : undefined }}>Feedback</span>
            </div>
            {feedback.filter(f => f.type !== 'help' && f.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-500 text-white">
                {feedback.filter(f => f.type !== 'help' && f.status === 'pending').length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveSection('storage')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'storage' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'storage' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <Cloud className="w-4 h-4 shrink-0" style={{ color: activeSection === 'storage' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'storage' ? '#ffffff' : undefined }}>Cloud Storage</span>
          </button>

          <button 
            onClick={() => setActiveSection('trash')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'trash' 
                ? 'bg-[#e11d48] hover:bg-[#be123c] text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'trash' ? { backgroundColor: '#e11d48', color: '#ffffff' } : undefined}
          >
            <Archive className="w-4 h-4 shrink-0" style={{ color: activeSection === 'trash' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'trash' ? '#ffffff' : undefined }}>Trash Vault</span>
          </button>

          <button 
            onClick={() => setActiveSection('newsletter')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'newsletter' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'newsletter' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 shrink-0" style={{ color: activeSection === 'newsletter' ? '#ffffff' : '#38bdf8' }} />
              <span style={{ color: activeSection === 'newsletter' ? '#ffffff' : undefined }}>Newsletter</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase ${
              activeSection === 'newsletter'
                ? 'bg-white/20 text-white'
                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
            }`}>
              Tips
            </span>
          </button>

          <button 
            onClick={() => setActiveSection('tools')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'tools' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'tools' ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
          >
            <Wrench className="w-4 h-4 shrink-0" style={{ color: activeSection === 'tools' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'tools' ? '#ffffff' : undefined }}>Platform Tools</span>
          </button>

          <button 
            onClick={() => setActiveSection('firebase_edit')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'firebase_edit' 
                ? 'bg-[#d97706] hover:bg-[#b45309] text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={activeSection === 'firebase_edit' ? { backgroundColor: '#d97706', color: '#ffffff' } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 shrink-0" style={{ color: activeSection === 'firebase_edit' ? '#ffffff' : '#f59e0b' }} />
              <span style={{ color: activeSection === 'firebase_edit' ? '#ffffff' : undefined }}>Firebase Edit</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase ${
              activeSection === 'firebase_edit' 
                ? 'bg-white/20 text-white' 
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>Live</span>
          </button>

          <button 
            onClick={() => setActiveSection('mobile_api')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'mobile_api' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <Smartphone className="w-4 h-4 shrink-0" style={{ color: activeSection === 'mobile_api' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'mobile_api' ? '#ffffff' : undefined }}>Mobile & APIs</span>
          </button>

          <button 
            onClick={() => setActiveSection('backup')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'backup' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <Database className="w-4 h-4 shrink-0" style={{ color: activeSection === 'backup' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'backup' ? '#ffffff' : undefined }}>Backup Snapshots</span>
          </button>

          <button 
            onClick={() => setActiveSection('faq_docs')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeSection === 'faq_docs' 
                ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1c20]'
            }`}
            style={{ display: 'none' }}
          >
            <HelpCircle className="w-4 h-4 shrink-0" style={{ color: activeSection === 'faq_docs' ? '#ffffff' : undefined }} />
            <span style={{ color: activeSection === 'faq_docs' ? '#ffffff' : undefined }}>FAQs & Docs</span>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <main ref={adminMainRef} className="admin-main min-w-0 flex-1 space-y-6 p-4 md:p-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {activeSection === 'firebase_edit'
                ? 'Firebase Live Video Editor'
                : ({
                    dashboard: 'Dashboard',
                    users: 'User accounts',
                    videos: 'Videos & Clips',
                    paid_videos: 'Paid videos & earnings',
                    withdrawals: 'Creator withdrawals',
                    verification_requests: 'Verification requests',
                    newsletter: 'Newsletter & Tips',
                    reports: 'Reports',
                    grievances: 'Grievance Management',
                    help_requests: 'Help & Support Requests',
                    feedback: 'Feedback & Support',
                    storage: 'Cloud storage',
                    trash: 'Trash vault',
                    tools: 'Operations & diagnostics',
                    sounds: 'Sound library',
                    advertising: 'Ad campaigns',
                    pro_members: 'Pro members',
                    payments_ads: 'Payments & ads setup'
                  } as Record<AdminSection, string>)[activeSection]}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {activeSection === 'firebase_edit' 
                ? 'Directly edit real video metrics, views, and likes stored in Firebase Firestore.' 
                : ({
                    dashboard: 'A live overview of platform activity and items needing attention.',
                    users: 'Review creator accounts and account details.',
                    videos: 'Moderate uploaded videos and clips.',
                    paid_videos: 'Review paid video activity and creator earnings.',
                    withdrawals: 'Review and process creator payout requests.',
                    verification_requests: 'Review creator verification applications.',
                    newsletter: 'Send helpful tips as Team SocialIndia to all active newsletter users via notifications.',
                    reports: 'Review content and account reports.',
                    grievances: 'Review private grievance submissions and record administrative actions.',
                    help_requests: 'Review Help Center requests including issue category, email, detailed description, and reply via notification.',
                    feedback: 'Review user feedback and support requests submitted by the community.',
                    storage: 'Manage the platform media storage configuration.',
                    trash: 'Restore or permanently remove archived content.',
                    tools: 'Run platform operations and content diagnostics.',
                    sounds: 'Manage the platform sound library.',
                    advertising: 'Manage advertising campaigns.',
                    pro_members: 'Review creator membership activity.',
                    payments_ads: 'Configure monetization and review payout activity.'
                  } as Record<AdminSection, string>)[activeSection]}
            </p>
          </div>

          {(activeSection === 'users' || activeSection === 'videos') && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder={`Search ${activeSection}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
                  <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/5 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="h-2.5 w-1/4 rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="h-7 w-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* PlayTube Extra System Panels */}
            {activeSection === 'payments_ads' && (
              <AdminExtraTabs 
                activeSection={activeSection} 
                users={users} 
                withdrawalRequests={withdrawalRequests}
                onApproveWithdrawal={handleOpenApproveModal}
                onRejectWithdrawal={handleOpenRejectModal}
                onDeleteWithdrawal={handleDeleteWithdrawalRequest}
                onNavigateSection={setActiveSection}
                addToast={addToast} 
              />
            )}
        {activeSection === 'dashboard' && (
          <div className="mt-6">
            <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Quick browser tools</h2>
            <AdminQuickTools addToast={addToast} />
          </div>
        )}
            {/* Dashboard Section */}
            {activeSection === 'dashboard' && (
              <div className="space-y-8">
                {/* Pending UPI Payouts Alert */}
                {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
                  <div className="p-5 bg-linear-to-r from-emerald-600 via-teal-700 to-cyan-800 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black shrink-0">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black flex items-center gap-2">
                          <span>Pending UPI Payout Requests</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                            {withdrawalRequests.filter(r => r.status === 'pending').length} Pending
                          </span>
                        </h4>
                        <p className="text-xs text-white/80 mt-0.5">
                          Total ₹{withdrawalRequests.filter(r => r.status === 'pending').reduce((acc, r) => acc + (r.amount || 0), 0).toFixed(2)} waiting for Paytm / UPI settlement.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSection('withdrawals')}
                      className="px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
                    >
                      Process Payouts Queue →
                    </button>
                  </div>
                )}

                {/* Pending Verification Requests Alert */}
                {verificationRequests.filter(r => r.status === 'pending').length > 0 && (
                  <div className="p-5 bg-linear-to-r from-blue-600 via-indigo-700 to-sky-800 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black flex items-center gap-2">
                          <span>Pending Channel Verification Requests</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                            {verificationRequests.filter(r => r.status === 'pending').length} Pending
                          </span>
                        </h4>
                        <p className="text-xs text-white/80 mt-0.5">
                          Creators have submitted legal identity documents requesting official Blue Tick badges.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSection('verification_requests')}
                      className="px-5 py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
                    >
                      Review Verifications Queue →
                    </button>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  <StatCard icon={Users} label="Total Users" value={users.length} color="blue" />
                  <StatCard icon={ShieldCheck} label="Pending Verifications" value={verificationRequests.filter(r => r.status === 'pending').length} color="indigo" />
                  <StatCard icon={VideoIcon} label="Total Videos" value={videos.length} color="indigo" />
                  <StatCard icon={DollarSign} label="Pending Payouts" value={withdrawalRequests.filter(r => r.status === 'pending').length} color="emerald" />
                  <StatCard icon={AlertTriangle} label="Pending Reports" value={reports.filter(r => r.status === 'pending').length} color="amber" />
                </div>

                {/* Live Online & Offline Users (Online at Top, Offline + Last Seen Below) */}
                <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1f1f24] mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span>Online &amp; Offline Users</span>
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-900/50">
                          {onlinePresenceUsers.length} Online
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-[#1c1c22] text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-800">
                          {offlinePresenceUsers.length} Offline
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={presenceSearch}
                          onChange={(e) => setPresenceSearch(e.target.value)}
                          placeholder="Search user..."
                          className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#18181c] border border-slate-200 dark:border-[#2a2a30] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-52"
                        />
                      </div>

                      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#18181c] border border-slate-200/70 dark:border-[#26262c]">
                        {(['all', 'online', 'offline'] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setPresenceFilter(tab)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              presenceFilter === tab
                                ? 'bg-white dark:bg-[#25252d] text-blue-600 dark:text-blue-400 shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {tab === 'all' ? 'All' : tab === 'online' ? 'Online' : 'Offline'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto pr-1 space-y-1">
                    {filteredPresenceUsers.onlineList.length > 0 && (
                      <div className="px-2 pt-1 pb-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Online Now ({filteredPresenceUsers.onlineList.length})</span>
                      </div>
                    )}

                    {filteredPresenceUsers.onlineList.map((u) => {
                      const presence = formatWhatsAppPresence(u.isOnline, u.lastSeen);
                      const lastSeenMs = parseDateMs(u.lastSeen);
                      const exactLastSeen = lastSeenMs ? new Date(lastSeenMs).toLocaleString() : 'Active now';
                      return (
                        <div
                          key={u.uid}
                          onClick={() => navigate('creator', u.username)}
                          className="py-2.5 px-3 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/15 hover:bg-emerald-50 dark:hover:bg-emerald-950/25 border border-emerald-200/50 dark:border-emerald-900/30 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs overflow-hidden ring-2 ring-emerald-500/70">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.displayName || u.username} className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(u.displayName || u.username || 'U')
                                )}
                              </div>
                              <span
                                title="Online"
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121215]"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {u.displayName || u.username || 'Unnamed User'}
                                </p>
                                {isUserVerified(u) && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                @{u.username}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0" title={exactLastSeen}>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {presence.label}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white" />
                          </div>
                        </div>
                      );
                    })}

                    {filteredPresenceUsers.offlineList.length > 0 && (
                      <div className={`px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ${
                        filteredPresenceUsers.onlineList.length > 0 ? 'pt-4 mt-2 border-t border-slate-100 dark:border-[#1f1f24]' : 'pt-1'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                        <span>Offline Users ({filteredPresenceUsers.offlineList.length})</span>
                      </div>
                    )}

                    {filteredPresenceUsers.offlineList.map((u) => {
                      const presence = formatWhatsAppPresence(u.isOnline, u.lastSeen);
                      const lastSeenMs = parseDateMs(u.lastSeen);
                      const exactLastSeen = lastSeenMs ? new Date(lastSeenMs).toLocaleString() : 'Last seen unavailable';
                      const relLastSeen = lastSeenMs ? formatTimeAgo(u.lastSeen) : '';
                      return (
                        <div
                          key={u.uid}
                          onClick={() => navigate('creator', u.username)}
                          className="py-2.5 px-3 flex items-center justify-between gap-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#18181c] border border-transparent hover:border-slate-200/70 dark:hover:border-[#26262c] transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-xs overflow-hidden">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.displayName || u.username} className="w-full h-full object-cover opacity-90" />
                                ) : (
                                  getInitials(u.displayName || u.username || 'U')
                                )}
                              </div>
                              <span
                                title="Offline"
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slate-400 dark:bg-slate-600 ring-2 ring-white dark:ring-[#121215]"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {u.displayName || u.username || 'Unnamed User'}
                                </p>
                                {isUserVerified(u) && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                @{u.username}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-right" title={exactLastSeen}>
                            <div className="flex flex-col items-end">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#1e1e24] text-slate-600 dark:text-slate-300">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                {lastSeenMs ? presence.label : 'Offline · No recent activity'}
                              </span>
                              {relLastSeen && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 pr-1">
                                  {relLastSeen}
                                </span>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white" />
                          </div>
                        </div>
                      );
                    })}

                    {filteredPresenceUsers.combined.length === 0 && (
                      <div className="py-10 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                        {presenceFilter === 'online'
                          ? 'No users are currently online.'
                          : presenceFilter === 'offline'
                            ? 'No offline users match your filter.'
                            : 'No users found.'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Users */}
                  <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1f1f24] mb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Newest Creators</span>
                      </h3>
                      <button onClick={() => setActiveSection('users')} className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                        View All ({sortedUsers.length})
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-[#1f1f24] max-h-[380px] overflow-y-auto pr-1">
                      {newestCreators.map(u => {
                        const joinedLabel = formatTimeAgo(u.createdAt) || (parseDateMs(u.createdAt) ? formatShortDate(u.createdAt) : '');
                        return (
                          <div key={u.uid} className="py-3 flex items-center justify-between gap-2 group hover:bg-slate-50 dark:hover:bg-[#18181c] px-2 rounded-2xl transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 overflow-hidden shadow-xs">
                                {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : getInitials(u.displayName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{u.displayName || u.username}</p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  @{u.username}{joinedLabel ? ` • ${joinedLabel}` : ''}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => navigate('creator', u.username)} className="p-2 hover:bg-slate-200 dark:hover:bg-[#272727] text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all cursor-pointer shrink-0">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                      {newestCreators.length === 0 && (
                        <div className="py-10 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                          No registered creators found yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Reports */}
                  <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1f1f24] mb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span>Urgent Reports</span>
                      </h3>
                      <button onClick={() => setActiveSection('reports')} className="text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">
                        View All
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-[#1f1f24]">
                      {reports.filter(r => r.status === 'pending').slice(0, 5).map(r => (
                        <div key={r.reportId} className="py-3 space-y-1.5 hover:bg-slate-50 dark:hover:bg-[#18181c] p-2 rounded-2xl transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/40 px-2 py-0.5 rounded-full">
                              {r.reason}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold">{formatTimeAgo(r.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium line-clamp-1">{r.details || "No details provided"}</p>
                          <button onClick={() => setActiveSection('reports')} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Review report &rarr;</button>
                        </div>
                      ))}
                      {reports.filter(r => r.status === 'pending').length === 0 && (
                        <div className="py-10 text-center">
                          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60 animate-bounce" />
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">All caught up! No pending reports.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Newest Videos & Newest Clips on Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Newest Videos */}
                  <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1f1f24] mb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <VideoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Newest Videos</span>
                      </h3>
                      <button onClick={() => setActiveSection('videos')} className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                        View All ({sortedStandardVideos.length})
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-[#1f1f24] max-h-[380px] overflow-y-auto pr-1">
                      {newestVideos.map(v => {
                        const uploadedLabel = formatTimeAgo(v.createdAt) || (parseDateMs(v.createdAt) ? formatShortDate(v.createdAt) : '');
                        return (
                          <div
                            key={v.videoId}
                            onClick={() => navigate('watch', v.videoId)}
                            className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50 dark:hover:bg-[#18181c] px-2 rounded-2xl transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="relative w-20 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                {v.thumbnailUrl ? (
                                  <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Play className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {v.title || 'Untitled Video'}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate mt-0.5">
                                  <span className="truncate">@{v.creatorUsername || 'creator'}</span>
                                  {uploadedLabel && <span>• {uploadedLabel}</span>}
                                  <span>• {formatViews(v.viewsCount || 0)} views</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                v.status === 'published'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}>
                                {v.status}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('watch', v.videoId);
                                }}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#272727] text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {newestVideos.length === 0 && (
                        <div className="py-10 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                          No videos uploaded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Newest Clips */}
                  <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1f1f24] mb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Film className="w-4 h-4 text-rose-500" />
                        <span>Newest Clips</span>
                      </h3>
                      <button onClick={() => setActiveSection('videos')} className="text-[10px] font-black text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">
                        View All ({sortedClips.length})
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-[#1f1f24] max-h-[380px] overflow-y-auto pr-1">
                      {newestClips.map(clip => {
                        const uploadedLabel = formatTimeAgo(clip.createdAt) || (parseDateMs(clip.createdAt) ? formatShortDate(clip.createdAt) : '');
                        return (
                          <div
                            key={clip.videoId}
                            onClick={() => navigate('shorts', clip.videoId)}
                            className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50 dark:hover:bg-[#18181c] px-2 rounded-2xl transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="relative w-10 h-14 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                {clip.thumbnailUrl ? (
                                  <img src={clip.thumbnailUrl} alt={clip.title} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Film className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400">
                                  {clip.title || 'Untitled Clip'}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate mt-0.5">
                                  <span className="truncate">@{clip.creatorUsername || 'creator'}</span>
                                  {uploadedLabel && <span>• {uploadedLabel}</span>}
                                  <span>• {formatViews(clip.viewsCount || 0)} views</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                clip.status === 'published'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}>
                                {clip.status}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('shorts', clip.videoId);
                                }}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#272727] text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {newestClips.length === 0 && (
                        <div className="py-10 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                          No clips uploaded yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Section */}
            {activeSection === 'users' && (
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 dark:border-[#272727] flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Registered Accounts & Security Audits</h3>
                    <p className="text-xs text-slate-500 font-medium">Manage user accounts, credit wallet funds, and review password audit details.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1a1a1a] text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {filteredUsers.length} accounts
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-[#272727]">
                  {filteredUsers.map(u => {
                    const userStatus = u.status || 'active';
                    const userRole = String(u.role || 'user');
                    const isVerifiedCreator = isUserVerified(u);
                    const hasPendingVerification = !isVerifiedCreator && verificationRequests.some(r => r.userId === u.uid && r.status === 'pending');

                    return (
                      <div
                        key={u.uid}
                        className="p-4 sm:px-5 sm:py-4 hover:bg-slate-50/70 dark:hover:bg-[#1a1a1a]/60 transition-colors flex flex-col gap-3.5"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 min-w-0">
                          {/* User Identity */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {u.photoURL ? <img src={u.photoURL} alt={u.displayName || u.username || 'User'} className="w-full h-full object-cover" /> : getInitials(u.displayName || u.username || 'U')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[220px] sm:max-w-xs">
                                  {u.displayName || u.username || 'Unnamed User'}
                                </p>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${userStatus === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-red-50 text-[#800080] dark:bg-red-950/30'}`}>
                                  {userStatus}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#222] text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase">
                                  {userRole}
                                </span>
                                {isVerifiedCreator ? (
                                  <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#00A3FF] font-black text-[9px] inline-flex items-center gap-0.5" title="Verified Blue Tick">
                                    <CheckCircle2 className="w-2.5 h-2.5 fill-[#00A3FF] text-white" />
                                    Verified
                                  </span>
                                ) : hasPendingVerification ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSection('verification_requests');
                                      setVerificationFilter('pending');
                                      setVerificationSearch(u.username || '');
                                    }}
                                    className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 font-black text-[9px] cursor-pointer hover:underline inline-flex items-center gap-0.5"
                                    title="Verification request pending review"
                                  >
                                    <Clock className="w-2.5 h-2.5" />
                                    Review Req
                                  </button>
                                ) : null}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                @{u.username || 'user'}{u.email ? ` • ${u.email}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons — Always wrapped and inside viewport */}
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleMonetization(u.uid, u.isMonetized || false)}
                              className={`px-2.5 py-1.5 rounded-lg font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer border ${
                                u.isMonetized
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                              }`}
                              title="Click to instantly bypass criteria and toggle monetization"
                            >
                              {u.isMonetized ? '✓ Monetized' : 'Enable Monetization'}
                            </button>

                            {u.isMonetized ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setBonusModalUser(u);
                                  setBonusAmount(50);
                                  setBonusReason('Admin Promotion Bonus');
                                }}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-black shadow-xs cursor-pointer inline-flex items-center gap-1"
                                title="Add Admin Reward / Bonus Funds to monetized user"
                              >
                                <Gift className="w-3.5 h-3.5" />
                                <span>+ Reward (₹)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  addToast('Monetization Required: Enable monetization to award Admin Rewards to this creator.', 'info');
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer opacity-75 hover:opacity-100"
                                title="Admin Reward is only available for Monetized Users. Click Enable Monetization first."
                              >
                                <Gift className="w-3.5 h-3.5 text-slate-400" />
                                <span>Reward (Locked)</span>
                              </button>
                            )}

                            {u.isMonetized ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setWalletModalUser(u);
                                  setCreditAmount(10);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black shadow-xs cursor-pointer inline-flex items-center gap-1"
                                title="Give money to monetized user wallet"
                              >
                                <span>+ Wallet ($)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  addToast('Monetization Required: Enable monetization to credit user wallet balance.', 'info');
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer opacity-75 hover:opacity-100"
                                title="Wallet Credit is only available for Monetized Users. Click Enable Monetization first."
                              >
                                <span>Wallet (Locked)</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleUpdateUserStatus(u.uid, userStatus)}
                              className={`p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer ${userStatus === 'active' ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}
                              title={userStatus === 'active' ? 'Suspend User' : 'Activate User'}
                            >
                              {userStatus === 'active' ? <UserX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#800080] transition-colors cursor-pointer"
                              title="Delete user to 180-Day Trash Vault"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Secondary Account Metrics Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 border-t border-slate-100/80 dark:border-[#222] text-xs">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Wallet & Points</p>
                            <p className="font-mono font-black text-blue-600 dark:text-blue-400 mt-0.5">
                              ₹{(u.walletBalance || 0).toFixed(2)}
                              {(u.bonusBalance || 0) > 0 && (
                                <span className="ml-1.5 text-[10px] text-amber-500">+₹{(u.bonusBalance || 0).toFixed(2)}</span>
                              )}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 font-bold">{u.points || 0} pts</p>
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Channel Stats</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{u.videosCount || 0} videos</p>
                            <p className="text-[10px] text-slate-400">{u.followersCount || 0} followers</p>
                          </div>

                          <div className="col-span-2 sm:col-span-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Security Audit</p>
                            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                              {u.lastPasswordChangedAt
                                ? `Password changed: ${new Date(u.lastPasswordChangedAt).toLocaleDateString()}`
                                : 'No recent password change'}
                            </p>
                            <p className="text-[10px] text-slate-400">Joined {formatShortDate(u.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="py-12 text-center text-xs font-bold text-slate-400">
                      No matching user accounts found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Videos Section */}
            {activeSection === 'videos' && (
              <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#1a1a1a] text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-[#272727]">
                      <th className="px-6 py-4">Video</th>
                      <th className="px-6 py-4">Creator</th>
                      <th className="px-6 py-4">Stats</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#272727]">
                    {filteredVideos.map(v => (
                      <tr key={v.videoId} className="text-xs hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 aspect-video rounded bg-slate-200 dark:bg-[#272727] shrink-0 overflow-hidden">
                              <img src={v.thumbnailUrl} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{v.title}</p>
                              <p className="text-[10px] text-slate-500">{v.category} • {v.visibility}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400">@{v.creatorUsername}</td>
                        <td className="px-6 py-4 text-slate-500">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold">{formatViews(v.viewsCount)} views</span>
                            <span className="text-[10px]">{v.likesCount} likes</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${v.status === 'published' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => setCaptionEditorVideo(v)}
                            className="p-2 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg text-[#800080] transition-colors cursor-pointer"
                            title="Manage Video Captions & Subtitles (सबटाइटल्स जोड़ें)"
                          >
                            <Subtitles className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleUpdateVideoStatus(v.videoId, v.status)}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-[#272727] rounded-lg text-amber-500"
                            title={v.status === 'published' ? 'Hide Video' : 'Publish Video'}
                          >
                            {v.status === 'published' ? <EyeOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => setVideoToDelete(v)}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-[#800080] transition-colors"
                            title="Delete Video Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => navigate('watch', v.videoId)} className="p-2 hover:bg-slate-50 dark:hover:bg-[#272727] rounded-lg text-slate-400">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* WITHDRAWAL REQUESTS & PAYOUT QUEUE SECTION */}
            {activeSection === 'withdrawals' && (
              <div className="space-y-6">
                
                {/* Header Card */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="relative z-10 space-y-2 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Payouts & UPI Settlement</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      Creator Withdrawal Requests & UPI Settlement
                    </h2>
                    <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                      Review user payout requests, send money via Paytm / PhonePe / GooglePay UPI to the user&apos;s UPI ID, and click the <strong>Tick (✓)</strong> button to confirm payment.
                    </p>
                  </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-[#0f0f0f] border-2 border-amber-500/40 p-5 rounded-2xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Payouts</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                        {withdrawalRequests.filter(r => r.status === 'pending').length} Requests
                      </span>
                    </div>
                    <p className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
                      ₹{withdrawalRequests.filter(r => r.status === 'pending').reduce((acc, r) => acc + (r.amount || 0), 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">Awaiting your Paytm / UPI transfer</p>
                  </div>

                  <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] p-5 rounded-2xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Settled (Paid)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                        {withdrawalRequests.filter(r => r.status === 'completed').length} Paid
                      </span>
                    </div>
                    <p className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{withdrawalRequests.filter(r => r.status === 'completed').reduce((acc, r) => acc + (r.amount || 0), 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">Successfully disbursed to creators</p>
                  </div>

                  <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] p-5 rounded-2xl shadow-xs space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Lifetime Requests</span>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{withdrawalRequests.length}</p>
                    <p className="text-[10px] font-bold text-slate-400">All creator withdrawal attempts</p>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#151515] rounded-xl">
                    {(['all', 'pending', 'completed', 'rejected'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setWithdrawalFilter(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          withdrawalFilter === tab
                            ? 'bg-white dark:bg-[#252525] text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tab} ({withdrawalRequests.filter(r => tab === 'all' ? true : r.status === tab).length})
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      payoutService.getWithdrawalRequests().then(setWithdrawalRequests);
                      addToast('Withdrawal queue refreshed.', 'info');
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#252525] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Queue</span>
                  </button>
                </div>

                {/* Withdrawal Requests Table */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl overflow-hidden shadow-xs">
                  {withdrawalRequests.filter(r => withdrawalFilter === 'all' ? true : r.status === withdrawalFilter).length === 0 ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <DollarSign className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-bold">No withdrawal requests found under &quot;{withdrawalFilter}&quot;.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-[#272727] text-slate-400 text-[10px] uppercase font-black tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Creator / User</th>
                            <th className="px-6 py-4">Amount to Pay</th>
                            <th className="px-6 py-4">UPI Payment ID</th>
                            <th className="px-6 py-4">Requested At</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Admin Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#202020]">
                          {withdrawalRequests
                            .filter(r => withdrawalFilter === 'all' ? true : r.status === withdrawalFilter)
                            .map((req) => (
                              <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-[#151515]/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                      {req.userPhotoURL ? <img src={req.userPhotoURL} className="w-full h-full object-cover" /> : getInitials(req.displayName)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 dark:text-white truncate">{req.displayName}</p>
                                      <p className="text-[10px] text-slate-500 truncate">@{req.username} • {req.userEmail}</p>
                                      {req.phone && (
                                        <p className="text-[9px] font-mono text-slate-400">📞 {req.phone}</p>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                    ₹{req.amount.toFixed(2)}
                                  </p>
                                </td>

                                <td className="px-6 py-4">
                                  <div className="space-y-1">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-lg">
                                      <span className="font-mono font-black text-slate-900 dark:text-white select-all text-xs">
                                        {req.upiId}
                                      </span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(req.upiId);
                                          addToast(`Copied UPI ID: ${req.upiId}`, 'info');
                                        }}
                                        className="text-slate-400 hover:text-blue-500 cursor-pointer"
                                        title="Copy UPI ID"
                                      >
                                        📋
                                      </button>
                                    </div>
                                    {req.accountHolderName && (
                                      <p className="text-[10px] text-slate-500">Name: <strong className="text-slate-700 dark:text-slate-300">{req.accountHolderName}</strong></p>
                                    )}
                                  </div>
                                </td>

                                <td className="px-6 py-4 text-slate-500">
                                  <p className="font-medium text-slate-700 dark:text-slate-300">
                                    {new Date(req.createdAt).toLocaleDateString()}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </td>

                                <td className="px-6 py-4">
                                  {req.status === 'pending' && (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                      ⏳ Pending Transfer
                                    </span>
                                  )}
                                  {req.status === 'completed' && (
                                    <div className="space-y-0.5">
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                        ✓ Paid (Settled)
                                      </span>
                                      {req.paidAt && (
                                        <p className="text-[9px] text-slate-400 font-mono">
                                          {new Date(req.paidAt).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {req.status === 'rejected' && (
                                    <div className="space-y-0.5">
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-[#800080] dark:bg-rose-950/40 dark:text-[#800080]">
                                        ✕ Rejected & Refunded
                                      </span>
                                      {req.adminNotes && (
                                        <p className="text-[9px] text-[#800080] font-medium truncate max-w-xs">{req.adminNotes}</p>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td className="px-6 py-4 text-right">
                                  <div className="inline-flex items-center justify-end gap-2">
                                    {req.status === 'pending' ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenApproveModal(req)}
                                          disabled={isProcessingPayoutId === req.id}
                                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                          title="Click after transferring money via Paytm / UPI"
                                        >
                                          {isProcessingPayoutId === req.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Check className="w-4 h-4 stroke-[3]" />
                                          )}
                                          <span>Tick (Mark as Paid)</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenRejectModal(req)}
                                          disabled={isProcessingPayoutId === req.id}
                                          className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-[#800080] dark:text-[#800080] font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                          title="Reject and refund money to user balance"
                                        >
                                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                          <span>Reject</span>
                                        </button>
                                      </>
                                    ) : req.status === 'completed' ? (
                                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mr-2">
                                        ✓ Settled
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-bold text-slate-400 mr-2">
                                        Refunded
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteWithdrawalRequest(req)}
                                      className="p-1.5 text-slate-400 hover:text-[#800080] hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                                      title="Permanently delete test or fake request"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Paid Videos & Earnings Oversight Section */}
            {activeSection === 'paid_videos' && (
              <div className="space-y-6">
                
                {/* Header Card */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="relative z-10 space-y-2 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Platform Monetization & Paid Videos</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      Paid Videos & Creator Revenue Oversight
                    </h2>
                    <p className="text-xs sm:text-sm text-white/90 font-medium">
                      Monitor all paid video content, track viewer purchases, and oversee creator wallet earnings across SocialIndia.
                    </p>
                  </div>
                </div>

                {/* 4 Overview Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] p-5 rounded-2xl shadow-xs space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Paid Videos</span>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{paidVideosList.length}</p>
                    <p className="text-[10px] font-bold text-slate-400">Published with access price</p>
                  </div>

                  <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] p-5 rounded-2xl shadow-xs space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Unlocks Completed</span>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {purchasesList.length}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">Viewer wallet transactions</p>
                  </div>

                  <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] p-5 rounded-2xl shadow-xs space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Volume Generated</span>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{purchasesList.reduce((acc, curr) => acc + (curr.amount || 0), 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">Transferred to creator wallets</p>
                  </div>

                  <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] p-5 rounded-2xl shadow-xs space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Monetized Channels</span>
                    <p className="text-2xl font-black text-[#800080] dark:text-[#800080]">
                      {users.filter(u => u.isMonetized).length}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">Approved for paid content</p>
                  </div>
                </div>

                {/* Table 1: All Available Paid Videos */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-100 dark:border-[#272727] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Available Paid Videos
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">All videos charging an unlock fee</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-full text-xs font-black">
                      {paidVideosList.length} Active Paid Videos
                    </span>
                  </div>

                  {loadingPaidVideos ? (
                    <div className="py-12 flex justify-center items-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                      <span>Loading paid videos...</span>
                    </div>
                  ) : paidVideosList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-bold">
                      No paid videos published yet on the platform.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-[#1a1a1a] text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-[#272727]">
                            <th className="px-6 py-4">Video</th>
                            <th className="px-6 py-4">Creator</th>
                            <th className="px-6 py-4">Price</th>
                            <th className="px-6 py-4">Sales / Unlocks</th>
                            <th className="px-6 py-4">Total Revenue</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#272727]">
                          {paidVideosList.map((v) => (
                            <tr key={v.videoId} className="text-xs hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-16 aspect-video rounded bg-slate-200 dark:bg-[#272727] shrink-0 overflow-hidden">
                                    <img src={v.thumbnailUrl} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0 max-w-xs">
                                    <p className="font-bold text-slate-900 dark:text-white truncate">{v.title}</p>
                                    <p className="text-[10px] text-slate-500">{v.category} • {formatViews(v.viewsCount)} views</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                @{v.creatorUsername}
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                  ₹{(v.price || 0).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                {v.paidSalesCount || 0} unlocks
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                  ₹{(v.paidEarnings || 0).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button
                                  onClick={() => navigate(v.isShort ? 'shorts' : 'watch', v.videoId)}
                                  className="p-2 hover:bg-slate-50 dark:hover:bg-[#272727] rounded-lg text-blue-600 cursor-pointer"
                                  title="Watch Video"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Table 2: Real-time Purchases Ledger */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-100 dark:border-[#272727] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Platform Video Purchases & Unlocks Ledger
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">Real-time purchase transactions across all users</p>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">{purchasesList.length} Total Unlocks</span>
                  </div>

                  {purchasesList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-bold">
                      No video purchase transactions recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-[#1a1a1a] text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-[#272727]">
                            <th className="px-6 py-4">Buyer</th>
                            <th className="px-6 py-4">Video Unlocked</th>
                            <th className="px-6 py-4">Creator Credited</th>
                            <th className="px-6 py-4">Method</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#272727]">
                          {purchasesList.map((p) => (
                            <tr key={p.purchaseId} className="text-xs hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/50">
                              <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                @{p.username}
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300 max-w-xs truncate">
                                {p.videoTitle}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400">
                                @{p.creatorUsername}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                                  {p.paidWith === 'bonus' ? 'Bonus Money' : p.paidWith === 'hybrid' ? 'Wallet + Bonus' : 'Wallet Balance'}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                ₹{p.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-right text-slate-400 text-[11px]">
                                {new Date(p.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Reports Section */}
            {activeSection === 'reports' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map(r => (
                  <div key={r.reportId} className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-5 space-y-4 shadow-sm relative overflow-hidden">
                    {r.status === 'pending' && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
                    
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{r.targetType} Report</span>
                        <h4 className="text-xs font-black text-amber-600 uppercase tracking-tight">{r.reason}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${r.status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'}`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#1a1a1a] rounded-xl p-3">
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                        "{r.details || "No further details provided."}"
                      </p>
                    </div>

                    {r.targetType === 'video' && (
                      <button
                        type="button"
                        onClick={() => navigate('watch', r.targetId)}
                        className="w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                      >
                        {videos.find(video => video.videoId === r.targetId)?.thumbnailUrl && (
                          <img
                            src={videos.find(video => video.videoId === r.targetId)?.thumbnailUrl}
                            alt=""
                            className="aspect-video w-full object-cover"
                          />
                        )}
                        <span className="block px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                          View reported video: {videos.find(video => video.videoId === r.targetId)?.title || r.targetTitle || r.targetId}
                        </span>
                      </button>
                    )}

                    <div className="pt-2 flex flex-col gap-1 text-[10px] text-slate-500 font-bold">
                      <div className="flex justify-between">
                        <span>Reporter ID</span>
                        <span className="text-slate-900 dark:text-white truncate max-w-[120px]">{r.reporterId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target ID</span>
                        <span className="text-slate-900 dark:text-white truncate max-w-[120px]">{r.targetId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Submitted</span>
                        <span className="text-slate-900 dark:text-white">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {r.adminResponse && (
                      <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                        Last update sent: {r.adminResponse}
                      </p>
                    )}
                    <div className="space-y-2">
                      <textarea
                        value={reportMessages[r.reportId] || ''}
                        onChange={event => setReportMessages(prev => ({
                          ...prev,
                          [r.reportId]: event.target.value
                        }))}
                        rows={2}
                        placeholder="Write an update for the person who submitted this report"
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendReportUpdate(r)}
                        disabled={!reportMessages[r.reportId]?.trim() || sendingReportUpdateId === r.reportId}
                        className="w-full rounded-xl bg-blue-600 py-2 text-[11px] font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        {sendingReportUpdateId === r.reportId ? 'Sending update…' : 'Send update to reporter'}
                      </button>
                    </div>

                    <div className="pt-4 flex gap-2">
                      <button 
                        onClick={() => handleReportUpdate(r, 'resolved')}
                        disabled={r.status === 'resolved'}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl transition-colors"
                      >
                        Resolve
                      </button>
                      <button 
                        onClick={() => handleReportUpdate(r, 'reviewed')}
                        disabled={r.status === 'reviewed' || r.status === 'resolved'}
                        className="flex-1 py-2 bg-slate-100 dark:bg-[#272727] hover:bg-slate-200 dark:hover:bg-[#333] disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}

                {reports.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white dark:bg-[#0f0f0f] border border-dashed border-slate-300 dark:border-[#272727] rounded-3xl">
                    <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-black text-slate-400">System Clean</h4>
                    <p className="text-xs text-slate-400">No reports have been submitted yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Section */}
            {activeSection === 'grievances' && <GrievanceManagement />}

            {/* Help Requests & Feedback Section */}
            {(activeSection === 'feedback' || activeSection === 'help_requests') && (() => {
              const isHelpTab = activeSection === 'help_requests';
              const visibleItems = feedback.filter(item => {
                if (isHelpTab) return item.type === 'help';
                if (feedbackFilter === 'help') return item.type === 'help';
                if (feedbackFilter === 'feedback') return item.type !== 'help';
                if (feedbackFilter === 'pending') return item.status === 'pending';
                return true;
              });

              return (
                <div className="space-y-5">
                  {!isHelpTab && (
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: 'all', label: `All (${feedback.length})` },
                        { id: 'feedback', label: `User Feedback (${feedback.filter(f => f.type !== 'help').length})` },
                        { id: 'help', label: `Help Requests (${feedback.filter(f => f.type === 'help').length})` },
                        { id: 'pending', label: `Pending (${feedback.filter(f => f.status === 'pending').length})` },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setFeedbackFilter(tab.id as any)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                            feedbackFilter === tab.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-[#0f0f0f] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#272727] hover:bg-slate-50 dark:hover:bg-[#1a1a1a]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleItems.map(f => {
                      const isHelp = f.type === 'help';
                      const helpDetails = isHelp ? parseHelpDetails(f) : null;
                      const canNotifyUser = isRegisteredFeedbackUser(f.uid);

                      return (
                        <div key={f.id} className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-5 space-y-4 shadow-sm relative overflow-hidden flex flex-col">
                          {f.status === 'pending' && <div className={`absolute top-0 left-0 w-1 h-full ${isHelp ? 'bg-blue-500' : 'bg-indigo-500'}`} />}

                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                  isHelp
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {isHelp ? 'Help Request' : 'User Feedback'}
                                </span>
                                {helpDetails?.category && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                    {helpDetails.category}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight break-words">
                                {helpDetails ? helpDetails.cleanSubject : f.subject}
                              </h4>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${f.status === 'pending' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'}`}>
                              {f.status}
                            </span>
                          </div>

                          {isHelp && helpDetails ? (
                            <div className="space-y-2.5">
                              {helpDetails.email && (
                                <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl px-3 py-2 text-[11px]">
                                  <span className="font-bold text-slate-500">Email</span>
                                  <a
                                    href={`mailto:${helpDetails.email}`}
                                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
                                  >
                                    {helpDetails.email}
                                  </a>
                                </div>
                              )}
                              <div className="bg-slate-50 dark:bg-[#1a1a1a] rounded-xl p-3 space-y-1">
                                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  Detailed Description
                                </span>
                                <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap break-words">
                                  {helpDetails.detailedDescription}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 dark:bg-[#1a1a1a] rounded-xl p-3 space-y-1">
                              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Feedback Description
                              </span>
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap break-words">
                                {f.message}
                              </p>
                            </div>
                          )}

                          {(() => {
                            const shots = (f.screenshotUrls && f.screenshotUrls.length > 0)
                              ? f.screenshotUrls
                              : f.screenshotUrl
                                ? [f.screenshotUrl]
                                : [];
                            if (shots.length === 0) return null;
                            return (
                              <div className="grid grid-cols-3 gap-2">
                                {shots.map((shotUrl, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setPreviewFeedbackImage(shotUrl)}
                                    className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-video hover:opacity-90 transition-opacity cursor-pointer"
                                    title="Click to enlarge screenshot"
                                  >
                                    <img
                                      src={shotUrl}
                                      alt={`Attachment ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            );
                          })()}

                          <div className="pt-1 flex flex-col gap-1 text-[10px] text-slate-500 font-bold">
                            <div className="flex justify-between gap-2">
                              <span>User</span>
                              <span className="text-slate-900 dark:text-white truncate max-w-[160px]">
                                {f.userDisplayName ? `${f.userDisplayName} (@${f.username})` : `@${f.username}`}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Account</span>
                              <span className={canNotifyUser ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                {canNotifyUser ? 'Signed-in (Notifications enabled)' : 'Guest submission'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Submitted</span>
                              <span className="text-slate-900 dark:text-white">{new Date(f.createdAt).toLocaleString()}</span>
                            </div>
                          </div>

                          {f.adminReply && (
                            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                <span>Reply Sent (Notification)</span>
                                {f.repliedAt && <span>{new Date(f.repliedAt).toLocaleDateString()}</span>}
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed break-words">{f.adminReply}</p>
                            </div>
                          )}

                          <div className="space-y-2 pt-1 mt-auto">
                            <textarea
                              value={(f.id && feedbackReplies[f.id]) || ''}
                              onChange={(e) => {
                                if (!f.id) return;
                                const val = e.target.value;
                                setFeedbackReplies(prev => ({ ...prev, [f.id!]: val }));
                              }}
                              rows={2}
                              placeholder={
                                canNotifyUser
                                  ? 'Write a reply to send directly to this user’s Notifications...'
                                  : 'Write a note (guest submission — cannot deliver in-app notification)'
                              }
                              className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSendFeedbackReply(f)}
                              disabled={!f.id || !feedbackReplies[f.id]?.trim() || sendingFeedbackReplyId === f.id}
                              className="w-full rounded-xl bg-blue-600 py-2 text-[11px] font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>
                                {sendingFeedbackReplyId === f.id
                                  ? 'Sending reply…'
                                  : canNotifyUser
                                    ? 'Send reply via Notification'
                                    : 'Save reply'}
                              </span>
                            </button>
                          </div>

                          <div className="pt-2 flex gap-2">
                            <button 
                              onClick={() => handleResolveFeedback(f, 'resolved')}
                              disabled={f.status === 'resolved'}
                              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                            >
                              Resolve
                            </button>
                            <button 
                              onClick={() => handleResolveFeedback(f, 'reviewed')}
                              disabled={f.status === 'reviewed' || f.status === 'resolved'}
                              className="flex-1 py-2 bg-slate-100 dark:bg-[#272727] hover:bg-slate-200 dark:hover:bg-[#333] disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                            >
                              Acknowledge
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {visibleItems.length === 0 && (
                      <div className="col-span-full py-20 text-center bg-white dark:bg-[#0f0f0f] border border-dashed border-slate-300 dark:border-[#272727] rounded-3xl">
                        <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-black text-slate-400">Inbox Clear</h4>
                        <p className="text-xs text-slate-400">
                          {isHelpTab ? 'No help requests yet.' : 'No feedback or help requests match this filter.'}
                        </p>
                      </div>
                    )}

                    {previewFeedbackImage && (
                      <div
                        onClick={() => setPreviewFeedbackImage(null)}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
                      >
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="relative max-w-3xl w-full bg-slate-950 rounded-2xl border border-slate-700 p-2 shadow-2xl"
                        >
                          <button
                            type="button"
                            onClick={() => setPreviewFeedbackImage(null)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer"
                            aria-label="Close preview"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <img
                            src={previewFeedbackImage}
                            alt="Feedback screenshot preview"
                            className="w-full max-h-[80vh] object-contain rounded-xl"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* CLOUD STORAGE MANAGEMENT SECTION */}
            {activeSection === 'storage' && (() => {
              const getVideoAssetMetrics = (v: Video) => {
                const durationSec = safeFiniteDuration(v.duration);
                const isExternal = isExternalEmbedUrl(v.videoUrl) || (!isPlatformHostedMediaUrl(v.videoUrl) && Boolean(v.videoUrl));

                let videoBytes = 0;
                let isExactVideoSize = true;

                if (!isExternal && v.videoUrl) {
                  if (typeof v.fileSizeBytes === 'number' && Number.isFinite(v.fileSizeBytes) && v.fileSizeBytes > 0) {
                    videoBytes = Math.round(v.fileSizeBytes);
                  } else if (probedMediaBytes[v.videoUrl] && probedMediaBytes[v.videoUrl] > 0) {
                    videoBytes = probedMediaBytes[v.videoUrl];
                  } else {
                    isExactVideoSize = false;
                    // Conservative finite bitrate estimate only when CORS/HEAD size unavailable
                    videoBytes = durationSec > 0 ? Math.round((durationSec / 60) * 2.2 * 1024 * 1024) : 0;
                  }
                }

                let thumbBytes = 0;
                if (v.thumbnailUrl && isPlatformHostedMediaUrl(v.thumbnailUrl)) {
                  if (probedMediaBytes[v.thumbnailUrl] && probedMediaBytes[v.thumbnailUrl] > 0) {
                    thumbBytes = probedMediaBytes[v.thumbnailUrl];
                  } else {
                    thumbBytes = 180 * 1024;
                  }
                }

                return {
                  video: v,
                  durationSec,
                  isExternal,
                  videoBytes,
                  thumbBytes,
                  totalBytes: videoBytes + thumbBytes,
                  isExactVideoSize
                };
              };

              const assetMetrics = videos.map(getVideoAssetMetrics);
              const hostedAssets = assetMetrics.filter(a => !a.isExternal);
              const externalEmbedCount = assetMetrics.filter(a => a.isExternal).length;
              const hostedLongAssets = hostedAssets.filter(a => !a.video.isShort);
              const hostedShortAssets = hostedAssets.filter(a => a.video.isShort);

              const totalSeconds = assetMetrics.reduce((acc, a) => acc + a.durationSec, 0);
              const totalHours = (totalSeconds / 3600).toFixed(1);
              const totalMins = Math.round(totalSeconds / 60);

              const longBytes = hostedLongAssets.reduce((acc, a) => acc + a.videoBytes, 0);
              const shortBytes = hostedShortAssets.reduce((acc, a) => acc + a.videoBytes, 0);
              const thumbBytes = assetMetrics.reduce((acc, a) => acc + a.thumbBytes, 0);
              const totalBytes = longBytes + shortBytes + thumbBytes;
              const totalMB = Number((totalBytes / (1024 * 1024)).toFixed(1));
              const exactVerifiedCount = hostedAssets.filter(a => a.isExactVideoSize).length;

              const freeQuotaGB = 25; // Cloudinary free tier 25GB
              const quotaBytes = freeQuotaGB * 1024 * 1024 * 1024;
              const quotaUsedPercent = totalBytes > 0
                ? Math.min(100, Number(((totalBytes / quotaBytes) * 100).toFixed(3)))
                : 0;

              const topVideos = [...assetMetrics]
                .sort((a, b) => b.totalBytes - a.totalBytes || b.durationSec - a.durationSec)
                .slice(0, 6);

              return (
              <div className="space-y-6 max-w-4xl">
                {/* Real Storage Analytics Header */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                          <Activity className="w-3.5 h-3.5" />
                          <span>Live CDN & Firestore Media Storage</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStorageProbeNonce(n => n + 1)}
                          disabled={isProbingStorage}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold cursor-pointer transition-colors disabled:opacity-60"
                          title="Re-check real Content-Length headers from Media CDN / Cloud Storage"
                        >
                          <RefreshCw className={`w-3 h-3 ${isProbingStorage ? 'animate-spin' : ''}`} />
                          <span>{isProbingStorage ? 'Checking CDN sizes...' : 'Verify Live Sizes'}</span>
                        </button>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black">Platform Real Storage Metrics</h2>
                      <p className="text-xs text-white/75 max-w-xl font-medium">
                        {hostedAssets.length > 0
                          ? `Measured from ${exactVerifiedCount}/${hostedAssets.length} verified CDN media files (${externalEmbedCount} external embed links use 0 MB CDN).`
                          : `${externalEmbedCount} external embed videos (Drive / Stream) • 0 MB platform CDN storage consumed.`}
                      </p>
                    </div>

                    <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shrink-0 text-left sm:text-right">
                      <p className="text-[10px] uppercase font-black tracking-wider text-cyan-300">Total CDN Storage Used</p>
                      <p className="text-2xl font-black font-mono mt-0.5">
                        {formatStorageBytes(totalBytes)}
                      </p>
                      <p className="text-[10px] text-white/70">of {freeQuotaGB} GB CDN Free Tier</p>
                    </div>
                  </div>

                  {/* Quota Progress Bar */}
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-[11px] font-bold flex-wrap gap-2">
                      <span className="text-cyan-200">Storage Capacity Utilized: {quotaUsedPercent}%</span>
                      <span className="text-white/80">{totalMB} MB / {freeQuotaGB * 1024} MB ({freeQuotaGB} GB)</span>
                    </div>
                    <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden p-0.5 backdrop-blur-sm">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${totalBytes > 0 ? Math.max(2, quotaUsedPercent) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* 4 Storage Breakdown Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 pt-2">
                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                      <p className="text-[10px] font-black uppercase text-cyan-200">Hosted Videos</p>
                      <p className="text-lg font-black mt-0.5">{hostedLongAssets.length} files</p>
                      <p className="text-[10px] text-white/70 font-mono">{formatStorageBytes(longBytes)}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                      <p className="text-[10px] font-black uppercase text-cyan-200">Hosted Clips</p>
                      <p className="text-lg font-black mt-0.5">{hostedShortAssets.length} files</p>
                      <p className="text-[10px] text-white/70 font-mono">{formatStorageBytes(shortBytes)}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                      <p className="text-[10px] font-black uppercase text-cyan-200">CDN Posters</p>
                      <p className="text-lg font-black mt-0.5">{assetMetrics.filter(a => a.thumbBytes > 0).length} files</p>
                      <p className="text-[10px] text-white/70 font-mono">{formatStorageBytes(thumbBytes)}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                      <p className="text-[10px] font-black uppercase text-cyan-200">Total Playtime</p>
                      <p className="text-lg font-black mt-0.5">{totalHours} hrs</p>
                      <p className="text-[10px] text-white/70">{totalMins} mins • {externalEmbedCount} external</p>
                    </div>
                  </div>
                </div>

                {/* Top Media Files in Database */}
                {topVideos.length > 0 && (
                  <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                          <Film className="w-4 h-4 text-blue-600" />
                          <span>Top Storage-Consuming Media Assets</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Actual uploaded file sizes from Media CDN / Cloud Storage (external embeds count as 0 MB).</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{topVideos.length} listed</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {topVideos.map((asset, idx) => {
                        const vid = asset.video;
                        return (
                        <div key={vid.videoId || idx} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <img 
                              src={vid.thumbnailUrl} 
                              alt={vid.title} 
                              className="w-14 h-9 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-800" 
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-sm">{vid.title}</p>
                              <p className="text-[10px] text-slate-400">
                                @{vid.creatorUsername || 'creator'} • {vid.isShort ? 'Clip' : 'Video'} • {Math.floor(asset.durationSec / 60)}m {asset.durationSec % 60}s
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              asset.isExternal
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                : asset.isExactVideoSize
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                            }`}>
                              {asset.isExternal ? 'External' : asset.isExactVideoSize ? 'Exact' : 'Est.'}
                            </span>
                            <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">
                              {asset.isExternal ? '0 MB CDN' : `${asset.isExactVideoSize ? '' : '~'}${formatStorageBytes(asset.totalBytes)}`}
                            </span>
                            <a
                              href={`/#/watch/${vid.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-[#202020] transition-colors"
                              title="Inspect video"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Status Card */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 sm:p-8 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-[#272727]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shadow-sm">
                        <Cloud className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Cloud Storage & CDN Settings</h3>
                        <p className="text-xs text-slate-500 font-medium">Global Media Cloud CDN credentials for all platform video and thumbnail uploads.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {cloudName && uploadPreset ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Active & Configured</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                          <AlertCircle className="w-4 h-4" />
                          <span>Setup Required</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSaveStorage} className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-blue-600" />
                          <span>Media Account ID *</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. si_media_id"
                          value={cloudName}
                          onChange={(e) => setCloudName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
                          required
                        />
                        <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                          Found in your Media Cloud CDN dashboard home screen.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-blue-600" />
                          <span>Upload Profile (Unsigned) *</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. socialindia_preset"
                          value={uploadPreset}
                          onChange={(e) => setUploadPreset(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
                          required
                        />
                        <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                          Must be configured with Signing Mode = "Unsigned".
                        </p>
                      </div>
                    </div>

                    {storageUpdatedAt && (
                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <span>Last updated by admin on: {new Date(storageUpdatedAt).toLocaleString()}</span>
                      </p>
                    )}

                    {/* Test Result Message */}
                    {storageTestStatus !== 'idle' && (
                      <div className={`p-4 rounded-2xl text-xs font-bold flex items-start gap-3 border ${
                        storageTestStatus === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-[#800080] dark:text-[#800080]'
                      }`}>
                        {storageTestStatus === 'success' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-[#800080] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-black">{storageTestStatus === 'success' ? 'Verification Passed' : 'Verification Failed'}</p>
                          <p className="text-[11px] font-medium mt-0.5">{storageTestMessage}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSavingStorage}
                        className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingStorage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>Save Global Storage Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTestStorageConnection}
                        disabled={isTestingStorage || !cloudName.trim() || !uploadPreset.trim()}
                        className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 dark:bg-[#1f1f1f] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] text-slate-800 dark:text-slate-200 text-xs font-black rounded-2xl transition-all border border-slate-200 dark:border-[#333] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isTestingStorage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        <span>Test Connection</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Free Setup Guide */}
                <div className="bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 sm:p-7 space-y-4">
                  <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-black uppercase tracking-wider">How Media Cloud CDN Setup Works (1-Minute Guide)</h4>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Saving these credentials here securely stores them in the database. When creators upload videos or thumbnails from anywhere on the platform (Studio or Homepage), their uploads will automatically use this storage without asking them for any keys.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#272727] rounded-2xl space-y-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-black text-xs flex items-center justify-center">1</div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">Create Storage Account</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Use your Media Cloud CDN provider account (25GB free CDN storage & bandwidth).
                      </p>
                    </div>

                    <div className="p-4 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#272727] rounded-2xl space-y-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-black text-xs flex items-center justify-center">2</div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">Copy Account ID</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        On your Media Cloud CDN dashboard home, copy your unique <strong className="font-bold text-slate-700 dark:text-slate-300">"Account / Cloud ID"</strong>.
                      </p>
                    </div>

                    <div className="p-4 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#272727] rounded-2xl space-y-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-black text-xs flex items-center justify-center">3</div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">Create Unsigned Profile</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Go to <strong className="font-bold text-slate-700 dark:text-slate-300">Settings ➔ Upload ➔ Add upload profile</strong>. Set Signing Mode to <strong className="font-bold text-slate-700 dark:text-slate-300">"Unsigned"</strong>, save, and paste profile name above.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    <strong className="font-black text-blue-700 dark:text-blue-400">Videos &gt; 100 MB (Up to 2 GB):</strong> Videos larger than 20 MB are automatically streamed to the Media CDN in 20 MB chunks with auto-retry. If your CDN tier has a 100 MB/video cap, videos above 100 MB automatically fall back to secondary cloud storage so creators never get blocked.
                  </div>
                </div>
              </div>
              );
            })()}

            {/* TRASH & 180-DAY COMPLIANCE VAULT SECTION */}
            {activeSection === 'trash' && (
              <div className="space-y-6">
                {/* Legal Compliance Banner */}
                <div className="bg-linear-to-r from-slate-900 to-slate-800 dark:from-[#161616] dark:to-[#1f1f1f] text-white p-6 rounded-3xl border border-slate-700 shadow-md space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-[#800080] border border-rose-500/30 flex items-center justify-center font-bold">
                        <Archive className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black">Indian IT Rules 2021 Compliance Vault</h3>
                        <p className="text-xs text-slate-400">Rule 3(1)(h) 180-Day Legal Data Retention & Instant Recovery Hub</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-950/60 text-emerald-400 border border-emerald-700/50 rounded-full text-[10px] font-black tracking-wider uppercase">
                      180 Days Active Protection
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Whenever a creator or admin deletes a video, Clip, or account, it is moved here to the Compliance Vault. Metadata and media links are securely held for 180 days before permanent purging. If anything was deleted by mistake, you can <strong className="text-emerald-400 font-bold">Resume / Restore</strong> it back to the active platform with 1 click.
                  </p>
                </div>

                {/* Sub Filters & Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-2xl shadow-xs overflow-x-auto w-full sm:w-auto">
                    {[
                      { id: 'all', label: `All (${trashItems.length})`, icon: Layers },
                      { id: 'video', label: `Videos (${trashItems.filter(t => t.itemType === 'video').length})`, icon: VideoIcon },
                      { id: 'short', label: `Clips (${trashItems.filter(t => t.itemType === 'short').length})`, icon: Zap },
                      { id: 'user', label: `Accounts (${trashItems.filter(t => t.itemType === 'user').length})`, icon: Users },
                    ].map(f => {
                      const Icon = f.icon;
                      const isSelected = trashSubFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setTrashSubFilter(f.id as any)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            isSelected 
                              ? 'bg-rose-600 text-white shadow-md' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272727]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trash Items Table */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-[#1a1a1a] text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-[#272727]">
                        <th className="px-6 py-4">Item & Title</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Deleted Date</th>
                        <th className="px-6 py-4">180-Day Vault Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#272727]">
                      {trashItems
                        .filter(t => trashSubFilter === 'all' || t.itemType === trashSubFilter)
                        .filter(t => (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (t.subtitle || '').toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((item) => {
                          const daysLeft = trashService.getDaysRemaining(item.scheduledPurgeDate);
                          const isRestored = item.status === 'restored';
                          return (
                            <tr key={item.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-14 aspect-video rounded-lg overflow-hidden bg-slate-200 dark:bg-[#272727] shrink-0 border border-slate-200 dark:border-[#333]">
                                    {item.thumbnailUrl ? (
                                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                                    ) : item.photoURL ? (
                                      <img src={item.photoURL} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-[10px]">
                                        {String(item.itemType || 'item').toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 max-w-xs">
                                    <p className="font-black text-slate-900 dark:text-white truncate">{item.title}</p>
                                    <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">{item.subtitle || `ID: ${item.itemId}`}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                  item.itemType === 'video' 
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' 
                                    : item.itemType === 'short' 
                                    ? 'bg-rose-50 text-[#800080] dark:bg-rose-950/40 dark:text-[#800080]'
                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                }`}>
                                  {item.itemType}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-slate-500 font-bold">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-slate-900 dark:text-white">{new Date(item.deletedAt).toLocaleDateString()}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">By: {item.deletedByName || item.deletedBy}</span>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                {isRestored ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    <Check className="w-3 h-3" />
                                    <span>Restored to Live</span>
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black w-fit ${
                                      daysLeft > 30 
                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                                        : 'bg-rose-50 text-[#800080] dark:bg-rose-950/40 dark:text-[#800080] border border-rose-200 dark:border-rose-800'
                                    }`}>
                                      <Clock className="w-3 h-3" />
                                      <span>{daysLeft} Days Remaining</span>
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      Purge on: {new Date(item.scheduledPurgeDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="px-6 py-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTrashDetail(item)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#222] dark:hover:bg-[#333] text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl transition-all cursor-pointer"
                                  title="View full metadata details"
                                >
                                  Details
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRestoreTrash(item)}
                                  disabled={isRestoringTrashId === item.id || isRestored}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-[11px] rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-1"
                                  title="Restore and resume item back to platform"
                                >
                                  {isRestoringTrashId === item.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                  <span>{isRestored ? 'Restored' : 'Resume'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handlePurgeTrash(item)}
                                  disabled={isPurgingTrashId === item.id}
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#800080] rounded-lg transition-colors cursor-pointer"
                                  title="Purge permanently from archive"
                                >
                                  {isPurgingTrashId === item.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                      {trashItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-slate-400 font-bold">
                            <Archive className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-60" />
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-black">Compliance Vault is Empty</p>
                            <p className="text-xs text-slate-400 mt-1">No deleted videos, clips, or accounts in the 180-day trash archive.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PLATFORM TOOLS & BROADCAST SECTION */}
            {activeSection === 'tools' && (
              <div className="space-y-8 animate-in fade-in duration-300">

                {/* FEATURED TOOL: FIREBASE VIDEO & VIEWS/LIKES EDITOR */}
                <div className="bg-linear-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3.5 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20 shrink-0">
                      <Database className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                        <span>Direct Database Tool</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        Firebase Video Editor (Views & Likes Live Editor)
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-xl">
                        Search any video, inspect thumbnail, and directly update real <strong>views</strong>, <strong>likes</strong>, <strong>comments</strong>, or <strong>title</strong> inside Firestore. 100% genuine database updates that sync across the app.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection('firebase_edit')}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-amber-600/20 active:scale-95 flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-center"
                  >
                    <Edit3 className="w-4 h-4 stroke-[2.5]" />
                    <span>Open Firebase Video Editor</span>
                  </button>
                </div>
                
                {/* TOOL 1: SITE-WIDE BROADCAST ANNOUNCEMENT */}
                <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-[#272727]">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-2xl">
                        <Megaphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Site-Wide Broadcast Announcement</h3>
                        <p className="text-xs text-slate-500 font-medium">Display an important alert or welcome banner across the top of the platform for all users.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Status:</label>
                      <button
                        type="button"
                        onClick={() => setAnnouncementActive(!announcementActive)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                          announcementActive 
                            ? 'bg-emerald-600 text-white shadow-md' 
                            : 'bg-slate-200 dark:bg-[#272727] text-slate-500'
                        }`}
                      >
                        {announcementActive ? '● Live on Site' : '○ Disabled'}
                      </button>
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2">Live Banner Preview</label>
                    <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-sm transition-all ${
                      !announcementActive 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-dashed border-slate-300 dark:border-slate-700'
                        : announcementType === 'alert'
                          ? 'bg-amber-600 text-white'
                          : announcementType === 'success'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Megaphone className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {String(announcementText ?? '').trim() || 'No announcement message entered yet. Enter text below to preview.'}
                        </span>
                      </div>
                      {String(announcementLinkText ?? '').trim() && (
                        <span className="px-2.5 py-1 bg-white/20 rounded-lg text-[11px] font-extrabold underline shrink-0">
                          {announcementLinkText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Form Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Announcement Message</label>
                      <textarea
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        placeholder="e.g. Welcome to SocialIndia! Upload your first video or clip today and get featured."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Banner Theme Color</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAnnouncementType('info')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            announcementType === 'info'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-200 dark:border-[#333] text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Info (Blue)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnnouncementType('success')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            announcementType === 'success'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-200 dark:border-[#333] text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Success (Green)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnnouncementType('alert')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            announcementType === 'alert'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-200 dark:border-[#333] text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Alert (Amber)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Button / Link (Optional)</label>
                      <input
                        type="text"
                        value={announcementLinkText}
                        onChange={(e) => setAnnouncementLinkText(e.target.value)}
                        placeholder="Button text e.g. Explore Now"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveAnnouncement}
                      disabled={isSavingAnnouncement}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingAnnouncement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save & Publish Broadcast</span>
                    </button>
                  </div>
                </div>

                {/* TOOL 2: CONTENT HEALTH & DIAGNOSTIC SCANNER */}
                <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-[#272727]">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Platform Health & Diagnostic Scanner</h3>
                        <p className="text-xs text-slate-500 font-medium">Check the current video list for missing thumbnails, descriptions and engagement totals.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunAuditScan}
                      disabled={auditRunning}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                    >
                      {auditRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      <span>{auditRunning ? 'Scanning...' : 'Run Diagnostics Scan'}</span>
                    </button>
                  </div>

                  {auditStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in fade-in">
                      <div className="p-4 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#272727] rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-slate-400">Total Videos</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{auditStats.totalVideos}</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">
                          {auditStats.standardCount} videos • {auditStats.shortsCount} clips
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#272727] rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-slate-400">Platform Views</p>
                        <p className="text-2xl font-black text-blue-600 mt-1">{formatViews(auditStats.totalPlatformViews)}</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">{auditStats.totalLikes} total likes</p>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#272727] rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-slate-400">Thumbnail Health</p>
                        <p className={`text-2xl font-black mt-1 ${auditStats.missingThumbnails > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {auditStats.missingThumbnails === 0 ? '100% OK' : `${auditStats.missingThumbnails} Missing`}
                        </p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">Posters verified</p>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#272727] rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-slate-400">Empty descriptions</p>
                        <p className={`text-2xl font-black mt-1 ${auditStats.emptyDescriptions > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {auditStats.emptyDescriptions}
                        </p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">In the current video list</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-slate-200 dark:border-[#333]">
                      <p className="text-xs text-slate-500 font-bold">Run a content check against the videos currently loaded in this panel.</p>
                    </div>
                  )}
                </div>

                {/* TOOL 3: QUICK USER ROLE & PRIVILEGE MANAGER */}
                <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-[#272727]">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-[#800080] rounded-2xl">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Quick User Privilege & Role Manager</h3>
                      <p className="text-xs text-slate-500 font-medium">Promote users to Creator, Moderator, or Admin instantly.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Select User Account</label>
                      <select
                        value={selectedUserForRole}
                        onChange={(e) => setSelectedUserForRole(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">-- Choose User to Update --</option>
                        {users.map(u => (
                          <option key={u.uid} value={u.uid}>
                            {u.displayName || u.username || 'Unnamed User'} (@{u.username || 'user'}) • Current: {String(u.role || 'user').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">New Target Role</label>
                      <select
                        value={selectedNewRole}
                        onChange={(e) => setSelectedNewRole(e.target.value as any)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="creator">Creator (Verified Channel)</option>
                        <option value="moderator">Moderator (Flag & Report Control)</option>
                        <option value="admin">Administrator (Full Access)</option>
                        <option value="user">Standard User</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleQuickRoleChange}
                      disabled={isUpdatingUserRole || !selectedUserForRole}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      {isUpdatingUserRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      <span>Assign Role</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* SECTION: NEWSLETTER & TIPS BROADCAST TO NOTIFICATIONS */}
            {activeSection === 'newsletter' && (() => {
              const activeSubscribers = users.filter((u) => u.newsletter !== false && u.status !== 'suspended');
              const optedOutUsers = users.filter((u) => u.newsletter === false);
              const missingLegacyUsers = users.filter((u) => u.newsletter === undefined);

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Subscriber Summary Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-2xl p-5 shadow-xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Subscribers</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {activeSubscribers.length}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Receive Team SocialIndia tips</p>
                    </div>

                    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-2xl p-5 shadow-xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Opted Out (Inactive)</p>
                      <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
                        {optedOutUsers.length}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Turned off in Settings</p>
                    </div>

                    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-2xl p-5 shadow-xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Users</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {users.length}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Default newsletter: Active</p>
                    </div>

                    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-2xl p-5 shadow-xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tips Sent</p>
                      <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                        {newsletterCampaigns.length}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Delivered to Notifications</p>
                    </div>
                  </div>

                  {/* Legacy Sync Action Card if any users lack the field */}
                  {missingLegacyUsers.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                        {missingLegacyUsers.length} existing user account(s) don&apos;t have a saved newsletter status yet. Activate newsletter for all of them now.
                      </div>
                      <button
                        type="button"
                        onClick={handleActivateNewsletterForAllMissing}
                        disabled={isBackfillingNewsletter}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {isBackfillingNewsletter ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Activate Missing Users</span>
                      </button>
                    </div>
                  )}

                  {/* Compose Newsletter Tip Card */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <form
                      onSubmit={handleSendNewsletterTip}
                      className="lg:col-span-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5"
                    >
                      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#272727]">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-2xl">
                            <Mail className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                              Send Newsletter Tip
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Sent from <strong>Team SocialIndia</strong> to every user&apos;s Notification Bell (for users with Newsletter Active).
                            </p>
                          </div>
                        </div>
                      </div>

                      {newsletterResultMsg && (
                        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                          newsletterResultMsg.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {newsletterResultMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                          <span>{newsletterResultMsg.text}</span>
                        </div>
                      )}

                      {/* Quick Tip Starters */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Quick Tip Ideas</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            {
                              label: 'Creator Growth Tip',
                              title: 'Creator Tip from Team SocialIndia',
                              message: 'Use clear custom thumbnails and relevant hashtags on your videos and Clips to boost discovery across India!'
                            },
                            {
                              label: 'Clips Engagement Tip',
                              title: 'Boost Your Clips Reach',
                              message: 'Reply to your viewers in Creator Studio Comments to build a loyal community and keep conversations going!'
                            },
                            {
                              label: 'Channel Safety Tip',
                              title: 'Account Safety Tip',
                              message: 'Keep your channel secure and verify your public details so viewers always trust your official SocialIndia channel.'
                            }
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setNewsletterTitle(preset.title);
                                setNewsletterMessage(preset.message);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              + {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          Tip Title
                        </label>
                        <input
                          type="text"
                          value={newsletterTitle}
                          onChange={(e) => setNewsletterTitle(e.target.value)}
                          placeholder="e.g. Weekly Creator Tip from Team SocialIndia"
                          maxLength={120}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          Tip Message
                        </label>
                        <textarea
                          rows={4}
                          value={newsletterMessage}
                          onChange={(e) => setNewsletterMessage(e.target.value)}
                          placeholder="Write useful tips, feature highlights, or creator advice to appear in users' notifications..."
                          maxLength={500}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                        />
                        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                          <span>Only users with Newsletter = Active will receive this notification.</span>
                          <span>{newsletterMessage.length}/500</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={isSendingNewsletter || !newsletterTitle.trim() || !newsletterMessage.trim() || activeSubscribers.length === 0}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                        >
                          {isSendingNewsletter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          <span>Send Tip to {activeSubscribers.length} Active User{activeSubscribers.length === 1 ? '' : 's'}</span>
                        </button>
                      </div>
                    </form>

                    {/* Live Notification Preview */}
                    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 shadow-sm space-y-4 h-fit">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Bell className="w-4 h-4 text-blue-600" />
                        <span>Notification Preview</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#eff6ff] dark:bg-blue-950/25 border border-blue-200/80 dark:border-blue-800/60 flex gap-3 items-start">
                        <img
                          src="/socialindia-icon.png"
                          alt="Team SocialIndia"
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-blue-200 dark:border-blue-800 bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">
                            Team SocialIndia
                          </p>
                          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                            {newsletterTitle.trim() || 'Tip Title preview'}
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-normal mt-1 break-words">
                            {newsletterMessage.trim() || 'Your tip message will appear right here inside every active user’s Notification bell.'}
                          </p>
                          <span className="text-[10px] text-slate-400 block mt-1.5">Just now</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200/80 dark:border-[#272727] text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                        <p className="font-extrabold text-slate-800 dark:text-slate-100">Delivery Rules</p>
                        <p>• Sender shown: <strong>Team SocialIndia</strong></p>
                        <p>• Targets: <strong>{activeSubscribers.length}</strong> active subscribers</p>
                        <p>• Skips: <strong>{optedOutUsers.length}</strong> opted-out user(s)</p>
                      </div>
                    </div>
                  </div>

                  {/* Previously Sent Newsletter Tips History */}
                  <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-600" />
                        <span>Sent Newsletter Tips History</span>
                      </h3>
                      <span className="text-xs font-bold text-slate-400">
                        {newsletterCampaigns.length} sent
                      </span>
                    </div>

                    {newsletterCampaigns.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-[#1a1a1a] border border-dashed border-slate-200 dark:border-[#333] text-xs font-semibold text-slate-500">
                        No newsletter tips sent yet. Use the form above to send your first tip from Team SocialIndia!
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {newsletterCampaigns.map((camp) => (
                          <div key={camp.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900 dark:text-white">{camp.title}</span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 text-[10px] font-bold">
                                  {camp.senderName || 'Team SocialIndia'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 break-words">{camp.message}</p>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                                {camp.recipientCount} users notified
                              </span>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {formatTimeAgo(camp.sentAt) || formatShortDate(camp.sentAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SECTION: FIREBASE VIDEO & METRICS EDIT TOOL */}
            {activeSection === 'firebase_edit' && (
              <div className="animate-in fade-in duration-200">
                <FirebaseVideoEditor 
                  addToast={addToast} 
                  onRefreshParentVideos={() => {
                    adminService.getAllVideos().then(setVideos);
                  }}
                />
              </div>
            )}

            {/* SECTION: SOUND LIBRARY MANAGER */}
            {activeSection === 'sounds' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* Add New Song Form Card */}
                <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-[#272727]">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl">
                      <Music className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Add New Music / Sound Track</h3>
                      <p className="text-xs text-slate-500 font-medium">Upload or add new background music tracks for creators to use in Clips.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddSong} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Song Title *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Desi Bass & Dhol Beats"
                          value={newSongTitle}
                          onChange={(e) => setNewSongTitle(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Artist / Musician *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. DJ Bharat Swag"
                          value={newSongArtist}
                          onChange={(e) => setNewSongArtist(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Cover Image (URL or upload)
                        </label>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/..."
                          value={newSongCoverUrl}
                          onChange={(e) => {
                            setNewSongCoverUrl(e.target.value);
                            setNewSongCoverFile(null);
                            setNewSongCoverPreview('');
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          aria-label="Upload sound cover image"
                          onChange={async event => {
                            const file = event.currentTarget.files?.[0];
                            if (!file) return;
                            if (!file.type.startsWith('image/')) {
                              addToast('Choose an image file for the sound cover.', 'error');
                              return;
                            }
                            try {
                              const preview = await readImagePreview(file);
                              setNewSongCoverFile(file);
                              setNewSongCoverPreview(preview);
                            } catch (error) {
                              addToast(error instanceof Error ? error.message : 'Could not read the selected image.', 'error');
                            }
                          }}
                          className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-blue-700"
                        />
                        {newSongCoverPreview && (
                          <img src={newSongCoverPreview} alt="Selected cover preview" className="mt-2 h-12 w-12 rounded-lg object-cover" />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Audio MP3 File URL *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="https://cdn.pixabay.com/.../song.mp3"
                          value={newSongAudioUrl}
                          onChange={(e) => setNewSongAudioUrl(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Category
                        </label>
                        <select
                          value={newSongCategory}
                          onChange={(e) => setNewSongCategory(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="Punjabi & Bollywood">Punjabi & Bollywood</option>
                          <option value="Lo-Fi & Chill">Lo-Fi & Chill</option>
                          <option value="Gaming & Tech">Gaming & Tech</option>
                          <option value="Trending Viral">Trending Viral</option>
                          <option value="Romantic & Acoustic">Romantic & Acoustic</option>
                          <option value="Classical & Fusion">Classical & Fusion</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isAddingSong}
                        className="px-6 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isAddingSong ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                        <span>Add Song to Library</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Sound Library Catalog Table */}
                <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-100 dark:border-[#272727] flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Platform Sound Catalog ({sounds.length} Tracks)
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {sounds.map((s) => (
                      <div key={s.soundId} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#181818] transition-colors">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img src={s.coverUrl} alt={s.title} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-800 shadow-xs" />
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {s.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-bold truncate mt-0.5">
                              {s.artist} • <span className="text-blue-500">{s.category}</span>
                            </p>
                            <p className="text-[10px] text-emerald-600 font-black mt-0.5">
                              🔥 {s.usesCount || 0} REAL Clips created
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSound(s);
                              setEditingSoundCoverFile(null);
                              setEditingSoundCoverPreview('');
                            }}
                            className="px-2.5 py-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
                            title="Edit sound track details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSong(s.soundId)}
                            className="p-2 text-[#800080] hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer active:scale-95"
                            title="Delete sound track"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: AD CAMPAIGNS MANAGER */}
            {activeSection === 'advertising' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* Stats Header Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Campaigns</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{adCampaigns.length}</p>
                    <p className="text-[11px] text-blue-500 font-bold mt-1">Platform Promotions</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                    <p className="text-[10px] font-black uppercase text-slate-400">Active Ads</p>
                    <p className="text-2xl font-black text-emerald-500 mt-1">{adCampaigns.filter(a => a.status === 'active' || !a.status).length}</p>
                    <p className="text-[11px] text-emerald-600 font-bold mt-1">Live in feed</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Ad Revenue</p>
                    <p className="text-2xl font-black text-[#00A3FF] mt-1">
                      ${adCampaigns.reduce((acc, a) => acc + (a.totalLimit || a.spent || 0), 0).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">Wallet deducted</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Ad Clicks</p>
                    <p className="text-2xl font-black text-[#800080] mt-1">
                      {adCampaigns.reduce((acc, a) => acc + (a.results || 0), 0)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">User Engagements</p>
                  </div>
                </div>

                {/* Ad Campaigns Table */}
                <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 dark:border-[#272727] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        User Ad Campaigns Hub ({adCampaigns.length})
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">Manage and audit sponsored video and banner ads across SocialIndia.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#1A1A1A] text-slate-500 font-black uppercase tracking-wider border-b border-slate-200 dark:border-[#272727]">
                        <tr>
                          <th className="p-4">Status</th>
                          <th className="p-4">Ad Title / Sponsor</th>
                          <th className="p-4">Placement</th>
                          <th className="p-4">Target Country</th>
                          <th className="p-4">Pricing</th>
                          <th className="p-4">Spent / Total Limit</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#222222] font-semibold text-slate-800 dark:text-slate-200">
                        {adCampaigns.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-16 text-center text-slate-400 font-bold">
                              No advertising campaigns created yet.
                            </td>
                          </tr>
                        ) : (
                          adCampaigns.map((ad, idx) => (
                            <tr key={ad.adId || idx} className="hover:bg-slate-50 dark:hover:bg-[#181818] transition-colors">
                              <td className="p-4">
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-black text-[10px] uppercase">
                                  {ad.status || 'Active'}
                                </span>
                              </td>
                              <td className="p-4">
                                <p className="font-black text-slate-900 dark:text-white">{ad.sponsorName || ad.headline || 'Untitled Ad'}</p>
                                <p className="text-[10px] text-slate-400 truncate max-w-xs">{ad.description || ad.targetUrl}</p>
                              </td>
                              <td className="p-4">{ad.placement || 'Video Ad'}</td>
                              <td className="p-4 font-bold text-blue-500">{ad.targetCountry || 'Global'}</td>
                              <td className="p-4">
                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded text-[10px] font-black uppercase">
                                  {ad.pricingType === 'view' ? 'Pay Per View' : 'Pay Per Click ($0.7)'}
                                </span>
                              </td>
                              <td className="p-4 font-mono font-bold text-emerald-600">
                                ${(ad.spent || 0).toFixed(2)} / ${(ad.totalLimit || 0).toFixed(2)}
                              </td>
                              <td className="p-4 text-right">
                                <a
                                  href={ad.targetUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-[#2B2B2B] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  <span>View Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: PRO MEMBERS MANAGER ($10) */}
            {activeSection === 'pro_members' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* Stats Header Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Pro Members</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">
                      {users.filter(u => u.role === 'creator' || u.role === 'admin').length}
                    </p>
                    <p className="text-[11px] text-amber-600 font-bold mt-1">Verified Channel Badge ✓</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                    <p className="text-[10px] font-black uppercase text-slate-400">Estimated Pro Revenue</p>
                    <p className="text-2xl font-black text-emerald-500 mt-1">
                      ${(users.filter(u => u.role === 'creator' || u.role === 'admin').length * 10).toFixed(2)} USD
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">$10 / Member Subscription</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                    <p className="text-[10px] font-black uppercase text-slate-400">Standard Free Members</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {users.filter(u => u.role !== 'creator' && u.role !== 'admin').length}
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">Eligible for Pro Upgrade</p>
                  </div>
                </div>

                {/* Pro Members Table */}
                <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 dark:border-[#272727] flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Pro Package ($10) Subscribed Members
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">Manage Pro subscriptions, grant verified channel badges, and view wallet balances.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#1A1A1A] text-slate-500 font-black uppercase tracking-wider border-b border-slate-200 dark:border-[#272727]">
                        <tr>
                          <th className="p-4">User</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Verified Badge</th>
                          <th className="p-4">Wallet Balance</th>
                          <th className="p-4">Points</th>
                          <th className="p-4 text-right">Pro Status Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#222222] font-semibold text-slate-800 dark:text-slate-200">
                        {users.map((u) => {
                          const isProUser = isUserVerified(u);
                          return (
                            <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-[#181818] transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                                    {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : getInitials(u.displayName)}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900 dark:text-white flex items-center gap-1">
                                      <span>{u.displayName || u.username}</span>
                                      {isProUser && <CheckCircle2 className="w-3.5 h-3.5 text-[#00A3FF] fill-[#00A3FF] text-white" />}
                                    </p>
                                    <p className="text-[10px] text-slate-400">@{u.username}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 uppercase font-black text-[10px]">
                                <span className={`px-2.5 py-1 rounded-full ${isProUser ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-4">
                                {isProUser ? (
                                  <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Active Verified ✓
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Free Member</span>
                                )}
                              </td>
                              <td className="p-4 font-mono font-bold text-blue-500">
                                ${(u.walletBalance || 0).toFixed(2)} USD
                              </td>
                              <td className="p-4 font-mono font-bold text-amber-500">
                                {u.points || 0} pts
                              </td>
                              <td className="p-4 text-right">
                                {!isProUser ? (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await adminService.updateUserProStatus(u.uid, true);
                                        addToast(`Granted Pro status & Blue Tick to @${u.username}`, 'success');
                                        const updated = await adminService.getAllUsers();
                                        setUsers(updated);
                                      } catch (err) {
                                        addToast('Failed to grant Pro status.', 'error');
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-[#00A3FF] hover:bg-[#0082CC] text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                                  >
                                    Grant Pro Package
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await adminService.updateUserProStatus(u.uid, false);
                                        addToast(`Revoked Pro status for @${u.username}`, 'info');
                                        const updated = await adminService.getAllUsers();
                                        setUsers(updated);
                                      } catch (err) {
                                        addToast('Failed to revoke Pro status.', 'error');
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Revoke Pro
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: VERIFICATION REQUESTS */}
            {activeSection === 'verification_requests' && (() => {
              const pendingCount = verificationRequests.filter(r => r.status === 'pending').length;
              const approvedCount = verificationRequests.filter(r => r.status === 'approved').length;
              const rejectedCount = verificationRequests.filter(r => r.status === 'rejected').length;

              const filteredRequests = verificationRequests.filter((req) => {
                if (verificationFilter !== 'all' && req.status !== verificationFilter) return false;
                if (verificationSearch.trim()) {
                  const q = verificationSearch.toLowerCase();
                  const matchName = req.fullName?.toLowerCase().includes(q);
                  const matchChannel = req.channelName?.toLowerCase().includes(q);
                  const matchUsername = req.username?.toLowerCase().includes(q);
                  const matchCategory = req.category?.toLowerCase().includes(q);
                  const matchDoc = req.documentNumberOrLink?.toLowerCase().includes(q);
                  return Boolean(matchName || matchChannel || matchUsername || matchCategory || matchDoc);
                }
                return true;
              });

              return (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Stats Counter Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                      <p className="text-[10px] font-black uppercase text-slate-400">Total Applications</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {verificationRequests.length}
                      </p>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">Received all time</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                      <p className="text-[10px] font-black uppercase text-amber-500">Pending Review</p>
                      <p className="text-2xl font-black text-amber-500 mt-1">
                        {pendingCount}
                      </p>
                      <p className="text-[11px] text-amber-600 font-bold mt-1">Awaiting Admin Action</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                      <p className="text-[10px] font-black uppercase text-emerald-500">Approved & Verified</p>
                      <p className="text-2xl font-black text-emerald-500 mt-1">
                        {approvedCount}
                      </p>
                      <p className="text-[11px] text-emerald-600 font-bold mt-1">Active Blue Ticks Granted ✓</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] shadow-xs">
                      <p className="text-[10px] font-black uppercase text-[#800080]">Rejected Applications</p>
                      <p className="text-2xl font-black text-[#800080] mt-1">
                        {rejectedCount}
                      </p>
                      <p className="text-[11px] text-[#800080] font-bold mt-1">Declined by Admin</p>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="p-4 bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
                      {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => {
                        const count = filter === 'all' 
                          ? verificationRequests.length 
                          : filter === 'pending' 
                          ? pendingCount 
                          : filter === 'approved' 
                          ? approvedCount 
                          : rejectedCount;
                        return (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setVerificationFilter(filter)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                              verificationFilter === filter
                                ? 'bg-[#2563EB] text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a1a1e]'
                            }`}
                          >
                            <span>{filter}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              verificationFilter === filter ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative w-full md:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={verificationSearch}
                        onChange={(e) => setVerificationSearch(e.target.value)}
                        placeholder="Search applicant, channel, or ID..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#18181c] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>

                  {/* Requests List */}
                  {filteredRequests.length === 0 ? (
                    <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                      <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                      <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">No Verification Requests Found</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {verificationFilter === 'pending'
                          ? 'All verification requests have been processed! No pending applications in queue.'
                          : 'No applications match your current search or filter query.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRequests.map((req) => {
                        const isProcessing = isProcessingVerificationId === req.id;
                        const isDocUrl = req.documentNumberOrLink?.startsWith('http') || req.documentNumberOrLink?.startsWith('www') || req.documentNumberOrLink?.includes('drive.google.com');
                        const targetUser = users.find(u => u.uid === req.userId);
                        const userHasBadge = targetUser ? isUserVerified(targetUser) : req.status === 'approved';

                        return (
                          <div
                            key={req.id}
                            className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs hover:border-slate-300 dark:hover:border-[#333] transition-all space-y-4"
                          >
                            {/* Card Top: User Info & Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 overflow-hidden shadow-xs">
                                  {req.userPhotoURL ? <img src={req.userPhotoURL} className="w-full h-full object-cover" /> : getInitials(req.displayName || req.fullName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                                      {req.fullName}
                                    </h4>
                                    {userHasBadge && (
                                      <span title="Active Verified Badge">
                                        <CheckCircle2 className="w-4 h-4 text-[#00A3FF] fill-[#00A3FF] text-white shrink-0" />
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                                      {targetUser?.role || 'User'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span>@{req.username}</span>
                                    <span>•</span>
                                    <span>{req.userEmail || 'No email provided'}</span>
                                    {req.contactPhone && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono text-slate-600 dark:text-slate-400">📞 {req.contactPhone}</span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                {req.status === 'pending' ? (
                                  <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-black text-[11px] flex items-center gap-1.5 shadow-xs">
                                    <Clock className="w-3.5 h-3.5 animate-spin" />
                                    <span>Pending Review</span>
                                  </span>
                                ) : req.status === 'approved' ? (
                                  <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-[11px] flex items-center gap-1.5 shadow-xs">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Approved & Verified ✓</span>
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-[#800080] dark:text-[#800080] font-black text-[11px] flex items-center gap-1.5 shadow-xs">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Rejected</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Body: Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-slate-50 dark:bg-[#161619] p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Channel / Brand Name</p>
                                <p className="font-black text-slate-900 dark:text-white mt-1 text-xs">{req.channelName}</p>
                              </div>

                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Category</p>
                                <p className="font-bold text-[#2563EB] dark:text-blue-400 mt-1">{req.category}</p>
                              </div>

                              <div className="sm:col-span-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Identity Document Proof</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{req.documentType}:</span>
                                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1f1f24] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                    {req.documentNumberOrLink}
                                  </span>
                                  {isDocUrl && (
                                    <a
                                      href={req.documentNumberOrLink.startsWith('http') ? req.documentNumberOrLink : `https://${req.documentNumberOrLink}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-bold hover:underline"
                                    >
                                      <span>View Document</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>

                              {req.socialLinks && (
                                <div className="sm:col-span-2 lg:col-span-4">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Social Media & Public Reference Links</p>
                                  <p className="font-medium text-blue-600 dark:text-blue-400 mt-1 break-all bg-white dark:bg-[#1a1a1e] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                    {req.socialLinks}
                                  </p>
                                </div>
                              )}

                              <div className="sm:col-span-2 lg:col-span-4">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reason / Bio Pitch for Verification</p>
                                <div className="mt-1 bg-white dark:bg-[#1a1a1e] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                  "{req.reason}"
                                </div>
                              </div>

                              {req.status === 'rejected' && req.rejectionReason && (
                                <div className="sm:col-span-2 lg:col-span-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[#800080] dark:text-[#800080]">
                                  <span className="font-bold">Rejection Reason Provided: </span>
                                  <span>"{req.rejectionReason}"</span>
                                </div>
                              )}
                            </div>

                            {/* Card Footer: Timestamps and Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                              <p className="text-[11px] text-slate-400 font-medium">
                                Submitted: {new Date(req.submittedAt).toLocaleString()}
                                {req.reviewedAt && (
                                  <span className="ml-2 font-semibold">
                                    • Reviewed: {new Date(req.reviewedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </p>

                              <div className="flex items-center gap-2.5 self-end sm:self-center">
                                {req.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isProcessing}
                                      onClick={() => handleOpenRejectVerificationModal(req)}
                                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-[#800080] dark:bg-rose-950/40 dark:hover:bg-rose-950/70 dark:text-[#800080] font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>Reject</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isProcessing}
                                      onClick={() => handleApproveVerification(req)}
                                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/25 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                                    >
                                      {isProcessing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                      )}
                                      <span>Approve & Grant Blue Tick</span>
                                    </button>
                                  </>
                                )}

                                {req.status === 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeVerification(req.userId, req.id)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-[#800080] dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-[#800080] text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                  >
                                    Revoke Blue Tick
                                  </button>
                                )}

                                {req.status === 'rejected' && (
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleApproveVerification(req)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                                  >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Re-approve & Grant Badge</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* TRASH ITEM DETAIL MODAL */}
        {selectedTrashDetail && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#272727]">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-2xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Compliance Archive Metadata</h3>
                    <p className="text-xs text-slate-500 font-bold">Snapshot preserved under Indian IT Rules 2021</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTrashDetail(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#272727]"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#272727] space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Item Details</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{selectedTrashDetail.title}</p>
                  <p className="text-[11px] text-slate-500">{selectedTrashDetail.subtitle}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Type: {selectedTrashDetail.itemType}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-[#272727] space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Audit Timestamps</p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300">
                    <strong>Deleted:</strong> {new Date(selectedTrashDetail.deletedAt).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300">
                    <strong>Auto-Purge Date:</strong> {new Date(selectedTrashDetail.scheduledPurgeDate).toLocaleDateString()}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    <strong>Deleted By:</strong> {selectedTrashDetail.deletedByName || selectedTrashDetail.deletedBy}
                  </p>
                </div>
              </div>

              {/* Data Snapshot JSON Viewer */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                  Complete Lossless Database Snapshot (JSON)
                </label>
                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-56 overflow-y-auto border border-slate-800">
                  <pre>{JSON.stringify(selectedTrashDetail.dataSnapshot, null, 2)}</pre>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#272727]">
                <button
                  type="button"
                  onClick={() => setSelectedTrashDetail(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-[#272727] text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                {selectedTrashDetail.status !== 'restored' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleRestoreTrash(selectedTrashDetail);
                      setSelectedTrashDetail(null);
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Resume & Restore Item</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Delete Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center gap-3 text-[#800080]">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete User Account</h3>
                  <p className="text-xs text-slate-500 font-medium">180-Day Compliance Vault Archive</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl border border-slate-100 dark:border-[#272727]">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {userToDelete.photoURL ? <img src={userToDelete.photoURL} className="w-full h-full rounded-full object-cover" /> : getInitials(userToDelete.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{userToDelete.displayName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">@{userToDelete.username} • {userToDelete.role}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Deleting this user will deactivate their public profile. Their full profile snapshot will be safely preserved in the <strong className="text-slate-900 dark:text-white">180-Day Compliance Trash Vault</strong> where you can restore it anytime if needed.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeletingUser}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-[#333] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeletingUser}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingUser ? 'Archiving...' : 'Move to Trash Vault'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Delete Confirmation Modal */}
        {videoToDelete && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center gap-3 text-[#800080]">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete Video (Archive to Vault)</h3>
                  <p className="text-xs text-slate-500 font-medium">Safely retained in 180-Day Compliance Vault.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl border border-slate-100 dark:border-[#272727]">
                <div className="w-20 aspect-video rounded-lg overflow-hidden bg-slate-200 dark:bg-[#333] shrink-0">
                  <img src={videoToDelete.thumbnailUrl} alt={videoToDelete.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{videoToDelete.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">By @{videoToDelete.creatorUsername}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                This video will be removed from public feeds and archived in the <strong className="text-slate-900 dark:text-white">180-Day Compliance Trash Vault</strong>. You can resume or permanently purge it from there at any time.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVideoToDelete(null)}
                  disabled={isDeletingVideo}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-[#333] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteVideo}
                  disabled={isDeletingVideo}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingVideo ? 'Archiving...' : 'Move to Trash Vault'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN WALLET CREDIT MODAL */}
        {walletModalUser && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center gap-3 text-emerald-600">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl">
                  <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Credit Money to User Wallet</h3>
                  <p className="text-xs text-slate-500 font-medium">Direct Admin Funds Allocation</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl border border-slate-100 dark:border-[#272727]">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {walletModalUser.photoURL ? <img src={walletModalUser.photoURL} className="w-full h-full rounded-full object-cover" /> : getInitials(walletModalUser.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{walletModalUser.displayName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">@{walletModalUser.username} • Current Balance: ₹{(walletModalUser.walletBalance || 0).toFixed(2)} INR</p>
                </div>
              </div>

              <form onSubmit={handleAdminCreditWallet} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Amount to Add (₹ INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {[5, 10, 25, 50, 100].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setCreditAmount(amt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${creditAmount === amt ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-200 dark:border-[#333] text-slate-600 dark:text-slate-300'}`}
                    >
                      +${amt}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setWalletModalUser(null)}
                    disabled={isCrediting}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-[#333] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCrediting || creditAmount <= 0}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCrediting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Add ${creditAmount.toFixed(2)} to Wallet</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* BONUS MONEY CREDIT MODAL */}
        {bonusModalUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-zoom-in">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                    <Gift className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Add Bonus Money</h3>
                    <p className="text-xs text-slate-500">Reward bonus funds into user account</p>
                  </div>
                </div>
                <button 
                  onClick={() => setBonusModalUser(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#222] text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User details card */}
              <div className="p-4 bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl border border-slate-200/60 dark:border-[#2b2b2b] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {bonusModalUser.photoURL ? <img src={bonusModalUser.photoURL} className="w-full h-full object-cover" /> : getInitials(bonusModalUser.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{bonusModalUser.displayName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    @{bonusModalUser.username} • Bonus: ₹{(bonusModalUser.bonusBalance || 0).toFixed(2)} • Wallet: ₹{(bonusModalUser.walletBalance || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminAddBonus} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                    Credit Destination
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBonusCreditTarget('bonus')}
                      className={`p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        bonusCreditTarget === 'bonus'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-200 dark:border-[#333] text-slate-500'
                      }`}
                    >
                      <Gift className="w-4 h-4" />
                      <span>🎁 Bonus Money (₹)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBonusCreditTarget('wallet')}
                      className={`p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        bonusCreditTarget === 'wallet'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-200 dark:border-[#333] text-slate-500'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>💰 Main Wallet (₹)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {bonusCreditTarget === 'bonus' 
                      ? 'Bonus Money can be used to unlock & watch paid videos/clips.'
                      : 'Direct cash added to creator wallet balance, withdrawable anytime.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Amount to Add (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600">₹</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100000"
                      required
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {[20, 50, 100, 200, 500].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setBonusAmount(amt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${bonusAmount === amt ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-200 dark:border-[#333] text-slate-600 dark:text-slate-300'}`}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Description
                  </label>
                  <input
                    type="text"
                    value={bonusReason}
                    onChange={(e) => setBonusReason(e.target.value)}
                    placeholder="e.g. Creator Welcome Gift, Festival Bonus"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBonusModalUser(null)}
                    disabled={isAddingBonus}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-[#333] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingBonus || bonusAmount <= 0}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isAddingBonus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                    <span>Add ₹{bonusAmount.toFixed(2)} Bonus</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PAYOUT DECISION / CONFIRMATION MODAL */}
        {payoutModalState.isOpen && payoutModalState.request && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222] pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                    payoutModalState.type === 'approve'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  }`}>
                    {payoutModalState.type === 'approve' ? <Check className="w-5 h-5 stroke-[3]" /> : <X className="w-5 h-5 stroke-[3]" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {payoutModalState.type === 'approve' ? 'Approve & Settle Payout' : 'Reject & Refund Withdrawal'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {payoutModalState.type === 'approve' 
                        ? 'Confirm payment after transferring funds to creator UPI' 
                        : 'Decline request and automatically refund money to creator balance'}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setPayoutModalState({ isOpen: false, type: 'approve', request: null, notes: '' })}
                  disabled={isProcessingPayoutId === payoutModalState.request.id}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#222] text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Creator details card */}
              <div className="p-4 bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl border border-slate-200/60 dark:border-[#2b2b2b] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                      {payoutModalState.request.userPhotoURL ? <img src={payoutModalState.request.userPhotoURL} className="w-full h-full object-cover" /> : getInitials(payoutModalState.request.displayName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{payoutModalState.request.displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">@{payoutModalState.request.username} • {payoutModalState.request.userEmail}</p>
                      {payoutModalState.request.phone && (
                        <p className="text-[10px] text-slate-400 font-mono">📞 {payoutModalState.request.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Amount</span>
                    <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{payoutModalState.request.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* UPI details */}
                <div className="pt-2 border-t border-slate-200/50 dark:border-[#282828] space-y-2">
                  <div className="flex items-center justify-between bg-white dark:bg-[#111] p-3 rounded-xl border border-slate-200/60 dark:border-[#333]">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">UPI ID / VPA</p>
                      <p className="font-mono font-black text-sm text-slate-900 dark:text-white select-all">
                        {payoutModalState.request.upiId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(payoutModalState.request!.upiId);
                        addToast(`Copied UPI ID: ${payoutModalState.request!.upiId}`, 'info');
                      }}
                      className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Copy</span>
                    </button>
                  </div>

                  {payoutModalState.type === 'approve' && (
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(payoutModalState.request.upiId)}&pn=${encodeURIComponent(payoutModalState.request.displayName)}&am=${payoutModalState.request.amount}&cu=INR&tn=${encodeURIComponent('SocialIndia Creator Payout')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-slate-100 dark:bg-[#242424] hover:bg-slate-200 dark:hover:bg-[#303030] text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                      <span>Open in UPI App (Paytm / PhonePe / GPay)</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Notes / Reason input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {payoutModalState.type === 'approve' ? 'Transaction UTR / Settlement Reference Notes' : 'Reason for Rejection (Visible to User)'}
                </label>
                <input
                  type="text"
                  value={payoutModalState.notes}
                  onChange={(e) => setPayoutModalState(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={payoutModalState.type === 'approve' ? 'e.g. Paid via Paytm / UPI - UTR 412345678901' : 'e.g. Invalid UPI ID or verification required'}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalState({ isOpen: false, type: 'approve', request: null, notes: '' })}
                  disabled={isProcessingPayoutId === payoutModalState.request.id}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-[#333] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayoutAction}
                  disabled={isProcessingPayoutId === payoutModalState.request.id}
                  className={`flex-1 py-3 px-4 rounded-xl text-white text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    payoutModalState.type === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {isProcessingPayoutId === payoutModalState.request.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : payoutModalState.type === 'approve' ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <X className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>
                    {payoutModalState.type === 'approve' 
                      ? `Confirm & Mark ₹${payoutModalState.request.amount.toFixed(2)} Paid` 
                      : `Confirm Reject & Refund ₹${payoutModalState.request.amount.toFixed(2)}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT VERIFICATION MODAL */}
        {rejectModalRequest && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-600/30">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Reject Verification Application
                    </h3>
                    <p className="text-xs text-slate-500">
                      Provide a clear reason so the creator can correct their details and re-apply.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalRequest(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#222] text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <p className="font-black text-slate-900 dark:text-white">
                  Applicant: {rejectModalRequest.fullName} (@{rejectModalRequest.username})
                </p>
                <p className="text-slate-500">
                  Channel: <span className="font-bold text-slate-700 dark:text-slate-300">{rejectModalRequest.channelName}</span> • {rejectModalRequest.category}
                </p>
                <p className="text-slate-500 font-mono text-[11px]">
                  Document: {rejectModalRequest.documentType} ({rejectModalRequest.documentNumberOrLink})
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="e.g. Identity document unreadable, or social links do not verify channel ownership."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#18181c] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Document proof is unclear or unreadable',
                    'Name does not match identity document',
                    'Insufficient public media presence',
                    'Please provide official government ID link'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectReasonInput(preset)}
                      className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectModalRequest(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessingVerificationId === rejectModalRequest.id || !rejectReasonInput.trim()}
                  onClick={handleConfirmRejectVerification}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProcessingVerificationId === rejectModalRequest.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SOUND TRACK EDIT MODAL */}
        {editingSound && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#222] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Edit Sound Track Details</h3>
                    <p className="text-xs text-slate-500">Update track title, artist, audio link, or category in platform library</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingSound(null);
                    setEditingSoundCoverFile(null);
                    setEditingSoundCoverPreview('');
                  }}
                  disabled={isUpdatingSound}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#222] text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateSong} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Track Title *</label>
                    <input
                      type="text"
                      required
                      value={editingSound.title}
                      onChange={(e) => setEditingSound(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Artist / Creator *</label>
                    <input
                      type="text"
                      required
                      value={editingSound.artist}
                      onChange={(e) => setEditingSound(prev => prev ? { ...prev, artist: e.target.value } : null)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Category / Genre</label>
                    <select
                      value={editingSound.category}
                      onChange={(e) => setEditingSound(prev => prev ? { ...prev, category: e.target.value } : null)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Punjabi & Bollywood">Punjabi & Bollywood</option>
                      <option value="Trending Viral">Trending Viral</option>
                      <option value="Bhojpuri & Folk">Bhojpuri & Folk</option>
                      <option value="Lo-Fi & Chill">Lo-Fi & Chill</option>
                      <option value="Romantic & Acoustic">Romantic & Acoustic</option>
                      <option value="Classical & Fusion">Classical & Fusion</option>
                      <option value="Gaming & Tech">Gaming & Tech</option>
                      <option value="Devotional & Spiritual">Devotional & Spiritual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Duration (Seconds)</label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={editingSound.duration || 30}
                      onChange={(e) => setEditingSound(prev => prev ? { ...prev, duration: parseInt(e.target.value) || 30 } : null)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Audio MP3 URL *</label>
                  <input
                    type="url"
                    required
                    value={editingSound.audioUrl}
                    onChange={(e) => setEditingSound(prev => prev ? { ...prev, audioUrl: e.target.value } : null)}
                    placeholder="https://... audio stream file"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  {editingSound.audioUrl && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-[#181818] rounded-xl border border-slate-200/60 dark:border-[#333]">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">Live Audio Preview:</p>
                      <audio src={editingSound.audioUrl} controls className="w-full h-8" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Cover Artwork URL</label>
                  <div className="flex gap-3 items-center">
                    <img 
                      src={editingSoundCoverPreview || editingSound.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80'}
                      alt="Cover preview" 
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#333] shrink-0"
                    />
                    <input
                      type="url"
                      value={editingSound.coverUrl}
                      onChange={(e) => {
                        setEditingSound(prev => prev ? { ...prev, coverUrl: e.target.value } : null);
                        setEditingSoundCoverFile(null);
                        setEditingSoundCoverPreview('');
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload sound cover image"
                    onChange={async event => {
                      const file = event.currentTarget.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        addToast('Choose an image file for the sound cover.', 'error');
                        return;
                      }
                      try {
                        const preview = await readImagePreview(file);
                        setEditingSoundCoverFile(file);
                        setEditingSoundCoverPreview(preview);
                      } catch (error) {
                        addToast(error instanceof Error ? error.message : 'Could not read the selected image.', 'error');
                      }
                    }}
                    className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-blue-700"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSound(null);
                      setEditingSoundCoverFile(null);
                      setEditingSoundCoverPreview('');
                    }}
                    disabled={isUpdatingSound}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-[#333] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingSound}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingSound ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Sound Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Subtitles & Captions Editor Modal (Admin Tool) */}
        {captionEditorVideo && (
          <CaptionEditorModal
            video={captionEditorVideo}
            isOpen={!!captionEditorVideo}
            onClose={() => setCaptionEditorVideo(null)}
            onSaved={(updatedCues) => {
              setVideos(prev => prev.map(item => item.videoId === captionEditorVideo.videoId ? { ...item, captions: updatedCues } : item));
              addToast('Subtitles updated successfully by Admin!', 'success');
            }}
          />
        )}
      </main>
    </div>
  );
};

// Helper Components
const StatCard: React.FC<{ icon: any, label: string, value: number, color: 'blue' | 'indigo' | 'amber' | 'emerald' }> = ({ icon: Icon, label, value, color }) => {
  const colorMap = {
    blue: {
      bg: 'bg-white dark:bg-[#121215]',
      border: 'border-slate-200/80 dark:border-[#222225]',
      icon: 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
    },
    indigo: {
      bg: 'bg-white dark:bg-[#121215]',
      border: 'border-slate-200/80 dark:border-[#222225]',
      icon: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
    },
    amber: {
      bg: 'bg-white dark:bg-[#121215]',
      border: 'border-slate-200/80 dark:border-[#222225]',
      icon: 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
    },
    emerald: {
      bg: 'bg-white dark:bg-[#121215]',
      border: 'border-slate-200/80 dark:border-[#222225]',
      icon: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
    },
  };

  const style = colorMap[color];

  return (
    <div className={`p-5 rounded-3xl border ${style.bg} ${style.border} shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4`}>
      <div className={`p-3.5 rounded-2xl ${style.icon} shrink-0`}>
        <Icon className="w-5 h-5 stroke-[2.5]" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value.toLocaleString()}</p>
      </div>
    </div>
  );
};

const LoaderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BarChart3 className={className} />
);
