// Helper para centralizar contexto de pane em massa (mass outage)

export const massOutageContext = {
  active: false,               // indica se há pane massiva
  lastCheck: new Date().toISOString(),
  affectedRegion: null,        // ex: "Samambaia", "Águas Claras"
  affectedCount: 0,            // número de clientes afetados
};

// Função opcional para atualizar o contexto
export function setMassOutageStatus(active: boolean, region: string | null = null, count: number = 0) {
  massOutageContext.active = active;
  massOutageContext.lastCheck = new Date().toISOString();
  massOutageContext.affectedRegion = region;
  massOutageContext.affectedCount = count;
  console.log("⚡ Mass outage atualizado:", massOutageContext);
}

