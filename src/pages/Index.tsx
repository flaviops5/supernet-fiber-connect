import HeroSection from '@/components/HeroSection';
import ResidentialPlans from '@/components/ResidentialPlans';
import CoverageSection from '@/components/CoverageSection';
import ServiceCards from '@/components/ServiceCards';
import { SalesAgentChat } from '@/components/SalesAgentChat';
import Testimonials from '@/components/Testimonials';
import AdditionalServices from '@/components/AdditionalServices';
import FAQ from '@/components/FAQ';
import SalesAgentWidget from '@/components/SalesAgentWidget';
import { useScrollToHash } from '@/hooks/useScrollToHash';

const Index = () => {
  useScrollToHash();
  
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
      <SalesAgentWidget />
    </div>
  );
};

export default Index;
