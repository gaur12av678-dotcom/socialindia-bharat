import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { ArrowLeft, HelpCircle } from 'lucide-react';

export const FAQPage: React.FC = () => {
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
            <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              FAQs & Assistance
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            Quickly find answers to points conversion, wallet balance payouts, advertising promotion campaigns, and content rules.
          </p>
        </div>

        {/* FAQ grid list */}
        <div className="space-y-4 pt-2">
          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Q: How do I earn points on SocialIndia?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              A: Earning is completely organic! You earn points by engaging: watching videos (+2 points), liking videos/shorts (+5 points), posting constructive comments (+10 points), and uploading standard or short video clips (+20 points).
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Q: What is the point token conversion formula?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              A: 100 points converted represent $1.00 USD. You can convert points directly to USD wallet balances from the Settings page under the "Balance" tab.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Q: How can I promote my channel or brand?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              A: Go to our custom Advertising page to launch localized campaigns. Target specific video categories or user profiles to drive verified views and subscriber growths.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Q: Who qualifies for the verified creator badge?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              A: Creators with active profile portfolios can apply from the Settings page. Applications are evaluated for genuine quality, copyright ownership, and constructive engagement parameters by our platform safety team.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
