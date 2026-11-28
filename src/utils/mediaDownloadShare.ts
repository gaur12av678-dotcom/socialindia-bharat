export type ChatMediaKind = 'image' | 'video';

interface SocialIndiaAndroidBridge {
  downloadFile?: (url: string, filename?: string) => void;
  downloadMedia?: (url: string, filename?: string, mediaType?: string) => void;
  shareMedia?: (url: string, text?: string, mediaType?: string) => void;
  shareText?: (text: string, url?: string) => void;
}

function getAndroidBridge(): SocialIndiaAndroidBridge | null {
  if (typeof window === 'undefined') return null;
  return ((window as unknown as { SocialIndiaAndroid?: SocialIndiaAndroidBridge }).SocialIndiaAndroid) || null;
}

export function isAndroidApkWebView(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (getAndroidBridge()) return true;
  const ua = navigator.userAgent || '';
  return /Android/i.test(ua) && /;\s*wv\b|Version\/\d+\.\d+/i.test(ua);
}

export function inferMediaExtension(url: string, mediaType: ChatMediaKind): string {
  try {
    const clean = url.split('?')[0].split('#')[0].toLowerCase();
    const match = clean.match(/\.([a-z0-9]{2,5})$/);
    if (match && match[1]) {
      const ext = match[1];
      if (mediaType === 'image' && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)) {
        return ext;
      }
      if (mediaType === 'video' && ['mp4', 'webm', 'mov', 'm4v', 'mkv'].includes(ext)) {
        return ext;
      }
    }
  } catch {
    // Ignore URL parse errors
  }
  return mediaType === 'video' ? 'mp4' : 'jpg';
}

export function buildChatMediaFilename(
  url: string,
  mediaType: ChatMediaKind,
  id?: string
): string {
  const ext = inferMediaExtension(url, mediaType);
  const safeId = (id || String(Date.now())).replace(/[^a-zA-Z0-9_-]/g, '').slice(-12) || 'media';
  const prefix = mediaType === 'video' ? 'SocialIndia_Video' : 'SocialIndia_Photo';
  return `${prefix}_${safeId}.${ext}`;
}

export function getAttachmentDownloadUrl(url: string, filename?: string): string {
  try {
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      const safeName = filename ? filename.replace(/[^a-zA-Z0-9_.-]/g, '_') : '';
      const flag = safeName ? `fl_attachment:${safeName.replace(/\.[^.]+$/, '')}` : 'fl_attachment';
      if (!url.includes('/fl_attachment')) {
        return url.replace('/upload/', `/upload/${flag}/`);
      }
    }
  } catch {
    // Fallback to original URL
  }
  return url;
}

function triggerAnchorDownload(href: string, filename: string, newTab = false): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  if (newTab) {
    a.target = '_blank';
  }
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadChatMedia(options: {
  url: string;
  mediaType: ChatMediaKind;
  id?: string;
  filename?: string;
}): Promise<'bridge' | 'blob' | 'direct'> {
  const { url, mediaType, id } = options;
  if (!url) throw new Error('Media URL is missing');

  const filename = options.filename || buildChatMediaFilename(url, mediaType, id);
  const androidBridge = getAndroidBridge();

  // 1. Native Android APK JavascriptInterface bridge if available
  if (androidBridge?.downloadMedia) {
    androidBridge.downloadMedia(url, filename, mediaType);
    return 'bridge';
  }
  if (androidBridge?.downloadFile) {
    androidBridge.downloadFile(url, filename);
    return 'bridge';
  }

  // 2. Local blob/data URL can be downloaded directly via anchor
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    triggerAnchorDownload(url, filename);
    return 'blob';
  }

  const directAttachmentUrl = getAttachmentDownloadUrl(url, filename);

  // 3. Android WebView / APK: DownloadManager does not support blob: URLs,
  //    so trigger direct HTTPS attachment URL for Android's DownloadListener.
  if (isAndroidApkWebView()) {
    triggerAnchorDownload(directAttachmentUrl, filename, false);
    return 'direct';
  }

  // 4. Web Browsers (Desktop & Mobile): fetch Blob to bypass cross-origin <a download> ignore
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(blobUrl, filename);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    return 'blob';
  } catch {
    // CORS or network fallback: open direct attachment URL
    triggerAnchorDownload(directAttachmentUrl, filename, true);
    return 'direct';
  }
}

export async function shareChatMedia(options: {
  url: string;
  mediaType: ChatMediaKind;
  text?: string;
  title?: string;
  id?: string;
}): Promise<'bridge' | 'file' | 'url' | 'copied'> {
  const { url, mediaType, text, title, id } = options;
  const shareTitle = title || (mediaType === 'video' ? 'SocialIndia Video' : 'SocialIndia Photo');
  const shareText = text?.trim() || shareTitle;
  const androidBridge = getAndroidBridge();

  // 1. Native Android APK bridge if exposed
  if (androidBridge?.shareMedia) {
    androidBridge.shareMedia(url, shareText, mediaType);
    return 'bridge';
  }
  if (androidBridge?.shareText) {
    androidBridge.shareText(shareText, url);
    return 'bridge';
  }

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const filename = buildChatMediaFilename(url, mediaType, id);

  // 2. Try native file sharing (works on Android Chrome, WebView with Web Share, iOS Safari)
  if (nav && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        // Keep file share under 35MB to avoid memory/share-sheet crashes on mobile
        if (blob.size > 0 && blob.size <= 35 * 1024 * 1024) {
          const fallbackMime = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
          const file = new File([blob], filename, { type: blob.type || fallbackMime });
          if (nav.canShare({ files: [file] })) {
            await nav.share({
              title: shareTitle,
              text: text?.trim() || undefined,
              files: [file],
            });
            return 'file';
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      // Fall through to URL share
    }
  }

  // 3. Fallback to URL + text Web Share API
  if (nav && typeof nav.share === 'function') {
    await nav.share({
      title: shareTitle,
      text: shareText,
      url,
    });
    return 'url';
  }

  // 4. Desktop/unsupported fallback: copy URL + text to clipboard
  if (nav?.clipboard?.writeText) {
    await nav.clipboard.writeText([text?.trim(), url].filter(Boolean).join('\n'));
    return 'copied';
  }

  throw new Error('Sharing is not supported on this device.');
}
