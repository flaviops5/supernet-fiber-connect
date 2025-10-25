import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Link, Download, Globe, Shield, Gift, MapPin, Camera, Settings, Tv, DollarSign, Clock, Router, Wifi, Upload, X, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface IXCPlan {
  id: string;
  descricao: string;
  valor: string;
  download: string;
  upload: string;
}

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

interface PlanFeature {
  text: string;
  icon: string;
  isLink: boolean;
  href?: string;
  order?: number;
}

interface Plan {
  id?: string;
  name: string;
  description: string;
  speed: string;
  price: number;
  original_price: number;
  popular: boolean;
  active: boolean;
  cta_text: string;
  display_order: number;
  features: PlanFeature[];
  image_url: string;
  ixc_plan_id: string;
}

interface PlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: Plan;
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
    features: (() => {
      const raw = plan?.features;
      if (Array.isArray(raw)) {
        return raw.map((feature, index: number) => ({
          ...feature,
          order: feature.order ?? index
        }));
      }
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw) as PlanFeature[];
          return Array.isArray(parsed)
            ? parsed.map((feature, index: number) => ({ ...feature, order: feature.order ?? index }))
            : [];
        } catch {
          return [];
        }
      }
      return [];
    })(),
    image_url: plan?.image_url || "",
    ixc_plan_id: plan?.ixc_plan_id || ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ixcPlans, setIxcPlans] = useState<IXCPlan[]>([]);
  const [loadingIxcPlans, setLoadingIxcPlans] = useState(false);
  const [selectedIxcPlanId, setSelectedIxcPlanId] = useState(plan?.ixc_plan_id || "");

  useEffect(() => {
    if (isOpen && !plan?.id) {
      loadIxcPlans();
    }
  }, [isOpen, plan?.id]);

  const loadIxcPlans = async () => {
    setLoadingIxcPlans(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-list-contracts', {
        body: { page: 1, rp: 100 }
      });

      if (error) throw error;

      if (data?.contracts) {
        setIxcPlans(data.contracts);
      }
    } catch (error) {
      console.error('Erro ao carregar planos IXC:', error);
      toast.error('Erro ao carregar planos do IXC');
    } finally {
      setLoadingIxcPlans(false);
    }
  };

  const handleIxcPlanSelect = (ixcPlanId: string) => {
    const selectedPlan = ixcPlans.find(p => p.id === ixcPlanId);
    if (selectedPlan) {
      setSelectedIxcPlanId(ixcPlanId);
      setFormData({
        ...formData,
        ixc_plan_id: ixcPlanId,
        name: selectedPlan.descricao,
        speed: `${selectedPlan.download} Mega`,
        price: parseFloat(selectedPlan.valor) || 0,
        originalPrice: parseFloat(selectedPlan.valor) * 1.2 || 0,
      });
      toast.success('Plano IXC vinculado! Agora personalize as características visuais.');
    }
  };

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
        features: formData.features,
        image_url: formData.image_url,
        ixc_plan_id: formData.ixc_plan_id || null
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
    const newOrder = formData.features.length > 0 
      ? Math.max(...formData.features.map(f => f.order || 0)) + 1 
      : 0;
    
    setFormData({
      ...formData,
      features: [...formData.features, { 
        text: "", 
        icon: "Download", 
        isLink: false, 
        href: "",
        order: newOrder
      }]
    });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i: number) => i !== index)
    });
  };

  const updateFeature = (index: number, field: keyof PlanFeature, value: string | boolean) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFormData({ ...formData, features: newFeatures });
  };

  const moveFeatureUp = (index: number) => {
    if (index === 0) return;
    const newFeatures = [...formData.features];
    [newFeatures[index - 1], newFeatures[index]] = [newFeatures[index], newFeatures[index - 1]];
    setFormData({ ...formData, features: newFeatures });
  };

  const moveFeatureDown = (index: number) => {
    if (index === formData.features.length - 1) return;
    const newFeatures = [...formData.features];
    [newFeatures[index], newFeatures[index + 1]] = [newFeatures[index + 1], newFeatures[index]];
    setFormData({ ...formData, features: newFeatures });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(formData.features);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData({ ...formData, features: items });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      // Upload para o Storage
      const { data, error } = await supabase.storage
        .from('plan-images')
        .upload(fileName, file);

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('plan-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: urlData.publicUrl });
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async () => {
    if (formData.image_url && formData.image_url.includes('plan-images')) {
      try {
        // Extrair nome do arquivo da URL
        const fileName = formData.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('plan-images')
            .remove([fileName]);
        }
      } catch (error) {
        console.error('Erro ao remover imagem:', error);
      }
    }
    setFormData({ ...formData, image_url: "" });
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
          {!plan?.id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vincular Plano do IXC</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="ixc-plan">Selecione um plano do IXC</Label>
                  <Select 
                    value={selectedIxcPlanId} 
                    onValueChange={handleIxcPlanSelect}
                    disabled={loadingIxcPlans}
                  >
                    <SelectTrigger id="ixc-plan">
                      <SelectValue placeholder={loadingIxcPlans ? "Carregando planos..." : "Selecione um plano IXC"} />
                    </SelectTrigger>
                    <SelectContent>
                      {ixcPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.descricao} - {plan.download}MB - R$ {plan.valor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Ao selecionar um plano IXC, os dados base serão preenchidos. Você poderá personalizar a descrição, imagem e características visuais.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Plano</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Plano Básico"
                disabled={!selectedIxcPlanId && !plan?.id}
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
                disabled={!selectedIxcPlanId && !plan?.id}
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
                disabled={!selectedIxcPlanId && !plan?.id}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Imagem do Plano</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.image_url ? (
                <div className="relative">
                  <img 
                    src={formData.image_url} 
                    alt="Preview do plano" 
                    className="w-full max-w-md h-48 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Nenhuma imagem selecionada</p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploadingImage}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={uploadingImage}
                      asChild
                    >
                      <span>
                        {uploadingImage ? (
                          <>Enviando...</>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Selecionar Imagem
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: JPG, PNG, WEBP. Tamanho máximo: 5MB
              </p>
            </CardContent>
          </Card>

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
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="features">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {formData.features.map((feature: any, index: number) => (
                        <Draggable key={`feature-${index}`} draggableId={`feature-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 rounded-lg border ${
                                snapshot.isDragging ? 'border-primary bg-muted/50' : 'border-border'
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                <div className="flex flex-col gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveFeatureUp(index)}
                                    disabled={index === 0}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </Button>
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                                  >
                                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveFeatureDown(index)}
                                    disabled={index === formData.features.length - 1}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>

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
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              
              {formData.features.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma característica adicionada ainda.</p>
                  <p className="text-sm">Clique em "Adicionar" para começar.</p>
                </div>
              )}
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