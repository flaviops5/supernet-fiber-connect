export interface ServiceConfig {
  id: string;
  path: string;
  title: string;
  description: string;
  schemaName: string;
}

export const SERVICES: ServiceConfig[] = [
  {
    id: "energia",
    path: "/servicos/energia",
    title: "Energia por Assinatura – Supernet Fiber",
    description: "Serviço de energia por assinatura com economia, sustentabilidade e tecnologia inteligente.",
    schemaName: "Energia por Assinatura"
  },
  {
    id: "automacao-residencial",
    path: "/servicos/automacao-residencial",
    title: "Automação Residencial – Supernet Fiber",
    description: "Automação completa para residências com controle inteligente, segurança e eficiência.",
    schemaName: "Automação Residencial"
  },
  {
    id: "monitoramento-residencial",
    path: "/servicos/monitoramento-residencial",
    title: "Monitoramento Residencial – Supernet Fiber",
    description: "Monitoramento completo da sua casa com câmeras HD e equipe 24h.",
    schemaName: "Monitoramento Residencial"
  },
  {
    id: "monitoramento-veicular",
    path: "/servicos/monitoramento-veicular",
    title: "Monitoramento Veicular – Supernet Fiber",
    description: "Localização e rastreamento veicular com precisão e segurança.",
    schemaName: "Monitoramento Veicular"
  },
  {
    id: "super-ze",
    path: "/servicos/super-ze",
    title: "Super Zé – Assistência Técnica Supernet",
    description: "Suporte técnico para sua casa ou empresa com atendimento especializado.",
    schemaName: "Super Zé"
  },
  {
    id: "telemedicina",
    path: "/servicos/telemedicina",
    title: "Telemedicina – Atendimento Médico Digital Supernet",
    description: "Atendimento médico digital 24h para você e sua família.",
    schemaName: "Telemedicina Supernet"
  },
  {
    id: "sos-empresarial",
    path: "/servicos/sos-empresarial",
    title: "SOS Empresarial – Supernet Fiber",
    description: "Atendimento emergencial rápido e solução técnica imediata para empresas.",
    schemaName: "SOS Empresarial"
  },
  {
    id: "cabeamento-estruturado",
    path: "/servicos/cabeamento-estruturado",
    title: "Cabeamento Estruturado – Supernet Fiber",
    description: "Projeto e instalação de cabeamento estruturado profissional para empresas.",
    schemaName: "Cabeamento Estruturado"
  },
  {
    id: "redes-wifi",
    path: "/servicos/redes-wifi",
    title: "Redes Wi-Fi – Supernet Fiber",
    description: "Instalação e otimização de redes Wi-Fi para residências e empresas.",
    schemaName: "Redes Wi-Fi"
  },
  {
    id: "eventos",
    path: "/servicos/eventos",
    title: "Internet para Eventos – Supernet Fiber",
    description: "Conexão de alta performance para eventos, feiras, shows e conferências.",
    schemaName: "Internet para Eventos"
  },
  {
    id: "ia",
    path: "/servicos/ia",
    title: "IA – Soluções Inteligentes Supernet",
    description: "Soluções de inteligência artificial aplicadas ao dia a dia e negócios.",
    schemaName: "IA – Soluções Inteligentes"
  }
];
