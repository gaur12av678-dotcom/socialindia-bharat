import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { SocialIndiaLogo } from './SocialIndiaLogo';
import { X, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setErrorMsg('Username can only contain letters, numbers, and underscores.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (!isLogin) {
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
        await authService.login(cleanUsername, password);
        addToast('Welcome back to SocialIndia!', 'success');
      } else {
        await authService.register(cleanUsername, displayName, password);
        addToast('Account created successfully!', 'success');
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      let friendlyError = err.message || 'Authentication failed.';
      if (friendlyError.includes('auth/invalid-credential')) {
        friendlyError = 'Incorrect username or password.';
      } else if (friendlyError.includes('auth/username-already-in-use') || friendlyError.includes('taken')) {
        friendlyError = 'This username is already registered.';
      }
      setErrorMsg(friendlyError);
    } finally {
      setSubmitting(false);
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
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <SocialIndiaLogo size="lg" className="mb-3" />
            <h2 className="text-2xl font-extrabold tracking-tight">
              {isLogin ? 'Log In to Your Account' : 'Create Creator Account'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {isLogin ? 'Explore the best of Indian video content creators' : 'Join a vibrant community of creators across India'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. bharat_creator"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm font-medium"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. India Bharat"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm"
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
                  I accept the <a href="#/privacy" className="text-blue-600 dark:text-blue-400 underline font-medium">Privacy Policy</a>, <a href="#/terms" className="text-blue-600 dark:text-blue-400 underline font-medium">Terms of Service</a>, and <a href="#/guidelines" className="text-blue-600 dark:text-blue-400 underline font-medium">Community Guidelines</a>.
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl tracking-wide shadow-md transition-all flex items-center justify-center hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
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
              {isLogin ? "New to SocialIndia? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
