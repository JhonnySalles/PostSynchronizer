// This file exists solely for TypeScript type resolution.
// At runtime, Metro bundler will automatically resolve the correct
// platform-specific implementation:
//   - ShareService.native.ts  → Android / iOS
//   - ShareService.windows.ts → Windows
//
// Do NOT add runtime logic here.

export { shareService } from './ShareService.native';
export type { ShareOptions } from './ShareService.native';
