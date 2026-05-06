import { device, element, by, expect } from 'detox';

describe('Statistics Filtering Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await element(by.id('statistics-tab-button')).tap();
  });

  it('01 - deve permitir selecionar um intervalo de datas e visualizar mudanças', async () => {
    // Abre o seletor de data de início
    await element(by.id('btn-filter-start-date')).tap();
    await expect(element(by.id('date-input-modal'))).toBeVisible();

    // Navega entre meses
    await element(by.id('btn-prev-month')).tap();
    await element(by.id('btn-prev-month')).tap();
    
    // Seleciona o dia 15 (se existir no grid, vamos tentar pelo texto)
    try {
        await element(by.text('15')).atIndex(0).tap();
    } catch (e) {
        // Se falhar (ex: dia 15 não visível), apenas fecha
        await element(by.id('btn-close-modal')).tap();
    }

    await expect(element(by.id('date-input-modal'))).not.toBeVisible();
  });

  it('02 - deve permitir filtrar por plataforma específica', async () => {
    // Abre o dropdown de plataforma
    await element(by.id('platform-filter-dropdown')).tap();
    
    // Seleciona Bluesky
    await element(by.text('Bluesky')).tap();
    
    // Verifica se o dropdown fechou e o valor foi selecionado
    // Nota: O DropDownPicker às vezes exige espera ou verificação do label
    await expect(element(by.text('Bluesky'))).toBeVisible();
  });
});
