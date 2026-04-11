import { device, element, by, expect } from 'detox';

describe('HomeScreen E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('01 - deve exibir a tela principal com todos os campos e botões primários', async () => {
    await expect(element(by.id('home-scroll-container'))).toBeVisible();
    await expect(element(by.id('post-text-input'))).toBeVisible();
    await expect(element(by.id('tags-text-input'))).toBeVisible();
    await expect(element(by.id('attach-image-button'))).toBeVisible();
    await expect(element(by.id('cancel-action-button'))).toBeVisible();
    await expect(element(by.id('draft-action-button'))).toBeVisible();
    await expect(element(by.id('post-action-button'))).toBeVisible();
  });

  it('02 - deve permitir digitar um post e limpar ao clicar em Cancelar', async () => {
    const textToType = 'Este é um post de teste automatizado';
    
    // Digita no campo de texto
    await element(by.id('post-text-input')).typeText(textToType);
    await expect(element(by.id('post-text-input'))).toHaveText(textToType);

    // Clica em Cancelar
    await element(by.id('cancel-action-button')).tap();

    // Verifica se o texto sumiu
    await expect(element(by.id('post-text-input'))).toHaveText('');
  });

  it('03 - deve exibir alerta nativo ao tentar postar conteúdo vazio', async () => {
    await element(by.id('post-action-button')).tap();
    
    // O Detox consegue detectar alertas nativos pelo texto no Android
    await expect(element(by.text('Conteúdo Vazio'))).toBeVisible();
    
    // Fecha o alerta clicando no botão OK (padrão Android)
    await element(by.text('OK')).tap();
  });

  it('04 - deve exibir alerta nativo ao tentar salvar rascunho vazio', async () => {
    await element(by.id('draft-action-button')).tap();
    
    await expect(element(by.text('Rascunho Vazio'))).toBeVisible();
    await element(by.text('OK')).tap();
  });

  it('05 - deve preencher tags corretamente', async () => {
    const tags = 'tecnologia; react-native';
    
    await element(by.id('tags-text-input')).typeText(tags);
    await expect(element(by.id('tags-text-input'))).toHaveText(tags);
    
    // Clica fora para disparar o blur (ex: no campo de post)
    await element(by.id('post-text-input')).tap();
  });
});
