import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { SolutionSection } from "@/components/sections/SolutionSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { WhyNowSection } from "@/components/sections/WhyNowSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { RevenueSection } from "@/components/sections/RevenueSection";
import { TargetSection } from "@/components/sections/TargetSection";
import { RoadmapSection } from "@/components/sections/RoadmapSection";
import { EarnBanner } from "@/components/EarnBanner";
import { CTASection } from "@/components/sections/CTASection";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ONLY — Delivering Emotions | Forgot Something? We Deliver It Fast" },
      {
        name: "description",
        content:
          "ONLY is a hyperlocal personal delivery service. Tiffin, charger, medicines, keys, documents — delivered in 30–90 minutes by verified riders.",
      },
      { property: "og:title", content: "ONLY — Delivering Emotions" },
      {
        property: "og:description",
        content:
          "Hyperlocal personal delivery in 30–90 minutes. Trusted, fast, tracked.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <ServicesSection />
        <WhyNowSection />
        <HowItWorksSection />
        <EarnBanner />
        <RevenueSection />
        <TargetSection />
        <RoadmapSection />
        <CTASection />
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
