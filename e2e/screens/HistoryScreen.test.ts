import { device, element, by, expect } from 'detox';

describe('HistoryScreen E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('01 - deve exibir estado vazio inicial ao navegar para Histórico', async () => {
    // Navega para a aba Histórico
    await element(by.id('history-tab-button')).tap();
    
    // Verifica se o texto de histórico vazio aparece
    await expect(element(by.id('empty-history-text'))).toBeVisible();
  });

  it('Fluxo Completo: Criar Rascunho -> Buscar -> Deletar', async () => {
    const postContent = 'Post para teste de histórico ' + new Date().getTime();

    // 1. Criar um rascunho na Home
    await element(by.id('home-tab-button')).tap();
    await element(by.id('post-text-input')).typeText(postContent);
    await element(by.id('draft-action-button')).tap();
    
    // Aguarda o Toast/Alerta de sucesso se houver, ou apenas assume o reload/navegação
    // Como o app limpa o form no sucesso, podemos navegar
    
    // 2. Ir para o Histórico e validar o item
    await element(by.id('history-tab-button')).tap();
    await expect(element(by.text(postContent))).toBeVisible();

    // 3. Testar a Busca
    await element(by.id('history-search-input')).typeText('teste de histórico');
    await expect(element(by.text(postContent))).toBeVisible();
    
    // Limpar busca
    await element(by.id('clear-search-button')).tap();
    await expect(element(by.id('history-search-input'))).toHaveText('');

    // 4. Testar Re-edição (clicar no item)
    await element(by.text(postContent)).tap();
    // Deve ter voltado para a Home com o texto preenchido
    await expect(element(by.id('post-text-input'))).toHaveText(postContent);

    // 5. Voltar e Deletar
    await element(by.id('history-tab-button')).tap();
    // Aqui como o ID é dinâmico, vamos buscar pelo texto do post e encontrar o botão de deletar próximo
    // No entanto, para simplificar, se houver apenas um item ou buscarmos pelo ID do primeiro visível:
    // Vou usar matchers avançados ou apenas clicar no botão de lixeira que esteja visível
    await element(by.id(/delete-item-button-.*/)).atIndex(0).tap();
    
    // Interagir com o alerta de confirmação
    await expect(element(by.text('Confirmar Exclusão'))).toBeVisible();
    await element(by.text('Deletar')).tap();

    // 6. Verificar que voltou a ficar vazio (ou o item sumiu)
    await expect(element(by.text(postContent))).not.toExist();
  });

  it('03 - deve exibir sugestões ao digitar prefixos de filtro', async () => {
    await element(by.id('history-tab-button')).tap();
    await element(by.id('history-search-input')).typeText('st');
    
    // Deve sugerir "status:"
    await expect(element(by.text('status:'))).toBeVisible();
    await element(by.text('status:')).tap();
    
    // Agora deve sugerir opções de status
    await expect(element(by.text('status:"postado"'))).toBeVisible();
    await element(by.text('status:"postado"')).tap();
    
    await expect(element(by.id('history-search-input'))).toHaveText('status:"postado" ');
  });

  it('04 - deve disparar compartilhamento via clique longo no item', async () => {
    // Cria um item primeiro para garantir que existe
    await element(by.id('home-tab-button')).tap();
    await element(by.id('post-text-input')).typeText('Post para compartilhar');
    await element(by.id('draft-action-button')).tap();
    
    await element(by.id('history-tab-button')).tap();
    await element(by.text('Post para compartilhar')).longPress();
    
    // Verifica se o Toast de "Copiado!" aparece (detecção de texto)
    await expect(element(by.text('Copiado!'))).toBeVisible();
  });
});
