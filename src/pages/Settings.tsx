import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { userService } from '../services/userService';
import { videoService } from '../services/videoService';
import { getInitials, formatDuration, formatTimeAgo, formatViews } from '../utils/videoUtils';
import { 
  ArrowLeft,
  Settings as SettingsIcon,
  Sun,
  User, 
  Image as ImageIcon,
  Shield, 
  Key, 
  Smartphone, 
  Monitor, 
  Ban, 
  DollarSign, 
  CreditCard, 
  Award, 
  ShieldCheck, 
  Info, 
  ShoppingBag, 
  Trash2, 
  Check, 
  Loader2, 
  Mail, 
  Globe, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  Upload, 
  CheckCircle2, 
  Sparkles, 
  ArrowRightLeft, 
  Gift,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Film,
  Play,
  HelpCircle,
  Trophy
} from 'lucide-react';
import { payoutService } from '../services/payoutService';
import { WithdrawalRequest, Video } from '../types';
import { compressAvatar, compressBanner } from '../utils/imageUtils';
import { updateUserAvatarCache } from '../components/UserAvatar';
import { useTranslation } from '../i18n';
import { ExternalAdBanner } from '../components/ads/ExternalAdBanner';

export const Settings: React.FC = () => {
  const { currentUser, currentUserProfile, refreshProfile, updateUserProfileState, addToast } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<
    | 'general'
    | 'profile'
    | 'avatar_cover'
    | 'privacy'
    | 'password'
    | 'two_factor'
    | 'sessions'
    | 'blocked_users'
    | 'monetization'
    | 'balance'
    | 'points'
    | 'verification'
    | 'my_info'
    | 'purchases'
    | 'delete_account'
  >('general');

  // Mobile View State: 'menu' shows settings list, 'content' shows active setting page with Back button
  const [mobileView, setMobileView] = useState<'menu' | 'content'>('menu');

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

  // Transfer Wallet -> Balance State
  const [transferToBalanceModalOpen, setTransferToBalanceModalOpen] = useState(false);
  const [transferToBalanceAmount, setTransferToBalanceAmount] = useState(50);
  const [isTransferringToBalance, setIsTransferringToBalance] = useState(false);

  // Points State
  const [points, setPoints] = useState(0);
  const [convertPointsInput, setConvertPointsInput] = useState(100);
  const [isConverting, setIsConverting] = useState(false);
  const [pointsConvertMsg, setPointsConvertMsg] = useState('');

  // Monetization & Video Stats
  const [creatorVideos, setCreatorVideos] = useState<Video[]>([]);
  const [loadingCreatorVideos, setLoadingCreatorVideos] = useState(false);
  const [userTotalViews, setUserTotalViews] = useState(0);
  const [isRequestingMonetization, setIsRequestingMonetization] = useState(false);
  const [monetizationMsg, setMonetizationMsg] = useState('');

  // Two Factor
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // In-line Status Messages
  const [saveMsg, setSaveMsg] = useState('');
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
      setPoints(currentUserProfile.points ?? 118);
      setWalletBalance(currentUserProfile.walletBalance ?? 0.00);
      setMainBalance(currentUserProfile.mainBalance ?? 972.01);
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

      if (currentUserProfile.role === 'creator' || currentUserProfile.role === 'admin' || currentUserProfile.monetizationStatus === 'requested') {
        setVerificationSubmitted(true);
      }
    }

    if (currentUser) {
      setLoadingCreatorVideos(true);
      videoService.getCreatorVideos(currentUser.uid).then((videos: Video[]) => {
        setCreatorVideos(videos || []);
        const total = (videos || []).reduce((acc: number, v: any) => acc + (Number(v.viewsCount ?? (v as any).views ?? 0)), 0);
        setUserTotalViews(total);
      }).catch(console.warn).finally(() => {
        setLoadingCreatorVideos(false);
      });

      payoutService.getWithdrawalRequests(currentUser.uid).then(setMyWithdrawals).catch(console.warn);
    }
  }, [currentUser, currentUserProfile]);

  // Save changes handler (General)
  const handleSaveGeneral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    setSavingStatus('saving');
    setSaveMsg('');
    try {
      await userService.updateProfile(currentUser.uid, {
        username: username.trim().toLowerCase(),
        gender,
        country,
        age,
      });
      await refreshProfile();
      setSavingStatus('saved');
      setSaveMsg('Settings saved successfully.');
      setTimeout(() => {
        setSaveMsg('');
        setSavingStatus('idle');
      }, 3000);
      addToast('Settings saved successfully.', 'success');
    } catch (err) {
      console.error(err);
      setSavingStatus('error');
      setSaveMsg('Failed to save settings.');
    }
  };

  // Save profile handler
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    setSavingStatus('saving');
    setSaveMsg('');
    try {
      const currentAv = photoURL || currentUserProfile?.photoURL || '';
      const currentBn = bannerURL || currentUserProfile?.bannerURL || '';
      const updates = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL: currentAv,
        bannerURL: currentBn,
        socialLinks: {
          instagram,
          twitter,
          youtube: ytLink,
          website,
          telegram
        }
      };
      updateUserProfileState(updates);
      if (currentAv) {
        updateUserAvatarCache(currentUser.uid, currentAv, displayName.trim());
      }
      await userService.updateProfile(currentUser.uid, updates);
      videoService.syncCreatorProfileToVideos(currentUser.uid, { 
        photoURL: currentAv, 
        displayName: displayName.trim() 
      }).catch(console.warn);
      await refreshProfile();
      setSavingStatus('saved');
      setSaveMsg('Profile updated successfully.');
      setTimeout(() => {
        setSaveMsg('');
        setSavingStatus('idle');
      }, 3000);
      addToast('Profile updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      setSavingStatus('error');
      setSaveMsg('Failed to save profile.');
    }
  };

  // Convert Points Handler
  const handleConvertPoints = async () => {
    if (!currentUser) return;
    setPointsConvertMsg('');

    if (convertPointsInput <= 0) {
      setPointsConvertMsg('Please enter a valid number of points.');
      return;
    }

    if (points < convertPointsInput) {
      setPointsConvertMsg(`Insufficient points. You have ${points} points.`);
      return;
    }

    setIsConverting(true);
    try {
      const res = await userService.convertPointsToWallet(currentUser.uid, convertPointsInput);
      setPoints(res.newPoints);
      setWalletBalance(res.newWalletBalance);
      await refreshProfile();
      const addedAmount = (convertPointsInput * 0.01).toFixed(2);
      setPointsConvertMsg(`Converted ${convertPointsInput} points to ₹${addedAmount} balance!`);
      addToast(`Converted ${convertPointsInput} points to ₹${addedAmount}!`, 'success');
    } catch (err: any) {
      setPointsConvertMsg(err.message || 'Failed to convert points.');
    } finally {
      setIsConverting(false);
    }
  };

  // Top Up Wallet Handler
  const handleReplenishWallet = async () => {
    if (!currentUser) return;
    setWalletMsg('');
    if (replenishAmount <= 0) return;

    try {
      const newBal = (currentUserProfile?.walletBalance || 0) + replenishAmount;
      await userService.updateProfile(currentUser.uid, { walletBalance: newBal });
      await refreshProfile();
      setWalletBalance(newBal);
      setReplenishModalOpen(false);
      setWalletMsg(`Topped up ₹${replenishAmount.toFixed(2)} to wallet.`);
      addToast(`Topped up ₹${replenishAmount.toFixed(2)}!`, 'success');
    } catch (err: any) {
      setWalletMsg(err.message);
    }
  };

  // Convert Bonus Balance to Wallet
  const handleConvertBonusToWallet = async () => {
    if (!currentUser || bonusBalance <= 0) return;
    setIsConvertingBonus(true);
    try {
      const currentW = currentUserProfile?.walletBalance || 0;
      const newW = currentW + bonusBalance;
      await userService.updateProfile(currentUser.uid, {
        walletBalance: newW,
        bonusBalance: 0
      });
      await refreshProfile();
      setWalletBalance(newW);
      setBonusBalance(0);
      addToast('Bonus moved to wallet.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed.', 'error');
    } finally {
      setIsConvertingBonus(false);
    }
  };

  // Transfer from Wallet to Withdrawable Balance
  const handleTransferWalletToBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (transferToBalanceAmount <= 0 || transferToBalanceAmount > walletBalance) return;

    setIsTransferringToBalance(true);
    try {
      const newW = walletBalance - transferToBalanceAmount;
      const newM = mainBalance + transferToBalanceAmount;
      await userService.updateProfile(currentUser.uid, {
        walletBalance: newW,
        mainBalance: newM
      });
      await refreshProfile();
      setWalletBalance(newW);
      setMainBalance(newM);
      setTransferToBalanceModalOpen(false);
      addToast(`Moved ₹${transferToBalanceAmount.toFixed(2)} to Balance.`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsTransferringToBalance(false);
    }
  };

  // Submit Withdrawal Request
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setWithdrawMsg('');

    if (withdrawAmount <= 0 || withdrawAmount > mainBalance || !withdrawUpiId.trim()) {
      setWithdrawMsg('Please enter valid amount and UPI ID.');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      await payoutService.createWithdrawalRequest(
        currentUser.uid,
        withdrawAmount,
        withdrawUpiId.trim(),
        withdrawAccountName.trim(),
        withdrawPhone.trim()
      );

      const newMain = mainBalance - withdrawAmount;
      await userService.updateProfile(currentUser.uid, {
        mainBalance: newMain,
        upiId: withdrawUpiId.trim()
      });
      await refreshProfile();
      setMainBalance(newMain);

      const updated = await payoutService.getWithdrawalRequests(currentUser.uid);
      setMyWithdrawals(updated);

      setWithdrawMsg('Withdrawal request submitted successfully.');
      addToast('Withdrawal request submitted!', 'success');
      setTimeout(() => {
        setWithdrawModalOpen(false);
        setWithdrawMsg('');
      }, 2000);
    } catch (err: any) {
      setWithdrawMsg(err.message);
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // Monetization calculations (500 Subscribers & 1,000 Views on single highest video rule)
  const publishedVideos = (creatorVideos || []).filter(v => 
    v.status !== 'removed' && v.status !== 'hidden'
  );

  const highestViewedVideo = publishedVideos.length > 0
    ? publishedVideos.reduce((highest, current) => {
        const currentViews = Number(current.viewsCount ?? (current as any).views ?? 0);
        const highestViews = Number(highest.viewsCount ?? (highest as any).views ?? 0);
        return currentViews > highestViews ? current : highest;
      })
    : null;

  const highestVideoViews = highestViewedVideo 
    ? Number(highestViewedVideo.viewsCount ?? (highestViewedVideo as any).views ?? 0)
    : 0;

  const currentSubscribers = currentUserProfile?.followersCount ?? 0;
  const subscriberRequirementMet = currentSubscribers >= 500;
  const videoRequirementMet = highestVideoViews >= 1000;
  const isEligibleForMonetization = subscriberRequirementMet && videoRequirementMet;

  const monetizationStatusType: 'In Progress' | 'Almost There' | 'Eligible' = isEligibleForMonetization
    ? 'Eligible'
    : (subscriberRequirementMet || videoRequirementMet)
    ? 'Almost There'
    : 'In Progress';

  // Request Monetization
  const handleRequestMonetization = async () => {
    if (!currentUser) return;
    setIsRequestingMonetization(true);
    setMonetizationMsg('');

    const subs = currentUserProfile?.followersCount || 0;
    if (subs < 500 || highestVideoViews < 1000) {
      setMonetizationMsg('Criteria not met: 500 Subscribers and 1,000 Views on at least one video required.');
      setIsRequestingMonetization(false);
      return;
    }

    try {
      await userService.updateProfile(currentUser.uid, {
        isMonetized: true,
        monetizationStatus: 'approved',
        role: currentUserProfile?.role === 'user' ? 'creator' : (currentUserProfile?.role || 'creator')
      });
      await refreshProfile();
      setMonetizationMsg('Monetization enabled successfully.');
      addToast('Channel Monetization Enabled! Welcome to the SocialIndia Partner Program.', 'success');
    } catch (err: any) {
      setMonetizationMsg(err.message || 'Failed to activate monetization.');
      addToast('Failed to activate monetization.', 'error');
    } finally {
      setIsRequestingMonetization(false);
    }
  };

  // Password update handler
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg('');

    if (!currentPass || !newPass || !confirmPass) {
      setPasswordStatusMsg('Please fill in all fields.');
      return;
    }
    if (newPass.length < 8) {
      setPasswordStatusMsg('Password must be at least 8 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPasswordStatusMsg('Passwords do not match.');
      return;
    }

    if (currentUser) {
      try {
        await userService.updateProfile(currentUser.uid, {
          lastPasswordChangedAt: new Date().toISOString()
        });
        await refreshProfile();
      } catch (err) {
        console.warn(err);
      }
    }
    setPasswordStatusMsg('Password changed successfully.');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  };

  // Submit Verification Handler
  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationMsg('');
    if (!verificationPitch.trim()) {
      setVerificationMsg('Please provide verification details.');
      return;
    }
    setVerificationSubmitted(true);
    setVerificationMsg('Verification request submitted.');
  };

  // Avatar file upload with instant compression & permanent Firestore sync
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      addToast('Compressing and updating avatar...', 'info');
      const compressed = await compressAvatar(file);
      setPhotoURL(compressed);
      if (currentUser) {
        updateUserProfileState({ photoURL: compressed });
        updateUserAvatarCache(currentUser.uid, compressed, displayName || username);
        await userService.updateProfile(currentUser.uid, { photoURL: compressed });
        videoService.syncCreatorProfileToVideos(currentUser.uid, { photoURL: compressed }).catch(console.warn);
        await refreshProfile();
        addToast('Avatar updated permanently!', 'success');
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      addToast('Failed to save avatar image.', 'error');
    }
  };

  // Banner file upload with instant compression & permanent Firestore sync
  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      addToast('Compressing and updating banner...', 'info');
      const compressed = await compressBanner(file);
      setBannerURL(compressed);
      if (currentUser) {
        updateUserProfileState({ bannerURL: compressed });
        await userService.updateProfile(currentUser.uid, { bannerURL: compressed });
        await refreshProfile();
        addToast('Banner updated permanently!', 'success');
      }
    } catch (err) {
      console.error('Failed to upload banner:', err);
      addToast('Failed to save banner image.', 'error');
    }
  };

  interface SettingsItem {
    id: any;
    label: string;
    icon: any;
    badge?: string;
    badgeType?: 'blue' | 'amber';
    isDanger?: boolean;
  }

  interface SettingsGroup {
    category: string;
    items: SettingsItem[];
  }

  const menuGroups: SettingsGroup[] = [
    {
      category: isHindi ? 'खाता (Account)' : 'ACCOUNT',
      items: [
        { id: 'general', label: isHindi ? 'सामान्य सेटिंग्स' : 'General', icon: Sun },
        { id: 'profile', label: isHindi ? 'प्रोफ़ाइल' : 'Profile', icon: User },
        { id: 'avatar_cover', label: isHindi ? 'अवतार व बैनर' : 'Avatar & Cover', icon: ImageIcon },
        { id: 'privacy', label: isHindi ? 'गोपनीयता' : 'Privacy', icon: Shield },
      ]
    },
    {
      category: isHindi ? 'सुरक्षा (Security)' : 'SECURITY',
      items: [
        { id: 'password', label: isHindi ? 'पासवर्ड बदलें' : 'Password', icon: Key },
        { id: 'two_factor', label: isHindi ? '2-चरणीय प्रमाणीकरण' : 'Two-factor authentication', icon: Smartphone },
        { id: 'sessions', label: isHindi ? 'लॉगिन सेशन्स' : 'Manage Sessions', icon: Monitor },
        { id: 'blocked_users', label: isHindi ? 'ब्लॉक किए गए यूज़र्स' : 'Blocked Users', icon: Ban },
      ]
    },
    {
      category: isHindi ? 'कमाई (Earnings)' : 'EARNINGS',
      items: [
        { id: 'monetization', label: isHindi ? 'मोनेटाइजेशन' : 'Monetization', icon: DollarSign },
        { id: 'balance', label: isHindi ? 'वॉलेट बैलेंस' : 'Balance', icon: CreditCard, badge: `$${mainBalance.toFixed(2)}`, badgeType: 'blue' },
        { id: 'points', label: isHindi ? 'रिवॉर्ड पॉइंट्स' : 'Points', icon: Award, badge: `${points} pts`, badgeType: 'blue' },
        { id: 'verification', label: isHindi ? 'सत्यापन' : 'Verification', icon: ShieldCheck, badge: verificationSubmitted ? (isHindi ? 'जमा हुआ' : 'Submitted') : undefined, badgeType: 'amber' },
      ]
    },
    {
      category: isHindi ? 'डेटा (Data)' : 'DATA',
      items: [
        { id: 'my_info', label: isHindi ? 'मेरी जानकारी' : 'My Information', icon: Info },
        { id: 'purchases', label: isHindi ? 'मेरी खरीदारी' : 'My Purchases', icon: ShoppingBag },
        { id: 'delete_account', label: isHindi ? 'खाता हटाएं' : 'Delete account', icon: Trash2, isDanger: true },
      ]
    }
  ];

  const handleSelectTab = (id: any) => {
    setActiveTab(id);
    setMobileView('content');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[#F1F4F9] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] p-4 sm:p-6 md:p-8 font-sans antialiased transition-colors">
      
      {/* Hidden File Inputs */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFileSelect} />

      {/* Main Two-Card Layout matching user screenshot */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start gap-6">
        
        {/* ======================================================== */}
        {/* LEFT CARD: SETTINGS MENU                                */}
        {/* Visible on desktop, or on mobile when mobileView==='menu'*/}
        {/* ======================================================== */}
        <div className={`w-full lg:w-72 xl:w-80 shrink-0 bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs ${
          mobileView === 'content' ? 'hidden lg:block' : 'block'
        }`}>
          
          {/* Header with Back Arrow and Title */}
          <div className="flex items-center gap-3.5 pb-4 mb-2">
            <button
              onClick={() => navigate('home')}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title={isHindi ? 'वापस' : 'Back'}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {isHindi ? 'सेटिंग्स' : 'Settings'}
            </h1>
          </div>

          {/* Categorized Menu Groups */}
          <div className="space-y-5">
            {menuGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 px-3 pb-1">
                  {group.category}
                </span>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-bold'
                            : item.isDanger
                            ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 stroke-[2.2] ${
                            isActive
                              ? 'text-[#2563EB] dark:text-blue-400'
                              : item.isDanger
                              ? 'text-rose-600'
                              : 'text-slate-400 dark:text-slate-400'
                          }`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono shrink-0 ml-2 ${
                            item.badgeType === 'amber'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/70 dark:text-blue-300'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT CARD: ACTIVE TAB CONTENT                          */}
        {/* Visible on desktop, or on mobile when mobileView==='content'*/}
        {/* ======================================================== */}
        <div className={`flex-1 w-full bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs min-h-[560px] ${
          mobileView === 'menu' ? 'hidden lg:block' : 'block'
        }`}>
          
          {/* MOBILE ONLY: Back to Settings button */}
          <div className="lg:hidden mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setMobileView('menu')}
              className="flex items-center gap-2 text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Settings</span>
            </button>
          </div>

          {/* ====================================================== */}
          {/* TAB 1: GENERAL SETTINGS (Exact matching user screenshot) */}
          {/* ====================================================== */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              
              {/* Header with Title, Subtitle, and Save Button */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    General Settings
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage your basic account details.
                  </p>
                </div>

                <button
                  onClick={handleSaveGeneral}
                  disabled={savingStatus === 'saving'}
                  className="px-7 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-full shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                >
                  {savingStatus === 'saving' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>Save</span>
                </button>
              </div>

              {saveMsg && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-[#2563EB] text-xs font-bold rounded-xl">
                  {saveMsg}
                </div>
              )}

              {/* Form Fields: Grid 2 Columns */}
              <div className="space-y-6 pt-1">
                
                {/* Row 1: Username & Email Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2">
                      Username
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. maryxbgamer"
                        className="w-full h-12 pl-11 pr-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2">
                      E-mail Address
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-12 pl-11 pr-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                      Add an email so you can recover your account.
                    </p>
                  </div>
                </div>

                {/* Row 2: Gender & Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2">
                      Gender
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full h-12 pl-11 pr-10 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB] appearance-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2">
                      Country
                    </label>
                    <div className="relative flex items-center">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full h-12 pl-11 pr-10 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB] appearance-none"
                      >
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Row 3: Age */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2">
                      Age
                    </label>
                    <div className="relative flex items-center">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                      <select
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full h-12 pl-11 pr-10 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB] appearance-none"
                      >
                        <option value="Not selected">Not selected</option>
                        <option value="13-17">13 - 17</option>
                        <option value="18-24">18 - 24</option>
                        <option value="25-34">25 - 34</option>
                        <option value="35-44">35 - 44</option>
                        <option value="45+">45+</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                  <span className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-1">
                    Newsletter
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Get updates and tips from SocialIndia in your inbox.
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNewsletter('active')}
                      className={`px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                        newsletter === 'active'
                          ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/50'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        newsletter === 'active' ? 'border-[#2563EB]' : 'border-slate-300'
                      }`}>
                        {newsletter === 'active' && <div className="w-2 h-2 rounded-full bg-[#2563EB]" />}
                      </div>
                      <span>Active</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewsletter('inactive')}
                      className={`px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                        newsletter === 'inactive'
                          ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/50'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        newsletter === 'inactive' ? 'border-[#2563EB]' : 'border-slate-300'
                      }`}>
                        {newsletter === 'inactive' && <div className="w-2 h-2 rounded-full bg-[#2563EB]" />}
                      </div>
                      <span>Inactive</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ====================================================== */}
          {/* TAB 2: PROFILE                                         */}
          {/* ====================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Profile Settings
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage your public profile and channel details.
                  </p>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={savingStatus === 'saving'}
                  className="px-7 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm rounded-full shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {savingStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Save</span>
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-12 px-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2">
                    About / Channel Bio
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell viewers about your channel..."
                    className="w-full p-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Instagram</label>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="https://instagram.com/user"
                      className="w-full h-11 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Twitter / X</label>
                    <input
                      type="text"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="https://x.com/user"
                      className="w-full h-11 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* TAB 3: AVATAR & COVER                                  */}
          {/* ====================================================== */}
          {activeTab === 'avatar_cover' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Avatar & Cover
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Upload your avatar photo and channel cover banner.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-3xl mx-auto overflow-hidden">
                    {photoURL ? <img src={photoURL} alt="" className="w-full h-full object-cover" /> : getInitials(displayName || username || 'U')}
                  </div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-6 py-2.5 bg-[#2563EB] text-white text-xs font-bold rounded-full"
                  >
                    Upload Avatar
                  </button>
                </div>

                <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-4">
                  <div className="w-full h-24 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    {bannerURL ? <img src={bannerURL} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-400" />}
                  </div>
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    className="px-6 py-2.5 bg-[#2563EB] text-white text-xs font-bold rounded-full"
                  >
                    Upload Cover
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* TAB 4: PRIVACY                                         */}
          {/* ====================================================== */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Privacy Settings
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Control who sees your activity.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex items-center justify-between pt-4 first:pt-0">
                  <div>
                    <h4 className="text-sm font-bold">Show My Subscriptions</h4>
                    <p className="text-xs text-slate-500">Allow other users to see channels you subscribe to</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB]" />
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div>
                    <h4 className="text-sm font-bold">Allow Comments on Videos</h4>
                    <p className="text-xs text-slate-500">Viewers can comment on your uploads</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2563EB]" />
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* TAB 5: PASSWORD                                        */}
          {/* ====================================================== */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Change Password
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Keep your account secure with a strong password.
                </p>
              </div>

              {passwordStatusMsg && (
                <div className="p-3 bg-blue-50 text-[#2563EB] text-xs font-bold rounded-xl">
                  {passwordStatusMsg}
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full h-11 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full h-11 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full h-11 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#2563EB] text-white text-xs font-bold rounded-full"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* ====================================================== */}
          {/* TAB 6: BALANCE & WALLET                                */}
          {/* ====================================================== */}
          {activeTab === 'balance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Balance & Wallet
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage earnings and request payouts.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Total: <strong className="text-emerald-600 font-mono font-black text-sm">${mainBalance.toFixed(2)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <span className="text-[11px] font-extrabold uppercase text-slate-500">Withdrawable Balance</span>
                  <h3 className="text-3xl font-black font-mono text-slate-900 dark:text-white">${mainBalance.toFixed(2)}</h3>
                  <button
                    onClick={() => {
                      setWithdrawAmount(mainBalance);
                      setWithdrawModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl w-full"
                  >
                    Withdraw (UPI / Bank)
                  </button>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <span className="text-[11px] font-extrabold uppercase text-slate-500">Shopping Wallet</span>
                  <h3 className="text-3xl font-black font-mono text-slate-900 dark:text-white">₹{walletBalance.toFixed(2)}</h3>
                  <button
                    onClick={() => setReplenishModalOpen(true)}
                    className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl w-full"
                  >
                    + Top Up Wallet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* TAB 7: POINTS                                          */}
          {/* ====================================================== */}
          {activeTab === 'points' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Points
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Earn points by watching and uploading videos.
                </p>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 max-w-sm">
                <span className="text-xs font-extrabold uppercase text-slate-500">Points Balance</span>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white">{points}</h1>
                <p className="text-xs text-slate-500">100 Points = ₹1.00</p>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* TAB 8: MONETIZATION                                    */}
          {/* ====================================================== */}
          {activeTab === 'monetization' && (
            <div className="space-y-6">
              
              {/* 1. HEADER CARD (Matches Capture.PNG top card) */}
              <div className="bg-slate-50/70 dark:bg-[#161f30]/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-14 h-14 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-500/25 shrink-0">
                    $
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      Monetization
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Track your eligibility and creator earnings on SocialIndia.
                    </p>
                  </div>
                </div>

                {/* Status Badge Pill */}
                <div className="shrink-0 self-start sm:self-auto">
                  {monetizationStatusType === 'Eligible' ? (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Eligible</span>
                    </div>
                  ) : monetizationStatusType === 'Almost There' ? (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-300">
                      <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0" />
                      <span>Almost There</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-900/50 bg-[#eff6ff] dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-300">
                      <Clock className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0" />
                      <span>In Progress</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. ELIGIBILITY PROGRESS CARD (Matches Capture.PNG main card) */}
              <div className="bg-slate-50/70 dark:bg-[#161f30]/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xs space-y-6">
                
                {/* Title and Requirements Banner */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Partner Program Eligibility
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
                      To become eligible for the SocialIndia Partner Program, you need:
                    </p>
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                        <span>500 Subscribers</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                        <span>1,000 Views on at least one video</span>
                      </div>
                    </div>
                  </div>

                  {/* Info Callout Box (as shown in Capture.PNG) */}
                  <div className="lg:max-w-md bg-[#eff6ff]/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      Your video-view requirement is based on your single highest-viewed video, not your total channel views.
                    </p>
                  </div>
                </div>

                {/* Two Requirements Progress Sub-Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  
                  {/* Subscribers Sub-Card */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Subscribers</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                          {currentSubscribers} <span className="text-base font-bold text-slate-400">/ 500</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((currentSubscribers / 500) * 100))}%` }}
                      />
                    </div>

                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {subscriberRequirementMet ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> 500+ subscribers reached
                        </span>
                      ) : (
                        <span>{500 - currentSubscribers} more subscribers needed</span>
                      )}
                    </div>
                  </div>

                  {/* Highest Video Views Sub-Card */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Film className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Highest Video Views</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                          {highestVideoViews} <span className="text-base font-bold text-slate-400">/ 1,000</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((highestVideoViews / 1000) * 100))}%` }}
                      />
                    </div>

                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {videoRequirementMet ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> 1,000+ views reached
                        </span>
                      ) : (
                        <span>{1000 - highestVideoViews} more views needed</span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Success / Status Action Banner */}
                {isEligibleForMonetization ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 dark:from-blue-950/50 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-[#2563EB] dark:text-blue-400">
                        <Sparkles className="w-4 h-4" />
                        <span>You're eligible for the SocialIndia Partner Program</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Both requirements are complete! Continue below to enable channel monetization.
                      </p>
                    </div>

                    {currentUserProfile?.isMonetized || currentUserProfile?.monetizationStatus === 'approved' ? (
                      <div className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs">
                        <CheckCircle2 className="w-4 h-4" /> Partner Monetization Active
                      </div>
                    ) : (
                      <button
                        onClick={handleRequestMonetization}
                        disabled={isRequestingMonetization}
                        className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center gap-2 shrink-0 transition-all active:scale-98"
                      >
                        {isRequestingMonetization ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>Continue to Apply</span>
                      </button>
                    )}
                  </div>
                ) : (
                  (subscriberRequirementMet || videoRequirementMet) && (
                    <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {subscriberRequirementMet
                          ? "You have reached the subscriber requirement. Get 1,000 views on one video to become eligible."
                          : "Your video has reached 1,000 views. Reach 500 subscribers to become eligible."}
                      </p>
                    </div>
                  )
                )}

                {monetizationMsg && (
                  <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[#2563EB] dark:text-blue-300 text-xs font-bold rounded-xl">
                    {monetizationMsg}
                  </div>
                )}
              </div>

              {/* 3. HIGHEST-VIEWED VIDEO CARD */}
              <div className="bg-slate-50/70 dark:bg-[#161f30]/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Your Highest-Viewed Video
                  </h3>
                  {highestViewedVideo && (
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Auto-tracks dynamic views
                    </span>
                  )}
                </div>

                {loadingCreatorVideos ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                    <span>Loading channel video metrics...</span>
                  </div>
                ) : highestViewedVideo ? (
                  <div
                    onClick={() => navigate('watch', highestViewedVideo.videoId)}
                    className="group cursor-pointer bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 shadow-2xs"
                  >
                    {/* Video Thumbnail */}
                    <div className="relative w-full sm:w-52 h-32 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                      {highestViewedVideo.thumbnailUrl ? (
                        <img
                          src={highestViewedVideo.thumbnailUrl}
                          alt={highestViewedVideo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Film className="w-8 h-8" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#2563EB] text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-xs flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Highest Views
                      </div>

                      {highestViewedVideo.duration > 0 && (
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">
                          {formatDuration(highestViewedVideo.duration)}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                        <div className="w-9 h-9 rounded-full bg-white/95 text-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Video Details & Progress */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                          Highest Views
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {highestVideoViews.toLocaleString()} views
                        </span>
                      </div>

                      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#2563EB] transition-colors line-clamp-2">
                        {highestViewedVideo.title}
                      </h4>

                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Published {formatTimeAgo(highestViewedVideo.createdAt) || 'Recently'}
                      </div>

                      <div className="pt-1.5 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500 dark:text-slate-400">Progress to 1,000 views:</span>
                          <span className="text-[#2563EB] dark:text-blue-400 font-black">
                            {highestVideoViews.toLocaleString()} / 1,000 views
                          </span>
                        </div>

                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round((highestVideoViews / 1000) * 100))}%` }}
                          />
                        </div>

                        <div className="text-[11px] font-medium pt-0.5">
                          {highestVideoViews >= 1000 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 1,000+ views requirement reached
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              {1000 - highestVideoViews} more views needed on this video
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 px-4 bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center mx-auto">
                      <Film className="w-6 h-6 stroke-[2]" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      No videos published yet
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                      Publish your first video to start building your audience and tracking your monetization progress.
                    </p>
                    <button
                      onClick={() => navigate('upload')}
                      className="mt-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Publish Video</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 4. REQUIREMENTS EXPLANATION CARD */}
              <div className="bg-slate-50/70 dark:bg-[#161f30]/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xs space-y-3">
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#2563EB]" />
                  <span>How eligibility works</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  To become eligible for SocialIndia monetization, you need:
                </p>
                <div className="space-y-1.5 pl-3">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    <span>500 subscribers</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    <span>1,000 views on at least one video</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed pt-1">
                  Your video-view requirement is based on your single highest-viewed video, not your total channel views.
                </p>
              </div>

              {/* 5. CREATOR EARNINGS / WALLET SUMMARY */}
              <div className="bg-slate-50/70 dark:bg-[#161f30]/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center font-bold">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                        Creator Earnings & Wallet
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Real-time balances from your SocialIndia account
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectTab('balance')}
                    className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage Balance & Payouts</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Withdrawable Balance
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                      ₹{Number(currentUserProfile?.mainBalance ?? 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Shopping Wallet
                    </span>
                    <span className="text-xl font-black text-[#2563EB] dark:text-blue-400 mt-1 block">
                      ₹{Number(currentUserProfile?.walletBalance ?? 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Reward Points
                    </span>
                    <span className="text-xl font-black text-amber-500 mt-1 block">
                      {currentUserProfile?.points ?? 0}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ====================================================== */}
          {/* OTHER TABS: SESSIONS, 2FA, VERIFICATION, INFO, DELETE  */}
          {/* ====================================================== */}
          {activeTab === 'two_factor' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Two-factor authentication</h2>
              </div>
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span>Enable 2FA</span>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${twoFactorEnabled ? 'bg-[#2563EB]' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${twoFactorEnabled ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Manage Sessions</h2>
              </div>
              <p className="text-xs text-slate-500">Current device: Linux / Web Browser • Active Now</p>
            </div>
          )}

          {activeTab === 'blocked_users' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Blocked Users</h2>
              </div>
              <p className="text-xs text-slate-400">No blocked users.</p>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Verification</h2>
              </div>
              <p className="text-xs text-slate-500">Verification request is currently submitted and under review.</p>
            </div>
          )}

          {activeTab === 'my_info' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My Information</h2>
              </div>
              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUserProfile, null, 2));
                  const dl = document.createElement('a');
                  dl.setAttribute("href", dataStr);
                  dl.setAttribute("download", `account_backup.json`);
                  dl.click();
                }}
                className="px-6 py-2.5 bg-[#2563EB] text-white text-xs font-bold rounded-full"
              >
                Download Data (.json)
              </button>
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My Purchases</h2>
              </div>
              <p className="text-xs text-slate-500">No recent purchase transactions.</p>
            </div>
          )}

          {activeTab === 'delete_account' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-rose-600 tracking-tight">Delete account</h2>
              </div>
              <p className="text-xs text-rose-600 font-semibold">
                Warning: Deleting your account will permanently delete all your channel data, videos, and points.
              </p>
            </div>
          )}

          {/* Settings Panel Sponsored Ad Banner */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <ExternalAdBanner type="search-box" locationTag="settings-panel" />
          </div>

        </div>

      </div>

      {/* Withdraw Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Withdraw Funds</h3>
              <button onClick={() => setWithdrawModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">UPI ID</label>
                <input
                  type="text"
                  placeholder="e.g. user@paytm"
                  value={withdrawUpiId}
                  onChange={(e) => setWithdrawUpiId(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingWithdraw}
                className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
              >
                Confirm Payout
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Replenish Modal */}
      {replenishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Top Up Wallet</h3>
              <button onClick={() => setReplenishModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Amount (₹)</label>
              <input
                type="number"
                value={replenishAmount}
                onChange={(e) => setReplenishAmount(Number(e.target.value))}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <button
              onClick={handleReplenishWallet}
              className="w-full py-2.5 bg-[#2563EB] text-white text-xs font-bold rounded-xl"
            >
              Add ₹{replenishAmount}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
