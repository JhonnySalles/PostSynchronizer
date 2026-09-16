# Plano de Implementação: Fila Assíncrona e Correção da API do Threads

## Diagnóstico Completo

Com base na análise dos 817 erros registrados no Firebase e no feedback do usuário, temos os seguintes alinhamentos:

1. **Ação do Usuário:** As rajadas (bursts) de erros ocorrem porque o app exige a ação manual do usuário, que tenta enviar repetidas vezes ao ver um erro.
2. **Tokens:** O token é renovado manualmente (validade de 90 dias) no painel do Render devido ao cold start. Não precisamos de um sistema de auto-refresh de tokens.
3. **Nova Abordagem de Fila:** Devido à necessidade de polling (que é lento) e aos delays da API, tentar processar os envios do Threads de forma síncrona bloqueia o processo e gera timeouts. A solução é **desacoplar o envio para uma fila em background (thread à parte)**.

---

## Solução Arquitetural

A implementação será dividida em duas camadas:
1. **Fila Assíncrona (Queue System):** Recebe o pedido de postagem e responde instantaneamente ao app. Processa os itens sequencialmente no background.
2. **Engine de Postagem (Worker):** Executa o post no Threads com polling correto, backoff exponencial e limite de 3 tentativas por post.

---

## Componentes da Implementação

### 1. Sistema de Fila Assíncrona (Background Job Queue)

#### [NEW] `src/services/ThreadsQueueManager.ts`
Gerenciador em memória para coordenar as postagens no Threads em background.

- **Atributos:**
  - `queue`: Lista de jobs pendentes.
  - `jobs`: Dicionário/Map com o status de cada `jobId`.
  - `isProcessing`: Flag para evitar execuções simultâneas.
- **Métodos:**
  - `enqueue(payload)`: Adiciona o post na fila, cria um `jobId` único e retorna `{ jobId, status: 'queued' }`.
  - `processQueue()`: Loop assíncrono que pega o próximo job e executa.
  - `getJobStatus(jobId)`: Retorna o status atual (`queued`, `processing`, `success`, `error`, detalhes do erro).
- **Processamento:** 
  - Executa um post por vez, evitando sobrecarregar o rate limit do Threads.
  - Atualiza o status no Firebase (`dbRef`) e na memória.
  - Em caso de falha, gerencia até **3 tentativas totais** para o post antes de marcar como `error`.

### 2. Novo Endpoint de Status

#### [MODIFY] `src/routes/threadsRoutes.ts`
Adicionar a rota para consulta pelo app.

```typescript
/**
 * @openapi
 * /threads/status/{jobId}:
 *  get:
 *    summary: Consulta o status de um post enviado para a fila do Threads
 */
router.get('/status/:jobId', protect, (req, res) => {
    // Retorna status atual do ThreadsQueueManager
});
```

### 3. Modificação nos Endpoints de Postagem

#### [MODIFY] `src/routes/threadsRoutes.ts` & `src/routes/publishAllRoutes.ts`
- `POST /threads/post`: Deixará de esperar a conclusão. Irá chamar `ThreadsQueueManager.enqueue(req.body)`, responder com `202 Accepted` e o `jobId`.
- No `publishAllRoutes.ts`: Ao chegar na etapa do Threads, ele apenas enfileira o post e retorna o status como `queued` ou `processing` para a resposta consolidada do WebSocket. O app poderá consultar o desfecho posteriormente usando o `jobId`.

### 4. Correção do Fluxo de Publicação (O Worker)

O código atual de `handleThreadsPost` será movido para o worker da fila e receberá as seguintes correções críticas para parar os erros `[1]` e `[24]`:

- **Polling de Status de Container:** 
  - Ao criar qualquer container (imagem única, filhos do carrossel, pai do carrossel), o código aguardará 5s e usará `client.getMediaObject({ id: containerId, fields: ['status_code'] })` para verificar se está `FINISHED`.
  - Se estiver `IN_PROGRESS`, faz polling a cada 10s.
  - *Isso elimina o erro `[24] The requested resource does not exist`.*

- **Criação Sequencial do Carrossel:**
  - As imagens do carrossel serão criadas em série (com polling), e não via `Promise.all()`, para garantir que a Meta processe cada uma sem causar rate limit.

- **Retry com Exponential Backoff:**
  - Durante o `publish`, se ocorrer um erro transiente (`[1]` ou `[2]`), será aplicado um backoff exponencial (ex: aguarda 2s, 4s, 8s) antes da próxima das 3 tentativas permitidas.
  - *Isso absorve os erros `[1] An unknown error occurred` que a API dispara quando sobrecarregada.*

### 5. Classificação Clara de Erros

O worker saberá distinguir os erros para agir corretamente:
- `[1]`, `[2]`, "Invalid parameter": **Erros Transientes**. O worker espera e tenta novamente.
- `[190]` (Token Expirado): **Erro Permanente**. Aborta o job instantaneamente e marca como falha para o usuário.
- `[4]` (Rate Limit): Aguarda um tempo maior (ex: 60s) antes de tentar novamente.

---

## Fluxo de Trabalho (Workflow)

1. Usuário envia post via App.
2. API recebe, gera `jobId = 123` e retorna para o App: `Status: queued, JobId: 123`.
3. Worker em background inicia processo para `jobId: 123`.
4. App faz polling no endpoint `GET /threads/status/123` e recebe `Status: processing`.
5. Worker cria containers de imagem -> faz polling até `FINISHED` -> cria carrossel -> faz polling até `FINISHED` -> publica (se erro [1], tenta 3x com backoff).
6. Worker finaliza e atualiza Firebase e memória interna.
7. App faz polling e recebe `Status: success`.

---

## Verificação do Plano
1. **O app agora é liberado rapidamente** e os timeouts são evitados.
2. **Rajadas do usuário** não derrubam a API da Meta, pois a fila interna gerencia a concorrência e o backoff.
3. **O erro `[24]` será erradicado** com a verificação de `status_code === 'FINISHED'`.
4. **O erro `[1]` será absorvido** pelos retries em background sem frustrar o usuário com loaders travados.
