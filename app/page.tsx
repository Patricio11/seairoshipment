import { Header } from '@/components/header'
import { IndustryHero } from '@/components/landing/hero-section'
import { IndustryFeatures } from '@/components/landing/features-section'
import { ProcessTimeline } from '@/components/landing/how-it-works-section'
import { StatsSection } from '@/components/landing/stats-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { ContactSection } from '@/components/landing/contact-section'
// import { CTASection } from '@/components/landing/cta-section'
import { Footer } from '@/components/landing/footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Seairo Cargo Solutions | Cold Chain Logistics Operating System',
  description: 'SRS consolidation platform for South Africa perishable and food exporters and traders. IoT temperature tracking, automated compliance, real-time visibility.',
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="relative">
        <IndustryHero />
        <IndustryFeatures />
        <ProcessTimeline />
        <StatsSection />
        <TestimonialsSection />
        <ContactSection />
        <Footer />
      </main>
    </>
  )
}
