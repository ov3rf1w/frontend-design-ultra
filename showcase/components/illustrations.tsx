import { useId } from "react";

type PendantMaterial = "aluminium" | "brass" | "steel";

export function AlpineContour() {
  return (
    <svg className="alpine-contour" viewBox="0 0 900 900" role="img" aria-labelledby="alpine-title alpine-desc">
      <title id="alpine-title">Abstract alpine contour and twelve-room house</title>
      <desc id="alpine-desc">Original line drawing of layered mountain contours surrounding a small geometric house.</desc>
      <g className="alpine-contour-group" fill="none" stroke="currentColor">
        <path d="M-40 700C130 585 230 574 358 411c112-142 208-220 315-147 84 57 127 185 273 222" />
        <path d="M-20 754c176-108 313-126 423-272 92-122 186-178 281-118 88 55 116 154 253 209" />
        <path d="M20 810c188-92 322-101 455-235 73-73 162-126 250-78 81 44 112 128 220 170" />
        <path d="M85 858c181-62 303-70 426-165 83-64 152-92 237-55 70 31 112 88 177 110" />
      </g>
      <g className="alpine-house" transform="translate(412 360)">
        <path d="M0 94 74 20l74 74v102H0Z" fill="var(--accent)" stroke="none" />
        <path d="M16 101h116M44 101v78m60-78v78" opacity=".55" />
        {Array.from({ length: 12 }, (_, index) => {
          const column = index % 4;
          const row = Math.floor(index / 4);
          return <rect key={index} x={22 + column * 27} y={111 + row * 20} width="11" height="7" fill="var(--surface)" stroke="none" />;
        })}
      </g>
    </svg>
  );
}

export function LegalDocket() {
  return (
    <svg className="legal-docket" viewBox="0 0 720 540" role="img" aria-labelledby="docket-title docket-desc">
      <title id="docket-title">Commercial dispute review docket</title>
      <desc id="docket-desc">Original procedural diagram showing scope, conflicts review, matter review, and response.</desc>
      <g fill="none" stroke="currentColor">
        {[96, 206, 316, 426].map((y) => <path key={y} className="legal-index-line" d={`M42 ${y}H678`} />)}
        <path d="M124 50v438M348 50v438M570 50v438" opacity=".3" />
      </g>
      {[
        [70, 78, "01", "SCOPE"],
        [292, 188, "02", "CONFLICTS"],
        [514, 298, "03", "REVIEW"],
        [292, 408, "04", "RESPONSE"],
      ].map(([x, y, number, label]) => (
        <g key={String(number)} transform={`translate(${x} ${y})`}>
          <rect width="140" height="54" fill="var(--surface-raised)" stroke="currentColor" />
          <text x="14" y="33" fill="currentColor" className="svg-mono">{number}</text>
          <text x="48" y="33" fill="currentColor" className="svg-label">{label}</text>
        </g>
      ))}
    </svg>
  );
}

export function FinanceAtlas() {
  const bars = [31, 46, 58, 72, 88];
  return (
    <svg className="finance-atlas" viewBox="0 0 720 520" role="img" aria-labelledby="finance-title finance-desc">
      <title id="finance-title">Five illustrative risk bands</title>
      <desc id="finance-desc">Original chart with five ascending fictional risk bands and no return projection.</desc>
      <g transform="translate(68 54)">
        <path d="M0 390H594M0 0v390" fill="none" stroke="currentColor" opacity=".35" />
        {bars.map((height, index) => (
          <g key={height} transform={`translate(${index * 116 + 28} 0)`}>
            <rect className="finance-bar" x="0" y={390 - height * 3.5} width="58" height={height * 3.5} rx="2" fill={index === 2 ? "var(--accent)" : "currentColor"} opacity={index === 2 ? 1 : 0.26 + index * 0.08} />
            <text x="29" y="424" textAnchor="middle" fill="currentColor" className="svg-label">R{index + 1}</text>
          </g>
        ))}
        <text x="0" y="-18" fill="currentColor" className="svg-label">ILLUSTRATIVE RISK BANDS — NOT RETURNS</text>
      </g>
    </svg>
  );
}

export function CarePath() {
  const nodes = [
    [90, 246, "01", "Request"],
    [280, 142, "02", "Prepare"],
    [476, 246, "03", "Visit"],
    [660, 142, "04", "Plan"],
  ] as const;
  return (
    <svg className="care-path" viewBox="0 0 760 390" role="img" aria-labelledby="care-title care-desc">
      <title id="care-title">Non-emergency care pathway</title>
      <desc id="care-desc">Original four-step path from appointment request through preparation, visit, and follow-up plan.</desc>
      <path d="M90 246C180 246 188 142 280 142s104 104 196 104 92-104 184-104" fill="none" stroke="currentColor" strokeWidth="2" opacity=".32" />
      {nodes.map(([x, y, number, label]) => (
        <g key={number} className="care-node" transform={`translate(${x} ${y})`}>
          <circle r="42" fill="var(--surface-raised)" stroke="currentColor" />
          <text y="-2" textAnchor="middle" fill="currentColor" className="svg-mono">{number}</text>
          <text y="66" textAnchor="middle" fill="currentColor" className="svg-label">{label}</text>
        </g>
      ))}
    </svg>
  );
}

export function RelayMap({ active = 0 }: { active?: number }) {
  const accessibleId = useId();
  const titleId = `${accessibleId}-title`;
  const descriptionId = `${accessibleId}-description`;
  const nodes = [
    [76, 170, "INTAKE"],
    [260, 80, "OWNER"],
    [448, 170, "APPROVAL"],
    [636, 80, "COMPLETE"],
  ] as const;
  return (
    <svg className="relay-map" viewBox="0 0 720 280" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>WORK 05 workflow</title>
      <desc id={descriptionId}>Original interface diagram showing intake, ownership, approval, and completion states.</desc>
      <path className="relay-rail" d="M76 170 260 80l188 90L636 80" fill="none" stroke="currentColor" strokeWidth="2" />
      {nodes.map(([x, y, label], index) => (
        <g key={label} className={`relay-node ${index <= active ? "is-active" : ""}`} transform={`translate(${x} ${y})`}>
          <rect x="-54" y="-30" width="108" height="60" rx="6" fill="var(--surface-raised)" stroke="currentColor" />
          <circle cx="-35" r="5" fill={index <= active ? "var(--accent)" : "currentColor"} />
          <text x="-22" y="5" fill="currentColor" className="svg-label">{label}</text>
        </g>
      ))}
    </svg>
  );
}

const materialColors: Record<PendantMaterial, { shade: string; edge: string }> = {
  aluminium: { shade: "#b8b7ae", edge: "#6e706d" },
  brass: { shade: "#a87a3d", edge: "#69441f" },
  steel: { shade: "#353938", edge: "#171a19" },
};

export function Pendant({ material = "brass", size = 480 }: { material?: PendantMaterial; size?: number }) {
  const scale = size / 480;
  const { shade, edge } = materialColors[material];
  return (
    <svg className="pendant-object" viewBox="0 0 620 720" role="img" aria-labelledby="pendant-title pendant-desc">
      <title id="pendant-title">{`OBJECT 06 pendant in ${material}`}</title>
      <desc id="pendant-desc">{`Original technical drawing of a ${size} millimetre pendant light.`}</desc>
      <path d="M310 0v230" stroke="currentColor" strokeWidth="3" />
      <rect x="280" y="0" width="60" height="18" rx="2" fill="currentColor" />
      <g transform={`translate(${310 - 310 * scale} ${230 - 230 * scale}) scale(${scale})`}>
        <path d="M98 322c26-88 103-142 212-142s186 54 212 142l-54 18c-30-54-80-78-158-78s-128 24-158 78Z" fill={shade} stroke={edge} strokeWidth="4" />
        <ellipse cx="310" cy="332" rx="158" ry="56" fill="#f3d58b" opacity=".85" />
        <ellipse cx="310" cy="328" rx="92" ry="31" fill="#fff0c5" opacity=".8" />
      </g>
      <path d="M72 630H548M72 614v32M548 614v32" stroke="currentColor" opacity=".45" />
      <text x="310" y="674" textAnchor="middle" fill="currentColor" className="svg-label">Ø {size} MM</text>
    </svg>
  );
}

export type { PendantMaterial };
