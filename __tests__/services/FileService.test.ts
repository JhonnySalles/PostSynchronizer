import { FileService as NativeFileService } from 'src/services/FileService.native';
import { FileService as WindowsFileService } from 'src/services/FileService.windows';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';

// Mock RNFS
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  moveFile: jest.fn(),
  copyFile: jest.fn(),
  unlink: jest.fn(),
  DocumentDirectoryPath: '/mock/native/doc',
  CachesDirectoryPath: '/mock/native/cache',
}));

// Mock ReactNativeBlobUtil
jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: {
      DocumentDir: '/mock/windows/doc',
      CacheDir: '/mock/windows/cache',
    },
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    readFile: jest.fn(),
    mv: jest.fn(),
    cp: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('FileService', () => {
  describe('Native Implementation (Android/iOS)', () => {
    let service: NativeFileService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new NativeFileService();
    });

    test('readFileBase64: deve limpar o prefixo file://', async () => {
      (RNFS.readFile as jest.Mock).mockResolvedValue('base64data');
      
      const data = await service.readFileBase64('file:///path/to/file.png');
      
      expect(RNFS.readFile).toHaveBeenCalledWith('/path/to/file.png', 'base64');
      expect(data).toBe('base64data');
    });

    test('moveFile: deve limpar o prefixo file:// de ambos os caminhos', async () => {
      await service.moveFile('file:///old/path', 'file:///new/path');
      expect(RNFS.moveFile).toHaveBeenCalledWith('/old/path', '/new/path');
    });

    test('unlink: deve limpar o prefixo file://', async () => {
      await service.unlink('file:///delete/me');
      expect(RNFS.unlink).toHaveBeenCalledWith('/delete/me');
    });
  });

  describe('Windows Implementation', () => {
    let service: WindowsFileService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new WindowsFileService();
    });

    test('readFileBase64: deve limpar o prefixo file://', async () => {
      (ReactNativeBlobUtil.fs.readFile as jest.Mock).mockResolvedValue('winBase64');
      
      const data = await service.readFileBase64('file:///c:/path/file.png');
      
      expect(ReactNativeBlobUtil.fs.readFile).toHaveBeenCalledWith('/c:/path/file.png', 'base64');
      expect(data).toBe('winBase64');
    });

    test('executeSerialized: deve retentar em caso de erro EUNSPECIFIED (arquivo em uso)', async () => {
      jest.useFakeTimers();
      
      (ReactNativeBlobUtil.fs.writeFile as jest.Mock)
        .mockRejectedValueOnce(new Error('EUNSPECIFIED: File in use'))
        .mockResolvedValueOnce(undefined);

      const promise = service.writeFile('path.txt', 'content');
      
      // Avança o timer para o retry
      await jest.runAllTimersAsync();
      
      await promise;

      expect(ReactNativeBlobUtil.fs.writeFile).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    test('executeSerialized: deve falhar após o número máximo de tentativas', async () => {
      const mockError = new Error('EUNSPECIFIED: Persistent failure');
      (ReactNativeBlobUtil.fs.writeFile as jest.Mock).mockRejectedValue(mockError);

      // Chamamos diretamente o executeSerialized para diminuir o delay no teste
      const promise = (service as any).executeSerialized(
        () => ReactNativeBlobUtil.fs.writeFile('path.txt', 'content'),
        3,
        10 // 10ms de delay entre retries
      );
      
      await expect(promise).rejects.toThrow('EUNSPECIFIED: Persistent failure');
      expect(ReactNativeBlobUtil.fs.writeFile).toHaveBeenCalledTimes(3); 
    });

    test('executeSerialized: deve garantir execução sequencial (fila)', async () => {
      let counter = 0;
      const executionOrder: number[] = [];

      (ReactNativeBlobUtil.fs.writeFile as jest.Mock).mockImplementation(async () => {
        const id = ++counter;
        await new Promise(resolve => setTimeout(resolve, 50)); // Simula delay
        executionOrder.push(id);
      });

      const p1 = service.writeFile('f1.txt', 'c1');
      const p2 = service.writeFile('f2.txt', 'c2');
      const p3 = service.writeFile('f3.txt', 'c3');

      await Promise.all([p1, p2, p3]);

      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });
});
