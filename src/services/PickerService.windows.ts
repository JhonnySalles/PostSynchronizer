import { launchImageLibrary } from 'react-native-image-picker';
import { Alert } from 'react-native';

export type PickerImage = {
  path: string;
  width?: number;
  height?: number;
  mime?: string;
};

export interface PickerOptions {
  multiple?: boolean;
  mediaType?: 'photo' | 'video' | 'any';
  maxFiles?: number;
  cropping?: boolean;
  compressImageMaxWidth?: number;
  compressImageMaxHeight?: number;
  compressImageQuality?: number;
  forceJpg?: boolean;
}

class PickerService {
  public async openPicker(options: PickerOptions): Promise<PickerImage[]> {
    const result = await launchImageLibrary({
      mediaType: options.mediaType === 'any' ? 'mixed' : (options.mediaType as any),
      selectionLimit: options.multiple ? options.maxFiles || 0 : 1,
      includeBase64: false,
    });

    if (result.didCancel) {
      throw new Error('User cancelled image selection');
    }

    if (result.errorCode) {
      throw new Error(result.errorMessage || 'Unknown error');
    }

    return (result.assets || []).map(asset => ({
      path: asset.uri || '',
      width: asset.width,
      height: asset.height,
      mime: asset.type,
    }));
  }

  public async openCropper(options: { path: string } & PickerOptions): Promise<PickerImage> {
    Alert.alert(
      'Funcionalidade Limitada',
      'O recorte manual ainda não está disponível para Windows. Use o "Ajuste Automático" se necessário.',
    );
    return {
      path: options.path,
    };
  }
}

export const pickerService = new PickerService();
