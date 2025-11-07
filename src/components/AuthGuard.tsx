import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Session, User } from '@supabase/supabase-js';
import { useUserRole } from '@/hooks/useUserRole';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: ('admin' | 'editor' | 'viewer' | 'gestor')[];
}

interface UserRole {
  role: 'admin' | 'editor' | 'viewer' | 'gestor';
}

export const AuthGuard = ({ children, requiredRoles = ['admin', 'editor'] }: AuthGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null); // null = verificando, true = autorizado, false = negado
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { role: userRole, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError('Erro ao verificar sessão');
          setAuthorized(false);
          return;
        }

        if (!session?.user) {
          navigate('/auth');
          return;
        }

        setUser(session.user);
        setSession(session);
      } catch (err) {
        setError('Erro interno de autenticação');
        setAuthorized(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/auth');
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setSession(session);
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // navigate é estável (do react-router), não precisa nas dependências

  // Check authorization whenever role changes
  useEffect(() => {
    if (!roleLoading && user) {
      console.log('🛡️ AuthGuard - Checking authorization:', { 
        userRole, 
        requiredRoles, 
        userId: user.id,
        userEmail: user.email 
      });
      const rolesString = requiredRoles.join(',');
      if (requiredRoles.includes(userRole)) {
        console.log('✅ AuthGuard - Access granted');
        setAuthorized(true);
        setError(null);
      } else {
        console.log('❌ AuthGuard - Access denied');
        setError(`Acesso negado. Você precisa ter permissão de ${requiredRoles.join(' ou ')} para acessar esta área.`);
        setAuthorized(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, roleLoading, user, requiredRoles.join(',')]);

  const handleGoBack = () => {
    navigate('/');
  };

  const handleGoToAuth = () => {
    navigate('/auth');
  };

  // Mostrar loading se ainda não temos user OU se authorized ainda é null (verificando)
  if (roleLoading || !user || authorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h2 className="text-lg font-semibold mb-2">Verificando acesso...</h2>
            <p className="text-sm text-muted-foreground text-center">
              Aguarde enquanto verificamos suas credenciais e permissões.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Só mostra erro se authorized é explicitamente false
  if (error || authorized === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {error || 'Você não tem permissão para acessar esta área.'}
            </p>
            
            {user && (
              <div className="bg-muted p-3 rounded-lg mb-4 w-full">
                <p className="text-xs text-muted-foreground">Usuário atual:</p>
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Permissão: {userRole || 'Não definida'}
                </p>
              </div>
            )}

            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleGoBack} className="flex-1">
                Voltar ao Site
              </Button>
              {!user && (
                <Button onClick={handleGoToAuth} className="flex-1">
                  Fazer Login
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated and authorized
  return <>{children}</>;
};