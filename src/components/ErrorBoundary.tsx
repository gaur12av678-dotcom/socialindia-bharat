import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_RELOAD_GUARD_KEY = 'socialindia_chunk_reload_at';

function isChunkLoadError(error: Error | null): boolean {
  const msg = error?.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error across SocialIndia boundary:', error, errorInfo);

    if (typeof window !== 'undefined' && navigator.onLine && isChunkLoadError(error)) {
      try {
        const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) || '0');
        const now = Date.now();
        if (!lastReload || now - lastReload > 15000) {
          sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, String(now));
          void this.handleHardReload();
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  private handleHardReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {
      // Ignore cache clear failures
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError = isChunkLoadError(this.state.error);
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f0f] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-3xl mb-4 border border-rose-100 dark:border-rose-900/30 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {isChunkError ? 'App Update Required' : 'Workspace Interrupted'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
            {isChunkError
              ? 'A newer version of SocialIndia was published or your connection blipped while loading this page. Reloading fixes it immediately.'
              : "SocialIndia encountered a momentary runtime render issue. Don't worry, your personal wallet and workspace files are safe."}
          </p>
          <pre className="mt-4 p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] text-left max-w-md w-full whitespace-pre-wrap break-all font-mono text-slate-600 dark:text-rose-400">
            {this.state.error?.message || 'Unknown render exception'}
          </pre>
          <button
            onClick={() => void this.handleHardReload()}
            className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-2 shadow-md shadow-blue-500/10 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Platform</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
