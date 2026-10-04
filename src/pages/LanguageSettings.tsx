import React, { useState } from 'react';
import { useRouter } from '../hooks/useRouter';
import { ArrowLeft, Globe } from 'lucide-react';

export const LanguageSettingsPage: React.FC = () => {
  const { navigate } = useRouter();
  const [selectedLang, setSelectedLang] = useState('en');

  const languages = [
    { code: 'en', label: 'English (default)' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'te', label: 'తెలుగు (Telugu)' },
    { code: 'bn', label: 'বাংলা (Bengali)' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'mr', label: 'मराठी (Marathi)' },
    { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  ];

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
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              System Localization
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
            Language Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            Customize SocialIndia to display inside your favorite native regional language.
          </p>
        </div>

        {/* Dropdown Card */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 max-w-md">
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">Select Interface Language</label>
          <select
            value={selectedLang}
            onChange={(e) => {
              setSelectedLang(e.target.value);
              alert(`Language updated to "${e.target.options[e.target.selectedIndex].text}". Localization loaded!`);
            }}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold italic leading-relaxed pt-2">
            System captions, tags, video suggestions, subtitles, and category lists will auto-align themselves based on your regional configuration.
          </p>
        </div>

      </div>
    </div>
  );
};
