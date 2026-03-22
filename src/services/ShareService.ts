import { Platform } from 'react-native';

import { shareService as mobileShare } from './ShareService.Mobile';
import { shareService as windowsShare } from './ShareService.Windows';

export const shareService = Platform.OS === 'windows' ? windowsShare : mobileShare;
export type { ShareOptions } from './ShareService.Mobile';
