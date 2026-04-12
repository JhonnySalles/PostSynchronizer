# Tela de Configurações - SettingsScreen

## 🎯 Objetivo / Contexto

Tela responsável pelo gerenciamento global do app, permitindo ao usuário testar conexões com as APIs de mídias sociais, gerenciar contas conectadas (tokens) e personalizar a aparência do aplicativo.

## 🧩 Componentes de UI e Arquivos

- **Componente Principal:** `SettingsScreen.tsx`
- **Testes Relacionados:** `SettingsScreen.test.ts` (E2E)
- **Principais Views (IDs / Test IDs):**
  - `settings-tab-button`: Aba de navegação.
  - `login-api-button`: Botão usado para testar logins e fluxos OAuth/API.
  - `platform-switch-x`: Switch para ativar/desativar publicações no X/Twitter.
  - `platform-switch-bluesky`: Switch para o Bluesky.
  - `platform-switch-threads`: Switch para o Threads.
  - `platform-switch-tumblr`: Switch para o Tumblr.
  - `platform-consult-button-tumblr`: Botão específico para consultar e resgatar a lista de blogs do Tumblr vinculado.

## ⚙️ Regras de Negócio e Lógica (Core Logic)

- **Ativação de Plataformas:** Interagir com os "switches" dispara `AuthTokenDao.updateActiveStatus(credentials)`, persistindo a ativação (0 ou 1) no banco de dados.
- **Exceção do Tumblr:** Ao configurar o Tumblr, o fluxo exige buscar os blogs e salvá-los no campo `aditional` de `AuthTokenDao` serializado em JSON, identificando qual foi selecionado (`TumblrBlogs`).
- **Testes de Integração:** O botão de Login testa as credenciais; exibe nativamente um alerta "Falha no Login" se as informações do DB estiverem corrompidas, nulas ou revogadas.

## 🔄 Fluxo de Navegação

- **Vem de:** `BottomTabNavigator`.

## 🌍 Strings / Dicionário (Referência)

- Rótulos: `Aparência do Aplicativo`.
- Alertas: `Falha no Login`, `OK`.
