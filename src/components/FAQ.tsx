import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Phone, 
  MessageCircle, 
  Play, 
  Wifi, 
  Wrench, 
  Router, 
  Network, 
  Signal, 
  Zap, 
  Headphones, 
  ShoppingCart, 
  MapPin, 
  CreditCard, 
  Shield 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const FAQ = () => {
  const faqs = [
    {
      question: "O que é fibra óptica? O que é FTTH? Como a fibra chega em minha residência?",
      answer: "Fibra óptica é um filamento extremamente fino e flexível, feito de vidro ultrapuro, plástico ou outro isolante térmico (material de com alta resistência ao fluxo de corrente elétrica). Possui uma estrutura simples, composta por capa protetora, interface e núcleo.\n\nFFTH (Fiber To The Home, ou, Fibra para Casa), é a entrega da serviços de internet sobre fibra óptica. FFTH é o método mais rápido, confiável e seguro de conectar sua casa à internet. Transporta informações a velocidade da luz.\n\nA rede é lançada nos postes de energia espalhados em sua região. A partir do poste mais perto de sua casa, a fibra desce e entra na tubulação já existente e vai até o ponto escolhido para a instalação do modem óptico.\n\nEm caso de prédios, a fibra chega até o Distribuidor Geral (DG) e de lá sobre até cada shaft de cada andar. Em cada andar é colocado um Distribuidor Interno Óptico de parede (DIO), a partir deste DIO, a fibra entra em seu apartamento pela tubulação já existente.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: Network
    },
    {
      question: "Como funciona a instalação? Tem custo adicional?",
      answer: "A instalação é 100% gratuita! Nossa equipe técnica especializada agenda um horário conveniente, realiza toda a instalação em até 2 horas e deixa tudo funcionando perfeitamente. Também oferecemos orientação completa sobre o uso dos equipamentos.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: Wrench
    },
    {
      question: "Quais equipamentos serão instalados em minha casa e o que preciso ter em minha residência?",
      answer: "Será instalado um equipamento chamado ONU (Unidades óptica) ela é responsável em converter o sinal de luz em sinal digital. Dependendo do plano escolhido, além da ONU, será também instalado roteadores que são responsáveis pelo sinal wi-fi e também pela rede cabeada caso opte em usar este tipo de conexão.\n\nÉ necessário duas tomadas de energia no ponto principal onde será instalado a ONU e o primeiro roteador. Caso o plano escolhido seja com dois ou mais roteadores, cada equipamento também precisará de tomada com energia.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: Router
    },
    {
      question: "Meu plano tem mais de um roteador, como é feita a instalação?",
      answer: "Para o serviço de internet ser usado em sua plenitude, interligamos os roteadores dos planos Max e Super através de cabos UTP. Isso garantirá que a velocidade contratada chegue nos equipamentos através dos cabos sem nenhuma interferência. Cada roteador instalado será responsável em distribuir o sinal wi-fi 2.4 e 5.8 no ambiente em que está.\n\nNa sua residência, é necessário que os dutos estejam livres para a passagem do cabo UTP. Na instalação, não nos responsabilizamos por obras civis para desobstrução.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: Wifi
    },
    {
      question: "O sinal wi-fi disponibilizado cobre toda minha casa?",
      answer: "Navegar na internet por rede wi-fi é uma realidade e uma conquista tecnológica, porém essa tecnologia de acesso tem várias limitações de sua própria natureza. Vários fatores podem interferir na propagação do sinal dentro da sua residência: Telefone sem fio, vidros, espelhos, wi-fi dos vizinhos. Obstáculos como paredes e lajes reduzem muito a amplitude do sinal. Além disso, quanto mais distante você estiver do roteador, menores serão as velocidades. Pensando nestes cenários, desenvolvemos os produtos MAX e SUPER. Queremos que nossos clientes usufruam ao máximo as altas velocidades da SUPERNET FIBRA, instalamos roteadores de ótimas marcas com tecnologia AC Gigabits com sinal 2.4 e 5.8 mega-hertz de potência, normalmente, cada roteador em circunstâncias normais, cobre uma área de 50m² a 60m².",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: Signal
    },
    {
      question: "Qual é a velocidade real da internet fibra da SUPERNET FIBRA?",
      answer: "Nossa internet fibra entrega exatamente a velocidade contratada. Com tecnologia 100% fibra óptica, você tem velocidade simétrica (upload = download) e latência ultra baixa. Realizamos testes regulares para garantir que você receba sempre o que contratou.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: Zap
    },
    {
      question: "E se eu tiver problemas técnicos? Como é o suporte?",
      answer: "Nosso suporte técnico funciona 24/7 com atendimento 100% humano. Você pode nos contatar via WhatsApp, telefone ou chat online. A maioria dos problemas são resolvidos remotamente em minutos. Para casos que precisem visita técnica, não cobramos taxa de deslocamento.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: Headphones
    },
    {
      question: "Como faço para contratar ou migrar minha internet?",
      answer: "É super simples! Entre em contato pelo WhatsApp, informe seu endereço e necessidades. Nossa equipe comercial prepara uma proposta personalizada. Cuidamos de todo o processo de migração, incluindo o cancelamento da operadora anterior se necessário.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: ShoppingCart
    },
    {
      question: "A SUPERNET FIBRA atende na minha região?",
      answer: "Estamos em constante expansão! Atendemos as principais cidades de São Paulo, Rio de Janeiro, Minas Gerais e Bahia, com novos bairros sendo conectados mensalmente. Entre em contato via WhatsApp informando seu CEP que verificamos a disponibilidade imediatamente.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: MapPin
    },
    {
      question: "Como é o pagamento da mensalidade?",
      answer: "Disponibilizamos as datas dos dias 01, 05, 10, 15, 20, 25 de cada mês para a escolha do pagamento. A primeira mensalidade sempre será cobrada proporcionalmente ao dia de escolha do pagamento, exemplo: Caso sua internet seja instalada no dia 08 e opte o pagamento para o dia 25, mandaremos um boleto com o proporcional de uso do dia 8 até o dia 25. As demais mensalidades obedecerá o fluxo de 30 dias.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      icon: CreditCard
    }
  ];

  const handleWhatsApp = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Tenho algumas dúvidas sobre os serviços da SUPERNET FIBRA.', '_blank');
  };

  const handlePhone = () => {
    window.open('tel:+551140041234', '_self');
  };

  return (
    <section id="perguntas-frequentes" className="py-16 bg-gradient-to-br from-light-gray to-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-varela uppercase text-foreground mb-6">
            Perguntas{' '}
            <span className="gradient-text">Frequentes</span>
          </h2>
        </div>

        {/* FAQ Two Column Layout */}
<div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Column - First Half of FAQs */}
          <div className="space-y-6">
            {faqs.slice(0, Math.ceil(faqs.length / 2)).map((faq, index) => {
              const IconComponent = faq.icon;
              return (
                   <div key={index} className="bg-[#f8f7f8] rounded-2xl border-l-4 border-[#4d64ae] shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 animate-fade-in h-auto"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Accordion type="single" collapsible>
                    <AccordionItem value={`item-${index}`} className="border-none">
                      <AccordionTrigger className="px-6 py-6 hover:no-underline group">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-12 flex justify-center">
                            <IconComponent className="w-8 h-8 text-[#4d64ae] stroke-2 group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-foreground group-hover:text-[#4d64ae] transition-colors leading-tight">
                              {faq.question}
                            </h3>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4 ml-16">
                          <div className="bg-white/60 rounded-xl p-4 border border-white/30">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                              {faq.answer}
                            </p>
                          </div>
                          {faq.videoUrl && (
                            <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-white/70 text-xs ml-2 font-mono">Vídeo Explicativo</span>
                              </div>
                              <iframe
                                src={faq.videoUrl}
                                title={`Vídeo explicativo: ${faq.question}`}
                                className="w-full h-48 border-0 mt-8"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              );
            })}
          </div>

          {/* Right Column - Second Half of FAQs */}
          <div className="space-y-6">
            {faqs.slice(Math.ceil(faqs.length / 2)).map((faq, index) => {
              const IconComponent = faq.icon;
              const adjustedIndex = index + Math.ceil(faqs.length / 2);
              return (
                <div
                  key={adjustedIndex}
                  className="bg-[#f8f7f8] rounded-2xl border-l-4 border-[#f48120] shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 animate-fade-in h-auto"
                  style={{ animationDelay: `${(index + Math.ceil(faqs.length / 2)) * 0.1}s` }}
                >
                  <Accordion type="single" collapsible>
                    <AccordionItem value={`item-${adjustedIndex}`} className="border-none">
                      <AccordionTrigger className="px-6 py-6 hover:no-underline group">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-12 flex justify-center">
                            <IconComponent className="w-8 h-8 text-[#f48120] stroke-2 group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-foreground group-hover:text-[#f48120] transition-colors leading-tight">
                              {faq.question}
                            </h3>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4 ml-16">
                          <div className="bg-white/60 rounded-xl p-4 border border-white/30">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                              {faq.answer}
                            </p>
                          </div>
                          {faq.videoUrl && (
                            <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-white/70 text-xs ml-2 font-mono">Vídeo Explicativo</span>
                              </div>
                              <iframe
                                src={faq.videoUrl}
                                title={`Vídeo explicativo: ${faq.question}`}
                                className="w-full h-48 border-0 mt-8"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16">
          <div className="bg-[#4d64ae] py-4 px-6 rounded-lg flex items-center justify-between">
            <span className="text-white font-medium">Ainda tem dúvidas? Fale conosco.</span>
            <div className="flex gap-4">
              <button
                onClick={handleWhatsApp}
                className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => window.open('tel:+556135475886', '_self')}
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
              >
                <Phone className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;