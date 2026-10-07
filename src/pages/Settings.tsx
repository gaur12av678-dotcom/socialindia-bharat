import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { userService } from '../services/userService';
import { videoService } from '../services/videoService';
import { getInitials } from '../utils/videoUtils';
import { 
  Settings as SettingsIcon, 
  ArrowLeft,
  Moon, 
  Sun, 
  Monitor, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck,
  Check,
  User as UserIcon,
  Palette,
  Image as ImageIcon,
  Sparkles,
  DollarSign,
  Lock,
  Wallet,
  Award,
  Key,
  Ban,
  Smartphone,
  Info,
  UserX,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  ArrowRightLeft,
  ShoppingBag,
  Gift,
  AlertCircle
} from 'lucide-react';
import { paidVideoService } from '../services/paidVideoService';
import { payoutService } from '../services/payoutService';
import { WithdrawalRequest } from '../types';

export const Settings: React.FC = () => {
  const { currentUser, currentUserProfile, theme, setTheme, refreshProfile, addToast } = useApp();
  const { navigate } = useRouter();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<
    | 'general'
    | 'profile'
    | 'privacy'
    | 'monetization'
    | 'password'
    | 'balance'
    | 'avatar_cover'
    | 'verification'
    | 'points'
    | 'two_factor'
    | 'blocked_users'
    | 'sessions'
    | 'my_info'
    | 'purchases'
    | 'delete_account'
  >('general');

  // General Settings Form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [country, setCountry] = useState('India');
  const [age, setAge] = useState('Not selected');
  const [newsletter, setNewsletter] = useState<'active' | 'inactive'>('inactive');

  // Profile Form
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bannerURL, setBannerURL] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [ytLink, setYtLink] = useState('');
  const [website, setWebsite] = useState('');
  const [telegram, setTelegram] = useState('');

  // Password Change
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passwordStatusMsg, setPasswordStatusMsg] = useState('');

  // Wallet / Balance States
  const [walletBalance, setWalletBalance] = useState(0.00);
  const [mainBalance, setMainBalance] = useState(0.00);
  const [bonusBalance, setBonusBalance] = useState(0.00);
  const [isConvertingBonus, setIsConvertingBonus] = useState(false);
  const [replenishAmount, setReplenishAmount] = useState(100);
  const [replenishModalOpen, setReplenishModalOpen] = useState(false);
  const [walletMsg, setWalletMsg] = useState('');

  // Withdrawal States
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Transfer Wallet -> Balance State (To allow withdraw after replenish)
  const [transferToBalanceModalOpen, setTransferToBalanceModalOpen] = useState(false);
  const [transferToBalanceAmount, setTransferToBalanceAmount] = useState(50);
  const [isTransferringToBalance, setIsTransferringToBalance] = useState(false);

  // Points State
  const [points, setPoints] = useState(0);
  const [convertPointsInput, setConvertPointsInput] = useState(100);
  const [isConverting, setIsConverting] = useState(false);
  const [pointsConvertMsg, setPointsConvertMsg] = useState('');

  // Monetization Progress
  const [userTotalViews, setUserTotalViews] = useState(0);
  const [isRequestingMonetization, setIsRequestingMonetization] = useState(false);
  const [monetizationMsg, setMonetizationMsg] = useState('');

  // Two Factor
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // In-line Status Messages (No bottom toast popups)
  const [generalSaveMsg, setGeneralSaveMsg] = useState('');
  const [profileSaveMsg, setProfileSaveMsg] = useState('');
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Verification request state
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);
  const [verificationCategory, setVerificationCategory] = useState('Technology');
  const [verificationPitch, setVerificationPitch] = useState('');
  const [verificationMsg, setVerificationMsg] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Load User Data & Stats accurately
  useEffect(() => {
    if (currentUserProfile) {
      setUsername(currentUserProfile.username || '');
      setEmail(currentUserProfile.email || '');
      setDisplayName(currentUserProfile.displayName || '');
      setBio(currentUserProfile.bio || '');
      setPhotoURL(currentUserProfile.photoURL || '');
      setBannerURL(currentUserProfile.bannerURL || '');
      setGender(currentUserProfile.gender || 'Male');
      setCountry(currentUserProfile.country || 'India');
      setAge(currentUserProfile.age || 'Not selected');
      setPoints(currentUserProfile.points ?? 0);
      setWalletBalance(currentUserProfile.walletBalance ?? 0.00);
      setMainBalance(currentUserProfile.mainBalance ?? 0.00);
      setBonusBalance(currentUserProfile.bonusBalance ?? 0.00);
      if (currentUserProfile.upiId) {
        setWithdrawUpiId(currentUserProfile.upiId);
      }
      if (currentUserProfile.displayName) {
        setWithdrawAccountName(currentUserProfile.displayName);
      }
      setInstagram(currentUserProfile.socialLinks?.instagram || '');
      setTwitter(currentUserProfile.socialLinks?.twitter || '');
      setYtLink(currentUserProfile.socialLinks?.youtube || '');
      setWebsite(currentUserProfile.socialLinks?.website || '');
      setTelegram(currentUserProfile.socialLinks?.telegram || '');

      if (currentUserProfile.role === 'creator' || currentUserProfile.role === 'admin') {
        setVerificationSubmitted(true);
      }
    }

    if (currentUser) {
      videoService.getCreatorVideos(currentUser.uid).then((videos: any[]) => {
        const total = videos.reduce((acc: number, v: any) => acc + (v.viewsCount || 0), 0);
        setUserTotalViews(total);
      }).catch(console.warn);

      payoutService.getWithdrawalRequests(currentUser.uid).then(setMyWithdrawals).catch(console.warn);
    }
  }, [currentUser, currentUserProfile]);

  // Save changes handler (General)
  const handleSaveGeneral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    setSavingStatus('saving');
    setGeneralSaveMsg('');
    try {
      await userService.updateProfile(currentUser.uid, {
        username: username.trim().toLowerCase(),
        gender,
        country,
        age,
      });
      await refreshProfile();
      setSavingStatus('saved');
      setGeneralSaveMsg('✅ General settings saved successfully!');
      setTimeout(() => {
        setGeneralSaveMsg('');
        setSavingStatus('idle');
      }, 4000);
    } catch (err) {
      console.error(err);
      setSavingStatus('error');
      setGeneralSaveMsg('❌ Failed to save general settings.');
    }
  };

  // Save profile handler
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    setSavingStatus('saving');
    setProfileSaveMsg('');
    try {
      await userService.updateProfile(currentUser.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL,
        bannerURL,
        socialLinks: {
          instagram,
          twitter,
          youtube: ytLink,
          website,
          telegram
        }
      });
      await refreshProfile();
      setSavingStatus('saved');
      setProfileSaveMsg('✅ Profile details updated successfully!');
      setTimeout(() => {
        setProfileSaveMsg('');
        setSavingStatus('idle');
      }, 4000);
    } catch (err) {
      console.error(err);
      setSavingStatus('error');
      setProfileSaveMsg('❌ Failed to save profile details.');
    }
  };

  // Convert Points Handler with exact points formula (100 points = ₹1.00 / $1.00 balance)
  const handleConvertPoints = async () => {
    if (!currentUser) return;
    setPointsConvertMsg('');

    if (convertPointsInput <= 0) {
      setPointsConvertMsg('❌ Please enter a valid number of points.');
      return;
    }

    if (points < convertPointsInput) {
      setPointsConvertMsg(`❌ Insufficient points. You have ${points} points, but requested ${convertPointsInput}.`);
      return;
    }

    setIsConverting(true);
    try {
      const res = await userService.convertPointsToWallet(currentUser.uid, convertPointsInput);
      setPoints(res.newPoints);
      setWalletBalance(res.newWalletBalance);
      await refreshProfile();
      const addedAmount = (convertPointsInput * 0.01).toFixed(2);
      const successText = `✅ Successfully converted ${convertPointsInput} points to ₹${addedAmount} Wallet Balance!`;
      setPointsConvertMsg(successText);
      setWalletMsg(successText);
      addToast(`Converted ${convertPointsInput} points to ₹${addedAmount} Wallet Balance!`, 'success');
    } catch (err: any) {
      const errorText = `❌ ${err.message || 'Failed to convert points.'}`;
      setPointsConvertMsg(errorText);
      addToast(err.message || 'Failed to convert points.', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  // Top Up Wallet Handler (In INR ₹)
  const handleReplenishWallet = async () => {
    if (!currentUser) return;
    setWalletMsg('');
    if (replenishAmount <= 0) {
      setWalletMsg('❌ Please enter a valid top-up amount.');
      return;
    }
    try {
      const newBal = await userService.replenishWallet(currentUser.uid, replenishAmount);
      setWalletBalance(newBal);
      await refreshProfile();
      setReplenishModalOpen(false);
      const msg = `✅ Successfully added ₹${replenishAmount.toFixed(2)} to your Shopping Wallet!`;
      setWalletMsg(msg);
      addToast(msg, 'success');
    } catch (err) {
      setWalletMsg('❌ Failed to top up wallet balance.');
      addToast('Failed to top up wallet balance.', 'error');
    }
  };

  // Transfer Funds from Shopping Wallet to Withdrawable Balance
  const handleTransferWalletToBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (transferToBalanceAmount <= 0) {
      setWalletMsg('❌ Please enter a valid amount to transfer.');
      return;
    }
    if (walletBalance < transferToBalanceAmount) {
      setWalletMsg(`❌ Insufficient Wallet balance. You have ₹${walletBalance.toFixed(2)} in Wallet.`);
      return;
    }
    setIsTransferringToBalance(true);
    try {
      const res = await payoutService.transferWalletToBalance(currentUser.uid, transferToBalanceAmount);
      setWalletBalance(res.newWallet);
      setMainBalance(res.newBalance);
      await refreshProfile();
      setTransferToBalanceModalOpen(false);
      const msg = `✅ Transferred ₹${transferToBalanceAmount.toFixed(2)} from Wallet to Withdrawable Balance!`;
      setWalletMsg(msg);
      addToast(msg, 'success');
    } catch (err: any) {
      setWalletMsg(`❌ ${err.message || 'Failed to transfer funds.'}`);
      addToast(err.message || 'Failed to transfer.', 'error');
    } finally {
      setIsTransferringToBalance(false);
    }
  };

  // Submit UPI Withdrawal Request
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setWithdrawMsg('');

    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawMsg('❌ Please enter a valid withdrawal amount.');
      return;
    }
    if (mainBalance < amt) {
      setWithdrawMsg(`❌ Insufficient Balance. You have ₹${mainBalance.toFixed(2)} available for withdrawal, but requested ₹${amt.toFixed(2)}.`);
      return;
    }
    if (!withdrawUpiId.trim()) {
      setWithdrawMsg('❌ Please enter your valid UPI ID (e.g. yourname@okhdfcbank / phone@paytm).');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const req = await payoutService.createWithdrawalRequest(
        currentUser.uid,
        amt,
        withdrawUpiId.trim(),
        withdrawAccountName.trim(),
        withdrawPhone.trim()
      );
      setMainBalance(prev => Math.max(0, Number((prev - amt).toFixed(2))));
      setMyWithdrawals(prev => [req, ...prev.filter(r => r.id !== req.id)]);
      await refreshProfile();
      setWithdrawModalOpen(false);
      const successMsg = `✅ Withdrawal request of ₹${amt.toFixed(2)} submitted to UPI: ${withdrawUpiId.trim()}! Status: Pending Admin Payout.`;
      setWalletMsg(successMsg);
      addToast(`Withdrawal of ₹${amt.toFixed(2)} requested successfully!`, 'success');
    } catch (err: any) {
      setWithdrawMsg(`❌ ${err.message || 'Failed to submit withdrawal request.'}`);
      addToast(err.message || 'Failed to submit withdrawal request.', 'error');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // Convert Bonus to Wallet Balance Handler
  const handleConvertBonusToWallet = async () => {
    if (!currentUser || bonusBalance <= 0) return;
    setIsConvertingBonus(true);
    setWalletMsg('');
    try {
      const res = await paidVideoService.convertBonusToWallet(currentUser.uid, bonusBalance);
      setBonusBalance(res.newBonus);
      setWalletBalance(res.newWallet);
      await refreshProfile();
      setWalletMsg(`✅ Successfully transferred ₹${bonusBalance.toFixed(2)} Bonus Money to your Main Wallet Balance!`);
    } catch (err: any) {
      setWalletMsg(`❌ ${err.message || 'Failed to convert bonus.'}`);
    } finally {
      setIsConvertingBonus(false);
    }
  };

  // Submit Monetization Request (500 subs & 1000 views)
  const handleRequestMonetization = async () => {
    if (!currentUser || !currentUserProfile) return;
    setMonetizationMsg('');
    const subsCount = currentUserProfile.followersCount || 0;
    
    if (subsCount < 500 || userTotalViews < 1000) {
      setMonetizationMsg('❌ Monetization locked: You need at least 500 subscribers and 1,000 views.');
      return;
    }

    setIsRequestingMonetization(true);
    try {
      await userService.updateProfile(currentUser.uid, {
        isMonetized: true,
        monetizationStatus: 'approved'
      });
      await refreshProfile();
      setMonetizationMsg('🎉 Congratulations! Channel Monetization has been activated for your account.');
    } catch (err) {
      setMonetizationMsg('❌ Failed to activate monetization.');
    } finally {
      setIsRequestingMonetization(false);
    }
  };

  // Password update handler
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg('');
    if (!newPass || newPass.length < 6) {
      setPasswordStatusMsg('❌ Password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPasswordStatusMsg('❌ New passwords do not match.');
      return;
    }
    if (currentUser) {
      try {
        const nowIso = new Date().toISOString();
        await userService.updateProfile(currentUser.uid, {
          lastPasswordChangedAt: nowIso
        });
        await refreshProfile();
      } catch (err) {
        console.warn('Could not store password update timestamp:', err);
      }
    }
    setPasswordStatusMsg('✅ Password changed successfully!');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  };

  // Submit Verification Handler
  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationMsg('');
    if (!verificationPitch.trim()) {
      setVerificationMsg('❌ Please provide details or social links for verification.');
      return;
    }
    setVerificationSubmitted(true);
    setVerificationMsg('✅ Verification request submitted successfully! Under review by platform team.');
  };

  // Avatar file upload
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      if (res) {
        setPhotoURL(res);
        if (currentUser) {
          userService.updateProfile(currentUser.uid, { photoURL: res });
          refreshProfile();
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Banner file upload
  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      if (res) {
        setBannerURL(res);
        if (currentUser) {
          userService.updateProfile(currentUser.uid, { bannerURL: res });
          refreshProfile();
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const menuItems = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'monetization', label: 'Monetization', icon: DollarSign },
    { id: 'password', label: 'Password', icon: Key },
    { id: 'balance', label: 'Balance', icon: Wallet, badge: `$${walletBalance.toFixed(2)}` },
    { id: 'avatar_cover', label: 'Avatar & Cover', icon: ImageIcon },
    { id: 'verification', label: 'Verification', icon: ShieldCheck, badge: verificationSubmitted ? 'Submitted' : undefined },
    { id: 'points', label: 'Points', icon: Award, badge: `${points} pts` },
    { id: 'two_factor', label: 'Two-factor authentication', icon: Key },
    { id: 'blocked_users', label: 'Blocked Users', icon: Ban },
    { id: 'sessions', label: 'Manage Sessions', icon: Smartphone },
    { id: 'my_info', label: 'My Information', icon: Info },
    { id: 'purchases', label: 'My Purchases', icon: ShoppingBag },
    { id: 'delete_account', label: 'Delete account', icon: UserX },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#0f0f0f] text-slate-900 dark:text-white transition-colors p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Hidden File Inputs */}
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFileSelect} />

        {/* PlayTube Settings 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT COLUMN: Settings Menu Sidebar Card */}
          <div className="w-full lg:w-80 shrink-0 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222222] rounded-3xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 mb-3 border-b border-slate-200 dark:border-[#222222]">
              <button
                onClick={() => navigate('home')}
                className="p-2.5 bg-slate-100 dark:bg-[#1E1E1E] hover:bg-slate-200 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-slate-200 dark:border-[#2A2A2A]"
                title="Back to Home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Settings
              </h1>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 dark:bg-[#1E1E1E] text-slate-900 dark:text-white border-l-4 border-[#00A3FF] shadow-xs'
                        : 'text-slate-600 dark:text-[#999999] hover:bg-slate-50 dark:hover:bg-[#1A1A1A] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#00A3FF]' : 'text-slate-400 dark:text-[#777777]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-[#00A3FF]/20 text-[#00A3FF] text-[10px] font-black rounded-lg">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* RIGHT COLUMN: Tab Panel Container Card */}
          <div className="flex-1 w-full bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222222] rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm min-h-[500px]">
            
            {/* TAB 1: GENERAL SETTINGS */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#222222] flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">General Settings</h2>
                  <button
                    onClick={handleSaveGeneral}
                    disabled={savingStatus === 'saving'}
                    className="px-6 py-2.5 bg-[#00A3FF] hover:bg-[#0082CC] text-white font-black text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    {savingStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Save</span>
                  </button>
                </div>

                {generalSaveMsg && (
                  <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 rounded-2xl text-xs font-bold">
                    {generalSaveMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">E-mail address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF] cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">Country</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF] cursor-pointer"
                    >
                      <option value="Select Country">Select Country</option>
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">Age</label>
                    <select
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF] cursor-pointer"
                    >
                      <option value="Not selected">Not selected</option>
                      <option value="18">18</option>
                      <option value="19">19</option>
                      <option value="20">20</option>
                      <option value="21">21</option>
                      <option value="22">22</option>
                      <option value="23">23</option>
                      <option value="24">24</option>
                      <option value="25+">25+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">Newsletter</label>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="newsletter"
                        checked={newsletter === 'active'}
                        onChange={() => setNewsletter('active')}
                        className="w-4 h-4 text-[#00A3FF] focus:ring-[#00A3FF]"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Active</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="newsletter"
                        checked={newsletter === 'inactive'}
                        onChange={() => setNewsletter('inactive')}
                        className="w-4 h-4 text-[#00A3FF] focus:ring-[#00A3FF]"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Inactive</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#222222] flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Profile Settings</h2>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingStatus === 'saving'}
                    className="px-6 py-2.5 bg-[#00A3FF] hover:bg-[#0082CC] text-white font-black text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    {savingStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Save</span>
                  </button>
                </div>

                {profileSaveMsg && (
                  <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 rounded-2xl text-xs font-bold">
                    {profileSaveMsg}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">About / Bio</label>
                    <textarea
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell viewers about your channel..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Instagram</label>
                      <input
                        type="text"
                        placeholder="https://instagram.com/user"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Twitter / X</label>
                      <input
                        type="text"
                        placeholder="https://x.com/user"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRIVACY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#222222] flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Privacy Settings</h2>
                </div>

                <div className="space-y-4 divide-y divide-slate-100 dark:divide-[#222222]">
                  <div className="flex items-center justify-between pt-3 first:pt-0">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">Show My Subscriptions</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Allow other users to see channels you subscribe to</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-[#00A3FF] rounded-md cursor-pointer" />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">Allow Comments on My Videos</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Viewers can comment on your uploaded videos</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-[#00A3FF] rounded-md cursor-pointer" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MONETIZATION */}
            {activeTab === 'monetization' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#222222] flex-wrap">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <DollarSign className="w-6 h-6 text-emerald-500" />
                      <span>Channel Monetization Program</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                      Earn revenue from Paid Videos and viewer support directly into your wallet.
                    </p>
                  </div>

                  {currentUserProfile?.isMonetized ? (
                    <span className="px-4 py-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Monetization Done & Enabled</span>
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Not Monetized</span>
                    </span>
                  )}
                </div>

                {/* PROMINENT MONETIZATION ACTIVE BANNER */}
                {currentUserProfile?.isMonetized ? (
                  <div className="p-6 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-blue-500/15 border-2 border-emerald-500/30 rounded-3xl space-y-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                          🎉 Monetization Done & Enabled!
                        </h3>
                        <p className="text-xs text-emerald-700/90 dark:text-emerald-400/90 font-semibold">
                          Your channel is officially monetized by SocialIndia Admin. Criteria requirement is complete / approved.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      You can now publish <strong>Paid Videos</strong> with custom access prices, earn 100% of viewer unlock payments directly into your wallet balance, and track performance in the Creator Studio Earn Hub.
                    </p>
                    <div className="pt-2 flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => navigate('studio')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                      >
                        <DollarSign className="w-4 h-4 stroke-[3]" />
                        <span>Go to Creator Studio Earn Hub</span>
                      </button>
                      <button
                        onClick={() => navigate('upload')}
                        className="px-5 py-2.5 bg-white dark:bg-[#1A1A1A] border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-black text-xs rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Paid Video</span>
                      </button>
                    </div>
                  </div>
                ) : monetizationMsg ? (
                  <div className={`p-4 rounded-2xl text-xs font-bold ${
                    monetizationMsg.startsWith('🎉') 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900' 
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  }`}>
                    {monetizationMsg}
                  </div>
                ) : null}

                {/* Requirement Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* 1. Subscriber Requirement (500 required) */}
                  <div className="p-5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Requirement 1</span>
                      {currentUserProfile?.isMonetized || (currentUserProfile?.followersCount || 0) >= 500 ? (
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> {currentUserProfile?.isMonetized ? 'Approved (Done)' : 'Unlocked'}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">In Progress</span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                        {currentUserProfile?.followersCount || 0} <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">/ 500 Subscribers</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                        {currentUserProfile?.isMonetized ? 'Criteria completed or granted by admin.' : 'Minimum 500 channel subscribers required.'}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-[#2B2B2B] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: currentUserProfile?.isMonetized ? '100%' : `${Math.min(100, (((currentUserProfile?.followersCount || 0) / 500) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* 2. Total Views Requirement (1000 required) */}
                  <div className="p-5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Requirement 2</span>
                      {currentUserProfile?.isMonetized || userTotalViews >= 1000 ? (
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> {currentUserProfile?.isMonetized ? 'Approved (Done)' : 'Unlocked'}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">In Progress</span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                        {userTotalViews} <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">/ 1,000 Views</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                        {currentUserProfile?.isMonetized ? 'Criteria completed or granted by admin.' : 'Minimum 1,000 total video views required.'}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-[#2B2B2B] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: currentUserProfile?.isMonetized ? '100%' : `${Math.min(100, ((userTotalViews / 1000) * 100))}%` }}
                      />
                    </div>
                  </div>

                </div>

                <div className="pt-2 flex items-center justify-between flex-wrap gap-4">
                  {currentUserProfile?.isMonetized ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center justify-between gap-4 w-full flex-wrap">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                            Channel Monetization Status: Active & Operational
                          </p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            You can publish paid videos and manage your earnings directly from Creator Studio.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('studio')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Open Studio Earn Hub
                      </button>
                    </div>
                  ) : (currentUserProfile?.followersCount || 0) >= 500 && userTotalViews >= 1000 ? (
                    <button
                      onClick={handleRequestMonetization}
                      disabled={isRequestingMonetization}
                      className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-white font-black text-xs rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isRequestingMonetization ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>Enable Monetization Now</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-700 dark:text-amber-400 text-xs font-bold w-full">
                      <Lock className="w-5 h-5 shrink-0" />
                      <span>Reach 500 subscribers & 1,000 video views to unlock channel monetization (or request approval from admin).</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: PASSWORD */}
            {activeTab === 'password' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#222222] flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Change Password</h2>
                </div>

                {passwordStatusMsg && (
                  <div className={`p-3.5 rounded-2xl text-xs font-bold ${
                    passwordStatusMsg.startsWith('✅')
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  }`}>
                    {passwordStatusMsg}
                  </div>
                )}

                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">Current Password</label>
                    <input
                      type="password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#00A3FF] hover:bg-[#0082CC] text-white font-black text-xs rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Update Password</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 6: BALANCE / WALLET (Real Balance & Bonus Data) */}
            {activeTab === 'balance' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-[#00A3FF]" />
                    <span>Wallet & Balances</span>
                  </h2>
                  <span className="text-xs font-bold text-slate-500">
                    Total Funds: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-black">₹{(walletBalance + mainBalance + bonusBalance).toFixed(2)}</strong>
                  </span>
                </div>

                {walletMsg && (
                  <div className={`p-3.5 rounded-2xl text-xs font-bold ${
                    walletMsg.startsWith('✅')
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  }`}>
                    {walletMsg}
                  </div>
                )}

                {/* 3-Card Wallet Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Card 1: WALLET (Shopping & In-App Purchases) */}
                  <div className="p-6 bg-linear-to-br from-blue-600 to-indigo-700 rounded-3xl text-white flex flex-col justify-between space-y-4 shadow-lg shadow-blue-500/15">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-blue-200">Wallet</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/40 text-blue-100">
                          Shopping Money
                        </span>
                      </div>
                      <h2 className="text-3xl font-black mt-2 font-mono">₹{walletBalance.toFixed(2)}</h2>
                      <p className="text-[11px] text-blue-100/90 mt-1 font-medium">
                        Used to buy paid videos, shorts, promote ads & unlock features.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => {
                          setTransferToBalanceAmount(Math.min(walletBalance, 100));
                          setTransferToBalanceModalOpen(true);
                        }}
                        disabled={walletBalance <= 0}
                        className="w-full py-2.5 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-50 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Replenish to Balance (For Withdraw)</span>
                      </button>
                      <button
                        onClick={() => setReplenishModalOpen(true)}
                        className="w-full py-2.5 bg-blue-500/30 hover:bg-blue-500/50 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>+ Top Up Wallet</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: BALANCE (Withdrawable Earnings & Funds) */}
                  <div className="p-6 bg-slate-50 dark:bg-[#1A1A1A] border-2 border-emerald-500/30 rounded-3xl flex flex-col justify-between space-y-4 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Balance</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          Withdrawable
                        </span>
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">₹{mainBalance.toFixed(2)}</h2>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Creator video earnings & funds ready for bank / UPI withdrawal.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => {
                          setWithdrawMsg('');
                          setWithdrawAmount(mainBalance > 0 ? mainBalance : 100);
                          setWithdrawModalOpen(true);
                        }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>WITHDRAW (UPI Payout)</span>
                      </button>
                      <p className="text-[10px] text-slate-400 font-medium text-center">
                        Instant payout request to Paytm / GPay / PhonePe UPI
                      </p>
                    </div>
                  </div>

                  {/* Card 3: BONUS MONEY (ADMIN REWARD) */}
                  <div className="p-6 bg-slate-50 dark:bg-[#1A1A1A] border-2 border-amber-500/30 rounded-3xl flex flex-col justify-between space-y-4 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" />
                          <span>Bonus Money</span>
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">Admin Reward</span>
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">₹{bonusBalance.toFixed(2)}</h2>
                      <p className="text-[11px] text-slate-500 mt-1">Special platform funds added by Admin for promotions</p>
                      
                      {/* Monetization status note for Admin Rewards */}
                      <div className="mt-3 p-2.5 rounded-xl text-[10px] font-bold border leading-snug bg-slate-100 dark:bg-[#141414] border-slate-200 dark:border-[#2b2b2b]">
                        {currentUserProfile?.isMonetized ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Monetized Channel: Eligible for platform rewards & bonus payouts.</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Non-Monetized: Admin Rewards are reserved for monetized creators.</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        disabled={bonusBalance <= 0 || isConvertingBonus}
                        onClick={handleConvertBonusToWallet}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        {isConvertingBonus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                        <span>Transfer Bonus to Wallet</span>
                      </button>
                      <p className="text-[10px] text-slate-400 font-medium text-center">
                        Usable to watch paid videos or transfer to wallet
                      </p>
                    </div>
                  </div>

                </div>

                {/* Instant Points to Wallet Conversion Banner in Balance Tab */}
                <div className="p-5 bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 border border-blue-500/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Convert Your Points to Wallet Balance</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold">
                          {points} pts available
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Convert points into real wallet balance (100 Points = ₹1.00 Balance).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={convertPointsInput}
                      onChange={(e) => setConvertPointsInput(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-mono font-black text-slate-900 dark:text-white text-center focus:outline-none focus:border-[#00A3FF]"
                    />
                    <button
                      onClick={handleConvertPoints}
                      disabled={isConverting || points < convertPointsInput || convertPointsInput <= 0}
                      className="px-4 py-2 bg-[#00A3FF] hover:bg-[#0082CC] disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {isConverting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Convert to ₹{(convertPointsInput * 0.01).toFixed(2)}</span>
                    </button>
                  </div>
                </div>

                {/* Recent Withdrawal Requests History Card */}
                <div className="p-6 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Recent Withdrawal Requests</span>
                        <span className="text-xs font-bold text-slate-400">({myWithdrawals.length})</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">Track payouts sent to your Paytm / UPI ID</p>
                    </div>
                    <button
                      onClick={() => {
                        if (currentUser) {
                          payoutService.getWithdrawalRequests(currentUser.uid).then(setMyWithdrawals);
                        }
                      }}
                      className="text-xs font-bold text-[#00A3FF] hover:underline cursor-pointer"
                    >
                      Refresh
                    </button>
                  </div>

                  {myWithdrawals.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 dark:border-[#333] rounded-2xl">
                      No withdrawal requests yet. Click &quot;WITHDRAW&quot; above to request a payout.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-[#2B2B2B] text-slate-400 text-[10px] uppercase font-black tracking-wider">
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Amount</th>
                            <th className="pb-3">UPI ID</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#2B2B2B]">
                          {myWithdrawals.map((req) => (
                            <tr key={req.id} className="hover:bg-white/50 dark:hover:bg-[#151515]">
                              <td className="py-3 font-medium text-slate-500">
                                {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                                ₹{req.amount.toFixed(2)}
                              </td>
                              <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                                {req.upiId}
                              </td>
                              <td className="py-3">
                                {req.status === 'completed' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    ✓ Paid
                                  </span>
                                )}
                                {req.status === 'pending' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                    ⏳ Pending Admin Payout
                                  </span>
                                )}
                                {req.status === 'rejected' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                                    ✕ Rejected & Refunded
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-right text-[11px] text-slate-500 font-medium">
                                {req.adminNotes || (req.status === 'pending' ? 'Processing by admin' : 'Completed')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 7: AVATAR & COVER */}
            {activeTab === 'avatar_cover' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="pb-4 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Avatar & Cover</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload profile photo and channel cover banner</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profile Picture */}
                  <div className="p-6 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl space-y-4 text-center">
                    <div className="w-24 h-24 rounded-full bg-[#00A3FF] text-white flex items-center justify-center font-black text-3xl mx-auto overflow-hidden border-2 border-slate-300 dark:border-slate-700">
                      {photoURL ? <img src={photoURL} alt="" className="w-full h-full object-cover" /> : getInitials(displayName || 'U')}
                    </div>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-6 py-2.5 bg-[#00A3FF] hover:bg-[#0082CC] text-white font-black text-xs rounded-full shadow-md cursor-pointer"
                    >
                      Upload Avatar
                    </button>
                  </div>

                  {/* Banner */}
                  <div className="p-6 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl space-y-4 text-center">
                    <div className="w-full h-24 rounded-2xl bg-slate-200 dark:bg-[#222222] overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                      {bannerURL ? <img src={bannerURL} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-400" />}
                    </div>
                    <button
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-6 py-2.5 bg-[#00A3FF] hover:bg-[#0082CC] text-white font-black text-xs rounded-full shadow-md cursor-pointer"
                    >
                      Upload Cover Banner
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: VERIFICATION */}
            {activeTab === 'verification' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="pb-4 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-[#00A3FF]" />
                    <span>Verification</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Apply for official verified creator badge</p>
                </div>

                {verificationMsg && (
                  <div className={`p-4 rounded-2xl text-xs font-bold ${
                    verificationMsg.startsWith('✅')
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  }`}>
                    {verificationMsg}
                  </div>
                )}

                {currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin' ? (
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                    <span>🎉 Status: Channel is Officially Verified with a blue checkmark ✓ badge!</span>
                  </div>
                ) : verificationSubmitted ? (
                  <div className="p-5 bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-2xl text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-[#00A3FF]" />
                    <span>✅ Status: Verification Request Submitted and Pending Review!</span>
                  </div>
                ) : (
                  <form onSubmit={handleVerificationSubmit} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-white mb-2">Category</label>
                      <select
                        value={verificationCategory}
                        onChange={(e) => setVerificationCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="Technology">Technology</option>
                        <option value="Gaming">Gaming</option>
                        <option value="Music">Music</option>
                        <option value="Vlog">Vlog</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-white mb-2">Pitch / Details / Social Links</label>
                      <textarea
                        rows={4}
                        value={verificationPitch}
                        onChange={(e) => setVerificationPitch(e.target.value)}
                        placeholder="Why should your channel be verified? Add links..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-8 py-3 bg-[#00A3FF] text-white font-black text-xs rounded-full shadow-md cursor-pointer"
                    >
                      Submit Verification Request
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 9: POINTS (Matching Image 3 Layout) */}
            {activeTab === 'points' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="pb-3 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Points</h2>
                </div>

                {pointsConvertMsg && (
                  <div className={`p-3.5 rounded-2xl text-xs font-bold ${
                    pointsConvertMsg.startsWith('✅')
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  }`}>
                    {pointsConvertMsg}
                  </div>
                )}

                {/* Grid Layout matching Image 3 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left side: Earning Rules List */}
                  <div className="lg:col-span-8 space-y-4">
                    {[
                      { points: 10, label: 'Earn 10 points by commenting any video', icon: MessageSquare, bg: 'bg-[#00A3FF]', text: 'text-white' },
                      { points: 20, label: 'Earn 20 points by upload any video', icon: Upload, bg: 'bg-amber-500', text: 'text-white' },
                      { points: 5, label: 'Earn 5 points by like any video', icon: ThumbsUp, bg: 'bg-yellow-400', text: 'text-black' },
                      { points: 2, label: 'Earn 2 points by watching any video', icon: Eye, bg: 'bg-purple-500', text: 'text-white' },
                      { points: 2, label: 'Earn 2 points by dislike any video', icon: ThumbsDown, bg: 'bg-rose-500', text: 'text-white' }
                    ].map((rule, idx) => {
                      const Icon = rule.icon;
                      return (
                        <div key={idx} className="flex items-center gap-4 p-2.5">
                          <div className={`w-12 h-12 rounded-2xl ${rule.bg} ${rule.text} flex items-center justify-center shrink-0 shadow-sm`}>
                            <Icon className="w-6 h-6 stroke-[2.5]" />
                          </div>
                          <span className="text-sm font-bold text-slate-800 dark:text-white">{rule.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right side: Points Balance Card & Convert Section */}
                  <div className="lg:col-span-4 space-y-5">
                    <div className="p-6 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl space-y-3 shadow-xs">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Points</h3>
                      <h1 className="text-5xl font-black text-slate-900 dark:text-white">{points}</h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Points Balance</p>
                    </div>

                    {/* Convert Points to Wallet Balance Card */}
                    <div className="p-6 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl space-y-4 shadow-xs">
                      <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-1.5">
                        <ArrowRightLeft className="w-4 h-4 text-[#00A3FF]" />
                        <span>Convert Points to Balance</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        Convert points into Wallet Balance. Rate: 100 Points = ₹1.00 Balance (₹0.01 / point).
                      </p>

                      {pointsConvertMsg && (
                        <div className={`p-3 rounded-xl text-xs font-bold ${
                          pointsConvertMsg.startsWith('✅')
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                        }`}>
                          {pointsConvertMsg}
                        </div>
                      )}

                      <div>
                        <input
                          type="number"
                          min={10}
                          step={10}
                          value={convertPointsInput}
                          onChange={(e) => setConvertPointsInput(Number(e.target.value))}
                          className="w-full px-4 py-2.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                        />
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 font-bold">
                          Converted Wallet Value: ₹{(convertPointsInput * 0.01).toFixed(2)}
                        </p>
                      </div>

                      <button
                        onClick={handleConvertPoints}
                        disabled={isConverting || points < convertPointsInput || convertPointsInput <= 0}
                        className="w-full py-3 bg-[#00A3FF] hover:bg-[#0082CC] disabled:opacity-40 text-white font-black text-xs rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>Convert Points to Wallet</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 10: TWO FACTOR AUTH */}
            {activeTab === 'two_factor' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="pb-4 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Two-factor Authentication</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add an extra layer of security to your PlayTube account</p>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">Enable 2FA Authentication</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Status: {twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <button
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                      twoFactorEnabled ? 'bg-[#00A3FF]' : 'bg-slate-300 dark:bg-[#2B2B2B]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 11: BLOCKED USERS */}
            {activeTab === 'blocked_users' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="pb-4 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Blocked Users</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage users you have blocked</p>
                </div>

                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs font-bold">
                  No blocked users found.
                </div>
              </div>
            )}

            {/* TAB 12: MANAGE SESSIONS */}
            {activeTab === 'sessions' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="pb-4 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Manage Sessions</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Devices currently logged into your account</p>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-[#00A3FF]" />
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">Current Browser Session</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Linux / Web Browser • Active Now</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">Active</span>
                </div>
              </div>
            )}

            {/* TAB 13: MY INFORMATION */}
            {activeTab === 'my_info' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="pb-4 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">My Information</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Export account data snapshot</p>
                </div>

                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUserProfile, null, 2));
                    const dl = document.createElement('a');
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", `${currentUserProfile?.username || 'user'}_data.json`);
                    dl.click();
                  }}
                  className="px-6 py-3 bg-[#00A3FF] text-white font-black text-xs rounded-full shadow-md"
                >
                  Download Account Backup JSON
                </button>
              </div>
            )}

            {/* TAB: MY PURCHASES */}
            {activeTab === 'purchases' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="pb-4 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">My Purchases</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage rented movies, premium memberships, and wallet transaction history</p>
                </div>

                {/* 1. GoPro Premium Passes */}
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-indigo-950 dark:text-indigo-400 tracking-wider">Premium Passes Status</h3>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                      {currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin' ? '✓ Premium Pass Active' : 'No Active Premium Pass'}
                    </span>
                  </div>
                  
                  {currentUserProfile?.role === 'creator' || currentUserProfile?.role === 'admin' ? (
                    <p className="text-xs text-indigo-900 dark:text-slate-300 font-semibold leading-relaxed">
                      You are upgraded to the **GoPro Premium Creator tier**. Enjoy active privileges: 2x points earning speed multiplier, priority video uploading feeds, and verified subscriber channels!
                    </p>
                  ) : (
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        You have not upgraded to GoPro Premium yet. Activate now for $10.00 to unlock verified creator benefits and instant earnings.
                      </p>
                      <button onClick={() => navigate('gopro')} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer">
                        Upgrade GoPro
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Rented Movies & Tickets */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Rented Movies & Digital Tickets</h3>
                  
                  <div className="p-4 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200/50 dark:border-[#2B2B2B] rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 bg-slate-200 dark:bg-[#333] rounded-lg shrink-0 overflow-hidden flex items-center justify-center font-bold text-[10px] text-slate-400">
                        🎬 Poster
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">The Great Indian Escape</p>
                        <p className="text-[10px] text-slate-500">Rent Price: $2.99 • Rent ID: #SI-RENT-9201</p>
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mt-0.5">Expires in 42 hours (Watch Now)</p>
                      </div>
                    </div>
                    <button onClick={() => addToast('Streaming movie playbacks...', 'success')} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-lg cursor-pointer">
                      Play Now
                    </button>
                  </div>
                </div>

                {/* 3. Transaction History Log */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Direct Transaction Log</h3>
                  <div className="overflow-hidden border border-slate-200 dark:border-[#2B2B2B] rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#161616] text-[9px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-[#2B2B2B]">
                          <th className="p-4">Item & description</th>
                          <th className="p-4">Paid using</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4 text-right">Receipt status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#2B2B2B]">
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-[#1C1C1C]/40">
                          <td className="p-4">
                            <p className="font-bold text-slate-900 dark:text-white">The Great Indian Escape (Rent)</p>
                            <p className="text-[9px] text-slate-400">Movie rental token</p>
                          </td>
                          <td className="p-4 font-semibold text-slate-500">SI Wallet</td>
                          <td className="p-4 font-mono font-bold text-rose-500">-$2.99</td>
                          <td className="p-4 text-right"><span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase">Success</span></td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-[#1C1C1C]/40">
                          <td className="p-4">
                            <p className="font-bold text-slate-900 dark:text-white">Wallet replenishment top-up</p>
                            <p className="text-[9px] text-slate-400">Card deposit</p>
                          </td>
                          <td className="p-4 font-semibold text-slate-500">Credit Card</td>
                          <td className="p-4 font-mono font-bold text-emerald-600">+$25.00</td>
                          <td className="p-4 text-right"><span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase">Success</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 14: DELETE ACCOUNT */}
            {activeTab === 'delete_account' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="pb-4 border-b border-slate-200 dark:border-[#222222]">
                  <h2 className="text-xl font-black text-rose-600 dark:text-rose-500">Delete Account</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Permanently remove your channel and data</p>
                </div>

                <div className="p-5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-bold">
                  ⚠️ Warning: Deleting your account will permanently remove all your uploaded videos, comments, and points. This action cannot be undone.
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Top Up Shopping Wallet Modal */}
        {replenishModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#00A3FF]" />
                  <span>Top Up Wallet</span>
                </h3>
                <button 
                  onClick={() => setReplenishModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Add money to your platform shopping wallet for buying paid videos, shorts, ads & upgrades:
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">Amount (₹ INR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={10}
                    step={10}
                    value={replenishAmount}
                    onChange={(e) => setReplenishAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 200, 500].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setReplenishAmount(amt)}
                    className={`py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                      replenishAmount === amt 
                        ? 'bg-[#00A3FF] text-white border-[#00A3FF]' 
                        : 'bg-slate-50 dark:bg-[#1A1A1A] border-slate-200 dark:border-[#333] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReplenishModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReplenishWallet}
                  className="px-6 py-2.5 bg-[#00A3FF] hover:bg-[#0082CC] text-white text-xs font-black rounded-full shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Confirm Top Up (₹{replenishAmount})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Wallet to Withdrawable Balance Modal */}
        {transferToBalanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  <span>Replenish to Balance</span>
                </h3>
                <button 
                  onClick={() => setTransferToBalanceModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Move money from your <strong>Shopping Wallet</strong> to <strong>Withdrawable Balance</strong> so you can withdraw to UPI/Paytm:
              </p>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-xs font-bold flex justify-between text-blue-900 dark:text-blue-200">
                <span>Available in Wallet:</span>
                <span className="font-mono font-black">₹{walletBalance.toFixed(2)}</span>
              </div>

              <form onSubmit={handleTransferWalletToBalance} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">Amount to Move to Balance (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min={1}
                      max={walletBalance}
                      step={1}
                      value={transferToBalanceAmount}
                      onChange={(e) => setTransferToBalanceAmount(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {[25, 50, 100, walletBalance].filter(a => a > 0 && a <= walletBalance).map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTransferToBalanceAmount(amt)}
                      className="flex-1 py-1 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-[#333] hover:bg-slate-100 dark:hover:bg-[#202020] text-slate-600 dark:text-slate-300"
                    >
                      {amt === walletBalance ? 'All' : `₹${amt}`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTransferToBalanceModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTransferringToBalance || transferToBalanceAmount <= 0 || transferToBalanceAmount > walletBalance}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black rounded-full shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    {isTransferringToBalance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>Move to Balance</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* WITHDRAW MODAL (UPI ID & Payout Request) */}
        {withdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Withdraw Balance</h3>
                    <p className="text-[11px] text-slate-500">Instant UPI payout request to Admin</p>
                  </div>
                </div>
                <button 
                  onClick={() => setWithdrawModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Available Withdrawable Balance Card */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 dark:text-emerald-400">Available to Withdraw</span>
                  <p className="text-2xl font-black font-mono text-emerald-800 dark:text-emerald-200 mt-0.5">₹{mainBalance.toFixed(2)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(mainBalance)}
                  className="px-3 py-1 bg-emerald-600 text-white text-[11px] font-black rounded-lg hover:bg-emerald-700 cursor-pointer"
                >
                  Withdraw All
                </button>
              </div>

              {withdrawMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  withdrawMsg.startsWith('✅')
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                }`}>
                  {withdrawMsg}
                </div>
              )}

              <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Withdrawal Amount (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min={1}
                      max={mainBalance}
                      step="any"
                      required
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    UPI ID (Paytm / GPay / PhonePe / BHIM) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210@paytm or yourname@okhdfcbank"
                    value={withdrawUpiId}
                    onChange={(e) => setWithdrawUpiId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Admin will send money directly to this UPI address.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Account Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Name on UPI"
                      value={withdrawAccountName}
                      onChange={(e) => setWithdrawAccountName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="Linked mobile"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setWithdrawModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWithdraw || withdrawAmount <= 0 || withdrawAmount > mainBalance || !withdrawUpiId.trim()}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black rounded-full shadow-lg shadow-emerald-600/20 cursor-pointer transition-all flex items-center gap-2"
                  >
                    {isSubmittingWithdraw ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                    <span>Request Payout (₹{withdrawAmount})</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
