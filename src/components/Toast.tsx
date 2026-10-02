import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-16 md:bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        let bgColor = 'bg-slate-900 text-white dark:bg-slate-800';
        let Icon = Info;

        if (t.type === 'success') {
          bgColor = 'bg-emerald-600 text-white';
          Icon = CheckCircle;
        } else if (t.type === 'error') {
          bgColor = 'bg-rose-600 text-white';
          Icon = AlertCircle;
        }

        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-white/10 pointer-events-auto animate-slide-in ${bgColor}`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="hover:bg-white/20 p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
