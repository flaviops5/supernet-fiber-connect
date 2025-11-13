#!/bin/bash

# 🔧 Setup Git Hooks for Security Validation
# Installs Husky and configures pre-commit hooks

set -e

echo "🔧 Setting up Git hooks..."

# Install husky if not already installed
if [ ! -d ".husky" ]; then
  echo "📦 Installing Husky..."
  npm install --save-dev husky
  npx husky install
fi

# Make validation script executable
chmod +x scripts/validate-security-definer.sh

# Create pre-commit hook
echo "📝 Creating pre-commit hook..."
npx husky add .husky/pre-commit "npm run validate:security-definer"

# Make hook executable
chmod +x .husky/pre-commit

echo "✅ Git hooks configured successfully!"
echo ""
echo "ℹ️  The following validations will run on every commit:"
echo "   - SECURITY DEFINER functions without SET search_path"
echo ""
echo "💡 To skip validation (not recommended), use: git commit --no-verify"
