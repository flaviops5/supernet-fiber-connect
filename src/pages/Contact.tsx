import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin, Clock, MessageCircle, Upload, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import GoogleMap from '@/components/GoogleMap';
import contactHero from '@/assets/contact-hero.jpg';

const Contact = () => {
  const { toast } = useToast();
  useScrollToHash();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [jobFormData, setJobFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    message: '',
    resume: null as File | null
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleJobInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJobFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setJobFormData(prev => ({
      ...prev,
      resume: file
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você pode integrar com um serviço de email ou backend
    toast({
      title: "Mensagem enviada!",
      description: "Entraremos em contato em breve.",
    });
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  const handleJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobFormData.resume) {
      toast({
        title: "Erro",
        description: "Por favor, anexe seu currículo.",
        variant: "destructive"
      });
      return;
    }
    
    // Aqui você integraria com um serviço para enviar o email com anexo
    // Para demonstração, vamos simular o envio
    toast({
      title: "Currículo enviado!",
      description: "Recebemos sua candidatura e entraremos em contato em breve.",
    });
    setJobFormData({
      name: '',
      email: '',
      phone: '',
      position: '',
      message: '',
      resume: null
    });
    // Reset file input
    const fileInput = document.getElementById('resume') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleWhatsApp = () => {
    const message = `Olá! Gostaria de mais informações sobre os planos da Supernet Fibra.`;
    const phoneNumber = '5561999475886';
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        id="contato"
        className="relative py-24 bg-gradient-to-r from-primary/20 to-primary/10 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url(${contactHero})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold font-varela uppercase text-white mb-6">
              Fale Conosco
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Estamos aqui para ajudar você a encontrar o melhor plano de internet fibra óptica
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                <Phone className="h-5 w-5 mr-2" />
                (61) 3547-5886
              </Button>
              <Button 
                size="lg" 
                onClick={handleWhatsApp}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Trabalhe Conosco */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-primary" />
                Trabalhe Conosco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJobSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="job-name">Nome Completo</Label>
                  <Input
                    id="job-name"
                    name="name"
                    value={jobFormData.name}
                    onChange={handleJobInputChange}
                    required
                    className="mt-2"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <Label htmlFor="job-email">E-mail</Label>
                  <Input
                    id="job-email"
                    name="email"
                    type="email"
                    value={jobFormData.email}
                    onChange={handleJobInputChange}
                    required
                    className="mt-2"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="job-phone">Telefone</Label>
                  <Input
                    id="job-phone"
                    name="phone"
                    value={jobFormData.phone}
                    onChange={handleJobInputChange}
                    className="mt-2"
                    placeholder="(61) 99999-9999"
                  />
                </div>

                <div>
                  <Label htmlFor="position">Cargo de Interesse</Label>
                  <Input
                    id="position"
                    name="position"
                    value={jobFormData.position}
                    onChange={handleJobInputChange}
                    required
                    className="mt-2"
                    placeholder="Ex: Técnico em Telecomunicações"
                  />
                </div>

                <div>
                  <Label htmlFor="resume">Currículo (PDF, DOC, DOCX)</Label>
                  <Input
                    id="resume"
                    name="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    required
                    className="mt-2"
                  />
                  {jobFormData.resume && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Arquivo selecionado: {jobFormData.resume.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="job-message">Mensagem (opcional)</Label>
                  <Textarea
                    id="job-message"
                    name="message"
                    value={jobFormData.message}
                    onChange={handleJobInputChange}
                    className="mt-2 min-h-[80px]"
                    placeholder="Conte um pouco sobre você..."
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Candidatura
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Currículos serão enviados para: atendimento@supernetfibra.com.br
              </p>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 grid md:grid-cols-2 gap-8">
          {/* Formulário de Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Envie sua Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-2"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-2"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="mt-2"
                      placeholder="(61) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="mt-2"
                      placeholder="Assunto da mensagem"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    className="mt-2 min-h-[120px]"
                    placeholder="Descreva sua dúvida ou solicite um orçamento..."
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Enviar Mensagem
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Informações de Contato */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Fale Conosco</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <Phone className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold font-varela uppercase text-foreground">Telefones</h3>
                    <p className="text-muted-foreground">(61) 3547-5886</p>
                    <p className="text-muted-foreground">(61) 99947-5886</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Mail className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold font-varela uppercase text-foreground">E-mail</h3>
                    <p className="text-muted-foreground">contato@supernetfibra.com.br</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold font-varela uppercase text-foreground">Endereço</h3>
                    <p className="text-muted-foreground">
                      Rua das Fibras Ópticas, 123<br />
                      Setor Central - Brasília/DF<br />
                      CEP: 70000-000
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Clock className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold font-varela uppercase text-foreground">Horário de Atendimento</h3>
                    <p className="text-muted-foreground">
                      Segunda a Sexta: 8h às 18h<br />
                      Sábado: 8h às 12h<br />
                      Domingo: Fechado
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleWhatsApp} 
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg border-0" 
                  size="lg"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Falar no WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* Mapa */}
            <Card>
              <CardHeader>
                <CardTitle>Nossa Localização</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg overflow-hidden">
                  <GoogleMap />
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;