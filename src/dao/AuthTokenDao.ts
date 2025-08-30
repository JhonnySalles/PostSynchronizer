import { getDBConnection } from '../database';
import { PlatformType } from '../constants/platforms';

class AuthTokenDao {
    /**
     * Salva ou atualiza um token de autenticação para uma plataforma específica.
     * @param platform A plataforma (ex: 'x', 'tumblr').
     * @param username O nome de usuário associado.
     * @param token O token de acesso a ser salvo.
     */
    public async saveToken(platform: PlatformType, username: string, token: string): Promise<void> {
        const db = await getDBConnection();
        try {
            await db.executeSql(
                'INSERT OR REPLACE INTO auth_tokens (platform, username, token) VALUES (?, ?, ?)',
                [platform, username, token]
            );
            console.log(`Token para ${platform} salvo com sucesso [DAO]`);
        } catch (error) {
            console.error(`Erro ao salvar token para ${platform} [DAO]:`, error);
            throw error;
        }
    }

    /**
     * Busca o token de acesso para uma plataforma específica.
     * @param platform A plataforma para a qual buscar o token.
     * @returns O token de acesso ou null se não for encontrado.
     */
    public async getTokenForPlatform(platform: PlatformType): Promise<string | null> {
        const db = await getDBConnection();
        try {
            const results = await db.executeSql('SELECT token FROM auth_tokens WHERE platform = ?', [platform]);
            if (results[0].rows.length > 0)
                return results[0].rows.item(0).token;

            return null;
        } catch (error) {
            console.error(`Erro ao buscar token para ${platform} [DAO]:`, error);
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
            const results = await db.executeSql('SELECT platform FROM auth_tokens');
            const platforms: PlatformType[] = [];
            results.forEach(result => {
                for (let i = 0; i < result.rows.length; i++) {
                    platforms.push(result.rows.item(i).platform);
                }
            });
            return platforms;
        } catch (error) {
            console.error('Erro ao buscar plataformas ativas [DAO]:', error);
            throw error;
        }
    }
}

export default new AuthTokenDao();