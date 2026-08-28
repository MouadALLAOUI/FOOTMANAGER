import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

export interface CompressImageOptions {
  /** Max resulting width (image is downscaled to fit, preserving ratio). */
  maxWidth?: number;
  /** Max resulting height (image is downscaled to fit, preserving ratio). */
  maxHeight?: number;
  /** Initial JPEG quality (0.0 - 1.0). Lowered on retries to hit maxSizeKB. */
  quality?: number;
  /** Hard size cap target in kilobytes. */
  maxSizeKB?: number;
}

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number | null;
}

const DEFAULTS: Required<Pick<CompressImageOptions, 'maxWidth' | 'maxHeight' | 'quality' | 'maxSizeKB'>> & {
  format: SaveFormat;
} = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.75,
  maxSizeKB: 500,
  format: SaveFormat.JPEG,
};

const MIN_QUALITY = 0.3;
const QUALITY_STEP = 0.12;

async function fileSizeBytes(uri: string): Promise<number | null> {
  try {
    const buffer = await new File(uri).arrayBuffer();
    return buffer.byteLength;
  } catch {
    return null;
  }
}

async function renderScaled(uri: string, maxWidth: number, maxHeight: number): Promise<ImageRef> {
  const current = await ImageManipulator.manipulate(uri).renderAsync();
  const { width, height } = current;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  if (scale >= 1) return current;
  const nextWidth = Math.max(1, Math.round(width * scale));
  const nextHeight = Math.max(1, Math.round(height * scale));
  return ImageManipulator.manipulate(uri).resize({ width: nextWidth, height: nextHeight }).renderAsync();
}

/**
 * Downscale + re-compress a local image before upload.
 *
 * Phases: (1) scale down to fit `maxWidth`/`maxHeight` preserving ratio,
 * (2) save as JPEG, (3) if still above `maxSizeKB`, re-save at lower quality
 * until the cap is met or `MIN_QUALITY` is reached.
 *
 * If anything fails it resolves to the original image so uploads never break.
 */
export async function compressImage(uri: string, options: CompressImageOptions = {}): Promise<CompressedImage> {
  const merged = { ...DEFAULTS, ...options };
  try {
    const source = await renderScaled(uri, merged.maxWidth, merged.maxHeight);
    let quality = merged.quality;
    let saved = await source.saveAsync({ compress: quality, format: merged.format });
    const maxBytes = merged.maxSizeKB * 1024;
    let sizeBytes = await fileSizeBytes(saved.uri);

    while (sizeBytes != null && sizeBytes > maxBytes && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
      saved = await source.saveAsync({ compress: quality, format: merged.format });
      sizeBytes = await fileSizeBytes(saved.uri);
    }

    return { uri: saved.uri, width: saved.width, height: saved.height, sizeBytes };
  } catch {
    return { uri, width: 0, height: 0, sizeBytes: null };
  }
}

/** Convenience preset for small square images (avatar / team logo). */
export function compressSquareImage(uri: string, size = 512, maxSizeKB = 500): Promise<CompressedImage> {
  return compressImage(uri, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.82,
    maxSizeKB,
  });
}