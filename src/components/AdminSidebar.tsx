import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MapPin,
  FileText,
  Megaphone,
  Star,
  User,
  Settings,
  LogOut,
  Bot,
  Monitor,
  HelpCircle,
  FolderOpen,
  Brain,
  BookOpen,
  Database,
  MessageSquare,
  Bell,
  DollarSign,
  Activity,
  MessageCircle,
  Wrench,
  Sparkles,
  Code2,
} from "lucide-react";
import { toast } from "sonner";

interface CompanySettings {
  company_name: string;
  logo_url?: string;
}

interface UserProfile {
  name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Central de Atendimento",
    url: "/atendimento",
    icon: MessageSquare,
    external: true,
  },
  {
    title: "Usuários & Agentes",
    url: "/admin/users",
    icon: User,
  },
  {
    title: "Configurar Departamentos",
    url: "/admin/agentes",
    icon: Users,
  },
];

const marketingItems = [
  {
    title: "Campanhas",
    url: "/admin/campaigns",
    icon: Megaphone,
  },
  {
    title: "Dashboard NPS",
    url: "/admin/nps-dashboard",
    icon: Star,
  },
];

const documentationItems = [
  {
    title: "Central de Documentação",
    url: "/admin/documentacao",
    icon: Database,
  },
  {
    title: "Prompts",
    url: "/admin/prompts",
    icon: Sparkles,
  },
  {
    title: "Documentos",
    url: "/admin/documents",
    icon: FolderOpen,
  },
  {
    title: "IA Corporativa",
    url: "/admin/corporate-ai",
    icon: Brain,
  },
];

const agentsItems = [
  {
    title: "Agentes IA",
    url: "/admin/agents",
    icon: Bot,
  },
  {
    title: "Config. Atendimento",
    url: "/admin/atendimento-config",
    icon: MessageSquare,
  },
  {
    title: "Escalonamento",
    url: "/admin/escalonamento",
    icon: Activity,
  },
  {
    title: "WhatsApp",
    url: "/admin/whatsapp",
    icon: MessageCircle,
  },
  {
    title: "Integração IXC",
    url: "/admin/ixc-integration",
    icon: Database,
  },
  {
    title: "Monitoramento Ativo",
    url: "/admin/monitoramento",
    icon: Monitor,
  },
  {
    title: "Atlas Insights",
    url: "/admin/atlas-insights",
    icon: Brain,
  },
  {
    title: "Logs do Sistema",
    url: "/monitoring/logs",
    icon: FileText,
  },
  {
    title: "Manutenção Inteligente",
    url: "/manutencao",
    icon: Wrench,
  },
  {
    title: "Métricas do Sistema",
    url: "/system-metrics",
    icon: Activity,
  },
];

const financialItems = [
  {
    title: "Dashboard Financeiro",
    url: "/admin/financial",
    icon: DollarSign,
  },
  {
    title: "Notificações Pagamento",
    url: "/admin/payment-notifications",
    icon: Bell,
  },
  {
    title: "Templates de Notificação",
    url: "/admin/notification-templates",
    icon: FileText,
  },
];

const siteManagementItems = [
  {
    title: "Planos",
    url: "/admin/plans",
    icon: CreditCard,
  },
  {
    title: "Cobertura",
    url: "/admin/coverage",
    icon: MapPin,
  },
  {
    title: "Hero Section",
    url: "/admin/hero",
    icon: Monitor,
  },
  {
    title: "FAQ",
    url: "/admin/faq",
    icon: HelpCircle,
  },
  {
    title: "Blog",
    url: "/admin/blog",
    icon: FileText,
  },
  {
    title: "Avaliações",
    url: "/admin/reviews",
    icon: Star,
  },
];

const profileItems = [
  {
    title: "Meu Perfil",
    url: "/perfil-agente",
    icon: User,
    external: true,
  },
  {
    title: "Métricas dos Departamentos",
    url: "/metricas-departamentos",
    icon: Activity,
    external: true,
  },
  {
    title: "Configurações",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";

  useEffect(() => {
    const loadData = async () => {
      // Load user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email, avatar_url')
          .eq('user_id', user.id)
          .single();

        const { data: role } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserProfile({
            ...profile,
            role: role?.role || 'viewer'
          });
        }
      }

      // Load company settings
      const { data: settings } = await supabase
        .from('company_settings')
        .select('company_name, logo_url')
        .limit(1)
        .single();

      if (settings) {
        setCompanySettings(settings);
      }
    };

    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  const isActive = (path: string, exact = false) => {
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const getNavClasses = (path: string, exact = false) => {
    return isActive(path, exact)
      ? "bg-primary text-primary-foreground font-medium"
      : "hover:bg-accent hover:text-accent-foreground";
  };

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          {companySettings?.logo_url ? (
            <img 
              src={companySettings.logo_url} 
              alt={companySettings.company_name}
              className={isCollapsed ? "h-8 w-8 object-contain" : "h-10 w-auto max-w-[180px] object-contain"}
            />
          ) : (
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Monitor className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          {!isCollapsed && !companySettings?.logo_url && (
            <div>
              <h2 className="font-semibold text-lg">Admin Panel</h2>
              <p className="text-sm text-muted-foreground">{companySettings?.company_name || 'Supernet'}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.external ? (
                      <a
                        href={item.url}
                        className={getNavClasses(item.url, item.exact)}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </a>
                    ) : (
                      <NavLink
                        to={item.url}
                        className={getNavClasses(item.url, item.exact)}
                        end={item.exact}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Marketing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketingItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavClasses(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Documentação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {documentationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavClasses(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Agentes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agentsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavClasses(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Financeiro</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financialItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavClasses(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gerenciar Site</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {siteManagementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavClasses(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {profileItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.external ? (
                      <a
                        href={item.url}
                        className={getNavClasses(item.url)}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </a>
                    ) : (
                      <NavLink
                        to={item.url}
                        className={getNavClasses(item.url)}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {userProfile && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile.avatar_url} />
                <AvatarFallback>
                  {userProfile.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userProfile.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userProfile.role}
                  </p>
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Sair</span>}
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}