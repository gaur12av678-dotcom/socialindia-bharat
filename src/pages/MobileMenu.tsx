import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { historyService } from '../services/historyService';
import { HistoryItem } from '../types';
import { 
  User as UserIcon, 
  Settings, 
  Bookmark, 
  History as HistoryIcon, 
  LogOut, 
  ArrowRight,
  Globe,
  Lock,
  RefreshCw,
  ListVideo,
  ArrowDownToLine,
  ThumbsUp,
  Clapperboard,
  ShieldCheck,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Upload,
  Search,
  MessageCircle,
  ExternalLink,
  Play,
  Share2,
  FileText,
  ChevronRight,
  TrendingUp,
  Tv,
  Crown,
  Smartphone,
  Download
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { UserAvatar } from '../components/UserAvatar';

export const MobileMenu: React.FC = () => {
  const { currentUser, currentUserProfile, addToast, openSwitchAccount, logout } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    setHistoryLoading(true);
    historyService.getHistory(currentUser.uid)
      .then((items) => {
        if (isMounted) {
          setHistoryItems(items.slice(0, 8));
        }
      })
      .catch((err) => {
        console.warn('Failed to load history for MobileMenu:', err);
      })
      .finally(() => {
        if (isMounted) setHistoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      addToast(isHindi ? 'सफलतापूर्वक साइन आउट किया गया।' : 'Signed out successfully.', 'success');
      navigate('home');
    } catch {
      addToast(isHindi ? 'साइन आउट करने में विफल।' : 'Failed to sign out.', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // LOGGED OUT VIEW
  // --------------------------------------------------------------------------
  if (!currentUser || !currentUserProfile) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f0f] flex flex-col justify-between p-4 sm:p-6 pb-28 text-center font-sans select-none">
        <div className="flex-1 flex flex-col items-center justify-center py-10 max-w-sm mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-md shadow-blue-500/10">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {isHindi ? 'अपनी प्रोफ़ाइल व टूल्स देखें' : 'Sign in to SocialIndia'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isHindi 
                ? 'अपनी वॉच हिस्ट्री, प्लेलिस्ट, क्रिएटर स्टूडियो और व्यक्तिगत सेटिंग्स के लिए साइन इन करें।' 
                : 'Sign in to access your watch history, playlists, creator studio, and personalized settings.'}
            </p>
          </div>
          <button 
            onClick={() => navigate('login')} 
            className="w-full py-3 bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            {isHindi ? 'अभी साइन इन करें' : 'Sign In Now'}
          </button>
        </div>

        {/* Quick Help & Support Links even when logged out */}
        <div className="max-w-sm mx-auto w-full pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              onClick={() => navigate('help')}
              className="p-3 bg-slate-50 dark:bg-[#16171a] rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-blue-500" />
              <span>{isHindi ? 'सहायता केंद्र' : 'Help & FAQ'}</span>
            </button>
            <button
              onClick={() => navigate('feedback')}
              className="p-3 bg-slate-50 dark:bg-[#16171a] rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>{isHindi ? 'फ़ीडबैक भेजें' : 'Send Feedback'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 pt-2">
            <button onClick={() => navigate('about')} className="hover:text-blue-600 transition-colors cursor-pointer">
              {isHindi ? 'हमारे बारे में' : 'About Us'}
            </button>
            <span>·</span>
            <button onClick={() => navigate('privacy')} className="hover:text-blue-600 transition-colors cursor-pointer">
              {isHindi ? 'गोपनीयता' : 'Privacy'}
            </button>
            <span>·</span>
            <button onClick={() => navigate('terms')} className="hover:text-blue-600 transition-colors cursor-pointer">
              {isHindi ? 'शर्तें' : 'Terms'}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            © {new Date().getFullYear()} SocialIndia • {isHindi ? 'भारत का अपना वीडियो मंच 🇮🇳' : 'Made with ❤️ for Bharat 🇮🇳'}
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserProfile.role === 'admin';
  const isCreator = currentUserProfile.role === 'creator' || isAdmin;

  // --------------------------------------------------------------------------
  // LOGGED IN YOUTUBE-STYLE "YOU" PROFILE MENU
  // --------------------------------------------------------------------------
  return (
    <div className="bg-slate-50 dark:bg-[#0f0f0f] min-h-screen text-slate-900 dark:text-slate-100 pb-32 select-none font-sans transition-colors">
      
      {/* 1. YOUTUBE-STYLE STICKY TOP APP BAR */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {isHindi ? 'आप' : 'You'}
          </h1>
          {isAdmin && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider border border-red-200 dark:border-red-900/60">
              Admin
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('search')}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-colors active:scale-90"
            title={isHindi ? 'खोजें' : 'Search'}
          >
            <Search className="w-5 h-5 stroke-[2.2]" />
          </button>
          <button
            onClick={() => navigate('settings')}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-colors active:scale-90"
            title={isHindi ? 'सेटिंग्स' : 'Settings'}
          >
            <Settings className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">

        {/* 2. MAIN USER PROFILE CARD (Exact YouTube "You" Layout) */}
        <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <UserAvatar 
                uid={currentUserProfile.uid}
                fallbackPhotoURL={currentUserProfile.photoURL}
                fallbackDisplayName={currentUserProfile.displayName || currentUserProfile.username}
                size="xl"
                className="w-16 h-16 min-w-[64px] min-h-[64px] text-xl rounded-full border-2 border-white dark:border-slate-800 shadow-md ring-2 ring-blue-500/20"
              />
              {isAdmin && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
                {currentUserProfile.displayName || currentUserProfile.username}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-semibold">
                @{currentUserProfile.username}
              </p>
              
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {currentUserProfile.followersCount || 0} {isHindi ? 'सब्सक्राइबर्स' : 'subscribers'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {currentUserProfile.videosCount || 0} {isHindi ? 'वीडियो' : 'videos'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Profile Pills (View Channel & Switch Account) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => navigate('creator', currentUserProfile.username || currentUser.uid)}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="truncate">{isHindi ? 'चैनल देखें' : 'View channel'}</span>
            </button>

            <button
              onClick={openSwitchAccount}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="truncate">{isHindi ? 'खाता बदलें' : 'Switch account'}</span>
            </button>
          </div>
        </div>

        {/* 3. RECENT WATCH HISTORY CAROUSEL (Signature YouTube Feature) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {isHindi ? 'वॉच हिस्ट्री' : 'History'}
              </h3>
            </div>
            <button
              onClick={() => navigate('history')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isHindi ? 'सभी देखें' : 'View all'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {historyItems.length > 0 ? (
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1 -mx-4 px-4">
              {historyItems.map((item) => (
                <div
                  key={item.videoId}
                  onClick={() => navigate('watch', item.videoId)}
                  className="w-36 shrink-0 group cursor-pointer space-y-1.5"
                >
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <img 
                      src={item.thumbnailUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-7 h-7 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {item.creatorDisplayName || item.creatorUsername}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-white dark:bg-[#16171a] rounded-3xl border border-slate-200/90 dark:border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {isHindi ? 'आपके देखे गए वीडियो यहाँ दिखाई देंगे।' : 'Videos you watch will show up here.'}
              </p>
              <button
                onClick={() => navigate('home')}
                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-black rounded-xl hover:bg-blue-100 cursor-pointer"
              >
                {isHindi ? 'वीडियो एक्सप्लोर करें' : 'Explore Videos'}
              </button>
            </div>
          )}
        </div>

        {/* 4. PLAYLISTS & LIBRARY HORIZONTAL STRIP (YouTube Style) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <ListVideo className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {isHindi ? 'प्लेलिस्ट एवं लाइब्रेरी' : 'Playlists & Library'}
              </h3>
            </div>
            <button
              onClick={() => navigate('playlists')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isHindi ? 'सभी देखें' : 'View all'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Liked Videos */}
            <button
              onClick={() => navigate('liked')}
              className="p-3.5 bg-white dark:bg-[#16171a] rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-center gap-3 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left shadow-xs cursor-pointer group active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ThumbsUp className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {isHindi ? 'पसंद किए गए' : 'Liked videos'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                  {isHindi ? 'ऑटो प्लेलिस्ट' : 'Auto playlist'}
                </p>
              </div>
            </button>

            {/* Saved / Watch Later */}
            <button
              onClick={() => navigate('saved')}
              className="p-3.5 bg-white dark:bg-[#16171a] rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-center gap-3 hover:border-amber-400 dark:hover:border-amber-500 transition-all text-left shadow-xs cursor-pointer group active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bookmark className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {isHindi ? 'बाद में देखें' : 'Watch later'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                  {isHindi ? 'सेव किए गए वीडियो' : 'Saved videos'}
                </p>
              </div>
            </button>

            {/* Downloads */}
            <button
              onClick={() => navigate('downloads')}
              className="p-3.5 bg-white dark:bg-[#16171a] rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-center gap-3 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all text-left shadow-xs cursor-pointer group active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {isHindi ? 'डाउनलोड्स' : 'Downloads'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                  {isHindi ? 'ऑफ़लाइन वीडियो' : 'Offline library'}
                </p>
              </div>
            </button>

            {/* All Playlists */}
            <button
              onClick={() => navigate('playlists')}
              className="p-3.5 bg-white dark:bg-[#16171a] rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-center gap-3 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all text-left shadow-xs cursor-pointer group active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ListVideo className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {isHindi ? 'मेरी प्लेलिस्ट' : 'My Playlists'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                  {isHindi ? 'कस्टम सूचियां' : 'Custom mixes'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 5. CREATOR STUDIO & CONTENT TOOLS (Specifically Requested: "crter studio missing hai") */}
        <div className="space-y-3">
          <p className="px-1 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            {isHindi ? 'क्रिएटर स्टूडियो व टूल्स' : 'Creator Studio & Tools'}
          </p>

          {/* YouTube-style Creator Studio Button */}
          <button 
            type="button"
            onClick={() => navigate('studio')}
            className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer text-left shadow-xs active:scale-98 group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Clapperboard className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {isHindi ? 'सोशल इंडिया स्टूडियो' : 'SocialIndia Studio'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {isHindi 
                    ? 'एनालिटिक्स, वीडियो प्रबंधन और कमाई' 
                    : 'Analytics, video management & earnings'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline text-xs font-bold text-red-600 dark:text-red-400">Studio</span>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>

          {/* Quick Creator Navigation Menu Items */}
          <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-2 space-y-1 shadow-xs">
            {/* Upload Video / Short */}
            <button
              onClick={() => navigate('upload')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? 'वीडियो या शॉर्ट्स अपलोड करें' : 'Upload Video or Short'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'नया कंटेंट प्रकाशित करें' : 'Publish new creative content'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Community Posts */}
            <button
              onClick={() => navigate('community')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? 'कम्युनिटी पोस्ट्स' : 'Community Posts'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'पोल, अपडेट्स और तस्वीरें साझा करें' : 'Share polls, updates & images with fans'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Chat & Messages */}
            <button
              onClick={() => navigate('chat')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? 'मैसेज व बातचीत' : 'Messages & Chat'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'क्रिएटर्स और दर्शकों से सीधे जुड़ें' : 'Direct inbox with creators & viewers'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 6. ADMIN HUB (Specifically Requested: "admin hub missing hai") */}
        {isAdmin && (
          <div className="space-y-3">
            <p className="px-1 text-[11px] font-black uppercase text-red-500 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isHindi ? 'प्रशासन (Administration)' : 'Platform Administration'}</span>
            </p>

            <div 
              onClick={() => navigate('admin')}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 border border-white/10 shadow-lg cursor-pointer active:scale-98 transition-all group"
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-1 max-w-[240px]">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin Hub</span>
                  </div>
                  <h4 className="text-base font-black tracking-tight text-white">
                    {isHindi ? 'सोशल इंडिया एडमिन हब' : 'SocialIndia Admin Hub'}
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    {isHindi 
                      ? 'उपयोगकर्ता, वीडियो मॉडरेशन, मोनेटाइजेशन, स्टोरेज और विज्ञापन प्रबंधित करें।' 
                      : 'Manage users, video moderation, monetization payouts, storage & ads.'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md">
                  <ArrowRight className="w-6 h-6 stroke-[2.5]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. MORE FROM SOCIALINDIA (Pro Membership & Ads) */}
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            {isHindi ? 'विशेष सेवाएं' : 'More from SocialIndia'}
          </p>
          <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-2 space-y-1 shadow-xs">
            <button
              onClick={() => navigate('gopro')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{isHindi ? 'सोशल इंडिया प्रो (Go Pro)' : 'SocialIndia Pro'}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold uppercase">
                      Premium
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'विज्ञापन-मुक्त वीडियो और बैकग्राउंड प्ले' : 'Ad-free playback & background streaming'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('advertising')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? 'विज्ञापन एवं चैनल प्रचार' : 'Advertising & Promotions'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'अपने वीडियो और चैनल को लाखों लोगों तक पहुँचाएं' : 'Boost your channel reach to millions'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 8. SETTINGS & PREFERENCES */}
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            {isHindi ? 'सेटिंग्स एवं प्राथमिकताएं' : 'Settings & Preferences'}
          </p>
          <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-2 space-y-1 shadow-xs">
            {/* Download Android App (APK) */}
            <button
              onClick={() => navigate('settings', 'app_download')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{isHindi ? 'सोशलइंडिया ऐप डाउनलोड करें (APK)' : 'Download SocialIndia App'}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase">
                      APK
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'आधिकारिक एंड्रॉयड ऐप • तेज़ डाउनलोड व ऑफ़लाइन मोड' : 'Official Android APK • Real offline mode'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('settings')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? 'चैनल सेटिंग्स' : 'Channel Settings'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'प्रोफ़ाइल, पासवर्ड, मोनेटाइजेशन और भुगतान' : 'Profile, security, monetization & payouts'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('language')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? 'भाषा चयन (हिंदी / English)' : 'Language Selection'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'अपनी पसंदीदा भारतीय भाषा चुनें' : 'Choose Indian regional language'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                  {isHindi ? 'हिंदी' : 'English'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* 9. HELP & FEEDBACK (Specifically Requested: "feedback and hep msiing hai") */}
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            {isHindi ? 'सहायता एवं फ़ीडबैक' : 'Help & Feedback'}
          </p>
          <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-2 space-y-1 shadow-xs">
            {/* Help Center */}
            <button
              onClick={() => navigate('help')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? 'सहायता केंद्र एवं प्रश्न (Help & FAQ)' : 'Help & Support'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'सामान्य प्रश्न, गाइड एवं सहायता टिकट' : 'FAQs, creator guides & support tickets'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Send Feedback */}
            <button
              onClick={() => navigate('feedback')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? 'फ़ीडबैक भेजें (Send Feedback)' : 'Send Feedback'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'सुझाव दें, बग रिपोर्ट करें और अनुभव साझा करें' : 'Suggest ideas, report issues & rate app'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Community Guidelines */}
            <button
              onClick={() => navigate('community-guidelines')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? 'कम्युनिटी दिशानिर्देश' : 'Community Guidelines'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHindi ? 'सुरक्षित व सम्मानजनक मंच के नियम' : 'Rules for a safe & respectful platform'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 10. ACCOUNT SWITCH & SIGN OUT */}
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            {isHindi ? 'खाता संचालन' : 'Account Actions'}
          </p>
          <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-2 space-y-1 shadow-xs">
            <button
              onClick={openSwitchAccount}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer text-left font-black text-xs group"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4" />
                <span>{isHindi ? 'चैनल / खाता बदलें' : 'Switch Channel / Account'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-rose-50/60 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left font-black text-xs group"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4" />
                <span>{t('sign_out', 'Sign Out')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 11. FOOTER & COPYRIGHT */}
        <div className="pt-4 pb-2 border-t border-slate-200 dark:border-slate-800/80 px-2 space-y-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <button 
              onClick={() => navigate('about')} 
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              {isHindi ? 'हमारे बारे में' : 'About Us'}
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button 
              onClick={() => navigate('help')} 
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              {isHindi ? 'सहायता' : 'Help'}
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button 
              onClick={() => navigate('privacy')} 
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              {isHindi ? 'गोपनीयता नीति' : 'Privacy'}
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button 
              onClick={() => navigate('terms')} 
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              {isHindi ? 'नियम व शर्तें' : 'Terms'}
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-black text-slate-700 dark:text-slate-300">
              © {new Date().getFullYear()} SocialIndia. All rights reserved.
            </p>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {isHindi ? 'भारत का अपना वीडियो मंच 🇮🇳' : 'Made with ❤️ for Bharat 🇮🇳'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
