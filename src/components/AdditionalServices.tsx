import { Home, Tv, Camera, Wrench, Wifi, Phone, Heart, Shield, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import repairTechnicianImg from '@/assets/repair-technician.png';

const AdditionalServices = () => {
  const services = [
    {
      icon: Home,
      title: "Automação Residencial",
      description: "Transforme sua casa em um lar inteligente com controle total pelo celular",
      features: ["Controle de iluminação", "Fechaduras inteligentes", "Climatização automática", "Integração com Alexa/Google"],
      highlight: "A partir de R$ 299"
    },
    {
      icon: Tv,
      title: "Canais de Streaming",
      description: "Acesso completo aos melhores conteúdos de entretenimento",
      features: ["Paramount+", "Telecine", "HBO MAX", "ESPN", "Premier", "Dentre outros"],
      highlight: "Combo por R$ 49,90/mês"
    },
    {
      icon: Camera,
      title: "Equipamentos & Segurança",
      description: "Câmeras IP, roteadores profissionais e equipamentos de rede",
      features: ["Câmeras 4K com visão noturna", "Roteadores Wi-Fi 6E", "Fire TV Stick 4K", "DVR em nuvem"],
      highlight: "Instalação inclusa"
    },
    {
      icon: Wrench,
      title: "Reparos Internos",
      description: "Pequenos reparos e instalações residenciais com técnicos especializados",
      features: ["Instalação de TVs", "Montagem de móveis", "Pequenos reparos elétricos", "Configuração de rede"],
      highlight: "Desconto para clientes",
      image: repairTechnicianImg
    },
    {
      icon: Wifi,
      title: "Redes WiFi",
      description: "Instalação e configuração de redes WiFi profissionais para sua casa ou empresa",
      features: ["Cobertura total", "Alta velocidade", "Segurança avançada", "Suporte técnico"],
      highlight: "Instalação gratuita"
    },
    {
      icon: Phone,
      title: "Telefonia Fixa",
      description: "Linha telefônica fixa com qualidade superior e tarifas especiais",
      features: ["Chamadas ilimitadas", "Qualidade HD", "Portabilidade gratuita", "Integração com celular"],
      highlight: "A partir de R$ 29,90"
    },
    {
      icon: Heart,
      title: "Telemedicina",
      description: "Consultas médicas online com profissionais qualificados",
      features: ["Consultas 24h", "Receitas digitais", "Especialistas", "Plano familiar"],
      highlight: "Primeiro mês grátis"
    },
    {
      icon: Shield,
      title: "Monitoramento Residencial",
      description: "Sistema completo de monitoramento e segurança para sua residência",
      features: ["Monitoramento 24h", "Central de alarmes", "App mobile", "Resposta rápida"],
      highlight: "Sem taxa de adesão"
    },
    {
      icon: Car,
      title: "Monitoramento de Veículos",
      description: "Rastreamento e monitoramento completo do seu veículo",
      features: ["GPS em tempo real", "Bloqueio remoto", "Histórico de rotas", "Alertas personalizados"],
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
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-2xl p-6 hover:shadow-elegant transition-all duration-300 group flex flex-col h-full"
            >
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-6">
                {service.image ? (
                  <div className="w-24 h-24 mb-4 rounded-xl overflow-hidden bg-gradient-primary p-2">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mb-4">
                    <service.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                )}
                <h3 className="text-xl font-bold font-varela uppercase text-foreground group-hover:text-primary transition-colors mb-2">
                  {service.title}
                </h3>
                <div className="inline-flex items-center bg-orange/10 text-orange px-3 py-1 rounded-full text-sm font-medium">
                  {service.highlight}
                </div>
              </div>

              {/* Description */}
              <p className="text-muted-foreground mb-4 text-center text-sm">
                {service.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-grow">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange rounded-full flex-shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
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