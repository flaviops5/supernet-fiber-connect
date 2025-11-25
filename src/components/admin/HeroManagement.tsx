import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeroSlideForm } from "@/components/HeroForm";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface HeroSettings {
  id: string;
  main_title: string;
  subtitle: string;
  badge_text: string;
  cta_text: string;
  whatsapp_message: string;
}

interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  image_url: string;
  display_order: number;
  active: boolean;
}

export default function HeroManagement() {
  const [heroSettings, setHeroSettings] = useState<HeroSettings | null>(null);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);

  useEffect(() => {
    loadHeroData();
  }, []);

  const loadHeroData = async () => {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('hero_settings')
        .select('*')
        .maybeSingle();

      const { data: slidesData, error: slidesError } = await supabase
        .from('hero_slides')
        .select('*')
        .order('display_order', { ascending: true });

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      if (slidesError) throw slidesError;

      setHeroSettings(settings);
      setSlides(slidesData || []);
    } catch (error) {
      logger.error('Error loading hero data', error as Error);
      toast.error('Erro ao carregar dados da Hero Section');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlide = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setShowSlideForm(true);
  };

  const handleCloseSlideForm = () => {
    setShowSlideForm(false);
    setEditingSlide(null);
  };

  const toggleSlideActive = async (slideId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('hero_slides')
        .update({ active: !currentActive })
        .eq('id', slideId);

      if (error) throw error;
      
      setSlides(slides.map(slide => 
        slide.id === slideId 
          ? { ...slide, active: !currentActive }
          : slide
      ));
      
      toast.success(`Slide ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      logger.error('Error updating slide', error as Error);
      toast.error('Erro ao atualizar slide');
    }
  };

  const deleteSlide = async (slideId: string) => {
    if (!confirm('Tem certeza que deseja excluir este slide?')) return;
    
    try {
      const { error } = await supabase
        .from('hero_slides')
        .delete()
        .eq('id', slideId);

      if (error) throw error;
      
      setSlides(slides.filter(slide => slide.id !== slideId));
      toast.success('Slide excluído com sucesso!');
    } catch (error) {
      logger.error('Error deleting slide', error as Error);
      toast.error('Erro ao excluir slide');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Hero Section</h1>
          <p className="text-muted-foreground">Configure a seção principal do site</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Hero Section</h1>
        <p className="text-muted-foreground">Configure a seção principal do site</p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="slides">Slides</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Configurações do Hero em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="slides" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gerenciar Slides</h2>
            <Button onClick={() => setShowSlideForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Slide
            </Button>
          </div>
          <div className="grid gap-4">
            {slides.map((slide) => (
              <Card key={slide.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{slide.title}</h3>
                      <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { 
                        setEditingSlide(slide); 
                        setShowSlideForm(true); 
                      }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteSlide(slide.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <HeroSlideForm 
        isOpen={showSlideForm} 
        onClose={() => { 
          setShowSlideForm(false); 
          setEditingSlide(null); 
        }} 
        slide={editingSlide} 
        onSave={() => { 
          loadHeroData(); 
          setShowSlideForm(false); 
          setEditingSlide(null); 
        }} 
      />
    </div>
  );
}
