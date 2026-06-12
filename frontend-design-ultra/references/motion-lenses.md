# Motion Lenses

Use separate paths for motion creation and motion audit.

## Lens Weighting

| Context | Primary | Secondary | Avoid |
|---|---|---|---|
| Dashboard/productivity | restraint | polish | playful surprise |
| SaaS/product marketing | polish | restraint | scroll theatre |
| Portfolio/campaign | experiment | polish | hidden content |
| E-commerce | restraint | polish | motion near checkout friction |
| Playful apps | experiment | polish | sterile minimalism |

## Create Mode

Before adding motion: identify the state change, decide if motion helps orientation/hierarchy/causality/delight, pick one recipe, use a shared duration/easing scale, add reduced-motion final state, and verify no CLS.

Recipes: enter/exit, state swap, list reorder, drawer/modal, toast, hover/focus, scroll chapter, canvas/3D.

Motion must be information architecture. It earns its place only when it improves orientation, hierarchy, causality, state clarity, pacing, or brand memory.

## Motion Scale

- Micro: 100-160ms, controls and feedback.
- Small: 180-260ms, menus, tabs, cards, state swaps.
- Medium: 300-500ms, section reveals and page transitions.
- Cinematic: 600ms+, only for hero/signature moments and never blocking reading.

Use one easing family per surface. Springs should feel weighted, not bouncy by default.

## Code Recipes

GSAP ScrollTrigger:

```js
gsap.timeline({
  scrollTrigger: {
    trigger: ".panel",
    start: "top top",
    end: "+=1400",
    scrub: 0.6,
    pin: ".panel",
    anticipatePin: 1,
  },
})
.to(".bg", { y: "-20%", ease: "none" }, 0)
.to(".title", { opacity: 1 }, "<");
```

Animate children inside pinned sections, not the pinned wrapper itself.

GSAP responsive/reduced-motion:

```js
const mm = gsap.matchMedia();
mm.add({
  isDesktop: "(min-width: 800px)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
}, ({ conditions }) => {
  const { isDesktop, reduceMotion } = conditions;
  gsap.to(".hero", { duration: reduceMotion ? 0 : 1, x: isDesktop ? 120 : 60 });
});
```

Motion shared layout:

```jsx
<AnimatePresence>
  {selectedId && (
    <motion.div layoutId={`card-${selectedId}`} layout transition={{ type: "spring", duration: 0.4 }} />
  )}
</AnimatePresence>
```

Keep `AnimatePresence` mounted above the conditional. Use `LayoutGroup` for coordinated layout + exit choreography.

Motion scroll progress:

```jsx
const { scrollYProgress } = useScroll();
return <motion.div style={{ scaleX: scrollYProgress, transformOrigin: "0 0" }} />;
```

CSS scroll timeline:

```css
.scroller { scroll-timeline: --story; }
.card {
  animation: cardIn 1ms linear;
  animation-timeline: --story;
  animation-range: entry 0% exit 100%;
}
@supports not (scroll-timeline: --story) {
  .card { animation: none; opacity: 1; transform: none; }
}
```

Do not rely on scroll-driven CSS without fallback.

GSAP Flip:

```js
const state = Flip.getState(".tile");
reorderDOM();
Flip.from(state, { duration: 0.6, absolute: true, scale: false, ease: "power2.out" });
```

View Transition fallback:

```js
if (document.startViewTransition) {
  document.startViewTransition(() => setRoute(nextRoute));
} else {
  setRoute(nextRoute);
}
```

Reduced motion baseline:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

Runtime reduced-motion should still set final visible states, not leave pre-animation opacity/transform.

## Static Render And Reduced-Motion Traps

- Do not leave important content at `opacity: 0`, offscreen transform, or fully clipped when motion is disabled or a viewport trigger never fires.
- For SSR/static export, prefer reveal patterns where the no-JS/no-motion state is visible, or make reduced-motion set the final visible state immediately.
- Avoid mixed-unit `clip-path` interpolation. Use consistent units or prefer scale/opacity with visible fallback.
- Gate hover-only choreography with `@media (hover:hover) and (pointer:fine)`.
- Pinned scenes must show useful content immediately; never start with a blank pin that waits for scroll progress.
- On mobile, re-author scroll scenes as compact stacked content unless the interaction is intentionally touch-safe.

## Motion Anti-Patterns

- no cleanup for timelines/triggers on unmount
- `will-change` applied globally
- layout properties animated during scroll
- multiple active elements sharing one `view-transition-name`
- unsupported `scroll-timeline` used without fallback
- pinned scroll scene with no immediate readable content

## Audit Mode

Find motion gaps and motion slop:

- conditional render with no enter/exit handling
- instant state swap where orientation is lost
- hover-scale on every card
- stagger spam
- pulsing indicator with no information value
- scroll pin with blank state
- animated layout property causing shift
- missing reduced-motion completion

Report Critical when motion breaks comprehension, accessibility, performance, or navigation. Report Important when it weakens polish but does not block use.
