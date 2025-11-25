import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// Lista de planos comerciais (vd_planos) combinando com radgrupos (velocidades)
Deno.serve(
  createAuthenticatedHandler("ixc-list-plans", async (req, { supabase, user }) => {
    const ixcUsername = Deno.env.get("IXC_API_USERNAME");
    const ixcPassword = Deno.env.get("IXC_API_PASSWORD");
    const IXC_API_BASE = Deno.env.get("IXC_API_BASE_URL");

    if (!ixcUsername || !ixcPassword) {
      throw new Error("IXC API credentials not configured");
    }
    if (!IXC_API_BASE) {
      throw new Error("IXC_API_BASE_URL not configured");
    }

    const bodyJson = await req.json().catch(() => ({}));
    const page = Number(bodyJson.page) > 0 ? Number(bodyJson.page) : 1;
    const rp = Number(bodyJson.rp) > 0 ? Number(bodyJson.rp) : 50;
    const search = typeof bodyJson.search === "string" ? String(bodyJson.search) : "";

    // Normalizar URL removendo /adm.php e protocol duplicado
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

    console.log("🔎 [ixc-list-plans] Listando vd_planos + radgrupos...");

    // 1) Buscar planos comerciais em vd_planos
    const planosForm: Record<string, string> = {
      page: String(page),
      rp: String(rp),
      sortname: "vd_planos.id",
      sortorder: "asc",
    };

    if (search) {
      planosForm.qtype = "vd_planos.descricao";
      planosForm.oper = "L"; // like
      planosForm.query = search;
    }

    const planosResult = await postIXC("vd_planos", planosForm);
    const totalPlanos = Number(planosResult?.total || 0);

    const vdPlanosRegistros: any[] = Array.isArray(planosResult?.registros)
      ? planosResult.registros
      : planosResult?.registros
      ? Object.values(planosResult.registros)
      : [];

    // 2) Buscar radgrupos (velocidades) para tentar enriquecer
    const radForm: Record<string, string> = {
      page: "1",
      rp: "500", // grande o suficiente para pegar todos perfis de velocidade
      sortname: "radgrupos.id",
      sortorder: "asc",
    };

    const radResult = await postIXC("radgrupos", radForm);
    const radRegistros: any[] = Array.isArray(radResult?.registros)
      ? radResult.registros
      : radResult?.registros
      ? Object.values(radResult.registros)
      : [];

    // Índice de radgrupos por id (ou id_grupo, dependendo do IXC)
    const radById = new Map<string, any>();
    for (const r of radRegistros) {
      const rid = String(r.id_grupo || r.id || "");
      if (!rid) continue;
      radById.set(rid, r);
    }

    // 3) Montar DTO dos planos combinando vd_planos + radgrupos
    const plans = vdPlanosRegistros.map((p: any) => {
      const vdId = String(p.id);
      const radGrupoId = String(p.id_grupo || p.id_radgrupo || "");
      const rad = radGrupoId ? radById.get(radGrupoId) : undefined;

      const descricao = p.descricao || p.nome || `Plano ${vdId}`;

      const download =
        (rad && (rad.download || rad.velocidade || rad.velocidade_download)) || p.download || "";
      const upload =
        (rad && (rad.upload || rad.velocidade_upload)) || p.upload || "";
      const valorRaw = p.valor || p.mensalidade || p.preco || "0";
      const price = Number(String(valorRaw).replace(",", "."));

      return {
        id: vdId, // usamos SEMPRE o id de vd_planos como "id" comercial
        vd_plano_id: vdId,
        radgrupo_id: radGrupoId || null,
        name: descricao,
        download: download || "",
        upload: upload || "",
        price: isNaN(price) ? 0 : price,
        source: "vd_planos+radgrupos",
      };
    });

    console.log(
      `✅ [ixc-list-plans] ${plans.length} planos retornados (page=${page}, rp=${rp}, total=${totalPlanos})`
    );

    return {
      success: true,
      plans,
      total: totalPlanos,
      page,
      totalPages: Math.max(1, Math.ceil(totalPlanos / rp)),
    };
  })
);
