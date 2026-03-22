import Share, { ShareOptions } from 'react-native-share';

class ShareService {
  public async open(options: ShareOptions): Promise<void> {
    await Share.open(options);
  }
}

export const shareService = new ShareService();
export type { ShareOptions };
