import { Image, Alert } from 'react-native';
import ImageEditor from '@react-native-community/image-editor';
import { getPixelColor } from 'react-native-pixel-color';
import RNFS from 'react-native-fs';

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
            const { width, height } = await this.getImageSize(imageUri);
            const verticalCenter = Math.floor(height / 2);

            let leftBound = 0;
            for (let x = 0; x < width; x++) {
                const color = await getPixelColor(imageUri, x, verticalCenter);
                if (!this.isBlack(color)) {
                    leftBound = x;
                    break;
                }
            }

            let rightBound = width;
            for (let x = width - 1; x >= 0; x--) {
                const color = await getPixelColor(imageUri, x, verticalCenter);
                if (!this.isBlack(color)) {
                    rightBound = x;
                    break;
                }
            }

            const newWidth = rightBound - leftBound;

            if (newWidth <= 0 || newWidth >= width - 2) {
                console.log('Nenhuma borda preta significativa detectada.');
                return imageUri;
            }

            console.log(`Novos limites encontrados: Esquerda=${leftBound}, Direita=${rightBound}. Nova Largura=${newWidth}`);

            const cropData = {
                offset: { x: leftBound, y: 0 },
                size: { width: newWidth, height },
                displaySize: { width: newWidth, height },
            };

            const croppedImageUri = await ImageEditor.cropImage(imageUri, cropData);

            const newPath = await this.saveImageWithCorrectedName(croppedImageUri, imageUri);

            console.log('Imagem corrigida e salva em:', newPath);
            return newPath;

        } catch (error) {
            console.error('Erro no processamento automático da imagem:', error);
            Alert.alert('Erro', 'Não foi possível corrigir a imagem automaticamente.');
            return imageUri;
        }
    }

    /**
     * Processa uma lista de imagens sequencialmente.
     * @param imageUris A lista de caminhos das imagens originais.
     * @returns Uma nova lista com os caminhos das imagens processadas.
     */
    public async processImageList(imageUris: string[]): Promise<string[]> {
        const processedUris: string[] = [];
        for (const uri of imageUris) {
            const newUri = await this.processImage(uri);
            processedUris.push(newUri);
        }
        return processedUris;
    }

    private getImageSize(uri: string): Promise<{ width: number, height: number }> {
        return new Promise((resolve, reject) => {
            Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
        });
    }

    private isBlack(hexColor: string): boolean {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        return r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD;
    }

    private async saveImageWithCorrectedName(tempUri: string, originalUri: string): Promise<string> {
        const originalPathParts = originalUri.split('/');
        const originalFilename = originalPathParts[originalPathParts.length - 1];
        const [name, extension] = originalFilename.split('.');

        const newFilename = `${name}_corrigido.${extension || 'jpg'}`;
        const newPath = `${RNFS.DocumentDirectoryPath}/${newFilename}`;

        await RNFS.moveFile(tempUri, newPath);
        return `file://${newPath}`;
    }
}

export default new ImageProcessingService();