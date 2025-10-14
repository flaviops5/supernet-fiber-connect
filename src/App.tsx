import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import Roteamento from "./pages/Roteamento";
import SimulacaoCompleta from "./pages/SimulacaoCompleta";
import TesteFonteQueimada from "./pages/TesteFonteQueimada";
import TestIXCSubjects from "./pages/TestIXCSubjects";
import SystemMetrics from "./pages/SystemMetrics";
import HPFuncoes from "./pages/HPFuncoes";
import Apresentacao from "./pages/Apresentacao";
import AdminAgents from "./pages/AdminAgents";
import AdminEscalation from "./pages/AdminEscalation";
import OmnichannelCodes from "./pages/OmnichannelCodes";
import MonitoringLogs from "./pages/MonitoringLogs";
import AtlasInsights from "./pages/AtlasInsights";
import NotFound from "./pages/NotFound";
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
      <TooltipProvider>
        <Toaster />
        
        <BrowserRouter>
          <Routes>
            {/* Admin routes without header/footer */}
            <Route path="/admin/*" element={<AdminWrapper />} />
            <Route path="/admin/agentes" element={<AdminAgents />} />
            <Route path="/admin/escalonamento" element={<AdminEscalation />} />
            <Route path="/admin/omnichannel-codes" element={<Navigate to="/hp_funcoes" replace />} />
            <Route path="/monitoring/logs" element={<MonitoringLogs />} />
            <Route path="/admin/atlas-insights" element={<AtlasInsights />} />
          <Route path="/atendimento" element={<Atendimento />} />
          <Route path="/perfil-agente" element={<PerfilAgente />} />
          <Route path="/metricas-departamentos" element={<MetricasDepartamentos />} />
            <Route path="/admin/monitoramento" element={<Monitoramento />} />
            <Route path="/admin/auto-reboot" element={<AutoRebootMonitoring />} />
            
            {/* Public routes with header/footer */}
            <Route path="/*" element={
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/contato" element={<Contact />} />
                    <Route path="/telemedicina" element={<Telemedicina />} />
                    <Route path="/automacao-residencial" element={<Automacao />} />
                    <Route path="/blog" element={<Blog />} />
            <Route path="/roteamento" element={<Roteamento />} />
            <Route path="/simulacao_completa" element={<SimulacaoCompleta />} />
            <Route path="/teste_fonte_queimada" element={<TesteFonteQueimada />} />
            <Route path="/test-ixc-subjects" element={<TestIXCSubjects />} />
            <Route path="/system-metrics" element={<SystemMetrics />} />
            <Route path="/hp_funcoes" element={<HPFuncoes />} />
                    <Route path="/technical-docs" element={<Navigate to="/admin/knowledge" replace />} />
                    <Route path="/apresentacao" element={<Apresentacao />} />
          <Route path="/autoreboot" element={<Navigate to="/admin/auto-reboot" replace />} />
          <Route path="/manutencao" element={<NetworkMaintenance />} />
                    <Route path="/sobre" element={<Navigate to="/" replace />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TestimonialsProvider>
  </QueryClientProvider>
  );
};

export default App;
