import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Phone, MessageCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import faqSupport from '@/assets/faq-support-ultra.jpg';
import personPointing from '@/assets/person-pointing-faq.jpg';

const FAQ = () => {
  const faqs = [
    {
      question: "O que é fibra óptica? O que é FTTH? Como a fibra chega em minha residência?",
      answer: "Fibra óptica é um filamento extremamente fino e flexível, feito de vidro ultrapuro, plástico ou outro isolante térmico (material de com alta resistência ao fluxo de corrente elétrica). Possui uma estrutura simples, composta por capa protetora, interface e núcleo.\n\nFFTH (Fiber To The Home, ou, Fibra para Casa), é a entrega da serviços de internet sobre fibra óptica. FFTH é o método mais rápido, confiável e seguro de conectar sua casa à internet. Transporta informações a velocidade da luz.\n\nA rede é lançada nos postes de energia espalhados em sua região. A partir do poste mais perto de sua casa, a fibra desce e entra na tubulação já existente e vai até o ponto escolhido para a instalação do modem óptico.\n\nEm caso de prédios, a fibra chega até o Distribuidor Geral (DG) e de lá sobre até cada shaft de cada andar. Em cada andar é colocado um Distribuidor Interno Óptico de parede (DIO), a partir deste DIO, a fibra entra em seu apartamento pela tubulação já existente.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "Como funciona a instalação? Tem custo adicional?",
      answer: "A instalação é 100% gratuita! Nossa equipe técnica especializada agenda um horário conveniente, realiza toda a instalação em até 2 horas e deixa tudo funcionando perfeitamente. Também oferecemos orientação completa sobre o uso dos equipamentos.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "Quais equipamentos serão instalados em minha casa e o que preciso ter em minha residência?",
      answer: "Será instalado um equipamento chamado ONU (Unidades óptica) ela é responsável em converter o sinal de luz em sinal digital. Dependendo do plano escolhido, além da ONU, será também instalado roteadores que são responsáveis pelo sinal wi-fi e também pela rede cabeada caso opte em usar este tipo de conexão.\n\nÉ necessário duas tomadas de energia no ponto principal onde será instalado a ONU e o primeiro roteador. Caso o plano escolhido seja com dois ou mais roteadores, cada equipamento também precisará de tomada com energia.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "Meu plano tem mais de um roteador, como é feita a instalação?",
      answer: "Para o serviço de internet ser usado em sua plenitude, interligamos os roteadores dos planos Max e Super através de cabos UTP. Isso garantirá que a velocidade contratada chegue nos equipamentos através dos cabos sem nenhuma interferência. Cada roteador instalado será responsável em distribuir o sinal wi-fi 2.4 e 5.8 no ambiente em que está.\n\nNa sua residência, é necessário que os dutos estejam livres para a passagem do cabo UTP. Na instalação, não nos responsabilizamos por obras civis para desobstrução.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "O sinal wi-fi disponibilizado cobre toda minha casa?",
      answer: "Navegar na internet por rede wi-fi é uma realidade e uma conquista tecnológica, porém essa tecnologia de acesso tem várias limitações de sua própria natureza. Vários fatores podem interferir na propagação do sinal dentro da sua residência: Telefone sem fio, vidros, espelhos, wi-fi dos vizinhos. Obstáculos como paredes e lajes reduzem muito a amplitude do sinal. Além disso, quanto mais distante você estiver do roteador, menores serão as velocidades. Pensando nestes cenários, desenvolvemos os produtos MAX e SUPER. Queremos que nossos clientes usufruam ao máximo as altas velocidades da SUPERNET FIBRA, instalamos roteadores de ótimas marcas com tecnologia AC Gigabits com sinal 2.4 e 5.8 mega-hertz de potência, normalmente, cada roteador em circunstâncias normais, cobre uma área de 50m² a 60m².",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "Qual é a velocidade real da internet fibra da SUPERNET FIBRA?",
      answer: "Nossa internet fibra entrega exatamente a velocidade contratada. Com tecnologia 100% fibra óptica, você tem velocidade simétrica (upload = download) e latência ultra baixa. Realizamos testes regulares para garantir que você receba sempre o que contratou.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "E se eu tiver problemas técnicos? Como é o suporte?",
      answer: "Nosso suporte técnico funciona 24/7 com atendimento 100% humano. Você pode nos contatar via WhatsApp, telefone ou chat online. A maioria dos problemas são resolvidos remotamente em minutos. Para casos que precisem visita técnica, não cobramos taxa de deslocamento.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "Como faço para contratar ou migrar minha internet?",
      answer: "É super simples! Entre em contato pelo WhatsApp, informe seu endereço e necessidades. Nossa equipe comercial prepara uma proposta personalizada. Cuidamos de todo o processo de migração, incluindo o cancelamento da operadora anterior se necessário.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "A SUPERNET FIBRA atende na minha região?",
      answer: "Estamos em constante expansão! Atendemos as principais cidades de São Paulo, Rio de Janeiro, Minas Gerais e Bahia, com novos bairros sendo conectados mensalmente. Entre em contato via WhatsApp informando seu CEP que verificamos a disponibilidade imediatamente.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "Como é o pagamento da mensalidade?",
      answer: "Disponibilizamos as datas dos dias 01, 05, 10, 15, 20, 25 de cada mês para a escolha do pagamento. A primeira mensalidade sempre será cobrada proporcionalmente ao dia de escolha do pagamento, exemplo: Caso sua internet seja instalada no dia 08 e opte o pagamento para o dia 25, mandaremos um boleto com o proporcional de uso do dia 8 até o dia 25. As demais mensalidades obedecerá o fluxo de 30 dias.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "O plano tem fidelidade?",
      answer: "Trabalhamos com contratos flexíveis. Nosso plano básico não tem fidelidade. Para planos premium, oferecemos opções com 12 meses de fidelidade em troca de descontos especiais e benefícios extras. Você escolhe o que faz mais sentido para você.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    }
  ];

  const handleWhatsApp = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Tenho algumas dúvidas sobre os serviços da SUPERNET FIBRA.', '_blank');
  };

  const handlePhone = () => {
    window.open('tel:+551140041234', '_self');
  };

  return (
    <section id="perguntas-frequentes" className="py-12 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-6">
            Perguntas{' '}
            <span className="gradient-text">Frequentes</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Tire suas dúvidas sobre nossos serviços, planos e tecnologia. 
            Se não encontrar a resposta que procura, entre em contato conosco!
          </p>
        </div>

        {/* FAQ Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          {/* Left Column - Image */}
          <div className="lg:self-stretch">
            <div className="relative bg-card rounded-2xl overflow-hidden shadow-elegant h-full">
              <img
                src={faqSupport}
                alt="Equipe de suporte ajudando clientes com dúvidas"
                loading="lazy"
                decoding="async"
                className="w-full h-full min-h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-gray/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h3 className="text-2xl font-bold font-varela uppercase mb-2">Tire suas dúvidas</h3>
                <p className="text-white/90">Encontre respostas rápidas para as principais questões sobre nossos serviços</p>
              </div>
            </div>
          </div>

          {/* Right Column - FAQ Accordion */}
          <div>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-xl px-6 py-2 shadow-sm hover:shadow-card transition-shadow"
                >
                  <AccordionTrigger className="text-left text-lg font-semibold text-foreground hover:text-primary py-6">
                    <span>{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>
                      {faq.videoUrl && (
                        <div className="relative bg-card rounded-lg overflow-hidden shadow-sm">
                          <iframe
                            src={faq.videoUrl}
                            title={`Vídeo explicativo: ${faq.question}`}
                            className="w-full h-64 border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-hero rounded-2xl p-8 md:p-12 text-white">
            <h3 className="text-2xl md:text-3xl font-bold font-varela uppercase mb-4">
              Ainda tem dúvidas?
            </h3>
            <p className="text-white/90 mb-8 max-w-2xl mx-auto">
              Nossa equipe está disponível 24/7 para esclarecer qualquer questão 
              e ajudar você a escolher o melhor plano para suas necessidades.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleWhatsApp}
                size="lg"
                className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Falar no WhatsApp
              </Button>
              <Button
                onClick={() => window.open('tel:+556135475886', '_self')}
                variant="outline"
                size="lg"
                className="border-white text-blue-400 hover:bg-white hover:text-blue-600 text-lg px-8 py-6"
              >
                <Phone className="w-5 h-5 mr-2" />
                61 3547-5886 / 99947-5886
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;