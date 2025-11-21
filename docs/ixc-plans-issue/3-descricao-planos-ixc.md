# 3️⃣ Descrição dos Planos no IXC

## Estrutura de Planos no IXC Soft

### Endpoints de Planos

O IXC Soft possui **múltiplos módulos** para gerenciar planos, cada um com finalidades diferentes:

#### 1. `/radgrupos` - Grupos RADIUS (Principal)
- **Finalidade**: Grupos de velocidade/perfis de acesso para autenticação RADIUS
- **Uso**: Planos de internet residencial/comercial
- **Campos principais**: 
  - `grupo` (nome do plano)
  - `download` (velocidade)
  - `upload` (velocidade)
  - `valor` (preço)
- **Exemplo**: "100 MEGA", "200 MEGA", "MASTER 500M"

#### 2. `/produto` - Produtos Comerciais
- **Finalidade**: Catálogo de produtos/serviços comercializáveis
- **Uso**: Planos para venda, produtos adicionais
- **Campos principais**:
  - `descricao` (nome do produto)
  - `valor_produto` (preço)
- **Exemplo**: "Mega 400M/150M", "Teste #1"
- **⚠️ Nota**: Pode não ter informações de velocidade

#### 3. `/su_oss_plano` - Planos OSS (Service Order System)
- **Finalidade**: Planos do sistema de ordens de serviço
- **Uso**: Planos corporativos, contratos especiais
- **Campos principais**:
  - `nome` (nome do plano)
  - `download`, `upload` (velocidades)
  - `valor` (preço)
- **Exemplo**: "Plano Corporativo 1GB"

## Por que Buscar de Múltiplos Endpoints?

### Problema Original
Buscando apenas de **1 endpoint**, planos cadastrados em outros módulos não apareciam.

### Solução Multi-Endpoint
Buscar de **3 endpoints** garante:
- ✅ Planos de internet (radgrupos)
- ✅ Planos comerciais (produto)
- ✅ Planos corporativos (su_oss_plano)

### Exemplo Real
```
radgrupos:     120 planos (residenciais)
produto:        80 planos (comerciais)
su_oss_plano:   30 planos (corporativos)
───────────────────────────────────────
TOTAL:         230 planos únicos
```

## Planos "MASTER"

### O que são?
Planos especiais/premium identificados pela palavra "MASTER" no nome.

### Onde podem estar?
- ✅ `radgrupos.grupo` → "MASTER 500M"
- ✅ `produto.descricao` → "Plano MASTER Empresarial"
- ✅ `su_oss_plano.nome` → "MASTER Corporativo"

### Como são identificados?
```typescript
const masterPlans = allPlans.filter(p => 
  (p.grupo?.toUpperCase().includes('MASTER') || 
   p.nome?.toUpperCase().includes('MASTER') ||
   p.descricao?.toUpperCase().includes('MASTER'))
);
```

## Organização Típica no IXC

### Planos Residenciais (radgrupos)
```
├── 100 MEGA (R$ 79,90)
├── 200 MEGA (R$ 99,90)
├── 400 MEGA (R$ 119,90)
├── 600 MEGA (R$ 139,90)
└── MASTER 1GB (R$ 199,90) ⭐
```

### Planos Comerciais (produto)
```
├── Básico Empresarial (R$ 149,90)
├── Avançado Empresarial (R$ 249,90)
└── MASTER Empresarial (R$ 499,90) ⭐
```

### Planos Corporativos (su_oss_plano)
```
├── Dedicado 10MB (R$ 599,90)
├── Dedicado 50MB (R$ 999,90)
└── MASTER Dedicado 100MB (R$ 1.999,90) ⭐
```

## Limitações Conhecidas

### 1. Limite de Paginação
- **Máximo**: 2000 registros por endpoint (20 páginas × 100)
- **Impacto**: Se houver mais planos, alguns não serão retornados
- **Solução**: Aumentar `maxPages` ou remover limite

### 2. Performance
- **3 endpoints**: Tempo de resposta pode ser longo
- **Parallel fetching**: Reduz tempo, mas usa mais recursos
- **Cache**: Não implementado (cada busca consulta API)

### 3. Duplicatas
- **Problema**: Mesmo plano pode existir em múltiplos módulos
- **Solução**: Deduplicação por `id`
- **Risco**: IDs diferentes para o mesmo plano conceitual

## Recomendações

1. **Verificar logs** da Edge Function para ver quantos planos cada endpoint retorna
2. **Confirmar com cliente** em qual(is) endpoint(s) os planos MASTER estão cadastrados
3. **Ajustar busca** se planos estiverem em endpoints específicos
4. **Implementar cache** para melhorar performance
5. **Revisar limite** de páginas se necessário
