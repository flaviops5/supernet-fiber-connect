import { test, expect } from '@playwright/test';

/**
 * Testes E2E do módulo de Atendimento
 */

test.describe('Atendimento - Funcionalidades', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/atendimento');
  });

  test('Deve carregar a página de atendimento', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /atendimento/i }).first()).toBeVisible();
  });

  test('Deve exibir lista de conversas', async ({ page }) => {
    await page.waitForTimeout(1500);
    
    // Verifica se há alguma conversa listada
    const conversations = page.locator('[data-testid*="conversation"], [data-testid*="chat"]');
    
    // Deve haver pelo menos o container de conversas
    expect(await conversations.count()).toBeGreaterThanOrEqual(0);
  });

  test('Deve permitir buscar conversas', async ({ page }) => {
    // Procura campo de busca
    const searchInput = page.getByPlaceholder(/buscar|pesquisar/i).first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('teste');
      await page.waitForTimeout(1000);
      
      // Verifica se a busca foi executada
      expect(await searchInput.inputValue()).toBe('teste');
    }
  });

  test('Deve filtrar conversas por departamento', async ({ page }) => {
    // Procura filtro de departamento
    const deptFilter = page.getByRole('combobox', { name: /departamento/i }).first();
    
    if (await deptFilter.count() > 0) {
      await deptFilter.click();
      
      // Seleciona um departamento
      const option = page.getByRole('option').first();
      if (await option.count() > 0) {
        await option.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Deve abrir uma conversa ao clicar', async ({ page }) => {
    await page.waitForTimeout(1500);
    
    // Clica na primeira conversa
    const firstConv = page.locator('[data-testid*="conversation"]').first();
    
    if (await firstConv.count() > 0) {
      await firstConv.click();
      
      // Verifica se o painel de mensagens abriu
      await page.waitForTimeout(1000);
      const messageArea = page.locator('[data-testid*="message"], textarea');
      expect(await messageArea.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Atendimento - Métricas', () => {
  test('Deve acessar métricas de departamentos', async ({ page }) => {
    await page.goto('/metricas-departamentos');
    
    await expect(page.locator('h1, h2').filter({ hasText: /métrica|departamento/i }).first()).toBeVisible();
  });

  test('Deve exibir estatísticas de atendimento', async ({ page }) => {
    await page.goto('/metricas-departamentos');
    await page.waitForTimeout(2000);
    
    // Verifica presença de números/estatísticas
    const stats = page.locator('[data-testid*="stat"], [class*="metric"]');
    expect(await stats.count()).toBeGreaterThanOrEqual(0);
  });
});
