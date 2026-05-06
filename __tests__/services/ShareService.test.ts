import { shareService } from 'src/services/ShareService.native';
import Share from 'react-native-share';

jest.mock('react-native-share', () => ({
  open: jest.fn(),
}));

describe('ShareService', () => {
  test('deve chamar Share.open com as opções fornecidas', async () => {
    const options = { title: 'Test', message: 'Hello' };
    await shareService.open(options);
    expect(Share.open).toHaveBeenCalledWith(options);
  });
});
