/**
 * Diagnostic Types
 * Tipos para diagnóstico de clientes e equipamentos
 */

export type DiagnosticoStatus = 'online' | 'offline' | 'instavel' | 'desconhecido';

export type SignalQuality = 'excelente' | 'bom' | 'regular' | 'ruim';

export interface ClienteDiagnostico {
  cliente_encontrado: boolean;
  dados_basicos?: {
    id: string;
    razao: string;
    cnpj_cpf: string;
    status: string;
  };
  status_online?: {
    is_online: boolean;
    registros: Array<Record<string, unknown>>;
  };
  contratos?: {
    total: number;
    contratos: Array<Record<string, unknown>>;
  };
  titulos?: {
    total: number;
    em_aberto: number;
    vencidos: number;
    valor_total_atraso: number;
    titulos_vencidos: Array<Record<string, unknown>>;
  };
  resumo: {
    clienteEncontrado: boolean;
    isOnline: boolean;
    temContratos: boolean;
    temAtraso: boolean;
    titulosVencidos: number;
    diasAtrasoMaisAntigo: number;
    valorTotalAtraso: number;
    estaBloqueado: boolean;
    estaComReducao: boolean;
    politicaBloqueio: {
      tipo: string;
      detalhes: string;
    };
    inconsistencias: string[];
  };
}

export interface ONUSignalDiagnostic {
  ont_id: string;
  serial: string;
  rx_power?: number;
  tx_power?: number;
  distance?: number;
  status: 'online' | 'offline';
  last_seen?: string;
  quality: SignalQuality;
  issues: string[];
  recommendations: string[];
}

export interface EquipmentDiagnostic {
  equipment_id: string;
  type: 'onu' | 'radio' | 'router' | 'unknown';
  status: DiagnosticoStatus;
  connectivity: {
    ping: boolean;
    last_online?: string;
    uptime?: number;
  };
  performance: {
    signal?: number;
    latency?: number;
    packet_loss?: number;
  };
}
