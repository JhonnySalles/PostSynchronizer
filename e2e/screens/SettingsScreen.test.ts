import { device, element, by, expect } from 'detox';

describe('SettingsScreen E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('01 - deve navegar para Configurações e exibir elementos básicos', async () => {
    await element(by.id('settings-tab-button')).tap();
    await expect(element(by.id('login-api-button'))).toBeVisible();
    await expect(element(by.text('Aparência do Aplicativo'))).toBeVisible();
  });

  it('02 - deve exibir alerta ao tentar Teste de Login sem credenciais', async () => {
    await element(by.id('settings-tab-button')).tap();
    await element(by.id('login-api-button')).tap();
    
    // Espera o alerta nativo de falha
    await expect(element(by.text('Falha no Login'))).toBeVisible();
    await element(by.text('OK')).tap();
  });

  it('03 - deve interagir com os switches de ativação das plataformas', async () => {
    await element(by.id('settings-tab-button')).tap();

    // Testa os switches dinâmicos criados no PlatformCard
    // Nota: Como o switch é um componente nativo, o Detox pode interagir com o toque
    
    // Twitter (X)
    await element(by.id('platform-switch-x')).tap();
    // Bluesky
    await element(by.id('platform-switch-bluesky')).tap();
    // Threads
    await element(by.id('platform-switch-threads')).tap();
    // Tumblr
    await element(by.id('platform-switch-tumblr')).tap();
    
    // Verifica se o botão de consulta do Tumblr (específico) existe
    await expect(element(by.id('platform-consult-button-tumblr'))).toBeVisible();
  });
});
