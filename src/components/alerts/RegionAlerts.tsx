// >>> PR10B: RegionAlerts
type RegionAgg = {
  key: string;
  cidade: string;
  bairro: string | null;
  totalCount: number;
  tickets: number;
  rxCrit: number;
};

type Props = { regions: RegionAgg[] };

export default function RegionAlerts({ regions }: Props) {
  // Regras simples (pode calibrar):
  // - RX crítico >= 5 no período → alerta vermelho
  // - Tickets >= 8 → alerta laranja
  // - Crescimento totalCount >= 50% vs média → alerta amarelo (placeholder simples)

  const top = [...regions]
    .sort((a, b) => (b.rxCrit - a.rxCrit) || (b.tickets - a.tickets) || (b.totalCount - a.totalCount))
    .slice(0, 6);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {top.map((r) => {
        const red = r.rxCrit >= 5;
        const orange = !red && r.tickets >= 8;
        const badge = red ? "bg-red-500" : orange ? "bg-orange-500" : "bg-yellow-500";
        const label = red ? "RX crítico" : orange ? "Tickets altos" : "Volume alto";

        return (
          <div key={r.key} className="rounded-lg border p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{r.cidade}{r.bairro ? ` — ${r.bairro}` : ""}</div>
              <div className="text-xs text-muted-foreground">
                Atend: {r.totalCount} · Tickets: {r.tickets} · RX crit: {r.rxCrit}
              </div>
            </div>
            <span className={`text-xs text-white px-2 py-1 rounded ${badge} animate-pulse`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
// <<< PR10B
