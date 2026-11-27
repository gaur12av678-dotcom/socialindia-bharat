import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useTranslation } from '../i18n';

const sectionsEn = [
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
    body: 'Authentication is used for email/password and Google sign-in. SocialIndia stores profile information in its cloud database. The application also stores some profile and account-switching information in browser local storage. Saved account credentials are obfuscated by the application, not encrypted by that feature; use account switching only on a device you control.',
  },
  {
    title: '5. Videos, Comments and User Activity',
    body: 'Video records, profile references, likes, comments, follows/subscriptions, playlists, reports, and other activity are stored in the cloud database. Watch-history and downloads features may store information in the database or on the device. Public content and profile fields may be visible to other users according to the feature settings.',
  },
  {
    title: '6. Cookies, Sessions and Device Information',
    body: 'The application uses browser storage such as local storage and session storage for preferences, cached content, authentication-related flows, and other session features. Authentication services may use browser persistence. The application code does not describe a separate IP-address collection feature; hosting, media, or browser providers may process technical information under their own services.',
  },
  {
    title: '7. Cloud Storage & Third-Party Service Providers',
    body: 'Cloud authentication, database, and media storage providers are integrated to deliver accounts and host user-uploaded videos and images. The application can also embed or load supported external media links. When these services are used, they may receive network or device data as part of delivering their service and are governed by their own terms and privacy policies. No dedicated analytics SDK was identified in the application dependencies.',
  },
  {
    title: '8. Information Sharing and Disclosure',
    body: 'Information is made available to service providers that process it for the features above, to other users where content or profile features are public, and to administrators for platform operations. Information may also be disclosed where required by applicable law or a valid legal process. This policy does not make an absolute claim about advertising, sale, or onward processing by third-party providers.',
  },
  {
    title: '9. Data Security',
    body: 'The application uses authentication and configured database access rules. No security measure can guarantee that information is always secure. Do not share passwords or publish private information in public content. Account-switching tokens saved in browser storage are only obfuscated by the current application.',
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

const sectionsHi = [
  {
    title: '1. परिचय',
    body: 'यह गोपनीयता नीति बताती है कि जब आप https://socialindia.web.app/ का उपयोग करते हैं तो SocialIndia जानकारी को कैसे संभालता है। वास्तविक डेटा प्रोसेसिंग आपके द्वारा उपयोग की जाने वाली सुविधाओं और सेवाओं पर भी निर्भर करती है।',
  },
  {
    title: '2. हम कौन-सी जानकारी एकत्र करते हैं',
    body: 'इसमें खाता विवरण (उपयोगकर्ता नाम, डिस्प्ले नाम, ईमेल, प्रोफ़ाइल फ़ोटो, बायो, देश आदि), आपके द्वारा अपलोड किए गए वीडियो व पोस्ट, टिप्पणियां, लाइक, फ़ॉलो, संदेश, रिपोर्ट, शिकायतें, सेटिंग्स और वॉलेट/सत्यापन अनुरोध जानकारी शामिल हो सकती है।',
  },
  {
    title: '3. हम जानकारी का उपयोग कैसे करते हैं',
    body: 'खाते बनाने और बनाए रखने, प्रोफ़ाइल व सामग्री दिखाने, वीडियो और चैट सुविधाएं संचालित करने, उपयोगकर्ता अनुरोधों व रिपोर्ट को संभालने, सुरक्षा बनाए रखने और कानूनी अनुरोधों का पालन करने के लिए जानकारी का उपयोग किया जाता है।',
  },
  {
    title: '4. प्रोफ़ाइल और खाता जानकारी',
    body: 'ईमेल/पासवर्ड और Google साइन-इन के लिए सुरक्षित प्रमाणीकरण का उपयोग किया जाता है। प्रोफ़ाइल डेटा क्लाउड डेटाबेस में सहेजा जाता है और कुछ प्राथमिकताएं व खाता-स्विचिंग डेटा ब्राउज़र स्टोरेज में रहता है। खाता-स्विचिंग केवल अपने निजी डिवाइस पर उपयोग करें।',
  },
  {
    title: '5. वीडियो, टिप्पणियां और गतिविधि',
    body: 'वीडियो रिकॉर्ड, लाइक, टिप्पणियां, फ़ॉलो, प्लेलिस्ट और रिपोर्ट क्लाउड डेटाबेस में संग्रहीत होते हैं। देखने का इतिहास और ऑफ़लाइन डाउनलोड आपके डिवाइस या खाते की सेटिंग्स के अनुसार सहेजे जाते हैं।',
  },
  {
    title: '6. कुकीज़, सत्र और डिवाइस जानकारी',
    body: 'प्राथमिकताओं, कैश्ड सामग्री और लॉगिन सत्र के लिए ब्राउज़र के लोकल स्टोरेज व सेशन स्टोरेज का उपयोग किया जाता है। होस्टिंग, मीडिया या ब्राउज़र प्रदाता अपनी सेवा के अंतर्गत तकनीकी जानकारी संसाधित कर सकते हैं।',
  },
  {
    title: '7. क्लाउड स्टोरेज और तृतीय-पक्ष सेवा प्रदाता',
    body: 'खातों और उपयोगकर्ता द्वारा अपलोड किए गए वीडियो व छवियों को होस्ट करने के लिए क्लाउड प्रमाणीकरण, डेटाबेस और मीडिया स्टोरेज सेवाएं एकीकृत हैं। समर्थित बाहरी मीडिया लिंक भी चलाए जा सकते हैं, जो अपने स्वयं के नियमों के अधीन होते हैं।',
  },
  {
    title: '8. जानकारी साझा करना और प्रकटीकरण',
    body: 'उपरोक्त सुविधाओं के संचालन के लिए सेवा प्रदाताओं को, सार्वजनिक सेटिंग्स के अनुसार अन्य उपयोगकर्ताओं को, प्लेटफ़ॉर्म संचालन हेतु एडमिन को, तथा लागू कानून या वैध कानूनी प्रक्रिया के अंतर्गत आवश्यक होने पर जानकारी उपलब्ध कराई जा सकती है।',
  },
  {
    title: '9. डेटा सुरक्षा',
    body: 'एप्लिकेशन प्रमाणीकरण और सुरक्षित डेटाबेस एक्सेस नियमों का उपयोग करता है। कोई भी सुरक्षा प्रणाली पूर्ण गारंटी नहीं दे सकती; कृपया अपना पासवर्ड या निजी विवरण सार्वजनिक सामग्री में साझा न करें।',
  },
  {
    title: '10. डेटा प्रतिधारण और हटाना',
    body: 'सेवा संचालन, विवाद समाधान और लागू नियमों की पूर्ति के लिए आवश्यक अवधि तक जानकारी रखी जाती है। खाता हटाने में सहायता के लिए सहायता टीम से संपर्क करें; अनुरोध की समीक्षा लागू नियमों के अधीन होगी।',
  },
  {
    title: '11. बच्चों की गोपनीयता',
    body: 'वर्तमान पंजीकरण प्रक्रिया में आयु सत्यापन या अभिभावक सहमति प्रणाली शामिल नहीं है। यदि आपको लगता है कि किसी बच्चे ने व्यक्तिगत जानकारी प्रदान की है, तो समीक्षा के लिए नीचे दिए गए पते पर संपर्क करें।',
  },
  {
    title: '12. आपके गोपनीयता अधिकार',
    body: 'आप अपनी जानकारी तक पहुँच, सुधार, खाता हटाने में सहायता या गोपनीयता शिकायत के लिए SocialIndia से संपर्क कर सकते हैं। प्रत्येक अनुरोध की समीक्षा लागू कानूनों के अनुसार की जाती है।',
  },
  {
    title: '13. इस नीति में बदलाव',
    body: 'सुविधाओं या लागू नियमों में परिवर्तन होने पर यह पृष्ठ अपडेट किया जा सकता है। नवीनतम संस्करण यहीं प्रकाशित किया जाएगा।',
  },
  {
    title: '14. संपर्क और गोपनीयता शिकायतें',
    body: 'गोपनीयता और सहायता के लिए socialindia.ib@gmail.com पर संपर्क करें। औपचारिक शिकायतें अलग शिकायत निवारण (Grievance Redressal) पृष्ठ के माध्यम से भी दर्ज की जा सकती हैं।',
  },
];

export const PrivacyPolicyPage: React.FC = () => {
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
            <Shield className="h-4 w-4" />
            {isHindi ? 'SocialIndia · भारत द्वारा निर्मित' : 'SocialIndia · Built by Bharat.'}
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{isHindi ? 'गोपनीयता नीति' : 'Privacy Policy'}</h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {isHindi ? 'वेबसाइट:' : 'Website:'} <a className="text-blue-700 hover:underline dark:text-blue-300" href="https://socialindia.web.app/">socialindia.web.app</a>
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
              ? 'यह नीति वर्तमान एप्लिकेशन के व्यवहार का वर्णन करती है। किसी भी कानूनी या परिचालन आवश्यकता की पुष्टि सेवा के अनुसार अलग से की जानी चाहिए।'
              : 'This policy describes current application behavior and is not a representation of complete compliance with the Digital Personal Data Protection Act, 2023, its rules or commencement provisions, or the IT Rules, 2021 as amended. Legal and operational requirements should be confirmed for the service.'}
          </p>
        </div>
      </main>
    </div>
  );
};

