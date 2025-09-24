import { createContext, useContext, useState, ReactNode } from 'react';

export interface Testimonial {
  name: string;
  location: string;
  rating: number;
  text: string;
  service: string;
  photo?: string;
}

interface TestimonialsContextType {
  testimonials: Testimonial[];
  addTestimonial: (testimonial: Testimonial) => void;
  removeTestimonial: (index: number) => void;
  stats: {
    totalClients: number;
    availability: number;
    averageRating: number;
  };
  updateStats: (stats: { totalClients: number; availability: number; averageRating: number }) => void;
}

const TestimonialsContext = createContext<TestimonialsContextType | undefined>(undefined);

export const useTestimonials = () => {
  const context = useContext(TestimonialsContext);
  if (!context) {
    throw new Error('useTestimonials must be used within a TestimonialsProvider');
  }
  return context;
};

const defaultTestimonials: Testimonial[] = [
  {
    name: "Lucca Cabrera Trazzi",
    location: "Brasília, DF",
    rating: 5,
    text: "Desfruto de uma excelente conexão à internet, que não só oferece velocidade e qualidade excepcionais, mas também é perfeita para jogar videogame e trabalhar em home office. Além disso, recebo um atendimento de primeira dos profissionais responsáveis. Dou nota 10 para esse serviço!",
    service: "Cliente Verificado"
  },
  {
    name: "Thaís Michele",
    location: "Brasília, DF",
    rating: 5,
    text: "Empresa com qualidade, responde rápido e prestativa no atendimento!",
    service: "Cliente Verificado"
  }
];

export const TestimonialsProvider = ({ children }: { children: ReactNode }) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(() => {
    const saved = localStorage.getItem('selected_testimonials');
    return saved ? JSON.parse(saved) : defaultTestimonials;
  });

  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('testimonials_stats');
    return saved ? JSON.parse(saved) : {
      totalClients: 2500,
      availability: 99.4,
      averageRating: 4.8
    };
  });

  const addTestimonial = (testimonial: Testimonial) => {
    const newTestimonials = [...testimonials, testimonial];
    setTestimonials(newTestimonials);
    localStorage.setItem('selected_testimonials', JSON.stringify(newTestimonials));
  };

  const removeTestimonial = (index: number) => {
    const newTestimonials = testimonials.filter((_, i) => i !== index);
    setTestimonials(newTestimonials);
    localStorage.setItem('selected_testimonials', JSON.stringify(newTestimonials));
  };

  const updateStats = (newStats: { totalClients: number; availability: number; averageRating: number }) => {
    setStats(newStats);
    localStorage.setItem('testimonials_stats', JSON.stringify(newStats));
  };

  return (
    <TestimonialsContext.Provider value={{
      testimonials,
      addTestimonial,
      removeTestimonial,
      stats,
      updateStats
    }}>
      {children}
    </TestimonialsContext.Provider>
  );
};