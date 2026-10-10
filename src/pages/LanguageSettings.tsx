import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { ArrowLeft, Globe, Check, Sparkles, Languages } from 'lucide-react';
import { useTranslation, LanguageCode } from '../i18n';
import { useApp } from '../context/AppContext';

export const LanguageSettingsPage: React.FC = () => {
  const { navigate } = useRouter();
  const { language, setLanguage, t, isHindi } = useTranslation();
  const { addToast } = useApp();

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    if (code === 'hi') {
      addToast('वेबसाइट की भाषा बदलकर हिन्दी कर दी गई!', 'success');
    } else {
      addToast('Language switched to English!', 'success');
    }
  };

  const supportedLanguages: {
    code: LanguageCode;
    nativeName: string;
    englishName: string;
    description: string;
    flag: string;
    isReady: boolean;
  }[] = [
    {
      code: 'hi',
      nativeName: 'हिन्दी',
      englishName: 'Hindi',
      description: 'संपूर्ण वेबसाइट का मूल भारतीय हिन्दी संस्करण (मेनू, वीडियो प्लेयर, खोज, शॉर्ट्स और नेविगेशन)',
      flag: '🇮🇳',
      isReady: true,
    },
    {
      code: 'en',
      nativeName: 'English',
      englishName: 'English (US/UK/IN)',
      description: 'Default international language for UI, navigation, player controls, and menus',
      flag: '🌐',
      isReady: true,
    },
  ];

  return (
    <div className="bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 pb-28">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#065fd4] dark:hover:text-blue-500 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isHindi ? 'होम पर वापस जाएं' : 'Back to Home'}</span>
        </button>

        {/* Header Title Card */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-full">
            <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {t('lang_badge_native', '100% Native Indian Translation')}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
            {t('lang_page_title', 'Language Settings')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl font-medium leading-relaxed">
            {t('lang_page_subtitle', 'Experience SocialIndia in your preferred native regional language.')}
          </p>
        </div>

        {/* Language Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supportedLanguages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <div
                key={lang.code}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`relative p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50 dark:bg-[#161618] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{lang.flag}</span>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                          {lang.nativeName}
                          {lang.code === 'hi' && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                              हिंदी संस्करण
                            </span>
                          )}
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          {lang.englishName}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'border-2 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {lang.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {isSelected ? (isHindi ? 'वर्तमान में सक्रिय' : 'Currently Active') : (isHindi ? 'चुनने के लिए क्लिक करें' : 'Click to select')}
                  </span>
                  {isSelected && (
                    <span className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {isHindi ? 'सक्रिय' : 'Active'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Hindi Preview Showcase Box */}
        <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Languages className="w-4 h-4 text-blue-600" />
            <span>{isHindi ? 'हिन्दी इंटरफ़ेस पूर्वावलोकन (Preview)' : 'Localization Preview'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-white dark:bg-black/30 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">नेविगेशन</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{t('nav_home')} • {t('nav_shorts')}</span>
            </div>
            <div className="p-3 bg-white dark:bg-black/30 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">वीडियो एक्शन</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{t('action_subscribe')}</span>
            </div>
            <div className="p-3 bg-white dark:bg-black/30 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">प्लेयर मेनू</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{t('player_quality')} • {t('player_speed')}</span>
            </div>
            <div className="p-3 bg-white dark:bg-black/30 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">खोज बार</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{t('search_button')}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed pt-2">
            {t('lang_hint', 'Menus, buttons, player controls, notifications, and navigation will be presented in your chosen language.')}
          </p>
        </div>

      </div>
    </div>
  );
};
