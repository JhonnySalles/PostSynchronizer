import { ThreadsAPI, ThreadsAPIConfig } from 'threads-ts';
import { IApiService, PostData, ResultPost } from './IApiService';
import AuthTokenDao, { Credentials } from '../../dao/AuthTokenDao';
import { PlatformType, THREADS } from '../../constants/platforms';
import { THREADS_APP_ID, THREADS_APP_SECRET, THREADS_CALLBACK_URL } from '@env';
import InAppBrowser, { RedirectResult } from 'react-native-inappbrowser-reborn';


export class ThreadsService implements IApiService {
    private platform = THREADS;
    private client: ThreadsAPI;
    private userId: string | null = null;

    constructor() {
        this.client = new ThreadsAPI({
            clientId: THREADS_APP_ID,
            clientSecret: THREADS_APP_SECRET,
            redirectUri: THREADS_CALLBACK_URL,
            scope: ["threads_basic", "threads_content_publish"],
        });
    }

    private async refreshToken(credentials: Credentials): Promise<Credentials | null> {
        if (!credentials.token)
            return null;

        console.info(`[${this.platform}] Tentando renovar o token de longa duração...`);
        try {
            const { access_token: newLongLivedToken, expires_in } = await this.client.refreshLongLivedToken(credentials.token);

            const expiresInMs = (expires_in - 3600) * 1000;
            const newExpiresAt = new Date(Date.now() + expiresInMs).toISOString();

            const newCredentials: Credentials = {
                ...credentials,
                token: newLongLivedToken,
                aditional: newExpiresAt,
            };

            await AuthTokenDao.saveCredentials(this.platform as PlatformType, newCredentials);
            console.info(`[${this.platform}] Token renovado com sucesso. Nova expiração: ${newExpiresAt}`);

            return newCredentials;
        } catch (error) {
            console.error(error as Error, { message: `[${this.platform}] Falha ao renovar o token. O usuário pode precisar logar novamente.` });
            return null;
        }
    }

    async validateAndRefreshToken(): Promise<void> {
        const credentials = await AuthTokenDao.getCredentialsForPlatform<Credentials>(this.platform as PlatformType);
        if (!credentials?.token || !credentials.aditional || !credentials.active) {
            console.debug(`[${this.platform}] Sem credenciais para validar/renovar.`);
            return;
        }

        const expirationDate = new Date(credentials.aditional);
        const twoHoursFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // Cinco dias restantes

        if (expirationDate < twoHoursFromNow) {
            console.warn(`[${this.platform}] Token expira em menos de 5 dias (em ${expirationDate.toLocaleString()}). Renovando agora...`);
            await this.refreshToken(credentials);
        } else
            console.info(`[${this.platform}] Token ainda é válido. Expira em: ${expirationDate.toLocaleString()}`);
    }

    private async login(): Promise<boolean> {
        try {
            const authUrl = this.client.getAuthorizationUrl();
            const resultUrl = await InAppBrowser.openAuth(authUrl, THREADS_CALLBACK_URL);

            if (!resultUrl || !(resultUrl as RedirectResult).url)
                throw new Error('Processo de autorização cancelado pelo usuário.');

            const code = new URL((resultUrl as RedirectResult).url).searchParams.get('code');
            if (!code)
                throw new Error('Código de autorização não encontrado na URL de retorno.');

            const { access_token: shortLivedToken } = await this.client.getAccessToken(code);
            const { access_token: longLivedToken, expires_in } = await this.client.getLongLivedToken(shortLivedToken);

            const expiresInMs = (expires_in - 3600) * 1000;
            const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

            const profile = await this.client.getUserProfile({
                userId: "me",
                fields: ["id", "username"],
            });

            const credentials: Credentials = {
                token: longLivedToken,
                platform: this.platform as PlatformType,
                consumerKey: profile.userId,
                consumerSecret: "",
                tokenSecret: "",
                active: true,
                aditional: expiresAt,
            };
            await AuthTokenDao.saveCredentials(this.platform as PlatformType, credentials);

            console.info(`[${this.platform}] Login bem-sucedido e token salvo.`);
            return true;
        } catch (error) {
            InAppBrowser.closeAuth();
            console.error(error as Error, { message: `[${this.platform}] Falha no processo de login OAuth` });
            return false;
        }
    }

    async test(): Promise<boolean> {
        console.info(`[${this.platform}] Testando credenciais salvas...`);
        try {
            const credentials = await AuthTokenDao.getCredentialsForPlatform<Credentials>(this.platform as PlatformType);
            if (!credentials?.token)
                return await this.login();

            this.client.setAccessToken(credentials.token);
            const profile = await this.client.getUserProfile({
                userId: "me",
                fields: ["id", "username"],
            });

            if (profile?.username) {
                console.info(`[${this.platform}] Teste bem-sucedido para o usuário: @${profile.username}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(error as Error, { message: `[${this.platform}] Teste de credenciais falhou` });
            return false;
        }
    }

    async post(data: PostData): Promise<ResultPost> {
        console.info(`[${this.platform}] Iniciando postagem com nova lógica...`);
        try {
            const credentials = await AuthTokenDao.getCredentialsForPlatform<Credentials>(this.platform as PlatformType);
            if (!credentials?.token)
                throw new Error(`Access Token do Threads não encontrado.`);

            if (!credentials.active)
                return { sucess: false }

            if (data.images && data.images.length > 0 && (!data.imagesUrl || data.imagesUrl.length === 0))
                throw new Error(`Não encontrado links das imagens, postagem abortada.`);

            if (!this.userId)
                this.userId = credentials.consumerKey;

            const userId = this.userId;
            this.client.setAccessToken(credentials.token);
            let creationId: string;

            if (!data.imagesUrl || data.imagesUrl.length === 0) {
                console.info(`[${this.platform}] Criando container de texto...`);
                creationId = await this.client.createMediaContainer({
                    userId,
                    mediaType: 'TEXT',
                    text: data.text,
                });
            } else if (data.imagesUrl.length === 1) {
                console.info(`[${this.platform}] Fazendo upload da imagem para obter URL pública...`);
                const mediaUrl = data.imagesUrl[0] //await ImageUploadService.uploadImageAndGetUrl(data.images[0]); // Threads necessita de uma url, no qual irá vir do tumblr

                console.info(`[${this.platform}] Criando container de imagem única...`);
                creationId = await this.client.createMediaContainer({
                    userId,
                    mediaType: 'IMAGE',
                    mediaUrl,
                    text: data.text,
                });
                //await this.waitForContainerReady(creationId);
            } else {
                console.info(`[${this.platform}] Criando containers para cada item do carrossel...`);
                const itemContainerIds = await Promise.all(
                    data.imagesUrl.map(url => this.client.createCarouselItemContainer({
                        userId,
                        mediaType: 'IMAGE',
                        mediaUrl: url,
                    }))
                );

                // Espera todos os itens do carrossel estarem prontos
                //await Promise.all(itemContainerIds.map(id => this.waitForContainerReady(id)));

                console.info(`[${this.platform}] Criando container principal do carrossel...`);
                creationId = await this.client.createCarouselContainer({
                    userId,
                    children: itemContainerIds,
                    text: data.text,
                });
            }

            console.info(`[${this.platform}] Publicando container ID: ${creationId}...`);
            await this.client.publishMediaContainer({
                userId,
                creationId
            });

            console.info(`[${this.platform}] Postagem bem-sucedida!`);
            return { sucess: true };

        } catch (error) {
            console.error(error as Error, { message: `[${this.platform}] Falha na postagem` });
            return { sucess: false };
        }
    }
}