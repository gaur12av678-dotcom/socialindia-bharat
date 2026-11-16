import React, { useState } from 'react';
import { ArrowLeft, Loader2, Mail, ShieldAlert } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { grievanceService, GRIEVANCE_CATEGORIES, GrievanceCategory } from '../services/grievanceService';

const isHttpUrl = (value: string): boolean => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export const GrievancePage: React.FC = () => {
  const { navigate } = useRouter();
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { isHindi } = useTranslation();
  const [name, setName] = useState(currentUserProfile?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [category, setCategory] = useState<GrievanceCategory>(GRIEVANCE_CATEGORIES[0]);
  const [targetUrl, setTargetUrl] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [description, setDescription] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isHttpUrl(targetUrl) || !isHttpUrl(evidenceReference)) {
      addToast('Enter a valid http or https URL, or leave the field blank.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const newTrackingId = await grievanceService.submit({
        complainantName: name.trim(),
        email: email.trim().toLowerCase(),
        category,
        targetUrl: targetUrl.trim(),
        emergency,
        description: description.trim(),
        evidenceReference: evidenceReference.trim(),
      });
      setTrackingId(newTrackingId);
      setDescription('');
      setTargetUrl('');
      setEvidenceReference('');
      addToast('Your complaint was submitted.', 'success');
    } catch (error) {
      console.error('Grievance submission failed:', error);
      addToast('Could not submit your complaint. Please try again or email socialindia.ib@gmail.com.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-slate-100">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8 pb-24 space-y-8">
        <button
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {isHindi ? 'होम पर वापस जाएं' : 'Back to Home'}
        </button>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            <ShieldAlert className="w-4 h-4" />
            SocialIndia Grievance & Support Team
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">Grievance Redressal & Support</h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Submit a complaint about content, privacy, safety, impersonation, or an account. Do not include
            passwords or sensitive identity documents. Supporting evidence can be a link you control; file
            uploads are not accepted here.
          </p>
          <a href="mailto:socialindia.ib@gmail.com" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300 hover:underline">
            <Mail className="w-4 h-4" />
            socialindia.ib@gmail.com
          </a>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This submission channel does not itself establish that statutory requirements have been met.
            Statutory officer details will be published only after a genuine appointment. Automatic email
            acknowledgements are not currently configured; keep the tracking ID shown after submission.
          </p>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Some complaints concerning covered intimate imagery or electronic impersonation may fall under
            Rule 3(2)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code)
            Rules, 2021, as amended, which provides for reasonable and practicable measures within 24 hours
            when that Rule applies. Ordinary grievances, copyright notices, and other legally required
            takedown requests are distinct and are assessed under their applicable requirements. Selecting
            “emergency” requests urgent review but does not determine the legal classification or guarantee
            a particular outcome or timeline.
          </p>
        </header>

        {trackingId ? (
          <section aria-live="polite" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <h2 className="text-lg font-black text-emerald-800 dark:text-emerald-300">Complaint submitted</h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Save this tracking ID for any follow-up:</p>
            <p className="mt-2 font-mono text-lg font-black text-emerald-800 dark:text-emerald-300">{trackingId}</p>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              No acknowledgement email has been sent. For assistance, email socialindia.ib@gmail.com and include the tracking ID.
            </p>
            <button onClick={() => setTrackingId('')} className="mt-4 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300">
              Submit another complaint
            </button>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-8 dark:border-slate-800 dark:bg-[#161616]">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold">
                Complainant Full Name *
                <input required maxLength={120} value={name} onChange={event => setName(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="space-y-1.5 text-xs font-bold">
                Complainant Email Address *
                <input required type="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
              </label>
            </div>

            <label className="block space-y-1.5 text-xs font-bold">
              Complaint Category *
              <select required value={category} onChange={event => setCategory(event.target.value as GrievanceCategory)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                {GRIEVANCE_CATEGORIES.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>

            <label className="block space-y-1.5 text-xs font-bold">
              Target Video / Post / Profile URL
              <input type="url" maxLength={2048} value={targetUrl} onChange={event => setTargetUrl(event.target.value)} placeholder="https://…" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <fieldset className="space-y-2">
              <legend className="text-xs font-bold">Is this an emergency complaint?</legend>
              <div className="flex gap-5 text-sm">
                {[false, true].map(value => (
                  <label key={String(value)} className="inline-flex items-center gap-2">
                    <input type="radio" name="emergency" checked={emergency === value} onChange={() => setEmergency(value)} />
                    {value ? 'Yes' : 'No'}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block space-y-1.5 text-xs font-bold">
              Detailed Complaint Description *
              <textarea required minLength={10} maxLength={10000} rows={6} value={description} onChange={event => setDescription(event.target.value)} className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <label className="block space-y-1.5 text-xs font-bold">
              Supporting Evidence / Proof (optional link)
              <input type="url" maxLength={2048} value={evidenceReference} onChange={event => setEvidenceReference(event.target.value)} placeholder="https://…" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <button disabled={submitting} type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit complaint'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
