import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { userService } from '../services/userService';
import { videoService } from '../services/videoService';
import { getInitials } from '../utils/videoUtils';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Save, Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

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

  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      </div>
    </div>
  );
};
