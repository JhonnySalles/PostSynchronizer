import { BskyAgent, RichText } from '@atproto/api';
import { IApiService, PostData, ResultPost } from './IApiService';
import { BLUESKY, PlatformType } from '../../constants/platforms';
import AuthTokenDao, { Credentials } from '../../dao/AuthTokenDao';
import Logger from 'src/services/LoggerService';
import RNFS from 'react-native-fs';

export class BlueskyService implements IApiService {
    private platform = BLUESKY;
    private agent: BskyAgent;

    constructor() {
        this.agent = new BskyAgent({ service: 'https://bsky.social' });
    }

    async login(credentials: Credentials): Promise<boolean> {
        try {
            if (!credentials.consumerSecret)
                throw new Error("App Password é necessária.");

            await this.agent.login({
                identifier: credentials.consumerKey,
                password: credentials.consumerSecret,
            });

            credentials.token = this.agent.session!.handle;
            credentials.aditional = JSON.stringify(this.agent.session);

            await AuthTokenDao.saveCredentials(credentials);
            return true;
        } catch (error) {
            Logger.error(error as Error, { message: `[${this.platform}] Falha no login` });
            return false;
        }
    }

    async test(credentials: Credentials): Promise<boolean> {
        return new Promise(async (resolve) => {
            try {
                if (!credentials.aditional) {
                    resolve(false);
                    return;
                }

                await this.agent.resumeSession(JSON.parse(credentials.aditional));
                Logger.info(`[${this.platform}] Teste de sessão bem-sucedido para: ${this.agent.session?.handle}`);
                resolve(true);
            } catch (error) {
                Logger.error(error as Error, { message: `[${this.platform}] Teste de credenciais falhou` });
                resolve(false);
            }
        });
    }

    async post(data: PostData): Promise<ResultPost> {
        return new Promise(async (resolve, reject) => {
            try {
                const credentials = await AuthTokenDao.getCredentialsForPlatform<Credentials>(this.platform as PlatformType);
                if (!credentials?.aditional)
                    throw new Error("Sessão do Bluesky não encontrada.");

                await this.agent.resumeSession(JSON.parse(credentials.aditional));

                const richText = new RichText({ text: data.text });
                await richText.detectFacets(this.agent);

                const postRecord: any = {
                    $type: 'app.bsky.feed.post',
                    text: richText.text,
                    facets: richText.facets,
                    createdAt: new Date().toISOString(),
                };

                if (data.images && data.images.length > 0) {
                    const uploadPromises = data.images.slice(0, 4).map(async uri => {
                        const imageBytes = await RNFS.readFile(uri, 'base64');
                        const imageBuffer = Buffer.from(imageBytes, 'base64');
                        const response = await this.agent.uploadBlob(imageBuffer, { encoding: 'image/jpeg' });
                        return response.data.blob;
                    });
                    const blobs = await Promise.all(uploadPromises);
                    postRecord.embed = {
                        $type: 'app.bsky.embed.images',
                        images: blobs,
                    };
                }

                await this.agent.post(postRecord);
                Logger.info(`[${this.platform}] Postagem bem-sucedida!`);

                resolve({ sucess: true });
            } catch (error) {
                Logger.error(error as Error, { message: `[${this.platform}] Falha na postagem` });
                resolve({ sucess: false });
            }
        });
    }

    async validateAndRefreshToken(): Promise<void> {
        return Promise.resolve();
    }
}