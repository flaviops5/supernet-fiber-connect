import { useState, useRef } from 'react';
import { Menu, X, ChevronDown, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showDropdown = (dropdownName: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setActiveDropdown(dropdownName);
  };

  const hideDropdown = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 300); // 300ms delay antes de esconder
  };

  const plans = [{
    name: 'Planos Residenciais',
    href: '/#planos-residenciais'
  }, {
    name: 'Planos Empresariais',
    href: '/planos-empresariais'
  }, {
    name: 'Planos com Monitoramento',
    href: '/planos-monitoramento'
  }, {
    name: 'Planos com Streaming',
    href: '/planos-streaming'
  }, {
    name: 'Planos com Telemedicina',
    href: '/telemedicina#planos-telemedicina'
  }];

  const services = [{
    name: 'Energia por Assinatura',
    href: '/energia-assinatura'
  }, {
    name: 'Automação Residencial',
    href: '/automacao-residencial'
  }, {
    name: 'Monitoramento Residencial',
    href: '/monitoramento-residencial'
  }, {
    name: 'Monitoramento Veicular',
    href: '/monitoramento-veicular'
  }, {
    name: 'Super Zé',
    href: '/super-ze'
  }, {
    name: 'Telemedicina',
    href: '/telemedicina'
  }, {
    name: 'SOS Empresarial',
    href: '/sos-empresarial'
  }, {
    name: 'Cabeamento Estruturado',
    href: '/cabeamento-estruturado'
  }, {
    name: 'Redes Wi-Fi',
    href: '/redes-wifi'
  }, {
    name: 'Assessoria Tecnológica',
    href: '/assessoria-tecnologica'
  }];

  const handleWhatsApp = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Gostaria de contratar os serviços da SUPERNET FIBRA.', '_blank');
  };

  return (
    <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img src="/assets/logo-supernet.png" alt="SUPERNET FIBRA" className="w-12 h-12 object-contain" />
            <span className="font-extrabold text-2xl font-arlon">
              <span style={{color: '#4c63ad'}}>SUPER</span>
              <span style={{color: '#f77527'}}>NET</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {/* Plans Dropdown */}
            <div 
              className="relative flex items-center" 
              onMouseEnter={() => showDropdown('plans')} 
              onMouseLeave={hideDropdown}
            >
              <button className="flex items-center gap-1 text-foreground hover:text-primary transition-colors py-2">
                <span>Planos</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {activeDropdown === 'plans' && (
                <div 
                  className="absolute top-full left-0 mt-2 w-64 bg-card rounded-lg shadow-elegant border border-border p-2 z-[60]"
                  onMouseEnter={() => showDropdown('plans')}
                  onMouseLeave={hideDropdown}
                >
                  <div className="space-y-1">
                    {plans.map(plan => (
                      <Link 
                        key={plan.name} 
                        to={plan.href} 
                        className="block px-3 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-md transition-colors"
                      >
                        {plan.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Services Dropdown */}
            <div 
              className="relative flex items-center" 
              onMouseEnter={() => showDropdown('services')} 
              onMouseLeave={hideDropdown}
            >
              <button className="flex items-center gap-1 text-foreground hover:text-primary transition-colors py-2">
                <span>Serviços</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {activeDropdown === 'services' && (
                <div 
                  className="absolute top-full left-0 mt-2 w-64 bg-card rounded-lg shadow-elegant border border-border p-2 z-[60]"
                  onMouseEnter={() => showDropdown('services')}
                  onMouseLeave={hideDropdown}
                >
                  <div className="space-y-1">
                    {services.map(service => (
                      <Link 
                        key={service.name} 
                        to={service.href} 
                        className="block px-3 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-md transition-colors"
                      >
                        {service.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link to="/blog#blog" className="flex items-center text-foreground hover:text-primary transition-colors py-2">
              Blog
            </Link>
            <Link to="/contato#contato" className="flex items-center text-foreground hover:text-primary transition-colors py-2">
              Contato
            </Link>
            <Link to="/#sobre" className="flex items-center text-foreground hover:text-primary transition-colors py-2">
              Sobre
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => window.open('https://central.supernetfibra.com.br', '_blank')} 
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Central do Cliente
            </Button>
            <Button onClick={handleWhatsApp} className="cta-gradient">
              <Phone className="w-4 h-4 mr-2" />
              Contratar Agora
            </Button>
          </div>

          {/* Mobile menu button */}
          <button className="lg:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <nav className="space-y-4">
              <div>
                <p className="font-semibold text-primary mb-2">Planos</p>
                <div className="pl-4 space-y-2">
                  {plans.map(plan => (
                    <Link 
                      key={plan.name} 
                      to={plan.href} 
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {plan.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-primary mb-2">Serviços</p>
                <div className="pl-4 space-y-2">
                  {services.map(service => (
                    <Link 
                      key={service.name} 
                      to={service.href} 
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>

              <Link to="/blog#blog" className="block text-foreground hover:text-primary transition-colors">
                Blog
              </Link>
              <Link to="/contato#contato" className="block text-foreground hover:text-primary transition-colors">
                Contato
              </Link>
              <Link to="/#sobre" className="block text-foreground hover:text-primary transition-colors">
                Sobre
              </Link>
              
              <Button 
                variant="outline" 
                onClick={() => window.open('https://central.supernetfibra.com.br', '_blank')} 
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full mb-4"
              >
                Central do Cliente
              </Button>
              
              <Button onClick={handleWhatsApp} className="cta-gradient w-full">
                <Phone className="w-4 h-4 mr-2" />
                Contratar Agora
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;