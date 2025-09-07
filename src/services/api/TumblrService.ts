import tumblr from 'tumblr.rn.js';
import { IApiService, PostData, ResultPost } from './IApiService';
import AuthTokenDao, { Credentials, TumblrBlogs, TumblrCredentials } from '../../dao/AuthTokenDao';
import { PlatformType, TUMBLR } from '../../constants/platforms';
import RNFS from 'react-native-fs';
import Logger from 'src/services/LoggerService';

export interface TestResult {
    success: boolean;
    blogs?: { name: string; title: string }[];
    error: String | null;
}

interface TumblrBlog {
    name: string;
    title: string;
}

interface TumblrUserInfoResponse {
    user: {
        blogs: TumblrBlog[];
        name: string;
    };
}

export class TumblrService implements IApiService {
    private platform = TUMBLR;

    constructor() { }

    private async getBlogs(credentials: Credentials): Promise<TestResult> {
        Logger.info(`[${this.platform}] Obtendo informações de blogs...`);

        const tumblrCreds = credentials as TumblrCredentials;

        return new Promise((resolve) => {
            try {
                const testClient = new tumblr.createClient({
                    consumer_key: tumblrCreds.consumerKey,
                    consumer_secret: tumblrCreds.consumerSecret,
                    token: tumblrCreds.token,
                    token_secret: tumblrCreds.tokenSecret,
                });

                testClient.userInfo(async (err: Error | null, resp: TumblrUserInfoResponse) => {
                    if (err || !resp?.user?.blogs) {
                        Logger.warn(`[${this.platform}] Não foi possível obter informações do usuário:`, err?.message);
                        return resolve({ success: false, error: err?.message || "" });
                    }
                    const blogName = (credentials as TumblrCredentials).blogName;
                    const blogs = resp.user.blogs.map<TumblrBlogs>((blog: { name: any; title: any; }) => ({ name: blog.name, title: blog.title, selected: blog.name === blogName }));
                    (credentials as TumblrCredentials).blogs = blogs;
                    (credentials as TumblrCredentials).blogName = blogs.find(b => b.selected)?.name || ''
                    await AuthTokenDao.saveCredentials(credentials);
                    Logger.info(`[${this.platform}] Informações obtidas com sucesso! Blogs encontrados: ${blogs.length} -- Blogs: ${blogs.map(b => b.name).join(", ")}`);
                    resolve({ success: true, blogs, error: null });
                });
            } catch (error) {
                Logger.error(error as Error, { message: `[${this.platform}] Erro inesperado no teste` });
                resolve({ success: false, error: (error as Error).message });
            }
        });
    }

    async test(credentials: Credentials): Promise<boolean> {
        Logger.info(`[${this.platform}] Testando credenciais...`);

        const tumblrCreds = credentials as TumblrCredentials;

        return new Promise(async (resolve) => {
            try {
                const blogs = await this.getBlogs(credentials);
                if (blogs.success)
                    Logger.info(`[${this.platform}] Teste de credenciais bem-sucedido para a plataforma: ${this.platform}`);
                else
                    Logger.warn(`[${this.platform}] Teste de credenciais falhou:`, blogs.error);
                resolve(blogs.success);
            } catch (error) {
                Logger.error(error as Error, { message: `[${this.platform}] Erro inesperado durante o teste de credenciais` });
                resolve(false);
            }
        });
    }

    async post(data: PostData): Promise<ResultPost> {
        Logger.info(`[${this.platform}] Iniciando postagem...`);

        const credentials = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(this.platform as PlatformType);
        if (!credentials) {
            const authError = new Error(`Credenciais do Tumblr não encontradas. Conecte sua conta nas Configurações.`);
            Logger.error(authError, { message: `[${this.platform}] Credenciais do Tumblr não encontradas. Conecte sua conta nas Configurações` });
            throw authError;
        }

        if (!credentials.active)
            return { sucess: false }

        const client = new tumblr.createClient({
            consumer_key: credentials.consumerKey,
            consumer_secret: credentials.consumerSecret,
            token: credentials.token,
            token_secret: credentials.tokenSecret,
        });

        return new Promise(async (resolve, reject) => {
            try {
                let postOptions: any = {};
                if (data.images && data.images.length > 0) {
                    if (data.images.length > 1) {
                        const base64Images = await Promise.all(data.images.map(imagePath => RNFS.readFile(imagePath, 'base64')));
                        postOptions = { type: 'photo', caption: data.text, data: base64Images, tags: data.tags?.join(',') };
                    } else {
                        const imageBase64 = await RNFS.readFile(data.images[0], 'base64');
                        postOptions = { type: 'photo', caption: data.text, data64: imageBase64, tags: data.tags?.join(',') };
                    }
                } else
                    postOptions = { type: 'text', body: data.text, tags: data.tags?.join(',') };

                client.createPost(credentials.blogName, postOptions, (err: any, resp: any) => {
                    if (err) {
                        Logger.error(err, { message: `[${this.platform}] Falha na postagem API` });
                        return reject({ sucess: false });
                    }

                    let imageUrls: string[] = [];
                    if (resp!.photos && Array.isArray(resp!.photos))
                        imageUrls = resp!.photos.map((photo: any) => photo.original_size.url);

                    Logger.info(`[${this.platform}] Postagem bem-sucedida! ID: ${resp!.id}`);
                    resolve({ sucess: true, imagesUrl: imageUrls });
                });
            } catch (error) {
                Logger.error(error as Error, { message: `[${this.platform}] Erro ao preparar postagem` });
                reject({ sucess: false });
            }
        });
    }

    public async validateAndRefreshToken(): Promise<void> {
        return Promise.resolve();
    }
}