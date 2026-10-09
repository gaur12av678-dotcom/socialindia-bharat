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
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Terms of Service & Community Rules (IT Rules 2021 Compliant)
          </h3>
          
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium space-y-6">
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                1. What You Can & Cannot Upload (Prohibited Content)
              </h4>
              <p className="mb-2">
                Under Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, users are strictly informed that they shall NOT host, display, upload, modify, publish, transmit, store, update, or share any information that:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                <li><strong>Belongs to another person:</strong> Without authorization or legal license (copyright piracy, unauthorized audio).</li>
                <li><strong>Harmful or abusive:</strong> Defamatory, obscene, pornographic, pedophilic, invasive of another&apos;s privacy, hateful, racially or ethnically objectionable.</li>
                <li><strong>Child-harmful content:</strong> Any content harmful to minors, abusive, sexualized, or promoting self-harm/violence.</li>
                <li><strong>Infringes intellectual property:</strong> Infringes any patent, trademark, copyright, or other proprietary rights.</li>
                <li><strong>Deceives or misleads:</strong> Misleading information, fake news, impersonation of another person, or phishing scams.</li>
                <li><strong>Threatens national unity:</strong> Threatens the sovereignty, integrity of India, defense, security of the State, or public order.</li>
                <li><strong>Malicious software:</strong> Contains software viruses or code designed to disrupt, destroy, or limit functionality.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                2. Age Safeguards & Child Safety Protection
              </h4>
              <p>
                SocialIndia is strictly available for individuals aged 13 and above. Minor users (under 18 years of age) may only use the service with the verifiable consent and guidance of a parent or legal guardian. SocialIndia does not knowingly collect sensitive or personal tracking information from children. Child sexual abuse material (CSAM) or any form of child exploitation is subject to immediate permanent banning and mandatory reporting to law enforcement authorities (NCPR & NCRB).
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                3. Copyright Takedown & Impersonation Workflow
              </h4>
              <p>
                We respect the intellectual property of creators and copyright holders. If you believe your copyrighted music, video, or likeness has been uploaded without authorization, you can file a formal takedown notice via the <strong>Report button (⋮ → Report → Copyright)</strong> or contact our <strong>Grievance Officer</strong> at <span className="font-bold text-blue-600">grievance@socialindia.com</span>. Infringing content is taken down within statutory timelines.
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                4. Account Sanctions, Restriction & Suspension Policy
              </h4>
              <p className="mb-2">
                SocialIndia enforces a structured, transparent consequence ladder:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                <li><strong>Level 1 (Warning):</strong> First-time minor infraction generates a formal notice in your account notification feed.</li>
                <li><strong>Level 2 (Content Removal):</strong> Repeated infraction results in content takedown and temporary 7-day upload restriction.</li>
                <li><strong>Level 3 (Account Restriction):</strong> Severe or repeated violation disables messaging, commenting, and wallet withdrawals.</li>
                <li><strong>Level 4 (Permanent Suspension):</strong> Egregious violations (illegal acts, CSAM, fraud, systemic piracy) result in permanent channel termination, wallet forfeiture, and IP banning.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                5. Transparency & User Right to Appeal
              </h4>
              <p>
                Whenever content is removed or an account is restricted, the affected creator receives a formal Transparency Notice specifying the violation grounds. Creators have the legal right to submit an appeal through our Redressal Mechanism. Our Trust & Safety team reviews all appeals impartially.
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-1 text-[11px]">
                6. Grievance Redressal Mechanism (MeitY IT Rules 2021)
              </h4>
              <p>
                As required by Rule 3(2), complaints are acknowledged within <strong>24 hours</strong> and disposed within <strong>15 days</strong>. Any complaint relating to non-consensual sexual content, private nudity, or identity impersonation is subject to emergency removal within <strong>24 hours</strong>. Contact: <strong>Adv. Rajesh Sharma</strong>, Resident Grievance Officer (<span className="font-bold text-blue-600">grievance@socialindia.com</span>).
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
