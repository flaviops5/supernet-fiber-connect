import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const heroSettingsSchema = z.object({
  mainTitle: z.string().trim().min(1, "Título principal é obrigatório").max(200, "Título muito longo"),
  subtitle: z.string().trim().min(1, "Subtítulo é obrigatório").max(500, "Subtítulo muito longo"),
  badgeText: z.string().trim().min(1, "Texto do badge é obrigatório").max(100, "Texto do badge muito longo"),
  ctaText: z.string().trim().min(1, "Texto do botão é obrigatório").max(50, "Texto do botão muito longo"),
  whatsappMessage: z.string().trim().min(1, "Mensagem do WhatsApp é obrigatória").max(300, "Mensagem muito longa")
});

const heroSlideSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(100, "Título muito longo"),
  description: z.string().trim().min(1, "Descrição é obrigatória").max(200, "Descrição muito longa"),
  imageUrl: z.string().trim().min(1, "URL da imagem é obrigatória").url("URL inválida"),
  displayOrder: z.number().min(0, "Ordem deve ser 0 ou maior")
});

interface HeroSettingsFormProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  onSave: () => void;
}

export const HeroSettingsForm = ({ isOpen, onClose, settings, onSave }: HeroSettingsFormProps) => {
  const [formData, setFormData] = useState({
    mainTitle: settings?.main_title || "",
    subtitle: settings?.subtitle || "",
    badgeText: settings?.badge_text || "",
    ctaText: settings?.cta_text || "",
    whatsappMessage: settings?.whatsapp_message || ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = heroSettingsSchema.parse(formData);

      const { error } = await supabase
        .from('hero_settings')
        .update({
          main_title: validatedData.mainTitle,
          subtitle: validatedData.subtitle,
          badge_text: validatedData.badgeText,
          cta_text: validatedData.ctaText,
          whatsapp_message: validatedData.whatsappMessage
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Configurações atualizadas com sucesso!');
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
      } else {
        console.error('Error updating hero settings:', error);
        toast.error('Erro ao atualizar configurações');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Hero Section</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="mainTitle">Título Principal</Label>
            <Input
              id="mainTitle"
              value={formData.mainTitle}
              onChange={(e) => setFormData({...formData, mainTitle: e.target.value})}
              placeholder="Internet ultra-rápida..."
            />
            {errors.mainTitle && <p className="text-sm text-destructive mt-1">{errors.mainTitle}</p>}
          </div>

          <div>
            <Label htmlFor="subtitle">Subtítulo</Label>
            <Textarea
              id="subtitle"
              value={formData.subtitle}
              onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
              placeholder="Experimente a velocidade e estabilidade..."
              rows={3}
            />
            {errors.subtitle && <p className="text-sm text-destructive mt-1">{errors.subtitle}</p>}
          </div>

          <div>
            <Label htmlFor="badgeText">Texto do Badge</Label>
            <Input
              id="badgeText"
              value={formData.badgeText}
              onChange={(e) => setFormData({...formData, badgeText: e.target.value})}
              placeholder="100% Fibra Óptica"
            />
            {errors.badgeText && <p className="text-sm text-destructive mt-1">{errors.badgeText}</p>}
          </div>

          <div>
            <Label htmlFor="ctaText">Texto do Botão</Label>
            <Input
              id="ctaText"
              value={formData.ctaText}
              onChange={(e) => setFormData({...formData, ctaText: e.target.value})}
              placeholder="Contratar Agora no WhatsApp"
            />
            {errors.ctaText && <p className="text-sm text-destructive mt-1">{errors.ctaText}</p>}
          </div>

          <div>
            <Label htmlFor="whatsappMessage">Mensagem do WhatsApp</Label>
            <Textarea
              id="whatsappMessage"
              value={formData.whatsappMessage}
              onChange={(e) => setFormData({...formData, whatsappMessage: e.target.value})}
              placeholder="Olá! Quero conhecer os planos..."
              rows={2}
            />
            {errors.whatsappMessage && <p className="text-sm text-destructive mt-1">{errors.whatsappMessage}</p>}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface HeroSlideFormProps {
  isOpen: boolean;
  onClose: () => void;
  slide?: any;
  onSave: () => void;
}

export const HeroSlideForm = ({ isOpen, onClose, slide, onSave }: HeroSlideFormProps) => {
  const [formData, setFormData] = useState({
    title: slide?.title || "",
    description: slide?.description || "",
    imageUrl: slide?.image_url || "",
    displayOrder: slide?.display_order || 0,
    active: slide?.active ?? true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = heroSlideSchema.parse({
        title: formData.title,
        description: formData.description,
        imageUrl: formData.imageUrl,
        displayOrder: Number(formData.displayOrder)
      });

      const slideData = {
        title: validatedData.title,
        description: validatedData.description,
        image_url: validatedData.imageUrl,
        display_order: validatedData.displayOrder,
        active: formData.active
      };

      let error;
      if (slide?.id) {
        ({ error } = await supabase
          .from('hero_slides')
          .update(slideData)
          .eq('id', slide.id));
      } else {
        ({ error } = await supabase
          .from('hero_slides')
          .insert([slideData]));
      }

      if (error) throw error;

      toast.success(slide?.id ? 'Slide atualizado com sucesso!' : 'Slide criado com sucesso!');
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
      } else {
        console.error('Error saving slide:', error);
        toast.error('Erro ao salvar slide');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {slide?.id ? 'Editar Slide' : 'Criar Novo Slide'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título do Slide</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Internet para toda a família"
            />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Conexão estável para todos os dispositivos..."
              rows={2}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
          </div>

          <div>
            <Label htmlFor="imageUrl">URL da Imagem</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
              placeholder="/src/assets/hero-family-internet.jpg"
            />
            {errors.imageUrl && <p className="text-sm text-destructive mt-1">{errors.imageUrl}</p>}
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

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {slide?.id ? 'Atualizar' : 'Criar'} Slide
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};