// PR #22 - Lista de clientes afetados com busca e mascaramento de CPF

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import type { AffectedCustomer } from "@/types/affected-customers.types";

function maskCPF(cpf: string | null): string {
  if (!cpf) return "—";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return "—";
  return `***.***.***-${cleaned.slice(-2)}`;
}

export function ClientsByRegionTable() {
  const [items, setItems] = useState<AffectedCustomer[]>([]);
  const [filteredItems, setFilteredItems] = useState<AffectedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  async function load() {
    try {
      const { data, error } = await supabase.rpc("get_customers_by_region_last_outage");
      if (error) throw error;
      
      // Map the data to AffectedCustomer type
      const customers: AffectedCustomer[] = (data || []).map((row: any) => ({
        cidade: row.cidade || "Desconhecido",
        bairro: row.bairro || null,
        nome: row.nome || null,
        cpf: row.cpf || null,
        ixc_client_id: row.ixc_client_id || null,
        last_event: row.last_event,
      }));
      
      setItems(customers);
      setFilteredItems(customers);
    } catch (err) {
      console.error("Erro ao carregar clientes afetados:", err);
      setItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = items.filter((item) => {
      return (
        item.cidade?.toLowerCase().includes(term) ||
        item.bairro?.toLowerCase().includes(term) ||
        item.nome?.toLowerCase().includes(term) ||
        item.cpf?.includes(term)
      );
    });
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cidade, bairro, nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-[400px] overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cidade</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Último Evento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente afetado nas últimas 6 horas"}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.cidade}</TableCell>
                  <TableCell>{r.bairro || "—"}</TableCell>
                  <TableCell>{r.nome || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{maskCPF(r.cpf)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(r.last_event).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {filteredItems.length} de {items.length} clientes afetados (últimas 6 horas)
      </p>
    </div>
  );
}
