import { Header } from '@/components/header'
import { IndustryHero } from '@/components/landing/hero-section'
import { IndustryFeatures } from '@/components/landing/features-section'
import { ProcessTimeline } from '@/components/landing/how-it-works-section'
import { StatsSection } from '@/components/landing/stats-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { FAQSection } from '@/components/landing/faq-section'
import { ContactSection } from '@/components/landing/contact-section'
import { Footer } from '@/components/landing/footer'
import { StructuredData } from '@/components/seo/structured-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shared Reefer Services® | Cold-Chain Consolidation from Cape Town',
  description:
    'Seairo Cargo runs Shared Reefer Services® — IoT-monitored cold-chain consolidation for South African perishable and FMCG exporters. Real-time temperature tracking, automated compliance, transparent pricing.',
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <Header />
      <main className="relative">
        <IndustryHero />
        <IndustryFeatures />
        <ProcessTimeline />
        <StatsSection />
        <TestimonialsSection />
        <FAQSection />
        <ContactSection />
        <Footer />
      </main>
    </>
  )
}
