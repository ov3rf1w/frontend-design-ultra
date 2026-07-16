export const industries = [
  {
    slug: "hospitality",
    brand: "HOUSE 01",
    fullName: "Alpine House H-01",
    descriptor: "A car-free twelve-room mountain house",
    lane: "Typographic alpine field guide",
  },
  {
    slug: "legal",
    brand: "MATTER 02",
    fullName: "Litigation Office L-02",
    descriptor: "Commercial disputes, precisely scoped",
    lane: "Procedural case-file grid",
  },
  {
    slug: "finance",
    brand: "FIVE 03",
    fullName: "Investment Fixture F-03",
    descriptor: "Fees, method, and risk before persuasion",
    lane: "Restrained data and proof atlas",
  },
  {
    slug: "healthcare",
    brand: "PULSE 04",
    fullName: "Heart Clinic H-04",
    descriptor: "A legible path to non-emergency care",
    lane: "Human care-path editorial",
  },
  {
    slug: "saas",
    brand: "WORK 05",
    fullName: "Operations Workspace S-05",
    descriptor: "Recurring work made operational",
    lane: "Live workflow interface stage",
  },
  {
    slug: "ecommerce",
    brand: "OBJECT 06",
    fullName: "Pendant Fixture E-06",
    descriptor: "Made-to-order light, fully specified",
    lane: "Material object showroom",
  },
] as const;

export type Industry = (typeof industries)[number];
export type IndustrySlug = Industry["slug"];

export function getIndustry(value: string): Industry | undefined {
  return industries.find(({ slug }) => slug === value);
}

export function isIndustrySlug(value: string): value is IndustrySlug {
  return industries.some(({ slug }) => slug === value);
}
