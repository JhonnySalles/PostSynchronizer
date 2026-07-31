export const IS_PRODUCTION = false;
export const DRAFT = 'draft';
export const POSTED = 'posted';

export type PostType = typeof DRAFT | typeof POSTED;

export const IDLE = 'idle';
export const PENDING = 'pending';
export const SUCCESS = 'success';
export const ERROR = 'error';

export type PostStatusType = typeof IDLE | typeof PENDING | typeof SUCCESS | typeof ERROR;

export const CONNECTING = 'connecting';
export const ONLINE = 'online';
export const OFFLINE = 'offline';

export type ApiStatusType = typeof CONNECTING | typeof ONLINE | typeof OFFLINE;

export const AI_PROMPT_KEY = '@ai_prompt_template';
export const THREADS_TOKEN_EXPIRY_KEY = '@threads_token_expiry';
export const THREADS_ACCESS_TOKEN_KEY = '@threads_access_token';
export const THREADS_TOKEN_WARNING_DAYS = 3;

export const DEFAULT_PROMPT = `Estou criando uma postagem para as seguintes redes sociais: ::plataformas.
Por favor, gere 3 ideias de textos curtos e engajadores para essa postagem, com um tom **::emocao**.
Abaixo estão as informações e tags que o post deve conter, e em anexo as imagens que serão usadas.

Texto base:
"::texto"

Tags: ::tags

Formato da resposta desejado (use um marcador para cada opção, para facilitar a cópia):
• Opção 1: [texto]
• Opção 2: [texto]
• Opção 3: [texto]`;
