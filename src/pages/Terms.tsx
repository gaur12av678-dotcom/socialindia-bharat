import React from 'react';
import { ArrowLeft, Scale } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';

const sections = [
  {
    title: '1. Introduction and Acceptance of Terms',
    body: 'These Terms apply to your use of SocialIndia at https://socialindia.web.app/ and its available features. By using the service, you agree to these Terms and applicable law. If you do not agree, do not use the service.',
  },
  {
    title: '2. Eligibility and Account Responsibility',
    body: 'You are responsible for the accuracy of information you provide, keeping account credentials secure, and activity under your account. The current registration flow does not provide age verification or a guardian-consent workflow. Do not use the service if you are not legally eligible to do so.',
  },
  {
    title: '3. User Content and Ownership',
    body: 'You retain rights you hold in content you submit. You grant SocialIndia permission to host, store, reproduce, display, and deliver that content as needed to operate the features you choose. You are responsible for having the rights and permissions needed to submit it.',
  },
  {
    title: '4. Prohibited Content and Activities',
    body: 'Do not upload or distribute illegal content, copyright-infringing material, child sexual exploitation material, non-consensual intimate content, harassment or threats, impersonation or fraud, doxxing or unauthorized personal information, hateful content or promotion of violence, malware, phishing or harmful links, or content otherwise prohibited by applicable Indian law. Do not disrupt, misuse, or attempt unauthorized access to the service.',
  },
  {
    title: '5. Copyright and Intellectual Property',
    body: 'Only submit material you own or are authorized to use. If you believe content infringes your rights, use the in-product reporting option where available, contact socialindia.ib@gmail.com, or submit a formal complaint through the separate Grievance Redressal page. Provide enough information to identify the work and content. No automatic removal or response period is promised for every request.',
  },
  {
    title: '6. Privacy and Personal Information',
    body: 'SocialIndia processes account and activity information to provide the service. See the Privacy Policy for details about the application data and service providers. Avoid publishing personal information that you do not want to make public.',
  },
  {
    title: '7. Community Guidelines and User Safety',
    body: 'Use the service respectfully and follow the Community Guidelines. The Guidelines describe platform expectations; they do not guarantee that all content will be reviewed or removed.',
  },
  {
    title: '8. Content Reporting and Complaints',
    body: 'Use available in-product reporting tools for content or account concerns. For a formal complaint, use the Grievance Redressal page. A report or complaint is not a guarantee of a particular outcome. SocialIndia does not publish statutory officer details until a genuine appointment has been completed.',
  },
  {
    title: '9. Content Removal and Account Restrictions',
    body: 'SocialIndia may remove content, issue warnings, restrict features, suspend, or terminate accounts where appropriate, including to protect users, enforce these Terms, respond to valid legal requests, or address suspected unlawful activity. Any action will depend on the circumstances and available information.',
  },
  {
    title: '10. Appeals and Dispute Resolution',
    body: 'If you want us to reconsider a content or account decision, contact socialindia.ib@gmail.com with the relevant account details and decision context. Do not send passwords or unnecessary sensitive documents. We will review requests as operations allow; a dedicated appeal team or fixed response timeline is not represented here.',
  },
  {
    title: '11. Service Availability and Changes',
    body: 'Features may change, be unavailable, or be discontinued. We may update these Terms when the service or applicable requirements change.',
  },
  {
    title: '12. Limitation of Liability',
    body: 'To the extent permitted by applicable law, SocialIndia is provided without a guarantee of uninterrupted availability. Nothing in these Terms excludes liability that cannot lawfully be excluded.',
  },
  {
    title: '13. Changes to These Terms',
    body: 'Updated Terms will be published on this page. Continued use after an update takes effect indicates acceptance to the extent permitted by law.',
  },
  {
    title: '14. Contact Information',
    body: 'For general questions, contact socialindia.ib@gmail.com. Formal complaints can be submitted at the separate Grievance Redressal page.',
  },
];

export const TermsPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0f0f0f] dark:text-slate-100">
      <main className="mx-auto max-w-4xl space-y-8 p-4 pb-24 sm:p-6 md:p-8">
        <button onClick={() => navigate('home')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <Scale className="h-4 w-4" />
            SocialIndia · Built by Bharat.
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Terms of Use</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Website: <a className="text-blue-700 hover:underline dark:text-blue-300" href="https://socialindia.web.app/">socialindia.web.app</a>
          </p>
        </header>
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#161616] sm:p-8">
          {sections.map(section => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">{section.title}</h2>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{section.body}</p>
            </section>
          ))}
          <div className="border-t border-slate-200 pt-5 text-sm dark:border-slate-800">
            <button onClick={() => navigate('grievance')} className="font-bold text-blue-700 hover:underline dark:text-blue-300">
              Open Grievance Redressal
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These Terms describe platform policies and are not a statement that SocialIndia has completed every legal or operational compliance requirement.
          </p>
        </div>
      </main>
    </div>
  );
};
