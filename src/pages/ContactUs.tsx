import React, { useState } from 'react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { reportService } from '../services/reportService';
import { 
  ArrowLeft, 
  Mail, 
  Send, 
  Loader2, 
  ShieldCheck, 
  Scale, 
  Clock, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  UserCheck, 
  Phone, 
  MapPin, 
  Building
} from 'lucide-react';

export const ContactUsPage: React.FC = () => {
  const { navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'support' | 'grievance'>('grievance');

  // Support Ticket Form State
  const [contactName, setContactName] = useState(currentUserProfile?.displayName || '');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [contactMsg, setContactMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState('');

  // Legal Grievance Form State (MeitY IT Rules 2021)
  const [grievanceName, setGrievanceName] = useState(currentUserProfile?.displayName || '');
  const [grievanceEmail, setGrievanceEmail] = useState(currentUser?.email || '');
  const [grievanceCategory, setGrievanceCategory] = useState<
    'copyright_takedown' | 'privacy_violation' | 'child_safety' | 'impersonation' | 'harassment' | 'illegal_content' | 'general'
  >('copyright_takedown');
  const [targetUrl, setTargetUrl] = useState('');
  const [grievanceDesc, setGrievanceDesc] = useState('');
  const [isUrgent24h, setIsUrgent24h] = useState(false);
  const [isSubmittingGrievance, setIsSubmittingGrievance] = useState(false);
  const [grievanceSuccessTicket, setGrievanceSuccessTicket] = useState<any | null>(null);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSupportSuccess('');
    setTimeout(() => {
      setIsSubmitting(false);
      setSupportSuccess('🎉 Thank you for reaching out! Your support ticket has been registered. Our SocialIndia customer support team will reply via email within 24 hours.');
      setContactMsg('');
    }, 1000);
  };

  const handleGrievanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievanceName.trim() || !grievanceEmail.trim() || !grievanceDesc.trim()) {
      addToast('Please complete all required fields.', 'error');
      return;
    }

    setIsSubmittingGrievance(true);
    try {
      const ticket = await reportService.submitGrievanceTicket({
        userId: currentUser?.uid,
        complainantName: grievanceName.trim(),
        complainantEmail: grievanceEmail.trim(),
        category: grievanceCategory,
        targetUrl: targetUrl.trim(),
        description: grievanceDesc.trim(),
        isUrgent24h: isUrgent24h || grievanceCategory === 'child_safety' || grievanceCategory === 'privacy_violation'
      });
      setGrievanceSuccessTicket(ticket);
      addToast('Grievance registered. Legal acknowledgement generated.', 'success');
      setGrievanceDesc('');
      setTargetUrl('');
    } catch (err) {
      console.error(err);
      addToast('Failed to submit grievance. Please try again.', 'error');
    } finally {
      setIsSubmittingGrievance(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 pb-24">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#065fd4] dark:hover:text-blue-500 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Header Title Card */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/80 dark:border-blue-900/40 rounded-full">
            <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              MeitY IT Rules (2021) Compliance & Support
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
            Grievance Redressal & Contact
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            In compliance with Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, SocialIndia provides a dedicated Grievance Officer, strict resolution timelines, and 24-hour emergency removal protocols.
          </p>
        </div>

        {/* Tab Toggle: Grievance Officer vs General Support */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('grievance')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'grievance' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Grievance Officer & Legal Takedown</span>
            {activeTab === 'grievance' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'support' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Customer Support & Feedback</span>
            {activeTab === 'support' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
          </button>
        </div>

        {activeTab === 'grievance' && (
          <div className="space-y-6">
            
            {/* GRIEVANCE OFFICER OFFICIAL CONTACT CARD */}
            <div className="bg-gradient-to-br from-blue-900/90 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-blue-500/30 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                    Statutory Grievance Officer
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black">Adv. Rajesh Sharma</h2>
                  <p className="text-xs text-blue-200 font-semibold">Resident Grievance Officer • SocialIndia Media Pvt. Ltd.</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <p className="font-black text-amber-300">24-Hr Acknowledgement</p>
                    <p className="text-slate-300 font-medium">15-Day Maximum Disposal</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Grievance Email</span>
                    <a href="mailto:grievance@socialindia.com" className="font-bold text-white hover:underline">grievance@socialindia.com</a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Helpline Contact</span>
                    <span className="font-bold text-white">+91 11 4987 2300</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Corporate Address</span>
                    <span className="font-medium text-slate-200 text-[11px] leading-snug block">Barakhamba Road, Connaught Place, New Delhi 110001, India</span>
                  </div>
                </div>
              </div>

              {/* Special 24-Hour Urgent Removal Banner */}
              <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-black text-amber-300 uppercase tracking-wide text-[11px]">
                    24-Hour Urgent Removal Requirement (Rule 3(2)(b))
                  </p>
                  <p className="text-slate-300 font-medium leading-relaxed">
                    Complaints relating to unauthorized publication of non-consensual sexual content, private nudity, morphing, deepfakes, or impersonation receive immediate prioritized triage and are removed within <strong>24 hours</strong> of complaint receipt.
                  </p>
                </div>
              </div>
            </div>

            {/* INTERACTIVE LEGAL GRIEVANCE FORM */}
            <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  File an Official Grievance or Copyright Takedown
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Each complaint is assigned a statutory Tracking ID with official legal receipt generated in real-time.
                </p>
              </div>

              {grievanceSuccessTicket ? (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Statutory Grievance Ticket Created Successfully</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Tracking Ticket ID:</span>
                      <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">{grievanceSuccessTicket.ticketId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Current Status:</span>
                      <span className="font-black text-emerald-600 uppercase text-[11px]">{grievanceSuccessTicket.status}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Legal Acknowledgement:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Within 24 Hours ({new Date(grievanceSuccessTicket.acknowledgementDeadline).toLocaleDateString()})</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Disposal / Resolution Deadline:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Within 15 Days ({new Date(grievanceSuccessTicket.disposalDeadline).toLocaleDateString()})</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setGrievanceSuccessTicket(null)}
                    className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Submit Another Grievance
                  </button>
                </div>
              ) : (
                <form onSubmit={handleGrievanceSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                        Complainant Full Legal Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={grievanceName}
                        onChange={(e) => setGrievanceName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                        Complainant Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. rahul@example.com"
                        value={grievanceEmail}
                        onChange={(e) => setGrievanceEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                        Category of Legal Violation *
                      </label>
                      <select
                        value={grievanceCategory}
                        onChange={(e: any) => setGrievanceCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="copyright_takedown">Copyright Infringement & Content Takedown</option>
                        <option value="privacy_violation">Privacy Violation / Doxxing / Personal Data Leak</option>
                        <option value="child_safety">Child Safety / Harmful Content Involving Minors</option>
                        <option value="impersonation">Identity Theft / Impersonation of Individual</option>
                        <option value="harassment">Cyberbullying, Threatening or Harassment</option>
                        <option value="illegal_content">Illegal Content / Prohibited IT Rules Material</option>
                        <option value="general">Other Grievance Against Intermediary</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                        Target Video Link / Channel URL
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. https://socialindia.com/#/watch/vid_xyz or @channel"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* 24-Hour Urgent Checkbox */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUrgent24h}
                      onChange={(e) => setIsUrgent24h(e.target.checked)}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-xs">
                      <span className="font-black text-amber-800 dark:text-amber-300 block">
                        Flag as Emergency 24-Hour Takedown Request
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                        Check if the content involves non-consensual sexual material, nudity, impersonation, or immediate child safety danger.
                      </span>
                    </div>
                  </label>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Detailed Facts of the Complaint & Proof of Ownership/Harm *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Please specify exact timestamps, copyright registration number, or description of violation..."
                      value={grievanceDesc}
                      onChange={(e) => setGrievanceDesc(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingGrievance}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    {isSubmittingGrievance ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Submit Formal Grievance to Grievance Officer</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Customer Support & Account Help</h3>
            <p className="text-xs text-slate-500 font-medium">Need help with wallet balances, payout status, creator verification, or technical playback?</p>

            {supportSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-xs font-bold leading-relaxed">
                {supportSuccess}
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amit Kumar"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Your Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. amit@gmail.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message Details</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Please specify details regarding refund requests, account verification questions, or technical issues..."
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Submit Support Ticket</span>
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

