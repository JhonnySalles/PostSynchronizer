import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import LoadingIndicator from 'src/components/LoadingIndicator';
import { Platform } from 'react-native';

// Mock Theme
jest.mock('src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: { primary: '#007bff' },
    isDark: false,
  }),
}));

describe('LoadingIndicator Component', () => {
  test('deve renderizar corretamente quando visível (Android/iOS)', () => {
    // Forçar plataforma não-windows para o teste do Modal
    Platform.OS = 'android';
    
    const testRenderer = renderer.create(<LoadingIndicator visible={true} text="Aguarde..." />);
    const testInstance = testRenderer.root;
    
    expect(testInstance.findByType('Modal').props.visible).toBe(true);
    expect(testInstance.findByType('Text').props.children).toBe('Aguarde...');
  });

  test('deve retornar null quando não visível no Windows', () => {
    Platform.OS = 'windows';
    
    const testRenderer = renderer.create(<LoadingIndicator visible={false} />);
    expect(testRenderer.toJSON()).toBeNull();
  });

  test('deve renderizar conteúdo sem Modal no Windows quando visível', () => {
    Platform.OS = 'windows';
    
    const testRenderer = renderer.create(<LoadingIndicator visible={true} />);
    const testInstance = testRenderer.root;
    
    // No Windows, não deve haver Modal
    expect(testInstance.findAllByType('Modal')).toHaveLength(0);
    // Mas deve haver o ActivityIndicator
    expect(testInstance.findByType('ActivityIndicator')).toBeTruthy();
  });

  test('deve usar o texto padrão se nenhum for fornecido', () => {
    Platform.OS = 'android';
    const testRenderer = renderer.create(<LoadingIndicator visible={true} />);
    expect(testRenderer.root.findByType('Text').props.children).toBe('Carregando...');
  });
});
