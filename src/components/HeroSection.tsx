import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Wifi, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import heroFamily from '@/assets/hero-family-internet.jpg';
import heroWork from '@/assets/hero-work-from-home.jpg';
import heroEntertainment from '@/assets/hero-entertainment.jpg';

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSettings, setHeroSettings] = useState(null);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback slides if no data in database
  const fallbackSlides = [
    {
      image: heroFamily,
      title: "Internet para toda a família",
      description: "Conexão estável para todos os dispositivos da sua casa"
    },
    {
      image: heroWork,
      title: "Trabalhe de casa sem limites",
      description: "Velocidade e estabilidade para suas videoconferências"
    },
    {
      image: heroEntertainment,
      title: "Entretenimento em alta definição",
      description: "Streaming 4K sem travamentos, jogos online sem lag"
    }
  ];

  useEffect(() => {
    const loadHeroData = async () => {
      try {
        // Load hero settings
        const { data: settings } = await supabase
          .from('hero_settings')
          .select('*')
          .single();

        // Load hero slides
        const { data: slidesData } = await supabase
          .from('hero_slides')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });

        setHeroSettings(settings);
        
        // Use database slides if available, otherwise fallback
        if (slidesData && slidesData.length > 0) {
          const formattedSlides = slidesData.map(slide => ({
            image: slide.image_url,
            title: slide.title,
            description: slide.description
          }));
          setSlides(formattedSlides);
        } else {
          setSlides(fallbackSlides);
        }
      } catch (error) {
        console.error('Error loading hero data:', error);
        // Use fallback data on error
        setSlides(fallbackSlides);
      } finally {
        setLoading(false);
      }
    };

    loadHeroData();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  };

  const handleWhatsApp = () => {
    const message = heroSettings?.whatsapp_message || 'Olá! Quero conhecer os planos de internet fibra da SUPERNET FIBRA.';
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <section id="inicio" className="relative bg-gradient-subtle min-h-[80vh] flex items-center">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </section>
    );
  }
  return <section id="inicio" className="relative bg-gradient-subtle min-h-[80vh] flex items-center overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-orange/5" />
      <div className="absolute top-20 right-20 w-32 h-32 bg-orange/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8 lg:pr-8">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-orange/10 text-orange px-4 py-2 rounded-full text-sm font-medium">
                <Zap className="w-4 h-4" />
                <span>{heroSettings?.badge_text || '100% Fibra Óptica'}</span>
              </div>
              
                <h1 className="text-4xl md:text-4xl lg:text-5xl font-bold font-varela text-foreground leading-tight uppercase">
                  {heroSettings?.main_title || (
                    <>
                      Internet{' '}
                      <span className="gradient-text">ultra-rápida</span>{' '}
                      que transforma sua vida digital.
                    </>
                  )}
                </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                {heroSettings?.subtitle || "Experimente a velocidade e estabilidade da fibra óptica da SUPERNET FIBRA. Ideal para trabalho, estudos, entretenimento e toda a família conectada ao mesmo tempo."}
              </p>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Sem limite</p>
                  <p className="text-sm text-muted-foreground">Internet ilimitada</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-orange" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Ultra velocidade</p>
                  <p className="text-sm text-muted-foreground">Até 1GB simétrico</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-accent/10 rounded-lg flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-red-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Wi-Fi 6</p>
                  <p className="text-sm text-muted-foreground">Sinal em toda a casa</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex justify-center sm:justify-start">
              <Button onClick={handleWhatsApp} size="lg" className="cta-gradient text-lg px-8 py-6">
                {heroSettings?.cta_text || 'Contratar Agora no WhatsApp'}
              </Button>
            </div>
          </div>

          {/* Right Column - Image Carousel */}
          <div className="relative">
            <div className="relative bg-card rounded-2xl overflow-hidden shadow-elegant float-animation">
              <div className="relative h-96 md:h-[500px]">
                {slides.map((slide, index) => <div key={index} className={`absolute inset-0 transition-opacity duration-500 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                    <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-gray/60 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 text-white">
                      <h3 className="text-xl font-bold font-varela uppercase mb-2">{slide.title}</h3>
                      <p className="text-white/90">{slide.description}</p>
                    </div>
                  </div>)}

                {/* Navigation buttons */}
                <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Dots indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                  {slides.map((_, index) => <button key={index} onClick={() => setCurrentSlide(index)} className={`w-2 h-2 rounded-full transition-colors ${index === currentSlide ? 'bg-white' : 'bg-white/50'}`} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;