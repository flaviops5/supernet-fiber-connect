import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, FileText, User, Calendar, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface IXCContract {
  id: string;
  cliente: string;
  cpf_cnpj: string;
  plano: string;
  valor: string;
  data_inicio: string;
  situacao: string;
  [key: string]: any;
}

export const IXCContractsList = () => {
  const [contracts, setContracts] = useState<IXCContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cpfSearch, setCpfSearch] = useState("");
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const loadContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-list-contracts', {
        body: { cpf: cpfSearch.trim() || undefined }
      });

      if (error) throw error;

      if (data.success) {
        setContracts(data.contracts);
        setTotal(data.total);
        
        // Debug logging
        console.log('IXC Response:', data);
        
        if (data.total === 0) {
          toast({
            title: "Nenhum contrato encontrado",
            description: cpfSearch ? `Nenhum contrato encontrado para o CPF ${cpfSearch}` : "A API do IXC não retornou contratos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Contratos carregados",
            description: `${data.total} contratos encontrados${cpfSearch ? ` para o CPF ${cpfSearch}` : ''}.`,
          });
        }
      } else {
        throw new Error(data.error || 'Erro ao carregar contratos');
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast({
        title: "Erro ao carregar contratos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.cpf_cnpj?.includes(searchTerm) ||
    contract.plano?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <FileText className="w-5 h-5" />
          <h2 className="text-2xl font-bold">Contratos IXC</h2>
          {total > 0 && (
            <Badge variant="secondary">{total} encontrados</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Digite o CPF (apenas números)"
              value={cpfSearch}
              onChange={(e) => setCpfSearch(e.target.value.replace(/\D/g, ''))}
              maxLength={11}
              className="flex-1"
            />
            <Button onClick={loadContracts} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                "Buscar Contratos"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {contracts.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por cliente, CPF/CNPJ ou plano..."
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
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Cliente</span>
                  </div>
                  <p className="font-medium">{contract.cliente}</p>
                  <p className="text-sm text-muted-foreground">{contract.cpf_cnpj}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>Plano</span>
                  </div>
                  <p className="font-medium">{contract.plano}</p>
                  <Badge variant="outline">ID: {contract.id}</Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span>Valor</span>
                  </div>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(parseFloat(contract.valor || '0'))}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Início</span>
                  </div>
                  <p className="font-medium">{contract.data_inicio}</p>
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                    {contract.situacao || 'Ativo'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Clique em "Buscar Contratos Ativos" para carregar os contratos do IXC.
          </p>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Nenhum contrato encontrado com os filtros aplicados.
          </p>
        </Card>
      )}
    </div>
  );
};
