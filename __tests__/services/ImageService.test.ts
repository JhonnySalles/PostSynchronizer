import ImageService from 'src/services/ImageService.native';
import ImageEditor from '@react-native-community/image-editor';
import { Skia } from '@shopify/react-native-skia';
import { fileService } from 'src/services/FileService';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Alert } from 'react-native';

// Mocks
jest.mock('@react-native-community/image-editor', () => ({
  cropImage: jest.fn(),
}));
jest.mock('src/services/FileService');
jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    save: jest.fn(),
  },
}));

describe('ImageService (Native)', () => {
  const mockImageUri = 'file:///path/to/image.jpg';
  
  beforeEach(() => {
    jest.clearAllMocks();
    (fileService.readFileBase64 as jest.Mock).mockResolvedValue('base64data');
    (fileService.moveFile as jest.Mock).mockResolvedValue(true);
    (fileService.copyFile as jest.Mock).mockResolvedValue(true);
    (fileService.unlink as jest.Mock).mockResolvedValue(true);
    (CameraRoll.save as jest.Mock).mockResolvedValue('gallery://123');
  });

  test('deve retornar a mesma URI se Skia falhar ao carregar imagem', async () => {
    (Skia.Image.MakeImageFromEncoded as jest.Mock).mockReturnValue(null);
    
    const result = await ImageService.processImage(mockImageUri);
    expect(result).toBe(mockImageUri);
  });

  test('deve detectar bordas pretas e cortar imagem', async () => {
    const width = 100;
    const height = 100;
    const mockPixels = new Uint8Array(width * height * 4);
    mockPixels.fill(0); // Preto
    
    // Simula conteúdo de x=10 até x=90
    for (let x = 10; x <= 90; x++) {
      const idx = (50 * width + x) * 4;
      mockPixels[idx] = 255; // Vermelho (acima do threshold)
    }

    const mockImage = {
      getImageInfo: () => ({ width, height }),
      readPixels: jest.fn().mockReturnValue(mockPixels),
    };

    (Skia.Image.MakeImageFromEncoded as jest.Mock).mockReturnValue(mockImage);
    (ImageEditor.cropImage as jest.Mock).mockResolvedValue('file://temp-cropped.jpg');

    const result = await ImageService.processImage(mockImageUri);

    expect(ImageEditor.cropImage).toHaveBeenCalledWith(
      mockImageUri,
      expect.objectContaining({
        offset: { x: 10, y: 0 },
        size: { width: 80, height: 100 },
      })
    );
    expect(result).toContain('_corrigido.jpg');
    expect(CameraRoll.save).toHaveBeenCalled();
  });

  test('deve retornar original se não houver bordas pretas significativas', async () => {
    const width = 100;
    const height = 100;
    const mockPixels = new Uint8Array(width * height * 4);
    mockPixels.fill(255); // Tudo branco (sem bordas pretas)

    const mockImage = {
      getImageInfo: () => ({ width, height }),
      readPixels: jest.fn().mockReturnValue(mockPixels),
    };

    (Skia.Image.MakeImageFromEncoded as jest.Mock).mockReturnValue(mockImage);

    const result = await ImageService.processImage(mockImageUri);
    expect(result).toBe(mockImageUri);
    expect(ImageEditor.cropImage).not.toHaveBeenCalled();
  });

  test('deve processar lista de imagens sequencialmente', async () => {
    const onProgress = jest.fn();
    const mockProcessImage = jest.spyOn(ImageService, 'processImage').mockResolvedValue('file://new.jpg');
    
    const results = await ImageService.processImageList(['img1', 'img2'], onProgress);
    
    expect(results).toHaveLength(2);
    expect(onProgress).toHaveBeenCalledWith(0.5);
    expect(onProgress).toHaveBeenCalledWith(1);
    expect(mockProcessImage).toHaveBeenCalledTimes(2);
    
    mockProcessImage.mockRestore();
  });

  test('deve tratar erros e mostrar alerta', async () => {
    (Skia.Data.fromBase64 as jest.Mock).mockImplementation(() => {
      throw new Error('Skia Error');
    });
    const spyAlert = jest.spyOn(Alert, 'alert');

    const result = await ImageService.processImage(mockImageUri);
    
    expect(result).toBe(mockImageUri);
    expect(spyAlert).toHaveBeenCalledWith('Erro', expect.any(String));
  });
});
