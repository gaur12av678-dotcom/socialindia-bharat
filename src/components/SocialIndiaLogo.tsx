import React from 'react';

interface SocialIndiaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  onClick?: () => void;
  forceWhiteText?: boolean;
}

export const SocialIndiaLogo: React.FC<SocialIndiaLogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = true,
  onClick,
  forceWhiteText = false
}) => {
  const containerSizes = {
    sm: 'w-[25px] h-[18px] rounded-[5px]',
    md: 'w-[32px] h-[22px] rounded-[7px]',
    lg: 'w-[40px] h-[28px] rounded-[9px]',
    xl: 'w-[56px] h-[38px] rounded-[12px]'
  };

  const playIconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4.5 h-4.5',
    xl: 'w-6 h-6'
  };

  const textSizes = {
    sm: 'text-base font-extrabold',
    md: 'text-[19px] sm:text-[20px] font-extrabold',
    lg: 'text-2xl font-extrabold',
    xl: 'text-4xl font-extrabold'
  };

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-2 select-none group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Royal Blue YouTube-style rounded rectangle with crisp white play button */}
      <div className={`${containerSizes[size]} bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-xs`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="#ffffff" 
          className={`${playIconSizes[size]}`}
          style={{ fill: '#ffffff', color: '#ffffff' }}
        >
          <path d="M9.5 7.5L16.5 12L9.5 16.5V7.5Z" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <span 
          className={`tracking-tight ${textSizes[size]} flex items-center leading-none select-none`}
        >
          <span 
            style={{ color: forceWhiteText ? '#ffffff' : undefined }}
            className={forceWhiteText ? 'text-white' : 'text-slate-900 dark:text-white'}
          >
            Social
          </span>
          <span 
            style={{ color: forceWhiteText ? '#93C5FD' : undefined }}
            className={forceWhiteText ? 'text-[#93C5FD]' : 'text-[#2563EB] dark:text-[#3b82f6]'}
          >
            India
          </span>
        </span>
      )}
    </div>
  );
};
