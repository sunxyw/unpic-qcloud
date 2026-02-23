# unpic-qcloud

[![npm version](https://img.shields.io/npm/v/unpic-qcloud.svg)](https://www.npmjs.com/package/unpic-qcloud)
[![CI](https://github.com/sunxyw/unpic-qcloud/actions/workflows/ci.yml/badge.svg)](https://github.com/sunxyw/unpic-qcloud/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An [unpic](https://unpic.pics) image provider for the [Tencent Cloud COS Image Processing API](https://cloud.tencent.com/document/product/436/113295) (`imageMogr2`).

## Features

- Transform COS image URLs with resize, crop, format conversion, quality control, and more
- Supports the full [`imageMogr2`](https://cloud.tencent.com/document/product/436/113295) operation set
- Works with both standard COS endpoints (`cos.{region}.myqcloud.com`) and CI endpoints (`pic.{region}.myqcloud.com`)
- Merge new operations on top of existing URL parameters without losing context
- Fully typed with TypeScript

## Installation

```sh
npm install unpic-qcloud
```

`unpic` is a peer dependency. If you use the `transform` function with the `@unpic/core` transformer API, install it too:

```sh
npm install unpic
```

## Usage

### `transform(src, operations)` — primary API

The `transform` function is the main entry point. It merges new operations on top of any existing `imageMogr2` parameters already present on the URL.

```ts
import { transform } from "unpic-qcloud";

// Basic resize
transform("https://bucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg", {
  width: 800,
});
// → "https://bucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg?imageMogr2/thumbnail/800x"

// Resize + format conversion + quality
transform("https://bucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg", {
  width: 800,
  format: "webp",
  quality: 85,
});
// → "https://...?imageMogr2/thumbnail/800x/format/webp/quality/85"

// CSS object-fit: cover equivalent
transform("https://bucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg", {
  width: 400,
  height: 300,
  thumbnailMode: "cover",
});
// → "https://...?imageMogr2/crop/400x300"

// Merge onto an existing processed URL
transform(
  "https://bucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg?imageMogr2/thumbnail/400x/format/jpg/quality/70",
  { width: 800, format: "webp" },
);
// → "https://...?imageMogr2/thumbnail/800x/format/webp/quality/70"
```

Non-COS URLs are returned unchanged, making it safe to use as a universal transformer.

### `generate(src, operations)` — build a URL from scratch

Generates a COS processing URL from a base object URL. Any existing processing parameters on `src` are discarded.

```ts
import { generate } from "unpic-qcloud";

generate("https://bucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg", {
  width: 400,
  height: 300,
  format: "avif",
  quality: 90,
});
// → "https://...?imageMogr2/thumbnail/400x300/format/avif/quality/90"
```

### `extract(url)` — parse a processed URL

Extracts the base URL and existing operations from an already-processed COS URL.

```ts
import { extract } from "unpic-qcloud";

const result = extract(
  "https://bucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg?imageMogr2/thumbnail/400x/format/webp/quality/85",
);
// result.src       → "https://bucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg"
// result.operations → { width: 400, format: "webp", quality: 85 }
```

Returns `null` when the URL is not a COS URL or does not contain `imageMogr2` parameters.

### `isCosUrl(url)` — detect COS URLs

```ts
import { isCosUrl } from "unpic-qcloud";

isCosUrl("https://bucket-1250000000.cos.ap-beijing.myqcloud.com/photo.jpg"); // true
isCosUrl("https://example.com/photo.jpg"); // false
```

## Operations reference

| Field | Type | Description |
|---|---|---|
| `width` | `number` | Target width in pixels |
| `height` | `number` | Target height in pixels |
| `thumbnailMode` | `"fit" \| "cover" \| "force" \| "shrinkOnly" \| "enlargeOnly"` | How width/height are applied (default: `"fit"`) |
| `format` | `QCloudCosFormat` | Output format (`jpg`, `png`, `webp`, `gif`, `avif`, …) |
| `quality` | `number \| string` | Absolute quality 0–100. Append `"!"` to force (e.g. `"90!"`) |
| `rquality` | `number` | Relative quality 0–100 (result = original × rquality / 100) |
| `lquality` | `number` | Minimum quality 0–100 |
| `autoOrient` | `boolean` | Auto-orient based on EXIF data (recommended before WebP conversion) |
| `rotate` | `number` | Clockwise rotation in degrees (0–360) |
| `flip` | `"vertical" \| "horizontal"` | Mirror flip direction |
| `iradius` | `number` | Inner-circle crop radius in pixels |
| `rradius` | `number` | Round-corner crop radius in pixels |
| `ignoreError` | `boolean` | Return original image instead of error on processing failures |

### `thumbnailMode` values

| Value | Behaviour | COS parameter |
|---|---|---|
| `"fit"` (default) | Fit within `WxH`, preserving aspect ratio | `thumbnail/WxH` |
| `"cover"` | Scale to fill `WxH`, center-crop excess | `crop/WxH` |
| `"force"` | Force exact `WxH`, ignoring aspect ratio | `thumbnail/WxH!` |
| `"shrinkOnly"` | Fit within `WxH` only if the image is larger | `thumbnail/WxH>` |
| `"enlargeOnly"` | Fit within `WxH` only if the image is smaller | `thumbnail/WxH<` |

### Supported formats

Standard formats work on all buckets: `jpg`/`jpeg`, `png`, `webp`, `gif`, `bmp`, `tiff`, `apng`.

Advanced compression formats require [CI Advanced Compression](https://cloud.tencent.com/document/product/436/119347) to be enabled on the bucket: `avif`, `heif`, `heic`, `tpg`, `astc`.

Use `"src"` to keep the original format.

## Using with `@unpic/core`

```ts
import { transform } from "unpic-qcloud";

// Pass as a custom transformer
const url = transform(src, { width: 800, format: "webp", autoOrient: true });
```

## License

MIT
