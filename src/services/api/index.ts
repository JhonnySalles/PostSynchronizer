import { PlatformType, X, TUMBLR, THREADS } from '../../constants/platforms';
import { IApiService } from './IApiService';
import { XService } from './XService';
import { TumblrService } from './TumblrService';
import { ThreadsService } from './ThreadsService';

export const ApiServiceFactory = (platform: PlatformType): IApiService => {
    switch (platform) {
        case X:
            return new XService();
        case TUMBLR:
            return new TumblrService();
        case THREADS:
            return new ThreadsService();
        default:
            const exhaustiveCheck: never = platform;
            throw new Error(`Serviço para a plataforma "${exhaustiveCheck}" não foi implementado.`);
    }
};