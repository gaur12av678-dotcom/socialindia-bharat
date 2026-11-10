import React from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { authService } from '../services/authService';
import { 
  User as UserIcon, 
  Settings, 
  Bookmark, 
  History, 
  LogOut, 
  ArrowRight,
  Globe,
  Lock,
  RefreshCw,
  ListVideo,
  ArrowDownToLine,
  ThumbsUp
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { UserAvatar } from '../components/UserAvatar';

export const MobileMenu: React.FC = () => {
  const { currentUser, currentUserProfile, addToast, openSwitchAccount, logout } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  if (!currentUser || !currentUserProfile) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f0f] flex flex-col justify-between p-6 pb-28 text-center">
        <div className="flex-1 flex flex-col items-center justify-center py-12">
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

        {/* Platform Footer & Copyright for Logged Out View */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 px-2 space-y-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <button onClick={() => navigate('about')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
              {isHindi ? 'हमारे बारे में' : 'About Us'}
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button onClick={() => navigate('help')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
              {isHindi ? 'सहायता' : 'Help'}
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button onClick={() => navigate('privacy')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
              {isHindi ? 'गोपनीयता नीति' : 'Privacy'}
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button onClick={() => navigate('terms')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
              {isHindi ? 'नियम व शर्तें' : 'Terms'}
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
              © {new Date().getFullYear()} SocialIndia. All rights reserved.
            </p>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {isHindi ? 'भारत का अपना वीडियो मंच 🇮🇳' : 'Made with ❤️ for Bharat 🇮🇳'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      addToast(isHindi ? 'सफलतापूर्वक साइन आउट किया गया।' : 'Signed out successfully.', 'success');
      navigate('home');
    } catch {
      addToast(isHindi ? 'साइन आउट करने में विफल।' : 'Failed to sign out.', 'error');
    }
  };

  const handleSwitchAccount = () => {
    openSwitchAccount();
  };

  return (
    <div className="bg-white dark:bg-[#0f0f0f] min-h-screen text-slate-900 dark:text-slate-100 pb-28 select-none">
      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* 1. TOP VIEW YOUR PROFILE HEADER CARD */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <UserAvatar 
              uid={currentUserProfile.uid}
              fallbackPhotoURL={currentUserProfile.photoURL}
              fallbackDisplayName={currentUserProfile.displayName || currentUserProfile.username}
              size="xl"
              className="w-16 h-16 min-w-[64px] min-h-[64px] text-xl border-2 border-white dark:border-slate-800 shadow-md"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
                {currentUserProfile.displayName}
              </h2>
              <p className="text-xs text-slate-500 truncate font-semibold">@{currentUserProfile.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('creator', currentUserProfile?.username || currentUser?.uid)}
              className="py-2.5 px-3 bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer active:scale-98 transition-all"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="truncate">{isHindi ? 'चैनल देखें' : 'View Channel'}</span>
            </button>
            <button
              onClick={openSwitchAccount}
              className="py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#2563eb]" />
              <span className="truncate">{isHindi ? 'खाता बदलें' : 'Switch Account'}</span>
            </button>
          </div>
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

        {/* 6. PLATFORM FOOTER & COPYRIGHT */}
        <div className="pt-6 pb-2 border-t border-slate-100 dark:border-slate-800/80 px-2 space-y-4 text-center">
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
            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
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
