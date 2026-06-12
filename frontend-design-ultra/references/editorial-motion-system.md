# Editorial Motion System

Use this for `/motion`, `/motion-high`, `/gsap`, `/framer`, `/awwward`, `/editorial`, `/luxury`, `/portfolio`, and high-end landing work.

## Motion Intent Matrix

Motion must serve one of:

- orientation: where am I in the page or flow
- hierarchy: what matters first
- causality: what changed and why
- continuity: how sections connect
- pacing: when to slow down or accelerate attention
- delight: memorable moment after clarity is solved

If none apply, remove the motion.

## Choreography Layers

Use at most one active layer as the signature:

- Micro: buttons, focus, controls, 100-160ms.
- Component: cards, tabs, drawers, state swaps, 180-260ms.
- Section: reveals, media transitions, proof boards, 300-500ms.
- Signature: hero, scroll chapter, page transition, 600ms+ but never blocking reading.

At most one major focal motion should dominate a viewport. Decorative atmosphere must remain lower priority than narrative and utility.

## GSAP vs Framer

- Use GSAP/ScrollTrigger for scroll chapters, pinned sequences, timeline choreography, SVG/canvas choreography, and precise scrub control.
- Use Framer/Motion for React state transitions, layout shared elements, modal/drawer enter/exit, tabs, cards, and route-level UI transitions.
- Use CSS for simple transitions, hover/focus, reduced-motion-safe reveals, and low-JS sites.
- Do not add a motion dependency for one fade-up.
- Do not let GSAP and Framer control `transform` on the same element.

## Editorial Recipes

- Kinetic type reveal: display text enters as structure; final frame must be readable without motion.
- Scroll chapter: sticky chapter with immediate content; no blank pinned state.
- Image-mask reveal: static image visible by default, mask enhances only when motion runs.
- Cursor-follow preview: pointer devices only; touch gets explicit panel.
- Object-stage hero: product/media object changes state with proof/control nearby.
- Immersive footer: slow brand ending, all links still discoverable.
- Page transition: use only when route change remains fast, cancellable, and accessible.

## Animation QA Gates

Fail if:

- layout properties animate during critical motion
- reduced-motion leaves content hidden or incomplete
- scroll hijacking blocks normal reading
- multiple signatures compete
- motion delays CTA or proof comprehension
- heavy motion runs on mobile without adaptation
- animation causes CLS, jank, or high CPU
- no cleanup for timelines/triggers
- no pause/stop/escape option for long or looping non-essential motion
