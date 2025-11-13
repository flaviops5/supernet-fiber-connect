#!/bin/bash
# ============================================
# SCRIPT DE VALIDAÇÃO DE SEGURANÇA
# ============================================
# Valida múltiplos aspectos de segurança:
# 1. Funções SECURITY DEFINER sem SET search_path
# 2. Edge functions sem autenticação (createPublicHandler)
# 3. Secrets hardcoded no código
#
# USO:
#   ./scripts/validate-security.sh
#   ou como pre-commit hook

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 ============================================${NC}"
echo -e "${GREEN}🔍 VALIDAÇÃO DE SEGURANÇA${NC}"
echo -e "${GREEN}🔍 ============================================${NC}"
echo ""

VALIDATION_FAILED=0

# ============================================
# 1. VALIDAR SECURITY DEFINER
# ============================================
echo -e "${YELLOW}📋 [1/3] Validando SECURITY DEFINER functions...${NC}"
echo ""

VULNERABLE_FUNCTIONS=0
MIGRATION_FILES=$(find supabase/migrations -name "*.sql" 2>/dev/null || echo "")

if [ -z "$MIGRATION_FILES" ]; then
  echo -e "${GREEN}✅ Nenhum arquivo de migration encontrado${NC}"
else
  for FILE in $MIGRATION_FILES; do
    # Buscar funções SECURITY DEFINER sem SET search_path
    VULNERABLE=$(awk '
      BEGIN { in_function=0; has_search_path=0; function_start=0; function_name="" }
      
      /CREATE OR REPLACE FUNCTION|CREATE FUNCTION/ {
        in_function=1
        has_search_path=0
        function_start=NR
        function_name=$4
      }
      
      /SECURITY DEFINER/ && in_function {
        # Marca que encontrou SECURITY DEFINER
      }
      
      /SET search_path/ && in_function {
        has_search_path=1
      }
      
      /\$\$;/ && in_function {
        # Fim da função
        if (in_function && !has_search_path) {
          # Ignora funções do pgvector
          if (function_name !~ /vector|handler|ivf|hnsw|halfvec|sparsevec|hamming|jaccard/) {
            print "Line " function_start ": " function_name
          }
        }
        in_function=0
        has_search_path=0
      }
    ' "$FILE")
    
    if [ ! -z "$VULNERABLE" ]; then
      VULNERABLE_FUNCTIONS=$((VULNERABLE_FUNCTIONS + 1))
      echo -e "${RED}❌ $FILE${NC}"
      echo "$VULNERABLE" | while read line; do
        echo -e "${RED}   $line${NC}"
      done
      echo ""
    fi
  done
fi

if [ $VULNERABLE_FUNCTIONS -gt 0 ]; then
  echo -e "${RED}🚨 FALHA: $VULNERABLE_FUNCTIONS arquivos com funções vulneráveis${NC}"
  VALIDATION_FAILED=1
else
  echo -e "${GREEN}✅ PASSOU: Nenhuma função SECURITY DEFINER vulnerável${NC}"
fi

echo ""

# ============================================
# 2. VALIDAR EDGE FUNCTIONS SEM AUTH
# ============================================
echo -e "${YELLOW}📋 [2/3] Validando Edge Functions sem autenticação...${NC}"
echo ""

PUBLIC_HANDLERS=0
EDGE_FUNCTION_FILES=$(find supabase/functions -name "index.ts" 2>/dev/null || echo "")

if [ -z "$EDGE_FUNCTION_FILES" ]; then
  echo -e "${GREEN}✅ Nenhuma edge function encontrada${NC}"
else
  for FILE in $EDGE_FUNCTION_FILES; do
    # Ignorar funções que legitimamente devem ser públicas
    if [[ "$FILE" =~ (whatsapp-webhook|detect-mass-outage|telemedicina|webhook-alerts|system-health) ]]; then
      continue
    fi
    
    # Verificar se usa createPublicHandler
    if grep -q "createPublicHandler" "$FILE"; then
      PUBLIC_HANDLERS=$((PUBLIC_HANDLERS + 1))
      FUNCTION_NAME=$(basename $(dirname "$FILE"))
      echo -e "${YELLOW}⚠️  $FUNCTION_NAME usa createPublicHandler${NC}"
      echo -e "${YELLOW}   Arquivo: $FILE${NC}"
      echo ""
    fi
  done
fi

if [ $PUBLIC_HANDLERS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  AVISO: $PUBLIC_HANDLERS edge functions públicas encontradas${NC}"
  echo -e "${YELLOW}   Revise se realmente devem ser públicas${NC}"
else
  echo -e "${GREEN}✅ PASSOU: Todas as edge functions requerem autenticação${NC}"
fi

echo ""

# ============================================
# 3. VALIDAR SECRETS HARDCODED
# ============================================
echo -e "${YELLOW}📋 [3/3] Validando secrets hardcoded...${NC}"
echo ""

HARDCODED_SECRETS=0

# Buscar padrões de API keys hardcoded
PATTERNS=(
  "API_KEY\s*=\s*['\"][a-zA-Z0-9]+"
  "api_key:\s*['\"][a-zA-Z0-9]+"
  "password\s*=\s*['\"][^'\"]*['\"]"
  "token\s*=\s*['\"][a-zA-Z0-9]+"
  "secret\s*=\s*['\"][a-zA-Z0-9]+"
)

for PATTERN in "${PATTERNS[@]}"; do
  RESULTS=$(grep -r -E "$PATTERN" supabase/functions --include="*.ts" 2>/dev/null | grep -v "Deno.env.get" || echo "")
  
  if [ ! -z "$RESULTS" ]; then
    HARDCODED_SECRETS=$((HARDCODED_SECRETS + 1))
    echo -e "${RED}❌ Possível secret hardcoded encontrado:${NC}"
    echo "$RESULTS"
    echo ""
  fi
done

if [ $HARDCODED_SECRETS -gt 0 ]; then
  echo -e "${RED}🚨 FALHA: $HARDCODED_SECRETS possíveis secrets hardcoded${NC}"
  VALIDATION_FAILED=1
else
  echo -e "${GREEN}✅ PASSOU: Nenhum secret hardcoded encontrado${NC}"
fi

echo ""

# ============================================
# RESULTADO FINAL
# ============================================
echo -e "${GREEN}============================================${NC}"

if [ $VALIDATION_FAILED -eq 1 ]; then
  echo -e "${RED}🚨 VALIDAÇÃO FALHOU${NC}"
  echo ""
  echo -e "${RED}❌ Corrija os problemas acima antes de continuar${NC}"
  echo ""
  echo -e "${YELLOW}📖 Documentação:${NC}"
  echo -e "${YELLOW}   - docs/ACT-003-SECURITY-DEFINER-AUDIT.md${NC}"
  echo -e "${YELLOW}   - docs/FASE-1-P0-COMPLETO.md${NC}"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ VALIDAÇÃO PASSOU${NC}"
  echo ""
  echo -e "${GREEN}✅ Todas as verificações de segurança passaram${NC}"
  echo ""
fi

echo -e "${GREEN}============================================${NC}"
