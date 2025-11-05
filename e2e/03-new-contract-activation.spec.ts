import { test, expect } from '@playwright/test';

/**
 * Fluxo: Novo Contrato → Ativação → Boas-vindas
 * Objetivo: Validar criação de contrato, ativação e mensagem de boas-vindas
 */
test.describe('Novo Contrato e Ativação', () => {
  const ADMIN_CREDENTIALS = {
    email: 'admin@test.com',
    password: 'admin123',
  };

  const NEW_CONTRACT_DATA = {
    customerName: 'João Silva',
    cpf: '123.456.789-00',
    phone: '61999887766',
    plan: 'Fibra 500MB',
    address: 'Rua Teste, 123',
    cep: '70000-000',
  };

  test.beforeEach(async ({ page }) => {
    // Login como admin
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', ADMIN_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', ADMIN_CREDENTIALS.password);
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Deve criar contrato, ativar e enviar boas-vindas', async ({ page }) => {
    // 1. Navegar para contratos
    await page.click('[data-testid="nav-contracts"]');
    
    // 2. Iniciar novo contrato
    await page.click('[data-testid="new-contract-button"]');
    
    // 3. Preencher dados do cliente
    await page.fill('[data-testid="customer-name"]', NEW_CONTRACT_DATA.customerName);
    await page.fill('[data-testid="customer-cpf"]', NEW_CONTRACT_DATA.cpf);
    await page.fill('[data-testid="customer-phone"]', NEW_CONTRACT_DATA.phone);
    
    // 4. Preencher endereço
    await page.fill('[data-testid="customer-address"]', NEW_CONTRACT_DATA.address);
    await page.fill('[data-testid="customer-cep"]', NEW_CONTRACT_DATA.cep);
    
    // 5. Selecionar plano
    await page.click('[data-testid="plan-selector"]');
    await page.click(`[data-testid="plan-option-${NEW_CONTRACT_DATA.plan}"]`);
    
    // 6. Criar contrato
    await page.click('[data-testid="create-contract-button"]');
    
    // 7. Validar criação
    await expect(page.locator('[data-testid="contract-created-toast"]')).toBeVisible();
    const contractId = await page.locator('[data-testid="contract-id"]').textContent();
    
    // 8. Validar status inicial (pending)
    await expect(page.locator('[data-testid="contract-status"]')).toHaveText('pending');
    
    // 9. Ativar contrato
    await page.click('[data-testid="activate-contract-button"]');
    
    // 10. Confirmar ativação na modal
    await expect(page.locator('[data-testid="activation-modal"]')).toBeVisible();
    await page.click('[data-testid="confirm-activation-button"]');
    
    // 11. Aguardar processamento
    await page.waitForTimeout(2000);
    
    // 12. Validar status atualizado (active)
    await expect(page.locator('[data-testid="contract-status"]')).toHaveText('active');
    
    // 13. Validar envio de mensagem de boas-vindas
    await expect(page.locator('[data-testid="welcome-message-sent"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-message-sent"]')).toContainText('Mensagem de boas-vindas enviada');
    
    // 14. Validar criação no IXC
    await expect(page.locator('[data-testid="ixc-sync-status"]')).toHaveText('synced');
    
    // 15. Navegar para histórico de conversas
    await page.click('[data-testid="nav-conversations"]');
    
    // 16. Buscar conversa com o novo cliente
    await page.fill('[data-testid="conversation-search"]', NEW_CONTRACT_DATA.phone);
    
    // 17. Validar mensagem de boas-vindas no histórico
    await expect(page.locator('[data-testid="conversation-message"]').first()).toContainText('Bem-vindo');
  });

  test('Deve validar campos obrigatórios do contrato', async ({ page }) => {
    await page.click('[data-testid="nav-contracts"]');
    await page.click('[data-testid="new-contract-button"]');
    
    // Tentar criar sem preencher campos
    await page.click('[data-testid="create-contract-button"]');
    
    // Validar erros
    await expect(page.locator('[data-testid="customer-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="customer-cpf-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="customer-phone-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-error"]')).toBeVisible();
  });

  test('Deve impedir ativação de contrato inválido', async ({ page }) => {
    await page.click('[data-testid="nav-contracts"]');
    
    // Selecionar contrato com dados incompletos
    await page.click('[data-testid="contract-row-incomplete"]');
    
    // Tentar ativar
    await page.click('[data-testid="activate-contract-button"]');
    
    // Validar erro
    await expect(page.locator('[data-testid="activation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="activation-error"]')).toContainText('Complete todos os dados');
  });
});
