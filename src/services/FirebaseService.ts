// This file exists solely for TypeScript type resolution.
// At runtime, Metro bundler will automatically resolve the correct
// platform-specific implementation:
//   - FirebaseService.native.ts  → Android / iOS
//   - FirebaseService.windows.ts → Windows
//
// Do NOT add runtime logic here.

export { firebaseService } from './FirebaseService.native';
export type { FirebasePostUpdate } from './FirebaseService.native';
