import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { parseError } from "@/types/error.types";
import type { JsonValue } from "@/types/common.types";

interface AnalysisLogic {
  codigosBloqueioProgramados: Record<string, string>;
  statusEncontrado: Array<{
    contratoId: string | number;
    statusInternet: string;
    situacaoFinanceira: string;
    bloqueado: boolean;
    pagoAte: string;
    interpretacao: string;
  }>;
  deveriaBloqueado: boolean;
  estaBloqueado: boolean;
  estaComReducao: boolean;
  motivoBloqueio: string[];
  inconsistencias: Array<{
    tipo: string;
    gravidade: string;
    descricao: string;
    acaoSugerida: string;
    detalhamento: Record<string, JsonValue>;
  }>;
  politicaBloqueio: {
    tipo: string;
    descricao: string;
  };
}

interface DiagnosticResult {
  clientId: string;
  clientCPF: string;
  clientName: string;
  timestamp: string;
  etapas: Record<string, JsonValue> & {
    analiseLogica?: AnalysisLogic;
  };
  resumo: Record<string, JsonValue> & {
    valorTotalAtraso?: number;
    politicaBloqueio?: AnalysisLogic['politicaBloqueio'];
    inconsistencias?: AnalysisLogic['inconsistencias'];
  };
  error?: string;
}

export const DiagnosticoClienteCompleto = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (content: JsonValue, label: string) => {
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`,
    });
  };

  const realizarDiagnostico = async () => {
    setLoading(true);
    setResult(null);

    const diagnostico: DiagnosticResult = {
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

        logger.debug("✓ Dados básicos:", { data: diagnostico.etapas.dadosBasicos.data });
      } catch (error) {
        const err = parseError(error);
        diagnostico.etapas.dadosBasicos = {
          success: false,
          error: err.message
        };
        console.error("✗ Erro ao buscar dados básicos:", err.message);
      }

      // ETAPA 2: Buscar status online via radusuarios
      logger.info("🔌 ETAPA 2: Verificando status online (radusuarios)...");
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
        const online = registros.filter((r: Record<string, JsonValue>) => r.online === 'S' || r.online === 'SS');
        const offline = registros.filter((r: Record<string, JsonValue>) => r.online === 'N');

        diagnostico.etapas.statusOnline = {
          success: true,
          totalRegistros: registros.length,
          online: online.length,
          offline: offline.length,
          isOnline: online.length > 0,
          registros: registros.map((r: Record<string, JsonValue>) => ({
            login: r.login,
            online: r.online,
            ip: r.ip,
            data_inicio: r.data_inicio,
            acctstarttime: r.acctstarttime
          })),
          raw: radiusData
        };

        logger.info(`✓ Status Online: ${online.length} online, ${offline.length} offline`);
        logger.debug("Registros detalhados:", { registros: diagnostico.etapas.statusOnline.registros });
      } catch (error) {
        const err = parseError(error);
        diagnostico.etapas.statusOnline = {
          success: false,
          error: err.message
        };
        console.error("✗ Erro ao buscar status online:", err.message);
      }

      // ETAPA 3: Buscar contratos
      logger.info("📜 ETAPA 3: Buscando contratos...");
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
          contratos: registros.map((c: Record<string, JsonValue>) => ({
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

        logger.info(`✓ Contratos encontrados: ${registros.length}`);
        logger.debug("Detalhes:", { contratos: diagnostico.etapas.contratos.contratos });
      } catch (error) {
        const err = parseError(error);
        diagnostico.etapas.contratos = {
          success: false,
          error: err.message
        };
        console.error("✗ Erro ao buscar contratos:", err.message);
      }

      // ETAPA 4: Buscar títulos financeiros (TODOS)
      logger.info("💰 ETAPA 4: Buscando títulos financeiros...");
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
        const emAberto = registros.filter((t: Record<string, JsonValue>) => 
          t.status !== 'Pago' && 
          t.status !== 'Baixado' &&
          t.status !== 'pago' &&
          t.status !== 'baixado'
        );
        const vencidos = emAberto.filter((t: Record<string, JsonValue>) => {
          const vencimento = new Date(String(t.data_vencimento));
          return vencimento < hoje;
        });

        diagnostico.etapas.titulos = {
          success: true,
          totalTitulos: registros.length,
          emAberto: emAberto.length,
          vencidos: vencidos.length,
          temAtraso: vencidos.length > 0,
          titulos: registros.map((t: Record<string, JsonValue>) => ({
            id: t.id,
            descricao: t.descricao,
            valor: t.valor,
            data_vencimento: t.data_vencimento,
            data_pagamento: t.data_pagamento,
            status: t.status,
            situacao: t.situacao
          })),
          titulosVencidos: vencidos.map((t: Record<string, JsonValue>) => ({
            id: t.id,
            descricao: t.descricao,
            valor: t.valor,
            data_vencimento: t.data_vencimento,
            diasAtraso: Math.floor((hoje.getTime() - new Date(String(t.data_vencimento)).getTime()) / (1000 * 60 * 60 * 24))
          })),
          raw: titlesData
        };

        logger.info(`✓ Títulos: ${registros.length} total, ${emAberto.length} em aberto, ${vencidos.length} vencidos`);
        logger.debug("Títulos vencidos:", { titulos: diagnostico.etapas.titulos.titulosVencidos });
      } catch (error) {
        const err = parseError(error);
        diagnostico.etapas.titulos = {
          success: false,
          error: err.message
        };
        console.error("✗ Erro ao buscar títulos:", err.message);
      }

      // ETAPA 5: Análise da Lógica de Bloqueio e Redução de Velocidade
      logger.info("🧠 ETAPA 5: Analisando lógica de bloqueio e redução...");
      const analiseLogica: AnalysisLogic = {
        codigosBloqueioProgramados: {
          'CA': 'Cancelado por Atraso',
          'CM': 'Cortado Manualmente', 
          'CB': 'Cortado por Bloqueio',
          'FA': 'Financeiro em Atraso',
          'R': 'Redução de Velocidade',
          'A': 'Ativo/Normal'
        },
        statusEncontrado: [],
        deveriaBloqueado: false,
        estaBloqueado: false,
        estaComReducao: false,
        motivoBloqueio: [],
        inconsistencias: [],
        politicaBloqueio: {
          tipo: 'desconhecido',
          descricao: ''
        }
      };

      // Analisar contratos e identificar tipo de restrição
      if (diagnostico.etapas.contratos?.success) {
        (diagnostico.etapas.contratos.contratos as Record<string, JsonValue>[]).forEach((contrato: Record<string, JsonValue>) => {
          const statusInternet = String(contrato.status_internet || contrato.status || '').toUpperCase();
          const situacaoFinanceira = String(contrato.situacao_financeira_contrato || '').toUpperCase();
          const bloqueado = contrato.bloqueado === 'S' || contrato.bloqueado === true;
          const pagoAteData = contrato.pago_ate_data || '';
          
          analiseLogica.statusEncontrado.push({
            contratoId: String(contrato.id),
            statusInternet: statusInternet,
            situacaoFinanceira: situacaoFinanceira,
            bloqueado: bloqueado,
            pagoAte: String(pagoAteData),
            interpretacao: analiseLogica.codigosBloqueioProgramados[statusInternet] || 'Status Desconhecido'
          });

          // Detectar tipo de restrição
          const financialBlockStatus = ['CA', 'CM', 'CB'];
          const reducaoStatus = ['FA', 'R'];
          
          if (financialBlockStatus.includes(statusInternet) || /BLOQ|BLOQUE/.test(statusInternet) || bloqueado) {
            analiseLogica.estaBloqueado = true;
            analiseLogica.politicaBloqueio.tipo = 'bloqueio_total';
            analiseLogica.politicaBloqueio.descricao = 'Bloqueio Total - Cliente sem acesso à internet';
            analiseLogica.motivoBloqueio.push(`Contrato ${contrato.id}: ${statusInternet} (BLOQUEIO TOTAL)`);
          } else if (reducaoStatus.includes(statusInternet) || situacaoFinanceira === 'R') {
            analiseLogica.estaComReducao = true;
            analiseLogica.politicaBloqueio.tipo = 'reducao_velocidade';
            analiseLogica.politicaBloqueio.descricao = 'Redução de Velocidade - Cliente online mas com velocidade limitada';
            analiseLogica.motivoBloqueio.push(`Contrato ${contrato.id}: ${statusInternet} (REDUÇÃO DE VELOCIDADE - Pago até ${pagoAteData})`);
          }
        });
      }

      // Verificar se DEVERIA estar bloqueado baseado nos títulos
      const hoje = new Date();
      const titulosVencidosCount = Number(diagnostico.etapas.titulos?.vencidos || 0);
      const titulosVencidosArray = (diagnostico.etapas.titulos?.titulosVencidos as Record<string, JsonValue>[] | undefined) || [];
      const valorTotalAtraso = titulosVencidosArray.reduce(
        (sum: number, t: Record<string, JsonValue>) => sum + parseFloat(String(t.valor || 0)), 
        0
      );

      if (titulosVencidosCount > 0) {
        analiseLogica.deveriaBloqueado = true;
        analiseLogica.motivoBloqueio.push(`${titulosVencidosCount} título(s) vencido(s) - R$ ${valorTotalAtraso.toFixed(2)}`);
      }

      // Detectar inconsistências com base em redução vs bloqueio
      const isOnline = diagnostico.etapas.statusOnline?.isOnline || false;
      
      // Calcular dias de atraso da fatura mais antiga vencida
      let diasAtrasoMaisAntigo = 0;
      if (titulosVencidosArray.length > 0) {
        const maisAntigoVencimento = new Date(
          Math.min(...titulosVencidosArray.map((t: Record<string, JsonValue>) => new Date(String(t.data_vencimento)).getTime()))
        );
        diasAtrasoMaisAntigo = Math.floor((hoje.getTime() - maisAntigoVencimento.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Análise baseada na política de bloqueio detectada
      if (analiseLogica.estaComReducao && isOnline && titulosVencidosCount > 0) {
        analiseLogica.inconsistencias.push({
          tipo: 'REDUCAO_VELOCIDADE_ATIVA',
          gravidade: 'MÉDIA',
          descricao: `Cliente está ONLINE com REDUÇÃO DE VELOCIDADE por débito de ${titulosVencidosCount} fatura(s) vencida(s) há ${diasAtrasoMaisAntigo} dias (R$ ${valorTotalAtraso.toFixed(2)}). Política: redução antes do bloqueio total.`,
          acaoSugerida: `Sistema funcionando conforme esperado. Após ${diasAtrasoMaisAntigo} dias de atraso, aplicou redução de velocidade. Verificar quando será aplicado bloqueio total.`,
          detalhamento: {
            diasAtraso: diasAtrasoMaisAntigo,
            valorDevido: valorTotalAtraso,
            titulosVencidos: titulosVencidosCount,
            politica: 'Redução → Bloqueio Total'
          }
        });
      }
      
      if (analiseLogica.estaBloqueado && isOnline) {
        analiseLogica.inconsistencias.push({
          tipo: 'BLOQUEADO_MAS_ONLINE',
          gravidade: 'CRÍTICA',
          descricao: `Cliente marcado como BLOQUEADO TOTALMENTE (${analiseLogica.motivoBloqueio.join(', ')}) mas está ONLINE e navegando`,
          acaoSugerida: 'URGENTE: Falha no sistema de bloqueio do concentrador/OLT. Cliente deveria estar sem acesso.',
          detalhamento: {
            statusSistema: 'Bloqueado',
            statusReal: 'Online',
            risco: 'Cliente inadimplente com acesso total'
          }
        });
      }

      if (!analiseLogica.estaBloqueado && !analiseLogica.estaComReducao && titulosVencidosCount > 0 && isOnline) {
        analiseLogica.inconsistencias.push({
          tipo: 'DEVEDOR_SEM_RESTRICAO',
          gravidade: 'ALTA',
          descricao: `Cliente possui ${titulosVencidosCount} título(s) vencido(s) há ${diasAtrasoMaisAntigo} dias (R$ ${valorTotalAtraso.toFixed(2)}), está ONLINE mas NÃO tem nenhuma restrição no sistema`,
          acaoSugerida: 'Verificar configuração de bloqueio automático no IXC. Cliente devedor sem qualquer penalidade.',
          detalhamento: {
            diasAtraso: diasAtrasoMaisAntigo,
            valorDevido: valorTotalAtraso,
            statusEsperado: 'Redução ou Bloqueio',
            statusAtual: 'Normal'
          }
        });
      }

      if (!analiseLogica.estaBloqueado && !analiseLogica.estaComReducao && titulosVencidosCount === 0 && isOnline) {
        analiseLogica.inconsistencias.push({
          tipo: 'SITUACAO_REGULAR',
          gravidade: 'NENHUMA',
          descricao: 'Cliente sem débitos, sem restrições e online - situação completamente regular',
          acaoSugerida: 'Nenhuma ação necessária',
          detalhamento: {
            statusFinanceiro: 'Em dia',
            statusAcesso: 'Normal',
            situacao: 'Regular'
          }
        });
      }

      diagnostico.etapas.analiseLogica = analiseLogica;

      // Gerar resumo expandido
      const totalContratosValue = Number(diagnostico.etapas.contratos?.totalContratos || 0);
      
      diagnostico.resumo = {
        clienteEncontrado: diagnostico.etapas.dadosBasicos?.success || false,
        isOnline: isOnline,
        temContratos: totalContratosValue > 0,
        temAtraso: diagnostico.etapas.titulos?.temAtraso || false,
        titulosVencidos: titulosVencidosCount,
        valorTotalAtraso: valorTotalAtraso,
        diasAtrasoMaisAntigo: diasAtrasoMaisAntigo,
        deveriaBloqueado: analiseLogica.deveriaBloqueado,
        estaBloqueado: analiseLogica.estaBloqueado,
        estaComReducao: analiseLogica.estaComReducao,
        politicaBloqueio: analiseLogica.politicaBloqueio,
        temInconsistencias: analiseLogica.inconsistencias.length > 0,
        inconsistencias: analiseLogica.inconsistencias
      };

      logger.info("📊 RESUMO DO DIAGNÓSTICO:", {
        clienteEncontrado: diagnostico.resumo.clienteEncontrado,
        statusOnline: diagnostico.resumo.isOnline ? "ONLINE" : "OFFLINE",
        temContratos: diagnostico.resumo.temContratos,
        temAtraso: diagnostico.resumo.temAtraso,
        titulosVencidos: diagnostico.resumo.titulosVencidos,
        diasAtrasoMaisAntigo: diagnostico.resumo.diasAtrasoMaisAntigo,
        valorTotalAtraso: diagnostico.resumo.valorTotalAtraso.toFixed(2),
        estaBloqueado: diagnostico.resumo.estaBloqueado,
        estaComReducao: diagnostico.resumo.estaComReducao,
        politicaAplicada: diagnostico.resumo.politicaBloqueio.tipo,
        inconsistenciasTotal: diagnostico.resumo.inconsistencias.length
      });

      setResult(diagnostico);

    } catch (error) {
      const err = parseError(error);
      console.error("❌ ERRO GERAL NO DIAGNÓSTICO:", err);
      setResult({
        clientId: "313",
        clientCPF: "619.538.901-30",
        clientName: "Cláudio Máximo Chaves",
        timestamp: new Date().toISOString(),
        etapas: {},
        resumo: {},
        error: err.message
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

          <details className="border rounded-lg border-purple-500">
            <summary className="cursor-pointer p-3 hover:bg-muted flex items-center justify-between font-semibold">
              <span>🧠 Análise da Lógica de Bloqueio</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  copyToClipboard(result.etapas.analiseLogica as unknown as JsonValue, "Análise da Lógica");
                }}
                className="h-7 w-7 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </summary>
            <div className="p-3 bg-muted/50 space-y-3">
              {result.etapas.analiseLogica?.inconsistencias?.map((inc, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded border-l-4 ${
                    inc.gravidade === 'CRÍTICA' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                    inc.gravidade === 'ALTA' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' :
                    'border-green-500 bg-green-50 dark:bg-green-950'
                  }`}
                >
                  <div className="font-semibold text-sm">
                    {inc.tipo} {inc.gravidade !== 'NENHUMA' && `(${inc.gravidade})`}
                  </div>
                  <div className="text-xs mt-1">{inc.descricao}</div>
                  <div className="text-xs mt-2 italic">→ {inc.acaoSugerida}</div>
                </div>
              ))}
              <pre className="text-xs overflow-auto max-h-48 mt-3">
                {JSON.stringify(result.etapas.analiseLogica, null, 2)}
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
                  copyToClipboard(result as unknown as JsonValue, "Resumo Completo");
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
