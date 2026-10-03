import React from 'react';
import { useRouter } from '../hooks/useRouter';

interface RichTextProps {
  text: string;
  className?: string;
}

export const RichText: React.FC<RichTextProps> = ({ text, className = '' }) => {
  const { navigate } = useRouter();

  if (!text) return null;

  return (
    <span className={className}>
      {text.split(/\n/).map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {line.split(/(https?:\/\/[^\s]+|www\.[^\s]+|#[a-zA-Z0-9_\u0900-\u097F]+)/g).map((part, partIdx) => {
            if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('www.')) {
              const href = part.startsWith('www.') ? `https://${part}` : part;
              return (
                <a
                  key={partIdx}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold break-all inline"
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
                  className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer inline"
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
