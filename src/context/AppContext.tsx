import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import { User, Notification } from '../types';
import { translations, LanguageCode, Translations } from '../i18n/translations';

import { accountService } from '../services/accountService';
import { SwitchAccountModal } from '../components/SwitchAccountModal';

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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('socialindia_cached_profile');
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      // Never restore an unverified profile from cache
      if (parsed?.email && !parsed.email.endsWith('@socialindia.com') && !parsed.emailVerified) {
        localStorage.removeItem('socialindia_cached_profile');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
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
    localStorage.setItem('socialindia_theme', newTheme);
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
      if (profile) {
        setCurrentUserProfile(profile);
        try {
          localStorage.setItem('socialindia_cached_profile', JSON.stringify(profile));
          accountService.syncCurrentProfile(profile);
        } catch {}
      }
    } else {
      setCurrentUserProfile(null);
      localStorage.removeItem('socialindia_cached_profile');
    }
  }, []);

  const updateUserProfileState = useCallback((updates: Partial<User>) => {
    setCurrentUserProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('socialindia_cached_profile', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const refreshNotifications = useCallback(async () => {
    const uid = authService.getCurrentUserUid();
    if (uid) {
      const list = await notificationService.getNotifications(uid);
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  const markNotificationsAsRead = useCallback(async () => {
    const uid = authService.getCurrentUserUid();
    if (uid) {
      await notificationService.markAllAsRead(uid);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const logout = useCallback(async () => {
    setLoading(true);
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
    const savedTheme = localStorage.getItem('socialindia_theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system');
    }

    // Ensure Live India broadcast channel and video are primed
    import('../services/liveBroadcastService').then(({ liveBroadcastService }) => {
      liveBroadcastService.ensureLiveIndiaSeeded().catch(() => {});
    });

    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      // If registration is actively creating and saving profile documents, do not interfere
      if (authService.isRegistrationInProgress()) {
        return;
      }

      setLoading(true);
      if (user) {
        const isRealEmail = Boolean(user.email && !user.email.endsWith('@socialindia.com'));
        if (isRealEmail && !user.emailVerified) {
          try {
            await user.reload();
          } catch {}
          if (!user.emailVerified) {
            console.warn('Unverified user session detected. Signing out:', user.email);
            await authService.logout();
            setCurrentUser(null);
            setCurrentUserProfile(null);
            localStorage.removeItem('socialindia_cached_profile');
            accountService.removeAccount(user.uid);
            setLoading(false);
            return;
          }
        }

        // Immediately publish authenticated user so UI & Follow/Like states never reset on reload
        setCurrentUser(user);
        setLoading(false);

        // Fetch fresh public profile from Firestore in background
        try {
          let profile = await userService.getUserProfile(user.uid, true);
          if (!profile) {
            profile = await userService.recoverOrCreateProfile(user);
          }
          if (profile) {
            setCurrentUserProfile(profile);
            localStorage.setItem('socialindia_cached_profile', JSON.stringify(profile));
            accountService.syncCurrentProfile(profile);
            userService.ensureDefaultSubscription(user.uid).catch(() => {});
          }
        } catch (err) {
          console.warn('Profile fetch warning on auth change:', err);
        }

        // Fetch private info for theme & language persistence
        try {
          const pInfo = await userService.getPrivateInfo(user.uid);
          if (pInfo?.theme) {
            setThemeState(pInfo.theme);
            applyTheme(pInfo.theme);
          }
          if (pInfo?.language === 'hi' || pInfo?.language === 'en') {
            setLanguageState(pInfo.language);
            localStorage.setItem('socialindia_language', pInfo.language);
            document.documentElement.lang = pInfo.language;
          }
        } catch (err) {
          console.warn('Private info fetch warning:', err);
        }

        // Fetch notifications
        try {
          const list = await notificationService.getNotifications(user.uid);
          setNotifications(list);
          setUnreadCount(list.filter((n) => !n.read).length);
        } catch (err) {
          console.warn('Notification fetch warning:', err);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
        localStorage.removeItem('socialindia_cached_profile');
        setNotifications([]);
        setUnreadCount(0);
      }
      setLoading(false);
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
      systemThemeMediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [applyTheme]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentUserProfile,
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
