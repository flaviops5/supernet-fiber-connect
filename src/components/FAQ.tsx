import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Phone, MessageCircle, Play, Wifi, Wrench, Router, Network, Signal, Zap, Headphones, ShoppingCart, MapPin, CreditCard, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Network, Wrench, Router, Signal, Zap, Headphones, ShoppingCart, 
  MapPin, CreditCard, Shield, Wifi, Phone, MessageCircle, Play
};

const FAQ = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFaqs = async () => {
      try {
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        
        // Map database data to component format
        const formattedFaqs = (data || []).map(faq => ({
          question: faq.question,
          answer: faq.answer,
          videoUrl: faq.video_url,
          icon: iconMap[faq.icon] || Network
        }));
        
        setFaqs(formattedFaqs);
      } catch (error) {
        console.error('Error loading FAQs:', error);
        // Keep empty array on error
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    };

    loadFaqs();
  }, []);
  const handleWhatsApp = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Tenho algumas dúvidas sobre os serviços da SUPERNET FIBRA.', '_blank');
  };
  const handlePhone = () => {
    window.open('tel:+551140041234', '_self');
  };
  return <section id="perguntas-frequentes" className="py-16 bg-gradient-to-br from-light-gray to-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-varela uppercase text-foreground mb-6">
            Perguntas{' '}
            <span className="gradient-text">Frequentes</span>
          </h2>
        </div>

        {/* FAQ Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Column - First Half of FAQs */}
          <div className="space-y-6">
            {faqs.slice(0, Math.ceil(faqs.length / 2)).map((faq, index) => {
            const IconComponent = faq.icon;
            return <div key={index} className="bg-muted rounded-2xl border-l-4 border-primary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 animate-fade-in" style={{
              animationDelay: `${index * 0.1}s`
            }}>
                  <Accordion type="single" collapsible>
                    <AccordionItem value={`item-${index}`} className="border-none">
                      <AccordionTrigger className="px-6 py-6 hover:no-underline group">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <IconComponent className="w-6 h-6 text-primary stroke-2" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base text-foreground group-hover:text-primary transition-colors leading-tight">
                              {faq.question}
                            </h3>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4 ml-16">
                          <div className="bg-white/60 rounded-xl p-4 border border-white/30">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                              {faq.answer}
                            </p>
                          </div>
                          {faq.videoUrl && <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-white/70 text-xs ml-2 font-mono">Vídeo Explicativo</span>
                              </div>
                              <iframe src={faq.videoUrl} title={`Vídeo explicativo: ${faq.question}`} className="w-full h-48 border-0 mt-8" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>;
          })}
          </div>

          {/* Right Column - Second Half of FAQs */}
          <div className="space-y-6">
            {faqs.slice(Math.ceil(faqs.length / 2)).map((faq, index) => {
            const IconComponent = faq.icon;
            const adjustedIndex = index + Math.ceil(faqs.length / 2);
            return <div key={`faq-right-${adjustedIndex}`} className="bg-muted rounded-2xl border-l-4 border-primary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 animate-fade-in" style={{
              animationDelay: `${(index + Math.ceil(faqs.length / 2)) * 0.1}s`
            }}>
                  <Accordion type="single" collapsible>
                    <AccordionItem value={`item-${adjustedIndex}`} className="border-none">
                      <AccordionTrigger className="px-6 py-6 hover:no-underline group">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <IconComponent className="w-6 h-6 text-primary stroke-2" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base text-foreground group-hover:text-primary transition-colors leading-tight">
                              {faq.question}
                            </h3>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4 ml-16">
                          <div className="bg-white/60 rounded-xl p-4 border border-white/30">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                              {faq.answer}
                            </p>
                          </div>
                          {faq.videoUrl && <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
                              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-white/70 text-xs ml-2 font-mono">Vídeo Explicativo</span>
                              </div>
                              <iframe src={faq.videoUrl} title={`Vídeo explicativo: ${faq.question}`} className="w-full h-48 border-0 mt-8" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>;
          })}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center">
          <h3 className="text-3xl font-bold font-varela uppercase text-foreground mb-6 md:text-3xl">
            Ainda tem dúvidas?{' '}
            <span className="gradient-text">Fale conosco.</span>
          </h3>
          <div className="flex justify-center gap-6">
            <button onClick={handleWhatsApp} className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl hover:scale-105">
              <MessageCircle className="w-6 h-6 text-white" />
            </button>
            <button onClick={() => window.open('tel:+556135475886', '_self')} className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl hover:scale-105">
              <Phone className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </section>;
};
export default FAQ;