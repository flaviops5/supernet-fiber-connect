import { Check, Crown, Gauge, Router, Focus, Cog, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const ResidentialPlans = () => {
  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );
  const plans = [
    {
      name: "Plano Plus",
      speed: "400 mega",
      price: "99,00",
      originalPrice: "109,90",
      Conexão que acompanha seu ritmo sem pesar no bolso!
      features: [
        "400 mega de download garantido",
        "1 Roteador Wi-Fi AC 1200",
        "Instalação gratuita",
        "Sem limite de uso",
        "Clube de vantagens",
        "Veja condição e locais da oferta"
      ],
      popular: false,
      icon: Gauge
    },
    {
      name: "Plano Premium",
      speed: "500 mega",
      price: "119,00",
      originalPrice: "129,90",
      features: [
        "500 mega de download garantido",
        "1 roteador Wi-Fi 6 Pró",
        "Instalação gratuita",
        "Sem limite de uso",
        "25 Canais Streaming",
        "Clube de vantagens",
        "Veja condição e locais da oferta"
      ],
      popular: true,
      icon: Crown
    },
    {
      name: "Plano Ultra",
      speed: "600 mega",
      price: "129,90",
      originalPrice: "149,90",
      features: [
        "600 mega de download garantido",
        "1 roteador Wi-Fi 6 Pró",
        "Instalação gratuita",
        "Sem limite de uso",
        "25 Canais Streaming",
        "Clube de vantagens",
        "Veja condição e locais da oferta"
      ],
      popular: false,
      icon: Router
    },
    {
      name: "Plano Focus",
      speed: "600 mega",
      price: "169,00",
      originalPrice: "189,90",
      features: [
        "600 mega de download garantido",
        "1 roteador Wi-Fi 6 Pró",
        "1 câmera Wi-Fi inclusa",
        "Instalação gratuita da câmera",
        "Clique aqui e saiba mais sobre esse plano"
      ],
      popular: false,
      icon: Focus
    },
    {
      name: "Plano Automação",
      speed: "600 mega",
      price: "169,00",
      originalPrice: "189,90",
      features: [
        "600 mega de download garantido",
        "Automação 1 cômodo",
        "Instalação gratuita da automação",
        "Clique aqui e saiba mais sobre esse plano"
      ],
      popular: false,
      icon: Cog
    },
    {
      name: "Plano Super Mesh",
      speed: "600 mega",
      price: "179,00",
      originalPrice: "199,90",
      features: [
        "600 mega de download garantido",
        "2 roteadores Wi-Fi 6",
        "Rede mesh inteligente",
        "Cobertura total da casa",
        "Instalação gratuita",
        "Suporte prioritário"
      ],
      popular: false,
      icon: Wifi
    }
  ];

  const handleWhatsApp = (planName: string, price: string) => {
    const message = `Olá! Tenho interesse no plano ${planName} por R$ ${price}/mês da SUPERNET FIBRA. Gostaria de mais informações!`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <section id="planos-residenciais" className="py-12 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
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
                    className={`relative bg-card border rounded-2xl p-6 shadow-sm hover:shadow-card transition-all duration-300 h-full ${
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
                      <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <plan.icon className="w-7 h-7 text-primary-foreground" />
                      </div>
                      
                      <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                      <div className="text-3xl font-bold gradient-text mb-3">{plan.speed}</div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-2xl font-bold text-foreground">R$ {plan.price}</span>
                          <span className="text-muted-foreground text-sm">/mês</span>
                        </div>
                        <div className="text-sm text-muted-foreground line-through">
                          De R$ {plan.originalPrice}
                        </div>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="mb-8">
                      <ul className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center space-x-3">
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <Button
                      onClick={() => handleWhatsApp(plan.name, plan.price)}
                      className={`w-full text-base py-4 ${
                        plan.popular 
                          ? 'cta-gradient' 
                          : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                      }`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      Contratar Agora
                    </Button>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
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