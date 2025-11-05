import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, FileText, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentOptionsProps {
  onPaymentSelect?: (method: 'pix' | 'boleto') => void;
}

export const PaymentOptions = ({ onPaymentSelect }: PaymentOptionsProps) => {
  const [loading, setLoading] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePix = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simular geração de PIX
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPixCode('00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-426655440000');
      onPaymentSelect?.('pix');
    } catch (err) {
      setError('Erro ao gerar código PIX');
    } finally {
      setLoading(false);
    }
  };

  const handleBoleto = () => {
    onPaymentSelect?.('boleto');
  };

  return (
    <div data-testid="payment-options" className="space-y-4">
      <h3 className="font-semibold text-lg">Escolha a forma de pagamento:</h3>
      
      <div className="grid gap-3">
        <Button
          data-testid="payment-pix"
          onClick={handlePix}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <QrCode className="h-4 w-4 mr-2" />
          )}
          Pagar com PIX
        </Button>

        <Button
          data-testid="payment-boleto"
          onClick={handleBoleto}
          variant="outline"
          className="w-full"
        >
          <FileText className="h-4 w-4 mr-2" />
          Boleto Bancário
        </Button>
      </div>

      {pixCode && (
        <Card data-testid="pix-qrcode" className="bg-muted">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                <QrCode className="h-32 w-32 text-foreground" />
              </div>
              <div className="text-sm">
                <p className="font-medium mb-2">Código PIX:</p>
                <code data-testid="pix-code" className="block p-2 bg-background rounded text-xs break-all">
                  {pixCode}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert data-testid="payment-error" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
