import { useState, useEffect } from "react";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import BlogManagementComponent from "@/components/BlogManagement";
import DocumentManagement from "@/components/DocumentManagement";
import KnowledgeManagement from "@/components/KnowledgeManagement";
import AdminPrompts from "@/pages/AdminPrompts";
import CorporateAI from "@/components/CorporateAI";
import AgentManagement from "@/components/AgentManagement";
import CoverageManagement from '@/components/CoverageManagement';
import IXCIntegration from '@/components/IXCIntegration';
import { PaymentNotifications } from '@/components/PaymentNotifications';
import { NotificationTemplates } from '@/components/NotificationTemplates';
import { CampaignManagement } from '@/components/CampaignManagement';
import { NPSDashboard } from '@/components/NPSDashboard';
import { AddUserForm } from '@/components/AddUserForm';
import WhatsAppSetup from '@/components/WhatsAppSetup';
import { FinancialDashboard } from '@/components/FinancialDashboard';
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { 
  Dashboard,
  ReviewsManagement,
  UserManagement,
  PlanManagement,
  FAQManagement,
  HeroManagement
} from "@/components/admin";
import AdminKanban from "@/pages/AdminKanban";

const AdminCoverageManagement = () => <CoverageManagement />;

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
                <Route path="/kanban" element={<AdminKanban />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/add-user" element={<AddUserForm />} />
                <Route path="/plans" element={<PlanManagement />} />
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
              </Routes>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
};

export default Admin;
