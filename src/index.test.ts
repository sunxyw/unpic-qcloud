import { describe, expect, it } from "vitest";
import {
  buildImageMogr2,
  extract,
  generate,
  isCosUrl,
  parseImageMogr2,
  transform,
  type QCloudCosOperations,
} from "./index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_URL =
  "https://examplebucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg";
const BASE_PATH_URL =
  "https://examplebucket-1250000000.cos.ap-beijing.myqcloud.com/path/to/photo.jpg";
const PIC_URL =
  "https://examplebucket-1250000000.pic.ap-guangzhou.myqcloud.com/image.png";
const NON_COS_URL = "https://example.com/photo.jpg";

// ---------------------------------------------------------------------------
// isCosUrl
// ---------------------------------------------------------------------------

describe("isCosUrl", () => {
  it("returns true for standard COS URL", () => {
    expect(isCosUrl(BASE_URL)).toBe(true);
  });

  it("returns true for COS pic-endpoint URL", () => {
    expect(isCosUrl(PIC_URL)).toBe(true);
  });

  it("returns true for URL with imageMogr2 query", () => {
    expect(
      isCosUrl(`${BASE_URL}?imageMogr2/thumbnail/200x/format/webp`),
    ).toBe(true);
  });

  it("returns false for non-COS URL", () => {
    expect(isCosUrl(NON_COS_URL)).toBe(false);
  });

  it("returns false for invalid string", () => {
    expect(isCosUrl("not-a-url")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildImageMogr2
// ---------------------------------------------------------------------------

describe("buildImageMogr2", () => {
  it("returns empty string for empty operations", () => {
    expect(buildImageMogr2({})).toBe("");
  });

  it("builds thumbnail with width only", () => {
    expect(buildImageMogr2({ width: 400 })).toBe(
      "imageMogr2/thumbnail/400x",
    );
  });

  it("builds thumbnail with height only", () => {
    expect(buildImageMogr2({ height: 300 })).toBe(
      "imageMogr2/thumbnail/x300",
    );
  });

  it("builds thumbnail with both width and height", () => {
    expect(buildImageMogr2({ width: 400, height: 300 })).toBe(
      "imageMogr2/thumbnail/400x300",
    );
  });

  it("builds format only", () => {
    expect(buildImageMogr2({ format: "webp" })).toBe(
      "imageMogr2/format/webp",
    );
  });

  it("builds advanced compression format (avif)", () => {
    expect(buildImageMogr2({ format: "avif" })).toBe(
      "imageMogr2/format/avif",
    );
  });

  it("builds quality only", () => {
    expect(buildImageMogr2({ quality: 85 })).toBe(
      "imageMogr2/quality/85",
    );
  });

  it("builds combined resize + format + quality", () => {
    expect(buildImageMogr2({ width: 800, format: "webp", quality: 80 })).toBe(
      "imageMogr2/thumbnail/800x/format/webp/quality/80",
    );
  });

  it("builds combined width + height + format + quality", () => {
    expect(
      buildImageMogr2({ width: 400, height: 300, format: "avif", quality: 90 }),
    ).toBe("imageMogr2/thumbnail/400x300/format/avif/quality/90");
  });
});

// ---------------------------------------------------------------------------
// parseImageMogr2
// ---------------------------------------------------------------------------

describe("parseImageMogr2", () => {
  it("returns empty object for empty string", () => {
    expect(parseImageMogr2("")).toEqual({});
  });

  it("parses width-only thumbnail", () => {
    expect(parseImageMogr2("imageMogr2/thumbnail/400x")).toEqual({
      width: 400,
    });
  });

  it("parses height-only thumbnail", () => {
    expect(parseImageMogr2("imageMogr2/thumbnail/x300")).toEqual({
      height: 300,
    });
  });

  it("parses width+height thumbnail", () => {
    expect(parseImageMogr2("imageMogr2/thumbnail/400x300")).toEqual({
      width: 400,
      height: 300,
    });
  });

  it("parses format", () => {
    expect(parseImageMogr2("imageMogr2/format/webp")).toEqual({
      format: "webp",
    });
  });

  it("parses quality", () => {
    expect(parseImageMogr2("imageMogr2/quality/85")).toEqual({ quality: 85 });
  });

  it("parses rquality as quality", () => {
    expect(parseImageMogr2("imageMogr2/rquality/75")).toEqual({ quality: 75 });
  });

  it("parses combined operations", () => {
    expect(
      parseImageMogr2("imageMogr2/thumbnail/800x/format/webp/quality/80"),
    ).toEqual({ width: 800, format: "webp", quality: 80 });
  });

  it("ignores unknown tokens", () => {
    expect(parseImageMogr2("imageMogr2/rotate/90/thumbnail/200x")).toEqual({
      width: 200,
    });
  });

  it("handles segment without prefix", () => {
    expect(parseImageMogr2("thumbnail/400x/format/png")).toEqual({
      width: 400,
      format: "png",
    });
  });
});

// ---------------------------------------------------------------------------
// extract
// ---------------------------------------------------------------------------

describe("extract", () => {
  it("returns null for non-COS URL", () => {
    expect(extract(NON_COS_URL)).toBeNull();
  });

  it("returns null for COS URL without imageMogr2", () => {
    expect(extract(BASE_URL)).toBeNull();
  });

  it("returns null for invalid string", () => {
    expect(extract("not-a-url")).toBeNull();
  });

  it("extracts src and operations from a processed URL", () => {
    const url = `${BASE_URL}?imageMogr2/thumbnail/400x/format/webp/quality/85`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.src).toBe(BASE_URL);
    expect(result!.operations).toEqual({
      width: 400,
      format: "webp",
      quality: 85,
    });
  });

  it("extracts from URL with URL-encoded query string", () => {
    const url = `${BASE_URL}?imageMogr2%2Fthumbnail%2F200x%2Fformat%2Fwebp`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.src).toBe(BASE_URL);
    expect(result!.operations).toEqual({ width: 200, format: "webp" });
  });

  it("extracts only first pipeline segment", () => {
    const url = `${BASE_URL}?imageMogr2/thumbnail/200x|imageMogr2/format/avif`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.src).toBe(BASE_URL);
    expect(result!.operations).toEqual({ width: 200 });
  });

  it("preserves path in extracted src", () => {
    const url = `${BASE_PATH_URL}?imageMogr2/format/png`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.src).toBe(BASE_PATH_URL);
  });

  it("accepts URL object", () => {
    const url = new URL(`${BASE_URL}?imageMogr2/thumbnail/300x`);
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.operations).toEqual({ width: 300 });
  });
});

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

describe("generate", () => {
  it("returns original src for non-COS URL", () => {
    expect(generate(NON_COS_URL, { width: 200 })).toBe(NON_COS_URL);
  });

  it("returns base URL for empty operations", () => {
    expect(generate(BASE_URL, {})).toBe(BASE_URL);
  });

  it("generates URL with width", () => {
    expect(generate(BASE_URL, { width: 400 })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/400x`,
    );
  });

  it("generates URL with format", () => {
    expect(generate(BASE_URL, { format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/format/webp`,
    );
  });

  it("generates URL with width + height + format + quality", () => {
    expect(
      generate(BASE_URL, {
        width: 400,
        height: 300,
        format: "avif",
        quality: 90,
      }),
    ).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/400x300/format/avif/quality/90`,
    );
  });

  it("strips existing processing params from src before applying new ones", () => {
    const existing = `${BASE_URL}?imageMogr2/thumbnail/200x/format/jpg`;
    expect(generate(existing, { width: 800, format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/800x/format/webp`,
    );
  });

  it("generates URL preserving path", () => {
    expect(generate(BASE_PATH_URL, { format: "png" })).toBe(
      `${BASE_PATH_URL}?imageMogr2/format/png`,
    );
  });
});

// ---------------------------------------------------------------------------
// transform
// ---------------------------------------------------------------------------

describe("transform", () => {
  it("returns original src for non-COS URL", () => {
    expect(transform(NON_COS_URL, { width: 200 })).toBe(NON_COS_URL);
  });

  it("generates URL when src has no existing processing", () => {
    expect(transform(BASE_URL, { width: 800, format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/800x/format/webp`,
    );
  });

  it("merges new operations on top of existing ones", () => {
    const existing = `${BASE_URL}?imageMogr2/thumbnail/400x/format/jpg/quality/70`;
    expect(transform(existing, { width: 800, format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/800x/format/webp/quality/70`,
    );
  });

  it("new operations override existing ones", () => {
    const existing = `${BASE_URL}?imageMogr2/format/jpg/quality/80`;
    expect(transform(existing, { format: "avif", quality: 90 })).toBe(
      `${BASE_URL}?imageMogr2/format/avif/quality/90`,
    );
  });

  it("accepts URL object as src", () => {
    const url = new URL(BASE_URL);
    expect(transform(url, { width: 200 })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/200x`,
    );
  });

  it("round-trip: extract → generate preserves operations", () => {
    const ops: QCloudCosOperations = {
      width: 640,
      height: 480,
      format: "webp",
      quality: 85,
    };
    const url = generate(BASE_URL, ops);
    const extracted = extract(url);
    expect(extracted).not.toBeNull();
    expect(extracted!.operations).toEqual(ops);
  });

  it("supports advanced compression formats (tpg, svgc, heif)", () => {
    for (const fmt of ["tpg", "svgc", "heif"] as const) {
      expect(transform(BASE_URL, { format: fmt })).toBe(
        `${BASE_URL}?imageMogr2/format/${fmt}`,
      );
    }
  });
});
