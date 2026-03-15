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
