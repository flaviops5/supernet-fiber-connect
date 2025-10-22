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
import { Trash2, Edit, Plus, MessageSquare, Users, CreditCard, HelpCircle } from "lucide-react";
import { useTestimonials } from "@/contexts/TestimonialsContext";
import BlogManagementComponent from "@/components/BlogManagement";
import DocumentManagement from "@/components/DocumentManagement";
import KnowledgeManagement from "@/components/KnowledgeManagement";
import AdminPrompts from "@/pages/AdminPrompts";
import CorporateAI from "@/components/CorporateAI";
import AgentManagement from "@/components/AgentManagement";
import CoverageManagement from '@/components/CoverageManagement';
import IXCIntegration from '@/components/IXCIntegration';
import { CompanySettingsForm } from '@/components/CompanySettingsForm';
import { SMTPSettings } from '@/components/SMTPSettings';
import MediaRepositoryManager from '@/components/admin/MediaRepositoryManager';
import MessageShortcutsManager from '@/components/admin/MessageShortcutsManager';
import ClosureMessagesManager from '@/components/admin/ClosureMessagesManager';
import { IXCPlanSelector } from '@/components/IXCPlanSelector';
import { PaymentNotifications } from '@/components/PaymentNotifications';
import { NotificationTemplates } from '@/components/NotificationTemplates';
import { EmailTemplateManagement } from '@/components/EmailTemplateManagement';
import { CampaignManagement } from '@/components/CampaignManagement';
import { NPSDashboard } from '@/components/NPSDashboard';
import { AddUserForm } from '@/components/AddUserForm';
import WhatsAppSetup from '@/components/WhatsAppSetup';
import { FinancialDashboard } from '@/components/FinancialDashboard';
import { PromptGenerator } from "@/components/PromptGenerator";
import { HeroSettingsForm, HeroSlideForm } from "@/components/HeroForm";
import { FAQForm } from "@/components/FAQForm";
import { AIFAQGenerator } from "@/components/AIFAQGenerator";
import { PlanForm } from "@/components/PlanForm";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { 
  Dashboard as DashboardComponent, 
  ReviewsManagement as ReviewsComponent 
} from "@/components/admin";

// Component wrappers
const Dashboard = () => <DashboardComponent />;
const ReviewsManagement = () => <ReviewsComponent />;

// Users Management Component
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
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

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
      
      const { data: assignmentsData } = await supabase
        .from('agent_department_assignments')
        .select('*');
      
      setAssignments(assignmentsData || []);
      
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
      logger.error('Error loading plans', error as Error);
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
      logger.error('Error updating plan', error as Error);
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
      logger.error('Error deleting plan', error as Error);
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

const AdminCoverageManagement = () => <CoverageManagement />;

const HeroManagement = () => {
  const [heroSettings, setHeroSettings] = useState(null);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);

  useEffect(() => {
    loadHeroData();
  }, []);

  const loadHeroData = async () => {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('hero_settings')
        .select('*')
        .maybeSingle();

      const { data: slidesData, error: slidesError } = await supabase
        .from('hero_slides')
        .select('*')
        .order('display_order', { ascending: true });

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      if (slidesError) throw slidesError;

      setHeroSettings(settings);
      setSlides(slidesData || []);
    } catch (error) {
      logger.error('Error loading hero data', error as Error);
      toast.error('Erro ao carregar dados da Hero Section');
    } finally {
      setLoading(false);
    }
  };

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
      
      setSlides(slides.map(slide => 
        slide.id === slideId 
          ? { ...slide, active: !currentActive }
          : slide
      ));
      
      toast.success(`Slide ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      logger.error('Error updating slide', error as Error);
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
      
      setSlides(slides.filter(slide => slide.id !== slideId));
      toast.success('Slide excluído com sucesso!');
    } catch (error) {
      logger.error('Error deleting slide', error as Error);
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

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="slides">Slides</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Configurações do Hero em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="slides" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gerenciar Slides</h2>
            <Button onClick={() => setShowSlideForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Slide
            </Button>
          </div>
          <div className="grid gap-4">
            {slides.map((slide) => (
              <Card key={slide.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{slide.title}</h3>
                      <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { 
                        setEditingSlide(slide); 
                        setShowSlideForm(true); 
                      }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteSlide(slide.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <HeroSlideForm 
        isOpen={showSlideForm} 
        onClose={() => { 
          setShowSlideForm(false); 
          setEditingSlide(null); 
        }} 
        slide={editingSlide} 
        onSave={() => { 
          loadHeroData(); 
          setShowSlideForm(false); 
          setEditingSlide(null); 
        }} 
      />
    </div>
  );
};

const FAQManagement = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      logger.error('Error loading FAQs', error as Error);
      toast.error('Erro ao carregar FAQs');
    } finally {
      setLoading(false);
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
      logger.error('Error deleting FAQ', error as Error);
      toast.error('Erro ao excluir FAQ');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingFaq(null);
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

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">📋 Lista de FAQs</TabsTrigger>
          <TabsTrigger value="ai-generator">✨ IA Gerador</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
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
        </TabsContent>
        
        <TabsContent value="ai-generator" className="mt-6">
          <AIFAQGenerator />
        </TabsContent>
      </Tabs>

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
      logger.info('Starting admin authentication check');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          logger.info('No session found, redirecting to auth');
          navigate('/auth');
          return;
        }

        const { data: role } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (!role || (role.role !== 'admin' && role.role !== 'editor')) {
          toast.error("Bem-vindo ao sistema! Você tem acesso como visualizador.");
        }

        setIsLoading(false);
      } catch (error) {
        logger.error('Error checking auth', error as Error);
        navigate('/auth');
      }
    };

    checkAuth();

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
