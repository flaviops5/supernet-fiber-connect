import { MapPin, Phone, Mail, Clock, MessageCircle, Facebook, Instagram, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoogleMap from './GoogleMap';

const Footer = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/556199475886?text=Olá! Gostaria de mais informações sobre os serviços da SUPERNET FIBRA.', '_blank');
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-gray text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <img
                src="/assets/logo-supernet.png"
                alt="Supernet Fibra"
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-orange font-arlon">
                SUPERNET FIBRA
              </span>
            </div>
            
            <p className="text-white/80 leading-relaxed">
              Conectando você ao futuro com internet fibra óptica de alta velocidade, 
              tecnologia avançada e atendimento humanizado.
            </p>

            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-orange transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-orange transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-orange transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-orange">Serviços</h4>
            <nav className="space-y-3">
              <a href="/fibra" className="block text-white/80 hover:text-orange transition-colors">
                Internet Fibra
              </a>
              <a href="/telemedicina" className="block text-white/80 hover:text-orange transition-colors">
                Telemedicina
              </a>
              <a href="/energia-solar" className="block text-white/80 hover:text-orange transition-colors">
                Energia Solar
              </a>
              <a href="/monitoramento-residencial" className="block text-white/80 hover:text-orange transition-colors">
                Monitoramento Residencial
              </a>
              <a href="/monitoramento-veicular" className="block text-white/80 hover:text-orange transition-colors">
                Monitoramento Veicular
              </a>
              <a href="/streaming" className="block text-white/80 hover:text-orange transition-colors">
                Streaming
              </a>
              <a href="/automacao" className="block text-white/80 hover:text-orange transition-colors">
                Automação Residencial
              </a>
            </nav>
          </div>

          {/* Products */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-orange">Produtos</h4>
            <nav className="space-y-3">
              <a href="/produtos/cameras" className="block text-white/80 hover:text-orange transition-colors">
                Câmeras de Segurança
              </a>
              <a href="/produtos/roteadores" className="block text-white/80 hover:text-orange transition-colors">
                Roteadores Wi-Fi
              </a>
              <a href="/produtos/firestick" className="block text-white/80 hover:text-orange transition-colors">
                Fire TV Stick
              </a>
              <a href="/planos" className="block text-white/80 hover:text-orange transition-colors">
                Planos de Internet
              </a>
              <a href="/sobre" className="block text-white/80 hover:text-orange transition-colors">
                Sobre Nós
              </a>
              <a href="/contato" className="block text-white/80 hover:text-orange transition-colors">
                Contato
              </a>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-orange">Contato</h4>
            
            <div className="space-y-4">
              {/* Address */}
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-orange mt-1 flex-shrink-0" />
                <div className="text-white/80 text-sm">
                  <p>Setor de Industria Gráfica (SIG), 25</p>
                  <p>Edificio Barão de Mauá salas 125/127</p>
                  <p>Brasília, DF - CEP: 70.440-610</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-orange flex-shrink-0" />
                <div className="text-white/80">
                  <p className="text-sm">(61) 3547-5886</p>
                  <p className="text-sm">(61) 99947-5996</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-orange flex-shrink-0" />
                <div className="text-white/80">
                  <p className="text-sm">atendimento@supernetfibra.com.br</p>
                </div>
              </div>

              {/* Business Hours */}
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-orange mt-1 flex-shrink-0" />
                <div className="text-white/80 text-sm">
                  <p>Atendimento 24/7 pelo WhatsApp</p>
                  <p>(61) 99947-5886</p>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="mt-6">
              <GoogleMap />
            </div>

            <Button
              onClick={handleWhatsApp}
              className="w-full cta-gradient"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-white/60 text-sm">
              © {currentYear} SUPERNET FIBRA. Todos os direitos reservados.
            </div>
            
            <nav className="flex space-x-6 text-sm">
              <a href="/privacidade" className="text-white/60 hover:text-orange transition-colors">
                Política de Privacidade
              </a>
              <a href="/termos" className="text-white/60 hover:text-orange transition-colors">
                Termos de Uso
              </a>
              <a href="/cookies" className="text-white/60 hover:text-orange transition-colors">
                Cookies
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;