// SocialIndia Real Offline Service Worker
const VERSION = '1.0.3';
const CACHE_NAME = `socialindia-shell-v${VERSION}`;

const STATIC_ASSETS = [
  '/logo.svg',
  '/socialindia-logo.png',
  '/socialindia-icon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Some static assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // CRITICAL: Cache only same-origin static assets
  const isSameOrigin = url.origin === self.location.origin;

  // CRITICAL: Never cache requests whose URL contains '/users/' responses, firebase auth, or auth state
  const isProtectedPath = url.pathname.includes('/users/') || 
                          url.origin.includes('firestore.googleapis.com') ||
                          url.origin.includes('identitytoolkit.googleapis.com') ||
                          url.origin.includes('firebaseio.com') ||
                          url.pathname.includes('/api/auth');

  if (!isSameOrigin || isProtectedPath) {
    // Network-only for protected, external, or non-origin assets
    return;
  }

  // Always bypass HTTP cache for HTML/navigation and sw.js so updates deploy immediately
  const isHtmlNavigation =
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  const fetchRequest = isHtmlNavigation
    ? new Request(event.request, { cache: 'no-cache' })
    : event.request;

  // Network First, Fallback to Cache for same-origin app assets
  event.respondWith(
    fetch(fetchRequest)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // When completely offline, serve from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Keep network-first for navigations
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/index.html') || await caches.match('/');
          if (fallback) return fallback;
        }

        return new Response('Offline: SocialIndia is running offline. Open Downloads from the menu to watch your saved videos.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
