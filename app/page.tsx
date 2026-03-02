import { Navbar } from "@/app/components/zap/navbar"
import { HeroSection } from "@/app/components/zap/hero-section"
import { FeatureGrid } from "@/app/components/zap/feature-grid"
import { VibeWidgets } from "@/app/components/zap/vibe-widgets"
import { Testimonial } from "@/app/components/zap/testimonial"
import { CtaFooter } from "@/app/components/zap/cta-footer"
import { MathBackground } from "@/app/components/zap/math-background"

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background">
      <MathBackground />
      {/* Blur separation layer between decorative background and content */}
      <div className="pointer-events-none fixed inset-0 z-[1] backdrop-blur-[1px]" aria-hidden="true" />
      <div className="relative z-[2]">
        <Navbar />
        <HeroSection />
        <FeatureGrid />
        <VibeWidgets />
        <Testimonial />
        <CtaFooter />
      </div>
    </main>
  )
}
