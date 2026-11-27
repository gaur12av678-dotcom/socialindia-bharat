import React from 'react';
import { ArrowLeft, Scale } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useTranslation } from '../i18n';

const sectionsEn = [
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

const sectionsHi = [
  {
    title: '1. परिचय और शर्तों की स्वीकृति',
    body: 'ये शर्तें https://socialindia.web.app/ पर सोशलइंडिया और इसकी उपलब्ध सुविधाओं के आपके उपयोग पर लागू होती हैं। सेवा का उपयोग करके आप इन शर्तों और लागू कानूनों से सहमत होते हैं। यदि आप सहमत नहीं हैं, तो सेवा का उपयोग न करें।',
  },
  {
    title: '2. पात्रता और खाता ज़िम्मेदारी',
    body: 'आपके द्वारा दी गई जानकारी की सटीकता, लॉगिन विवरण को सुरक्षित रखने और आपके खाते के अंतर्गत होने वाली गतिविधियों के लिए आप स्वयं ज़िम्मेदार हैं। यदि आप कानूनी रूप से पात्र नहीं हैं, तो इस सेवा का उपयोग न करें।',
  },
  {
    title: '3. यूज़र सामग्री और स्वामित्व',
    body: 'आपके द्वारा सबमिट की गई सामग्री पर आपके अधिकार सुरक्षित रहते हैं। आप सोशलइंडिया को अपनी चुनी हुई सुविधाओं के संचालन हेतु उस सामग्री को होस्ट, स्टोर, प्रदर्शित और वितरित करने की अनुमति देते हैं। आपके पास सामग्री साझा करने के आवश्यक अधिकार होने चाहिए।',
  },
  {
    title: '4. निषिद्ध सामग्री और गतिविधियाँ',
    body: 'गैर-कानूनी सामग्री, कॉपीराइट उल्लंघन, बाल शोषण, बिना सहमति की निजी सामग्री, उत्पीड़न या धमकी, प्रतिरूपण या धोखाधड़ी, निजी जानकारी लीक करना, नफ़रत या हिंसा को बढ़ावा देना, मैलवेयर/फ़िशिंग या भारतीय कानून द्वारा प्रतिबंधित कोई भी सामग्री अपलोड न करें। सेवा में अनधिकृत प्रवेश या बाधा उत्पन्न करने का प्रयास न करें।',
  },
  {
    title: '5. कॉपीराइट और बौद्धिक संपदा',
    body: 'केवल वही सामग्री सबमिट करें जिसके आप स्वामी हैं या उपयोग करने के लिए अधिकृत हैं। यदि आपको लगता है कि कोई सामग्री आपके अधिकारों का उल्लंघन करती है, तो इन-ऐप रिपोर्ट विकल्प का उपयोग करें, socialindia.ib@gmail.com पर लिखें या शिकायत निवारण (Grievance Redressal) पेज पर शिकायत दर्ज करें।',
  },
  {
    title: '6. गोपनीयता और व्यक्तिगत जानकारी',
    body: 'सोशलइंडिया सेवा प्रदान करने के लिए खाते और गतिविधि की जानकारी संसाधित करता है। अधिक जानकारी के लिए गोपनीयता नीति (Privacy Policy) देखें। ऐसी व्यक्तिगत जानकारी सार्वजनिक न करें जिसे आप साझा नहीं करना चाहते।',
  },
  {
    title: '7. कम्युनिटी दिशानिर्देश और सुरक्षा',
    body: 'सेवा का उपयोग सम्मानपूर्वक करें और कम्युनिटी दिशानिर्देशों का पालन करें। ये दिशानिर्देश प्लेटफ़ॉर्म के मानकों का वर्णन करते हैं।',
  },
  {
    title: '8. सामग्री रिपोर्टिंग और शिकायतें',
    body: 'सामग्री या खाते से संबंधित समस्याओं के लिए उपलब्ध इन-प्रोडक्ट रिपोर्ट टूल का उपयोग करें। औपचारिक शिकायत के लिए शिकायत निवारण पेज का उपयोग करें।',
  },
  {
    title: '9. सामग्री हटाना और खाता प्रतिबंध',
    body: 'उपयोगकर्ताओं की सुरक्षा, इन शर्तों को लागू करने, वैध कानूनी अनुरोधों का जवाब देने या संदिग्ध गैर-कानूनी गतिविधियों को रोकने के लिए सोशलइंडिया उचित होने पर सामग्री हटा सकता है, चेतावनी दे सकता है या खाते को निलंबित/बंद कर सकता है।',
  },
  {
    title: '10. अपील और विवाद समाधान',
    body: 'यदि आप चाहते हैं कि हम किसी सामग्री या खाते से जुड़े निर्णय पर पुनर्विचार करें, तो संबंधित विवरण के साथ socialindia.ib@gmail.com पर संपर्क करें। कृपया पासवर्ड या अनावश्यक संवेदनशील दस्तावेज़ न भेजें।',
  },
  {
    title: '11. सेवा उपलब्धता और बदलाव',
    body: 'सुविधाएँ बदल सकती हैं, अनुपलब्ध हो सकती हैं या बंद की जा सकती हैं। सेवा या आवश्यकताओं में बदलाव के साथ हम इन शर्तों को अपडेट कर सकते हैं।',
  },
  {
    title: '12. देयता की सीमा',
    body: 'लागू कानून द्वारा अनुमत सीमा तक, सोशलइंडिया बिना किसी निर्बाध उपलब्धता की गारंटी के प्रदान किया जाता है।',
  },
  {
    title: '13. शर्तों में परिवर्तन',
    body: 'अपडेट की गई शर्तें इस पृष्ठ पर प्रकाशित की जाएँगी। अपडेट प्रभावी होने के बाद सेवा का निरंतर उपयोग आपकी स्वीकृति माना जाएगा।',
  },
  {
    title: '14. संपर्क जानकारी',
    body: 'सामान्य प्रश्नों के लिए socialindia.ib@gmail.com पर संपर्क करें। औपचारिक शिकायतें अलग शिकायत निवारण पेज पर दर्ज की जा सकती हैं।',
  },
];

export const TermsPage: React.FC = () => {
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();
  const sections = isHindi ? sectionsHi : sectionsEn;

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0f0f0f] dark:text-slate-100">
      <main className="mx-auto max-w-4xl space-y-8 p-4 pb-24 sm:p-6 md:p-8">
        <button onClick={() => navigate('home')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          {isHindi ? 'होम पर वापस जाएं' : 'Back to Home'}
        </button>
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <Scale className="h-4 w-4" />
            {isHindi ? 'सोशलइंडिया · भारत द्वारा निर्मित।' : 'SocialIndia · Built by Bharat.'}
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            {isHindi ? 'उपयोग की शर्तें' : 'Terms of Use'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isHindi ? 'वेबसाइट:' : 'Website:'}{' '}
            <a className="text-blue-700 hover:underline dark:text-blue-300" href="https://socialindia.web.app/">socialindia.web.app</a>
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
            <button onClick={() => navigate('grievance')} className="font-bold text-blue-700 hover:underline dark:text-blue-300 cursor-pointer">
              {isHindi ? 'शिकायत निवारण खोलें' : 'Open Grievance Redressal'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isHindi
              ? 'ये शर्तें प्लेटफ़ॉर्म की नीतियों का वर्णन करती हैं।'
              : 'These Terms describe platform policies and are not a statement that SocialIndia has completed every legal or operational compliance requirement.'}
          </p>
        </div>
      </main>
    </div>
  );
};
