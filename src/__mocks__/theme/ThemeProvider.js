/**
 * Mock global para src/theme/ThemeProvider
 * Evita o loop de Appearance.addChangeListener durante os testes.
 */
const mockColors = {
  primary: '#007BFF', primaryAccent: '#81b0ff',
  primaryOuther: '#808080', primaryOutherAccent: '#767577',
  secondary: '#28a745', tertiary: '#ffc107',
  cancel: '#dc3545', delete: '#dc3545',
  background: '#f5f5f5', card: '#ffffff',
  text: '#121212', textPrimary: '#ffffff',
  textSecondary: '#666666', title: '#333333',
  border: '#dddddd', success: '#28a745',
  error: '#dc3545', inactive: '#808080',
  disabledPlatform: '#000000', shadown: '#000000',
  iconOverlay: '#ffffff', tumblr: '#35465c',
  twitter: '#1DA1F2', threads: '#000000', bluesky: '#0288dbff',
};

module.exports = {
  useTheme: () => ({
    isDark: false,
    colors: mockColors,
    themeMode: 'system',
    setThemeMode: jest.fn(),
  }),
  ThemeProvider: ({ children }) => children,
  ThemeContext: {
    Consumer: ({ children }) => children({ isDark: false, colors: mockColors }),
  },
};
