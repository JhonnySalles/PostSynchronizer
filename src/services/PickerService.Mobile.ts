import ImageCropPicker from 'react-native-image-crop-picker';

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
    const images = await ImageCropPicker.openPicker({
      ...options,
      mediaType: options.mediaType === 'any' ? 'any' : (options.mediaType as any),
    });

    if (Array.isArray(images)) {
      return images.map(img => ({
        path: img.path,
        width: img.width,
        height: img.height,
        mime: img.mime,
      }));
    }

    return [
      {
        path: (images as any).path,
        width: (images as any).width,
        height: (images as any).height,
        mime: (images as any).mime,
      },
    ];
  }

  public async openCropper(options: { path: string } & PickerOptions): Promise<PickerImage> {
    const image = await ImageCropPicker.openCropper({
      ...options,
      mediaType: 'photo',
    });

    return {
      path: image.path,
      width: image.width,
      height: image.height,
      mime: image.mime,
    };
  }
}

export const pickerService = new PickerService();
