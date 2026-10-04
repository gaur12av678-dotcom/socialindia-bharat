import { useEffect, useRef } from 'react';

export const AdsterraSocialBar = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    
    const script = document.createElement('script');
    script.src = 'https://pl31660370.profitableratecpmnetwork.com/1a/c3/4e/1ac34e07e7de3159c58561f973bf0071.js';
    script.async = true;
    
    document.body.appendChild(script);
    initialized.current = true;
    
    return () => {
      // In case of unmount, optionally clean up, but Social Bar is often persistent.
    };
  }, []);

  return null;
};
