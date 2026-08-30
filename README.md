# 🚀 PostSynchronizer

[![React Native](https://img.shields.io/badge/React%20Native-0.75.5-61DAFB?style=flat-square&logo=react)](https://reactnative.dev/)
[![React Native Windows](https://img.shields.io/badge/RN%20Windows-0.75.19-0078D4?style=flat-square&logo=windows)](https://microsoft.github.io/react-native-windows/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.4-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Private-red.svg?style=flat-square)]()

O **PostSynchronizer** é uma aplicação multiplataforma (Mobile Android/iOS e Windows Native) projetada para a criação, gerenciamento e publicação simultânea de posts e mídias em diversas redes sociais (**X/Twitter**, **Bluesky**, **Threads** e **Tumblr**).

O aplicativo conta com suporte para uso offline, salvamento local de rascunhos, histórico de envios, métricas estatísticas e um motor de busca inteligente com comandos avançados.

---

## 📌 Principais Funcionalidades

### 📝 1. Publicação & Multi-Postagem Simultânea (HomeScreen)
- **Redação Centralizada**: Redija conteúdos de texto e anexe mídias em uma única interface intuitiva.
- **Seleção Dinâmica de Plataformas**: Escolha para quais redes ativas o conteúdo será enviado (X, Bluesky, Threads, Tumblr).
- **Formatação de Hashtags**: Conversão automática de tags separadas por ponto e vírgula em hashtags formatadas em CamelCase (ex: `tech; novidade` ➔ `#Tech #Novidade`).
- **Imagens Específicas por Rede**: Direcionamento e tratamento individualizado de imagens por plataforma.
- **Gerenciador de Rascunhos**: Salve ideias como rascunho com um único clique sem efetuar a publicação imediata.

### 📜 2. Histórico & Motor de Busca Avançado (HistoryScreen)
- **Histórico Completo**: Visualização de todas as postagens realizadas e rascunhos salvos.
- **Motor de Busca Avançado (Search Engine)**:
  - Busca por texto livre no conteúdo do post.
  - Filtros por comandos e prefixos: `tag:`, `status:` (`postado` / `rascunho`), `data:`.
- **Autocompletar Inteligente**: Sugestões automáticas baseadas em tags e histórico.
- **Edição e Re-envio**: Carregamento direto de rascunhos de volta para a tela principal para edição.
- **Gerenciamento de Itens**: Deleção segura com confirmação de segurança.

### 📊 3. Estatísticas & Métricas (StatisticsScreen)
- **Dashboard Visual**: Gráficos e indicadores sobre o desempenho de envios.
- **Taxa de Sucesso vs. Falhas**: Acompanhamento detalhado das postagens que obtiveram êxito ou falharam por plataforma.
- **Relatório de Plataformas**: Identificação das redes sociais mais utilizadas e métricas comparativas.

### ⚙️ 4. Configurações & Contas (SettingsScreen)
- **Gerenciamento de Credenciais**: Conecte e gerencie tokens de autenticação localmente.
- **Suporte Multi-Blog no Tumblr**: Consulta e seleção de múltiplos blogs vinculados à mesma conta do Tumblr.
- **Switches por Plataforma**: Ativação e desativação rápida de conexões ativas.
- **Aparência & Temas**: Suporte a personalização visual (Light / Dark Mode).
- **Backup & Restauração**: Serviços de exportação e importação de dados adaptados para plataformas nativas (Desktop Windows e Mobile).

---

## 🛠️ Stack Tecnológica & Arquitetura

- **Core**: React Native `0.75.5`, TypeScript `5.0.4`
- **Desktop**: React Native Windows `0.75.19` (WinUI 2.x, MSBuild v143)
- **Estado Global**: Zustand `5.0.8`
- **Navegação**: React Navigation (Bottom Tabs)
- **Banco de Dados Local**: SQLite (`react-native-sqlite-storage`) via padrão **DAO** (`PostDao`, `AuthTokenDao`)
- **Gráficos**: `react-native-gifted-charts`, `react-native-skia`, `react-native-svg`
- **Logs e Telemetria**: Sentry (`@sentry/react-native`) e `react-native-logs`
- **Autenticação e Backend Auxiliary**: Firebase (`@react-native-firebase/app`, `database`, `auth`)
- **Testes**: Jest, `@testing-library/react-native`, Detox (E2E)

### 📐 Estrutura de Camadas (DAOs)

- **`PostDao`**: CRUD completo de postagens/rascunhos, tratamento de mídias serializadas em JSON, motor de busca e sumários de sincronização (`platforms_send`, `platforms_success`).
- **`AuthTokenDao`**: Persistência e gerenciamento do estado das credenciais de cada rede social (`active`, `credentials`, `aditional`).

---

## 📁 Estrutura do Projeto

```
PostSynchronizer/
├── docs/                      # Documentação técnica e ai_context
│   └── ai_context/
│       ├── architecture_overview.md
│       └── screens/           # Especificação das telas do app
├── src/                       # Código-fonte da aplicação
│   ├── components/            # Componentes reutilizáveis
│   ├── constants/             # Constantes e configurações
│   ├── contexts/              # Provedores de contexto
│   ├── dao/                   # Camada de Acesso a Dados (PostDao, AuthTokenDao)
│   ├── database/              # Inicialização do banco de dados SQLite
│   ├── navigation/            # Configuração de navegação (Bottom Tabs)
│   ├── screens/               # Telas principais (Home, History, Statistics, Settings)
│   ├── services/              # Serviços de API, Backup, Imagens, Logs e Firebase (Native & Windows)
│   ├── store/                 # Gerenciamento de estado (Zustand)
│   ├── theme/                 # Estilos e temas da interface
│   ├── types/                 # Definições de tipos TypeScript
│   └── utils/                 # Funções utilitárias e formatadores
├── windows/                   # Projeto nativo C++ / C# para Windows (RNW)
├── android/                   # Projeto nativo Android
├── ios/                       # Projeto nativo iOS
├── App.tsx                    # Componente raiz da aplicação
├── package.json               # Dependências e scripts de execução
└── README.md                  # Documentação principal do projeto
```

---

## 🚀 Como Executar o Projeto

### Pró-requisitos

- **Node.js**: `>= 18`
- **Yarn** ou **npm**
- **Android Studio / SDK** (Para desenvolvimento Android)
- **Visual Studio 2022** com workload de desenvolvimento C++ e C# (Para React Native Windows)

### Instalação de Dependências

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>

# Entre no diretório
cd PostSynchronizer

# Instale as dependências
yarn install
```

### Executando em Ambiente Windows Native 💻

Para compilar e rodar a versão nativa do Windows:

```bash
# Via script bat auxiliar
.\compileWindows.bat

# Ou via comando Yarn/NPM
yarn start:windows
```

### Executando em Ambiente Android 📱

```bash
# Iniciar o servidor Metro bundler
yarn start

# Executar no emulador/dispositivo Android
yarn android

# Ou compilar via script auxiliar
.\compileAndroid.bat
```

---

## 🧪 Testes e Qualidade de Código

### Executar Testes Unitários

```bash
# Rodar a suíte de testes com Jest
yarn test

# Rodar em modo watch
yarn test:watch

# Gerar relatório de cobertura de código
yarn test:coverage
```

### Linter & Validação

```bash
# Executar a verificação do ESLint
yarn lint

# Corrigir falhas automaticamente
yarn lint:fix
```

### Testes End-to-End (Detox)

```bash
# Build da versão de teste E2E
yarn e2e:build-android

# Executar testes E2E
yarn e2e:test-android
```

---

## 📄 Licença

Este projeto é de propriedade privada. Todos os direitos reservados.