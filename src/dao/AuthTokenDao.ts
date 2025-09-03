import { getDBConnection } from '../database';
import { PlatformType, X, TUMBLR, THREADS, UNKNOW, BLUESKY } from '../constants/platforms';
import Logger from 'src/services/LoggerService';

export interface Credentials {
    platform: typeof UNKNOW | typeof X | typeof TUMBLR | typeof THREADS | typeof BLUESKY;
    consumerKey: string;
    consumerSecret: string;
    token: string;
    tokenSecret: string;
    active: boolean;
    aditional: string;
}

export interface TumblrCredentials extends Credentials {
    platform: typeof TUMBLR;
    blogName: string;
    blogs: TumblrBlogs[];
}

export interface TumblrBlogs {
    name: string;
    title: string;
    selected: boolean;
}

export type AnyCredentials = TumblrCredentials | Credentials;

class AuthTokenDao {
    /**
     * @param platform A plataforma.
     * @param credentials O objeto de credenciais a ser salvo como JSON.
     */
    public async saveCredentials(credential: Record<string, any>): Promise<void> {
        const db = await getDBConnection();

        try {
            await db.executeSql('BEGIN TRANSACTION;');

            const results = await db.executeSql('SELECT platform FROM auth_tokens WHERE platform = ?', [credential.platform]);
            if (credential.platform === TUMBLR)
                credential.aditional = JSON.stringify((credential as TumblrCredentials).blogs);

            if (results[0].rows.length > 0) {
                Logger.info(`Atualizando credenciais para ${credential.platform} [DAO]`);
                await db.executeSql(
                    'UPDATE auth_tokens SET consumer_key = ?, consumer_secret = ?, token = ?, token_secret = ?, aditional = ?, active = ?, updated_at = ? WHERE platform = ?',
                    [credential.consumerKey, credential.consumerSecret, credential.token, credential.tokenSecret, credential.aditional, credential.active ? 1 : 0, new Date().toISOString(), credential.platform]
                );
            } else {
                Logger.info(`Inserindo novas credenciais para ${credential.platform} [DAO]`);
                const createdAt = new Date().toISOString();
                await db.executeSql(
                    'INSERT INTO auth_tokens (platform, consumer_key, consumer_secret, token, token_secret, aditional, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [credential.platform, credential.consumerKey, credential.consumerSecret, credential.token, credential.tokenSecret, credential.aditional, credential.active ? 1 : 0, createdAt, createdAt]
                );
            }

            await db.executeSql('COMMIT;');
            Logger.info(`Credenciais para ${credential.platform} salvas com sucesso [DAO]`);
        } catch (error) {
            await db.executeSql('ROLLBACK;');
            Logger.error(error as Error, { message: `Erro ao salvar credenciais para ${credential.platform} [DAO]:` });
            throw error;
        }
    }

    /**
     * Busca um objeto de credenciais complexas de uma plataforma.
     * @param platform A plataforma.
     * @returns O objeto de credenciais parseado ou null se não encontrado.
     */
    public async getCredentialsForPlatform<T>(platform: PlatformType): Promise<T | null> {
        const db = await getDBConnection();
        try {
            let credential: T | null = null
            const results = await db.executeSql('SELECT platform, consumer_key, consumer_secret, token, token_secret, aditional, active FROM auth_tokens WHERE platform = ?', [platform]);
            if (results[0].rows.length > 0) {
                const dados = results[0].rows.item(0);
                if (dados) {
                    credential = {
                        platform: dados.platform,
                        consumerKey: dados.consumer_key,
                        consumerSecret: dados.consumer_secret,
                        token: dados.token,
                        tokenSecret: dados.token_secret,
                        active: dados.active,
                        aditional: dados.aditional
                    } as T;

                    if (platform === TUMBLR) {
                        const blogs = JSON.parse(dados.aditional || '[]')
                        if (blogs && blogs.length > 0) {
                            (credential as TumblrCredentials).blogName = blogs.find((b : TumblrBlogs) => b.selected)?.name || "";
                            (credential as TumblrCredentials).blogs = blogs;
                        }
                    }
                }
            }

            return credential;
        } catch (error) {
            Logger.error(error as Error, { message: `Erro ao buscar credenciais para ${platform} [DAO]:` });
            throw error;
        }
    }

    /**
     * Retorna todas as credenciais salvas no banco.
     * @returns Uma lista de credenciais
     */
    public async getAllCredentials(): Promise<Credentials[]> {
        const db = await getDBConnection();
        try {
            const results = await db.executeSql('SELECT platform, consumer_key, consumer_secret, token, token_secret, aditional, active FROM auth_tokens WHERE platform IS NOT NULL');

            const allCredentials: Credentials[] = [];
            results.forEach(result => {
                for (let i = 0; i < result.rows.length; i++) {
                    const dados = result.rows.item(i);
                    const credential = {
                        platform: dados.platform,
                        consumerKey: dados.consumer_key,
                        consumerSecret: dados.consumer_secret,
                        token: dados.token,
                        tokenSecret: dados.token_secret,
                        active: dados.active === 1 ? true : false,
                        aditional: dados.aditional
                    }

                    if (dados.platform === TUMBLR) {
                        const blogs = JSON.parse(dados.aditional || '[]')
                        if (blogs && blogs.length > 0) {
                            (credential as TumblrCredentials).blogName = blogs.find((b : TumblrBlogs) => b.selected)?.name || "";
                            (credential as TumblrCredentials).blogs = blogs;
                        }
                    }
                    allCredentials.push(credential);
                }
            });
            return allCredentials;
        } catch (error) {
            Logger.error(error as Error, { message: 'Erro ao buscar todas as credenciais [DAO]' });
            throw error;
        }
    }

    /**
     * Retorna uma lista com todas as plataformas que possuem um token salvo (conectadas).
     * @returns Uma lista de nomes de plataformas ativas.
     */
    public async getActivePlatforms(): Promise<PlatformType[]> {
        const db = await getDBConnection();
        try {
            const results = await db.executeSql('SELECT platform FROM auth_tokens WHERE active = 1');
            const platforms: PlatformType[] = [];
            results.forEach(result => {
                for (let i = 0; i < result.rows.length; i++)
                    platforms.push(result.rows.item(i).platform);
            });
            return platforms;
        } catch (error) {
            Logger.error(error as Error, { message: `Erro ao buscar plataformas ativas [DAO]:` });
            throw error;
        }
    }

    /**
     * Atualiza apenas o status 'active' de uma conexão.
     * @param credentials Credenciais a ser autlizado o status.
     */
    public async updateActiveStatus(credentials: Credentials): Promise<void> {
        const db = await getDBConnection();
        try {
            const activeValue = credentials.active ? 1 : 0;
            await db.executeSql('UPDATE auth_tokens SET active = ? WHERE platform = ?', [activeValue, credentials.platform]);
            Logger.info(`[DAO] Status da plataforma ${credentials.platform} atualizado para ${credentials.active}`);
        } catch (error) {
            Logger.error(error as Error, { message: `Erro ao atualizar status para ${credentials.platform} [DAO]` });
            throw error;
        }
    }
}

export default new AuthTokenDao();