import { exportDatabase, importDatabase } from 'src/services/BackupService.native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';
import { closeDBConnection } from 'src/database';

// Mocks
jest.mock('react-native-fs', () => ({
  exists: jest.fn(),
  unlink: jest.fn(),
  copyFile: jest.fn(),
  mkdir: jest.fn(),
  CachesDirectoryPath: '/temp-cache',
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(),
}));

jest.mock('react-native-document-picker', () => ({
  pickSingle: jest.fn(),
  types: { allFiles: 'all' },
  isCancel: jest.fn(),
}));

jest.mock('src/database', () => ({
  closeDBConnection: jest.fn(),
}));

describe('BackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportDatabase', () => {
    test('deve copiar arquivo para cache e abrir compartilhamento', async () => {
      (RNFS.exists as jest.Mock).mockResolvedValue(true);
      (RNFS.copyFile as jest.Mock).mockResolvedValue(null);
      (Share.open as jest.Mock).mockResolvedValue({ success: true });

      const result = await exportDatabase();

      expect(result).toBe(true);
      expect(RNFS.copyFile).toHaveBeenCalledWith(
        expect.stringContaining('myapp.db'),
        expect.stringContaining('/temp-cache/PostSynchronizer_Backup_')
      );
      expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.stringContaining('file:///temp-cache/'),
      }));
    });

    test('deve lançar erro se o banco original não existir', async () => {
      (RNFS.exists as jest.Mock).mockResolvedValue(false);

      await expect(exportDatabase()).rejects.toThrow('Banco de dados original não encontrado');
    });

    test('deve retornar false se o usuário cancelar o compartilhamento', async () => {
      (RNFS.exists as jest.Mock).mockResolvedValue(true);
      (Share.open as jest.Mock).mockRejectedValue(new Error('User did not share'));

      const result = await exportDatabase();
      expect(result).toBe(false);
    });
  });

  describe('importDatabase', () => {
    test('deve fechar conexão, substituir arquivo e retornar true em caso de sucesso', async () => {
      (DocumentPicker.pickSingle as jest.Mock).mockResolvedValue({ uri: 'content://new-db' });
      (RNFS.exists as jest.Mock).mockResolvedValue(true); // Diretorio e arquivo existem
      (RNFS.copyFile as jest.Mock).mockResolvedValue(null);

      const result = await importDatabase();

      expect(result).toBe(true);
      expect(closeDBConnection).toHaveBeenCalled();
      expect(RNFS.unlink).toHaveBeenCalledWith(expect.stringContaining('myapp.db'));
      expect(RNFS.copyFile).toHaveBeenCalledWith('content://new-db', expect.stringContaining('myapp.db'));
    });

    test('deve retornar false se o usuário cancelar a seleção do arquivo', async () => {
      const cancelError = new Error('User canceled');
      (DocumentPicker.pickSingle as jest.Mock).mockRejectedValue(cancelError);
      (DocumentPicker.isCancel as jest.Mock).mockReturnValue(true);

      const result = await importDatabase();

      expect(result).toBe(false);
      expect(closeDBConnection).not.toHaveBeenCalled();
    });
  });
});
