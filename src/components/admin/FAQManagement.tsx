import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Plus, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FAQForm } from "@/components/FAQForm";
import { AIFAQGenerator } from "@/components/AIFAQGenerator";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      logger.error('Error loading FAQs', error as Error);
      toast.error('Erro ao carregar FAQs');
    } finally {
      setLoading(false);
    }
  };

  const deleteFaq = async (faqId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta FAQ?')) return;
    
    try {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', faqId);

      if (error) throw error;
      
      setFaqs(faqs.filter(faq => faq.id !== faqId));
      toast.success('FAQ excluída com sucesso!');
    } catch (error) {
      logger.error('Error deleting FAQ', error as Error);
      toast.error('Erro ao excluir FAQ');
    }
  };

  const handleEdit = (faq: any) => {
    setEditingFaq(faq);
    setShowForm(true);
  };

  const toggleFaqActive = async (faqId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ active: !currentActive })
        .eq('id', faqId);

      if (error) throw error;
      
      setFaqs(faqs.map(faq => 
        faq.id === faqId 
          ? { ...faq, active: !currentActive }
          : faq
      ));
      
      toast.success(`FAQ ${!currentActive ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (error) {
      logger.error('Error updating FAQ', error as Error);
      toast.error('Erro ao atualizar FAQ');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingFaq(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar FAQ</h1>
          <p className="text-muted-foreground">Configure perguntas frequentes</p>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar FAQ</h1>
          <p className="text-muted-foreground">Configure perguntas frequentes</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova FAQ
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">📋 Lista de FAQs</TabsTrigger>
          <TabsTrigger value="ai-generator">✨ IA Gerador</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Perguntas Frequentes</CardTitle>
              <CardDescription>
                Total de {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} cadastrada{faqs.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {faqs.length === 0 ? (
                <div className="text-center py-8">
                  <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhuma FAQ cadastrada</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira FAQ
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <Card key={faq.id} className={`${!faq.active ? 'opacity-50' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-lg">{faq.question}</CardTitle>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                faq.active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {faq.active ? 'Ativa' : 'Inativa'}
                              </span>
                            </div>
                            <CardDescription className="mb-3">
                              {faq.answer.length > 150 ? `${faq.answer.substring(0, 150)}...` : faq.answer}
                            </CardDescription>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Ícone:</span> {faq.icon} | 
                              <span className="font-medium ml-2">Ordem:</span> {faq.display_order}
                              {faq.video_url && (
                                <span> | <span className="font-medium">Vídeo:</span> Sim</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(faq)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={faq.active ? "outline" : "default"}
                              size="sm"
                              onClick={() => toggleFaqActive(faq.id, faq.active)}
                            >
                              {faq.active ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteFaq(faq.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ai-generator" className="mt-6">
          <AIFAQGenerator />
        </TabsContent>
      </Tabs>

      <FAQForm
        isOpen={showForm}
        onClose={handleCloseForm}
        faq={editingFaq}
        onSave={loadFaqs}
      />
    </div>
  );
}
