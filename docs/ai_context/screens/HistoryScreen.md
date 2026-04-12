# Tela de Histórico - HistoryScreen

## 🎯 Objetivo / Contexto

Permite que o usuário visualize todos os posts enviados ou rascunhos criados. Possui um motor de busca avançado que suporta autocompletar e filtros dinâmicos de tags, status e datas, além de permitir re-edição ou deleção de itens.

## 🧩 Componentes de UI e Arquivos

- **Componente Principal:** `HistoryScreen.tsx`
- **Testes Relacionados:** `HistoryScreen.test.tsx` (Lógica), `HistoryScreen.test.ts` (E2E)
- **Principais Views (IDs / Test IDs):**
  - `history-tab-button`: Aba de navegação.
  - `empty-history-text`: Exibido quando `PostDao.getAll()` retorna uma lista vazia.
  - `history-search-input`: Barra de pesquisa onde o motor de busca opera.
  - `clear-search-button`: Limpa o campo de busca.
  - `/delete-item-button-.*/`: Botão de exclusão mapeado por ID do post.

## ⚙️ Regras de Negócio e Lógica (Core Logic)

- **Motor de Busca (Search Engine):**
  - O texto no `history-search-input` usa regex para interceptar prefixos de comando como `tag:"valor"`, `status:"postado"`, `data:"2025"`.
  - Busca por texto livre intercepta a propriedade `content` do Post.
  - Intersecta as regras via `Array.filter` em memória após puxar do banco (`PostDao.getAll()`).
- **Sugestões de Busca (Auto-complete):**
  - Recomenda prefixos (`tag:`, `status:`) e varre os dados existentes puxando via `PostDao.getTagSuggestions()` ou inferindo pelo histórico em cache para autocompletar.
- **Exclusão:** Tocar no botão de lixeira abre um Alert ("Confirmar Exclusão" -> "Deletar"), executando `PostDao.delete(postId)` e atualizando a lista na interface.

## 🔄 Fluxo de Navegação

- **Vem de:** `BottomTabNavigator` ou retorno de uma interação.
- **Vai para:**
  - `HomeScreen` (Ao tocar no item do post, navega de volta carregando o `content` do rascunho).

## 🌍 Strings / Dicionário (Referência)

- Filtros suportados: `tag:`, `status:`, `data:`
- Textos base: `Confirmar Exclusão`, `Deletar`, `postado`, `rascunho`.
