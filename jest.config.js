module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    // ThemeProvider DEVE vir antes do mapeamento genérico src/* para ter prioridade
    '^src/theme/ThemeProvider$': '<rootDir>/src/__mocks__/theme/ThemeProvider.js',
    '^.*/theme/ThemeProvider$': '<rootDir>/src/__mocks__/theme/ThemeProvider.js',
    // Mapeamentos gerais
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@env$': '<rootDir>/src/__mocks__/@env.ts',
    '^socket.io-client$': '<rootDir>/src/__mocks__/socket.io-client.js',
    '^react-native-fs$': '<rootDir>/src/__mocks__/react-native-fs.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native-fs|react-native|@react-native|react-native-windows|@react-native-community|@react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-vector-icons|react-native-sqlite-storage|@react-native-picker/picker|react-native-toast-message|react-native-logs|socket.io-client|engine.io-client|socket.io-parser|engine.io-parser|@socket.io/component-emitter|eventemitter3|react-native-draggable-flatlist|react-native-dropdown-picker|@react-native-firebase|@shopify)/)',
  ],
  reporters: [
    'default',
    '<rootDir>/jest-reporter.js',
  ],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/constants/**/*',
  ],
};
