import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// Lista planos de velocidade do IXC (radgrupos) em formato compatível com o frontend
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

    // Lê body opcional (pode vir vazio)
    const bodyJson = await req.json().catch(() => ({} as any));
    const search =
      typeof bodyJson.search === "string" ? String(bodyJson.search) : "";

    // Normalizar URL removendo /adm.php e protocolo duplicado
    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, "").replace(
      /^https?:\/\//,
      "",
    );
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);
    const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;

    const MAX_PER_PAGE = 100;
    const MAX_PAGES = 50; // trava de segurança para evitar loop infinito

    const fetchPage = async (page: number) => {
      const form = new URLSearchParams({
        page: String(page),
        rp: String(MAX_PER_PAGE),
        sortname: "radgrupos.grupo",
        sortorder: "asc",
      });

      if (search) {
        form.set("qtype", "radgrupos.grupo");
        form.set("oper", "L");
        form.set("query", search);
      }

      const res = await fetch(`${baseUrl}/radgrupos`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          ixcsoft: "listar",
        },
        body: form,
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("[ixc-list-plans] Resposta não-JSON do IXC:", text);
        throw new Error("Invalid JSON response from IXC");
      }

      if (!res.ok) {
        console.error(
          `[ixc-list-plans] IXC HTTP ${res.status}:`,
          text,
        );
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      const rawRegistros = Array.isArray(data?.registros)
        ? data.registros
        : data?.registros
        ? Object.values(data.registros)
        : [];

      return {
        total: Number(data?.total || 0),
        registros: rawRegistros as any[],
      };
    };

    console.log("[ixc-list-plans] Iniciando busca de planos no IXC (radgrupos)");

    const allRegistros: any[] = [];
    let totalFromIXC = 0;
    let currentPage = 1;

    while (currentPage <= MAX_PAGES) {
      const { total, registros } = await fetchPage(currentPage);

      if (currentPage === 1) {
        totalFromIXC = total;
        console.log(
          `[ixc-list-plans] Total reportado pelo IXC: ${totalFromIXC}`,
        );
      }

      if (!registros.length) {
        console.log(
          `[ixc-list-plans] Página ${currentPage} veio vazia, encerrando paginação.`,
        );
        break;
      }

      allRegistros.push(...registros);
      console.log(
        `[ixc-list-plans] Página ${currentPage}: +${registros.length} (acumulado: ${allRegistros.length})`,
      );

      // Se já atingimos ou passamos o total reportado, podemos parar
      if (totalFromIXC > 0 && allRegistros.length >= totalFromIXC) {
        break;
      }

      currentPage++;
    }

    if (!allRegistros.length) {
      console.log("[ixc-list-plans] Nenhum plano encontrado no IXC");
      return {
        success: true,
        plans: [],
        total: 0,
      };
    }

    // Normalizar para o formato esperado pelo frontend
    const normalizedPlans = allRegistros.map((r: any) => {
      const id = String(r.id_grupo ?? r.id ?? "");
      const name =
        r.grupo ||
        r.velocidade ||
        (r.descricao as string | undefined) ||
        `Plano ${id}`;

      // Muitos IXC retornam como string em Kbps ou Mbps, aqui só repasso bruto
      const download = r.download ?? r.down ?? "";// campo pode variar por versão
      const upload = r.upload ?? r.up ?? "";

      const rawPrice = r.valor_produto ?? r.valor ?? r.preco ?? null;
      const priceNumber = rawPrice != null ? Number(rawPrice) : 0;

      return {
        id,
        name,
        download: String(download ?? ""),
        upload: String(upload ?? ""),
        price: isNaN(priceNumber) ? 0 : priceNumber,
      };
    });

    console.log(
      `[ixc-list-plans] Total normalizado: ${normalizedPlans.length} planos.`,
    );

    return {
      success: true,
      plans: normalizedPlans,
      total: totalFromIXC || normalizedPlans.length,
    };
  }),
);
