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
import Monitoramento from "./pages/Monitoramento";
import AutoRebootMonitoring from "./pages/AutoRebootMonitoring";
import AutoRebootDocs from "./pages/AutoRebootDocs";
import NetworkMaintenance from "./pages/NetworkMaintenance";
import Roteamento from "./pages/Roteamento";
import SimulacaoCompleta from "./pages/SimulacaoCompleta";
import TesteFonteQueimada from "./pages/TesteFonteQueimada";
import GPT5 from "./pages/GPT5";
import SystemMetrics from "./pages/SystemMetrics";
import CodigoFonte from "./pages/CodigoFonte";
import NotFound from "./pages/NotFound";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { AuthGuard } from "./components/AuthGuard";

const queryClient = new QueryClient();

// Admin wrapper component for debugging
const AdminWrapper = () => {
  console.log('Admin route accessed');
  return <Admin />;
};

const App = () => {
  console.log('App loading...');
  return (
  <QueryClientProvider client={queryClient}>
    <TestimonialsProvider>
      <TooltipProvider>
        <Toaster />
        
        <BrowserRouter>
          <Routes>
            {/* Admin routes without header/footer */}
            <Route path="/admin/*" element={<AdminWrapper />} />
            <Route path="/atendimento" element={<Atendimento />} />
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
                    <Route path="/gpt_5" element={<GPT5 />} />
                    <Route path="/system-metrics" element={<SystemMetrics />} />
                    <Route path="/codigo_f" element={<CodigoFonte />} />
          <Route path="/autoreboot" element={<AutoRebootDocs />} />
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
