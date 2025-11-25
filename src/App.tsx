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
import Blogue from "./pages/Blogue";
import BloguePost from "./pages/BloguePost";
import SystemMetrics from "./pages/SystemMetrics";
import HPFuncoes from "./pages/HPFuncoes";
import Apresentacao from "./pages/Apresentacao";
import NotFound from "./pages/NotFound";
import AdminPrompts from "./pages/AdminPrompts";
import AdminPlans from "./pages/AdminPlans";
import Admin from "./pages/Admin";
import CorporateAI from "./components/CorporateAI";
import AdminIXCStressTest from "./pages/AdminIXCStressTest";
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
            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="/admin/prompts" element={<AdminPrompts />} />
          <Route path="/admin/ixc-stress-test" element={<AdminIXCStressTest />} />
            
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
            
            {/* Public routes with header/footer - Alphabetically ordered */}
            <Route path="/*" element={
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/apresentacao" element={<Apresentacao />} />
                    <Route path="/automacao" element={<Automacao />} />
                    <Route path="/automacao-residencial" element={<Automacao />} />
                    <Route path="/technical-docs" element={<Navigate to="/" replace />} />
                    <Route path="/blogue" element={<Blogue />} />
                    <Route path="/blogue/:slug" element={<BloguePost />} />
                    <Route path="/contato" element={<Contact />} />
                    <Route path="/fluxo-luan" element={<Navigate to="/" replace />} />
                    <Route path="/hp_funcoes" element={<HPFuncoes />} />
                    <Route path="/sobre" element={<Navigate to="/" replace />} />
                    <Route path="/system-metrics" element={<SystemMetrics />} />
                    
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
