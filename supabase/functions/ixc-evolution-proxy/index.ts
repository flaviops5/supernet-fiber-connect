// ========================================================
// 🚀 Supabase Function: IXC + Evolution Proxy (Enhanced)
// Autor: Flavio Vicente (Supernet Fibra)
// Melhorias: Timeout, Backoff, Validação, Logs Seguros
// ========================================================

import { createPublicHandler } from "../_shared/base-handler.ts";


// ====================================================
// 🛡️ WHITELIST DE ENDPOINTS PERMITIDOS
// ====================================================
const ALLOWED_IXC_ENDPOINTS = [
  'webservice/v1/assunto',
  'webservice/v1/cliente',
  'webservice/v1/fn_areceber',
  'webservice/v1/cliente_contrato',
  'webservice/v1/su_oss_chamado',
];

// ====================================================
// 🔧 UTILITÁRIO: Promise com Timeout
// ====================================================
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ====================================================
// 🔧 UTILITÁRIO: Sleep para Backoff
// ====================================================
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(createPublicHandler('ixc-evolution-proxy', async (req) => {
  const start = performance.now();

    // ====================================================
    // 🔐 CONFIGURAÇÕES DO IXC
    // ====================================================
    const IXC_API_URL = Deno.env.get("IXC_API_BASE_URL");
    const IXC_API_USERNAME = Deno.env.get("IXC_API_USERNAME");
    const IXC_API_PASSWORD = Deno.env.get("IXC_API_PASSWORD");

    // ====================================================
    // 🔐 CONFIGURAÇÕES DO EVOLUTION
    // ====================================================
    const EVO_URL = Deno.env.get("EVOLUTION_API_BASE_URL") || "https://evo.rodolforomao.com.br";
    const EVO_INSTANCE = "SDR2"; // Hardcoded - sempre SDR2
    const EVO_PHONE = Deno.env.get("EVOLUTION_PHONE_NUMBER") || "5561933008252";
    const EVO_APIKEY = Deno.env.get("EVOLUTION_API_KEY");

    // ====================================================
    // ✅ VALIDAÇÃO DE SECRETS
    // ====================================================
    if (!IXC_API_URL || !IXC_API_USERNAME || !IXC_API_PASSWORD) {
      throw new Error("Configuração do IXC ausente. Verifique variáveis de ambiente.");
    }

    if (!EVO_APIKEY) {
      throw new Error("Configuração da Evolution ausente. Verifique EVOLUTION_API_KEY.");
    }

    // ====================================================
    // 🔧 FUNÇÃO: Fetch IXC com Retry + Backoff + Timeout
    // ====================================================
    async function fetchIXC(endpoint: string) {
      // 🛡️ Validação de endpoint (whitelist)
      if (!ALLOWED_IXC_ENDPOINTS.includes(endpoint)) {
        throw new Error(`Endpoint não permitido: ${endpoint}`);
      }

      const url = `${IXC_API_URL!.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
      const headers = {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${IXC_API_USERNAME}:${IXC_API_PASSWORD}`),
      };

      let lastError = "";

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // ⏱️ Exponential backoff (0s, 1s, 2s)
          if (attempt > 1) {
            const backoffMs = 1000 * (attempt - 1);
            console.log(`⏳ Aguardando ${backoffMs}ms antes da tentativa ${attempt}...`);
            await sleep(backoffMs);
          }

          console.log(`🔄 Tentativa ${attempt}/3: ${url}`);

          // 🚀 Fetch com timeout de 10s
          const res = await withTimeout(
            fetch(url, { headers }),
            10000
          );

          const text = await res.text();

          if (!res.ok) {
            lastError = `IXC HTTP ${res.status}: ${text.slice(0, 100)}`;
            console.warn(`⚠️ ${lastError}`);
            continue;
          }

          try {
            const data = JSON.parse(text);
            console.log(`✅ IXC respondeu com sucesso (tentativa ${attempt})`);
            return { ok: true, status: res.status, data };
          } catch {
            lastError = "Resposta não-JSON recebida do IXC";
            console.error(`❌ ${lastError}`);
          }
        } catch (err) {
          lastError = `Erro na tentativa ${attempt}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`❌ ${lastError}`);
        }
      }

      throw new Error(`Falha ao contatar IXC após 3 tentativas: ${lastError}`);
    }

    // ====================================================
    // 🔧 FUNÇÃO: Verifica Evolution API
    // ====================================================
    async function checkEvolution() {
      const endpoint = `${EVO_URL.replace(/\/+$/, "")}/instance/connectionState/${EVO_INSTANCE}`;

      try {
        console.log(`🌐 Consultando Evolution: ${endpoint}`);

        const evoRes = await withTimeout(
          fetch(endpoint, {
            headers: {
              "Content-Type": "application/json",
              "apikey": EVO_APIKEY!,
            },
          }),
          8000 // 8s timeout
        );

        let data: any;
        try {
          data = await evoRes.json();
        } catch {
          const raw = await evoRes.text();
          console.error("❌ Evolution retornou resposta não-JSON:", raw.slice(0, 100));
          return {
            success: false,
            status: evoRes.status,
            error: "Resposta não-JSON da Evolution",
            snippet: raw.slice(0, 200),
          };
        }

        const success = evoRes.ok;
        console.log(`${success ? '✅' : '❌'} Evolution status: ${evoRes.status}`);

        return {
          success,
          status: evoRes.status,
          message: success
            ? "Evolution API connection successful"
            : "Evolution API returned an error",
          data,
          config: {
            baseUrl: EVO_URL,
            instanceName: EVO_INSTANCE,
            phoneNumber: EVO_PHONE,
          },
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("❌ Erro ao contatar Evolution:", errorMsg);
        return {
          success: false,
          status: 500,
          error: "Falha ao contatar Evolution API",
          details: errorMsg,
        };
      }
    }

    // ====================================================
    // 🧠 EXECUÇÃO PRINCIPAL - Paralela
    // ====================================================
    console.log("🚀 Iniciando consultas paralelas IXC + Evolution...");

    const [ixcResponse, evoResponse] = await Promise.all([
      fetchIXC("webservice/v1/assunto"),
      checkEvolution(),
    ]);

    const duration = Math.round(performance.now() - start);

    // ====================================================
    // 📊 RESULTADO FINAL
    // ====================================================
    const result = {
      success: ixcResponse.ok && evoResponse.success,
      message: "Consulta IXC + Evolution concluída",
      data: {
        ixc: {
          success: ixcResponse.ok,
          status: ixcResponse.status,
          recordCount: ixcResponse.data?.registros?.length || 0,
          // ⚠️ NÃO expor dados completos em logs
        },
        evolution: {
          success: evoResponse.success,
          status: evoResponse.status,
          state: evoResponse.data?.instance?.state,
        },
      },
      duration_ms: duration,
    };

    // 🔒 Log sanitizado (sem dados sensíveis)
    console.log("📊 Resultado:", JSON.stringify({
      success: result.success,
      duration_ms: duration,
      ixc_records: result.data.ixc.recordCount,
      evo_state: result.data.evolution.state,
    }));

    return {
      ...result,
      data: {
        ixc: ixcResponse.data,
        evolution: evoResponse,
      }
    };
}));
