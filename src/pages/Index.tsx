import HeroSection from '@/components/HeroSection';
import ServiceCards from '@/components/ServiceCards';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ServiceCards />
      <Testimonials />
      <FAQ />
    </div>
  );
};

export default Index;
