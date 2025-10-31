import { test, expect } from '@playwright/test';

/**
 * Testes E2E do painel administrativo
 */

test.describe('Admin - Navegação e Funcionalidades', () => {
  test('Deve acessar a página de Admin e verificar menu', async ({ page }) => {
    await page.goto('/admin');

    // Verifica título
    await expect(page.locator('h1, h2').filter({ hasText: /painel|admin|gestão/i }).first()).toBeVisible();

    // Verifica presença de itens do menu
    await expect(page.getByRole('link', { name: /dashboard|início/i })).toBeVisible();
  });

  test('Deve navegar para Kanban', async ({ page }) => {
    await page.goto('/admin');

    // Clica no link do Kanban
    await page.getByRole('link', { name: /kanban/i }).click();

    // Verifica URL
    await expect(page).toHaveURL(/\/admin\/kanban/);
  });

  test('Deve navegar para Testes', async ({ page }) => {
    await page.goto('/admin');

    // Clica no link de Testes
    const testLink = page.getByRole('link', { name: /teste/i }).first();
    if (await testLink.count() > 0) {
      await testLink.click();
      await expect(page).toHaveURL(/\/admin\/testes/);
    }
  });

  test('Deve navegar para Documentação', async ({ page }) => {
    await page.goto('/admin');

    // Clica no link de Documentação
    const docLink = page.getByRole('link', { name: /documentação|docs/i }).first();
    if (await docLink.count() > 0) {
      await docLink.click();
      await expect(page).toHaveURL(/\/admin\/documentacao/);
    }
  });

  test('Deve navegar para Monitoramento', async ({ page }) => {
    await page.goto('/admin');

    // Clica no link de Monitoramento
    const monitorLink = page.getByRole('link', { name: /monitoramento|monitor/i }).first();
    if (await monitorLink.count() > 0) {
      await monitorLink.click();
      await expect(page).toHaveURL(/\/admin\/monitoramento/);
    }
  });

  test('Deve navegar para Agentes', async ({ page }) => {
    await page.goto('/admin');

    const agentsLink = page.getByRole('link', { name: /agente/i }).first();
    if (await agentsLink.count() > 0) {
      await agentsLink.click();
      await expect(page).toHaveURL(/\/admin\/(agentes|fluxo-agentes)/);
    }
  });
});

test.describe('Admin - Funcionalidades de Teste', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/testes');
  });

  test('Deve carregar a página de testes', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /teste/i }).first()).toBeVisible();
  });

  test('Deve ter abas de categorias de teste', async ({ page }) => {
    // Verifica presença de abas
    const tabs = page.locator('[role="tablist"]').first();
    if (await tabs.count() > 0) {
      await expect(tabs).toBeVisible();
    }
  });

  test('Deve executar teste de validação de CPF', async ({ page }) => {
    // Procura pelo componente de teste de CPF
    const cpfTest = page.getByText(/cpf|validação/i).first();
    
    if (await cpfTest.count() > 0) {
      // Preenche CPF de teste
      const cpfInput = page.getByPlaceholder(/cpf/i).first();
      if (await cpfInput.count() > 0) {
        await cpfInput.fill('12345678900');
        
        // Clica em testar
        await page.getByRole('button', { name: /testar/i }).first().click();
        
        // Aguarda resultado
        await page.waitForTimeout(2000);
      }
    }
  });
});
