import { Check, Zap, Star, Rocket, Wifi, Camera, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const ResidentialPlans = () => {
  const plans = [
    {
      name: "Plano Plus",
      speed: "400 MB",
      price: "99,00",
      originalPrice: "109,90",
      features: [
        "400 MB simétrico",
        "Wi-Fi 6 incluso",
        "Instalação gratuita",
        "Suporte 24/7",
        "Sem fidelidade"
      ],
      popular: false,
      icon: Zap
    },
    {
      name: "Plano Premium",
      speed: "500 MB",
      price: "119,00",
      originalPrice: "129,90",
      features: [
        "500 MB simétrico",
        "Wi-Fi 6 Pro incluso",
        "Instalação gratuita",
        "Suporte 24/7 prioritário",
        "Netflix incluso 6 meses",
        "Desconto em automação"
      ],
      popular: true,
      icon: Star
    },
    {
      name: "Plano Ultra",
      speed: "600 MB",
      price: "129,90",
      originalPrice: "149,90",
      features: [
        "600 MB simétrico",
        "Wi-Fi 6E mesh incluso",
        "Instalação gratuita",
        "Suporte VIP 24/7",
        "Netflix + Prime incluso",
        "Automação básica inclusa",
        "Câmeras IP gratuitas"
      ],
      popular: false,
      icon: Rocket
    },
    {
      name: "Plano Focus",
      speed: "600 MB",
      price: "169,00",
      originalPrice: "189,90",
      features: [
        "600 MB simétrico",
        "Wi-Fi 6 incluso",
        "1 câmera Wi-Fi inclusa",
        "Instalação gratuita",
        "Suporte 24/7",
        "Monitoramento móvel"
      ],
      popular: false,
      icon: Camera
    },
    {
      name: "Plano Automação",
      speed: "600 MB",
      price: "169,00",
      originalPrice: "189,90",
      features: [
        "600 MB simétrico",
        "Wi-Fi 6 Pro incluso",
        "Automação 1 cômodo",
        "Instalação gratuita",
        "Suporte especializado",
        "Controle por app"
      ],
      popular: false,
      icon: Home
    },
    {
      name: "Plano Super Mesh",
      speed: "600 MB",
      price: "179,00",
      originalPrice: "199,90",
      features: [
        "600 MB simétrico",
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
    <section className="py-12 bg-gradient-subtle">
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
          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {plans.map((plan, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div
                    className={`relative bg-card border rounded-2xl p-6 shadow-sm hover:shadow-card transition-all duration-300 h-full ${
                      plan.popular ? 'border-primary ring-2 ring-primary/20 scale-105 shadow-glow' : 'border-border'
                    }`}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-bold">
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
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-orange/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-orange" />
                          </div>
                          <span className="text-foreground text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

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