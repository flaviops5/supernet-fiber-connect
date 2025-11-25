import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bell, Trash2, Plus } from "lucide-react";
import type { NotificationTarget, NotificationTargetFormData, NotificationTargetType } from "@/types";

const TIPO_LABELS: Record<NotificationTargetType, string> = {
  instalacao: "Instalação",
  tecnico: "Técnico",
  comercial: "Comercial",
  financeiro: "Financeiro",
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

export default function NotificationTargetsManager() {
  console.log("NotificationTargetsManager rendering...");
  const { toast } = useToast();
  const [targets, setTargets] = useState<NotificationTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<NotificationTargetFormData>({
    nome: "",
    telefone: "",
    tipo: "instalacao",
    observacoes: "",
  });

  const loadTargets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("notification_targets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar números",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTargets((data || []) as NotificationTarget[]);
    }
    setIsLoading(false);
  };

  const addTarget = async () => {
    if (!form.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do contato",
        variant: "destructive",
      });
      return;
    }

    if (!form.telefone.trim()) {
      toast({
        title: "Telefone obrigatório",
        description: "Informe o número de telefone",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhone(form.telefone)) {
      toast({
        title: "Telefone inválido",
        description: "Use o formato internacional: +5561999999999",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("notification_targets").insert({
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      tipo: form.tipo,
      observacoes: form.observacoes?.trim() || null,
    });

    if (error) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Número adicionado",
        description: `${form.nome} foi adicionado com sucesso`,
      });
      setForm({ nome: "", telefone: "", tipo: "instalacao", observacoes: "" });
      loadTargets();
    }
  };

  const toggleActive = async (id: string, ativo: boolean) => {
    const { error } = await supabase
      .from("notification_targets")
      .update({ ativo })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: ativo ? "Número ativado" : "Número desativado",
      });
      loadTargets();
    }
  };

  const removeTarget = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja remover "${nome}"?`)) return;

    const { error } = await supabase
      .from("notification_targets")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Número removido",
        description: `${nome} foi removido`,
      });
      loadTargets();
    }
  };

  useEffect(() => {
    loadTargets();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Número de Notificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Contato *</Label>
              <Input
                id="nome"
                placeholder="Ex: João Silva"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone (formato internacional) *</Label>
              <Input
                id="telefone"
                placeholder="+5561999999999"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Notificação</Label>
              <select
                id="tipo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as NotificationTargetType })}
              >
                {Object.entries(TIPO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Informações adicionais sobre este contato..."
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <Button onClick={addTarget} className="mt-4 w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Número
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Números Cadastrados ({targets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum número cadastrado ainda
            </div>
          ) : (
            <div className="space-y-3">
              {targets.map((target) => (
                <div
                  key={target.id}
                  className="flex items-start justify-between border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{target.nome}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {TIPO_LABELS[target.tipo]}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {target.telefone}
                    </div>
                    {target.observacoes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {target.observacoes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={target.ativo}
                        onCheckedChange={(checked) => toggleActive(target.id, checked)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {target.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeTarget(target.id, target.nome)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
