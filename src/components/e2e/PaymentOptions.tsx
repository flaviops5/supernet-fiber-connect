import { useState } from 'react';
import { CreditCard, QrCode, Barcode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const PaymentOptions = () => {
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'boleto' | null>(null);
  const [pixCode, setPixCode] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);

  const handlePixClick = () => {
    setSelectedMethod('pix');
    setPixCode('00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005802BR5913Loja Exemplo6009SAO PAULO62070503***63041D3D');
    setShowQRCode(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opções de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div data-testid="payment-options" className="space-y-3">
          <Button
            data-testid="payment-pix"
            onClick={handlePixClick}
            className="w-full justify-start h-auto py-4"
            variant="outline"
          >
            <QrCode className="h-6 w-6 mr-3" />
            <div className="text-left">
              <p className="font-semibold">PIX</p>
              <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
            </div>
          </Button>

          <Button
            data-testid="payment-boleto"
            onClick={() => setSelectedMethod('boleto')}
            className="w-full justify-start h-auto py-4"
            variant="outline"
          >
            <Barcode className="h-6 w-6 mr-3" />
            <div className="text-left">
              <p className="font-semibold">Boleto Bancário</p>
              <p className="text-xs text-muted-foreground">Vencimento em 3 dias</p>
            </div>
          </Button>
        </div>

        {showQRCode && selectedMethod === 'pix' && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div data-testid="pix-qrcode" className="bg-white p-4 rounded-lg flex items-center justify-center">
              <div className="w-48 h-48 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                <QrCode className="h-32 w-32 text-purple-600" />
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Código PIX</p>
              <p data-testid="pix-code" className="text-xs font-mono break-all bg-background p-2 rounded border">
                {pixCode}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
