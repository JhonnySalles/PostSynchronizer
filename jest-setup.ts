import 'react-native';

// ─── Mocks do Sistema ─────────────────────────────────────────────────────────

jest.mock('src/services/LoggerService', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// ─── Mock do SQLite (exportado para uso nos testes de DAO) ────────────────────

export const mockExecuteSql = jest.fn();

jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => ({
    executeSql: mockExecuteSql,
    transaction: jest.fn(cb => cb({ executeSql: mockExecuteSql })),
  })),
}));

// ─── Mock do Sistema de Arquivos ──────────────────────────────────────────────

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/path',
  CachesDirectoryPath: '/mock/cache',
  exists: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('')),
  unlink: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
}));

// ─── Mock do Firebase ──────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/app', () => ({}));
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({
    onAuthStateChanged: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
  }),
}));
jest.mock('@react-native-firebase/database', () => ({
  __esModule: true,
  default: () => ({
    ref: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(() => Promise.resolve({ val: () => ({}) })),
      set: jest.fn(() => Promise.resolve()),
    })),
  }),
}));

// ─── Mock do Processamento de Imagens (FIX: RNCImageEditor nativo não existe em Jest) ───

jest.mock('@react-native-community/image-editor', () => ({
  __esModule: true,
  default: {
    cropImage: jest.fn(() => Promise.resolve('file://mock-cropped.jpg')),
  },
}));

jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Data: { fromBase64: jest.fn(() => ({})) },
    Image: { MakeImageFromEncoded: jest.fn(() => null) },
  },
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    save: jest.fn(() => Promise.resolve('file://mock-gallery.jpg')),
    getPhotos: jest.fn(() => Promise.resolve({ edges: [] })),
  },
}));

// ─── Mock do ThemeProvider (FIX: Evita loop de Appearance.addChangeListener) ──

jest.mock('src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
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
    },
    themeMode: 'system',
    setThemeMode: jest.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  ThemeContext: {
    Consumer: ({ children }: any) => children({ isDark: false }),
  },
}));

// ─── Mock do DropDownPicker ────────────────────────────────────────────────────

jest.mock('react-native-dropdown-picker', () => () => null);

// ─── Mocks de UI e Hardware ────────────────────────────────────────────────────

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-image-crop-picker', () => ({}));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  TouchableOpacity: ({ children }: any) => children,
  FlatList: ({ children }: any) => children,
}));
jest.mock('react-native-draggable-flatlist', () => ({ children }: any) => children);
jest.mock('react-native-toast-message', () => {
  const React = require('react');
  const MockToast = (props: any) => null;
  MockToast.show = jest.fn();
  MockToast.hide = jest.fn();
  return {
    __esModule: true,
    default: MockToast,
    BaseToast: (props: any) => null,
    ErrorToast: (props: any) => null,
  };
});

// ─── Mock da Navegação ─────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(cb => cb()),
  useNavigation: () => ({ navigate: jest.fn(), setParams: jest.fn() }),
  NavigationContainer: ({ children }: any) => children,
  DefaultTheme: {
    colors: {
      primary: 'rgb(0, 122, 255)',
      background: 'rgb(242, 242, 242)',
      card: 'rgb(255, 255, 255)',
      text: 'rgb(28, 28, 30)',
      border: 'rgb(216, 216, 216)',
      notification: 'rgb(255, 59, 48)',
    },
  },
  DarkTheme: {
    colors: {
      primary: 'rgb(10, 132, 255)',
      background: 'rgb(1, 1, 1)',
      card: 'rgb(18, 18, 18)',
      text: 'rgb(229, 229, 231)',
      border: 'rgb(38, 38, 40)',
      notification: 'rgb(255, 69, 58)',
    },
  },
}));

jest.mock('@react-navigation/bottom-tabs', () => {
  const Navigator = ({ children }: any) => children;
  const Screen = () => null;
  return {
    createBottomTabNavigator: jest.fn(() => ({
      Navigator,
      Screen,
    })),
    useBottomTabBarHeight: jest.fn(() => 49),
  };
});

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: jest.fn(),
    getString: jest.fn(() => Promise.resolve('')),
    hasString: jest.fn(() => Promise.resolve(false)),
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(() => Promise.resolve({ success: true })),
    shareSingle: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  Screen: ({ children }: any) => children,
  ScreenContainer: ({ children }: any) => children,
}));

// ─── Outros Mocks Nativos ──────────────────────────────────────────────────────

jest.mock('react-native-device-info', () => ({ getUniqueIdSync: () => 'mock-device-id' }));

// ─── Sentry Mock ─────────────────────────────────────────────────────────────

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: jest.fn(c => c),
  mobileReplayIntegration: jest.fn(),
  feedbackIntegration: jest.fn(),
}));

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android',
  select: jest.fn((objs: any) => objs.android ?? objs.default),
  Version: 33,
}));
