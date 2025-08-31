import { getDBConnection } from '../database';
import { PlatformType, X, TUMBLR, THREADS, UNKNOW } from '../constants/platforms';

export interface Credentials {
    platform: typeof UNKNOW | typeof X | typeof TUMBLR | typeof THREADS;
    consumerKey: string;
    consumerSecret: string;
    token: string;
    tokenSecret: string;
    actived: boolean;
    aditional: string;
}

export interface TumblrCredentials extends Credentials {
    platform: typeof TUMBLR;
    blogName: string;
}

export type AnyCredentials = TumblrCredentials | Credentials;

class AuthTokenDao {
    /**
     * @param platform A plataforma.
     * @param credentials O objeto de credenciais a ser salvo como JSON.
     */
    public async saveCredentials(platform: PlatformType, credentials: Record<string, any>): Promise<void> {
        const db = await getDBConnection();

        try {
            await db.executeSql('BEGIN TRANSACTION;');

            const results = await db.executeSql('SELECT id FROM auth_tokens WHERE platform = ?', [platform]);

            if (results[0].rows.length > 0) {
                console.log(`Atualizando credenciais para ${platform} [DAO]`);
                await db.executeSql(
                    'UPDATE auth_tokens SET consumerKey = ?, consumer_secret = ?, token = ?, token_secret = ?, aditional = ?, actived = ?, updated_at = ? WHERE platform = ?',
                    [credentials.consumerKey, credentials.consumerSecret, credentials.token, credentials.tokenSecret, credentials.aditional, credentials.actived ? 1 : 0, new Date().toISOString(), platform]
                );
            } else {
                console.log(`Inserindo novas credenciais para ${platform} [DAO]`);
                const createdAt = new Date().toISOString();
                await db.executeSql(
                    'INSERT INTO auth_tokens (platform, consumer_key, consumer_secret, token, token_secret, aditional, actived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [platform, credentials.consumerKey, credentials.consumerSecret, credentials.token, credentials.tokenSecret, credentials.aditional, credentials.actived ? 1 : 0, createdAt, createdAt]
                );
            }

            await db.executeSql('COMMIT;');
            console.log(`Credenciais para ${platform} salvas com sucesso [DAO]`);
        } catch (error) {
            await db.executeSql('ROLLBACK;');
            console.error(`Erro ao salvar credenciais para ${platform} [DAO]:`, error);
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
            const results = await db.executeSql('SELECT platform, consumer_key, consumer_secret, token, token_secret, aditional, actived FROM auth_tokens WHERE platform = ?', [platform]);
            if (results[0].rows.length > 0) {
                const dados = results[0].rows.item(0).credentials;
                if (dados) {
                    credential = {
                        platform: dados.platform,
                        consumerKey: dados.consumer_key,
                        consumerSecret: dados.consumer_secret,
                        token: dados.token,
                        tokenSecret: dados.token_secret,
                        actived: dados.actived,
                        aditional: dados.aditional
                    } as T;

                    if (platform === TUMBLR)
                        (credential as TumblrCredentials).blogName = dados.aditional;
                }
            }

            return credential;
        } catch (error) {
            console.error(`Erro ao buscar credenciais para ${platform} [DAO]:`, error);
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
            const results = await db.executeSql('SELECT platform FROM auth_tokens WHERE actived = 1');
            const platforms: PlatformType[] = [];
            results.forEach(result => {
                for (let i = 0; i < result.rows.length; i++)
                    platforms.push(result.rows.item(i).platform);
            });
            return platforms;
        } catch (error) {
            console.error('Erro ao buscar plataformas ativas [DAO]:', error);
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
            const activeValue = credentials.actived ? 1 : 0;
            await db.executeSql('UPDATE auth_tokens SET actived = ? WHERE platform = ?', [activeValue, credentials.platform]);
            console.info(`[DAO] Status da plataforma ${credentials.platform} atualizado para ${credentials.actived}`);
        } catch (error) {
            console.error(error as Error, { message: `Erro ao atualizar status para ${credentials.platform} [DAO]` });
            throw error;
        }
    }
}

export default new AuthTokenDao();