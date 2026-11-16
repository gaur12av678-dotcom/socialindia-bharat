import React, { useState } from 'react';
import { ArrowLeft, Mail, MessageSquare, Send } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../i18n';

export const ContactUsPage: React.FC = () => {
  const { navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { isHindi } = useTranslation();
  const [name, setName] = useState(currentUserProfile?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [topic, setTopic] = useState('General question');
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = `[SocialIndia Support] ${topic}`;
    const body = `Name: ${name.trim()}\nEmail: ${email.trim()}\nTopic: ${topic}\n\n${message.trim()}`;
    window.location.href = `mailto:socialindia.ib@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    addToast('Your email application was opened. Send the message there to contact SocialIndia.', 'info');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0f0f0f] dark:text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8 p-4 pb-24 sm:p-6 md:p-8">
        <button onClick={() => navigate('home')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" />
          {isHindi ? 'होम पर वापस जाएं' : 'Back to Home'}
        </button>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
            <Mail className="h-4 w-4" />
            {isHindi ? 'सामान्य सहायता' : 'General Support'}
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            {isHindi ? 'संपर्क करें' : 'Contact SocialIndia'}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {isHindi
              ? 'सामान्य सहायता, प्रश्न, प्रतिक्रिया या सुझाव के लिए हमसे संपर्क करें।'
              : 'Contact us for general customer support, user queries, feedback, suggestions, or general questions.'}
          </p>
          <a className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300" href="mailto:socialindia.ib@gmail.com">
            <Mail className="h-4 w-4" />
            socialindia.ib@gmail.com
          </a>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-[#161616] sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-extrabold">
              {isHindi ? 'आपका नाम' : 'Your Name'}
              <input required maxLength={120} value={name} onChange={event => setName(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="space-y-1.5 text-xs font-extrabold">
              {isHindi ? 'आपका ईमेल' : 'Your Email'}
              <input required type="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>
          </div>
          <label className="block space-y-1.5 text-xs font-extrabold">
            {isHindi ? 'विषय' : 'Topic'}
            <select value={topic} onChange={event => setTopic(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
              <option>General question</option>
              <option>Customer support</option>
              <option>Feedback</option>
              <option>Suggestion</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-xs font-extrabold">
            {isHindi ? 'संदेश' : 'Message'}
            <textarea required minLength={5} maxLength={10000} rows={6} value={message} onChange={event => setMessage(event.target.value)} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white hover:bg-blue-700">
            <Send className="h-4 w-4" />
            {isHindi ? 'ईमेल में खोलें' : 'Open message in email'}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your email application will open with this message. It is not sent by the website.
          </p>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-xs dark:border-slate-800">
          <span className="inline-flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            For formal complaints, use the separate Grievance Redressal page.
          </span>
          <button onClick={() => navigate('grievance')} className="font-black text-blue-700 hover:underline dark:text-blue-300">
            Grievance Redressal
          </button>
        </div>
      </div>
    </div>
  );
};
