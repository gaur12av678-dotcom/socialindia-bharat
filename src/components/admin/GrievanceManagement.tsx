import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  grievanceService,
  GRIEVANCE_CATEGORIES,
  GrievanceHistoryEntry,
  GrievanceStatus,
  GrievanceSubmission,
} from '../../services/grievanceService';

const STATUSES: GrievanceStatus[] = ['new', 'pending', 'under_review', 'action_taken', 'resolved', 'rejected'];

const statusLabel = (status: GrievanceStatus) => ({
  new: 'New',
  pending: 'Pending',
  under_review: 'Under Review',
  action_taken: 'Action Taken',
  resolved: 'Resolved',
  rejected: 'Rejected',
}[status]);

const formatDate = (value: unknown) => {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString();
  }
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export const GrievanceManagement: React.FC = () => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const [complaints, setComplaints] = useState<GrievanceSubmission[]>([]);
  const [selected, setSelected] = useState<GrievanceSubmission | null>(null);
  const [history, setHistory] = useState<GrievanceHistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const result = await grievanceService.getAll();
      setComplaints(result);
      setSelected(current => current ? result.find(item => item.id === current.id) || null : null);
    } catch (error) {
      console.error('Could not load grievances:', error);
      addToast('Unable to load grievance records. Check administrator access.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserProfile?.role === 'admin') void loadComplaints();
  }, [currentUserProfile?.role]);

  useEffect(() => {
    if (!selected) {
      setHistory([]);
      setNotes('');
      setResolution('');
      return;
    }
    setNotes(selected.adminNotes || '');
    setResolution(selected.resolutionDetails || '');
    grievanceService.getHistory(selected.id)
      .then(setHistory)
      .catch(error => {
        console.error('Could not load grievance history:', error);
        addToast('Unable to load complaint history.', 'error');
      });
  }, [selected?.id]);

  const filtered = useMemo(() => complaints.filter(item => {
    const matchesText = !search || item.trackingId.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesText && matchesStatus && matchesCategory;
  }), [complaints, search, statusFilter, categoryFilter]);

  const updateComplaint = async (changes: { status?: GrievanceStatus; adminNotes?: string; resolutionDetails?: string }) => {
    if (!selected || !currentUser || currentUserProfile?.role !== 'admin') {
      addToast('Administrator access is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await grievanceService.update(selected.trackingId, selected.id, currentUser.uid, changes, selected.status);
      const updated = { ...selected, ...changes };
      setSelected(updated);
      addToast('Complaint updated.', 'success');
      try {
        const [refreshedComplaints, refreshedHistory] = await Promise.all([
          grievanceService.getAll(),
          grievanceService.getHistory(selected.id),
        ]);
        setComplaints(refreshedComplaints);
        setSelected(refreshedComplaints.find(item => item.id === selected.id) || updated);
        setHistory(refreshedHistory);
      } catch (refreshError) {
        console.error('Complaint saved but refresh failed:', refreshError);
        addToast('Complaint was saved, but its latest details could not be refreshed.', 'error');
      }
    } catch (error) {
      console.error('Could not update grievance:', error);
      addToast('Complaint update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (currentUserProfile?.role !== 'admin') {
    return <p className="rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">Administrator access is required to view grievances.</p>;
  }

  const count = (status: GrievanceStatus) => complaints.filter(item => item.status === status).length;
  const urgentCount = complaints.filter(item => item.emergency && !['resolved', 'rejected'].includes(item.status)).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['New Complaints', count('new')],
          ['Pending', count('pending')],
          ['Under Review', count('under_review')],
          ['Urgent Reports', urgentCount],
          ['Resolved', count('resolved')],
          ['Rejected', count('rejected')],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121215]">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.9fr)_minmax(420px,1.3fr)]">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121215]">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search by tracking ID" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tracking ID" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-900" />
            </div>
            <button type="button" onClick={() => void loadComplaints()} disabled={loading} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700" aria-label="Refresh complaints">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
              <option value="all">All statuses</option>
              {STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <select aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
              <option value="all">All categories</option>
              {GRIEVANCE_CATEGORIES.map(category => <option key={category}>{category}</option>)}
            </select>
          </div>
          <div className="max-h-[620px] space-y-2 overflow-y-auto">
            {loading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : filtered.map(item => (
              <button key={item.id} onClick={() => setSelected(item)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === item.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[11px] font-black">{item.trackingId}</span>
                  {item.emergency && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" aria-label="Emergency complaint" />}
                </div>
                <p className="mt-1 truncate text-xs font-bold">{item.category}</p>
                <p className="mt-1 text-[10px] text-slate-500">{statusLabel(item.status)} · {formatDate(item.submittedAt)}</p>
              </button>
            ))}
            {!loading && filtered.length === 0 && <p className="p-6 text-center text-xs text-slate-500">No complaints match these filters.</p>}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121215]">
          {!selected ? (
            <p className="py-16 text-center text-sm text-slate-500">Select a complaint to view its details.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-mono text-sm font-black">{selected.trackingId}</h3>
                  <p className="mt-1 text-xs text-slate-500">Submitted {formatDate(selected.submittedAt)} · Updated {formatDate(selected.updatedAt)}</p>
                </div>
                {selected.emergency && <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Emergency</span>}
              </div>

              <dl className="grid gap-3 text-xs sm:grid-cols-2">
                <div><dt className="font-bold text-slate-500">Complainant</dt><dd className="mt-1 break-words">{selected.complainantName}</dd></div>
                <div><dt className="font-bold text-slate-500">Email</dt><dd className="mt-1 break-words">{selected.email}</dd></div>
                <div className="sm:col-span-2"><dt className="font-bold text-slate-500">Category</dt><dd className="mt-1">{selected.category}</dd></div>
                <div className="sm:col-span-2"><dt className="font-bold text-slate-500">Description</dt><dd className="mt-1 whitespace-pre-wrap break-words">{selected.description}</dd></div>
                {selected.targetUrl && <div className="sm:col-span-2"><dt className="font-bold text-slate-500">Target URL</dt><dd className="mt-1 break-all"><a href={selected.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{selected.targetUrl}</a></dd></div>}
                {selected.evidenceReference && <div className="sm:col-span-2"><dt className="font-bold text-slate-500">Evidence reference</dt><dd className="mt-1 break-all"><a href={selected.evidenceReference} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{selected.evidenceReference}</a></dd></div>}
              </dl>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-bold">Status
                  <select value={selected.status} onChange={event => void updateComplaint({ status: event.target.value as GrievanceStatus })} disabled={saving} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                    {STATUSES.filter(status => status !== 'new').map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </select>
                </label>
                <div className="flex items-end">
                  <button disabled={saving} onClick={() => void updateComplaint({ adminNotes: notes, resolutionDetails: resolution })} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Save private notes
                  </button>
                </div>
              </div>
              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent(`SocialIndia complaint ${selected.trackingId}`)}&body=${encodeURIComponent(`Hello ${selected.complainantName},\n\nRegarding complaint ${selected.trackingId} (${selected.category}):\n\n${resolution.trim() || 'Please contact us if you need to provide further information.'}\n\nSocialIndia Grievance & Support Team\nsocialindia.ib@gmail.com`)}`}
                className="inline-flex rounded-xl border border-blue-200 px-4 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
              >
                Compose email response
              </a>
              <p className="text-[10px] text-slate-500">This opens your email application; it does not send an email automatically.</p>
              <label className="block space-y-1 text-xs font-bold">Private internal notes
                <textarea rows={3} maxLength={5000} value={notes} onChange={event => setNotes(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="block space-y-1 text-xs font-bold">Resolution details
                <textarea rows={3} maxLength={5000} value={resolution} onChange={event => setResolution(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" />
              </label>

              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wide">Complaint history</h4>
                <div className="mt-3 space-y-2">
                  {history.map(entry => (
                    <div key={entry.id} className="rounded-xl bg-slate-50 p-3 text-[11px] dark:bg-slate-900">
                      <p className="font-bold">{entry.action === 'status_updated' ? `${statusLabel(entry.fromStatus || 'new')} → ${statusLabel(entry.toStatus || 'new')}` : 'Private notes updated'}</p>
                      {entry.notes && <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{entry.notes}</p>}
                      {entry.resolutionDetails && <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">Resolution: {entry.resolutionDetails}</p>}
                      <p className="mt-1 text-slate-500">{formatDate(entry.createdAt)} · Admin {entry.adminUid}</p>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-xs text-slate-500">No admin actions recorded.</p>}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
