import { pickerService } from 'src/services/PickerService.windows';
import { launchImageLibrary } from 'react-native-image-picker';
import { Alert } from 'react-native';

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

describe('PickerService (Windows)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openPicker', () => {
    test('deve retornar lista de imagens selecionadas', async () => {
      const mockResult = {
        assets: [
          { uri: 'file://img1.jpg', width: 100, height: 100, type: 'image/jpeg' },
          { uri: 'file://img2.jpg', width: 200, height: 200, type: 'image/png' },
        ],
      };
      (launchImageLibrary as jest.Mock).mockResolvedValue(mockResult);

      const result = await pickerService.openPicker({ multiple: true });

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('file://img1.jpg');
      expect(result[1].mime).toBe('image/png');
    });

    test('deve lançar erro se o usuário cancelar', async () => {
      (launchImageLibrary as jest.Mock).mockResolvedValue({ didCancel: true });
      await expect(pickerService.openPicker({})).rejects.toThrow('User cancelled image selection');
    });

    test('deve lançar erro em caso de erro da biblioteca', async () => {
      (launchImageLibrary as jest.Mock).mockResolvedValue({ errorCode: 'OTHERS', errorMessage: 'Fail' });
      await expect(pickerService.openPicker({})).rejects.toThrow('Fail');
    });
  });

  describe('openCropper', () => {
    test('deve mostrar alerta informando limitação e retornar path original', async () => {
      const spyAlert = jest.spyOn(Alert, 'alert');
      const result = await pickerService.openCropper({ path: 'file://test.jpg' });

      expect(spyAlert).toHaveBeenCalledWith(
        expect.stringContaining('Funcionalidade Limitada'),
        expect.stringContaining('não está disponível para Windows')
      );
      expect(result.path).toBe('file://test.jpg');
    });
  });
});
