import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { ToastContainer } from './Toast';
import { AuthModal } from './AuthModal';
import { SocialIndiaLogo } from './SocialIndiaLogo';
import { 
  Home, 
  ArrowLeft,
  TrendingUp, 
  Film, 
  Zap,
  Users, 
  History, 
  Bookmark, 
  PlusSquare, 
  Bell, 
  Settings, 
  LogOut, 
  Menu, 
  Search, 
  Moon, 
  Sun, 
  User as UserIcon,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Check,
  Plus,
  HelpCircle,
  MessageSquare,
  Sparkles,
  MoreVertical,
  ArrowDownToLine,
  WifiOff,
  Info,
  Upload,
  UserCheck
} from 'lucide-react';
import { getInitials } from '../utils/videoUtils';
import { authService } from '../services/authService';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { 
    currentUser, 
    currentUserProfile, 
    theme, 
    setTheme, 
    notifications, 
    unreadCount, 
    markNotificationsAsRead,
    addToast
  } = useApp();
  
  const { route, navigate } = useRouter();
  const isShortsPage = route.path === 'shorts';
  const isWatchPage = route.path === 'watch';
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState<(() => void) | undefined>(undefined);
  const [followedCreators, setFollowedCreators] = useState<any[]>([]);

  // Close dropdowns on route change
  useEffect(() => {
    setNotifDropdownOpen(false);
    setProfileDropdownOpen(false);
    setGuestMenuOpen(false);
    setMobileSearchOpen(false);
  }, [route.path, route.param]);

  // Escape key handler to close all menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifDropdownOpen(false);
        setProfileDropdownOpen(false);
        setGuestMenuOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Pre-load YouTube API for faster video playback
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const guestRef = useRef<HTMLDivElement>(null);

  // Load followed creators for sidebar
  useEffect(() => {
    if (currentUser) {
      import('../services/subscriptionService').then(({ subscriptionService }) => {
        subscriptionService.getSubscriptions(currentUser.uid).then(setFollowedCreators).catch(console.error);
      });
    } else {
      setFollowedCreators([]);
    }
  }, [currentUser]);

  // Online / Offline connectivity listener
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global Admin Announcement Broadcast state
  const [announcement, setAnnouncement] = useState<{ active: boolean; message: string; type: string; linkText?: string; linkUrl?: string } | null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  useEffect(() => {
    import('../services/adminService').then(({ adminService }) => {
      adminService.getAnnouncement().then(ann => {
        if (ann && ann.active && ann.message) {
          setAnnouncement(ann);
        }
      }).catch(console.error);
    });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
      if (guestRef.current && !guestRef.current.contains(target)) {
        setGuestMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (route.path === 'search' && route.searchParams?.q) {
      setSearchQuery(route.searchParams.q);
    }
  }, [route]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('search', undefined, { q: searchQuery.trim() });
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.logout();
      setProfileDropdownOpen(false);
      addToast('Signed out successfully!', 'info');
      navigate('home');
    } catch (err) {
      addToast('Failed to sign out.', 'error');
    }
  };

  const triggerProtectedAction = (action: () => void) => {
    if (currentUser) {
      action();
    } else {
      navigate('login');
    }
  };

  const menuItems = [
    { label: 'Home', path: 'home', icon: Home },
    { label: 'Shorts', path: 'shorts', icon: Zap },
    { label: 'Trending', path: 'trending', icon: TrendingUp },
    { label: 'Direct Messages', path: 'chat', icon: MessageSquare, protected: true },
    { label: 'Downloads', path: 'downloads', icon: ArrowDownToLine },
    { label: 'Subscriptions', path: 'subscriptions', icon: Users, protected: true },
    { label: 'Saved Videos', path: 'saved', icon: Bookmark, protected: true },
    { label: 'Watch History', path: 'history', icon: History, protected: true },
  ];

  const studioItems = [
    { label: 'Upload Video', path: 'upload', icon: Upload, protected: true },
    { label: 'Creator Studio', path: 'studio', icon: PlusSquare, protected: true },
    { label: 'Settings', path: 'settings', icon: Settings, protected: true },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0f0f0f] text-[#0f0f0f] dark:text-[#f1f1f1] font-sans antialiased">
      
      {/* OFFLINE CONNECTIVITY BANNER */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <WifiOff className="w-4 h-4" />
            <span>You are currently Offline. You can watch your downloaded videos & shorts without internet!</span>
          </div>
          <button
            onClick={() => navigate('downloads')}
            className="px-3 py-1 bg-white text-amber-800 rounded-lg text-xs font-black hover:bg-amber-50 cursor-pointer shadow-xs transition-colors shrink-0"
          >
            Open Downloads
          </button>
        </div>
      )}

      {/* GLOBAL ADMIN BROADCAST ANNOUNCEMENT BANNER */}
      {announcement && announcement.active && !announcementDismissed && (
        <div className={`px-4 py-2 text-xs font-bold flex items-center justify-between z-40 shadow-sm transition-all text-white ${
          announcement.type === 'alert'
            ? 'bg-amber-600'
            : announcement.type === 'success'
              ? 'bg-emerald-600'
              : 'bg-blue-600'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-ping" />
            <span className="truncate">{announcement.message}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {announcement.linkText && (
              <button
                onClick={() => {
                  if (announcement.linkUrl?.startsWith('#/')) {
                    window.location.hash = announcement.linkUrl;
                  } else if (announcement.linkUrl) {
                    window.open(announcement.linkUrl, '_blank');
                  } else {
                    navigate('home');
                  }
                }}
                className="px-2.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[11px] font-black underline cursor-pointer"
              >
                {announcement.linkText}
              </button>
            )}
            <button
              onClick={() => setAnnouncementDismissed(true)}
              className="p-1 hover:bg-white/20 rounded cursor-pointer opacity-80 hover:opacity-100"
              title="Dismiss announcement"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* HEADER / NAVIGATION BAR */}
      <header className={`px-2.5 sm:px-4 h-14 items-center justify-between gap-2 max-w-full relative overflow-visible transition-all duration-300 z-40 safe-bottom ${
            isWatchPage
              ? 'hidden md:flex sticky top-0 bg-white dark:bg-[#0f0f0f] border-b border-slate-100 dark:border-slate-800'
              : isShortsPage 
                ? 'flex absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent border-transparent text-white md:sticky md:bg-white dark:md:bg-[#0f0f0f] md:border-b md:border-slate-100 dark:md:border-slate-800 shadow-none' 
                : 'flex sticky top-0 bg-white dark:bg-[#0f0f0f] border-b border-slate-100 dark:border-slate-800'
          }`}>
            
            {mobileSearchOpen ? (
              /* Mobile expanding full-width search block */
              <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 px-1">
                <button 
                  type="button"
                  onClick={() => setMobileSearchOpen(false)}
                  className="min-w-10 min-h-10 p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center cursor-pointer"
                  title="Close Search"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <input
                  type="text"
                  autoFocus
                  placeholder="Search videos, creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 dark:text-white"
                />
                <button 
                  type="submit"
                  className="min-w-14 min-h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  Go
                </button>
              </form>
            ) : (
              <>
                {/* Left Section */}
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
                  {route.path !== 'home' && (
                    <button 
                      onClick={() => navigate('home')}
                      className={`min-w-10 min-h-10 p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                        isShortsPage
                          ? 'hover:bg-white/10 text-white'
                          : 'bg-slate-100 dark:bg-[#272727] hover:bg-slate-200 dark:hover:bg-[#333] text-slate-900 dark:text-white'
                      }`}
                      aria-label="Back to Home"
                      title="Back to Home"
                    >
                      <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  )}

                  <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="hidden md:flex min-w-10 min-h-10 p-2 hover:bg-[#f2f2f2] dark:hover:bg-[#272727] rounded-full transition-colors cursor-pointer text-[#0f0f0f] dark:text-[#f1f1f1] items-center justify-center"
                    aria-label="Toggle sidebar"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  
                  <SocialIndiaLogo 
                    onClick={() => navigate('home')}
                    forceWhiteText={isShortsPage}
                  />
                </div>

                {/* Center / Prominent Search bar */}
                <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-2xl mx-auto relative">
                  <div className="relative w-full flex items-center">
                    <input
                      type="text"
                      placeholder="Search videos, creators, categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-4 pr-12 py-2 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] text-slate-900 dark:text-[#f8fafc] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#2563eb] text-sm font-medium transition-all"
                    />
                    <button 
                      type="submit"
                      className="absolute right-1 top-1 bottom-1 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center font-semibold text-xs shadow-xs"
                      aria-label="Search"
                    >
                      <Search className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </form>

                {/* Right Controls */}
                <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                  {/* Mobile Search Button */}
                  <button 
                    onClick={() => setMobileSearchOpen(true)}
                    className={`min-w-10 min-h-10 p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                      isShortsPage 
                        ? 'hover:bg-white/10 text-white' 
                        : 'hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-slate-700 dark:text-slate-300'
                    }`}
                    aria-label="Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {/* Theme Toggle */}
                  <button
                    onClick={() => {
                      const isDarkActive = document.documentElement.classList.contains('dark');
                      setTheme(isDarkActive ? 'light' : 'dark');
                    }}
                    className={`min-w-10 min-h-10 p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center ${
                      isShortsPage
                        ? 'hover:bg-white/10 text-white'
                        : 'hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-[#0f0f0f] dark:text-[#f1f1f1]'
                    }`}
                    aria-label="Toggle theme"
                    title="Toggle Light / Dark Night Theme"
                  >
                    {theme === 'dark' || (typeof window !== 'undefined' && document.documentElement.classList.contains('dark')) ? (
                      <Sun className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Moon className="w-5 h-5 text-[#065fd4]" />
                    )}
                  </button>

              {/* Publish Video Button (Primary Action) */}
              <button
                onClick={() => triggerProtectedAction(() => navigate('upload'))}
                className="hidden sm:flex items-center gap-1.5 px-5 py-2.5 text-base font-bold text-white bg-[#065fd4] hover:bg-[#054fb1] rounded-full transition-all shadow-md cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Publish Video</span>
              </button>

              {/* Notifications Dropdown */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => triggerProtectedAction(() => setNotifDropdownOpen(!notifDropdownOpen))}
                  className={`p-2 rounded-xl transition-colors cursor-pointer relative ${
                    isShortsPage
                      ? 'hover:bg-white/10 text-white'
                      : 'hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-slate-700 dark:text-slate-300'
                  }`}
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[#2563eb] text-white border-2 border-white dark:border-[#111827] rounded-full flex items-center justify-center text-[9px] font-black">
                      {unreadCount}
                    </span>
                  )}
                </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-[#334155] flex items-center justify-between">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">Notifications</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markNotificationsAsRead}
                      className="text-xs font-semibold text-[#2563eb] dark:text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.notificationId} 
                        onClick={() => {
                          setNotifDropdownOpen(false);
                          if (n.videoId) navigate('watch', n.videoId);
                        }}
                        className={`p-3.5 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] transition-colors cursor-pointer flex gap-3 items-start ${!n.read ? 'bg-[#eff6ff] dark:bg-blue-950/20' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                          {n.actorPhotoURL ? (
                            <img src={n.actorPhotoURL} alt={n.actorUsername} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            getInitials(n.actorDisplayName)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-normal">{n.message}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Account / Profile Area */}
          {currentUser ? (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 rounded-xl overflow-hidden bg-[#2563eb] flex items-center justify-center text-white border-2 border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer select-none"
                aria-label="User menu"
              >
                {currentUserProfile?.photoURL ? (
                  <img src={currentUserProfile.photoURL} alt={currentUserProfile.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-black">{getInitials(currentUserProfile?.displayName || '')}</span>
                )}
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{currentUserProfile?.displayName}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">@{currentUserProfile?.username}</p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('creator', currentUserProfile?.username);
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>My Public Channel</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('studio');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <PlusSquare className="w-4 h-4 text-slate-400" />
                      <span>Creator Studio</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('gopro');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-[#00A3FF] flex items-center gap-2.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#00A3FF]" />
                      <span>Go Pro Package ($10)</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('advertising');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Advertising (Promote)</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('settings');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Settings</span>
                    </button>
                    {currentUserProfile?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate('admin');
                        }}
                        className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>Admin Hub</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Support Section inside Profile Menu */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('help');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Help Center</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('feedback');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <span>Send Feedback</span>
                    </button>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('login');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-blue-500" />
                      <span>Switch Account</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div ref={guestRef} className="flex items-center gap-2 relative">
              <button
                onClick={() => setGuestMenuOpen(!guestMenuOpen)}
                className="p-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] rounded-xl transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                aria-label="Settings and support"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {guestMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('help');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Help Center</span>
                    </button>
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('feedback');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <span>Send Feedback</span>
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('about');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Info className="w-4 h-4 text-slate-400" />
                      <span>About SocialIndia</span>
                    </button>
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('privacy');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>Privacy & Terms</span>
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate('login')}
                className="px-4 sm:px-6 py-1.5 sm:py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white font-bold text-xs sm:text-base rounded-full shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
              >
                Sign In
              </button>
            </div>
          )}
                </div>
              </>
            )}
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 relative">
        
        {/* SIDEBAR (Desktop) */}
        <aside 
          className={`hidden md:block shrink-0 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-[#334155] transition-all duration-200 z-30 select-none ${sidebarOpen ? 'w-60' : 'w-0 overflow-hidden border-r-0'}`}
        >
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-3 space-y-5 scrollbar-none">
            
            {/* Discover Section */}
            <div className="space-y-1">
              <span className="px-3 text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Discover</span>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = route.path === item.path;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.protected) {
                        triggerProtectedAction(() => navigate(item.path));
                      } else {
                        navigate(item.path);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#f2f2f2] dark:bg-[#272727] text-[#0f0f0f] dark:text-[#f1f1f1] font-bold' 
                        : 'hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-[#0f0f0f] dark:text-[#f1f1f1]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#0f0f0f] dark:text-[#f1f1f1]' : 'text-slate-600 dark:text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-slate-200 dark:bg-[#334155]" />

            {/* Creator Tools Section */}
            <div className="space-y-1">
              <span className="px-3 text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Creator Tools</span>
              {studioItems.map((item) => {
                const Icon = item.icon;
                const isActive = route.path === item.path;
                return (
                  <button
                    key={item.label}
                    onClick={() => triggerProtectedAction(() => navigate(item.path))}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#f2f2f2] dark:bg-[#272727] text-[#0f0f0f] dark:text-[#f1f1f1] font-bold' 
                        : 'hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-[#0f0f0f] dark:text-[#f1f1f1]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#0f0f0f] dark:text-[#f1f1f1]' : 'text-slate-600 dark:text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Subscriptions Mini Section */}
            {followedCreators.length > 0 && (
              <>
                <div className="space-y-1">
                  <span className="px-3 text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Subscriptions</span>
                  {followedCreators.slice(0, 5).map((sub) => (
                    <button
                      key={sub.creatorId}
                      onClick={() => navigate('creator', sub.creatorUsername)}
                      className="w-full flex items-center gap-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#272727] transition-all cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-600 shrink-0 overflow-hidden">
                        {sub.creatorPhotoURL ? (
                          <img src={sub.creatorPhotoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-black text-[10px]">{sub.creatorDisplayName[0]}</div>
                        )}
                      </div>
                      <span className="truncate text-slate-700 dark:text-slate-300">{sub.creatorDisplayName}</span>
                      <div className="w-1 h-1 bg-blue-600 rounded-full ml-auto" />
                    </button>
                  ))}
                  {followedCreators.length > 5 && (
                    <button onClick={() => navigate('subscriptions')} className="px-3 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline pt-1">Show More</button>
                  )}
                </div>
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
              </>
            )}
            {currentUserProfile?.role === 'admin' && (
              <>
                <div className="space-y-1">
                  <span className="px-3 text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Platform Admin</span>
                  <button
                    onClick={() => navigate('admin')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      route.path === 'admin' 
                        ? 'bg-[#f2f2f2] dark:bg-[#272727] text-[#0f0f0f] dark:text-[#f1f1f1] font-bold' 
                        : 'hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-[#0f0f0f] dark:text-[#f1f1f1]'
                    }`}
                  >
                    <ShieldCheck className={`w-5 h-5 shrink-0 ${route.path === 'admin' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'}`} />
                    <span className="truncate">Admin Hub</span>
                  </button>
                </div>
                <div className="h-px bg-slate-200 dark:bg-[#334155]" />
              </>
            )}

            {/* Elegant 2-Column Policy & Legal Links Grid for SocialIndia (Matches Capture.PNG) */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 px-3 space-y-3 select-none">
              <div className="grid grid-cols-2 gap-y-2 gap-x-1.5 text-[11px] font-black text-slate-500 dark:text-slate-400">
                <button onClick={() => navigate('refund')} className="text-left hover:text-blue-600 hover:underline cursor-pointer">Refund Policy</button>
                <button onClick={() => navigate('faq')} className="text-left hover:text-blue-600 hover:underline cursor-pointer">FAQs</button>
                <button onClick={() => navigate('terms')} className="text-left hover:text-blue-600 hover:underline cursor-pointer">Terms of use</button>
                <button onClick={() => navigate('privacy')} className="text-left hover:text-blue-600 hover:underline cursor-pointer">Privacy Policy</button>
                <button onClick={() => navigate('about')} className="text-left hover:text-blue-600 hover:underline cursor-pointer">About us</button>
                <button onClick={() => navigate('contact')} className="text-left hover:text-blue-600 hover:underline cursor-pointer">Contact us</button>
                <button onClick={() => navigate('developers')} className="text-left hover:text-blue-600 hover:underline cursor-pointer">Developers</button>
                <button onClick={() => navigate('language')} className="text-left hover:text-blue-600 hover:underline cursor-pointer">Language</button>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 font-bold leading-relaxed">
                <p>Copyright © {new Date().getFullYear()} SocialIndia. All rights reserved.</p>
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENT VIEWPORT */}
        <main className={`flex-1 min-w-0 ${isWatchPage ? 'pb-0' : 'pb-20 md:pb-8'} overflow-y-auto`}>
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className={`${isWatchPage ? 'hidden' : 'block md:hidden'} fixed bottom-0 left-0 right-0 z-40 select-none transition-all duration-300 pb-safe ${
        isShortsPage 
          ? 'bg-black/90 backdrop-blur-md border-t border-white/10 text-white shadow-none' 
          : 'bg-white dark:bg-[#0f0f0f] border-t border-[#e5e5e5] dark:border-[#3f3f3f] shadow-lg'
      }`}>
        <div className="h-full flex items-center justify-around px-2">
          
          <button 
            onClick={() => navigate('home')}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 transition-all ${
              isShortsPage 
                ? 'text-white/60 hover:text-white' 
                : 'text-[#0f0f0f] dark:text-[#f1f1f1] ' + (route.path === 'home' ? 'font-bold' : 'opacity-70')
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button 
            onClick={() => navigate('shorts')}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 transition-all ${
              isShortsPage 
                ? 'text-white font-bold' 
                : (route.path === 'shorts' ? 'text-[#2563eb] dark:text-[#3b82f6] font-bold' : 'text-slate-500 dark:text-slate-400')
            }`}
          >
            <Zap className={`w-5 h-5 ${isShortsPage ? 'fill-current text-white' : ''}`} />
            <span className="text-[10px]">Shorts</span>
          </button>

          <button 
            onClick={() => triggerProtectedAction(() => navigate('upload'))}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 transition-all ${
              isShortsPage ? 'text-white' : 'text-[#2563eb] dark:text-[#3b82f6]'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-xs transition-colors ${
              isShortsPage ? 'bg-white text-black' : 'bg-[#2563eb] text-white'
            }`}>
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-[10px]">Create</span>
          </button>

          <button 
            onClick={() => triggerProtectedAction(() => navigate('subscriptions'))}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 transition-all ${
              isShortsPage 
                ? 'text-white/60 hover:text-white' 
                : (route.path === 'subscriptions' ? 'text-[#2563eb] dark:text-[#3b82f6] font-bold' : 'text-slate-500 dark:text-slate-400')
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Subscribed</span>
          </button>

          <button 
            onClick={() => triggerProtectedAction(() => navigate('profile-menu'))}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 transition-all ${
              isShortsPage 
                ? 'text-white/60 hover:text-white' 
                : (route.path === 'profile-menu' ? 'text-[#2563eb] dark:text-[#3b82f6] font-bold' : 'text-slate-500 dark:text-slate-400')
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px]">Profile</span>
          </button>

        </div>
      </nav>

      {/* TOAST PANEL */}
      <ToastContainer />

      {/* SIGN IN/SIGN UP OVERLAY */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          if (authSuccessCallback) {
            authSuccessCallback();
            setAuthSuccessCallback(undefined);
          }
        }}
      />
    </div>
  );
};
