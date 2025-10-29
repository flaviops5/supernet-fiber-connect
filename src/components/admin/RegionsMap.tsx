// PR #25 — Mapa de regiões com clusters e error handling robusto

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { DF_CENTER, DF_DEFAULT_ZOOM, MAP_CONFIG } from "@/lib/geo-constants";
import type { RegionKPI, MapPoint } from "@/types/geo.types";
import { Loader2, AlertCircle, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import "leaflet/dist/leaflet.css";

export function RegionsMap() {
  const [data, setData] = useState<RegionKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRegions() {
    try {
      setError(null);
      
      const { data: regions, error: queryError } = await supabase
        .from("kpi_regions_last_24h")
        .select("*");

      if (queryError) throw queryError;

      setData(regions || []);
      
      // Log regiões sem coordenadas para debug
      const missingCoords = (regions || []).filter(r => !r.lat || !r.lng);
      if (missingCoords.length > 0) {
        console.warn(
          `[RegionsMap] ${missingCoords.length} regiões sem coordenadas:`,
          missingCoords.map(r => `${r.cidade}${r.bairro ? ` - ${r.bairro}` : ''}`)
        );
      }
    } catch (err) {
      console.error("[RegionsMap] Erro ao carregar regiões:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar mapa");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRegions();

    // Auto-refresh a cada 60 segundos
    const interval = setInterval(loadRegions, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Processar dados para pontos do mapa
  const mapPoints: MapPoint[] = useMemo(() => {
    return data
      .filter(r => r.lat !== null && r.lng !== null)
      .map(r => ({
        position: [Number(r.lat), Number(r.lng)] as [number, number],
        label: `${r.cidade}${r.bairro ? ` — ${r.bairro}` : ''}`,
        incidents: r.total_incidents,
        criticalRx: r.critical_rx,
        tickets: r.tickets,
        lastEvent: new Date(r.last_event),
        isCritical: r.critical_rx >= 3
      }));
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando mapa de regiões...</span>
        </div>
        <Skeleton className="h-[420px] w-full rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar mapa: {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (mapPoints.length === 0) {
    return (
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          Nenhum incidente nas últimas 24h para exibir no mapa.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <MapContainer
        center={[DF_CENTER.lat, DF_CENTER.lng]}
        zoom={DF_DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: 420, width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution={MAP_CONFIG.attribution}
          url={MAP_CONFIG.tileUrl}
          maxZoom={MAP_CONFIG.maxZoom}
          minZoom={MAP_CONFIG.minZoom}
        />
        
        {mapPoints.map((point, idx) => {
          // Calcular raio baseado em incidentes (min 8, max 32)
          const radius = Math.min(Math.max(8, 8 + point.incidents * 1.5), 32);
          
          // Cores baseadas em criticidade
          const color = point.isCritical ? "#ef4444" : "#3b82f6";
          const fillColor = point.isCritical ? "#fee2e2" : "#dbeafe";
          
          return (
            <CircleMarker
              key={idx}
              center={point.position}
              radius={radius}
              pathOptions={{
                color,
                fillColor,
                fillOpacity: 0.6,
                weight: 2
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -10]}
                opacity={0.95}
                className="rounded-lg shadow-lg"
              >
                <div className="text-xs space-y-1 min-w-[200px]">
                  <div className="font-semibold text-sm border-b pb-1 mb-1">
                    {point.label}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <span className="text-muted-foreground">Incidentes:</span>
                    <span className="font-medium">{point.incidents}</span>
                    
                    <span className="text-muted-foreground">RX crítico:</span>
                    <span className={point.criticalRx > 0 ? "font-medium text-red-600" : ""}>
                      {point.criticalRx}
                    </span>
                    
                    <span className="text-muted-foreground">Tickets:</span>
                    <span className="font-medium">{point.tickets}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-1 border-t">
                    Último: {point.lastEvent.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      <div className="p-3 bg-muted/50 border-t text-xs text-muted-foreground flex items-center justify-between">
        <span>{mapPoints.length} regiões com atividade (24h)</span>
        <span>🔴 Crítico: RX ≥ 3 | 🔵 Normal</span>
      </div>
    </div>
  );
}
