import { useState, useEffect } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, BarChart3, Users, CreditCard, MapPin } from "lucide-react";
import { InstructionsCard } from "@/components/InstructionsCard";
import { GoogleReviews } from "@/components/GoogleReviews";
import { useTestimonials } from "@/contexts/TestimonialsContext";
import { toast } from "sonner";

// Dashboard component
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPlans: 0,
    coverageAreas: 0,
    testimonials: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [
          { count: usersCount },
          { count: plansCount },
          { count: areasCount },
          { count: testimonialsCount }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('plans').select('*', { count: 'exact', head: true }),
          supabase.from('coverage_areas').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }) // placeholder para testimonials
        ]);

        setStats({
          totalUsers: usersCount || 0,
          totalPlans: plansCount || 0,
          coverageAreas: areasCount || 0,
          testimonials: testimonialsCount || 0
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema administrativo</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlans}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áreas de Cobertura</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coverageAreas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depoimentos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testimonials}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhuma atividade recente</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Reviews Management component (legacy content)
const ReviewsManagement = () => {
  const { testimonials, removeTestimonial } = useTestimonials();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Avaliações</h1>
        <p className="text-muted-foreground">Gerencie depoimentos e avaliações do Google Reviews</p>
      </div>

      <Tabs defaultValue="instructions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="instructions">Como Usar</TabsTrigger>
          <TabsTrigger value="google-reviews">Google Reviews</TabsTrigger>
          <TabsTrigger value="testimonials">Depoimentos Atuais</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="space-y-4">
          <InstructionsCard />
        </TabsContent>

        <TabsContent value="google-reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar Avaliações do Google</CardTitle>
              <CardDescription>
                Importe automaticamente as avaliações do seu negócio no Google Reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleReviews />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Depoimentos Gerenciados</CardTitle>
              <CardDescription>
                Gerencie todos os depoimentos exibidos no site
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testimonials.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhum depoimento encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    Use o Google Reviews para importar avaliações automaticamente
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testimonials.map((testimonial, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">
                            {testimonial.name}
                          </h3>
                          <div className="flex">
                            {Array.from({ length: testimonial.rating }).map((_, i) => (
                              <span key={i} className="text-yellow-400">⭐</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm mb-2">
                          {testimonial.text}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {testimonial.location}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTestimonial(index)}
                        className="ml-4 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Configure as integrações e preferências do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Google Reviews</h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                  Para usar a funcionalidade do Google Reviews, você precisa configurar a integração 
                  com a API do Google Places.
                </p>
                <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
                  <li>• Obtenha uma chave da API do Google Places</li>
                  <li>• Configure as credenciais no sistema</li>
                  <li>• Teste a conexão com seu negócio</li>
                </ul>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Próximas Funcionalidades</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Moderação automática de comentários</li>
                  <li>• Notificações de novas avaliações</li>
                  <li>• Relatórios de satisfação</li>
                  <li>• Integração com redes sociais</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Users Management component
const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        console.log('Loading users...');
        // First get all profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) {
          console.error('Profiles error:', profilesError);
          throw profilesError;
        }

        console.log('Profiles loaded:', profilesData);

        // Then get user roles for each profile
        const usersWithRoles = await Promise.all(
          (profilesData || []).map(async (profile) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.user_id)
              .maybeSingle(); // Use maybeSingle to avoid errors when no role found

            console.log(`Role for user ${profile.user_id}:`, roleData);

            return {
              ...profile,
              user_roles: roleData ? [roleData] : [{ role: 'viewer' }]
            };
          })
        );

        console.log('Users with roles:', usersWithRoles);
        setUsers(usersWithRoles);
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const updateUserRole = async (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      
      setUsers(users.map(user => 
        user.user_id === userId 
          ? { ...user, user_roles: [{ role: newRole }] }
          : user
      ));
      
      toast.success('Permissão atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando usuários...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Total de {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.phone && (
                        <p className="text-xs text-muted-foreground">{user.phone}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={user.user_roles[0]?.role || 'viewer'}
                      onChange={(e) => updateUserRole(user.user_id, e.target.value as 'admin' | 'editor' | 'viewer')}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      <option value="viewer">Visualizador</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Administrador</option>
                    </select>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.user_roles[0]?.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : user.user_roles[0]?.role === 'editor'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.user_roles[0]?.role === 'admin' ? 'Admin' : 
                       user.user_roles[0]?.role === 'editor' ? 'Editor' : 'Viewer'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PlansManagement = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .order('price', { ascending: true });

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error loading plans:', error);
        toast.error('Erro ao carregar planos');
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const togglePlanActive = async (planId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({ active: !currentActive })
        .eq('id', planId);

      if (error) throw error;
      
      setPlans(plans.map(plan => 
        plan.id === planId 
          ? { ...plan, active: !currentActive }
          : plan
      ));
      
      toast.success(`Plano ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Erro ao atualizar plano');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Planos</h1>
          <p className="text-muted-foreground">Configure planos de internet e preços</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando planos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Planos</h1>
        <p className="text-muted-foreground">Configure planos de internet e preços</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planos Disponíveis</CardTitle>
          <CardDescription>
            Total de {plans.length} plano{plans.length !== 1 ? 's' : ''} cadastrado{plans.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum plano cadastrado</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className={`relative ${!plan.active ? 'opacity-50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        plan.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                        <span className="text-sm font-normal text-muted-foreground">/mês</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Velocidade: {plan.speed}
                      </p>
                    </div>
                    
                    <Button
                      variant={plan.active ? "outline" : "default"}
                      size="sm"
                      onClick={() => togglePlanActive(plan.id, plan.active)}
                      className="w-full"
                    >
                      {plan.active ? 'Desativar' : 'Ativar'} Plano
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const CoverageManagement = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCoverageAreas = async () => {
      try {
        const { data, error } = await supabase
          .from('coverage_areas')
          .select('*')
          .order('name');

        if (error) throw error;
        setAreas(data || []);
      } catch (error) {
        console.error('Error loading coverage areas:', error);
        toast.error('Erro ao carregar áreas de cobertura');
      } finally {
        setLoading(false);
      }
    };

    loadCoverageAreas();
  }, []);

  const toggleAreaActive = async (areaId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('coverage_areas')
        .update({ active: !currentActive })
        .eq('id', areaId);

      if (error) throw error;
      
      setAreas(areas.map(area => 
        area.id === areaId 
          ? { ...area, active: !currentActive }
          : area
      ));
      
      toast.success(`Área ${!currentActive ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (error) {
      console.error('Error updating area:', error);
      toast.error('Erro ao atualizar área');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Cobertura</h1>
          <p className="text-muted-foreground">Configure áreas de cobertura e disponibilidade</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando áreas de cobertura...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Cobertura</h1>
        <p className="text-muted-foreground">Configure áreas de cobertura e disponibilidade</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Áreas de Cobertura</CardTitle>
          <CardDescription>
            Total de {areas.length} área{areas.length !== 1 ? 's' : ''} cadastrada{areas.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {areas.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma área de cobertura cadastrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {areas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-6 h-6 rounded-full border-2"
                      style={{ backgroundColor: area.color }}
                    />
                    <div>
                      <h3 className="font-semibold">{area.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Código: {area.region_code}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={area.active ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleAreaActive(area.id, area.active)}
                    >
                      {area.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      area.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {area.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const BlogManagement = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Gerenciar Blog</h1>
      <p className="text-muted-foreground">Crie e edite artigos do blog</p>
    </div>
    <Card>
      <CardContent className="p-6">
        <p className="text-muted-foreground">Funcionalidade em desenvolvimento...</p>
      </CardContent>
    </Card>
  </div>
);

const ProfileManagement = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Meu Perfil</h1>
      <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
    </div>
    <Card>
      <CardContent className="p-6">
        <p className="text-muted-foreground">Funcionalidade em desenvolvimento...</p>
      </CardContent>
    </Card>
  </div>
);

const SettingsManagement = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Configurações</h1>
      <p className="text-muted-foreground">Configure preferências do sistema</p>
    </div>
    <Card>
      <CardContent className="p-6">
        <p className="text-muted-foreground">Funcionalidade em desenvolvimento...</p>
      </CardContent>
    </Card>
  </div>
);

const Admin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('Admin: Starting authentication check...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Admin: Session check result:', session ? 'authenticated' : 'not authenticated');
        
        if (!session) {
          console.log('Admin: No session found, redirecting to /auth');
          navigate('/auth');
          return;
        }

        // Check if user has admin or editor role
        const { data: role } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (!role || (role.role !== 'admin' && role.role !== 'editor')) {
          toast.error("Bem-vindo ao sistema! Você tem acesso como visualizador.");
          // Não redireciona, apenas permite acesso limitado
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        navigate('/auth');
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<UsersManagement />} />
              <Route path="/plans" element={<PlansManagement />} />
              <Route path="/coverage" element={<CoverageManagement />} />
              <Route path="/blog" element={<BlogManagement />} />
              <Route path="/reviews" element={<ReviewsManagement />} />
              <Route path="/profile" element={<ProfileManagement />} />
              <Route path="/settings" element={<SettingsManagement />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;