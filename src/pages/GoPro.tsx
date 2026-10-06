import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { userService } from '../services/userService';
import { Sparkles, Check, ArrowLeft, Wallet, Loader2, ShieldCheck } from 'lucide-react';

export const GoProPage: React.FC = () => {
  const { currentUser, currentUserProfile, refreshProfile } = useApp();
  const { navigate } = useRouter();

  const [isUpgrading, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentWallet = currentUserProfile?.walletBalance || 0;
  const isPro = currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin';

  const handleUpgradeToPro = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentUser || !currentUserProfile) {
      setErrorMsg('Please sign in to upgrade to Pro Package.');
      return;
    }

    if (currentWallet < 10) {
      setErrorMsg(`Insufficient Wallet Balance ($${currentWallet.toFixed(2)} USD). You need $10.00. Please convert points in the Points tab or replenish your wallet first.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newWallet = Number((currentWallet - 10).toFixed(2));
      await userService.updateProfile(currentUser.uid, {
        role: 'creator',
        walletBalance: newWallet
      });
      await refreshProfile();
      setSuccessMsg('🎉 Upgrade Successful! You are now a Pro Member with Verified Badge ✓ and Featured status!');
    } catch (err: any) {
      setErrorMsg('Failed to complete Pro upgrade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200/90 dark:bg-slate-900 text-slate-900 dark:text-white p-4 sm:p-6 md:p-8 space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Header Bar */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('home')}
              className="p-2.5 bg-slate-100 dark:bg-[#1E1E1E] hover:bg-slate-200 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-slate-200 dark:border-[#2A2A2A]"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Package</span>
                <span className="px-3 py-1 bg-[#00A3FF] text-white text-xs font-black rounded-lg uppercase">PRO</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Discover more features with SocialIndia Pro package 🚀
              </p>
            </div>
          </div>

          {/* Wallet Balance Pill */}
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl flex items-center gap-3 shrink-0 text-xs font-bold">
            <Wallet className="w-4 h-4 text-[#00A3FF]" />
            <span className="text-slate-500 dark:text-slate-400">Wallet Balance:</span>
            <span className="text-[#00A3FF] font-black">${currentWallet.toFixed(2)} USD</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-500 stroke-[3]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Pricing Cards Grid (Matches Screenshot 5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Free Member Card */}
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222222] rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between p-6 space-y-6">
            <div className="space-y-4">
              <div className="h-40 rounded-2xl bg-linear-to-r from-purple-600 via-pink-600 to-rose-600 flex items-center justify-center p-6 text-white font-black text-2xl shadow-inner">
                Free Member
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Free Member</h3>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">Free</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  It is a long established fact that a reader will be distracted.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#222222] space-y-2.5">
                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block mb-2">Features Including:</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500 stroke-[3]" /><span>Upload unlimited videos</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500 stroke-[3]" /><span>Videos ads will show up</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500 stroke-[3]" /><span>Not featured videos</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500 stroke-[3]" /><span>No verified badge</span></div>
                </div>
              </div>
            </div>

            <button
              disabled
              className="w-full py-3 bg-slate-100 dark:bg-[#1E1E1E] text-slate-500 dark:text-slate-400 font-black text-xs rounded-full cursor-not-allowed uppercase tracking-wider"
            >
              Stay Free
            </button>
          </div>

          {/* Pro Card (Matches Screenshot 5) */}
          <div className="bg-white dark:bg-[#121212] border-2 border-[#00A3FF] rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between p-6 space-y-6 relative">
            <div className="space-y-4">
              <div className="h-40 rounded-2xl bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center p-6 text-white font-black text-3xl shadow-inner">
                Pro Member ⚡
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Pro</span>
                      <ShieldCheck className="w-5 h-5 text-[#00A3FF]" />
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">$10</span>
                    <span className="text-xs text-slate-400 block font-bold">1 month</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  It is a long established fact that a reader will be distracted.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#222222] space-y-2.5">
                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block mb-2">Features Including:</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#00A3FF] stroke-[3]" /><span>Verified badge ✓</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#00A3FF] stroke-[3]" /><span>Featured videos</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#00A3FF] stroke-[3]" /><span>Upload up to 500 MB</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#00A3FF] stroke-[3]" /><span>Ad Revenue Sharing</span></div>
                </div>
              </div>
            </div>

            <button
              onClick={handleUpgradeToPro}
              disabled={isUpgrading || isPro}
              className="w-full py-3.5 bg-[#00A3FF] hover:bg-[#0082CC] disabled:bg-emerald-600 text-white font-black text-xs rounded-full shadow-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isPro ? 'Pro Member Active' : 'Upgrade ($10.00 USD)'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
