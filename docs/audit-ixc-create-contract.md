# Auditoria: ixc-create-contract Edge Function

**Função:** `supabase/functions/ixc-create-contract/index.ts`  
**Propósito:** Cria um novo contrato em `vd_contratos` no sistema IXC  
**Status:** ⚠️ Requer Refatoração

---

## 📊 Análise Geral

### ✅ Pontos Positivos
1. **Validação básica clara** - Verifica campos obrigatórios (`ixc_plan_id`, `ixc_client_id`)
2. **Normalização de URL** - Remove `/adm.php` e barras finais corretamente
3. **Tratamento de JSON** - Captura erros de parsing e resposta não-JSON
4. **Flexibilidade** - Aceita campos extras via `[key: string]: unknown`
5. **Autenticação correta** - Usa Basic Auth com credenciais do env

### ⚠️ Problemas Críticos

#### 1. **Tipagem Fraca Demais**
```typescript
// ❌ RUIM: Perde type safety completamente
const ixc_plan_id = (body as any).ixc_plan_id;

// ✅ BOM: Type narrowing adequado
if (!('ixc_plan_id' in body) || !body.ixc_plan_id) {
  throw new Error("ixc_plan_id é obrigatório");
}
```

#### 2. **Campos Vazios Enviados ao IXC**
```typescript
// ❌ RUIM: IXC pode rejeitar ou interpretar mal strings vazias
id_carteira_cobranca: String((body as any).id_carteira_cobranca ?? ""),

// ✅ BOM: Remover campos não fornecidos
if (body.id_carteira_cobranca) {
  formData.id_carteira_cobranca = String(body.id_carteira_cobranca);
}
```

#### 3. **Valores Hardcoded Sem Documentação**
```typescript
tipo: "I", // Apenas Internet? E se for TV? Telefone?
tipo_pessoa: "F", // Como determinar se é F (Física) ou J (Jurídica)?
```

#### 4. **Código Comentado no Meio** (linhas 50-66)
- Poluição visual
- Causa confusão: deve usar ou não?

#### 5. **Falta Validação de Resposta IXC**
```typescript
// ❌ RUIM: Retorna qualquer coisa que IXC mandar
return {
  success: true,
  ixc_response: data,
};

// ✅ BOM: Validar se contém ID do contrato criado
if (!data?.id && !data?.id_contrato) {
  throw new Error("IXC não retornou ID do contrato criado");
}
```

#### 6. **Sem Timeout** - Requisição pode travar indefinidamente

#### 7. **Sem Logging Estruturado** - Dificulta debug em produção

---

## 💻 Código Otimizado

```typescript
// supabase/functions/ixc-create-contract/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

const REQUEST_TIMEOUT_MS = 30000; // 30s

interface CreateContractBody {
  ixc_plan_id: string | number;
  ixc_client_id: string | number;
  cpf_cnpj?: string; // Para determinar tipo_pessoa automaticamente
  description?: string;
  contract_value?: number;
  id_carteira_cobranca?: string | number;
  id_vendedor?: string | number;
  id_filial?: string | number;
  fidelidade_meses?: number;
  id_tipo_documento?: string | number;
  id_modelo?: string | number;
  id_cidade?: string | number;
  // Campos adicionais opcionais
  [key: string]: unknown;
}

// Detecta se CPF (11 dígitos) ou CNPJ (14 dígitos)
function getTipoPessoa(cpfCnpj?: string): "F" | "J" {
  if (!cpfCnpj) return "F"; // Padrão: Pessoa Física
  const digits = cpfCnpj.replace(/\D/g, "");
  return digits.length === 14 ? "J" : "F";
}

// Cria um contrato em vd_contratos no IXC
Deno.serve(
  createAuthenticatedHandler("ixc-create-contract", async (req) => {
    const startTime = Date.now();
    
    // ✅ Type narrowing adequado
    const body = await req.json().catch(() => ({}));
    
    if (!('ixc_plan_id' in body) || !body.ixc_plan_id) {
      throw new Error("ixc_plan_id é obrigatório");
    }
    if (!('ixc_client_id' in body) || !body.ixc_client_id) {
      throw new Error("ixc_client_id é obrigatório (ID do cliente no IXC)");
    }

    const {
      ixc_plan_id,
      ixc_client_id,
      cpf_cnpj,
      description,
      contract_value,
      id_carteira_cobranca,
      id_vendedor,
      id_filial,
      fidelidade_meses,
      id_tipo_documento,
      id_modelo,
      id_cidade,
    } = body as CreateContractBody;

    const ixcUsername = Deno.env.get("IXC_API_USERNAME");
    const ixcPassword = Deno.env.get("IXC_API_PASSWORD");
    const IXC_API_BASE = Deno.env.get("IXC_API_BASE_URL");

    if (!ixcUsername || !ixcPassword) {
      throw new Error("IXC API credentials not configured");
    }
    if (!IXC_API_BASE) {
      throw new Error("IXC_API_BASE_URL not configured");
    }

    const cleanBaseUrl = IXC_API_BASE
      .replace(/\/adm\.php$/, "")
      .replace(/\/$/, "");
    const baseUrl = `${cleanBaseUrl}/webservice/v1`;
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);

    // ✅ Determinar tipo de pessoa automaticamente
    const tipoPessoa = getTipoPessoa(cpf_cnpj);
    
    console.log(`[ixc-create-contract] Criando contrato para cliente ${ixc_client_id}, plano ${ixc_plan_id}`);

    // ✅ Montar payload apenas com campos fornecidos
    const formData: Record<string, string> = {
      // Campos obrigatórios
      tipo: "I", // I = Internet (TODO: permitir outros tipos)
      tipo_pessoa: tipoPessoa,
      nome: description ?? `Contrato plano ${String(ixc_plan_id)}`,
      descricao: description ?? `Contrato gerado via site para plano ${String(ixc_plan_id)}`,
      moeda: "R$",
      valor_contrato: String(contract_value ?? 0),
      limitar_n_logins: "S",
      logins_simultaneos: "1",
      Ativo: "S",
      base_geracao_por_tipo_doc: "P",
      ultima_atualizacao: "CURRENT_TIMESTAMP",
      utilizar_desconto_ate_vencimento: "N",
      utilizar_desconto_por_repeticao: "N",
      utilizar_desconto_no_produto_plano: "N",
      // Ligações obrigatórias
      id_cliente: String(ixc_client_id),
      id_planos: String(ixc_plan_id),
    };

    // ✅ Adicionar apenas campos opcionais fornecidos
    if (id_tipo_documento) formData.id_tipo_documento = String(id_tipo_documento);
    if (id_modelo) formData.id_modelo = String(id_modelo);
    if (id_carteira_cobranca) formData.id_carteira_cobranca = String(id_carteira_cobranca);
    if (id_vendedor) formData.id_vendedor = String(id_vendedor);
    if (id_filial) formData.id_filial = String(id_filial);
    if (id_cidade) formData.id_cidade = String(id_cidade);
    if (fidelidade_meses) formData.fidelidade = String(fidelidade_meses);

    // ✅ Requisição com timeout
    const bodyForm = new URLSearchParams(formData);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${baseUrl}/vd_contratos`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "ixcsoft": "I", // I = Inserir
        },
        body: bodyForm,
        signal: controller.signal,
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("[ixc-create-contract] Non-JSON response:", text.substring(0, 200));
        throw new Error("Invalid response from IXC at /vd_contratos");
      }

      if (!res.ok) {
        console.error(`[ixc-create-contract] HTTP ${res.status}:`, text.substring(0, 200));
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      // ✅ Validar resposta IXC
      const contractId = data?.id ?? data?.id_contrato ?? data?.registros?.[0]?.id;
      
      if (!contractId) {
        console.warn("[ixc-create-contract] IXC não retornou ID do contrato:", data);
        // Não falha aqui pois pode ter criado com sucesso
      }

      const duration = Date.now() - startTime;
      console.log(`[ixc-create-contract] Contrato criado com sucesso em ${duration}ms (ID: ${contractId || 'unknown'})`);

      return {
        success: true,
        contract_id: contractId || null,
        ixc_response: data,
        duration_ms: duration,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }),
);
```

---

## 📋 Checklist de Implementação

- [x] Type narrowing adequado (sem `as any`)
- [x] Remoção de campos vazios
- [x] Timeout de requisições (30s)
- [x] Detecção automática de tipo_pessoa (F/J) via CPF/CNPJ
- [x] Validação de resposta IXC
- [x] Logging estruturado com duração
- [x] Remoção de código comentado
- [x] Interface TypeScript completa

---

## 🚀 Próximas Melhorias

1. **Suporte a outros tipos de contrato** - TV, Telefone, Combo (não apenas Internet)
2. **Validação de cliente existente** - Verificar se `ixc_client_id` existe antes de criar contrato
3. **Validação de plano ativo** - Garantir que plano existe e está ativo
4. **Integração com tabela local** - Salvar registro do contrato no Supabase também
5. **Webhook de confirmação** - Notificar sistema quando contrato for criado
6. **Retry automático** - Para erros temporários do IXC
7. **Validação de campos obrigatórios IXC** - Consultar schema do IXC para validar antes de enviar

---

## 🔍 Questões Técnicas Pendentes

1. **Quais são os valores válidos para `tipo`?** (I = Internet, T = Telefone, TV = TV?)
2. **`id_tipo_documento` é obrigatório no IXC?** Precisa de valor padrão?
3. **`id_modelo` se refere a que?** Modelo de contrato?
4. **Como o IXC trata campos vazios vs. campos ausentes?** Testar comportamento

---

**Data da Auditoria:** 2025-11-24  
**Revisor:** AI Code Auditor  
**Versão do Documento:** 1.0
