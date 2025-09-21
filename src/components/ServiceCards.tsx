import { Zap, Clock, Wifi, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroWork from '@/assets/hero-work-from-home.jpg';

const ServiceCards = () => {
  const services = [
    {
      icon: Zap,
      title: "Velocidade & Estabilidade",
      features: ["Velocidade até 1GB", "Latência ultra baixa", "Upload = Download"]
    },
    {
      icon: Clock,
      title: "Instalação em até 24h",
      features: ["Agendamento flexível", "Técnicos certificados", "Instalação gratuita"]
    },
    {
      icon: Wifi,
      title: "Wi-Fi 6 Tecnologia",
      features: ["Wi-Fi 6 incluso", "Cobertura total", "Múltiplos dispositivos"]
    },
    {
      icon: Headphones,
      title: "Suporte Ultra-rápido",
      features: ["Resposta imediata", "Suporte via WhatsApp", "Atendimento 24/7"]
    }
  ];

  const handleWhatsApp = () => {
    const message = "Olá! Gostaria de saber mais sobre os serviços da SUPERNET FIBRA.";
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <section id="por-que-escolher" className="py-12 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Por que escolher a{' '}
            <span className="gradient-text">SUPERNET FIBRA</span>?
          </h2>
          <p className="text-xl text-muted-foreground">
            Internet 100% fibra, instalação rápida e suporte humano de verdade.
            Conheça os diferenciais que fazem a SUPERNET FIBRA ser a sua melhor escolha.
          </p>
        </div>

        {/* Service Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {services.map((service, index) => (
            <div
              key={index}
              className="service-card bg-card border border-border rounded-2xl p-6 hover:shadow-elegant hover:shadow-[0_0_20px_hsl(var(--orange)/0.3)] group transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-6 h-6 text-primary-foreground" />
              </div>

              {/* Features List */}
              <ul className="space-y-2">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange rounded-full" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom CTA with Image */}
        <div className="text-center">
          <div className="bg-gradient-subtle rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Pronto para ter a melhor internet da sua vida?
                </h3>
                <p className="text-muted-foreground mb-8">
                  Milhares de famílias já confiam na SUPERNET FIBRA. 
                  Seja você também parte dessa revolução digital.
                </p>
                <Button
                  onClick={handleWhatsApp}
                  size="lg"
                  className="cta-gradient text-lg px-10 py-6"
                >
                  Fale Conosco Agora
                </Button>
              </div>
              <div className="relative">
                <img
                  src={heroWork}
                  alt="Pessoa trabalhando em casa usando internet fibra"
                  className="w-full h-80 object-cover rounded-2xl shadow-elegant"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceCards;