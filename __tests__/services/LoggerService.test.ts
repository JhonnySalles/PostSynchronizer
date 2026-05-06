jest.mock('react-native-logs', () => ({
  logger: {
    createLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
  fileAsyncTransport: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  setContext: jest.fn(),
  init: jest.fn(),
  wrap: jest.fn(c => c),
  mobileReplayIntegration: jest.fn(),
  feedbackIntegration: jest.fn(),
}));

jest.unmock('src/services/LoggerService');

import LoggerService from 'src/services/LoggerService';
import * as Sentry from '@sentry/react-native';
import { logger } from 'react-native-logs';

const mockLogInstance = (logger.createLogger as jest.Mock).mock.results[0].value;

describe('LoggerService.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debug: deve logar mensagem e criar breadcrumb no Sentry', () => {
    LoggerService.debug('teste debug', 123);

    expect(mockLogInstance.debug).toHaveBeenCalledWith('teste debug 123');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'debug',
      message: 'teste debug 123',
      level: 'debug',
    });
  });

  test('info: deve logar mensagem e criar breadcrumb no Sentry', () => {
    LoggerService.info('teste info', { a: 1 });

    expect(mockLogInstance.info).toHaveBeenCalledWith('teste info [object Object]');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'log',
      message: 'teste info [object Object]',
      level: 'info',
    });
  });

  test('warn: deve logar mensagem e criar breadcrumb no Sentry', () => {
    LoggerService.warn('teste warn');

    expect(mockLogInstance.warn).toHaveBeenCalledWith('teste warn');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'log',
      message: 'teste warn',
      level: 'warning',
    });
  });

  test('error: deve logar erro e enviar para Sentry', () => {
    const error = new Error('Erro crítico');
    const context = { extra: 'info' };

    LoggerService.error(error, context);

    expect(mockLogInstance.error).toHaveBeenCalledWith(error, context);
    expect(Sentry.setContext).toHaveBeenCalledWith('Custom Context', context);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  test('error: não deve setar contexto se não for fornecido', () => {
    const error = new Error('Erro sem contexto');

    LoggerService.error(error);

    expect(Sentry.setContext).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});
