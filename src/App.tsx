import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TestimonialsProvider } from "./contexts/TestimonialsContext";
import Index from "./pages/Index";
import Contact from "./pages/Contact";
import Telemedicina from "./pages/Telemedicina";
import Blog from "./pages/Blog";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Header from "./components/Header";
import Footer from "./components/Footer";

const queryClient = new QueryClient();

const App = () => {
  console.log('App loading...');
  return (
  <QueryClientProvider client={queryClient}>
    <TestimonialsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/contato" element={<Contact />} />
                <Route path="/telemedicina" element={<Telemedicina />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/planos-telemedicina" element={<Navigate to="/telemedicina" replace />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
