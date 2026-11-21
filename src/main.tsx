import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Recover automatically if a new deployment invalidated a preloaded JS chunk
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    try {
      const guardKey = 'socialindia_chunk_reload_at';
      const lastReload = Number(sessionStorage.getItem(guardKey) || '0');
      const now = Date.now();
      if (navigator.onLine && (!lastReload || now - lastReload > 15000)) {
        event.preventDefault();
        sessionStorage.setItem(guardKey, String(now));
        window.location.reload();
      }
    } catch {
      // Ignore storage errors
    }
  });
}

// Register offline Service Worker and check for live updates immediately
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => {
      registration.update().catch(() => {});
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
