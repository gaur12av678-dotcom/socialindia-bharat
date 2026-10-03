import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { userService } from '../services/userService';
import { videoService } from '../services/videoService';
import { getInitials } from '../utils/videoUtils';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Monitor, 
  Save, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  Wifi,
  HardDrive,
  Download,
  Trash2,
  FileJson,
  Check,
  History
} from 'lucide-react';
import { downloadService } from '../services/downloadService';

export const Settings: React.FC = () => {
  const { currentUser, currentUserProfile, theme, setTheme, addToast, refreshProfile } = useApp();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bannerURL, setBannerURL] = useState('');
  
  // Notification states
  const [allowLikes, setAllowLikes] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [allowFollowers, setAllowFollowers] = useState(true);
  const [allowUploads, setAllowUploads] = useState(true);

  // New setting features states
  const [cacheSize, setCacheSize] = useState(0);
  const [maxResolution, setMaxResolution] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [wifiOnly, setWifiOnly] = useState(false);
  const [trackHistory, setTrackHistory] = useState(true);

  // Creator Verification requests
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);
  const [verificationCategory, setVerificationCategory] = useState('Technology');
  const [verificationPitch, setVerificationPitch] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Cache & Check Verification application status
  const loadCacheAndVerification = async () => {
    try {
      const size = await downloadService.getTotalStorageUsage();
      setCacheSize(size);
    } catch (e) {
      console.warn(e);
    }

    if (currentUser) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const snap = await getDoc(doc(db, 'verification_requests', currentUser.uid));
        if (snap.exists()) {
          setVerificationSubmitted(true);
        }
      } catch (err) {
        console.warn('Could not fetch verification request status:', err);
      }
    }
  };

  useEffect(() => {
    loadCacheAndVerification();
  }, [currentUser]);

  const handleClearCache = async () => {
    if (window.confirm('Clear all offline downloads? This will delete all downloaded videos and shorts from this device.')) {
      try {
        const items = await downloadService.getAllDownloads();
        await Promise.all(items.map(item => downloadService.deleteDownload(item.videoId)));
        setCacheSize(0);
        addToast('Offline downloads cache cleared successfully!', 'success');
      } catch {
        addToast('Failed to clear cache.', 'error');
      }
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserProfile) return;
    setIsSubmittingVerification(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await setDoc(doc(db, 'verification_requests', currentUser.uid), {
        uid: currentUser.uid,
        username: currentUserProfile.username,
        displayName: currentUserProfile.displayName,
        category: verificationCategory,
        pitch: verificationPitch.trim(),
        submittedAt: new Date().toISOString(),
        status: 'pending'
      });
      setVerificationSubmitted(true);
      addToast('Verification badge application submitted for admin review!', 'success');
    } catch (err) {
      addToast('Failed to submit application.', 'error');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleExportData = () => {
    if (!currentUserProfile) return;
    const data = {
      profile: currentUserProfile,
      exportedAt: new Date().toISOString(),
      platform: 'SocialIndia',
      compliance: 'IT Act Rules 2021 Safe Data Portability'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socialindia_profile_export_${currentUserProfile.username}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Account data backup JSON exported!', 'success');
  };

  // Initialize values
  useEffect(() => {
    if (currentUserProfile) {
      setDisplayName(currentUserProfile.displayName || '');
      setUsername(currentUserProfile.username || '');
      setBio(currentUserProfile.bio || '');
      setPhotoURL(currentUserProfile.photoURL || '');
      setBannerURL(currentUserProfile.bannerURL || '');

      userService.getPrivateInfo(currentUserProfile.uid).then(info => {
        if (info) {
          setAllowLikes(info.allowNotificationLikes !== false);
          setAllowComments(info.allowNotificationComments !== false);
          setAllowFollowers(info.allowNotificationFollowers !== false);
          setAllowUploads(info.allowNotificationUploads !== false);
        }
      });
    }
  }, [currentUserProfile]);

  // Auto-save logic
  const triggerAutoSave = (updates: any, isPrivate = false) => {
    if (!currentUser) return;
    
    setSavingStatus('saving');
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (isPrivate) {
          await userService.setPrivateInfo(currentUser.uid, {
            email: currentUser.email || '',
            theme: theme,
            allowNotificationLikes: allowLikes,
            allowNotificationComments: allowComments,
            allowNotificationFollowers: allowFollowers,
            allowNotificationUploads: allowUploads,
            ...updates
          });
        } else {
          // Check image sizes for profile updates
          if ((updates.photoURL && updates.photoURL.length > 800000) || 
              (updates.bannerURL && updates.bannerURL.length > 800000)) {
            addToast('Image is too large. Max ~800KB for Firestore documents.', 'error');
            setSavingStatus('error');
            return;
          }

          await userService.updateProfile(currentUser.uid, updates);
          
          // NEW: If core profile details changed, sync them to all existing videos
          if (updates.photoURL || updates.displayName || updates.username) {
            await videoService.syncCreatorProfileToVideos(currentUser.uid, {
              photoURL: updates.photoURL,
              displayName: updates.displayName,
              username: updates.username
            });
          }
          
          await refreshProfile();
        }
        
        setSavingStatus('saved');
        setLastSaved(new Date());
        
        // Return to idle after a few seconds
        setTimeout(() => setSavingStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSavingStatus('error');
        addToast('Auto-save failed. Check connection.', 'error');
      }
    }, 1000); // 1 second debounce
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    if (val.trim()) {
      triggerAutoSave({ displayName: val.trim() });
    }
  };
  
  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    setUsername(val);
    setUsernameError('');
    
    if (val === currentUserProfile?.username) return;
    
    if (val.length < 3) {
      setUsernameError('Username too short');
      return;
    }

    setSavingStatus('saving');
    try {
      const taken = await userService.isUsernameTaken(val);
      if (taken) {
        setUsernameError('Username already taken');
        setSavingStatus('error');
      } else {
        triggerAutoSave({ username: val });
      }
    } catch (err) {
      setUsernameError('Check failed');
      setSavingStatus('error');
    }
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBio(val);
    triggerAutoSave({ bio: val.trim() });
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      addToast('Image size should be less than 800KB for cloud sync.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoURL(result);
        triggerAutoSave({ photoURL: result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      addToast('Banner image size should be less than 800KB for cloud sync.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setBannerURL(result);
        triggerAutoSave({ bannerURL: result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    const updates = {
      allowNotificationLikes: field === 'likes' ? value : allowLikes,
      allowNotificationComments: field === 'comments' ? value : allowComments,
      allowNotificationFollowers: field === 'followers' ? value : allowFollowers,
      allowNotificationUploads: field === 'uploads' ? value : allowUploads,
    };
    
    if (field === 'likes') setAllowLikes(value);
    if (field === 'comments') setAllowComments(value);
    if (field === 'followers') setAllowFollowers(value);
    if (field === 'uploads') setAllowUploads(value);

    triggerAutoSave(updates, true);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    triggerAutoSave({ theme: newTheme }, true);
    addToast(`Theme switched to ${newTheme}!`, 'success');
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <SettingsIcon className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">Sign in to view settings</h3>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 font-medium">Configure your personal SocialIndia channel settings.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto pb-20">
      
      {/* Title Header with Auto-Save Status */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-tight">Channel Settings</h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 font-medium">Auto-saves changes to your public profile</p>
          </div>
        </div>

        {/* Auto-save Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all">
          {savingStatus === 'saving' && (
            <>
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Saving...</span>
            </>
          )}
          {savingStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">All changes saved</span>
            </>
          )}
          {savingStatus === 'error' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[10px] font-bold text-rose-500">Save failed</span>
            </>
          )}
          {savingStatus === 'idle' && lastSaved && (
            <span className="text-[9px] font-medium text-slate-400">Last saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Hidden File Inputs */}
        <input 
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileSelect}
        />
        <input 
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerFileSelect}
        />

        {/* 1. CHANNEL BRANDING & IMAGES */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl space-y-6 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Channel Branding</h3>
          
          {/* Banner Upload Box */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
              Channel Banner
            </label>
            <div className="relative w-full h-32 sm:h-40 bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center group">
              {bannerURL ? (
                <img src={bannerURL} alt="Banner Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4 text-white/50 text-xs font-bold">
                  No Banner Image Set
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Banner</span>
                </button>
              </div>
            </div>
          </div>

          {/* Avatar Upload Box */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
              Profile Avatar
            </label>
            
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-black text-2xl border-2 border-slate-200 dark:border-slate-700 shadow-md overflow-hidden shrink-0">
                {photoURL ? (
                  <img src={photoURL} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials(displayName || 'User')}</span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Change Avatar</span>
                  </button>
                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoURL('');
                        triggerAutoSave({ photoURL: '' });
                      }}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CHANNEL IDENTITY (Display Name, Username & Bio) */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl space-y-4 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Channel Profile Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={handleDisplayNameChange}
                placeholder="e.g. India Bharat"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Username (@handle)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="username"
                  className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border ${usernameError ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-slate-200 dark:border-[#334155]'} bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-semibold`}
                />
              </div>
              {usernameError && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{usernameError}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Biography (Bio)</label>
            <textarea
              value={bio}
              onChange={handleBioChange}
              placeholder="Tell viewers about your channel and creative vision..."
              rows={3}
              maxLength={160}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-medium"
            />
            <p className="text-[10px] text-right text-slate-400 dark:text-slate-500 font-bold mt-1">{160 - bio.length} characters left</p>
          </div>
        </div>

        {/* 3. Appearance theme selection */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl space-y-4 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Appearance Theme</h3>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                theme === 'light' 
                  ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40' 
                  : 'bg-slate-50 hover:bg-blue-50/50 dark:bg-[#1E293B] border-slate-200 dark:border-[#334155]'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-extrabold">Light</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                theme === 'dark' 
                  ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' 
                  : 'bg-slate-50 hover:bg-blue-50/50 dark:bg-[#1E293B] border-slate-200 dark:border-[#334155]'
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-500" />
              <span className="text-xs font-extrabold">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                theme === 'system' 
                  ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' 
                  : 'bg-slate-50 hover:bg-blue-50/50 dark:bg-[#1E293B] border-slate-200 dark:border-[#334155]'
              }`}
            >
              <Monitor className="w-5 h-5 text-slate-500" />
              <span className="text-xs font-extrabold">System</span>
            </button>
          </div>
        </div>

        {/* 4. Private Notification settings */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl space-y-4 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Notification Preferences</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold block text-slate-900 dark:text-[#F8FAFC]">Likes alerts</label>
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">Receive notification when somebody likes your videos</span>
              </div>
              <input
                type="checkbox"
                checked={allowLikes}
                onChange={(e) => handleNotificationChange('likes', e.target.checked)}
                className="rounded text-blue-600 cursor-pointer w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-xs font-bold block text-slate-900 dark:text-[#F8FAFC]">Comments alerts</label>
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">Receive notification when somebody leaves a comment</span>
              </div>
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => handleNotificationChange('comments', e.target.checked)}
                className="rounded text-blue-600 cursor-pointer w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-xs font-bold block text-slate-900 dark:text-[#F8FAFC]">Follower alerts</label>
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">Receive notification when somebody follows your channel</span>
              </div>
              <input
                type="checkbox"
                checked={allowFollowers}
                onChange={(e) => handleNotificationChange('followers', e.target.checked)}
                className="rounded text-blue-600 cursor-pointer w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-xs font-bold block text-slate-900 dark:text-[#F8FAFC]">New upload alerts</label>
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">Receive notification when followed channels upload</span>
              </div>
              <input
                type="checkbox"
                checked={allowUploads}
                onChange={(e) => handleNotificationChange('uploads', e.target.checked)}
                className="rounded text-blue-600 cursor-pointer w-4 h-4"
              />
            </div>
          </div>
        </div>

        {/* 5. OFFLINE DOWNLOAD MANAGER PREFERENCES (Kaam Ki Chiz!) */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl space-y-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">Offline Downloads Settings</h3>
          </div>

          <div className="space-y-4">
            {/* Preferred Video Resolution */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-extrabold block text-slate-900 dark:text-[#F8FAFC]">Preferred Resolution Quality</label>
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-semibold">Maximum resolution used when saving videos offline</span>
              </div>
              <select
                value={maxResolution}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setMaxResolution(val);
                  addToast(`Max download resolution set to ${val}`, 'info');
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="1080p">1080p (Full HD - High Detail)</option>
                <option value="720p">720p (HD - Balanced)</option>
                <option value="480p">480p (SD - Data Saver)</option>
              </select>
            </div>

            {/* Wifi only toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-xs font-extrabold block text-slate-900 dark:text-[#F8FAFC]">Download over Wi-Fi Only</label>
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-semibold">Restrict downloading to active Wi-Fi connections</span>
              </div>
              <input
                type="checkbox"
                checked={wifiOnly}
                onChange={(e) => {
                  setWifiOnly(e.target.checked);
                  addToast(e.target.checked ? 'Downloading restricted to Wi-Fi only' : 'Downloading allowed on any network', 'info');
                }}
                className="rounded text-blue-600 cursor-pointer w-4 h-4"
              />
            </div>

            {/* Clear offline storage button with Storage usage preview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#1E293B]/30 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-indigo-500 shrink-0" />
                <div>
                  <label className="text-xs font-extrabold block text-slate-900 dark:text-[#F8FAFC]">Device Storage Occupied</label>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {cacheSize === 0 ? '0.0 MB' : `${(cacheSize / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                disabled={cacheSize === 0}
                className="px-4 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-extrabold rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Downloads</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6. ACCOUNT VERIFICATION BADGE REQUEST (Creators' Favourite!) */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl space-y-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">Channel Verification</h3>
          </div>

          {currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin' ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">Channel Officially Verified</p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                  Your channel is verified as an official creator channel. A blue verification badge ✓ is displayed next to your name!
                </p>
              </div>
            </div>
          ) : verificationSubmitted ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-blue-900 dark:text-blue-300">Verification Pending Review</p>
                <p className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
                  Your application for a verification badge is under review. Our admins will review your category and social presence within 48 hours.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitVerification} className="space-y-4">
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-semibold leading-relaxed">
                Apply for a verified creator badge to show viewers your authenticity and unlock advanced tools.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Primary Video Category</label>
                  <select
                    value={verificationCategory}
                    onChange={(e) => setVerificationCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Technology">Technology & Coding</option>
                    <option value="Education">Education</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Music">Music & Entertainment</option>
                    <option value="Comedy">Comedy & Art</option>
                    <option value="Vlog">Vlogging & Travel</option>
                    <option value="News">News & Information</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Pitch / Social Links (e.g. YouTube, Twitter)</label>
                <textarea
                  value={verificationPitch}
                  onChange={(e) => setVerificationPitch(e.target.value)}
                  required
                  rows={2}
                  placeholder="Tell us why your channel should be verified. Provide social media links if any..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] focus:outline-none text-xs font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingVerification || !verificationPitch.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                {isSubmittingVerification ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Apply for Verification</span>
              </button>
            </form>
          )}
        </div>

        {/* 7. PRIVACY CENTER & DATA PORTABILITY (IT Act 2021 Compliance) */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#334155] p-6 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <FileJson className="w-5 h-5 text-amber-500" />
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">Privacy & Data Portability</h3>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-semibold leading-relaxed">
            According to privacy compliance regulations, you can download a full digital archive backup of your public channel data.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#1E293B]/20 p-4 rounded-2xl">
            <div>
              <span className="text-xs font-extrabold block text-slate-900 dark:text-white">Export Public Channel Data</span>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Download a structured .json backup of your channel profile info.</span>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export backup.json</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
