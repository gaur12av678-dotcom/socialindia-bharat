import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { adminService } from '../services/adminService';
import { feedbackService, FeedbackEntry } from '../services/feedbackService';
import { User, Video, Report } from '../types';
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
  BarChart3
} from 'lucide-react';
import { formatViews, formatTimeAgo, getInitials } from '../utils/videoUtils';

type AdminSection = 'dashboard' | 'users' | 'videos' | 'reports' | 'feedback';

export const AdminPanel: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);

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
      const [u, v, r, f] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllVideos(),
        adminService.getAllReports(),
        feedbackService.getAllFeedback()
      ]);
      setUsers(u);
      setVideos(v);
      setReports(r);
      setFeedback(f);
    } catch (err) {
      addToast('Failed to load administrative data.', 'error');
    } finally {
      setLoading(false);
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
      await adminService.deleteVideo(videoToDelete.videoId, videoToDelete.creatorId);
      setVideos(prev => prev.filter(v => v.videoId !== videoToDelete.videoId));
      addToast('Video permanently deleted from platform.', 'success');
      setVideoToDelete(null);
    } catch (err) {
      addToast('Failed to delete video. Please try again.', 'error');
    } finally {
      setIsDeletingVideo(false);
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
                            className={`p-2 rounded-lg transition-colors ${u.status === 'active' ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}
                            title={u.status === 'active' ? 'Suspend User' : 'Activate User'}
                          >
                            {u.status === 'active' ? <UserX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
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
          </>
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
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete Video Permanently</h3>
                  <p className="text-xs text-slate-500 font-medium">This action cannot be undone.</p>
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

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Deleting this video will remove it completely from the public feed, searches, watch pages, and user statistics.
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
                  {isDeletingVideo ? 'Deleting...' : 'Confirm Delete'}
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
