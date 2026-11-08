import React, { useState, useEffect } from 'react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { accountService, SavedAccount } from '../services/accountService';
import { SocialIndiaLogo } from '../components/SocialIndiaLogo';
import { useTranslation, LanguageCode } from '../i18n';
import { 
  Loader2, 
  CheckCircle2, 
  Lock, 
  User as UserIcon, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  KeyRound,
  RotateCw,
  Plus,
  Trash2,
  ChevronRight,
  Shield,
  HelpCircle
} from 'lucide-react';

interface SignInPageProps {
  initialMode?: 'login' | 'register' | 'forgot-password';
}

export const SignInPage: React.FC<SignInPageProps> = ({ initialMode = 'login' }) => {
  const { navigate, route } = useRouter();
  const { addToast, refreshProfile, currentUser } = useApp();
  const { t, isHindi, language, setLanguage } = useTranslation();

  // Determine initial mode from prop or URL route
  const getInitialMode = (): 'login' | 'register' | 'forgot-password' => {
    if (route.path === 'signup' || route.path === 'register' || route.path === 'create-account') {
      return 'register';
    }
    if (route.path === 'forgot-password' || route.path === 'reset-password') {
      return 'forgot-password';
    }
    return initialMode;
  };

  const [mode, setMode] = useState<'login' | 'register' | 'verify-email' | 'forgot-password'>(getInitialMode);
  
  // Saved accounts state (YouTube / Google "Choose an account" view)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [switchingAccountUid, setSwitchingAccountUid] = useState<string | null>(null);

  // Sync mode with route changes if user navigates back/forward
  useEffect(() => {
    if (mode === 'verify-email') return;
    if (route.path === 'signup' || route.path === 'register' || route.path === 'create-account') {
      setMode('register');
      setShowAccountChooser(false);
    } else if (route.path === 'forgot-password' || route.path === 'reset-password') {
      setMode('forgot-password');
      setShowAccountChooser(false);
    } else if (route.path === 'signin' || route.path === 'login') {
      setMode('login');
      // If user came to login and has saved accounts, show account chooser
      const accounts = accountService.getSavedAccounts();
      setSavedAccounts(accounts);
      if (accounts.length > 0 && !currentUser) {
        setShowAccountChooser(true);
      }
    }
  }, [route.path]);

  // Initial load of saved accounts
  useEffect(() => {
    const accounts = accountService.getSavedAccounts();
    setSavedAccounts(accounts);
    if (accounts.length > 0 && mode === 'login' && !currentUser) {
      setShowAccountChooser(true);
    }
  }, []);

  // Form input fields
  const [identifier, setIdentifier] = useState(''); // Email or username (YouTube style)
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Inline field errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Verification states
  const [verificationTargetEmail, setVerificationTargetEmail] = useState('');
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resolvedResetEmail, setResolvedResetEmail] = useState('');
  const [forgotMethod, setForgotMethod] = useState<'email' | 'instant'>('email');
  
  // Instant reset state
  const [instantIdentifier, setInstantIdentifier] = useState('');
  const [instantNewPass, setInstantNewPass] = useState('');
  const [instantConfirmPass, setInstantConfirmPass] = useState('');
  const [instantLoading, setInstantLoading] = useState(false);
  const [instantSuccess, setInstantSuccess] = useState(false);
  const [showInstantPass, setShowInstantPass] = useState(false);

  // Check if returning from Google OAuth redirect flow
  useEffect(() => {
    authService.checkRedirectResult().then((res) => {
      if (res?.userProfile) {
        accountService.saveAccount(res.userProfile, undefined, 'google');
        refreshProfile();
        addToast(`Welcome to SocialIndia, ${res.userProfile.displayName || res.userProfile.username}!`, 'success');
        navigate('home');
      }
    }).catch(console.warn);
  }, []);

  // Handle resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // If already logged in but unverified, prompt verification
  useEffect(() => {
    if (currentUser && !currentUser.emailVerified && mode !== 'verify-email') {
      if (currentUser.email && !currentUser.email.endsWith('@socialindia.com')) {
        setVerificationTargetEmail(currentUser.email);
        setMode('verify-email');
        setShowAccountChooser(false);
      }
    }
  }, [currentUser]);

  // Switch mode handler that updates URL route cleanly
  const handleSwitchMode = (newMode: 'login' | 'register' | 'forgot-password') => {
    setMode(newMode);
    setShowAccountChooser(false);
    setServerError('');
    setResetError('');
    setErrors({});
    setTouched({});
    if (newMode === 'login') {
      navigate('signin');
    } else if (newMode === 'register') {
      navigate('create-account');
    } else if (newMode === 'forgot-password') {
      setResetSentSuccess(false);
      if (identifier) {
        setForgotEmail(identifier);
        setInstantIdentifier(identifier);
      }
      navigate('forgot-password');
    }
  };

  // Field validation logic
  const validateField = (name: string, value: string): string => {
    if (name === 'identifier' && mode === 'login') {
      if (!value.trim()) return isHindi ? 'ईमेल या यूज़रनेम दर्ज करें' : 'Enter an email or username';
    }
    if (name === 'username' && mode === 'register') {
      if (!value.trim()) return isHindi ? 'यूज़रनेम आवश्यक है' : 'Choose a username';
      const usernameRegex = /^[a-z0-9_]{3,20}$/;
      if (!usernameRegex.test(value.trim().toLowerCase())) {
        return isHindi ? '3-20 अक्षर (छोटे अक्षर, अंक, _)' : 'Use 3-20 letters, numbers, or underscores';
      }
    }
    if (name === 'displayName' && mode === 'register') {
      if (!value.trim()) return isHindi ? 'नाम दर्ज करें' : 'Enter your name';
    }
    if (name === 'email' && mode === 'register') {
      if (!value.trim()) return isHindi ? 'ईमेल दर्ज करें' : 'Enter an email address';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return isHindi ? 'मान्य ईमेल पता दर्ज करें' : 'Enter a valid email address';
      }
    }
    if (name === 'password') {
      if (!value) return isHindi ? 'पासवर्ड दर्ज करें' : 'Enter a password';
      if (mode === 'register' && value.length < 8) {
        return isHindi ? 'कम से कम 8 अक्षर का पासवर्ड बनाएं' : 'Use 8 characters or more for your password';
      }
    }
    if (name === 'confirmPassword' && mode === 'register') {
      if (!value) return isHindi ? 'पासवर्ड पुनः दर्ज करें' : 'Confirm your password';
      if (value !== password) {
        return isHindi ? 'पासवर्ड मेल नहीं खाते' : "Those passwords didn't match. Try again.";
      }
    }
    return '';
  };

  const handleBlur = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    let val = '';
    if (fieldName === 'identifier') val = identifier;
    if (fieldName === 'username') val = username;
    if (fieldName === 'displayName') val = displayName;
    if (fieldName === 'email') val = email;
    if (fieldName === 'password') val = password;
    if (fieldName === 'confirmPassword') val = confirmPassword;

    const errorMsg = validateField(fieldName, val);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: errorMsg
    }));
  };

  // Submit Handler for Sign In / Create Account
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const newErrors: Record<string, string> = {};

    if (mode === 'login') {
      const idErr = validateField('identifier', identifier);
      if (idErr) newErrors.identifier = idErr;
      const passErr = validateField('password', password);
      if (passErr) newErrors.password = passErr;

      setErrors(newErrors);
      setTouched({ identifier: true, password: true });

      if (Object.keys(newErrors).length > 0) return;

      setLoading(true);
      try {
        const cleanIdentifier = identifier.trim().toLowerCase();
        const { userProfile, emailVerified } = await authService.login(cleanIdentifier, password);
        accountService.saveAccount(userProfile, password, 'password');
        await refreshProfile();

        const userEmail = userProfile.email || authService.getCurrentUserEmail() || '';
        const isRealEmail = userEmail && !userEmail.endsWith('@socialindia.com');

        if (isRealEmail && !emailVerified) {
          setVerificationTargetEmail(userEmail);
          setMode('verify-email');
          setResendCooldown(30);
          addToast(isHindi ? 'कृपया अपने ईमेल की पुष्टि करें।' : 'Please verify your email to unlock all features.', 'info');
        } else {
          addToast(isHindi ? 'सोशलइंडिया में पुनः स्वागत है!' : 'Welcome back to SocialIndia!', 'success');
          navigate('home');
        }
      } catch (err: any) {
        let msg = err.message || 'Authentication failed.';
        if (
          msg.includes('auth/invalid-credential') || 
          msg.includes('auth/wrong-password') || 
          msg.includes('auth/user-not-found')
        ) {
          msg = isHindi 
            ? 'गलत ईमेल/यूज़रनेम या पासवर्ड। पुनः प्रयास करें या पासवर्ड भूल गए पर क्लिक करें।' 
            : "Wrong password or email/username. Try again or click Forgot password.";
        }
        setServerError(msg);
      } finally {
        setLoading(false);
      }
    } else if (mode === 'register') {
      const dErr = validateField('displayName', displayName);
      if (dErr) newErrors.displayName = dErr;

      const uErr = validateField('username', username);
      if (uErr) newErrors.username = uErr;

      const eErr = validateField('email', email);
      if (eErr) newErrors.email = eErr;

      const pErr = validateField('password', password);
      if (pErr) newErrors.password = pErr;

      const cpErr = validateField('confirmPassword', confirmPassword);
      if (cpErr) newErrors.confirmPassword = cpErr;

      if (!agreeTerms) {
        newErrors.agreeTerms = isHindi ? 'कृपया नियमों और गोपनीयता नीति से सहमत हों' : 'You must agree to the Terms and Privacy Policy';
      }

      setErrors(newErrors);
      setTouched({
        displayName: true,
        username: true,
        email: true,
        password: true,
        confirmPassword: true,
        agreeTerms: true
      });

      if (Object.keys(newErrors).length > 0) return;

      setLoading(true);
      try {
        const cleanEmail = email.trim().toLowerCase();
        const cleanUsername = username.trim().toLowerCase();
        const cleanDisplayName = displayName.trim() || cleanUsername;

        const { userProfile } = await authService.register(cleanEmail, cleanUsername, cleanDisplayName, password);
        accountService.saveAccount(userProfile, password, 'password');
        await refreshProfile();

        setVerificationTargetEmail(cleanEmail);
        setMode('verify-email');
        setResendCooldown(60);
        addToast(isHindi ? `सत्यापन ईमेल ${cleanEmail} पर भेजा गया!` : `Verification email sent to ${cleanEmail}!`, 'success');
      } catch (err: any) {
        let msg = err.message || 'Registration failed.';
        if (msg.includes('auth/email-already-in-use')) {
          msg = isHindi ? 'इस ईमेल पते पर पहले से एक खाता मौजूद है। कृपया लॉग इन करें।' : 'An account with this email already exists. Please sign in instead.';
        } else if (msg.includes('auth/invalid-email')) {
          msg = isHindi ? 'कृपया एक मान्य ईमेल पता दर्ज करें।' : 'Please enter a valid email address.';
        } else if (msg.includes('auth/weak-password')) {
          msg = isHindi ? 'पासवर्ड बहुत कमजोर है। कम से कम 8 अक्षर का उपयोग करें।' : 'Password is too weak. Please use at least 8 characters.';
        }
        setServerError(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  // Google OAuth button handler
  const handleGoogleAuth = async () => {
    setServerError('');
    setGoogleLoading(true);
    try {
      const { userProfile } = await authService.signInWithGoogle();
      accountService.saveAccount(userProfile, undefined, 'google');
      await refreshProfile();
      addToast(`Welcome to SocialIndia, ${userProfile.displayName || userProfile.username}!`, 'success');
      navigate('home');
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        setServerError(
          isHindi
            ? 'यह डोमेन Firebase Authentication में अधिकृत (Authorized Domain) नहीं है।'
            : 'This domain is not authorized in Firebase Console (Authentication > Settings > Authorized Domains).'
        );
      } else if (err.code === 'auth/popup-blocked') {
        setServerError(
          isHindi
            ? 'ब्राउज़र ने पॉपअप विंडो ब्लॉक कर दी। कृपया पॉपअप की अनुमति दें।'
            : 'Popup was blocked by your browser. Please allow popups for this site and try again.'
        );
      } else if (err.code === 'auth/operation-not-allowed') {
        setServerError(
          isHindi
            ? 'Firebase Console में Google Sign-In चालू नहीं है।'
            : 'Google Sign-In is not enabled in Firebase Console.'
        );
      } else {
        setServerError(err.message || (isHindi ? 'Google साइन-इन पूरा नहीं हो सका।' : 'Google sign-in could not be completed.'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Switch to saved account (YouTube style account selector)
  const handleSelectSavedAccount = async (acc: SavedAccount) => {
    setSwitchingAccountUid(acc.uid);
    setServerError('');
    try {
      const res = await accountService.switchToAccount(acc);
      if (res.success) {
        await refreshProfile();
        addToast(isHindi ? `स्वागत है, ${acc.displayName}!` : `Welcome back, ${acc.displayName}!`, 'success');
        navigate('home');
      } else if (res.requiresPassword) {
        // Pre-fill username/email and switch to password form
        setShowAccountChooser(false);
        setIdentifier(acc.username || acc.email);
        setServerError(isHindi ? `कृपया @${acc.username} का पासवर्ड दर्ज करें:` : `Please enter password for @${acc.username}:`);
      } else {
        setServerError(res.error || 'Failed to switch account.');
      }
    } catch (e: any) {
      setServerError(e.message || 'Error switching account.');
    } finally {
      setSwitchingAccountUid(null);
    }
  };

  const handleRemoveSavedAccount = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    accountService.removeAccount(uid);
    const updated = accountService.getSavedAccounts();
    setSavedAccounts(updated);
    if (updated.length === 0) {
      setShowAccountChooser(false);
    }
  };

  // Check if user has clicked verification link in their email
  const handleCheckEmailVerified = async () => {
    setCheckingVerification(true);
    setServerError('');
    try {
      const verified = await authService.checkEmailVerified();
      if (verified) {
        await refreshProfile();
        addToast(isHindi ? 'ईमेल सफलतापूर्वक सत्यापित हुआ! सोशलइंडिया में आपका स्वागत है।' : 'Email verified successfully! Welcome to SocialIndia.', 'success');
        navigate('home');
      } else {
        setServerError(isHindi ? 'ईमेल अभी सत्यापित नहीं हुआ है। कृपया Gmail में जाकर लिंक पर क्लिक करें।' : 'Email not verified yet. Please check your Gmail Spam/Junk folder and click the link first.');
      }
    } catch (err: any) {
      setServerError(err.message || 'Could not check verification status. Please try again.');
    } finally {
      setCheckingVerification(false);
    }
  };

  // Resend verification email
  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    setResendingEmail(true);
    setServerError('');
    try {
      await authService.sendVerificationEmail();
      setResendCooldown(60);
      addToast(isHindi ? `सत्यापन ईमेल ${verificationTargetEmail} पर पुनः भेजा गया!` : `Verification email resent to ${verificationTargetEmail || 'your email'}!`, 'success');
    } catch (err: any) {
      setServerError(err.message || 'Failed to resend email. Please try again in a few moments.');
    } finally {
      setResendingEmail(false);
    }
  };

  // Cancel verification
  const handleCancelVerification = async () => {
    await authService.logout().catch(() => {});
    handleSwitchMode('login');
  };

  // Send password reset email
  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    const cleanInput = forgotEmail.trim();
    if (!cleanInput) {
      setResetError(isHindi ? 'कृपया अपना ईमेल या यूज़रनेम दर्ज करें।' : 'Enter your registered email or username.');
      return;
    }
    setSendingReset(true);
    try {
      const res = await authService.resetPassword(cleanInput);
      setResolvedResetEmail(res.emailSentTo);
      setResetSentSuccess(true);
      addToast(isHindi ? `पासवर्ड रीसेट लिंक ${res.emailSentTo} पर भेजा गया!` : `Password reset link sent to ${res.emailSentTo}!`, 'success');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setSendingReset(false);
    }
  };

  // Instant In-App Reset submit handler
  const handleInstantResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!instantIdentifier.trim()) {
      setResetError(isHindi ? 'कृपया यूज़रनेम या ईमेल दर्ज करें।' : 'Please enter your username or registered email.');
      return;
    }
    if (!instantNewPass || instantNewPass.length < 8) {
      setResetError(isHindi ? 'नया पासवर्ड कम से कम 8 अक्षर का होना चाहिए।' : 'New password must be at least 8 characters long.');
      return;
    }
    if (instantNewPass !== instantConfirmPass) {
      setResetError(isHindi ? 'पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.');
      return;
    }

    setInstantLoading(true);
    try {
      const res = await authService.instantResetPassword(instantIdentifier, instantNewPass);
      await refreshProfile();
      setInstantSuccess(true);
      addToast(isHindi ? `@${res.userProfile.username} के लिए नया पासवर्ड सेट हो गया!` : `Password updated successfully for @${res.userProfile.username}!`, 'success');
      setTimeout(() => {
        navigate('home');
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password. Please check your username/email.');
    } finally {
      setInstantLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col justify-between selection:bg-[#c2e7ff] selection:text-[#001d35]">
      
      {/* Top Mobile Bar with Back Button (< 640px) */}
      <header className="sm:hidden w-full h-14 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#131314]/90 backdrop-blur-md sticky top-0 z-40">
        <button
          onClick={() => navigate('home')}
          aria-label="Back to SocialIndia"
          className="p-2 -ml-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <SocialIndiaLogo size="sm" onClick={() => navigate('home')} />

        <div className="w-9" /> {/* Spacer balance */}
      </header>

      {/* Main Container - Centered SocialIndia Login Card */}
      <main className="flex-1 flex items-center justify-center p-0 sm:p-6 md:p-8">
        <div className="w-full sm:max-w-[448px] md:max-w-[480px] bg-white dark:bg-[#1e1f20] sm:border sm:border-[#dadce0] dark:sm:border-[#444746] sm:rounded-[28px] p-6 sm:p-10 transition-all sm:shadow-sm">
          
          {/* Brand Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              <SocialIndiaLogo 
                size="md" 
                onClick={() => navigate('home')} 
              />
              <button
                type="button"
                onClick={() => navigate('home')}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#0b57d0]/10 dark:hover:bg-[#a8c7fa]/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isHindi ? 'होम' : 'Home'}</span>
              </button>
            </div>

            {/* Title & Subtitle according to Mode */}
            {showAccountChooser ? (
              <div>
                <h1 className="text-[24px] sm:text-[28px] font-normal tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  {isHindi ? 'खाता चुनें' : 'Choose an account'}
                </h1>
                <p className="text-sm text-[#444746] dark:text-[#c4c7c5] mt-1.5">
                  {isHindi ? 'सोशलइंडिया पर जारी रखने के लिए' : 'to continue to SocialIndia'}
                </p>
              </div>
            ) : mode === 'forgot-password' ? (
              <div>
                <h1 className="text-[24px] sm:text-[28px] font-normal tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  {isHindi ? 'खाता पुनर्प्राप्ति' : 'Account recovery'}
                </h1>
                <p className="text-sm text-[#444746] dark:text-[#c4c7c5] mt-1.5">
                  {isHindi ? 'अपना सोशलइंडिया खाता पुनर्प्राप्त करें' : 'Recover your SocialIndia Account'}
                </p>
              </div>
            ) : mode === 'verify-email' ? (
              <div>
                <h1 className="text-[24px] sm:text-[28px] font-normal tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  {isHindi ? 'अपना ईमेल सत्यापित करें' : 'Verify your email address'}
                </h1>
                <p className="text-sm text-[#444746] dark:text-[#c4c7c5] mt-1.5">
                  {isHindi ? 'सोशलइंडिया पर जारी रखने के लिए' : 'to continue to SocialIndia'}
                </p>
              </div>
            ) : mode === 'register' ? (
              <div>
                <h1 className="text-[24px] sm:text-[28px] font-normal tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  {isHindi ? 'सोशलइंडिया खाता बनाएं' : 'Create your SocialIndia Account'}
                </h1>
                <p className="text-sm text-[#444746] dark:text-[#c4c7c5] mt-1.5">
                  {isHindi ? 'सोशलइंडिया पर जारी रखने के लिए' : 'to continue to SocialIndia'}
                </p>
              </div>
            ) : (
              <div>
                <h1 className="text-[24px] sm:text-[28px] font-normal tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  {isHindi ? 'लॉग इन करें' : 'Log in'}
                </h1>
                <p className="text-sm text-[#444746] dark:text-[#c4c7c5] mt-1.5">
                  {isHindi ? 'सोशलइंडिया पर जारी रखने के लिए' : 'to continue to SocialIndia'}
                </p>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {serverError && (
            <div 
              role="alert" 
              className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-medium flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{serverError}</div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: CHOOSE AN ACCOUNT (YouTube / Google Switcher)                        */}
          {/* ========================================================================= */}
          {showAccountChooser ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800">
                {savedAccounts.map((acc) => (
                  <div
                    key={acc.uid}
                    onClick={() => handleSelectSavedAccount(acc)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {acc.photoURL ? (
                        <img 
                          src={acc.photoURL} 
                          alt={acc.displayName} 
                          className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0b57d0] text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {(acc.displayName || acc.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                          {acc.displayName || acc.username}
                        </div>
                        <div className="text-xs text-[#444746] dark:text-[#c4c7c5] truncate">
                          {acc.email || `@${acc.username}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {switchingAccountUid === acc.uid ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#0b57d0] dark:text-[#a8c7fa]" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveSavedAccount(e, acc.uid)}
                          title={isHindi ? 'खाता हटाएं' : 'Remove account'}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 rounded-full transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}

                {/* "Use another account" button */}
                <div
                  onClick={() => setShowAccountChooser(false)}
                  className="py-3.5 px-2 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <span>{isHindi ? 'अन्य खाते का उपयोग करें' : 'Use another account'}</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('register')}
                  className="text-sm font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#0b57d0]/10 dark:hover:bg-[#a8c7fa]/10 px-3 py-2 rounded-full transition-colors cursor-pointer"
                >
                  {isHindi ? 'खाता बनाएं' : 'Create account'}
                </button>
              </div>
            </div>
          ) : mode === 'forgot-password' ? (
            /* ========================================================================= */
            /* VIEW: ACCOUNT RECOVERY (Google / YouTube Style)                           */
            /* ========================================================================= */
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Method Switcher Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMethod('email');
                    setResetError('');
                  }}
                  className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                    forgotMethod === 'email'
                      ? 'border-[#0b57d0] dark:border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {isHindi ? 'ईमेल द्वारा रीसेट' : 'Email Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMethod('instant');
                    setResetError('');
                  }}
                  className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                    forgotMethod === 'instant'
                      ? 'border-[#0b57d0] dark:border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {isHindi ? 'तुरंत इन-ऐप रीसेट' : 'Instant In-App Reset'}
                </button>
              </div>

              {resetError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {/* METHOD 1: EMAIL RESET LINK */}
              {forgotMethod === 'email' && (
                <>
                  {resetSentSuccess ? (
                    <div className="space-y-5 py-2">
                      <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-6 h-6 shrink-0" />
                        <h3 className="font-semibold text-base text-[#1f1f1f] dark:text-[#e3e3e3]">
                          {isHindi ? 'रीसेट लिंक भेज दिया गया' : 'Reset Link Sent'}
                        </h3>
                      </div>
                      
                      <p className="text-sm text-[#444746] dark:text-[#c4c7c5] leading-relaxed">
                        {isHindi ? 'हमने इस पते पर पासवर्ड रीसेट लिंक भेजा है:' : 'We sent a verification email with a reset link to:'}{' '}
                        <strong className="text-[#0b57d0] dark:text-[#a8c7fa] font-semibold break-all">
                          {resolvedResetEmail || forgotEmail}
                        </strong>
                      </p>

                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{isHindi ? 'Gmail यूज़र्स: स्पैम / जंक फ़ोल्डर जांचें' : 'Gmail users: Check Spam folder'}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {isHindi 
                            ? 'यदि ईमेल इनबॉक्स में न दिखे, तो अपने Gmail स्पैम फ़ोल्डर में "noreply@socialindia" खोजें या नीचे दिए गए बटन पर क्लिक करें।' 
                            : 'If not in Primary inbox, check your Gmail Spam folder or click the button below.'}
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <a
                          href="https://mail.google.com/mail/u/0/#spam"
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 h-10 px-4 bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-semibold rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{isHindi ? 'Gmail स्पैम खोलें' : 'Open Gmail Spam'}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleSwitchMode('login')}
                          className="h-10 px-4 text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#0b57d0]/10 rounded-full transition-colors cursor-pointer"
                        >
                          {isHindi ? 'लॉग इन करें' : 'Back to Sign In'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSendPasswordReset} className="space-y-6">
                      <div className="relative">
                        <input
                          id="recovery-email"
                          type="text"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder=" "
                          className="peer w-full h-14 px-4 pt-4 pb-1.5 bg-transparent border border-[#747775] dark:border-[#8e918f] rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa]"
                        />
                        <label
                          htmlFor="recovery-email"
                          className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] dark:peer-placeholder-shown:text-[#8e918f] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0] dark:peer-focus:text-[#a8c7fa]"
                        >
                          {isHindi ? 'पंजीकृत ईमेल या यूज़रनेम' : 'Email or username'}
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => handleSwitchMode('login')}
                          className="text-sm font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#0b57d0]/10 px-4 py-2.5 rounded-full transition-colors cursor-pointer"
                        >
                          {isHindi ? 'वापस जाएं' : 'Back'}
                        </button>

                        <button
                          type="submit"
                          disabled={sendingReset}
                          className="h-10 px-6 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {sendingReset && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                          <span>{isHindi ? 'अगला' : 'Next'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* METHOD 2: INSTANT IN-APP RESET */}
              {forgotMethod === 'instant' && (
                <>
                  {instantSuccess ? (
                    <div className="space-y-4 text-center py-4">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                      <h3 className="font-semibold text-lg text-[#1f1f1f] dark:text-[#e3e3e3]">
                        {isHindi ? 'पासवर्ड सफलतापूर्वक बदल गया!' : 'Password reset successfully!'}
                      </h3>
                      <p className="text-xs text-[#444746] dark:text-[#c4c7c5]">
                        {isHindi ? 'आपको होमपेज पर ले जाया जा रहा है...' : 'Redirecting to your channel...'}
                      </p>
                      <Loader2 className="w-5 h-5 animate-spin text-[#0b57d0] mx-auto" />
                    </div>
                  ) : (
                    <form onSubmit={handleInstantResetSubmit} className="space-y-4">
                      {/* Identifier */}
                      <div className="relative">
                        <input
                          id="instant-id"
                          type="text"
                          required
                          value={instantIdentifier}
                          onChange={(e) => setInstantIdentifier(e.target.value)}
                          placeholder=" "
                          className="peer w-full h-14 px-4 pt-4 pb-1.5 bg-transparent border border-[#747775] dark:border-[#8e918f] rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa]"
                        />
                        <label
                          htmlFor="instant-id"
                          className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0]"
                        >
                          {isHindi ? 'यूज़रनेम या ईमेल' : 'Username or email'}
                        </label>
                      </div>

                      {/* New Password */}
                      <div className="relative">
                        <input
                          id="instant-new-pass"
                          type={showInstantPass ? 'text' : 'password'}
                          required
                          value={instantNewPass}
                          onChange={(e) => setInstantNewPass(e.target.value)}
                          placeholder=" "
                          className="peer w-full h-14 pl-4 pr-11 pt-4 pb-1.5 bg-transparent border border-[#747775] dark:border-[#8e918f] rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa]"
                        />
                        <label
                          htmlFor="instant-new-pass"
                          className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0]"
                        >
                          {isHindi ? 'नया पासवर्ड (कम से कम 8 अक्षर)' : 'New password (min 8 chars)'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowInstantPass(!showInstantPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showInstantPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Confirm New Password */}
                      <div className="relative">
                        <input
                          id="instant-confirm-pass"
                          type={showInstantPass ? 'text' : 'password'}
                          required
                          value={instantConfirmPass}
                          onChange={(e) => setInstantConfirmPass(e.target.value)}
                          placeholder=" "
                          className="peer w-full h-14 px-4 pt-4 pb-1.5 bg-transparent border border-[#747775] dark:border-[#8e918f] rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa]"
                        />
                        <label
                          htmlFor="instant-confirm-pass"
                          className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0]"
                        >
                          {isHindi ? 'पासवर्ड दोबारा दर्ज करें' : 'Confirm new password'}
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => handleSwitchMode('login')}
                          className="text-sm font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#0b57d0]/10 px-4 py-2.5 rounded-full transition-colors cursor-pointer"
                        >
                          {isHindi ? 'वापस जाएं' : 'Back'}
                        </button>

                        <button
                          type="submit"
                          disabled={instantLoading}
                          className="h-10 px-6 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {instantLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                          <span>{isHindi ? 'पासवर्ड बदलें' : 'Save & Sign In'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          ) : mode === 'verify-email' ? (
            /* ========================================================================= */
            /* VIEW: EMAIL VERIFICATION (Google / YouTube Style)                         */
            /* ========================================================================= */
            <div className="space-y-6 animate-in fade-in duration-150 text-left">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-start gap-3.5">
                <Mail className="w-6 h-6 text-[#0b57d0] dark:text-[#a8c7fa] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-[#444746] dark:text-[#c4c7c5] leading-relaxed">
                  {isHindi ? 'हमने सत्यापन ईमेल इस पते पर भेजा है:' : 'We sent a verification email to:'}{' '}
                  <strong className="text-[#1f1f1f] dark:text-white font-bold break-all">
                    {verificationTargetEmail || 'your email'}
                  </strong>.
                  <div className="mt-1 text-[11px] text-slate-500">
                    {isHindi ? 'खाता सक्रिय करने के लिए कृपया लिंक पर क्लिक करें।' : 'Click the link in the email to finish signing in.'}
                  </div>
                </div>
              </div>

              {/* Notice Box about Gmail Spam Folder */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <span className="font-semibold">{isHindi ? 'सलाह: ' : 'Tip: '}</span>
                {isHindi 
                  ? 'यदि ईमेल इनबॉक्स में न दिखे तो अपना Gmail स्पैम / प्रमोशन्स फ़ोल्डर जांचें।' 
                  : 'Check your Gmail Spam or Promotions folder if the message does not appear right away.'}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCheckEmailVerified}
                  disabled={checkingVerification}
                  className="w-full h-11 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkingVerification ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  <span>{isHindi ? "मैंने ईमेल सत्यापित कर लिया है" : "I've verified my email"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href="https://mail.google.com/mail/u/0/#spam"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 h-10 border border-[#747775] dark:border-[#8e918f] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#1f1f1f] dark:text-[#e3e3e3] font-medium text-xs rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#0b57d0] dark:text-[#a8c7fa]" />
                    <span>{isHindi ? 'Gmail स्पैम फ़ोल्डर' : 'Gmail Spam'}</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendCooldown > 0 || resendingEmail}
                    className="flex-1 h-10 border border-[#747775] dark:border-[#8e918f] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#1f1f1f] dark:text-[#e3e3e3] font-medium text-xs rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {resendingEmail ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0b57d0]" />
                    ) : (
                      <RotateCw className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {resendCooldown > 0 
                        ? `${isHindi ? 'पुनः भेजें' : 'Resend'} (${resendCooldown}s)` 
                        : (isHindi ? 'ईमेल पुनः भेजें' : 'Resend email')}
                    </span>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleCancelVerification}
                    className="text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:underline cursor-pointer"
                  >
                    {isHindi ? 'किसी अन्य खाते से लॉग इन करें' : 'Log in with a different account'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW: SIGN IN / CREATE ACCOUNT FORM (Standard Google / YouTube Layout)     */
            /* ========================================================================= */
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              
              {/* CREATE ACCOUNT ONLY: Display Name & Username */}
              {mode === 'register' && (
                <>
                  {/* Full Name */}
                  <div className="relative">
                    <input
                      id="reg-displayname"
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: '' }));
                      }}
                      onBlur={() => handleBlur('displayName')}
                      placeholder=" "
                      className={`peer w-full h-14 px-4 pt-4 pb-1.5 bg-transparent border rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none transition-all ${
                        errors.displayName && touched.displayName
                          ? 'border-[#b3261e] focus:border-[#b3261e] focus:ring-1 focus:ring-[#b3261e]'
                          : 'border-[#747775] dark:border-[#8e918f] focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0]'
                      }`}
                    />
                    <label
                      htmlFor="reg-displayname"
                      className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] dark:peer-placeholder-shown:text-[#8e918f] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0] dark:peer-focus:text-[#a8c7fa]"
                    >
                      {isHindi ? 'आपका नाम (चैनल का नाम)' : 'Full name or Channel name'}
                    </label>
                    {errors.displayName && touched.displayName && (
                      <p className="text-xs text-[#b3261e] dark:text-[#f2b8b5] mt-1 px-1">
                        {errors.displayName}
                      </p>
                    )}
                  </div>

                  {/* Username (@handle) */}
                  <div className="relative">
                    <input
                      id="reg-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                      }}
                      onBlur={() => handleBlur('username')}
                      placeholder=" "
                      className={`peer w-full h-14 px-4 pt-4 pb-1.5 bg-transparent border rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none transition-all ${
                        errors.username && touched.username
                          ? 'border-[#b3261e] focus:border-[#b3261e] focus:ring-1 focus:ring-[#b3261e]'
                          : 'border-[#747775] dark:border-[#8e918f] focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0]'
                      }`}
                    />
                    <label
                      htmlFor="reg-username"
                      className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] dark:peer-placeholder-shown:text-[#8e918f] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0] dark:peer-focus:text-[#a8c7fa]"
                    >
                      {isHindi ? 'यूज़रनेम (उदा. bharat_creator)' : 'Username (e.g. bharat_creator)'}
                    </label>
                    {errors.username && touched.username && (
                      <p className="text-xs text-[#b3261e] dark:text-[#f2b8b5] mt-1 px-1">
                        {errors.username}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      onBlur={() => handleBlur('email')}
                      placeholder=" "
                      className={`peer w-full h-14 px-4 pt-4 pb-1.5 bg-transparent border rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none transition-all ${
                        errors.email && touched.email
                          ? 'border-[#b3261e] focus:border-[#b3261e] focus:ring-1 focus:ring-[#b3261e]'
                          : 'border-[#747775] dark:border-[#8e918f] focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0]'
                      }`}
                    />
                    <label
                      htmlFor="reg-email"
                      className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] dark:peer-placeholder-shown:text-[#8e918f] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0] dark:peer-focus:text-[#a8c7fa]"
                    >
                      {isHindi ? 'ईमेल पता (उदा. yourname@gmail.com)' : 'Email address (e.g. you@gmail.com)'}
                    </label>
                    {errors.email && touched.email && (
                      <p className="text-xs text-[#b3261e] dark:text-[#f2b8b5] mt-1 px-1">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* SIGN IN ONLY: Email or Username */}
              {mode === 'login' && (
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      id="auth-identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: '' }));
                      }}
                      onBlur={() => handleBlur('identifier')}
                      placeholder=" "
                      className={`peer w-full h-14 px-4 pt-4 pb-1.5 bg-transparent border rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none transition-all ${
                        errors.identifier && touched.identifier
                          ? 'border-[#b3261e] focus:border-[#b3261e] focus:ring-1 focus:ring-[#b3261e]'
                          : 'border-[#747775] dark:border-[#8e918f] focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa]'
                      }`}
                    />
                    <label
                      htmlFor="auth-identifier"
                      className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] dark:peer-placeholder-shown:text-[#8e918f] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0] dark:peer-focus:text-[#a8c7fa]"
                    >
                      {isHindi ? 'ईमेल या यूज़रनेम' : 'Email or username'}
                    </label>
                  </div>
                  {errors.identifier && touched.identifier ? (
                    <p className="text-xs text-[#b3261e] dark:text-[#f2b8b5] px-1">
                      {errors.identifier}
                    </p>
                  ) : (
                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('forgot-password')}
                        className="text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:underline cursor-pointer pt-0.5"
                      >
                        {isHindi ? 'ईमेल भूल गए?' : 'Forgot email?'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Password Field */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    onBlur={() => handleBlur('password')}
                    placeholder=" "
                    className={`peer w-full h-14 pl-4 pr-11 pt-4 pb-1.5 bg-transparent border rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none transition-all ${
                      errors.password && touched.password
                        ? 'border-[#b3261e] focus:border-[#b3261e] focus:ring-1 focus:ring-[#b3261e]'
                        : 'border-[#747775] dark:border-[#8e918f] focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa]'
                    }`}
                  />
                  <label
                    htmlFor="auth-password"
                    className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] dark:peer-placeholder-shown:text-[#8e918f] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0] dark:peer-focus:text-[#a8c7fa]"
                  >
                    {mode === 'login' 
                      ? (isHindi ? 'अपना पासवर्ड दर्ज करें' : 'Enter your password') 
                      : (isHindi ? 'पासवर्ड (कम से कम 8 अक्षर)' : 'Password (min 8 chars)')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#747775] hover:text-[#1f1f1f] dark:text-[#8e918f] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && touched.password && (
                  <p className="text-xs text-[#b3261e] dark:text-[#f2b8b5] px-1">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* CREATE ACCOUNT ONLY: Confirm Password */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder=" "
                      className={`peer w-full h-14 pl-4 pr-11 pt-4 pb-1.5 bg-transparent border rounded-[8px] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none transition-all ${
                        errors.confirmPassword && touched.confirmPassword
                          ? 'border-[#b3261e] focus:border-[#b3261e] focus:ring-1 focus:ring-[#b3261e]'
                          : 'border-[#747775] dark:border-[#8e918f] focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0]'
                      }`}
                    />
                    <label
                      htmlFor="reg-confirm-password"
                      className="absolute left-3.5 top-1.5 text-[11px] text-[#444746] dark:text-[#c4c7c5] transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#747775] dark:peer-placeholder-shown:text-[#8e918f] peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-[#0b57d0] dark:peer-focus:text-[#a8c7fa]"
                    >
                      {isHindi ? 'पासवर्ड दोबारा दर्ज करें' : 'Confirm'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#747775] hover:text-[#1f1f1f] dark:text-[#8e918f] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && touched.confirmPassword && (
                    <p className="text-xs text-[#b3261e] dark:text-[#f2b8b5] px-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* SIGN IN: Forgot Password Link */}
              {mode === 'login' && (
                <div className="pt-1 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot-password')}
                    className="font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:underline cursor-pointer"
                  >
                    {isHindi ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
                  </button>

                  {savedAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAccountChooser(true)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {isHindi ? 'सहेजे गए खाते देखें' : 'View saved accounts'}
                    </button>
                  )}
                </div>
              )}

              {/* YouTube / Google Notice: Guest Mode info */}
              <div className="py-2 text-xs text-[#444746] dark:text-[#c4c7c5] leading-relaxed">
                {mode === 'login' ? (
                  isHindi ? (
                    <>
                      क्या यह आपका कंप्यूटर नहीं है? निजी तौर पर साइन इन करने के लिए अतिथि मोड (Guest mode) या गुप्त विंडो का उपयोग करें।
                    </>
                  ) : (
                    <>
                      Not your computer? Use Guest mode or a private browsing window to sign in privately.{' '}
                      <button
                        type="button"
                        onClick={() => navigate('help')}
                        className="text-[#0b57d0] dark:text-[#a8c7fa] font-medium hover:underline cursor-pointer inline"
                      >
                        Learn more
                      </button>
                    </>
                  )
                ) : (
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#0b57d0] focus:ring-[#0b57d0]"
                    />
                    <span className="text-xs text-[#444746] dark:text-[#c4c7c5] leading-tight">
                      {isHindi ? (
                        <>
                          मैं सोशलइंडिया के{' '}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate('terms'); }}
                            className="text-[#0b57d0] dark:text-[#a8c7fa] font-medium hover:underline"
                          >
                            नियमों
                          </button>{' '}
                          और{' '}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate('privacy'); }}
                            className="text-[#0b57d0] dark:text-[#a8c7fa] font-medium hover:underline"
                          >
                            गोपनीयता नीति
                          </button>{' '}
                          से सहमत हूँ।
                        </>
                      ) : (
                        <>
                          I agree to SocialIndia's{' '}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate('terms'); }}
                            className="text-[#0b57d0] dark:text-[#a8c7fa] font-medium hover:underline"
                          >
                            Terms
                          </button>{' '}
                          and{' '}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate('privacy'); }}
                            className="text-[#0b57d0] dark:text-[#a8c7fa] font-medium hover:underline"
                          >
                            Privacy Policy
                          </button>.
                        </>
                      )}
                    </span>
                  </label>
                )}
                {errors.agreeTerms && touched.agreeTerms && (
                  <p className="text-xs text-[#b3261e] dark:text-[#f2b8b5] mt-1">
                    {errors.agreeTerms}
                  </p>
                )}
              </div>

              {/* YouTube / Google Signature Bottom Action Bar */}
              <div className="pt-4 flex items-center justify-between">
                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('register')}
                    className="text-sm font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#0b57d0]/10 dark:hover:bg-[#a8c7fa]/10 px-4 py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    {isHindi ? 'खाता बनाएं' : 'Create account'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className="text-sm font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#0b57d0]/10 dark:hover:bg-[#a8c7fa]/10 px-4 py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    {isHindi ? 'लॉग इन करें' : 'Log in instead'}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-10 px-7 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-98"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>{isHindi ? 'अगला' : 'Next'}</span>
                </button>
              </div>

              {/* Google OAuth Option (Divider + Button) */}
              <div className="pt-3">
                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                  <span className="bg-white dark:bg-[#1e1f20] px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    {isHindi ? 'या' : 'or'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading || googleLoading}
                  className="w-full h-11 bg-white dark:bg-[#1e1f20] hover:bg-slate-50 dark:hover:bg-slate-800 border border-[#747775] dark:border-[#8e918f] rounded-full text-xs sm:text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0b57d0]" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.36 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                  )}
                  <span>
                    {googleLoading 
                      ? (isHindi ? 'Google से जुड़ रहे हैं...' : 'Connecting...') 
                      : (mode === 'login' 
                          ? (isHindi ? 'Google के साथ लॉग इन करें' : 'Log in with Google') 
                          : (isHindi ? 'Google के साथ खाता बनाएं' : 'Sign up with Google'))}
                  </span>
                </button>
              </div>

            </form>
          )}

        </div>
      </main>

      {/* SocialIndia Footer (Language dropdown on Left, Help/Privacy/Terms on Right) */}
      <footer className="w-full max-w-[448px] md:max-w-[480px] mx-auto px-4 sm:px-2 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#444746] dark:text-[#c4c7c5]">
        
        {/* Language selector dropdown */}
        <div className="flex items-center gap-1.5">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            aria-label="Change language"
            className="bg-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800 text-xs text-[#444746] dark:text-[#c4c7c5] py-1.5 px-2.5 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700 cursor-pointer"
          >
            <option value="en" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">English (United States)</option>
            <option value="hi" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">हिन्दी (भारत)</option>
            <option value="bn" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">বাংলা</option>
            <option value="te" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">తెలుగు</option>
            <option value="mr" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">मराठी</option>
            <option value="ta" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">தமிழ்</option>
            <option value="gu" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">ગુજરાતી</option>
            <option value="kn" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">ಕನ್ನಡ</option>
            <option value="ml" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">മലയാളം</option>
            <option value="pa" className="dark:bg-[#1e1f20] text-slate-900 dark:text-white">ਪੰਜਾਬੀ</option>
          </select>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('help')}
            className="hover:text-[#1f1f1f] dark:hover:text-white transition-colors cursor-pointer"
          >
            {isHindi ? 'सहायता' : 'Help'}
          </button>
          <button
            type="button"
            onClick={() => navigate('privacy')}
            className="hover:text-[#1f1f1f] dark:hover:text-white transition-colors cursor-pointer"
          >
            {isHindi ? 'गोपनीयता' : 'Privacy'}
          </button>
          <button
            type="button"
            onClick={() => navigate('terms')}
            className="hover:text-[#1f1f1f] dark:hover:text-white transition-colors cursor-pointer"
          >
            {isHindi ? 'शर्तें' : 'Terms'}
          </button>
        </div>
      </footer>

    </div>
  );
};
