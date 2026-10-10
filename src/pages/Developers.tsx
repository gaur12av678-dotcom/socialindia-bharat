import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { ArrowLeft, Code, Terminal, Play } from 'lucide-react';

export const DevelopersPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-10 pb-24">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#065fd4] dark:hover:text-blue-500 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Header Title Card */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#161616]/80 text-[#00a3ff] border border-slate-200 dark:border-slate-800 rounded-full">
            <Terminal className="w-4 h-4" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Developer Ecosystem
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
            Developers & API
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            Integrate SocialIndia content feeds, parse channels, and securely configure cross-origin video embedding models.
          </p>
        </div>

        {/* Detailed API Card */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">GET Metadata REST API</h3>
          
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-4">
            <p>We provide open integration endpoint structures. developers can query channel metadata securely using regular web parameters:</p>
            
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl font-mono text-[10px] text-slate-800 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 space-y-1 overflow-x-auto">
              <p className="text-slate-500">// Get Creator Channel Public Metadata</p>
              <p><span className="text-blue-600 font-bold">GET</span> https://api.socialindia.com/v1/creators/<span className="text-amber-500">{"{username}"}</span></p>
              <br />
              <p className="text-slate-500">// Response Payload Structure</p>
              <p>{"{"}</p>
              <p className="pl-4">"status": "success",</p>
              <p className="pl-4">"data": {"{"}</p>
              <p className="pl-8">"username": "rahul_tech",</p>
              <p className="pl-8">"displayName": "Rahul Sharma",</p>
              <p className="pl-8">"verified": true,</p>
              <p className="pl-8">"followersCount": 42000,</p>
              <p className="pl-8">"points": 950</p>
              <p className="pl-4">{"}"}</p>
              <p>{"}"}</p>
            </div>

            <p>All core code blocks run under sleek React TSX Vite parameters. Media file transfers and responsive thumbnails are optimized globally via high-performance edge Content Delivery Networks.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
