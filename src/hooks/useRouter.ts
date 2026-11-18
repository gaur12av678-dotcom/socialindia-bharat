import { useState, useEffect } from 'react';

export interface Route {
  path: string; // e.g. "watch" or "creator" or "home"
  param?: string; // e.g. videoId or username
  subTab?: string; // e.g. "videos" | "shorts" | "playlists" | "posts" | "community" | "about"
  searchParams?: Record<string, string>;
}

export function parseHash(hash: string): Route {
  let cleanHash = hash.replace(/^#\/?/, '');
  
  // If hash is empty, check window.location.pathname for clean URL routing
  if (!cleanHash && typeof window !== 'undefined' && window.location.pathname) {
    const cleanPath = window.location.pathname.replace(/^\//, '');
    if (cleanPath && cleanPath !== 'index.html') {
      cleanHash = cleanPath + (window.location.search || '');
    }
  }

  if (!cleanHash) {
    return { path: 'home' };
  }

  // Handle search params if any
  const [routePart, searchPart] = cleanHash.split('?');
  const searchParams: Record<string, string> = {};
  if (searchPart) {
    const params = new URLSearchParams(searchPart);
    params.forEach((val, key) => {
      searchParams[key] = val;
    });
  }

  const parts = routePart.split('/').filter(Boolean);
  let path = parts[0] || 'home';
  let param = parts[1] || undefined;
  let subTab: string | undefined = undefined;

  // Keep the existing Shorts page while exposing Clips URLs to users.
  if (path === 'clips') {
    path = 'shorts';
  }

  // Handle YouTube-style @handle and channel routes: /@handle, /@handle/shorts, /@handle/about, etc.
  if (path.startsWith('@')) {
    param = path.substring(1);
    subTab = parts[1] || searchParams.tab || undefined;
    path = 'creator';
  } else if (path === 'channel' || path === 'user' || path === 'profile' || path === 'c' || path === 'creator') {
    path = 'creator';
    param = parts[1] ? parts[1].replace(/^@/, '') : undefined;
    subTab = parts[2] || searchParams.tab || undefined;
  }

  // Handle YouTube-style /watch?v=VIDEO_ID or /watch/VIDEO_ID
  if (path === 'watch') {
    if (!param && searchParams.v) {
      param = searchParams.v;
    } else if (!param && searchParams.id) {
      param = searchParams.id;
    }
  }

  // Handle /shorts?v=VIDEO_ID or /shorts/VIDEO_ID
  if (path === 'shorts') {
    if (!param && searchParams.v) {
      param = searchParams.v;
    } else if (!param && searchParams.id) {
      param = searchParams.id;
    }
  }

  return { path, param, subTab, searchParams };
}

export function buildRoutePath(
  path: string,
  param?: string,
  searchParams?: Record<string, string>
): string {
  const cleanPath = (path || 'home').replace(/^\/+/, '');
  let pathname = cleanPath === 'home' ? '/' : `/${cleanPath}`;
  if (param && cleanPath !== 'home') {
    pathname += `/${encodeURIComponent(param)}`;
  }
  if (searchParams) {
    const query = new URLSearchParams(searchParams).toString();
    if (query) {
      pathname += `?${query}`;
    }
  }
  return pathname;
}

const ROUTE_CHANGE_EVENT = 'socialindia:routechange';

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener(ROUTE_CHANGE_EVENT, handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener(ROUTE_CHANGE_EVENT, handleRouteChange);
    };
  }, []);

  const navigate = (path: string, param?: string, searchParams?: Record<string, string>) => {
    const targetUrl = buildRoutePath(path, param, searchParams);
    try {
      if (window.location.pathname + window.location.search !== targetUrl || window.location.hash) {
        window.history.pushState(null, '', targetUrl);
      }
      window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
    } catch {
      const routePath = path === 'shorts' ? 'clips' : path;
      let newHash = `#/${routePath}`;
      if (param) newHash += `/${param}`;
      if (searchParams) {
        const query = new URLSearchParams(searchParams).toString();
        if (query) newHash += `?${query}`;
      }
      window.location.hash = newHash;
    }
  };

  return {
    route: currentRoute,
    navigate,
    back: () => window.history.back(),
  };
}
