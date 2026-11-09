import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { authService } from './../services/authService';
import { accountService, SavedAccount } from '../services/accountService';
import { UserAvatar } from './UserAvatar';
import { useTranslation } from '../i18n';
import { 
  Check, 
  Plus, 
  LogOut, 
  X, 
  ArrowLeft, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Trash2, 
  KeyRound,
  AlertCircle,
  User as UserIcon,
  Sparkles
} from 'lucide-react';

interface SwitchAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SwitchAccountModal: React.FC<SwitchAccountModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, currentUserProfile, refreshProfile, addToast, logout } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  const [view, setView] = useState<'list' | 'add_account'>('list');
  const [switchingUid, setSwitchingUid] = useState<string | null>(null);
  
  // Password prompt state for accounts without saved password
  const [passwordPromptAccount, setPasswordPromptAccount] = useState<SavedAccount | null>(null);
  const [promptPassword, setPromptPassword] = useState('');
  const [showPromptPassword, setShowPromptPassword] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);

  // Add Account form state
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addAccountLoading, setAddAccountLoading] = useState(false);
  const [addAccountGoogleLoading, setAddAccountGoogleLoading] = useState(false);
  const [addAccountError, setAddAccountError] = useState('');

  if (!isOpen) return null;

  const savedAccounts = accountService.getSavedAccounts();
  
  // Ensure current user is in saved accounts list if logged in
  const currentUid = currentUser?.uid;
  const accountsList = [...savedAccounts];
  if (currentUserProfile && !accountsList.some(a => a.uid === currentUserProfile.uid)) {
    accountsList.unshift({
      uid: currentUserProfile.uid,
      email: currentUserProfile.email || '',
      username: currentUserProfile.username || '',
      displayName: currentUserProfile.displayName || currentUserProfile.username || 'User',
      photoURL: currentUserProfile.photoURL,
      subscribersCount: currentUserProfile.followersCount || 0,
      points: currentUserProfile.points || 0,
      walletBalance: currentUserProfile.walletBalance || 0,
      role: currentUserProfile.role || 'user',
      lastActiveAt: Date.now(),
      authProvider: 'password'
    });
  }

  // Handle 1-click or quick switch
  const handleSelectAccount = async (account: SavedAccount) => {
    if (account.uid === currentUid) {
      onClose();
      return;
    }

    setSwitchingUid(account.uid);
    setPasswordPromptAccount(null);
    setPromptError('');

    try {
      const res = await accountService.switchToAccount(account);
      if (res.success) {
        await refreshProfile();
        addToast(
          isHindi 
            ? `${account.displayName || account.username} के खाते में स्विच किया गया` 
            : `Switched to ${account.displayName || account.username}`,
          'success'
        );
        onClose();
      } else if (res.requiresPassword) {
        // Needs password once to authenticate
        setPasswordPromptAccount(account);
        setPromptPassword('');
        setPromptError(res.error || '');
      } else {
        setPromptError(res.error || 'Could not switch to this account.');
      }
    } catch (err: any) {
      setPromptError(err.message || 'Failed to switch account.');
    } finally {
      setSwitchingUid(null);
    }
  };

  // Submit password for prompted account
  const handleSubmitPromptPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPromptAccount || !promptPassword.trim()) return;

    setPromptLoading(true);
    setPromptError('');

    try {
      const res = await accountService.switchToAccount(passwordPromptAccount, promptPassword.trim());
      if (res.success) {
        await refreshProfile();
        addToast(
          isHindi 
            ? `${passwordPromptAccount.displayName || passwordPromptAccount.username} के खाते में स्विच किया गया` 
            : `Switched to ${passwordPromptAccount.displayName || passwordPromptAccount.username}`,
          'success'
        );
        onClose();
      } else {
        setPromptError(res.error || 'Incorrect password.');
      }
    } catch (err: any) {
      setPromptError(err.message || 'Failed to switch account.');
    } finally {
      setPromptLoading(false);
    }
  };

  // Handle Remove account from saved list
  const handleRemoveAccount = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    accountService.removeAccount(uid);
    if (passwordPromptAccount?.uid === uid) {
      setPasswordPromptAccount(null);
    }
  };

  // Handle Add New Account submission
  const handleAddNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newIdentifier.trim().toLowerCase();
    if (!cleanId) {
      setAddAccountError(isHindi ? 'कृपया यूज़रनेम या ईमेल दर्ज करें' : 'Please enter username or email.');
      return;
    }
    if (!newPassword) {
      setAddAccountError(isHindi ? 'कृपया पासवर्ड दर्ज करें' : 'Please enter password.');
      return;
    }

    setAddAccountLoading(true);
    setAddAccountError('');

    try {
      const { userProfile } = await authService.login(cleanId, newPassword);
      accountService.saveAccount(userProfile, newPassword, 'password');
      await refreshProfile();
      addToast(
        isHindi 
          ? `नया खाता जोड़ा गया: ${userProfile.displayName || userProfile.username}` 
          : `Account added: ${userProfile.displayName || userProfile.username}`,
        'success'
      );
      onClose();
    } catch (err: any) {
      let msg = err.message || 'Login failed';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('user-not-found')) {
        msg = isHindi 
          ? 'गलत यूज़रनेम/ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।' 
          : 'Invalid username/email or password.';
      }
      setAddAccountError(msg);
    } finally {
      setAddAccountLoading(false);
    }
  };

  // Handle Google Sign In to add an account
  const handleAddAccountGoogle = async () => {
    setAddAccountGoogleLoading(true);
    setAddAccountError('');
    try {
      const { userProfile } = await authService.signInWithGoogle();
      accountService.saveAccount(userProfile, undefined, 'google');
      await refreshProfile();
      addToast(
        isHindi 
          ? `Google खाता जोड़ा गया: ${userProfile.displayName || userProfile.username}` 
          : `Google account added: ${userProfile.displayName || userProfile.username}`,
        'success'
      );
      onClose();
    } catch (err: any) {
      setAddAccountError(err.message || 'Google sign-in failed.');
    } finally {
      setAddAccountGoogleLoading(false);
    }
  };

  // Handle Sign out of all accounts
  const handleSignOutAll = async () => {
    try {
      await logout();
      addToast(isHindi ? 'सभी खातों से साइन आउट किया गया' : 'Signed out of all accounts', 'info');
      onClose();
      navigate('home');
    } catch {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full sm:max-w-md bg-white dark:bg-[#18181b] border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-in text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            {view === 'add_account' ? (
              <button
                onClick={() => {
                  setView('list');
                  setAddAccountError('');
                }}
                className="p-1.5 -ml-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                title={isHindi ? 'वापस' : 'Back'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}
            <h2 className="text-base font-extrabold tracking-tight">
              {view === 'add_account' 
                ? (isHindi ? 'खाता जोड़ें' : 'Add account') 
                : (isHindi ? 'खाता बदलें' : 'Switch account')}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {view === 'list' ? (
            <>
              {/* Account list header note */}
              <div className="px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isHindi ? 'सहेजे गए खाते और चैनल' : 'Accounts on this device'}
              </div>

              {/* Accounts List */}
              <div className="space-y-1.5">
                {accountsList.map((account) => {
                  const isActive = account.uid === currentUid;
                  const isSwitching = switchingUid === account.uid;
                  const isPrompting = passwordPromptAccount?.uid === account.uid;

                  return (
                    <div 
                      key={account.uid}
                      className={`rounded-2xl border transition-all ${
                        isActive 
                          ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-xs' 
                          : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectAccount(account)}
                        disabled={isSwitching || promptLoading}
                        className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <UserAvatar
                              uid={account.uid}
                              fallbackPhotoURL={account.photoURL}
                              fallbackDisplayName={account.displayName || account.username}
                              size="md"
                              className="w-11 h-11 ring-2 ring-white dark:ring-slate-800 shadow-xs"
                            />
                            {isActive && (
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#2563eb] text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                                {account.displayName || account.username}
                              </p>
                              {isActive && (
                                <span className="text-[10px] font-extrabold text-[#2563eb] dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950 px-1.5 py-0.2 rounded-md">
                                  {isHindi ? 'सक्रिय' : 'Active'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              @{account.username}
                              {typeof account.subscribersCount === 'number' && (
                                <span className="text-slate-400 dark:text-slate-500 ml-1.5">
                                  · {account.subscribersCount} {isHindi ? 'सदस्य' : 'subscribers'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Right indicator: Checkmark or Spinner or Remove */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isSwitching ? (
                            <Loader2 className="w-5 h-5 text-[#2563eb] animate-spin" />
                          ) : isActive ? (
                            <div className="w-7 h-7 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-[#2563eb] dark:text-blue-400 flex items-center justify-center">
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleRemoveAccount(e, account.uid)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                              title={isHindi ? 'खाता हटाएं' : 'Remove from list'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </button>

                      {/* Inline password prompt if this account requires password */}
                      {isPrompting && (
                        <form onSubmit={handleSubmitPromptPassword} className="px-3 pb-3 pt-1 border-t border-slate-200 dark:border-slate-800 space-y-2 mt-1">
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-[#2563eb]" />
                            {isHindi ? `खाता स्विच करने के लिए पासवर्ड दर्ज करें:` : `Enter password to switch:`}
                          </p>

                          <div className="relative">
                            <input
                              type={showPromptPassword ? 'text' : 'password'}
                              value={promptPassword}
                              onChange={(e) => setPromptPassword(e.target.value)}
                              placeholder={isHindi ? 'पासवर्ड' : 'Password'}
                              className="w-full px-3 py-2 pr-10 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-slate-900 dark:text-white"
                              autoFocus
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPromptPassword(!showPromptPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {showPromptPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {promptError && (
                            <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {promptError}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="submit"
                              disabled={promptLoading || !promptPassword.trim()}
                              className="flex-1 py-1.5 px-3 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {promptLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              <span>{isHindi ? 'स्विच करें' : 'Switch'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordPromptAccount(null);
                                setPromptError('');
                              }}
                              className="py-1.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold rounded-lg cursor-pointer text-slate-700 dark:text-slate-200"
                            >
                              {isHindi ? 'रद्द करें' : 'Cancel'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}

                {accountsList.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-500">
                    {isHindi ? 'कोई सहेजा हुआ खाता नहीं मिला' : 'No saved accounts found'}
                  </div>
                )}
              </div>

              {/* Bottom Actions: Add Account & Sign Out */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                <button
                  onClick={() => {
                    setView('add_account');
                    setNewIdentifier('');
                    setNewPassword('');
                    setAddAccountError('');
                  }}
                  className="w-full p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center gap-3 text-left transition-colors cursor-pointer group text-slate-800 dark:text-slate-200"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 group-hover:text-[#2563eb] dark:group-hover:text-blue-400 transition-colors">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold group-hover:text-[#2563eb] dark:group-hover:text-blue-400 transition-colors">
                      {isHindi ? 'खाता जोड़ें' : 'Add account'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isHindi ? 'किसी अन्य चैनल या ईमेल से लॉगिन करें' : 'Sign in to another channel or email'}
                    </p>
                  </div>
                </button>

                {currentUser && (
                  <button
                    onClick={handleSignOutAll}
                    className="w-full p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-3 text-left transition-colors cursor-pointer group text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 group-hover:text-rose-600 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold">
                        {isHindi ? 'सभी खातों से साइन आउट करें' : 'Sign out of all accounts'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isHindi ? 'इस डिवाइस पर सभी सत्र बंद करें' : 'Sign out of current active session'}
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Add Account View */
            <div className="space-y-4 py-1">
              <div className="text-center px-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isHindi 
                    ? 'SocialIndia में दूसरा खाता जोड़ें। आप कभी भी इनके बीच तुरंत स्विच कर सकते हैं।' 
                    : 'Add another SocialIndia account. You can switch between your channels anytime.'}
                </p>
              </div>

              {addAccountError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addAccountError}</span>
                </div>
              )}

              <form onSubmit={handleAddNewAccount} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {isHindi ? 'यूज़रनेम या ईमेल' : 'Username or Email'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newIdentifier}
                      onChange={(e) => setNewIdentifier(e.target.value)}
                      placeholder="e.g. gaurav or user@gmail.com"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-slate-900 dark:text-white"
                      autoFocus
                      required
                    />
                    <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {isHindi ? 'पासवर्ड' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={isHindi ? 'पासवर्ड दर्ज करें' : 'Enter password'}
                      className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-slate-900 dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addAccountLoading || addAccountGoogleLoading}
                  className="w-full py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 active:scale-98 transition-all disabled:opacity-50"
                >
                  {addAccountLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>{isHindi ? 'साइन इन करें और जोड़ें' : 'Sign In & Add Account'}</span>
                </button>
              </form>

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <span className="relative bg-white dark:bg-[#18181b] px-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {isHindi ? 'या' : 'OR'}
                </span>
              </div>

              {/* Google Sign In option */}
              <button
                type="button"
                onClick={handleAddAccountGoogle}
                disabled={addAccountLoading || addAccountGoogleLoading}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-3 cursor-pointer transition-all disabled:opacity-50"
              >
                {addAccountGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                )}
                <span>{isHindi ? 'Google से खाता जोड़ें' : 'Continue with Google'}</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView('list');
                    setAddAccountError('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  {isHindi ? 'सहेजे गए खातों पर वापस जाएं' : 'Back to saved accounts'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
