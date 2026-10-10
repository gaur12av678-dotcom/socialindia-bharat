/**
 * Image compression and optimization utilities.
 * Ensures avatars and banners are compressed to lightweight, high-quality JPEG DataURLs
 * that comfortably fit within Firestore's 1MB document limit (< 80KB each),
 * preventing data loss, write rejection, or images reverting to previous versions.
 */

export async function compressImage(
  fileOrUrl: File | string,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    let src = '';
    let shouldRevoke = false;

    if (typeof fileOrUrl === 'string') {
      src = fileOrUrl;
      // If it's already an http(s) URL, return directly
      if (src.startsWith('http://') || src.startsWith('https://')) {
        resolve(src);
        return;
      }
    } else {
      src = URL.createObjectURL(fileOrUrl);
      shouldRevoke = true;
    }

    const img = new Image();
    // Only set crossOrigin for remote HTTP URLs to prevent canvas tainting on blob or data URLs
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (shouldRevoke) {
        try {
          URL.revokeObjectURL(src);
        } catch {}
      }

      let { width, height } = img;
      if (width <= 0 || height <= 0) {
        resolve(src);
        return;
      }

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        // If file is still too large (> 120KB for Firestore doc safety), lower quality
        if (compressedDataUrl.length > 160000 && quality > 0.5) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
        }
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Canvas export failed, using fallback:', err);
        resolve(src);
      }
    };

    img.onerror = () => {
      if (shouldRevoke) {
        try {
          URL.revokeObjectURL(src);
        } catch {}
      }
      resolve(src);
    };

    img.src = src;
  });
}

/**
 * Standard avatar compressor: max 256x256, ~25KB - 40KB
 */
export async function compressAvatar(fileOrUrl: File | string): Promise<string> {
  return compressImage(fileOrUrl, 256, 256, 0.85);
}

/**
 * Standard channel banner compressor: max 1280x360, ~50KB - 85KB
 */
export async function compressBanner(fileOrUrl: File | string): Promise<string> {
  return compressImage(fileOrUrl, 1280, 360, 0.80);
}
