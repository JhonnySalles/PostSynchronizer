# Tela Principal (Criar Post) - HomeScreen

## 🎯 Objetivo / Contexto

A tela central do aplicativo, onde o usuário redige o conteúdo, adiciona imagens, seleciona as plataformas de destino e dispara a publicação ou salva como rascunho.

## 🧩 Componentes de UI e Arquivos

- **Layout/Componente Principal:** `HomeScreen.tsx` (ou index dentro de `src/screens/Home`)
- **Principais Views (IDs / Test IDs):**
  - `post-text-input`: Campo de texto principal para o conteúdo do post.
  - `draft-action-button`: Botão para salvar o post atual como rascunho sem publicar.
  - `home-tab-button`: Botão na barra de navegação para acessar esta aba.

## ⚙️ Regras de Negócio e Lógica (Core Logic)

- **Criação de Posts:** Ao salvar ou postar, instancia o `PostDao.create` passando o payload (texto, imagens serializadas, status).
- **Formatação de Compartilhamento:** As tags informadas separadas por ponto-e-vírgula (ex: `tech; novidade`) são formatadas em Hashtags CamelCase (ex: `#Tech #Novidade`) ao compor a mensagem final para as redes.
- **Seleção de Plataforma:** O usuário visualiza o status das plataformas usando `ConnectionStatus` (buscando de `AuthTokenDao.getActivePlatforms()`). Imagens podem ser direcionadas a plataformas específicas (`SelectedImage`).
- **Limpeza de UI:** Após a inserção bem-sucedida, o formulário é limpo e resetado para a criação do próximo post.

## 🔄 Fluxo de Navegação

- **Telas Anteriores (De onde vem):** Selecionado via `BottomTabNavigator`. Pode vir carregado com dados do `HistoryScreen` quando o usuário clica em um rascunho para re-edição.
- **Próximas Telas (Para onde vai):**
  - Configurações (Aba Settings).
  - Histórico (Aba History).

## 🌍 Strings / Dicionário (Referência)

- Alertas de Confirmação: "Confirmar Exclusão" (embora pertença ao histórico, pode haver sobreposição de modais).
- Status Internos do App: `DRAFT`, `POSTED`.
