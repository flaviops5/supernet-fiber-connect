export interface PlanConfig {
  id: string;
  path: string;
  title: string;
  description: string;
  price: number;
  schemaName: string;
}

export const PLANS: PlanConfig[] = [
  {
    id: "residenciais",
    path: "/planos/residenciais",
    title: "Planos Residenciais – Internet Fibra Supernet",
    description: "Conheça os planos de internet residencial Supernet com velocidades de 300 a 700 megas.",
    price: 99.90,
    schemaName: "Plano Residencial Supernet"
  },
  {
    id: "empresariais",
    path: "/planos/empresariais",
    title: "Planos Empresariais – Internet Profissional Supernet",
    description: "Internet empresarial com alta disponibilidade, estabilidade e suporte local imediato.",
    price: 149.90,
    schemaName: "Plano Empresarial Supernet"
  },
  {
    id: "monitoramento",
    path: "/planos/monitoramento",
    title: "Planos com Monitoramento – Supernet Fiber",
    description: "Internet com monitoramento inteligente e suporte 24h integrado.",
    price: 159.90,
    schemaName: "Plano com Monitoramento Supernet"
  },
  {
    id: "streaming",
    path: "/planos/streaming",
    title: "Planos com Streaming – Supernet Fiber",
    description: "Internet fibra com estabilidade para Netflix, YouTube e plataformas de streaming.",
    price: 139.90,
    schemaName: "Plano com Streaming Supernet"
  },
  {
    id: "telemedicina",
    path: "/planos/telemedicina",
    title: "Planos com Telemedicina – Atendimento Saúde 24h",
    description: "Planos de internet com telemedicina integrada e atendimento médico digital 24h.",
    price: 169.90,
    schemaName: "Plano com Telemedicina Supernet"
  }
];
