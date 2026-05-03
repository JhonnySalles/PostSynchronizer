export const UNKNOW = 'unknow';
export const X = 'x';
export const TUMBLR = 'tumblr';
export const THREADS = 'threads';
export const BLUESKY = 'bluesky';

export const SOCIAL_PLATFORMS = [
  { name: TUMBLR, icon: 'logo-tumblr', limits: 4096, color: '#36465d' },
  { name: X, icon: 'logo-twitter', limits: 280, color: '#000000' },
  { name: THREADS, icon: 'at-sharp', limits: 500, color: '#000000' },
  { name: BLUESKY, icon: 'chatbubbles-outline', limits: 300, color: '#0085ff' },
] as const;

export type PlatformType = typeof UNKNOW | typeof X | typeof TUMBLR | typeof THREADS | typeof BLUESKY;
