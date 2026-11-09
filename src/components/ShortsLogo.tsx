import React, { useState } from 'react';

interface ShortsLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
  style?: React.CSSProperties;
  fill?: string;
  playFill?: string;
}

/**
 * Official SocialIndia Shorts Logo (Custom Blue Lightning Bolt)
 * Uses the user's uploaded brand asset: /assets/aistudio/shorts_logo_a9901a0d.PNG
 * with clean transparent background and crisp vector rendering.
 */
export const ShortsLogo: React.FC<ShortsLogoProps> = ({
  className = 'w-7 h-7',
  size,
  alt = 'SocialIndia Shorts',
  style,
}) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={`shrink-0 select-none ${className}`}
        style={style}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-label={alt}
      >
        <path
          d="M13.5 2.5L5 13H12.5L10.5 21.5L19 11H11.5L13.5 2.5Z"
          fill="#2563EB"
          stroke="#2563EB"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <img
      src="/assets/aistudio/shorts_logo_a9901a0d.PNG"
      alt={alt}
      width={size}
      height={size}
      className={`object-contain shrink-0 select-none ${className}`}
      draggable={false}
      onError={() => setImageError(true)}
      style={{
        filter: 'drop-shadow(0 1px 2px rgba(37, 99, 235, 0.25))',
        ...style
      }}
    />
  );
};
