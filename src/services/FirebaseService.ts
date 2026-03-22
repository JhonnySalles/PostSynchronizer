import { Platform } from 'react-native';

import { firebaseService as mobileService } from './FirebaseService.Mobile';
import { firebaseService as windowsService } from './FirebaseService.Windows';

export const firebaseService = Platform.OS === 'windows' ? windowsService : mobileService;
