import { PermissionsAndroid, Platform } from 'react-native';
import Logger from 'src/services/LoggerService';

export const requestGalleryPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android')
        return true;

    try {
        if (Platform.Version >= 33) {
            const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,);
            return result === PermissionsAndroid.RESULTS.GRANTED;
        }

        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,);
        return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e: Error | any) {
        Logger.error(e, {message: 'Erro ao solicitar permissão da galeria:'});
        return false;
    }
};