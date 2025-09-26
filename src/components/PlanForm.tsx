import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Link, Download, Globe, Shield, Gift, MapPin, Camera, Settings, Tv, DollarSign, Clock, Router, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const iconMap = {
  Download, Globe, Shield, Gift, MapPin, Camera, Settings, Tv, 
  DollarSign, Clock, Router, Wifi, Link, Plus
};

const planSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome deve ter menos de 100 caracteres"),
  description: z.string().trim().min(1, "Descrição é obrigatória").max(500, "Descrição deve ter menos de 500 caracteres"),
  speed: z.string().trim().min(1, "Velocidade é obrigatória").max(50, "Velocidade deve ter menos de 50 caracteres"),
  price: z.number().min(0.01, "Preço deve ser maior que zero").max(9999.99, "Preço muito alto"),
  originalPrice: z.number().min(0.01, "Preço original deve ser maior que zero").max(9999.99, "Preço original muito alto"),
  ctaText: z.string().trim().min(1, "Texto do botão é obrigatório").max(50, "Texto do botão deve ter menos de 50 caracteres"),
  displayOrder: z.number().min(0, "Ordem deve ser 0 ou maior")
});

interface PlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: any;
  onSave: () => void;
}

export const PlanForm = ({ isOpen, onClose, plan, onSave }: PlanFormProps) => {
  const [formData, setFormData] = useState({
    name: plan?.name || "",
    description: plan?.description || "",
    speed: plan?.speed || "",
    price: plan?.price || 0,
    originalPrice: plan?.original_price || 0,
    popular: plan?.popular || false,
    active: plan?.active ?? true,
    ctaText: plan?.cta_text || "Contratar Agora",
    displayOrder: plan?.display_order || 0,
    features: plan?.features || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validatedData = planSchema.parse({
        name: formData.name,
        description: formData.description,
        speed: formData.speed,
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice),
        ctaText: formData.ctaText,
        displayOrder: Number(formData.displayOrder)
      });

      const planData = {
        name: validatedData.name,
        description: validatedData.description,
        speed: validatedData.speed,
        price: validatedData.price,
        original_price: validatedData.originalPrice,
        popular: formData.popular,
        active: formData.active,
        cta_text: validatedData.ctaText,
        display_order: validatedData.displayOrder,
        features: formData.features
      };

      let error;
      if (plan?.id) {
        ({ error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', plan.id));
      } else {
        ({ error } = await supabase
          .from('plans')
          .insert([planData]));
      }

      if (error) throw error;

      toast.success(plan?.id ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!');
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
        console.error('Error saving plan:', error);
        toast.error('Erro ao salvar plano');
      }
    }
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, { text: "", icon: "Download", isLink: false, href: "" }]
    });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_: any, i: number) => i !== index)
    });
  };

  const updateFeature = (index: number, field: string, value: any) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFormData({ ...formData, features: newFeatures });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plan?.id ? 'Editar Plano' : 'Criar Novo Plano'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Plano</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Plano Básico"
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="speed">Velocidade</Label>
              <Input
                id="speed"
                value={formData.speed}
                onChange={(e) => setFormData({...formData, speed: e.target.value})}
                placeholder="Ex: 400 Mega"
              />
              {errors.speed && <p className="text-sm text-destructive mt-1">{errors.speed}</p>}
            </div>

            <div>
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                placeholder="99.90"
              />
              {errors.price && <p className="text-sm text-destructive mt-1">{errors.price}</p>}
            </div>

            <div>
              <Label htmlFor="originalPrice">Preço Original (R$)</Label>
              <Input
                id="originalPrice"
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => setFormData({...formData, originalPrice: parseFloat(e.target.value) || 0})}
                placeholder="119.90"
              />
              {errors.originalPrice && <p className="text-sm text-destructive mt-1">{errors.originalPrice}</p>}
            </div>

            <div>
              <Label htmlFor="ctaText">Texto do Botão</Label>
              <Input
                id="ctaText"
                value={formData.ctaText}
                onChange={(e) => setFormData({...formData, ctaText: e.target.value})}
                placeholder="Contratar Agora"
              />
              {errors.ctaText && <p className="text-sm text-destructive mt-1">{errors.ctaText}</p>}
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
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descrição do plano..."
              rows={3}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="popular"
                checked={formData.popular}
                onCheckedChange={(checked) => setFormData({...formData, popular: checked})}
              />
              <Label htmlFor="popular">Plano Popular</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({...formData, active: checked})}
              />
              <Label htmlFor="active">Ativo</Label>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Características do Plano</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.features.map((feature: any, index: number) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <div>
                    <Label>Texto</Label>
                    <Input
                      value={feature.text}
                      onChange={(e) => updateFeature(index, 'text', e.target.value)}
                      placeholder="Texto da característica"
                    />
                  </div>
                  
                  <div>
                    <Label>Ícone</Label>
                    <Select
                      value={feature.icon}
                      onValueChange={(value) => updateFeature(index, 'icon', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(iconMap).map((iconName) => (
                          <SelectItem key={iconName} value={iconName}>
                            {iconName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={feature.isLink}
                      onCheckedChange={(checked) => updateFeature(index, 'isLink', checked)}
                    />
                    <Label>É Link?</Label>
                  </div>

                  {feature.isLink && (
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={feature.href || ""}
                        onChange={(e) => updateFeature(index, 'href', e.target.value)}
                        placeholder="/link"
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFeature(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {plan?.id ? 'Atualizar' : 'Criar'} Plano
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};