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
  ListVideo,
  MessageCircle,
  Globe,
  ThumbsUp,
  Mic,
  X,
  ArrowUpLeft,
  Trash2
} from 'lucide-react';
import { getInitials } from '../utils/videoUtils';
import { authService } from '../services/authService';
import { UserAvatar } from './UserAvatar';
import { VoiceSearchModal } from './VoiceSearchModal';
import { searchHistoryService, SearchHistoryEntry, POPULAR_SEARCH_SUGGESTIONS } from '../services/searchHistoryService';
import { CreateActionSheet } from './shorts/CreateActionSheet';
import { MobileShortsStudio } from './shorts/MobileShortsStudio';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { 
    currentUser, 
    currentUserProfile, 
    theme, 
    setTheme, 
    language,
    setLanguage,
    t,
    notifications, 
    unreadCount, 
    markNotificationsAsRead,
    addToast
  } = useApp();
  const isHindi = language === 'hi';
  
  const { route, navigate } = useRouter();
  const isShortsPage = route.path === 'shorts';
  const isWatchPage = route.path === 'watch';

  // Mobile bottom bar & tools hidden on:
  // 1. Settings ('settings')
  // 2. Downloads ('downloads')
  // 3. User Profile / Channel ('creator')
  // 4. Search ('search' and when mobile search bar is active)
  // 5. Advertising ('advertising', 'ad-info', 'ad')
  // 6. GoPro ('gopro', 'pro')
  // 7. Admin Hub ('admin')
  // 8. Watch ('watch')
  const shouldHideBottomNav = 
    isWatchPage ||
    route.path === 'settings' ||
    route.path === 'downloads' ||
    route.path === 'creator' ||
    route.path === 'search' ||
    route.path === 'advertising' ||
    route.path === 'ad-info' ||
    route.path === 'ad' ||
    route.path === 'gopro' ||
    route.path === 'pro' ||
    route.path === 'chat' ||
    route.path === 'admin';
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(() => searchHistoryService.getHistory());
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState<(() => void) | undefined>(undefined);
  const [followedCreators, setFollowedCreators] = useState<any[]>([]);
  const [createActionSheetOpen, setCreateActionSheetOpen] = useState(false);
  const [mobileShortsStudioOpen, setMobileShortsStudioOpen] = useState(false);

  // Global listener to trigger mobile shorts studio from anywhere in the app
  useEffect(() => {
    const handleOpenStudio = () => {
      setMobileShortsStudioOpen(true);
    };
    window.addEventListener('socialindia:open-shorts-studio', handleOpenStudio);
    return () => {
      window.removeEventListener('socialindia:open-shorts-studio', handleOpenStudio);
    };
  }, []);

  // Automatically open shorts camera studio if navigated to create-short
  useEffect(() => {
    if (route.path === 'create-short') {
      setMobileShortsStudioOpen(true);
    }
  }, [route.path]);

  // Close sidebar on mobile navigation
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [route.path, route.param]);

  // YouTube-style Home Click: If already on home, refresh feed and scroll smoothly to top
  const handleHomeClick = () => {
    if (route.path === 'home') {
      window.dispatchEvent(new CustomEvent('socialindia:refresh-home'));
    } else {
      navigate('home');
    }
  };

  const executeSearch = (termToSearch: string) => {
    const trimmed = termToSearch.trim();
    if (trimmed) {
      searchHistoryService.addQuery(trimmed);
      setSearchQuery(trimmed);
      setSearchSuggestionsOpen(false);
      setMobileSearchOpen(false);
      navigate('search', undefined, { q: trimmed });
    }
  };

  const handleVoiceSearchTranscript = (transcriptText: string) => {
    executeSearch(transcriptText);
  };

  // Sync search history on custom event
  useEffect(() => {
    const handleHistoryUpdate = () => {
      setSearchHistory(searchHistoryService.getHistory());
    };
    window.addEventListener('socialindia:search_history_updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('socialindia:search_history_updated', handleHistoryUpdate);
    };
  }, []);

  // Handle clicking outside search container to close desktop dropdown
  useEffect(() => {
    const handleSearchOutside = (e: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleSearchOutside);
    document.addEventListener('touchstart', handleSearchOutside);
    return () => {
      document.removeEventListener('mousedown', handleSearchOutside);
      document.removeEventListener('touchstart', handleSearchOutside);
    };
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setNotifDropdownOpen(false);
    setProfileDropdownOpen(false);
    setGuestMenuOpen(false);
    setMobileSearchOpen(false);
    setSearchSuggestionsOpen(false);
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
    executeSearch(searchQuery);
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
    { label: t('nav_home', 'Home'), path: 'home', icon: Home },
    { label: t('nav_shorts', 'Shorts'), path: 'shorts', icon: Zap },
    { label: t('nav_trending', 'Trending'), path: 'trending', icon: TrendingUp },
    { label: t('nav_chat', 'Direct Messages'), path: 'chat', icon: MessageSquare, protected: true },
    { label: t('nav_downloads', 'Downloads'), path: 'downloads', icon: ArrowDownToLine },
    { label: t('nav_subscriptions', 'Subscriptions'), path: 'subscriptions', icon: Users, protected: true },
    { label: t('nav_saved', 'Saved Videos'), path: 'saved', icon: Bookmark, protected: true },
    { label: t('nav_history', 'Watch History'), path: 'history', icon: History, protected: true },
  ];

  const studioItems = [
    { label: t('upload_video_btn', 'Upload Video'), path: 'upload', icon: Upload, protected: true },
    { label: t('nav_studio', 'Creator Studio'), path: 'studio', icon: PlusSquare, protected: true },
    { label: t('nav_settings', 'Settings'), path: 'settings', icon: Settings, protected: true },
    { label: isHindi ? 'भाषा: हिन्दी' : 'Language: English', path: 'language', icon: Globe },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0f0f0f] text-[#0f0f0f] dark:text-[#f1f1f1] font-sans antialiased">
      
      {/* OFFLINE CONNECTIVITY BANNER */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <WifiOff className="w-4 h-4" />
            <span>
              {isHindi 
                ? 'आप अभी ऑफ़लाइन हैं। आप बिना इंटरनेट के अपने डाउनलोड किए वीडियो और शॉर्ट्स देख सकते हैं!' 
                : 'You are currently Offline. You can watch your downloaded videos & shorts without internet!'}
            </span>
          </div>
          <button
            onClick={() => navigate('downloads')}
            className="px-3 py-1 bg-white text-amber-800 rounded-lg text-xs font-black hover:bg-amber-50 cursor-pointer shadow-xs transition-colors shrink-0"
          >
            {isHindi ? 'डाउनलोड्स खोलें' : 'Open Downloads'}
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
                ? 'hidden md:flex md:sticky top-0 bg-white dark:bg-[#0f0f0f] border-b border-slate-100 dark:border-slate-800 shadow-none' 
                : 'flex sticky top-0 bg-white dark:bg-[#0f0f0f] border-b border-slate-100 dark:border-slate-800'
          }`}>
            
            {mobileSearchOpen ? (
              /* Mobile expanding full-width search block */
              <div className="flex-1 flex flex-col w-full">
                <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 px-1">
                  <button 
                    type="button"
                    onClick={() => setMobileSearchOpen(false)}
                    className="min-w-10 min-h-10 p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center cursor-pointer shrink-0"
                    title={isHindi ? 'सर्च बंद करें' : 'Close Search'}
                  >
                    <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      autoFocus
                      placeholder={t('search_placeholder', 'Search videos, creators...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 dark:text-white pr-8"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 text-slate-400 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoiceModalOpen(true)}
                    className="min-w-10 min-h-10 p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
                    title={isHindi ? 'बोलकर खोजें' : 'Voice Search'}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button 
                    type="submit"
                    className="min-w-14 min-h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-xs shrink-0"
                  >
                    {isHindi ? 'खोजें' : 'Go'}
                  </button>
                </form>

                {/* Mobile Search Overlay displaying YouTube-style History & Suggestions */}
                <div className="fixed inset-x-0 top-14 bottom-0 z-50 bg-white dark:bg-[#0f0f0f] overflow-y-auto p-4 space-y-4">
                  {(() => {
                    const queryTrim = searchQuery.trim().toLowerCase();
                    const matchedHistory = queryTrim
                      ? searchHistory.filter(h => h.query.toLowerCase().includes(queryTrim))
                      : searchHistory;

                    const matchedSuggestions = queryTrim
                      ? POPULAR_SEARCH_SUGGESTIONS.filter(s => s.toLowerCase().includes(queryTrim) && !matchedHistory.some(h => h.query.toLowerCase() === s.toLowerCase()))
                      : (matchedHistory.length === 0 ? POPULAR_SEARCH_SUGGESTIONS : []);

                    return (
                      <div className="space-y-4">
                        {matchedHistory.length > 0 && (
                          <div className="bg-slate-50 dark:bg-[#16171a] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                                <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                {isHindi ? 'हाल की खोजें' : 'Search History'}
                              </span>
                              <button
                                type="button"
                                onClick={() => searchHistoryService.clearHistory()}
                                className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                              >
                                {isHindi ? 'सभी साफ़ करें' : 'Clear All'}
                              </button>
                            </div>
                            <div className="space-y-1">
                              {matchedHistory.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => executeSearch(item.query)}
                                  className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                                      {item.query}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchQuery(item.query);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                      title="Fill search"
                                    >
                                      <ArrowUpLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        searchHistoryService.removeQuery(item.id);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-500"
                                      title={isHindi ? 'हटाएं' : 'Remove'}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {matchedSuggestions.length > 0 && (
                          <div className="bg-slate-50 dark:bg-[#16171a] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                              <Flame className="w-3.5 h-3.5 text-orange-500" />
                              {isHindi ? 'लोकप्रिय खोज सुझाव' : 'Trending Searches'}
                            </span>
                            <div className="space-y-1">
                              {matchedSuggestions.map((term, i) => (
                                <div
                                  key={i}
                                  onClick={() => executeSearch(term)}
                                  className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                                      {term}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSearchQuery(term);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                  >
                                    <ArrowUpLeft className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <>
                {/* Left Section */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(prev => !prev)}
                    className="hidden md:flex p-2 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e293b] rounded-xl transition-colors cursor-pointer items-center justify-center shrink-0 active:scale-95"
                    aria-label={sidebarOpen ? (isHindi ? 'मेनू बंद करें' : 'Close Menu') : (isHindi ? 'मेनू खोलें' : 'Open Menu')}
                    title={isHindi ? 'मेनू' : 'Menu'}
                  >
                    <Menu className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                  </button>
                  <SocialIndiaLogo 
                    onClick={handleHomeClick}
                    forceWhiteText={false}
                  />
                </div>

                {/* Center / Prominent Search bar with YouTube-style Voice Mic & Search History Dropdown */}
                <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-2xl mx-auto items-center gap-2 relative">
                  <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                    <div className="relative w-full flex items-center">
                      <input
                        type="text"
                        placeholder={t('search_placeholder', 'Search videos, creators, categories...')}
                        value={searchQuery}
                        onFocus={() => setSearchSuggestionsOpen(true)}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSearchSuggestionsOpen(true);
                        }}
                        className="w-full pl-4 pr-12 py-2 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] text-slate-900 dark:text-[#f8fafc] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#2563eb] text-sm font-medium transition-all"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchSuggestionsOpen(true);
                          }}
                          className="absolute right-12 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                          title="Clear text"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        type="submit"
                        className="absolute right-1 top-1 bottom-1 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center font-semibold text-xs shadow-xs"
                        aria-label={t('search_button', 'Search')}
                        title={t('search_button', 'Search')}
                      >
                        <Search className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    {/* YouTube-style Search History & Suggestions Dropdown */}
                    {searchSuggestionsOpen && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1c1d22] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl py-2.5 z-50 overflow-hidden text-sm">
                        {(() => {
                          const queryTrim = searchQuery.trim().toLowerCase();
                          const matchedHistory = queryTrim
                            ? searchHistory.filter(h => h.query.toLowerCase().includes(queryTrim))
                            : searchHistory;

                          const matchedSuggestions = queryTrim
                            ? POPULAR_SEARCH_SUGGESTIONS.filter(s => s.toLowerCase().includes(queryTrim) && !matchedHistory.some(h => h.query.toLowerCase() === s.toLowerCase()))
                            : (matchedHistory.length === 0 ? POPULAR_SEARCH_SUGGESTIONS : []);

                          return (
                            <>
                              {matchedHistory.length > 0 && (
                                <div>
                                  <div className="flex items-center justify-between px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                      {isHindi ? 'हाल की खोजें' : 'Search History'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        searchHistoryService.clearHistory();
                                      }}
                                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                                    >
                                      {isHindi ? 'साफ़ करें' : 'Clear All'}
                                    </button>
                                  </div>

                                  <div className="py-1">
                                    {matchedHistory.map((item) => (
                                      <div
                                        key={item.id}
                                        onClick={() => executeSearch(item.query)}
                                        className="flex items-center justify-between px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#282a30] cursor-pointer group transition-colors"
                                      >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate text-xs sm:text-sm">
                                            {item.query}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSearchQuery(item.query);
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                            title={isHindi ? 'सर्च बॉक्स में भरें' : 'Fill into search'}
                                          >
                                            <ArrowUpLeft className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              searchHistoryService.removeQuery(item.id);
                                            }}
                                            className="px-2 py-0.5 text-[11px] font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer rounded"
                                            title={isHindi ? 'हटाएं' : 'Remove'}
                                          >
                                            {isHindi ? 'हटाएं' : 'Remove'}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {matchedSuggestions.length > 0 && (
                                <div className={matchedHistory.length > 0 ? 'mt-1 pt-2 border-t border-slate-100 dark:border-slate-800' : ''}>
                                  <div className="px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                                    {isHindi ? 'लोकप्रिय खोज सुझाव' : 'Trending Suggestions'}
                                  </div>
                                  <div className="py-1">
                                    {matchedSuggestions.map((term, idx) => (
                                      <div
                                        key={idx}
                                        onClick={() => executeSearch(term)}
                                        className="flex items-center justify-between px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#282a30] cursor-pointer group transition-colors"
                                      >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                          <span className="font-medium text-slate-700 dark:text-slate-200 truncate text-xs sm:text-sm">
                                            {term}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchQuery(term);
                                          }}
                                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                          title={isHindi ? 'सर्च बॉक्स में भरें' : 'Fill into search'}
                                        >
                                          <ArrowUpLeft className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </form>

                  <button
                    type="button"
                    onClick={() => setVoiceModalOpen(true)}
                    className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#202124] dark:hover:bg-[#2e3034] text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 transition-colors cursor-pointer active:scale-95 shadow-xs"
                    aria-label={isHindi ? 'बोलकर खोजें' : 'Search with your voice'}
                    title={isHindi ? 'बोलकर खोजें' : 'Search with your voice'}
                  >
                    <Mic className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                  </button>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                  {/* Mobile Search Button (hidden on web) */}
                  <button 
                    onClick={() => setMobileSearchOpen(true)}
                    className={`min-w-10 min-h-10 p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer flex md:hidden items-center justify-center ${
                      isShortsPage 
                        ? 'hover:bg-white/10 text-white' 
                        : 'hover:bg-[#eff6ff] dark:hover:bg-[#1e293b] text-slate-700 dark:text-slate-300'
                    }`}
                    aria-label={t('search_button', 'Search')}
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {/* Mobile 1-Tap Voice Search Button - Hidden on mobile header per user request (Voice search is already available inside the mobile search bar overlay) */}
                  {/* Kept hidden so it does not clutter mobile header */}


                  {/* Theme Toggle */}
                  <button
                    onClick={() => {
                      const isDarkActive = document.documentElement.classList.contains('dark');
                      setTheme(isDarkActive ? 'light' : 'dark');
                    }}
                    className={`hidden sm:flex min-w-10 min-h-10 p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer items-center justify-center ${
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
                <span>{t('upload_video_btn', 'Publish Video')}</span>
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
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">{t('notifications', 'Notifications')}</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markNotificationsAsRead}
                      className="text-xs font-semibold text-[#2563eb] dark:text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t('mark_all_read', 'Mark all read')}
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      {t('no_notifications', 'No notifications yet.')}
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
                        <UserAvatar 
                          fallbackPhotoURL={n.actorPhotoURL}
                          fallbackDisplayName={n.actorDisplayName || n.actorUsername}
                          size="xs"
                          className="w-8 h-8 rounded-full shrink-0"
                        />
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

          {/* User Account / Profile Area (Hidden on mobile top bar, accessible via YouTube-style 'You' bottom tab) */}
          {currentUser ? (
            <div ref={profileRef} className="hidden md:block relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-transparent hover:ring-[#2563eb]/40 focus:ring-[#2563eb]/50 transition-all duration-200 shadow-xs cursor-pointer select-none active:scale-95"
                aria-label="User account menu"
                aria-expanded={profileDropdownOpen}
              >
                <UserAvatar 
                  uid={currentUser.uid}
                  fallbackPhotoURL={currentUserProfile?.photoURL}
                  fallbackDisplayName={currentUserProfile?.displayName || currentUserProfile?.username}
                  size="sm"
                  className="w-full h-full text-xs"
                />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-[290px] sm:w-[315px] max-w-[calc(100vw-24px)] bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-[#27272a] rounded-2xl shadow-[0_12px_42px_rgba(0,0,0,0.12),0_4px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.7)] z-50 overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                  
                  {/* 1. Profile Header (Clickable -> My Channel) */}
                  <div 
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('creator', currentUserProfile?.username || currentUser?.uid);
                    }}
                    className="p-3.5 bg-slate-50/90 dark:bg-zinc-900/60 border-b border-slate-100 dark:border-zinc-800/80 hover:bg-slate-100/90 dark:hover:bg-zinc-900/90 transition-colors cursor-pointer group flex items-center gap-3"
                    title="View your channel"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200/80 dark:border-zinc-700 shadow-xs">
                      <UserAvatar 
                        uid={currentUser.uid}
                        fallbackPhotoURL={currentUserProfile?.photoURL}
                        fallbackDisplayName={currentUserProfile?.displayName || currentUserProfile?.username}
                        size="md"
                        className="w-full h-full text-xs"
                      />
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
                        navigate('creator', currentUserProfile?.username || currentUser?.uid);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 text-left">
                        {t('menu_your_channel', 'My Channel')}
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
                        {t('menu_creator_studio', 'Creator Studio')}
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
                        {isHindi ? 'गो प्रो पैकेज' : 'Go Pro Package'}
                      </span>
                      <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] dark:text-[#60a5fa] border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                        ₹99/माह
                      </span>
                    </button>
                  </div>

                  {/* 3. Platform Group */}
                  <div className="border-t border-slate-100 dark:border-[#27272a] p-1.5">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('language');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-amber-500 dark:text-amber-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 text-left">
                        {isHindi ? 'भाषा: हिन्दी (सक्रिय)' : 'Language: English'}
                      </span>
                    </button>

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
                        {isHindi ? 'विज्ञापन (प्रचार करें)' : 'Advertising (Promote)'}
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
                        {t('menu_settings', 'Settings')}
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
                          {isHindi ? 'एडमिन हब' : 'Admin Hub'}
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
                        {isHindi ? 'सहायता केंद्र' : 'Help Center'}
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
                        {isHindi ? 'फ़ीडबैक भेजें' : 'Send Feedback'}
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
                        {t('menu_switch_account', 'Switch Account')}
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
                        {t('sign_out', 'Sign Out')}
                      </span>
                    </button>
                  </div>

                </div>
              )}
            </div>
          ) : (
            <div ref={guestRef} className="hidden md:flex items-center gap-2 relative">
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
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left">
                        {isHindi ? 'सहायता केंद्र' : 'Help Center'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('feedback');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] transition-colors" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left">
                        {isHindi ? 'फ़ीडबैक भेजें' : 'Send Feedback'}
                      </span>
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
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left">
                        {isHindi ? 'सोशलइंडिया के बारे में' : 'About SocialIndia'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setGuestMenuOpen(false);
                        navigate('privacy');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#25262c] flex items-center gap-3 transition-colors duration-150 cursor-pointer group"
                    >
                      <FileText className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] transition-colors" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left">
                        {isHindi ? 'गोपनीयता व शर्तें' : 'Privacy & Terms'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate('login')}
                className="px-4 sm:px-6 py-1.5 sm:py-2.5 bg-[#065fd4] hover:bg-[#054fb1] text-white font-bold text-xs sm:text-base rounded-full shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
              >
                {t('sign_in', 'Sign In')}
              </button>
            </div>
          )}
                </div>
              </>
            )}
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 relative">
        
        {/* SIDEBAR (Desktop Only) */}
        <aside 
          className={`hidden md:block shrink-0 bg-white/95 dark:bg-[#0e0f12] border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 z-30 select-none ${sidebarOpen ? 'w-60' : 'w-0 overflow-hidden border-r-0'}`}
        >
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto px-3 py-3.5 space-y-4.5 scrollbar-none">
            
            {/* 1. Feeds & Discover Section */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                {isHindi ? 'फीड व डिस्कवरी' : 'FEED & DISCOVER'}
              </span>

              {/* Home */}
              <button
                onClick={handleHomeClick}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'home' && !route.searchParams?.category
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Home className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${route.path === 'home' && !route.searchParams?.category ? 'text-[#2563eb] dark:text-blue-400 fill-[#2563eb]/20' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{t('nav_home', 'Home')}</span>
                </div>
              </button>

              {/* Shorts */}
              <button
                onClick={() => navigate('shorts')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'shorts'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Zap className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${route.path === 'shorts' ? 'text-amber-500 fill-amber-500' : 'text-amber-500/80'}`} />
                  <span className="truncate">{t('nav_shorts', 'Shorts')}</span>
                </div>
              </button>

              {/* Trending */}
              <button
                onClick={() => navigate('trending')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'trending'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Flame className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${route.path === 'trending' ? 'text-rose-500 fill-rose-500' : 'text-rose-500/80'}`} />
                  <span className="truncate">{t('nav_trending', 'Trending')}</span>
                </div>
              </button>

              {/* Subscriptions */}
              <button
                onClick={() => triggerProtectedAction(() => navigate('subscriptions'))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'subscriptions'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      route.path === 'subscriptions' 
                        ? 'text-[#2563eb] dark:text-blue-400' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {route.path === 'subscriptions' ? (
                      <path d="M20 8H4V6h16v2zm-2-6H6v2h12V2zm4 10v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2zm-12 7l6-3.5L10 12v7z" />
                    ) : (
                      <path d="M18.7 8.7H5.3V7h13.4v1.7zm-1.7-5H7v1.7h10V3.7zm3.3 8.3v8c0 .9-.8 1.7-1.7 1.7H5.7c-.9 0-1.7-.8-1.7-1.7v-8c0-.9.8-1.7 1.7-1.7h12.9c1 0 1.7.8 1.7 1.7zm-1.7 0H5.7v8h12.9v-8zm-7.6 1.7l4.5 2.3-4.5 2.3v-4.6z" />
                    )}
                  </svg>
                  <span className="truncate">{t('nav_subscriptions', 'Subscriptions')}</span>
                </div>
              </button>

              {/* Messages / Direct Chat (Placed immediately below Subscriptions) */}
              <button
                onClick={() => triggerProtectedAction(() => navigate('chat'))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'chat' || route.path === 'messages'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MessageCircle className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${route.path === 'chat' || route.path === 'messages' ? 'text-[#2563eb] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{t('nav_chat', 'Messages & Chat')}</span>
                </div>
              </button>
            </div>

            <div className="h-px bg-slate-200/70 dark:bg-slate-800/70" />

            {/* 2. My Space / Personal Library Tools */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                {isHindi ? 'मेरी लाइब्रेरी' : 'MY SPACE'}
              </span>

              {/* History */}
              <button
                onClick={() => triggerProtectedAction(() => navigate('history'))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'history'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${route.path === 'history' ? 'text-[#2563eb] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{t('nav_history', 'Watch History')}</span>
                </div>
              </button>

              {/* Liked Videos */}
              <button
                onClick={() => triggerProtectedAction(() => navigate('liked'))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'liked' || route.path === 'liked-videos'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ThumbsUp className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${route.path === 'liked' || route.path === 'liked-videos' ? 'text-blue-600 dark:text-blue-400 fill-current' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{t('nav_liked_videos', isHindi ? 'पसंद किए गए' : 'Liked Videos')}</span>
                </div>
              </button>

              {/* Playlists */}
              <button
                onClick={() => triggerProtectedAction(() => navigate('playlists'))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'playlists' || route.path === 'playlist'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ListVideo className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${route.path === 'playlists' || route.path === 'playlist' ? 'text-[#2563eb] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{t('nav_playlists', 'Playlists')}</span>
                </div>
              </button>

              {/* Saved / Watch Later */}
              <button
                onClick={() => triggerProtectedAction(() => navigate('saved'))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'saved'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Bookmark className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${route.path === 'saved' ? 'text-amber-500 fill-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{isHindi ? 'सहेजे गए वीडियो' : 'Watch Later'}</span>
                </div>
              </button>

              {/* Offline Downloads */}
              <button
                onClick={() => navigate('downloads')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group ${
                  route.path === 'downloads'
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#2563eb] dark:text-blue-400 font-bold border-l-[3px] border-[#2563eb] rounded-l-xs shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#1a1b20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ArrowDownToLine className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${route.path === 'downloads' ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{t('nav_downloads', 'Downloads')}</span>
                </div>
              </button>
            </div>

            {/* Super Admin (If authorized) */}
            {currentUserProfile?.role === 'admin' && (
              <div className="space-y-1">
                <button
                  onClick={() => navigate('admin')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer group ${
                    route.path === 'admin' 
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-l-[3px] border-red-600 rounded-l-xs shadow-xs' 
                      : 'text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-red-500" />
                    <span className="truncate">{t('nav_admin', 'Admin Hub')}</span>
                  </div>
                </button>
              </div>
            )}

            {/* 5. Minimalist Platform Footer */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 px-2 space-y-1.5 select-none">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <button onClick={() => navigate('about')} className="hover:text-blue-600 hover:underline cursor-pointer">{t('footer_about', 'About')}</button>
                <span>·</span>
                <button onClick={() => navigate('help')} className="hover:text-blue-600 hover:underline cursor-pointer">{isHindi ? 'सहायता' : 'Help'}</button>
                <span>·</span>
                <button onClick={() => navigate('privacy')} className="hover:text-blue-600 hover:underline cursor-pointer">{t('footer_privacy', 'Privacy')}</button>
                <span>·</span>
                <button onClick={() => navigate('terms')} className="hover:text-blue-600 hover:underline cursor-pointer">{t('footer_terms', 'Terms')}</button>
              </div>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                SocialIndia · {isHindi ? 'भारत का अपना वीडियो मंच 🇮🇳' : 'Made for Bharat 🇮🇳'}
              </p>
            </div>
          </div>
        </aside>

        {/* CONTENT VIEWPORT */}
        <main className={`flex-1 min-w-0 ${isShortsPage ? 'pb-0 md:pb-8 overflow-hidden md:overflow-y-auto' : shouldHideBottomNav ? 'pb-0 md:pb-8 overflow-y-auto' : 'pb-20 md:pb-8 overflow-y-auto'}`}>
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className={`${shouldHideBottomNav ? 'hidden' : 'block md:hidden'} fixed bottom-0 left-0 right-0 z-40 select-none transition-all duration-300 pb-safe ${
        isShortsPage 
          ? 'bg-black/90 backdrop-blur-md border-t border-white/10 text-white shadow-none' 
          : 'bg-white dark:bg-[#0f0f0f] border-t border-[#e5e5e5] dark:border-[#3f3f3f] shadow-lg'
      }`}>
        <div className="h-full flex items-center justify-around px-2">
          
          <button 
            onClick={handleHomeClick}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 transition-all ${
              isShortsPage 
                ? 'text-white/60 hover:text-white' 
                : 'text-[#0f0f0f] dark:text-[#f1f1f1] ' + (route.path === 'home' ? 'font-bold' : 'opacity-70')
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">{t('nav_home', 'Home')}</span>
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
            <span className="text-[10px]">{t('nav_shorts', 'Shorts')}</span>
          </button>

          <button 
            onClick={() => triggerProtectedAction(() => setCreateActionSheetOpen(true))}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 transition-all ${
              isShortsPage ? 'text-white' : 'text-[#2563eb] dark:text-[#3b82f6]'
            }`}
            aria-label={t('create_video', 'Create')}
            title={t('create_video', 'Create')}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-xs transition-colors ${
              isShortsPage ? 'bg-white text-black' : 'bg-[#2563eb] text-white'
            }`}>
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-[10px]">{t('create_video', 'Create')}</span>
          </button>

          <button 
            onClick={() => triggerProtectedAction(() => navigate('subscriptions'))}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 transition-all ${
              isShortsPage 
                ? 'text-white/60 hover:text-white' 
                : (route.path === 'subscriptions' ? 'text-[#2563eb] dark:text-[#3b82f6] font-bold' : 'text-slate-500 dark:text-slate-400')
            }`}
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className={`w-5 h-5 transition-transform ${route.path === 'subscriptions' ? 'text-[#2563eb] dark:text-[#3b82f6]' : isShortsPage ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {route.path === 'subscriptions' ? (
                <path d="M20 8H4V6h16v2zm-2-6H6v2h12V2zm4 10v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2zm-12 7l6-3.5L10 12v7z" />
              ) : (
                <path d="M18.7 8.7H5.3V7h13.4v1.7zm-1.7-5H7v1.7h10V3.7zm3.3 8.3v8c0 .9-.8 1.7-1.7 1.7H5.7c-.9 0-1.7-.8-1.7-1.7v-8c0-.9.8-1.7 1.7-1.7h12.9c1 0 1.7.8 1.7 1.7zm-1.7 0H5.7v8h12.9v-8zm-7.6 1.7l4.5 2.3-4.5 2.3v-4.6z" />
              )}
            </svg>
            <span className="text-[10px]">{t('nav_subscriptions', 'Subscriptions')}</span>
          </button>

          {/* YouTube-style 'You' Tab */}
          <button 
            onClick={() => {
              if (currentUser) {
                navigate('profile-menu');
              } else {
                navigate('login');
              }
            }}
            className={`flex flex-col items-center gap-1 cursor-pointer min-w-12 transition-all ${
              isShortsPage 
                ? 'text-white/60 hover:text-white' 
                : (route.path === 'profile-menu' || route.path === 'creator' || route.path === 'channel' ? 'text-[#2563eb] dark:text-[#3b82f6] font-bold' : 'text-slate-500 dark:text-slate-400')
            }`}
          >
            {currentUser ? (
              <div className={`w-6 h-6 rounded-full overflow-hidden transition-all flex items-center justify-center ${
                route.path === 'profile-menu' || (route.path === 'creator' && (!route.param || route.param === currentUserProfile?.username))
                  ? 'ring-2 ring-[#2563eb] scale-105' 
                  : 'ring-1 ring-slate-300 dark:ring-slate-700'
              }`}>
                <UserAvatar 
                  uid={currentUser.uid}
                  fallbackPhotoURL={currentUserProfile?.photoURL}
                  fallbackDisplayName={currentUserProfile?.displayName || currentUserProfile?.username}
                  size="xs"
                  className="w-full h-full text-[10px]"
                />
              </div>
            ) : (
              <UserIcon className="w-5 h-5" />
            )}
            <span className="text-[10px]">{isHindi ? 'आप' : 'You'}</span>
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

      {/* VOICE SEARCH MODAL (YouTube-style Speech Recognition) */}
      <VoiceSearchModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onTranscript={handleVoiceSearchTranscript}
      />

      {/* MOBILE CREATE ACTION SHEET (YouTube-style: Create Short vs Upload Video vs Post) */}
      <CreateActionSheet 
        isOpen={createActionSheetOpen}
        onClose={() => setCreateActionSheetOpen(false)}
        onCreateShort={() => setMobileShortsStudioOpen(true)}
        onUploadVideo={() => navigate('upload', undefined, { mode: 'video' })}
        onCreatePost={() => navigate('upload', undefined, { mode: 'post' })}
      />

      {/* MOBILE DEDICATED YOUTUBE SHORTS CREATION STUDIO */}
      <MobileShortsStudio
        isOpen={mobileShortsStudioOpen}
        onClose={() => setMobileShortsStudioOpen(false)}
      />
    </div>
  );
};
