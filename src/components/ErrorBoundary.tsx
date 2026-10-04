import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f0f] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-3xl mb-4 border border-rose-100 dark:border-rose-900/30 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Workspace Interrupted</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
            SocialIndia encountered a momentary runtime render issue. Don't worry, your personal wallet and workspace files are safe.
          </p>
          <pre className="mt-4 p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] text-left max-w-md overflow-x-auto font-mono text-slate-600 dark:text-rose-400">
            {this.state.error?.message || 'Unknown render exception'}
          </pre>
          <button
            onClick={() => window.location.reload()}
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
