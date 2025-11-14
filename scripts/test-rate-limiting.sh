#!/bin/bash

# ============================================
# RATE LIMITING - Script de Teste
# ============================================
# Testa os limites de rate limiting das edge functions

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuração
PROJECT_ID="${SUPABASE_PROJECT_ID:-mxdupkbpxjcfxdgrwknp}"
SUPABASE_URL="https://${PROJECT_ID}.supabase.co"
ANON_KEY="${SUPABASE_ANON_KEY}"

echo -e "${BLUE}=== RATE LIMITING TEST SUITE ===${NC}\n"

# ============================================
# Teste 1: Rate Limiting por IP (Público)
# ============================================
test_public_rate_limit() {
  local endpoint=$1
  local max_requests=$2
  local function_path=$3
  
  echo -e "${YELLOW}Testando: ${endpoint}${NC}"
  echo "Limite: ${max_requests} req/min"
  echo "Fazendo $(($max_requests + 2)) requisições..."
  
  local success_count=0
  local rate_limited_count=0
  
  for i in $(seq 1 $(($max_requests + 2))); do
    response_code=$(curl -s -o /dev/null -w "%{http_code}" \
      "${SUPABASE_URL}/functions/v1/${function_path}" \
      -H "Content-Type: application/json" \
      -d '{"cpf":"12345678900","password":"test123"}')
    
    if [ "$response_code" = "200" ] || [ "$response_code" = "400" ]; then
      ((success_count++))
      echo -ne "  ✓ Requisição $i: ${GREEN}$response_code${NC}\r"
    elif [ "$response_code" = "429" ]; then
      ((rate_limited_count++))
      echo -ne "  ✗ Requisição $i: ${RED}$response_code (Rate Limited)${NC}\n"
    else
      echo -ne "  ? Requisição $i: ${YELLOW}$response_code${NC}\n"
    fi
    
    # Pequeno delay para não saturar
    sleep 0.1
  done
  
  echo ""
  echo "Resultado:"
  echo "  - Requisições bem-sucedidas: ${success_count}"
  echo "  - Requisições bloqueadas (429): ${rate_limited_count}"
  
  if [ $rate_limited_count -gt 0 ]; then
    echo -e "  ${GREEN}✓ Rate limiting funcionando!${NC}"
    return 0
  else
    echo -e "  ${RED}✗ Rate limiting NÃO funcionando${NC}"
    return 1
  fi
}

# ============================================
# Teste 2: Headers de Rate Limiting
# ============================================
test_rate_limit_headers() {
  local function_path=$1
  
  echo -e "\n${YELLOW}Testando headers de rate limiting: ${function_path}${NC}"
  
  response=$(curl -s -i \
    "${SUPABASE_URL}/functions/v1/${function_path}" \
    -H "Content-Type: application/json" \
    -d '{"cpf":"12345678900","password":"test123"}')
  
  echo "Headers recebidos:"
  
  if echo "$response" | grep -q "x-ratelimit-limit"; then
    limit=$(echo "$response" | grep -i "x-ratelimit-limit" | cut -d: -f2 | tr -d ' \r\n')
    echo -e "  X-RateLimit-Limit: ${GREEN}${limit}${NC}"
  else
    echo -e "  X-RateLimit-Limit: ${RED}Não encontrado${NC}"
  fi
  
  if echo "$response" | grep -q "x-ratelimit-remaining"; then
    remaining=$(echo "$response" | grep -i "x-ratelimit-remaining" | cut -d: -f2 | tr -d ' \r\n')
    echo -e "  X-RateLimit-Remaining: ${GREEN}${remaining}${NC}"
  else
    echo -e "  X-RateLimit-Remaining: ${RED}Não encontrado${NC}"
  fi
  
  if echo "$response" | grep -q "x-ratelimit-reset"; then
    reset=$(echo "$response" | grep -i "x-ratelimit-reset" | cut -d: -f2 | tr -d ' \r\n')
    echo -e "  X-RateLimit-Reset: ${GREEN}${reset}${NC}"
  fi
}

# ============================================
# Teste 3: Resposta 429
# ============================================
test_429_response() {
  local function_path=$1
  
  echo -e "\n${YELLOW}Testando resposta 429: ${function_path}${NC}"
  echo "Saturando rate limit..."
  
  # Fazer muitas requisições para garantir 429
  for i in {1..20}; do
    curl -s -o /dev/null \
      "${SUPABASE_URL}/functions/v1/${function_path}" \
      -H "Content-Type: application/json" \
      -d '{"cpf":"12345678900","password":"test123"}' &
  done
  
  wait
  
  # Fazer uma última e capturar resposta
  response=$(curl -s \
    "${SUPABASE_URL}/functions/v1/${function_path}" \
    -H "Content-Type: application/json" \
    -d '{"cpf":"12345678900","password":"test123"}')
  
  echo "Resposta recebida:"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  
  if echo "$response" | grep -q "rate.*limit\|Rate.*Limit"; then
    echo -e "\n${GREEN}✓ Mensagem de rate limit detectada${NC}"
  else
    echo -e "\n${YELLOW}⚠ Mensagem de rate limit não clara${NC}"
  fi
}

# ============================================
# Executar Testes
# ============================================

echo -e "${BLUE}Teste 1: Endpoint de Autenticação${NC}"
test_public_rate_limit "Telemedicina Auth" 10 "telemedicina-auth"

echo -e "\n${BLUE}Teste 2: Endpoint de Recuperação de Senha${NC}"
test_public_rate_limit "Telemedicina Forgot Password" 10 "telemedicina-forgot-password"

echo -e "\n${BLUE}Teste 3: Headers de Rate Limiting${NC}"
test_rate_limit_headers "telemedicina-auth"

echo -e "\n${BLUE}Teste 4: Resposta 429${NC}"
test_429_response "telemedicina-auth"

# ============================================
# Resumo
# ============================================

echo -e "\n${BLUE}=== RESUMO DOS TESTES ===${NC}"
echo "Todos os testes foram executados."
echo ""
echo "Para verificar logs detalhados:"
echo "  https://supabase.com/dashboard/project/${PROJECT_ID}/functions/telemedicina-auth/logs"
echo ""
echo "Para verificar métricas de rate limiting:"
echo "  https://supabase.com/dashboard/project/${PROJECT_ID}/logs/edge-functions"

echo -e "\n${GREEN}✓ Testes concluídos!${NC}"
