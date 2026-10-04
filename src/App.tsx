import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { useRouter } from './hooks/useRouter';

// Page Components
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Watch } from './pages/Watch';
import { Shorts } from './pages/Shorts';
import { Trending } from './pages/Trending';
import { Subscriptions } from './pages/Subscriptions';
import { WatchHistory } from './pages/History';
import { SavedVideos } from './pages/Saved';
import { CreatorProfile } from './pages/Creator';
import { CreatorStudio } from './pages/Studio';
import { Settings } from './pages/Settings';
import { Legal } from './pages/Legal';
import { AdminPanel } from './pages/Admin';
import { HelpPage } from './pages/Help';
import { FeedbackPage } from './pages/Feedback';
import { Downloads } from './pages/Downloads';
import { AboutPage } from './pages/About';

function MainAppContent() {
  const { route } = useRouter();

  // Route selector mapping
  const renderRoute = () => {
    switch (route.path) {
      case 'home':
        return <Home />;
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
      case 'creator':
        return <CreatorProfile />;
      case 'studio':
        return <CreatorStudio />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <HelpPage />;
      case 'feedback':
        return <FeedbackPage />;
      case 'privacy':
      case 'terms':
      case 'guidelines':
        return <Legal />;
      case 'about':
        return <AboutPage />;
      default:
        return <Home />;
    }
  };

  return <AppShell>{renderRoute()}</AppShell>;
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
