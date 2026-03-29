// This file exists solely for TypeScript type resolution.
// At runtime, Metro bundler will automatically resolve the correct
// platform-specific implementation:
//   - FileService.native.ts  → Android / iOS
//   - FileService.windows.ts → Windows
//
// Do NOT add runtime logic here.

export { fileService } from './FileService.native';
export type { FileService } from './FileService.native';
