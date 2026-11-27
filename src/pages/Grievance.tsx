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
      addToast(
        isHindi
          ? 'कृपया मान्य http या https लिंक दर्ज करें, या इस फ़ील्ड को खाली छोड़ दें।'
          : 'Enter a valid http or https URL, or leave the field blank.',
        'error'
      );
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
      addToast(isHindi ? 'आपकी शिकायत दर्ज कर ली गई है।' : 'Your complaint was submitted.', 'success');
    } catch (error) {
      console.error('Grievance submission failed:', error);
      addToast(
        isHindi
          ? 'आपकी शिकायत दर्ज नहीं हो सकी। कृपया पुनः प्रयास करें या socialindia.ib@gmail.com पर ईमेल करें।'
          : 'Could not submit your complaint. Please try again or email socialindia.ib@gmail.com.',
        'error'
      );
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
            {isHindi ? 'सोशलइंडिया शिकायत एवं सहायता टीम' : 'SocialIndia Grievance & Support Team'}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            {isHindi ? 'शिकायत निवारण एवं सहायता' : 'Grievance Redressal & Support'}
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {isHindi
              ? 'सामग्री, गोपनीयता, सुरक्षा, प्रतिरूपण या खाते से संबंधित शिकायत दर्ज करें। कृपया पासवर्ड या संवेदनशील पहचान दस्तावेज़ शामिल न करें। प्रमाण के लिए आप लिंक साझा कर सकते हैं; यहाँ फ़ाइल अपलोड स्वीकार नहीं किया जाता।'
              : 'Submit a complaint about content, privacy, safety, impersonation, or an account. Do not include passwords or sensitive identity documents. Supporting evidence can be a link you control; file uploads are not accepted here.'}
          </p>
          <a href="mailto:socialindia.ib@gmail.com" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300 hover:underline">
            <Mail className="w-4 h-4" />
            socialindia.ib@gmail.com
          </a>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isHindi
              ? 'शिकायत दर्ज करने के बाद दिखने वाली ट्रैकिंग आईडी को संभालकर रखें। स्वचालित ईमेल रसीद अभी सक्रिय नहीं है।'
              : 'This submission channel does not itself establish that statutory requirements have been met. Statutory officer details will be published only after a genuine appointment. Automatic email acknowledgements are not currently configured; keep the tracking ID shown after submission.'}
          </p>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {isHindi
              ? 'सूचना प्रौद्योगिकी (मध्यवर्ती दिशानिर्देश और डिजिटल मीडिया आचार संहिता) नियम, 2021 के नियम 3(2)(b) के तहत आने वाली आपात शिकायतों पर लागू नियम के अनुसार 24 घंटे के भीतर उचित कार्रवाई की जाती है। सामान्य शिकायतें और कॉपीराइट नोटिस उनके लागू नियमों के अंतर्गत जांचे जाते हैं।'
              : 'Some complaints concerning covered intimate imagery or electronic impersonation may fall under Rule 3(2)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, as amended, which provides for reasonable and practicable measures within 24 hours when that Rule applies. Ordinary grievances, copyright notices, and other legally required takedown requests are distinct and are assessed under their applicable requirements. Selecting “emergency” requests urgent review but does not determine the legal classification or guarantee a particular outcome or timeline.'}
          </p>
        </header>

        {trackingId ? (
          <section aria-live="polite" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <h2 className="text-lg font-black text-emerald-800 dark:text-emerald-300">
              {isHindi ? 'शिकायत दर्ज हो गई' : 'Complaint submitted'}
            </h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {isHindi ? 'फॉलो-अप के लिए यह ट्रैकिंग आईडी सहेजें:' : 'Save this tracking ID for any follow-up:'}
            </p>
            <p className="mt-2 font-mono text-lg font-black text-emerald-800 dark:text-emerald-300">{trackingId}</p>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              {isHindi
                ? 'कोई ईमेल रसीद नहीं भेजी गई है। सहायता के लिए ट्रैकिंग आईडी के साथ socialindia.ib@gmail.com पर ईमेल करें।'
                : 'No acknowledgement email has been sent. For assistance, email socialindia.ib@gmail.com and include the tracking ID.'}
            </p>
            <button onClick={() => setTrackingId('')} className="mt-4 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300 cursor-pointer">
              {isHindi ? 'एक और शिकायत दर्ज करें' : 'Submit another complaint'}
            </button>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-8 dark:border-slate-800 dark:bg-[#161616]">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold">
                {isHindi ? 'शिकायतकर्ता का पूरा नाम *' : 'Complainant Full Name *'}
                <input required maxLength={120} value={name} onChange={event => setName(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="space-y-1.5 text-xs font-bold">
                {isHindi ? 'शिकायतकर्ता का ईमेल पता *' : 'Complainant Email Address *'}
                <input required type="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
              </label>
            </div>

            <label className="block space-y-1.5 text-xs font-bold">
              {isHindi ? 'शिकायत की श्रेणी *' : 'Complaint Category *'}
              <select required value={category} onChange={event => setCategory(event.target.value as GrievanceCategory)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                {GRIEVANCE_CATEGORIES.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>

            <label className="block space-y-1.5 text-xs font-bold">
              {isHindi ? 'संबंधित वीडियो / पोस्ट / प्रोफ़ाइल लिंक' : 'Target Video / Post / Profile URL'}
              <input type="url" maxLength={2048} value={targetUrl} onChange={event => setTargetUrl(event.target.value)} placeholder="https://…" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <fieldset className="space-y-2">
              <legend className="text-xs font-bold">
                {isHindi ? 'क्या यह एक आपातकालीन शिकायत है?' : 'Is this an emergency complaint?'}
              </legend>
              <div className="flex gap-5 text-sm">
                {[false, true].map(value => (
                  <label key={String(value)} className="inline-flex items-center gap-2">
                    <input type="radio" name="emergency" checked={emergency === value} onChange={() => setEmergency(value)} />
                    {value ? (isHindi ? 'हाँ' : 'Yes') : (isHindi ? 'नहीं' : 'No')}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block space-y-1.5 text-xs font-bold">
              {isHindi ? 'शिकायत का विस्तृत विवरण *' : 'Detailed Complaint Description *'}
              <textarea required minLength={10} maxLength={10000} rows={6} value={description} onChange={event => setDescription(event.target.value)} className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <label className="block space-y-1.5 text-xs font-bold">
              {isHindi ? 'सहायक प्रमाण / सबूत (वैकल्पिक लिंक)' : 'Supporting Evidence / Proof (optional link)'}
              <input type="url" maxLength={2048} value={evidenceReference} onChange={event => setEvidenceReference(event.target.value)} placeholder="https://…" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <button disabled={submitting} type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? (isHindi ? 'सबमिट हो रहा है…' : 'Submitting…') : (isHindi ? 'शिकायत दर्ज करें' : 'Submit complaint')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
