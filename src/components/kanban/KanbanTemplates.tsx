import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Layout, Rocket, Users, ShoppingCart, Plus } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  columns_config: Array<{ name: string; color: string; position: number }>;
  usage_count: number;
}

interface KanbanTemplatesProps {
  onSelectTemplate: (template: Template) => void;
}

export function KanbanTemplates({ onSelectTemplate }: KanbanTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('kanban_board_templates' as any)
      .select('*')
      .eq('is_public', true)
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Erro ao carregar templates',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setTemplates((data as any) || []);
    }
    setLoading(false);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      project: <Rocket className="h-5 w-5" />,
      support: <Users className="h-5 w-5" />,
      sales: <ShoppingCart className="h-5 w-5" />,
      custom: <Layout className="h-5 w-5" />,
    };
    return icons[category] || <Layout className="h-5 w-5" />;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      project: 'Projeto',
      support: 'Suporte',
      sales: 'Vendas',
      custom: 'Personalizado',
    };
    return labels[category] || category;
  };

  const handleSelectTemplate = async (template: Template) => {
    // Increment usage count
    await supabase
      .from('kanban_board_templates' as any)
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', template.id);

    onSelectTemplate(template);
  };

  if (loading) {
    return <div>Carregando templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Templates de Board</h2>
        <p className="text-muted-foreground">
          Comece rápido com um template pré-configurado
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(template.category)}
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                <Badge variant="secondary">
                  {getCategoryLabel(template.category)}
                </Badge>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {template.columns_config.map((col, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      style={{ borderColor: col.color }}
                    >
                      {col.name}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {template.usage_count} usos
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Usar Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum template disponível no momento
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
