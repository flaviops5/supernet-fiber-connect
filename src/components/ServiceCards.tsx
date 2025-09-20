import { Zap, Users, Settings, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ServiceCards = () => {
  const services = [
    {
      icon: Zap,
      title: "Velocidade & Estabilidade",
      description: "Fibra óptica 100% pura com velocidade simétrica e baixíssima latência. Perfeita para jogos, streaming e trabalho remoto.",
      features: ["Velocidade até 1GB", "Latência ultra baixa", "Upload = Download", "99.9% de disponibilidade"]
    },
    {
      icon: Users,
      title: "Instalação em até 24 horas",
      description: "Instalação rápida e profissional em sua residência. Nossa equipe técnica altamente qualificada garante o melhor serviço.",
      features: ["Agendamento flexível", "Técnicos certificados", "Instalação gratuita", "Teste de velocidade incluso"]
    },
    {
      icon: Settings,
      title: "Wi-Fi 6 Tecnologia",
      description: "Roteadores de última geração com tecnologia Wi-Fi 6 para máxima velocidade e cobertura em toda sua casa.",
      features: ["Wi-Fi 6 incluso", "Cobertura total", "Múltiplos dispositivos", "Velocidade otimizada"]
    },
    {
      icon: Phone,
      title: "Suporte Ultra-rápido",
      description: "Atendimento especializado com resposta em tempo recorde. Suporte técnico humanizado 24/7 via WhatsApp.",
      features: ["Resposta imediata", "Suporte via WhatsApp", "Técnicos especializados", "Atendimento 24/7"]
    }
  ];

  const handleWhatsApp = (serviceName: string) => {
    const message = `Olá! Gostaria de saber mais sobre ${serviceName} da SUPERNET FIBRA.`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Por que escolher a{' '}
            <span className="gradient-text font-arlon">SUPERNET FIBRA</span>?
          </h2>
          <p className="text-xl text-muted-foreground">
            Mais do que internet rápida, oferecemos uma experiência completa 
            com tecnologia avançada e atendimento humanizado.
          </p>
        </div>

        {/* Service Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="service-card bg-card border border-border rounded-2xl p-8 hover:shadow-elegant group"
            >
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-8 h-8 text-primary-foreground" />
              </div>

              {/* Content */}
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>

                {/* Features List */}
                <ul className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-orange rounded-full" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="pt-4">
                  <Button
                    onClick={() => handleWhatsApp(service.title)}
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground group-hover:border-orange group-hover:text-orange transition-colors"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Saiba Mais
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-subtle rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Pronto para ter a melhor internet da sua vida?
            </h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Milhares de famílias já confiam na SUPERNET FIBRA. 
              Seja você também parte dessa revolução digital.
            </p>
            <Button
              onClick={() => handleWhatsApp("todos os serviços")}
              size="lg"
              className="cta-gradient text-lg px-10 py-6"
            >
              <Phone className="w-5 h-5 mr-2" />
              Fale Conosco Agora
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceCards;