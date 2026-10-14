import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { userService } from '../services/userService';
import { useTranslation } from '../i18n';
import { 
  Crown, 
  Wallet, 
  Check, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Video, 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  Loader2,
  ArrowLeft
} from 'lucide-react';

// High-Fidelity Artwork Generated Assets matching reference design
import heroMonumentsImg from '../assets/images/pro_hero_monuments_1791372133427.jpg';
import proNeonGateImg from '../assets/images/pro_card_neon_gate_1791372151057.jpg';
import freeMapImg from '../assets/images/free_map_artwork_1791372164824.jpg';

export const GoProPage: React.FC = () => {
  const { currentUser, currentUserProfile, refreshProfile, addToast } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentWallet = currentUserProfile?.walletBalance || 972.01;
  const currentBonus = currentUserProfile?.bonusBalance || 0;
  const totalAvailable = Number((currentWallet + currentBonus).toFixed(2));
  const isPro = currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin' || currentUserProfile?.isPro;

  const PRO_PRICE = 10.00;

  const handleUpgradeToPro = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentUser || !currentUserProfile) {
      addToast(isHindi ? 'सदस्यता अपग्रेड करने के लिए कृपया साइन इन करें।' : 'Please sign in to upgrade your membership.', 'error');
      navigate('login');
      return;
    }

    if (isPro) {
      addToast(isHindi ? 'आपके पास पहले से ही सक्रिय सोशलइंडिया प्रो क्रिएटर सदस्यता है!' : 'You already have an active SocialIndia Pro Creator Membership!', 'info');
      return;
    }

    if (totalAvailable < PRO_PRICE) {
      setErrorMsg(isHindi 
        ? `अपर्याप्त बैलेंस ($${totalAvailable.toFixed(2)} USD उपलब्ध)। आपको $${PRO_PRICE.toFixed(2)} USD की आवश्यकता है। कृपया सेटिंग्स में पॉइंट्स बदलें या वॉलेट रीचार्ज करें।`
        : `Insufficient Balance ($${totalAvailable.toFixed(2)} USD available). You need $${PRO_PRICE.toFixed(2)} USD. Please convert points or top up in Settings.`);
      addToast(isHindi ? 'प्रो अपग्रेड के लिए अपर्याप्त बैलेंस।' : 'Insufficient balance for Pro upgrade.', 'error');
      return;
    }

    setIsUpgrading(true);
    try {
      const bonusDeduct = Number(Math.min(currentBonus, PRO_PRICE).toFixed(2));
      const remainingToDeduct = Number((PRO_PRICE - bonusDeduct).toFixed(2));
      const newBonus = Number(Math.max(0, currentBonus - bonusDeduct).toFixed(2));
      const newWallet = Number(Math.max(0, currentWallet - remainingToDeduct).toFixed(2));

      await userService.updateProfile(currentUser.uid, {
        role: 'creator',
        isPro: true,
        walletBalance: newWallet,
        bonusBalance: newBonus
      });
      await refreshProfile();
      setSuccessMsg(isHindi ? '🎉 बधाई हो! अब आप एक सत्यापित सोशलइंडिया प्रो क्रिएटर हैं!' : '🎉 Congratulations! You are now a verified SocialIndia PRO Creator!');
      addToast(isHindi ? 'सोशलइंडिया प्रो में सफलतापूर्वक अपग्रेड हो गए!' : 'Upgraded to SocialIndia Pro successfully!', 'success');
    } catch (err: any) {
      setErrorMsg(isHindi ? 'प्रो अपग्रेड पूरा करने में विफल। कृपया पुनः प्रयास करें।' : 'Failed to complete Pro upgrade. Please try again.');
      addToast(isHindi ? 'अपग्रेड विफल। कृपया इंटरनेट कनेक्शन जांचें।' : 'Upgrade failed. Please check your network connection.', 'error');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 select-none relative pb-12">
      
      {/* Mobile Top Navigation Bar (YouTube style) */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={() => navigate('home')}
          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-black text-slate-900 dark:text-white">SocialIndia Pro</span>
      </div>

      {/* 1. SOCIALINDIA PRO HERO BANNER (Matches Reference Design Image 1:1) */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 45%, #f3e8ff 75%, #fff7ed 100%)'
        }}
        className="relative overflow-hidden rounded-3xl border border-blue-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 dark:!bg-gradient-to-r dark:from-[#0b1120] dark:via-[#17153a] dark:to-[#1e1b4b]"
      >
        
        {/* Left Side: Crown Badge & Title */}
        <div className="flex items-center gap-4 sm:gap-5 z-10 max-w-xl">
          <div 
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #4f46e5 100%)'
            }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/35 border-2 border-white"
          >
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white stroke-[1.5]" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0f172a] dark:text-white tracking-tight">
                SocialIndia{' '}
                <span 
                  style={{
                    background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 55%, #9333ea 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Pro
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-snug">
              More power. More reach. More growth.
            </p>
            {/* Blue accent indicator */}
            <div className="w-12 h-1 bg-[#2563eb] rounded-full mt-2" />
          </div>
        </div>

        {/* Center/Right: Wallet Balance Glass Card */}
        <div className="z-10 flex items-center gap-3.5 px-5 py-3.5 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md border border-blue-200/90 dark:border-slate-700/80 rounded-2xl shadow-md shrink-0 self-start md:self-auto">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] dark:text-[#60a5fa] flex items-center justify-center font-bold shadow-xs">
            <Wallet className="w-5 h-5 text-[#2563eb]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Wallet Balance</span>
            <span className="text-base sm:text-lg font-black text-[#1d4ed8] dark:text-[#60a5fa]">
              ${currentWallet.toFixed(2)} USD
            </span>
          </div>
        </div>

        {/* Right Side: High-Fidelity Indian Monuments Skyline Artwork (India Gate, Taj Mahal, Qutub Minar & Tricolor Ribbon) */}
        <div className="absolute right-0 bottom-0 top-0 w-full md:w-3/5 pointer-events-none overflow-hidden flex items-end justify-end">
          <img 
            src={heroMonumentsImg} 
            alt="Indian Monuments Skyline" 
            className="h-full w-auto object-cover object-right opacity-90 dark:opacity-60 mix-blend-multiply dark:mix-blend-lighten"
          />
          {/* Subtle gradient overlay to blend seamlessly on the left edge of artwork */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#eff6ff] via-transparent to-transparent dark:from-[#0b1120] w-1/3" />
        </div>
      </div>

      {/* Alert Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. FEATURE BENEFITS (4 Compact Cards Matching Reference Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Verified Badge */}
        <div className="p-4 sm:p-4.5 bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between gap-3 hover:border-blue-400 hover:shadow-sm transition-all group cursor-pointer">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-[#2563eb]" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">Verified Badge</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">Official Blue Checkmark</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Card 2: 500 MB Uploads */}
        <div className="p-4 sm:p-4.5 bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between gap-3 hover:border-pink-400 hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-pink-50 dark:bg-pink-950/60 text-pink-500 flex items-center justify-center shrink-0 border border-pink-100 dark:border-pink-900/50 group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5 text-pink-500" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">500 MB Uploads</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">4K UHD Support</p>
            </div>
          </div>
        </div>

        {/* Card 3: Featured Status */}
        <div className="p-4 sm:p-4.5 bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between gap-3 hover:border-emerald-400 hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">Featured Status</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">Boosted on Trending</p>
            </div>
          </div>
        </div>

        {/* Card 4: Ad Monetization */}
        <div className="p-4 sm:p-4.5 bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between gap-3 hover:border-amber-400 hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/50 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">Ad Monetization</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">Earn Revenue from Views</p>
            </div>
          </div>
        </div>

      </div>

      {/* 3. MEMBERSHIP COMPARISON (Left: Free Plan, Right: Pro Plan - Side-by-Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* LEFT: BASIC MEMBER / FREE PLAN */}
        <div className="p-6 sm:p-8 bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          
          {/* India Map Silhouette & Tricolor Ribbon Artwork in Background */}
          <div className="absolute right-0 top-6 w-56 h-56 pointer-events-none opacity-85 overflow-hidden flex items-center justify-end">
            <img 
              src={freeMapImg} 
              alt="India Map Artwork" 
              className="w-full h-full object-contain object-right opacity-80 mix-blend-multiply dark:mix-blend-screen"
            />
          </div>

          <div className="space-y-4 relative z-10">
            
            {/* Plan Badge */}
            <span className="inline-block px-3.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] dark:text-[#60a5fa] font-black text-[10px] rounded-full uppercase tracking-wider border border-blue-200 dark:border-blue-900/50">
              BASIC MEMBER
            </span>

            {/* Plan Title */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl sm:text-3xl font-black text-[#0f172a] dark:text-white">Free</h3>
                <Crown className="w-5 h-5 text-slate-400 stroke-[1.8]" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Start your journey. Create, share and grow.
              </p>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />

            {/* Benefits List */}
            <div className="space-y-3">
              {[
                'Watch unlimited videos in Full HD',
                'Upload standard videos up to 100 MB',
                'Create custom playlists & favorites',
                'Earn activity points & exchange to wallet'
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <Check className="w-4 h-4 text-[#2563eb] dark:text-[#60a5fa] shrink-0 stroke-[2.5]" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Unavailable Features */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              {[
                'Verified Blue Checkmark',
                'Featured on Trending & Recommendations'
              ].map((unavail, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 line-through">
                  <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                  <span>{unavail}</span>
                </div>
              ))}
            </div>

          </div>

          {/* Current Plan Button */}
          <div className="pt-8 relative z-10">
            <div className="w-full py-3 bg-white dark:bg-slate-900 border-2 border-[#2563eb]/40 text-[#2563eb] dark:text-[#60a5fa] font-black text-xs rounded-2xl text-center shadow-xs">
              Current Plan
            </div>
          </div>

        </div>

        {/* RIGHT: PRO CREATOR MEMBERSHIP (Deep Purple & Indigo Gradient Card with Crisp White Text) */}
        <div 
          style={{
            background: 'linear-gradient(145deg, #1e1b4b 0%, #2e0854 28%, #3b0764 62%, #4338ca 100%)',
            color: '#ffffff'
          }}
          className="p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col justify-between relative overflow-hidden border border-indigo-300/40 !text-white"
        >
          
          {/* Luminous Purple India Gate Monument Artwork & Tricolor Ribbon in Background */}
          <div className="absolute right-0 bottom-0 top-0 w-3/4 pointer-events-none overflow-hidden flex items-end justify-end opacity-90">
            <img 
              src={proNeonGateImg} 
              alt="Glowing India Gate Artwork" 
              className="h-full w-full object-cover object-right-bottom mix-blend-lighten opacity-80"
            />
            {/* Gradient overlay to smoothly fade into card color */}
            <div 
              style={{
                background: 'linear-gradient(90deg, #1e1b4b 0%, transparent 70%)'
              }}
              className="absolute inset-0"
            />
          </div>

          <div className="space-y-4 relative z-10">
            
            {/* Header: Label Badge & Price Card */}
            <div className="flex items-start justify-between gap-4">
              <span 
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff'
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-black text-[10px] rounded-full uppercase tracking-wider shadow-sm !text-white"
              >
                <Crown className="w-3.5 h-3.5 fill-white text-white" />
                <span className="!text-white">PRO CREATOR MEMBERSHIP</span>
              </span>

              {/* Price Tag Glass Card */}
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)'
                }}
                className="px-4 py-2 rounded-2xl text-center shadow-lg"
              >
                <span 
                  style={{ color: '#ffffff' }}
                  className="text-3xl sm:text-4xl font-black tracking-tight block leading-none !text-white"
                >
                  $10.00
                </span>
                <span 
                  style={{ color: '#e0e7ff' }}
                  className="text-[10px] font-bold block mt-0.5 !text-blue-100"
                >
                  per month
                </span>
              </div>
            </div>

            {/* Plan Title */}
            <div>
              <div className="flex items-center gap-2">
                <h3 
                  style={{ color: '#ffffff' }}
                  className="text-2xl sm:text-3xl font-black !text-white"
                >
                  Pro
                </h3>
                <Crown className="w-6 h-6 text-amber-300 fill-amber-300 drop-shadow-md" />
              </div>
              <p 
                style={{ color: '#e0e7ff' }}
                className="text-xs font-semibold mt-1 !text-blue-100"
              >
                Create Bigger. Earn More.
              </p>
            </div>

            <div className="h-px bg-white/20 my-4" />

            {/* Pro Benefits List (Explicitly White & Crisp) */}
            <div className="space-y-3">
              {[
                { 
                  text: 'Verified Blue Badge', 
                  badgeIcon: true 
                },
                { text: 'Upload up to 500 MB in 4K UHD' },
                { text: 'Featured Creator status' },
                { text: 'Ad Revenue Sharing' },
                { text: 'Priority Creator Support' }
              ].map((benefit, i) => (
                <div 
                  key={i} 
                  style={{ color: '#ffffff' }}
                  className="flex items-center gap-3 text-xs font-bold !text-white"
                >
                  <Check className="w-4 h-4 text-white stroke-[3] shrink-0" />
                  <span className="!text-white">{benefit.text}</span>
                  {benefit.badgeIcon && (
                    <div className="w-4 h-4 rounded-full bg-[#0284c7] text-white text-[9px] font-black inline-flex items-center justify-center shadow-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>

          {/* Upgrade to Pro Button CTA */}
          <div className="pt-8 relative z-10">
            <button
              onClick={handleUpgradeToPro}
              disabled={isUpgrading || isPro}
              style={{
                background: isPro 
                  ? '#ffffff' 
                  : 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
                color: isPro ? '#1e1b4b' : '#ffffff',
                boxShadow: '0 8px 25px -4px rgba(99, 102, 241, 0.6)'
              }}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer border border-white/30 hover:brightness-110 ${
                isPro ? 'cursor-default' : ''
              }`}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="text-white">Processing Upgrade...</span>
                </>
              ) : isPro ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-[#1e1b4b] font-black">✓ You are a Pro Member</span>
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span className="text-white font-black">Upgrade to Pro →</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* 4. BOTTOM INFORMATION BANNER (Matches Reference Design) */}
      <div className="p-4 sm:p-5 bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs relative overflow-hidden">
        
        {/* Subtle Ashok Chakra / Tricolor Curve on bottom-left */}
        <div className="absolute -left-6 -bottom-6 w-20 h-20 opacity-15 pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-blue-700 fill-none" strokeWidth="1.5">
            <circle cx="50" cy="50" r="40" />
            <circle cx="50" cy="50" r="8" fill="#1d4ed8" />
            {[...Array(24)].map((_, i) => (
              <line 
                key={i} 
                x1="50" 
                y1="50" 
                x2={50 + 40 * Math.cos((i * 15 * Math.PI) / 180)} 
                y2={50 + 40 * Math.sin((i * 15 * Math.PI) / 180)} 
              />
            ))}
          </svg>
        </div>

        <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200 z-10">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          <span><strong>Grow your audience.</strong> Unlock more features.</span>
        </div>

        <button
          onClick={() => window.scrollTo({ top: 350, behavior: 'smooth' })}
          className="text-[#2563eb] dark:text-[#60a5fa] font-extrabold hover:underline shrink-0 flex items-center gap-1 cursor-pointer z-10"
        >
          <span>View Plans</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
