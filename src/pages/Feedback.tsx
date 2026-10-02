import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { feedbackService } from '../services/feedbackService';
import { MessageSquare, Send, Star, CheckCircle2, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

export const FeedbackPage: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserProfile) {
      addToast('Please sign in to share feedback.', 'info');
      return;
    }
    setLoading(true);
    try {
      await feedbackService.submitFeedback({
        uid: currentUser.uid,
        username: currentUserProfile.username,
        type: 'feedback',
        subject: subject.trim(),
        message: message.trim()
      });
      setSubmitted(true);
      addToast('Thank you for your feedback!', 'success');
    } catch (err) {
      addToast('Failed to send feedback.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
        <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mb-2 animate-bounce">
          <Sparkles className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">You're Awesome!</h2>
        <p className="text-sm text-slate-500 max-w-md font-bold">Your feedback helps us build the best version of SocialIndia. We truly appreciate your input.</p>
        <button onClick={() => setSubmitted(false)} className="mt-4 px-8 py-3 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg">Send more feedback</button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-12 max-w-4xl mx-auto pb-24">
      <div className="text-center space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100 dark:border-indigo-800">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Community Driven</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">
          Shape the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Future</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold max-w-lg mx-auto text-sm">
          Found a bug? Have a brilliant feature idea? Your feedback directly influences how SocialIndia evolves.
        </p>
      </div>

      <div className="relative group max-w-2xl mx-auto">
        {/* Decorative Background Elements */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000" />
        
        <div className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-indigo-600/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full -ml-24 -mb-24 blur-3xl pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">What's on your mind?</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="E.g. Dark mode suggestion, Upload speed issue"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-bold text-sm shadow-inner"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">The Full Story</label>
              <textarea
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Details help us understand better..."
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-bold text-sm shadow-inner resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span>Dispatch Feedback</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        {[
          { icon: <Star className="w-5 h-5" />, label: 'Rate Experience' },
          { icon: <MessageSquare className="w-5 h-5" />, label: 'Read Changelog' },
          { icon: <ShieldCheck className="w-5 h-5" />, label: 'Privacy Policy' }
        ].map((item, i) => (
          <button key={i} className="p-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="text-slate-400 group-hover:text-blue-600 transition-colors mb-2 flex justify-center">{item.icon}</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
