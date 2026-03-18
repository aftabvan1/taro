"use client";

import { Navbar } from "@/components/landing/navbar";
import { HeroOrbitDeck } from "@/components/ui/hero-modern";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { Comparison } from "@/components/landing/comparison";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { MissionControl } from "@/components/landing/mission-control";
import { Integrations } from "@/components/landing/integrations";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { BobaBackground } from "@/components/ui/boba-background";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <BobaBackground />

      <Navbar />
      <main className="relative z-10">
        <HeroOrbitDeck />
        <ProblemSolution />
        <Comparison />
        <MissionControl />
        <FeaturesGrid />
        <Integrations />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
