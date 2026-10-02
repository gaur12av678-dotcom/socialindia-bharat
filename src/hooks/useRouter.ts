import { useState, useEffect } from 'react';

export interface Route {
  path: string; // e.g. "watch" or "creator" or "home"
  param?: string; // e.g. videoId or username
  searchParams?: Record<string, string>;
}

export function parseHash(hash: string): Route {
  const cleanHash = hash.replace(/^#\/?/, '');
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

  const parts = routePart.split('/');
  const path = parts[0] || 'home';
  const param = parts[1] || undefined;

  return { path, param, searchParams };
}

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>(parseHash(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = (path: string, param?: string, searchParams?: Record<string, string>) => {
    let newHash = `#/${path}`;
    if (param) {
      newHash += `/${param}`;
    }
    if (searchParams) {
      const query = new URLSearchParams(searchParams).toString();
      if (query) {
        newHash += `?${query}`;
      }
    }
    window.location.hash = newHash;
  };

  return {
    route: currentRoute,
    navigate,
    back: () => window.history.back(),
  };
}
