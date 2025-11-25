import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, FileText, DollarSign } from "lucide-react";

interface IXCPlan {
  id: string;          // vd_planos.id
  name: string;
  download: string;
  upload: string;
  price: number;
  source?: string;
}

export const IXCPlansManager = () => {
  const [plans, setPlans] = useState<IXCPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [rp] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toast } = useToast();

  const loadPlans = async (p?: number) => {
    const nextPage = p ?? page;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ixc-list-plans", {
        body: { page: nextPage, rp, search: searchTerm || undefined },
      });

      if (error) throw error;

      if (data?.success) {
        setPlans(data.plans || []);
        setTotal(data.total || 0);
        setPage(data.page || nextPage);
        setTotalPages(data.totalPages || 1);

        toast({
          title: "Planos carregados",
          description: `${data.total || data.plans?.length || 0} planos encontrados no IXC.`,
        });
      } else {
        throw new Error(data?.error || "Erro ao carregar planos");
      }
    } catch (err: any) {
      console.error("Erro ao carregar planos:", err);
      toast({
        title: "Erro ao carregar planos",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncSelected = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: "Nada selecionado",
        description: "Selecione pelo menos um plano para sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ixc-sync-plans", {
        body: { planIds: selectedIds },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Planos sincronizados",
          description: `${data.synced} planos sincronizados com sucesso${
            data.errors > 0 ? ` (${data.errors} erros)` : ""
          }.`,
        });
      } else {
        throw new Error(data?.error || "Erro ao sincronizar planos");
      }
    } catch (err: any) {
      console.error("Erro ao sincronizar planos:", err);
      toast({
        title: "Erro ao sincronizar planos",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredPlans = plans.filter((plan) => {
    const term = searchTerm.toLowerCase();
    return (
      plan.name.toLowerCase().includes(term) ||
      plan.download.toLowerCase().includes(term) ||
      plan.upload.toLowerCase().includes(term) ||
      String(plan.price).includes(term)
    );
  });

  useEffect(() => {
    // Carrega primeira página na montagem
    loadPlans(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <FileText className="w-5 h-5" />
          <h2 className="text-2xl font-bold">Planos IXC (vd_planos + radgrupos)</h2>
          {total > 0 && (
            <Badge variant="secondary">{total} planos</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => loadPlans(1)}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              "Recarregar"
            )}
          </Button>
          <Button
            onClick={syncSelected}
            disabled={loading || selectedIds.length === 0}
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              `Sincronizar Selecionados (${selectedIds.length})`
            )}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar plano por nome, velocidade ou valor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              loadPlans(1);
            }
          }}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredPlans.length > 0 ? (
        <div className="grid gap-4">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <Checkbox
                  checked={selectedIds.includes(plan.id)}
                  onCheckedChange={() => toggleSelected(plan.id)}
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>Plano</span>
                    <Badge variant="outline">ID IXC: {plan.id}</Badge>
                  </div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.download || plan.upload
                      ? `${plan.download || "?"} / ${plan.upload || "?"} Mbps`
                      : "Velocidade não informada"}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>Mensalidade</span>
                </div>
                <p className="font-medium">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(plan.price || 0)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhum plano encontrado. Ajuste o filtro ou clique em "Recarregar".
          </p>
        </Card>
      )}

      {/* Paginação simples – se quiser usar de verdade é só ligar nos botões */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => loadPlans(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => loadPlans(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
