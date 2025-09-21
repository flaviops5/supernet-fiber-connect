import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MessageCircle, User, Smartphone, Phone, Heart } from 'lucide-react';

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
      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Atendimento Médico
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold mb-6">
            Emergencial 24 horas
          </h2>
          <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto">
            Consultas ilimitadas com <strong>Clínico Geral</strong> e <strong>Pediatra</strong> via{' '}
            <strong>TELEMEDICINA</strong> de forma instantânea e sem burocracia
          </p>
          <Button
            onClick={handleWhatsApp}
            size="lg"
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg px-8 py-3"
          >
            <Phone className="mr-2 h-5 w-5" />
            Fale com nosso time
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold text-primary">
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
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
            Planos Que Cabem Dentro do Seu Orçamento
          </h2>
          
          <div className="max-w-md mx-auto mt-12">
            <Card className="border-primary border-2 shadow-2xl">
              <CardHeader className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground text-center py-8">
                <div className="text-5xl font-bold mb-2">
                  R$49,90
                  <span className="text-lg font-normal">/Mês</span>
                </div>
                <CardTitle className="text-2xl font-bold mb-2">
                  Plano Família para 4 Vidas
                </CardTitle>
                <CardDescription className="text-primary-foreground/90 text-base">
                  Para você e até dependentes. Cuide bem de quem realmente importa, sem filas, sem burocracia.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-6 text-center text-primary">
                  O que inclui?
                </h3>
                <ul className="space-y-3 mb-8">
                  {planIncludes.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <Heart className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                
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
      <section className="py-16 px-4 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Sua saúde não pode esperar
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Tenha acesso a consultas médicas 24 horas por dia, 7 dias por semana, com médicos qualificados e experientes.
          </p>
          <Button
            onClick={handleWhatsApp}
            size="lg"
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg px-8 py-3"
          >
            <Phone className="mr-2 h-5 w-5" />
            Fale Conosco Agora
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Telemedicina;