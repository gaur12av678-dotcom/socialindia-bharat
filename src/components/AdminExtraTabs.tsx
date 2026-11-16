import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CreditCard,
  Trash2
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { WithdrawalRequest } from '../types';

interface ExtraTabsProps {
  activeSection: string;
  users: any[];
  withdrawalRequests?: WithdrawalRequest[];
  onApproveWithdrawal?: (req: WithdrawalRequest) => void;
  onRejectWithdrawal?: (req: WithdrawalRequest) => void;
  onDeleteWithdrawal?: (req: WithdrawalRequest) => void;
  onNavigateSection?: (section: any) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminExtraTabs: React.FC<ExtraTabsProps> = ({
  activeSection,
  users,
  withdrawalRequests = [],
  onApproveWithdrawal,
  onRejectWithdrawal,
  onDeleteWithdrawal,
  onNavigateSection,
  addToast
}) => {
  const [payPerView, setPayPerView] = useState('0.50');
  const [goproPrice, setGoProPrice] = useState('199.00');
  const [payoutUpiVpa, setPayoutUpiVpa] = useState('finance@socialindia.upi');
  const [isSavingMonetization, setIsSavingMonetization] = useState(false);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');

  useEffect(() => {
    adminService.getMonetizationConfig().then(config => {
      if (config) {
        setPayPerView(config.payPerView);
        setGoProPrice(config.goproPrice);
        setPayoutUpiVpa(config.payoutUpiVpa);
      }
    }).catch(() => {});
  }, []);

  if (activeSection !== 'payments_ads') return null;

  const filteredWithdrawals = withdrawalRequests.filter(request =>
    withdrawalFilter === 'all' || request.status === withdrawalFilter
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Registered users</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{users.length}</p>
          <p className="mt-1 text-xs text-slate-500">Database profiles</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Creator balances</p>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{users.reduce((total, user) => total + (Number(user.mainBalance ?? user.walletBalance) || 0), 0).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Across creator accounts</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pending payouts</p>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            ₹{withdrawalRequests.filter(request => request.status === 'pending').reduce((total, request) => total + (request.amount || 0), 0).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {withdrawalRequests.filter(request => request.status === 'pending').length} request(s) awaiting review
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Settled payouts</p>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{withdrawalRequests.filter(request => request.status === 'completed').reduce((total, request) => total + (request.amount || 0), 0).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {withdrawalRequests.filter(request => request.status === 'completed').length} completed
          </p>
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div>
          <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Monetization configuration
          </h3>
          <p className="mt-1 text-sm text-slate-500">Stored in Firestore and used by the platform.</p>
        </div>

        <form
          onSubmit={async event => {
            event.preventDefault();
            setIsSavingMonetization(true);
            try {
              await adminService.saveMonetizationConfig({
                payPerView: payPerView.trim() || '0.50',
                goproPrice: goproPrice.trim() || '199.00',
                payoutUpiVpa: payoutUpiVpa.trim() || 'finance@socialindia.upi'
              });
              addToast('Platform monetization rates saved to database!', 'success');
            } catch (error: any) {
              addToast(`Failed to save settings: ${error.message}`, 'error');
            } finally {
              setIsSavingMonetization(false);
            }
          }}
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span>Ad cost per view (₹ INR)</span>
            <input
              type="text"
              value={payPerView}
              onChange={event => setPayPerView(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span>GoPro upgrade (₹ INR)</span>
            <input
              type="text"
              value={goproPrice}
              onChange={event => setGoProPrice(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span>UPI merchant settlement VPA</span>
            <input
              type="text"
              value={payoutUpiVpa}
              onChange={event => setPayoutUpiVpa(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isSavingMonetization}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSavingMonetization ? 'Saving…' : 'Save monetization settings'}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Creator payout requests</h3>
            <p className="mt-1 text-sm text-slate-500">Review live creator requests and their settlement status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {(['all', 'pending', 'completed', 'rejected'] as const).map(status => (
                <button
                  type="button"
                  key={status}
                  onClick={() => setWithdrawalFilter(status)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold capitalize ${
                    withdrawalFilter === status
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            {onNavigateSection && (
              <button
                type="button"
                onClick={() => onNavigateSection('withdrawals')}
                className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Full queue <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredWithdrawals.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No payout requests in this status.</p>
          ) : filteredWithdrawals.map(request => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {request.displayName} <span className="font-normal text-slate-500">(@{request.username})</span>
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    request.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : request.status === 'rejected'
                        ? 'bg-rose-100 text-[#800080] dark:bg-rose-950 dark:text-[#800080]'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {request.status === 'completed' ? 'Paid' : request.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  UPI: <strong className="select-all text-slate-700 dark:text-slate-300">{request.upiId}</strong>
                  {' · '}{new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                  ₹{request.amount.toFixed(2)}
                </span>
                {request.status === 'pending' && onApproveWithdrawal && (
                  <button
                    type="button"
                    onClick={() => onApproveWithdrawal(request)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                {request.status === 'pending' && onRejectWithdrawal && (
                  <button
                    type="button"
                    onClick={() => onRejectWithdrawal(request)}
                    className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-[#800080] hover:bg-rose-100 dark:bg-rose-950 dark:text-[#800080]"
                  >
                    Reject
                  </button>
                )}
                {onDeleteWithdrawal && (
                  <button
                    type="button"
                    onClick={() => onDeleteWithdrawal(request)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-[#800080] dark:hover:bg-rose-950"
                    title="Delete payout request"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
