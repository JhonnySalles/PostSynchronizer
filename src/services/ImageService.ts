import { Alert } from 'react-native';
import ImageEditor from '@react-native-community/image-editor';
import { Skia } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import Logger from 'src/services/LoggerService';
import { CameraRoll } from "@react-native-camera-roll/camera-roll";

const BLACK_THRESHOLD = 30; // Tolerância para o "preto" (0-255). Ajuda com JPEGs.

class ImageProcessingService {
    /**
     * Analisa uma imagem para encontrar os limites do conteúdo não-preto,
     * corta a imagem e a salva com um novo nome.
     * @param imageUri O caminho da imagem original.
     * @returns O caminho da nova imagem corrigida ou o original em caso de falha.
     */
    public async processImage(imageUri: string): Promise<string> {
        try {
            const bounds = await this.findCropBoundsWithSkia(imageUri);
            if (!bounds) {
                Logger.info('[Image Service] Não foi possível analisar a imagem com o Skia.');
                return imageUri;
            }

            const { x, width, originalWidth, originalHeight } = bounds;

            if (width <= 0 || width >= originalWidth - 2) {
                Logger.info('[Image Service] Nenhuma borda preta significativa detectada.');
                return imageUri;
            }

            Logger.debug(`[Image Service] Novos limites encontrados: Esquerda=${x}, Largura=${width}`);

            const cropData = {
                offset: { x, y: 0 },
                size: { width, height: originalHeight },
            };

            const cropResult = await ImageEditor.cropImage(imageUri, cropData);
            const croppedImageUri = cropResult.uri;
            const newPath = await this.saveImageWithCorrectedName(croppedImageUri, imageUri);

            Logger.info(`[Image Service] Imagem corrigida e salva em: ${newPath}`);
            return newPath;
        } catch (error) {
            Logger.error(error as Error, { message: `[Image Service] Erro no processamento automático da imagem:` });
            Alert.alert('Erro', 'Não foi possível corrigir a imagem automaticamente.');
            return imageUri;
        }
    }

    private async findCropBoundsWithSkia(imageUri: string) {
        const base64 = await RNFS.readFile(imageUri, 'base64');
        const imageData = Skia.Data.fromBase64(base64);
        const image = Skia.Image.MakeImageFromEncoded(imageData);

        if (!image)
            return null;

        const { width, height } = image.getImageInfo();
        const verticalCenter = Math.floor(height / 2);

        const pixels = image.readPixels(0, 0, image.getImageInfo());
        if (!pixels)
            return null;

        let leftBound = 0;
        for (let x = 0; x < width; x++) {
            const index = (verticalCenter * width + x) * 4;
            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];
            if (r > BLACK_THRESHOLD || g > BLACK_THRESHOLD || b > BLACK_THRESHOLD) {
                leftBound = x;
                break;
            }
        }

        let rightBound = width;
        for (let x = width - 1; x >= 0; x--) {
            const index = (verticalCenter * width + x) * 4;
            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];
            if (r > BLACK_THRESHOLD || g > BLACK_THRESHOLD || b > BLACK_THRESHOLD) {
                rightBound = x;
                break;
            }
        }

        return {
            x: leftBound,
            width: rightBound - leftBound,
            originalWidth: width,
            originalHeight: height,
        };
    }

    /**
     * Processa uma lista de imagens sequencialmente.
     * @param imageUris A lista de caminhos das imagens originais.
     * @returns Uma nova lista com os caminhos das imagens processadas.
     */
    public async processImageList(imageUris: string[], onProgress?: (progress: number) => void): Promise<string[]> {
        const processedUris: string[] = [];
        const totalImages = imageUris.length;
        for (let i = 0; i < totalImages; i++) {
            const uri = imageUris[i];
            const newUri = await this.processImage(uri);
            processedUris.push(newUri);

            const progress = (i + 1) / totalImages;
            if (onProgress)
                onProgress(progress);
        }
        return processedUris;
    }

    private async saveImageWithCorrectedName(tempUri: string, originalUri: string): Promise<string> {
        const originalPathParts = originalUri.split('/');
        const originalFilename = originalPathParts[originalPathParts.length - 1];
        const [name, extension] = originalFilename.split('.');
        const newFilename = `${name}_corrigido.${extension || 'jpg'}`;
        const lastSlashIndex = originalUri.lastIndexOf('/');
        const originalDirectory = originalUri.substring(0, lastSlashIndex);
        const cleanDirectory = originalDirectory.startsWith('file://') ? originalDirectory.substring(7) : originalDirectory;
        const newPath = `${cleanDirectory}/${newFilename}`;
        await RNFS.moveFile(tempUri, newPath);
        await this.saveImageToGallery(newPath);
        return `file://${newPath}`;
    }

    private async saveImageToGallery(tempUri: string): Promise<string> {
        try {
            const newPathWithExtension = `${RNFS.CachesDirectoryPath}/${Date.now()}.jpg`;
            await RNFS.copyFile(tempUri, newPathWithExtension);
            const galleryUri = await CameraRoll.save(`file://${newPathWithExtension}`, { type: 'photo', album: 'CortarImagem' });
            Logger.info(`[Image Service] Imagem salva na galeria: ${galleryUri}`);
            await RNFS.unlink(newPathWithExtension);
            return galleryUri;
        } catch (error) {
            Logger.error(error as Error, { message: `[Image Service] Erro ao salvar imagem na galeria:` });
            Alert.alert("Erro", "Não foi possível salvar a imagem na galeria.");
            return tempUri;
        }
    }
}

export default new ImageProcessingService();