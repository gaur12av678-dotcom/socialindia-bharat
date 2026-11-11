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
              Authentication and security parameters are processed securely via industry-grade, double-encrypted security and authentication endpoints.
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
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Detailed Data Protection & Compliance Standards
          </h3>
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-5">
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                1. What Personal Data We Collect
              </h4>
              <p className="mb-2">We collect only necessary operational information to provide the service:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                <li><strong>Identity & Account Data:</strong> Username, Display Name, Email address, profile photo URL, bio.</li>
                <li><strong>Usage & Engagement Data:</strong> Videos watched, likes, comments, playlists created, and followed channels.</li>
                <li><strong>Creator Financial Data:</strong> Wallet balance, bonus balance, purchase transactions, and UPI ID (used strictly for creator payout disbursement).</li>
                <li><strong>Device & Session Data:</strong> Browser session information, IP address for security rate-limiting, and theme preference.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                2. Purpose of Data Processing
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                <li>To enable video streaming, uploading, commenting, and interaction.</li>
                <li>To calculate creator ad-monetization earnings and disburse UPI withdrawals.</li>
                <li>To enforce community safety, detect bot fraud, and comply with IT Rules 2021 statutory orders.</li>
                <li>We <strong>NEVER</strong> sell or rent your personal information to third-party data brokers.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                3. User Privacy Rights (DPDP Act & Digital Rights)
              </h4>
              <p className="mb-2">Every user of SocialIndia holds full sovereignty over their digital data:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                <li><strong>Right to Access:</strong> View all your profile, watch history, and financial transactions at any time.</li>
                <li><strong>Right to Rectification:</strong> Edit your username, display name, bio, and credentials directly in Channel/Settings.</li>
                <li><strong>Right to Erasure (Delete Account & History):</strong> Clear your Watch History instantly with one click, or request complete account erasure.</li>
                <li><strong>Right to Withdraw Consent:</strong> You can opt out of promotional notifications or delete your channel anytime.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                4. Child Safety & Minors&apos; Privacy Safeguards
              </h4>
              <p>
                SocialIndia does not knowingly solicit or collect personal data from children under 13 years of age. Minor accounts (ages 13-17) require guardian oversight. In accordance with child safety laws, behavioral profiling or targeted advertising of minors is strictly barred.
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                5. Grievance Officer & Privacy Contact Information
              </h4>
              <p>
                For data privacy requests, corrections, or complaints under the IT (Intermediary Guidelines) Rules, 2021, contact our statutory Resident Grievance Officer:
              </p>
              <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-0.5 text-[11px]">
                <p><strong>Name:</strong> Adv. Rajesh Sharma, Resident Grievance Officer</p>
                <p><strong>Company:</strong> SocialIndia Media Pvt. Ltd.</p>
                <p><strong>Email:</strong> <a href="mailto:grievance@socialindia.com" className="text-blue-600 font-bold hover:underline">grievance@socialindia.com</a></p>
                <p><strong>Address:</strong> Barakhamba Road, Connaught Place, New Delhi 110001, India</p>
                <p><strong>Timelines:</strong> Acknowledged within 24 hours, disposed within 15 days.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
