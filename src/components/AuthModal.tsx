import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { accountService } from '../services/accountService';
import { SocialIndiaLogo } from './SocialIndiaLogo';
import { X, Lock, User as UserIcon, Mail, AlertCircle, CheckCircle2, RotateCw, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast, refreshProfile } = useApp();
  const { t, isHindi } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg(isHindi ? 'यूज़रनेम कम से कम 3 अक्षर का होना चाहिए।' : 'Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg(isHindi ? 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए।' : 'Password must be at least 6 characters.');
      return;
    }

    if (!isLogin) {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setErrorMsg(isHindi ? 'कृपया एक मान्य ईमेल दर्ज करें।' : 'Please enter a valid email address.');
        return;
      }
      const usernameRegex = /^[a-z0-9_]{3,20}$/;
      if (!usernameRegex.test(cleanUsername)) {
        setErrorMsg(isHindi ? 'यूज़रनेम 3-20 अक्षर (अक्षर, अंक, _) होना चाहिए।' : 'Username must be 3-20 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(isHindi ? 'पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.');
        return;
      }
      if (!acceptPolicy) {
        setErrorMsg(isHindi ? 'नियमों और गोपनीयता नीति से सहमत होना आवश्यक है।' : 'You must accept the Terms and Privacy Policy.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const { userProfile, emailVerified } = await authService.login(cleanUsername, password);
        accountService.saveAccount(userProfile, password, 'password');
        await refreshProfile();
        if (cleanUsername.includes('@') && !emailVerified) {
          setIsVerifying(true);
          setResendCooldown(30);
          addToast(isHindi ? 'कृपया अपना ईमेल सत्यापित करें।' : 'Please verify your email address.', 'info');
        } else {
          addToast(isHindi ? 'सोशलइंडिया में आपका स्वागत है!' : 'Welcome back to SocialIndia!', 'success');
          onClose();
          if (onSuccess) onSuccess();
        }
      } else {
        const { userProfile } = await authService.register(
          email.trim().toLowerCase(), 
          cleanUsername, 
          displayName.trim() || cleanUsername, 
          password
        );
        accountService.saveAccount(userProfile, password, 'password');
        await refreshProfile();
        setIsVerifying(true);
        setResendCooldown(60);
        addToast(isHindi ? `सत्यापन ईमेल ${email.trim()} पर भेजा गया!` : `Verification email sent to ${email.trim()}!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      let friendlyError = err.message || 'Authentication failed.';
      if (friendlyError.includes('auth/invalid-credential') || friendlyError.includes('auth/wrong-password') || friendlyError.includes('auth/user-not-found')) {
        friendlyError = isHindi ? 'गलत ईमेल/यूज़रनेम या पासवर्ड।' : 'Incorrect email/username or password.';
      } else if (friendlyError.includes('auth/email-already-in-use')) {
        friendlyError = isHindi ? 'यह ईमेल पहले से पंजीकृत है।' : 'This email is already registered. Please sign in instead.';
      } else if (friendlyError.includes('username-already-in-use') || friendlyError.includes('taken')) {
        friendlyError = isHindi ? 'यह यूज़रनेम पहले से किसी अन्य के पास है।' : 'This username is already taken. Please try another one.';
      }
      setErrorMsg(friendlyError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      const { userProfile } = await authService.signInWithGoogle();
      accountService.saveAccount(userProfile, undefined, 'google');
      await refreshProfile();
      addToast(isHindi ? `स्वागत है, ${userProfile.displayName || userProfile.username}!` : `Welcome to SocialIndia, ${userProfile.displayName || userProfile.username}!`, 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    setSubmitting(true);
    try {
      const verified = await authService.checkEmailVerified();
      if (verified) {
        await refreshProfile();
        addToast(isHindi ? 'ईमेल सफलतापूर्वक सत्यापित हुआ!' : '🎉 Email verified successfully! Welcome to SocialIndia.', 'success');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(isHindi ? 'ईमेल अभी सत्यापित नहीं हुआ है। कृपया लिंक पर क्लिक करें।' : 'Email not verified yet. Please click the verification link in your email first.');
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
      addToast(isHindi ? 'सत्यापन ईमेल पुनः भेज दिया गया है।' : 'Verification email resent! Please check your inbox.', 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />
      
      {/* YouTube / Google Outlined Modal Card */}
      <div className="relative bg-white dark:bg-[#1e1f20] rounded-[24px] shadow-2xl max-w-md w-full overflow-hidden border border-[#dadce0] dark:border-[#444746] animate-zoom-in p-6 sm:p-8">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isVerifying ? (
          <div className="space-y-5 text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] mx-auto">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-normal text-[#1f1f1f] dark:text-[#e3e3e3]">
                {isHindi ? 'अपना ईमेल सत्यापित करें' : 'Verify your email address'}
              </h2>
              <p className="text-xs text-[#444746] dark:text-[#c4c7c5] leading-relaxed">
                {isHindi ? 'हमने सत्यापन ईमेल भेजा है: ' : 'We sent a verification email to '}{' '}
                <strong className="text-[#0b57d0] dark:text-[#a8c7fa] break-all">{email || username}</strong>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-medium text-left">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCheckVerified}
                disabled={submitting}
                className="w-full h-10 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-sm rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isHindi ? "मैंने ईमेल सत्यापित कर लिया है" : "I've verified my email"}</span>
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="w-full h-10 border border-[#747775] dark:border-[#8e918f] text-[#1f1f1f] dark:text-[#e3e3e3] font-medium text-xs rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{resendCooldown > 0 ? `${isHindi ? 'पुनः भेजें' : 'Resend'} (${resendCooldown}s)` : (isHindi ? 'ईमेल पुनः भेजें' : 'Resend email')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="mb-6">
              <SocialIndiaLogo size="sm" className="mb-3" />
              <h2 className="text-2xl font-normal tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
                {isLogin ? (isHindi ? 'साइन इन करें' : 'Sign in') : (isHindi ? 'खाता बनाएं' : 'Create account')}
              </h2>
              <p className="text-xs text-[#444746] dark:text-[#c4c7c5] mt-1">
                {isHindi ? 'सोशलइंडिया पर जारी रखने के लिए' : 'to continue to SocialIndia'}
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <input
                    type="text"
                    required
                    placeholder={isHindi ? 'आपका नाम / चैनल का नाम' : 'Display Name'}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-12 px-4 rounded-[8px] border border-[#747775] dark:border-[#8e918f] bg-transparent focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
                  />
                </div>
              )}

              {!isLogin && (
                <div>
                  <input
                    type="email"
                    required
                    placeholder={isHindi ? 'ईमेल पता (you@gmail.com)' : 'Email address'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-[8px] border border-[#747775] dark:border-[#8e918f] bg-transparent focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
                  />
                </div>
              )}

              <div>
                <input
                  type="text"
                  required
                  placeholder={isLogin ? (isHindi ? 'ईमेल या यूज़रनेम' : 'Email or username') : (isHindi ? 'यूज़रनेम (उदा. bharat_creator)' : 'Username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 px-4 rounded-[8px] border border-[#747775] dark:border-[#8e918f] bg-transparent focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
                />
              </div>

              <div>
                <input
                  type="password"
                  required
                  placeholder={isHindi ? 'पासवर्ड' : 'Password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 rounded-[8px] border border-[#747775] dark:border-[#8e918f] bg-transparent focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
                />
              </div>

              {!isLogin && (
                <div>
                  <input
                    type="password"
                    required
                    placeholder={isHindi ? 'पासवर्ड दोबारा दर्ज करें' : 'Confirm password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-[8px] border border-[#747775] dark:border-[#8e918f] bg-transparent focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#0b57d0] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
                  />
                </div>
              )}

              {/* Bottom buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setIsLogin(!isLogin);
                  }}
                  className="text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#0b57d0]/10 px-3 py-2 rounded-full cursor-pointer transition-colors"
                >
                  {isLogin ? (isHindi ? 'खाता बनाएं' : 'Create account') : (isHindi ? 'साइन इन करें' : 'Sign in instead')}
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-6 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>{isHindi ? 'अगला' : 'Next'}</span>
                </button>
              </div>
            </form>

            {/* Google OAuth Option */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={submitting || googleLoading}
                className="w-full h-10 border border-[#747775] dark:border-[#8e918f] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
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
                <span>{isHindi ? 'Google के साथ साइन इन करें' : 'Sign in with Google'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
