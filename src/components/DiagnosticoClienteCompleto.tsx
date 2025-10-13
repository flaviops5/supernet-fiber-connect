import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const DiagnosticoClienteCompleto = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const copyToClipboard = (content: any, label: string) => {
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`,
    });
  };

  const realizarDiagnostico = async () => {
    setLoading(true);
    setResult(null);

    const diagnostico: any = {
      clientId: "313",
      clientCPF: "619.538.901-30",
      clientName: "Cláudio Máximo Chaves",
      timestamp: new Date().toISOString(),
      etapas: {},
      resumo: {}
    };

    try {
      console.log("🔍 INICIANDO DIAGNÓSTICO COMPLETO DO CLIENTE 313");
      console.log("================================================");

      // ETAPA 1: Buscar dados básicos do cliente
      console.log("\n📋 ETAPA 1: Buscando dados básicos do cliente...");
      try {
        const { data: clientData, error: clientError } = await supabase.functions.invoke('ixc-proxy', {
          body: {
            method: 'POST',
            path: '/webservice/v1/cliente',
            body: {
              qtype: 'cliente.id',
              query: '313',
              oper: '=',
              page: '1',
              rp: '1'
            }
          }
        });

        if (clientError) throw clientError;
        
        const registros = clientData?.data?.registros || [];
        diagnostico.etapas.dadosBasicos = {
          success: registros.length > 0,
          data: registros[0] || null,
          raw: clientData
        };

        console.log("✓ Dados básicos:", diagnostico.etapas.dadosBasicos.data);
      } catch (error: any) {
        diagnostico.etapas.dadosBasicos = {
          success: false,
          error: error.message
        };
        console.error("✗ Erro ao buscar dados básicos:", error.message);
      }

      // ETAPA 2: Buscar status online via radusuarios
      console.log("\n🔌 ETAPA 2: Verificando status online (radusuarios)...");
      try {
        const { data: radiusData, error: radiusError } = await supabase.functions.invoke('ixc-proxy', {
          body: {
            method: 'POST',
            path: '/webservice/v1/radusuarios',
            body: {
              qtype: 'radusuarios.id_cliente',
              query: '313',
              oper: '=',
              page: '1',
              rp: '100'
            }
          }
        });

        if (radiusError) throw radiusError;

        const registros = radiusData?.data?.registros || [];
        const online = registros.filter((r: any) => r.online === 'S' || r.online === 'SS');
        const offline = registros.filter((r: any) => r.online === 'N');

        diagnostico.etapas.statusOnline = {
          success: true,
          totalRegistros: registros.length,
          online: online.length,
          offline: offline.length,
          isOnline: online.length > 0,
          registros: registros.map((r: any) => ({
            login: r.login,
            online: r.online,
            ip: r.ip,
            data_inicio: r.data_inicio,
            acctstarttime: r.acctstarttime
          })),
          raw: radiusData
        };

        console.log(`✓ Status Online: ${online.length} online, ${offline.length} offline`);
        console.log("Registros detalhados:", diagnostico.etapas.statusOnline.registros);
      } catch (error: any) {
        diagnostico.etapas.statusOnline = {
          success: false,
          error: error.message
        };
        console.error("✗ Erro ao buscar status online:", error.message);
      }

      // ETAPA 3: Buscar contratos
      console.log("\n📜 ETAPA 3: Buscando contratos...");
      try {
        const { data: contractsData, error: contractsError } = await supabase.functions.invoke('ixc-proxy', {
          body: {
            method: 'POST',
            path: '/webservice/v1/cliente_contrato',
            body: {
              qtype: 'cliente_contrato.id_cliente',
              query: '313',
              oper: '=',
              page: '1',
              rp: '50'
            }
          }
        });

        if (contractsError) throw contractsError;

        const registros = contractsData?.data?.registros || [];
        diagnostico.etapas.contratos = {
          success: true,
          totalContratos: registros.length,
          contratos: registros.map((c: any) => ({
            id: c.id,
            plano: c.plano || c.descricao,
            status: c.status,
            situacao: c.situacao,
            valor: c.valor,
            data_ativacao: c.data_ativacao,
            bloqueado: c.bloqueado
          })),
          raw: contractsData
        };

        console.log(`✓ Contratos encontrados: ${registros.length}`);
        console.log("Detalhes:", diagnostico.etapas.contratos.contratos);
      } catch (error: any) {
        diagnostico.etapas.contratos = {
          success: false,
          error: error.message
        };
        console.error("✗ Erro ao buscar contratos:", error.message);
      }

      // ETAPA 4: Buscar títulos financeiros (TODOS)
      console.log("\n💰 ETAPA 4: Buscando títulos financeiros...");
      try {
        const { data: titlesData, error: titlesError } = await supabase.functions.invoke('ixc-proxy', {
          body: {
            method: 'POST',
            path: '/webservice/v1/fn_areceber',
            body: {
              qtype: 'fn_areceber.id_cliente',
              query: '313',
              oper: '=',
              page: '1',
              rp: '100',
              sortname: 'fn_areceber.data_vencimento',
              sortorder: 'desc'
            }
          }
        });

        if (titlesError) throw titlesError;

        const registros = titlesData?.data?.registros || [];
        const hoje = new Date();
        const emAberto = registros.filter((t: any) => 
          t.status !== 'Pago' && 
          t.status !== 'Baixado' &&
          t.status !== 'pago' &&
          t.status !== 'baixado'
        );
        const vencidos = emAberto.filter((t: any) => {
          const vencimento = new Date(t.data_vencimento);
          return vencimento < hoje;
        });

        diagnostico.etapas.titulos = {
          success: true,
          totalTitulos: registros.length,
          emAberto: emAberto.length,
          vencidos: vencidos.length,
          temAtraso: vencidos.length > 0,
          titulos: registros.map((t: any) => ({
            id: t.id,
            descricao: t.descricao,
            valor: t.valor,
            data_vencimento: t.data_vencimento,
            data_pagamento: t.data_pagamento,
            status: t.status,
            situacao: t.situacao
          })),
          titulosVencidos: vencidos.map((t: any) => ({
            id: t.id,
            descricao: t.descricao,
            valor: t.valor,
            data_vencimento: t.data_vencimento,
            diasAtraso: Math.floor((hoje.getTime() - new Date(t.data_vencimento).getTime()) / (1000 * 60 * 60 * 24))
          })),
          raw: titlesData
        };

        console.log(`✓ Títulos: ${registros.length} total, ${emAberto.length} em aberto, ${vencidos.length} vencidos`);
        console.log("Títulos vencidos:", diagnostico.etapas.titulos.titulosVencidos);
      } catch (error: any) {
        diagnostico.etapas.titulos = {
          success: false,
          error: error.message
        };
        console.error("✗ Erro ao buscar títulos:", error.message);
      }

      // Gerar resumo
      diagnostico.resumo = {
        clienteEncontrado: diagnostico.etapas.dadosBasicos?.success || false,
        isOnline: diagnostico.etapas.statusOnline?.isOnline || false,
        temContratos: (diagnostico.etapas.contratos?.totalContratos || 0) > 0,
        temAtraso: diagnostico.etapas.titulos?.temAtraso || false,
        titulosVencidos: diagnostico.etapas.titulos?.vencidos || 0,
        valorTotalAtraso: diagnostico.etapas.titulos?.titulosVencidos?.reduce(
          (sum: number, t: any) => sum + parseFloat(t.valor || 0), 
          0
        ) || 0
      };

      console.log("\n📊 RESUMO DO DIAGNÓSTICO:");
      console.log("========================");
      console.log("Cliente encontrado:", diagnostico.resumo.clienteEncontrado);
      console.log("Status online:", diagnostico.resumo.isOnline ? "ONLINE" : "OFFLINE");
      console.log("Tem contratos:", diagnostico.resumo.temContratos);
      console.log("Tem atraso:", diagnostico.resumo.temAtraso);
      console.log("Títulos vencidos:", diagnostico.resumo.titulosVencidos);
      console.log("Valor total em atraso: R$", diagnostico.resumo.valorTotalAtraso.toFixed(2));

      setResult(diagnostico);

    } catch (error: any) {
      console.error("❌ ERRO GERAL NO DIAGNÓSTICO:", error);
      setResult({
        ...diagnostico,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Diagnóstico Completo - Cliente 313
        </h3>
        <p className="text-sm text-muted-foreground">
          Cláudio Máximo Chaves - CPF: 619.538.901-30
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Este diagnóstico verifica TODOS os dados do cliente no IXC em tempo real
        </p>
      </div>

      <Button 
        onClick={realizarDiagnostico} 
        disabled={loading}
        className="w-full"
        variant="destructive"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        🔍 Executar Diagnóstico Completo
      </Button>

      {result && (
        <div className="space-y-4">
          {/* Resumo Visual */}
          {result.resumo && (
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${result.resumo.isOnline ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <div className="flex items-center gap-2">
                  {result.resumo.isOnline ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-semibold">
                    {result.resumo.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div className={`p-3 rounded-lg ${result.resumo.temAtraso ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                <div className="flex items-center gap-2">
                  {result.resumo.temAtraso ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm font-semibold">
                    {result.resumo.temAtraso ? `${result.resumo.titulosVencidos} Título(s) Vencido(s)` : 'Sem Atraso'}
                  </span>
                </div>
                {result.resumo.temAtraso && (
                  <div className="text-xs text-red-600 mt-1">
                    R$ {result.resumo.valorTotalAtraso.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detalhes das Etapas */}
          <details className="border rounded-lg">
            <summary className="cursor-pointer p-3 hover:bg-muted flex items-center justify-between">
              <span>📋 Dados Básicos do Cliente</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  copyToClipboard(result.etapas.dadosBasicos, "Dados Básicos");
                }}
                className="h-7 w-7 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </summary>
            <div className="p-3 bg-muted/50">
              <pre className="text-xs overflow-auto max-h-48">
                {JSON.stringify(result.etapas.dadosBasicos, null, 2)}
              </pre>
            </div>
          </details>

          <details className="border rounded-lg">
            <summary className="cursor-pointer p-3 hover:bg-muted flex items-center justify-between">
              <span>🔌 Status Online (Radusuarios)</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  copyToClipboard(result.etapas.statusOnline, "Status Online");
                }}
                className="h-7 w-7 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </summary>
            <div className="p-3 bg-muted/50">
              <pre className="text-xs overflow-auto max-h-48">
                {JSON.stringify(result.etapas.statusOnline, null, 2)}
              </pre>
            </div>
          </details>

          <details className="border rounded-lg">
            <summary className="cursor-pointer p-3 hover:bg-muted flex items-center justify-between">
              <span>📜 Contratos</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  copyToClipboard(result.etapas.contratos, "Contratos");
                }}
                className="h-7 w-7 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </summary>
            <div className="p-3 bg-muted/50">
              <pre className="text-xs overflow-auto max-h-48">
                {JSON.stringify(result.etapas.contratos, null, 2)}
              </pre>
            </div>
          </details>

          <details className="border rounded-lg">
            <summary className="cursor-pointer p-3 hover:bg-muted flex items-center justify-between">
              <span>💰 Títulos Financeiros</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  copyToClipboard(result.etapas.titulos, "Títulos Financeiros");
                }}
                className="h-7 w-7 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </summary>
            <div className="p-3 bg-muted/50">
              <pre className="text-xs overflow-auto max-h-48">
                {JSON.stringify(result.etapas.titulos, null, 2)}
              </pre>
            </div>
          </details>

          <details open className="border rounded-lg border-orange-500">
            <summary className="cursor-pointer p-3 hover:bg-muted font-semibold flex items-center justify-between">
              <span>📊 Resumo Completo</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  copyToClipboard(result, "Resumo Completo");
                }}
                className="h-7 w-7 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </summary>
            <div className="p-3 bg-muted/50">
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </Card>
  );
};
