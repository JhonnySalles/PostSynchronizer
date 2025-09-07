import Logger from 'src/services/LoggerService';

import { PlatformType, X, TUMBLR, THREADS, UNKNOW, BLUESKY } from '../../constants/platforms';
import { IApiService } from './IApiService';
import { XService } from './XService';
import { TumblrService } from './TumblrService';
import { ThreadsService } from './ThreadsService';
import { BlueskyService } from './BlueskyService';

export const ApiServiceFactory = (platform: PlatformType): IApiService => {
    switch (platform) {
        case X:
            return new XService();
        case TUMBLR:
            return new TumblrService();
        case THREADS:
            return new ThreadsService();
        case BLUESKY:
            return new BlueskyService();
        case UNKNOW:
            throw new Error(`Serviço para a plataforma "${platform}" não foi implementado.`);
        default:
            const exhaustiveCheck: never = platform;
            throw new Error(`Serviço para a plataforma "${exhaustiveCheck}" não foi implementado.`);
    }
};


export async function refreshAllTokens(): Promise<void> {
    Logger.info('[App Startup] Iniciando verificação de tokens para todos os serviços...');

    const allPlatforms: PlatformType[] = [THREADS, X, TUMBLR];

    const refreshPromises = allPlatforms.map(platform => {
        try {
            const service = ApiServiceFactory(platform);
            return service.validateAndRefreshToken();
        } catch (error) {
            Logger.error(error as Error, { message: `[App Startup] Falha ao criar serviço para a plataforma ${platform}` });
            return Promise.resolve();
        }
    });

    const results = await Promise.allSettled(refreshPromises);

    results.forEach((result, index) => {
        if (result.status === 'rejected')
            Logger.error(new Error(`[App Startup] Falha na verificação de token para a plataforma: ${allPlatforms[index]}`), { reason: result.reason, });
    });

    Logger.info('[App Startup] Processo de verificação de tokens concluído.');
}