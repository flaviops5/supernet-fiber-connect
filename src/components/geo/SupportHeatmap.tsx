// >>> PR10B: SupportHeatmap
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { useMemo } from "react";

type Point = {
  lat: number;
  lng: number;
  label: string;
  total: number;
  tickets: number;
  rxCrit: number;
  severity: number; // 0..1
};

type Props = {
  points: Point[];
};

const DF_CENTER = { lat: -15.793889, lng: -47.882778 }; // Plano Piloto

export default function SupportHeatmap({ points }: Props) {
  const items = useMemo(() => points ?? [], [points]);

  return (
    <div className="w-full h-[520px] rounded-xl overflow-hidden border">
      <MapContainer
        center={DF_CENTER}
        zoom={11}
        scrollWheelZoom
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items.map((p, idx) => {
          const radius = 10 + Math.min(30, Math.round(p.severity * 30));
          const color = p.rxCrit > 0 ? "#ef4444" : p.tickets > 0 ? "#f97316" : "#3b82f6";
          const fillOpacity = 0.15 + p.severity * 0.35;

          return (
            <CircleMarker
              key={idx}
              center={[p.lat, p.lng]}
              color={color}
              fillColor={color}
              radius={radius}
              weight={2}
              fillOpacity={fillOpacity}
              className="animate-pulse"
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent={false}>
                <div className="text-xs">
                  <div className="font-semibold">{p.label}</div>
                  <div>Atendimentos: {p.total}</div>
                  <div>Tickets: {p.tickets}</div>
                  <div>RX crítico: {p.rxCrit}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
// <<< PR10B
