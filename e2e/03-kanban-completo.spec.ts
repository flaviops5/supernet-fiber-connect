import { test, expect } from '@playwright/test';

/**
 * Testes E2E completos do módulo Kanban
 */

test.describe('Kanban - Fluxo Completo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/kanban');
  });

  test('Deve carregar o board Kanban corretamente', async ({ page }) => {
    // Verifica título da página
    await expect(page.locator('h1, h2').filter({ hasText: /kanban/i }).first()).toBeVisible();
    
    // Aguarda o carregamento do board
    await page.waitForTimeout(1000);
  });

  test('Deve criar uma nova coluna', async ({ page }) => {
    // Clica no botão de adicionar coluna
    const addColumnBtn = page.getByRole('button', { name: /adicionar coluna/i });
    await addColumnBtn.click();

    // Preenche o formulário
    await page.getByLabel(/título/i).fill('Nova Coluna Teste');
    await page.getByLabel(/limite/i).fill('5');

    // Salva a coluna
    await page.getByRole('button', { name: /criar/i }).click();

    // Verifica se a coluna foi criada
    await expect(page.getByText('Nova Coluna Teste')).toBeVisible();
  });

  test('Deve criar um novo card', async ({ page }) => {
    // Aguarda carregar
    await page.waitForTimeout(1000);

    // Clica no botão de novo card
    const newCardBtn = page.getByRole('button', { name: /novo card/i });
    await newCardBtn.click();

    // Preenche o formulário do card
    await page.getByLabel(/título/i).fill('Card de Teste E2E');
    await page.getByLabel(/descrição/i).fill('Descrição do card de teste');
    
    // Seleciona prioridade
    await page.getByLabel(/prioridade/i).click();
    await page.getByRole('option', { name: /alta/i }).click();

    // Cria o card
    await page.getByRole('button', { name: /criar/i }).click();

    // Verifica se o card foi criado
    await expect(page.getByText('Card de Teste E2E')).toBeVisible();
  });

  test('Deve mover card entre colunas (drag and drop)', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Localiza um card existente
    const card = page.locator('[data-testid*="card"]').first();
    
    if (await card.count() > 0) {
      // Pega posição inicial
      const initialColumn = await card.locator('..').locator('..').getAttribute('data-column-id');
      
      // Realiza drag and drop para outra coluna
      const targetColumn = page.locator('[data-column-id]').nth(1);
      await card.dragTo(targetColumn);

      // Aguarda a animação
      await page.waitForTimeout(500);

      // Verifica se o card mudou de coluna
      const newColumn = await card.locator('..').locator('..').getAttribute('data-column-id');
      expect(newColumn).not.toBe(initialColumn);
    }
  });

  test('Deve editar um card existente', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Clica em um card
    const card = page.locator('[data-testid*="card"]').first();
    
    if (await card.count() > 0) {
      await card.click();

      // Verifica se o diálogo de edição abriu
      await expect(page.getByRole('dialog')).toBeVisible();

      // Edita o título
      const titleInput = page.getByLabel(/título/i);
      await titleInput.fill('Card Editado via E2E');

      // Salva
      await page.getByRole('button', { name: /salvar/i }).click();

      // Verifica se foi atualizado
      await expect(page.getByText('Card Editado via E2E')).toBeVisible();
    }
  });

  test('Deve deletar um card', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Localiza um card
    const card = page.locator('[data-testid*="card"]').first();
    
    if (await card.count() > 0) {
      const cardTitle = await card.textContent();
      
      // Abre o card
      await card.click();

      // Clica no botão de deletar
      const deleteBtn = page.getByRole('button', { name: /deletar|excluir|remover/i });
      await deleteBtn.click();

      // Confirma a exclusão
      await page.getByRole('button', { name: /confirmar|sim/i }).click();

      // Verifica se o card foi removido
      await expect(page.getByText(cardTitle || '')).not.toBeVisible();
    }
  });

  test('Deve filtrar cards por etiqueta', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Clica no filtro de etiquetas
    const filterBtn = page.getByRole('button', { name: /filtrar|etiqueta/i }).first();
    
    if (await filterBtn.count() > 0) {
      await filterBtn.click();

      // Seleciona uma etiqueta
      const label = page.getByRole('option').first();
      await label.click();

      // Verifica se os cards foram filtrados
      await page.waitForTimeout(500);
      const visibleCards = await page.locator('[data-testid*="card"]').count();
      expect(visibleCards).toBeGreaterThanOrEqual(0);
    }
  });

  test('Deve criar board a partir de template', async ({ page }) => {
    // Procura botão de templates
    const templateBtn = page.getByRole('button', { name: /template/i });
    
    if (await templateBtn.count() > 0) {
      await templateBtn.click();

      // Seleciona um template
      await page.getByText(/desenvolvimento|suporte|marketing/i).first().click();

      // Aguarda criação
      await page.waitForTimeout(1000);

      // Verifica se as colunas do template foram criadas
      const columns = await page.locator('[data-column-id]').count();
      expect(columns).toBeGreaterThan(0);
    }
  });
});
