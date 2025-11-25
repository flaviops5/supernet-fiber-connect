import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// Sincronização de planos é operação administrativa crítica
Deno.serve(
  createAuthenticatedHandler("ixc-sync-plans", async (req, { supabase, user }) => {
    const requestBody = await req.json();
    console.log("📦 [ixc-sync-plans] Body recebido:", JSON.stringify(requestBody));

    const { planIds } = requestBody;
    if (!planIds) {
      throw new Error("planIds é obrigatório no body da requisição");
    }
    if (!Array.isArray(planIds)) {
      throw new Error(`planIds deve ser um array, recebido: ${typeof planIds}`);
    }
    if (planIds.length === 0) {
      throw new Error("planIds não pode ser um array vazio");
    }

    const ixcUsername = Deno.env.get("IXC_API_USERNAME");
    const ixcPassword = Deno.env.get("IXC_API_PASSWORD");
    const IXC_API_BASE = Deno.env.get("IXC_API_BASE_URL");
    if (!ixcUsername || !ixcPassword) {
      throw new Error("Credenciais IXC não configuradas");
    }
    if (!IXC_API_BASE) {
      throw new Error("IXC_API_BASE_URL não configurado");
    }

    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, "").replace(/^https?:\/\//, "");
    const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);

    const postIXC = async (endpoint: string, form: Record<string, string>) => {
      const body = new URLSearchParams(form);
      const res = await fetch(`${baseUrl}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          ixcsoft: "listar",
        },
        body,
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.error(`[IXC ${endpoint}] Non-JSON response:`, text);
        throw new Error(`Invalid response from IXC at /${endpoint}`);
      }

      if (!res.ok) {
        console.error(`[IXC ${endpoint}] HTTP ${res.status}:`, text);
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      return data;
    };

    console.log(
      `🔄 [ixc-sync-plans] Sincronizando ${planIds.length} planos IXC: ${planIds
        .map((p: any) => String(p))
        .join(", ")}`
    );

    const syncResults: {
      ixcId: string;
      status: "created" | "updated" | "error";
      name?: string;
      error?: string;
    }[] = [];

    for (const pid of planIds) {
      const id = String(pid);

      // Buscar dados completos do plano em vd_planos
      const form: Record<string, string> = {
        page: "1",
        rp: "1",
        qtype: "vd_planos.id",
        oper: "=",
        query: id,
      };

      const result = await postIXC("vd_planos", form);

      const registros: any[] = Array.isArray(result?.registros)
        ? result.registros
        : result?.registros
        ? Object.values(result.registros)
        : [];

      if (registros.length === 0) {
        console.warn(`[ixc-sync-plans] Plano ${id} não encontrado em vd_planos`);
        syncResults.push({
          ixcId: id,
          status: "error",
          error: "Plano não encontrado em vd_planos",
        });
        continue;
      }

      const p = registros[0];

      const descricao = p.descricao || p.nome || `Plano ${id}`;
      const valorRaw = p.valor || p.mensalidade || p.preco || "0";
      const price = Number(String(valorRaw).replace(",", "."));

      // Se o IXC não devolver download/upload aqui, você pode:
      // 1) Ignorar (mostrar só preço)
      // 2) Ou buscar radgrupos de novo, usando p.id_grupo
      const download = p.download || "";
      const upload = p.upload || "";

      const speed =
        download && upload
          ? `${download}/${upload} Mbps`
          : download
          ? `${download} Mbps`
          : "N/A";

      const { data: existing, error: existingError } = await supabase
        .from("plans")
        .select("id")
        .eq("ixc_plan_id", id)
        .maybeSingle();

      if (existingError) {
        console.error(`[ixc-sync-plans] Erro ao buscar plano local ${id}:`, existingError);
        syncResults.push({
          ixcId: id,
          status: "error",
          error: existingError.message,
        });
        continue;
      }

      const planData = {
        name: descricao,
        speed,
        price: isNaN(price) ? 0 : price,
        ixc_plan_id: id,
        description: `Plano de ${speed}`,
        active: true,
        features: JSON.stringify(
          [
            download ? `${download} Mbps de download` : null,
            upload ? `${upload} Mbps de upload` : null,
            "Fibra óptica",
            "Suporte 24/7",
          ].filter(Boolean)
        ),
      };

      if (existing) {
        const { error } = await supabase.from("plans").update(planData).eq("id", existing.id);
        if (error) {
          console.error(`Erro ao atualizar plano ${id}:`, error);
          syncResults.push({
            ixcId: id,
            status: "error",
            error: error.message,
          });
        } else {
          console.log(`✓ Plano ${id} atualizado`);
          syncResults.push({
            ixcId: id,
            status: "updated",
            name: descricao,
          });
        }
      } else {
        const { error } = await supabase.from("plans").insert(planData);
        if (error) {
          console.error(`Erro ao criar plano ${id}:`, error);
          syncResults.push({
            ixcId: id,
            status: "error",
            error: error.message,
          });
        } else {
          console.log(`✓ Plano ${id} criado`);
          syncResults.push({
            ixcId: id,
            status: "created",
            name: descricao,
          });
        }
      }
    }

    const hasErrors = syncResults.some((r) => r.status === "error");
    return {
      success: !hasErrors,
      results: syncResults,
      synced: syncResults.filter((r) => r.status !== "error").length,
      errors: syncResults.filter((r) => r.status === "error").length,
    };
  })
);
