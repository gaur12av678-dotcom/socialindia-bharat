import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
} from 'mediabunny';

export const CLOUDINARY_FREE_MAX_BYTES = 98 * 1024 * 1024; // 98 MB safe margin under Cloudinary's 100 MB cap
const TARGET_SINGLE_BYTES = 85 * 1024 * 1024; // 85 MB target for single-file optimization
const TARGET_PART_BYTES = 76 * 1024 * 1024; // 76 MB target per split part

export interface PreparedCloudinaryMedia {
  mode: 'single' | 'parts';
  files: File[];
  durations: number[];
  totalDuration: number;
}

function getBaseName(fileName: string): string {
  const clean = (fileName || 'video').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return clean || 'video';
}

async function getFallbackVideoDuration(file: File): Promise<number> {
  if (typeof document === 'undefined') return 0;
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      const cleanup = (dur: number) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
        resolve(Number.isFinite(dur) && dur > 0 ? dur : 0);
      };
      vid.onloadedmetadata = () => cleanup(vid.duration);
      vid.onerror = () => cleanup(0);
      vid.src = url;
    } catch {
      resolve(0);
    }
  });
}

function computeScaledDimensions(
  width: number,
  height: number,
  maxLongSide: number
): { width?: number; height?: number } {
  if (!width || !height) return {};
  const longSide = Math.max(width, height);
  if (longSide <= maxLongSide) return {};
  const scale = maxLongSide / longSide;
  // H.264 / AVC encoders require even dimensions
  const evenW = Math.max(2, Math.floor((width * scale) / 2) * 2);
  const evenH = Math.max(2, Math.floor((height * scale) / 2) * 2);
  return { width: evenW, height: evenH };
}

async function renderSingleOptimizedMp4(
  input: Input,
  totalDuration: number,
  displayWidth: number,
  displayHeight: number,
  baseName: string,
  allowMultiPart: boolean,
  onProgress?: (percent: number, stage: string) => void
): Promise<File | null> {
  if (typeof VideoEncoder === 'undefined' || !totalDuration || totalDuration <= 0) {
    return null;
  }

  // Reserve ~96 kbps for AAC audio, calculate remaining bitrate budget for 85 MB video
  const audioBitrate = 96_000;
  const totalBitsBudget = TARGET_SINGLE_BYTES * 8;
  const availableVideoBitrate = Math.floor(totalBitsBudget / totalDuration) - audioBitrate;

  // For standard Video uploads (allowMultiPart=true), only single-file transcode when bitrate stays crisp (>= 1.1 Mbps, ~10 min);
  // longer videos split losslessly in seconds via renderSegmentPart with 100% original quality.
  // For single-URL slots (Chat/Posts), allow down to 300 kbps so longer clips still fit <98 MB.
  const minAcceptedBitrate = allowMultiPart ? 1_100_000 : 300_000;
  if (availableVideoBitrate < minAcceptedBitrate) {
    return null;
  }

  const videoBitrate = Math.min(3_200_000, Math.max(minAcceptedBitrate, availableVideoBitrate));
  const maxLongSide = videoBitrate < 700_000 ? 854 : videoBitrate < 1_800_000 ? 1280 : 1920;
  const dims = computeScaledDimensions(displayWidth, displayHeight, maxLongSide);

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  });

  const conversion = await Conversion.init({
    input,
    output,
    video: {
      codec: 'avc',
      bitrate: videoBitrate,
      forceTranscode: true,
      ...dims,
    },
    audio: {
      codec: 'aac',
      bitrate: audioBitrate,
    },
  });

  if (!conversion.isValid) {
    return null;
  }

  conversion.onProgress = (progress) => {
    const pct = Math.min(99, Math.max(1, Math.round(progress * 100)));
    onProgress?.(pct, 'Uploading video...');
  };

  await conversion.execute();

  const buffer = output.target.buffer;
  if (!buffer || buffer.byteLength === 0 || buffer.byteLength > CLOUDINARY_FREE_MAX_BYTES) {
    return null;
  }

  return new File([buffer], `${baseName}_optimized.mp4`, { type: 'video/mp4' });
}

async function renderSegmentPart(
  input: Input,
  start: number,
  end: number,
  partIndex: number,
  estimatedTotalParts: number,
  baseName: string,
  displayWidth: number,
  displayHeight: number,
  onProgress?: (percent: number, stage: string) => void
): Promise<File> {
  // 1. Try fast lossless stream-copy first
  const copyOutput = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  });

  const copyConversion = await Conversion.init({
    input,
    output: copyOutput,
    trim: { start, end },
  });

  if (copyConversion.isValid) {
    copyConversion.onProgress = (progress) => {
      const overallPct = Math.min(
        99,
        Math.max(1, Math.round(((partIndex + progress) / estimatedTotalParts) * 100))
      );
      onProgress?.(overallPct, 'Uploading video...');
    };
    await copyConversion.execute();
    const copyBuf = copyOutput.target.buffer;
    if (copyBuf && copyBuf.byteLength > 0) {
      return new File([copyBuf], `${baseName}_part${partIndex + 1}.mp4`, { type: 'video/mp4' });
    }
  }

  // 2. Fallback to WebCodecs transcode for this segment (handles MKV/WebM/AVI/incompatible codecs)
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('This browser cannot convert this video format locally. Please use Chrome/Edge or upload an MP4 under 100 MB.');
  }

  const segDuration = Math.max(1, end - start);
  const segBitrate = Math.min(
    2_800_000,
    Math.max(700_000, Math.floor((TARGET_PART_BYTES * 8) / segDuration) - 96_000)
  );
  const dims = computeScaledDimensions(displayWidth, displayHeight, 1280);

  const encodeOutput = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  });

  const encodeConversion = await Conversion.init({
    input,
    output: encodeOutput,
    trim: { start, end },
    video: {
      codec: 'avc',
      bitrate: segBitrate,
      forceTranscode: true,
      ...dims,
    },
    audio: {
      codec: 'aac',
      bitrate: 96_000,
    },
  });

  if (!encodeConversion.isValid) {
    throw new Error('Could not process video tracks for upload.');
  }

  encodeConversion.onProgress = (progress) => {
    const overallPct = Math.min(
      99,
      Math.max(1, Math.round(((partIndex + progress) / estimatedTotalParts) * 100))
    );
    onProgress?.(overallPct, 'Uploading video...');
  };

  await encodeConversion.execute();
  const encodeBuf = encodeOutput.target.buffer;
  if (!encodeBuf || encodeBuf.byteLength === 0) {
    throw new Error('Could not process this video file for upload.');
  }

  return new File([encodeBuf], `${baseName}_part${partIndex + 1}.mp4`, { type: 'video/mp4' });
}

export async function prepareVideoForCloudinary(
  file: File,
  onProgress?: (percent: number, stage: string) => void,
  allowMultiPart: boolean = true
): Promise<PreparedCloudinaryMedia> {
  const baseName = getBaseName(file.name);
  onProgress?.(5, 'Uploading video...');

  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  try {
    // Fast duration lookup (<50ms) first so large files never freeze scanning all packets
    let totalDuration = await getFallbackVideoDuration(file);
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
      const metaDur = await input.getDurationFromMetadata().catch(() => null);
      totalDuration = metaDur || 0;
    }
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
      totalDuration = await input.computeDuration().catch(() => 0);
    }
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
      throw new Error('Could not read video duration for upload.');
    }

    onProgress?.(12, 'Uploading video...');

    const videoTrack = await input.getPrimaryVideoTrack().catch(() => null);
    const displayWidth = videoTrack?.displayWidth || 1280;
    const displayHeight = videoTrack?.displayHeight || 720;

    // 1. Try single-file optimization (< 98 MB) when crisp HD fits or when multi-part is disabled
    try {
      const optimizedSingle = await renderSingleOptimizedMp4(
        input,
        totalDuration,
        displayWidth,
        displayHeight,
        baseName,
        allowMultiPart,
        onProgress
      );
      if (optimizedSingle && optimizedSingle.size <= CLOUDINARY_FREE_MAX_BYTES) {
        onProgress?.(100, 'Uploading video...');
        return {
          mode: 'single',
          files: [optimizedSingle],
          durations: [totalDuration],
          totalDuration,
        };
      }
    } catch (optErr) {
      console.warn('Single-file video optimization skipped, trying multi-part split:', optErr);
    }

    if (!allowMultiPart) {
      throw new Error('Video could not be compressed under 100 MB for a single-file slot.');
    }

    // 2. Multi-part split into < 98 MB MP4 segments (fast lossless stream-copy with binary subdivision if a part > 98 MB)
    const initialPartCount = Math.max(2, Math.ceil(file.size / TARGET_PART_BYTES));
    const sliceDur = totalDuration / initialPartCount;
    const queue: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < initialPartCount; i++) {
      const start = i * sliceDur;
      const end = i === initialPartCount - 1 ? totalDuration : (i + 1) * sliceDur;
      queue.push({ start, end });
    }

    const files: File[] = [];
    const durations: number[] = [];

    while (queue.length > 0) {
      const seg = queue.shift()!;
      const segLen = seg.end - seg.start;
      if (segLen <= 0.25) continue;

      const estimatedTotal = files.length + queue.length + 1;
      const partFile = await renderSegmentPart(
        input,
        seg.start,
        seg.end,
        files.length,
        estimatedTotal,
        baseName,
        displayWidth,
        displayHeight,
        onProgress
      );

      // If a high-bitrate action segment still exceeded 98 MB, split it in half cleanly
      if (partFile.size > CLOUDINARY_FREE_MAX_BYTES && segLen > 4) {
        const mid = (seg.start + seg.end) / 2;
        queue.unshift({ start: mid, end: seg.end });
        queue.unshift({ start: seg.start, end: mid });
        continue;
      }

      if (partFile.size > CLOUDINARY_FREE_MAX_BYTES) {
        throw new Error('A segment remained larger than 100 MB even after splitting.');
      }

      files.push(partFile);
      durations.push(segLen);
    }

    if (files.length === 0) {
      throw new Error('Failed to split video into uploadable parts.');
    }

    onProgress?.(100, 'Uploading video...');
    return {
      mode: files.length === 1 ? 'single' : 'parts',
      files,
      durations,
      totalDuration,
    };
  } finally {
    try {
      input.dispose();
    } catch {}
  }
}
