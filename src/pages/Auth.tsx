import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, ArrowLeft, User, Mail, Phone, Calendar, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import logoSupernet from '/public/assets/logo-supernet.png';
import telemedicinHero from '@/assets/telemedicina-hero-new.png';

const Auth = () => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [cpf, setCpf] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && window.location.pathname !== '/auth') {
          navigate('/telemedicina');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user && window.location.pathname !== '/auth') {
        navigate('/telemedicina');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login');
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Você será redirecionado em instantes.",
        });
      }
    } catch (err) {
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !fullName) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const redirectUrl = `${window.location.origin}/telemedicina`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone || null,
            birth_date: birthDate || null,
            gender: gender || null,
            cpf: cpf || null,
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar a conta.",
        });
        setView('login');
      }
    } catch (err) {
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        setError(error.message);
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setView('login');
      }
    } catch (err) {
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-orange/30 flex">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-40 h-40 bg-orange/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-orange/5 to-primary/5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center p-2">
                <img 
                  src={logoSupernet} 
                  alt="SuperNet Fibra Óptica" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              {view === 'login' && (
                <>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Área do Cliente
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Informe seus dados de acesso.
                  </CardDescription>
                </>
              )}
              
              {view === 'signup' && (
                <>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Criar Conta
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Preencha seus dados para criar sua conta
                  </CardDescription>
                </>
              )}
              
              {view === 'forgot-password' && (
                <>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Esqueceu sua senha?
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Informe seu email para recuperar sua senha
                  </CardDescription>
                </>
              )}
            </CardHeader>

            <CardContent>
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              {view === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Email ou Código ou CPF"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2 relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-12"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    disabled={loading}
                  >
                    {loading ? 'Entrando...' : 'ENTRAR'}
                  </Button>

                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={() => setView('forgot-password')}
                      className="text-sm text-primary hover:underline"
                    >
                      Esqueceu sua senha?
                    </button>
                    <br />
                    <button
                      type="button"
                      onClick={() => setView('signup')}
                      className="text-sm text-primary hover:underline"
                    >
                      Primeiro acesso
                    </button>
                  </div>
                </form>
              )}

              {view === 'signup' && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Nome Completo *"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="CPF"
                      value={cpf}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        if (formatted.length <= 14) setCpf(formatted);
                      }}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="date"
                      placeholder="Data de nascimento"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-12 px-3 border border-input bg-background rounded-md text-sm"
                      disabled={loading}
                    >
                      <option value="">Selecione o sexo</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Telefone"
                      value={phone}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        if (formatted.length <= 15) setPhone(formatted);
                      }}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Email *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2 relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Senha *"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-12"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="space-y-2 relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirmar senha *"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 pr-12"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setView('login')}
                      className="flex-1 h-12"
                      disabled={loading}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    
                    <Button
                      type="submit"
                      className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                      disabled={loading}
                    >
                      {loading ? 'Criando...' : 'Criar Conta'}
                    </Button>
                  </div>
                </form>
              )}

              {view === 'forgot-password' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Informe seu email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setView('login')}
                      className="flex-1 h-12"
                      disabled={loading}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    
                    <Button
                      type="submit"
                      className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                      disabled={loading}
                    >
                      {loading ? 'Enviando...' : 'Recuperar Senha'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-white hover:text-white/80 hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao site
            </Button>
          </div>
        </div>
      </div>

      {/* Right Column - Image (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 relative z-10">
        <div className="relative max-w-lg">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
            <img 
              src={telemedicinHero} 
              alt="Telemedicina - Atendimento online 24h" 
              className="w-full h-auto rounded-2xl shadow-lg object-cover"
            />
            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                Telemedicina 24 horas
              </h2>
              <p className="text-white/90 text-lg leading-relaxed">
                Consultas médicas online com profissionais qualificados. 
                Acesso rápido, seguro e disponível a qualquer momento.
              </p>
              <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-orange font-bold text-lg">24h</div>
                  <div className="text-white/80 text-xs">Disponível</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-orange font-bold text-lg">4</div>
                  <div className="text-white/80 text-xs">Pessoas</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-orange font-bold text-lg">R$49</div>
                  <div className="text-white/80 text-xs">Por mês</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;