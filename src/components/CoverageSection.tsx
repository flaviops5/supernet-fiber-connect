import React, { useState } from 'react';
import InteractiveMap from './InteractiveMap';
import CepChecker from './CepChecker';
import { MapPin, Globe } from 'lucide-react';

const CoverageSection = () => {
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | undefined>();

  const handleLocationFound = (coordinates: [number, number]) => {
    setSelectedLocation(coordinates);
  };

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="h-8 w-8 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold font-varela text-foreground">
              Área de <span className="text-primary">Cobertura</span>
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubra se já atendemos sua região e conheça nossos planos disponíveis
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* CEP Checker */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-semibold text-foreground mb-2 flex items-center justify-center lg:justify-start gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                Consulta Rápida por CEP
              </h3>
              <p className="text-muted-foreground">
                Digite seu CEP e descubra instantaneamente se atendemos sua região
              </p>
            </div>
            <CepChecker onLocationFound={handleLocationFound} />
            
            {/* Coverage Stats */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="text-2xl font-bold text-primary">15+</div>
                <div className="text-sm text-muted-foreground">Regiões Atendidas</div>
              </div>
              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="text-2xl font-bold text-primary">24h</div>
                <div className="text-sm text-muted-foreground">Instalação Rápida</div>
              </div>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Mapa de Cobertura Interativo
              </h3>
              <p className="text-muted-foreground">
                Visualize todas as áreas onde já oferecemos nossos serviços
              </p>
            </div>
            <InteractiveMap selectedLocation={selectedLocation} />
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-sm opacity-60"></div>
                <span className="text-sm text-muted-foreground">SIG</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-sm opacity-60"></div>
                <span className="text-sm text-muted-foreground">Brasília Central</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-500 rounded-sm opacity-60"></div>
                <span className="text-sm text-muted-foreground">Taguatinga</span>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12 p-6 bg-card rounded-xl border">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Sua região ainda não é atendida?
          </h3>
          <p className="text-muted-foreground mb-4">
            Entre em contato conosco! Estamos sempre expandindo nossa cobertura.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => {
                const phone = "5561999999999";
                const message = "Olá! Gostaria de saber quando a SUPERNET FIBRA chegará na minha região.";
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Solicitar Expansão via WhatsApp
            </button>
            <button 
              onClick={() => window.open('tel:+5561999999999', '_self')}
              className="px-6 py-3 border border-border hover:bg-muted text-foreground rounded-lg font-medium transition-colors"
            >
              Ligar para Solicitar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoverageSection;