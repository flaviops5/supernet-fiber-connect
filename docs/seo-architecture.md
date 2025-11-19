# Arquitetura Visual — Sistema SEO & AEO

## 1. Arquitetura do Sistema de SEO

```mermaid
graph TD
    A[Página de Plano/Serviço] --> B{Tipo de Conteúdo}
    B -->|Plano| C[PlanSEOBlock]
    B -->|Serviço| D[ServiceSEOBlock]
    
    C --> E[getPlanConfig]
    D --> F[getServiceConfig]
    
    E --> G[PLANS Data]
    F --> H[SERVICES Data]
    
    C --> I[SEO Component]
    C --> J[OrganizationSchema]
    C --> K[ProductSchema]
    
    D --> I
    D --> J
    D --> L[ServiceSchema]
    
    I --> M[HTML Head]
    J --> M
    K --> M
    L --> M
    
    M --> N[Google/Bing/Meta AI]
```

## 2. Fluxo de Dados - SEO Blocks

```mermaid
sequenceDiagram
    participant Page as Página
    participant Block as SEOBlock
    participant Helper as Helper Function
    participant Data as Data Source
    participant SEO as SEO Components
    participant Head as HTML Head
    
    Page->>Block: serviceId ou planId
    Block->>Helper: getConfig(id)
    Helper->>Data: find(id)
    Data-->>Helper: config
    Helper-->>Block: config
    
    Block->>SEO: config.title, description, etc
    SEO->>Head: <title>, <meta>, JSON-LD
    Head-->>Page: SEO otimizado
```

## 3. Estrutura de Dados

```mermaid
classDiagram
    class PlanConfig {
        +string id
        +string path
        +string title
        +string description
        +number price
        +string schemaName
    }
    
    class ServiceConfig {
        +string id
        +string path
        +string title
        +string description
        +string schemaName
    }
    
    class SEOProps {
        +string title
        +string description
        +string? canonical
        +string? ogImage
        +boolean? noindex
    }
    
    class ProductSchemaProps {
        +string name
        +string description
        +number price
        +string? currency
    }
    
    class ServiceSchemaProps {
        +string name
        +string description
    }
    
    PlanConfig --> SEOProps
    PlanConfig --> ProductSchemaProps
    ServiceConfig --> SEOProps
    ServiceConfig --> ServiceSchemaProps
```

## 4. API Content Flow

```mermaid
graph LR
    A[AI Engine] -->|GET /api/content/:slug| B[Edge Function]
    B --> C{Validar Slug}
    C -->|Inválido| D[400 Error]
    C -->|Válido| E{Buscar em PLANS}
    E -->|Encontrado| F[Retornar Plan Data]
    E -->|Não encontrado| G{Buscar em SERVICES}
    G -->|Encontrado| H[Retornar Service Data]
    G -->|Não encontrado| I[404 Error]
    
    F --> J[JSON Response]
    H --> J
    D --> J
    I --> J
    J --> A
```

## 5. Fluxo de Requisição AEO API

```mermaid
sequenceDiagram
    participant AI as AI Engine
    participant API as Edge Function
    participant Zod as Validator
    participant Plans as PLANS
    participant Services as SERVICES
    
    AI->>API: GET /api/content/residenciais
    API->>Zod: validate(slug)
    Zod-->>API: validated
    
    API->>Plans: getPlanConfig("residenciais")
    Plans-->>API: config found
    
    API->>API: Build response
    API-->>AI: 200 JSON {success: true, data: {...}}
    
    Note over AI,API: Se não encontrado em PLANS
    API->>Services: getServiceConfig(slug)
    Services-->>API: config or undefined
    
    alt Config não encontrado
        API-->>AI: 404 {success: false}
    end
```

## 6. Componentes e Dependências

```mermaid
graph TB
    subgraph "Data Layer"
        A[plans.ts]
        B[services.ts]
    end
    
    subgraph "Utils Layer"
        C[getPlanConfig.ts]
        D[getServiceConfig.ts]
    end
    
    subgraph "Components Layer"
        E[PlanSEOBlock.tsx]
        F[ServiceSEOBlock.tsx]
        G[SEO.tsx]
    end
    
    subgraph "Schemas Layer"
        H[OrganizationSchema.tsx]
        I[ProductSchema.tsx]
        J[ServiceSchema.tsx]
    end
    
    subgraph "API Layer"
        K[Edge Function /content]
    end
    
    A --> C
    B --> D
    C --> E
    D --> F
    E --> G
    F --> G
    E --> H
    E --> I
    F --> H
    F --> J
    
    A --> K
    B --> K
    C --> K
    D --> K
```

## 7. Schema JSON-LD - Hierarquia

```mermaid
graph TD
    A[Organization Schema] --> B[Supernet Fibra]
    B --> C{Tipo de Produto/Serviço}
    
    C -->|Plano| D[Product Schema]
    C -->|Serviço| E[Service Schema]
    
    D --> F[Offer]
    F --> G[Price]
    F --> H[Currency: BRL]
    F --> I[Availability: InStock]
    
    E --> J[Provider]
    J --> K[Organization: Supernet Fiber]
```

## 8. Integração com Mecanismos de Busca

```mermaid
graph LR
    A[HTML Page] --> B[SEO Tags]
    A --> C[JSON-LD Schemas]
    
    B --> D[Google Search]
    B --> E[Bing]
    B --> F[Social Media]
    
    C --> G[Google SGE]
    C --> H[Meta AI]
    C --> I[Perplexity]
    C --> J[ChatGPT]
    
    K[API /content] --> G
    K --> H
    K --> I
    K --> J
    
    style D fill:#4285f4
    style G fill:#4285f4
    style H fill:#0668e1
    style I fill:#20808d
    style J fill:#10a37f
```
