import { useEffect, useRef } from 'react';

export const AdsterraNativeBanner = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl31660368.profitableratecpmnetwork.com/c90b4e17b69c15f7e35856f8a1a9753c/invoke.js';
    
    const container = document.getElementById('container-c90b4e17b69c15f7e35856f8a1a9753c');
    if (container) {
      container.appendChild(script);
      initialized.current = true;
    }
  }, []);

  return <div id="container-c90b4e17b69c15f7e35856f8a1a9753c" className="min-h-[100px] w-full my-4" />;
};
