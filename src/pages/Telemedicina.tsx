import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, MessageCircle, User, Smartphone, Phone, Heart, CheckCircle, Video, Stethoscope, HelpCircle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import telemedicinaHero from '@/assets/telemedicina-hero-new.png';
import telemedicinaMobile from '@/assets/telemedicina-mobile.jpg';
import telemedicinaFamily from '@/assets/telemedicina-family.jpg';


const Telemedicina = () => {
  console.log('Telemedicina page loading...');
  const navigate = useNavigate();
  
  const handleWhatsApp = () => {
    window.open('https://api.whatsapp.com/send/?phone=61999475886&text=Ol%C3%A1!%20Vi%20os%20planos%20de%20telemedicina%20e%20gostaria%20de%20contratar!', '_blank');
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  const features = [
    {
      icon: Clock,
      title: "Consulta 24 horas por dia",
      description: "Em minutos e depois de alguns cliques um médico já estará atendendo sua urgência."
    },
    {
      icon: MessageCircle,
      title: "Equipe Médica especializada",
      description: "Médicos qualificados e experientes para um atendimento excepcional."
    },
    {
      icon: User,
      title: "Foco no paciente",
      description: "Colocamos o bem-estar e a urgência de nossos pacientes no centro de tudo, afinal, saúde é coisa muito séria."
    },
    {
      icon: Smartphone,
      title: "Tecnologia + Saúde",
      description: "Democratizar o acesso a saúde por meio de inovação tecnológica e pensamento disruptivo."
    }
  ];

  const planIncludes = [
    "Consultas on-line para 4 pessoas",
    "Pediatra",
    "Clínico geral",
    "Certificado médico",
    "Receituário médico",
    "Solicitação de exames",
    "Atestado médico",
    "Prescrição médica",
    "Orientação médica",
    "Encaminhamento médico"
  ];

  const faqs = [
    {
      question: "O que é TELEMEDICINA?",
      answer: "A telemedicina é o exercício da medicina através de tecnologias de comunicação, permitindo consultas médicas à distância por meio de videoconferência, chat ou telefone. É uma prática regulamentada pelo Conselho Federal de Medicina (CFM) que oferece atendimento médico remoto com a mesma qualidade de uma consulta presencial."
    },
    {
      question: "Como funciona a TELEMEDICINA?",
      answer: "É muito simples! Após a contratação do serviço, você pode acessar nossos médicos 24 horas por dia através de videochamada pelo seu smartphone, tablet ou computador. Basta entrar em contato conosco pelo WhatsApp e em poucos minutos você será conectado com um médico especialista."
    },
    {
      question: "Quais são os benefícios da TELEMEDICINA?",
      answer: "Os principais benefícios incluem: atendimento 24h disponível todos os dias da semana, economia de tempo e dinheiro (sem deslocamento), consultas ilimitadas, receitas e atestados digitais com validade legal, atendimento para toda a família (até 4 pessoas), e acesso a médicos especializados em clínica geral e pediatria."
    },
    {
      question: "A TELEMEDICINA é segura?",
      answer: "Sim, é totalmente segura! Utilizamos plataformas certificadas e criptografadas para garantir a privacidade dos seus dados. Nossos médicos são registrados no CRM e seguem todos os protocolos médicos estabelecidos. Todas as consultas são sigilosas e protegidas pela Lei Geral de Proteção de Dados (LGPD)."
    },
    {
      question: "Posso usar a TELEMEDICINA em emergências?",
      answer: "A telemedicina é indicada para urgências e casos não emergenciais. Para emergências graves que necessitam intervenção imediata, orientamos procurar o serviço de emergência mais próximo (SAMU 192, Bombeiros 193). Nossos médicos podem avaliar a situação e orientar sobre a necessidade de atendimento presencial."
    },
    {
      question: "Preciso instalar um aplicativo para usar a TELEMEDICINA?",
      answer: "Não é necessário instalar aplicativos! Nosso serviço funciona diretamente pelo WhatsApp e navegador do seu celular ou computador. Todo o processo é simples e intuitivo, você só precisa ter acesso à internet."
    },
    {
      question: "Como recebo minha receita médica ou atestado, ela tem validade?",
      answer: "Todas as receitas, atestados e demais documentos médicos são emitidos digitalmente e enviados diretamente para o seu WhatsApp ou email. Estes documentos possuem assinatura digital do médico e são válidos em todo território nacional, conforme regulamentação do CFM."
    },
    {
      question: "Quanto custa o serviço de TELEMEDICINA?",
      answer: "Nosso plano família custa apenas R$ 49,90 por mês e cobre até 4 pessoas com consultas ilimitadas. Isso representa uma economia de mais de R$ 200 por mês comparado a consultas particulares presenciais. Não há taxas extras ou carências."
    },
    {
      question: "A telemedicina é reconhecida pelos órgãos de saúde?",
      answer: "Sim! A telemedicina é regulamentada e reconhecida pelo Conselho Federal de Medicina (CFM) através da Resolução CFM nº 2.314/2022. É uma prática médica legal e segura, respaldada pela legislação brasileira."
    },
    {
      question: "O que ganho com o clube de Vantagens?",
      answer: "Com nosso clube de vantagens você tem acesso a descontos exclusivos em farmácias parceiras, laboratórios de análises clínicas, clínicas de exames de imagem, além de orientação nutricional e suporte psicológico. São benefícios extras que complementam seu cuidado com a saúde."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-orange/5" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-orange/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8 lg:pr-8">
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-orange/10 text-orange px-4 py-2 rounded-full text-sm font-medium">
                  <Stethoscope className="w-4 h-4" />
                  <span>Telemedicina 24/7</span>
                </div>
                
                <h1 className="text-4xl md:text-4xl lg:text-5xl font-bold font-varela text-primary-foreground leading-tight uppercase">
                  Atendimento Médico{' '}
                  <span className="text-orange">Emergencial</span>{' '}
                  24 horas
                </h1>
                
                <p className="text-xl text-primary-foreground/90 leading-relaxed">
                  Consultas ilimitadas com <strong>Clínico Geral</strong> e <strong>Pediatra</strong> via{' '}
                  <strong>TELEMEDICINA</strong> de forma instantânea e sem burocracia
                </p>
              </div>

              {/* Benefits */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange/10 rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-orange" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary-foreground">Consulta Online</p>
                    <p className="text-sm text-primary-foreground/80">Via smartphone ou PC</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary-foreground">24 horas</p>
                    <p className="text-sm text-primary-foreground/80">Todos os dias</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  onClick={handleWhatsApp}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg px-8 py-6"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Fale com nosso time
                </Button>
                
                <Button
                  onClick={handleLogin}
                  size="lg"
                  className="bg-white text-primary border-2 border-white hover:bg-primary hover:text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg px-8 py-6 font-semibold"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  LOGIN
                </Button>
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div className="relative">
              <div className="relative bg-card rounded-2xl overflow-hidden shadow-elegant float-animation">
                <div className="relative h-96 md:h-[500px]">
                  <img 
                    src={telemedicinaHero} 
                    alt="Atendimento médico via telemedicina" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-gray/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h3 className="text-xl font-bold font-varela uppercase mb-2">
                      Consulta médica profissional
                    </h3>
                    <p className="text-white/90">
                      Médicos especializados disponíveis 24 horas por dia
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase mb-4 text-foreground">
              Por que escolher nossa telemedicina?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Tecnologia avançada e profissionais qualificados para cuidar da sua saúde
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <CardHeader className="pb-4">
                  <div className={`mx-auto mb-4 p-4 rounded-full w-16 h-16 flex items-center justify-center ${
                    index % 2 === 0 ? 'bg-primary/10' : 'bg-orange/10'
                  }`}>
                    <feature.icon className={`h-8 w-8 ${
                      index % 2 === 0 ? 'text-primary' : 'text-orange'
                    }`} />
                  </div>
                  <CardTitle className="text-xl font-bold font-varela uppercase text-primary">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Visual Features with Images */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="bg-card rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src={telemedicinaMobile} 
                  alt="Consulta médica via smartphone" 
                  className="w-full h-64 object-cover" 
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold font-varela uppercase mb-2 text-primary">
                    Acesso fácil pelo celular
                  </h3>
                  <p className="text-muted-foreground">
                    Consulte médicos especializados diretamente do seu smartphone, a qualquer hora e lugar.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="bg-card rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src={telemedicinaFamily} 
                  alt="Família usando telemedicina" 
                  className="w-full h-64 object-cover" 
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold font-varela uppercase mb-2 text-primary">
                    Para toda a família
                  </h3>
                  <p className="text-muted-foreground">
                    Um plano que cobre até 4 pessoas, incluindo consultas com pediatra para as crianças.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-muted/30 to-orange/5">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase mb-2 text-foreground">
            Planos Que Cabem Dentro do Seu Orçamento
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12 items-start">
            {/* Plano Individual */}
            <Card className="border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 rounded-2xl">
              <CardHeader className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-center py-6 rounded-t-2xl">
                <div className="text-4xl font-bold mb-2">
                  R$24,90
                  <span className="text-lg font-normal">/Mês</span>
                </div>
                <CardTitle className="text-xl font-bold font-varela uppercase mb-2">
                  Plano Individual
                </CardTitle>
                <CardDescription className="text-primary-foreground/90 text-sm">
                  Perfeito para quem mora sozinho e quer cuidar da própria saúde.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full mb-6">
                  <AccordionItem value="individual-details" className="border-none">
                    <AccordionTrigger className="text-lg font-semibold font-varela uppercase text-primary hover:text-primary/80 py-4">
                      O que inclui?
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-primary mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Consultas on-line para 1 pessoa</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-orange mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Clínico geral</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-primary mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Certificado médico</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-orange mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Receituário médico</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-primary mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Atestado médico</span>
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <Button
                  onClick={handleWhatsApp}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-base py-3"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Contratar Agora
                </Button>
              </CardContent>
            </Card>

            {/* Plano Família - Popular */}
            <Card className="border-primary border-2 shadow-2xl relative overflow-hidden rounded-2xl" style={{ borderRadius: '16px' }}>
              {/* Highlight badge */}
              <div className="absolute top-4 right-4 bg-gradient-to-r from-primary to-orange text-white px-3 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>
              
              <CardHeader className="text-primary-foreground text-center py-8" style={{ background: 'linear-gradient(225deg, #4d64ae 0%, #4d64ae 60%, #f48120 100%)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                <div className="text-5xl font-bold mb-2">
                  R$49,90
                  <span className="text-lg font-normal">/Mês</span>
                </div>
                <CardTitle className="text-2xl font-bold font-varela uppercase mb-2">
                  Plano Família para 4 Vidas
                </CardTitle>
                <CardDescription className="text-primary-foreground/90 text-base">
                  Para você e até 3 dependentes. Cuide bem de quem realmente importa, sem filas, sem burocracia.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full mb-6">
                  <AccordionItem value="family-details" className="border-none">
                    <AccordionTrigger className="text-xl font-semibold font-varela uppercase text-primary hover:text-primary/80 py-4">
                      O que inclui?
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <ul className="space-y-3 mb-4">
                        {planIncludes.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className={`h-5 w-5 mr-3 flex-shrink-0 mt-0.5 ${
                              index % 2 === 0 ? 'text-primary' : 'text-orange'
                            }`} />
                            <span className="text-muted-foreground text-left">{item}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="bg-gradient-to-r from-primary/5 to-orange/5 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground text-center">
                          <strong>Economia de mais de R$200/mês</strong> comparado a consultas particulares
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <Button
                  onClick={handleWhatsApp}
                  className="w-full bg-gradient-to-r from-primary to-orange hover:from-primary/90 hover:to-orange/90 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg py-3"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Contratar Agora
                </Button>
              </CardContent>
            </Card>

            {/* Plano Premium */}
            <Card className="border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 rounded-2xl">
              <CardHeader className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-center py-6 rounded-t-2xl">
                <div className="text-4xl font-bold mb-2">
                  R$79,90
                  <span className="text-lg font-normal">/Mês</span>
                </div>
                <CardTitle className="text-xl font-bold font-varela uppercase mb-2">
                  Plano Premium
                </CardTitle>
                <CardDescription className="text-primary-foreground/90 text-sm">
                  Para famílias grandes com acesso a especialistas e benefícios extras.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full mb-6">
                  <AccordionItem value="premium-details" className="border-none">
                    <AccordionTrigger className="text-lg font-semibold font-varela uppercase text-primary hover:text-primary/80 py-4">
                      O que inclui?
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-primary mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Consultas on-line para 6 pessoas</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-orange mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Clínico geral e Pediatra</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-primary mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Psicólogo e Nutricionista</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-orange mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Todos os documentos médicos</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-primary mt-0.5" />
                          <span className="text-sm text-muted-foreground text-left">Clube de vantagens</span>
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <Button
                  onClick={handleWhatsApp}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-base py-3"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Contratar Agora
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* FAQ Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <HelpCircle className="w-4 h-4" />
              <span>Dúvidas Frequentes</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase mb-4 text-foreground">
              Mais informações sobre TELEMEDICINA
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Tire todas as suas dúvidas sobre nosso serviço de telemedicina
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Left Column - First Half of FAQs */}
            <div className="space-y-6">
              {faqs.slice(0, Math.ceil(faqs.length / 2)).map((faq, index) => (
                <div key={index} className="bg-[#f8f7f8] rounded-2xl border-l-4 border-[#4d64ae] shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 animate-fade-in" style={{
                  animationDelay: `${index * 0.1}s`
                }}>
                  <Accordion type="single" collapsible>
                    <AccordionItem value={`item-${index}`} className="border-none">
                      <AccordionTrigger className="px-6 py-6 hover:no-underline group">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Heart className="w-6 h-6 text-[#4d64ae] stroke-2" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base text-foreground group-hover:text-[#4d64ae] transition-colors leading-tight">
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
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ))}
            </div>

            {/* Right Column - Second Half of FAQs */}
            <div className="space-y-6">
              {faqs.slice(Math.ceil(faqs.length / 2)).map((faq, index) => {
                const adjustedIndex = index + Math.ceil(faqs.length / 2);
                return (
                  <div key={adjustedIndex} className="bg-[#f8f7f8] rounded-2xl border-l-4 border-orange-500 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 animate-fade-in" style={{
                    animationDelay: `${(index + Math.ceil(faqs.length / 2)) * 0.1}s`
                  }}>
                    <Accordion type="single" collapsible>
                      <AccordionItem value={`item-${adjustedIndex}`} className="border-none">
                        <AccordionTrigger className="px-6 py-6 hover:no-underline group">
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <Heart className="w-6 h-6 text-orange-500 stroke-2" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-base text-foreground group-hover:text-orange-500 transition-colors leading-tight">
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
          <div className="mt-16 text-center">
            <h3 className="text-3xl font-bold font-varela uppercase text-foreground mb-6 md:text-3xl">
              Ainda tem dúvidas?{' '}
              <span className="text-primary">Fale conosco.</span>
            </h3>
            <div className="flex justify-center gap-6">
              <button onClick={handleWhatsApp} className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl hover:scale-105">
                <MessageCircle className="w-6 h-6 text-white" />
              </button>
              <button onClick={() => window.open('tel:+556135475886', '_self')} className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl hover:scale-105">
                <Phone className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary via-primary/90 to-orange/20 text-primary-foreground relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-orange/10 rounded-full blur-2xl" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
        
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase mb-4">
            Sua saúde não pode esperar
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Tenha acesso a consultas médicas 24 horas por dia, 7 dias por semana, com médicos qualificados e experientes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleWhatsApp}
              size="lg"
              className="bg-gradient-to-r from-orange to-orange/80 hover:from-orange/90 hover:to-orange text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg px-8 py-3"
            >
              <Phone className="mr-2 h-5 w-5" />
              Fale Conosco Agora
            </Button>
            
            <div className="text-center sm:text-left">
              <p className="text-primary-foreground/90 text-sm">
                Resposta em até <strong>5 minutos</strong>
              </p>
              <p className="text-primary-foreground/80 text-xs">
                Atendimento humanizado e personalizado
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Telemedicina;