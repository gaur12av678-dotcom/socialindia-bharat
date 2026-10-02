import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { feedbackService } from '../services/feedbackService';
import { HelpCircle, Send, MessageSquare, ShieldCheck, CheckCircle2, Loader2, Star } from 'lucide-react';

export const HelpPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to get support.', 'info');
      return;
    }
    setLoading(true);
    try {
      await feedbackService.submitFeedback({
        uid: currentUser.uid,
        username: currentUserProfile.username,
        type: 'help',
        subject: subject.trim(),
        message: message.trim()
      });
      setSubmitted(true);
      addToast('Support request sent successfully!', 'success');
    } catch (err) {
      addToast('Failed to send request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
        <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Request Received</h2>
        <p className="text-sm text-slate-500 max-w-md font-bold">Our support team will review your request and get back to you soon. Check your notifications for updates.</p>
        <button onClick={() => setSubmitted(false)} className="mt-4 text-blue-600 font-black uppercase text-xs tracking-widest hover:underline">Send another request</button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-12 max-w-6xl mx-auto pb-24">
      <div className="text-center space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100 dark:border-blue-800">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Support Center</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">
          How can we <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-500">Help You?</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold max-w-2xl mx-auto text-sm">
          SocialIndia Support is dedicated to your creative success. Whether it's account issues or technical help, we've got your back.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <ShieldCheck className="w-6 h-6" />, title: 'Account Security', desc: 'Secure your creator account and credentials.', color: 'blue' },
              { icon: <MessageSquare className="w-6 h-6" />, title: 'Guidelines', desc: 'Our rules for content publishing.', color: 'purple' },
              { icon: <Star className="w-6 h-6" />, title: 'Monetization', desc: 'How to earn from your creative content.', color: 'indigo' },
              { icon: <HelpCircle className="w-6 h-6" />, title: 'Common Issues', desc: 'Frequently asked questions.', color: 'violet' }
            ].map((item, i) => (
              <div key={i} className="group p-6 bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm hover:border-blue-500 transition-all cursor-pointer">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-slate-50 dark:bg-slate-900 group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400 shadow-inner`}>
                  {item.icon}
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="bg-gradient-to-r from-blue-600/5 to-purple-600/5 border border-blue-100 dark:border-blue-900/20 rounded-[2.5rem] p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4">Quick Tip</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Always keep your recovery email updated in Settings. If you lose access to your account, this is the primary way our team verifies your identity.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-blue-600/20 text-white relative overflow-hidden group">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-all duration-700" />
            
            <h3 className="text-2xl font-black uppercase tracking-tight mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30">
                <Send className="w-5 h-5" />
              </div>
              Contact Us
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-70 ml-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's the issue?"
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-white/40 focus:outline-none focus:bg-white/15 focus:ring-1 focus:ring-white/50 transition-all font-bold text-sm shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-70 ml-1">Message</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detail your problem..."
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-white/40 focus:outline-none focus:bg-white/15 focus:ring-1 focus:ring-white/50 transition-all font-bold text-sm shadow-inner resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-white text-blue-700 font-black rounded-[1.5rem] uppercase tracking-widest text-xs shadow-xl hover:shadow-white/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span>Transmit Request</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
