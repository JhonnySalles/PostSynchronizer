import { PermissionsAndroid, Platform } from 'react-native';
import { requestGalleryPermission, requestReadPermission } from 'src/utils/permissions';

// Mock robusto do PermissionsAndroid diretamente no react-native
jest.mock('react-native', () => {
  const reactNative = jest.requireActual('react-native');
  reactNative.PermissionsAndroid.request = jest.fn();
  return reactNative;
});

describe('permissions.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Forçamos o comportamento de um Android moderno por padrão
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
    Object.defineProperty(Platform, 'Version', { get: () => 33, configurable: true });
  });

  describe('requestGalleryPermission', () => {
    test('deve retornar true em plataformas que não sejam Android', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
      const result = await requestGalleryPermission();
      expect(result).toBe(true);
      expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    });

    test('deve solicitar READ_MEDIA_IMAGES no Android 13+', async () => {
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');

      const result = await requestGalleryPermission();
      
      expect(result).toBe(true);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      );
    });

    test('deve solicitar READ_EXTERNAL_STORAGE no Android < 13', async () => {
      Object.defineProperty(Platform, 'Version', { get: () => 30, configurable: true });
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');

      const result = await requestGalleryPermission();
      
      expect(result).toBe(true);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
    });

    test('deve retornar false se a permissão for negada', async () => {
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue('denied');
      const result = await requestGalleryPermission();
      expect(result).toBe(false);
    });
  });

  describe('requestReadPermission', () => {
    test('deve seguir a mesma lógica de versão do sistema', async () => {
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');

      const result = await requestReadPermission();
      expect(result).toBe(true);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      );
    });
  });
});
