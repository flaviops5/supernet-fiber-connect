import { useState } from 'react';
import { Menu, X, ChevronDown, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const services = [{
    name: 'Internet Fibra',
    href: '/fibra'
  }, {
    name: 'Telemedicina',
    href: '/telemedicina'
  }, {
    name: 'Energia Solar',
    href: '/energia-solar'
  }, {
    name: 'Monitoramento Residencial',
    href: '/monitoramento-residencial'
  }, {
    name: 'Monitoramento Veicular',
    href: '/monitoramento-veicular'
  }, {
    name: 'Streaming',
    href: '/streaming'
  }, {
    name: 'Automação Residencial',
    href: '/automacao'
  }];
  const products = [{
    name: 'Câmeras de Segurança',
    href: '/produtos/cameras'
  }, {
    name: 'Roteadores',
    href: '/produtos/roteadores'
  }, {
    name: 'Fire TV Stick',
    href: '/produtos/firestick'
  }];
  const handleWhatsApp = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Gostaria de contratar os serviços da SUPERNET FIBRA.', '_blank');
  };
  return <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img src="/assets/logo-supernet.png" alt="SUPERNET FIBRA" className="w-10 h-10 object-contain" />
            <span className="text-primary font-extrabold text-xl font-arlon">SUPERNET FIBRA</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <a href="/" className="text-foreground hover:text-primary transition-colors">
              Início
            </a>
            
            {/* Services Dropdown */}
            <div className="relative" onMouseEnter={() => setActiveDropdown('services')} onMouseLeave={() => setActiveDropdown(null)}>
              <button className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors">
                <span>Serviços</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {activeDropdown === 'services' && <div className="absolute top-full left-0 mt-2 w-64 bg-card rounded-lg shadow-elegant border border-border p-4">
                  <div className="space-y-2">
                    {services.map(service => <a key={service.name} href={service.href} className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-md transition-colors">
                        {service.name}
                      </a>)}
                  </div>
                </div>}
            </div>

            {/* Products Dropdown */}
            <div className="relative" onMouseEnter={() => setActiveDropdown('products')} onMouseLeave={() => setActiveDropdown(null)}>
              <button className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors">
                <span>Produtos</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {activeDropdown === 'products' && <div className="absolute top-full left-0 mt-2 w-56 bg-card rounded-lg shadow-elegant border border-border p-4">
                  <div className="space-y-2">
                    {products.map(product => <a key={product.name} href={product.href} className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-secondary rounded-md transition-colors">
                        {product.name}
                      </a>)}
                  </div>
                </div>}
            </div>

            <a href="/blog" className="text-foreground hover:text-primary transition-colors">
              Blog
            </a>
            <a href="/sobre" className="text-foreground hover:text-primary transition-colors">
              Sobre
            </a>
            <a href="/contato" className="text-foreground hover:text-primary transition-colors">
              Contato
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="outline" onClick={() => window.open('http://central.supernetfibra.com.br', '_blank')} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
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
        {isMenuOpen && <div className="lg:hidden py-4 border-t border-border">
            <nav className="space-y-4">
              <a href="/" className="block text-foreground hover:text-primary transition-colors">
                Início
              </a>
              
              <div>
                <p className="font-semibold text-primary mb-2">Serviços</p>
                <div className="pl-4 space-y-2">
                  {services.map(service => <a key={service.name} href={service.href} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                      {service.name}
                    </a>)}
                </div>
              </div>

              <div>
                <p className="font-semibold text-primary mb-2">Produtos</p>
                <div className="pl-4 space-y-2">
                  {products.map(product => <a key={product.name} href={product.href} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                      {product.name}
                    </a>)}
                </div>
              </div>

              <a href="/blog" className="block text-foreground hover:text-primary transition-colors">
                Blog
              </a>
              <a href="/sobre" className="block text-foreground hover:text-primary transition-colors">
                Sobre
              </a>
              <a href="/contato" className="block text-foreground hover:text-primary transition-colors">
                Contato
              </a>
              
              <Button variant="outline" onClick={() => window.open('http://central.supernetfibra.com.br', '_blank')} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full mb-4">
                Central do Cliente
              </Button>
              
              <Button onClick={handleWhatsApp} className="cta-gradient w-full">
                <Phone className="w-4 h-4 mr-2" />
                Contratar Agora
              </Button>
            </nav>
          </div>}
      </div>
    </header>;
};
export default Header;