import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingIndicator from 'src/components/LoadingIndicator';
import { Platform } from 'react-native';

describe('LoadingIndicator Component', () => {
  test('deve renderizar corretamente quando visível (Android/iOS)', () => {
    // Mock Platform.OS para ser android
    Platform.OS = 'android';
    
    const { getByText } = render(<LoadingIndicator visible={true} text="Processando..." />);
    expect(getByText('Processando...')).toBeTruthy();
  });

  test('deve retornar null quando não visível no Windows', () => {
    Platform.OS = 'windows';
    const { queryByText } = render(<LoadingIndicator visible={false} />);
    expect(queryByText('Carregando...')).toBeNull();
  });

  test('deve renderizar conteúdo sem Modal no Windows quando visível', () => {
    Platform.OS = 'windows';
    const { getByText } = render(<LoadingIndicator visible={true} text="Windows Loading" />);
    expect(getByText('Windows Loading')).toBeTruthy();
  });

  test('deve usar o texto padrão se nenhum for fornecido', () => {
    Platform.OS = 'android';
    const { getByText } = render(<LoadingIndicator visible={true} />);
    expect(getByText('Carregando...')).toBeTruthy();
  });
});
