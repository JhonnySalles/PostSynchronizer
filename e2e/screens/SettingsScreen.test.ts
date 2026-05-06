import { device, element, by, expect } from 'detox';

describe('SettingsScreen E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await element(by.id('settings-tab-button')).tap();
  });

  it('01 - deve exibir elementos básicos', async () => {
    await expect(element(by.id('login-api-button'))).toBeVisible();
    await expect(element(by.text('Aparência do Aplicativo'))).toBeVisible();
  });

  it('02 - deve exibir alerta ao tentar Teste de Login sem credenciais', async () => {
    await element(by.id('login-api-button')).tap();
    
    // Espera o alerta nativo de falha
    await expect(element(by.text('Falha no Login'))).toBeVisible();
    await element(by.text('OK')).tap();
  });

  it('03 - deve interagir com os switches de ativação das plataformas', async () => {
    // Twitter (X)
    await element(by.id('platform-switch-x')).tap();
    // Bluesky
    await element(by.id('platform-switch-bluesky')).tap();
    
    // Verifica se o botão de consulta do Tumblr (específico) existe
    // Nota: O switch do Tumblr precisa estar ativo para mostrar o botão? 
    // No código, o card do Tumblr é fixo, mas vamos garantir o scroll
    await element(by.id('settings-tab-button')).swipe('up', 'slow', 0.5);
    await expect(element(by.id('platform-consult-button-tumblr'))).toBeVisible();
  });

  it('04 - deve permitir trocar o tema do aplicativo', async () => {
    // Abre o dropdown de tema
    await element(by.id('theme-selector-dropdown')).tap();
    
    // Seleciona Modo Escuro
    await element(by.text('Modo Escuro')).tap();
    
    // Verifica se o dropdown fechou e a opção está visível
    await expect(element(by.text('Modo Escuro'))).toBeVisible();

    // Volta para Modo Claro
    await element(by.id('theme-selector-dropdown')).tap();
    await element(by.text('Modo Claro')).tap();
    await expect(element(by.text('Modo Claro'))).toBeVisible();
  });
});
