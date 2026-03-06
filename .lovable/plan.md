

# Plan: Increase Image Upload File Size Limits

## Current Limits
- Card Cover: 500 KB
- Hero Banner: 800 KB
- Avatar: 100 KB
- Tournament Hero: 500 KB
- General: 800 KB

## Proposed Limits
Increase all presets significantly to accommodate higher-quality images:

| Preset | Current | New |
|---|---|---|
| Card Cover | 500 KB | 5 MB (5120 KB) |
| Hero Banner | 800 KB | 8 MB (8192 KB) |
| Avatar | 100 KB | 2 MB (2048 KB) |
| Tournament Hero | 500 KB | 5 MB (5120 KB) |
| General | 800 KB | 10 MB (10240 KB) |

## Changes
**Single file**: `src/lib/imageValidation.ts` -- update `maxSizeKB` values in each preset within `IMAGE_PRESETS`.

No database or other file changes needed. The Admin Settings page already allows dynamic overrides via `app_settings`, so these new defaults serve as the baseline.

