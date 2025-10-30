import { test, expect } from '@playwright/test';

/**
 * Fluxo E2E #4: Mass Outage → Notificação → Resolução → Verificação
 * 
 * Valida:
 * - Detecção automática de mass outage
 * - Notificação em massa via WhatsApp
 * - Resolução do incidente
 * - Verificação e notificação de restabelecimento
 */
test.describe('Fluxo: Mass Outage → Notificação → Resolução', () => {
  const ADMIN_CREDENTIALS = {
    email: 'admin@test.com',
    password: 'test123'
  };

  test.beforeEach(async ({ page }) => {
    // Login como admin para acessar dashboard
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', ADMIN_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', ADMIN_CREDENTIALS.password);
    await page.click('[data-testid="login-button"]');
    
    await page.waitForURL('/admin/dashboard');
  });

  test('Deve detectar mass outage, notificar e resolver', async ({ page }) => {
    // Step 1: Simular mass outage
    await test.step('Simular detecção de mass outage', async () => {
      // Navegar para monitoring
      await page.goto('/admin/monitoring');
      
      // Simular múltiplas reclamações simultâneas
      await page.evaluate(() => {
        // Mock de 15 clientes reportando problema simultaneamente
        for (let i = 0; i < 15; i++) {
          fetch('/api/webhook/whatsapp', {
            method: 'POST',
            body: JSON.stringify({
              customer_id: `customer_${i}`,
              message: 'Sem internet',
              timestamp: new Date().toISOString()
            })
          });
        }
      });
      
      // Aguardar detecção automática
      await page.waitForSelector('[data-testid="mass-outage-alert"]', {
        timeout: 20000
      });
      
      // Validar alerta
      const outageAlert = page.locator('[data-testid="mass-outage-details"]');
      await expect(outageAlert).toContainText('Possível Mass Outage Detectada');
      
      // Validar contagem de clientes afetados
      const affectedCount = await page.textContent('[data-testid="affected-clients-count"]');
      expect(parseInt(affectedCount || '0')).toBeGreaterThanOrEqual(15);
    });

    // Step 2: Validar notificação automática
    await test.step('Validar notificação automática aos clientes', async () => {
      // Aguardar envio de notificações
      await page.waitForSelector('[data-testid="notifications-sent"]', {
        timeout: 15000
      });
      
      // Verificar log de notificações
      await page.click('[data-testid="view-notification-log"]');
      
      const notificationLog = page.locator('[data-testid="notification-entry"]');
      expect(await notificationLog.count()).toBeGreaterThan(0);
      
      // Validar conteúdo da mensagem
      const firstNotification = notificationLog.first();
      await expect(firstNotification).toContainText('problema técnico');
      await expect(firstNotification).toContainText('equipe já está trabalhando');
    });

    // Step 3: Criar incident ticket
    await test.step('Criar incident ticket', async () => {
      await page.click('[data-testid="create-incident-ticket"]');
      
      // Preencher detalhes do incident
      await page.fill('[data-testid="incident-title"]', 'Queda geral de internet - Setor Norte');
      await page.fill('[data-testid="incident-description"]', 'Fibra rompida na Rua Principal');
      await page.selectOption('[data-testid="incident-priority"]', 'critical');
      
      await page.click('[data-testid="submit-incident"]');
      
      // Validar criação
      await page.waitForSelector('[data-testid="incident-created"]', {
        timeout: 10000
      });
      
      const incidentNumber = await page.textContent('[data-testid="incident-number"]');
      expect(incidentNumber).toMatch(/INC-\d{6}/);
    });

    // Step 4: Simular resolução
    await test.step('Simular resolução do problema', async () => {
      // Atualizar status para "Em Resolução"
      await page.click('[data-testid="update-incident-status"]');
      await page.selectOption('[data-testid="status-select"]', 'resolving');
      await page.click('[data-testid="save-status"]');
      
      // Aguardar atualização
      await page.waitForSelector('[data-testid="status-resolving"]', {
        timeout: 5000
      });
      
      // Simular conclusão do reparo
      await page.click('[data-testid="update-incident-status"]');
      await page.selectOption('[data-testid="status-select"]', 'resolved');
      await page.fill('[data-testid="resolution-notes"]', 'Fibra reparada às 14:30');
      await page.click('[data-testid="save-status"]');
      
      // Validar resolução
      await page.waitForSelector('[data-testid="status-resolved"]', {
        timeout: 10000
      });
    });

    // Step 5: Verificar restabelecimento
    await test.step('Verificar restabelecimento automático', async () => {
      // Aguardar verificação automática de conectividade
      await page.waitForSelector('[data-testid="connectivity-verified"]', {
        timeout: 30000
      });
      
      // Validar que clientes voltaram online
      const onlineCount = await page.textContent('[data-testid="online-clients-count"]');
      expect(parseInt(onlineCount || '0')).toBeGreaterThanOrEqual(15);
      
      // Validar taxa de recuperação
      const recoveryRate = await page.textContent('[data-testid="recovery-rate"]');
      expect(parseFloat(recoveryRate || '0')).toBeGreaterThanOrEqual(90);
    });

    // Step 6: Validar notificação de restabelecimento
    await test.step('Validar notificação de restabelecimento', async () => {
      // Verificar envio de notificação de resolução
      await page.waitForSelector('[data-testid="resolution-notifications-sent"]', {
        timeout: 15000
      });
      
      await page.click('[data-testid="view-resolution-notifications"]');
      
      const resolutionNotification = page.locator('[data-testid="resolution-notification-entry"]').first();
      await expect(resolutionNotification).toContainText('restabelecido');
      await expect(resolutionNotification).toContainText('desculpas pelo transtorno');
    });

    // Step 7: Validar fechamento do incident
    await test.step('Fechar incident ticket', async () => {
      await page.click('[data-testid="close-incident"]');
      
      // Validar fechamento
      await page.waitForSelector('[data-testid="incident-closed"]', {
        timeout: 10000
      });
      
      const incidentStatus = await page.textContent('[data-testid="incident-final-status"]');
      expect(incidentStatus).toBe('Fechado');
    });
  });

  test('Deve escalar para manual se auto-recovery falhar', async ({ page }) => {
    await page.goto('/admin/monitoring');
    
    // Simular mass outage
    await page.evaluate(() => {
      for (let i = 0; i < 15; i++) {
        fetch('/api/webhook/whatsapp', {
          method: 'POST',
          body: JSON.stringify({
            customer_id: `customer_${i}`,
            message: 'Sem internet',
            timestamp: new Date().toISOString()
          })
        });
      }
    });
    
    await page.waitForSelector('[data-testid="mass-outage-alert"]', {
      timeout: 20000
    });
    
    // Simular falha na auto-recovery após 5 minutos
    await page.evaluate(() => {
      setTimeout(() => {
        // Auto-recovery timeout
        window.dispatchEvent(new CustomEvent('auto-recovery-timeout'));
      }, 300000); // 5 min
    });
    
    // Validar escalação manual
    await expect(page.locator('[data-testid="manual-intervention-required"]')).toBeVisible({
      timeout: 310000
    });
  });
});
