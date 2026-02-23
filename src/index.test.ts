import { describe, expect, it } from "vitest";
import {
  buildImageMogr2,
  extract,
  generate,
  isCosUrl,
  parseImageMogr2,
  transform,
  type QCloudCosOperations,
  type QCloudCosOptions,
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

  // --- Resize ---
  it("builds thumbnail with width only", () => {
    expect(buildImageMogr2({ width: 400 })).toBe("imageMogr2/thumbnail/400x");
  });

  it("builds thumbnail with height only", () => {
    expect(buildImageMogr2({ height: 300 })).toBe(
      "imageMogr2/thumbnail/x300",
    );
  });

  it("builds thumbnail with both width and height (fit, default)", () => {
    expect(buildImageMogr2({ width: 400, height: 300 })).toBe(
      "imageMogr2/thumbnail/400x300",
    );
  });

  it("builds crop for cover mode (scale + center-crop)", () => {
    expect(
      buildImageMogr2({ width: 400, height: 300, thumbnailMode: "cover" }),
    ).toBe("imageMogr2/crop/400x300");
  });

  it("builds thumbnail with force mode (ignore aspect ratio)", () => {
    expect(
      buildImageMogr2({ width: 400, height: 300, thumbnailMode: "force" }),
    ).toBe("imageMogr2/thumbnail/400x300!");
  });

  it("builds thumbnail with shrinkOnly mode", () => {
    expect(
      buildImageMogr2({ width: 400, height: 300, thumbnailMode: "shrinkOnly" }),
    ).toBe("imageMogr2/thumbnail/400x300>");
  });

  it("builds thumbnail with enlargeOnly mode", () => {
    expect(
      buildImageMogr2({
        width: 400,
        height: 300,
        thumbnailMode: "enlargeOnly",
      }),
    ).toBe("imageMogr2/thumbnail/400x300<");
  });

  // --- Circle / round corner ---
  it("builds iradius (inner circle crop)", () => {
    expect(buildImageMogr2({ iradius: 200 })).toBe("imageMogr2/iradius/200");
  });

  it("builds rradius (round corner crop)", () => {
    expect(buildImageMogr2({ rradius: 100 })).toBe("imageMogr2/rradius/100");
  });

  // --- Orientation / rotation / flip ---
  it("builds auto-orient flag", () => {
    expect(buildImageMogr2({ autoOrient: true })).toBe(
      "imageMogr2/auto-orient",
    );
  });

  it("builds rotate", () => {
    expect(buildImageMogr2({ rotate: 90 })).toBe("imageMogr2/rotate/90");
  });

  it("builds flip vertical", () => {
    expect(buildImageMogr2({ flip: "vertical" })).toBe(
      "imageMogr2/flip/vertical",
    );
  });

  it("builds flip horizontal", () => {
    expect(buildImageMogr2({ flip: "horizontal" })).toBe(
      "imageMogr2/flip/horizontal",
    );
  });

  // --- Format ---
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

  // --- Quality ---
  it("builds absolute quality", () => {
    expect(buildImageMogr2({ quality: 85 })).toBe("imageMogr2/quality/85");
  });

  it("builds relative quality (rquality)", () => {
    expect(buildImageMogr2({ rquality: 80 })).toBe("imageMogr2/rquality/80");
  });

  it("builds minimum quality (lquality)", () => {
    expect(buildImageMogr2({ lquality: 60 })).toBe("imageMogr2/lquality/60");
  });

  // --- Ignore error ---
  it("builds ignore-error flag", () => {
    expect(buildImageMogr2({ ignoreError: true })).toBe(
      "imageMogr2/ignore-error/1",
    );
  });

  // --- Combined ---
  it("builds combined resize + format + quality", () => {
    expect(buildImageMogr2({ width: 800, format: "webp", quality: 80 })).toBe(
      "imageMogr2/thumbnail/800x|imageMogr2/format/webp|imageMogr2/quality/80",
    );
  });

  it("builds combined width + height + format + quality", () => {
    expect(
      buildImageMogr2({ width: 400, height: 300, format: "avif", quality: 90 }),
    ).toBe("imageMogr2/thumbnail/400x300|imageMogr2/format/avif|imageMogr2/quality/90");
  });

  it("builds auto-orient + format (WebP recommended pattern)", () => {
    expect(
      buildImageMogr2({ width: 800, autoOrient: true, format: "webp" }),
    ).toBe("imageMogr2/thumbnail/800x|imageMogr2/auto-orient|imageMogr2/format/webp");
  });

  it("builds full complex operation", () => {
    expect(
      buildImageMogr2({
        width: 400,
        height: 300,
        thumbnailMode: "cover",
        autoOrient: true,
        format: "webp",
        quality: 85,
        ignoreError: true,
      }),
    ).toBe(
      "imageMogr2/crop/400x300|imageMogr2/auto-orient|imageMogr2/format/webp|imageMogr2/quality/85|imageMogr2/ignore-error/1",
    );
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

  it("parses width+height thumbnail (fit mode — thumbnailMode not set)", () => {
    const result = parseImageMogr2("imageMogr2/thumbnail/400x300");
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
    expect(result.thumbnailMode).toBeUndefined();
  });

  it("parses thumbnail with force modifier (!)", () => {
    expect(parseImageMogr2("imageMogr2/thumbnail/400x300!")).toEqual({
      width: 400,
      height: 300,
      thumbnailMode: "force",
    });
  });

  it("parses thumbnail with shrinkOnly modifier (>)", () => {
    expect(parseImageMogr2("imageMogr2/thumbnail/400x300>")).toEqual({
      width: 400,
      height: 300,
      thumbnailMode: "shrinkOnly",
    });
  });

  it("parses thumbnail with enlargeOnly modifier (<)", () => {
    expect(parseImageMogr2("imageMogr2/thumbnail/400x300<")).toEqual({
      width: 400,
      height: 300,
      thumbnailMode: "enlargeOnly",
    });
  });

  it("parses crop (cover mode)", () => {
    expect(parseImageMogr2("imageMogr2/crop/300x400")).toEqual({
      width: 300,
      height: 400,
      thumbnailMode: "cover",
    });
  });

  it("parses iradius", () => {
    expect(parseImageMogr2("imageMogr2/iradius/200")).toEqual({ iradius: 200 });
  });

  it("parses rradius", () => {
    expect(parseImageMogr2("imageMogr2/rradius/100")).toEqual({ rradius: 100 });
  });

  it("parses auto-orient", () => {
    expect(parseImageMogr2("imageMogr2/auto-orient")).toEqual({
      autoOrient: true,
    });
  });

  it("parses rotate", () => {
    expect(parseImageMogr2("imageMogr2/rotate/90")).toEqual({ rotate: 90 });
  });

  it("parses flip vertical", () => {
    expect(parseImageMogr2("imageMogr2/flip/vertical")).toEqual({
      flip: "vertical",
    });
  });

  it("parses flip horizontal", () => {
    expect(parseImageMogr2("imageMogr2/flip/horizontal")).toEqual({
      flip: "horizontal",
    });
  });

  it("parses format", () => {
    expect(parseImageMogr2("imageMogr2/format/webp")).toEqual({
      format: "webp",
    });
  });

  it("parses absolute quality", () => {
    expect(parseImageMogr2("imageMogr2/quality/85")).toEqual({ quality: 85 });
  });

  it("parses forced quality string with ! suffix", () => {
    expect(parseImageMogr2("imageMogr2/quality/90!")).toEqual({ quality: "90!" });
  });

  it("parses rquality", () => {
    expect(parseImageMogr2("imageMogr2/rquality/75")).toEqual({
      rquality: 75,
    });
  });

  it("parses lquality", () => {
    expect(parseImageMogr2("imageMogr2/lquality/60")).toEqual({
      lquality: 60,
    });
  });

  it("parses ignore-error", () => {
    expect(parseImageMogr2("imageMogr2/ignore-error/1")).toEqual({
      ignoreError: true,
    });
  });

  it("parses combined operations", () => {
    expect(
      parseImageMogr2(
        "imageMogr2/thumbnail/800x/auto-orient/format/webp/quality/80",
      ),
    ).toEqual({ width: 800, autoOrient: true, format: "webp", quality: 80 });
  });

  it("parses crop + auto-orient + format + rquality", () => {
    expect(
      parseImageMogr2(
        "imageMogr2/crop/400x300/auto-orient/format/webp/rquality/80",
      ),
    ).toEqual({
      width: 400,
      height: 300,
      thumbnailMode: "cover",
      autoOrient: true,
      format: "webp",
      rquality: 80,
    });
  });

  it("ignores unknown tokens", () => {
    expect(
      parseImageMogr2("imageMogr2/watermark/1/thumbnail/200x"),
    ).toEqual({ width: 200 });
  });

  it("handles segment without imageMogr2 prefix", () => {
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

  it("extracts rquality as its own field (not quality)", () => {
    const url = `${BASE_URL}?imageMogr2/thumbnail/800x/format/webp/rquality/80`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.operations.rquality).toBe(80);
    expect(result!.operations.quality).toBeUndefined();
  });

  it("extracts auto-orient flag", () => {
    const url = `${BASE_URL}?imageMogr2/auto-orient/format/webp`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.operations.autoOrient).toBe(true);
    expect(result!.operations.format).toBe("webp");
  });

  it("extracts from URL with URL-encoded query string", () => {
    const url = `${BASE_URL}?imageMogr2%2Fthumbnail%2F200x%2Fformat%2Fwebp`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.src).toBe(BASE_URL);
    expect(result!.operations).toEqual({ width: 200, format: "webp" });
  });

  it("merges all imageMogr2 pipeline segments", () => {
    const url = `${BASE_URL}?imageMogr2/thumbnail/200x|imageMogr2/format/avif`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.src).toBe(BASE_URL);
    expect(result!.operations).toEqual({ width: 200, format: "avif" });
    expect(result!.pipelineSegments).toEqual([]);
  });

  it("preserves non-imageMogr2 pipeline segments", () => {
    const url = `${BASE_URL}?imageMogr2/thumbnail/200x|watermark/2/text/dGVzdA==`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result!.src).toBe(BASE_URL);
    expect(result!.operations).toEqual({ width: 200 });
    expect(result!.pipelineSegments).toEqual(["watermark/2/text/dGVzdA=="]);
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

  it("generates URL with cover crop mode", () => {
    expect(
      generate(BASE_URL, { width: 400, height: 300, thumbnailMode: "cover" }),
    ).toBe(`${BASE_URL}?imageMogr2/crop/400x300`);
  });

  it("generates URL with width + height + format + quality", () => {
    expect(
      generate(BASE_URL, {
        width: 400,
        height: 300,
        format: "avif",
        quality: 90,
      }),
    ).toBe(`${BASE_URL}?imageMogr2/thumbnail/400x300|imageMogr2/format/avif|imageMogr2/quality/90`);
  });

  it("generates URL with autoOrient + format (WebP pattern)", () => {
    expect(generate(BASE_URL, { autoOrient: true, format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/auto-orient|imageMogr2/format/webp`,
    );
  });

  it("generates URL with rquality", () => {
    expect(generate(BASE_URL, { rquality: 80 })).toBe(
      `${BASE_URL}?imageMogr2/rquality/80`,
    );
  });

  it("generates URL with lquality", () => {
    expect(generate(BASE_URL, { lquality: 60 })).toBe(
      `${BASE_URL}?imageMogr2/lquality/60`,
    );
  });

  it("generates URL with iradius", () => {
    expect(generate(BASE_URL, { iradius: 200 })).toBe(
      `${BASE_URL}?imageMogr2/iradius/200`,
    );
  });

  it("generates URL with rradius", () => {
    expect(generate(BASE_URL, { rradius: 100 })).toBe(
      `${BASE_URL}?imageMogr2/rradius/100`,
    );
  });

  it("generates URL with rotate", () => {
    expect(generate(BASE_URL, { rotate: 90 })).toBe(
      `${BASE_URL}?imageMogr2/rotate/90`,
    );
  });

  it("generates URL with flip", () => {
    expect(generate(BASE_URL, { flip: "horizontal" })).toBe(
      `${BASE_URL}?imageMogr2/flip/horizontal`,
    );
  });

  it("generates URL with ignore-error", () => {
    expect(generate(BASE_URL, { ignoreError: true, width: 400 })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/400x|imageMogr2/ignore-error/1`,
    );
  });

  it("strips existing processing params from src before applying new ones", () => {
    const existing = `${BASE_URL}?imageMogr2/thumbnail/200x/format/jpg`;
    expect(generate(existing, { width: 800, format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/800x|imageMogr2/format/webp`,
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
      `${BASE_URL}?imageMogr2/thumbnail/800x|imageMogr2/format/webp`,
    );
  });

  it("merges new operations on top of existing ones", () => {
    const existing = `${BASE_URL}?imageMogr2/thumbnail/400x|imageMogr2/format/jpg|imageMogr2/quality/70`;
    expect(transform(existing, { width: 800, format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/800x|imageMogr2/format/webp|imageMogr2/quality/70`,
    );
  });

  it("new operations override existing ones", () => {
    const existing = `${BASE_URL}?imageMogr2/format/jpg|imageMogr2/quality/80`;
    expect(transform(existing, { format: "avif", quality: 90 })).toBe(
      `${BASE_URL}?imageMogr2/format/avif|imageMogr2/quality/90`,
    );
  });

  it("merges rquality independently of quality", () => {
    const existing = `${BASE_URL}?imageMogr2/format/jpg|imageMogr2/rquality/80`;
    const result = transform(existing, { format: "webp" });
    expect(result).toBe(
      `${BASE_URL}?imageMogr2/format/webp|imageMogr2/rquality/80`,
    );
  });

  it("merges autoOrient into existing ops", () => {
    const existing = `${BASE_URL}?imageMogr2/thumbnail/400x|imageMogr2/format/jpg`;
    expect(transform(existing, { autoOrient: true, format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/400x|imageMogr2/auto-orient|imageMogr2/format/webp`,
    );
  });

  it("merges thumbnailMode override", () => {
    const existing = `${BASE_URL}?imageMogr2/thumbnail/400x300`;
    expect(transform(existing, { thumbnailMode: "cover" })).toBe(
      `${BASE_URL}?imageMogr2/crop/400x300`,
    );
  });

  it("accepts URL object as src", () => {
    const url = new URL(BASE_URL);
    expect(transform(url, { width: 200 })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/200x`,
    );
  });

  it("round-trip: extract → generate preserves all operations", () => {
    const ops: QCloudCosOperations = {
      width: 640,
      height: 480,
      thumbnailMode: "cover",
      autoOrient: true,
      format: "webp",
      quality: 85,
      ignoreError: true,
    };
    const url = generate(BASE_URL, ops);
    const extracted = extract(url);
    expect(extracted).not.toBeNull();
    expect(extracted!.operations).toEqual(ops);
  });

  it("round-trip with rquality and lquality", () => {
    const ops: QCloudCosOperations = {
      width: 800,
      format: "webp",
      rquality: 80,
      lquality: 60,
    };
    const url = generate(BASE_URL, ops);
    const extracted = extract(url);
    expect(extracted).not.toBeNull();
    expect(extracted!.operations).toEqual(ops);
  });

  it("supports advanced compression formats (tpg, astc, heif)", () => {
    for (const fmt of ["tpg", "astc", "heif"] as const) {
      expect(transform(BASE_URL, { format: fmt })).toBe(
        `${BASE_URL}?imageMogr2/format/${fmt}`,
      );
    }
  });

  it("preserves non-imageMogr2 pipeline segments when transforming", () => {
    const existing = `${BASE_URL}?imageMogr2/thumbnail/200x|watermark/2/text/dGVzdA==`;
    expect(transform(existing, { width: 800, format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/800x|imageMogr2/format/webp|watermark/2/text/dGVzdA==`,
    );
  });

  it("merges multiple imageMogr2 segments and preserves other pipeline segments", () => {
    const existing = `${BASE_URL}?imageMogr2/thumbnail/200x|imageMogr2/format/jpg|watermark/2/text/dGVzdA==`;
    expect(transform(existing, { format: "webp" })).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/200x|imageMogr2/format/webp|watermark/2/text/dGVzdA==`,
    );
  });
});

// ---------------------------------------------------------------------------
// options (global defaults)
// ---------------------------------------------------------------------------

describe("options (global defaults)", () => {
  // --- extract ---
  it("extract returns an options field", () => {
    const url = `${BASE_URL}?imageMogr2/thumbnail/400x|imageMogr2/format/webp`;
    const result = extract(url);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("options");
    expect(result!.options).toEqual({});
  });

  // --- generate with options ---
  it("generate applies option format when not in operations", () => {
    const opts: QCloudCosOptions = { format: "webp" };
    expect(generate(BASE_URL, { width: 400 }, opts)).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/400x|imageMogr2/format/webp`,
    );
  });

  it("generate: operation format overrides option format", () => {
    const opts: QCloudCosOptions = { format: "webp" };
    expect(generate(BASE_URL, { format: "avif" }, opts)).toBe(
      `${BASE_URL}?imageMogr2/format/avif`,
    );
  });

  it("generate applies option quality when not in operations", () => {
    const opts: QCloudCosOptions = { quality: 80 };
    expect(generate(BASE_URL, { width: 600 }, opts)).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/600x|imageMogr2/quality/80`,
    );
  });

  it("generate applies multiple option defaults", () => {
    const opts: QCloudCosOptions = { format: "webp", quality: 85, autoOrient: true };
    expect(generate(BASE_URL, { width: 800 }, opts)).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/800x|imageMogr2/auto-orient|imageMogr2/format/webp|imageMogr2/quality/85`,
    );
  });

  it("generate with no operations but option defaults still produces URL", () => {
    const opts: QCloudCosOptions = { format: "webp" };
    expect(generate(BASE_URL, {}, opts)).toBe(
      `${BASE_URL}?imageMogr2/format/webp`,
    );
  });

  it("generate returns base URL when no operations and no options", () => {
    expect(generate(BASE_URL, {})).toBe(BASE_URL);
  });

  // --- transform with options ---
  it("transform applies option format when not in operations or existing URL", () => {
    const opts: QCloudCosOptions = { format: "webp" };
    expect(transform(BASE_URL, { width: 400 }, opts)).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/400x|imageMogr2/format/webp`,
    );
  });

  it("transform: existing URL format overrides option format", () => {
    const existing = `${BASE_URL}?imageMogr2/format/jpg`;
    const opts: QCloudCosOptions = { format: "webp" };
    // Existing URL has format/jpg; option wants webp; existing should win
    expect(transform(existing, {}, opts)).toBe(
      `${BASE_URL}?imageMogr2/format/jpg`,
    );
  });

  it("transform: explicit operation overrides both option and existing URL", () => {
    const existing = `${BASE_URL}?imageMogr2/format/jpg`;
    const opts: QCloudCosOptions = { format: "webp" };
    expect(transform(existing, { format: "avif" }, opts)).toBe(
      `${BASE_URL}?imageMogr2/format/avif`,
    );
  });

  it("transform passes options to generate when src has no existing processing", () => {
    const opts: QCloudCosOptions = { quality: 90 };
    expect(transform(BASE_URL, { width: 800 }, opts)).toBe(
      `${BASE_URL}?imageMogr2/thumbnail/800x|imageMogr2/quality/90`,
    );
  });
});
