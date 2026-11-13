import React, { useState, useMemo } from 'react';
import { useRouter } from '../hooks/useRouter';
import { useTranslation } from '../i18n';
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flag,
  Scale,
  Lock,
  Copyright,
  Ban,
  MessageSquareWarning,
  Users,
  Sparkles,
  FileText,
  Mail,
  Gavel,
  BookOpen,
  ExternalLink
} from 'lucide-react';

interface PolicyRule {
  id: string;
  category: 'spam' | 'sensitive' | 'violent' | 'copyright' | 'misinfo';
  icon: React.FC<{ className?: string }>;
  accentBg: string;
  accentText: string;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi: string;
  doNotEn: string[];
  doNotHi: string[];
  allowedEn: string[];
  allowedHi: string[];
}

const POLICY_PILLARS: PolicyRule[] = [
  {
    id: 'spam-scams',
    category: 'spam',
    icon: Ban,
    accentBg: 'bg-amber-50 dark:bg-amber-950/40',
    accentText: 'text-amber-600 dark:text-amber-400',
    titleEn: 'Spam, Fake Engagement & Monetization Abuse',
    titleHi: 'स्पैम, फर्जी एंगेजमेंट और मोनेटाइजेशन दुरुपयोग',
    summaryEn:
      'Keep SocialIndia authentic. Artificially inflating views, likes, subscribers, comments, or Reward Points is strictly prohibited.',
    summaryHi:
      'सोशलइंडिया को प्रामाणिक बनाए रखें। व्यूज, लाइक्स, सब्सक्राइबर्स, कमेंट्स या रिवॉर्ड पॉइंट्स को कृत्रिम रूप से बढ़ाना सख्त वर्जित है।',
    doNotEn: [
      'Using bots, view farms, auto-clickers, or fake accounts to farm Reward Points (+2/+5/+10/+20 pts) or unlock the 500 followers / 1,000 views monetization threshold.',
      'Posting repetitive copy-paste promo links, phishing URLs, malware downloads, or misleading clickbait titles and thumbnails.',
      'Running deceptive "cash giveaway" scams, pyramid schemes, or unauthorized wallet/UPI solicitation in comments or Shorts.'
    ],
    doNotHi: [
      'रिवॉर्ड पॉइंट्स (+2/+5/+10/+20 pts) या 500 फॉलोअर्स / 1,000 व्यूज मोनेटाइजेशन लक्ष्य पाने के लिए बॉट्स, व्यू फार्म या फर्जी खातों का उपयोग करना।',
      'कमेंट्स में बार-बार कॉपी-पेस्ट स्पैम लिंक, फ़िशिंग URL, मैलवेयर या भ्रामक क्लिकबेट थंबनेल डालना।',
      'नकली "कैश गिवअवे" घोटाले, पिरामिड स्कीम या बिना अनुमति वॉलेट/UPI पैसे मांगना।'
    ],
    allowedEn: [
      'Clearly disclosed brand sponsorships, creator merch links, and genuine calls to subscribe or comment.',
      'Educational tutorials, honest product reviews, and organic community discussions.'
    ],
    allowedHi: [
      'स्पष्ट रूप से घोषित ब्रांड स्पॉन्सरशिप, क्रिएटर लिंक और सब्सक्राइब/कमेंट करने के ईमानदार अनुरोध।',
      'शैक्षणिक ट्यूटोरियल, ईमानदार उत्पाद समीक्षाएं और स्वाभाविक कम्युनिटी चर्चाएं।'
    ]
  },
  {
    id: 'sensitive-child-safety',
    category: 'sensitive',
    icon: Lock,
    accentBg: 'bg-rose-50 dark:bg-rose-950/40',
    accentText: 'text-rose-600 dark:text-rose-400',
    titleEn: 'Child Safety, Nudity & Sensitive Content',
    titleHi: 'बाल सुरक्षा, अश्लीलता और संवेदनशील सामग्री',
    summaryEn:
      'SocialIndia is a family-safe platform for ages 13+. Any form of child exploitation, non-consensual imagery, or explicit sexual content triggers immediate permanent termination.',
    summaryHi:
      'सोशलइंडिया 13+ वर्ष के उपयोगकर्ताओं के लिए एक पारिवारिक सुरक्षित मंच है। बाल शोषण, बिना सहमति की तस्वीरें या अश्लील सामग्री पर तुरंत स्थायी प्रतिबंध लगाया जाता है।',
    doNotEn: [
      'Child Sexual Abuse Material (CSAM) or any exploitation/grooming of minors (zero tolerance — immediately banned and reported to NCPR & NCRB).',
      'Pornography, sexually explicit videos, Shorts, thumbnails, or non-consensual intimate/private imagery (removed within 24 hours under IT Rules 2021).',
      'Content promoting suicide, self-harm, eating disorders, or dangerous stunts involving minors.'
    ],
    doNotHi: [
      'बाल यौन शोषण सामग्री (CSAM) या नाबालिगों का किसी भी प्रकार का शोषण (जीरो टॉलरेंस — तुरंत स्थायी बैन और NCPR व NCRB को रिपोर्ट)।',
      'पोर्नोग्राफी, अश्लील वीडियो/शॉर्ट्स या किसी की निजी व बिना सहमति की तस्वीरें (IT Rules 2021 के तहत 24 घंटे में हटाया जाएगा)।',
      'आत्महत्या, आत्म-नुकसान (self-harm) या नाबालिगों के साथ खतरनाक स्टंट को बढ़ावा देने वाली सामग्री।'
    ],
    allowedEn: [
      'Age-appropriate health awareness, certified educational biology/medical resources, and parental online-safety guides.',
      'Users aged 13–17 using the platform responsibly under parent or legal guardian consent and guidance.'
    ],
    allowedHi: [
      'स्वास्थ्य जागरूकता, प्रमाणित शैक्षणिक चिकित्सा जानकारी और माता-पिता के लिए ऑनलाइन सुरक्षा गाइड।',
      '13–17 वर्ष के उपयोगकर्ता माता-पिता या अभिभावक की सहमति और मार्गदर्शन में सुरक्षित उपयोग कर सकते हैं।'
    ]
  },
  {
    id: 'violent-hate',
    category: 'violent',
    icon: MessageSquareWarning,
    accentBg: 'bg-orange-50 dark:bg-orange-950/40',
    accentText: 'text-orange-600 dark:text-orange-400',
    titleEn: 'Hate Speech, Harassment & Public Safety',
    titleHi: 'नफरत भरे भाषण, उत्पीड़न और सार्वजनिक सुरक्षा',
    summaryEn:
      'Treat every creator and viewer across Bharat with respect. Hate speech, regional slurs, cyberbullying, and violent threats are strictly barred.',
    summaryHi:
      'भारत भर के हर क्रिएटर और दर्शक का सम्मान करें। नफरत भरे भाषण, क्षेत्रीय/जातीय अपमान, साइबरबुलिंग और हिंसक धमकियां सख्त वर्जित हैं।',
    doNotEn: [
      'Hate speech, regional, caste, religious, gender, or ethnic slurs in videos, Shorts, Community Posts, live chats, or comments.',
      'Targeted harassment, doxxing (sharing private phone numbers, addresses, or Aadhaar/UPI details), or inciting brigading against another creator.',
      'Graphic violence, terrorism glorification, or content threatening India’s sovereignty, integrity, defense, or public order (IT Rules 2021 Rule 3(1)(b)).'
    ],
    doNotHi: [
      'वीडियो, शॉर्ट्स, कम्युनिटी पोस्ट या कमेंट्स में क्षेत्र, जाति, धर्म, लिंग या भाषा के आधार पर अपमान और नफरत भरे भाषण।',
      'लक्षित उत्पीड़न, डॉक्सिंग (निजी फोन नंबर, पता या आधार/UPI साझा करना) या किसी क्रिएटर के खिलाफ भीड़ उकसाना।',
      'क्रूर हिंसा, आतंकवाद का महिमामंडन, या भारत की संप्रभुता, अखंडता, रक्षा और सार्वजनिक व्यवस्था के लिए खतरा पैदा करने वाली सामग्री।'
    ],
    allowedEn: [
      'Respectful debate, constructive criticism of public policies, news reporting, and comedy/satire that does not attack protected groups.',
      'Documentaries or historical education clearly framed with non-violent context.'
    ],
    allowedHi: [
      'सम्मानजनक बहस, रचनात्मक आलोचना, समाचार रिपोर्टिंग और ऐसा हास्य/व्यंग्य जो किसी वर्ग पर हमला न करे।',
      'ऐतिहासिक या शैक्षणिक डॉक्यूमेंट्री जो बिना हिंसा के सही संदर्भ में प्रस्तुत की गई हों।'
    ]
  },
  {
    id: 'copyright-impersonation',
    category: 'copyright',
    icon: Copyright,
    accentBg: 'bg-blue-50 dark:bg-blue-950/40',
    accentText: 'text-blue-600 dark:text-blue-400',
    titleEn: 'Copyright, Originality & Impersonation',
    titleHi: 'कॉपीराइट, मौलिकता और प्रतिरूपण (Impersonation)',
    summaryEn:
      'Only upload videos, Shorts, thumbnails, and music that you created or have legal permission to use. Never pretend to be another person or official brand.',
    summaryHi:
      'केवल वही वीडियो, शॉर्ट्स, थंबनेल और संगीत अपलोड करें जिन्हें आपने बनाया है या जिनके उपयोग का कानूनी अधिकार आपके पास है। किसी और के नाम से फर्जी चैनल न बनाएं।',
    doNotEn: [
      'Re-uploading movies, TV serials, copyrighted songs, or another creator’s videos/Shorts without written license or transformative commentary.',
      'Creating lookalike channels pretending to be another creator, celebrity, government body, or official SocialIndia staff.',
      'Uploading fake verification badge graphics or misleading channel handles to deceive viewers.'
    ],
    doNotHi: [
      'बिना अनुमति या लाइसेंस के फिल्में, टीवी शो, कॉपीराइट संगीत या अन्य क्रिएटर्स के वीडियो/शॉर्ट्स दोबारा अपलोड करना।',
      'किसी अन्य क्रिएटर, सेलिब्रिटी, सरकारी संस्था या आधिकारिक सोशलइंडिया टीम की नकल करके फर्जी चैनल बनाना।',
      'दर्शकों को धोखा देने के लिए नकली वेरिफाइड बैज ग्राफिक्स या भ्रामक हैंडल का उपयोग करना।'
    ],
    allowedEn: [
      'Original creations, licensed royalty-free tracks from the SocialIndia Sound Library, and fair-dealing commentary/reviews.',
      'Clearly labeled fan channels or parody accounts that state they are unofficial in the channel name and bio.'
    ],
    allowedHi: [
      'आपकी अपनी मौलिक रचनाएं, सोशलइंडिया साउंड लाइब्रेरी के लाइसेंस प्राप्त ट्रैक और समीक्षा/टिप्पणी वीडियो।',
      'स्पष्ट रूप से लेबल किए गए फैन या पैरोडी चैनल जो नाम और बायो में अनौपचारिक होने की जानकारी देते हैं।'
    ]
  },
  {
    id: 'misinfo-regulated',
    category: 'misinfo',
    icon: ShieldAlert,
    accentBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    titleEn: 'Misinformation, Deepfakes & Regulated Goods',
    titleHi: 'भ्रामक सूचना, डीपफेक और प्रतिबंधित सामग्री',
    summaryEn:
      'Protect users from dangerous misinformation, deceptive AI deepfakes, and illegal or harmful products.',
    summaryHi:
      'उपयोगकर्ताओं को खतरनाक झूठी खबरों, धोखाधड़ी वाले डीपफेक और अवैध या हानिकारक उत्पादों से सुरक्षित रखें।',
    doNotEn: [
      'Spreading fabricated breaking news, medical quackery causing real-world harm, or manipulated voter/election misinformation.',
      'Deceptive AI-generated voice clones or deepfakes impersonating real individuals without clear disclosure.',
      'Promoting illegal weapons, narcotics, unregulated gambling/betting apps, or pirated software cracks.'
    ],
    doNotHi: [
      'मनगढ़ंत ब्रेकिंग न्यूज़, जानलेवा झूठे चिकित्सा दावे, या चुनाव व मतदान से जुड़ी भ्रामक जानकारी फैलाना।',
      'बिना स्पष्ट घोषणा के किसी वास्तविक व्यक्ति की नकल करने वाले भ्रामक AI वॉइस क्लोन या डीपफेक वीडियो।',
      'अवैध हथियार, नशीले पदार्थ, अनियंत्रित सट्टेबाजी ऐप या पायरेटेड सॉफ्टवेयर का प्रचार करना।'
    ],
    allowedEn: [
      'Transparent AI art/entertainment clearly tagged as AI-generated.',
      'Fact-checking videos, digital literacy guides, and verified public-interest announcements.'
    ],
    allowedHi: [
      'मनोरंजन के लिए बनाई गई पारदर्शी AI कला जिसे स्पष्ट रूप से AI-निर्मित बताया गया हो।',
      'फैक्ट-चेकिंग वीडियो, डिजिटल साक्षरता गाइड और जनहित की सत्यापित जानकारियां।'
    ]
  }
];

export const CommunityGuidelinesPage: React.FC = () => {
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | PolicyRule['category']>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'spam-scams': true,
    'sensitive-child-safety': true
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredPillars = useMemo(() => {
    return POLICY_PILLARS.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCat) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        item.titleEn.toLowerCase().includes(q) ||
        item.titleHi.toLowerCase().includes(q) ||
        item.summaryEn.toLowerCase().includes(q) ||
        item.summaryHi.toLowerCase().includes(q) ||
        item.doNotEn.some((d) => d.toLowerCase().includes(q)) ||
        item.doNotHi.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  const strikeLevels = [
    {
      level: isHindi ? 'स्तर 1 • चेतावनी (Warning)' : 'Level 1 • Warning',
      badge: isHindi ? 'पहली बार' : 'First Infraction',
      color: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
      desc: isHindi
        ? 'पहली बार मामूली उल्लंघन होने पर केवल सामग्री हटाई जाती है और आपके नोटिफिकेशन फ़ीड में एक औपचारिक चेतावनी दी जाती है। चैनल पर कोई प्रतिबंध नहीं लगता।'
        : 'First-time minor infractions remove the offending content and issue a formal educational warning notice in your notifications without channel restrictions.'
    },
    {
      level: isHindi ? 'स्तर 2 • स्ट्राइक 1 (7-दिन अपलोड रोक)' : 'Level 2 • Strike 1 (Content Removal)',
      badge: isHindi ? '7 दिन रोक' : '7-Day Freeze',
      color: 'border-orange-200 dark:border-orange-900/60 bg-orange-50/70 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300',
      desc: isHindi
        ? 'दोबारा नियम तोड़ने पर सामग्री हटा दी जाती है और 7 दिनों के लिए वीडियो/शॉर्ट्स अपलोड करने व लाइव जाने पर अस्थायी रोक लग जाती है।'
        : 'Repeated infractions result in content takedown and a temporary 7-day restriction on uploading videos, Shorts, or publishing posts.'
    },
    {
      level: isHindi ? 'स्तर 3 • खाता प्रतिबंध (Account Restriction)' : 'Level 3 • Account Restriction',
      badge: isHindi ? 'फीचर लॉक' : 'Features Locked',
      color: 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300',
      desc: isHindi
        ? 'गंभीर या लगातार उल्लंघन पर डायरेक्ट मैसेजिंग, कमेंट करने और वॉलेट विथड्रॉल / मोनेटाइजेशन सुविधाओं को निलंबित कर दिया जाता है।'
        : 'Severe or repeated violations disable commenting, direct messaging, monetization eligibility, and wallet withdrawals.'
    },
    {
      level: isHindi ? 'स्तर 4 • स्थायी निलंबन (Permanent Ban)' : 'Level 4 • Permanent Termination',
      badge: isHindi ? 'स्थायी बैन' : 'Channel Terminated',
      color: 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/35 text-red-700 dark:text-red-300',
      desc: isHindi
        ? 'अवैध कार्य, CSAM, गंभीर धोखाधड़ी या लगातार कॉपीराइट चोरी पर चैनल स्थायी रूप से बंद कर दिया जाता है, वॉलेट बैलेंस जब्त होता है और IP/डिवाइस ब्लॉक किया जाता है।'
        : 'Egregious violations (CSAM, illegal acts, fraud, or systemic piracy) result in permanent channel termination, wallet forfeiture, and IP/device banning.'
    }
  ];

  const categories: { id: 'all' | PolicyRule['category']; labelEn: string; labelHi: string }[] = [
    { id: 'all', labelEn: 'All Policies', labelHi: 'सभी नियम' },
    { id: 'spam', labelEn: 'Spam & Points', labelHi: 'स्पैम व पॉइंट्स' },
    { id: 'sensitive', labelEn: 'Child Safety & Nudity', labelHi: 'बाल सुरक्षा' },
    { id: 'violent', labelEn: 'Hate & Safety', labelHi: 'नफरत व सुरक्षा' },
    { id: 'copyright', labelEn: 'Copyright', labelHi: 'कॉपीराइट' },
    { id: 'misinfo', labelEn: 'Misinformation', labelHi: 'भ्रामक सूचना' }
  ];

  return (
    <div className="bg-slate-50 dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 min-h-screen font-sans">
      
      {/* YouTube-Style Top Sticky Policy Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('home')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isHindi ? 'होम' : 'Home'}</span>
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
              <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white">
                {isHindi ? 'सोशलइंडिया नियम व सुरक्षा केंद्र' : 'SocialIndia Rules & Policies'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              onClick={() => navigate('terms')}
              className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              {isHindi ? 'नियम व शर्तें' : 'Terms'}
            </button>
            <button
              onClick={() => navigate('privacy')}
              className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              {isHindi ? 'गोपनीयता' : 'Privacy'}
            </button>
            <button
              onClick={() => navigate('help')}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563eb] dark:text-blue-400 cursor-pointer"
            >
              {isHindi ? 'सहायता' : 'Help'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-10 pb-28">
        
        {/* HERO SECTION (YouTube Community Guidelines Style) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#172554] to-[#1e1b4b] text-white p-6 sm:p-10 shadow-xl border border-white/10">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full">
              <BookOpen className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100">
                {isHindi ? 'IT Rules 2021 व DPDP अनुपालित' : 'YouTube-Standard Safety • IT Rules 2021 Compliant'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {isHindi ? 'कम्युनिटी दिशानिर्देश (Community Guidelines)' : 'Community Guidelines'}
            </h1>

            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
              {isHindi
                ? 'सोशलइंडिया भारत का अपना वीडियो और कम्युनिटी मंच है। ये दिशानिर्देश तय करते हैं कि हमारे प्लेटफॉर्म पर किस प्रकार के वीडियो, शॉर्ट्स, कमेंट और पोस्ट सुरक्षित हैं — ताकि हर क्रिएटर और दर्शक सुरक्षित व सम्मानजनक अनुभव पा सके।'
                : 'When you use SocialIndia, you join a community of creators and viewers across Bharat. These guidelines define what is allowed and prohibited across Videos, Shorts, Comments, Community Posts, and Live Chat.'}
            </p>

            {/* Quick Policy Search Bar */}
            <div className="pt-2 relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isHindi ? 'नीति खोजें (जैसे: कॉपीराइट, स्पैम, पॉइंट्स, बाल सुरक्षा)...' : 'Search policies (e.g. copyright, spam, points, child safety)...'}
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* POLICY CATEGORY FILTER CHIPS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-[#16171a] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isHindi ? cat.labelHi : cat.labelEn}
              </button>
            );
          })}
        </div>

        {/* SECTION 1: 5 YOUTUBE-STYLE POLICY PILLARS (ACCORDION CARDS) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2563eb]" />
              <span>{isHindi ? 'मुख्य सामग्री एवं आचरण नियम' : 'Core Content & Conduct Policies'}</span>
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {filteredPillars.length} {isHindi ? 'नियम' : 'policies'}
            </span>
          </div>

          {filteredPillars.length === 0 ? (
            <div className="bg-white dark:bg-[#16171a] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {isHindi ? 'कोई संबंधित नीति नहीं मिली।' : 'No matching guidelines found.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                {isHindi ? 'सभी नीतियां दिखाएं' : 'Reset filters'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPillars.map((pillar) => {
                const Icon = pillar.icon;
                const isOpen = !!expandedIds[pillar.id] || searchQuery.trim().length > 0;
                const doNots = isHindi ? pillar.doNotHi : pillar.doNotEn;
                const alloweds = isHindi ? pillar.allowedHi : pillar.allowedEn;

                return (
                  <div
                    key={pillar.id}
                    className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xs transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(pillar.id)}
                      className="w-full p-5 sm:p-6 flex items-start justify-between gap-4 text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl ${pillar.accentBg} ${pillar.accentText} flex items-center justify-center shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                            {isHindi ? pillar.titleHi : pillar.titleEn}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            {isHindi ? pillar.summaryHi : pillar.summaryEn}
                          </p>
                        </div>
                      </div>

                      <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 mt-1">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Prohibited / Don't Post */}
                        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/40 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                            <XCircle className="w-4 h-4" />
                            <span>{isHindi ? 'यह अपलोड न करें (वर्जित)' : 'Don’t Post (Prohibited)'}</span>
                          </div>
                          <ul className="space-y-2">
                            {doNots.map((line, i) => (
                              <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2 font-medium">
                                <span className="text-rose-500 font-black mt-0.5">•</span>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Allowed / Best Practices */}
                        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/40 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isHindi ? 'क्या अनुमति है (सुरक्षित)' : 'What’s Allowed'}</span>
                          </div>
                          <ul className="space-y-2">
                            {alloweds.map((line, i) => (
                              <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2 font-medium">
                                <span className="text-emerald-500 font-black mt-0.5">✓</span>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: YOUTUBE-STYLE 4-LEVEL STRIKE & ENFORCEMENT SYSTEM */}
        <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xs">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <Gavel className="w-4 h-4" />
              <span>{isHindi ? 'स्ट्राइक और प्रवर्तन प्रणाली' : 'Enforcement & Strike System'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isHindi ? 'नियम उल्लंघन के परिणाम (4-स्तरीय प्रणाली)' : 'How Community Guidelines Strikes Work'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {isHindi
                ? 'हमारी ट्रस्ट एंड सेफ्टी टीम और स्वचालित सिस्टम उल्लंघन की गंभीरता के आधार पर पारदर्शी कार्रवाई करते हैं:'
                : 'SocialIndia enforces a transparent, 4-level consequence ladder aligned with our Terms of Use:'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strikeLevels.map((st, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border ${st.color} space-y-2`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black">{st.level}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 text-[10px] font-black uppercase">
                    {st.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: REPORTING, APPEALS & GRIEVANCE REDRESSAL (IT RULES 2021) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Reporting Card */}
          <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isHindi ? 'सामग्री की रिपोर्ट कैसे करें?' : 'How to Report Violations'}
                </h3>
                <p className="text-[11px] font-semibold text-slate-500">
                  {isHindi ? '24x7 कम्युनिटी रिपोर्टिंग' : '24x7 Trust & Safety Review'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {isHindi
                ? 'यदि कोई वीडियो, शॉर्ट्स, कमेंट या चैनल हमारे दिशानिर्देशों का उल्लंघन करता है, तो वीडियो प्लेयर या चैनल मेनू में (⋮ → Report) पर क्लिक करें। गैर-सहमति वाली निजी सामग्री या पहचान की नकल से जुड़ी शिकायतों को 24 घंटे के भीतर हटाया जाता है।'
                : 'If you see a video, Short, comment, or channel violating these rules, tap the menu icon (⋮ → Report) and pick the violation category. Non-consensual imagery or impersonation reports receive emergency removal within 24 hours.'}
            </p>

            <button
              onClick={() => navigate('feedback')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-extrabold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>{isHindi ? 'सीधे सुरक्षा रिपोर्ट भेजें' : 'Submit Safety Feedback'}</span>
            </button>
          </div>

          {/* Appeals & Grievance Officer Card */}
          <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isHindi ? 'अपील व शिकायत निवारण अधिकारी' : 'Appeals & Grievance Officer'}
                </h3>
                <p className="text-[11px] font-semibold text-slate-500">
                  {isHindi ? 'MeitY IT Rules 2021 अनुपालन' : 'MeitY IT Rules 2021 Redressal'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {isHindi
                ? 'यदि आपको लगता है कि आपका वीडियो या खाता गलती से हटाया गया है, तो आप निष्पक्ष समीक्षा के लिए अपील कर सकते हैं। शिकायतों की पावती 24 घंटे में और समाधान 15 दिनों के भीतर किया जाता है।'
                : 'If you believe your content was removed or restricted by mistake, you have the right to appeal. Complaints are acknowledged within 24 hours and resolved within 15 days.'}
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
              <p className="font-black text-slate-900 dark:text-white">
                {isHindi ? 'निवासी शिकायत अधिकारी: एडवोकेट राजेश शर्मा' : 'Resident Grievance Officer: Adv. Rajesh Sharma'}
              </p>
              <p className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>grievance@socialindia.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* RELATED POLICY LINKS FOOTER */}
        <div className="bg-white dark:bg-[#16171a] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#2563eb]" />
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {isHindi ? 'संबंधित सोशलइंडिया नीतियां' : 'Related SocialIndia Policies'}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {isHindi ? 'पूर्ण नियम, डेटा सुरक्षा और सहायता केंद्र पढ़ें' : 'Review full legal terms, DPDP privacy rights, and creator help'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('terms')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1.5"
            >
              <span>{isHindi ? 'उपयोग की शर्तें' : 'Terms of Use'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={() => navigate('privacy')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1.5"
            >
              <span>{isHindi ? 'गोपनीयता नीति' : 'Privacy Policy'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={() => navigate('contact')}
              className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <span>{isHindi ? 'संपर्क करें' : 'Contact Us'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
