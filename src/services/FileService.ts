import { Platform } from 'react-native';

import { fileService as mobileFS } from './FileService.Mobile';
import { fileService as windowsFS } from './FileService.Windows';

export const fileService = Platform.OS === 'windows' ? windowsFS : mobileFS;
