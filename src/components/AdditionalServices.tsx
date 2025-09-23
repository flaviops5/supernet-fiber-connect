import { Button } from '@/components/ui/button';

const AdditionalServices = () => {
  const services = [
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
      title: "Telemedicina",
      description: "Consultas médicas online 24h com profissionais qualificados, receitas digitais, especialistas disponíveis e plano familiar completo.",
      highlight: "Primeiro mês grátis"
    },
    {
      title: "Monitoramento Residencial",
      description: "Sistema completo de monitoramento 24h com central de alarmes, app mobile e resposta rápida para sua segurança residencial.",
      highlight: "Sem taxa de adesão"
    },
    {
      title: "Monitoramento de Veículos",
      description: "Rastreamento completo com GPS em tempo real, bloqueio remoto, histórico de rotas e alertas personalizados para seu veículo.",
      highlight: "Desconto anual"
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

        {/* Services Grid */}
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-2xl p-4 hover:shadow-elegant transition-all duration-300 group flex flex-col"
            >
              {/* Header */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold font-varela uppercase text-foreground group-hover:text-primary transition-colors mb-3 bg-gradient-primary text-transparent bg-clip-text">
                  {service.title}
                </h3>
                <div className="inline-flex items-center bg-orange/10 text-orange px-3 py-1 rounded-full text-sm font-medium mb-3">
                  {service.highlight}
                </div>
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-center text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
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