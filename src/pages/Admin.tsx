import { useState, useEffect } from "react";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, BarChart3, Users, CreditCard, MapPin, Edit, Plus, Monitor, HelpCircle, MessageSquare, MessageCircle } from "lucide-react";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { InstructionsCard } from "@/components/InstructionsCard";
import { GoogleReviews } from "@/components/GoogleReviews";
import { useTestimonials } from "@/contexts/TestimonialsContext";
import { PlanForm } from "@/components/PlanForm";
import { PromptGenerator } from "@/components/PromptGenerator";
import { HeroSettingsForm, HeroSlideForm } from "@/components/HeroForm";
import { FAQForm } from "@/components/FAQForm";
import BlogManagementComponent from "@/components/BlogManagement";
import DocumentManagement from "@/components/DocumentManagement";
import KnowledgeManagement from "@/components/KnowledgeManagement";
import AdminPrompts from "@/pages/AdminPrompts";
import CorporateAI from "@/components/CorporateAI";
import AgentManagement from "@/components/AgentManagement";
import CepManagement from '@/components/CepManagement';
import CoverageManagement from '@/components/CoverageManagement';
import IXCIntegration from '@/components/IXCIntegration';
import { CompanySettingsForm } from '@/components/CompanySettingsForm';
import { SMTPSettings } from '@/components/SMTPSettings';
import MediaRepositoryManager from '@/components/admin/MediaRepositoryManager';
import MessageShortcutsManager from '@/components/admin/MessageShortcutsManager';
import ClosureMessagesManager from '@/components/admin/ClosureMessagesManager';

import { IXCPlanSelector } from '@/components/IXCPlanSelector';
import { TestContractFlow } from '@/components/TestContractFlow';
import { PaymentNotifications } from '@/components/PaymentNotifications';
import { NotificationTemplates } from '@/components/NotificationTemplates';
import { EmailTemplateManagement } from '@/components/EmailTemplateManagement';
import { CampaignManagement } from '@/components/CampaignManagement';
import { NPSDashboard } from '@/components/NPSDashboard';
import { AddUserForm } from '@/components/AddUserForm';
import { MassOutageAlertCard } from '@/components/MassOutageAlertCard';
import WhatsAppSetup from '@/components/WhatsAppSetup';
import { WhatsAppApiTester } from '@/components/WhatsAppApiTester';
import { TestClientFinancialStatus } from '@/components/TestClientFinancialStatus';
import { DiagnosticoClienteCompleto } from '@/components/DiagnosticoClienteCompleto';
import { AutoSendOverdueInvoices } from '@/components/AutoSendOverdueInvoices';
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

      {/* Alert Card for Mass Outages */}
      <MassOutageAlertCard />

      {/* WhatsApp API Quick Test */}
      <WhatsAppApiTester />

      {/* Test Client Financial Status */}
      <TestClientFinancialStatus />

      {/* Diagnostic Complete Client */}
      <DiagnosticoClienteCompleto />

      {/* Auto Send Overdue Invoices */}
      <AutoSendOverdueInvoices />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Button
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => window.location.href = '/admin/agentes'}
          >
            <div className="flex items-center gap-3 w-full">
              <Users className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Gerenciar Agentes</div>
                <div className="text-xs text-muted-foreground">Atribuir departamentos</div>
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => window.location.href = '/atendimento'}
          >
            <div className="flex items-center gap-3 w-full">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Central de Atendimento</div>
                <div className="text-xs text-muted-foreground">Gerenciar conversas</div>
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => window.location.href = '/admin/monitoramento'}
          >
            <div className="flex items-center gap-3 w-full">
              <Monitor className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Monitoramento</div>
                <div className="text-xs text-muted-foreground">Auto-reboot e status</div>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>

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

      <div className="grid gap-6 md:grid-cols-2">
        <TestContractFlow />
        
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Nenhuma atividade recente</p>
          </CardContent>
        </Card>
      </div>
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
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [presence, setPresence] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // First get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        throw profilesError;
      }

      // Then get user roles for each profile
      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          return {
            ...profile,
            user_roles: roleData ? [roleData] : [{ role: 'viewer' }]
          };
        })
      );

      setUsers(usersWithRoles);
      
      // Load agent assignments
      const { data: assignmentsData } = await supabase
        .from('agent_department_assignments')
        .select('*');
      
      setAssignments(assignmentsData || []);
      
      // Load presence status
      const { data: presenceData } = await supabase
        .from('agent_presence')
        .select('*');
      
      setPresence(presenceData || []);
      
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

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
      toast.error('Erro ao atualizar permissão');
    }
  };
  
  const getUserAssignments = (userId: string) => {
    return assignments.filter(a => a.user_id === userId);
  };
  
  const getUserPresence = (userId: string) => {
    return presence.find(p => p.user_id === userId);
  };
  
  const DEPARTMENTS = [
    { value: 'comercial', label: 'Comercial', color: 'bg-blue-500' },
    { value: 'tecnico', label: 'Técnico', color: 'bg-green-500' },
    { value: 'financeiro', label: 'Financeiro', color: 'bg-yellow-500' },
    { value: 'administrativo', label: 'Administrativo', color: 'bg-purple-500' },
    { value: 'logistica', label: 'Logística', color: 'bg-orange-500' }
  ];
  
  const getDeptLabel = (dept: string) => {
    return DEPARTMENTS.find(d => d.value === dept)?.label || dept;
  };
  
  const getDeptColor = (dept: string) => {
    return DEPARTMENTS.find(d => d.value === dept)?.color || 'bg-gray-500';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários & Agentes</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, permissões e configurações de atendimento
          </p>
        </div>
        <Button 
          onClick={() => navigate('/admin/add-user')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Usuário
        </Button>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Guia de Gerenciamento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Criar usuários:</strong> Clique em "Adicionar Usuário" para criar novas contas</p>
          <p><strong>Permissões:</strong> Defina se o usuário é Admin, Editor ou Visualizador</p>
          <p><strong>Configurar agentes:</strong> Use "Configurar como Agente" para atribuir departamentos</p>
          <p><strong>Editar perfis:</strong> Atualize informações pessoais, avatar e horários de trabalho</p>
        </CardContent>
      </Card>

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
              {users.map((user) => {
                const userAssignments = getUserAssignments(user.user_id);
                const userPresence = getUserPresence(user.user_id);
                const isAgent = userAssignments.length > 0 || userPresence;
                const isOnline = userPresence?.status === 'online';
                
                return (
                  <Card
                    key={user.id}
                    className="border-2"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="w-8 h-8 text-primary" />
                            </div>
                          )}
                          {isAgent && (
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                              isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`} title={isOnline ? 'Online' : 'Offline'} />
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              {user.phone && (
                                <p className="text-xs text-muted-foreground">{user.phone}</p>
                              )}
                            </div>
                            
                            {/* Role Badge */}
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              user.user_roles[0]?.role === 'admin' 
                                ? 'bg-red-100 text-red-800' 
                                : user.user_roles[0]?.role === 'editor'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.user_roles[0]?.role === 'admin' ? 'Administrador' : 
                               user.user_roles[0]?.role === 'editor' ? 'Editor' : 'Visualizador'}
                            </span>
                          </div>
                          
                          {/* Departamentos */}
                          {userAssignments.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-1">Departamentos:</p>
                              <div className="flex flex-wrap gap-1">
                                {userAssignments.map(assignment => (
                                  <span
                                    key={assignment.id}
                                    className={`text-xs px-2 py-1 rounded-full text-white flex items-center gap-1 ${getDeptColor(assignment.department)}`}
                                  >
                                    {getDeptLabel(assignment.department)}
                                    {assignment.is_universal && ' ⭐'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Agent Stats */}
                          {userPresence && (
                            <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                              <span>
                                Conversas: {userPresence.current_conversations}/{userPresence.max_conversations}
                              </span>
                              <span>
                                Status: {isOnline ? '🟢 Online' : '⚫ Offline'}
                              </span>
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/perfil-agente?user_id=${user.user_id}`)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Editar Perfil
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/agentes`)}
                            >
                              <Users className="h-3 w-3 mr-1" />
                              Configurar como Agente
                            </Button>
                            
                            <select
                              value={user.user_roles[0]?.role || 'viewer'}
                              onChange={(e) => updateUserRole(user.user_id, e.target.value as 'admin' | 'editor' | 'viewer')}
                              className="px-3 py-1 border rounded text-sm ml-auto"
                            >
                              <option value="viewer">Visualizador</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const deletePlan = async (planId: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      setPlans(plans.filter(plan => plan.id !== planId));
      toast.success('Plano excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Erro ao excluir plano');
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  const handleSave = () => {
    loadPlans();
    handleCloseForm();
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Planos</h1>
          <p className="text-muted-foreground">Configure planos de internet e preços</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="ixc-plans">Vincular IXC</TabsTrigger>
          <TabsTrigger value="prompt">
            <MessageSquare className="w-4 h-4 mr-2" />
            Prompt do Chatbot
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="plans" className="space-y-6">
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
              <p className="text-muted-foreground mb-4">Nenhum plano cadastrado</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Plano
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <Card key={plan.id} className={`relative ${!plan.active ? 'opacity-50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        {plan.image_url && (
                          <div className="flex-shrink-0">
                            <img 
                              src={plan.image_url} 
                              alt={plan.name} 
                              className="w-24 h-24 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            {plan.popular && (
                              <span className="bg-gradient-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold">
                                POPULAR
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              plan.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {plan.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <CardDescription className="mb-3">{plan.description}</CardDescription>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Velocidade:</span> {plan.speed}
                            </div>
                            <div>
                              <span className="font-medium">Preço:</span> R$ {plan.price?.toFixed(2).replace('.', ',')}
                              {plan.original_price && (
                                <span className="text-muted-foreground ml-2 line-through">
                                  R$ {plan.original_price.toFixed(2).replace('.', ',')}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">CTA:</span> {plan.cta_text}
                            </div>
                          </div>
                          {plan.features && plan.features.length > 0 && (
                            <div className="mt-3">
                              <span className="font-medium text-sm">Características:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {plan.features.slice(0, 3).map((feature: any, idx: number) => (
                                  <span key={idx} className="bg-muted px-2 py-1 rounded text-xs">
                                    {feature.text}
                                  </span>
                                ))}
                                {plan.features.length > 3 && (
                                  <span className="text-muted-foreground text-xs px-2 py-1">
                                    +{plan.features.length - 3} mais
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(plan)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={plan.active ? "outline" : "default"}
                          size="sm"
                          onClick={() => togglePlanActive(plan.id, plan.active)}
                        >
                          {plan.active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePlan(plan.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ixc-plans" className="space-y-6">
          <IXCPlanSelector />
        </TabsContent>
        
        <TabsContent value="prompt" className="space-y-6">
          <PromptGenerator />
        </TabsContent>
      </Tabs>

      <PlanForm
        isOpen={showForm}
        onClose={handleCloseForm}
        plan={editingPlan}
        onSave={handleSave}
      />
    </div>
  );
};

// Simple wrapper for the new CoverageManagement component
const AdminCoverageManagement = () => <CoverageManagement />;

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

const ProfileManagement = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar_url: ''
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo e tamanho do arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('A imagem deve ter menos de 5MB');
        return;
      }

      setUploadingAvatar(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Remover avatar antigo se existir
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload da nova imagem
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obter URL pública da imagem
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = data.publicUrl;

      // Atualizar perfil com nova URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Atualizar estado local
      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      toast.success('Foto de perfil atualizada com sucesso!');

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploadingAvatar(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remover arquivo do storage
      if (profile.avatar_url) {
        const fileName = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('avatars')
          .remove([fileName]);
      }

      // Atualizar perfil
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, avatar_url: '' }));
      toast.success('Foto de perfil removida com sucesso!');

    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Erro ao remover foto de perfil');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          setProfile({
            name: profileData.name || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            avatar_url: profileData.avatar_url || ''
          });
        }

        setUserRole(roleData?.role || 'viewer');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          phone: profile.phone,
          avatar_url: profile.avatar_url
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    try {
      console.log('Attempting to change password...');
      
      if (!passwords.newPassword || !passwords.confirmPassword) {
        toast.error('Por favor, preencha todos os campos');
        return;
      }

      if (passwords.newPassword !== passwords.confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }

      if (passwords.newPassword.length < 6) {
        toast.error('A nova senha deve ter pelo menos 6 caracteres');
        return;
      }

      setChangingPassword(true);
      console.log('Calling supabase.auth.updateUser...');

      const { data, error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast.success('Senha alterada com sucesso!');
      console.log('Password changed successfully');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Erro ao alterar senha: ' + (error?.message || 'Erro desconhecido'));
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seus dados pessoais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo</label>
              <Input
                value={profile.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={profile.email}
                disabled
                className="bg-muted"
                placeholder="Seu email"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado por questões de segurança
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <Input
                value={profile.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cargo/Função</label>
              <Input
                value={userRole}
                disabled
                className="bg-muted capitalize"
                placeholder="Seu cargo"
              />
              <p className="text-xs text-muted-foreground">
                O cargo é definido pelo administrador do sistema
              </p>
            </div>

            <Button onClick={saveProfile} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>Mantenha sua conta segura com uma senha forte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <Input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                placeholder="Digite sua nova senha"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Nova Senha</label>
              <Input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                placeholder="Confirme sua nova senha"
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Requisitos da senha:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Mínimo de 6 caracteres</li>
                <li>• Use uma combinação de letras e números</li>
                <li>• Evite informações pessoais óbvias</li>
              </ul>
            </div>

            <Button 
              onClick={changePassword} 
              disabled={changingPassword || !passwords.newPassword || !passwords.confirmPassword}
              className="w-full"
            >
              {changingPassword ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Avatar e Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Foto do Perfil</CardTitle>
          <CardDescription>Personalize seu avatar no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                profile.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Foto do Perfil</p>
              <p className="text-xs text-muted-foreground">
                Recomendamos uma imagem quadrada de pelo menos 200x200 pixels
              </p>
              <div className="flex gap-2">
                <label htmlFor="avatar-upload">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={uploadingAvatar}
                    asChild
                  >
                    <span className="cursor-pointer">
                      {uploadingAvatar ? 'Enviando...' : 'Fazer Upload'}
                    </span>
                  </Button>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  className="hidden"
                />
                {profile.avatar_url && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={removeAvatar}
                    disabled={uploadingAvatar}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos suportados: JPG, PNG, GIF (máximo 5MB)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Atividade Recente */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Suas últimas ações no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Perfil atualizado</p>
                <p className="text-xs text-muted-foreground">Informações pessoais modificadas</p>
              </div>
              <span className="text-xs text-muted-foreground">Agora</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Login realizado</p>
                <p className="text-xs text-muted-foreground">Acesso ao painel administrativo</p>
              </div>
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SettingsManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Configurações</h2>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações da empresa e do sistema
        </p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company">Identidade Visual</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <CompanySettingsForm />
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de SEO</CardTitle>
              <CardDescription>
                Configure meta tags, títulos e descrições para otimização de busca
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título do Site</label>
                  <Input placeholder="SUPERNET FIBRA - Internet de Alta Velocidade" className="mt-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">Meta Description</label>
                  <Input placeholder="Internet fibra óptica de alta velocidade..." className="mt-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">Palavras-chave</label>
                  <Input placeholder="internet, fibra óptica, banda larga..." className="mt-2" />
                </div>
                <Button>Salvar Configurações SEO</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp" className="space-y-4">
          <SMTPSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AtendimentoManagement = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Configurações de Atendimento</h1>
      <p className="text-muted-foreground">Gerencie mensagens, atalhos e mídias do atendimento</p>
    </div>
    <div className="grid gap-6">
      <ClosureMessagesManager />
      <MessageShortcutsManager />
      <MediaRepositoryManager />
    </div>
  </div>
);

const HeroManagement = () => {
  const [heroSettings, setHeroSettings] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);

  const loadHeroData = async () => {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('hero_settings')
        .select('*')
        .single();

      const { data: slides, error: slidesError } = await supabase
        .from('hero_slides')
        .select('*')
        .order('display_order', { ascending: true });

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      if (slidesError) throw slidesError;

      setHeroSettings(settings);
      setHeroSlides(slides || []);
    } catch (error) {
      console.error('Error loading hero data:', error);
      toast.error('Erro ao carregar dados da Hero Section');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeroData();
  }, []);

  const handleEditSlide = (slide: any) => {
    setEditingSlide(slide);
    setShowSlideForm(true);
  };

  const handleCloseSlideForm = () => {
    setShowSlideForm(false);
    setEditingSlide(null);
  };

  const toggleSlideActive = async (slideId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('hero_slides')
        .update({ active: !currentActive })
        .eq('id', slideId);

      if (error) throw error;
      
      setHeroSlides(heroSlides.map(slide => 
        slide.id === slideId 
          ? { ...slide, active: !currentActive }
          : slide
      ));
      
      toast.success(`Slide ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Error updating slide:', error);
      toast.error('Erro ao atualizar slide');
    }
  };

  const deleteSlide = async (slideId: string) => {
    if (!confirm('Tem certeza que deseja excluir este slide?')) return;
    
    try {
      const { error } = await supabase
        .from('hero_slides')
        .delete()
        .eq('id', slideId);

      if (error) throw error;
      
      setHeroSlides(heroSlides.filter(slide => slide.id !== slideId));
      toast.success('Slide excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting slide:', error);
      toast.error('Erro ao excluir slide');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Hero Section</h1>
          <p className="text-muted-foreground">Configure a seção principal do site</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Hero Section</h1>
        <p className="text-muted-foreground">Configure a seção principal do site</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Configurações Gerais</CardTitle>
            <CardDescription>Títulos, textos e mensagens da Hero Section</CardDescription>
          </div>
          <Button onClick={() => setShowSettingsForm(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </CardHeader>
        <CardContent>
          {heroSettings ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Título Principal:</h3>
                <p className="text-muted-foreground">{heroSettings.main_title}</p>
              </div>
              <div>
                <h3 className="font-medium">Subtítulo:</h3>
                <p className="text-muted-foreground">{heroSettings.subtitle}</p>
              </div>
              <div>
                <h3 className="font-medium">Badge:</h3>
                <p className="text-muted-foreground">{heroSettings.badge_text}</p>
              </div>
              <div>
                <h3 className="font-medium">Botão CTA:</h3>
                <p className="text-muted-foreground">{heroSettings.cta_text}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma configuração encontrada</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Slides do Carrossel</CardTitle>
            <CardDescription>
              Total de {heroSlides.length} slide{heroSlides.length !== 1 ? 's' : ''} 
            </CardDescription>
          </div>
          <Button onClick={() => setShowSlideForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Slide
          </Button>
        </CardHeader>
        <CardContent>
          {heroSlides.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum slide cadastrado</p>
              <Button onClick={() => setShowSlideForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Slide
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {heroSlides.map((slide) => (
                <Card key={slide.id} className={`${!slide.active ? 'opacity-50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{slide.title}</CardTitle>
                          <span
                            className={
                              "px-2 py-1 rounded-full text-xs font-semibold " +
                              (slide.active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800")
                            }
                          >
                            {slide.active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <CardDescription className="mb-3">{slide.description}</CardDescription>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Ordem:</span> {slide.display_order} | 
                          <span className="font-medium ml-2">Imagem:</span> {slide.image_url}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSlide(slide)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={slide.active ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleSlideActive(slide.id, slide.active)}
                        >
                          {slide.active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSlide(slide.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {heroSettings && (
        <HeroSettingsForm
          isOpen={showSettingsForm}
          onClose={() => setShowSettingsForm(false)}
          settings={heroSettings}
          onSave={loadHeroData}
        />
      )}

      <HeroSlideForm
        isOpen={showSlideForm}
        onClose={handleCloseSlideForm}
        slide={editingSlide}
        onSave={loadHeroData}
      />
    </div>
  );
};

const FAQManagement = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  const loadFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      toast.error('Erro ao carregar FAQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const handleEdit = (faq: any) => {
    setEditingFaq(faq);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingFaq(null);
  };

  const toggleFaqActive = async (faqId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ active: !currentActive })
        .eq('id', faqId);

      if (error) throw error;
      
      setFaqs(faqs.map(faq => 
        faq.id === faqId 
          ? { ...faq, active: !currentActive }
          : faq
      ));
      
      toast.success(`FAQ ${!currentActive ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (error) {
      console.error('Error updating FAQ:', error);
      toast.error('Erro ao atualizar FAQ');
    }
  };

  const deleteFaq = async (faqId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta FAQ?')) return;
    
    try {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', faqId);

      if (error) throw error;
      
      setFaqs(faqs.filter(faq => faq.id !== faqId));
      toast.success('FAQ excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Erro ao excluir FAQ');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar FAQ</h1>
          <p className="text-muted-foreground">Configure perguntas frequentes</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar FAQ</h1>
          <p className="text-muted-foreground">Configure perguntas frequentes</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova FAQ
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
          <CardDescription>
            Total de {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} cadastrada{faqs.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma FAQ cadastrada</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira FAQ
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {faqs.map((faq) => (
                <Card key={faq.id} className={`${!faq.active ? 'opacity-50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{faq.question}</CardTitle>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            faq.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {faq.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <CardDescription className="mb-3">
                          {faq.answer.length > 150 ? `${faq.answer.substring(0, 150)}...` : faq.answer}
                        </CardDescription>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Ícone:</span> {faq.icon} | 
                          <span className="font-medium ml-2">Ordem:</span> {faq.display_order}
                          {faq.video_url && (
                            <span> | <span className="font-medium">Vídeo:</span> Sim</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(faq)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={faq.active ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleFaqActive(faq.id, faq.active)}
                        >
                          {faq.active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteFaq(faq.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FAQForm
        isOpen={showForm}
        onClose={handleCloseForm}
        faq={editingFaq}
        onSave={loadFaqs}
      />
    </div>
  );
};

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
    <AuthGuard requiredRoles={['admin', 'editor']}>
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
                <Route path="/add-user" element={<AddUserForm />} />
                <Route path="/plans" element={<PlansManagement />} />
                <Route path="/coverage" element={<AdminCoverageManagement />} />
                <Route path="/hero" element={<HeroManagement />} />
                <Route path="/faq" element={<FAQManagement />} />
                <Route path="/blog" element={<BlogManagementComponent />} />
                <Route path="/agents" element={<AgentManagement />} />
                <Route path="/chat-tester" element={<Navigate to="/admin/testes" replace />} />
                <Route path="/reviews" element={<ReviewsManagement />} />
                <Route path="/prompts" element={<AdminPrompts />} />
                <Route path="/documents" element={<DocumentManagement />} />
                <Route path="/knowledge" element={<KnowledgeManagement />} />
                <Route path="/corporate-ai" element={<CorporateAI />} />
                <Route path="/ixc-integration" element={<IXCIntegration />} />
                {/* Redirect old IXC documentation route to knowledge base */}
                <Route path="/ixc-documentation" element={<Navigate to="/admin/knowledge" replace />} />
                <Route path="/payment-notifications" element={<PaymentNotifications />} />
                <Route path="/notification-templates" element={<NotificationTemplates />} />
                <Route path="/campaigns" element={<CampaignManagement />} />
                <Route path="/nps-dashboard" element={<NPSDashboard />} />
                <Route path="/financial" element={<FinancialDashboard />} />
                <Route path="/whatsapp" element={<WhatsAppSetup />} />
                <Route path="/profile" element={<ProfileManagement />} />
                <Route path="/atendimento-config" element={<AtendimentoManagement />} />

                <Route path="/settings" element={<SettingsManagement />} />
              </Routes>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
};

export default Admin;