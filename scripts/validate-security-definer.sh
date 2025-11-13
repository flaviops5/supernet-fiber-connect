#!/bin/bash

# 🔒 Security Definer Validator
# Detects SECURITY DEFINER functions without SET search_path in SQL migrations
# Blocks commits that introduce schema hijacking vulnerabilities

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating SECURITY DEFINER functions in migrations..."

# Get all staged SQL files in supabase/migrations
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "supabase/migrations/.*\.sql$" || true)

if [ -z "$STAGED_FILES" ]; then
  echo "${GREEN}✅ No SQL migrations to validate${NC}"
  exit 0
fi

VULNERABLE_FUNCTIONS=0
VULNERABLE_FILES=""

# Check each staged migration file
for FILE in $STAGED_FILES; do
  if [ ! -f "$FILE" ]; then
    continue
  fi

  echo "📄 Checking: $FILE"

  # Extract all SECURITY DEFINER function definitions
  # Look for CREATE OR REPLACE FUNCTION with SECURITY DEFINER but without search_path
  
  # Use awk to find vulnerable patterns
  VULNERABLE=$(awk '
    BEGIN { in_function = 0; has_definer = 0; has_search_path = 0; func_name = ""; start_line = 0 }
    
    # Detect function start
    /CREATE OR REPLACE FUNCTION/ {
      in_function = 1
      has_definer = 0
      has_search_path = 0
      start_line = NR
      # Extract function name
      match($0, /FUNCTION[[:space:]]+([a-zA-Z0-9_\.]+)/, arr)
      func_name = arr[1]
    }
    
    # Check for SECURITY DEFINER
    in_function && /SECURITY DEFINER/ {
      has_definer = 1
    }
    
    # Check for SET search_path
    in_function && /SET search_path/ {
      has_search_path = 1
    }
    
    # End of function (by language declaration or AS/BEGIN)
    in_function && (/LANGUAGE|AS \$\$|BEGIN/) {
      # If we found SECURITY DEFINER but no search_path, report it
      if (has_definer && !has_search_path && func_name != "") {
        print start_line ":" func_name
      }
      # Reset for next function
      in_function = 0
      has_definer = 0
      has_search_path = 0
      func_name = ""
    }
  ' "$FILE")

  if [ ! -z "$VULNERABLE" ]; then
    echo "${RED}❌ VULNERABLE SECURITY DEFINER functions found:${NC}"
    echo "$VULNERABLE" | while IFS=: read -r LINE_NUM FUNC_NAME; do
      echo "${RED}   Line $LINE_NUM: $FUNC_NAME${NC}"
      echo "${YELLOW}   Missing: SET search_path TO 'public'${NC}"
    done
    VULNERABLE_FUNCTIONS=$((VULNERABLE_FUNCTIONS + 1))
    VULNERABLE_FILES="${VULNERABLE_FILES}\n  - $FILE"
  fi
done

# Report results
echo ""
if [ $VULNERABLE_FUNCTIONS -gt 0 ]; then
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${RED}🚨 COMMIT BLOCKED: Schema Hijacking Vulnerability Detected${NC}"
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "${YELLOW}Found $VULNERABLE_FUNCTIONS file(s) with vulnerable SECURITY DEFINER functions:${NC}"
  echo -e "$VULNERABLE_FILES"
  echo ""
  echo "${YELLOW}📖 Why this is dangerous:${NC}"
  echo "   SECURITY DEFINER functions without 'SET search_path' are vulnerable"
  echo "   to schema hijacking attacks. An attacker can create malicious schemas"
  echo "   to intercept function calls and bypass security policies."
  echo ""
  echo "${GREEN}✅ How to fix:${NC}"
  echo "   Add 'SET search_path TO 'public'' to each SECURITY DEFINER function:"
  echo ""
  echo "   ${GREEN}CREATE OR REPLACE FUNCTION my_function()${NC}"
  echo "   ${GREEN}RETURNS void${NC}"
  echo "   ${GREEN}LANGUAGE plpgsql${NC}"
  echo "   ${GREEN}SECURITY DEFINER${NC}"
  echo "   ${GREEN}SET search_path TO 'public'  -- Add this line${NC}"
  echo "   ${GREEN}AS \$\$${NC}"
  echo "   ${GREEN}BEGIN${NC}"
  echo "   ${GREEN}  -- function body${NC}"
  echo "   ${GREEN}END;${NC}"
  echo "   ${GREEN}\$\$;${NC}"
  echo ""
  echo "${YELLOW}📚 References:${NC}"
  echo "   - ACT-003: docs/ACT-003-SECURITY-DEFINER-AUDIT.md"
  echo "   - PostgreSQL Docs: https://www.postgresql.org/docs/current/sql-createfunction.html"
  echo ""
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
else
  echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${GREEN}✅ All SECURITY DEFINER functions are secure${NC}"
  echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi
