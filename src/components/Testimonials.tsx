import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote, Users, Wifi, Award } from 'lucide-react';

const Testimonials = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const testimonials = [
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
    },
    {
      name: "Sarah Wero",
      location: "Sobradinho, DF",
      rating: 5,
      text: "Melhor serviço de conexão fibra na região de Sobradinho! Outras empresas nunca se interessaram em instalar fibra onde moro, até chegar a Supernet, com um serviço excelente e muita velocidade. São muito solícitos e sempre respondem e resolvem rapidamente qualquer problema. Sempre indico aos amigos e vizinhos!",
      service: "Cliente Verificado"
    },
    {
      name: "Eduardo Rodrigues",
      location: "Brasília, DF",
      rating: 5,
      text: "Excelente atendimento, tanto pra instalação, quanto para o suporte técnico ao longo do contrato, já tenho há bastante tempo, a Carol do financeiro é sempre prestativa, bem como o Flávio que dá todo o suporte, independente do horário. Só tenho agradecimentos!",
      service: "Cliente Verificado"
    },
    {
      name: "Jefferson Maia",
      location: "Brasília, DF",
      rating: 5,
      text: "Sou cliente da Supernet desde 2020. Há semanas tinha um problema de conexão que não conseguia detectar/resolver. O gerente do suporte da empresa foi bastante dedicado e não descansou enquanto não conseguiu entender e encontrar a solução para o mesmo. Só tenho elogios à empresa.",
      service: "Cliente desde 2020"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <section id="depoimentos" className="py-12 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-6">
            O que nossos{' '}
            <span className="gradient-text">clientes dizem</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Mais de 2.500 famílias já escolheram a SUPERNET FIBRA. 
            Veja os depoimentos de quem vive a experiência todos os dias.
          </p>
        </div>

        {/* Testimonials Carousel */}
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl shadow-elegant p-8 md:p-12 relative overflow-hidden">
            {/* Quote decoration */}
            <div className="absolute top-6 right-6 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center z-10">
              <Quote className="w-6 h-6 text-primary" />
            </div>

            <div className="relative h-80 md:h-64 mx-16">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-500 ${
                    index === currentSlide 
                      ? 'opacity-100 translate-x-0' 
                      : index < currentSlide 
                        ? 'opacity-0 -translate-x-full' 
                        : 'opacity-0 translate-x-full'
                  }`}
                >
                  <div className="h-full flex flex-col justify-between">
                    {/* Testimonial Content */}
                    <div className="space-y-6">
                      {/* Stars */}
                      <div className="flex space-x-1 relative z-20">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-orange text-orange" />
                        ))}
                      </div>

                      {/* Testimonial Text */}
                      <blockquote className="text-lg md:text-xl text-foreground leading-relaxed relative z-20">
                        "{testimonial.text}"
                      </blockquote>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center justify-between pt-6 border-t border-border">
                      <div>
                        <div className="font-semibold text-foreground text-lg">
                          {testimonial.name}
                        </div>
                        <div className="text-muted-foreground">
                          {testimonial.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-primary font-medium">
                          {testimonial.service}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cliente Verificado
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary/10 hover:bg-primary/20 rounded-full flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary/10 hover:bg-primary/20 rounded-full flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          </div>

          {/* Dots Navigation */}
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-primary scale-125' 
                    : 'bg-border hover:bg-primary/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-primary mb-2">
              2.500+
            </div>
            <div className="text-sm text-muted-foreground">
              Clientes Satisfeitos
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mb-4">
              <Wifi className="w-6 h-6 text-orange" />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-orange mb-2">
              99.4%
            </div>
            <div className="text-sm text-muted-foreground">
              Disponibilidade
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-red-accent/10 rounded-full flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-red-accent" />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-red-accent mb-2">
              4.8/5
            </div>
            <div className="text-sm text-muted-foreground">
              Avaliação Média
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;