import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const faqSchema = z.object({
  question: z.string().trim().min(1, "Pergunta é obrigatória").max(500, "Pergunta muito longa"),
  answer: z.string().trim().min(1, "Resposta é obrigatória").max(2000, "Resposta muito longa"),
  icon: z.string().trim().min(1, "Ícone é obrigatório"),
  displayOrder: z.number().min(0, "Ordem deve ser 0 ou maior")
});

const iconOptions = [
  'Network', 'Wrench', 'Router', 'Signal', 'Zap', 'Headphones', 
  'ShoppingCart', 'MapPin', 'CreditCard', 'Shield', 'Globe',
  'Download', 'Settings', 'Camera', 'Tv', 'DollarSign', 'Clock', 'Wifi'
];

interface FAQ {
  id?: string;
  question: string;
  answer: string;
  icon: string;
  video_url?: string | null;
  display_order: number;
  active: boolean;
}

interface FAQFormProps {
  isOpen: boolean;
  onClose: () => void;
  faq?: FAQ | null;
  onSave: () => void;
}

export const FAQForm = ({ isOpen, onClose, faq, onSave }: FAQFormProps) => {
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    icon: "Network",
    videoUrl: "",
    displayOrder: 0,
    active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Atualizar formData quando faq mudar (edição) ou quando abrir modal novo
  useEffect(() => {
    if (isOpen) {
      if (faq) {
        // Modo de edição - carregar dados da FAQ
        setFormData({
          question: faq.question || "",
          answer: faq.answer || "",
          icon: faq.icon || "Network",
          videoUrl: faq.video_url || "",
          displayOrder: faq.display_order || 0,
          active: faq.active ?? true
        });
      } else {
        // Modo de criação - resetar para valores padrão
        setFormData({
          question: "",
          answer: "",
          icon: "Network",
          videoUrl: "",
          displayOrder: 0,
          active: true
        });
      }
      setErrors({});
      setIsSaving(false);
    }
  }, [isOpen, faq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving) return; // Prevenir múltiplos cliques
    
    setIsSaving(true);
    
    try {
      const validatedData = faqSchema.parse({
        question: formData.question,
        answer: formData.answer,
        icon: formData.icon,
        displayOrder: Number(formData.displayOrder)
      });

      const faqData = {
        question: validatedData.question,
        answer: validatedData.answer,
        icon: validatedData.icon,
        video_url: formData.videoUrl || null,
        display_order: validatedData.displayOrder,
        active: formData.active
      };

      let error;
      if (faq?.id) {
        ({ error } = await supabase
          .from('faqs')
          .update(faqData)
          .eq('id', faq.id));
      } else {
        ({ error } = await supabase
          .from('faqs')
          .insert([faqData]));
      }

      if (error) throw error;

      toast.success(faq?.id ? 'FAQ atualizada com sucesso!' : 'FAQ criada com sucesso!');
      onSave();
      onClose();
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error('Por favor, corrija os erros no formulário');
      } else {
        console.error('Error saving FAQ:', error);
        toast.error('Erro ao salvar FAQ');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {faq?.id ? 'Editar FAQ' : 'Criar Nova FAQ'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icon">Ícone</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({...formData, icon: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((iconName) => (
                    <SelectItem key={iconName} value={iconName}>
                      {iconName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.icon && <p className="text-sm text-destructive mt-1">{errors.icon}</p>}
            </div>

            <div>
              <Label htmlFor="displayOrder">Ordem de Exibição</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                placeholder="1"
              />
              {errors.displayOrder && <p className="text-sm text-destructive mt-1">{errors.displayOrder}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="question">Pergunta</Label>
            <Textarea
              id="question"
              value={formData.question}
              onChange={(e) => setFormData({...formData, question: e.target.value})}
              placeholder="Digite a pergunta frequente..."
              rows={2}
            />
            {errors.question && <p className="text-sm text-destructive mt-1">{errors.question}</p>}
          </div>

          <div>
            <Label htmlFor="answer">Resposta</Label>
            <Textarea
              id="answer"
              value={formData.answer}
              onChange={(e) => setFormData({...formData, answer: e.target.value})}
              placeholder="Digite a resposta detalhada..."
              rows={6}
            />
            {errors.answer && <p className="text-sm text-destructive mt-1">{errors.answer}</p>}
          </div>

          <div>
            <Label htmlFor="videoUrl">URL do Vídeo (opcional)</Label>
            <Input
              id="videoUrl"
              value={formData.videoUrl}
              onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
              placeholder="https://www.youtube.com/embed/..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({...formData, active: checked})}
            />
            <Label htmlFor="active">Ativo</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : faq?.id ? 'Atualizar' : 'Criar'} FAQ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};