import Logger from 'src/services/LoggerService';

class ImageProcessingServiceWindows {
  /**
   * No Windows, o processamento automático de imagem (crop) está desativado 
   * para evitar incompatibilidades com bibliotecas nativas de mobile.
   * @param imageUri O caminho da imagem original.
   * @returns O caminho da imagem original.
   */
  public async processImage(imageUri: string): Promise<string> {
    Logger.info('[Image Service Windows] O processamento automático de imagem não é suportado no Windows. Ignorando.');
    return imageUri;
  }

  /**
   * Processa uma lista de imagens sequencialmente.
   * @param imageUris A lista de caminhos das imagens originais.
   * @returns A lista original.
   */
  public async processImageList(imageUris: string[], onProgress?: (progress: number) => void): Promise<string[]> {
    const totalImages = imageUris.length;
    for (let i = 0; i < totalImages; i++) {
        if (onProgress) {
            onProgress((i + 1) / totalImages);
        }
    }
    return imageUris;
  }
}

export default new ImageProcessingServiceWindows();
