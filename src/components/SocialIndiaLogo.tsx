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
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7.5 h-7.5 sm:w-8 sm:h-8',
    lg: 'w-9 h-9 sm:w-10 sm:h-10',
    xl: 'w-12 h-12 sm:w-14 sm:h-14'
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
      {/* Official SocialIndia Logo Icon */}
      <img 
        src="/assets/aistudio/android-chrome-512x512_8c57eb18.png"
        alt="SocialIndia"
        className={`${iconSizes[size]} object-contain shrink-0 transition-transform duration-200 group-hover:scale-105 active:scale-95 drop-shadow-xs`}
        draggable={false}
      />

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
