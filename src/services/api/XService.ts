import { SendTweetV2Params, TwitterApi } from 'twitter-api-v2';
import { IApiService, PostData, ResultPost } from './IApiService';
import AuthTokenDao, { Credentials } from '../../dao/AuthTokenDao';
import { PlatformType, X } from '../../constants/platforms';
import { clientService } from '../clientService';
import RNFS from 'react-native-fs';

export class XService implements IApiService {
    private platform = X;

    constructor() { }

    async test(credentials: Credentials): Promise<boolean> {
        console.info(`[${this.platform}] Testando credenciais...`);
        try {
            const testClient = new TwitterApi({
                appKey: credentials.consumerKey,
                appSecret: credentials.consumerSecret,
                accessToken: credentials.token,
                accessSecret: credentials.tokenSecret,
            });

            const { data: user } = await testClient.v2.me();
            console.info(`[${this.platform}] Teste bem-sucedido para o usuário: @${user.username}`);
            return true;
        } catch (error) {
            console.error(error as Error, { message: `[${this.platform}] Teste de credenciais falhou` });
            return false;
        }
    }

    async post(data: PostData): Promise<ResultPost> {
        console.info(`[${this.platform}] Iniciando postagem...`);

        const credentials = await AuthTokenDao.getCredentialsForPlatform<Credentials>(this.platform as PlatformType);
        if (!credentials) {
            const authError = new Error(`Credenciais do X não encontradas. Conecte sua conta nas Configurações.`);
            console.error(authError);
            throw authError;
        }

        if (!credentials.actived)
            return { sucess: false }

        try {
            const client = new TwitterApi({
                appKey: credentials.consumerKey,
                appSecret: credentials.consumerSecret,
                accessToken: credentials.token,
                accessSecret: credentials.tokenSecret,
            });

            const tweetPayload: { text: string; media?: { media_ids: string[] } } = {
                text: data.text,
            };

            if (data.images && data.images.length > 0) {
                console.info(`[${this.platform}] Fazendo upload de mídia...`);
                const mediaIds: string[] = [];

                for (const imageUri of data.images.slice(0, 4)) {
                    const mediaId = await client.v1.uploadMedia(imageUri);
                    mediaIds.push(mediaId);
                }

                tweetPayload.media = { media_ids: mediaIds };
                console.info(`[${this.platform}] Mídia enviada. IDs: ${mediaIds.join(',')}`);
            }

            const { data: createdTweet } = await client.v2.tweet(tweetPayload as SendTweetV2Params);
            console.info(`[${this.platform}] Postagem bem-sucedida! Tweet ID: ${createdTweet.id}`);
            return { sucess: true };
        } catch (error) {
            console.error(error as Error, { message: `[${this.platform}] Falha na postagem` });
            return { sucess: false };
        }
    }

    public async validateAndRefreshToken(): Promise<void> {

    }
}