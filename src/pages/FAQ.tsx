import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { useTranslation } from '../i18n';

export const FAQPage: React.FC = () => {
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  return (
    <div className="bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-10 pb-24">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#065fd4] dark:hover:text-blue-500 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isHindi ? 'होम पर वापस जाएं' : 'Back to Home'}</span>
        </button>

        {/* Header Title Card */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/80 dark:border-blue-900/40 rounded-full">
            <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {isHindi ? 'अक्सर पूछे जाने वाले सवाल व सहायता' : 'FAQs & Assistance'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
            {isHindi ? 'अक्सर पूछे जाने वाले सवाल (FAQs)' : 'Frequently Asked Questions'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            {isHindi 
              ? 'रिवॉर्ड पॉइंट्स, वॉलेट विथड्रॉल, चैनल मोनेटाइजेशन, विज्ञापन अभियान और सामग्री नियमों से जुड़े सभी सवालों के तुरंत जवाब पाएं।' 
              : 'Quickly find answers to points conversion, wallet balance payouts, advertising promotion campaigns, and content rules.'}
          </p>
        </div>

        {/* FAQ grid list */}
        <div className="space-y-4 pt-2">
          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              {isHindi ? 'प्र: सोशलइंडिया पर पॉइंट्स कैसे कमाएं?' : 'Q: How do I earn points on SocialIndia?'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {isHindi 
                ? 'उ: सोशलइंडिया पर पॉइंट्स कमाना बहुत आसान है! वीडियो देखने पर (+2 पॉइंट्स), वीडियो/शॉर्ट्स लाइक करने पर (+5 पॉइंट्स), कमेंट करने पर (+10 पॉइंट्स) और नए वीडियो अपलोड करने पर (+20 पॉइंट्स) मिलते हैं।' 
                : 'A: Earning is completely organic! You earn points by engaging: watching videos (+2 points), liking videos/shorts (+5 points), posting constructive comments (+10 points), and uploading standard or short video clips (+20 points).'}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              {isHindi ? 'प्र: पॉइंट्स को पैसों में बदलने का क्या नियम है?' : 'Q: What is the point token conversion formula?'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {isHindi 
                ? 'उ: 100 पॉइंट्स का मूल्य $1.00 USD होता है। आप अपने पॉइंट्स को सीधे सेटिंग्स में "वॉलेट बैलेंस" टैब से कंवर्ट कर सकते हैं।' 
                : 'A: 100 points converted represent $1.00 USD. You can convert points directly to USD wallet balances from the Settings page under the "Balance" tab.'}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              {isHindi ? 'प्र: मैं अपने चैनल या ब्रांड का प्रचार कैसे कर सकता हूं?' : 'Q: How can I promote my channel or brand?'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {isHindi 
                ? 'उ: आप हमारे एडवरटाइजिंग पेज पर जाकर अपने वीडियो या चैनल के लिए कस्टमाइज्ड विज्ञापन अभियान चला सकते हैं और सही दर्शकों तक पहुंच सकते हैं।' 
                : 'A: Go to our custom Advertising page to launch localized campaigns. Target specific video categories or user profiles to drive verified views and subscriber growths.'}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              {isHindi ? 'प्र: सोशलइंडिया पार्टनर व मोनेटाइजेशन प्रोग्राम के लिए क्या शर्तें हैं?' : 'Q: How do I qualify for the SocialIndia Partner & Monetization Program?'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {isHindi 
                ? 'उ: चैनल मोनेटाइजेशन के लिए: (1) कम से कम 500 सब्सक्राइबर्स, और (2) किसी भी एक वीडियो पर कम से कम 1,000 व्यूज होने आवश्यक हैं। दोनों शर्तें पूरी होने के बाद आप सेटिंग्स > मोनेटाइजेशन से सीधे आवेदन कर सकते हैं।' 
                : 'A: To qualify for the SocialIndia Partner Program, you need: (1) At least 500 channel subscribers, and (2) At least 1,000 views on ANY single video. Note that your view requirement is evaluated on your single highest-viewed video, not total channel views. Once both milestones are met, you can apply directly from Settings > Monetization.'}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              {isHindi ? 'प्र: वेरिफाइड क्रिएटर ब्लू टिक बैज कैसे मिलता है?' : 'Q: Who qualifies for the verified creator badge?'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {isHindi 
                ? 'उ: सक्रिय और ओरिजिनल कंटेंट बनाने वाले क्रिएटर सेटिंग्स पेज के वेरिफिकेशन टैब से आवेदन कर सकते हैं। हमारी टीम कॉपीराइट व मौलिकता की जांच के बाद वेरिफाइड टिक प्रदान करती है।' 
                : 'A: Creators with active profile portfolios can apply from the Settings page. Applications are evaluated for genuine quality, copyright ownership, and constructive engagement parameters by our platform safety team.'}
            </p>
          </div>

          <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-6 rounded-3xl space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">
              {isHindi ? 'प्र: Android APK इंस्टॉल करते समय "Play Protect: App scan recommended" क्यों आता है और क्या करें?' : 'Q: Why does "Play Protect: App scan recommended" appear when installing the Android APK, and how to proceed?'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {isHindi 
                ? 'उ: यह कोई एरर या वायरस नहीं है। जब कोई ऐप Google Play Store के बाहर (जैसे WhatsApp, Telegram या डायरेक्ट लिंक) से पहली बार इंस्टॉल की जाती है, तो Google Play Protect सुरक्षा के लिए यह स्कैन सुझाव दिखाता है। इसे इंस्टॉल करने के 2 आसान तरीके हैं: (1) "Scan app" बटन दबाएं — Google 5 सेकंड में स्कैन करके ऐप को सुरक्षित मार्क कर देगा और इंस्टॉल हो जाएगा। (2) या "More details" पर टैप करके "Install anyway" चुनें। 2-3 यूज़र्स द्वारा स्कैन होने के बाद Google के सिस्टम में यह अपने आप सुरक्षित दर्ज हो जाती है।' 
                : 'A: This is not an error or virus. When an app is sideloaded outside the Google Play Store for the first time, Google Play Protect displays a standard "App scan recommended" safety check. To install: (1) Tap "Scan app" — Google scans the APK in seconds and installs it safely. (2) Or tap "More details" and select "Install anyway". Once scanned, Google registers the build signature as verified safe.'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
