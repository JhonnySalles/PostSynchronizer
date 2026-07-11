import { useEffect } from 'react';
import { StatusBar, Platform, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation';
import { getDBConnection, closeDBConnection } from './src/database';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { AppLightTheme, AppDarkTheme } from './src/navigation/NavigationTheme';
import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from '@env';
import { apiService } from './src/services/ApiService';
import Logger from './src/services/LoggerService';
import { ProgressProvider } from './src/contexts/ProgressContext';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { firebaseService } from './src/services/FirebaseService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,

  sendDefaultPii: true,
  enableTombstone: true,

  beforeSend(event: any, hint: any) {
    const error = hint?.originalException;
    if (error) {
      // Ignorar erros do endpoint de Health Check
      if (error.config?.url?.includes('/health') || error.message?.includes('/health')) {
        return null;
      }

      const message = String(error.message || error);
      // Ignorar erros de conexão WebSocket esperados enquanto a API está offline/reiniciando
      if (message.includes('websocket error')) {
        return null;
      }
      // Ignorar erros de rede do Axios esperados durante a inicialização (cold start) ou instabilidade de conexão
      if (message.includes('Network Error')) {
        return null;
      }
    }
    return event;
  },

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

const AppContent = () => {
  const { colors, isDark } = useTheme();

  const navigationTheme = isDark ? AppDarkTheme : AppLightTheme;

  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{
          backgroundColor: colors.card,
          ...Platform.select({
            windows: {
              borderLeftWidth: 5,
              borderColor: colors.success,
            },
            default: {
              borderLeftWidth: 5,
              borderLeftColor: colors.success,
            },
          }),
        }}
        contentContainerStyle={{
          ...Platform.select({
            windows: {
              marginStart: 15,
              marginEnd: 15,
            },
            default: {
              paddingHorizontal: 15,
            },
          }),
        }}
        text1Style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: colors.text,
        }}
        text2Style={{
          fontSize: 14,
          color: colors.textSecondary,
        }}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{
          backgroundColor: colors.card,
          ...Platform.select({
            windows: {
              borderLeftWidth: 5,
              borderColor: colors.error,
            },
            default: {
              borderLeftWidth: 5,
              borderLeftColor: colors.error,
            },
          }),
        }}
        contentContainerStyle={{
          ...Platform.select({
            windows: {
              marginStart: 15,
              marginEnd: 15,
            },
            default: {
              paddingHorizontal: 15,
            },
          }),
        }}
        text1Style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: colors.text,
        }}
        text2Style={{
          fontSize: 14,
          color: colors.textSecondary,
        }}
      />
    ),
    info: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderColor: colors.primary,
          backgroundColor: colors.card,
          ...Platform.select({
            windows: {
              borderLeftWidth: 5,
              borderColor: colors.primary,
            },
            default: {
              borderLeftWidth: 5,
              borderLeftColor: colors.primary,
            },
          }),
        }}
        contentContainerStyle={{
          ...Platform.select({
            windows: {
              marginStart: 15,
              marginEnd: 15,
            },
            default: {
              paddingHorizontal: 15,
            },
          }),
        }}
        text1Style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: colors.text,
        }}
        text2Style={{
          fontSize: 14,
          color: colors.textSecondary,
        }}
      />
    ),
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <AppNavigator />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
};

const App = () => {
  useEffect(() => {
    const initializeDB = async () => {
      try {
        await getDBConnection();
        Logger.info('[App Startup] Banco de dados inicializado com sucesso.');
      } catch (error) {
        Logger.error(error as Error, { message: '[App Startup] Falha na inicialização do banco de dados:' });
      }
    };
    initializeDB();
    firebaseService.initialize();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState.match(/inactive|background/)) {
        try {
          await closeDBConnection();
        } catch (error) {
          Logger.error(error as Error, {
            message: '[App Lifecycle] Erro ao fechar banco de dados ao ir para segundo plano',
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const performStartupTokenRefresh = async () => {
      try {
        await apiService.refreshTokens();
      } catch (error) {
        Logger.error(error as Error, {
          message: '[App Startup] Falha na verificação de token durante a inicialização do app',
        });
      }
    };
    const timer = setTimeout(performStartupTokenRefresh, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <ProgressProvider>
        <AppContent />
      </ProgressProvider>
    </ThemeProvider>
  );
};

export default Sentry.wrap(App);
