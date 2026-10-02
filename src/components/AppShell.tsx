import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { ToastContainer } from './Toast';
import { AuthModal } from './AuthModal';
import { SocialIndiaLogo } from './SocialIndiaLogo';
import { 
  Home, 
  TrendingUp, 
  Film, 
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
  Sparkles
} from 'lucide-react';
import { getInitials } from '../utils/videoUtils';
import { authService } from '../services/authService';
import { UserAvatar } from './UserAvatar';

const legalItems = [
  { label: 'Privacy Policy', path: 'privacy', icon: FileText },
  { label: 'Terms of Service', path: 'terms', icon: FileText },
  { label: 'Community Guidelines', path: 'guidelines', icon: ShieldCheck },
];

const supportItems = [
  { label: 'Help Center', path: 'help', icon: HelpCircle },
  { label: 'Send Feedback', path: 'feedback', icon: MessageSquare },
];

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState<(() => void) | undefined>(undefined);
  const [followedCreators, setFollowedCreators] = useState<any[]>([]);

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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
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
      setAuthSuccessCallback(() => action);
      setAuthModalOpen(true);
    }
  };

  const menuItems = [
    { label: 'Home', path: 'home', icon: Home },
    { label: 'Shorts', path: 'shorts', icon: Film },
    { label: 'Trending', path: 'trending', icon: TrendingUp },
    { label: 'Subscriptions', path: 'subscriptions', icon: Users, protected: true },
    { label: 'Saved Videos', path: 'saved', icon: Bookmark, protected: true },
    { label: 'Watch History', path: 'history', icon: History, protected: true },
  ];

  const studioItems = [
    { label: 'Creator Studio', path: 'studio', icon: PlusSquare, protected: true },
    { label: 'Settings', path: 'settings', icon: Settings, protected: true },
  ];

  const legalItems = [
    { label: 'Privacy Policy', path: 'privacy', icon: FileText },
    { label: 'Terms of Service', path: 'terms', icon: FileText },
    { label: 'Community Guidelines', path: 'guidelines', icon: ShieldAlert }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0f0f0f] text-[#0f0f0f] dark:text-[#f1f1f1] font-sans antialiased">
      
      {/* HEADER / NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#0f0f0f] px-4 h-14 flex items-center justify-between gap-4">
        
        {/* Left Section */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex p-2 hover:bg-[#f2f2f2] dark:hover:bg-[#272727] rounded-full transition-colors cursor-pointer text-[#0f0f0f] dark:text-[#f1f1f1]"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <SocialIndiaLogo 
            onClick={() => navigate('home')}
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
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mobile Search Button */}
          <button 
            onClick={() => navigate('search')}
            className="flex md:hidden p-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] rounded-xl transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
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
            className="p-2 hover:bg-[#f2f2f2] dark:hover:bg-[#272727] rounded-full transition-colors cursor-pointer text-[#0f0f0f] dark:text-[#f1f1f1]"
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
            onClick={() => triggerProtectedAction(() => navigate('studio'))}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Publish Video</span>
          </button>

          {/* Notifications Dropdown */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => triggerProtectedAction(() => setNotifDropdownOpen(!notifDropdownOpen))}
              className="p-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] rounded-xl transition-colors cursor-pointer relative text-slate-700 dark:text-slate-300"
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
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-xl z-50 overflow-hidden">
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
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
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
                        navigate('settings');
                      }}
                      className="w-full px-4 py-2 hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Settings</span>
                    </button>
                  </div>
                  <div className="py-2">
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
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
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
                      <UserAvatar 
                        uid={sub.creatorId}
                        fallbackPhotoURL={sub.creatorPhotoURL}
                        fallbackDisplayName={sub.creatorDisplayName}
                        size="xs"
                        className="rounded-full"
                      />
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
            {(currentUserProfile?.role === 'admin' || currentUserProfile?.displayName === 'maryxbgamer@gmail.com') && (
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

            {/* Support Section */}
            <div className="space-y-1">
              <span className="px-3 text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Support</span>
              {supportItems.map((item) => {
                const Icon = item.icon;
                const isActive = route.path === item.path;
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold border-l-4 border-blue-600' 
                        : 'hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <div className="space-y-1">
              <span className="px-3 text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-1.5">Legal & Info</span>
              {legalItems.map((item) => {
                const Icon = item.icon;
                const isActive = route.path === item.path;
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#f2f2f2] dark:bg-[#272727] text-[#0f0f0f] dark:text-[#f1f1f1] font-bold' 
                        : 'hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-[#0f0f0f] dark:text-[#f1f1f1]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 px-3 font-medium">
              <p>&copy; {new Date().getFullYear()} SocialIndia</p>
              <p className="mt-0.5 text-[10px]">All rights reserved.</p>
            </div>
          </div>
        </aside>

        {/* CONTENT VIEWPORT */}
        <main className="flex-1 min-w-0 pb-20 md:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="block md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-[#0f0f0f] border-t border-[#e5e5e5] dark:border-[#3f3f3f] shadow-lg z-40 select-none">
        <div className="h-full flex items-center justify-around px-2">
          
          <button 
            onClick={() => navigate('home')}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 text-[#0f0f0f] dark:text-[#f1f1f1] ${route.path === 'home' ? 'font-bold' : 'opacity-70'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button 
            onClick={() => navigate('shorts')}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 text-slate-500 dark:text-slate-400 ${route.path === 'shorts' ? 'text-[#2563eb] dark:text-[#3b82f6] font-bold' : ''}`}
          >
            <Film className="w-5 h-5" />
            <span className="text-[10px]">Shorts</span>
          </button>

          <button 
            onClick={() => triggerProtectedAction(() => navigate('studio'))}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 text-[#2563eb] dark:text-[#3b82f6] ${route.path === 'studio' ? 'font-bold' : ''}`}
          >
            <div className="w-7 h-7 bg-[#2563eb] text-white rounded-lg flex items-center justify-center shadow-xs">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-[10px]">Create</span>
          </button>

          <button 
            onClick={() => triggerProtectedAction(() => navigate('subscriptions'))}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 text-slate-500 dark:text-slate-400 ${route.path === 'subscriptions' ? 'text-[#2563eb] dark:text-[#3b82f6] font-bold' : ''}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Subscribed</span>
          </button>

          <button 
            onClick={() => triggerProtectedAction(() => navigate('settings'))}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 text-slate-500 dark:text-slate-400 ${route.path === 'settings' ? 'text-[#2563eb] dark:text-[#3b82f6] font-bold' : ''}`}
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
