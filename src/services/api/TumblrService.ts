import { IApiService, PostData } from './IApiService';
import AuthTokenDao from '../../dao/AuthTokenDao';
import { PlatformType, TUMBLR } from '../../constants/platforms';
import { clientService } from '../clientService';

export class TumblrService implements IApiService {
    private platform = TUMBLR;
    private client = clientService[TUMBLR];

    async login(username: string, password_or_token: string): Promise<boolean> {
        console.log(`[${this.platform}] Iniciando login para o usuário: ${username}`);
        try {
            // 1. Simula a chamada de API para obter um token
            // Na vida real: const response = await apiClient.post('/auth/x', { username, password_or_token });
            const fakeToken = `fake-token-${this.platform}-${Date.now()}`;
            console.log(`[${this.platform}] Token recebido (simulado): ${fakeToken}`);

            await AuthTokenDao.saveToken(this.platform as PlatformType, username, fakeToken);

            console.log(`[${this.platform}] Token salvo no banco de dados.`);
            return true;
        } catch (error) {
            console.error(`[${this.platform}] Falha no login:`, error);
            return false;
        }
    }

    async post(data: PostData): Promise<boolean> {
        console.log(`[${this.platform}] Iniciando postagem...`);
        try {
            const token = await AuthTokenDao.getTokenForPlatform(this.platform as PlatformType);

            if (!token)
                throw new Error(`[${this.platform}] Usuário não está logado. Token não encontrado.`);
            
            console.log(`[${this.platform}] Usando token para postar.`);

            // 2. Simula a chamada de API para postar o conteúdo
            // Na vida real: await apiClient.post('/post/x', data, { headers: { Authorization: `Bearer ${token}` } });
            console.log(`[${this.platform}] Postagem enviada (simulada) com texto: "${data.text}"`);

            return true;
        } catch (error) {
            console.error(`[${this.platform}] Falha na postagem:`, error);
            return false;
        }
    }
}