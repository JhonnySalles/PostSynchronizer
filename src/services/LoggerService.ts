import { logger, fileAsyncTransport } from 'react-native-logs';
import * as Sentry from '@sentry/react-native';
import { fileService } from './FileService';
import { IS_PRODUCTION } from 'src/constants/app';

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
    FS: fileService as any,
    filePath: fileService.DocumentDirectoryPath,
    fileName: 'app_logs.txt',
    fileMaxSize: 1024 * 1024, // 1MB
    fileBackupCount: 2,
  },
};

const log = logger.createLogger(config) as {
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
    if (!IS_PRODUCTION) console.log(message);
  }

  /**
   * Log para eventos importantes do fluxo do aplicativo.
   * Também cria um "breadcrumb" no Sentry.
   */
  public info(...args: any[]): void {
    const message = args.map(arg => String(arg)).join(' ');
    log.info(message);
    Sentry.addBreadcrumb({ category: 'log', message, level: 'info' });
    if (!IS_PRODUCTION) console.log(message);
  }

  /**
   * Log para avisos e situações inesperadas, mas que não são erros críticos.
   * Também cria um "breadcrumb" no Sentry.
   */
  public warn(...args: any[]): void {
    const message = args.map(arg => String(arg)).join(' ');
    log.warn(message);
    Sentry.addBreadcrumb({ category: 'log', message, level: 'warning' });
    if (!IS_PRODUCTION) console.log(message);
  }

  /**
   * Log para erros.
   * Grava o erro no arquivo de log local E o envia para o Sentry.
   * @param error O objeto de erro capturado.
   * @param context Informações extras para enviar ao Sentry.
   */
  public error(error: Error, context?: Record<string, any>): void {
    log.error(error, context);
    if (!IS_PRODUCTION) console.log(error);

    if (context) Sentry.setContext('Custom Context', context);

    Sentry.captureException(error);
  }
}

export default new LoggerService();
