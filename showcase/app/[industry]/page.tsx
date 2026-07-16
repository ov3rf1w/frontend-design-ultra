import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";

import { EcommercePage } from "@/components/pages/ecommerce-page";
import { FinancePage } from "@/components/pages/finance-page";
import { HealthcarePage } from "@/components/pages/healthcare-page";
import { HospitalityPage } from "@/components/pages/hospitality-page";
import { LegalPage } from "@/components/pages/legal-page";
import { SaasPage } from "@/components/pages/saas-page";
import { getIndustry, industries, isIndustrySlug, type IndustrySlug } from "@/lib/showcase";

const pages: Record<IndustrySlug, ComponentType> = {
  hospitality: HospitalityPage,
  legal: LegalPage,
  finance: FinancePage,
  healthcare: HealthcarePage,
  saas: SaasPage,
  ecommerce: EcommercePage,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return industries.map(({ slug }) => ({ industry: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const { industry: slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};
  return {
    title: industry.fullName,
    description: `${industry.descriptor}. Fictional curated showcase, not a benchmark result.`,
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  if (!isIndustrySlug(industry)) notFound();
  const Page = pages[industry];
  return <Page />;
}
