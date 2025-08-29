import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation';
import { getDBConnection } from './src/database';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

const AppContent = () => {
  const { isDark } = useTheme();

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

const App = () => {
  useEffect(() => {
    const initializeDB = async () => {
      try {
        await getDBConnection();
        console.log('Banco de dados inicializado com sucesso.');
      } catch (error) {
        console.error('Falha na inicialização do banco de dados:', error);
      }
    };
    initializeDB();
  }, []);

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;