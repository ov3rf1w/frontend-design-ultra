# Motion Lenses

Use separate paths for motion creation and motion audit.

## Contents

- Lens Weighting
- Create Mode
- Motion Scale
- Code Recipes
- Static Render And Reduced-Motion Traps
- Motion Anti-Patterns
- Audit Mode

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

React + GSAP ScrollTrigger with scoped selectors, reduced-motion final states, and lifecycle cleanup:

```jsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function StoryPanel() {
  const root = useRef(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add({
      desktop: "(min-width: 800px)",
      reduce: "(prefers-reduced-motion: reduce)",
    }, ({ conditions }) => {
      const { desktop, reduce } = conditions;

      if (reduce) {
        gsap.set("[data-reveal]", { clearProps: "all" });
        return;
      }

      gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: desktop ? "+=1400" : "+=500",
          scrub: 0.6,
          pin: desktop ? root.current : false,
          anticipatePin: 1,
        },
      })
      .from(".bg", { yPercent: -20, ease: "none" }, 0)
      .from(".title", { autoAlpha: 0, y: 24 }, 0);
    });

    return () => mm.revert();
  }, { scope: root });

  return (
    <section ref={root} className="panel">
      <div className="bg" aria-hidden="true" />
      <h2 className="title" data-reveal>Readable before animation</h2>
    </section>
  );
}
```

`useGSAP` scopes selectors to `root` and reverts animations and ScrollTriggers on unmount; `matchMedia().revert()` removes condition-specific work. Do not kill global triggers owned by other components. Animate children inside pinned sections, not the pinned wrapper itself. If `@gsap/react` is not installed and dependency changes are not approved, use a scoped `gsap.context()` inside `useLayoutEffect` with `context.revert()` cleanup.

Motion shared layout:

```jsx
const reduceMotion = useReducedMotion();

<AnimatePresence>
  {selectedId && (
    <motion.div
      key={selectedId}
      layoutId={`card-${selectedId}`}
      layout
      transition={reduceMotion ? { duration: 0 } : { type: "spring", duration: 0.4 }}
    />
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
const tiles = container.querySelectorAll(".tile");
const state = Flip.getState(tiles);
reorderDOM();
Flip.from(state, { duration: 0.6, absolute: true, scale: false, ease: "power2.out" });
```

View Transition fallback:

```js
import { flushSync } from "react-dom";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion && document.startViewTransition) {
  document.startViewTransition(() => {
    flushSync(() => setRoute(nextRoute));
  });
} else {
  setRoute(nextRoute);
}
```

Targeted reduced-motion baseline:

```css
[data-reveal] {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    scroll-behavior: auto;
  }

  [data-reveal], [data-reveal]::before, [data-reveal]::after {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
    clip-path: none !important;
  }
}
```

Runtime reduced-motion should still set final visible states, not leave pre-animation opacity/transform. Avoid universal `*` duration overrides: they can disturb native controls, third-party widgets, animation events, and stateful transitions unrelated to decorative motion.

## Static Render And Reduced-Motion Traps

- Do not leave important content at `opacity: 0`, offscreen transform, or fully clipped when motion is disabled or a viewport trigger never fires.
- For SSR/static export, prefer reveal patterns where the no-JS/no-motion state is visible, or make reduced-motion set the final visible state immediately.
- Avoid mixed-unit `clip-path` interpolation. Use consistent units or prefer scale/opacity with visible fallback.
- Gate hover-only choreography with `@media (hover:hover) and (pointer:fine)`.
- Pinned scenes must show useful content immediately; never start with a blank pin that waits for scroll progress.
- On mobile, re-author scroll scenes as compact stacked content unless the interaction is intentionally touch-safe.

## Motion Anti-Patterns

- no cleanup for timelines/triggers on unmount
- global `ScrollTrigger.getAll().forEach(trigger => trigger.kill())` cleanup that destroys another component's work
- global selectors in component motion without a scoped root/context
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
