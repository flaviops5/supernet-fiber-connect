import React from 'react';
import { Tv, Camera, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import alexaLogo from '@/assets/alexa-logo.png';
import googleAssistantLogo from '@/assets/google-assistant-logo.png';
import watchBrasilLogo from '@/assets/watch-brasil-logo.png';

const AdditionalServices = () => {
  const services = [
    {
      icon: () => (
        <div className="flex items-center justify-center space-x-1">
          <img src={alexaLogo} alt="Alexa" className="w-4 h-4 object-contain" />
          <img src={googleAssistantLogo} alt="Google Assistant" className="w-4 h-4 object-contain" />
        </div>
      ),
      title: "Automação Residencial",
      description: "Transforme sua casa em um lar inteligente com controle total pelo celular e comandos de voz!",
      features: ["Controle de iluminação", "Fechaduras inteligentes", "Climatização automática", "Cortinas e persianas", "Integração com Alexa/Google"],
      highlight: "A partir de R$ 299"
    },
    {
      icon: Tv,
      title: "Canais de Streaming",
      description: "Acesso completo aos melhores conteúdos de entretenimento",
      features: ["HBO MAX", "Telecine", "Premiere", "ESPN", "Paramount+"],
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
      title: "Serviços Domésticos",
      description: "Pequenos reparos e instalações residenciais com técnicos especializados",
      features: ["Instalação de TVs", "Montagem de móveis", "Pequenos reparos elétricos", "Configuração de rede"],
      highlight: "Desconto para clientes"
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
            <span className="gradient-text">Veja o que mais podemos fazer por você!</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Além da melhor internet fibra, oferecemos soluções completas para 
            tornar sua casa mais inteligente, segura e conectada.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-2xl p-8 hover:shadow-elegant transition-all duration-300 group flex flex-col h-full"
            >
              {/* Header */}
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  {service.title === 'Automação Residencial' ? (
                    <div className="flex items-center justify-center space-x-1">
                      <img src={alexaLogo} alt="Alexa" className="w-4 h-4 object-contain" />
                      <img src={googleAssistantLogo} alt="Google Assistant" className="w-4 h-4 object-contain" />
                    </div>
                  ) : (
                    React.createElement(service.icon as React.ElementType, { className: "w-8 h-8 text-primary-foreground" })
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold font-varela uppercase text-foreground group-hover:text-primary transition-colors mb-2">
                    {service.title}
                  </h3>
                  <div className="inline-flex items-center bg-orange/10 text-orange px-3 py-1 rounded-full text-sm font-medium">
                    {service.highlight}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-muted-foreground mb-6">
                {service.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-grow">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange rounded-full" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={() => handleWhatsApp(service.title)}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Solicitar Orçamento
              </Button>
            </div>
          ))}
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