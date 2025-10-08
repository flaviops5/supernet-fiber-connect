import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Wrench, 
  Activity, 
  DollarSign, 
  FileText, 
  MapPin, 
  Megaphone, 
  MessageSquare, 
  Users, 
  Shield, 
  TrendingUp,
  CheckCircle2,
  Zap,
  Clock,
  Target,
  Mail,
  Phone,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Apresentacao() {
  const features = [
    {
      icon: Bot,
      title: "Atendimento IA 24/7",
      description: "5 agentes especializados trabalhando simultaneamente",
      stats: ["+300% conversão", "24h atendimento", "-60% chamados"]
    },
    {
      icon: Wrench,
      title: "Manutenção Automática",
      description: "Auto-reboot inteligente e manutenção preventiva",
      stats: ["-60% suporte", "99.9% uptime", "Resolução automática"]
    },
    {
      icon: Activity,
      title: "Monitoramento Real-Time",
      description: "Dashboards inteligentes com alertas proativos",
      stats: ["Tempo real", "Alertas smart", "PON + Rádio"]
    },
    {
      icon: DollarSign,
      title: "Gestão Financeira",
      description: "Projeções automáticas e cobranças inteligentes",
      stats: ["-40% inadimplência", "6 meses projeção", "Multi-canal"]
    },
    {
      icon: FileText,
      title: "Contratos Digitais",
      description: "Assinatura eletrônica em minutos",
      stats: ["5 min ativação", "-90% tempo", "100% digital"]
    },
    {
      icon: Megaphone,
      title: "Campanhas Multi-canal",
      description: "WhatsApp, Email, SMS e Voz automatizados",
      stats: ["NPS integrado", "Segmentação IA", "ROI tracking"]
    }
  ];

  const results = [
    { metric: "+300%", label: "Aumento em conversão de vendas" },
    { metric: "-60%", label: "Redução em chamados" },
    { metric: "-40%", label: "Diminuição na inadimplência" },
    { metric: "+200%", label: "Produtividade da equipe" },
    { metric: "90%", label: "Redução no tempo de ativação" },
    { metric: "24/7", label: "Atendimento contínuo" }
  ];

  const agents = [
    {
      name: "Agente de Vendas",
      description: "Atende prospects, consulta cobertura e gera contratos automaticamente",
      capabilities: ["Consulta CEP", "Apresenta planos", "Gera contratos", "Integração IXC"]
    },
    {
      name: "Suporte Técnico",
      description: "Diagnostica problemas e agenda visitas técnicas",
      capabilities: ["Diagnóstico IA", "Cria tickets", "Agenda visitas", "Solução remota"]
    },
    {
      name: "Suporte Financeiro",
      description: "Consulta faturas e negocia débitos",
      capabilities: ["Segunda via", "Negocia débitos", "Notifica pagamentos", "Reduz inadimplência"]
    },
    {
      name: "Telemedicina",
      description: "Gerencia consultas médicas online",
      capabilities: ["Agenda consultas", "Gestão de planos", "Autenticação segura", "Receita adicional"]
    },
    {
      name: "Automação Residencial",
      description: "Consultor em casa inteligente",
      capabilities: ["Recomenda produtos", "Aumenta ticket", "Smart home", "Upsell"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 animate-fade-in">
            <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/30">
              Sistema de Gestão Inteligente
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              SUPERNET FIBRA
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-3xl mx-auto">
              Revolucione a gestão do seu provedor com Inteligência Artificial
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button size="lg" variant="secondary" className="gap-2">
                <Mail className="h-5 w-5" />
                Agendar Demonstração
              </Button>
              <Button size="lg" variant="outline" className="gap-2 bg-white/10 border-white/30 hover:bg-white/20 text-white">
                <Phone className="h-5 w-5" />
                Falar com Especialista
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Sobre a SUPERNET FIBRA</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Provedor de internet de alta velocidade comprometido em conectar pessoas, 
              famílias e empresas com a melhor experiência em conectividade.
            </p>
          </div>
          <Card className="border-none shadow-lg">
            <CardContent className="p-8">
              <p className="text-lg leading-relaxed text-muted-foreground">
                Com infraestrutura de <strong>fibra óptica de última geração</strong>, oferecemos 
                internet ultrarrápida, estável e confiável, além de serviços inovadores como 
                telemedicina e automação residencial inteligente. Nossa missão é democratizar 
                o acesso à internet de qualidade, levando tecnologia de ponta a preços justos, 
                com atendimento humanizado e suporte técnico excepcional.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">ROI Comprovado</h2>
            <p className="text-lg text-muted-foreground">Resultados reais de clientes reais</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {results.map((result, index) => (
              <Card key={index} className="text-center hover-scale border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary mb-2">{result.metric}</div>
                  <p className="text-sm text-muted-foreground">{result.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Funcionalidades Principais</h2>
            <p className="text-lg text-muted-foreground">Tudo que você precisa em uma única plataforma</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-none shadow-lg hover-scale">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {feature.stats.map((stat, idx) => (
                        <Badge key={idx} variant="secondary" className="mr-2">
                          {stat}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Agents Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <Badge className="mb-2">Inteligência Artificial</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">5 Agentes IA Especializados</h2>
            <p className="text-lg text-muted-foreground">Nunca mais perca uma venda ou deixe um cliente sem resposta</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {agents.map((agent, index) => (
              <Card key={index} className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{agent.name}</CardTitle>
                      <CardDescription className="mt-2">{agent.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {agent.capabilities.map((capability, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{capability}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Integration */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Integrações Poderosas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <strong>IXC Soft:</strong> Sincronização bidirecional automática
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <strong>WhatsApp Business:</strong> Evolution API integrada
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <strong>Locaweb SMTP:</strong> Emails transacionais profissionais
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Segurança de Nível Bancário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>Criptografia end-to-end</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>Autenticação multifator</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>Conformidade com LGPD</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>99.9% uptime garantido</div>
                </div>
              </CardContent>
            </Card>

            {/* Coverage */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <MapPin className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Gestão de Cobertura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>Mapa interativo de áreas atendidas</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>Importação em massa de CEPs</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>Verificação instantânea de disponibilidade</div>
                </div>
              </CardContent>
            </Card>

            {/* Omnichannel */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Central Omnichannel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>WhatsApp, Webchat e Email integrados</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>Fila inteligente de atendimento</div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>+200% de produtividade da equipe</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Por que escolher o Sistema SUPERNET?</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-md text-center">
              <CardContent className="pt-6">
                <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Tudo-em-Um</h3>
                <p className="text-sm text-muted-foreground">Uma única plataforma para todas as necessidades</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md text-center">
              <CardContent className="pt-6">
                <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Implantação Rápida</h3>
                <p className="text-sm text-muted-foreground">Operacional em menos de 48 horas</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md text-center">
              <CardContent className="pt-6">
                <Bot className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">IA de Ponta</h3>
                <p className="text-sm text-muted-foreground">Tecnologia que trabalha por você</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md text-center">
              <CardContent className="pt-6">
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">ROI em 3 meses</h3>
                <p className="text-sm text-muted-foreground">Investimento que se paga</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">Comece Hoje Mesmo</h2>
          <p className="text-xl text-primary-foreground/90">
            Transforme seu provedor de internet em uma máquina de eficiência e lucratividade
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" variant="secondary" className="gap-2 text-lg">
              <Mail className="h-5 w-5" />
              Agendar Demonstração
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg bg-white/10 border-white/30 hover:bg-white/20 text-white">
              <Phone className="h-5 w-5" />
              (00) 0000-0000
            </Button>
          </div>
          <p className="text-sm text-primary-foreground/70 pt-4">
            Veja o sistema funcionando na prática • Entenda como ele se adapta ao seu negócio
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-background border-t">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground">
          <p className="text-lg font-semibold mb-2">SUPERNET FIBRA</p>
          <p className="text-sm">Conectando você ao futuro 🚀</p>
          <div className="mt-4">
            <Link to="/">
              <Button variant="ghost" size="sm">Voltar ao Site</Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}