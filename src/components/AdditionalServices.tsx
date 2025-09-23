import { Button } from '@/components/ui/button';

const AdditionalServices = () => {
  const services = [
    {
      title: "Telemedicina",
      description: "Consultas médicas online 24h com profissionais qualificados, receitas digitais, especialistas disponíveis e plano familiar completo.",
      highlight: "Primeiro mês grátis"
    },
    {
      title: "Redes WiFi",
      description: "Instalação e configuração de redes WiFi profissionais com cobertura total, alta velocidade, segurança avançada e suporte técnico completo.",
      highlight: "Instalação gratuita"
    },
    {
      title: "Telefonia Fixa",
      description: "Linha telefônica fixa com qualidade HD, chamadas ilimitadas, portabilidade gratuita e integração completa com seu celular.",
      highlight: "A partir de R$ 29,90"
    },
    {
      title: "Automação Residencial",
      description: "Transforme sua casa em um lar inteligente com controle de iluminação, fechaduras inteligentes, climatização automática e tudo integrado a Alexa/Google.",
      highlight: "A partir de R$ 299"
    },
    {
      title: "Canais de Streaming",
      description: "Acesso completo aos melhores conteúdos de entretenimento com Paramount+, Telecine, HBO MAX, ESPN, Premier e muito mais.",
      highlight: "Combo por R$ 49,90/mês"
    },
    {
      title: "Equipamentos & Segurança",
      description: "Câmeras IP 4K com visão noturna, roteadores Wi-Fi 6E profissionais, Fire TV Stick 4K e DVR em nuvem para sua segurança.",
      highlight: "Instalação inclusa"
    },
    {
      title: "Reparos Internos",
      description: "Pequenos reparos e instalações residenciais com técnicos especializados em instalação de TVs, montagem de móveis, reparos elétricos e configuração de rede.",
      highlight: "Desconto para clientes"
    },
    {
      title: "Monitoramento Veicular",
      description: "Rastreamento completo com GPS em tempo real, bloqueio remoto, histórico de rotas e alertas personalizados para seu veículo.",
      highlight: "Desconto anual"
    },
    {
      title: "Monitoramento Residencial",
      description: "Sistema completo de monitoramento 24h com central de alarmes, app mobile e resposta rápida para sua segurança residencial.",
      highlight: "Sem taxa de adesão"
    }
  ];

  // Calculate circular positions with varied distances for movement
  const getServicePosition = (index: number, total: number) => {
    // Vary radius for more dynamic layout (207-299px range - 15% larger)
    const baseRadius = 230;
    const radiusVariation = [46, -23, 35, -35, 23, -46, 40, -29, 29]; // Different for each service
    const radius = baseRadius + (radiusVariation[index] || 0);
    
    const angle = (index * 2 * Math.PI) / total;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return {
      left: `calc(50% + ${x}px)`,
      top: `calc(50% + ${y}px)`,
      transform: 'translate(-50%, -50%)',
      radius // Return radius for line length
    };
  };

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
        <div className="relative h-[690px] max-w-4xl mx-auto mb-16">
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
          {services.map((service, index) => {
            const positionData = getServicePosition(index, services.length);
            const { radius, ...position } = positionData;
            const angle = (index * 2 * Math.PI) / services.length;
            const lineAngle = (angle * 180) / Math.PI + 90; // Convert to degrees for CSS rotation
            
            return (
              <div
                key={index}
                className="absolute group cursor-pointer"
                style={position}
              >
                {/* Connection Line to Center */}
                <div 
                  className="absolute w-0.5 bg-gradient-to-b from-primary/20 to-primary/60 origin-bottom group-hover:from-primary group-hover:to-primary group-hover:shadow-glow transition-all duration-300 z-0"
                  style={{
                    height: `${radius}px`,
                    transform: `rotate(${lineAngle + 180}deg)`,
                    transformOrigin: 'bottom center',
                    bottom: '50%',
                    left: '50%',
                    marginLeft: '-1px'
                  }}
                ></div>
                
                {/* Service Point with Title */}
                <div className="relative z-20">
                  {/* Always Visible Title - Now in front with better spacing */}
                  <div className="absolute top-10 left-1/2 transform -translate-x-1/2 min-w-max z-30">
                    <h3 className="text-xs font-bold font-varela uppercase text-foreground bg-gradient-primary text-transparent bg-clip-text text-center px-2 py-1 bg-card/80 rounded-lg backdrop-blur-sm border border-border/50">
                      {service.title}
                    </h3>
                  </div>
                  
                  {/* Circle Point - Behind title */}
                  <div className="w-6 h-6 bg-primary rounded-full shadow-lg group-hover:scale-125 transition-all duration-300 flex items-center justify-center z-10">
                    <div className="w-3 h-3 bg-white rounded-full group-hover:bg-orange transition-colors duration-300"></div>
                  </div>
                  
                  {/* Hover Expanded Card - Highest z-index to be above everything */}
                  <div className="absolute top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-[9999] min-w-[280px] pointer-events-none group-hover:pointer-events-auto">
                    <div className="bg-card border border-border rounded-xl p-4 shadow-elegant backdrop-blur-sm">
                      <div className="text-center">
                        <div className="inline-flex items-center bg-orange/10 text-orange px-3 py-1 rounded-full text-xs font-medium mb-3">
                          {service.highlight}
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-muted-foreground text-sm animate-pulse">
              Passe o mouse sobre os pontos para ver os serviços
            </p>
          </div>
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