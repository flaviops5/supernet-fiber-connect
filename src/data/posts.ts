export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  content: string;
  author: string;
  datePublished: string; // ISO string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "internet-fibra-para-residencias",
    title: "Internet Fibra para Residências: o que você precisa saber",
    description: "Entenda as vantagens da internet fibra óptica para sua casa, estabilidade, velocidade e experiência de uso.",
    excerpt: "A internet fibra óptica transformou a forma como famílias consomem conteúdo, trabalham e estudam em casa...",
    content: "A internet fibra óptica transformou a rotina das famílias brasileiras. Neste artigo, vamos explicar como funciona, quais as vantagens em relação à internet via cabo ou rádio, e como escolher o plano ideal de acordo com o perfil de uso da sua casa. A tecnologia de fibra óptica utiliza pulsos de luz para transmitir dados, oferecendo velocidades muito superiores e maior estabilidade. Com a Supernet Fibra, você tem garantia de qualidade e suporte técnico especializado para manter sua conexão sempre no melhor desempenho.",
    author: "Equipe Supernet Fibra",
    datePublished: "2025-01-10T10:00:00.000Z"
  },
  {
    slug: "como-escolher-plano-de-internet",
    title: "Como escolher o melhor plano de internet para sua família",
    description: "Veja como comparar planos de internet residencial e evitar surpresas na hora de contratar.",
    excerpt: "Nem sempre o plano mais barato é o melhor. Velocidade, suporte e estabilidade contam muito na experiência do dia a dia...",
    content: "Escolher um plano de internet envolve entender o perfil de uso da sua família: streaming, jogos online, home office, aulas ao vivo e muito mais. Neste artigo, vamos mostrar como avaliar esses fatores e tomar a melhor decisão. Considere quantos dispositivos ficarão conectados simultaneamente, qual tipo de conteúdo você mais consome e se precisa de upload rápido para videoconferências. A Supernet Fibra oferece planos personalizados para cada necessidade, sempre com transparência e suporte dedicado.",
    author: "Equipe Supernet Fibra",
    datePublished: "2025-01-15T14:30:00.000Z"
  },
  {
    slug: "telemedicina-e-internet-estavel",
    title: "Telemedicina e Internet Estável: uma combinação essencial",
    description: "Saiba por que uma conexão estável é fundamental para aproveitar consultas de telemedicina com qualidade.",
    excerpt: "A telemedicina veio para ficar, mas para que ela funcione bem, a qualidade da internet é fundamental...",
    content: "Consultas de telemedicina dependem diretamente de vídeo em alta qualidade, áudio claro e estabilidade de conexão. Neste artigo, vamos explicar como a Supernet Fibra ajuda você a tirar o máximo proveito dessa tecnologia. Com a telemedicina, você pode realizar consultas médicas do conforto de casa, economizar tempo e ter acesso a especialistas de qualquer lugar. Para isso, é essencial ter uma conexão confiável que não trave durante a consulta. Nossos planos são ideais para quem precisa de estabilidade para saúde digital.",
    author: "Equipe Supernet Fibra",
    datePublished: "2025-01-20T09:15:00.000Z"
  }
];
