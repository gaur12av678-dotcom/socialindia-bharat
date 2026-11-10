import React from 'react';

interface ShortsLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
  style?: React.CSSProperties;
  fill?: string;
  playFill?: string;
}

/**
 * Official SocialIndia Shorts / Clips Logo (Crisp Vector Lightning Bolt)
 * Uses a resolution-independent inline SVG so it stays razor-sharp at every size.
 */
export const ShortsLogo: React.FC<ShortsLogoProps> = ({
  className = 'w-7 h-7',
  size,
  alt = 'SocialIndia Clips',
  style,
  fill = '#235DE5',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      role="img"
      aria-label={alt}
    >
      <path
        d="M13.8 2.2L4.2 13.4H11.4L10.2 21.8L19.8 10.6H12.6L13.8 2.2Z"
        fill={fill}
        stroke={fill}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};
