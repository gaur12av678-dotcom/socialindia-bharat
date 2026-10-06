import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { userService } from '../services/userService';
import { 
  Sparkles, 
  Check, 
  ArrowLeft, 
  Wallet, 
  Loader2, 
  ShieldCheck, 
  Crown, 
  Zap, 
  TrendingUp, 
  Video, 
  CheckCircle2,
  X,
  HelpCircle
} from 'lucide-react';

export const GoProPage: React.FC = () => {
  const { currentUser, currentUserProfile, refreshProfile } = useApp();
  const { navigate } = useRouter();

  const [isUpgrading, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentWallet = currentUserProfile?.walletBalance || 0;
  const currentBonus = currentUserProfile?.bonusBalance || 0;
  const totalAvailable = Number((currentWallet + currentBonus).toFixed(2));
  const isPro = currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin';

  const PRO_PRICE = 10.00;

  const handleUpgradeToPro = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentUser || !currentUserProfile) {
      setErrorMsg('Please sign in to upgrade your membership.');
      return;
    }

    if (totalAvailable < PRO_PRICE) {
      setErrorMsg(`Insufficient Balance ($${totalAvailable.toFixed(2)} available). You need $${PRO_PRICE.toFixed(2)}. Please convert points or top up your wallet.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Deduct bonus first, then wallet
      const bonusDeduct = Number(Math.min(currentBonus, PRO_PRICE).toFixed(2));
      const remainingToDeduct = Number((PRO_PRICE - bonusDeduct).toFixed(2));
      const newBonus = Number(Math.max(0, currentBonus - bonusDeduct).toFixed(2));
      const newWallet = Number(Math.max(0, currentWallet - remainingToDeduct).toFixed(2));

      await userService.updateProfile(currentUser.uid, {
        role: 'creator',
        walletBalance: newWallet,
        bonusBalance: newBonus
      });
      await refreshProfile();
      setSuccessMsg('🎉 Congratulations! You are now a verified SocialIndia PRO Creator!');
    } catch (err: any) {
      setErrorMsg('Failed to complete Pro upgrade. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-white p-4 sm:p-6 md:p-8 space-y-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <div className="bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-[#222D3D] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <button
              onClick={() => navigate('home')}
              className="p-3 bg-slate-100 dark:bg-[#1A2232] hover:bg-slate-200 dark:hover:bg-[#253046] text-slate-700 dark:text-slate-200 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-800"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  SocialIndia Pro
                </h1>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black rounded-lg uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  <span>PRO</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Unlock verified creator badge, 500 MB high-quality uploads & ad monetization.
              </p>
            </div>
          </div>

          {/* Wallet Balance Pill */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-[#1A2232] border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3 shrink-0 self-start md:self-auto">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[#00A3FF] flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Wallet Balance</span>
              <span className="text-base font-black text-[#00A3FF]">${currentWallet.toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <X className="w-4 h-4 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 stroke-[2.5]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Benefit Highlights Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-[#222D3D] rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Verified Badge</h4>
              <p className="text-[10px] text-slate-400 font-semibold">Official Blue Checkmark ✓</p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-[#222D3D] rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">500 MB Uploads</h4>
              <p className="text-[10px] text-slate-400 font-semibold">4K UHD Video Support</p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-[#222D3D] rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Featured Status</h4>
              <p className="text-[10px] text-slate-400 font-semibold">Boosted on Trending</p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-[#222D3D] rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Ad Monetization</h4>
              <p className="text-[10px] text-slate-400 font-semibold">Earn Revenue from Views</p>
            </div>
          </div>
        </div>

        {/* Comparison Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          
          {/* Free Starter Card */}
          <div className="bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-[#222D3D] rounded-3xl p-7 flex flex-col justify-between space-y-6 shadow-xs">
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <span className="px-3 py-1 bg-slate-100 dark:bg-[#1A2232] text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-black uppercase tracking-wider">
                  Basic Member
                </span>
                <div className="flex items-baseline justify-between pt-1">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Free</h3>
                  <span className="text-xs font-bold text-slate-400">Forever</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Everything you need to watch videos, follow your favorite creators and upload basic content.
                </p>
              </div>

              {/* Feature List */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#1E2638] space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Included in Free Plan:
                </span>
                <div className="space-y-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[3]" />
                    <span>Watch unlimited videos in Full HD</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[3]" />
                    <span>Upload standard videos up to 100 MB</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[3]" />
                    <span>Create custom playlists & favorites</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[3]" />
                    <span>Earn activity points & exchange to wallet</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <X className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="line-through">Verified Blue Checkmark</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <X className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="line-through">Featured on Trending & Recommendations</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled
              className="w-full py-3.5 bg-slate-100 dark:bg-[#1A2232] text-slate-400 dark:text-slate-500 font-bold text-xs rounded-2xl cursor-default uppercase tracking-wider"
            >
              Current Active Plan
            </button>
          </div>

          {/* PRO Creator Card (Highlighted) */}
          <div className="bg-white dark:bg-[#121824] border-2 border-blue-500 dark:border-[#00A3FF] rounded-3xl p-7 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
            
            {/* Top Luminous Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Recommended</span>
            </div>

            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <span className="px-3 py-1 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-black uppercase tracking-wider">
                  Pro Creator Membership
                </span>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Pro</h3>
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">$10.00</span>
                    <span className="text-xs text-slate-400 font-bold block">per month</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Full power tools for creators to grow audience, gain verification and earn advertising revenue.
                </p>
              </div>

              {/* Feature List */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#1E2638] space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Everything in Free, plus:
                </span>
                <div className="space-y-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span><strong>Verified Blue Badge ✓</strong> on your channel & comments</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span><strong>Upload up to 500 MB</strong> in 4K UHD video quality</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span><strong>Featured Creator status</strong> on Trending & Recommended feeds</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span><strong>Ad Revenue Sharing</strong> on your published videos</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span><strong>Priority Creator Support</strong> & Creator Studio analytics</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action CTA Button */}
            <button
              onClick={handleUpgradeToPro}
              disabled={isUpgrading || isPro}
              className={`w-full py-4 text-white font-black text-xs rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 ${
                isPro
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-default'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              {isUpgrading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPro ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isPro ? 'Pro Creator Status Active ✓' : 'Upgrade to Pro ($10.00 USD / mo)'}</span>
            </button>
          </div>

        </div>

        {/* FAQ & Information Box */}
        <div className="bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-[#222D3D] rounded-3xl p-6 space-y-3 text-xs">
          <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <span>Frequently Asked Questions</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-500 dark:text-slate-400 font-medium pt-2">
            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">How is the payment processed?</h5>
              <p>The membership cost of $10.00 is deducted directly from your SocialIndia Wallet Balance or converted activity points.</p>
            </div>
            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">When does the Verified badge appear?</h5>
              <p>Your Verified Blue Tick Badge appears immediately on your channel profile, videos, and comments across the entire platform.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
