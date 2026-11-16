import React from 'react';
import { ArrowLeft, Mail, Play } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';

const footerSections = [
  { title: 'Platform', links: [['Home', 'home'], ['Trending', 'trending'], ['Clips', 'shorts'], ['Explore', 'explore']] },
  { title: 'Support', links: [['Contact', 'contact'], ['Grievance Redressal', 'grievance'], ['Help', 'help']] },
  { title: 'Company', links: [['About', 'about']] },
  { title: 'Legal & Community', links: [['Privacy Policy', 'privacy'], ['Terms of Use', 'terms'], ['Community Guidelines', 'guidelines']] },
];

export const AboutPage: React.FC = () => {
  const { navigate } = useRouter();
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0f0f0f] dark:text-slate-100">
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-8 pb-16 sm:px-6 md:py-12">
        <button onClick={() => navigate('home')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-7 dark:border-blue-900/40 dark:from-slate-900 dark:via-[#111827] dark:to-indigo-950/30 sm:p-12">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Play className="h-5 w-5 fill-current" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">Built by Bharat.</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">SocialIndia</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            SocialIndia is an Indian social media and video-sharing platform where people can share videos,
            discover content, connect with communities and follow creators. Our goal is to provide an
            independent platform built for Indian users, creators and communities.
          </p>
        </section>

        <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161616] sm:grid-cols-2 sm:p-8">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Founder</h2>
            <p className="mt-2 text-lg font-black">Gaurav Saini</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Founder – SocialIndia</p>
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Contact</h2>
            <a href="mailto:socialindia.ib@gmail.com" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300">
              <Mail className="h-4 w-4" />
              socialindia.ib@gmail.com
            </a>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">India</p>
          </div>
        </section>

        <footer className="space-y-7 border-t border-slate-200 pt-8 dark:border-slate-800">
          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {footerSections.map(section => (
              <div key={section.title} className="space-y-3">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{section.title}</h2>
                <ul className="space-y-2">
                  {section.links.map(([label, path]) => (
                    <li key={path}>
                      <button onClick={() => navigate(path)} className="text-left text-xs font-semibold text-slate-500 hover:text-blue-600 hover:underline dark:text-slate-400">
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="flex flex-col gap-1 border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} SocialIndia. All rights reserved.</p>
            <p>Built by Bharat.</p>
          </div>
        </footer>
      </main>
    </div>
  );
};
