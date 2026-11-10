import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { feedbackService } from '../services/feedbackService';
import { useTranslation } from '../i18n';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Loader2, 
  Camera, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  X, 
  ArrowLeft, 
  AlertCircle, 
  Monitor, 
  HelpCircle,
  Eye,
  PenTool
} from 'lucide-react';

export const FeedbackPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  // Feedback fields
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'playback' | 'creator' | 'general'>('feature');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [includeSystemInfo, setIncludeSystemInfo] = useState(true);
  const [showSystemInfoDetails, setShowSystemInfoDetails] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [hasHighlights, setHasHighlights] = useState(false);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Gather actual system info like Google / YouTube does
  const [systemInfo, setSystemInfo] = useState({
    userAgent: '',
    os: '',
    screenResolution: '',
    currentUrl: '',
    language: '',
    theme: 'light'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setSystemInfo({
        userAgent: navigator.userAgent,
        os: navigator.userAgent.includes('Windows') ? 'Windows' :
            navigator.userAgent.includes('Android') ? 'Android' :
            navigator.userAgent.includes('Mac') ? 'macOS' :
            navigator.userAgent.includes('iPhone') ? 'iOS' : 'Linux',
        screenResolution: `${window.innerWidth} x ${window.innerHeight}`,
        currentUrl: window.location.href,
        language: navigator.language || 'en',
        theme: isDark ? 'Dark Mode' : 'Light Mode'
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      addToast(isHindi ? 'कृपया अपनी प्रतिक्रिया लिखें।' : 'Please enter your feedback description.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formattedSubject = subject.trim() || `${feedbackType.toUpperCase()}: Feedback from ${currentUserProfile?.username || 'User'}`;
      const systemInfoSummary = includeSystemInfo 
        ? `\n\n--- System Info ---\nOS: ${systemInfo.os}\nResolution: ${systemInfo.screenResolution}\nTheme: ${systemInfo.theme}\nLanguage: ${systemInfo.language}\nURL: ${systemInfo.currentUrl}`
        : '';
      const screenshotNotice = includeScreenshot ? '\n[Screenshot attached with feedback payload]' : '';

      await feedbackService.submitFeedback({
        uid: currentUser?.uid || 'guest-feedback',
        username: currentUserProfile?.username || 'Community Member',
        type: 'feedback',
        subject: `[${feedbackType.toUpperCase()}] ${formattedSubject}`,
        message: `${message.trim()}${screenshotNotice}${systemInfoSummary}`
      });

      setSubmitted(true);
      addToast(isHindi ? 'प्रतिक्रिया भेजने के लिए धन्यवाद!' : 'Thank you for your feedback!', 'success');
    } catch (err) {
      addToast(isHindi ? 'प्रतिक्रिया भेजने में विफल।' : 'Failed to send feedback.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Success view (Exact YouTube style)
  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-[28px] p-8 sm:p-10 text-center space-y-5 shadow-xs animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isHindi ? 'प्रतिक्रिया के लिए धन्यवाद' : 'Thank you for the feedback'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              {isHindi 
                ? 'आपकी प्रतिक्रिया सोशलइंडिया को सभी के लिए बेहतर बनाने में मदद करती है। यदि हमें और जानकारी चाहिए होगी तो हम संपर्क करेंगे।' 
                : 'Your feedback helps make SocialIndia better for everyone. We review every report and suggestion directly.'}
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setMessage('');
                setSubject('');
              }}
              className="h-10 px-5 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {isHindi ? 'और प्रतिक्रिया भेजें' : 'Send more feedback'}
            </button>

            <button
              type="button"
              onClick={() => navigate('home')}
              className="h-10 px-6 rounded-full bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              {isHindi ? 'होमपेज पर वापस जाएं' : 'Return to SocialIndia'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f0f] text-slate-900 dark:text-[#f1f1f1] font-['Plus_Jakarta_Sans',sans-serif] py-6 sm:py-10 px-4 sm:px-6">
      
      {/* Centered YouTube "Send Feedback" Dialog Container */}
      <div className="max-w-xl mx-auto bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-xs">
        
        {/* Header Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#065fd4] dark:text-[#3ea6ff] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isHindi ? 'सोशलइंडिया को प्रतिक्रिया भेजें' : 'Send feedback to SocialIndia'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-10">
              {isHindi 
                ? 'हम आपकी प्रतिक्रिया की सराहना करते हैं। यह हमारे उत्पादों को बेहतर बनाने में मदद करती है।' 
                : 'We appreciate your feedback. It helps us improve our product for creators and viewers.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('home')}
            aria-label="Close"
            className="p-1.5 -mr-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Feedback Type Selector (Pills) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {isHindi ? 'आप किस विषय में प्रतिक्रिया दे रहे हैं?' : 'What kind of feedback do you have?'}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'feature', label: isHindi ? 'सुझाव / विचार' : 'Feature suggestion' },
                { id: 'bug', label: isHindi ? 'समस्या / बग रिपोर्ट' : 'Report an issue' },
                { id: 'playback', label: isHindi ? 'वीडियो व ऑडियो' : 'Video playback' },
                { id: 'creator', label: isHindi ? 'क्रिएटर व अपलोड' : 'Creator & Upload' },
                { id: 'general', label: isHindi ? 'सामान्य' : 'General thought' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFeedbackType(pill.id as any)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs transition-colors cursor-pointer ${
                    feedbackType === pill.id
                      ? 'yt-chip-active shadow-xs'
                      : 'yt-chip-inactive'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Short Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isHindi ? 'शीर्षक (वैकल्पिक)' : 'Summary (optional)'}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isHindi ? "उदा. डार्क मोड में वीडियो प्लेयर कंट्रोल..." : "e.g. Player controls in dark mode, Upload speed..."}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#272727] text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff]"
            />
          </div>

          {/* Main Feedback Textarea with YouTube-Exact Placeholder */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isHindi ? 'प्रतिक्रिया विवरण' : 'Describe your feedback'}
              </label>
              <span className="text-[11px] text-slate-400">
                {message.length}/2,000
              </span>
            </div>
            <textarea
              required
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isHindi
                  ? "अपनी प्रतिक्रिया साझा करें। कृपया पासवर्ड या निजी जानकारी न लिखें। यदि सहायता चाहिए तो सहायता केंद्र पर जाएं।"
                  : "Have feedback? We'd love to hear it, but please don't share sensitive information. Have questions or need help? Go to the Help Center."
              }
              className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#272727] text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff] focus:ring-1 focus:ring-[#065fd4] resize-none leading-relaxed"
            />
          </div>

          {/* YouTube Signature Feature 1: Screenshot Attachment */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#222222] border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeScreenshot}
                  onChange={(e) => setIncludeScreenshot(e.target.checked)}
                  className="w-4 h-4 rounded text-[#065fd4] focus:ring-[#065fd4]"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  {isHindi ? 'स्क्रीनशॉट शामिल करें' : 'Include screenshot'}
                </span>
              </label>

              {includeScreenshot && (
                <button
                  type="button"
                  onClick={() => setShowHighlightModal(true)}
                  className="text-xs font-semibold text-[#065fd4] dark:text-[#3ea6ff] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <PenTool className="w-3 h-3" />
                  <span>{hasHighlights ? (isHindi ? 'हाइलाइट संपादित करें' : 'Edit highlights') : (isHindi ? 'हाइलाइट करें' : 'Highlight issue')}</span>
                </button>
              )}
            </div>

            {includeScreenshot && (
              <div 
                onClick={() => setShowHighlightModal(true)}
                className="relative h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 cursor-pointer group flex items-center justify-center text-xs text-slate-500"
              >
                {/* Simulated screenshot thumbnail of SocialIndia view */}
                <div className="absolute inset-0 opacity-40 dark:opacity-20 flex flex-col p-2 space-y-1">
                  <div className="h-2 w-1/4 bg-blue-500 rounded-full" />
                  <div className="h-10 w-full bg-slate-400/30 rounded" />
                  <div className="flex gap-2">
                    <div className="h-6 w-1/3 bg-slate-400/20 rounded" />
                    <div className="h-6 w-1/3 bg-slate-400/20 rounded" />
                  </div>
                </div>
                {hasHighlights && (
                  <div className="absolute top-3 left-10 w-28 h-10 border-2 border-amber-400 bg-amber-400/20 rounded z-10" />
                )}
                <div className="relative z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/70 text-white rounded-full text-[11px] font-medium group-hover:scale-105 transition-transform">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'पूर्वावलोकन देखें या जानकारी छुपाएं' : 'Click to highlight or hide info'}</span>
                </div>
              </div>
            )}
          </div>

          {/* YouTube Signature Feature 2: System Information Toggle & Drawer */}
          <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden">
            <div className="p-3.5 bg-slate-50 dark:bg-[#222222] flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSystemInfo}
                  onChange={(e) => setIncludeSystemInfo(e.target.checked)}
                  className="w-4 h-4 rounded text-[#065fd4] focus:ring-[#065fd4]"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-slate-500" />
                  {isHindi ? 'सिस्टम जानकारी शामिल करें' : 'Include system information'}
                </span>
              </label>

              {includeSystemInfo && (
                <button
                  type="button"
                  onClick={() => setShowSystemInfoDetails(!showSystemInfoDetails)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full cursor-pointer"
                >
                  {showSystemInfoDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {includeSystemInfo && showSystemInfoDetails && (
              <div className="p-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181818] text-[11px] text-slate-600 dark:text-slate-400 space-y-1 font-mono">
                <div><strong className="text-slate-900 dark:text-slate-200">OS:</strong> {systemInfo.os}</div>
                <div><strong className="text-slate-900 dark:text-slate-200">Resolution:</strong> {systemInfo.screenResolution}</div>
                <div><strong className="text-slate-900 dark:text-slate-200">Theme:</strong> {systemInfo.theme}</div>
                <div><strong className="text-slate-900 dark:text-slate-200">Language:</strong> {systemInfo.language}</div>
                <div className="truncate"><strong className="text-slate-900 dark:text-slate-200">URL:</strong> {systemInfo.currentUrl}</div>
              </div>
            )}
          </div>

          {/* YouTube Standard Legal Privacy Disclaimer */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {isHindi ? (
              <>
                कुछ खाता और सिस्टम जानकारी सोशलइंडिया को भेजी जा सकती है। हम इसे समस्याओं को ठीक करने और अपनी सेवाओं को बेहतर बनाने के लिए हमारी{' '}
                <button type="button" onClick={() => navigate('privacy')} className="text-[#065fd4] dark:text-[#3ea6ff] hover:underline">
                  गोपनीयता नीति
                </button>{' '}
                और{' '}
                <button type="button" onClick={() => navigate('terms')} className="text-[#065fd4] dark:text-[#3ea6ff] hover:underline">
                  सेवा की शर्तों
                </button>{' '}
                के अनुसार उपयोग करेंगे।
              </>
            ) : (
              <>
                Some account and system info may be sent to SocialIndia. We will use it to fix problems and improve our services, subject to our{' '}
                <button type="button" onClick={() => navigate('privacy')} className="text-[#065fd4] dark:text-[#3ea6ff] hover:underline">
                  Privacy Policy
                </button>{' '}
                and{' '}
                <button type="button" onClick={() => navigate('terms')} className="text-[#065fd4] dark:text-[#3ea6ff] hover:underline">
                  Terms of Service
                </button>.
              </>
            )}
          </div>

          {/* YouTube Bottom Action Bar */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate('help')}
              className="text-xs font-semibold text-[#065fd4] dark:text-[#3ea6ff] hover:underline cursor-pointer flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{isHindi ? 'सहायता केंद्र पर जाएं' : 'Go to Help Center'}</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="h-10 px-4 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="h-10 px-6 rounded-full bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 active:scale-98"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                <span>{isHindi ? 'भेजें' : 'Send'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* ========================================================================= */}
      {/* YOUTUBE SCREENSHOT HIGHLIGHT / PRIVACY BLACKOUT MODAL                     */}
      {/* ========================================================================= */}
      {showHighlightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#1e1f20] rounded-[24px] max-w-lg w-full p-6 space-y-4 border border-slate-300 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[#065fd4] dark:text-[#3ea6ff]" />
                <span>{isHindi ? 'स्क्रीनशॉट हाइलाइट या ब्लैकआउट करें' : 'Highlight or hide info'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHighlightModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isHindi 
                ? 'जिस क्षेत्र में समस्या है उसे हाइलाइट करें या अपनी व्यक्तिगत जानकारी को छुपाने के लिए ब्लैकआउट करें।' 
                : 'Click or drag to highlight an issue area, or blackout personal sensitive details.'}
            </p>

            <div className="relative h-48 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center">
              <div className="text-xs text-slate-400 text-center space-y-1">
                <Camera className="w-8 h-8 mx-auto text-slate-400" />
                <p>{isHindi ? 'वर्तमान स्क्रीन कैप्चर पूर्वावलोकन' : 'Current screen capture active'}</p>
                {hasHighlights && (
                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                    {isHindi ? 'हाइलाइट चिह्नित है' : 'Highlight zone marked'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setHasHighlights(!hasHighlights);
                  addToast(hasHighlights ? 'Highlights cleared' : 'Issue area highlighted', 'info');
                }}
                className="text-xs font-semibold text-[#065fd4] dark:text-[#3ea6ff] hover:underline cursor-pointer"
              >
                {hasHighlights ? (isHindi ? 'हाइलाइट हटाएं' : 'Clear highlight') : (isHindi ? 'क्षेत्र हाइलाइट करें' : 'Highlight issue area')}
              </button>

              <button
                type="button"
                onClick={() => setShowHighlightModal(false)}
                className="h-9 px-5 bg-[#065fd4] hover:bg-[#054fb1] text-white text-xs font-semibold rounded-full cursor-pointer"
              >
                {isHindi ? 'पूर्ण' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
