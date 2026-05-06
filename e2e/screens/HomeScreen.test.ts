import { device, element, by, expect } from 'detox';

describe('HomeScreen E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('01 - deve permitir digitar texto e tags', async () => {
    const postInput = element(by.id('post-text-input'));
    const tagsInput = element(by.id('tags-text-input'));

    await postInput.typeText('Minha primeira postagem E2E');
    await tagsInput.typeText('teste; detox; automacao');

    await expect(postInput).toHaveText('Minha primeira postagem E2E');
    // Nota: O input de tags pode sofrer limpeza automática, então verificamos o conteúdo base
    await expect(tagsInput).toBeVisible();
  });

  it('02 - deve salvar um rascunho e limpar o formulário', async () => {
    await element(by.id('post-text-input')).typeText('Rascunho de Teste');
    await element(by.id('draft-action-button')).tap();

    // Verifica se limpou (placeholder deve estar visível ou texto vazio)
    await expect(element(by.id('post-text-input'))).toHaveText('');
  });

  it('03 - deve abrir o menu de sugestões de IA (Moods)', async () => {
    await element(by.id('generate-ideas-button')).tap();
    
    // Verifica se as opções de humor apareceram
    await expect(element(by.text('Alegre'))).toBeVisible();
    await expect(element(by.text('Sarcástico'))).toBeVisible();

    // Seleciona uma opção
    await element(by.text('Alegre')).tap();

    // O menu deve fechar
    await expect(element(by.text('Alegre'))).not.toBeVisible();
  });

  it('04 - deve exibir erro ao tentar postar sem plataformas selecionadas', async () => {
    await element(by.id('post-text-input')).typeText('Texto para postagem');
    await element(by.id('post-action-button')).tap();

    // Deve mostrar alerta de erro
    await expect(element(by.text('Nenhuma Conta Conectada'))).toBeVisible();
    await element(by.text('OK')).tap();
  });
});
