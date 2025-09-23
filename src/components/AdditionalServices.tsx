import { Button } from '@/components/ui/button';

const AdditionalServices = () => {
  const services = [
    {
      title: "Automação Residencial",
      description: "Transforme sua casa em um lar inteligente com controle de iluminação, fechaduras inteligentes, climatização automática e tudo integrado a Alexa/Google.",
      highlight: "A partir de R$ 299",
      position: { top: "10%", left: "20%" }
    },
    {
      title: "Canais de Streaming",
      description: "Acesso completo aos melhores conteúdos de entretenimento com Paramount+, Telecine, HBO MAX, ESPN, Premier e muito mais.",
      highlight: "Combo por R$ 49,90/mês",
      position: { top: "15%", right: "15%" }
    },
    {
      title: "Equipamentos & Segurança",
      description: "Câmeras IP 4K com visão noturna, roteadores Wi-Fi 6E profissionais, Fire TV Stick 4K e DVR em nuvem para sua segurança.",
      highlight: "Instalação inclusa",
      position: { top: "45%", right: "5%" }
    },
    {
      title: "Reparos Internos",
      description: "Pequenos reparos e instalações residenciais com técnicos especializados em instalação de TVs, montagem de móveis, reparos elétricos e configuração de rede.",
      highlight: "Desconto para clientes",
      position: { bottom: "20%", right: "20%" }
    },
    {
      title: "Redes WiFi",
      description: "Instalação e configuração de redes WiFi profissionais com cobertura total, alta velocidade, segurança avançada e suporte técnico completo.",
      highlight: "Instalação gratuita",
      position: { bottom: "10%", left: "50%", transform: "translateX(-50%)" }
    },
    {
      title: "Telefonia Fixa",
      description: "Linha telefônica fixa com qualidade HD, chamadas ilimitadas, portabilidade gratuita e integração completa com seu celular.",
      highlight: "A partir de R$ 29,90",
      position: { bottom: "20%", left: "15%" }
    },
    {
      title: "Telemedicina",
      description: "Consultas médicas online 24h com profissionais qualificados, receitas digitais, especialistas disponíveis e plano familiar completo.",
      highlight: "Primeiro mês grátis",
      position: { top: "45%", left: "5%" }
    },
    {
      title: "Monitoramento Residencial",
      description: "Sistema completo de monitoramento 24h com central de alarmes, app mobile e resposta rápida para sua segurança residencial.",
      highlight: "Sem taxa de adesão",
      position: { top: "15%", left: "50%", transform: "translateX(-50%)" }
    },
    {
      title: "Monitoramento de Veículos",
      description: "Rastreamento completo com GPS em tempo real, bloqueio remoto, histórico de rotas e alertas personalizados para seu veículo.",
      highlight: "Desconto anual",
      position: { top: "75%", right: "25%" }
    }
  ];

  const handleWhatsApp = (serviceName: string) => {
    const message = `Olá! Tenho interesse no serviço de ${serviceName} da SUPERNET FIBRA. Gostaria de mais informações!`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <section id="servicos-complementares" className="py-12 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-6">
            Veja o que podemos fazer{' '}
            <span className="gradient-text">por você</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Além da melhor internet fibra, oferecemos soluções completas para 
            tornar sua casa mais inteligente, segura, conectada e também serviços de reparos.
          </p>
        </div>

        {/* Interactive Radial Services */}
        <div className="relative h-[600px] max-w-4xl mx-auto mb-16">
          {/* Central Logo */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-32 h-32 bg-gradient-primary rounded-full flex items-center justify-center shadow-elegant">
              <img 
                src="/assets/logo-supernet.png" 
                alt="SUPERNET FIBRA" 
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>

          {/* Service Points */}
          {services.map((service, index) => (
            <div
              key={index}
              className="absolute group cursor-pointer"
              style={service.position}
            >
              {/* Connection Line */}
              <div className="absolute w-1 h-16 bg-gradient-to-b from-primary/30 to-transparent origin-bottom transform rotate-[var(--rotation)] group-hover:from-primary group-hover:to-primary group-hover:shadow-glow transition-all duration-300"></div>
              
              {/* Service Point */}
              <div className="relative">
                {/* Small Circle */}
                <div className="w-4 h-4 bg-primary rounded-full shadow-md group-hover:scale-150 transition-all duration-300"></div>
                
                {/* Hover Card */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 min-w-[280px]">
                  <div className="bg-card border border-border rounded-xl p-4 shadow-elegant backdrop-blur-sm">
                    <div className="text-center">
                      <h3 className="text-sm font-bold font-varela uppercase text-foreground mb-2 bg-gradient-primary text-transparent bg-clip-text">
                        {service.title}
                      </h3>
                      <div className="inline-flex items-center bg-orange/10 text-orange px-2 py-1 rounded-full text-xs font-medium mb-3">
                        {service.highlight}
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-muted-foreground text-sm animate-pulse">
              Passe o mouse sobre os pontos para ver os serviços
            </p>
          </div>
        </div>

        {/* Single CTA Button */}
        <div className="text-center mt-12">
          <Button
            onClick={() => handleWhatsApp("serviços completos")}
            size="lg"
            className="bg-gradient-primary hover:opacity-90 text-white text-lg px-8 py-6"
          >
            Solicitar Orçamento Geral
          </Button>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <div className="bg-gradient-hero rounded-2xl p-8 md:p-12 text-white">
            <h3 className="text-2xl md:text-3xl font-bold font-varela uppercase mb-4">
              Quer uma solução completa para sua casa?
            </h3>
            <p className="text-white/90 mb-8 max-w-2xl mx-auto">
              Combine internet fibra com nossos serviços complementares e 
              tenha desconto especial no pacote completo.
            </p>
            <Button
              onClick={() => handleWhatsApp("pacote completo")}
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6"
            >
              Montar Meu Pacote
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdditionalServices;