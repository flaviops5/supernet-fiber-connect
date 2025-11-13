import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TestimonialsProvider } from "./contexts/TestimonialsContext";
import Index from "./pages/Index";
import Contact from "./pages/Contact";
import Telemedicina from "./pages/Telemedicina";
import Automacao from "./pages/Automacao";
import Blog from "./pages/Blog";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Atendimento from "./pages/Atendimento";
import PerfilAgente from "./pages/PerfilAgente";
import MetricasDepartamentos from "./pages/MetricasDepartamentos";
import Monitoramento from "./pages/Monitoramento";
import AutoRebootMonitoring from "./pages/AutoRebootMonitoring";
import AutoRebootDocs from "./pages/AutoRebootDocs";
import NetworkMaintenance from "./pages/NetworkMaintenance";
import AdminDocumentacao from "./pages/AdminDocumentacao";
import SystemMetrics from "./pages/SystemMetrics";
import HPFuncoes from "./pages/HPFuncoes";
import Apresentacao from "./pages/Apresentacao";
import AdminAgents from "./pages/AdminAgents";
import AdminEscalation from "./pages/AdminEscalation";
import AdminTestes from "./pages/AdminTestes";
import MonitoringLogs from "./pages/MonitoringLogs";
import LogAnalyticsDashboard from "./pages/LogAnalyticsDashboard";
import AtlasInsights from "./pages/AtlasInsights";
import ProductionReadiness from "./pages/ProductionReadiness";
import NotFound from "./pages/NotFound";
import AdminPrompts from "./pages/AdminPrompts";
import AdminFluxoAgentes from "./pages/AdminFluxoAgentes";
import FluxoAgente from "./pages/FluxoAgente";
import CorporateAI from "./components/CorporateAI";
import KPISupportDashboard from "./pages/admin/KPISupportDashboard";
import GoLive from "./pages/GoLive";
import AdminKanban from "./pages/AdminKanban";
import PublicCalendar from "./pages/PublicCalendar";
import AdminStressTest from "./pages/AdminStressTest";
import AdminRateLimits from "./pages/AdminRateLimits";
import AdminWhitelist from "./pages/AdminWhitelist";
import { AuthGuard } from "./components/AuthGuard";
import Header from "./components/Header";
import Footer from "./components/Footer";

const queryClient = new QueryClient();

// Admin wrapper component
const AdminWrapper = () => {
  return <Admin />;
};

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <TestimonialsProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
        
        <BrowserRouter>
          <Routes>
            {/* Admin routes without header/footer - Alphabetically ordered */}
            <Route path="/admin/*" element={<AdminWrapper />} />
            <Route path="/admin/agentes" element={<AdminAgents />} />
            <Route path="/admin/atlas-insights" element={<AtlasInsights />} />
            <Route path="/admin/auto-reboot" element={<AutoRebootMonitoring />} />
            <Route path="/admin/documentacao" element={<AdminDocumentacao />} />
            <Route path="/admin/escalonamento" element={<AdminEscalation />} />
            <Route path="/admin/fluxo-agentes" element={<AdminFluxoAgentes />} />
            <Route 
              path="/admin/kpi-dashboard" 
              element={
                <AuthGuard requiredRoles={["admin", "gestor"]}>
                  <KPISupportDashboard />
                </AuthGuard>
              } 
            />
            <Route path="/admin/monitoramento" element={<Monitoramento />} />
            <Route path="/admin/production-readiness" element={<ProductionReadiness />} />
            <Route path="/admin/prompts" element={<AdminPrompts />} />
          <Route path="/admin/stress-test" element={<AdminStressTest />} />
          <Route path="/admin/rate-limits" element={<AdminRateLimits />} />
          <Route path="/admin/whitelist" element={<AdminWhitelist />} />
          <Route path="/admin/testes" element={<AdminTestes />} />
            
            {/* AI RAG - Dedicated route */}
            <Route 
              path="/admin/ia-corporativa" 
              element={
                <div className="min-h-screen bg-background p-6">
                  <CorporateAI />
                </div>
              } 
            />
            
            {/* Redirects for consolidated documentation */}
            <Route path="/admin/corporate-ai" element={<Navigate to="/admin/ia-corporativa" replace />} />
            <Route path="/admin/fluxo-luan" element={<Navigate to="/admin/fluxo-agentes" replace />} />
            <Route path="/admin/knowledge" element={<Navigate to="/admin/documentacao" replace />} />
            <Route path="/admin/omnichannel-codes" element={<Navigate to="/admin/documentacao" replace />} />
            
            {/* Other admin-related routes */}
            <Route path="/atendimento" element={<Atendimento />} />
            <Route path="/fluxo-agente" element={<FluxoAgente />} />
            <Route path="/kanban" element={<AdminKanban />} />
            <Route path="/metricas-departamentos" element={<MetricasDepartamentos />} />
            <Route path="/monitoring/logs" element={<MonitoringLogs />} />
            <Route path="/monitoring/analytics" element={<LogAnalyticsDashboard />} />
            <Route path="/perfil-agente" element={<PerfilAgente />} />
            
            {/* Public calendar route (no header/footer) */}
            <Route path="/instalacoes/:token" element={<PublicCalendar />} />
            
            {/* Public routes with header/footer - Alphabetically ordered */}
            <Route path="/*" element={
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/apresentacao" element={<Apresentacao />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/automacao" element={<Automacao />} />
                    <Route path="/automacao-residencial" element={<Automacao />} />
                    <Route path="/autoreboot" element={<Navigate to="/admin/auto-reboot" replace />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/contato" element={<Contact />} />
                    <Route path="/fluxo-luan" element={<Navigate to="/fluxo-agente?agent=support-tech-agent" replace />} />
                    <Route path="/go-live" element={<GoLive />} />
                    <Route path="/hp_funcoes" element={<HPFuncoes />} />
                    <Route path="/manutencao" element={<NetworkMaintenance />} />
                    <Route path="/sobre" element={<Navigate to="/" replace />} />
                    <Route path="/system-metrics" element={<SystemMetrics />} />
                    <Route path="/technical-docs" element={<Navigate to="/admin/documentacao" replace />} />
                    <Route path="/telemedicina" element={<Telemedicina />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            } />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </TestimonialsProvider>
  </QueryClientProvider>
  );
};

export default App;
