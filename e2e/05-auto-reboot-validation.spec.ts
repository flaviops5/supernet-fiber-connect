import { test, expect } from '@playwright/test';

/**
 * Fluxo: Auto-Reboot de ONU Congelada
 * Objetivo: Validar detecção e execução de reboot automático
 */
test.describe('Auto-Reboot de ONU', () => {
  const ADMIN_CREDENTIALS = {
    email: 'admin@test.com',
    password: 'admin123',
  };

  const FROZEN_ONU_CLIENT = {
    cpf: '987.654.321-00',
    name: 'Maria Santos',
  };

  test.beforeEach(async ({ page }) => {
    // Login como admin
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', ADMIN_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', ADMIN_CREDENTIALS.password);
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Deve detectar ONU congelada e executar reboot', async ({ page }) => {
    // 1. Navegar para monitoramento
    await page.click('[data-testid="nav-monitoring"]');
    
    // 2. Simular ONU congelada (via API de teste)
    await page.evaluate(async () => {
      await fetch('/api/test/simulate-frozen-onu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: '987.654.321-00',
          signal: -35, // Sinal fraco
          uptime: 72, // 72h sem reiniciar
        }),
      });
    });
    
    // 3. Aguardar detecção automática
    await page.waitForTimeout(5000);
    
    // 4. Validar alerta de ONU congelada
    await expect(page.locator('[data-testid="frozen-onu-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="frozen-onu-alert"]')).toContainText(FROZEN_ONU_CLIENT.name);
    
    // 5. Validar reboot automático iniciado
    await expect(page.locator('[data-testid="auto-reboot-status"]')).toContainText('em andamento');
    
    // 6. Aguardar conclusão do reboot
    await page.waitForTimeout(10000);
    
    // 7. Validar reboot bem-sucedido
    await expect(page.locator('[data-testid="reboot-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="onu-status"]')).toHaveText('online');
    
    // 8. Validar registro no histórico
    await page.click('[data-testid="nav-logs"]');
    await expect(page.locator('[data-testid="log-entry"]').first()).toContainText('Auto-reboot');
    await expect(page.locator('[data-testid="log-entry"]').first()).toContainText('sucesso');
  });

  test('Deve registrar falha se reboot não resolver', async ({ page }) => {
    await page.click('[data-testid="nav-monitoring"]');
    
    // Simular ONU que não responde ao reboot
    await page.evaluate(async () => {
      await fetch('/api/test/simulate-reboot-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: '987.654.321-00' }),
      });
    });
    
    await page.waitForTimeout(15000);
    
    // Validar escalação para técnico
    await expect(page.locator('[data-testid="reboot-failure-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-created-auto"]')).toBeVisible();
    
    // Validar ticket técnico criado automaticamente
    await page.click('[data-testid="nav-tickets"]');
    await expect(page.locator('[data-testid="ticket-list"]')).toContainText('Auto-reboot falhou');
  });

  test('Deve respeitar limite de tentativas de reboot', async ({ page }) => {
    await page.click('[data-testid="nav-monitoring"]');
    
    // Simular múltiplas falhas de reboot
    for (let i = 0; i < 3; i++) {
      await page.evaluate(async () => {
        await fetch('/api/test/simulate-frozen-onu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpf: '987.654.321-00' }),
        });
      });
      await page.waitForTimeout(5000);
    }
    
    // Validar que após 3 tentativas, não tenta mais
    await expect(page.locator('[data-testid="reboot-limit-reached"]')).toBeVisible();
    await expect(page.locator('[data-testid="reboot-limit-reached"]')).toContainText('Limite de tentativas atingido');
  });
});
