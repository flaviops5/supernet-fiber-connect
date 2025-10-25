/**
 * FAQ Accordion Component
 * Sprint 8: Componente reutilizável para FAQ
 * Elimina duplicação entre FAQ.tsx e Telemedicina.tsx
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { withErrorHandling } from "@/lib/error-handler";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  active: boolean;
  icon?: string;
  video_url?: string;
  created_at: string;
  updated_at: string;
}

interface FAQAccordionProps {
  category?: string;
  defaultOpen?: string;
  className?: string;
  showTitle?: boolean;
  title?: string;
}

export function FAQAccordion({
  category,
  defaultOpen,
  className = "",
  showTitle = true,
  title = "Perguntas Frequentes"
}: FAQAccordionProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQs();
  }, [category]);

  async function loadFAQs() {
    const data = await withErrorHandling(
      async () => {
        let query = supabase
          .from('faqs')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });

        const { data, error } = await query;
        if (error) throw error;
        return data as FAQ[];
      },
      {
        context: 'FAQAccordion.loadFAQs',
        title: 'Erro ao carregar perguntas frequentes',
        showToast: false // Silencioso, só loga no console
      }
    );

    if (data) {
      setFaqs(data);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (faqs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma pergunta frequente encontrada.
      </div>
    );
  }

  return (
    <div className={className}>
      {showTitle && (
        <h2 className="text-2xl font-bold text-foreground mb-6">
          {title}
        </h2>
      )}
      
      <Accordion
        type="single"
        collapsible
        defaultValue={defaultOpen}
        className="space-y-4"
      >
        {faqs.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className="border border-border rounded-lg px-6 bg-card"
          >
            <AccordionTrigger className="text-left text-foreground hover:text-primary">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
