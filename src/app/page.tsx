"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/landing/navbar";
import { HeroOrbitDeck } from "@/components/ui/hero-modern";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { MissionControl } from "@/components/landing/mission-control";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

const DottedSurface = dynamic(
  () => import("@/components/ui/dotted-surface").then((m) => m.DottedSurface),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* Animated 3D dotted surface background */}
      <DottedSurface className="opacity-30" />

      <Navbar />
      <main className="relative z-10">
        <HeroOrbitDeck />
        <ProblemSolution />
        <FeaturesGrid />
        <MissionControl />
        <Pricing />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
