import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const TelemedicinLoginSection = () => {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [telemedicinaUrl, setTelemedicinaUrl] = useState<string | null>(null);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cpf || !password) {
      toast.error('Por favor, preencha CPF e senha');
      return;
    }

    setIsLoading(true);
    setLoginSuccess(false);

    try {
      const { data, error } = await supabase.functions.invoke('telemedicina-auth', {
        body: {
          cpf: cpf.replace(/\D/g, ''),
          password: password
        }
      });

      if (error) {
        console.error('Erro na autenticação:', error);
        toast.error('Erro de conexão. Tente novamente.');
        return;
      }

      if (!data.success) {
        toast.error(data.message || 'CPF ou senha inválidos');
        return;
      }

      // Login bem-sucedido
      setLoginSuccess(true);
      
      if (data.telemedicina_url) {
        setTelemedicinaUrl(data.telemedicina_url);
        toast.success('Login realizado com sucesso!');
        
        // Abrir URL da telemedicina em nova aba após 1 segundo
        setTimeout(() => {
          window.open(data.telemedicina_url, '_blank');
        }, 1000);
      } else {
        toast.success(`Bem-vindo, ${data.user.name}!`);
        toast.info('Você não possui um plano de telemedicina ativo. Entre em contato para contratar.');
      }

    } catch (error) {
      console.error('Erro ao fazer login:', error);
      toast.error('Erro ao processar login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-elegant border-primary/20">
            <CardHeader className="text-center space-y-2 pb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mb-4">
                <LogIn className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl md:text-3xl font-varela uppercase">
                Acesso Exclusivo
                <span className="block text-lg font-normal text-muted-foreground mt-2">
                  Clientes com Plano de Telemedicina
                </span>
              </CardTitle>
              <CardDescription className="text-base">
                Entre com seu CPF e senha cadastrados para acessar o portal de telemedicina
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!loginSuccess ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-base font-medium">
                      CPF
                    </Label>
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={handleCPFChange}
                      maxLength={14}
                      disabled={isLoading}
                      className="h-12 text-lg"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base font-medium">
                      Senha
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-12 text-lg"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-lg font-semibold cta-gradient"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Autenticando...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 mr-2" />
                        Entrar no Portal
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    <p>
                      Não tem plano de telemedicina?{' '}
                      <button
                        type="button"
                        onClick={() => window.open('https://api.whatsapp.com/send/?phone=61999475886&text=Olá!%20Gostaria%20de%20contratar%20telemedicina', '_blank')}
                        className="text-primary hover:underline font-medium"
                      >
                        Contrate agora
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">Login realizado!</h3>
                    {telemedicinaUrl ? (
                      <>
                        <p className="text-muted-foreground">
                          Você está sendo redirecionado para o portal de telemedicina...
                        </p>
                        <Button
                          onClick={() => window.open(telemedicinaUrl, '_blank')}
                          className="mt-4 cta-gradient"
                        >
                          Abrir Portal Agora
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground">
                          Você não possui plano de telemedicina ativo
                        </p>
                        <Button
                          onClick={() => window.open('https://api.whatsapp.com/send/?phone=61999475886&text=Olá!%20Gostaria%20de%20contratar%20telemedicina', '_blank')}
                          className="mt-4 cta-gradient"
                        >
                          Contratar Telemedicina
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <Card className="text-center p-4 bg-card/50 backdrop-blur-sm border-primary/10">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Acesso Seguro</p>
            </Card>
            <Card className="text-center p-4 bg-card/50 backdrop-blur-sm border-primary/10">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Disponível 24/7</p>
            </Card>
            <Card className="text-center p-4 bg-card/50 backdrop-blur-sm border-primary/10">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Atendimento Imediato</p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
