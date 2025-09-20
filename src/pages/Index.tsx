import HeroSection from '@/components/HeroSection';
import ResidentialPlans from '@/components/ResidentialPlans';
import ServiceCards from '@/components/ServiceCards';
import Testimonials from '@/components/Testimonials';
import AdditionalServices from '@/components/AdditionalServices';
import FAQ from '@/components/FAQ';

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ResidentialPlans />
      <ServiceCards />
      <FAQ />
      <Testimonials />
      <AdditionalServices />
    </div>
  );
};

export default Index;
