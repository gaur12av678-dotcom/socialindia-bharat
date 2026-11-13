import React, { useEffect, Suspense, lazy } from 'react';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { useRouter } from './hooks/useRouter';
import { ErrorBoundary } from './components/ErrorBoundary';

// Eager Home for 0ms YouTube-style initial boot
import { Home } from './pages/Home';

// Lazy-loaded pages to keep initial bundle lightweight and fast on live mobile/app
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const Watch = lazy(() => import('./pages/Watch').then(m => ({ default: m.Watch })));
const Shorts = lazy(() => import('./pages/Shorts').then(m => ({ default: m.Shorts })));
const Trending = lazy(() => import('./pages/Trending').then(m => ({ default: m.Trending })));
const Subscriptions = lazy(() => import('./pages/Subscriptions').then(m => ({ default: m.Subscriptions })));
const WatchHistory = lazy(() => import('./pages/History').then(m => ({ default: m.WatchHistory })));
const SavedVideos = lazy(() => import('./pages/Saved').then(m => ({ default: m.SavedVideos })));
const LikedVideos = lazy(() => import('./pages/Liked').then(m => ({ default: m.LikedVideos })));
const PlaylistsPage = lazy(() => import('./pages/Playlists').then(m => ({ default: m.PlaylistsPage })));
const CreatorProfile = lazy(() => import('./pages/Creator').then(m => ({ default: m.CreatorProfile })));
const CreatorStudio = lazy(() => import('./pages/Studio').then(m => ({ default: m.CreatorStudio })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const AdminPanel = lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminPanel })));
const HelpPage = lazy(() => import('./pages/Help').then(m => ({ default: m.HelpPage })));
const FeedbackPage = lazy(() => import('./pages/Feedback').then(m => ({ default: m.FeedbackPage })));
const Downloads = lazy(() => import('./pages/Downloads').then(m => ({ default: m.Downloads })));
const AboutPage = lazy(() => import('./pages/About').then(m => ({ default: m.AboutPage })));
const UploadPage = lazy(() => import('./pages/Upload').then(m => ({ default: m.UploadPage })));
const AdvertisingPage = lazy(() => import('./pages/Advertising').then(m => ({ default: m.AdvertisingPage })));
const AdInfoPage = lazy(() => import('./pages/AdInfo').then(m => ({ default: m.AdInfoPage })));
const GoProPage = lazy(() => import('./pages/GoPro').then(m => ({ default: m.GoProPage })));
const SignInPage = lazy(() => import('./pages/SignIn').then(m => ({ default: m.SignInPage })));
const ChatPage = lazy(() => import('./pages/Chat').then(m => ({ default: m.ChatPage })));
const MobileMenu = lazy(() => import('./pages/MobileMenu').then(m => ({ default: m.MobileMenu })));
const CommunityPage = lazy(() => import('./pages/Community').then(m => ({ default: m.CommunityPage })));

// Standalone policy components
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('./pages/Terms').then(m => ({ default: m.TermsPage })));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicy').then(m => ({ default: m.RefundPolicyPage })));
const FAQPage = lazy(() => import('./pages/FAQ').then(m => ({ default: m.FAQPage })));
const ContactUsPage = lazy(() => import('./pages/ContactUs').then(m => ({ default: m.ContactUsPage })));
const DevelopersPage = lazy(() => import('./pages/Developers').then(m => ({ default: m.DevelopersPage })));
const LanguageSettingsPage = lazy(() => import('./pages/LanguageSettings').then(m => ({ default: m.LanguageSettingsPage })));
const CommunityGuidelinesPage = lazy(() => import('./pages/CommunityGuidelines').then(m => ({ default: m.CommunityGuidelinesPage })));

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

  // Dynamically sync Canonical link, robots tag, and Title for Googlebot and SEO crawlers
  useEffect(() => {
    try {
      const canonicalHref = route.path === 'home'
        ? 'https://socialindia.web.app/'
        : `https://socialindia.web.app/${route.path}${route.param ? `/${route.param}` : ''}`;
      
      let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', canonicalHref);

      let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
      if (!ogUrl) {
        ogUrl = document.createElement('meta');
        ogUrl.setAttribute('property', 'og:url');
        document.head.appendChild(ogUrl);
      }
      ogUrl.setAttribute('content', canonicalHref);

      // Protect private/authenticated pages from indexing
      const privateRoutes = ['admin', 'settings', 'history', 'saved', 'liked', 'liked-videos', 'chat', 'login', 'signin', 'signup', 'register', 'forgot-password', 'reset-password'];
      let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      if (privateRoutes.includes(route.path)) {
        robotsMeta.setAttribute('content', 'noindex, nofollow');
      } else {
        robotsMeta.setAttribute('content', 'index, follow');
      }

      // Dynamic page titles for standard routes
      const routeTitles: Record<string, string> = {
        home: 'SocialIndia (Official) – India’s Video, Shorts & Community Platform',
        trending: 'Trending Videos & Posts – SocialIndia',
        explore: 'Community & Discussions – SocialIndia',
        community: 'Community & Discussions – SocialIndia',
        about: 'About Us – SocialIndia',
        terms: 'Terms of Service – SocialIndia',
        privacy: 'Privacy Policy – SocialIndia',
        faq: 'Frequently Asked Questions – SocialIndia',
        contact: 'Contact Us – SocialIndia',
        advertising: 'SocialIndia Advertising – Promote Your Brand',
        adinfo: 'Ad Transparency Center – SocialIndia',
        gopro: 'SocialIndia Pro – Premium Creator Tools',
        downloads: 'Download Mobile App – SocialIndia',
        developers: 'Developer Portal – SocialIndia API',
        guidelines: 'Community Guidelines – SocialIndia',
        shorts: 'Trending Shorts – Watch Short Videos on SocialIndia',
        search: 'Search Videos & Creators – SocialIndia',
        help: 'Help Center & Tutorials – SocialIndia',
        refund: 'Refund & Cancellation Policy – SocialIndia',
        studio: 'Creator Studio – SocialIndia',
        playlists: 'My Playlists – SocialIndia',
        admin: 'Super Admin Workspace – SocialIndia',
      };

      if (routeTitles[route.path]) {
        document.title = routeTitles[route.path];
      }
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
          <Suspense fallback={<RouteFallback path={route.path} />}>
            <AdminPanel />
          </Suspense>
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

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
