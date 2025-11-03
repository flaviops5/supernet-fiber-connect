import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Link2, Plus, Trash2, ExternalLink } from "lucide-react";

interface Token {
  id: string;
  token: string;
  entity_name: string;
  is_active: boolean;
  created_at: string;
  access_count: number;
  last_accessed_at: string | null;
}

interface TokenManagerProps {
  boardId: string;
}

export function TokenManager({ boardId }: TokenManagerProps) {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [entityName, setEntityName] = useState("");

  useEffect(() => {
    loadTokens();
  }, [boardId]);

  const loadTokens = async () => {
    const { data, error } = await supabase
      .from("calendar_access_tokens")
      .select("*")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar tokens",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setTokens(data || []);
  };

  const generateToken = () => {
    return Array.from({ length: 12 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[
        Math.floor(Math.random() * 56)
      ]
    ).join("");
  };

  const createToken = async () => {
    if (!entityName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome da escola/contratante",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const token = generateToken();

    const { error } = await supabase.from("calendar_access_tokens").insert({
      token,
      board_id: boardId,
      entity_name: entityName,
      is_active: true,
    });

    if (error) {
      toast({
        title: "Erro ao criar token",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Token criado!",
      description: "Link copiado para a área de transferência",
    });

    const url = `${window.location.origin}/instalacoes/${token}`;
    navigator.clipboard.writeText(url);

    setEntityName("");
    setOpen(false);
    setLoading(false);
    loadTokens();
  };

  const deleteToken = async (id: string) => {
    if (!confirm("Deseja realmente deletar este token?")) return;

    const { error } = await supabase
      .from("calendar_access_tokens")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Token deletado" });
    loadTokens();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/instalacoes/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  const openLink = (token: string) => {
    const url = `${window.location.origin}/instalacoes/${token}`;
    window.open(url, "_blank");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Links de Acesso Público
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Link de Acesso</DialogTitle>
              <DialogDescription>
                Gere um link único para que o contratante possa acompanhar as instalações
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Escola/Contratante *</Label>
                <Input
                  placeholder="Ex: Escola Municipal..."
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                />
              </div>
              <Button onClick={createToken} disabled={loading} className="w-full">
                {loading ? "Criando..." : "Criar e Copiar Link"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum link criado ainda
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contratante</TableHead>
                <TableHead>Acessos</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.entity_name}</TableCell>
                  <TableCell>{t.access_count}</TableCell>
                  <TableCell>
                    {t.last_accessed_at
                      ? new Date(t.last_accessed_at).toLocaleString("pt-BR")
                      : "Nunca"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(t.token)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openLink(t.token)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteToken(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
