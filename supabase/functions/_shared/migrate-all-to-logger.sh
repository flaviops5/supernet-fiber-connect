#!/bin/bash
# Script de migração automática para logger estruturado
# Migra todas as funções restantes de console.log para logger

FUNCTIONS=(
  "generate-ai-faq"
  "generate-ai-flow-simulations"
  "generate-blog-content"
  "generate-contract-pdf"
  "generate-omnichannel-zip"
  "get-function-code"
  "graylog-logs-export"
  "ixc-count-clients"
  "ixc-discover-gpon-endpoints"
  "ixc-endpoints-health"
  "ixc-evolution-proxy"
  "ixc-financial-analytics"
  "ixc-integration"
  "ixc-list-contracts"
  "ixc-list-plans"
  "ixc-list-subjects"
  "ixc-pon-status"
  "ixc-proxy"
  "ixc-revenue-stats"
  "ixc-sync-plans"
  "logistics-agent"
  "mass-outage-executor"
  "metrics-collector"
  "migrate-knowledge-batch"
  "migrate-knowledge-full"
  "network-maintenance-executor"
  "nps-webhook"
  "process-alerts"
  "process-cep-import"
  "process-dlq"
  "reboot-client-equipment"
  "reset-circuit-breaker"
  "retry-failed-actions"
  "send-locaweb-email"
  "send-payment-to-customer"
  "simulate-mass-outage"
  "site-analyzer-agent"
  "summarize-conversation"
  "sync-chatbot-knowledge"
  "sync-github-docs"
  "sync-ixc-documentation"
  "sync-knowledge-docs"
  "system-health"
  "telemedicina-auth"
  "telemedicina-forgot-password"
)

echo "🚀 Migrando ${#FUNCTIONS[@]} funções para logger estruturado..."

for func in "${FUNCTIONS[@]}"; do
  FILE="supabase/functions/$func/index.ts"
  if [ -f "$FILE" ]; then
    # Adicionar import do logger após outros imports
    sed -i "1a import { createLogger } from '../_shared/logger.ts';\nconst logger = createLogger('$func');\n" "$FILE"
    
    # Substituir console.log por logger.info
    sed -i 's/console\.log(/logger.info(/g' "$FILE"
    
    # Substituir console.error por logger.error
    sed -i 's/console\.error(/logger.error(/g' "$FILE"
    
    # Substituir console.warn por logger.warn
    sed -i 's/console\.warn(/logger.warn(/g' "$FILE"
    
    # Substituir console.debug por logger.debug
    sed -i 's/console\.debug(/logger.debug(/g' "$FILE"
    
    echo "✅ $func migrado"
  else
    echo "⚠️ $func não encontrado"
  fi
done

echo "✨ Migração completa!"
