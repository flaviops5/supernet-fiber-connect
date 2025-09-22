import { Gauge, Clock, Router, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confidentWoman from '@/assets/confident-woman-decision.jpg';

const ServiceCards = () => {
  const services = [
    {
      title: "Velocidade & Estabilidade",
      description: "Nossa rede 100% fibra óptica garante velocidades de até 1GB com latência ultra baixa. Oferecemos velocidade simétrica, ou seja, você tem a mesma velocidade para download e upload, ideal para trabalho remoto, streaming e games online."
    },
    {
      title: "Instalação em até 24h",
      description: "Nossos técnicos certificados realizam a instalação completa em até 24 horas após a confirmação do pedido. O agendamento é flexível para se adequar à sua disponibilidade, e toda instalação é gratuita, sem custos adicionais."
    },
    {
      title: "Wi-Fi 6 Tecnologia",
      description: "Incluímos roteadores com tecnologia Wi-Fi 6 que oferecem cobertura total da sua casa e suportam múltiplos dispositivos simultaneamente sem perda de velocidade. Tecnologia de ponta para uma experiência sem limites."
    },
    {
      title: "Suporte Ultra-rápido",
      description: "Nosso atendimento é humanizado e disponível 24/7 via WhatsApp. Garantimos resposta imediata para suas dúvidas e problemas, com uma equipe técnica especializada sempre pronta para ajudar você."
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
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-6">
            Por que escolher a{' '}
            <span className="gradient-text">SUPERNET FIBRA</span>?
          </h2>
          <p className="text-xl text-muted-foreground">
            Internet 100% fibra, instalação rápida e suporte humano de verdade.
            Conheça os diferenciais que fazem a SUPERNET FIBRA ser a sua melhor escolha.
          </p>
        </div>

        {/* Service Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => (
            <div
              key={index}
              className="service-card bg-card border border-orange rounded-2xl p-8 hover:shadow-elegant hover:shadow-[0_0_20px_hsl(var(--orange)/0.4)] shadow-[0_0_15px_hsl(var(--orange)/0.2)] transition-all duration-300"
            >
              {/* Title */}
              <h3 className="text-xl font-bold font-varela uppercase text-orange mb-4">{service.title}</h3>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA with Image */}
        <div className="text-center">
          <div className="bg-gradient-subtle rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <h3 className="text-2xl md:text-3xl font-bold font-varela uppercase text-foreground mb-4">
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
                  src={confidentWoman}
                  alt="Mulher confiante tomando decisão sobre internet fibra"
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