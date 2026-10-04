import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import { User, Notification } from '../types';

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
  notifications: Notification[];
  unreadCount: number;
  refreshProfile: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  markNotificationsAsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  // Add Toast with limit check (cap at 5 toasts) and timer tracking
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      if (next.length > 5) {
        const oldest = next.shift();
        if (oldest && toastTimeoutsRef.current[oldest.id]) {
          clearTimeout(toastTimeoutsRef.current[oldest.id]);
          delete toastTimeoutsRef.current[oldest.id];
        }
      }
      return next;
    });

    const timeout = setTimeout(() => {
      removeToast(id);
    }, 4000);
    toastTimeoutsRef.current[id] = timeout;
  }, [removeToast]);

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

  const refreshProfile = useCallback(async () => {
    const uid = authService.getCurrentUserUid();
    if (uid) {
      const profile = await userService.getUserProfile(uid);
      setCurrentUserProfile(profile);
    } else {
      setCurrentUserProfile(null);
    }
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

    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setLoading(true);
      setCurrentUser(user);
      if (user) {
        // Fetch public profile
        const profile = await userService.getUserProfile(user.uid);
        setCurrentUserProfile(profile);

        // Fetch private info for theme persistence
        const pInfo = await userService.getPrivateInfo(user.uid);
        if (pInfo?.theme) {
          setThemeState(pInfo.theme);
          applyTheme(pInfo.theme);
        }

        // Fetch notifications
        const list = await notificationService.getNotifications(user.uid);
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      } else {
        setCurrentUserProfile(null);
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
        notifications,
        unreadCount,
        refreshProfile,
        refreshNotifications,
        toasts,
        addToast,
        removeToast,
        markNotificationsAsRead,
      }}
    >
      {children}
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
