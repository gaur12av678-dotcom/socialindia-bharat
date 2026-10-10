import { translations, LanguageCode, Translations, formatRelativeTime, formatViewCount } from './translations';
import { useApp } from '../context/AppContext';

export * from './translations';

export function getTranslation(lang: LanguageCode, key: keyof Translations | string, fallback?: string): string {
  const currentLangDict = translations[lang] || translations.en;
  if (key in currentLangDict) {
    return (currentLangDict as any)[key];
  }
  const fallbackDict = translations.en;
  if (key in fallbackDict) {
    return (fallbackDict as any)[key];
  }
  return fallback || (typeof key === 'string' ? key : '');
}

/**
 * Hook to access localization and translations cleanly anywhere in components
 */
export function useTranslation() {
  const { language, setLanguage } = useApp();

  const t = (key: keyof Translations | string, fallback?: string): string => {
    return getTranslation(language, key, fallback);
  };

  const formatTime = (timestamp: number | Date): string => {
    return formatRelativeTime(timestamp, language);
  };

  const formatViews = (views: number): string => {
    return formatViewCount(views, language);
  };

  return {
    t,
    language,
    setLanguage,
    isHindi: language === 'hi',
    formatTime,
    formatViews,
  };
}
