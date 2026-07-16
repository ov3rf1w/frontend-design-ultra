"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import type { IndustrySlug } from "@/lib/showcase";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function MotionShell({ brand, children }: { brand: IndustrySlug; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero-reveal]", {
          autoAlpha: 0,
          y: 28,
          duration: 0.85,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "opacity,visibility,transform",
        });

        gsap.utils.toArray<HTMLElement>("[data-section-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 24,
            duration: 0.68,
            ease: "power3.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: element,
              start: "top 84%",
              once: true,
            },
          });
        });

        if (brand === "hospitality") {
          gsap.fromTo(".alpine-contour-group", { yPercent: -5 }, {
            yPercent: 7,
            ease: "none",
            scrollTrigger: { trigger: ".hospitality-hero", start: "top top", end: "bottom top", scrub: 0.65 },
          });
        }

        if (brand === "legal") {
          gsap.from(".legal-index-line", {
            scaleX: 0,
            transformOrigin: "left center",
            stagger: 0.09,
            duration: 0.7,
            ease: "power3.out",
          });
        }

        if (brand === "finance") {
          gsap.from(".finance-bar", {
            scaleY: 0,
            transformOrigin: "center bottom",
            stagger: 0.08,
            duration: 0.75,
            ease: "power3.out",
          });
        }

        if (brand === "healthcare") {
          gsap.from(".care-node", {
            autoAlpha: 0,
            stagger: 0.13,
            duration: 0.55,
            ease: "power2.out",
            clearProps: "opacity,visibility",
          });
        }

        if (brand === "saas") {
          gsap.from(".relay-rail", { scaleX: 0, transformOrigin: "left center", duration: 1, ease: "power3.out" });
          gsap.from(".relay-node", { autoAlpha: 0, stagger: 0.12, duration: 0.5, delay: 0.18, clearProps: "opacity,visibility" });
        }

        if (brand === "ecommerce") {
          gsap.fromTo(".pendant-object", { y: 18, rotate: -2 }, {
            y: -14,
            rotate: 2,
            ease: "sine.inOut",
            scrollTrigger: { trigger: ".commerce-hero", start: "top top", end: "bottom top", scrub: 0.8 },
          });
        }

      });
      return () => media.revert();
    },
    { scope: root, dependencies: [brand] },
  );

  return (
    <div ref={root} data-motion={brand}>
      {children}
    </div>
  );
}
