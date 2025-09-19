import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Phone, MessageCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import faqSupport from '@/assets/faq-support.jpg';

const FAQ = () => {
  const faqs = [
    {
      question: "Qual é a velocidade real da internet fibra da Supernet?",
      answer: "Nossa internet fibra entrega exatamente a velocidade contratada. Com tecnologia 100% fibra óptica, você tem velocidade simétrica (upload = download) e latência ultra baixa. Realizamos testes regulares para garantir que você receba sempre o que contratou.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "Como funciona a instalação? Tem custo adicional?",
      answer: "A instalação é 100% gratuita! Nossa equipe técnica especializada agenda um horário conveniente, realiza toda a instalação em até 2 horas e deixa tudo funcionando perfeitamente. Também oferecemos orientação completa sobre o uso dos equipamentos.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "Que equipamentos são fornecidos?",
      answer: "Fornecemos roteador Wi-Fi 6 de última geração, cabo de rede, e todos os adaptadores necessários. Os equipamentos são em regime de comodato (empréstimo gratuito) durante toda sua permanência como cliente. Se precisar de equipamentos adicionais, temos opções disponíveis."
    },
    {
      question: "E se eu tiver problemas técnicos? Como é o suporte?",
      answer: "Nosso suporte técnico funciona 24/7 com atendimento 100% humano. Você pode nos contatar via WhatsApp, telefone ou chat online. A maioria dos problemas são resolvidos remotamente em minutos. Para casos que precisem visita técnica, não cobramos taxa de deslocamento.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
    },
    {
      question: "Posso testar a internet antes de contratar?",
      answer: "Sim! Oferecemos 7 dias de teste gratuito para novos clientes. Se não ficar satisfeito com a qualidade da conexão neste período, cancelamos sem qualquer cobrança. Estamos confiantes de que você vai adorar nossa internet!"
    },
    {
      question: "Qual é o prazo de fidelidade?",
      answer: "Trabalhamos com contratos flexíveis. Nosso plano básico não tem fidelidade. Para planos premium, oferecemos opções com 12 meses de fidelidade em troca de descontos especiais e benefícios extras. Você escolhe o que faz mais sentido para você."
    },
    {
      question: "A Supernet atende na minha região?",
      answer: "Estamos em constante expansão! Atendemos as principais cidades de São Paulo, Rio de Janeiro, Minas Gerais e Bahia, com novos bairros sendo conectados mensalmente. Entre em contato via WhatsApp informando seu CEP que verificamos a disponibilidade imediatamente."
    },
    {
      question: "Como faço para contratar ou migrar minha internet?",
      answer: "É super simples! Entre em contato pelo WhatsApp, informe seu endereço e necessidades. Nossa equipe comercial prepara uma proposta personalizada. Cuidamos de todo o processo de migração, incluindo o cancelamento da operadora anterior se necessário."
    }
  ];

  const handleWhatsApp = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Tenho algumas dúvidas sobre os serviços da Supernet Fibra.', '_blank');
  };

  const handlePhone = () => {
    window.open('tel:+551140041234', '_self');
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Perguntas{' '}
            <span className="gradient-text">Frequentes</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Tire suas dúvidas sobre nossos serviços. Se não encontrar sua resposta aqui, 
            nossa equipe está pronta para ajudar via WhatsApp ou telefone.
          </p>
        </div>

        {/* FAQ Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          {/* Left Column - Image */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="relative bg-card rounded-2xl overflow-hidden shadow-elegant">
              <img
                src={faqSupport}
                alt="Suporte especializado da Supernet Fibra"
                className="w-full h-96 lg:h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-gray/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h3 className="text-2xl font-bold mb-2">Suporte Especializado</h3>
                <p className="text-white/90">Nossa equipe está sempre pronta para ajudar você 24 horas por dia, 7 dias por semana</p>
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
                    <div className="flex items-center space-x-3">
                      <span>{faq.question}</span>
                      {faq.videoUrl && (
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed">
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
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
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
                onClick={handlePhone}
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-6"
              >
                <Phone className="w-5 h-5 mr-2" />
                (11) 4004-1234
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;