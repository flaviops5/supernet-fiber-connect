import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Home, 
  Lightbulb, 
  Lock, 
  Video, 
  Thermometer, 
  Smartphone, 
  Wifi, 
  Shield,
  CheckCircle2,
  Phone,
  Clock,
  Zap
} from 'lucide-react';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import automacaoHero from '@/assets/automacao-hero.jpg';
import AutomacaoChatWidget from '@/components/AutomacaoChatWidget';
import { AutomacaoAgentChat } from '@/components/AutomacaoAgentChat';

const Automacao = () => {
  useScrollToHash();

  const handleWhatsApp = () => {
    const message = 'Olá! Gostaria de saber mais sobre os serviços de Automação Residencial da SUPERNET FIBRA.';
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`, '_blank');
  };

  const benefits = [
    {
      icon: Smartphone,
      title: 'Controle Total',
      description: 'Gerencie todos os dispositivos da sua casa através do seu smartphone, de qualquer lugar do mundo.'
    },
    {
      icon: Zap,
      title: 'Economia de Energia',
      description: 'Reduza até 30% do consumo de energia com automação inteligente de iluminação e climatização.'
    },
    {
      icon: Shield,
      title: 'Segurança Avançada',
      description: 'Monitore sua casa em tempo real com câmeras, sensores e alertas instantâneos no seu celular.'
    },
    {
      icon: Clock,
      title: 'Rotinas Personalizadas',
      description: 'Crie cenários automáticos para diferentes momentos do dia, como acordar, sair e dormir.'
    }
  ];

  const features = [
    {
      icon: Lightbulb,
      title: 'Iluminação Inteligente',
      description: 'Controle de luzes com ajuste de intensidade, cor e temperatura, com programação automática.',
      details: [
        'Lâmpadas LED conectadas',
        'Controle por voz e app',
        'Programação de horários',
        'Integração com sensores de presença'
      ]
    },
    {
      icon: Lock,
      title: 'Fechaduras Inteligentes',
      description: 'Acesso sem chave, desbloqueio remoto e registro completo de entradas e saídas.',
      details: [
        'Desbloqueio por senha/digital',
        'Controle remoto via app',
        'Histórico de acessos',
        'Compartilhamento de acesso temporário'
      ]
    },
    {
      icon: Video,
      title: 'Câmeras de Segurança',
      description: 'Monitoramento 24h com gravação em nuvem, visão noturna e detecção de movimento.',
      details: [
        'Câmeras Full HD/4K',
        'Visão noturna infravermelha',
        'Detecção inteligente de movimento',
        'Armazenamento em nuvem'
      ]
    },
    {
      icon: Thermometer,
      title: 'Climatização Inteligente',
      description: 'Controle de ar-condicionado e aquecedores com programação e economia automática.',
      details: [
        'Controle individual por ambiente',
        'Programação de temperatura',
        'Economia de energia',
        'Integração com assistentes de voz'
      ]
    },
    {
      icon: Wifi,
      title: 'Tomadas Inteligentes',
      description: 'Transforme qualquer aparelho em smart device com controle remoto e programação.',
      details: [
        'Liga/desliga remotamente',
        'Programação de horários',
        'Monitoramento de consumo',
        'Compatível com qualquer aparelho'
      ]
    },
    {
      icon: Home,
      title: 'Central de Automação',
      description: 'Hub central que integra todos os dispositivos em um único sistema inteligente.',
      details: [
        'Compatível com Alexa e Google',
        'Interface unificada',
        'Controle por voz',
        'Cenários personalizados'
      ]
    }
  ];

  const packages = [
    {
      name: 'Pacote Básico',
      price: 'A partir de R$ 1.299',
      features: [
        '3 Lâmpadas inteligentes',
        '2 Tomadas inteligentes',
        'Central de automação',
        'Configuração básica',
        'App de controle',
        'Suporte técnico'
      ],
      highlight: false
    },
    {
      name: 'Pacote Completo',
      price: 'A partir de R$ 2.999',
      features: [
        '8 Lâmpadas inteligentes',
        '4 Tomadas inteligentes',
        '2 Câmeras de segurança',
        '1 Fechadura inteligente',
        'Central de automação premium',
        'Configuração completa',
        'App de controle avançado',
        'Suporte técnico prioritário'
      ],
      highlight: true
    },
    {
      name: 'Pacote Premium',
      price: 'A partir de R$ 5.999',
      features: [
        'Iluminação completa da casa',
        'Tomadas em todos os ambientes',
        '4 Câmeras 4K',
        '2 Fechaduras inteligentes',
        'Controle de ar-condicionado',
        'Sensores de presença',
        'Central de automação profissional',
        'Projeto personalizado',
        'Instalação profissional',
        'Garantia estendida',
        'Suporte 24/7'
      ],
      highlight: false
    }
  ];

  const faqs = [
    {
      question: 'Como funciona a automação residencial?',
      answer: 'A automação residencial conecta diversos dispositivos da sua casa através de uma rede Wi-Fi, permitindo controle centralizado via smartphone, tablet ou comandos de voz. Um hub central gerencia todos os dispositivos, criando um ecossistema inteligente e integrado.'
    },
    {
      question: 'Preciso reformar minha casa para instalar?',
      answer: 'Não! A maioria dos dispositivos de automação são wireless (sem fio) e podem ser instalados sem obras ou reformas. Aproveitamos a instalação elétrica existente e adicionamos os dispositivos inteligentes de forma simples e rápida.'
    },
    {
      question: 'É compatível com Alexa e Google Home?',
      answer: 'Sim! Todos os nossos sistemas são compatíveis com os principais assistentes de voz do mercado, incluindo Amazon Alexa, Google Assistant e Apple HomeKit. Você pode controlar tudo por comando de voz.'
    },
    {
      question: 'E se faltar internet, os dispositivos param de funcionar?',
      answer: 'Os dispositivos continuam funcionando localmente mesmo sem internet. Você pode controlá-los manualmente ou através da rede local. Algumas funções remotas ficam temporariamente indisponíveis até o retorno da internet.'
    },
    {
      question: 'Quanto tempo leva a instalação?',
      answer: 'Depende do pacote escolhido. O Pacote Básico pode ser instalado em 4-6 horas. O Pacote Completo leva de 1 a 2 dias. Já o Pacote Premium, com projeto personalizado, pode levar de 3 a 5 dias úteis.'
    },
    {
      question: 'Qual o consumo de energia dos dispositivos inteligentes?',
      answer: 'Os dispositivos consomem muito pouco (cerca de 1-5W em standby). Na verdade, a automação ajuda a ECONOMIZAR energia, com desligamento automático de luzes e aparelhos, resultando em redução de até 30% na conta de energia.'
    },
    {
      question: 'É seguro? Podem hackear meu sistema?',
      answer: 'Sim, é seguro! Utilizamos criptografia de ponta a ponta, autenticação de dois fatores e atualizações constantes de segurança. Trabalhamos apenas com fabricantes certificados que seguem rigorosos padrões de segurança internacionais.'
    },
    {
      question: 'Posso expandir o sistema depois?',
      answer: 'Com certeza! Todos os nossos sistemas são modulares e escaláveis. Você pode começar com o básico e ir adicionando novos dispositivos conforme sua necessidade e orçamento, sem precisar trocar o que já foi instalado.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(rgba(76, 99, 173, 0.9), rgba(247, 117, 39, 0.8)), url(${automacaoHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Home className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Casa Inteligente</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 font-varela">
              Transforme sua Casa em um
              <span className="block mt-2">Lar Inteligente</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Controle iluminação, segurança, climatização e muito mais através do seu smartphone. 
              Conforto, economia e segurança em um único sistema.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleWhatsApp}
                className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6"
              >
                <Phone className="w-5 h-5 mr-2" />
                Solicitar Orçamento
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => document.getElementById('pacotes')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/10 border-white text-white hover:bg-white/20 text-lg px-8 py-6"
              >
                Ver Pacotes
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Por que Automatizar sua Casa?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Descubra como a automação residencial pode transformar seu dia a dia
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                    <benefit.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Soluções de <span className="gradient-text">Automação</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Conheça todos os recursos disponíveis para sua casa inteligente
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pacotes */}
      <section id="pacotes" className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Escolha seu Pacote
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Soluções completas para todos os perfis e necessidades
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {packages.map((pkg, index) => (
              <Card 
                key={index} 
                className={`relative ${pkg.highlight ? 'border-primary border-2 shadow-xl' : ''}`}
              >
                {pkg.highlight && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{pkg.name}</CardTitle>
                  <div className="text-3xl font-bold gradient-text">{pkg.price}</div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={handleWhatsApp}
                    className={pkg.highlight ? 'cta-gradient w-full' : 'w-full'}
                    variant={pkg.highlight ? 'default' : 'outline'}
                  >
                    Solicitar Orçamento
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-xl text-muted-foreground">
                Tire suas dúvidas sobre automação residencial
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-card border rounded-lg px-6"
                >
                  <AccordionTrigger className="text-left hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-hero text-white border-0">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Pronto para Transformar sua Casa?
                </h2>
                <p className="text-xl mb-8 text-white/90">
                  Fale com nossos especialistas e descubra a solução ideal para você
                </p>
                <Button 
                  size="lg"
                  onClick={handleWhatsApp}
                  className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Falar com Especialista
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Chat Integrado com Agente IA */}
      <AutomacaoAgentChat />

      {/* Chat Widget Flutuante (removido - usando chat integrado) */}
    </div>
  );
};

export default Automacao;
