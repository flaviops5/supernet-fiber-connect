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
  const [openFinalize, setOpenFinalize] = useState(false);
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
    console.log('🚀 [InstallActions] Iniciando agendamento/reagendamento', { cardId: card.id, date, periodo, motivo });
    
    try {
      if (!date) {
        console.warn('⚠️ [InstallActions] Data não informada');
        toast({ title: "Informe a data", variant: "destructive" });
        return;
      }
      
      console.log('📸 [InstallActions] Verificando upload de fotos (opcional)');
      const fotos = await uploadPhotos();
      console.log(`✅ [InstallActions] Upload concluído: ${fotos.length} foto(s)`);
      
      const status = motivo ? "reagendado" : "agendado";
      console.log(`📋 [InstallActions] Status: ${status}`);

      const { data: userData } = await supabase.auth.getUser();
      console.log('👤 [InstallActions] Usuário autenticado:', userData.user?.id);

      console.log('💾 [InstallActions] Salvando evento no banco');
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

      if (error) {
        console.error('❌ [InstallActions] Erro ao salvar evento:', error);
        throw error;
      }
      console.log('✅ [InstallActions] Evento salvo com sucesso');

      // Monta mensagem e envia para Edge Function
      const msgLines = [
        status === "reagendado" ? "🔁 *Instalação reagendada!*" : "🗓️ *Instalação agendada!*",
        `🏷️ ${card.title}`,
        `📍 ${card.municipio || "—"}`,
        `🕓 ${periodo} (${new Date(date).toLocaleDateString("pt-BR")})`,
        card.localizacao_url ? `🔗 ${card.localizacao_url}` : "",
        motivo ? `💬 Motivo: ${motivo}` : ""
      ].filter(Boolean);

      const payload = { message: msgLines.join("\n") };
      console.log('📤 [InstallActions] Chamando edge function installation-notify', payload);

      const { data: notifyResult, error: notifyError } = await supabase.functions.invoke("installation-notify", {
        body: payload
      });

      console.log('📥 [InstallActions] Resposta da edge function:', { notifyResult, notifyError });

      // Verificar resultado do envio
      if (notifyError) {
        console.error('❌ [InstallActions] Erro ao enviar notificações:', notifyError);
        toast({ 
          title: status === "reagendado" ? "Reagendado" : "Agendado", 
          description: `Salvo, mas falha ao enviar notificações: ${notifyError.message}`,
          variant: "destructive"
        });
      } else if (notifyResult?.summary?.failure > 0) {
        console.warn(`⚠️ [InstallActions] Notificações parcialmente enviadas: ${notifyResult.summary.success} sucesso, ${notifyResult.summary.failure} falhas`);
        toast({ 
          title: status === "reagendado" ? "Reagendado" : "Agendado", 
          description: `Salvo. ${notifyResult.summary.success} notificação(ões) enviada(s), ${notifyResult.summary.failure} falha(s).`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [InstallActions] Notificações enviadas com sucesso');
        toast({ 
          title: status === "reagendado" ? "Reagendado" : "Agendado", 
          description: "Notificações enviadas." 
        });
      }
      
      setOpen(false);
      setDate("");
      setMotivo("");
      setFiles(null);
    } catch (err: unknown) {
      console.error('💥 [InstallActions] Erro fatal ao agendar instalação:', err);
      toast({ 
        title: "Erro ao registrar instalação", 
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive" 
      });
    }
  };

  const finalizeInstall = async () => {
    console.log('🚀 [InstallActions] Iniciando finalização da instalação', { cardId: card.id });
    
    try {
      if (!files || files.length === 0) {
        console.warn('⚠️ [InstallActions] Nenhuma foto selecionada');
        toast({ title: "Adicione pelo menos uma foto", variant: "destructive" });
        return;
      }

      console.log(`📸 [InstallActions] Iniciando upload de ${files.length} foto(s)`);
      const fotos = await uploadPhotos();
      console.log(`✅ [InstallActions] Upload concluído: ${fotos.length} foto(s)`);
      
      if (fotos.length === 0) {
        console.error('❌ [InstallActions] Falha no upload das fotos');
        toast({ title: "Erro ao fazer upload das fotos", variant: "destructive" });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      console.log('👤 [InstallActions] Usuário autenticado:', userData.user?.id);

      console.log('💾 [InstallActions] Salvando evento de instalação no banco');
      const { error } = await supabase.from("installation_events").insert({
        card_id: card.id,
        board_id: card.board_id,
        data_instalacao: new Date().toISOString().split('T')[0],
        periodo: "manhã",
        status: "finalizado",
        fotos,
        created_by: userData.user?.id ?? null
      });

      if (error) {
        console.error('❌ [InstallActions] Erro ao salvar evento:', error);
        throw error;
      }
      console.log('✅ [InstallActions] Evento salvo com sucesso');

      // Obter URLs públicas das fotos
      console.log('🔗 [InstallActions] Gerando URLs públicas das fotos');
      const photoUrls = await Promise.all(
        fotos.map(async (path) => {
          const { data } = supabase.storage
            .from("install_photos")
            .getPublicUrl(path);
          console.log(`🔗 URL gerada: ${data.publicUrl}`);
          return data.publicUrl;
        })
      );

      // Monta mensagem e envia com fotos
      const msgLines = [
        "✅ *Instalação finalizada!*",
        `🏷️ ${card.title}`,
        `📍 ${card.municipio || "—"}`,
        card.localizacao_url ? `🔗 ${card.localizacao_url}` : "",
        `📸 ${photoUrls.length} foto(s) anexada(s)`
      ].filter(Boolean);

      const payload = { 
        message: msgLines.join("\n"),
        photos: photoUrls
      };
      
      console.log('📤 [InstallActions] Chamando edge function installation-notify', payload);
      
      const { data: notifyResult, error: notifyError } = await supabase.functions.invoke("installation-notify", {
        body: payload
      });

      console.log('📥 [InstallActions] Resposta da edge function:', { notifyResult, notifyError });

      // Verificar resultado do envio
      if (notifyError) {
        console.error('❌ [InstallActions] Erro ao enviar notificações:', notifyError);
        toast({ 
          title: "Instalação registrada", 
          description: `Fotos salvas, mas falha ao enviar notificações: ${notifyError.message}`,
          variant: "destructive"
        });
      } else if (notifyResult?.summary?.failure > 0) {
        console.warn(`⚠️ [InstallActions] Notificações parcialmente enviadas: ${notifyResult.summary.success} sucesso, ${notifyResult.summary.failure} falhas`);
        toast({ 
          title: "Instalação registrada", 
          description: `Fotos salvas. ${notifyResult.summary.success} notificação(ões) enviada(s), ${notifyResult.summary.failure} falha(s).`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [InstallActions] Notificações enviadas com sucesso');
        toast({ 
          title: "Instalação finalizada", 
          description: "Notificações enviadas com fotos." 
        });
      }
      
      setOpenFinalize(false);
      setFiles(null);
    } catch (err: unknown) {
      console.error('💥 [InstallActions] Erro fatal ao finalizar instalação:', err);
      toast({ 
        title: "Erro ao finalizar instalação", 
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive" 
      });
    }
  };

  return (
    <>
      <div className="flex gap-2 mt-2">
        <Button 
          variant="outline" 
          onClick={() => setOpen(true)} 
          className="flex-1"
        >
          📅 Agendar
        </Button>
        <Button 
          variant="default" 
          onClick={() => setOpenFinalize(true)} 
          className="flex-1"
        >
          ✅ Finalizar
        </Button>
      </div>

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

      <Dialog open={openFinalize} onOpenChange={setOpenFinalize}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Finalizar Instalação - {card.title}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Fotos da instalação *</Label>
              <Input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileChange} 
                required
              />
              {uploading && (
                <div className="text-xs text-muted-foreground">
                  Enviando fotos...
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Adicione fotos da instalação finalizada
              </p>
            </div>

            <Button onClick={finalizeInstall} disabled={uploading}>
              Confirmar Finalização
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
