import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface ExternalAdBannerProps {
  type?: 'native' | 'iframe' | 'search-box' | 'random';
  locationTag?: string; // To ensure rotation & tracking
  className?: string;
}

export const ExternalAdBanner: React.FC<ExternalAdBannerProps> = ({
  type = 'random',
  locationTag = 'feed',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [selectedType, setSelectedType] = useState<'native' | 'iframe' | 'search-box'>('native');

  useEffect(() => {
    if (type === 'random') {
      const types: ('native' | 'iframe' | 'search-box')[] = ['native', 'iframe', 'search-box'];
      const randomChoice = types[Math.floor(Math.random() * types.length)];
      setSelectedType(randomChoice);
    } else {
      setSelectedType(type);
    }
  }, [type, locationTag]);

  useEffect(() => {
    if (dismissed || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = ''; // Clear previous

    const adMountDiv = document.createElement('div');
    adMountDiv.className = 'w-full flex justify-center items-center';
    container.appendChild(adMountDiv);

    try {
      if (selectedType === 'native') {
        const script = document.createElement('script');
        script.async = true;
        script.dataset.cfasync = 'false';
        script.src = 'https://pl31660368.profitableratecpmnetwork.com/c90b4e17b69c15f7e35856f8a1a9753c/invoke.js';
        adMountDiv.appendChild(script);
      } else if (selectedType === 'search-box') {
        const optionsScript = document.createElement('script');
        optionsScript.text = `
          window.atOptions = {
            'key' : 'd12213554cad0ca96fec6fe61f0cc604',
            'format' : 'iframe',
            'height' : 250,
            'width' : 300,
            'params' : {}
          };
        `;
        const invokeScript = document.createElement('script');
        invokeScript.src = 'https://www.highrevenueformat.com/d12213554cad0ca96fec6fe61f0cc604/invoke.js';
        invokeScript.async = true;

        adMountDiv.appendChild(optionsScript);
        adMountDiv.appendChild(invokeScript);
      } else {
        const optionsScript = document.createElement('script');
        optionsScript.text = `
          window.atOptions = {
            'key' : '4d5ab16d208e0cc3f4f297c6bd771d7f',
            'format' : 'iframe',
            'height' : 50,
            'width' : 320,
            'params' : {}
          };
        `;
        const invokeScript = document.createElement('script');
        invokeScript.src = 'https://www.highrevenueformat.com/4d5ab16d208e0cc3f4f297c6bd771d7f/invoke.js';
        invokeScript.async = true;

        adMountDiv.appendChild(optionsScript);
        adMountDiv.appendChild(invokeScript);
      }
    } catch (err) {
      console.error('Ad load error:', err);
    }

    return () => {
      try {
        if (container && container.contains(adMountDiv)) {
          container.removeChild(adMountDiv);
        }
      } catch (e) {
        // Ignore DOM errors if ad script relocated elements
      }
    };
  }, [selectedType, dismissed]);

  if (dismissed) return null;

  return (
    <div className={`relative group transition-all duration-300 ${className}`}>
      {/* Ad disclosure header similar to YouTube sponsored / ad badge */}
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Sponsored Ad • <span className="text-slate-500 dark:text-slate-400 capitalize">{locationTag}</span>
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Hide ad"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Ad Target Container */}
      <div ref={containerRef} className="w-full flex justify-center items-center min-h-[50px] bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden p-2">
        {/* Managed via ref */}
      </div>
    </div>
  );
};


