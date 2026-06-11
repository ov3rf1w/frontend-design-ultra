# Performance And Core Web Vitals Recipes

Use when `/performance`, `/verify`, `/landing`, `/ecommerce`, `/mobile`, media-heavy pages, or 3D/motion appears.

## Targets

- LCP <= 2.5s
- INP <= 200ms
- CLS <= 0.1

## LCP Debug

Break LCP into:

- TTFB
- resource load delay
- resource load duration
- element render delay

Fixes:

- make hero/LCP image discoverable in HTML
- prioritize LCP image
- use correct dimensions and `sizes`
- avoid lazy-loading above-fold hero media
- reduce render-blocking CSS/JS
- improve TTFB/CDN/cache

## INP Debug

Fixes:

- split long tasks
- remove unnecessary JS
- lazy-load non-critical widgets
- avoid heavy hydration for static sections
- debounce expensive handlers
- keep animation work off layout properties

## CLS Debug

Fixes:

- set image/video dimensions or aspect-ratio
- reserve ad/embed/widget space
- avoid late font metric shifts
- avoid layout-property animations
- avoid injecting banners above content without reserved space

## Media Budget

- video hero: poster, muted, metadata preload, compressed WebM/MP4 fallback
- image hero: responsive source, explicit dimensions, `sizes`, modern format
- 3D/canvas: lazy load, static poster fallback, disable or simplify on mobile/reduced motion

