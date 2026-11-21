import React, { useState } from 'react';

const EMOJI_SEQUENCE_REGEX =
  /(?:[\u{1F1E6}-\u{1F1FF}]{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:[\u{1F3FB}-\u{1F3FF}]|\uFE0F|\u200D\p{Extended_Pictographic}(?:[\u{1F3FB}-\u{1F3FF}]|\uFE0F)?)*)/gu;

export function toTwemojiCodePoint(unicodeEmoji: string, stripFe0fAlways = false): string {
  const parts: string[] = [];
  let lead = 0;
  for (let i = 0; i < unicodeEmoji.length; i++) {
    const code = unicodeEmoji.charCodeAt(i);
    if (lead) {
      parts.push((0x10000 + ((lead - 0xd800) << 10) + (code - 0xdc00)).toString(16));
      lead = 0;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      lead = code;
    } else {
      parts.push(code.toString(16));
    }
  }
  const joined = parts.join('-');
  if (stripFe0fAlways || !unicodeEmoji.includes('\u200d')) {
    return joined.replace(/-fe0f/g, '');
  }
  return joined;
}

interface TwemojiImgProps {
  emoji: string;
  className?: string;
  alt?: string;
}

export const TwemojiImg: React.FC<TwemojiImgProps> = ({ emoji, className = 'w-6 h-6', alt }) => {
  const [fallbackStep, setFallbackStep] = useState<0 | 1 | 2 | 3>(0);

  const primaryCode = toTwemojiCodePoint(emoji, false);
  const strippedCode = toTwemojiCodePoint(emoji, true);

  if (fallbackStep === 3) {
    return (
      <span className={`emoji-font inline-flex items-center justify-center leading-none ${className}`}>
        {emoji}
      </span>
    );
  }

  let src = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${primaryCode}.svg`;
  if (fallbackStep === 1) {
    src = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${strippedCode}.svg`;
  } else if (fallbackStep === 2) {
    src = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${strippedCode}.svg`;
  }

  return (
    <img
      src={src}
      alt={alt ?? emoji}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (fallbackStep === 0 && primaryCode !== strippedCode) {
          setFallbackStep(1);
        } else if (fallbackStep < 2) {
          setFallbackStep(2);
        } else {
          setFallbackStep(3);
        }
      }}
    />
  );
};

interface EmojiTextProps {
  text: string;
  emojiClassName?: string;
}

export const EmojiText: React.FC<EmojiTextProps> = ({
  text,
  emojiClassName = 'inline-block w-[1.15em] h-[1.15em] align-[-0.2em] mx-[0.04em]',
}) => {
  if (!text) return null;

  const nodes: React.ReactNode[] = [];
  const regex = new RegExp(EMOJI_SEQUENCE_REGEX.source, 'gu');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const emojiToken = match[0];
    nodes.push(
      <TwemojiImg
        key={`${match.index}-${emojiToken}`}
        emoji={emojiToken}
        className={emojiClassName}
      />
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex === 0) {
    return <>{text}</>;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <>{nodes}</>;
};
