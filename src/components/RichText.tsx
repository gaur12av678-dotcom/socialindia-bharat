import React from 'react';
import { useRouter } from '../hooks/useRouter';

interface RichTextProps {
  text: string;
  className?: string;
  onTimestampClick?: (seconds: number) => void;
}

export function parseTimestampToSeconds(str: string): number {
  const parts = str.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export const RichText: React.FC<RichTextProps> = ({ text, className = '', onTimestampClick }) => {
  const { navigate } = useRouter();

  if (!text) return null;

  return (
    <span className={className}>
      {text.split(/\n/).map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {line.split(/(https?:\/\/[^\s]+|www\.[^\s]+|#[a-zA-Z0-9_\u0900-\u097F]+|\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b)/g).map((part, partIdx) => {
            if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('www.')) {
              const href = part.startsWith('www.') ? `https://${part}` : part;
              return (
                <a
                  key={partIdx}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#0070f3] dark:text-[#00d2ff] hover:text-[#005cd6] dark:hover:text-[#67e8f9] hover:underline font-semibold break-all inline transition-colors"
                >
                  {part}
                </a>
              );
            }
            if (part.startsWith('#')) {
              return (
                <span
                  key={partIdx}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('search', undefined, { q: part });
                  }}
                  className="text-[#0070f3] dark:text-[#00d2ff] hover:text-[#005cd6] dark:hover:text-[#67e8f9] hover:underline font-bold cursor-pointer inline transition-colors"
                >
                  {part}
                </span>
              );
            }
            // Check for timestamp format (e.g., 01:23 or 1:02:45)
            if (/^\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b$/.test(part)) {
              return (
                <span
                  key={partIdx}
                  onClick={(e) => {
                    e.stopPropagation();
                    const seconds = parseTimestampToSeconds(part);
                    onTimestampClick?.(seconds);
                  }}
                  className="text-[#0070f3] dark:text-[#00d2ff] hover:underline font-black cursor-pointer inline bg-blue-50/90 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md text-xs border border-blue-200/60 dark:border-blue-800/50 mx-0.5 shadow-2xs transition-colors"
                  title={`Jump to ${part}`}
                >
                  {part}
                </span>
              );
            }
            return part;
          })}
        </React.Fragment>
      ))}
    </span>
  );
};
