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

// Import standalone policy components
import { PrivacyPolicyPage } from './pages/PrivacyPolicy';
import { TermsPage } from './pages/Terms';
import { RefundPolicyPage } from './pages/RefundPolicy';
import { FAQPage } from './pages/FAQ';
import { ContactUsPage } from './pages/ContactUs';
import { DevelopersPage } from './pages/Developers';
import { LanguageSettingsPage } from './pages/LanguageSettings';
import { CommunityGuidelinesPage } from './pages/CommunityGuidelines';

function MainAppContent() {
  const { route } = useRouter();

  // Scroll to top on every route/param change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [route.path, route.param]);

  if (route.path === 'login' || route.path === 'signin') {
    return <SignInPage />;
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
      case 'playlists':
      case 'playlist':
        return <PlaylistsPage />;
      case 'creator':
        return <CreatorProfile />;
      case 'studio':
        return <CreatorStudio />;
      case 'settings':
        return <Settings />;
      case 'profile-menu':
        return <MobileMenu />;
      case 'chat':
      case 'messages':
        return <ChatPage />;
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
