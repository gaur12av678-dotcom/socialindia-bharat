import React from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useTranslation } from '../i18n';

export const AboutPage: React.FC = () => {
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();
  const currentYear = new Date().getFullYear();

  const footerSections = isHindi
    ? [
        { title: 'प्लेटफ़ॉर्म', links: [['होम', 'home'], ['ट्रेंडिंग', 'trending'], ['क्लिप्स', 'shorts'], ['कम्युनिटी', 'community'], ['डाउनलोड्स', 'downloads'], ['प्रो बनें', 'gopro']] },
        { title: 'सहायता', links: [['संपर्क करें', 'contact'], ['सामान्य प्रश्न', 'faq'], ['शिकायत निवारण', 'grievance'], ['मदद', 'help']] },
        { title: 'कंपनी', links: [['हमारे बारे में', 'about'], ['विज्ञापन', 'advertising'], ['विज्ञापन जानकारी', 'adinfo'], ['डेवलपर्स', 'developers']] },
        { title: 'कानूनी व समुदाय', links: [['गोपनीयता नीति', 'privacy'], ['उपयोग की शर्तें', 'terms'], ['रिफ़ंड नीति', 'refund'], ['कम्युनिटी दिशानिर्देश', 'guidelines']] },
      ]
    : [
        { title: 'Platform', links: [['Home', 'home'], ['Trending', 'trending'], ['Clips', 'shorts'], ['Community', 'community'], ['Downloads', 'downloads'], ['Go Pro', 'gopro']] },
        { title: 'Support', links: [['Contact', 'contact'], ['FAQ', 'faq'], ['Grievance Redressal', 'grievance'], ['Help', 'help']] },
        { title: 'Company', links: [['About', 'about'], ['Advertising', 'advertising'], ['Ad Info', 'adinfo'], ['Developers', 'developers']] },
        { title: 'Legal & Community', links: [['Privacy Policy', 'privacy'], ['Terms of Use', 'terms'], ['Refund Policy', 'refund'], ['Community Guidelines', 'guidelines']] },
      ];

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0f0f0f] dark:text-slate-100">
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-8 pb-16 sm:px-6 md:py-12">
        <button onClick={() => navigate('home')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          {isHindi ? 'होम पर वापस जाएं' : 'Back to Home'}
        </button>

        <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-7 dark:border-blue-900/40 dark:from-slate-900 dark:via-[#111827] dark:to-indigo-950/30 sm:p-12">
          <div className="mb-6 inline-flex items-center gap-3.5 rounded-2xl border border-blue-200/80 bg-white px-4 py-2.5 shadow-sm dark:border-blue-800/50 dark:bg-slate-900/90">
            <img
              src="/socialindia-icon.png"
              alt="SocialIndia"
              className="h-10 w-10 shrink-0 rounded-xl object-contain"
              draggable={false}
            />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                {isHindi ? 'सोशलइंडिया के बारे में' : 'About SocialIndia'}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {isHindi ? 'भारत का वीडियो, क्लिप्स और कम्युनिटी प्लेटफ़ॉर्म' : "India's Video, Clips & Community Platform"}
              </span>
            </div>
          </div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
            {isHindi ? 'भारत द्वारा निर्मित।' : 'Built by Bharat.'}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">SocialIndia</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            {isHindi
              ? 'SocialIndia एक भारतीय सोशल मीडिया और वीडियो-शेयरिंग प्लेटफ़ॉर्म है जहाँ लोग वीडियो साझा कर सकते हैं, नई सामग्री खोज सकते हैं, समुदायों से जुड़ सकते हैं और क्रिएटर्स को फ़ॉलो कर सकते हैं। हमारा लक्ष्य भारतीय उपयोगकर्ताओं, क्रिएटर्स और समुदायों के लिए एक स्वतंत्र प्लेटफ़ॉर्म प्रदान करना है।'
              : 'SocialIndia is an Indian social media and video-sharing platform where people can share videos, discover content, connect with communities and follow creators. Our goal is to provide an independent platform built for Indian users, creators and communities.'}
          </p>
        </section>

        <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161616] sm:grid-cols-2 sm:p-8">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">{isHindi ? 'संस्थापक' : 'Founder'}</h2>
            <p className="mt-2 text-lg font-black">Gaurav Saini</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{isHindi ? 'संस्थापक – SocialIndia' : 'Founder – SocialIndia'}</p>
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">{isHindi ? 'संपर्क' : 'Contact'}</h2>
            <a href="mailto:socialindia.ib@gmail.com" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300">
              <Mail className="h-4 w-4" />
              socialindia.ib@gmail.com
            </a>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{isHindi ? 'भारत' : 'India'}</p>
          </div>
        </section>

        <footer className="space-y-7 border-t border-slate-200 pt-8 dark:border-slate-800">
          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {footerSections.map(section => (
              <div key={section.title} className="space-y-3">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{section.title}</h2>
                <ul className="space-y-2">
                  {section.links.map(([label, path]) => {
                    const href = path === 'home' ? '/' : `/${path}`;
                    return (
                      <li key={path}>
                        <a
                          href={href}
                          onClick={(e) => {
                            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                              e.preventDefault();
                              navigate(path);
                            }
                          }}
                          className="text-left text-xs font-semibold text-slate-500 hover:text-blue-600 hover:underline dark:text-slate-400"
                        >
                          {label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="flex flex-col gap-1 border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} SocialIndia. {isHindi ? 'सर्वाधिकार सुरक्षित।' : 'All rights reserved.'}</p>
            <p>{isHindi ? 'भारत द्वारा निर्मित।' : 'Built by Bharat.'}</p>
          </div>
        </footer>
      </main>
    </div>
  );
};
