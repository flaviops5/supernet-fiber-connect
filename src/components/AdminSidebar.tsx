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
  Star,
  User,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { toast } from "sonner";

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
    title: "Usuários",
    url: "/admin/users",
    icon: Users,
  },
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
    url: "/admin/profile",
    icon: User,
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
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";

  useEffect(() => {
    const loadUserProfile = async () => {
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
    };

    loadUserProfile();
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
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <Menu className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-lg">Admin Panel</h2>
              <p className="text-sm text-muted-foreground">Supernet</p>
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
                    <NavLink
                      to={item.url}
                      className={getNavClasses(item.url, item.exact)}
                      end={item.exact}
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