class ImageEditorService {
  public async cropImage(uri: string, _cropData: any): Promise<{ uri: string }> {
    return { uri };
  }
}

export const imageEditorService = new ImageEditorService();
