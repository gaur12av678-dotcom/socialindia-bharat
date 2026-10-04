import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { ArrowLeft, ShieldAlert, CheckCircle } from 'lucide-react';

export const CommunityGuidelinesPage: React.FC = () => {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-100/80 dark:border-rose-900/40 rounded-full">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Community Standard
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
            Community & Comment Guidelines
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            Our guidelines guarantee that SocialIndia remains a positive, inspirational, constructive, and highly safe social platform.
          </p>
        </div>

        {/* Detailed Guidelines Card */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Comment Policy & Moderation Standard (Commentugu)</h3>
          
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-5">
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1.5 text-[11px]">1. Healthy Engagement & constructive feedback</h4>
              <p>Comments are designed for sharing feedback, encouraging digital content creators, and building positive discussion cycles. Abusive, threat-laden, regionalist slurs, hate speech, or bulk spam comments will be deleted instantly by automatic filters.</p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1.5 text-[11px]">2. Zero Tolerance for Spam Bots</h4>
              <p>Automated comments, pasting repetitive copy-paste promo links, links to malware domains, and fake account floods are heavily moderated. Breaches of this standard will result in immediate channel suspensions.</p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1.5 text-[11px]">3. Family-Safe Content & Child Safety</h4>
              <p>All videos, short clips, and reel audio uploads must follow clean, family-safe regulations. Graphic violence, dangerous stunts, self-harm, harassment, or non-consensual imagery is strictly prohibited on SocialIndia.</p>
            </div>
          </div>
        </div>

        {/* Prohibited items list */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Prohibited Actions:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 text-rose-600">
              <CheckCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Regional or national abuse slurs</span>
            </div>
            <div className="flex items-start gap-2 text-rose-600">
              <CheckCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Copyright piracy and re-uploads</span>
            </div>
            <div className="flex items-start gap-2 text-rose-600">
              <CheckCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Automated botting and view farms</span>
            </div>
            <div className="flex items-start gap-2 text-rose-600">
              <CheckCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Abusive comments & hate speech</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
