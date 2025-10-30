import { test, expect } from '@playwright/test';

/**
 * Fluxo E2E #3: Contrato Novo → Ativação → WhatsApp Welcome
 * 
 * Valida:
 * - Criação de novo contrato
 * - Agendamento de instalação
 * - Ativação do serviço
 * - Mensagem de boas-vindas no WhatsApp
 */
test.describe('Fluxo: Contrato Novo → Ativação → WhatsApp Welcome', () => {
  const NEW_CLIENT = {
    cpf: '11111111111',
    name: 'João da Silva',
    phone: '5511999999999',
    address: 'Rua Teste, 123',
    plan: '300 Mega'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Cliente novo deve contratar plano, agendar instalação e receber boas-vindas', async ({ page }) => {
    // Step 1: Iniciar contratação
    await test.step('Iniciar contratação de plano', async () => {
      await page.click('[data-testid="chat-widget"]');
      await page.fill('[data-testid="chat-input"]', 'Quero contratar internet');
      await page.click('[data-testid="send-message"]');
      
      // Aguardar exibição de planos
      await page.waitForSelector('[data-testid="plans-list"]', {
        timeout: 10000
      });
      
      // Validar planos disponíveis
      const plans = page.locator('[data-testid="plan-item"]');
      expect(await plans.count()).toBeGreaterThan(0);
    });

    // Step 2: Selecionar plano
    await test.step('Selecionar plano 300 Mega', async () => {
      await page.click('[data-testid="plan-300mega"]');
      
      // Validar seleção
      await expect(page.locator('[data-testid="selected-plan"]')).toContainText('300 Mega');
      
      // Prosseguir para cadastro
      await page.click('[data-testid="continue-to-signup"]');
    });

    // Step 3: Preencher cadastro
    await test.step('Preencher dados do cliente', async () => {
      await page.fill('[data-testid="input-cpf"]', NEW_CLIENT.cpf);
      await page.fill('[data-testid="input-name"]', NEW_CLIENT.name);
      await page.fill('[data-testid="input-phone"]', NEW_CLIENT.phone);
      await page.fill('[data-testid="input-address"]', NEW_CLIENT.address);
      
      // Validar preenchimento
      expect(await page.inputValue('[data-testid="input-cpf"]')).toBe(NEW_CLIENT.cpf);
      
      // Aceitar termos
      await page.check('[data-testid="accept-terms"]');
      
      // Submeter
      await page.click('[data-testid="submit-signup"]');
    });

    // Step 4: Agendar instalação
    await test.step('Agendar instalação', async () => {
      await page.waitForSelector('[data-testid="installation-scheduler"]', {
        timeout: 10000
      });
      
      // Selecionar data disponível
      const firstAvailableDate = page.locator('[data-testid="available-date"]').first();
      await firstAvailableDate.click();
      
      // Selecionar horário
      const firstAvailableTime = page.locator('[data-testid="available-time"]').first();
      await firstAvailableTime.click();
      
      // Confirmar agendamento
      await page.click('[data-testid="confirm-installation"]');
      
      // Validar confirmação
      await page.waitForSelector('[data-testid="installation-confirmed"]', {
        timeout: 10000
      });
    });

    // Step 5: Validar criação do contrato
    await test.step('Validar contrato criado', async () => {
      // Aguardar número do contrato
      await page.waitForSelector('[data-testid="contract-number"]', {
        timeout: 15000
      });
      
      const contractNumber = await page.textContent('[data-testid="contract-number"]');
      expect(contractNumber).toMatch(/\d{6,}/);
      
      // Validar status
      const contractStatus = await page.textContent('[data-testid="contract-status"]');
      expect(contractStatus).toContain('Aguardando Instalação');
    });

    // Step 6: Simular ativação
    await test.step('Simular ativação do serviço', async () => {
      // Mock de ativação (normalmente feito pelo técnico)
      await page.evaluate(() => {
        fetch('/api/webhook/service-activated', {
          method: 'POST',
          body: JSON.stringify({
            contract_id: '123456',
            activation_status: 'active'
          })
        });
      });
      
      // Aguardar confirmação de ativação
      await page.waitForSelector('[data-testid="service-active"]', {
        timeout: 10000
      });
    });

    // Step 7: Validar mensagem de boas-vindas
    await test.step('Validar mensagem de boas-vindas WhatsApp', async () => {
      // Verificar envio de welcome message
      await page.waitForSelector('[data-testid="welcome-message-sent"]', {
        timeout: 15000
      });
      
      // Validar conteúdo da mensagem
      const welcomeMessage = page.locator('[data-testid="welcome-message-content"]');
      await expect(welcomeMessage).toContainText('Bem-vindo');
      await expect(welcomeMessage).toContainText(NEW_CLIENT.name);
      await expect(welcomeMessage).toContainText('300 Mega');
    });
  });

  test('Deve exibir erro se CPF já estiver cadastrado', async ({ page }) => {
    await page.click('[data-testid="chat-widget"]');
    await page.fill('[data-testid="chat-input"]', 'Quero contratar');
    await page.click('[data-testid="send-message"]');
    
    await page.waitForSelector('[data-testid="plans-list"]');
    await page.click('[data-testid="plan-300mega"]');
    await page.click('[data-testid="continue-to-signup"]');
    
    // CPF já existente
    await page.fill('[data-testid="input-cpf"]', '12345678900');
    await page.click('[data-testid="submit-signup"]');
    
    // Validar erro
    await expect(page.locator('[data-testid="cpf-exists-error"]')).toBeVisible({
      timeout: 10000
    });
  });
});
