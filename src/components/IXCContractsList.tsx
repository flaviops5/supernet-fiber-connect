import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, FileText, User, Calendar, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";

interface IXCContract {
  id: string;
  descricao: string;
  valor?: string;
  download?: string;
  upload?: string;
  tipo?: string;
  [key: string]: string | undefined;
}

interface IXCPlanListItem {
  id: string;
  name: string;
  download: string;
  upload: string;
  price: number;
}

export const IXCContractsList = () => {
  const [contracts, setContracts] = useState<IXCContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [rp] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [localPlans, setLocalPlans] = useState<{ id: string; name: string }[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({});
  const [availablePlans, setAvailablePlans] = useState<IXCPlanListItem[]>([]);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const { toast } = useToast();

  const loadLocalPlans = async () => {
    const { data, error } = await supabase.from('plans').select('id,name');
    if (error) {
      console.error('Erro ao carregar planos locais:', error);
      return;
    }
    setLocalPlans(data || []);
  };

  const loadContracts = async (p?: number) => {
    const nextPage = p ?? page;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-list-contracts', {
        body: { page: nextPage, rp }
      });

      if (error) throw error;

      if (data.success) {
        setContracts(data.contracts);
        setTotal(data.total);
        setPage(data.page || nextPage);
        setTotalPages(data.totalPages || Math.max(1, Math.ceil((data.total || 0) / rp)));

        await loadLocalPlans();

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
        throw new Error(data.error || 'Erro ao carregar planos');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido');
      console.error('Error loading plans:', err);
      toast({
        title: "Erro ao carregar planos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-sync-plans', {
        body: { planIds: [73, 78, 107] }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Planos sincronizados",
          description: `${data.synced} planos sincronizados com sucesso${data.errors > 0 ? ` (${data.errors} erros)` : ''}.`,
        });
      } else {
        throw new Error(data.error || 'Erro ao sincronizar planos');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido');
      console.error('Error syncing plans:', err);
      toast({
        title: "Erro ao sincronizar planos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const listAllPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-list-plans');

      if (error) throw error;

      if (data.success) {
        setAvailablePlans(data.plans);
        setShowAllPlans(true);
        toast({
          title: "Planos carregados",
          description: `${data.total} planos encontrados no IXC.`,
        });
      } else {
        throw new Error(data.error || 'Erro ao listar planos');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido');
      console.error('Error listing plans:', err);
      toast({
        title: "Erro ao listar planos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract =>
    (contract.descricao?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contract.download?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contract.upload?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contract.valor ? String(contract.valor).includes(searchTerm) : false)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <FileText className="w-5 h-5" />
          <h2 className="text-2xl font-bold">Planos Disponíveis IXC</h2>
          {total > 0 && (
            <Badge variant="secondary">{total} planos</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={listAllPlans} disabled={loading} variant="secondary">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              "Ver Todos os Planos"
            )}
          </Button>
          <Button onClick={syncPlans} disabled={loading} variant="default">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              "Sincronizar Selecionados"
            )}
          </Button>
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
        </div>
      </div>

      {contracts.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
              <div className="grid md:grid-cols-3 gap-4">
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
                    {contract.download ? `↓ ${contract.download}` : 'N/A'}
                    {contract.upload ? ` / ↑ ${contract.upload}` : ''}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span>Valor</span>
                  </div>
                  <p className="font-medium">
                    {contract.valor ? new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(parseFloat(contract.valor)) : 'N/A'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Clique em "Buscar Planos" para carregar os planos disponíveis no IXC.
          </p>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Nenhum plano encontrado com os filtros aplicados.
          </p>
        </Card>
      )}

      {showAllPlans && availablePlans.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Todos os Planos Disponíveis no IXC</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAllPlans(false)}>
              Fechar
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {availablePlans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.download}/{plan.upload} Mbps • R$ {plan.price.toFixed(2)}
                  </p>
                </div>
                <Badge variant="secondary">ID: {plan.id}</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            💡 Use esses IDs na função syncPlans() para sincronizar planos específicos com o banco local.
          </p>
        </Card>
      )}
    </div>
  );
};
