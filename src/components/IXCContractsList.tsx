import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, FileText, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface IXCContract {
  id: string;
  descricao: string;
  valor?: string;
  download?: string;
  upload?: string;
  tipo?: string;
}

export const IXCContractsList = () => {
  const [contracts, setContracts] = useState<IXCContract[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [rp] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const loadContracts = async (p?: number) => {
    const nextPage = p ?? page;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ixc-list-contracts", {
        body: { page: nextPage, rp, search: searchTerm || undefined },
      });

      if (error) throw error;

      if (data?.success) {
        setContracts(data.contracts || []);
        setTotal(data.total || 0);
        setPage(data.page || nextPage);
        setTotalPages(data.totalPages || 1);

        if ((data.total || 0) === 0) {
          toast({
            title: "Nenhum plano encontrado",
            description: "A API do IXC não retornou planos disponíveis.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Planos carregados",
            description: `${data.total} planos disponíveis encontrados.`,
          });
        }
      } else {
        throw new Error(data?.error || "Erro ao carregar planos");
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Erro desconhecido");
      console.error("Error loading plans:", err);
      toast({
        title: "Erro ao carregar planos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContracts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContracts.map((c) => c.id)));
    }
  };

  const syncPlans = async () => {
    const idsToSync = Array.from(selectedIds).map((id) => Number(id));

    if (idsToSync.length === 0) {
      toast({
        title: "Nenhum plano selecionado",
        description: "Selecione ao menos um plano para sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ixc-sync-plans", {
        body: { planIds: idsToSync },
      });

      if (error) throw error;

      if (data?.success) {
        setSelectedIds(new Set());
        toast({
          title: "Planos sincronizados",
          description: `${data.synced} planos sincronizados com sucesso${
            data.errors > 0 ? ` (${data.errors} erros)` : ""
          }.`,
        });
      } else {
        throw new Error(data?.error || "Erro ao sincronizar planos");
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Erro desconhecido");
      console.error("Error syncing plans:", err);
      toast({
        title: "Erro ao sincronizar planos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(
    (contract) =>
      contract.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.download?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.upload?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contract.valor ? String(contract.valor).includes(searchTerm) : false)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <FileText className="w-5 h-5" />
          <h2 className="text-2xl font-bold">Planos Disponíveis IXC</h2>
          {total > 0 && <Badge variant="secondary">{total} planos</Badge>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => loadContracts(1)} disabled={loading} variant="outline">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              "Buscar Planos"
            )}
          </Button>
          <Button onClick={syncPlans} disabled={loading || selectedIds.size === 0} variant="default">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              `Sincronizar (${selectedIds.size})`
            )}
          </Button>
        </div>
      </div>

      {contracts.length > 0 && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {filteredContracts.length > 0 && (
            <Button onClick={toggleSelectAll} variant="outline" size="sm">
              {selectedIds.size === filteredContracts.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredContracts.length > 0 ? (
        <div className="grid gap-4">
          {filteredContracts.map((contract) => (
            <Card key={contract.id} className="p-4">
              <div className="flex gap-4">
                <div className="flex items-start pt-1">
                  <Checkbox
                    checked={selectedIds.has(contract.id)}
                    onCheckedChange={() => toggleSelection(contract.id)}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4 flex-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>Plano</span>
                    </div>
                    <p className="font-medium">{contract.descricao}</p>
                    <Badge variant="outline">ID: {contract.id}</Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>Velocidade</span>
                    </div>
                    <p className="font-medium">
                      {contract.download ? `↓ ${contract.download}` : "N/A"}
                      {contract.upload ? ` / ↑ ${contract.upload}` : ""}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>Valor</span>
                    </div>
                    <p className="font-medium">
                      {contract.valor
                        ? new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(parseFloat(contract.valor))
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Clique em &quot;Buscar Planos&quot; para carregar os planos disponíveis no IXC.
          </p>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum plano encontrado com os filtros aplicados.</p>
        </Card>
      )}

      {contracts.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({total} planos no total)
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => loadContracts(page - 1)}
              disabled={loading || page === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <Button
              onClick={() => loadContracts(page + 1)}
              disabled={loading || page >= totalPages}
              variant="outline"
              size="sm"
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
