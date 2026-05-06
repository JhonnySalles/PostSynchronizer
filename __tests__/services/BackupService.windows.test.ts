import { exportDatabase, importDatabase } from 'src/services/BackupService.windows';
import ReactNativeBlobUtil from 'react-native-blob-util';
import DocumentPicker from 'react-native-document-picker';
import { closeDBConnection } from 'src/database';

// Mocks
jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: { DocumentDir: 'C:\\Documents' },
    exists: jest.fn(),
    cp: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock('react-native-document-picker', () => ({
  pickDirectory: jest.fn(),
  pickSingle: jest.fn(),
  types: { allFiles: 'all' },
  isCancel: jest.fn(),
}));

jest.mock('src/database', () => ({
  closeDBConnection: jest.fn(),
}));

describe('BackupService Windows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportDatabase', () => {
    test('deve exportar banco para diretório selecionado no Windows', async () => {
      (ReactNativeBlobUtil.fs.exists as jest.Mock).mockResolvedValue(true);
      (DocumentPicker.pickDirectory as jest.Mock).mockResolvedValue({ uri: 'file:///C:/Backups' });
      (ReactNativeBlobUtil.fs.cp as jest.Mock).mockResolvedValue(null);

      const result = await exportDatabase();

      expect(result).toBe(true);
      expect(ReactNativeBlobUtil.fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('myapp.db'),
        expect.stringContaining('C:\\Backups\\PostSynchronizer_Backup_')
      );
    });
  });

  describe('importDatabase', () => {
    test('deve importar banco no Windows', async () => {
      (DocumentPicker.pickSingle as jest.Mock).mockResolvedValue({ uri: 'file:///C:/Downloads/backup.db' });
      (ReactNativeBlobUtil.fs.exists as jest.Mock).mockResolvedValue(true);
      (ReactNativeBlobUtil.fs.cp as jest.Mock).mockResolvedValue(null);

      const result = await importDatabase();

      expect(result).toBe(true);
      expect(closeDBConnection).toHaveBeenCalled();
      expect(ReactNativeBlobUtil.fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('C:\\Downloads\\backup.db'),
        expect.stringContaining('myapp.db')
      );
    });
  });
});
