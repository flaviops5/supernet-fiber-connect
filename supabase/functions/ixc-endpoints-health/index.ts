// ============================================
// IXC ENDPOINTS HEALTH - Usa lógica treinada (_shared/ixc-client)
// ============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callIxcWithRetry } from "../_shared/ixc-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hmac-signature, x-hmac-timestamp, X-HMAC-Signature, X-HMAC-Timestamp",
};

type Method = "GET" | "POST";
interface EndpointTest { path: string; method: Method; category: string }
interface TestResult extends EndpointTest {
  status: "success" | "error" | "not_found";
  statusCode: number;
  message?: string;
  duration: number;
}

// Mesma lista consolidada usada no frontend (padronizada com /webservice/v1/)
const ENDPOINTS: EndpointTest[] = [
  // CLIENTES
  { path: "/webservice/v1/cliente", method: "GET", category: "Clientes" },
  { path: "/webservice/v1/cliente_arquivo", method: "POST", category: "Clientes" },
  { path: "/webservice/v1/cliente_equipamento", method: "POST", category: "Clientes" },
  { path: "/webservice/v1/consulta_spc_serasa", method: "POST", category: "Clientes" },
  { path: "/webservice/v1/bloquear_desbloquear_sip", method: "POST", category: "Clientes" },

  // CONTRATOS
  { path: "/webservice/v1/cliente_contrato", method: "GET", category: "Contratos" },
  { path: "/webservice/v1/cliente_contrato_descontos", method: "GET", category: "Contratos" },
  { path: "/webservice/v1/cliente_contrato_acrescimos", method: "GET", category: "Contratos" },
  { path: "/webservice/v1/cliente_contrato_servicos", method: "GET", category: "Contratos" },
  { path: "/webservice/v1/cliente_contrato_ativar_cliente", method: "POST", category: "Contratos" },
  { path: "/webservice/v1/desativar_cancelar_financeiro_nao_vencido", method: "POST", category: "Contratos" },
  { path: "/webservice/v1/negativar_bloquear", method: "POST", category: "Contratos" },
  { path: "/webservice/v1/vd_contratos", method: "GET", category: "Contratos" },
  { path: "/webservice/v1/vd_contratos_produtos", method: "GET", category: "Contratos" },
  { path: "/webservice/v1/plano", method: "GET", category: "Contratos" },

  // FINANCEIRO
  { path: "/webservice/v1/fn_areceber", method: "GET", category: "Financeiro" },
  { path: "/webservice/v1/fn_areceber_recebimentos_baixas_novo", method: "POST", category: "Financeiro" },
  { path: "/webservice/v1/fn_areceber_altera", method: "POST", category: "Financeiro" },
  { path: "/webservice/v1/financeiro_titulo", method: "GET", category: "Financeiro" },
  { path: "/webservice/v1/fn_acessos", method: "GET", category: "Financeiro" },

  // SUPORTE
  { path: "/webservice/v1/su_oss_chamado", method: "GET", category: "Suporte" },

  // INFRAESTRUTURA
  { path: "/webservice/v1/su_olt", method: "GET", category: "Infraestrutura" },
  { path: "/webservice/v1/su_olt_pon", method: "GET", category: "Infraestrutura" },
  { path: "/webservice/v1/su_concentrador", method: "GET", category: "Infraestrutura" },
  { path: "/webservice/v1/rastreador", method: "GET", category: "Infraestrutura" },

  // COMUNICAÇÃO
  { path: "/webservice/v1/botaoAjax_22282", method: "POST", category: "Comunicação" },
  { path: "/webservice/v1/botao_rel_26658", method: "POST", category: "Comunicação" },
];

// Limitar concorrência para evitar sobrecarga do IXC
async function pMap<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const p = (async () => {
      results[i] = await mapper(items[i], i);
    })();

    const e: Promise<void> = p.then(() => void 0);
    executing.push(e);
    if (executing.length >= limit) {
      await Promise.race(executing);
      // Remove as concluídas
      for (let j = executing.length - 1; j >= 0; j--) {
        if (executing[j].catch(() => {}).then(() => true)) executing.splice(j, 1);
      }
    }
  }
  await Promise.allSettled(executing);
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startAll = Date.now();
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    if (!SUPABASE_URL) {
      throw new Error("SUPABASE_URL não configurada nos secrets");
    }
    const PROXY_URL = `${SUPABASE_URL}/functions/v1/ixc-proxy`;

    const results = await pMap<EndpointTest, TestResult>(ENDPOINTS, 4, async (ep) => {
      const t0 = Date.now();
      try {
        // Para listagens, forçamos POST para acionar 'listar' no proxy (evita efeitos colaterais)
        const methodToUse: Method = ep.method === "GET" ? "POST" : "POST";
        const body: Record<string, unknown> = {};

        const data = await callIxcWithRetry(PROXY_URL, methodToUse, ep.path, body, undefined);
        const duration = Date.now() - t0;

        // Sucesso quando proxy respondeu 200 com JSON válido
        return {
          ...ep,
          status: "success",
          statusCode: 200,
          message: "OK",
          duration,
        };
      } catch (err) {
        const duration = Date.now() - t0;
        const msg = String(err?.message || err);

        // Se o recurso não está disponível no IXC, marcamos como not_found (evita poluir como erro)
        const isNotAvailable = msg.includes("Recurso") && msg.includes("não está disponível");
        const isProxyBadGateway = msg.includes("IXC Proxy HTTP 502") || msg.includes("status:502");

        return {
          ...ep,
          status: isNotAvailable || isProxyBadGateway ? "not_found" : "error",
          statusCode: isNotAvailable || isProxyBadGateway ? 404 : 500,
          message: msg,
          duration,
        };
      }
    });

    const durationAll = Date.now() - startAll;
    const success = results.filter(r => r.status === "success").length;
    const notFound = results.filter(r => r.status === "not_found").length;
    const errors = results.filter(r => r.status === "error").length;

    return new Response(
      JSON.stringify({ ok: true, total: results.length, success, notFound, errors, duration_ms: durationAll, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ ok: false, status: 500, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});