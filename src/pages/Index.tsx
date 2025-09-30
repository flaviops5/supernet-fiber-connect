import HeroSection from '@/components/HeroSection';
import ResidentialPlans from '@/components/ResidentialPlans';
import CoverageSection from '@/components/CoverageSection';
import ServiceCards from '@/components/ServiceCards';
import { SalesAgentChat } from '@/components/SalesAgentChat';
import Testimonials from '@/components/Testimonials';
import AdditionalServices from '@/components/AdditionalServices';
import FAQ from '@/components/FAQ';

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ResidentialPlans />
      <CoverageSection />
      <ServiceCards />
      <SalesAgentChat />
      <FAQ />
      <Testimonials />
      <AdditionalServices />
    </div>
  );
};

export default Index;
