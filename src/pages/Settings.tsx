import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { videoService } from '../services/videoService';
import { getInitials } from '../utils/videoUtils';
import { 
  Settings as SettingsIcon, 
  ArrowLeft,
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
  User as UserIcon,
  Palette,
  Bell,
  Sliders,
  Image as ImageIcon,
  Sparkles,
  Camera
} from 'lucide-react';
import { downloadService } from '../services/downloadService';

export const Settings: React.FC = () => {
  const { currentUser, currentUserProfile, theme, setTheme, addToast, refreshProfile } = useApp();
  const { navigate } = useRouter();

  // Active Tab State (YouTube Studio Style)
  const [activeTab, setActiveTab] = useState<'branding' | 'basic' | 'preferences' | 'verification'>('branding');

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bannerURL, setBannerURL] = useState('');
  
  // Social Links state
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [ytLink, setYtLink] = useState('');
  const [website, setWebsite] = useState('');
  const [telegram, setTelegram] = useState('');
  
  // Notification states
  const [allowLikes, setAllowLikes] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [allowFollowers, setAllowFollowers] = useState(true);
  const [allowUploads, setAllowUploads] = useState(true);

  // Settings states
  const [cacheSize, setCacheSize] = useState(0);
  const [maxResolution, setMaxResolution] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [wifiOnly, setWifiOnly] = useState(false);

  // Verification request states
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);
  const [verificationCategory, setVerificationCategory] = useState('Technology');
  const [verificationPitch, setVerificationPitch] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load storage usage and verification request
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
        console.warn('Verification check failed:', err);
      }
    }
  };

  useEffect(() => {
    loadCacheAndVerification();
  }, [currentUser]);

  useEffect(() => {
    if (currentUserProfile) {
      setDisplayName(currentUserProfile.displayName || '');
      setUsername(currentUserProfile.username || '');
      setBio(currentUserProfile.bio || '');
      setPhotoURL(currentUserProfile.photoURL || '');
      setBannerURL(currentUserProfile.bannerURL || '');
      setInstagram(currentUserProfile.socialLinks?.instagram || '');
      setTwitter(currentUserProfile.socialLinks?.twitter || '');
      setYtLink(currentUserProfile.socialLinks?.youtube || '');
      setWebsite(currentUserProfile.socialLinks?.website || '');
      setTelegram(currentUserProfile.socialLinks?.telegram || '');
      setAllowLikes((currentUserProfile as any).allowNotificationLikes !== false);
      setAllowComments((currentUserProfile as any).allowNotificationComments !== false);
      setAllowFollowers((currentUserProfile as any).allowNotificationFollowers !== false);
      setAllowUploads((currentUserProfile as any).allowNotificationUploads !== false);
    }
  }, [currentUserProfile]);

  // Auto Save Changes to Firestore
  const triggerAutoSave = (updatedData: Partial<any>) => {
    if (!currentUser) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSavingStatus('saving');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await userService.updateProfile(currentUser.uid, updatedData);
        await refreshProfile();
        setSavingStatus('saved');
        setLastSaved(new Date());
        setTimeout(() => setSavingStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSavingStatus('error');
        addToast('Auto-save failed. Please check connection.', 'error');
      }
    }, 800);
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
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    setSavingStatus('saving');
    try {
      const taken = await userService.isUsernameTaken(val);
      if (taken) {
        setUsernameError('Username is already taken');
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

  const handleSocialLinkChange = (key: string, value: string) => {
    let newInsta = instagram;
    let newTwit = twitter;
    let newYt = ytLink;
    let newWeb = website;
    let newTeleg = telegram;

    if (key === 'instagram') { newInsta = value; setInstagram(value); }
    if (key === 'twitter') { newTwit = value; setTwitter(value); }
    if (key === 'youtube') { newYt = value; setYtLink(value); }
    if (key === 'website') { newWeb = value; setWebsite(value); }
    if (key === 'telegram') { newTeleg = value; setTelegram(value); }

    triggerAutoSave({
      socialLinks: {
        instagram: newInsta,
        twitter: newTwit,
        youtube: newYt,
        website: newWeb,
        telegram: newTeleg
      }
    });
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      addToast('Image size should be less than 800KB for fast sync.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoURL(result);
        triggerAutoSave({ photoURL: result });
        addToast('Profile picture updated!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      addToast('Banner image size should be less than 800KB for fast sync.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setBannerURL(result);
        triggerAutoSave({ bannerURL: result });
        addToast('Channel banner updated!', 'success');
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

    triggerAutoSave(updates);
  };

  const handleClearCache = async () => {
    try {
      await downloadService.clearAllOfflineDownloads();
      setCacheSize(0);
      addToast('All offline downloads cleared successfully!', 'success');
    } catch (e) {
      addToast('Failed to clear download cache.', 'error');
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !verificationPitch.trim()) return;

    setIsSubmittingVerification(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      await setDoc(doc(db, 'verification_requests', currentUser.uid), {
        uid: currentUser.uid,
        username: username || currentUserProfile?.username,
        displayName: displayName || currentUserProfile?.displayName,
        category: verificationCategory,
        pitch: verificationPitch.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending'
      });

      setVerificationSubmitted(true);
      addToast('Verification request submitted successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to submit verification request.', 'error');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleExportData = () => {
    if (!currentUserProfile) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUserProfile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${currentUserProfile.username || 'channel'}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Channel JSON backup downloaded!', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 pb-24">
      
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

      {/* TOP HEADER: Channel Customization & Auto-Save Indicator */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          {/* Mobile & Desktop Back Button */}
          <button
            onClick={() => navigate('home')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-blue-600 dark:bg-[#1e293b] dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 hover:text-white dark:hover:text-white rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border border-slate-200 dark:border-slate-800 shadow-2xs active:scale-95"
            title="Back to Home"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back</span>
          </button>

          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 text-[#065fd4] dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>Channel Customization</span>
              {currentUserProfile?.role === 'creator' && (
                <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Verified Creator
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              Customize your channel branding, profile info, and viewer preferences
            </p>
          </div>
        </div>

        {/* Auto-Save Indicator */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl shrink-0 self-start sm:self-auto">
          {savingStatus === 'saving' && (
            <>
              <Loader2 className="w-4 h-4 text-[#065fd4] animate-spin" />
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">Saving changes...</span>
            </>
          )}
          {savingStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">All changes saved</span>
            </>
          )}
          {savingStatus === 'error' && (
            <>
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-black text-rose-500">Save failed</span>
            </>
          )}
          {savingStatus === 'idle' && (
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {lastSaved ? `Auto-saved at ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Auto-save active'}
            </span>
          )}
        </div>

      </div>

      {/* YOUTUBE STUDIO NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#334155] overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'branding', label: 'Branding', icon: Palette },
          { id: 'basic', label: 'Basic Info', icon: UserIcon },
          { id: 'preferences', label: 'Preferences & System', icon: Sliders },
          { id: 'verification', label: 'Verification & Privacy', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 font-extrabold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#065fd4] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BRANDING (Banner & Avatar) */}
      {activeTab === 'branding' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Channel Banner Section */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Channel Banner Image
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  This image will appear across the top of your channel page on web & mobile.
                </p>
              </div>
            </div>

            {/* Banner Live Box */}
            <div className="relative w-full h-40 sm:h-52 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 flex items-center justify-center group shadow-inner">
              {bannerURL ? (
                <img src={bannerURL} alt="Banner Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">No Custom Banner Uploaded</p>
                </div>
              )}
            </div>

            {/* Always-Visible Action Buttons (No hover opacity bugs!) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="px-5 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{bannerURL ? 'Change Banner' : 'Upload Banner'}</span>
              </button>

              {bannerURL && (
                <button
                  type="button"
                  onClick={() => {
                    setBannerURL('');
                    triggerAutoSave({ bannerURL: '' });
                    addToast('Banner removed', 'info');
                  }}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 font-extrabold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Remove Banner
                </button>
              )}

              <span className="text-[11px] font-semibold text-slate-400 ml-auto">
                Recommended: 2048 x 1152 pixels (PNG or JPG under 800KB)
              </span>
            </div>
          </div>

          {/* Profile Picture / Avatar Section */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Profile Picture / Avatar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Your profile picture appears where your channel is presented on SocialIndia (e.g. next to your videos & comments).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              {/* Avatar Preview */}
              <div className="relative w-24 h-24 rounded-full bg-[#065fd4] text-white flex items-center justify-center font-black text-3xl border-4 border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden shrink-0">
                {photoURL ? (
                  <img src={photoURL} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials(displayName || 'User')}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-5 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{photoURL ? 'Change Picture' : 'Upload Picture'}</span>
                  </button>

                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoURL('');
                        triggerAutoSave({ photoURL: '' });
                        addToast('Profile picture removed', 'info');
                      }}
                      className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-extrabold text-xs rounded-xl border border-rose-200 dark:border-rose-900/40 transition-all cursor-pointer"
                    >
                      Remove Picture
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 font-semibold">
                  Recommended: At least 98 x 98 pixels in PNG or JPG format (under 800KB).
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: BASIC INFO (Display Name, Username & Bio) */}
      {activeTab === 'basic' && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in duration-200">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Basic Channel Details
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              Choose how your channel name, handle, and biography appear to viewers across India and globally.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Display Name */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Display Name *
                </label>
                <span className="text-[10px] text-slate-400 font-bold">{displayName.length}/50</span>
              </div>
              <input
                type="text"
                required
                maxLength={50}
                value={displayName}
                onChange={handleDisplayNameChange}
                placeholder="e.g. India Creator Hub"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white font-extrabold text-sm focus:outline-none focus:border-[#065fd4] focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                Choose a channel name that represents you and your content.
              </p>
            </div>

            {/* Username (@handle) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Username (@handle) *
                </label>
                <span className="text-[10px] text-slate-400 font-bold">{username.length}/30</span>
              </div>
              
              <div className="flex items-center">
                <span className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm rounded-l-2xl border border-r-0 border-slate-200 dark:border-slate-700">
                  @
                </span>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="handle_name"
                  className={`w-full px-4 py-3 rounded-r-2xl border ${
                    usernameError 
                      ? 'border-rose-500 ring-2 ring-rose-500/20' 
                      : 'border-slate-200 dark:border-[#334155]'
                  } bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white font-extrabold text-sm focus:outline-none focus:border-[#065fd4] transition-all`}
                />
              </div>

              {usernameError ? (
                <p className="text-xs text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{usernameError}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 font-semibold mt-1">
                  Your unique handle URL: <strong className="text-[#065fd4]">socialindia.app/@{username || 'handle'}</strong>
                </p>
              )}
            </div>

          </div>

          {/* Bio / Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Biography (Bio)
              </label>
              <span className="text-[10px] text-slate-400 font-bold">{160 - bio.length} characters left</span>
            </div>
            <textarea
              value={bio}
              onChange={handleBioChange}
              placeholder="Tell viewers about your channel, upload schedule, and creative vision..."
              rows={4}
              maxLength={160}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white font-medium text-xs leading-relaxed focus:outline-none focus:border-[#065fd4] focus:ring-2 focus:ring-blue-600/20 transition-all resize-none"
            />
          </div>

          {/* Social Links Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Social Profiles & Website Links
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Add links to your Instagram, Twitter, YouTube, Website, and Telegram for viewers to connect.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Instagram URL / Handle</label>
                <input 
                  type="text" 
                  placeholder="https://instagram.com/your_handle"
                  value={instagram}
                  onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Twitter / X URL</label>
                <input 
                  type="text" 
                  placeholder="https://x.com/your_handle"
                  value={twitter}
                  onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">YouTube Channel URL</label>
                <input 
                  type="text" 
                  placeholder="https://youtube.com/@channel"
                  value={ytLink}
                  onChange={(e) => handleSocialLinkChange('youtube', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Website / Portfolio</label>
                <input 
                  type="text" 
                  placeholder="https://yourwebsite.com"
                  value={website}
                  onChange={(e) => handleSocialLinkChange('website', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Telegram Channel / Group</label>
                <input 
                  type="text" 
                  placeholder="https://t.me/your_channel"
                  value={telegram}
                  onChange={(e) => handleSocialLinkChange('telegram', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: PREFERENCES & SYSTEM (Theme, Notifications, Downloads) */}
      {activeTab === 'preferences' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Appearance Theme Selector */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Appearance Theme
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Customize your viewing experience with Light mode or Dark Night theme
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'light', label: 'Light Mode', icon: Sun, color: 'text-amber-500' },
                { id: 'dark', label: 'Dark Night', icon: Moon, color: 'text-blue-500' },
                { id: 'system', label: 'System Default', icon: Monitor, color: 'text-slate-500' }
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as any)}
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all shadow-xs ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-[#065fd4] text-[#065fd4] dark:text-blue-400 font-extrabold'
                        : 'bg-slate-50 dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${t.color}`} />
                    <span className="text-xs font-black">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Bell className="w-5 h-5 text-[#065fd4]" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Notification Alerts
              </h3>
            </div>

            <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60">
              {[
                { id: 'likes', label: 'Likes Alerts', desc: 'Receive notification when viewers like your videos', value: allowLikes },
                { id: 'comments', label: 'Comments Alerts', desc: 'Receive notification when viewers comment on your videos', value: allowComments },
                { id: 'followers', label: 'New Subscriber Alerts', desc: 'Receive notification when someone subscribes to your channel', value: allowFollowers },
                { id: 'uploads', label: 'Subscribed Channel Uploads', desc: 'Receive notification when creators you follow upload new videos', value: allowUploads }
              ].map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white block">{item.label}</label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{item.desc}</span>
                  </div>
                  
                  {/* Custom Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleNotificationChange(item.id, !item.value)}
                    className={`w-12 h-6 rounded-full transition-colors cursor-pointer p-1 flex items-center ${
                      item.value ? 'bg-[#065fd4] justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Offline Downloads Settings */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Wifi className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Offline Downloads Manager
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-black block text-slate-900 dark:text-white">Preferred Download Resolution</label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Maximum quality used when saving videos offline</span>
                </div>
                <select
                  value={maxResolution}
                  onChange={(e) => setMaxResolution(e.target.value as any)}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#065fd4] cursor-pointer"
                >
                  <option value="1080p">1080p (Full HD - High Quality)</option>
                  <option value="720p">720p (HD - Balanced Data)</option>
                  <option value="480p">480p (SD - Data Saver)</option>
                </select>
              </div>

              {/* Clear Download Cache */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#1e293b]/30 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white block">Offline Storage Occupied</label>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {cacheSize === 0 ? '0.0 MB' : `${(cacheSize / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={cacheSize === 0}
                  className="px-4 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-extrabold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Offline Downloads</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: VERIFICATION & PRIVACY */}
      {activeTab === 'verification' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Creator Verification Badge Request */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-5 h-5 text-[#065fd4]" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Official Channel Verification
              </h3>
            </div>

            {currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin' ? (
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-300">Channel Officially Verified</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                    Your channel is verified as an official creator channel. A blue verification badge ✓ is displayed next to your channel name everywhere!
                  </p>
                </div>
              </div>
            ) : verificationSubmitted ? (
              <div className="p-5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-900 dark:text-blue-300">Verification Application Pending</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
                    Your application for an official verified creator badge is under review by our platform team.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitVerification} className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  Apply for a verified creator badge to show viewers your channel's authenticity and unlock creator tools.
                </p>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Primary Video Category
                  </label>
                  <select
                    value={verificationCategory}
                    onChange={(e) => setVerificationCategory(e.target.value)}
                    className="w-full sm:w-72 px-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#065fd4] cursor-pointer"
                  >
                    <option value="Technology">Technology & Coding</option>
                    <option value="Education">Education</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Music">Music & Entertainment</option>
                    <option value="Comedy">Comedy & Art</option>
                    <option value="Vlog">Vlogging & Travel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Pitch / Social Links (e.g. YouTube, Twitter) *
                  </label>
                  <textarea
                    value={verificationPitch}
                    onChange={(e) => setVerificationPitch(e.target.value)}
                    required
                    rows={3}
                    placeholder="Tell us why your channel should be verified. Provide your existing social media links if any..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-none focus:border-[#065fd4] text-xs font-semibold resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingVerification || !verificationPitch.trim()}
                  className="px-6 py-3 bg-[#065fd4] hover:bg-[#054fb1] disabled:opacity-40 text-white font-black text-xs rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2 active:scale-95"
                >
                  {isSubmittingVerification ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Apply for Verified Badge</span>
                </button>
              </form>
            )}
          </div>

          {/* Data Export / JSON Backup */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <FileJson className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Privacy & Channel Data Backup
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Export and download a full digital archive backup of your public channel profile data in structured JSON format.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#1e293b]/30 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-xs font-black block text-slate-900 dark:text-white">Export Public Channel Data</span>
                <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Download `.json` data backup of your profile.</span>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-md active:scale-95 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Backup JSON</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
