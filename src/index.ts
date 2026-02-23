import type { Operations } from "unpic";

/**
 * Image format options supported by the Tencent Cloud COS Image Processing API.
 *
 * Standard formats: `jpg`/`jpeg` (equivalent), `png`, `webp`, `gif`, `bmp`, `tiff`, `apng`
 * Advanced compression formats (require CI activation): `avif`, `heif`, `heic`, `tpg`, `astc`
 * Special: `src` (keep original format), `psd` (persistent processing only)
 *
 * @see https://cloud.tencent.com/document/product/460/36543
 * @see https://cloud.tencent.com/document/product/436/119347
 */
export type QCloudCosFormat =
  | "jpg"
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "bmp"
  | "tiff"
  | "apng"
  | "heif"
  | "heic"
  | "avif"
  | "tpg"
  | "astc"
  | "psd"
  | "src"
  | (string & {});

/**
 * Thumbnail scaling mode, controls how width/height are applied.
 *
 * - `"fit"` (default) — fit within `WxH`, preserving aspect ratio (`thumbnail/WxH`)
 * - `"cover"` — scale to minimum `WxH` then center-crop (`crop/WxH`); equivalent to CSS `object-fit: cover`
 * - `"force"` — force exact `WxH` ignoring aspect ratio (`thumbnail/WxH!`)
 * - `"shrinkOnly"` — fit within `WxH` only if image is larger (`thumbnail/WxH>`)
 * - `"enlargeOnly"` — fit within `WxH` only if image is smaller (`thumbnail/WxH<`)
 *
 * @see https://cloud.tencent.com/document/product/436/113295
 */
export type QCloudCosThumbnailMode =
  | "fit"
  | "cover"
  | "force"
  | "shrinkOnly"
  | "enlargeOnly";

/**
 * Image transformation operations for the Tencent Cloud COS `imageMogr2` API.
 *
 * **Resize**: use `width` and/or `height` with optional `thumbnailMode`.
 * - `width` only → `thumbnail/{width}x` (proportional)
 * - `height` only → `thumbnail/x{height}` (proportional)
 * - both + `thumbnailMode: "fit"` (default) → `thumbnail/{width}x{height}` (fit-within)
 * - both + `thumbnailMode: "cover"` → `crop/{width}x{height}` (fill + center-crop)
 *
 * **Format**: standard formats (jpg, png, webp, gif, bmp, tiff) and advanced
 * compression formats (avif, heif, tpg, astc — require CI Advanced Compression).
 *
 * **Quality**: `quality` (absolute 0–100), `rquality` (relative), `lquality` (minimum).
 *
 * **Orientation**: `autoOrient` corrects EXIF rotation (recommended before WebP conversion).
 *
 * @see https://cloud.tencent.com/document/product/436/113295
 * @see https://cloud.tencent.com/document/product/436/119347
 * @see https://cloud.tencent.com/document/product/460/36542
 * @see https://cloud.tencent.com/document/product/460/36544
 */
export interface QCloudCosOperations extends Operations<QCloudCosFormat> {
  width?: number;
  height?: number;
  /**
   * Output format. Advanced compression formats (avif, heif, heic, tpg, astc)
   * require enabling CI Advanced Compression on the bucket.
   * @see https://cloud.tencent.com/document/product/436/119347
   */
  format?: QCloudCosFormat;
  /**
   * Absolute image quality, range 0–100. Supported by jpg, webp, tpg, heif, avif.
   * Append `!` suffix (as string) to force the value, e.g. `"90!"`.
   * @see https://cloud.tencent.com/document/product/460/36544
   */
  quality?: number | string;
  /**
   * How width and height are applied when both are specified.
   * Defaults to `"fit"` (fit-within, preserving aspect ratio).
   * Use `"cover"` for CSS `object-fit: cover` behaviour.
   */
  thumbnailMode?: QCloudCosThumbnailMode;
  /**
   * Auto-orient the image based on EXIF data. Strongly recommended when
   * converting to WebP as some browsers cannot read WebP EXIF orientation.
   * @see https://cloud.tencent.com/document/product/460/36542
   */
  autoOrient?: boolean;
  /**
   * Clockwise rotation in degrees, range 0–360.
   * @see https://cloud.tencent.com/document/product/460/36542
   */
  rotate?: number;
  /**
   * Mirror flip direction.
   * @see https://cloud.tencent.com/document/product/460/36542
   */
  flip?: "vertical" | "horizontal";
  /**
   * Inner-circle crop: radius in pixels. The circle is centered on the image.
   * Non-circular areas become transparent (PNG/WebP/BMP) or white (JPG).
   * @see https://cloud.tencent.com/document/product/460/36541
   */
  iradius?: number;
  /**
   * Round-corner crop: corner radius in pixels.
   * Non-circular areas become transparent (PNG/WebP/BMP) or white (JPG).
   * @see https://cloud.tencent.com/document/product/460/36541
   */
  rradius?: number;
  /**
   * Relative image quality, range 0–100. The result quality = original × (rquality / 100).
   * @see https://cloud.tencent.com/document/product/460/36544
   */
  rquality?: number;
  /**
   * Minimum image quality, range 0–100. The result quality is at least this value.
   * @see https://cloud.tencent.com/document/product/460/36544
   */
  lquality?: number;
  /**
   * When set to `true`, returns the original image instead of an error on
   * processing failures (e.g. file too large, param out of range).
   * @see https://cloud.tencent.com/document/product/460/36544
   */
  ignoreError?: boolean;
}

/**
 * Global default options for QCloud COS image processing.
 *
 * These values serve as defaults for `generate` and `transform` calls:
 * any field explicitly provided in the `operations` argument will always
 * override the corresponding option here.
 *
 * @example
 * // Always output WebP with 85% quality unless the caller says otherwise
 * generate(src, { width: 800 }, { format: "webp", quality: 85 });
 */
export interface QCloudCosOptions {
  /** Default output format. */
  format?: QCloudCosFormat;
  /** Default thumbnail scaling mode when both width and height are set. */
  thumbnailMode?: QCloudCosThumbnailMode;
  /** Default absolute image quality (0–100). */
  quality?: number | string;
  /** Default relative image quality (0–100). */
  rquality?: number;
  /** Default minimum image quality (0–100). */
  lquality?: number;
  /** Auto-orient images based on EXIF data by default. */
  autoOrient?: boolean;
  /** Return original image on processing failures by default. */
  ignoreError?: boolean;
}

/**
 * Regex that matches a Tencent Cloud COS object URL hostname.
 * Handles both standard COS endpoints:
 *   {bucket}.cos.{region}.myqcloud.com
 * and the CI (Cloud Infinity) endpoint variant:
 *   {bucket}.pic.{region}.myqcloud.com
 */
const COS_HOSTNAME_RE =
  /^[a-zA-Z0-9-]+-\d+\.(?:cos|pic)\.[a-z]+-[a-z0-9]+(?:-\d+)?\.myqcloud\.com$/;

/**
 * Returns true when `url` points to a Tencent Cloud COS object.
 */
export function isCosUrl(url: string | URL): boolean {
  try {
    const u = typeof url === "string" ? new URL(url) : url;
    return COS_HOSTNAME_RE.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Builds the `imageMogr2` processing string from the given operations.
 * Returns an empty string when no operations are specified.
 *
 * The parameter order follows the recommended COS convention:
 * resize/crop → iradius/rradius → auto-orient → rotate → flip → format → quality → ignore-error
 *
 * @see https://cloud.tencent.com/document/product/436/113295
 * @see https://cloud.tencent.com/document/product/436/119428
 */
export function buildImageMogr2(ops: QCloudCosOperations): string {
  const parts: string[] = [];

  // --- Resize / crop ---
  const hasWidth = ops.width !== undefined && ops.width !== null;
  const hasHeight = ops.height !== undefined && ops.height !== null;

  if (hasWidth || hasHeight) {
    const w = hasWidth ? ops.width : "";
    const h = hasHeight ? ops.height : "";
    const mode = ops.thumbnailMode ?? "fit";

    switch (mode) {
      case "cover":
        // scale to minimum WxH then center-crop → CSS object-fit: cover
        parts.push(`crop/${w}x${h}`);
        break;
      case "force":
        // ignore aspect ratio, force exact dimensions
        parts.push(`thumbnail/${w}x${h}!`);
        break;
      case "shrinkOnly":
        // only shrink, never enlarge
        parts.push(`thumbnail/${w}x${h}>`);
        break;
      case "enlargeOnly":
        // only enlarge, never shrink
        parts.push(`thumbnail/${w}x${h}<`);
        break;
      case "fit":
      default:
        // fit within WxH, preserving aspect ratio
        parts.push(`thumbnail/${w}x${h}`);
        break;
    }
  }

  // --- Circle / round-corner crop ---
  if (ops.iradius !== undefined && ops.iradius !== null) {
    parts.push(`iradius/${ops.iradius}`);
  }
  if (ops.rradius !== undefined && ops.rradius !== null) {
    parts.push(`rradius/${ops.rradius}`);
  }

  // --- Orientation / rotation / flip ---
  if (ops.autoOrient) {
    parts.push("auto-orient");
  }
  if (ops.rotate !== undefined && ops.rotate !== null) {
    parts.push(`rotate/${ops.rotate}`);
  }
  if (ops.flip) {
    parts.push(`flip/${ops.flip}`);
  }

  // --- Format ---
  if (ops.format) {
    parts.push(`format/${ops.format}`);
  }

  // --- Quality ---
  if (ops.quality !== undefined && ops.quality !== null) {
    parts.push(`quality/${ops.quality}`);
  }
  if (ops.rquality !== undefined && ops.rquality !== null) {
    parts.push(`rquality/${ops.rquality}`);
  }
  if (ops.lquality !== undefined && ops.lquality !== null) {
    parts.push(`lquality/${ops.lquality}`);
  }

  // --- Ignore error ---
  if (ops.ignoreError) {
    parts.push("ignore-error/1");
  }

  if (parts.length === 0) {
    return "";
  }

  return `imageMogr2/${parts.join("/")}`;
}

/**
 * Parses a single `imageMogr2` segment (without pipeline separators) into
 * a {@link QCloudCosOperations} object.
 *
 * Recognised operations: `thumbnail`, `crop`, `iradius`, `rradius`,
 * `auto-orient`, `rotate`, `flip`, `format`, `quality`, `rquality`,
 * `lquality`, `ignore-error`.
 *
 * Unknown tokens are silently ignored.
 */
export function parseImageMogr2(segment: string): QCloudCosOperations {
  const ops: QCloudCosOperations = {};

  // Strip a leading "imageMogr2/" prefix if present
  const stripped = segment.replace(/^imageMogr2\/?/, "");
  if (!stripped) {
    return ops;
  }

  const parts = stripped.split("/");

  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];
    const next = parts[i + 1];

    if (token === "thumbnail" && next !== undefined) {
      // Detect modifier suffix: !, >, <
      const forceMatch = next.match(/^(\d*)x(\d*)!$/);
      const shrinkMatch = next.match(/^(\d*)x(\d*)>$/);
      const enlargeMatch = next.match(/^(\d*)x(\d*)<$/);
      const fitMatch = next.match(/^(\d*)x(\d*)/);

      if (forceMatch) {
        if (forceMatch[1]) ops.width = Number(forceMatch[1]);
        if (forceMatch[2]) ops.height = Number(forceMatch[2]);
        ops.thumbnailMode = "force";
      } else if (shrinkMatch) {
        if (shrinkMatch[1]) ops.width = Number(shrinkMatch[1]);
        if (shrinkMatch[2]) ops.height = Number(shrinkMatch[2]);
        ops.thumbnailMode = "shrinkOnly";
      } else if (enlargeMatch) {
        if (enlargeMatch[1]) ops.width = Number(enlargeMatch[1]);
        if (enlargeMatch[2]) ops.height = Number(enlargeMatch[2]);
        ops.thumbnailMode = "enlargeOnly";
      } else if (fitMatch) {
        if (fitMatch[1]) ops.width = Number(fitMatch[1]);
        if (fitMatch[2]) ops.height = Number(fitMatch[2]);
        // thumbnailMode defaults to "fit" — leave unset
      }
      i++;
    } else if (token === "crop" && next !== undefined) {
      // crop/WxH — scale to minimum WxH then center-crop
      const m = next.match(/^(\d*)x(\d*)/);
      if (m) {
        if (m[1]) ops.width = Number(m[1]);
        if (m[2]) ops.height = Number(m[2]);
        ops.thumbnailMode = "cover";
      }
      i++;
    } else if (token === "gravity" && next !== undefined) {
      // Skip gravity value (used with crop)
      i++;
    } else if (token === "iradius" && next !== undefined) {
      const n = Number(next);
      if (!isNaN(n)) ops.iradius = n;
      i++;
    } else if (token === "rradius" && next !== undefined) {
      const n = Number(next);
      if (!isNaN(n)) ops.rradius = n;
      i++;
    } else if (token === "auto-orient") {
      ops.autoOrient = true;
    } else if (token === "rotate" && next !== undefined) {
      const n = Number(next);
      if (!isNaN(n)) ops.rotate = n;
      i++;
    } else if (token === "flip" && next !== undefined) {
      if (next === "vertical" || next === "horizontal") {
        ops.flip = next;
      }
      i++;
    } else if (token === "format" && next !== undefined) {
      ops.format = next as QCloudCosFormat;
      i++;
    } else if (token === "quality" && next !== undefined) {
      // Preserve string values to support the '!' forced-quality suffix (e.g. "90!")
      const num = Number(next);
      ops.quality = isNaN(num) ? next : num;
      i++;
    } else if (token === "rquality" && next !== undefined) {
      const q = Number(next);
      if (!isNaN(q)) ops.rquality = q;
      i++;
    } else if (token === "lquality" && next !== undefined) {
      const q = Number(next);
      if (!isNaN(q)) ops.lquality = q;
      i++;
    } else if (token === "ignore-error") {
      ops.ignoreError = true;
      if (next === "1") i++;
    }
  }

  return ops;
}

/**
 * Extracts the base COS object URL and any existing `imageMogr2` operations
 * from a processed URL.
 *
 * Returns `null` when:
 * - the URL is not a COS URL, or
 * - the URL does not contain any processing parameters.
 *
 * When the URL contains a pipeline (`|`), all `imageMogr2` segments are merged
 * into a single {@link QCloudCosOperations} object (later segments override
 * earlier ones for the same key). Non-`imageMogr2` pipeline segments (e.g.
 * `watermark/…`) are preserved in `pipelineSegments` so that `generate` and
 * `transform` can re-append them.
 *
 * @see https://cloud.tencent.com/document/product/436/119428
 */
export function extract(
  url: string | URL,
): { src: string; operations: QCloudCosOperations; options: QCloudCosOptions; pipelineSegments: string[] } | null {
  let u: URL;
  try {
    u = typeof url === "string" ? new URL(url) : url;
  } catch {
    return null;
  }

  if (!isCosUrl(u)) {
    return null;
  }

  const rawQuery = decodeURIComponent(u.search.slice(1));
  if (!rawQuery) {
    return null;
  }

  const segments = rawQuery.split("|");
  const pipelineSegments: string[] = [];
  let operations: QCloudCosOperations = {};
  let hasImageMogr2 = false;

  for (const seg of segments) {
    if (seg.startsWith("imageMogr2")) {
      // Merge all imageMogr2 segments; later values override earlier ones
      const parsed = parseImageMogr2(seg);
      operations = { ...operations, ...parsed };
      hasImageMogr2 = true;
    } else {
      // Preserve non-imageMogr2 segments (watermark, etc.)
      pipelineSegments.push(seg);
    }
  }

  if (!hasImageMogr2 && pipelineSegments.length === 0) {
    return null;
  }

  const src = `${u.origin}${u.pathname}`;

  return { src, operations, options: {}, pipelineSegments };
}

/**
 * Generates a COS image processing URL from a base COS object URL and the
 * desired operations. Any existing processing parameters on `src` are removed
 * before applying the new operations.
 *
 * When `pipelineSegments` are provided (e.g. from {@link extract}), they are
 * appended after the `imageMogr2` segment using the pipeline operator `|`.
 *
 * Returns the original `src` string unchanged when:
 * - `src` is not a COS URL, or
 * - no operations produce any `imageMogr2` parameters and no pipeline segments exist.
 *
 * @see https://cloud.tencent.com/document/product/436/119428
 */
export function generate(
  src: string | URL,
  operations: QCloudCosOperations,
  options?: QCloudCosOptions,
  pipelineSegments?: string[],
): string {
  let u: URL;
  try {
    u = typeof src === "string" ? new URL(src) : (src as URL);
  } catch {
    return src.toString();
  }

  if (!isCosUrl(u)) {
    return src.toString();
  }

  const baseUrl = `${u.origin}${u.pathname}`;
  // Options provide defaults; explicit operations always take precedence.
  const effectiveOps: QCloudCosOperations = { ...options, ...operations };
  const processing = buildImageMogr2(effectiveOps);

  const allSegments: string[] = [];
  if (processing) {
    allSegments.push(processing);
  }
  if (pipelineSegments?.length) {
    allSegments.push(...pipelineSegments);
  }

  if (allSegments.length === 0) {
    return baseUrl;
  }

  // Construct URL manually so that slashes in the query string are NOT
  // percent-encoded (COS accepts both encoded and unencoded forms, but the
  // unencoded form is more readable and what the official JS SDK uses).
  return `${baseUrl}?${allSegments.join("|")}`;
}

/**
 * Transforms a COS image URL by merging existing `imageMogr2` operations with
 * the supplied `operations`.  New values override existing ones.
 *
 * This is the primary function for use with the `@unpic/core` transformer API:
 *
 * ```ts
 * import { transform } from "unpic-qcloud";
 *
 * // Used directly:
 * transform("https://bucket-1234.cos.ap-beijing.myqcloud.com/photo.jpg", {
 *   width: 800,
 *   format: "webp",
 *   autoOrient: true,
 * });
 * // → "https://bucket-1234.cos.ap-beijing.myqcloud.com/photo.jpg?imageMogr2/thumbnail/800x/auto-orient/format/webp"
 * ```
 *
 * @see https://cloud.tencent.com/document/product/436/115609
 */
export function transform(
  src: string | URL,
  operations: QCloudCosOperations,
  options?: QCloudCosOptions,
): string {
  const base = extract(src);
  if (!base) {
    return generate(src, operations, options);
  }

  // Options are defaults; existing URL operations override them; new operations
  // have the highest priority and override both.
  const merged: QCloudCosOperations = { ...options, ...base.operations };

  // Apply only the defined fields from the new operations (undefined = keep existing)
  if (operations.width !== undefined) merged.width = operations.width;
  if (operations.height !== undefined) merged.height = operations.height;
  if (operations.thumbnailMode !== undefined)
    merged.thumbnailMode = operations.thumbnailMode;
  if (operations.format !== undefined) merged.format = operations.format;
  if (operations.quality !== undefined) merged.quality = operations.quality;
  if (operations.rquality !== undefined) merged.rquality = operations.rquality;
  if (operations.lquality !== undefined) merged.lquality = operations.lquality;
  if (operations.autoOrient !== undefined)
    merged.autoOrient = operations.autoOrient;
  if (operations.rotate !== undefined) merged.rotate = operations.rotate;
  if (operations.flip !== undefined) merged.flip = operations.flip;
  if (operations.iradius !== undefined) merged.iradius = operations.iradius;
  if (operations.rradius !== undefined) merged.rradius = operations.rradius;
  if (operations.ignoreError !== undefined)
    merged.ignoreError = operations.ignoreError;

  return generate(base.src, merged, undefined, base.pipelineSegments);
}
