import React, { useState } from 'react';
import { FileText, ShieldAlert, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

export const Legal: React.FC = () => {
  const [openSection, setOpenSection] = useState<'privacy' | 'terms' | 'guidelines'>('privacy');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto pb-20">
      
      {/* Title Header */}
      <div className="flex items-center gap-2.5">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-indigo-500 rounded-xl">
          <FileText className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Legal & Policy Pages</h2>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Please review the rules, terms, policies and community guidelines of SocialIndia</p>
        </div>
      </div>

      <div className="space-y-4">
        
        {/* PRIVACY POLICY */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setOpenSection(openSection === 'privacy' ? 'terms' : 'privacy')}
            className="w-full p-5 flex items-center justify-between font-extrabold text-xs tracking-wider uppercase text-left cursor-pointer hover:bg-slate-50/40 dark:hover:bg-[#272727]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Privacy Policy</span>
            </div>
            {openSection === 'privacy' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {openSection === 'privacy' && (
            <div className="p-5 border-t border-slate-100 dark:border-[#272727] text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-3">
              <p>At SocialIndia, accessible at socialindia.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by SocialIndia and how we use it.</p>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] pt-1">Information We Collect</h4>
              <p>If you register for an account on SocialIndia, we request profile identifiers such as Username and Display Name. Authentication security is validated securely via Google Firebase Authentication.</p>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] pt-1">How We Use Your Information</h4>
              <p>We use the collected information only to maintain user public profiles, render creator channel details, trigger event-based notifications, register watched video history records, and filter search inquiries correctly.</p>
            </div>
          )}
        </div>

        {/* TERMS OF SERVICE */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setOpenSection(openSection === 'terms' ? 'guidelines' : 'terms')}
            className="w-full p-5 flex items-center justify-between font-extrabold text-xs tracking-wider uppercase text-left cursor-pointer hover:bg-slate-50/40 dark:hover:bg-[#272727]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Terms of Service</span>
            </div>
            {openSection === 'terms' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {openSection === 'terms' && (
            <div className="p-5 border-t border-slate-100 dark:border-[#272727] text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-3">
              <p>By registering on or browsing SocialIndia, you represent that you accept and comply with these Terms of Service. If you disagree, you must not access or utilize the services.</p>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] pt-1">User Responsibilities</h4>
              <p>When publishing external video URLs, creators represent that they own the legal intellectual property rights or possess necessary licenses to embed/embed-link the content on SocialIndia. Distributing abusive, inappropriate, copyright-infringing, or spam URLs is strictly prohibited.</p>
            </div>
          )}
        </div>

        {/* COMMUNITY GUIDELINES */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-[#272727] rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setOpenSection(openSection === 'guidelines' ? 'privacy' : 'guidelines')}
            className="w-full p-5 flex items-center justify-between font-extrabold text-xs tracking-wider uppercase text-left cursor-pointer hover:bg-slate-50/40 dark:hover:bg-[#272727]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              <span>Community Guidelines</span>
            </div>
            {openSection === 'guidelines' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {openSection === 'guidelines' && (
            <div className="p-5 border-t border-slate-100 dark:border-[#272727] text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-3">
              <p>Our guidelines ensure that SocialIndia remains a trusted, creative, and professional social video ecosystem for everyone.</p>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] pt-1">Prohibited Content</h4>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-start gap-2 text-rose-600">
                  <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>Harassment, bullying, or threat vectors against users.</span>
                </div>
                <div className="flex items-start gap-2 text-rose-600">
                  <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>Spam, malware link poisoning, or deceptive marketing schemes.</span>
                </div>
                <div className="flex items-start gap-2 text-rose-600">
                  <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>Copyright theft and bulk re-uploads of other artists' content.</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
