#!/bin/bash

# Script para executar coverage report completo

echo "🧪 Executando testes com coverage..."
npm run test -- --coverage

echo ""
echo "📊 Relatório gerado em: ./coverage/"
echo ""
echo "Para ver o relatório HTML:"
echo "  - macOS:   open coverage/index.html"
echo "  - Windows: start coverage/index.html"
echo "  - Linux:   xdg-open coverage/index.html"
echo ""

# Verificar thresholds
COVERAGE_FILE="./coverage/coverage-summary.json"

if [ -f "$COVERAGE_FILE" ]; then
  STATEMENTS=$(jq '.total.statements.pct' "$COVERAGE_FILE")
  BRANCHES=$(jq '.total.branches.pct' "$COVERAGE_FILE")
  FUNCTIONS=$(jq '.total.functions.pct' "$COVERAGE_FILE")
  LINES=$(jq '.total.lines.pct' "$COVERAGE_FILE")
  
  echo "📈 Coverage Summary:"
  echo "  Statements: $STATEMENTS%"
  echo "  Branches:   $BRANCHES%"
  echo "  Functions:  $FUNCTIONS%"
  echo "  Lines:      $LINES%"
  echo ""
  
  # Check if meets thresholds (85%)
  THRESHOLD=85
  
  STATEMENTS_OK=$(echo "$STATEMENTS >= $THRESHOLD" | bc -l)
  BRANCHES_OK=$(echo "$BRANCHES >= $THRESHOLD" | bc -l)
  FUNCTIONS_OK=$(echo "$FUNCTIONS >= $THRESHOLD" | bc -l)
  LINES_OK=$(echo "$LINES >= $THRESHOLD" | bc -l)
  
  if [ "$STATEMENTS_OK" -eq 1 ] && [ "$BRANCHES_OK" -eq 1 ] && [ "$FUNCTIONS_OK" -eq 1 ] && [ "$LINES_OK" -eq 1 ]; then
    echo "✅ Coverage acima dos thresholds! (85%+)"
    exit 0
  else
    echo "⚠️  Coverage abaixo dos thresholds (85%)"
    echo ""
    echo "Áreas para melhorar:"
    [ "$STATEMENTS_OK" -eq 0 ] && echo "  - Statements: $STATEMENTS% < $THRESHOLD%"
    [ "$BRANCHES_OK" -eq 0 ] && echo "  - Branches: $BRANCHES% < $THRESHOLD%"
    [ "$FUNCTIONS_OK" -eq 0 ] && echo "  - Functions: $FUNCTIONS% < $THRESHOLD%"
    [ "$LINES_OK" -eq 0 ] && echo "  - Lines: $LINES% < $THRESHOLD%"
    exit 1
  fi
else
  echo "⚠️  Arquivo de summary não encontrado"
  exit 1
fi
