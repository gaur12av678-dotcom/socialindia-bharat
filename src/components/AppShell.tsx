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
  UserCheck,
  Crown,
  ChevronRight,
  Megaphone,
  LayoutDashboard,
  Flame,
  Clock,
  Music,
  Gamepad2,
  Cpu,
  GraduationCap,
  Newspaper,
  Trophy,
  Rocket,
  MoreHorizontal,
  Tv,
  ListVideo
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
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-[#2563eb] flex items-center justify-center text-white ring-2 ring-transparent hover:ring-[#2563eb]/40 focus:ring-[#2563eb]/50 transition-all duration-200 shadow-xs cursor-pointer select-none active:scale-95"
                aria-label="User account menu"
                aria-expanded={profileDropdownOpen}
              >
                {currentUserProfile?.photoURL ? (
                  <img src={currentUserProfile.photoURL} alt={currentUserProfile.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-black tracking-tight">{getInitials(currentUserProfile?.displayName || 'User')}</span>
                )}
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-[290px] sm:w-[315px] max-w-[calc(100vw-24px)] bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-[#27272a] rounded-2xl shadow-[0_12px_42px_rgba(0,0,0,0.12),0_4px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] z-50 overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                  
                  {/* 1. Profile Header (Clickable -> My Channel) */}
                  <div 
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('creator', currentUserProfile?.username);
                    }}
                    className="p-3.5 bg-slate-50/90 dark:bg-zinc-900/60 border-b border-slate-100 dark:border-zinc-800/80 hover:bg-slate-100/90 dark:hover:bg-zinc-900/90 transition-colors cursor-pointer group flex items-center gap-3"
                    title="View your channel"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#2563eb] text-white flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-zinc-700 shadow-xs">
                      {currentUserProfile?.photoURL ? (
                        <img src={currentUserProfile.photoURL} alt={currentUserProfile.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-black">{getInitials(currentUserProfile?.displayName || 'User')}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                        {currentUserProfile?.displayName || 'SocialIndia Creator'}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                        @{currentUserProfile?.username || 'creator'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] group-hover:translate-x-0.5 transition-all shrink-0 ml-auto" />
                  </div>

                  {/* 2. Account / Creator Group */}
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('creator', currentUserProfile?.username);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 text-left">
                        My Channel
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('studio');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 text-left">
                        Creator Studio
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('gopro');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-blue-50/70 dark:hover:bg-blue-950/30 flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-amber-500 group-hover:scale-110 transition-transform">
                        <Crown className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors text-left">
                        Go Pro Package
                      </span>
                      <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] dark:text-[#60a5fa] border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                        $10/month
                      </span>
                    </button>
                  </div>

                  {/* 3. Platform Group */}
                  <div className="border-t border-slate-100 dark:border-[#27272a] p-1.5">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('advertising');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 text-left">
                        Advertising (Promote)
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('settings');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                        <Settings className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 text-left">
                        Settings
                      </span>
                    </button>

                    {currentUserProfile?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate('admin');
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-blue-50/70 dark:hover:bg-blue-950/30 flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                      >
                        <div className="w-5 h-5 flex items-center justify-center shrink-0 text-[#2563eb] dark:text-[#3b82f6]">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-[#2563eb] dark:text-[#3b82f6] flex-1 text-left">
                          Admin Hub
                        </span>
                      </button>
                    )}
                  </div>

                  {/* 4. Support Group */}
                  <div className="border-t border-slate-100 dark:border-[#27272a] p-1.5">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('help');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 text-left">
                        Help Center
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('feedback');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 text-left">
                        Send Feedback
                      </span>
                    </button>
                  </div>

                  {/* 5. Account Switch & Sign Out */}
                  <div className="border-t border-slate-100 dark:border-[#27272a] p-1.5">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('login');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 text-left">
                        Switch Account
                      </span>
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="w-full px-3 py-2 rounded-xl hover:bg-rose-50/80 dark:hover:bg-rose-950/30 flex items-center gap-3 transition-colors duration-150 cursor-pointer group text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold flex-1 text-left">
                        Sign Out
                      </span>
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
                <div className="absolute right-0 top-full mt-2.5 w-60 bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-[#27272a] rounded-2xl shadow-[0_12px_42px_rgba(0,0,0,0.12),0_4px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] z-50 overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('help');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] transition-colors" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left">Help Center</span>
                    </button>
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('feedback');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] transition-colors" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left">Send Feedback</span>
                    </button>
                  </div>
                  <div className="border-t border-slate-100 dark:border-[#27272a] p-1.5">
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('about');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <Info className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] transition-colors" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left">About SocialIndia</span>
                    </button>
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('privacy');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <FileText className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] transition-colors" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left">Privacy & Terms</span>
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
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-3 space-y-4 scrollbar-none">
            
            {/* 1. Main Navigation Items */}
            <div className="space-y-1">
              <button
                onClick={() => navigate('home')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  route.path === 'home' && !route.searchParams?.category
                    ? 'bg-[#eff6ff] dark:bg-blue-950/50 text-[#065fd4] dark:text-[#60a5fa] font-bold shadow-xs' 
                    : 'hover:bg-slate-100 dark:hover:bg-[#272727] text-slate-700 dark:text-slate-200 font-medium'
                }`}
              >
                <Home className={`w-5 h-5 shrink-0 ${route.path === 'home' && !route.searchParams?.category ? 'text-[#065fd4] dark:text-[#60a5fa] fill-[#065fd4]/20' : 'text-slate-600 dark:text-slate-400'}`} />
                <span className="truncate">Home</span>
              </button>

              <button
                onClick={() => navigate('shorts')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  route.path === 'shorts'
                    ? 'bg-[#eff6ff] dark:bg-blue-950/50 text-[#065fd4] dark:text-[#60a5fa] font-bold shadow-xs' 
                    : 'hover:bg-slate-100 dark:hover:bg-[#272727] text-slate-700 dark:text-slate-200 font-medium'
                }`}
              >
                <Zap className={`w-5 h-5 shrink-0 ${route.path === 'shorts' ? 'text-[#065fd4] dark:text-[#60a5fa] fill-current' : 'text-slate-600 dark:text-slate-400'}`} />
                <span className="truncate">Shorts</span>
              </button>

              <button
                onClick={() => navigate('trending')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  route.path === 'trending'
                    ? 'bg-[#eff6ff] dark:bg-blue-950/50 text-[#065fd4] dark:text-[#60a5fa] font-bold shadow-xs' 
                    : 'hover:bg-slate-100 dark:hover:bg-[#272727] text-slate-700 dark:text-slate-200 font-medium'
                }`}
              >
                <Flame className={`w-5 h-5 shrink-0 ${route.path === 'trending' ? 'text-red-500 fill-red-500' : 'text-slate-600 dark:text-slate-400'}`} />
                <span className="truncate">Trending</span>
              </button>

              <button
                onClick={() => triggerProtectedAction(() => navigate('subscriptions'))}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  route.path === 'subscriptions'
                    ? 'bg-[#eff6ff] dark:bg-blue-950/50 text-[#065fd4] dark:text-[#60a5fa] font-bold shadow-xs' 
                    : 'hover:bg-slate-100 dark:hover:bg-[#272727] text-slate-700 dark:text-slate-200 font-medium'
                }`}
              >
                <Tv className={`w-5 h-5 shrink-0 ${route.path === 'subscriptions' ? 'text-[#065fd4] dark:text-[#60a5fa]' : 'text-slate-600 dark:text-slate-400'}`} />
                <span className="truncate">Subscriptions</span>
              </button>

              <button
                onClick={() => triggerProtectedAction(() => navigate('history'))}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  route.path === 'history'
                    ? 'bg-[#eff6ff] dark:bg-blue-950/50 text-[#065fd4] dark:text-[#60a5fa] font-bold shadow-xs' 
                    : 'hover:bg-slate-100 dark:hover:bg-[#272727] text-slate-700 dark:text-slate-200 font-medium'
                }`}
              >
                <Clock className={`w-5 h-5 shrink-0 ${route.path === 'history' ? 'text-[#065fd4] dark:text-[#60a5fa]' : 'text-slate-600 dark:text-slate-400'}`} />
                <span className="truncate">Library / History</span>
              </button>

              {/* Playlists / Playlist */}
              <button
                onClick={() => triggerProtectedAction(() => navigate('playlists'))}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  route.path === 'playlists' || route.path === 'playlist' || route.path === 'saved'
                    ? 'bg-[#eff6ff] dark:bg-blue-950/50 text-[#065fd4] dark:text-[#60a5fa] font-bold shadow-xs' 
                    : 'hover:bg-slate-100 dark:hover:bg-[#272727] text-slate-700 dark:text-slate-200 font-medium'
                }`}
              >
                <ListVideo className={`w-5 h-5 shrink-0 ${route.path === 'playlists' || route.path === 'playlist' || route.path === 'saved' ? 'text-[#065fd4] dark:text-[#60a5fa]' : 'text-slate-600 dark:text-slate-400'}`} />
                <span className="truncate">Playlists</span>
              </button>

              {/* Downloaded / Downloads */}
              <button
                onClick={() => navigate('downloads')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  route.path === 'downloads'
                    ? 'bg-[#eff6ff] dark:bg-blue-950/50 text-[#065fd4] dark:text-[#60a5fa] font-bold shadow-xs' 
                    : 'hover:bg-slate-100 dark:hover:bg-[#272727] text-slate-700 dark:text-slate-200 font-medium'
                }`}
              >
                <ArrowDownToLine className={`w-5 h-5 shrink-0 ${route.path === 'downloads' ? 'text-[#065fd4] dark:text-[#60a5fa]' : 'text-slate-600 dark:text-slate-400'}`} />
                <span className="truncate">Downloaded</span>
              </button>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* 2. Explore Section */}
            <div className="space-y-1">
              <span className="px-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Explore
              </span>

              {[
                { label: 'Music', icon: Music, cat: 'Music' },
                { label: 'Gaming', icon: Gamepad2, cat: 'Gaming' },
                { label: 'Technology', icon: Cpu, cat: 'Technology' },
                { label: 'Education', icon: GraduationCap, cat: 'Education' },
                { label: 'News', icon: Newspaper, cat: 'News' },
                { label: 'Sports', icon: Trophy, cat: 'Sports' },
                { label: 'Entertainment', icon: Film, cat: 'Entertainment' },
              ].map((item) => {
                const Icon = item.icon;
                const isCatActive = route.path === 'home' && route.searchParams?.category === item.cat;
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate('home', undefined, { category: item.cat })}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isCatActive
                        ? 'bg-[#eff6ff] dark:bg-blue-950/50 text-[#065fd4] dark:text-[#60a5fa] font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-[#272727] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isCatActive ? 'text-[#065fd4] dark:text-[#60a5fa]' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => navigate('home')}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#272727] text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <MoreHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>More</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* 3. Creator / Platform Admin Hub */}
            {currentUserProfile?.role === 'admin' && (
              <div className="space-y-1">
                <button
                  onClick={() => navigate('admin')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    route.path === 'admin' 
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-[#065fd4] dark:text-[#60a5fa]' 
                      : 'hover:bg-slate-100 dark:hover:bg-[#272727] text-[#065fd4] dark:text-[#60a5fa]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[#065fd4] dark:text-[#60a5fa]" />
                  <span className="truncate">Admin Hub</span>
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
              </div>
            )}

            {/* 4. Subscriptions Mini List (if following creators) */}
            {followedCreators.length > 0 && (
              <div className="space-y-1">
                <span className="px-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Subscriptions
                </span>
                {followedCreators.slice(0, 4).map((sub) => (
                  <button
                    key={sub.creatorId}
                    onClick={() => navigate('creator', sub.creatorUsername)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-[#272727] transition-all cursor-pointer text-left"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-600 shrink-0 overflow-hidden">
                      {sub.creatorPhotoURL ? (
                        <img src={sub.creatorPhotoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-black text-[9px]">{sub.creatorDisplayName[0]}</div>
                      )}
                    </div>
                    <span className="truncate text-slate-700 dark:text-slate-300">{sub.creatorDisplayName}</span>
                  </button>
                ))}
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
              </div>
            )}

            {/* 5. Bottom Callout Card: Create. Share. Grow. (Matches Capture.PNG) */}
            <div 
              onClick={() => triggerProtectedAction(() => navigate('upload'))}
              className="p-3.5 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-100/80 dark:border-blue-900/40 rounded-2xl space-y-1 shadow-xs cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 transition-all active:scale-98 group"
            >
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#065fd4] dark:text-[#60a5fa]">
                <Rocket className="w-4 h-4 text-[#065fd4] dark:text-[#60a5fa] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                <span>Create. Share. Grow.</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-snug">
                Be part of India's next gen video platform.
              </p>
            </div>

            {/* 6. Elegant 2-Column Policy & Legal Links */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 px-2 space-y-2 select-none">
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <button onClick={() => navigate('refund')} className="text-left hover:text-blue-600 hover:underline cursor-pointer truncate">Refund</button>
                <button onClick={() => navigate('faq')} className="text-left hover:text-blue-600 hover:underline cursor-pointer truncate">FAQs</button>
                <button onClick={() => navigate('terms')} className="text-left hover:text-blue-600 hover:underline cursor-pointer truncate">Terms</button>
                <button onClick={() => navigate('privacy')} className="text-left hover:text-blue-600 hover:underline cursor-pointer truncate">Privacy</button>
                <button onClick={() => navigate('about')} className="text-left hover:text-blue-600 hover:underline cursor-pointer truncate">About us</button>
                <button onClick={() => navigate('contact')} className="text-left hover:text-blue-600 hover:underline cursor-pointer truncate">Contact</button>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 font-medium leading-tight">
                <p>© {new Date().getFullYear()} SocialIndia.</p>
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
