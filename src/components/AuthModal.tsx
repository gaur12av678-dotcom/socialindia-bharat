import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { accountService } from '../services/accountService';
import { SocialIndiaLogo } from './SocialIndiaLogo';
import { X, Lock, User as UserIcon, Mail, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import { useTranslation } from '../i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useApp();
  const { t, isHindi } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (!isLogin) {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setErrorMsg('Please enter a valid email address (e.g. yourname@gmail.com).');
        return;
      }
      const usernameRegex = /^[a-z0-9_]{3,20}$/;
      if (!usernameRegex.test(cleanUsername)) {
        setErrorMsg('Username must be 3-20 characters (lowercase letters, numbers, underscores only).');
        return;
      }
      if (!displayName.trim()) {
        setErrorMsg('Please enter a display name.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      if (!acceptPolicy) {
        setErrorMsg('You must accept the Privacy Policy and Terms.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const { userProfile, emailVerified } = await authService.login(cleanUsername, password);
        accountService.saveAccount(userProfile, password, 'password');
        if (cleanUsername.includes('@') && !emailVerified) {
          setIsVerifying(true);
          setResendCooldown(30);
          addToast('Please verify your email address.', 'info');
        } else {
          addToast('Welcome back to SocialIndia!', 'success');
          onClose();
          if (onSuccess) onSuccess();
        }
      } else {
        const { userProfile } = await authService.register(email.trim().toLowerCase(), cleanUsername, displayName, password);
        accountService.saveAccount(userProfile, password, 'password');
        setIsVerifying(true);
        setResendCooldown(60);
        addToast(`Verification email sent to ${email.trim()}!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      let friendlyError = err.message || 'Authentication failed.';
      if (friendlyError.includes('auth/invalid-credential') || friendlyError.includes('auth/wrong-password') || friendlyError.includes('auth/user-not-found')) {
        friendlyError = 'Incorrect email/username or password.';
      } else if (friendlyError.includes('auth/email-already-in-use')) {
        friendlyError = 'This email is already registered. Please sign in instead.';
      } else if (friendlyError.includes('username-already-in-use') || friendlyError.includes('taken')) {
        friendlyError = 'This username is already taken. Please try another one.';
      }
      setErrorMsg(friendlyError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckVerified = async () => {
    setSubmitting(true);
    try {
      const verified = await authService.checkEmailVerified();
      if (verified) {
        addToast('🎉 Email verified successfully! Welcome to SocialIndia.', 'success');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg('Email not verified yet. Please click the verification link in your email inbox first.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not verify email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authService.sendVerificationEmail();
      setResendCooldown(60);
      addToast('Verification email resent! Please check your inbox (and spam folder).', 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-zoom-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {isVerifying ? (
            <div className="space-y-5 text-center animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center text-[#0070f3] dark:text-[#00d2ff] mx-auto shadow-md">
                <Mail className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {t('auth_verify_email_title', 'Verify Your Email')}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {isHindi ? 'हमने सत्यापन ईमेल भेजा है: ' : 'We’ve sent a verification email to '}
                  <strong className="text-[#0070f3] dark:text-[#00d2ff] break-all">{email || username}</strong>.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {isHindi 
                    ? 'कृपया अपना इनबॉक्स (या स्पैम फ़ोल्डर) जांचें और अपने खाते को सत्यापित करने के लिए लिंक पर क्लिक करें।' 
                    : 'Please check your inbox and click the verification link to verify your account.'}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold text-left">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleCheckVerified}
                  disabled={submitting}
                  className="w-full py-3 bg-[#065fd4] hover:bg-[#054fb1] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? (isHindi ? 'जांच हो रही है...' : 'Checking...') : t('auth_verify_check_btn', "I've Verified My Email")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>{resendCooldown > 0 ? `${t('auth_resend_email_btn', 'Resend Email')} (${resendCooldown}s)` : t('auth_resend_email_btn', 'Resend Email')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsVerifying(false);
                    setErrorMsg('');
                  }}
                  className="w-full py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  {t('auth_back_to_login', 'Back to Sign In')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center text-center mb-6">
                <SocialIndiaLogo size="lg" className="mb-3" />
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {isLogin ? t('auth_login_title', 'Log In to Your Account') : t('auth_create_account_title', 'Create Creator Account')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  {isLogin ? t('auth_login_subtitle', 'Explore the best of Indian video content creators') : t('auth_create_account_subtitle', 'Join a vibrant community of creators across India')}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5 text-rose-600 dark:text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      {t('auth_email_label', 'Email Address (Gmail / Email)')} *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="e.g. yourname@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm font-medium"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {isLogin ? (isHindi ? 'ईमेल या यूज़रनेम' : 'Email or Username') : t('auth_username_label', 'Username')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={isLogin ? (isHindi ? 'उदा. yourname@gmail.com या bharat_creator' : 'e.g. yourname@gmail.com or bharat_creator') : 'e.g. bharat_creator'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm font-medium"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      {t('auth_display_name_label', 'Display Name')}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={isHindi ? 'उदा. भारत क्रिएटर' : 'e.g. India Bharat'}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm font-medium"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {t('auth_password_label', 'Password')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder={isHindi ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm font-medium"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      {t('auth_confirm_password_label', 'Confirm Password')}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        required
                        placeholder={isHindi ? 'पासवर्ड दोबारा दर्ज करें' : 'Repeat your password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm font-medium"
                      />
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="accept-policy"
                      checked={acceptPolicy}
                      onChange={(e) => setAcceptPolicy(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="accept-policy" className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                      {isHindi ? (
                        <>मैं <a href="#/privacy" className="text-blue-600 dark:text-blue-400 underline font-medium">गोपनीयता नीति</a>, <a href="#/terms" className="text-blue-600 dark:text-blue-400 underline font-medium">सेवा की शर्तें</a> और कम्युनिटी नियमों से सहमत हूँ।</>
                      ) : (
                        <>I accept the <a href="#/privacy" className="text-blue-600 dark:text-blue-400 underline font-medium">Privacy Policy</a> and <a href="#/terms" className="text-blue-600 dark:text-blue-400 underline font-medium">Terms of Service</a>.</>
                      )}
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#065fd4] hover:bg-[#054fb1] text-white font-bold rounded-full tracking-wide shadow-lg transition-all flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 cursor-pointer text-base active:scale-98"
                >
                  {submitting ? (isHindi ? 'कृपया प्रतीक्षा करें...' : 'Please wait...') : (isLogin ? t('auth_sign_in_btn', 'Sign In') : t('auth_create_account_btn', 'Sign Up'))}
                </button>
              </form>

              <div className="text-center mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setErrorMsg('');
                    setIsLogin(!isLogin);
                  }}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {isLogin 
                    ? (isHindi ? 'सोशलइंडिया पर नए हैं? नया खाता बनाएं' : "New to SocialIndia? Create an account") 
                    : (isHindi ? 'पहले से खाता है? साइन इन करें' : "Already have an account? Sign in")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

