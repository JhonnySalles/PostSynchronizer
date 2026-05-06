import { shareService } from 'src/services/ShareService.windows';
import Clipboard from '@react-native-clipboard/clipboard';
import { Alert } from 'react-native';

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

describe('ShareService Windows', () => {
  test('deve copiar para o clipboard e mostrar alerta no Windows', async () => {
    const options = { message: 'Conteúdo de teste' };
    await shareService.open(options);

    expect(Clipboard.setString).toHaveBeenCalledWith('Conteúdo de teste');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Copiado',
      expect.stringContaining('área de transferência')
    );
  });
});
