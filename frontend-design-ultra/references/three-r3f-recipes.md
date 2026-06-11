# 3D, Three.js, And R3F Recipes

Use when `/3d`, WebGL, canvas, product viewer, scroll scene, or interactive hero appears.

## Purpose Gate

Use 3D only when it shows product, place, spatial relationship, interaction, or a memorable brand mechanic. Do not use 3D as filler.

## Performance Rules

- lazy-load canvas and heavy models
- show poster/static fallback before canvas is ready
- use `frameloop="demand"` or equivalent on-demand rendering when scene is mostly static
- avoid React state in high-frequency `useFrame` loops
- mutate refs/deltas for per-frame changes
- reduce draw calls; reuse geometries/materials
- compress textures and models
- lower DPR or quality on mobile
- disable shadows/postprocessing unless they materially improve the scene

## Fallbacks

- reduced motion: static frame or simple transform-free state
- mobile: simplified scene, poster, or non-canvas composition
- low power: no autoplay rotation, no particle fields, no heavy postprocessing

## Verification

Check nonblank canvas, visible subject framing, FPS/perceived smoothness, text readability, mobile fallback, reduced-motion fallback, and no overlay collision.

