import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from 'src/navigation';
import { NavigationContainer } from '@react-navigation/native';

// Mocks
jest.mock('src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: { primary: '#000', inactive: '#666', background: '#FFF' }
  })
}));

// Mock customizado para capturar as abas
jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    createBottomTabNavigator: jest.fn(() => ({
      Navigator: ({ children }: any) => <View testID="mock-navigator">{children}</View>,
      Screen: ({ options }: any) => (
        <View testID={`tab-${options.title}`}>
          <Text>{options.title}</Text>
        </View>
      ),
    })),
  };
});

// Mock screens para não carregar toda a lógica
jest.mock('src/screens/HomeScreen', () => () => null);
jest.mock('src/screens/HistoryScreen', () => () => null);
jest.mock('src/screens/StatisticsScreen', () => () => null);
jest.mock('src/screens/SettingsScreen', () => () => null);
jest.mock('src/components/ApiStatusIcon', () => ({ ApiStatusIcon: () => null }));

describe('AppNavigator', () => {
  test('deve renderizar o tab navigator com as abas principais', () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    // Verifica se os títulos das abas (que agora são renderizados pelo mock) estão presentes
    expect(getByText('Postar')).toBeTruthy();
    expect(getByText('Histórico')).toBeTruthy();
    expect(getByText('Estatísticas')).toBeTruthy();
    expect(getByText('Configurações')).toBeTruthy();

    // Verifica via testID (garante que as abas foram registradas)
    expect(getByTestId('tab-Postar')).toBeTruthy();
    expect(getByTestId('tab-Histórico')).toBeTruthy();
  });
});
