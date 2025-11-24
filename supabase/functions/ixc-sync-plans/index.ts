import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// P0 FIX: Operação administrativa crítica → exige autenticação
Deno.serve(
  createAuthenticatedHandler("ixc-sync-plans", async (req, { supabase, user }) => {
    // 1. Ler e validar body
    const requestBody = await req.json().catch(() => {
      throw new Error("Body inválido: esperado JSON com { planIds: number[] | string[] }");
    });

    console.log("📦 Body recebido:", JSON.stringify(requestBody));

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

    console.log(`✅ Sincronizando ${planIds.length} contratos IXC: ${planIds.join(", ")}`);

    // 2. Credenciais IXC (Basic Auth direto – fluxo vd_contratos)
    const ixcUsername = Deno.env.get("IXC_API_USERNAME");
    const ixcPassword = Deno.env.get("IXC_API_PASSWORD");
    const IXC_API_BASE = Deno.env.get("IXC_API_BASE_URL");

    if (!ixcUsername || !ixcPassword) {
      throw new Error("Credenciais IXC não configuradas (IXC_API_USERNAME / IXC_API_PASSWORD)");
    }
    if (!IXC_API_BASE) {
      throw new Error("IXC_API_BASE_URL não configurado");
    }

    // Normalizar URL removendo /adm.php e protocolo duplicado
    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, "").replace(/^https?:\/\//, "");
    const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);

    console.log("🔄 Iniciando busca paginada de contratos (vd_contratos)...");

    // 3. Paginação em /vd_contratos
    let allRegistros: any[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const body = new URLSearchParams({
        qtype: "vd_contratos.id",
        query: "0",
        oper: ">",
        page: String(currentPage),
        rp: "100",
        sortname: "vd_contratos.id",
        sortorder: "asc",
      });

      const response = await fetch(`${baseUrl}/vd_contratos`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          ixcsoft: "listar",
        },
        body,
      });

      const text = await response.text();
      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("📛 Resposta não-JSON do IXC em /vd_contratos:", text);
        throw new Error("Resposta inválida do IXC ao listar vd_contratos");
      }

      if (!response.ok) {
        console.error(`📛 IXC HTTP ${response.status}:`, text);
        throw new Error(data?.message || `HTTP ${response.status} ao listar vd_contratos`);
      }

      // `registros` pode vir como array ou objeto indexado → normalizar
      const pageRegistros = Array.isArray(data?.registros)
        ? data.registros
        : data?.registros
        ? Object.values(data.registros)
        : [];

      if (pageRegistros.length > 0) {
        allRegistros = allRegistros.concat(pageRegistros);
        console.log(
          `📄 Página ${currentPage}: ${pageRegistros.length} contratos carregados (Total acumulado: ${allRegistros.length})`,
        );
      } else {
        console.log(`⚠️ Página ${currentPage}: nenhum registro retornado em vd_contratos`);
      }

      const total = Number(data?.total || 0);
      const rp = 100;
      totalPages = total > 0 ? Math.ceil(total / rp) : currentPage; // se não vier total, evita loop infinito

      currentPage++;
    } while (currentPage <= totalPages);

    console.log(`✅ Total de ${allRegistros.length} contratos carregados de vd_contratos`);

    if (allRegistros.length === 0) {
      throw new Error("Nenhum contrato encontrado em vd_contratos no IXC");
    }

    console.log("🔍 Amostra dos primeiros 5 registros:", allRegistros.slice(0, 5));

    // 4. Filtrar apenas os contratos escolhidos (planIds)
    console.log("IDs solicitados para sincronizar:", planIds);

    const plansToSync = allRegistros.filter((r) => {
      const rid = r.id;
      return (
        planIds.includes(Number(rid)) ||
        planIds.includes(String(rid)) ||
        planIds.some((pid: any) => String(pid) === String(rid))
      );
    });

    console.log(`🎯 Encontrados ${plansToSync.length} contratos para sincronizar no IXC`);

    if (plansToSync.length === 0) {
      const allIds = allRegistros.slice(0, 50).map((r: any) => r.id);
      throw new Error(
        `Nenhum dos contratos solicitados (${planIds.join(
          ", ",
        )}) foi encontrado em vd_contratos. IDs disponíveis (primeiros 50): ${allIds.join(", ")}`,
      );
    }

    // 5. Sincronizar com tabela "plans" no Supabase
    const syncResults: Array<{
      ixcId: string;
      status: "created" | "updated" | "error";
      name?: string;
      error?: string;
    }> = [];

    for (const ixcPlan of plansToSync) {
      const ixcId = String(ixcPlan.id);
      const name =
        ixcPlan.nome || ixcPlan.descricao || `Contrato IXC ${ixcId}`;

      // Contratos geralmente não trazem velocidade direta.
      // Mantemos compatibilidade: se vierem campos, usamos; se não, N/A.
      const download = ixcPlan.download || ixcPlan.vel_download || "0";
      const upload = ixcPlan.upload || ixcPlan.vel_upload || "0";
      const price =
        Number(ixcPlan.valor_contrato || ixcPlan.valor || ixcPlan.valor_produto || 0);

      const speed =
        download && upload && (download !== "0" || upload !== "0")
          ? `${download}/${upload} Mbps`
          : download && download !== "0"
          ? `${download} Mbps`
          : "N/A";

      const { data: existing } = await supabase
        .from("plans")
        .select("id")
        .eq("ixc_plan_id", ixcId)
        .maybeSingle();

      const planData = {
        name,
        speed,
        price,
        ixc_plan_id: ixcId,
        description: ixcPlan.descricao || `Plano ${name} (${speed})`,
        active: true,
        features: JSON.stringify(
          [
            speed !== "N/A" ? `${speed} de velocidade contratada` : "Velocidade conforme contrato",
            "Fibra óptica",
            "Suporte técnico especializado",
          ].filter(Boolean),
        ),
      };

      if (existing) {
        const { error } = await supabase.from("plans").update(planData).eq("id", existing.id);
        if (error) {
          console.error(`📛 Erro ao atualizar plano/contrato ${ixcId}:`, error);
          syncResults.push({ ixcId, status: "error", error: error.message });
        } else {
          console.log(`✅ Plano/contrato ${ixcId} atualizado com sucesso`);
          syncResults.push({ ixcId, status: "updated", name });
        }
      } else {
        const { error } = await supabase.from("plans").insert(planData);
        if (error) {
          console.error(`📛 Erro ao criar plano/contrato ${ixcId}:`, error);
          syncResults.push({ ixcId, status: "error", error: error.message });
        } else {
          console.log(`✅ Plano/contrato ${ixcId} criado com sucesso`);
          syncResults.push({ ixcId, status: "created", name });
        }
      }
    }

    const hasErrors = syncResults.some((r) => r.status === "error");

    return {
      success: !hasErrors,
      synced: syncResults.filter((r) => r.status !== "error").length,
      errors: syncResults.filter((r) => r.status === "error").length,
      results: syncResults,
    };
  }),
);
