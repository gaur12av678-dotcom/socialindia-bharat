import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
