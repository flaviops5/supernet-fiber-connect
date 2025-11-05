import { test, expect } from '@playwright/test';

/**
 * Fluxo: Login → Ticket Técnico
 * Objetivo: Validar autenticação e criação de ticket técnico
 */
test.describe('Login e Criação de Ticket Técnico', () => {
  const ADMIN_CREDENTIALS = {
    email: 'admin@test.com',
    password: 'admin123',
  };

  test('Deve fazer login e criar ticket técnico', async ({ page }) => {
    // 1. Navegar para a página de login
    await page.goto('/');
    
    // 2. Validar que está na página de login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // 3. Preencher credenciais
    await page.fill('[data-testid="email-input"]', ADMIN_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', ADMIN_CREDENTIALS.password);
    
    // 4. Submeter login
    await page.click('[data-testid="login-button"]');
    
    // 5. Validar redirecionamento para dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
    
    // 6. Navegar para tickets
    await page.click('[data-testid="nav-tickets"]');
    
    // 7. Criar novo ticket técnico
    await page.click('[data-testid="new-ticket-button"]');
    
    // 8. Preencher formulário de ticket
    await page.fill('[data-testid="ticket-title"]', 'Sem internet - Cliente 12345');
    await page.selectOption('[data-testid="ticket-type"]', 'technical');
    await page.selectOption('[data-testid="ticket-priority"]', 'high');
    await page.fill('[data-testid="ticket-description"]', 'Cliente reporta sem sinal há 2 horas');
    
    // 9. Adicionar cliente ao ticket
    await page.fill('[data-testid="ticket-customer-search"]', '12345');
    await page.click('[data-testid="customer-result-12345"]');
    
    // 10. Submeter ticket
    await page.click('[data-testid="create-ticket-button"]');
    
    // 11. Validar criação
    await expect(page.locator('[data-testid="ticket-created-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-list"]')).toContainText('Sem internet - Cliente 12345');
    
    // 12. Validar status inicial
    await page.click('[data-testid="ticket-row"]:has-text("Sem internet")');
    await expect(page.locator('[data-testid="ticket-status"]')).toHaveText('open');
    await expect(page.locator('[data-testid="ticket-priority-badge"]')).toHaveText('high');
  });

  test('Deve validar erros de autenticação', async ({ page }) => {
    await page.goto('/');
    
    // Tentar login com credenciais inválidas
    await page.fill('[data-testid="email-input"]', 'invalid@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Validar mensagem de erro
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-error"]')).toContainText('Invalid credentials');
    
    // Validar que permanece na página de login
    await expect(page).toHaveURL(/.*login/);
  });

  test('Deve validar campos obrigatórios do ticket', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', ADMIN_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', ADMIN_CREDENTIALS.password);
    await page.click('[data-testid="login-button"]');
    
    await page.click('[data-testid="nav-tickets"]');
    await page.click('[data-testid="new-ticket-button"]');
    
    // Tentar submeter sem preencher campos
    await page.click('[data-testid="create-ticket-button"]');
    
    // Validar erros de validação
    await expect(page.locator('[data-testid="ticket-title-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-type-error"]')).toBeVisible();
  });
});
