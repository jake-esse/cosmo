import { FloatingNav } from "@/components/landing/FloatingNav";
import { MainNav } from "@/components/landing/MainNav";
import { Hero } from "@/components/landing/Hero";
import { Benefits } from "@/components/landing/Benefits";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Rewards } from "@/components/landing/Rewards";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="bg-white min-h-screen">
      {/* Floating Navigation (always visible) */}
      <FloatingNav />

      {/* Main Container */}
      <div className="relative flex flex-col items-center px-10 pb-5">
        {/* Main Navigation */}
        <div className="w-full max-w-[1200px] mx-auto">
          <MainNav />
        </div>

        {/* Hero Section */}
        <Hero />

        {/* Main Content */}
        <main className="w-full flex flex-col items-center">
          {/* Benefits Section */}
          <Benefits />

          {/* How It Works Section */}
          <HowItWorks />

          {/* Current Rewards Section */}
          <Rewards />

          {/* CTA Section with Mountain Image */}
          <CTASection />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
