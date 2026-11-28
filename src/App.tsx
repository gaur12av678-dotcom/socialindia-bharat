import React, { useEffect, Suspense, lazy } from 'react';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { useRouter } from './hooks/useRouter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AndroidOAuthBridge } from './components/AndroidOAuthBridge';
import { ShareModal } from './components/ShareModal';
import {
  ROUTE_SEO_META,
  SITE_URL,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  applySeoMetadata,
} from './utils/seo';

// Eager Home for 0ms YouTube-style initial boot
import { Home } from './pages/Home';

const CHUNK_RELOAD_GUARD_KEY = 'socialindia_chunk_reload_at';

function isDynamicImportError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  );
}

function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const delays = [300, 900];
    let lastError: unknown;

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastError = err;
        if (!isDynamicImportError(err) || attempt === delays.length) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }

    if (typeof window !== 'undefined' && navigator.onLine && isDynamicImportError(lastError)) {
      try {
        const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) || '0');
        const now = Date.now();
        if (!lastReload || now - lastReload > 15000) {
          sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, String(now));
          if ('caches' in window) {
            const keys = await caches.keys().catch(() => [] as string[]);
            await Promise.all(keys.map(key => caches.delete(key).catch(() => false)));
          }
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      } catch {
        // Ignore storage/cache errors and let ErrorBoundary handle fallback UI
      }
    }

    throw lastError;
  });
}

// Lazy-loaded pages to keep initial bundle lightweight and fast on live mobile/app
const Search = lazyWithRetry(() => import('./pages/Search').then(m => ({ default: m.Search })));
const Watch = lazyWithRetry(() => import('./pages/Watch').then(m => ({ default: m.Watch })));
const Shorts = lazyWithRetry(() => import('./pages/Shorts').then(m => ({ default: m.Shorts })));
const Trending = lazyWithRetry(() => import('./pages/Trending').then(m => ({ default: m.Trending })));
const Subscriptions = lazyWithRetry(() => import('./pages/Subscriptions').then(m => ({ default: m.Subscriptions })));
const WatchHistory = lazyWithRetry(() => import('./pages/History').then(m => ({ default: m.WatchHistory })));
const SavedVideos = lazyWithRetry(() => import('./pages/Saved').then(m => ({ default: m.SavedVideos })));
const LikedVideos = lazyWithRetry(() => import('./pages/Liked').then(m => ({ default: m.LikedVideos })));
const PlaylistsPage = lazyWithRetry(() => import('./pages/Playlists').then(m => ({ default: m.PlaylistsPage })));
const CreatorProfile = lazyWithRetry(() => import('./pages/Creator').then(m => ({ default: m.CreatorProfile })));
const CreatorStudio = lazyWithRetry(() => import('./pages/Studio').then(m => ({ default: m.CreatorStudio })));
const Settings = lazyWithRetry(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const AdminPanel = lazyWithRetry(() => import('./pages/Admin').then(m => ({ default: m.AdminPanel })));
const HelpPage = lazyWithRetry(() => import('./pages/Help').then(m => ({ default: m.HelpPage })));
const FeedbackPage = lazyWithRetry(() => import('./pages/Feedback').then(m => ({ default: m.FeedbackPage })));
const Downloads = lazyWithRetry(() => import('./pages/Downloads').then(m => ({ default: m.Downloads })));
const AboutPage = lazyWithRetry(() => import('./pages/About').then(m => ({ default: m.AboutPage })));
const UploadPage = lazyWithRetry(() => import('./pages/Upload').then(m => ({ default: m.UploadPage })));
const AdvertisingPage = lazyWithRetry(() => import('./pages/Advertising').then(m => ({ default: m.AdvertisingPage })));
const AdInfoPage = lazyWithRetry(() => import('./pages/AdInfo').then(m => ({ default: m.AdInfoPage })));
const GoProPage = lazyWithRetry(() => import('./pages/GoPro').then(m => ({ default: m.GoProPage })));
const SignInPage = lazyWithRetry(() => import('./pages/SignIn').then(m => ({ default: m.SignInPage })));
const ChatPage = lazyWithRetry(() => import('./pages/Chat').then(m => ({ default: m.ChatPage })));
const MobileMenu = lazyWithRetry(() => import('./pages/MobileMenu').then(m => ({ default: m.MobileMenu })));
const CommunityPage = lazyWithRetry(() => import('./pages/Community').then(m => ({ default: m.CommunityPage })));

// Standalone policy components
const PrivacyPolicyPage = lazyWithRetry(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazyWithRetry(() => import('./pages/Terms').then(m => ({ default: m.TermsPage })));
const RefundPolicyPage = lazyWithRetry(() => import('./pages/RefundPolicy').then(m => ({ default: m.RefundPolicyPage })));
const FAQPage = lazyWithRetry(() => import('./pages/FAQ').then(m => ({ default: m.FAQPage })));
const ContactUsPage = lazyWithRetry(() => import('./pages/ContactUs').then(m => ({ default: m.ContactUsPage })));
const GrievancePage = lazyWithRetry(() => import('./pages/Grievance').then(m => ({ default: m.GrievancePage })));
const DevelopersPage = lazyWithRetry(() => import('./pages/Developers').then(m => ({ default: m.DevelopersPage })));
const LanguageSettingsPage = lazyWithRetry(() => import('./pages/LanguageSettings').then(m => ({ default: m.LanguageSettingsPage })));
const CommunityGuidelinesPage = lazyWithRetry(() => import('./pages/CommunityGuidelines').then(m => ({ default: m.CommunityGuidelinesPage })));

import { ArrowLeft, Home as HomeIcon, ShieldCheck } from 'lucide-react';
import { SocialIndiaLogo } from './components/SocialIndiaLogo';

const RouteFallback: React.FC<{ path?: string }> = ({ path }) => {
  if (path === 'shorts') {
    return (
      <div className="flex flex-col items-center justify-center p-0 md:p-4 h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4.5rem)] max-w-6xl mx-auto">
        <div className="w-full max-w-full md:max-w-[390px] h-[calc(100dvh-3.5rem)] md:h-[min(calc(100vh-5.5rem),660px)] md:aspect-[9/16] bg-[#dbe2ee] dark:bg-[#181a20] rounded-none md:rounded-[2rem] animate-pulse p-5 flex flex-col justify-end space-y-3">
          <div className="h-4 w-36 rounded-full bg-slate-300/80 dark:bg-slate-800" />
          <div className="h-3 w-52 rounded-full bg-slate-300/80 dark:bg-slate-800" />
        </div>
      </div>
    );
  }
  if (path === 'profile-menu') {
    return (
      <div className="max-w-md mx-auto p-4 space-y-5 animate-pulse">
        <div className="h-28 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-36 aspect-video rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }
  if (path === 'creator' || path === 'channel' || path === 'user' || path === 'profile' || path === 'c') {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-44 md:h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-center gap-4 px-2">
          <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-44 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-video rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }
  if (path === 'watch') {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-6 w-3/4 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-12 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }
  if (path === 'chat' || path === 'messages') {
    return (
      <div className="h-[100dvh] flex bg-white dark:bg-[#0f0f0f] overflow-hidden animate-pulse">
        <div className="w-full md:w-80 border-r border-slate-200 dark:border-[#222] p-4 space-y-4">
          <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
          <div className="space-y-3 pt-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-full w-2/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:flex flex-1 items-center justify-center p-8 bg-[#efeae2]/40 dark:bg-[#0b141a]">
          <div className="w-56 h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-6 w-48 rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-video rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="flex gap-2.5 items-start">
              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded-full bg-slate-200 dark:bg-slate-800 w-5/6" />
                <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function MainAppContent() {
  const { route, navigate } = useRouter();

  // Scroll to top on route change, EXCEPT when returning to Home (preserves Home scroll position like YouTube)
  useEffect(() => {
    if (route.path !== 'home') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [route.path, route.param]);

  // Dynamically sync Canonical link, robots tag, description, OG/Twitter tags, and Title
  useEffect(() => {
    try {
      const isRemovedSample =
        route.path === 'watch' &&
        (route.param === 'sample-short-1' || route.param === 'sample-short-2');

      if (isRemovedSample) {
        applySeoMetadata({
          title: 'Video Removed – SocialIndia',
          description: 'This sample video is no longer available on SocialIndia.',
          canonicalUrl: `${SITE_URL}/`,
          noIndex: true,
        });
        return;
      }

      const routeMeta = ROUTE_SEO_META[route.path];
      let canonicalUrl = `${SITE_URL}/`;
      if (route.path === 'creator' && route.param) {
        canonicalUrl = `${SITE_URL}/@${encodeURIComponent(route.param)}`;
      } else if ((route.path === 'watch' || route.path === 'shorts') && route.param) {
        canonicalUrl = `${SITE_URL}/${route.path}/${encodeURIComponent(route.param)}`;
      } else if (routeMeta) {
        canonicalUrl = routeMeta.canonicalPath
          ? `${SITE_URL}/${routeMeta.canonicalPath}`
          : `${SITE_URL}/`;
      }

      if (route.path === 'watch' || route.path === 'shorts' || route.path === 'creator') {
        const currentCanonical =
          document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
        const hasPrerenderedEntityMeta =
          Boolean(route.param) &&
          currentCanonical === canonicalUrl &&
          Boolean(document.title) &&
          document.title !== DEFAULT_TITLE;
        if (hasPrerenderedEntityMeta) {
          return;
        }
        const fallbackTitle = routeMeta?.title || DEFAULT_TITLE;
        const fallbackDescription = routeMeta?.description || DEFAULT_DESCRIPTION;
        applySeoMetadata({
          title: fallbackTitle,
          description: fallbackDescription,
          canonicalUrl,
          ogType: route.path === 'watch' || (route.path === 'shorts' && route.param) ? 'video.other' : 'website',
          noIndex: route.path === 'creator' && !route.param,
        });
        return;
      }

      applySeoMetadata({
        title: routeMeta?.title || DEFAULT_TITLE,
        description: routeMeta?.description || DEFAULT_DESCRIPTION,
        canonicalUrl,
        noIndex: Boolean(routeMeta?.noIndex),
      });
    } catch {}
  }, [route.path, route.param]);

  // Standalone Admin Panel Workspace with Back to Main Website Header
  if (route.path === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-white flex flex-col font-sans">
        {/* Top Standalone Admin Bar */}
        <header className="h-16 bg-white dark:bg-[#121215] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-4">
            <SocialIndiaLogo onClick={() => navigate('home')} />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-[#2563EB] dark:text-blue-400 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Super Admin Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Live Secure Administration</span>
            </div>
            
            <button
              onClick={() => navigate('home')}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-blue-500/20"
              title="Return to SocialIndia Main Website"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Back to Main Website</span>
            </button>
          </div>
        </header>

        {/* Full-width standalone Admin Workspace */}
        <main className="flex-1 min-w-0">
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback path={route.path} />}>
              <AdminPanel />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  if (
    route.path === 'login' || 
    route.path === 'signin' || 
    route.path === 'signup' || 
    route.path === 'register' || 
    route.path === 'create-account' ||
    route.path === 'forgot-password' ||
    route.path === 'reset-password'
  ) {
    let mode: 'login' | 'register' | 'forgot-password' = 'login';
    if (route.path === 'signup' || route.path === 'register' || route.path === 'create-account') {
      mode = 'register';
    } else if (route.path === 'forgot-password' || route.path === 'reset-password') {
      mode = 'forgot-password';
    }
    return (
      <Suspense fallback={<RouteFallback />}>
        <SignInPage initialMode={mode} />
      </Suspense>
    );
  }
  if (route.path === 'about') {
    return <Suspense fallback={<RouteFallback />}><AboutPage /></Suspense>;
  }
  if (route.path === 'privacy') {
    return <Suspense fallback={<RouteFallback />}><PrivacyPolicyPage /></Suspense>;
  }
  if (route.path === 'terms') {
    return <Suspense fallback={<RouteFallback />}><TermsPage /></Suspense>;
  }
  if (route.path === 'refund') {
    return <Suspense fallback={<RouteFallback />}><RefundPolicyPage /></Suspense>;
  }
  if (route.path === 'faq') {
    return <Suspense fallback={<RouteFallback />}><FAQPage /></Suspense>;
  }
  if (route.path === 'contact') {
    return <Suspense fallback={<RouteFallback />}><ContactUsPage /></Suspense>;
  }
  if (route.path === 'grievance') {
    return <Suspense fallback={<RouteFallback />}><GrievancePage /></Suspense>;
  }
  if (route.path === 'developers') {
    return <Suspense fallback={<RouteFallback />}><DevelopersPage /></Suspense>;
  }
  if (route.path === 'language') {
    return <Suspense fallback={<RouteFallback />}><LanguageSettingsPage /></Suspense>;
  }
  if (route.path === 'guidelines') {
    return <Suspense fallback={<RouteFallback />}><CommunityGuidelinesPage /></Suspense>;
  }

  // Route selector mapping
  const renderRoute = () => {
    switch (route.path) {
      case 'home':
        return <Home />;
      case 'explore':
        return <CommunityPage />;
      case 'upload':
        return <UploadPage />;
      case 'downloads':
        return <Downloads />;
      case 'admin':
        return <AdminPanel />;
      case 'search':
        return <Search />;
      case 'watch':
        return <Watch />;
      case 'shorts':
        return <Shorts />;
      case 'trending':
        return <Trending />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'history':
        return <WatchHistory />;
      case 'saved':
        return <SavedVideos />;
      case 'liked':
      case 'liked-videos':
        return <LikedVideos />;
      case 'playlists':
      case 'playlist':
        return <PlaylistsPage />;
      case 'creator':
      case 'channel':
      case 'user':
      case 'profile':
      case 'c':
        return <CreatorProfile key={`creator_${route.param || 'me'}`} />;
      case 'studio':
        return <CreatorStudio />;
      case 'settings':
        return <Settings />;
      case 'download-app':
      case 'app':
      case 'apk':
      case 'get-app':
        return <Settings initialTab="app_download" />;
      case 'profile-menu':
        return <MobileMenu />;
      case 'chat':
      case 'messages':
        return <ChatPage />;
      case 'community':
      case 'posts':
        return <CommunityPage />;
      case 'advertising':
        return <AdvertisingPage />;
      case 'adinfo':
      case 'ad-info':
      case 'ad':
        return <AdInfoPage />;
      case 'gopro':
      case 'pro':
        return <GoProPage />;
      case 'help':
        return <HelpPage />;
      case 'feedback':
        return <FeedbackPage />;
      default:
        return <Home />;
    }
  };

  return (
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<RouteFallback path={route.path} />}>
          {renderRoute()}
        </Suspense>
      </AppShell>
    </ErrorBoundary>
  );
}

function isAndroidOAuthFlow(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('android_oauth') === '1') return true;
    return sessionStorage.getItem('socialindia_android_oauth') === '1';
  } catch {
    return false;
  }
}

export default function App() {
  if (isAndroidOAuthFlow()) {
    return <AndroidOAuthBridge />;
  }

  return (
    <AppProvider>
      <MainAppContent />
      <ShareModal />
    </AppProvider>
  );
}
