import { Button } from '@/components/ui/button';

const AdditionalServices = () => {
  const services = [
    {
      title: "Monitoramento Veicular",
      description: "Rastreamento completo com GPS em tempo real, bloqueio remoto, histórico de rotas e alertas personalizados para seu veículo.",
      highlight: "Desconto anual"
    },
    {
      title: "Monitoramento Residencial",
      description: "Sistema completo de monitoramento 24h com central de alarmes, app mobile e resposta rápida para sua segurança residencial.",
      highlight: "Sem taxa de adesão"
    },
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
      title: "Automações",
      description: "Transforme sua casa em um lar inteligente com controle de iluminação, fechaduras inteligentes, climatização automática e tudo integrado a Alexa/Google.",
      highlight: "A partir de R$ 299"
    },
    {
      title: "Canais de Streaming",
      description: "Acesso completo aos melhores conteúdos de entretenimento com Paramount+, Telecine, HBO MAX, ESPN, Premier e muito mais.",
      highlight: "Combo por R$ 49,90/mês"
    },
    {
      title: "Equipamentos",
      description: "Câmeras IP 4K com visão noturna, roteadores Wi-Fi 6E profissionais, Fire TV Stick 4K e DVR em nuvem para sua segurança.",
      highlight: "Instalação inclusa"
    },
    {
      title: "Reparos Internos",
      description: "Pequenos reparos e instalações residenciais com técnicos especializados em instalação de TVs, montagem de móveis, reparos elétricos e configuração de rede.",
      highlight: "Desconto para clientes"
    }
  ];

  // Calculate circular positions with varied distances for movement
  const getServicePosition = (index: number, total: number) => {
    // Vary radius for more dynamic layout (207-299px range - 15% larger)
    const baseRadius = 230;
    const radiusVariation = [46, -23, 35, -35, 23, -46, 40, 60, 29]; // Different for each service
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

        {/* Desktop: Interactive Radial Services */}
        <div className="hidden md:block relative h-[690px] max-w-4xl mx-auto mb-16">
          {/* Central Logo */}
          {/* Blue circle behind logo */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-32 h-32 bg-gradient-primary rounded-full shadow-elegant"></div>
          </div>
          
          {/* Logo */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <img 
              src="/assets/logo-supernet.png" 
              alt="SUPERNET FIBRA" 
              className="w-20 h-20 object-contain"
            />
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
                  {/* Always Visible Title - Positioned based on service */}
                  <div className={`absolute min-w-max z-30 ${
                    service.title === "Canais de Streaming" 
                      ? "top-1/2 right-8 transform -translate-y-1/2" // Position to the left of circle
                      : service.title === "Equipamentos" 
                        ? "top-1/2 left-8 transform -translate-y-1/2" // Position in front of circle
                        : service.title === "Reparos Internos" 
                          ? "top-1/2 left-8 transform -translate-y-1/2" // Position in front of circle
                          : "top-10 left-1/2 transform -translate-x-1/2"  // Default position for others
                  }`}>
                    <h3 className="text-xs font-bold font-varela uppercase text-foreground bg-gradient-primary text-transparent bg-clip-text text-center px-2 py-1 bg-card/80 rounded-lg backdrop-blur-sm border border-border/50">
                      {service.title}
                    </h3>
                  </div>
                  
                  {/* Circle Point - Behind title */}
                  <div className="w-6 h-6 bg-primary rounded-full shadow-lg group-hover:scale-125 transition-all duration-300 flex items-center justify-center z-10">
                    <div className="w-3 h-3 bg-white rounded-full group-hover:bg-orange transition-colors duration-300"></div>
                  </div>
                  
                  {/* Hover Expanded Card - Smart positioning to avoid overlap */}
                  <div className={`absolute opacity-0 group-hover:opacity-100 transition-all duration-300 z-[99999] min-w-[280px] pointer-events-none group-hover:pointer-events-auto ${
                    // Position tooltip based on specific service to avoid overlaps
                    service.title === "Monitoramento Veicular" // índice 0
                      ? "top-1/2 left-8 transform -translate-y-1/2" // mais para a direita
                    : service.title === "Monitoramento Residencial" // índice 1
                      ? "top-1/2 left-8 transform -translate-y-1/2" // mais para a direita
                    : service.title === "Telemedicina" // índice 2
                      ? "bottom-4 left-8 transform" // mais para baixo e do lado direito
                    : service.title === "Telefonia Fixa" // índice 4
                      ? "top-1/2 right-8 transform -translate-y-1/2" // caixa do lado esquerdo
                    : service.title === "Automações" // índice 5
                      ? "top-1/2 right-8 transform -translate-y-1/2" // caixa do lado esquerdo
                    : service.title === "Reparos Internos" // índice 8
                      ? "top-1/2 left-8 transform -translate-y-1/2" // mais para a direita
                    : index < 2 // Other top services
                      ? "top-8 left-1/2 transform -translate-x-1/2"
                    : index < 4 // Other right services  
                      ? "top-1/2 left-8 transform -translate-y-1/2"
                    : index < 6 // Other bottom services
                      ? "bottom-8 left-1/2 transform -translate-x-1/2"
                    : index < 8 // Other left services
                      ? "top-1/2 right-8 transform -translate-y-1/2"
                    : "top-8 left-1/2 transform -translate-x-1/2" // Default for remaining
                  }`}>
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
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-muted-foreground text-sm animate-pulse">
              Passe o mouse sobre os pontos para ver os serviços
            </p>
          </div>
        </div>

        {/* Mobile: Grid Layout */}
        <div className="md:hidden mb-16">
          {/* Central Logo for Mobile */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-primary rounded-full shadow-elegant mx-auto mb-4">
              <img 
                src="/assets/logo-supernet.png" 
                alt="SUPERNET FIBRA" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Toque nos cartões para mais informações
            </p>
          </div>

          {/* Mobile Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 group cursor-pointer"
                onClick={() => handleWhatsApp(service.title)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-primary rounded-full mt-2 flex-shrink-0 group-hover:bg-orange transition-colors duration-300"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold font-varela uppercase text-foreground leading-tight">
                        {service.title}
                      </h3>
                    </div>
                    <div className="inline-flex items-center bg-orange/10 text-orange px-2 py-1 rounded-full text-xs font-medium mb-2">
                      {service.highlight}
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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