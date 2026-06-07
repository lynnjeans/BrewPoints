# /design/assets/ — Logo & icon assets

These SVG files are the canonical BrewPoints brand mark, referenced by Appendix D.6.

## Files

| File | Background | Stroke / fill | Use case |
|---|---|---|---|
| `logo-primary.svg` | `--bp-ink` (#1A1A1A) | `--bp-paper` (#F5F1EA) | **App icon (default)**, PWA manifest 192 / 512, dark splash |
| `logo-light.svg` | `--bp-paper` (#F5F1EA) | `--bp-ink` (#1A1A1A) | Light splash, favicon on light backgrounds, marketing |
| `logo-fern.svg` | `--bp-fern` (#2D5F4F) | `--bp-paper` (#F5F1EA) | Seasonal skin (Waitangi Day, autumn launch) |
| `logo-clay.svg` | `--bp-clay` (#C44A1F) | `--bp-paper` (#F5F1EA) | Celebration skin (anniversary, special events) |
| `logo-glyph.svg` | transparent | `currentColor` | Login page logo, splash centre, staff header — inherits colour from parent |
| `logo-small.svg` | `--bp-ink` | `--bp-paper` | **≤40px only** — favicon, status bar (thicker stroke, no bean centre line) |

## Geometry

All marks share the same single-stroke koru path. Adjusting the path means updating all six files.

```
viewBox: 0 0 180 180  (40 for logo-small.svg)
rect border-radius: 42 (iOS app icon convention, 9 for small)
spiral path: M 0,-58 Q 50,-58 60,0 Q 60,50 12,60 Q -28,60 -32,22 Q -32,-6 -6,-10 Q 16,-10 16,12 Q 16,22 6,22
bean centre: cx=6, cy=22, r=9
bean groove (≥60px only): ellipse rx=3 ry=6, rotated 20° around (6,22)
stroke-width: 9 (≥60px), 2.8 (≤40px)
```

## Usage

### PWA manifest (task 0.2)
```json
{
  "icons": [
    { "src": "/design/assets/logo-primary.svg", "sizes": "192x192 512x512", "type": "image/svg+xml" }
  ]
}
```
If your target platforms need PNG (some Android, older iOS), export `logo-primary.svg` to PNG at 192 and 512 from any vector tool. Keep the SVG as source of truth.

### Splash screen / login page (tasks 5.1, 7.1)
```jsx
import { ReactComponent as Logo } from '/design/assets/logo-glyph.svg';

// On dark splash:
<Logo style={{ color: 'var(--bp-paper)', width: 80 }} />

// On login page (light bg):
<Logo style={{ color: 'var(--bp-ink)', width: 56 }} />
```

The glyph variant uses `currentColor` for both stroke and fill, so parent's `color` controls the mark colour. This avoids shipping four glyph copies for different contexts.

### Favicon
```html
<link rel="icon" type="image/svg+xml" href="/design/assets/logo-small.svg" />
```

## Update policy

If the mark changes (rare — this is brand identity), update all six SVG files in lockstep. Run a visual diff before committing; the spiral curve is a brand element and small tweaks compound.

The Logo is intentionally a single continuous stroke with the bean as terminus — not a stylised flourish. Editors who think the design "lacks polish" and add inner highlights, gradients, or extra ornaments will violate Appendix D.6.
