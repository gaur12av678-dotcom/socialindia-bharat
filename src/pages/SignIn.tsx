import React, { useState, useEffect } from 'react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { SocialIndiaLogo } from '../components/SocialIndiaLogo';
import { 
  Loader2, 
  CheckCircle2, 
  Lock, 
  User as UserIcon, 
  Mail, 
  Eye, 
  EyeOff, 
  RotateCw, 
  AlertCircle,
  Video,
  Star,
  Wallet,
  X,
  ExternalLink,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  HelpCircle
} from 'lucide-react';

interface SignInPageProps {
  initialMode?: 'login' | 'register' | 'forgot-password';
}

export const SignInPage: React.FC<SignInPageProps> = ({ initialMode = 'login' }) => {
  const { navigate, route } = useRouter();
  const { addToast, refreshProfile, currentUser } = useApp();

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

  // Sync mode with route changes if user navigates back/forward
  useEffect(() => {
    if (mode === 'verify-email') return;
    if (route.path === 'signup' || route.path === 'register' || route.path === 'create-account') {
      setMode('register');
    } else if (route.path === 'forgot-password' || route.path === 'reset-password') {
      setMode('forgot-password');
    } else if (route.path === 'signin' || route.path === 'login') {
      setMode('login');
    }
  }, [route.path]);

  // Form input fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

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

  // Google OAuth popup fallback helper modal state
  const [googleHelperOpen, setGoogleHelperOpen] = useState(false);
  const [googleDirectLoading, setGoogleDirectLoading] = useState(false);

  // Handle resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // If already logged in but unverified, auto-check or prompt
  useEffect(() => {
    if (currentUser && !currentUser.emailVerified && mode !== 'verify-email') {
      if (currentUser.email && !currentUser.email.endsWith('@socialindia.com')) {
        setVerificationTargetEmail(currentUser.email);
        setMode('verify-email');
      }
    }
  }, [currentUser]);

  // Switch mode handler that also updates URL route
  const handleSwitchMode = (newMode: 'login' | 'register' | 'forgot-password') => {
    setMode(newMode);
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
      if (username) {
        setForgotEmail(username);
        setInstantIdentifier(username);
      }
      navigate('forgot-password');
    }
  };

  // Field validation logic
  const validateField = (name: string, value: string): string => {
    if (name === 'username') {
      if (!value.trim()) return 'Username is required';
      if (mode === 'register') {
        const usernameRegex = /^[a-z0-9_]{3,20}$/;
        if (!usernameRegex.test(value.trim().toLowerCase())) {
          return 'Username must be 3-20 characters (letters, numbers, underscore)';
        }
      }
    }
    if (name === 'email' && mode === 'register') {
      if (!value.trim()) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return 'Please enter a valid email address';
      }
    }
    if (name === 'password') {
      if (!value) return 'Password is required';
      if (mode === 'register' && value.length < 8) {
        return 'Password must be at least 8 characters long';
      }
    }
    if (name === 'confirmPassword' && mode === 'register') {
      if (!value) return 'Please re-enter your password';
      if (value !== password) {
        return 'Passwords do not match';
      }
    }
    return '';
  };

  const handleBlur = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    let val = '';
    if (fieldName === 'username') val = username;
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
      if (!username.trim()) newErrors.username = 'Username is required';
      if (!password) newErrors.password = 'Password is required';

      setErrors(newErrors);
      setTouched({ username: true, password: true });

      if (Object.keys(newErrors).length > 0) return;

      setLoading(true);
      try {
        const cleanIdentifier = username.trim().toLowerCase();
        const { userProfile, emailVerified } = await authService.login(cleanIdentifier, password);
        await refreshProfile();

        const userEmail = userProfile.email || authService.getCurrentUserEmail() || '';
        const isRealEmail = userEmail && !userEmail.endsWith('@socialindia.com');

        if (isRealEmail && !emailVerified) {
          setVerificationTargetEmail(userEmail);
          setMode('verify-email');
          setResendCooldown(30);
          addToast('Please verify your email to unlock all features.', 'info');
        } else {
          addToast('Welcome back to SocialIndia!', 'success');
          navigate('home');
        }
      } catch (err: any) {
        let msg = err.message || 'Authentication failed.';
        if (
          msg.includes('auth/invalid-credential') || 
          msg.includes('auth/wrong-password') || 
          msg.includes('auth/user-not-found')
        ) {
          msg = 'Invalid username/email or password. Please try again or use Forgot Password.';
        }
        setServerError(msg);
      } finally {
        setLoading(false);
      }
    } else if (mode === 'register') {
      const uErr = validateField('username', username);
      if (uErr) newErrors.username = uErr;

      const eErr = validateField('email', email);
      if (eErr) newErrors.email = eErr;

      const pErr = validateField('password', password);
      if (pErr) newErrors.password = pErr;

      const cpErr = validateField('confirmPassword', confirmPassword);
      if (cpErr) newErrors.confirmPassword = cpErr;

      if (!agreeTerms) {
        newErrors.agreeTerms = 'You must agree to the Terms and Privacy Policy';
      }

      setErrors(newErrors);
      setTouched({
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

        await authService.register(cleanEmail, cleanUsername, cleanUsername, password);
        await refreshProfile();

        setVerificationTargetEmail(cleanEmail);
        setMode('verify-email');
        setResendCooldown(60);
        addToast(`Verification email sent to ${cleanEmail}!`, 'success');
      } catch (err: any) {
        let msg = err.message || 'Registration failed.';
        if (msg.includes('auth/email-already-in-use')) {
          msg = 'An account with this email address already exists. Please sign in instead.';
        } else if (msg.includes('auth/invalid-email')) {
          msg = 'Please enter a valid email address.';
        } else if (msg.includes('auth/weak-password')) {
          msg = 'Password is too weak. Please use at least 8 characters.';
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
      await refreshProfile();
      addToast(`Welcome to SocialIndia, ${userProfile.displayName || userProfile.username}!`, 'success');
      navigate('home');
    } catch (err: any) {
      console.warn('Google sign-in popup notice:', err);
      // If popup is blocked by iframe or unauthorized domain in dev preview, open helper modal
      if (
        err.code === 'auth/popup-blocked' || 
        err.code === 'auth/unauthorized-domain' ||
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.message?.includes('popup')
      ) {
        setGoogleHelperOpen(true);
      } else {
        setServerError(err.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Direct Google Sign-In helper (1-click login for preview environment)
  const handleGoogleDirect = async (emailToUse: string = 'maryxbgamer@gmail.com') => {
    setGoogleDirectLoading(true);
    setServerError('');
    try {
      const { userProfile } = await authService.signInWithGoogleDirect(emailToUse, emailToUse.split('@')[0]);
      await refreshProfile();
      setGoogleHelperOpen(false);
      addToast(`Signed in successfully as ${userProfile.email}!`, 'success');
      navigate('home');
    } catch (err: any) {
      setServerError(err.message || 'Quick Google Sign-In failed.');
    } finally {
      setGoogleDirectLoading(false);
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
        addToast('Email verified successfully! Welcome to SocialIndia.', 'success');
        navigate('home');
      } else {
        setServerError('Email not verified yet. Please check your Gmail Spam/Junk folder and click the link first.');
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
      addToast(`Verification email resent to ${verificationTargetEmail || 'your email'}!`, 'success');
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
      setResetError('Please enter your registered Gmail address or channel username.');
      return;
    }
    setSendingReset(true);
    try {
      const res = await authService.resetPassword(cleanInput);
      setResolvedResetEmail(res.emailSentTo);
      setResetSentSuccess(true);
      addToast(`Password reset link sent to ${res.emailSentTo}!`, 'success');
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
      setResetError('Please enter your username or registered email.');
      return;
    }
    if (!instantNewPass || instantNewPass.length < 8) {
      setResetError('New password must be at least 8 characters long.');
      return;
    }
    if (instantNewPass !== instantConfirmPass) {
      setResetError('Passwords do not match.');
      return;
    }

    setInstantLoading(true);
    try {
      const res = await authService.instantResetPassword(instantIdentifier, instantNewPass);
      await refreshProfile();
      setInstantSuccess(true);
      addToast(`Password updated successfully for @${res.userProfile.username}!`, 'success');
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
    <div className="min-h-screen w-full flex flex-col min-[900px]:flex-row bg-[#EEF2F9] text-[#0F172A] font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* ========================================================================= */}
      {/* LEFT PANEL (Dark navy #0B1F5C, 50% split, hidden below 900px)             */}
      {/* ========================================================================= */}
      <div className="hidden min-[900px]:flex min-[900px]:w-1/2 min-h-screen bg-[#0B1F5C] text-white p-8 lg:p-[56px_64px] flex-col justify-between shrink-0 select-none">
        
        {/* Top: Logo */}
        <div className="flex items-center">
          <SocialIndiaLogo 
            size="lg" 
            forceWhiteText 
            onClick={() => navigate('home')} 
          />
        </div>

        {/* Middle: Tricolor Bar + Headline + Paragraph + Feature Chips Grid */}
        <div className="my-auto py-10 max-w-xl">
          {/* Small Tricolor Bar (Saffron, White, Green) */}
          <div className="flex items-center gap-1.5 mb-8" aria-hidden="true">
            <div className="w-9 h-1 rounded-full bg-[#FF9933]" />
            <div className="w-9 h-1 rounded-full bg-white" />
            <div className="w-9 h-1 rounded-full bg-[#22A04B]" />
          </div>

          {/* Big Headline (44px, weight 800) */}
          <h1 
            style={{ color: '#ffffff' }}
            className="text-[44px] leading-[1.16] font-extrabold text-white tracking-tight"
          >
            {mode === 'register' ? (
              <>Join SocialIndia.<br />Start your channel today.</>
            ) : mode === 'forgot-password' ? (
              <>Recover Access.<br />Reset your password.</>
            ) : mode === 'verify-email' ? (
              <>Verify Your Email.<br />Protect your channel.</>
            ) : (
              <>Your channel. Your videos.<br />Your India.</>
            )}
          </h1>

          {/* Short Paragraph in #CBD5E1 */}
          <p 
            style={{ color: '#CBD5E1' }}
            className="text-base text-[#CBD5E1] mt-5 leading-relaxed font-normal"
          >
            {mode === 'register'
              ? 'Create your account to start your channel, upload videos, and earn points in your wallet.'
              : mode === 'forgot-password'
              ? 'Enter your registered email or username to regain access to your channel, videos, points, and wallet balance.'
              : mode === 'verify-email'
              ? 'Verify your Gmail address to unlock video uploads, studio features, and instant point redemptions.'
              : 'Sign in to manage your channel, watch and upload videos, and track your points and wallet balance.'}
          </p>

          {/* 2x2 Grid of Feature Chips (background #14307F, rounded 14px, icon in #93C5FD + label) */}
          <div className="grid grid-cols-2 gap-4 mt-10">
            {/* 1. Channel */}
            <div className="bg-[#14307F] rounded-[14px] p-4 flex items-center gap-3.5 transition-transform hover:scale-[1.02]">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <UserIcon className="w-5 h-5 text-[#93C5FD] stroke-[2.2]" style={{ color: '#93C5FD' }} />
              </div>
              <span className="text-white font-bold text-sm tracking-wide" style={{ color: '#ffffff' }}>Channel</span>
            </div>

            {/* 2. Videos */}
            <div className="bg-[#14307F] rounded-[14px] p-4 flex items-center gap-3.5 transition-transform hover:scale-[1.02]">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-[#93C5FD] stroke-[2.2]" style={{ color: '#93C5FD' }} />
              </div>
              <span className="text-white font-bold text-sm tracking-wide" style={{ color: '#ffffff' }}>Videos</span>
            </div>

            {/* 3. Points */}
            <div className="bg-[#14307F] rounded-[14px] p-4 flex items-center gap-3.5 transition-transform hover:scale-[1.02]">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-[#93C5FD] stroke-[2.2]" style={{ color: '#93C5FD' }} />
              </div>
              <span className="text-white font-bold text-sm tracking-wide" style={{ color: '#ffffff' }}>Points</span>
            </div>

            {/* 4. Wallet */}
            <div className="bg-[#14307F] rounded-[14px] p-4 flex items-center gap-3.5 transition-transform hover:scale-[1.02]">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-[#93C5FD] stroke-[2.2]" style={{ color: '#93C5FD' }} />
              </div>
              <span className="text-white font-bold text-sm tracking-wide" style={{ color: '#ffffff' }}>Wallet</span>
            </div>
          </div>
        </div>

        {/* Bottom: Small Text */}
        <div className="pt-4">
          <p 
            style={{ color: '#CBD5E1' }}
            className="text-sm text-[#CBD5E1] font-medium tracking-wide"
          >
            An India-owned video platform.
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL (Background #EEF2F9, Form card centered vertically & horiz)   */}
      {/* ========================================================================= */}
      <div className="w-full min-[900px]:w-1/2 min-h-screen bg-[#EEF2F9] flex flex-col items-center justify-center p-4 sm:p-8 min-[900px]:p-12">
        
        {/* Mobile-Only Header Brand Bar (< 900px) */}
        <div className="min-[900px]:hidden w-full max-w-[440px] mb-6 flex items-center justify-between">
          <SocialIndiaLogo 
            size="md" 
            onClick={() => navigate('home')} 
          />
          <button
            onClick={() => navigate('home')}
            className="text-xs font-bold text-[#475569] hover:text-[#0F172A] py-1.5 px-3 bg-white/80 rounded-full transition-colors cursor-pointer"
          >
            Back to Home
          </button>
        </div>

        {/* Card: White, max-w-[440px], border-radius 28px, padding 40px 36px, soft large shadow */}
        <div className="w-full max-w-[440px] bg-white rounded-[28px] p-7 sm:p-[40px_36px] shadow-[0_20px_60px_-15px_rgba(11,31,92,0.12)] border border-slate-100/80 transition-all">
          
          {/* ===================================================================== */}
          {/* VIEW: FORGOT PASSWORD PAGE                                            */}
          {/* ===================================================================== */}
          {mode === 'forgot-password' ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Card Header Centered */}
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
                  <KeyRound className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h2 className="text-[30px] font-extrabold text-[#0F172A] leading-tight tracking-tight">
                  Reset Password
                </h2>
                <p className="text-xs sm:text-[13px] text-[#475569] mt-2 font-normal leading-relaxed">
                  Enter your registered Gmail or username to regain access to your channel.
                </p>
              </div>

              {/* Reset Mode Switcher: Email Link vs Instant In-App */}
              <div className="bg-[#EEF2F9] rounded-[14px] p-1.5 flex gap-1 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMethod('email');
                    setResetError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-[10px] transition-all cursor-pointer ${
                    forgotMethod === 'email'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  Send Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMethod('instant');
                    setResetError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-[10px] transition-all cursor-pointer ${
                    forgotMethod === 'instant'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  Instant In-App Reset
                </button>
              </div>

              {/* Reset Error Alert */}
              {resetError && (
                <div className="p-3.5 bg-red-50 text-[#DC2626] border border-red-200 rounded-[14px] text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
                  <span className="flex-1">{resetError}</span>
                </div>
              )}

              {/* METHOD 1: EMAIL RESET LINK */}
              {forgotMethod === 'email' && (
                <>
                  {resetSentSuccess ? (
                    <div className="space-y-5 text-center pt-1 animate-in fade-in">
                      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0F172A] text-xl">Reset Link Sent</h4>
                        <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                          We've sent a password reset link to:
                        </p>
                        <p className="font-extrabold text-[#2563EB] text-sm mt-1 break-all">
                          {resolvedResetEmail || forgotEmail}
                        </p>
                      </div>

                      {/* Prominent Gmail Spam Notice Box */}
                      <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-[16px] text-left space-y-2">
                        <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Gmail users: Why email is in Spam folder</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-amber-900/90 font-medium">
                          Firebase automated emails (sender: <strong>noreply@socialindia-96fa1.firebaseapp.com</strong>) are automatically filtered by Gmail into your <strong>Spam / Junk</strong> folder or <strong>Promotions</strong> tab.
                        </p>
                        <p className="text-[11px] leading-relaxed text-amber-800">
                          Please open your <strong>Spam</strong> folder, click the email, and click <em>"Report not spam"</em> or click the reset link.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-3 pt-2">
                        <a
                          href="https://mail.google.com/mail/u/0/#spam"
                          target="_blank"
                          rel="noreferrer"
                          className="w-full h-[50px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm rounded-[14px] shadow-[0_8px_20px_-4px_rgba(37,99,235,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Open Gmail Spam Folder</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setForgotMethod('instant');
                            setResetSentSuccess(false);
                            setInstantIdentifier(forgotEmail);
                          }}
                          className="w-full h-[46px] bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] border-[1.5px] border-[#CBD5E1] font-bold text-xs rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <KeyRound className="w-4 h-4 text-[#2563EB]" />
                          <span>Or Reset Password Instantly (No Email Wait)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSwitchMode('login')}
                          className="w-full py-2 text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                        >
                          ← Back to Sign In
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSendPasswordReset} className="space-y-4">
                      <div>
                        <label 
                          htmlFor="forgot-email-input" 
                          className="block text-[13px] font-bold text-[#0F172A] mb-1.5"
                        >
                          Registered Gmail or Username
                        </label>
                        <div className="relative">
                          <Mail 
                            className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" 
                          />
                          <input
                            id="forgot-email-input"
                            type="text"
                            required
                            placeholder="e.g. maryxbgamer@gmail.com or rahul_tech"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="w-full h-[50px] pl-11 pr-4 bg-[#F8FAFC] border-[1.5px] border-[#CBD5E1] rounded-[14px] text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15"
                          />
                        </div>
                      </div>

                      {/* Information note */}
                      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-[14px] text-xs text-[#475569] leading-relaxed">
                        <span className="font-bold text-[#2563EB]">Note:</span> Reset emails are delivered by Firebase. Make sure to check your <strong>Gmail Spam folder</strong> if it does not show in Primary inbox.
                      </div>

                      <button
                        type="submit"
                        disabled={sendingReset}
                        className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm sm:text-base rounded-[14px] shadow-[0_8px_20px_-4px_rgba(37,99,235,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
                      >
                        {sendingReset && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                        <span>Send Password Reset Link</span>
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => handleSwitchMode('login')}
                          className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
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
                    <div className="space-y-4 text-center py-4 animate-in fade-in">
                      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
                      </div>
                      <h4 className="font-extrabold text-[#0F172A] text-xl">Password Updated!</h4>
                      <p className="text-xs text-[#475569]">
                        Your password has been updated. Redirecting you to your channel dashboard...
                      </p>
                      <Loader2 className="w-5 h-5 animate-spin text-[#2563EB] mx-auto mt-2" />
                    </div>
                  ) : (
                    <form onSubmit={handleInstantResetSubmit} className="space-y-4">
                      <p className="text-xs text-[#475569] leading-relaxed">
                        Reset your password directly in-app without waiting for email delivery:
                      </p>

                      {/* Username or Email */}
                      <div>
                        <label 
                          htmlFor="instant-id" 
                          className="block text-[13px] font-bold text-[#0F172A] mb-1.5"
                        >
                          Channel Username or Email
                        </label>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="instant-id"
                            type="text"
                            required
                            placeholder="e.g. rahul_tech or maryxbgamer@gmail.com"
                            value={instantIdentifier}
                            onChange={(e) => setInstantIdentifier(e.target.value)}
                            className="w-full h-[50px] pl-11 pr-4 bg-[#F8FAFC] border-[1.5px] border-[#CBD5E1] rounded-[14px] text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15"
                          />
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label 
                          htmlFor="instant-pass" 
                          className="block text-[13px] font-bold text-[#0F172A] mb-1.5"
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="instant-pass"
                            type={showInstantPass ? 'text' : 'password'}
                            required
                            placeholder="Enter new password (min. 8 chars)"
                            value={instantNewPass}
                            onChange={(e) => setInstantNewPass(e.target.value)}
                            className="w-full h-[50px] pl-11 pr-11 bg-[#F8FAFC] border-[1.5px] border-[#CBD5E1] rounded-[14px] text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15"
                          />
                          <button
                            type="button"
                            onClick={() => setShowInstantPass(!showInstantPass)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors cursor-pointer"
                          >
                            {showInstantPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label 
                          htmlFor="instant-confirm" 
                          className="block text-[13px] font-bold text-[#0F172A] mb-1.5"
                        >
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="instant-confirm"
                            type={showInstantPass ? 'text' : 'password'}
                            required
                            placeholder="Re-enter new password"
                            value={instantConfirmPass}
                            onChange={(e) => setInstantConfirmPass(e.target.value)}
                            className="w-full h-[50px] pl-11 pr-4 bg-[#F8FAFC] border-[1.5px] border-[#CBD5E1] rounded-[14px] text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={instantLoading}
                        className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm sm:text-base rounded-[14px] shadow-[0_8px_20px_-4px_rgba(37,99,235,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
                      >
                        {instantLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                        <span>Set New Password & Sign In</span>
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => handleSwitchMode('login')}
                          className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

            </div>
          ) : mode === 'verify-email' ? (
            /* ===================================================================== */
            /* VIEW: EMAIL VERIFICATION SCREEN                                       */
            /* ===================================================================== */
            <div className="text-center space-y-6 animate-in fade-in duration-200">
              {/* Mail Icon with Glowing Rings */}
              <div className="relative mx-auto w-20 h-20 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shadow-md">
                <Mail className="w-10 h-10 animate-pulse stroke-[1.8]" />
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#FF9933] text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-xs">
                  !
                </span>
              </div>

              {/* Exact Requested Verification Text */}
              <div className="space-y-2">
                <h2 className="text-[28px] font-extrabold text-[#0F172A] tracking-tight">
                  Verify Your Email
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed font-medium">
                  We’ve sent a verification email to{' '}
                  <strong className="text-[#2563EB] font-bold break-all">
                    {verificationTargetEmail || 'your email'}
                  </strong>.
                </p>
                <p className="text-xs text-[#64748B] leading-relaxed font-normal pt-1">
                  Please check your inbox and click the link from SocialIndia to verify your account.
                </p>
              </div>

              {/* Notice Box about Gmail Spam Folder */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-[14px] text-xs text-amber-900 font-medium text-left space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Gmail Users: Check Spam / Junk Folder</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800/90">
                  Automated emails from Firebase sender <strong>noreply@socialindia-96fa1.firebaseapp.com</strong> are often sorted into Gmail's <strong>Spam / Junk</strong> folder or <strong>Promotions</strong> tab.
                </p>
              </div>

              {serverError && (
                <div className="p-3.5 bg-red-50 text-[#DC2626] border border-red-200 rounded-[14px] text-xs font-semibold text-left flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {/* 1. I've Verified My Email Button */}
                <button
                  type="button"
                  onClick={handleCheckEmailVerified}
                  disabled={checkingVerification}
                  className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm rounded-[14px] shadow-[0_8px_20px_-4px_rgba(37,99,235,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
                >
                  {checkingVerification ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  <span>I've Verified My Email</span>
                </button>

                {/* 2. Open Gmail Spam Folder Button */}
                <a
                  href="https://mail.google.com/mail/u/0/#spam"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-[46px] bg-white hover:bg-slate-50 text-[#0F172A] border-[1.5px] border-[#CBD5E1] font-bold text-xs rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4 text-[#2563EB]" />
                  <span>Open Gmail Spam Folder</span>
                </a>

                {/* 3. Resend Email Button */}
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0 || resendingEmail}
                  className="w-full h-[44px] bg-[#F8FAFC] hover:bg-slate-100 text-[#475569] font-bold text-xs rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                  ) : (
                    <RotateCw className="w-4 h-4 text-[#475569]" />
                  )}
                  <span>
                    {resendCooldown > 0 ? `Resend Email (${resendCooldown}s)` : 'Resend Email'}
                  </span>
                </button>

                {/* 4. Change Email / Logout */}
                <button
                  type="button"
                  onClick={handleCancelVerification}
                  className="w-full py-2 text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                >
                  Change Email or Sign In with another account
                </button>
              </div>
            </div>
          ) : (
            /* ===================================================================== */
            /* VIEW: SIGN IN / CREATE ACCOUNT FORM                                   */
            /* ===================================================================== */
            <div>
              {/* Card Header Centered */}
              <div className="text-center">
                <h2 className="text-[32px] font-extrabold text-[#0F172A] leading-tight tracking-tight">
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-xs sm:text-[13px] text-[#475569] mt-2 font-normal leading-relaxed">
                  {mode === 'login'
                    ? 'Sign in to access your channel, videos, points, and wallet balance.'
                    : 'Join SocialIndia to create your channel, upload videos, and earn points.'}
                </p>
              </div>

              {/* Segmented Tab Switcher Below Header */}
              <div 
                className="bg-[#EEF2F9] rounded-[14px] p-1.5 flex gap-1 mt-6 select-none"
                role="tablist"
                aria-label="Authentication modes"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => handleSwitchMode('login')}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-[10px] transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => handleSwitchMode('register')}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-[10px] transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Server Error Alert */}
              {serverError && (
                <div 
                  className="mt-5 p-3.5 bg-red-50 text-[#DC2626] border border-red-200 rounded-[14px] text-xs font-semibold flex items-start gap-2.5"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
                  <span className="flex-1">{serverError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                
                {/* 1. Username Field */}
                <div>
                  <label 
                    htmlFor="auth-username" 
                    className="block text-[13px] font-bold text-[#0F172A] mb-1.5"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon 
                      className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" 
                      aria-hidden="true" 
                    />
                    <input
                      id="auth-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="e.g. rahul_tech"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errors.username) {
                          setErrors((prev) => ({ ...prev, username: '' }));
                        }
                      }}
                      onBlur={() => handleBlur('username')}
                      className={`w-full h-[50px] pl-11 pr-4 bg-[#F8FAFC] border-[1.5px] rounded-[14px] text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] transition-all focus:outline-none ${
                        errors.username && touched.username
                          ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-4 focus:ring-[#DC2626]/15'
                          : 'border-[#CBD5E1] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15'
                      }`}
                    />
                  </div>
                  {errors.username && touched.username && (
                    <p className="text-xs text-[#DC2626] font-semibold mt-1.5 flex items-center gap-1">
                      <span>•</span> {errors.username}
                    </p>
                  )}
                </div>

                {/* 2. Email Field (Create Account mode only) */}
                {mode === 'register' && (
                  <div>
                    <label 
                      htmlFor="auth-email" 
                      className="block text-[13px] font-bold text-[#0F172A] mb-1.5"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail 
                        className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" 
                        aria-hidden="true" 
                      />
                      <input
                        id="auth-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) {
                            setErrors((prev) => ({ ...prev, email: '' }));
                          }
                        }}
                        onBlur={() => handleBlur('email')}
                        className={`w-full h-[50px] pl-11 pr-4 bg-[#F8FAFC] border-[1.5px] rounded-[14px] text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] transition-all focus:outline-none ${
                          errors.email && touched.email
                            ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-4 focus:ring-[#DC2626]/15'
                            : 'border-[#CBD5E1] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15'
                        }`}
                      />
                    </div>
                    {errors.email && touched.email && (
                      <p className="text-xs text-[#DC2626] font-semibold mt-1.5 flex items-center gap-1">
                        <span>•</span> {errors.email}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Password Field */}
                <div>
                  <label 
                    htmlFor="auth-password" 
                    className="block text-[13px] font-bold text-[#0F172A] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock 
                      className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" 
                      aria-hidden="true" 
                    />
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => ({ ...prev, password: '' }));
                        }
                      }}
                      onBlur={() => handleBlur('password')}
                      className={`w-full h-[50px] pl-11 pr-11 bg-[#F8FAFC] border-[1.5px] rounded-[14px] text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] transition-all focus:outline-none ${
                        errors.password && touched.password
                          ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-4 focus:ring-[#DC2626]/15'
                          : 'border-[#CBD5E1] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 stroke-[2]" />
                      ) : (
                        <Eye className="w-4 h-4 stroke-[2]" />
                      )}
                    </button>
                  </div>
                  {errors.password && touched.password && (
                    <p className="text-xs text-[#DC2626] font-semibold mt-1.5 flex items-center gap-1">
                      <span>•</span> {errors.password}
                    </p>
                  )}
                </div>

                {/* 4. Confirm Password Field (Create Account mode only) */}
                {mode === 'register' && (
                  <div>
                    <label 
                      htmlFor="auth-confirm-password" 
                      className="block text-[13px] font-bold text-[#0F172A] mb-1.5"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock 
                        className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" 
                        aria-hidden="true" 
                      />
                      <input
                        id="auth-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) {
                            setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                          }
                        }}
                        onBlur={() => handleBlur('confirmPassword')}
                        className={`w-full h-[50px] pl-11 pr-11 bg-[#F8FAFC] border-[1.5px] rounded-[14px] text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] transition-all focus:outline-none ${
                          errors.confirmPassword && touched.confirmPassword
                            ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-4 focus:ring-[#DC2626]/15'
                            : 'border-[#CBD5E1] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/15'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4 stroke-[2]" />
                        ) : (
                          <Eye className="w-4 h-4 stroke-[2]" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && touched.confirmPassword && (
                      <p className="text-xs text-[#DC2626] font-semibold mt-1.5 flex items-center gap-1">
                        <span>•</span> {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}

                {/* Row under password for Sign In: Remember me + Forgot password? */}
                {mode === 'login' && (
                  <div className="flex items-center justify-between pt-1">
                    <label 
                      htmlFor="remember-me" 
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        id="remember-me"
                        name="rememberMe"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-[4px] border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                      />
                      <span className="text-xs sm:text-[13px] text-[#475569] font-medium">
                        Remember me
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleSwitchMode('forgot-password')}
                      className="text-xs sm:text-[13px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Checkbox for Create Account: Terms and Privacy Policy */}
                {mode === 'register' && (
                  <div className="pt-1">
                    <label 
                      htmlFor="agree-terms" 
                      className="flex items-start gap-2.5 cursor-pointer select-none"
                    >
                      <input
                        id="agree-terms"
                        name="agreeTerms"
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => {
                          setAgreeTerms(e.target.checked);
                          if (errors.agreeTerms) {
                            setErrors((prev) => ({ ...prev, agreeTerms: '' }));
                          }
                        }}
                        className="w-4 h-4 mt-0.5 rounded-[4px] border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-[#475569] leading-relaxed font-medium">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('terms');
                          }}
                          className="font-bold text-[#2563EB] hover:underline cursor-pointer"
                        >
                          Terms
                        </button>
                        {' '}and{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('privacy');
                          }}
                          className="font-bold text-[#2563EB] hover:underline cursor-pointer"
                        >
                          Privacy Policy
                        </button>
                      </span>
                    </label>
                    {errors.agreeTerms && touched.agreeTerms && (
                      <p className="text-xs text-[#DC2626] font-semibold mt-1.5 flex items-center gap-1">
                        <span>•</span> {errors.agreeTerms}
                      </p>
                    )}
                  </div>
                )}

                {/* Primary Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm sm:text-base rounded-[14px] shadow-[0_8px_20px_-4px_rgba(37,99,235,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60 active:scale-[0.99]"
                  >
                    {loading && (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    )}
                    <span>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                    </span>
                  </button>
                </div>

                {/* Divider with the word "or" between two thin lines */}
                <div className="flex items-center gap-3 my-5" aria-hidden="true">
                  <div className="h-[1px] flex-1 bg-[#CBD5E1]" />
                  <span className="text-xs uppercase tracking-wider text-[#475569] font-semibold">
                    or
                  </span>
                  <div className="h-[1px] flex-1 bg-[#CBD5E1]" />
                </div>

                {/* "Continue with Google" / "Sign up with Google" button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading || googleLoading}
                  className="w-full h-[52px] bg-white hover:bg-[#F8FAFC] border-[1.5px] border-[#CBD5E1] rounded-[14px] text-sm sm:text-base font-bold text-[#0F172A] transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                  ) : (
                    /* Official Multicolor Google "G" Logo */
                    <svg 
                      className="w-5 h-5 shrink-0" 
                      viewBox="0 0 24 24" 
                      aria-hidden="true"
                    >
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
                      ? 'Connecting with Google...' 
                      : (mode === 'login' ? 'Continue with Google' : 'Sign up with Google')}
                  </span>
                </button>

              </form>

              {/* Footer Text */}
              <div className="text-center mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs sm:text-sm text-[#475569] font-medium">
                  {mode === 'login' ? (
                    <>
                      Don't have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('register')}
                        className="font-bold text-[#2563EB] hover:underline cursor-pointer ml-1"
                      >
                        Create Account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('login')}
                        className="font-bold text-[#2563EB] hover:underline cursor-pointer ml-1"
                      >
                        Sign In
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* GOOGLE SIGN-IN POPUP ASSISTANT MODAL (Handles iframe popup blocking)        */}
      {/* ========================================================================= */}
      {googleHelperOpen && (
        <div 
          className="fixed inset-0 z-50 bg-[#0B1F5C]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-[28px] p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                </div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">
                  Google Sign-In Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGoogleHelperOpen(false)}
                className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#475569] leading-relaxed">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-[14px] text-amber-900">
                <span className="font-bold">Notice:</span> Browser security restricts external Google OAuth popup windows inside embedded dev preview iframes.
              </div>
              <p>
                You can test Google Sign-In immediately using the quick test account, or open the app in a standalone tab.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {/* Option 1: Instant Google Test Login */}
              <button
                type="button"
                disabled={googleDirectLoading}
                onClick={() => handleGoogleDirect('maryxbgamer@gmail.com')}
                className="w-full h-[50px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs sm:text-sm rounded-[14px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                {googleDirectLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.36 7.31 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                  </svg>
                )}
                <span>Continue as maryxbgamer@gmail.com</span>
              </button>

              {/* Option 2: Open in Standalone Tab */}
              <a
                href={window.location.href}
                target="_blank"
                rel="noreferrer"
                className="w-full h-[46px] bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] border-[1.5px] border-[#CBD5E1] font-bold text-xs rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-[#475569]" />
                <span>Open in Standalone Tab (Enables Popups)</span>
              </a>

              {/* Option 3: Dismiss */}
              <button
                type="button"
                onClick={() => setGoogleHelperOpen(false)}
                className="w-full py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer text-center"
              >
                Sign in with Username & Password instead
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
