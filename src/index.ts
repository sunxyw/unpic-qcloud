import type { Operations } from "unpic";

/**
 * Image format options supported by the Tencent Cloud COS Image Processing API.
 * Includes standard formats and advanced compression formats (avif, heif, tpg, svgc).
 *
 * @see https://cloud.tencent.com/document/product/436/113295
 * @see https://cloud.tencent.com/document/product/436/119347
 */
export type QCloudCosFormat =
  | "jpg"
  | "png"
  | "webp"
  | "gif"
  | "bmp"
  | "heif"
  | "heic"
  | "avif"
  | "tpg"
  | "svgc"
  | (string & {});

/**
 * Image transformation operations for the Tencent Cloud COS `imageMogr2` API.
 *
 * Resize operations map to the `thumbnail` parameter:
 * - `width` only  → `thumbnail/{width}x`
 * - `height` only → `thumbnail/x{height}`
 * - both          → `thumbnail/{width}x{height}` (fit within, preserving aspect ratio)
 *
 * @see https://cloud.tencent.com/document/product/436/113295
 * @see https://cloud.tencent.com/document/product/436/119347
 */
export interface QCloudCosOperations extends Operations<QCloudCosFormat> {
  width?: number;
  height?: number;
  /** Output format. Advanced compression formats (avif, heif, tpg, svgc) require bucket CI activation. */
  format?: QCloudCosFormat;
  /** Absolute image quality, range 0–100. Applies to JPG and WebP. */
  quality?: number;
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
 * Example output: `imageMogr2/thumbnail/400x300/format/webp/quality/85`
 *
 * @see https://cloud.tencent.com/document/product/436/119428 (pipeline combining)
 */
export function buildImageMogr2(ops: QCloudCosOperations): string {
  const parts: string[] = [];

  if (ops.width || ops.height) {
    const w = ops.width ?? "";
    const h = ops.height ?? "";
    parts.push(`thumbnail/${w}x${h}`);
  }

  if (ops.format) {
    parts.push(`format/${ops.format}`);
  }

  if (ops.quality !== undefined && ops.quality !== null) {
    parts.push(`quality/${ops.quality}`);
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
 * Recognises: `thumbnail`, `format`, `quality`, `rquality`.
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
      // Formats: WxH, Wx, xH, !Np, !Npx, !xNp
      const m = next.match(/^(\d+)?x(\d+)?/);
      if (m) {
        if (m[1]) ops.width = Number(m[1]);
        if (m[2]) ops.height = Number(m[2]);
      }
      i++;
    } else if (token === "format" && next !== undefined) {
      ops.format = next as QCloudCosFormat;
      i++;
    } else if ((token === "quality" || token === "rquality") && next !== undefined) {
      const q = Number(next);
      if (!isNaN(q)) ops.quality = q;
      i++;
    }
  }

  return ops;
}

/**
 * Removes all `imageMogr2` processing parameters from `url`, including pipeline
 * segments separated by `|`, and returns the clean object URL.
 */
function stripProcessing(url: URL): string {
  const rawQuery = decodeURIComponent(url.search.slice(1));
  if (!rawQuery.startsWith("imageMogr2")) {
    // Non-processing query params are preserved
    return url.toString();
  }
  return `${url.origin}${url.pathname}`;
}

/**
 * Extracts the base COS object URL and any existing `imageMogr2` operations
 * from a processed URL.
 *
 * Returns `null` when:
 * - the URL is not a COS URL, or
 * - the URL does not contain `imageMogr2` processing parameters.
 *
 * When the URL contains a pipeline (`|`), only the operations from the first
 * `imageMogr2` segment (resize/format/quality) are extracted; the rest are
 * discarded so that `transform` can reconstruct a clean, merged pipeline.
 */
export function extract(
  url: string | URL,
): { src: string; operations: QCloudCosOperations } | null {
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
  if (!rawQuery.startsWith("imageMogr2")) {
    return null;
  }

  // Take only the first pipeline segment for operation extraction
  const firstSegment = rawQuery.split("|")[0];
  const operations = parseImageMogr2(firstSegment);
  const src = `${u.origin}${u.pathname}`;

  return { src, operations };
}

/**
 * Generates a COS image processing URL from a base COS object URL and the
 * desired operations. Any existing processing parameters on `src` are removed
 * before applying the new operations.
 *
 * Returns the original `src` string unchanged when:
 * - `src` is not a COS URL, or
 * - no operations produce any `imageMogr2` parameters.
 */
export function generate(
  src: string | URL,
  operations: QCloudCosOperations,
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
  const processing = buildImageMogr2(operations);

  if (!processing) {
    return baseUrl;
  }

  // Construct URL manually so that slashes in the query string are NOT
  // percent-encoded (COS accepts both encoded and unencoded forms, but the
  // unencoded form is more readable and what the official JS SDK uses).
  return `${baseUrl}?${processing}`;
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
 * });
 * // → "https://bucket-1234.cos.ap-beijing.myqcloud.com/photo.jpg?imageMogr2/thumbnail/800x/format/webp"
 * ```
 *
 * @see https://cloud.tencent.com/document/product/436/115609
 */
export function transform(
  src: string | URL,
  operations: QCloudCosOperations,
): string {
  const base = extract(src);
  if (!base) {
    return generate(src, operations);
  }

  const merged: QCloudCosOperations = { ...base.operations };

  // Apply only the defined fields from the new operations
  if (operations.width !== undefined) merged.width = operations.width;
  if (operations.height !== undefined) merged.height = operations.height;
  if (operations.format !== undefined) merged.format = operations.format;
  if (operations.quality !== undefined) merged.quality = operations.quality;

  return generate(base.src, merged);
}
