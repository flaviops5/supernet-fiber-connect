import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const RebootBlacklist = () => {
  const [open, setOpen] = useState(false);
  const [ixcClientId, setIxcClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [reason, setReason] = useState("");

  const queryClient = useQueryClient();

  const { data: blacklist, isLoading } = useQuery({
    queryKey: ['reboot-blacklist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_reboot_blacklist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('equipment_reboot_blacklist')
        .insert({
          ixc_client_id: ixcClientId,
          client_name: clientName || null,
          reason: reason || null,
          added_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reboot-blacklist'] });
      toast({
        title: "Cliente adicionado à blacklist",
        description: "O cliente não será mais reiniciado automaticamente."
      });
      setOpen(false);
      setIxcClientId("");
      setClientName("");
      setReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar cliente",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_reboot_blacklist')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reboot-blacklist'] });
      toast({
        title: "Cliente removido da blacklist",
        description: "O cliente poderá ser reiniciado automaticamente novamente."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover cliente",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Blacklist de Equipamentos</CardTitle>
            <CardDescription>
              Clientes que não devem ser reiniciados automaticamente
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Cliente à Blacklist</DialogTitle>
                <DialogDescription>
                  Este cliente não será reiniciado automaticamente pelo sistema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ixc_client_id">ID do Cliente no IXC *</Label>
                  <Input
                    id="ixc_client_id"
                    value={ixcClientId}
                    onChange={(e) => setIxcClientId(e.target.value)}
                    placeholder="Ex: 12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_name">Nome do Cliente</Label>
                  <Input
                    id="client_name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Equipamento com problema conhecido que requer atenção manual"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => addMutation.mutate()}
                  disabled={!ixcClientId || addMutation.isPending}
                >
                  {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !blacklist || blacklist.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cliente na blacklist
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Cliente IXC</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklist.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.ixc_client_id}</TableCell>
                    <TableCell>{item.client_name || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.reason || '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMutation.mutate(item.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
