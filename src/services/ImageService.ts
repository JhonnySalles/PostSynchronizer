import { Platform } from 'react-native';
import ImageServiceMobile from './ImageService.Mobile';
import ImageServiceWindows from './ImageService.Windows';

const imageProcessingService = Platform.OS === 'windows' ? new ImageServiceWindows() : new ImageServiceMobile();

export default imageProcessingService as any;
