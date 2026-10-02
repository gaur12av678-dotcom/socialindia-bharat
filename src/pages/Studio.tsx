import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { parseVideoUrl, extractYoutubeThumbnail, formatViews, formatDuration } from '../utils/videoUtils';
import { categoriesList } from './Home';
import { 
  LayoutDashboard, 
  Video as VideoIcon, 
  BarChart3, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Eye, 
  Globe, 
  Lock, 
  EyeOff,
  TrendingUp,
  Heart,
  Upload,
  MessageSquare,
  Users,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

export const CreatorStudio: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();

  // Navigation tab inside Studio
  const [activeTab, setActiveTab] = useState<'dashboard' | 'content' | 'analytics'>('dashboard');
  
  // Video publishing state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Coding');
  const [tagsInput, setTagsInput] = useState('');
  const [duration, setDuration] = useState(120);
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isShort, setIsShort] = useState(false);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadTaskRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Creator state
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Aggregated Stats
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    followers: 0
  });

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCreatorDashboard = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const allCreatorVideos = await videoService.getCreatorVideos(currentUser.uid);
      setVideos(allCreatorVideos);

      const totalViews = allCreatorVideos.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
      const totalLikes = allCreatorVideos.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
      const totalComments = allCreatorVideos.reduce((acc, curr) => acc + (curr.commentsCount || 0), 0);
      
      setStats({
        totalVideos: allCreatorVideos.length,
        totalViews,
        totalLikes,
        totalComments,
        followers: currentUserProfile?.followersCount || 0
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreatorDashboard();
  }, [currentUser, currentUserProfile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      addToast('File size too large. Max 100MB for cloud hosting.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0); 
    
    // Simple interval to simulate progress since we're using uploadBytes (non-resumable) for stability
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 98) return prev + Math.floor(Math.random() * 5) + 1;
        return prev;
      });
    }, 1000); // Slower updates to match real behavior better
    
    try {
      // Add a race condition to detect stuck uploads
      const uploadPromise = videoService.uploadFile(file, `videos/${currentUser?.uid}`);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload is taking longer than expected. Please check your internet or try a smaller file.')), 120000)
      );

      const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]) as string;
      clearInterval(progressInterval);
      setUploadProgress(100);
      setVideoUrl(downloadUrl);
      addToast('Video file uploaded successfully!', 'success');
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Upload handler error:', err);
      addToast(err.message || 'Failed to upload file. Please check your connection.', 'error');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const cancelUpload = () => {
    // With uploadBytes we can't easily cancel mid-flight without an AbortController,
    // but we'll just stop the UI state for now.
    setIsUploading(false);
    setUploadProgress(0);
    addToast('Cancelling upload UI...', 'info');
  };

  const handlePublishOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserProfile) return;

    if (!title.trim() || title.length < 3 || title.length > 100) {
      addToast('Title must be between 3 and 100 characters.', 'error');
      return;
    }

    const cleanVideoUrl = videoUrl.trim();
    if (!cleanVideoUrl.startsWith('https://')) {
      addToast('Secure URL protocol (https://) is required.', 'error');
      return;
    }

    const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0, 5);
    const autoYtThumb = extractYoutubeThumbnail(cleanVideoUrl);
    const resolvedThumbnail = thumbnailUrl.trim() || autoYtThumb || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';

    try {
      if (editingVideo) {
        await videoService.editVideo(editingVideo.videoId, {
          title: title.trim(),
          description: description.trim(),
          videoUrl: cleanVideoUrl,
          thumbnailUrl: resolvedThumbnail,
          category,
          tags,
          duration,
          visibility,
          isShort,
        });
        addToast('Video details updated successfully!', 'success');
      } else {
        await videoService.publishVideo({
          title: title.trim(),
          description: description.trim(),
          videoUrl: cleanVideoUrl,
          thumbnailUrl: resolvedThumbnail,
          category,
          tags,
          duration,
          visibility,
          isShort,
          creatorId: currentUser.uid,
          creatorUsername: currentUserProfile.username,
          creatorDisplayName: currentUserProfile.displayName,
          creatorPhotoURL: currentUserProfile.photoURL || '',
        });
        addToast('Video published successfully on SocialIndia!', 'success');
      }

      setPublishModalOpen(false);
      resetForm();
      loadCreatorDashboard();
    } catch (err) {
      addToast('Failed to save video metadata.', 'error');
    }
  };

  const handleEditClick = (video: Video) => {
    setEditingVideo(video);
    setTitle(video.title);
    setVideoUrl(video.videoUrl);
    setThumbnailUrl(video.thumbnailUrl);
    setDescription(video.description);
    setCategory(video.category);
    setTagsInput(video.tags ? video.tags.join(', ') : '');
    setDuration(video.duration);
    setVisibility(video.visibility);
    setIsShort(video.isShort);
    setPublishModalOpen(true);
  };

  const handleDeleteClick = (video: Video) => {
    setVideoToDelete(video);
    setDeleteModalOpen(true);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete || !currentUser) return;
    
    setIsDeleting(true);
    try {
      await videoService.deleteVideo(videoToDelete.videoId, currentUser.uid);
      addToast(`"${videoToDelete.title}" deleted successfully.`, 'info');
      setVideos(prev => prev.filter(v => v.videoId !== videoToDelete.videoId));
      setDeleteModalOpen(false);
      setVideoToDelete(null);
      loadCreatorDashboard();
    } catch (err) {
      console.error('Delete error:', err);
      addToast('Failed to delete video. Please check permissions.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setEditingVideo(null);
    setTitle('');
    setVideoUrl('');
    setThumbnailUrl('');
    setDescription('');
    setCategory('Coding');
    setTagsInput('');
    setDuration(120);
    setVisibility('public');
    setIsShort(false);
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <LayoutDashboard className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">Sign in to view Creator Studio</h3>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 font-medium">Access dashboard, manage videos and view analytics.</p>
      </div>
    );
  }

  const topVideos = [...videos].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* Upper header section */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200 dark:border-[#334155]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">Studio Hub</h1>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-bold">Manage @{currentUserProfile?.username}</p>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setPublishModalOpen(true);
          }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Upload</span>
        </button>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200 dark:border-[#334155] gap-8">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer relative transition-colors ${activeTab === 'dashboard' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
          {activeTab === 'dashboard' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer relative transition-colors ${activeTab === 'content' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <VideoIcon className="w-4 h-4" />
          <span>Content ({videos.length})</span>
          {activeTab === 'content' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer relative transition-colors ${activeTab === 'analytics' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
          {activeTab === 'analytics' && <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Gathering Creator Data...</div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* DASHBOARD TAB VIEW */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: Stats & Recent */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <VideoIcon className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Videos</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">{stats.totalVideos}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Views</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">{formatViews(stats.totalViews)}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-2 text-rose-600 mb-2">
                      <Heart className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Likes</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">{stats.totalLikes}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-2 text-teal-600 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Fans</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">{stats.followers}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] rounded-3xl overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-slate-100 dark:border-[#334155] flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Performance</h3>
                    <button onClick={() => setActiveTab('content')} className="text-xs font-bold text-blue-600 hover:underline">See all</button>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {videos.slice(0, 4).map((v) => (
                      <div key={v.videoId} className="p-4 flex items-center gap-4 group">
                        <div className="w-24 aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                          <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate mb-1">{v.title}</h4>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                            <span>{v.viewsCount} views</span>
                            <span>•</span>
                            <span>{v.likesCount} likes</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditClick(v)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteClick(v)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Quick Stats Card */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Latest Analytics</span>
                    <BarChart3 className="w-5 h-5 opacity-80" />
                  </div>
                  <h4 className="text-lg font-black mb-1">Your channel got</h4>
                  <div className="text-3xl font-black mb-1">{formatViews(stats.totalViews)} views</div>
                  <p className="text-xs font-bold opacity-80">in the last 28 days</p>
                  
                  <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold opacity-80">Subscribers</span>
                      <span className="text-sm font-black">{stats.followers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold opacity-80">Engagement</span>
                      <span className="text-sm font-black">{stats.totalLikes + stats.totalComments}</span>
                    </div>
                  </div>
                  
                  <button onClick={() => setActiveTab('analytics')} className="w-full mt-6 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-black transition-all cursor-pointer">
                    GO TO ANALYTICS
                  </button>
                </div>

                <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] rounded-3xl p-5 shadow-xs">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Top Content</h3>
                  <div className="space-y-4">
                    {topVideos.map((v, i) => (
                      <div key={v.videoId} className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{v.title}</p>
                          <p className="text-[10px] font-bold text-blue-600">{v.viewsCount} views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTENT MANAGEMENT TAB VIEW */}
          {activeTab === 'content' && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] rounded-3xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#1E293B]/30 flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Video Catalog</span>
                <span className="text-[10px] font-bold text-slate-400">{videos.length} videos total</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Video</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Visibility</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Views</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Engagement</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {videos.length === 0 ? (
                      <tr><td colSpan={6} className="p-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">Your channel is empty. Upload your first video!</td></tr>
                    ) : (
                      videos.map((v) => (
                        <tr key={v.videoId} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4 min-w-[300px]">
                            <div className="flex gap-4 items-center">
                              <div className="w-24 aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                                <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                {v.isShort && <div className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Short</div>}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate hover:text-blue-600 cursor-pointer" onClick={() => navigate('watch', v.videoId)}>{v.title}</h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{v.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-400">
                              {v.visibility === 'public' ? <Globe className="w-3 h-3 text-green-500" /> : v.visibility === 'private' ? <Lock className="w-3 h-3 text-rose-500" /> : <EyeOff className="w-3 h-3 text-amber-500" />}
                              {v.visibility}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-bold text-slate-500">{new Date(v.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white text-xs">
                            {v.viewsCount}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-500 text-xs">
                            <div className="flex flex-col items-end gap-1">
                              <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-500" /> {v.likesCount}</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-blue-500" /> {v.commentsCount}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditClick(v)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-500 hover:text-blue-600 rounded-xl transition-all cursor-pointer"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteClick(v)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ANALYTICS TAB VIEW */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-8 rounded-[2rem] shadow-sm text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2 shadow-inner border border-blue-100 dark:border-blue-900/30">
                  <BarChart3 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Channel Analytics</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold max-w-lg mx-auto">
                  Your channel got <span className="text-blue-600 font-black">{formatViews(stats.totalViews)} views</span> in the last 28 days.
                </p>
              </div>

              {/* YT Style Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Views', value: formatViews(stats.totalViews), change: '+12%', icon: Eye, color: 'blue' },
                  { label: 'Watch time (hours)', value: (stats.totalViews * 0.05).toFixed(1), change: '+8%', icon: BarChart3, color: 'indigo' },
                  { label: 'Followers', value: stats.followers, change: '+24', icon: Users, color: 'teal' },
                  { label: 'Revenue', value: '₹0.00', change: '0%', icon: TrendingUp, color: 'emerald' }
                ].map((m, i) => (
                  <div key={i} className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl shadow-xs hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">{m.label}</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{m.value}</p>
                      <span className="text-[10px] font-bold text-green-500">{m.change}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Large Views Chart */}
              <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] rounded-[2.5rem] p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Views</h3>
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-[#1E293B] rounded-xl">
                    <button className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-400">7D</button>
                    <button className="px-4 py-1.5 bg-white dark:bg-blue-600 shadow-sm rounded-lg text-[10px] font-black uppercase text-blue-600 dark:text-white">28D</button>
                    <button className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-400">90D</button>
                  </div>
                </div>

                <div className="h-72 relative pt-6">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-t border-slate-200 dark:border-slate-800 w-full" />)}
                  </div>
                  
                  {/* Mock Curve - Represents real trend based on views */}
                  <svg viewBox="0 0 1000 200" className="w-full h-full relative z-10 overflow-visible drop-shadow-lg">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,160 C100,150 200,80 300,100 C400,120 500,40 600,60 C700,80 800,20 900,40 C1000,60 1000,60 1000,60"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M0,160 C100,150 200,80 300,100 C400,120 500,40 600,60 C700,80 800,20 900,40 C1000,60 1000,60 1000,200 L0,200 Z"
                      fill="url(#chartGrad)"
                    />
                    
                    {/* Data Points */}
                    {[0, 300, 600, 900].map((x, i) => (
                      <circle key={i} cx={x} cy={160 - (i * 30)} r="6" fill="#2563EB" stroke="white" strokeWidth="2" />
                    ))}
                  </svg>
                  
                  <div className="flex justify-between mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    <span>Oct 1</span>
                    <span>Oct 7</span>
                    <span>Oct 14</span>
                    <span>Oct 21</span>
                    <span>Oct 28</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[11px] font-bold text-slate-500">
                    Your views are <span className="text-green-500">up 12%</span> compared to the previous 28 days.
                  </p>
                </div>
              </div>

              {/* Bottom Split: Top Content & Realtime */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] rounded-[2rem] p-6 shadow-xs">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
                    Top Videos 
                    <span className="text-[10px] font-bold text-blue-600">Views • 28 Days</span>
                  </h3>
                  <div className="space-y-4">
                    {topVideos.map((v, i) => (
                      <div key={v.videoId} className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-20 aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-800">
                          <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{v.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(v.viewsCount / (topVideos[0].viewsCount || 1)) * 100}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 shrink-0">{formatViews(v.viewsCount)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] rounded-[2rem] p-6 shadow-xs space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Realtime</h3>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">Updating live</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-3xl font-black text-blue-600">{(stats.totalViews * 0.01).toFixed(0)}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Views • Last 48 hours</p>
                    </div>

                    <div className="flex items-end justify-between h-20 gap-1 px-2">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-t-sm hover:bg-blue-500 transition-colors"
                          style={{ height: `${Math.random() * 80 + 20}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                      <span>48 hours ago</span>
                      <span>Now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* PUBLISH / EDIT VIDEO MODAL FORM */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => !isUploading && setPublishModalOpen(false)} />

          <div className="relative bg-white dark:bg-[#111827] rounded-3xl p-6 md:p-8 shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-[#334155] z-10 my-8 animate-zoom-in">
            <button
              onClick={() => setPublishModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingVideo ? 'Refine Video Details' : 'Publish Creative Content'}
            </h2>

            <form onSubmit={handlePublishOrEdit} className="space-y-5 text-xs font-bold">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Metadata */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Video Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. My Amazing Creative Journey"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-extrabold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-extrabold appearance-none"
                    >
                      {categoriesList.filter(c => c !== 'All').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Description</label>
                    <textarea
                      placeholder="Share context with your viewers..."
                      rows={4}
                      maxLength={5000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                    />
                  </div>
                </div>

                {/* Right: Media Source */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Video Source *</label>
                    
                    {!editingVideo && (
                      <div className="grid grid-cols-1 gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => !isUploading && fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-600 transition-all group bg-slate-50 dark:bg-slate-900/40 cursor-pointer"
                        >
                          {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                              <span className="text-[10px] font-black uppercase">Uploading {uploadProgress}%</span>
                              {uploadProgress === 0 && (
                                <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                                  Initializing stream... please wait.
                                </p>
                              )}
                              <div 
                                onClick={(e) => { e.stopPropagation(); cancelUpload(); }}
                                className="mt-2 px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg text-[9px] font-black uppercase hover:bg-rose-100 transition-colors"
                              >
                                Cancel Upload
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-5 h-5 text-blue-600" />
                              </div>
                              <span className="text-[10px] font-black uppercase">Click to Select File</span>
                              <span className="text-[9px] font-bold text-slate-400">MP4, WebM (Max 100MB)</span>
                            </>
                          )}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" className="hidden" />
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type="url"
                        required
                        placeholder="Or paste Link (YouTube, GDrive, Direct URL)"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-extrabold pr-10"
                      />
                      {videoUrl && <Globe className="w-4 h-4 text-blue-500 absolute right-3 top-3.5" />}
                    </div>
                    <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold mt-1 px-1">
                      💡 Recommended: Use YouTube/Drive links for unlimited free storage.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Custom Thumbnail (URL)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/thumbnail.jpg"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-extrabold"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3.5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <input
                      type="checkbox"
                      id="is-shorts-modal"
                      checked={isShort}
                      onChange={(e) => setIsShort(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer w-5 h-5"
                    />
                    <label htmlFor="is-shorts-modal" className="text-[11px] font-black text-blue-900 dark:text-blue-300 cursor-pointer select-none uppercase tracking-wide">
                      Mark as SocialIndia Short (Vertical)
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Visibility Control</label>
                  <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800">
                    {['public', 'unlisted', 'private'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVisibility(v as any)}
                        style={{ backgroundColor: visibility === v ? '#1d4ed8' : '#ffffff', color: visibility === v ? '#ffffff' : '#4b5563' }}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border-2 ${
                          visibility === v 
                            ? 'border-blue-700 shadow-xl' 
                            : 'border-transparent hover:border-slate-300'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Tags</label>
                  <input
                    type="text"
                    placeholder="react, vlogs, coding..."
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-extrabold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-8 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  disabled={isUploading}
                  style={{ backgroundColor: '#e2e8f0', color: '#1e293b' }}
                  className="px-6 py-3.5 font-black rounded-2xl cursor-pointer hover:bg-slate-300 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !videoUrl}
                  className="px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl cursor-pointer shadow-xl shadow-blue-600/30 transition-all active:scale-95 uppercase text-[10px] tracking-widest disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingVideo ? 'Update Video' : 'Publish to Feed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#111827] rounded-[2.5rem] p-8 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-zoom-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-center text-slate-900 dark:text-white uppercase tracking-tight">Delete Content?</h3>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 font-bold mt-2 leading-relaxed">
              Are you sure you want to permanently delete <span className="text-slate-900 dark:text-white">"{videoToDelete?.title}"</span>? This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteModalOpen(false)}
                className="py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDeleteVideo}
                className="py-3.5 bg-rose-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
