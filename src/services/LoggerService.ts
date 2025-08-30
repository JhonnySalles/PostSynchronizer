import { logger, fileAsyncTransport } from 'react-native-logs';
import * as Sentry from '@sentry/react-native';
import RNFS from 'react-native-fs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const config = {
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    },
    severity: __DEV__ ? 'debug' : 'error',
    transport: fileAsyncTransport,
    transportOptions: {
        FS: RNFS,
        filePath: `${RNFS.DocumentDirectoryPath}/app_logs.txt`,
        // Define o tamanho máximo do arquivo de log (ex: 1MB)
        fileMaxSize: 1024 * 1024,
        // Define o número máximo de arquivos de log rotacionados
        fileBackupCount: 2,
    },
};

const log = logger.create(config) as {
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (error: Error, context?: Record<string, any>) => void;
};

class LoggerService {
    /**
     * Log para informações de depuração detalhadas.
     * Também cria um "breadcrumb" no Sentry para dar contexto a futuros erros.
     */
    public debug(...args: any[]): void {
        const message = args.map(arg => String(arg)).join(' ');
        log.debug(message);
        Sentry.addBreadcrumb({ category: 'debug', message, level: 'debug' });
    }

    /**
     * Log para eventos importantes do fluxo do aplicativo.
     * Também cria um "breadcrumb" no Sentry.
     */
    public info(...args: any[]): void {
        const message = args.map(arg => String(arg)).join(' ');
        log.info(message);
        Sentry.addBreadcrumb({ category: 'log', message, level: 'info' });
    }

    /**
     * Log para avisos e situações inesperadas, mas que não são erros críticos.
     * Também cria um "breadcrumb" no Sentry.
     */
    public warn(...args: any[]): void {
        const message = args.map(arg => String(arg)).join(' ');
        log.warn(message);
        Sentry.addBreadcrumb({ category: 'log', message, level: 'warning' });
    }

    /**
     * Log para erros.
     * Grava o erro no arquivo de log local E o envia para o Sentry.
     * @param error O objeto de erro capturado.
     * @param context Informações extras para enviar ao Sentry.
     */
    public error(error: Error, context?: Record<string, any>): void {
        // Grava no arquivo local
        log.error(error.message, context ? JSON.stringify(context) : '');

        if (context)
            Sentry.setContext('Custom Context', context);

        Sentry.captureException(error);
    }
}

export default new LoggerService();