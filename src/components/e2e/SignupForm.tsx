import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const SignupForm = () => {
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    
    // Validar CPF duplicado (exemplo)
    if (cpf === '12345678900') {
      setError('CPF já cadastrado no sistema');
      return;
    }

    // Sucesso - continuar fluxo
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert data-testid="cpf-exists-error" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            data-testid="input-cpf"
            id="cpf"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input
            data-testid="input-name"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            data-testid="input-phone"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Input
            data-testid="input-address"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, número, bairro"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            data-testid="accept-terms"
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
          />
          <label htmlFor="terms" className="text-sm">
            Aceito os termos e condições
          </label>
        </div>

        <Button
          data-testid="submit-signup"
          onClick={handleSubmit}
          className="w-full"
          disabled={!acceptTerms}
        >
          Confirmar Cadastro
        </Button>
      </CardContent>
    </Card>
  );
};
