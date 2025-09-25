import { Toaster } from "@/components/ui/toaster";

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TestimonialsProvider } from "./contexts/TestimonialsContext";
import Index from "./pages/Index";
import Contact from "./pages/Contact";
import Telemedicina from "./pages/Telemedicina";
import Blog from "./pages/Blog";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Header from "./components/Header";
import Footer from "./components/Footer";

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
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/contato" element={<Contact />} />
                <Route path="/telemedicina" element={<Telemedicina />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/sobre" element={<Navigate to="/" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin/*" element={<AdminWrapper />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </TestimonialsProvider>
  </QueryClientProvider>
  );
};

export default App;
