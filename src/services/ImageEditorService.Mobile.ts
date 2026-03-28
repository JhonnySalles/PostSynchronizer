import ImageEditor from '@react-native-community/image-editor';

class ImageEditorService {
  public async cropImage(uri: string, cropData: any): Promise<{ uri: string }> {
    const result: any = await ImageEditor.cropImage(uri, cropData);
    return { uri: typeof result === 'string' ? result : result.uri };
  }
}

export const imageEditorService = new ImageEditorService();
