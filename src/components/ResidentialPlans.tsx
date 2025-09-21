import { Check, Crown, Gauge, Router, Focus, Cog, Wifi, Download, Globe, Users, Shield, Gift, MapPin, Camera, Settings, Zap } from 'lucide-react';
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
      speed: "400 Mega",
      price: "99,00",
      originalPrice: "109,90",
      description: "Conexão que acompanha seu ritmo sem pesar no bolso!",
      features: [
        { text: "400 mega de download garantido", icon: Download },
        { text: "1 Roteador Wi-Fi AC 1200", icon: Wifi },
        { text: "Instalação gratuita", icon: Settings },
        { text: "Sem limite de uso", icon: Globe },
        { text: "Clube de vantagens", icon: Gift },
        { text: "Veja condição e locais da oferta", icon: MapPin, isLink: true, href: "/condicoes" }
      ],
      popular: false,
      icon: Gauge
    },
    {
      name: "Plano Premium",
      speed: "500 Mega",
      price: "119,00",
      originalPrice: "129,90",
      description: "A escolha perfeita para famílias conectadas!",
      features: [
        { text: "500 mega de download garantido", icon: Download },
        { text: "1 roteador Wi-Fi 6 Pró", icon: Router },
        { text: "Instalação gratuita", icon: Settings },
        { text: "Sem limite de uso", icon: Globe },
        { text: "25 Canais Streaming", icon: Zap },
        { text: "Clube de vantagens", icon: Gift },
        { text: "Veja condição e locais da oferta", icon: MapPin, isLink: true, href: "/condicoes" }
      ],
      popular: true,
      icon: Crown
    },
    {
      name: "Plano Ultra",
      speed: "600 Mega",
      price: "129,90",
      originalPrice: "149,90",
      description: "Potência máxima para quem não abre mão da velocidade!",
      features: [
        { text: "600 mega de download garantido", icon: Download },
        { text: "1 roteador Wi-Fi 6 Pró", icon: Router },
        { text: "Instalação gratuita", icon: Settings },
        { text: "Sem limite de uso", icon: Globe },
        { text: "25 Canais Streaming", icon: Zap },
        { text: "Clube de vantagens", icon: Gift },
        { text: "Veja condição e locais da oferta", icon: MapPin, isLink: true, href: "/condicoes" }
      ],
      popular: false,
      icon: Router
    },
    {
      name: "Plano Focus",
      speed: "600 Mega",
      price: "169,00",
      originalPrice: "189,90",
      description: "Segurança e conectividade em um só plano!",
      features: [
        { text: "600 mega de download garantido", icon: Download },
        { text: "1 roteador Wi-Fi 6 Pró", icon: Router },
        { text: "1 câmera Wi-Fi inclusa", icon: Camera },
        { text: "Instalação gratuita da câmera", icon: Settings },
        { text: "Clique aqui e saiba mais sobre esse plano", icon: Focus, isLink: true, href: "/plano-focus" }
      ],
      popular: false,
      icon: Focus
    },
    {
      name: "Plano Automação",
      speed: "600 Mega",
      price: "169,00",
      originalPrice: "189,90",
      description: "O futuro chegou à sua casa!",
      features: [
        { text: "600 mega de download garantido", icon: Download },
        { text: "Automação 1 cômodo", icon: Cog },
        { text: "Instalação gratuita da automação", icon: Settings },
        { text: "Clique aqui e saiba mais sobre esse plano", icon: Cog, isLink: true, href: "/plano-automacao" }
      ],
      popular: false,
      icon: Cog
    },
    {
      name: "Plano Super Mesh",
      speed: "600 Mega",
      price: "179,00",
      originalPrice: "199,90",
      description: "Cobertura total sem pontos cegos!",
      features: [
        { text: "600 mega de download garantido", icon: Download },
        { text: "2 roteadores Wi-Fi 6", icon: Router },
        { text: "Rede mesh inteligente", icon: Wifi },
        { text: "Cobertura total da casa", icon: Globe },
        { text: "Instalação gratuita", icon: Settings },
        { text: "Suporte prioritário", icon: Shield }
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
                      <div className="flex items-center justify-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                          <plan.icon className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                      </div>
                      
                      <div className="text-4xl md:text-5xl font-black gradient-text mb-2">{plan.speed}</div>
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-sm text-muted-foreground line-through">
                            De R$ {plan.originalPrice}
                          </span>
                          <span className="text-xs text-muted-foreground">por</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-3xl font-black text-primary">R$ {plan.price}</span>
                          <span className="text-muted-foreground text-sm">/mês</span>
                        </div>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="mb-8">
                      <ul className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <feature.icon className="w-4 h-4 text-primary" />
                            </div>
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