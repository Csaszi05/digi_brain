# Assets

Brand visual assets for DigiBrain.

- `logo.svg` — full lockup: DB monogram glyph + "DigiBrain" wordmark. Wordmark uses `currentColor` so it inverts cleanly between dark/light surfaces.
- `glyph.svg` — DB monogram only (32×32). Use as the favicon-style mark in compact contexts (sidebar header when collapsed, browser tabs).
- `favicon.svg` — 64×64 version for `<link rel="icon">`.

## Icon set

DigiBrain does not ship a custom icon set. All chrome icons come from **lucide** (matching `lucide-react` in production). For HTML previews use the UMD bundle:

```html
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="layout-dashboard" stroke-width="1.5"></i>
<script>lucide.createIcons();</script>
```

Stroke width is overridden to **1.5** project-wide. See README.md → ICONOGRAPHY for the canonical icon-per-surface map.
