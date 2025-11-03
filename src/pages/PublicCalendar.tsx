import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar as CalendarIcon, MapPin } from "lucide-react";

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  municipio?: string;
  localizacao_url?: string;
}

export default function PublicCalendar() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entityName, setEntityName] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadCalendar();
  }, [token]);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔍 Iniciando carregamento do calendário...", { token });

      // Verificar se usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      let boardId: string | null = null;
      let isAdmin = false;

      console.log("👤 Usuário:", user?.id || "não autenticado");

      if (user) {
        // Verificar se é admin
        const { data: hasAdminRole } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        isAdmin = hasAdminRole === true;
        console.log("🔐 É admin?", isAdmin);
      }

      // Se não é admin e não tem token, mostrar erro
      if (!isAdmin && !token) {
        console.error("❌ Sem token e não é admin");
        setError("Token de acesso não fornecido");
        setLoading(false);
        return;
      }

      // Se tem token, validar
      if (token) {
        console.log("🔑 Validando token...");
        const { data: tokenData, error: tokenError } = await supabase
          .rpc("validate_calendar_token", { p_token: token })
          .maybeSingle();

        console.log("Token data:", tokenData, "Error:", tokenError);

        if (tokenError || !tokenData?.is_valid) {
          // Se não é admin, mostrar erro
          if (!isAdmin) {
            console.error("❌ Token inválido e não é admin");
            setError("Link inválido ou expirado. Entre em contato com a empresa.");
            setLoading(false);
            return;
          }
          console.log("⚠️ Token inválido mas é admin, continuando...");
        } else {
          console.log("✅ Token válido:", tokenData.entity_name);
          setEntityName(tokenData.entity_name);
          boardId = tokenData.board_id;
        }
      }

      // Se é admin e não tem boardId do token, buscar primeiro board
      if (isAdmin && !boardId) {
        console.log("🔍 Admin sem boardId, buscando primeiro board...");
        const { data: boards } = await supabase
          .from("kanban_boards")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1);

        if (boards && boards.length > 0) {
          boardId = boards[0].id;
          setEntityName("Administrador - Todos os Eventos");
          console.log("✅ Board encontrado:", boardId);
        }
      }

      if (!boardId) {
        console.error("❌ Nenhum board encontrado");
        setError("Nenhum board encontrado");
        setLoading(false);
        return;
      }

      // Buscar eventos dos próximos 90 dias
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      console.log("📅 Buscando eventos de", startDate.toISOString().split("T")[0], "até", endDate.toISOString().split("T")[0]);

      let eventsData;
      let eventsError;
      
      if (token && !isAdmin) {
        // Usar função com token
        console.log("🔑 Buscando eventos por token...");
        const result = await supabase.rpc(
          "get_installation_events_by_token",
          {
            p_token: token,
            p_start: startDate.toISOString().split("T")[0],
            p_end: endDate.toISOString().split("T")[0],
          }
        );
        
        eventsData = result.data;
        eventsError = result.error;
      } else {
        // Admin - buscar todos os eventos do board
        console.log("👑 Admin buscando todos os eventos do board...");
        const result = await supabase.rpc(
          "get_installation_events",
          {
            p_board: boardId,
            p_start: startDate.toISOString().split("T")[0],
            p_end: endDate.toISOString().split("T")[0],
          }
        );
        
        eventsData = result.data;
        eventsError = result.error;
      }

      if (eventsError) {
        console.error("❌ Erro ao carregar eventos:", eventsError);
        setError(`Erro ao carregar o calendário: ${eventsError.message}`);
        setLoading(false);
        return;
      }

      console.log("📊 Eventos carregados:", eventsData?.length || 0);

      const formattedEvents: CalendarEvent[] = (eventsData || []).map((e: any) => ({
        id: e.id,
        title: `${e.periodo === "manhã" ? "🌅" : e.periodo === "tarde" ? "☀️" : "🌙"} ${e.title}`,
        start: new Date(e.data_instalacao),
        end: new Date(e.data_instalacao),
        status: e.status,
        municipio: e.municipio,
        localizacao_url: e.localizacao_url,
      }));

      console.log("✅ Eventos formatados:", formattedEvents.length);
      setEvents(formattedEvents);
      setLoading(false);
    } catch (err: any) {
      console.error("💥 Erro geral:", err);
      setError(`Erro: ${err.message}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando calendário...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Calendário de Instalações
            </CardTitle>
            {entityName && (
              <p className="text-muted-foreground flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4" />
                {entityName}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Calendar */}
        <Card>
          <CardContent className="pt-6">
            {events.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Nenhuma instalação agendada nos próximos 90 dias.
                </AlertDescription>
              </Alert>
            ) : (
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                messages={{
                  next: "Próximo",
                  previous: "Anterior",
                  today: "Hoje",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia",
                  agenda: "Agenda",
                  date: "Data",
                  time: "Hora",
                  event: "Evento",
                  noEventsInRange: "Sem eventos neste período",
                  showMore: (total) => `+ Ver mais (${total})`,
                }}
                eventPropGetter={(event) => {
                  const colors = {
                    finalizado: { bg: "hsl(142 76% 36%)", text: "white" },
                    em_execucao: { bg: "hsl(38 92% 50%)", text: "white" },
                    reagendado: { bg: "hsl(48 96% 53%)", text: "black" },
                    agendado: { bg: "hsl(221 83% 53%)", text: "white" },
                  };
                  const color = colors[event.status as keyof typeof colors] || colors.agendado;
                  return {
                    style: {
                      backgroundColor: color.bg,
                      color: color.text,
                      borderRadius: 8,
                      border: "none",
                      padding: "4px 8px",
                      fontSize: "0.875rem",
                    },
                  };
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(221 83% 53%)" }} />
                <span className="text-sm">Agendado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(38 92% 50%)" }} />
                <span className="text-sm">Em Execução</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(48 96% 53%)" }} />
                <span className="text-sm">Reagendado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(142 76% 36%)" }} />
                <span className="text-sm">Finalizado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
