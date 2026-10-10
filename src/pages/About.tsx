import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { 
  ArrowLeft,
  ArrowRight,
  Video,
  Zap,
  TrendingUp,
  Heart,
  Music,
  Sparkles,
  Gamepad,
  Shield,
  Star,
  Users,
  CheckCircle,
  Wind,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Instagram,
  Youtube,
  MessageSquare,
  Play
} from 'lucide-react';
import { useTranslation } from '../i18n';

export const AboutPage: React.FC = () => {
  const { navigate } = useRouter();
  const { isHindi } = useTranslation();

  return (
    <div className="bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-16 pb-24">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#065fd4] dark:hover:text-blue-500 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isHindi ? 'होम पर वापस जाएं' : 'Back to Home'}</span>
        </button>

        {/* HERO WELCOME SECTION */}
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-4">
          
          {/* Subtle blue/indigo background glow effect from the mockup */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-400/10 to-indigo-400/5 dark:from-blue-950/20 dark:to-transparent rounded-full filter blur-3xl -z-10 pointer-events-none" />

          {/* Left Text Column */}
          <div className="md:col-span-7 space-y-6">
            
            {/* • India's #1 Creator Platform Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/80 dark:border-blue-900/40 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#065fd4] dark:bg-blue-400 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#065fd4] dark:text-blue-400">
                {isHindi ? 'भारत का नंबर 1 क्रिएटर प्लेटफॉर्म' : "India's #1 Creator Platform"}
              </span>
            </div>

            {/* Title: Welcome to SocialIndia (with solid blue color & underline) */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
                {isHindi ? 'स्वागत है' : 'Welcome to'}
              </h1>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none">
                <span className="relative inline-block text-[#065fd4] dark:text-blue-400 pb-2">
                  SocialIndia
                  <span className="absolute left-0 bottom-0 w-full h-[4px] bg-[#065fd4] dark:bg-blue-400 rounded-full" />
                </span>
              </h1>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl">
              {isHindi
                ? 'भारत का स्वदेशी वीडियो प्लेटफॉर्म — जहां क्रिएटर अपना जुनून साझा करते हैं, दर्शक अद्भुत वीडियो खोजते हैं और करोड़ों भारतीय आपस में जुड़ते हैं।'
                : "India's home-grown video platform — where creators share their passion, viewers discover incredible content, and communities thrive together in 22+ languages."}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => navigate('home')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#065fd4] hover:bg-[#0556bf] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                <Play className="w-4 h-4 fill-current text-white" />
                <span>{isHindi ? 'प्लेटफॉर्म एक्सप्लोर करें' : 'Explore Platform'}</span>
              </button>
              <button
                onClick={() => navigate('studio')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>{isHindi ? 'वीडियो बनाना शुरू करें' : 'Start Creating'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Floating Display Column (Play Icon Graphic Card from the Mockup) */}
          <div className="md:col-span-5 flex justify-center md:justify-end">
            <div className="relative p-8 bg-gradient-to-tr from-blue-50/50 to-white dark:from-[#111827] dark:to-[#1e293b] rounded-3xl border border-blue-100/80 dark:border-blue-900/40 shadow-xl flex flex-col items-center justify-center w-full max-w-[280px] aspect-square transition-all hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-800 group">
              
              {/* Blue Play Button with shadow */}
              <div className="w-20 h-20 rounded-2xl bg-[#065fd4] flex items-center justify-center shadow-lg shadow-blue-500/30 transform group-hover:scale-105 transition-transform duration-300">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>

              {/* Tag overlay inside card at the bottom center */}
              <div className="absolute bottom-6 px-4 py-1.5 bg-white dark:bg-[#1a1a1a] border border-blue-100 dark:border-blue-900/30 rounded-full shadow-xs text-[10px] font-black text-[#065fd4] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#065fd4] dark:bg-blue-400 animate-pulse" />
                <span>Proudly Indian</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 ROW STATISTICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-4">
          <div className="bg-slate-50/60 dark:bg-[#161616]/80 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 text-center space-y-1.5 shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-[#1d1d1d]">
            <h3 className="text-2xl sm:text-3xl font-black text-[#065fd4] dark:text-blue-400 tabular-nums">10M+</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider leading-tight">Monthly Active Users</p>
          </div>
          <div className="bg-slate-50/60 dark:bg-[#161616]/80 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 text-center space-y-1.5 shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-[#1d1d1d]">
            <h3 className="text-2xl sm:text-3xl font-black text-[#065fd4] dark:text-blue-400 tabular-nums">50K+</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider leading-tight">Videos Uploaded Daily</p>
          </div>
          <div className="bg-slate-50/60 dark:bg-[#161616]/80 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 text-center space-y-1.5 shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-[#1d1d1d]">
            <h3 className="text-2xl sm:text-3xl font-black text-[#065fd4] dark:text-blue-400 tabular-nums">22</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider leading-tight">Languages Supported</p>
          </div>
          <div className="bg-slate-50/60 dark:bg-[#161616]/80 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 text-center space-y-1.5 shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-[#1d1d1d]">
            <h3 className="text-2xl sm:text-3xl font-black text-[#065fd4] dark:text-blue-400 tabular-nums">500K+</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider leading-tight">Creator Channels</p>
          </div>
        </div>

        {/* BUILT FOR EVERY CREATOR GRID */}
        <div className="space-y-8 pt-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Built for Every Creator
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-xl mx-auto">
              Everything you need to create, grow, and earn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            
            {/* Feature 1: HD Video Sharing */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">HD Video Sharing</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Upload in up to 4K and reach crores of viewers across India and the world.
                </p>
              </div>
            </div>

            {/* Feature 2: Shorts & Reels */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Shorts & Reels</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Vertical short-form videos that go viral — get discovered by new audiences instantly.
                </p>
              </div>
            </div>

            {/* Feature 3: Creator Analytics */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Creator Analytics</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Deep analytics, audience insights, A/B thumbnails, and growth tools built for creators.
                </p>
              </div>
            </div>

            {/* Feature 4: Community & Chat */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Community & Chat</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Posts, comments, group chats, and community polls — build genuine connections.
                </p>
              </div>
            </div>

            {/* Feature 5: Sound & Audio Library */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Music className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Sound & Audio Library</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Add trending audio tracks, background beats, and original music to your Shorts.
                </p>
              </div>
            </div>

            {/* Feature 6: IBAI AI Assistant */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">IBAI AI Assistant</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Your personal AI co-creator — script writing, title suggestions, trend analysis & voice replies.
                </p>
              </div>
            </div>

            {/* Feature 7: Background Music */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Music className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Background Music</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Royalty-free music library with one-tap addition to your videos and Shorts.
                </p>
              </div>
            </div>

            {/* Feature 8: Games & Mini-Apps */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Gamepad className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Games & Mini-Apps</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Play casual games, win coins, and unlock creator perks without leaving the app.
                </p>
              </div>
            </div>

            {/* Feature 9: Safe Platform */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-3.5 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Safe Platform</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  AI moderation + human review. IBAI scans all uploads. Zero tolerance for harmful content.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* CREATOR ECONOMY GOALS SECTION */}
        <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/60 dark:border-blue-950/30 rounded-3xl p-6 sm:p-10 space-y-8">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <h2 className="text-2xl sm:text-3.5xl font-black text-slate-900 dark:text-white tracking-tight">
              Creator Economy Goals
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              We're committed to enabling 1 million Indian creators to earn a full-time income from their passion by 2027 — through ad revenue, subscriptions, merchandise, and direct fan support.
            </p>
          </div>

          {/* Three white centered cards inside blue box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl text-center space-y-2 shadow-xs flex flex-col items-center">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-[#065fd4] dark:text-blue-400 tabular-nums">₹50 Cr+</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Creator Payouts</p>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl text-center space-y-2 shadow-xs flex flex-col items-center">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-[#065fd4] dark:text-blue-400 tabular-nums">25,000+</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Full-time Creators</p>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-slate-800 p-6 rounded-2xl text-center space-y-2 shadow-xs flex flex-col items-center">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-[#065fd4] dark:text-blue-400 tabular-nums">1,00,000+</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Monetized Channels</p>
            </div>
          </div>
        </div>

        {/* PRIVACY & SAFETY COMMITMENTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Privacy Commitment */}
          <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/85 p-6 rounded-3xl space-y-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Privacy Commitment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Your data stays yours. We never sell personal data to advertisers. All payments are encrypted. Downloads are stored privately in your browser — never in your gallery or file explorer.
              </p>
            </div>
          </div>

          {/* Safety Commitment */}
          <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/85 p-6 rounded-3xl space-y-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wind className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Safety Commitment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Our IBAI AI engine scans all content for harmful material. Human moderators review flagged content. Zero tolerance for CSAM, terror, and hate speech. Transparent appeals process for every decision.
              </p>
            </div>
          </div>
        </div>

        {/* TEAM INDIABHARAT PROFILE CARDS */}
        <div className="space-y-8 pt-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2.5xl font-black text-slate-900 dark:text-white tracking-tight">
              Team IndiaBharat
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Gaurav Saini */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 text-center space-y-4 shadow-xs flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900 dark:text-white">Gaurav Saini</h4>
                <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Founder & CEO</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                Visionary behind SocialIndia, building India's creator economy.
              </p>
            </div>

            {/* Team IndiaBharat */}
            <div className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 text-center space-y-4 shadow-xs flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900 dark:text-white">Team IndiaBharat</h4>
                <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Core Engineering</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                A passionate team building for Bharat, by Bharat.
              </p>
            </div>
          </div>

          {/* Wide Blue Community Impact Banner */}
          <div className="bg-gradient-to-r from-blue-50 via-blue-100/50 to-blue-50 dark:from-blue-950/20 dark:via-blue-950/10 dark:to-blue-950/20 rounded-2xl p-6 sm:p-8 text-center space-y-3.5 border border-blue-100/30 dark:border-blue-950/20">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Community Impact</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-3xl mx-auto">
                SocialIndia has helped over 500,000 creators reach new audiences, preserved hundreds of regional dialects and folk arts through video, and connected diaspora Indians worldwide with their home culture.
              </p>
            </div>
          </div>
        </div>

        {/* ELEVATED FOOTER SECTION */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-12 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Logo, address column */}
            <div className="md:col-span-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#065fd4] flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
                <span className="text-lg font-black text-slate-900 dark:text-white">SocialIndia</span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Powered by <strong className="text-[#065fd4] dark:text-blue-400">IndiaBharat</strong> • Built with love for every Indian creator.
              </p>

              <div className="space-y-2 pt-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>India</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>socialindia.ib@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Contact: Not Available</span>
                </div>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-3 pt-2">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Platform & Company link columns */}
            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
              
              {/* Platform links */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Platform</h5>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <li><button onClick={() => navigate('home')} className="hover:text-blue-600 cursor-pointer">Home</button></li>
                  <li><button onClick={() => navigate('trending')} className="hover:text-blue-600 cursor-pointer">Trending</button></li>
                  <li><button onClick={() => navigate('shorts')} className="hover:text-blue-600 cursor-pointer">Shorts</button></li>
                  <li><button onClick={() => navigate('home')} className="hover:text-blue-600 cursor-pointer">Explore</button></li>
                </ul>
              </div>

              {/* Creators links */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Creators</h5>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <li><button onClick={() => navigate('studio')} className="hover:text-blue-600 cursor-pointer">Creator Studio</button></li>
                  <li><button onClick={() => navigate('studio')} className="hover:text-blue-600 cursor-pointer">Upload Video</button></li>
                  <li><button onClick={() => navigate('studio')} className="hover:text-blue-600 cursor-pointer">Monetization</button></li>
                  <li><span className="text-slate-400 dark:text-slate-600">IBAI Assistant</span></li>
                </ul>
              </div>

              {/* Company links */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Company</h5>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <li><button onClick={() => navigate('about')} className="hover:text-blue-600 cursor-pointer">About</button></li>
                  <li><span className="text-slate-400 dark:text-slate-600">Blog</span></li>
                  <li><span className="text-slate-400 dark:text-slate-600">Careers</span></li>
                  <li><span className="text-slate-400 dark:text-slate-600">Contact</span></li>
                </ul>
              </div>

              {/* Legal links */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Legal</h5>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <li><button onClick={() => navigate('legal')} className="hover:text-blue-600 cursor-pointer">Privacy Policy</button></li>
                  <li><button onClick={() => navigate('legal')} className="hover:text-blue-600 cursor-pointer">Terms of Use</button></li>
                  <li><button onClick={() => navigate('legal')} className="hover:text-blue-600 cursor-pointer">Cookie Policy</button></li>
                  <li><button onClick={() => navigate('legal')} className="hover:text-blue-600 cursor-pointer">Guidelines</button></li>
                </ul>
              </div>

            </div>
          </div>

          {/* Copyright row */}
          <div className="border-t border-slate-100 dark:border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
            <div>
              © 2026 SocialIndia by IndiaBharat · Founder: Gaurav Saini
            </div>
            <div className="flex items-center gap-1.5 font-bold text-slate-500">
              <span className="text-base leading-none">🇮🇳</span>
              <span>IN Proudly Made in India</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
