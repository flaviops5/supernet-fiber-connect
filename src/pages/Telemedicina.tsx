import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MessageCircle, User, Smartphone, Phone, Heart, CheckCircle, Video, Stethoscope } from 'lucide-react';
import telemedicinaHero from '@/assets/telemedicina-hero.jpg';
import telemedicinaMobile from '@/assets/telemedicina-mobile.jpg';
import telemedicinaFamily from '@/assets/telemedicina-family.jpg';

const Telemedicina = () => {
  const handleWhatsApp = () => {
    window.open('https://api.whatsapp.com/send/?phone=61999475886&text=Ol%C3%A1!%20Vi%20os%20planos%20de%20telemedicina%20e%20gostaria%20de%20contratar!', '_blank');
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
              <div className="flex justify-center lg:justify-start">
                <Button
                  onClick={handleWhatsApp}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg px-8 py-6"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Fale com nosso time
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
          
          <div className="max-w-md mx-auto mt-12">
            <Card className="border-primary border-2 shadow-2xl relative overflow-hidden">
              {/* Highlight badge */}
              <div className="absolute top-4 right-4 bg-orange text-white px-3 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>
              
              <CardHeader className="bg-gradient-to-br from-primary via-primary/90 to-orange/20 text-primary-foreground text-center py-8">
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
              
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold font-varela uppercase mb-6 text-center text-primary">
                  O que inclui?
                </h3>
                <ul className="space-y-3 mb-8">
                  {planIncludes.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className={`h-5 w-5 mr-3 flex-shrink-0 ${
                        index % 3 === 0 ? 'text-primary' : index % 3 === 1 ? 'text-orange' : 'text-green-500'
                      }`} />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="bg-gradient-to-r from-primary/5 to-orange/5 p-4 rounded-lg mb-6">
                  <p className="text-sm text-muted-foreground text-center">
                    <strong>Economia de mais de R$200/mês</strong> comparado a consultas particulares
                  </p>
                </div>
                
                <Button
                  onClick={handleWhatsApp}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg py-3"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Contratar Agora
                </Button>
              </CardContent>
            </Card>
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