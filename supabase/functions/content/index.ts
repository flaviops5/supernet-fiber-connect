import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const PLANS = [
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

const SERVICES = [
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

const slugSchema = z.object({
  slug: z.string().min(1, "Slug é obrigatório")
});

type ContentType = "plan" | "service";

interface BaseContentData {
  type: ContentType;
  slug: string;
  title: string;
  description: string;
  category: "planos" | "servicos";
  schemaType: "Product" | "Service";
  metadata: {
    path: string;
    provider: string;
  };
}

interface PlanContentData extends BaseContentData {
  type: "plan";
  schemaType: "Product";
  price: number;
}

interface ServiceContentData extends BaseContentData {
  type: "service";
  schemaType: "Service";
}

type ContentData = PlanContentData | ServiceContentData;

interface SuccessResponse {
  success: true;
  data: ContentData;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ApiResponse = SuccessResponse | ErrorResponse;

function getPlanConfig(id: string) {
  return PLANS.find((plan) => plan.id === id);
}

function getServiceConfig(id: string) {
  return SERVICES.find((service) => service.id === id);
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    const errorResponse: ApiResponse = {
      success: false,
      error: "METHOD_NOT_ALLOWED"
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const slug = url.pathname.split("/").pop() || "";

    const parseResult = slugSchema.safeParse({ slug });

    if (!parseResult.success) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "INVALID_SLUG"
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { slug: validatedSlug } = parseResult.data;

    // Primeiro tenta como plano
    const planConfig = getPlanConfig(validatedSlug);
    if (planConfig) {
      const data: PlanContentData = {
        type: "plan",
        slug: validatedSlug,
        title: planConfig.title,
        description: planConfig.description,
        category: "planos",
        schemaType: "Product",
        price: planConfig.price,
        metadata: {
          path: planConfig.path,
          provider: "Supernet Fibra"
        }
      };

      const successResponse: ApiResponse = {
        success: true,
        data
      };

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Depois tenta como serviço
    const serviceConfig = getServiceConfig(validatedSlug);
    if (serviceConfig) {
      const data: ServiceContentData = {
        type: "service",
        slug: validatedSlug,
        title: serviceConfig.title,
        description: serviceConfig.description,
        category: "servicos",
        schemaType: "Service",
        metadata: {
          path: serviceConfig.path,
          provider: "Supernet Fibra"
        }
      };

      const successResponse: ApiResponse = {
        success: true,
        data
      };

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Não encontrado
    const errorResponse: ApiResponse = {
      success: false,
      error: "CONTENT_NOT_FOUND"
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 404,
      headers: corsHeaders,
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      success: false,
      error: "INTERNAL_SERVER_ERROR"
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
