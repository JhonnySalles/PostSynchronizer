import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation';
import { getDBConnection } from './src/database';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { AppLightTheme, AppDarkTheme } from './src/navigation/NavigationTheme';
import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from '@env';
import { apiService } from './src/services/ApiService';
import Logger from './src/services/LoggerService';
import { ProgressProvider } from './src/contexts/ProgressContext';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,

  sendDefaultPii: true,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

const AppContent = () => {
  const { colors, isDark } = useTheme();

  const navigationTheme = isDark ? AppDarkTheme : AppLightTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <AppNavigator />
    </NavigationContainer>
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
