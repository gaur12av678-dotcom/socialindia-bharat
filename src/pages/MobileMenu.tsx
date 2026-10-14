import React from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { authService } from '../services/authService';
import { 
  User as UserIcon, 
  Settings, 
  PlusSquare, 
  Bookmark, 
  History, 
  Megaphone, 
  Zap, 
  ShieldCheck, 
  HelpCircle, 
  LogOut, 
  Users, 
  ArrowRight,
  Globe,
  Lock,
  Sparkles,
  RefreshCw,
  ListVideo,
  ArrowDownToLine,
  Sun,
  Moon,
  ThumbsUp
} from 'lucide-react';
import { getInitials } from '../utils/videoUtils';
import { useTranslation } from '../i18n';

export const MobileMenu: React.FC = () => {
  const { currentUser, currentUserProfile, theme, setTheme, addToast } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  if (!currentUser || !currentUserProfile) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f0f] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-full text-blue-600 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          {isHindi ? 'प्रोफ़ाइल एवं टूल्स कार्यक्षेत्र' : 'Profile & Tools Workspace'}
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          {isHindi 
            ? 'अपनी प्रोफ़ाइल, प्लेलिस्ट, सेटिंग्स और क्रिएटर टूल्स तक पहुँचने के लिए कृपया साइन इन करें।' 
            : 'Please sign in to access your direct profile hub, watch playlists, settings, and advanced creator tools.'}
        </p>
        <button 
          onClick={() => navigate('login')} 
          className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
        >
          {isHindi ? 'अभी साइन इन करें' : 'Sign In Now'}
        </button>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await authService.logout();
      addToast(isHindi ? 'सफलतापूर्वक साइन आउट किया गया।' : 'Signed out successfully.', 'success');
      navigate('home');
    } catch {
      addToast(isHindi ? 'साइन आउट करने में विफल।' : 'Failed to sign out.', 'error');
    }
  };

  const handleSwitchAccount = () => {
    navigate('login');
    addToast(isHindi ? 'खाता बदलने का विकल्प खुला। अब आप दूसरे चैनल में लॉगिन कर सकते हैं!' : 'Account switcher loaded. You can now login to a different channel!', 'success');
  };

  const isAdmin = currentUserProfile.role === 'admin';

  return (
    <div className="bg-white dark:bg-[#0f0f0f] min-h-screen text-slate-900 dark:text-slate-100 pb-28 select-none">
      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* 1. TOP VIEW YOUR PROFILE HEADER CARD */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl border-2 border-white dark:border-slate-800 shadow-md overflow-hidden shrink-0">
              {currentUserProfile.photoURL ? (
                <img src={currentUserProfile.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(currentUserProfile.displayName)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
                {currentUserProfile.displayName}
              </h2>
              <p className="text-xs text-slate-500 truncate font-semibold">@{currentUserProfile.username}</p>
              
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/40 rounded-full">
                  ★ {isHindi ? 'पॉइंट्स' : 'Points'}: {currentUserProfile.points || 0}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/40 rounded-full">
                  $ {isHindi ? 'वॉलेट' : 'Wallet'}: ${Number(currentUserProfile.walletBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('creator', currentUserProfile.username)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer active:scale-98 transition-all"
          >
            <UserIcon className="w-4 h-4" />
            <span>{isHindi ? 'अपनी प्रोफ़ाइल / चैनल देखें' : 'View Your Profile / Channel'}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* 2. MY LIBRARY & PLAYLISTS */}
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {isHindi ? 'मेरी लाइब्रेरी एवं प्लेलिस्ट' : 'My Library & Playlists'}
          </p>
          <div className="bg-slate-50/60 dark:bg-[#161616]/40 border border-slate-100 dark:border-slate-800 p-2 rounded-3xl space-y-1">
            <button
              onClick={() => navigate('playlists')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-xl">
                  <ListVideo className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {t('nav_playlists', 'My Playlists')}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'वीडियो प्लेलिस्ट प्रबंधित करें' : 'Manage video playlists'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate('downloads')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-xl">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {t('nav_downloads', 'Downloaded Videos')}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'ऑफ़लाइन प्लेबैक संग्रह' : 'Offline playback library'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate('liked')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ThumbsUp className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {t('nav_liked_videos', isHindi ? 'पसंद किए गए वीडियो' : 'Liked Videos')}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'आपके द्वारा लाइक किए गए वीडियो' : 'Videos you have liked'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate('saved')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {t('saved_title', 'Saved Videos')}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'बाद में देखने के लिए बुकमार्क' : 'Watch later bookmarks'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate('history')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {t('history_title', 'Watch History')}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'अपने देखे गए वीडियो देखें' : 'Resume your playbacks'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* 3. SETTINGS & UTILITIES */}
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {isHindi ? 'सेटिंग्स एवं प्राथमिकताएं' : 'Settings & Preferences'}
          </p>
          <div className="bg-slate-50/60 dark:bg-[#161616]/40 border border-slate-100 dark:border-slate-800 p-2 rounded-3xl space-y-1">
            <button
              onClick={() => navigate('settings')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {isHindi ? 'चैनल सेटिंग्स' : 'Channel Settings'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'प्रोफ़ाइल, पासवर्ड और भुगतान विवरण' : 'Edit info, passwords & payouts'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate('language')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/30 text-teal-600 rounded-xl">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {isHindi ? 'भाषा चयन (हिंदी / English)' : 'Language Localization'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'भारतीय क्षेत्रीय भाषा चुनें' : 'Indian regional languages selection'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => {
                const isDarkActive = document.documentElement.classList.contains('dark');
                setTheme(isDarkActive ? 'light' : 'dark');
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  {theme === 'dark' || (typeof window !== 'undefined' && document.documentElement.classList.contains('dark')) ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {isHindi ? 'थीम मोड (लाइट / डार्क)' : 'Appearance Theme'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {theme === 'dark' || (typeof window !== 'undefined' && document.documentElement.classList.contains('dark'))
                      ? (isHindi ? 'डार्क नाइट मोड सक्रिय' : 'Dark Night Mode Active')
                      : (isHindi ? 'लाइट मोड सक्रिय' : 'Light Day Mode Active')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {theme === 'dark' || (typeof window !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'Dark' : 'Light'}
              </span>
            </button>
          </div>
        </div>

        {/* 4. CREATOR TOOLS & PROMOTIONS */}
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {isHindi ? 'क्रिएटर टूल्स एवं बूस्ट' : 'Creator Tools & Boosts'}
          </p>
          <div className="bg-slate-50/60 dark:bg-[#161616]/40 border border-slate-100 dark:border-slate-800 p-2 rounded-3xl space-y-1">
            <button
              onClick={() => navigate('advertising')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-xl">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {isHindi ? 'प्रचार करें (विज्ञापन अभियान)' : 'Promote (Ad Campaigns)'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'वीडियो व्यूज़ और सब्सक्राइबर्स बढ़ाएं' : 'Boost video views & subscribers'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate('gopro')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:purple-950/30 text-purple-600 rounded-xl animate-pulse">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{t('nav_gopro', 'GoPro Premium')}</span>
                    <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'अधिकतम रिवॉर्ड्स और सुविधाएं पाएं' : 'Unlock maximum rewards speed'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            {isAdmin && (
              <button
                onClick={() => navigate('admin')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      {t('nav_admin', 'Platform Admin Hub')}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {isHindi ? 'सुरक्षा ऑडिट एवं वॉलेट क्रेडिट' : 'Security audits & users wallet credit'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* 5. ACCOUNTS & LOGOUT */}
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {isHindi ? 'खाता संचालन' : 'Account Operations'}
          </p>
          <div className="bg-slate-50/60 dark:bg-[#161616]/40 border border-slate-100 dark:border-slate-800 p-2 rounded-3xl space-y-1">
            <button
              onClick={handleSwitchAccount}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-2xl cursor-pointer text-xs font-black uppercase tracking-wider text-blue-600"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isHindi ? 'चैनल / खाता बदलें' : 'Switch Channel / Account'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-2xl cursor-pointer text-xs font-black uppercase tracking-wider text-rose-600"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('sign_out', 'Sign Out Workspace')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
