// Search History Service - YouTube-style persistent search history management

const STORAGE_KEY = 'socialindia_search_history';
const MAX_HISTORY_ITEMS = 20;

export interface SearchHistoryEntry {
  id: string;
  query: string;
  timestamp: number;
}

export const POPULAR_SEARCH_SUGGESTIONS = [
  'Bollywood News',
  'Cricket Highlights',
  'Viral Shorts',
  'Hindi Songs 2026',
  'Indian Tech Reviews',
  'Desi Food Recipes',
  'Comedy Videos',
  'Vande Bharat Express',
  'AI & Coding in India',
  'Standup Comedy',
];

class SearchHistoryService {
  private memoryCache: SearchHistoryEntry[] | null = null;

  public getHistory(): SearchHistoryEntry[] {
    if (this.memoryCache !== null) {
      return this.memoryCache;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Normalize if saved as strings or objects
          const normalized: SearchHistoryEntry[] = parsed.map((item, index) => {
            if (typeof item === 'string') {
              return { id: `hist-${index}-${Date.now()}`, query: item, timestamp: Date.now() - index * 1000 };
            }
            return item;
          });
          this.memoryCache = normalized;
          return normalized;
        }
      }
    } catch (e) {
      console.warn('Failed to read search history from localStorage', e);
    }

    // Default sample searches for new users
    const defaults: SearchHistoryEntry[] = [
      { id: 'def-1', query: 'Vande Bharat', timestamp: Date.now() - 3600000 },
      { id: 'def-2', query: 'Indian Tech', timestamp: Date.now() - 7200000 },
      { id: 'def-3', query: 'Desi Comedy', timestamp: Date.now() - 10800000 },
    ];
    this.memoryCache = defaults;
    this.save(defaults);
    return defaults;
  }

  public addQuery(query: string): SearchHistoryEntry[] {
    const clean = query.trim();
    if (!clean) return this.getHistory();

    const current = this.getHistory();
    // Filter out existing query case-insensitively
    const filtered = current.filter(item => item.query.toLowerCase() !== clean.toLowerCase());

    const newEntry: SearchHistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      query: clean,
      timestamp: Date.now(),
    };

    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    this.memoryCache = updated;
    this.save(updated);
    this.broadcast();
    return updated;
  }

  public removeQuery(queryOrId: string): SearchHistoryEntry[] {
    const current = this.getHistory();
    const updated = current.filter(
      item => item.id !== queryOrId && item.query.toLowerCase() !== queryOrId.toLowerCase()
    );
    this.memoryCache = updated;
    this.save(updated);
    this.broadcast();
    return updated;
  }

  public clearHistory(): void {
    this.memoryCache = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
      // also clear legacy key if any
      localStorage.removeItem('socialindia_recent_searches');
    } catch (e) {
      console.warn(e);
    }
    this.broadcast();
  }

  private save(items: SearchHistoryEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      // keep legacy key updated with simple string array for backwards compatibility
      localStorage.setItem('socialindia_recent_searches', JSON.stringify(items.map(i => i.query)));
    } catch (e) {
      console.warn('Failed to save search history', e);
    }
  }

  private broadcast(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socialindia:search_history_updated'));
    }
  }
}

export const searchHistoryService = new SearchHistoryService();
