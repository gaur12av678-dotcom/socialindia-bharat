export interface TextLinkToken {
  type: 'text' | 'url';
  value: string;
  href?: string;
}

const URL_MATCH_REGEX =
  /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?:[a-zA-Z0-9-]+\.)+(?:com|in|org|net|edu|gov|io|app|co|me|info|biz|dev|ai|tv|cc|ly|gg|us|uk|live|site|online|shop|xyz|tech|web\.app|firebaseapp\.com|youtu\.be)(?:\/[^\s<>"']*)?)/gi;

const TRAILING_PUNCT_REGEX = /[.,!?;:'"\]\}>]+$/;

export function normalizeLinkUrl(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  // Reject whitespace or explicit non-http(s) schemes like javascript:, data:, etc.
  if (/\s/.test(trimmed)) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return '';
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

export function formatLinkHost(url: string): string {
  try {
    const parsed = new URL(normalizeLinkUrl(url) || url);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function splitTrailingPunctuation(rawUrl: string): { clean: string; trailing: string } {
  let clean = rawUrl;
  let trailing = '';

  // Strip unmatched closing parentheses like "(https://example.com)"
  while (clean.endsWith(')')) {
    const openCount = (clean.match(/\(/g) || []).length;
    const closeCount = (clean.match(/\)/g) || []).length;
    if (closeCount > openCount) {
      clean = clean.slice(0, -1);
      trailing = ')' + trailing;
    } else {
      break;
    }
  }

  const match = clean.match(TRAILING_PUNCT_REGEX);
  if (match) {
    clean = clean.slice(0, -match[0].length);
    trailing = match[0] + trailing;
  }

  return { clean, trailing };
}

export function tokenizeTextWithUrls(text: string): TextLinkToken[] {
  if (!text) return [];
  const tokens: TextLinkToken[] = [];
  let lastIndex = 0;

  URL_MATCH_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_MATCH_REGEX.exec(text)) !== null) {
    const matchIndex = match.index;
    const rawMatch = match[0];

    // Skip email addresses or partial word fragments like "foo@gmail.com" or "fooexample.com"
    if (matchIndex > 0) {
      const prevChar = text[matchIndex - 1];
      if (prevChar === '@' || /[a-zA-Z0-9_-]/.test(prevChar)) {
        continue;
      }
    }

    const { clean, trailing } = splitTrailingPunctuation(rawMatch);
    const href = normalizeLinkUrl(clean);
    if (!href) {
      continue;
    }

    if (matchIndex > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, matchIndex) });
    }
    tokens.push({ type: 'url', value: clean, href });
    if (trailing) {
      tokens.push({ type: 'text', value: trailing });
    }
    lastIndex = matchIndex + rawMatch.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
}

export function extractUrlsFromText(text: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const token of tokenizeTextWithUrls(text)) {
    if (token.type === 'url' && token.href && !seen.has(token.href)) {
      seen.add(token.href);
      results.push(token.href);
    }
  }
  return results;
}
