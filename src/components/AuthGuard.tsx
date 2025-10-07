import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Session, User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: ('admin' | 'editor' | 'viewer')[];
}

interface UserRole {
  role: 'admin' | 'editor' | 'viewer';
}

export const AuthGuard = ({ children, requiredRoles = ['admin', 'editor'] }: AuthGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('AuthGuard: Checking authentication...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Erro ao verificar sessão');
          setLoading(false);
          return;
        }

        if (!session?.user) {
          console.log('AuthGuard: No user session found, redirecting to auth');
          setLoading(false);
          navigate('/auth');
          return;
        }

        console.log('AuthGuard: User found:', session.user.email);
        setUser(session.user);
        setSession(session);

        // Check user role (prefer RPC to avoid RLS recursion)
        let role: 'admin' | 'editor' | 'viewer' = 'viewer';
        try {
          const checkRoleViaRPC = async (r: 'admin' | 'editor' | 'viewer') => {
            const { data, error } = await supabase.rpc('has_role', {
              _user_id: session.user.id,
              _role: r
            });
            if (error) throw error;
            return data === true;
          };

          if (await checkRoleViaRPC('admin')) role = 'admin';
          else if (await checkRoleViaRPC('editor')) role = 'editor';
          else role = 'viewer';
        } catch (rpcErr) {
          // Fallback to direct table read
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (roleError) {
            console.error('Role error:', roleError);
            setError('Erro ao verificar permissões');
            setLoading(false);
            return;
          }
          role = (roleData?.role as any) || 'viewer';
        }

        console.log('AuthGuard: User role:', role);
        setUserRole(role);

        // Check if user has required role
        if (requiredRoles.includes(role)) {
          console.log('AuthGuard: User authorized');
          setAuthorized(true);
        } else {
          console.log('AuthGuard: User not authorized for this area');
          setError(`Acesso negado. Você precisa ter permissão de ${requiredRoles.join(' ou ')} para acessar esta área.`);
        }
      } catch (err) {
        console.error('AuthGuard error:', err);
        setError('Erro interno de autenticação');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthGuard: Auth state changed:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/auth');
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          // Recheck auth when user signs in
          setLoading(true);
          checkAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, requiredRoles]);

  const handleGoBack = () => {
    navigate('/');
  };

  const handleGoToAuth = () => {
    navigate('/auth');
  };

  if (loading) {
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

  if (error || !authorized) {
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