import { useState } from 'react';
import { Calendar, User, ArrowRight, Search, Filter, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import fiberOpticTechnology from '@/assets/fiber-optic-technology.jpg';
import internetNetworkInfrastructure from '@/assets/internet-network-infrastructure.jpg';
import heroEntertainment from '@/assets/hero-entertainment.jpg';

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const articles = [
    {
      id: 1,
      title: "História da Internet: Da ARPANET ao Mundo Conectado",
      excerpt: "Explore a fascinante evolução da internet desde suas origens militares até se tornar a rede global que conhecemos hoje. Uma jornada através do tempo que mudou o mundo para sempre.",
      content: `A internet como conhecemos hoje tem suas raízes na década de 1960, quando o Departamento de Defesa dos Estados Unidos iniciou o projeto ARPANET (Advanced Research Projects Agency Network). O objetivo era criar uma rede de comunicação descentralizada que pudesse resistir a ataques nucleares durante a Guerra Fria.

## Os Primeiros Passos (1960-1970)

Em 1969, foi estabelecida a primeira conexão entre quatro universidades americanas: UCLA, Stanford, UCSB e University of Utah. Esta rede primitiva permitia que pesquisadores compartilhassem recursos computacionais e trocassem mensagens.

## A Era dos Protocolos (1970-1990)

Durante os anos 70, foram desenvolvidos protocolos fundamentais como o TCP/IP (Transmission Control Protocol/Internet Protocol), criado por Vint Cerf e Bob Kahn. Este protocolo tornou-se o padrão universal para comunicação na internet.

Em 1973, a ARPANET fez sua primeira conexão internacional, conectando-se à University College of London. A rede começava a se expandir globalmente.

## A World Wide Web (1990s)

O marco revolucionário veio em 1990, quando Tim Berners-Lee, no CERN, criou a World Wide Web. Ele desenvolveu:
- HTML (HyperText Markup Language)
- HTTP (HyperText Transfer Protocol)  
- URLs (Uniform Resource Locators)
- O primeiro navegador web

## A Explosão Comercial (1990-2000)

Com a liberação para uso comercial em 1991, a internet experimentou um crescimento exponencial. Surgiram os primeiros provedores de internet comerciais, sites de e-commerce como Amazon (1995) e eBay (1995), e mecanismos de busca como Yahoo (1994) e Google (1998).

## A Era Moderna (2000-presente)

A chegada da banda larga revolucionou a experiência online. Surgiram redes sociais como MySpace (2003) e Facebook (2004), plataformas de vídeo como YouTube (2005), e a computação em nuvem transformou como armazenamos e acessamos dados.

Hoje, com mais de 5 bilhões de usuários conectados, a internet continua evoluindo com tecnologias como:
- Internet das Coisas (IoT)
- Inteligência Artificial
- Realidade Virtual e Aumentada
- 5G e conectividade ultra-rápida

A internet transformou completamente nossa sociedade, economia e cultura, conectando pessoas ao redor do mundo de maneiras que eram inimagináveis há apenas algumas décadas.`,
      author: "Equipe SUPERNET",
      publishDate: "15 de Setembro, 2024",
      category: "Tecnologia",
      readTime: "8 min",
      image: internetNetworkInfrastructure,
      featured: true
    },
    {
      id: 2,
      title: "O que é Fibra Óptica: A Tecnologia que Revoluciona a Internet",
      excerpt: "Descubra como a fibra óptica funciona e por que ela representa o futuro das telecomunicações. Velocidade da luz, literalmente.",
      content: `A fibra óptica representa uma das maiores revoluções tecnológicas das telecomunicações modernas. Esta tecnologia utiliza filamentos extremamente finos de vidro ou plástico para transmitir dados usando pulsos de luz, proporcionando velocidades e qualidades de conexão incomparáveis.

## Como Funciona a Fibra Óptica

### Estrutura Básica
A fibra óptica é composta por três elementos principais:
- **Núcleo (Core)**: Filamento central de vidro ultrapuro onde a luz viaja
- **Revestimento (Cladding)**: Camada que envolve o núcleo, refletindo a luz de volta
- **Capa Protetora**: Proteção externa contra danos físicos

### Princípio da Reflexão Total
A transmissão de dados ocorre através do princípio da reflexão interna total. A luz viaja pelo núcleo "ricocheteando" nas paredes do revestimento, mantendo o sinal íntegro por longas distâncias.

## Vantagens da Fibra Óptica

### 1. Velocidade Incomparável
- Transmissão na velocidade da luz (299.792.458 m/s)
- Velocidades de até 100 Gbps ou mais
- Latência ultra-baixa (menos de 1ms)

### 2. Capacidade de Banda
- Suporte a múltiplas transmissões simultâneas
- Escalabilidade para futuras demandas
- Sem degradação significativa da qualidade

### 3. Resistência a Interferências
- Imune a interferências eletromagnéticas
- Não sofre com variações climáticas
- Sinal estável independente da distância

### 4. Segurança
- Difícil interceptação de dados
- Detecção imediata de tentativas de violação
- Transmissão mais segura que cabos de cobre

## Tipos de Fibra Óptica

### Fibra Monomodo (Single-Mode)
- Núcleo mais fino (8-10 micrômetros)
- Transmissão de longa distância
- Maior velocidade e qualidade

### Fibra Multimodo (Multi-Mode)
- Núcleo mais espesso (50-62,5 micrômetros)
- Ideal para curtas distâncias
- Mais econômica para redes locais

## FTTH: Fibra até sua Casa

O FTTH (Fiber To The Home) representa a implementação mais avançada da tecnologia de fibra óptica, levando a fibra diretamente até a residência do usuário.

### Benefícios do FTTH:
- Velocidades simétricas (upload = download)
- Qualidade constante 24/7
- Suporte a múltiplos dispositivos
- Preparação para tecnologias futuras

## Aplicações Modernas

### Residencial
- Internet de alta velocidade
- Streaming em 4K/8K
- Gaming online sem lag
- Smart homes e IoT

### Empresarial
- Videoconferências em alta qualidade
- Backup em nuvem instantâneo
- Aplicações em tempo real
- Trabalho remoto eficiente

## O Futuro da Fibra Óptica

A tecnologia continua evoluindo com:
- **Fibras espaciais**: Múltiplos núcleos em uma única fibra
- **Multiplexação avançada**: Mais dados na mesma fibra
- **Integração com 5G**: Backbone para redes móveis
- **Computação quântica**: Transmissão de qubits

## Por que Escolher Fibra Óptica?

Na SUPERNET FIBRA, utilizamos 100% tecnologia de fibra óptica porque acreditamos que nossos clientes merecem:
- A melhor experiência de internet disponível
- Conexão preparada para o futuro
- Estabilidade e confiabilidade máximas
- Suporte a todas as tecnologias modernas

A fibra óptica não é apenas uma escolha técnica superior – é um investimento no futuro digital da sua família ou empresa.`,
      author: "Dr. João Silva",
      publishDate: "12 de Setembro, 2024",
      category: "Educacional",
      readTime: "12 min",
      image: fiberOpticTechnology,
      featured: true
    },
    {
      id: 3,
      title: "O que é Internet: Fundamentos da Rede Mundial",
      excerpt: "Compreenda os conceitos fundamentais da internet, desde protocolos básicos até como sua conexão chega até sua casa.",
      content: `A internet é muito mais do que apenas "navegar na web" ou usar redes sociais. É uma infraestrutura global complexa que conecta bilhões de dispositivos ao redor do mundo, permitindo a troca instantânea de informações.

## Definição Técnica

A internet é uma rede de redes interconectadas que utiliza protocolos padronizados para permitir a comunicação entre dispositivos em escala global. É uma infraestrutura descentralizada que não pertence a nenhuma organização específica.

## Como a Internet Funciona

### 1. Protocolos de Comunicação

#### TCP/IP (Transmission Control Protocol/Internet Protocol)
- **TCP**: Garante que os dados sejam entregues corretamente
- **IP**: Define como os dados são roteados pela rede
- Conjunto de regras que todos os dispositivos seguem

#### DNS (Domain Name System)
- Traduz nomes de domínio (google.com) em endereços IP
- Sistema hierárquico distribuído globalmente
- Essencial para a navegação amigável na web

### 2. Infraestrutura Física

#### Cabos Submarinos
- Conectam continentes através dos oceanos
- Transportam mais de 95% do tráfego internacional
- Fibra óptica de alta capacidade

#### Pontos de Troca de Tráfego (IXPs)
- Locais onde diferentes redes se conectam
- Otimizam rotas de dados
- Reduzem latência e custos

#### Data Centers
- Armazenam servidores e dados
- Processam bilhões de requisições diariamente
- Distribuídos globalmente para melhor performance

## Tipos de Conexão à Internet

### 1. Dial-up (Discada)
- Tecnologia obsoleta
- Velocidade máxima: 56 Kbps
- Utilizava linhas telefônicas

### 2. ADSL (Asymmetric Digital Subscriber Line)
- Usa infraestrutura telefônica
- Velocidades assimétricas
- Download maior que upload

### 3. Cabo Coaxial
- Utiliza rede de TV a cabo
- Velocidades moderadas a altas
- Compartilhada com vizinhança

### 4. Fibra Óptica
- Tecnologia mais avançada
- Velocidades simétricas ultra-altas
- Melhor qualidade e estabilidade

### 5. Conexões Móveis
- **3G/4G/5G**: Tecnologias celulares
- **Satélite**: Para áreas remotas
- **Wi-Fi**: Conexão local sem fio

## Componentes da Internet

### ISPs (Provedores de Serviço de Internet)
- Empresas que fornecem acesso à internet
- Diferentes níveis (Tier 1, 2 e 3)
- Conectam usuários finais à rede global

### Servidores Web
- Computadores que hospedam websites
- Respondem a requisições dos usuários
- Distribuídos globalmente (CDNs)

### Roteadores
- Direcionam dados pela rede
- Determinam a melhor rota
- Essenciais para o funcionamento da internet

## Protocolos Importantes

### HTTP/HTTPS
- **HTTP**: Protocolo de transferência de hipertexto
- **HTTPS**: Versão segura com criptografia
- Base da World Wide Web

### SMTP/POP3/IMAP
- Protocolos para e-mail
- **SMTP**: Envio de mensagens
- **POP3/IMAP**: Recebimento de mensagens

### FTP
- Transferência de arquivos
- Upload e download de dados
- Ainda usado em aplicações específicas

## A Internet no Brasil

### Marco Civil da Internet (2014)
- Lei que regula o uso da internet no Brasil
- Estabelece direitos e deveres
- Princípios de neutralidade da rede

### Infraestrutura Nacional
- Cabos submarinos conectam o Brasil ao mundo
- PTTs (Pontos de Troca de Tráfego) em principais cidades
- Expansão contínua da fibra óptica

## Conceitos Importantes

### Largura de Banda
- Capacidade máxima de transmissão
- Medida em bits por segundo (bps)
- Determina velocidade da conexão

### Latência
- Tempo que dados levam para viajar
- Medida em milissegundos (ms)
- Crucial para jogos e videoconferências

### Throughput
- Taxa real de transferência de dados
- Pode ser menor que a largura de banda
- Afetado por congestionamento da rede

### Upload vs Download
- **Download**: Receber dados da internet
- **Upload**: Enviar dados para a internet
- Importante para trabalho remoto e criação de conteúdo

## Segurança na Internet

### Criptografia
- Proteção de dados em trânsito
- HTTPS, VPNs, SSL/TLS
- Essencial para privacidade

### Firewalls
- Filtram tráfego de rede
- Bloqueiam acessos não autorizados
- Primeira linha de defesa

### Antivírus e Anti-malware
- Protegem contra software malicioso
- Escaneiam arquivos e conexões
- Atualizações constantes necessárias

## O Futuro da Internet

### Internet das Coisas (IoT)
- Dispositivos conectados em massa
- Casa inteligente, cidades inteligentes
- Novos desafios de segurança e privacidade

### IPv6
- Nova versão do protocolo IP
- Mais endereços disponíveis
- Melhor suporte para dispositivos móveis

### Internet Quântica
- Comunicação ultra-segura
- Velocidades impossíveis hoje
- Ainda em desenvolvimento

### 5G e Além
- Conectividade móvel ultra-rápida
- Latência quase zero
- Novas aplicações possíveis

## Por que Qualidade Importa

Na SUPERNET FIBRA, entendemos que a internet não é apenas sobre velocidade – é sobre:
- **Estabilidade**: Conexão confiável 24/7
- **Qualidade**: Baixa latência e jitter
- **Capacidade**: Suporte a múltiplos dispositivos
- **Futuro**: Tecnologia preparada para evolução

A internet transformou nossa sociedade e continua evoluindo. Escolher o provedor certo significa investir no seu futuro digital.`,
      author: "Prof. Maria Tecnologia",
      publishDate: "10 de Setembro, 2024",
      category: "Educacional",
      readTime: "15 min",
      image: internetNetworkInfrastructure,
      featured: false
    }
  ];

  const categories = ['Todos', 'Tecnologia', 'Educacional', 'Dicas', 'Novidades'];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticles = articles.filter(article => article.featured);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-hero text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-varela uppercase mb-6">
            Blog{' '}
            <span className="text-orange">SUPERNET</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            Conteúdo exclusivo sobre tecnologia, internet e inovação. 
            Fique por dentro das últimas tendências do mundo digital.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Search and Filter */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar artigos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold font-varela uppercase text-foreground mb-8 text-center">
              Artigos em{' '}
              <span className="gradient-text">Destaque</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {featuredArticles.map(article => (
                <div key={article.id} className="bg-card rounded-2xl overflow-hidden shadow-elegant hover:shadow-glow transition-all duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                        Destaque
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                        {article.category}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{article.publishDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{article.readTime}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold font-varela uppercase text-foreground mb-3 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{article.author}</span>
                      </div>
                      <Button variant="ghost" className="text-primary hover:text-primary/80">
                        Ler mais <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Articles */}
        <section>
          <h2 className="text-3xl font-bold font-varela uppercase text-foreground mb-8 text-center">
            Todos os{' '}
            <span className="gradient-text">Artigos</span>
          </h2>
          
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                Nenhum artigo encontrado com os critérios selecionados.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {filteredArticles.map(article => (
                <div key={article.id} className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-card transition-all duration-300">
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    {article.featured && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                          Destaque
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-3">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                        {article.category}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{article.publishDate}</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold font-varela uppercase text-foreground mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{article.readTime}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs">
                        Ler mais <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Newsletter Signup */}
        <section className="mt-20 py-16 bg-gradient-hero rounded-2xl text-white text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl font-bold font-varela uppercase mb-4">
              Fique por dentro das novidades
            </h2>
            <p className="text-white/90 mb-8">
              Receba conteúdo exclusivo sobre tecnologia, dicas de internet 
              e as últimas novidades da SUPERNET FIBRA direto no seu e-mail.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Seu melhor e-mail"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
              />
              <Button className="bg-white text-primary hover:bg-white/90">
                Assinar Blog
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Blog;