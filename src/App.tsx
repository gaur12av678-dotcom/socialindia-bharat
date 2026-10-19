import React, { useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { useRouter } from './hooks/useRouter';
import { ErrorBoundary } from './components/ErrorBoundary';

// Page Components
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Watch } from './pages/Watch';
import { Shorts } from './pages/Shorts';
import { Trending } from './pages/Trending';
import { Subscriptions } from './pages/Subscriptions';
import { WatchHistory } from './pages/History';
import { SavedVideos } from './pages/Saved';
import { LikedVideos } from './pages/Liked';
import { PlaylistsPage } from './pages/Playlists';
import { CreatorProfile } from './pages/Creator';
import { CreatorStudio } from './pages/Studio';
import { Settings } from './pages/Settings';
import { AdminPanel } from './pages/Admin';
import { HelpPage } from './pages/Help';
import { FeedbackPage } from './pages/Feedback';
import { Downloads } from './pages/Downloads';
import { AboutPage } from './pages/About';
import { UploadPage } from './pages/Upload';
import { AdvertisingPage } from './pages/Advertising';
import { AdInfoPage } from './pages/AdInfo';
import { GoProPage } from './pages/GoPro';
import { SignInPage } from './pages/SignIn';
import { ChatPage } from './pages/Chat';
import { MobileMenu } from './pages/MobileMenu';
import { CommunityPage } from './pages/Community';

// Import standalone policy components
import { PrivacyPolicyPage } from './pages/PrivacyPolicy';
import { TermsPage } from './pages/Terms';
import { RefundPolicyPage } from './pages/RefundPolicy';
import { FAQPage } from './pages/FAQ';
import { ContactUsPage } from './pages/ContactUs';
import { DevelopersPage } from './pages/Developers';
import { LanguageSettingsPage } from './pages/LanguageSettings';
import { CommunityGuidelinesPage } from './pages/CommunityGuidelines';
import { ArrowLeft, Home as HomeIcon, ShieldCheck } from 'lucide-react';
import { SocialIndiaLogo } from './components/SocialIndiaLogo';

function MainAppContent() {
  const { route, navigate } = useRouter();

  // Scroll to top on route change, EXCEPT when returning to Home (preserves Home scroll position like YouTube)
  useEffect(() => {
    if (route.path !== 'home') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
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
          <AdminPanel />
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
    return <SignInPage initialMode={mode} />;
  }
  if (route.path === 'about') {
    return <AboutPage />;
  }
  if (route.path === 'privacy') {
    return <PrivacyPolicyPage />;
  }
  if (route.path === 'terms') {
    return <TermsPage />;
  }
  if (route.path === 'refund') {
    return <RefundPolicyPage />;
  }
  if (route.path === 'faq') {
    return <FAQPage />;
  }
  if (route.path === 'contact') {
    return <ContactUsPage />;
  }
  if (route.path === 'developers') {
    return <DevelopersPage />;
  }
  if (route.path === 'language') {
    return <LanguageSettingsPage />;
  }
  if (route.path === 'guidelines') {
    return <CommunityGuidelinesPage />;
  }

  // Route selector mapping
  const renderRoute = () => {
    switch (route.path) {
      case 'home':
        return <Home />;
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
      <AppShell>{renderRoute()}</AppShell>
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
