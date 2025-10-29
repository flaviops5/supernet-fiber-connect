// PR #22 - Types for affected customers

export interface AffectedCustomer {
  cidade: string;
  bairro: string | null;
  nome: string | null;
  cpf: string | null;
  ixc_client_id: string | null;
  last_event: string;
}
