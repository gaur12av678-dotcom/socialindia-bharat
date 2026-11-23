import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import { User, Notification } from '../types';
import { translations, LanguageCode, Translations } from '../i18n/translations';

import { accountService } from '../services/accountService';
import { SwitchAccountModal } from '../components/SwitchAccountModal';
import { isOfficialSocialIndiaAccount } from '../utils/userUtils';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  currentUser: FirebaseUser | null;
  currentUserProfile: User | null;
  loading: boolean;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: keyof Translations | string, fallback?: string) => string;
  notifications: Notification[];
  unreadCount: number;
  refreshProfile: () => Promise<void>;
  updateUserProfileState: (updates: Partial<User>) => void;
  refreshNotifications: () => Promise<void>;
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  markNotificationsAsRead: () => Promise<void>;
  isSwitchAccountOpen: boolean;
  openSwitchAccount: () => void;
  closeSwitchAccount: () => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getProfileCacheKey = (uid: string) => `socialindia_cached_profile_${uid}`;
const getThemeCacheKey = (uid: string) => `socialindia_theme_${uid}`;

const readCachedProfile = (uid: string | null): User | null => {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(getProfileCacheKey(uid))
      || localStorage.getItem('socialindia_cached_profile');
    if (raw) {
      const parsed = JSON.parse(raw) as User;
      if (parsed?.uid === uid) {
        if (!parsed.email || parsed.email.endsWith('@socialindia.com') || parsed.emailVerified) {
          return parsed;
        }
      }
    }
  } catch {}

  try {
    const cached = userService.getCachedUserProfile(uid);
    if (cached && cached.uid === uid) {
      return cached;
    }
  } catch {}

  try {
    const saved = accountService.getSavedAccounts().find((a) => a.uid === uid);
    if (saved) {
      return {
        uid: saved.uid,
        email: saved.email || '',
        emailVerified: true,
        username: saved.username || '',
        displayName: saved.displayName || saved.username || 'User',
        photoURL: saved.photoURL || '',
        followersCount: saved.subscribersCount || 0,
        followingCount: 0,
        videosCount: 0,
        role: (saved.role as User['role']) || 'user',
        status: 'active',
        points: saved.points || 0,
        walletBalance: saved.walletBalance || 0,
        createdAt: '',
        updatedAt: ''
      };
    }
  } catch {}

  return null;
};

const readThemePreference = (uid: string | null): 'light' | 'dark' | 'system' => {
  try {
    const themeOwnerUid = localStorage.getItem('socialindia_theme_owner_uid');
    const saved = uid
      ? localStorage.getItem(getThemeCacheKey(uid))
        || (themeOwnerUid === uid ? localStorage.getItem('socialindia_theme') : null)
      : localStorage.getItem('socialindia_theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  } catch {
    return 'system';
  }
};

const cacheProfile = (profile: User) => {
  localStorage.setItem(getProfileCacheKey(profile.uid), JSON.stringify(profile));
  localStorage.setItem('socialindia_cached_profile', JSON.stringify(profile));
};

const cacheThemePreference = (uid: string | null, value: 'light' | 'dark' | 'system') => {
  if (uid) {
    localStorage.setItem(getThemeCacheKey(uid), value);
    localStorage.setItem('socialindia_theme_owner_uid', uid);
  }
  localStorage.setItem('socialindia_theme', value);
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => auth.currentUser || null);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(() =>
    readCachedProfile(auth.currentUser?.uid || null)
  );
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() =>
    readThemePreference(auth.currentUser?.uid || null)
  );
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('socialindia_language');
      if (saved === 'hi' || saved === 'en') return saved;
      if (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('hi')) {
        return 'hi';
      }
      return 'en';
    } catch {
      return 'en';
    }
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);

  const openSwitchAccount = useCallback(() => setIsSwitchAccountOpen(true), []);
  const closeSwitchAccount = useCallback(() => setIsSwitchAccountOpen(false), []);

  // Refs for tracking timeouts & theme state across listener closures without stale references
  const toastTimeoutsRef = useRef<Record<string, any>>({});
  const themeRef = useRef(theme);
  const authStateSequenceRef = useRef(0);

  // Keep themeRef in sync with actual theme state changes
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Remove Toast with callback to avoid stale refs & clear timers cleanly
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (toastTimeoutsRef.current[id]) {
      clearTimeout(toastTimeoutsRef.current[id]);
      delete toastTimeoutsRef.current[id];
    }
  }, []);

  // Add Toast - Silenced per user preference to prevent popups on like, refresh, signin, or any action
  const addToast = useCallback((_message: string, _type: 'success' | 'error' | 'info' = 'info') => {
    // Intentionally suppressed: actions perform silently without popup notifications
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(toastTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  // Sync theme helper
  const applyTheme = useCallback((themeValue: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    const effectiveTheme = themeValue === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : themeValue;

    root.classList.add(effectiveTheme);
    if (effectiveTheme === 'dark') {
      root.style.colorScheme = 'dark';
    } else {
      root.style.colorScheme = 'light';
    }
  }, []);

  const setTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    cacheThemePreference(authService.getCurrentUserUid(), newTheme);
    applyTheme(newTheme);

    // Persist private settings in firestore if user is logged in
    if (authService.getCurrentUserUid()) {
      const uid = authService.getCurrentUserUid();
      if (uid) {
        userService.getPrivateInfo(uid).then((info) => {
          if (info) {
            userService.setPrivateInfo(uid, {
              ...info,
              theme: newTheme
            });
          }
        });
      }
    }
  }, [applyTheme]);

  const setLanguage = useCallback((newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('socialindia_language', newLang);
      document.documentElement.lang = newLang;
      window.dispatchEvent(new CustomEvent('socialindia_language_changed', { detail: { language: newLang } }));
    } catch {}

    // Persist language preference in firestore if user is logged in
    if (authService.getCurrentUserUid()) {
      const uid = authService.getCurrentUserUid();
      if (uid) {
        userService.getPrivateInfo(uid).then((info) => {
          if (info) {
            userService.setPrivateInfo(uid, {
              ...info,
              language: newLang,
            });
          }
        });
      }
    }
  }, []);

  // Sync html lang tag on mount or state change
  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

  // Fast translation function
  const t = useCallback((key: keyof Translations | string, fallback?: string): string => {
    const currentDict = translations[language] || translations.en;
    if (key in currentDict) {
      return (currentDict as any)[key];
    }
    const enDict = translations.en;
    if (key in enDict) {
      return (enDict as any)[key];
    }
    return fallback || (typeof key === 'string' ? key : '');
  }, [language]);

  const refreshProfile = useCallback(async () => {
    const uid = authService.getCurrentUserUid();
    if (uid) {
      let profile = await userService.getUserProfile(uid, true);
      if (profile && authService.getCurrentUserUid() === uid) {
        const enrichedProfile = {
          ...profile,
          emailVerified: Boolean(profile.emailVerified || auth.currentUser?.emailVerified)
        };
        setCurrentUserProfile(enrichedProfile);
        try {
          cacheProfile(enrichedProfile);
          accountService.syncCurrentProfile(enrichedProfile);
          void accountService.snapshotAuthSession(auth.currentUser);
        } catch {}
      }
    } else if (!authService.getCurrentUserUid()) {
      setCurrentUserProfile(null);
      localStorage.removeItem('socialindia_cached_profile');
    }
  }, []);

  const updateUserProfileState = useCallback((updates: Partial<User>) => {
    setCurrentUserProfile((prev) => {
      if (!prev || prev.uid !== authService.getCurrentUserUid()) return prev;
      const updated = { ...prev, ...updates };
      try {
        cacheProfile(updated);
      } catch {}
      return updated;
    });
  }, []);

  const refreshNotifications = useCallback(async () => {
    const uid = authService.getCurrentUserUid();
    if (uid) {
      const list = await notificationService.getNotifications(uid);
      if (authService.getCurrentUserUid() !== uid) return;
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } else if (!authService.getCurrentUserUid()) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  const markNotificationsAsRead = useCallback(async () => {
    const uid = authService.getCurrentUserUid();
    if (uid) {
      const previousNotifications = notifications;
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
      setUnreadCount(0);
      try {
        await notificationService.markAllAsRead(uid);
      } catch (error) {
        console.error('Failed to mark notifications as read:', error);
        setNotifications(previousNotifications);
        setUnreadCount(previousNotifications.filter((notification) => !notification.read).length);
      }
    }
  }, [notifications]);

  const logout = useCallback(async () => {
    setLoading(true);
    const uid = authService.getCurrentUserUid();
    if (uid) {
      await userService.updatePresence(uid, false).catch(() => {});
      await accountService.clearVaultSession(uid).catch(() => {});
    }
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      setCurrentUser(null);
      setCurrentUserProfile(null);
      try {
        localStorage.removeItem('socialindia_cached_profile');
      } catch {}
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, []);

  // Handle auth state changes
  useEffect(() => {
    // 1. Initial theme load
    const initialTheme = readThemePreference(authService.getCurrentUserUid());
    setThemeState(initialTheme);
    applyTheme(initialTheme);

    // Ensure Live India broadcast channel and video are primed
    import('../services/liveBroadcastService').then(({ liveBroadcastService }) => {
      liveBroadcastService.ensureLiveIndiaSeeded().catch(() => {});
    });

    let notifUnsubscribe: (() => void) | null = null;

    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      if (notifUnsubscribe) {
        notifUnsubscribe();
        notifUnsubscribe = null;
      }
      const requestSequence = ++authStateSequenceRef.current;
      const isCurrentRequest = () =>
        requestSequence === authStateSequenceRef.current &&
        authService.getCurrentUserUid() === (user?.uid || null);

      // If registration is actively creating and saving profile documents, do not interfere
      if (authService.isRegistrationInProgress()) {
        return;
      }

      setLoading(true);
      setCurrentUser(user);
      const cachedProfile = readCachedProfile(user?.uid || null);
      setCurrentUserProfile(cachedProfile);
      const activeUid = user?.uid || null;
      const preferredTheme = readThemePreference(activeUid);
      try {
        if (activeUid) localStorage.setItem('socialindia_active_uid', activeUid);
        else localStorage.removeItem('socialindia_active_uid');
      } catch {}
      setThemeState(preferredTheme);
      applyTheme(preferredTheme);
      setNotifications([]);
      setUnreadCount(0);
      if (user) {
        const isRealEmail = Boolean(user.email && !user.email.endsWith('@socialindia.com'));
        if (isRealEmail && !user.emailVerified) {
          try {
            await user.reload();
          } catch {}
          if (!isCurrentRequest()) return;
          if (!user.emailVerified) {
            console.warn('Unverified user session detected. Signing out:', user.email);
            await authService.logout();
            if (!isCurrentRequest()) return;
            setCurrentUser(null);
            setCurrentUserProfile(null);
            try {
              localStorage.removeItem('socialindia_cached_profile');
              localStorage.removeItem('socialindia_active_uid');
            } catch {}
            setLoading(false);
            return;
          }
        }

        // Sync cached or Firebase Auth fallback immediately so outgoing switches never drop the account
        try {
          accountService.syncCurrentProfile(cachedProfile);
          void accountService.snapshotAuthSession(user);
        } catch {}

        // Immediately publish authenticated user so UI & Follow/Like states never reset on reload
        setLoading(false);

        // Fetch fresh public profile from Firestore in background
        try {
          let profile = await userService.getUserProfile(user.uid, true);
          if (!profile) {
            profile = await userService.recoverOrCreateProfile(user);
          }
          if (profile && isCurrentRequest()) {
            const needsNewsletterBackfill = profile.newsletter === undefined;
            if (needsNewsletterBackfill) {
              userService.updateProfile(user.uid, { newsletter: true }).catch(() => {});
            }
            const enrichedProfile = {
              ...profile,
              newsletter: profile.newsletter ?? true,
              emailVerified: Boolean(profile.emailVerified || user.emailVerified)
            };
            setCurrentUserProfile(enrichedProfile);
            try {
              cacheProfile(enrichedProfile);
            } catch {}
            try {
              accountService.syncCurrentProfile(enrichedProfile);
            } catch {}
            userService.ensureDefaultSubscription(user.uid).catch(() => {});
          }
        } catch (err) {
          console.warn('Profile fetch warning on auth change:', err);
        }

        // Fetch private info for theme & language persistence
        try {
          const pInfo = await userService.getPrivateInfo(user.uid);
          if (!isCurrentRequest()) return;
          if (pInfo?.theme) {
            setThemeState(pInfo.theme);
            cacheThemePreference(user.uid, pInfo.theme);
            applyTheme(pInfo.theme);
          } else {
            cacheThemePreference(user.uid, preferredTheme);
          }
          if (pInfo?.language === 'hi' || pInfo?.language === 'en') {
            setLanguageState(pInfo.language);
            localStorage.setItem('socialindia_language', pInfo.language);
            document.documentElement.lang = pInfo.language;
          }
        } catch (err) {
          console.warn('Private info fetch warning:', err);
        }

        // Listen to notifications in real time (plus fallback fetch)
        try {
          notifUnsubscribe = notificationService.subscribeToNotifications(user.uid, (list) => {
            if (!isCurrentRequest()) return;
            setNotifications(list);
            setUnreadCount(list.filter((n) => !n.read).length);
          });
        } catch (err) {
          console.warn('Notification listener warning, falling back to one-time fetch:', err);
          try {
            const list = await notificationService.getNotifications(user.uid);
            if (!isCurrentRequest()) return;
            setNotifications(list);
            setUnreadCount(list.filter((n) => !n.read).length);
          } catch (fetchErr) {
            console.warn('Notification fetch warning:', fetchErr);
          }
        }
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
        localStorage.removeItem('socialindia_cached_profile');
        localStorage.removeItem('socialindia_active_uid');
        setNotifications([]);
        setUnreadCount(0);
      }
      if (isCurrentRequest()) setLoading(false);
    });

    // Listen to systems preferences shifts
    const systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (themeRef.current === 'system') {
        applyTheme('system');
      }
    };
    systemThemeMediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      unsubscribe();
      if (notifUnsubscribe) {
        notifUnsubscribe();
        notifUnsubscribe = null;
      }
      systemThemeMediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [applyTheme]);

  // Real-time online / offline presence tracking for Chat
  const isOfficialAccount = isOfficialSocialIndiaAccount({
    uid: currentUser?.uid,
    username: currentUserProfile?.username
  });
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || isOfficialAccount) return;

    const markOnline = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        userService.updatePresence(uid, false).catch(() => {});
        return;
      }
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      userService.updatePresence(uid, true).catch(() => {});
    };

    const markOffline = () => {
      userService.updatePresence(uid, false).catch(() => {});
    };

    markOnline();
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        userService.updatePresence(uid, true).catch(() => {});
      }
    }, 45_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        markOnline();
      } else {
        markOffline();
      }
    };

    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    window.addEventListener('focus', markOnline);
    window.addEventListener('pagehide', markOffline);
    window.addEventListener('beforeunload', markOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
      window.removeEventListener('focus', markOnline);
      window.removeEventListener('pagehide', markOffline);
      window.removeEventListener('beforeunload', markOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (authService.getCurrentUserUid() === uid) {
        markOffline();
      }
    };
  }, [currentUser?.uid, isOfficialAccount]);

  const safeCurrentUserProfile = currentUser?.uid
    ? (currentUserProfile?.uid === currentUser.uid ? currentUserProfile : readCachedProfile(currentUser.uid))
    : null;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentUserProfile: safeCurrentUserProfile,
        loading,
        theme,
        setTheme,
        language,
        setLanguage,
        t,
        notifications,
        unreadCount,
        refreshProfile,
        updateUserProfileState,
        refreshNotifications,
        toasts,
        addToast,
        removeToast,
        markNotificationsAsRead,
        isSwitchAccountOpen,
        openSwitchAccount,
        closeSwitchAccount,
        logout,
      }}
    >
      {children}
      <SwitchAccountModal isOpen={isSwitchAccountOpen} onClose={closeSwitchAccount} />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
