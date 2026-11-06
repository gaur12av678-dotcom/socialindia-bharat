import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { feedbackService } from '../services/feedbackService';
import { useTranslation } from '../i18n';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  Send, 
  CheckCircle2, 
  Loader2, 
  Users, 
  MessageSquare, 
  ShieldCheck, 
  Video, 
  User, 
  Wallet, 
  AlertCircle, 
  Sparkles,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';

interface HelpArticle {
  id: string;
  category: 'popular' | 'fix' | 'watch' | 'account' | 'creator' | 'wallet' | 'policies';
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi: string;
  contentEn: string[];
  contentHi: string[];
}

export const HelpPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  // Search query & category filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'fix' | 'watch' | 'account' | 'creator' | 'wallet' | 'policies'>('all');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>('fix-buffering');
  const [articleFeedback, setArticleFeedback] = useState<Record<string, 'yes' | 'no'>>({});

  // Direct Contact Ticket Form state
  const [contactSubject, setContactSubject] = useState('');
  const [contactCategory, setContactCategory] = useState('technical');
  const [contactMessage, setContactMessage] = useState('');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Comprehensive YouTube-style Help Articles
  const helpArticles: HelpArticle[] = useMemo(() => [
    {
      id: 'fix-buffering',
      category: 'fix',
      titleEn: 'Fix video streaming issues & buffering',
      titleHi: 'वीडियो स्ट्रीमिंग और बफरिंग की समस्या ठीक करें',
      summaryEn: 'Troubleshoot slow loading, video freezing, or playback errors on web and mobile.',
      summaryHi: 'वेब और मोबाइल पर धीमे लोड होने, वीडियो रुकने या प्लेबैक त्रुटियों को ठीक करें।',
      contentEn: [
        '1. Check your internet connection: Restart your Wi-Fi router or toggle mobile data off and on.',
        '2. Change video quality: Tap the gear icon ⚙️ on the video player and switch from 1080p to 720p or 480p.',
        '3. Clear browser cache: Go to browser settings and clear cached images and files.',
        '4. Reload the page: Press Ctrl+F5 (or Cmd+Shift+R on Mac) to perform a hard reload.',
        '5. If the video player still fails to play, click "Send Feedback" to alert our technical support team.'
      ],
      contentHi: [
        '1. अपना इंटरनेट कनेक्शन जांचें: वाई-फ़ाई राउटर रीस्टार्ट करें या मोबाइल डेटा को बंद करके दोबारा चालू करें।',
        '2. वीडियो क्वालिटी बदलें: वीडियो प्लेयर पर गियर आइकन ⚙️ दबाएं और 1080p से 720p या 480p पर सेट करें।',
        '3. ब्राउज़र कैश साफ़ करें: ब्राउज़र सेटिंग्स में जाकर कैश्ड इमेजिस और फ़ाइलें साफ़ करें।',
        '4. पेज को रीलोड करें: Ctrl+F5 (या Mac पर Cmd+Shift+R) दबाकर ताज़ा करें।',
        '5. यदि समस्या बनी रहती है, तो हमारी तकनीकी टीम को रिपोर्ट करने के लिए "फीडबैक भेजें" पर क्लिक करें।'
      ]
    },
    {
      id: 'verify-channel',
      category: 'creator',
      titleEn: 'Verify your channel & upload custom thumbnails',
      titleHi: 'अपना चैनल सत्यापित करें और कस्टम थंबनेल लगाएं',
      summaryEn: 'How to verify your email address to unlock upload features and studio analytics.',
      summaryHi: 'वीडियो अपलोड और स्टूडियो सुविधाओं को अनलॉक करने के लिए ईमेल कैसे सत्यापित करें।',
      contentEn: [
        '1. When you register with your Gmail address, a verification link is sent automatically.',
        '2. Check your Gmail inbox and Spam/Junk folder for an email from noreply@socialindia.',
        '3. Click the link in the email, then return to SocialIndia and click "I\'ve verified my email".',
        '4. Once verified, your channel receives the Verified Creator badge and unlocks HD uploads and monetization points.'
      ],
      contentHi: [
        '1. जब आप अपने Gmail पते से खाता बनाते हैं, तो एक सत्यापन लिंक तुरंत भेजा जाता है।',
        '2. अपने Gmail इनबॉक्स और स्पैम फ़ोल्डर में noreply@socialindia से आया ईमेल देखें।',
        '3. ईमेल में दिए गए लिंक पर क्लिक करें और फिर "मैंने ईमेल सत्यापित कर लिया है" बटन दबाएं।',
        '4. सत्यापन के बाद, आपके चैनल को वेरिफाइड क्रिएटर बैज और एचडी अपलोड सुविधा मिल जाती है।'
      ]
    },
    {
      id: 'upload-shorts',
      category: 'creator',
      titleEn: 'Upload Videos and Shorts on SocialIndia',
      titleHi: 'सोशलइंडिया पर वीडियो और शॉर्ट्स कैसे अपलोड करें',
      summaryEn: 'Guidelines for video aspect ratios, descriptions, tags, and category selection.',
      summaryHi: 'वीडियो अनुपात, शीर्षक, विवरण, टैग्स और श्रेणी चुनने के नियम।',
      contentEn: [
        '1. Click the "+" or "Upload" button in the top navigation bar.',
        '2. For Regular Videos: Use landscape 16:9 MP4 format. Provide an engaging title and tags.',
        '3. For Shorts: Upload vertical 9:16 videos under 60 seconds. Add "#Shorts" in your title.',
        '4. Select appropriate category (Gaming, Music, Tech, Comedy, Education) to maximize discovery on Trending.'
      ],
      contentHi: [
        '1. ऊपर नेविगेशन बार में "+" या "अपलोड" बटन पर क्लिक करें।',
        '2. सामान्य वीडियो: 16:9 लैंडस्केप MP4 फ़ाइल अपलोड करें और आकर्षक शीर्षक व टैग जोड़ें।',
        '3. शॉर्ट्स: 60 सेकंड से कम का 9:16 वर्टिकल वीडियो चुनें और शीर्षक में "#Shorts" लिखें।',
        '4. ट्रेंडिंग पेज पर अधिक व्यूज के लिए सही श्रेणी (गेमिंग, संगीत, टेक, कॉमेडी) चुनें।'
      ]
    },
    {
      id: 'wallet-points',
      category: 'wallet',
      titleEn: 'How Creator Points & Wallet Balance work',
      titleHi: 'क्रिएटर पॉइंट्स और वॉलेट बैलेंस कैसे काम करता है',
      summaryEn: 'Earn points by watching videos, receiving likes, uploading content, and withdraw via UPI.',
      summaryHi: 'वीडियो देखने, लाइक्स पाने और कंटेंट अपलोड करने पर पॉइंट्स कमाएं और UPI से निकालें।',
      contentEn: [
        '1. Creators earn points when viewers watch and like their videos.',
        '2. Viewers also earn daily activity points for discovering and engaging with Indian creators.',
        '3. 100 Points = ₹1 INR in your SocialIndia Creator Wallet.',
        '4. To withdraw: Go to Studio > Wallet, enter your UPI ID (e.g. yourname@upi), and request payout. Payouts process within 24-48 business hours.'
      ],
      contentHi: [
        '1. जब दर्शक आपके वीडियो देखते और लाइक करते हैं, तो क्रिएटर को पॉइंट्स मिलते हैं।',
        '2. दर्शक भी रोजाना वीडियो देखने और बातचीत करने पर रिवार्ड पॉइंट्स अर्जित करते हैं।',
        '3. आपके सोशलइंडिया वॉलेट में 100 पॉइंट्स = ₹1 INR के बराबर होते हैं।',
        '4. पैसे निकालने के लिए: स्टूडियो > वॉलेट में जाएं, अपनी UPI ID दर्ज करें और निकासी अनुरोध भेजें। 24-48 घंटों में भुगतान हो जाता है।'
      ]
    },
    {
      id: 'account-recovery',
      category: 'account',
      titleEn: 'Reset your password or recover your account',
      titleHi: 'पासवर्ड रीसेट करें या अपना खाता पुनर्प्राप्त करें',
      summaryEn: 'Steps to regain access if you forgot your password or lost your login credentials.',
      summaryHi: 'यदि आप पासवर्ड भूल गए हैं तो अपने खाते तक दोबारा पहुँचने के आसान चरण।',
      contentEn: [
        '1. Go to the Sign In page and click "Forgot password?".',
        '2. Option A (Email Reset): Enter your registered Gmail address. A reset link will be sent immediately (remember to check your Gmail Spam folder).',
        '3. Option B (Instant In-App Reset): Enter your channel username and set a new 8-character password directly without waiting for email delivery.',
        '4. If you still cannot log in, submit a support ticket below with your channel handle.'
      ],
      contentHi: [
        '1. साइन इन पेज पर जाएं और "पासवर्ड भूल गए?" पर क्लिक करें।',
        '2. विकल्प A (ईमेल रीसेट): अपना पंजीकृत Gmail पता दर्ज करें। रीसेट लिंक तुरंत भेजा जाएगा (Gmail स्पैम फ़ोल्डर ज़रूर जांचें)।',
        '3. विकल्प B (तुरंत इन-ऐप रीसेट): अपना यूज़रनेम दर्ज करें और बिना ईमेल इंतज़ार के सीधे नया 8-अक्षर का पासवर्ड बनाएं।',
        '4. यदि फिर भी लॉगिन न हो, तो नीचे दिए गए फॉर्म से सहायता टिकट दर्ज करें।'
      ]
    },
    {
      id: 'community-guidelines',
      category: 'policies',
      titleEn: 'Community Guidelines & Copyright Policies',
      titleHi: 'कम्युनिटी दिशानिर्देश और कॉपीराइट नियम',
      summaryEn: 'Learn about content strikes, copyright strikes, and keeping SocialIndia safe.',
      summaryHi: 'कंटेंट स्ट्राइक, कॉपीराइट नियम और सुरक्षित सोशल प्लेटफॉर्म के बारे में जानें।',
      contentEn: [
        '1. Respect Creators: Do not upload content owned by others without explicit permission.',
        '2. Prohibited Content: Harassment, hate speech, violent extremism, and adult material will lead to immediate channel termination.',
        '3. Copyright Strikes: If a rights holder reports your video, you will receive a strike. 3 strikes result in permanent ban.',
        '4. Appeals: If you believe a strike was issued in error, you can submit an appeal through your Creator Studio dashboard.'
      ],
      contentHi: [
        '1. रचनाकारों का सम्मान करें: दूसरों का मूल कंटेंट बिना अनुमति के अपलोड न करें।',
        '2. प्रतिबंधित सामग्री: अभद्र भाषा, नफरत, हिंसा या 18+ सामग्री अपलोड करने पर खाता तुरंत बंद कर दिया जाएगा।',
        '3. कॉपीराइट स्ट्राइक: कॉपीराइट उल्लंघन रिपोर्ट होने पर स्ट्राइक दी जाती है। 3 स्ट्राइक पर स्थायी प्रतिबंध लगता है।',
        '4. अपील: यदि आपको लगता है कि स्ट्राइक गलती से लगी है, तो आप क्रिएटर स्टूडियो से अपील दर्ज कर सकते हैं।'
      ]
    },
    {
      id: 'watch-history-privacy',
      category: 'watch',
      titleEn: 'Manage Watch History, Liked Videos & Privacy',
      titleHi: 'वॉच हिस्ट्री, लाइक किए गए वीडियो और प्राइवेसी प्रबंधित करें',
      summaryEn: 'How to clear watch history, pause recording, or manage saved playlists.',
      summaryHi: 'हिस्ट्री साफ़ करने, रोकने या अपनी प्लेलिस्ट को मैनेज करने का तरीका।',
      contentEn: [
        '1. Open the left sidebar menu and click "History".',
        '2. To remove individual videos: Click the "X" button next to any video card.',
        '3. To clear all history: Click "Clear All Watch History" at the top of the History page.',
        '4. Playlists: You can create Public or Private playlists to organize your favorite Indian content.'
      ],
      contentHi: [
        '1. बाएँ साइडबार मेन्यू में "हिस्ट्री" विकल्प पर क्लिक करें।',
        '2. किसी वीडियो को हटाने के लिए: वीडियो कार्ड के पास दिए "X" बटन पर क्लिक करें।',
        '3. पूरी हिस्ट्री साफ़ करने के लिए: हिस्ट्री पेज के ऊपर "सभी हिस्ट्री साफ़ करें" बटन दबाएं।',
        '4. प्लेलिस्ट: अपने पसंदीदा वीडियो को व्यवस्थित करने के लिए सार्वजनिक या निजी प्लेलिस्ट बनाएं।'
      ]
    }
  ], []);

  // Filtered articles based on search and category
  const filteredArticles = useMemo(() => {
    return helpArticles.filter((article) => {
      const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const titleMatch = article.titleEn.toLowerCase().includes(q) || article.titleHi.toLowerCase().includes(q);
      const summaryMatch = article.summaryEn.toLowerCase().includes(q) || article.summaryHi.toLowerCase().includes(q);
      return matchesCategory && (titleMatch || summaryMatch);
    });
  }, [helpArticles, activeCategory, searchQuery]);

  // Handle support ticket submit
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactMessage.trim()) {
      addToast(isHindi ? 'कृपया विषय और संदेश भरें।' : 'Please fill out subject and message.', 'error');
      return;
    }

    setTicketSubmitting(true);
    try {
      await feedbackService.submitFeedback({
        uid: currentUser?.uid || 'guest-ticket',
        username: currentUserProfile?.username || contactEmail || 'Visitor',
        type: 'help',
        subject: `[${contactCategory.toUpperCase()}] ${contactSubject.trim()}`,
        message: `Email: ${contactEmail || 'Not provided'}\nCategory: ${contactCategory}\n\n${contactMessage.trim()}`
      });

      setTicketSuccess(true);
      addToast(isHindi ? 'सहायता अनुरोध सफलतापूर्वक भेजा गया!' : 'Support ticket submitted successfully!', 'success');
      setContactSubject('');
      setContactMessage('');
    } catch (err) {
      addToast(isHindi ? 'अनुरोध भेजने में विफल।' : 'Failed to submit support request.', 'error');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleRateArticle = (articleId: string, rating: 'yes' | 'no') => {
    setArticleFeedback((prev) => ({ ...prev, [articleId]: rating }));
    addToast(isHindi ? 'आपकी प्रतिक्रिया के लिए धन्यवाद!' : 'Thank you for your feedback!', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f0f] text-slate-900 dark:text-[#f1f1f1] font-['Plus_Jakarta_Sans',sans-serif] pb-20">
      
      {/* ========================================================================= */}
      {/* YOUTUBE HELP CENTER HERO SEARCH BANNER                                    */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-[#181818] border-b border-slate-200 dark:border-slate-800 py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-[#065fd4] dark:text-[#3ea6ff] text-xs font-semibold">
            <HelpCircle className="w-4 h-4" />
            <span>{isHindi ? 'सोशलइंडिया सहायता केंद्र' : 'SocialIndia Help Center'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isHindi ? 'हम आपकी कैसे मदद कर सकते हैं?' : 'How can we help you?'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            {isHindi 
              ? 'समस्याएं हल करें, वीडियो अपलोड करना सीखें, चैनल प्रबंधित करें या हमारी सहायता टीम से संपर्क करें।' 
              : 'Troubleshoot issues, manage your channel, learn about creator monetization, or contact support.'}
          </p>

          {/* Google/YouTube Signature Pill Search Bar */}
          <div className="pt-2 max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isHindi ? "अपनी समस्या का विवरण दें (उदा. बफरिंग, पासवर्ड, थंबनेल)..." : "Describe your issue (e.g. buffering, password reset, upload)..."}
                className="w-full h-13 pl-12 pr-10 rounded-full bg-slate-100 dark:bg-[#272727] border border-slate-300 dark:border-[#383838] focus:border-[#065fd4] dark:focus:border-[#3ea6ff] focus:ring-4 focus:ring-blue-500/15 focus:bg-white dark:focus:bg-[#1f1f1f] text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* YouTube Category Filter Chips */}
          <div className="pt-3 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', label: isHindi ? 'सभी' : 'All Articles' },
              { id: 'fix', label: isHindi ? 'समस्या समाधान' : 'Fix a problem' },
              { id: 'watch', label: isHindi ? 'वीडियो देखना' : 'Watch videos' },
              { id: 'account', label: isHindi ? 'खाता व सेटिंग्स' : 'Account & settings' },
              { id: 'creator', label: isHindi ? 'क्रिएटर व अपलोड' : 'Creator & Upload' },
              { id: 'wallet', label: isHindi ? 'वॉलेट व कमाई' : 'Points & Wallet' },
              { id: 'policies', label: isHindi ? 'नियम व सुरक्षा' : 'Policy & safety' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveCategory(chip.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  activeCategory === chip.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#272727] dark:hover:bg-[#383838] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ARTICLES LIST & DIRECT CREATOR SUPPORT CONTAINER                          */}
      {/* ========================================================================= */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        
        {/* Help Articles Accordion Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#065fd4] dark:text-[#3ea6ff]" />
              <span>{isHindi ? 'अक्सर पूछे जाने वाले सवाल (लोकप्रिय लेख)' : 'Popular Help Articles'}</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {filteredArticles.length} {isHindi ? 'लेख मिले' : 'articles'}
            </span>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isHindi ? 'कोई मिलता-जुलता लेख नहीं मिला।' : 'No matching help articles found.'}
              </p>
              <p className="text-xs text-slate-500">
                {isHindi ? 'कृपया दूसरे शब्दों से खोजें या नीचे सहायता टिकट भेजें।' : 'Try searching different keywords or submit a support ticket below.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => {
                const isExpanded = expandedArticleId === article.id;
                return (
                  <div
                    key={article.id}
                    className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedArticleId(isExpanded ? null : article.id)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors cursor-pointer"
                    >
                      <div className="space-y-1 pr-4">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {isHindi ? article.titleHi : article.titleEn}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {isHindi ? article.summaryHi : article.summaryEn}
                        </p>
                      </div>
                      <div className="p-1 rounded-full text-slate-400 shrink-0">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-in fade-in duration-150">
                        <div className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                          {(isHindi ? article.contentHi : article.contentEn).map((para, idx) => (
                            <p key={idx}>{para}</p>
                          ))}
                        </div>

                        {/* Was this article helpful? (YouTube Google style feedback) */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">
                            {isHindi ? 'क्या यह जानकारी मददगार रही?' : 'Was this helpful?'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRateArticle(article.id, 'yes')}
                              className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                articleFeedback[article.id] === 'yes'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-600 dark:text-emerald-400'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>{isHindi ? 'हाँ' : 'Yes'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRateArticle(article.id, 'no')}
                              className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                articleFeedback[article.id] === 'no'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-600 dark:text-rose-400'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              <span>{isHindi ? 'नहीं' : 'No'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* YOUTUBE "NEED MORE HELP?" 3-CARD COMMUNITY SECTION                        */}
        {/* ========================================================================= */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            {isHindi ? 'अतिरिक्त सहायता चाहिए?' : 'Need more help?'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Community */}
            <div 
              onClick={() => navigate('community')}
              className="p-5 bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-[#065fd4] dark:hover:border-[#3ea6ff] transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#065fd4] dark:text-[#3ea6ff] flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{isHindi ? 'कम्युनिटी से पूछें' : 'Ask the Community'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isHindi ? 'अन्य भारतीय क्रिएटर्स और दर्शकों से तुरंत मदद पाएं।' : 'Get answers from other creators and community experts.'}
              </p>
            </div>

            {/* 2. Send Feedback */}
            <div 
              onClick={() => navigate('feedback')}
              className="p-5 bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-[#065fd4] dark:hover:border-[#3ea6ff] transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{isHindi ? 'फीडबैक भेजें' : 'Send Feedback'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isHindi ? 'प्लेटफ़ॉर्म में सुधार के लिए विचार या बग रिपोर्ट भेजें।' : 'Tell us how we can make SocialIndia better for you.'}
              </p>
            </div>

            {/* 3. Creator Guidelines */}
            <div 
              onClick={() => navigate('guidelines')}
              className="p-5 bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-[#065fd4] dark:hover:border-[#3ea6ff] transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{isHindi ? 'दिशानिर्देश व नीतियां' : 'Community Guidelines'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isHindi ? 'सुरक्षित और समृद्ध वातावरण बनाए रखने के नियम।' : 'Read our standards for content and community safety.'}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* YOUTUBE CREATOR SUPPORT CONTACT TICKET FORM                               */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 sm:p-8 shadow-xs">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-[#065fd4] dark:text-[#3ea6ff]" />
              <span>{isHindi ? 'सोशलइंडिया सपोर्ट टीम से संपर्क करें' : 'Contact SocialIndia Support'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isHindi 
                ? 'यदि आपको ऊपर अपने प्रश्न का उत्तर नहीं मिला, तो सहायता टिकट भेजें। हम 24 घंटे के भीतर उत्तर देते हैं।' 
                : 'Need personalized help? Submit a support request and our team will get back to you within 24 hours.'}
            </p>

            {ticketSuccess ? (
              <div className="mt-6 p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-center space-y-3 animate-in fade-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  {isHindi ? 'आपका अनुरोध सफलतापूर्वक प्राप्त हुआ!' : 'Support Request Received!'}
                </h3>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300 max-w-md mx-auto">
                  {isHindi 
                    ? 'हमारी टीम आपके अनुरोध की समीक्षा करेगी। अपडेट के लिए अपने नोटिफिकेशन और ईमेल चेक करें।' 
                    : 'Our support team has logged your ticket. You will receive an update in your notifications shortly.'}
                </p>
                <button
                  type="button"
                  onClick={() => setTicketSuccess(false)}
                  className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {isHindi ? 'एक और अनुरोध भेजें' : 'Send another message'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="mt-6 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isHindi ? 'समस्या की श्रेणी' : 'Issue Category'}
                    </label>
                    <select
                      value={contactCategory}
                      onChange={(e) => setContactCategory(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#272727] text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff]"
                    >
                      <option value="technical">{isHindi ? 'तकनीकी / वीडियो प्लेबैक समस्या' : 'Technical / Video playback issue'}</option>
                      <option value="upload">{isHindi ? 'वीडियो व शॉर्ट्स अपलोड' : 'Video & Shorts uploading'}</option>
                      <option value="account">{isHindi ? 'खाता व लॉगिन' : 'Account & Login'}</option>
                      <option value="wallet">{isHindi ? 'क्रिएटर वॉलेट व पेआउट्स' : 'Creator Wallet & Payouts'}</option>
                      <option value="copyright">{isHindi ? 'कॉपीराइट व दिशानिर्देश' : 'Copyright & Guidelines'}</option>
                      <option value="other">{isHindi ? 'अन्य पूछताछ' : 'Other inquiry'}</option>
                    </select>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isHindi ? 'आपका ईमेल (उत्तर पाने के लिए)' : 'Your Email (for response)'}
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@gmail.com"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#272727] text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff]"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isHindi ? 'विषय' : 'Subject'}
                  </label>
                  <input
                    type="text"
                    required
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder={isHindi ? "समस्या का संक्षिप्त शीर्षक..." : "Brief summary of what's happening..."}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#272727] text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff]"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isHindi ? 'विस्तार से बताएं' : 'Detailed Description'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder={isHindi ? "समस्या कब और कैसे हुई? क्या कोई त्रुटि कोड दिखा?" : "Tell us what happened, when it started, and steps to reproduce..."}
                    className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#272727] text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#065fd4] dark:focus:border-[#3ea6ff] resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={ticketSubmitting}
                    className="h-11 px-6 bg-[#065fd4] hover:bg-[#054fb1] text-white font-semibold text-xs sm:text-sm rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 active:scale-98"
                  >
                    {ticketSubmitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                    <span>{isHindi ? 'सहायता टिकट भेजें' : 'Submit Request'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};
