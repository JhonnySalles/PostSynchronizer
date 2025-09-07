import twitter from 'react-native-simple-twitter';
import { IApiService, PostData, ResultPost } from './IApiService';
import AuthTokenDao, { Credentials } from '../../dao/AuthTokenDao';
import { PlatformType, X } from '../../constants/platforms';
import Logger from 'src/services/LoggerService';
import RNFS from 'react-native-fs';

export class XService implements IApiService {
    private platform = X;

    constructor() { }

    async test(credentials: Credentials): Promise<boolean> {
        Logger.info(`[${this.platform}] Testando credenciais...`);
        try {
            twitter.setConsumerKey(credentials.consumerKey, credentials.consumerSecret);
            const response = await twitter.get("users/show.json?screen_name=twitterdev");

            if (response && response.screen_name)
                Logger.info(`[${this.platform}] Teste bem-sucedido para o usuário: @${response.screen_name}`);
            else
                Logger.info(`[${this.platform}] Não foi possível autenticar com as credenciais informada.`, response);

            return response && response.screen_name;
        } catch (error) {
            Logger.error(error as Error, { message: `[${this.platform}] Teste de credenciais falhou` });
            return false;
        }
    }

    async post(data: PostData): Promise<ResultPost> {
        Logger.info(`[${this.platform}] Iniciando postagem...`);

        const credentials = await AuthTokenDao.getCredentialsForPlatform<Credentials>(this.platform as PlatformType);
        if (!credentials) {
            const authError = new Error(`Credenciais do X não encontradas. Conecte sua conta nas Configurações.`);
            Logger.error(authError, { message: `[${this.platform}] Credenciais do X não encontradas. Conecte sua conta nas Configurações` });
            throw authError;
        }

        if (!credentials.active)
            return { sucess: false }

        try {
            twitter.setConsumerKey(credentials.consumerKey, credentials.consumerSecret);
            twitter.setAccessToken(credentials.token, credentials.tokenSecret);

            const mediaIds: string[] = [];
            if (data.images && data.images.length > 0) {
                Logger.info(`[${this.platform}] Lendo arquivos de imagem e fazendo upload...`);

                const imagesToUpload = data.images.slice(0, 4);
                const uploadPromises = imagesToUpload.map(async (imageUri) => {
                    const base64Image = await RNFS.readFile(imageUri, 'base64');
                    const response = await twitter.post('media/upload', { media_data: base64Image });
                    return response.media_id_string;
                });

                const uploadedMediaIds = await Promise.all(uploadPromises);
                mediaIds.push(...uploadedMediaIds);
                Logger.info(`[${this.platform}] Mídia enviada. IDs: ${mediaIds.join(',')}`);
            }

            const postParams: { media_ids?: string } = {};
            if (mediaIds.length > 0)
                postParams.media_ids = mediaIds.join(',');

            Logger.info(`[${this.platform}] Enviando tweet...`);
            const createdTweet = await twitter.post('POST', { status: 'テストツイート！(Test Tweet!)' });

            Logger.info(`[${this.platform}] Postagem bem-sucedida! Tweet ID: ${createdTweet.id_str}`);
            return { sucess: true };
        } catch (error) {
            Logger.error(error as Error, { message: `[${this.platform}] Falha na postagem` });
            return { sucess: false };
        }
    }

    public async validateAndRefreshToken(): Promise<void> {
        return Promise.resolve();
    }
}