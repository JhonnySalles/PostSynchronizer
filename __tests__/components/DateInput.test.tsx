import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DateInput from 'src/components/DateInput';

// Mock do ThemeProvider
jest.mock('src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      text: '#000',
      card: '#FFF',
      border: '#CCC',
      background: '#FFF',
      textSecondary: '#666'
    }
  }),
  ThemeProvider: ({ children }: any) => children
}));

describe('DateInput Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();
  const initialDate = new Date(2025, 0, 15); // 15 de Janeiro de 2025

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar o mês e ano corretos inicialmente', () => {
    const { getByText } = render(
      <DateInput
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        initialDate={initialDate}
      />
    );

    expect(getByText('Janeiro 2025')).toBeTruthy();
  });

  test('deve navegar para o mês anterior ao clicar no botão de voltar', () => {
    const { getByText, getByTestId } = render(
      <DateInput
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        initialDate={initialDate}
      />
    );

    const prevButton = getByTestId('btn-prev-month');
    fireEvent.press(prevButton);
    expect(getByText('Dezembro 2024')).toBeTruthy();
  });

  test('deve chamar onSelect e onClose ao selecionar um dia', () => {
    const { getByText } = render(
      <DateInput
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        initialDate={initialDate}
      />
    );

    // Clica no dia 20
    fireEvent.press(getByText('20'));

    expect(mockOnSelect).toHaveBeenCalledWith(expect.any(Date));
    const selectedDate = mockOnSelect.mock.calls[0][0];
    expect(selectedDate.getDate()).toBe(20);
    expect(selectedDate.getMonth()).toBe(0); // Janeiro
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('deve permitir entrada direta via teclado e validar data', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <DateInput
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        initialDate={initialDate}
      />
    );

    // Primeiro ativa o modo de input direto
    fireEvent.press(getByTestId('btn-toggle-input'));

    const input = getByPlaceholderText('dd/mm/yyyy');
    
    // Digita uma data válida
    fireEvent.changeText(input, '25052025'); // 25/05/2025

    expect(mockOnSelect).toHaveBeenCalledWith(expect.any(Date));
    const selectedDate = mockOnSelect.mock.calls[0][0];
    expect(selectedDate.getDate()).toBe(25);
    expect(selectedDate.getMonth()).toBe(4); // Maio
    expect(selectedDate.getFullYear()).toBe(2025);
  });
});
