import { test, expect } from '@playwright/test';

/**
 * Fluxo E2E #2: Cliente Bloqueado → Pagamento → Desbloqueio
 * 
 * Valida:
 * - Detecção de cliente bloqueado
 * - Fluxo de pagamento
 * - Desbloqueio automático após pagamento
 * - Notificações ao cliente
 */
test.describe('Fluxo: Cliente Bloqueado → Pagamento → Desbloqueio', () => {
  const BLOCKED_CLIENT_CPF = '99999999999';
  const VALID_PAYMENT_CODE = '1234567890';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Cliente bloqueado deve conseguir pagar e ser desbloqueado', async ({ page }) => {
    // Step 1: Identificar cliente bloqueado
    await test.step('Identificar cliente bloqueado', async () => {
      await page.click('[data-testid="chat-widget"]');
      await page.fill('[data-testid="chat-input"]', BLOCKED_CLIENT_CPF);
      await page.click('[data-testid="send-message"]');
      
      // Aguardar detecção de bloqueio
      await page.waitForSelector('[data-testid="client-blocked-warning"]', {
        timeout: 10000
      });
      
      // Validar mensagem de bloqueio
      await expect(page.locator('[data-testid="block-reason"]')).toContainText('inadimplência');
    });

    // Step 2: Exibir opções de pagamento
    await test.step('Exibir opções de pagamento', async () => {
      await page.fill('[data-testid="chat-input"]', 'Quero pagar');
      await page.click('[data-testid="send-message"]');
      
      // Aguardar boleto/pix
      await page.waitForSelector('[data-testid="payment-options"]', {
        timeout: 10000
      });
      
      // Validar opções disponíveis
      const pixOption = page.locator('[data-testid="payment-pix"]');
      const boletoOption = page.locator('[data-testid="payment-boleto"]');
      
      expect(await pixOption.isVisible()).toBeTruthy();
      expect(await boletoOption.isVisible()).toBeTruthy();
    });

    // Step 3: Simular pagamento
    await test.step('Simular pagamento via PIX', async () => {
      await page.click('[data-testid="payment-pix"]');
      
      // Aguardar QR Code
      await page.waitForSelector('[data-testid="pix-qrcode"]', {
        timeout: 10000
      });
      
      const pixCode = await page.textContent('[data-testid="pix-code"]');
      expect(pixCode).toBeTruthy();
      
      // Simular confirmação de pagamento (webhook IXC)
      await page.evaluate(() => {
        // Mock do webhook de confirmação
        fetch('/api/webhook/payment-confirmed', {
          method: 'POST',
          body: JSON.stringify({
            client_id: '313',
            payment_status: 'paid',
            payment_code: '1234567890'
          })
        });
      });
    });

    // Step 4: Validar desbloqueio
    await test.step('Validar desbloqueio automático', async () => {
      // Aguardar confirmação de desbloqueio
      await page.waitForSelector('[data-testid="unblock-confirmation"]', {
        timeout: 15000
      });
      
      // Validar mensagem de sucesso
      await expect(page.locator('[data-testid="success-message"]')).toContainText('desbloqueado');
      
      // Validar status do cliente
      const clientStatus = await page.textContent('[data-testid="client-status"]');
      expect(clientStatus).toBe('ativo');
    });

    // Step 5: Validar notificação WhatsApp
    await test.step('Validar envio de notificação', async () => {
      // Verificar se mensagem de confirmação foi enviada
      const notification = page.locator('[data-testid="whatsapp-notification-sent"]');
      await expect(notification).toBeVisible({ timeout: 10000 });
    });
  });

  test('Deve exibir erro se pagamento falhar', async ({ page }) => {
    await page.click('[data-testid="chat-widget"]');
    await page.fill('[data-testid="chat-input"]', BLOCKED_CLIENT_CPF);
    await page.click('[data-testid="send-message"]');
    
    await page.waitForSelector('[data-testid="payment-options"]', {
      timeout: 10000
    });
    
    // Simular erro de pagamento
    await page.route('**/api/webhook/payment-confirmed', route => 
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Payment gateway unavailable' })
      })
    );
    
    await page.click('[data-testid="payment-pix"]');
    
    // Validar mensagem de erro
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible({
      timeout: 10000
    });
  });
});
