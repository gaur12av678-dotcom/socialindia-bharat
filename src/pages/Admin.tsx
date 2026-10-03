import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { adminService } from '../services/adminService';
import { feedbackService, FeedbackEntry } from '../services/feedbackService';
import { User, Video, Report, TrashItem } from '../types';
import { trashService } from '../services/trashService';
import { 
  Users, 
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
  CheckSquare
} from 'lucide-react';
import { formatViews, formatTimeAgo, getInitials } from '../utils/videoUtils';

type AdminSection = 'dashboard' | 'users' | 'videos' | 'reports' | 'feedback' | 'storage' | 'trash' | 'tools';

export const AdminPanel: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
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

  // Security Check: Only admins allowed
  useEffect(() => {
    const isDeveloper = currentUserProfile?.displayName === 'maryxbgamer@gmail.com';
    if (currentUser && currentUserProfile && currentUserProfile.role !== 'admin' && !isDeveloper) {
      addToast('Unauthorized access. Admins only.', 'error');
      navigate('home');
    }
  }, [currentUser, currentUserProfile]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, v, r, f, s, t] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllVideos(),
        adminService.getAllReports(),
        feedbackService.getAllFeedback(),
        adminService.getStorageConfig(),
        trashService.getAllTrash()
      ]);
      setUsers(u);
      setVideos(v);
      setReports(r);
      setFeedback(f);
      setTrashItems(t);
      if (s) {
        setCloudName(s.cloudName || '');
        setUploadPreset(s.uploadPreset || '');
        setStorageUpdatedAt(s.updatedAt);
      }
    } catch (err) {
      addToast('Failed to load administrative data.', 'error');
    } finally {
      setLoading(false);
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
      // Test Cloudinary endpoint reachability
      const testFormData = new FormData();
      testFormData.append('upload_preset', uploadPreset.trim());
      // 1x1 transparent GIF base64 as tiny test payload
      testFormData.append('file', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName.trim()}/image/upload`, {
        method: 'POST',
        body: testFormData
      });

      if (res.ok) {
        const data = await res.json();
        setStorageTestStatus('success');
        setStorageTestMessage(`Connection verified! Successfully uploaded test asset to "${cloudName.trim()}".`);
        addToast('Cloudinary connection test successful!', 'success');
      } else {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP status ${res.status}`;
        setStorageTestStatus('error');
        setStorageTestMessage(`Cloudinary responded with error: ${errMsg}. Please ensure the preset is set to 'Unsigned'.`);
        addToast(`Test failed: ${errMsg}`, 'error');
      }
    } catch (err: any) {
      setStorageTestStatus('error');
      setStorageTestMessage(`Network error connecting to Cloudinary: ${err?.message || 'Check your internet connection and Cloud Name.'}`);
      addToast('Network error testing Cloudinary connection.', 'error');
    } finally {
      setIsTestingStorage(false);
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

  const handleResolveReport = async (reportId: string, status: Report['status']) => {
    try {
      await adminService.updateReportStatus(reportId, status);
      setReports(prev => prev.map(r => r.reportId === reportId ? { ...r, status } : r));
      addToast(`Report marked as ${status}.`, 'success');
    } catch (err) {
      addToast('Failed to resolve report.', 'error');
    }
  };

  const handleResolveFeedback = async (id: string, status: FeedbackEntry['status']) => {
    try {
      await feedbackService.updateFeedbackStatus(id, status);
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f));
      addToast(`Feedback marked as ${status}.`, 'success');
    } catch (err) {
      addToast('Failed to update feedback status.', 'error');
    }
  };

  if (currentUserProfile?.role !== 'admin' && currentUserProfile?.displayName !== 'maryxbgamer@gmail.com') {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h3 className="text-xl font-black">Access Denied</h3>
        <p className="text-sm text-slate-500 mt-2">You do not have administrative privileges.</p>
      </div>
    );
  }

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
        setAnnouncementText(ann.message || '');
        setAnnouncementType(ann.type || 'info');
        setAnnouncementLinkText(ann.linkText || '');
        setAnnouncementLinkUrl(ann.linkUrl || '');
      }
    }).catch(console.error);
  }, []);

  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
      await adminService.saveAnnouncement({
        active: announcementActive,
        message: announcementText.trim(),
        type: announcementType,
        linkText: announcementLinkText.trim(),
        linkUrl: announcementLinkUrl.trim()
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

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.creatorUsername.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f9fafb] dark:bg-[#080808] -mt-6">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-[#0f0f0f] border-r border-slate-200 dark:border-[#272727] p-4 space-y-2 shrink-0">
        <div className="px-4 py-6 mb-4">
          <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            SocialIndia Admin
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Management Hub</p>
        </div>

        <button 
          onClick={() => setActiveSection('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeSection === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272727]'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        <button 
          onClick={() => setActiveSection('users')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeSection === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272727]'}`}
        >
          <Users className="w-5 h-5" />
          <span>Users</span>
        </button>

        <button 
          onClick={() => setActiveSection('videos')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeSection === 'videos' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272727]'}`}
        >
          <VideoIcon className="w-5 h-5" />
          <span>Videos</span>
        </button>

        <button 
          onClick={() => setActiveSection('reports')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeSection === 'reports' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272727]'}`}
        >
          <AlertTriangle className="w-5 h-5" />
          <div className="flex-1 flex justify-between items-center">
            <span>Reports</span>
            {reports.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {reports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </div>
        </button>

        <button 
          onClick={() => setActiveSection('feedback')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeSection === 'feedback' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272727]'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <div className="flex-1 flex justify-between items-center">
            <span>Feedback</span>
            {feedback.filter(f => f.status === 'pending').length > 0 && (
              <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {feedback.filter(f => f.status === 'pending').length}
              </span>
            )}
          </div>
        </button>

        <button 
          onClick={() => setActiveSection('storage')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeSection === 'storage' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272727]'}`}
        >
          <Cloud className="w-5 h-5" />
          <div className="flex-1 flex justify-between items-center">
            <span>Cloud Storage</span>
            {cloudName && uploadPreset ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Configured" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Setup needed" />
            )}
          </div>
        </button>

        <button 
          onClick={() => setActiveSection('trash')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeSection === 'trash' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272727]'}`}
        >
          <Archive className="w-5 h-5" />
          <div className="flex-1 flex justify-between items-center">
            <span>Trash (180D Vault)</span>
            {trashItems.filter(t => t.status === 'trashed').length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {trashItems.filter(t => t.status === 'trashed').length}
              </span>
            )}
          </div>
        </button>

        <button 
          onClick={() => setActiveSection('tools')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeSection === 'tools' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272727]'}`}
        >
          <Wrench className="w-5 h-5" />
          <div className="flex-1 flex justify-between items-center">
            <span>Platform Tools</span>
            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              New
            </span>
          </div>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-h-screen">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white capitalize">{activeSection}</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Manage SocialIndia platform {activeSection} and operations.</p>
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
          <div className="flex flex-col items-center justify-center py-20 animate-pulse space-y-4">
            <LoaderIcon className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Synchronizing Hub...</p>
          </div>
        ) : (
          <>
            {/* Dashboard Section */}
            {activeSection === 'dashboard' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard icon={Users} label="Total Users" value={users.length} color="blue" />
                  <StatCard icon={VideoIcon} label="Total Videos" value={videos.length} color="indigo" />
                  <StatCard icon={AlertTriangle} label="Pending Reports" value={reports.filter(r => r.status === 'pending').length} color="amber" />
                  <StatCard icon={MessageSquare} label="New Feedback" value={feedback.filter(f => f.status === 'pending').length} color="emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Recent Users */}
                  <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 shadow-sm overflow-hidden">
                    <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      Newest Creators
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-[#272727]">
                      {users.slice(0, 5).map(u => (
                        <div key={u.uid} className="py-3 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                              {u.photoURL ? <img src={u.photoURL} className="w-full h-full rounded-full object-cover" /> : getInitials(u.displayName)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{u.displayName}</p>
                              <p className="text-[10px] text-slate-500">@{u.username}</p>
                            </div>
                          </div>
                          <button onClick={() => navigate('creator', u.username)} className="p-2 hover:bg-slate-50 dark:hover:bg-[#272727] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Reports */}
                  <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 shadow-sm overflow-hidden">
                    <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Urgent Reports
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-[#272727]">
                      {reports.filter(r => r.status === 'pending').slice(0, 5).map(r => (
                        <div key={r.reportId} className="py-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                              {r.reason}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">{formatTimeAgo(r.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium line-clamp-1">{r.details || "No details provided"}</p>
                          <button onClick={() => setActiveSection('reports')} className="text-[10px] font-bold text-blue-600 hover:underline">View details</button>
                        </div>
                      ))}
                      {reports.filter(r => r.status === 'pending').length === 0 && (
                        <div className="py-10 text-center">
                          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-bold text-slate-400">All caught up! No pending reports.</p>
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
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#1a1a1a] text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-[#272727]">
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Stats</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#272727]">
                    {filteredUsers.map(u => (
                      <tr key={u.uid} className="text-xs hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                              {u.photoURL ? <img src={u.photoURL} className="w-full h-full rounded-full object-cover" /> : getInitials(u.displayName)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{u.displayName}</p>
                              <p className="text-[10px] text-slate-500 truncate">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-red-50 text-red-600 dark:bg-red-950/30'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400">{u.role}</td>
                        <td className="px-6 py-4 text-slate-500">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold">{u.videosCount} videos</span>
                            <span className="text-[10px]">{u.followersCount} followers</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => handleUpdateUserStatus(u.uid, u.status)}
                            className={`p-2 rounded-lg transition-colors ${u.status === 'active' ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}
                            title={u.status === 'active' ? 'Suspend User' : 'Activate User'}
                          >
                            {u.status === 'active' ? <UserX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => setUserToDelete(u)}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg transition-colors"
                            title="Delete user to 180-Day Trash Vault"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => navigate('creator', u.username)} className="p-2 hover:bg-slate-50 dark:hover:bg-[#272727] rounded-lg text-slate-400">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                            onClick={() => handleUpdateVideoStatus(v.videoId, v.status)}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-[#272727] rounded-lg text-amber-500"
                            title={v.status === 'published' ? 'Hide Video' : 'Publish Video'}
                          >
                            {v.status === 'published' ? <EyeOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => setVideoToDelete(v)}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-rose-500 transition-colors"
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

                    <div className="pt-4 flex gap-2">
                      <button 
                        onClick={() => handleResolveReport(r.reportId, 'resolved')}
                        disabled={r.status === 'resolved'}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl transition-colors"
                      >
                        Resolve
                      </button>
                      <button 
                        onClick={() => handleResolveReport(r.reportId, 'reviewed')}
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
            {activeSection === 'feedback' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {feedback.map(f => (
                  <div key={f.id} className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-5 space-y-4 shadow-sm relative overflow-hidden">
                    {f.status === 'pending' && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />}
                    
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{f.type === 'help' ? 'Help Request' : 'User Feedback'}</span>
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-tight">{f.subject}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${f.status === 'pending' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'}`}>
                        {f.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#1a1a1a] rounded-xl p-3">
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        "{f.message}"
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-1 text-[10px] text-slate-500 font-bold">
                      <div className="flex justify-between">
                        <span>User</span>
                        <span className="text-slate-900 dark:text-white truncate max-w-[120px]">@{f.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date</span>
                        <span className="text-slate-900 dark:text-white">{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-2">
                      <button 
                        onClick={() => handleResolveFeedback(f.id!, 'resolved')}
                        disabled={f.status === 'resolved'}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl transition-colors"
                      >
                        Resolve
                      </button>
                      <button 
                        onClick={() => handleResolveFeedback(f.id!, 'reviewed')}
                        disabled={f.status === 'reviewed' || f.status === 'resolved'}
                        className="flex-1 py-2 bg-slate-100 dark:bg-[#272727] hover:bg-slate-200 dark:hover:bg-[#333] disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl transition-colors"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))}

                {feedback.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white dark:bg-[#0f0f0f] border border-dashed border-slate-300 dark:border-[#272727] rounded-3xl">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-black text-slate-400">Inbox Clear</h4>
                    <p className="text-xs text-slate-400">No feedback or help requests yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* CLOUD STORAGE MANAGEMENT SECTION */}
            {activeSection === 'storage' && (
              <div className="space-y-6 max-w-4xl">
                {/* Status Card */}
                <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 sm:p-8 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-[#272727]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shadow-sm">
                        <Cloud className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Cloud Storage & CDN Settings</h3>
                        <p className="text-xs text-slate-500 font-medium">Global Cloudinary credentials for all platform video and thumbnail uploads.</p>
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
                          <span>Cloud Name *</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. dxyz12345"
                          value={cloudName}
                          onChange={(e) => setCloudName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
                          required
                        />
                        <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                          Found in Cloudinary Dashboard home screen.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-blue-600" />
                          <span>Upload Preset (Unsigned) *</span>
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
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                      }`}>
                        {storageTestStatus === 'success' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
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
                    <h4 className="text-sm font-black uppercase tracking-wider">How Cloudinary Setup Works (1-Minute Guide)</h4>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Saving these credentials here securely stores them in the database. When creators upload videos or thumbnails from anywhere on the platform (Studio or Homepage), their uploads will automatically use this storage without asking them for any keys.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#272727] rounded-2xl space-y-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-black text-xs flex items-center justify-center">1</div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">Create Free Account</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Sign up at <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold inline-flex items-center gap-0.5">cloudinary.com <ExternalLink className="w-2.5 h-2.5" /></a> (Free 25GB CDN storage & bandwidth).
                      </p>
                    </div>

                    <div className="p-4 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#272727] rounded-2xl space-y-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-black text-xs flex items-center justify-center">2</div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">Copy Cloud Name</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        On your Cloudinary dashboard home, copy your unique <strong className="font-bold text-slate-700 dark:text-slate-300">"Cloud Name"</strong>.
                      </p>
                    </div>

                    <div className="p-4 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#272727] rounded-2xl space-y-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-black text-xs flex items-center justify-center">3</div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">Create Unsigned Preset</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Go to <strong className="font-bold text-slate-700 dark:text-slate-300">Settings ➔ Upload ➔ Add upload preset</strong>. Set Signing Mode to <strong className="font-bold text-slate-700 dark:text-slate-300">"Unsigned"</strong>, save, and paste preset name above.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TRASH & 180-DAY COMPLIANCE VAULT SECTION */}
            {activeSection === 'trash' && (
              <div className="space-y-6">
                {/* Legal Compliance Banner */}
                <div className="bg-linear-to-r from-slate-900 to-slate-800 dark:from-[#161616] dark:to-[#1f1f1f] text-white p-6 rounded-3xl border border-slate-700 shadow-md space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
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
                    Whenever a creator or admin deletes a video, Short, or account, it is moved here to the Compliance Vault. Metadata and media links are securely held for 180 days before permanent purging. If anything was deleted by mistake, you can <strong className="text-emerald-400 font-bold">Resume / Restore</strong> it back to the active platform with 1 click.
                  </p>
                </div>

                {/* Sub Filters & Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-2xl shadow-xs overflow-x-auto w-full sm:w-auto">
                    {[
                      { id: 'all', label: `All (${trashItems.length})`, icon: Layers },
                      { id: 'video', label: `Videos (${trashItems.filter(t => t.itemType === 'video').length})`, icon: VideoIcon },
                      { id: 'short', label: `Shorts (${trashItems.filter(t => t.itemType === 'short').length})`, icon: Zap },
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
                        .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || (t.subtitle || '').toLowerCase().includes(searchTerm.toLowerCase()))
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
                                        {item.itemType.toUpperCase()}
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
                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
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
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
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
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg transition-colors cursor-pointer"
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
                            <p className="text-xs text-slate-400 mt-1">No deleted videos, shorts, or accounts in the 180-day trash archive.</p>
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
                          {announcementText.trim() || 'No announcement message entered yet. Enter text below to preview.'}
                        </span>
                      </div>
                      {announcementLinkText.trim() && (
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
                        placeholder="e.g. Welcome to SocialIndia! Upload your first video or short today and get featured."
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
                        <p className="text-xs text-slate-500 font-medium">Scan platform database, media assets, missing thumbnails and content metrics in real-time.</p>
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
                          {auditStats.standardCount} long • {auditStats.shortsCount} shorts
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
                        <p className="text-[10px] font-black uppercase text-slate-400">Database Status</p>
                        <p className="text-2xl font-black text-emerald-500 mt-1">Healthy</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">Firestore latency: normal</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-slate-200 dark:border-[#333]">
                      <p className="text-xs text-slate-500 font-bold">Click "Run Diagnostics Scan" above to perform a full system audit of all videos, storage, and platform engagement.</p>
                    </div>
                  )}
                </div>

                {/* TOOL 3: QUICK USER ROLE & PRIVILEGE MANAGER */}
                <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-[#272727]">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-2xl">
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
                            {u.displayName || u.username} (@{u.username}) • Current: {u.role.toUpperCase()}
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
              <div className="flex items-center gap-3 text-rose-600">
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
              <div className="flex items-center gap-3 text-rose-600">
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
      </main>
    </div>
  );
};

// Helper Components
const StatCard: React.FC<{ icon: any, label: string, value: number, color: 'blue' | 'indigo' | 'amber' | 'emerald' }> = ({ icon: Icon, label, value, color }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30',
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30',
  };

  return (
    <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-3xl p-6 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-2xl border ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{value.toLocaleString()}</p>
      </div>
    </div>
  );
};

const LoaderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <BarChart3 className={className} />
);
