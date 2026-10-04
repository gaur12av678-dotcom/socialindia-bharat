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
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-2xl',
    xl: 'w-16 h-16 rounded-3xl'
  };

  const playIconSizes = {
    sm: 'w-3 h-3 ml-0.5',
    md: 'w-4 h-4 ml-0.5',
    lg: 'w-5 h-5 ml-0.5',
    xl: 'w-7 h-7 ml-1'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Royal Blue rounded box with crisp white play button matching logo.PNG */}
      <div className={`${containerSizes[size]} bg-[#2563eb] text-white flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0 border border-white/20 transition-transform active:scale-95`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className={`${playIconSizes[size]} text-white`}
        >
          <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86a1 1 0 00-1.5.86z" />
        </svg>
      </div>

      {showText && (
        <span className={`font-extrabold tracking-tight ${textSizes[size]} ${forceWhiteText ? 'text-white' : 'text-slate-900 dark:text-white'} flex items-center`}>
          Social<span className={forceWhiteText ? 'text-blue-300' : 'text-[#2563eb] dark:text-[#3b82f6]'}>India</span>
        </span>
      )}
    </div>
  );
};
