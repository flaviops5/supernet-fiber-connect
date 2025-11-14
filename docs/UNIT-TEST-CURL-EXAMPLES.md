# Exemplos de Execução de Testes via cURL

## 🔧 Configuração Inicial

Primeiro, obtenha seu token de autenticação:

```bash
# Substitua com suas credenciais
export SUPABASE_URL="https://mxdupkbpxjcfxdgrwknp.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export USER_TOKEN="your-jwt-token"
```

## 📋 Executar Todos os Testes com Cobertura

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"coverage": true}' \
  | jq '.'
```

### Response Esperado
```json
{
  "success": true,
  "report": {
    "totalTests": 66,
    "passedTests": 66,
    "failedTests": 0,
    "totalDuration": 145,
    "coverage": 100,
    "suites": [...]
  },
  "coverage": {
    "functions": {...},
    "overall": {
      "statements": 87,
      "branches": 82,
      "functions": 88,
      "lines": 86
    }
  },
  "message": "✅ All 66 tests passed successfully!",
  "timestamp": "2025-11-14T...",
  "executionTime": 145
}
```

## 🎯 Executar Suite Específica

### IXC Proxy (12 testes)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "ixc-proxy",
    "coverage": true
  }' | jq '.'
```

### Detect Mass Outage (11 testes)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "detect-mass-outage",
    "coverage": true
  }' | jq '.'
```

### Routing Agent (19 testes)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "routing-agent",
    "coverage": true
  }' | jq '.'
```

### WhatsApp Webhook (17 testes)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "whatsapp-webhook",
    "coverage": true
  }' | jq '.'
```

### Support Tech Agent (7 testes)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "support-tech-agent",
    "coverage": true
  }' | jq '.'
```

## 📊 Extrair Apenas Cobertura Geral

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"coverage": true}' \
  | jq '.coverage.overall'
```

### Response
```json
{
  "statements": 87,
  "branches": 82,
  "functions": 88,
  "lines": 86,
  "totalTests": 66,
  "passedTests": 66
}
```

## 🔍 Extrair Resultados de Suite Específica

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"suite": "ixc-proxy"}' \
  | jq '.report.suites[0]'
```

### Response
```json
{
  "suite": "ixc-proxy",
  "total": 12,
  "passed": 12,
  "failed": 0,
  "duration": 28,
  "tests": [
    {
      "name": "Cache Management - Test 1",
      "passed": true,
      "duration": 2.3
    },
    ...
  ]
}
```

## ⚡ Script de Execução Completa

Salve como `run-all-tests.sh`:

```bash
#!/bin/bash

# Configuração
SUPABASE_URL="https://mxdupkbpxjcfxdgrwknp.supabase.co"
USER_TOKEN="${USER_TOKEN:-your-token-here}"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Executando Suite Completa de Testes${NC}\n"

# Executar todos os testes
response=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"coverage": true}')

# Extrair resultados
success=$(echo "$response" | jq -r '.success')
totalTests=$(echo "$response" | jq -r '.report.totalTests')
passedTests=$(echo "$response" | jq -r '.report.passedTests')
failedTests=$(echo "$response" | jq -r '.report.failedTests')
duration=$(echo "$response" | jq -r '.report.totalDuration')
coverage=$(echo "$response" | jq -r '.report.coverage')

# Mostrar resumo
echo -e "${YELLOW}📊 Resumo da Execução${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total de Testes: $totalTests"
echo "Testes Passados: $passedTests"
echo "Testes Falhados: $failedTests"
echo "Duração Total: ${duration}ms"
echo "Cobertura: ${coverage}%"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Status final
if [ "$failedTests" -eq 0 ]; then
  echo -e "\n${GREEN}✅ Todos os testes passaram com sucesso!${NC}\n"
  exit 0
else
  echo -e "\n${RED}❌ Alguns testes falharam!${NC}\n"
  exit 1
fi
```

Executar:
```bash
chmod +x run-all-tests.sh
export USER_TOKEN="your-jwt-token"
./run-all-tests.sh
```

## 🐛 Tratamento de Erros

### Token Inválido
```bash
# Response
{
  "success": false,
  "error": "Invalid token"
}
```

### Suite Não Encontrada
```bash
# Response
{
  "success": false,
  "error": "Test suite 'invalid-suite' not found",
  "availableSuites": [
    "ixc-proxy",
    "detect-mass-outage",
    "routing-agent",
    "whatsapp-webhook",
    "support-tech-agent"
  ]
}
```

## 📈 Análise de Tendências

### Comparar Execuções
```bash
# Primeira execução
curl -s -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"coverage": true}' \
  | jq '{
      timestamp: .timestamp,
      totalTests: .report.totalTests,
      passed: .report.passedTests,
      duration: .report.totalDuration,
      coverage: .report.coverage
    }' > test-run-1.json

# Segunda execução (após mudanças)
curl -s -X POST "${SUPABASE_URL}/functions/v1/unit-test-runner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"coverage": true}' \
  | jq '{
      timestamp: .timestamp,
      totalTests: .report.totalTests,
      passed: .report.passedTests,
      duration: .report.totalDuration,
      coverage: .report.coverage
    }' > test-run-2.json

# Comparar
echo "Comparação:"
jq -s '.' test-run-1.json test-run-2.json
```

## 🔄 Integração com CI/CD

### GitHub Actions Example
```yaml
- name: Run Unit Tests
  run: |
    RESPONSE=$(curl -s -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/unit-test-runner" \
      -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{"coverage": true}')
    
    FAILED=$(echo "$RESPONSE" | jq -r '.report.failedTests')
    
    if [ "$FAILED" -ne 0 ]; then
      echo "❌ Tests failed!"
      echo "$RESPONSE" | jq '.report'
      exit 1
    fi
    
    echo "✅ All tests passed!"
```

## 📚 Recursos Adicionais

- [Guia de Execução](./UNIT-TEST-EXECUTION-GUIDE.md)
- [Documentação de Testes](../supabase/functions/tests/README.md)
- [Relatório de Cobertura](./quality/coverage-report-guide.md)
