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
  RefreshCw
} from 'lucide-react';
import { getInitials } from '../utils/videoUtils';

export const MobileMenu: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();

  if (!currentUser || !currentUserProfile) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f0f] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-full text-blue-600 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Profile & Tools Workspace</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          Please sign in to access your direct profile hub, watch playlists, settings, and advanced creator tools.
        </p>
        <button 
          onClick={() => navigate('login')} 
          className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await authService.logout();
      addToast('Signed out successfully.', 'success');
      navigate('home');
    } catch {
      addToast('Failed to sign out.', 'error');
    }
  };

  const handleSwitchAccount = () => {
    navigate('login');
    addToast('Account switcher loaded. You can now login to a different channel!', 'success');
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
                  ★ Points: {currentUserProfile.points || 0}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/40 rounded-full">
                  $ Wallet: ${Number(currentUserProfile.walletBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('creator', currentUserProfile.username)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer active:scale-98 transition-all"
          >
            <UserIcon className="w-4 h-4" />
            <span>View Your Profile / Channel</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* 2. MY LIBRARY & PLAYLISTS */}
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">My Library & Playlists</p>
          <div className="bg-slate-50/60 dark:bg-[#161616]/40 border border-slate-100 dark:border-slate-800 p-2 rounded-3xl space-y-1">
            <button
              onClick={() => navigate('studio')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-xl">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">My Playlists</p>
                  <p className="text-[10px] text-slate-500">Manage video playlists</p>
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
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Saved Videos</p>
                  <p className="text-[10px] text-slate-500">Watch later bookmarks</p>
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
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Watch History</p>
                  <p className="text-[10px] text-slate-500">Resume your playbacks</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* 3. SETTINGS & UTILITIES */}
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">Settings & Preferences</p>
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
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Channel Settings</p>
                  <p className="text-[10px] text-slate-500">Edit info, passwords & payouts</p>
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
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Language Localization</p>
                  <p className="text-[10px] text-slate-500">Indian regional languages selection</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* 4. CREATOR TOOLS & PROMOTIONS */}
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">Creator Tools & Boosts</p>
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
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Promote (Ad Campaigns)</p>
                  <p className="text-[10px] text-slate-500">Boost video views & subscribers</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate('gopro')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 rounded-xl animate-pulse">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>GoPro Premium</span>
                    <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                  </p>
                  <p className="text-[10px] text-slate-500">Unlock maximum rewards speed</p>
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
                    <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Platform Admin Hub</p>
                    <p className="text-[10px] text-slate-500">Security audits & users wallet credit</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* 5. ACCOUNTS & LOGOUT */}
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">Account Operations</p>
          <div className="bg-slate-50/60 dark:bg-[#161616]/40 border border-slate-100 dark:border-slate-800 p-2 rounded-3xl space-y-1">
            <button
              onClick={handleSwitchAccount}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-2xl cursor-pointer text-xs font-black uppercase tracking-wider text-blue-600"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch Channel / Account</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-2xl cursor-pointer text-xs font-black uppercase tracking-wider text-rose-600"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Workspace</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
