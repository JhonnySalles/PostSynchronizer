import Clipboard from '@react-native-clipboard/clipboard';
import { Alert } from 'react-native';

class ShareService {
  public async open(options: any): Promise<void> {
    const message = options.message || '';
    Clipboard.setString(message);
    Alert.alert(
      'Copiado',
      'O conteúdo foi copiado para a área de transferência, pois o compartilhamento nativo não está disponível no Windows.',
    );
  }
}

export const shareService = new ShareService();
