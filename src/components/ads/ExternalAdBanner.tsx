import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { adPlacementService, AdUnit } from '../../services/adPlacementService';

interface ExternalAdBannerProps {
  type?: 'native' | 'iframe' | 'search-box' | 'random';
  locationTag?: string;
  className?: string;
}

export const ExternalAdBanner: React.FC<ExternalAdBannerProps> = ({
  type = 'random',
  locationTag = 'feed',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [unit, setUnit] = useState<AdUnit | null>(null);

  useEffect(() => {
    setUnit(adPlacementService.claimUnit(locationTag));
  }, [locationTag]);

  useEffect(() => {
    if (dismissed || !containerRef.current || !unit) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const adMountDiv = document.createElement('div');
    adMountDiv.className = 'w-full flex justify-center items-center';
    container.appendChild(adMountDiv);

    try {
      if (unit.type === 'native' && unit.invokeSrc) {
        const script = document.createElement('script');
        script.async = true;
        script.dataset.cfasync = 'false';
        script.src = unit.invokeSrc;
        adMountDiv.appendChild(script);
      } else if (unit.atOptionsKey) {
        const optionsScript = document.createElement('script');
        optionsScript.text = `
          window.atOptions = {
            'key' : '${unit.atOptionsKey}',
            'format' : 'iframe',
            'height' : ${unit.height},
            'width' : ${unit.width},
            'params' : {}
          };
        `;
        const invokeScript = document.createElement('script');
        invokeScript.src = `https://www.highrevenueformat.com/${unit.atOptionsKey}/invoke.js`;
        invokeScript.async = true;
        adMountDiv.appendChild(optionsScript);
        adMountDiv.appendChild(invokeScript);
      }
    } catch (err) {
      console.error('Ad load error:', err);
    }

    return () => {
      try {
        if (container && container.contains(adMountDiv)) container.removeChild(adMountDiv);
      } catch {}
    };
  }, [unit, dismissed]);

  if (dismissed || !unit) return null;

  return (
    <div className={`relative group transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Sponsored Ad •{' '}
          <span className="text-slate-500 dark:text-slate-400 capitalize">{locationTag}</span>
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Hide ad"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div ref={containerRef} className="overflow-hidden rounded-xl" />
    </div>
  );
};
