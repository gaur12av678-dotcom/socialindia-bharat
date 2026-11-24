import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  Send,
  Share2,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../i18n';

export const OPEN_SHARE_MODAL_EVENT = 'socialindia:open-share-modal';

export interface ShareModalPayload {
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  startTimeSeconds?: number;
  mediaType?: 'video' | 'clip' | 'channel' | 'playlist' | 'post';
}

export function openShareModal(payload: ShareModalPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ShareModalPayload>(OPEN_SHARE_MODAL_EVENT, { detail: payload }));
}

function formatTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function appendTimeParam(rawUrl: string, seconds: number): string {
  if (!seconds || seconds <= 0) return rawUrl;
  const cleanSec = Math.floor(seconds);
  const hashIdx = rawUrl.indexOf('#');
  if (hashIdx >= 0) {
    const base = rawUrl.slice(0, hashIdx);
    const hash = rawUrl.slice(hashIdx);
    const qIdx = hash.indexOf('?');
    if (qIdx >= 0) {
      const hashPath = hash.slice(0, qIdx);
      const params = new URLSearchParams(hash.slice(qIdx + 1));
      params.set('t', String(cleanSec));
      return `${base}${hashPath}?${params.toString()}`;
    }
    return `${base}${hash}?t=${cleanSec}`;
  }
  try {
    const u = new URL(rawUrl);
    u.searchParams.set('t', String(cleanSec));
    return u.toString();
  } catch {
    const sep = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${sep}t=${cleanSec}`;
  }
}

export const ShareModal: React.FC = () => {
  const { addToast } = useApp();
  const { isHindi } = useTranslation();
  const [payload, setPayload] = useState<ShareModalPayload | null>(null);
  const [includeStartTime, setIncludeStartTime] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent<ShareModalPayload>).detail;
      if (!detail?.url) return;
      setPayload(detail);
      setIncludeStartTime(false);
      setCopied(false);
    };
    window.addEventListener(OPEN_SHARE_MODAL_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_SHARE_MODAL_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!payload) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPayload(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [payload]);

  const startSeconds = useMemo(() => {
    const raw = Number(payload?.startTimeSeconds || 0);
    return Number.isFinite(raw) && raw >= 5 ? Math.floor(raw) : 0;
  }, [payload?.startTimeSeconds]);

  const finalUrl = useMemo(() => {
    if (!payload?.url) return '';
    return includeStartTime && startSeconds > 0
      ? appendTimeParam(payload.url, startSeconds)
      : payload.url;
  }, [payload?.url, includeStartTime, startSeconds]);

  if (!payload) return null;

  const shareTitle = (payload.title || 'SocialIndia').trim();
  const shareText = payload.description
    ? `${shareTitle} — ${payload.description.slice(0, 100)}`
    : shareTitle;

  const handleCopyLink = async () => {
    if (!finalUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(finalUrl);
      } else if (inputRef.current) {
        inputRef.current.select();
        document.execCommand('copy');
      }
      setCopied(true);
      addToast(isHindi ? 'लिंक क्लिपबोर्ड पर कॉपी हो गया!' : 'Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      if (inputRef.current) {
        inputRef.current.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          addToast(isHindi ? 'लिंक क्लिपबोर्ड पर कॉपी हो गया!' : 'Link copied to clipboard!', 'success');
          setTimeout(() => setCopied(false), 2200);
        } catch {
          addToast(isHindi ? 'लिंक कॉपी नहीं हो सका।' : 'Could not copy link.', 'error');
        }
      }
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: finalUrl,
      });
    } catch {
      // User cancelled native share sheet
    }
  };

  const encodedUrl = encodeURIComponent(finalUrl);
  const encodedText = encodeURIComponent(`${shareTitle} ${finalUrl}`);
  const encodedTitle = encodeURIComponent(shareTitle);

  const shareTargets = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedText}`,
      bgClass: 'bg-[#25D366] text-white',
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      bgClass: 'bg-[#229ED9] text-white',
      icon: <Send className="w-5 h-5" />,
    },
    {
      id: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      bgClass: 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900',
      icon: <span className="text-base font-black leading-none">𝕏</span>,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bgClass: 'bg-[#1877F2] text-white',
      icon: <span className="text-lg font-black leading-none">f</span>,
    },
    {
      id: 'email',
      label: isHindi ? 'ईमेल' : 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${shareTitle}\n\n${finalUrl}`)}`,
      bgClass: 'bg-slate-600 text-white',
      icon: <Mail className="w-5 h-5" />,
    },
  ];

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={() => setPayload(null)}
      role="dialog"
      aria-modal="true"
      aria-label={isHindi ? 'शेयर करें' : 'Share'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[460px] bg-white dark:bg-[#212121] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-white animate-zoom-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-white/10">
          <h3 className="text-base font-extrabold tracking-tight">
            {isHindi ? 'शेयर करें' : 'Share'}
          </h3>
          <button
            type="button"
            onClick={() => setPayload(null)}
            className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={isHindi ? 'बंद करें' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Compact Title / Preview Strip */}
          {shareTitle && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
              {payload.thumbnailUrl ? (
                <img
                  src={payload.thumbnailUrl}
                  alt={shareTitle}
                  className="w-14 h-9 rounded-lg object-cover shrink-0 bg-slate-200 dark:bg-slate-800"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4" />
                </div>
              )}
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                {shareTitle}
              </p>
            </div>
          )}

          {/* YouTube-style Horizontal Circular Share Targets */}
          <div className="flex items-start gap-4 overflow-x-auto pb-1 scrollbar-none">
            {shareTargets.map((target) => (
              <a
                key={target.id}
                href={target.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 shrink-0 w-14 group cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${target.bgClass}`}>
                  {target.icon}
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center truncate w-full">
                  {target.label}
                </span>
              </a>
            ))}

            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-1.5 shrink-0 w-14 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform border border-slate-200 dark:border-white/15">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center truncate w-full">
                  {isHindi ? 'अन्य' : 'More'}
                </span>
              </button>
            )}
          </div>

          {/* Copy Link Input + Pill Button (YouTube Style) */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-white/15 rounded-xl p-1.5 pl-3">
            <input
              ref={inputRef}
              type="text"
              readOnly
              value={finalUrl}
              onClick={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none truncate select-all"
              aria-label={isHindi ? 'शेयर लिंक' : 'Share URL'}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#065fd4] hover:bg-[#054fb1] text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isHindi ? 'कॉपी हो गया' : 'Copied') : (isHindi ? 'कॉपी करें' : 'Copy')}</span>
            </button>
          </div>

          {/* YouTube-style "Start at" Checkbox for Watch Videos */}
          {payload.mediaType === 'video' && startSeconds > 0 && (
            <label className="flex items-center gap-2.5 pt-1 border-t border-slate-100 dark:border-white/10 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeStartTime}
                onChange={(e) => {
                  setIncludeStartTime(e.target.checked);
                  setCopied(false);
                }}
                className="w-4 h-4 rounded border-slate-300 text-[#065fd4] focus:ring-[#065fd4] cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isHindi
                  ? `${formatTimestamp(startSeconds)} से शुरू करें`
                  : `Start at ${formatTimestamp(startSeconds)}`}
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
};
