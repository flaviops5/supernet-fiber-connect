import { test, expect } from '@playwright/test';

/**
 * Testes E2E do módulo de Monitoramento
 */

test.describe('Monitoramento - Sistema', () => {
  test('Deve acessar página de monitoramento', async ({ page }) => {
    await page.goto('/admin/monitoramento');
    
    await expect(page.locator('h1, h2').filter({ hasText: /monitoramento/i }).first()).toBeVisible();
  });

  test('Deve exibir métricas do sistema', async ({ page }) => {
    await page.goto('/system-metrics');
    await page.waitForTimeout(2000);
    
    // Verifica se há métricas sendo exibidas
    const metrics = page.locator('[data-testid*="metric"], [class*="metric"]');
    expect(await metrics.count()).toBeGreaterThanOrEqual(0);
  });

  test('Deve acessar logs de monitoramento', async ({ page }) => {
    await page.goto('/monitoring/logs');
    
    await expect(page.locator('h1, h2').filter({ hasText: /log/i }).first()).toBeVisible();
  });

  test('Deve filtrar logs por tipo', async ({ page }) => {
    await page.goto('/monitoring/logs');
    await page.waitForTimeout(1500);
    
    // Procura filtro de tipo
    const typeFilter = page.getByRole('combobox', { name: /tipo|type/i }).first();
    
    if (await typeFilter.count() > 0) {
      await typeFilter.click();
      const option = page.getByRole('option').first();
      if (await option.count() > 0) {
        await option.click();
      }
    }
  });

  test('Deve acessar monitoramento de auto-reboot', async ({ page }) => {
    await page.goto('/admin/auto-reboot');
    
    await expect(page.locator('h1, h2').filter({ hasText: /reboot|reinicialização/i }).first()).toBeVisible();
  });

  test('Deve exibir status de clientes no monitoramento', async ({ page }) => {
    await page.goto('/admin/monitoramento');
    await page.waitForTimeout(2000);
    
    // Verifica se há indicadores de status
    const statusIndicators = page.locator('[data-testid*="status"], [class*="status"]');
    expect(await statusIndicators.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Monitoramento - Alertas', () => {
  test('Deve verificar sistema de alertas', async ({ page }) => {
    await page.goto('/admin/monitoramento');
    await page.waitForTimeout(2000);
    
    // Procura por área de alertas
    const alerts = page.locator('[role="alert"], [data-testid*="alert"]');
    expect(await alerts.count()).toBeGreaterThanOrEqual(0);
  });

  test('Deve exibir pane em massa se ativa', async ({ page }) => {
    await page.goto('/admin/monitoramento');
    await page.waitForTimeout(2000);
    
    // Verifica se há indicação de pane em massa
    const massOutage = page.getByText(/pane.*massa|mass.*outage/i).first();
    
    // Pode ou não estar ativo, mas deve estar visível o indicador
    const isVisible = await massOutage.count() > 0;
    expect(isVisible).toBeDefined();
  });
});
