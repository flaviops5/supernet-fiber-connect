import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { KanbanCard } from "@/types/kanban";

interface InstallActionsProps {
  card: KanbanCard;
}

export function InstallActions({ card }: InstallActionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>("");
  const [periodo, setPeriodo] = useState<"manhã" | "tarde" | "noite">("manhã");
  const [motivo, setMotivo] = useState<string>("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    
    setUploading(true);
    const uploaded: string[] = [];
    
    for (const f of Array.from(files)) {
      const path = `cards/${card.id}/${Date.now()}_${f.name}`;
      const { error } = await supabase.storage
        .from("install_photos")
        .upload(path, f, { upsert: false });
      
      if (error) {
        toast({ 
          title: "Falha no upload", 
          description: error.message, 
          variant: "destructive" 
        });
      } else {
        uploaded.push(path);
      }
    }
    
    setUploading(false);
    return uploaded;
  };

  const submit = async () => {
    try {
      if (!date) {
        toast({ title: "Informe a data", variant: "destructive" });
        return;
      }
      
      const fotos = await uploadPhotos();
      const status = motivo ? "reagendado" : "agendado";

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from("installation_events").insert({
        card_id: card.id,
        board_id: card.board_id,
        data_instalacao: date,
        periodo,
        status,
        change_reason: motivo || null,
        fotos,
        created_by: userData.user?.id ?? null
      });

      if (error) throw error;

      // Monta mensagem e envia para Edge Function
      const msgLines = [
        status === "reagendado" ? "🔁 *Instalação reagendada!*" : "🗓️ *Instalação agendada!*",
        `🏷️ ${card.title}`,
        `📍 ${card.municipio || "—"}`,
        `🕓 ${periodo} (${new Date(date).toLocaleDateString("pt-BR")})`,
        card.localizacao_url ? `🔗 ${card.localizacao_url}` : "",
        motivo ? `💬 Motivo: ${motivo}` : ""
      ].filter(Boolean);

      await supabase.functions.invoke("installation-notify", {
        body: { message: msgLines.join("\n") }
      });

      toast({ 
        title: status === "reagendado" ? "Reagendado" : "Agendado", 
        description: "Notificações enviadas." 
      });
      
      setOpen(false);
      setDate("");
      setMotivo("");
      setFiles(null);
    } catch (err: any) {
      toast({ 
        title: "Erro ao registrar instalação", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)} 
        className="mt-2"
      >
        📅 Marcar / Reagendar Instalação
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{card.title}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Data</Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
              />
            </div>

            <div className="grid gap-1">
              <Label>Período</Label>
              <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manhã">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noite">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label>Motivo (se for reagendar)</Label>
              <Textarea 
                value={motivo} 
                onChange={(e) => setMotivo(e.target.value)} 
                placeholder="Ex: cliente ausente, chuva..." 
              />
            </div>

            <div className="grid gap-1">
              <Label>Fotos (opcional)</Label>
              <Input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              {uploading && (
                <div className="text-xs text-muted-foreground">
                  Enviando fotos...
                </div>
              )}
            </div>

            <Button onClick={submit} disabled={uploading}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
