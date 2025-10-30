import { test, expect } from '@playwright/test';

/**
 * Fluxo E2E #1: Login → Diagnóstico → Ticket Técnico
 * 
 * Valida:
 * - Autenticação do cliente
 * - Abertura de ticket técnico
 * - Diagnóstico automático
 * - Criação de registro no sistema
 */
test.describe('Fluxo: Login → Diagnóstico → Ticket Técnico', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Cliente deve fazer login, realizar diagnóstico e abrir ticket', async ({ page }) => {
    // Step 1: Login
    await test.step('Login do cliente', async () => {
      await page.click('[data-testid="chat-widget"]');
      await page.waitForSelector('[data-testid="chat-input"]');
      
      // Simular login via CPF
      await page.fill('[data-testid="chat-input"]', '12345678900');
      await page.click('[data-testid="send-message"]');
      
      // Aguardar autenticação
      await page.waitForSelector('[data-testid="customer-authenticated"]', {
        timeout: 10000
      });
      
      expect(await page.textContent('[data-testid="customer-name"]')).toBeTruthy();
    });

    // Step 2: Diagnóstico
    await test.step('Realizar diagnóstico técnico', async () => {
      await page.fill('[data-testid="chat-input"]', 'Minha internet está lenta');
      await page.click('[data-testid="send-message"]');
      
      // Aguardar diagnóstico automático
      await page.waitForSelector('[data-testid="diagnostic-running"]', {
        timeout: 5000
      });
      
      await page.waitForSelector('[data-testid="diagnostic-complete"]', {
        timeout: 15000
      });
      
      // Validar resultados do diagnóstico
      const diagnosticResults = await page.locator('[data-testid="diagnostic-results"]');
      expect(await diagnosticResults.count()).toBeGreaterThan(0);
    });

    // Step 3: Criar Ticket
    await test.step('Criar ticket técnico', async () => {
      await page.click('[data-testid="create-ticket"]');
      
      // Aguardar confirmação
      await page.waitForSelector('[data-testid="ticket-created"]', {
        timeout: 10000
      });
      
      // Validar número do ticket
      const ticketNumber = await page.textContent('[data-testid="ticket-number"]');
      expect(ticketNumber).toMatch(/\d{6,}/);
      
      // Validar mensagem de confirmação
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Ticket criado com sucesso');
    });
  });

  test('Deve exibir mensagem de erro se diagnóstico falhar', async ({ page }) => {
    await page.click('[data-testid="chat-widget"]');
    
    // Simular erro de rede
    await page.route('**/supabase/functions/v1/support-tech-agent', route => 
      route.abort('failed')
    );
    
    await page.fill('[data-testid="chat-input"]', 'Problema técnico');
    await page.click('[data-testid="send-message"]');
    
    // Validar mensagem de erro
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({
      timeout: 10000
    });
  });
});
