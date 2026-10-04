import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { ArrowLeft, Scale, ShieldAlert, CheckCircle } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-100/80 dark:border-amber-900/40 rounded-full">
            <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              User Agreement
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
            Terms of Use
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            By accessing or registering an account on SocialIndia (socialindia.com), you bind yourself to absolute compliance with these Terms of Use.
          </p>
        </div>

        {/* Detailed Guidelines Card */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Sovereign Terms & Rules</h3>
          
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-5">
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">1. Account Registration & Validity</h4>
              <p>You declare that your account information (Username, Display Name, Bio coordinates, and email) is genuine. Accounts determined to be duplicate fake identities used for spam or automated bots will be immediately terminated.</p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">2. Intellectual Property & Embedding Rights</h4>
              <p>When you publish video links, embed URLs, or short clips on SocialIndia, you represent that you own the necessary distribution licenses, copyrights, or legitimate fair-use authorizations. Any copyright infringement reported through our Contact or Support modules is subject to swift, permanent deletion without prior notice.</p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">3. Points System & Rewards Fraud Prevention</h4>
              <p>Points collected by watching videos, leaving comments, or liking shorts are platform promotional tokens and carry no intrinsic cash properties. Point-farming, bot-directed viewing, automated scripts, or manipulative engagement cycles represent breaches of trust and result in immediate account deletion, wallet forfeiture, and permanent IP address banning.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
