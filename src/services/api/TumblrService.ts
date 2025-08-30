import tumblr from 'tumblr.js';
import { IApiService, PostData, ResultPost } from './IApiService';
import AuthTokenDao, { Credentials, TumblrCredentials } from '../../dao/AuthTokenDao';
import { PlatformType, TUMBLR } from '../../constants/platforms';
import { clientService } from '../clientService';
import RNFS from 'react-native-fs';

export interface TestResult {
    success: boolean;
    blogs?: { name: string; title: string }[];
    error: String | null;
}

export class TumblrService implements IApiService {
    private platform = TUMBLR;

    constructor() { }

    private async getBlogs(credentials: Credentials): Promise<TestResult> {
        console.info(`[${this.platform}] Testando credenciais...`);

        const tumblrCreds = credentials as TumblrCredentials;

        return new Promise((resolve) => {
            try {
                const testClient = tumblr.createClient({
                    consumer_key: tumblrCreds.consumerKey,
                    consumer_secret: tumblrCreds.consumerSecret,
                    token: tumblrCreds.token,
                    token_secret: tumblrCreds.tokenSecret,
                });

                testClient.userInfo((err, resp) => {
                    if (err || !resp?.user?.blogs) {
                        console.warn(`[${this.platform}] Não foi possível obter informações do usuário:`, err?.message);
                        return resolve({ success: false, error: err?.message || "" });
                    }

                    const blogs = resp.user.blogs.map((blog: { name: any; title: any; }) => ({
                        name: blog.name,
                        title: blog.title,
                    }));

                    console.info(`[${this.platform}] Informações obtidas com sucesso! Blogs encontrados: ${blogs.length}`);
                    resolve({ success: true, blogs, error: null });
                });
            } catch (error) {
                console.error(error as Error, { message: `[${this.platform}] Erro inesperado no teste` });
                resolve({ success: false, error: (error as Error).message });
            }
        });
    }

    async test(credentials: Credentials): Promise<boolean> {
        console.info(`[${this.platform}] Testando credenciais...`);

        const tumblrCreds = credentials as TumblrCredentials;

        return new Promise(async (resolve) => {
            try {
                const blogs = await this.getBlogs(credentials);
                if (blogs.success)
                    console.info(`[${this.platform}] Teste de credenciais bem-sucedido para a plataforma: ${this.platform}`);
                else
                    console.warn(`[${this.platform}] Teste de credenciais falhou:`, blogs.error);
            } catch (error) {
                console.error(error as Error, { message: `[${this.platform}] Erro inesperado durante o teste de credenciais` });
                resolve(false);
            }
        });
    }

    async post(data: PostData): Promise<ResultPost> {
        console.info(`[${this.platform}] Iniciando postagem...`);

        const credentials = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(this.platform as PlatformType);
        if (!credentials) {
            const authError = new Error(`Credenciais do Tumblr não encontradas. Conecte sua conta nas Configurações.`);
            console.error(authError);
            throw authError;
        }

        if (!credentials.actived)
            return { sucess: false }

        const client = tumblr.createClient({
            consumer_key: credentials.consumerKey,
            consumer_secret: credentials.consumerSecret,
            token: credentials.token,
            token_secret: credentials.tokenSecret,
        });

        const blogName = credentials.blogName || credentials.aditional;

        return new Promise(async (resolve, reject) => {
            try {
                let postOptions: any = {};
                if (data.images && data.images.length > 0) {
                    const imageBase64 = await RNFS.readFile(data.images[0], 'base64');
                    postOptions = { type: 'photo', caption: data.text, data64: imageBase64, tags: data.tags?.join(',') };
                } else
                    postOptions = { type: 'text', body: data.text, tags: data.tags?.join(',') };

                client.createPost(blogName, postOptions, (err, resp) => {
                    if (err) {
                        console.error(err, { message: `[${this.platform}] Falha na postagem API` });
                        return reject({ sucess: false });
                    }

                    let imageUrls: string[] = [];
                    if (resp!.photos && Array.isArray(resp!.photos))
                        imageUrls = resp!.photos.map(photo => photo.original_size.url);
                    
                    console.info(`[${this.platform}] Postagem bem-sucedida! ID: ${resp!.id}`);
                    resolve({ sucess: true, imagesUrl: imageUrls });
                });
            } catch (error) {
                console.error(error as Error, { message: `[${this.platform}] Erro ao preparar postagem` });
                reject({ sucess: false });
            }
        });
    }

    public async validateAndRefreshToken(): Promise<void> {

    }
}