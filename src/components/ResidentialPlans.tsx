import { Download, Globe, Shield, Gift, MapPin, Camera, Settings, Tv, DollarSign, Clock, Router, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
const iconMap: { [key: string]: any } = {
  Download, Globe, Shield, Gift, MapPin, Camera, Settings, Tv, 
  DollarSign, Clock, Router, Wifi
};

const ResidentialPlans = () => {
  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );
  
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error loading plans:', error);
        // Fallback to empty array if error
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (loading) {
    return (
      <section id="planos-residenciais" className="py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-6">
              Planos{' '}
              <span className="gradient-text">Residenciais</span>
            </h2>
            <p className="text-xl text-muted-foreground">Carregando planos...</p>
          </div>
        </div>
      </section>
    );
  }

  if (plans.length === 0) {
    return (
      <section id="planos-residenciais" className="py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-6">
              Planos{' '}
              <span className="gradient-text">Residenciais</span>
            </h2>
            <p className="text-xl text-muted-foreground">Em breve novos planos disponíveis!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="planos-residenciais" className="py-12 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-6">
            Planos{' '}
            <span className="gradient-text">Residenciais</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Escolha o plano ideal para sua família. Fibra óptica pura, 
            velocidade garantida e o melhor custo-benefício da região.
          </p>
        </div>

        {/* Plans Carousel */}
        <div className="max-w-7xl mx-auto">
          <Carousel
            plugins={[plugin.current]}
            className="w-full"
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {plans.map((plan, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div
                    className={`relative bg-card border rounded-2xl p-6 shadow-sm hover:shadow-card transition-all duration-300 h-full flex flex-col ${
                      plan.popular ? 'border-primary ring-2 ring-primary/20 shadow-glow' : 'border-border'
                    }`}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute -top-2 -left-3 z-10 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold uppercase shadow-lg">
                        Mais Popular
                      </div>
                    )}

                    {/* Plan Header */}
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <Wifi className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                        <div className="flex items-baseline">
                          <span className="text-5xl md:text-6xl font-black font-varela text-primary">
                            {plan.speed.split(' ')[0]}
                          </span>
                          <span className="text-2xl md:text-3xl font-black font-varela ml-2 text-orange">
                            {plan.speed.split(' ')[1] || ''}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                      
                      <div className="flex flex-col items-center space-y-2">
                        <div className="text-center">
                          {plan.original_price && (
                            <div className="text-sm text-muted-foreground mb-1">
                              De R$ {plan.original_price.toFixed(2).replace('.', ',')}
                            </div>
                          )}
                          <div className="text-lg text-primary font-medium">por:</div>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-3xl md:text-4xl font-black font-varela text-primary">
                            R$ {plan.price.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-muted-foreground text-sm font-varela">/mês</span>
                        </div>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="mb-8 flex-1">
                      <ul className="space-y-3">
                        {(plan.features || []).map((feature: any, featureIndex: number) => {
                          const IconComponent = iconMap[feature.icon] || Download;
                          return (
                            <li key={featureIndex} className="flex items-center space-x-3">
                              <IconComponent className="w-4 h-4 text-primary flex-shrink-0" />
                              {feature.isLink ? (
                                <a 
                                  href={feature.href} 
                                  className="text-sm text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                                >
                                  {feature.text}
                                </a>
                              ) : (
                                <span className="text-sm text-foreground">{feature.text}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Info Note - Removed CTA since chatbot handles sales */}
                    <div className="text-center text-sm text-muted-foreground mt-auto p-4 bg-muted/30 rounded-lg">
                      💬 Converse com nosso assistente virtual para contratar este plano
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>

        {/* Dots Indicators */}
        <div className="flex justify-center space-x-2 mt-8">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index + 1 === current
                  ? 'bg-primary scale-110'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              onClick={() => api?.scrollTo(index)}
              aria-label={`Ir para o plano ${index + 1}`}
            />
          ))}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            * Valores promocionais válidos para novos clientes. Consulte condições.
          </p>
        </div>
      </div>

    </section>
  );
};

export default ResidentialPlans;