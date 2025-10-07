import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Phone, MessageCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PostgresPoint {
  x: number;
  y: number;
}

interface CepCheckerProps {
  onLocationFound?: (coordinates: [number, number]) => void;
}

const CepChecker = ({ onLocationFound }: CepCheckerProps) => {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleWhatsApp = () => {
    const phone = "5561999999999";
    const message = result?.available 
      ? `Olá! Vi que vocês atendem na região ${result.region}. Gostaria de contratar um plano de internet!`
      : `Olá! Gostaria de saber quando a SUPERNET FIBRA chegará na minha região (CEP: ${cep}).`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCall = () => {
    window.open('tel:+5561999999999', '_self');
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const checkCep = async () => {
    if (!cep) {
      toast({
        title: "CEP obrigatório",
        description: "Por favor, digite um CEP para consultar.",
        variant: "destructive"
      });
      return;
    }

    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      toast({
        title: "CEP inválido", 
        description: "Digite um CEP válido com 8 dígitos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Buscar cobertura no Supabase
      const { data: coverage, error } = await supabase
        .from('cep_coverage')
        .select(`
          *,
          cep_plans (
            plans (
              name,
              speed,
              price,
              description
            )
          )
        `)
        .lte('cep_start', cleanCep)
        .gte('cep_end', cleanCep)
        .single();

      if (error) {
        // CEP não encontrado - retornar como não atendido
        setResult({
          available: false,
          region: 'Região não atendida',
          plans: []
        });
      } else {
        // Formatar os planos
        const plans = coverage.cep_plans?.map((cp: any) => 
          `${cp.plans.speed} - R$ ${cp.plans.price.toFixed(2).replace('.', ',')}`
        ) || [];

        setResult({
          available: coverage.available,
          region: coverage.region_name,
          plans: plans
        });

        // Se tem cobertura e coordenadas, notificar o mapa
        if (coverage.available && coverage.coordinates && onLocationFound) {
          // Extrair coordenadas do POINT
          const coords = coverage.coordinates as PostgresPoint;
          // POINT format: POINT(longitude latitude)
          if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
            onLocationFound([coords.y, coords.x]); // Note: Leaflet usa [lat, lng]
          }
        }
      }
    } catch (err) {
      toast({
        title: "Erro na consulta",
        description: "Ocorreu um erro ao verificar a cobertura. Tente novamente.",
        variant: "destructive"
      });
      setResult({
        available: false,
        region: 'Erro na consulta',
        plans: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    if (formatted.length <= 9) {
      setCep(formatted);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Consulte sua Cobertura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Digite seu CEP"
            value={cep}
            onChange={handleInputChange}
            maxLength={9}
            className="flex-1"
          />
          <Button onClick={checkCep} disabled={loading}>
            {loading ? 'Verificando...' : 'Consultar'}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              result.available 
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.available ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-semibold ${
                  result.available ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {result.available ? '✅ Atendemos sua região!' : '❌ Ainda não atendemos'}
                </span>
              </div>
              <p className={`text-sm ${
                result.available ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
              }`}>
                {result.region}
              </p>
            </div>

            {result.available && result.plans.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Planos disponíveis:</h4>
                {result.plans.map((plan: string, index: number) => (
                  <div key={index} className="p-2 bg-muted rounded-md text-sm">
                    {plan}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button onClick={handleCall} variant="outline" className="flex-1">
                <Phone className="h-4 w-4 mr-2" />
                Ligar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CepChecker;