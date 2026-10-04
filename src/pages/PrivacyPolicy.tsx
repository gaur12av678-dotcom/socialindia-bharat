import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { ArrowLeft, FileText, Shield, Eye, Lock, Server } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/80 dark:border-blue-900/40 rounded-full">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Data Privacy Commitment
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            At SocialIndia, accessible from socialindia.com, your privacy and data sovereignty are our absolute top priority. This Privacy Policy outlines what information we collect and how we safeguard it.
          </p>
        </div>

        {/* Content sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Information We Log</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              We securely log profile identifiers (Username, Display Name, Bio, Avatar Photo), point tallies, wallet balances, watch history, and display preferences.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Double Encryption</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Authentication and security parameters are processed securely via secure, double-encrypted Firebase Authentication SDK endpoints.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Zero Data Selling</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              We never distribute, lease, or trade your emails, wallet coordinates, or payment details with foreign advertising brokers.
            </p>
          </div>
        </div>

        {/* Detailed Guidelines Card */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Detailed Data Usage Standard</h3>
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-4">
            <p><strong>1. Watch History Logging:</strong> Your watched videos history logs are stored securely to allow resuming playbacks across different devices seamlessly. Users retain full rights to wipe their Watch History instantly at any time from the History page.</p>
            <p><strong>2. Safe Cookies usage:</strong> Local browser storage is exclusively utilized to maintain your active theme session (light/dark) and system localization selections to optimize overall render latency. No tracking or marketing cookies are installed.</p>
            <p><strong>3. Sovereign Data Custody:</strong> All database records and assets reside in firewalled, secure cloud partitions. We run 24/7 scanning audits against any unauthorized access vectors.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
