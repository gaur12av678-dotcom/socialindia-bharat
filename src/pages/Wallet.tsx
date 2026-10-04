import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { walletService, DAILY_COIN_CAP, REWARD_RATES, SPEND_RATES } from '../services/walletService';
import { videoService } from '../services/videoService';
import { CoinTransaction, Video } from '../types';
import { 
  Coins, 
  Sparkles, 
  Rocket, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Film, 
  Eye, 
  Heart, 
  MessageSquare, 
  UserPlus, 
  Gift, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownLeft 
} from 'lucide-react';
import { useRouter } from '../hooks/useRouter';

export const WalletPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast, refreshProfile } = useApp();
  const { navigate } = useRouter();

  const [coinBalance, setCoinBalance] = useState(0);
  const [dailyEarned, setDailyEarned] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isBuyingVerification, setIsBuyingVerification] = useState(false);
  const [claimingDaily, setIsClaimingDaily] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadWalletData();
    }
  }, [currentUser]);

  const loadWalletData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [wallet, txs, vids] = await Promise.all([
        walletService.getUserWallet(currentUser.uid),
        walletService.getTransactions(currentUser.uid),
        videoService.getVideos({ creatorId: currentUser.uid })
      ]);

      setCoinBalance(wallet.coinBalance);
      setDailyEarned(wallet.dailyCoinsEarned);
      setTransactions(txs);
      setUserVideos(vids);
      if (vids.length > 0) setSelectedVideoId(vids[0].videoId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDailyBonus = async () => {
    if (!currentUser) return;
    setIsClaimingDaily(true);
    try {
      const res = await walletService.awardCoins(currentUser.uid, 'daily', 'Daily Login Check-in Bonus');
      if (res.success) {
        addToast(res.message, 'success');
        await loadWalletData();
        await refreshProfile();
      } else {
        addToast(res.message, 'info');
      }
    } catch (err) {
      addToast('Failed to claim daily bonus', 'error');
    } finally {
      setIsClaimingDaily(false);
    }
  };

  const handlePromoteVideo = async () => {
    if (!currentUser || !selectedVideoId) return;
    if (coinBalance < SPEND_RATES.promote_video) {
      addToast(`You need at least 🪙 ${SPEND_RATES.promote_video} Coins to promote a video.`, 'error');
      return;
    }

    setIsPromoting(true);
    try {
      const res = await walletService.promoteVideoWithCoins(currentUser.uid, selectedVideoId);
      if (res.success) {
        addToast(res.message, 'success');
        await loadWalletData();
        await refreshProfile();
      } else {
        addToast(res.message, 'error');
      }
    } catch (err) {
      addToast('Failed to promote video', 'error');
    } finally {
      setIsPromoting(false);
    }
  };

  const handleBuyVerification = async () => {
    if (!currentUser) return;
    if (coinBalance < SPEND_RATES.buy_verification) {
      addToast(`You need at least 🪙 ${SPEND_RATES.buy_verification} Coins to unlock verification.`, 'error');
      return;
    }

    setIsBuyingVerification(true);
    try {
      const res = await walletService.buyVerificationBadgeWithCoins(currentUser.uid);
      if (res.success) {
        addToast(res.message, 'success');
        await loadWalletData();
        await refreshProfile();
      } else {
        addToast(res.message, 'error');
      }
    } catch (err) {
      addToast('Failed to unlock verification badge', 'error');
    } finally {
      setIsBuyingVerification(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 pb-24">
      
      {/* Wallet Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 space-y-3 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider">
            <Coins className="w-4 h-4 text-yellow-200 animate-bounce" />
            <span>Local SocialCoin Creator Economy</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            Your Platform SocialCoins Wallet
          </h1>
          
          <p className="text-xs sm:text-sm text-yellow-100 font-semibold max-w-lg leading-relaxed">
            Earn coins genuinely by engaging with creators across India. Use coins to promote your videos or unlock your verified creator badge!
          </p>

          {/* Daily Cap Progress */}
          <div className="bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/20 max-w-md space-y-1.5">
            <div className="flex justify-between text-xs font-extrabold">
              <span>Today's Earning Cap Guard</span>
              <span>{dailyEarned} / {DAILY_COIN_CAP} Coins Today</span>
            </div>
            <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-300 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (dailyEarned / DAILY_COIN_CAP) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Balance Counter Card */}
        <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/30 rounded-3xl p-6 text-center shrink-0 min-w-[220px] shadow-2xl space-y-3">
          <p className="text-xs font-extrabold text-yellow-100 uppercase tracking-widest">Total Balance</p>
          <div className="flex items-center justify-center gap-2 text-3xl sm:text-4xl font-black">
            <Coins className="w-8 h-8 text-yellow-300 stroke-[2.5]" />
            <span>{coinBalance}</span>
          </div>

          <button
            onClick={handleClaimDailyBonus}
            disabled={claimingDaily}
            className="w-full py-2.5 bg-white hover:bg-yellow-50 text-amber-900 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {claimingDaily ? <Loader2 className="w-4 h-4 animate-spin text-amber-700" /> : <Gift className="w-4 h-4 text-amber-600" />}
            <span>Claim Daily Bonus (+5)</span>
          </button>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      </div>

      {/* HOW TO EARN COINS SECTION */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-5 shadow-xs">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>How to Earn Genuine SocialCoins</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            Earn coins naturally by interacting with other creators. Anti-spam guard protects fair distribution (Max {DAILY_COIN_CAP} Coins/day).
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Eye, title: 'Watch Video (>30s)', reward: `+${REWARD_RATES.watch} Coins`, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
            { icon: Heart, title: 'Like Video', reward: `+${REWARD_RATES.like} Coin`, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
            { icon: MessageSquare, title: 'Genuine Comment', reward: `+${REWARD_RATES.comment} Coins`, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
            { icon: UserPlus, title: 'Subscribe Channel', reward: `+${REWARD_RATES.subscribe} Coins`, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="p-4 bg-slate-50 dark:bg-[#1E293B]/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                <div className={`w-10 h-10 rounded-2xl mx-auto flex items-center justify-center ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">{item.title}</p>
                <span className="inline-block text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                  🪙 {item.reward}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SPEND / REDEEM COINS CENTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: PROMOTE / BOOST VIDEO */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-2xl">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Boost & Promote My Video
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Feature your video on top Home feed for 7 days!
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Select Your Video to Promote
              </label>

              {userVideos.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  You haven't uploaded any videos yet. Upload a video in Studio first!
                </p>
              ) : (
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {userVideos.map(v => (
                    <option key={v.videoId} value={v.videoId}>
                      {v.title} {v.isPromoted ? '🚀 (Already Boosted)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Coins className="w-4 h-4" />
              <span>Cost: {SPEND_RATES.promote_video} Coins</span>
            </span>

            <button
              onClick={handlePromoteVideo}
              disabled={isPromoting || userVideos.length === 0 || coinBalance < SPEND_RATES.promote_video}
              className="px-6 py-2.5 bg-[#065fd4] hover:bg-[#054fb1] disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {isPromoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              <span>Boost Video (7 Days)</span>
            </button>
          </div>
        </div>

        {/* CARD 2: BUY CREATOR VERIFICATION BADGE */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-2xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Unlock Official Verified Creator Badge
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Display a blue verification checkmark ✓ next to your channel name.
                </p>
              </div>
            </div>

            {currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin' ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                  Your channel is already verified! Verified badge ✓ is active.
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Spend 🪙 {SPEND_RATES.buy_verification} SocialCoins earned from genuine community activity to instantly unlock your Verified Creator Status!
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Coins className="w-4 h-4" />
              <span>Cost: {SPEND_RATES.buy_verification} Coins</span>
            </span>

            {currentUserProfile?.role !== 'creator' && currentUserProfile?.role !== 'admin' && (
              <button
                onClick={handleBuyVerification}
                disabled={isBuyingVerification || coinBalance < SPEND_RATES.buy_verification}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                {isBuyingVerification ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Unlock Verified Badge</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* TRANSACTION HISTORY LEDGER */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
          SocialCoin Transaction History ({transactions.length})
        </h3>

        {transactions.length === 0 ? (
          <p className="text-center py-8 text-xs font-bold text-slate-400">
            No coin transactions yet. Start watching, liking, and commenting to earn coins!
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${
                    tx.type === 'earn' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40' 
                      : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40'
                  }`}>
                    {tx.type === 'earn' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{tx.reason}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{new Date(tx.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <span className={`text-xs font-black ${tx.type === 'earn' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {tx.type === 'earn' ? '+' : '-'}{tx.amount} Coins
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
