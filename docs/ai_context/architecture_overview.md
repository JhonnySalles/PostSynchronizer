# Arquitetura - Post Synchronizer

## 🎯 Objetivo do Aplicativo

O Post Synchronizer é um aplicativo móvel (React Native) focado na criação e sincronização de postagens simultâneas em múltiplas redes sociais (X/Twitter, Bluesky, Threads, Tumblr). Ele permite o gerenciamento de rascunhos, histórico de envios e persistência local offline.

## 🛠️ Stack Tecnológica Principal

- **Framework:** React Native com TypeScript
- **Banco de Dados Local:** SQLite (via `react-native-sqlite-storage` ou similar, gerenciado por DAOs como `PostDao` e `AuthTokenDao`).
- **Testes E2E:** Detox
- **Monitoramento/Logs:** Sentry e `react-native-logs` local (`LoggerService.ts`).
- **Autenticação:** Gerenciamento de credenciais e tokens salvos localmente por plataforma.

## 📁 Estrutura de DAOs (Data Access Objects)

- **`PostDao.ts`:** Responsável pelo CRUD de postagens e rascunhos. Lida com a gravação de imagens em JSON, filtros de busca avançados (tags, status) e sync summaries (plataformas de sucesso vs. falhas).
- **`AuthTokenDao.ts`:** Responsável por gerenciar os estados de conexão (`active`, `credentials`, `aditional`) para plataformas como X, Tumblr (suporta múltiplos blogs), Threads e Bluesky.

## 🔄 Fluxo Core de Sincronização

1. O usuário cria um post (texto, imagens e tags) e seleciona as plataformas de destino.
2. O registro é salvo via `PostDao` com estado `pending = true` ou status `DRAFT`.
3. Durante o envio, Firebase / Workers processam a publicação (`FirebasePostUpdate`).
4. Atualiza-se o banco com o sumário do envio (`platforms_send`, `platforms_success`) através do `updateLastSync`.
