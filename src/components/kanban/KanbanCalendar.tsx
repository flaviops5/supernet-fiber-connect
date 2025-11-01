import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const localizer = momentLocalizer(moment);

interface KanbanCalendarProps {
  boardId: string;
  startDate: string;
  endDate: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
}

export function KanbanCalendar({ boardId, startDate, endDate }: KanbanCalendarProps) {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    
    const loadEvents = async () => {
      const { data, error } = await supabase.rpc("get_installation_events", {
        p_board: boardId,
        p_start: startDate,
        p_end: endDate,
      });
      
      if (cancelled) return;
      
      if (error) {
        toast({ 
          title: "Erro ao carregar calendário", 
          description: error.message, 
          variant: "destructive" 
        });
        return;
      }
      
      setEvents(
        (data || []).map((e: any) => ({
          id: e.id,
          title: `${e.municipio || "—"} – ${e.title}`,
          start: new Date(e.data_instalacao),
          end: new Date(e.data_instalacao),
          status: e.status,
        }))
      );
    };

    loadEvents();
    
    return () => { 
      cancelled = true; 
    };
  }, [boardId, startDate, endDate, toast]);

  return (
    <div className="p-4 bg-background rounded-xl shadow border border-border">
      <h2 className="text-base font-semibold mb-3 text-foreground">📅 Agenda de Instalações</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 560 }}
        eventPropGetter={(event) => {
          const bg =
            event.status === "finalizado" ? "hsl(142 76% 36%)" :
            event.status === "em_execucao" ? "hsl(38 92% 50%)" :
            event.status === "reagendado" ? "hsl(48 96% 53%)" :
            "hsl(221 83% 53%)";
          return { 
            style: { 
              backgroundColor: bg, 
              color: "white", 
              borderRadius: 8, 
              border: "none", 
              padding: 2 
            } 
          };
        }}
      />
    </div>
  );
}
