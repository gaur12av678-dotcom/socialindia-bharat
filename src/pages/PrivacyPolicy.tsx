import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';

const sections = [
  {
    title: '1. Introduction',
    body: 'This Privacy Policy describes how SocialIndia handles information when you use https://socialindia.web.app/. It reflects the application features and integrations currently present in the codebase; actual processing also depends on the services you use.',
  },
  {
    title: '2. Information We Collect',
    body: 'Information may include account details such as username, display name, email address, profile image, bio, country, age and gender if provided; videos and other content you submit; comments, likes, follows, messages, reports, support or grievance submissions; settings and preferences; and transaction, wallet, payout or verification-request information when you use those features. Do not submit sensitive information unless it is required for a feature and you choose to proceed.',
  },
  {
    title: '3. How We Use Information',
    body: 'The application uses information to create and maintain accounts, display profiles and content, operate viewing and interaction features, manage user requests and reports, provide settings and preferences, and support administrative operations. It may also be used to protect the service and respond to valid legal requests.',
  },
  {
    title: '4. Profile and Account Information',
    body: 'Firebase Authentication is used for email/password and Google sign-in. SocialIndia stores profile information in Firestore. The application also stores some profile and account-switching information in browser local storage. Saved account credentials are obfuscated by the application, not encrypted by that feature; use account switching only on a device you control.',
  },
  {
    title: '5. Videos, Comments and User Activity',
    body: 'Video records, profile references, likes, comments, follows/subscriptions, playlists, reports, and other activity are stored in Firestore. Watch-history and downloads features may store information in Firestore or on the device. Public content and profile fields may be visible to other users according to the feature settings.',
  },
  {
    title: '6. Cookies, Sessions and Device Information',
    body: 'The application uses browser storage such as local storage and session storage for preferences, cached content, authentication-related flows, and other session features. Firebase Authentication may use browser persistence. The application code does not describe a separate IP-address collection feature; Firebase, hosting, media, or browser providers may process technical information under their own services.',
  },
  {
    title: '7. Firebase and Third-Party Service Providers',
    body: 'Firebase Authentication, Firestore, and Firebase Storage are integrated. Video uploads can use a configured Cloudinary account or Firebase Storage fallback. The application can embed or load media from YouTube, Google Drive, and other external URLs. When these services are used, they may receive information such as network or device data as part of delivering their service and are governed by their own terms and privacy policies. No dedicated analytics SDK was identified in the application dependencies.',
  },
  {
    title: '8. Information Sharing and Disclosure',
    body: 'Information is made available to service providers that process it for the features above, to other users where content or profile features are public, and to administrators for platform operations. Information may also be disclosed where required by applicable law or a valid legal process. This policy does not make an absolute claim about advertising, sale, or onward processing by third-party providers.',
  },
  {
    title: '9. Data Security',
    body: 'The application uses Firebase Authentication and configured Firebase access rules. No security measure can guarantee that information is always secure. Do not share passwords or publish private information in public content. Account-switching tokens saved in browser storage are only obfuscated by the current application.',
  },
  {
    title: '10. Data Retention and Deletion',
    body: 'Information is retained while needed to operate the service, fulfill the purpose for which it was submitted, address disputes, or meet applicable requirements. The codebase does not provide a verified, complete user-facing account-erasure workflow for all related records, backups, and third-party copies. Contact support for account-related deletion assistance; a request may require review and may be subject to applicable retention requirements.',
  },
  {
    title: "11. Children's Privacy",
    body: 'The current account registration flow does not implement age verification or a guardian-consent workflow. SocialIndia does not represent that child-specific safeguards are complete. If you believe a child has provided personal information, contact us at the address below so the request can be reviewed.',
  },
  {
    title: '12. Your Privacy Rights',
    body: 'You may contact SocialIndia to request access to or correction of information, account-related privacy help, or assistance with a deletion request or privacy complaint. Requests are reviewed individually and may be subject to applicable legal requirements. The application does not promise instant deletion or deletion of backups or third-party copies.',
  },
  {
    title: '13. Changes to This Policy',
    body: 'This page may be updated when application features, service providers, or applicable requirements change. The latest version will be published here.',
  },
  {
    title: '14. Contact and Privacy Complaints',
    body: 'Contact SocialIndia – Privacy & Support at socialindia.ib@gmail.com. Formal complaints can also be submitted through the separate Grievance Redressal page. No statutory Grievance Officer details are published until an actual appointment has been completed.',
  },
];

export const PrivacyPolicyPage: React.FC = () => {
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
            <Shield className="h-4 w-4" />
            SocialIndia · Built by Bharat.
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
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
            This policy describes current application behavior and is not a representation of complete compliance with the Digital Personal Data Protection Act, 2023, its rules or commencement provisions, or the IT Rules, 2021 as amended. Legal and operational requirements should be confirmed for the service.
          </p>
        </div>
      </main>
    </div>
  );
};
