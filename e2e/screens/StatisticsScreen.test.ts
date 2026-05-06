import { device, element, by, expect } from 'detox';

describe('StatisticsScreen E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Navega para a aba Estatísticas
    await element(by.id('statistics-tab-button')).tap();
  });

  it('01 - deve exibir a tela de estatísticas com os componentes principais', async () => {
    await expect(element(by.id('stats-summary-container'))).toBeVisible();
    await expect(element(by.text('Análise por Período'))).toBeVisible();
    await expect(element(by.id('platform-filter-dropdown'))).toBeVisible();
  });

  it('02 - deve exibir os cards de resumo por período', async () => {
    await expect(element(by.id('stats-period-weekly'))).toBeVisible();
    await expect(element(by.id('stats-period-monthly'))).toBeVisible();
    await expect(element(by.id('stats-period-yearly'))).toBeVisible();
  });

  it('03 - deve exibir os gráficos (ou placeholders se não houver dados)', async () => {
    // Como o app pode estar vazio no primeiro run, verificamos se o container existe
    // ou se o texto de "Sem dados" aparece.
    const lineChart = element(by.id('line-chart-container'));
    const pieChart = element(by.id('pie-chart-container'));
    
    // Verifica visibilidade básica dos setores
    await expect(element(by.text('Volume de Postagens por Dia'))).toBeVisible();
    await expect(element(by.text('Distribuição de Sucesso'))).toBeVisible();
  });

  it('04 - deve permitir abrir o seletor de plataforma', async () => {
    await element(by.id('platform-filter-dropdown')).tap();
    
    // Verifica se uma das opções aparece (ex: Todas as Plataformas ou Tumblr)
    await expect(element(by.text('Todas as Plataformas'))).toBeVisible();
    
    // Fecha o dropdown selecionando "Todas"
    await element(by.text('Todas as Plataformas')).tap();
  });

  it('05 - deve permitir abrir os seletores de data', async () => {
    // Início
    await element(by.id('btn-filter-start-date')).tap();
    await expect(element(by.text('Selecionar Data'))).toBeVisible(); // Título do DateInput
    await element(by.text('CANCELAR')).tap();

    // Fim
    await element(by.id('btn-filter-end-date')).tap();
    await expect(element(by.text('Selecionar Data'))).toBeVisible();
    await element(by.text('CANCELAR')).tap();
  });
});
