import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ConfirmPopup from 'src/components/ConfirmPopup';

describe('ConfirmPopup', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar quando visível', () => {
    const { getByText } = render(
      <ConfirmPopup 
        visible={true} 
        title="Confirmar?" 
        message="Deseja mesmo fazer isso?" 
        onConfirm={mockOnConfirm} 
      />
    );
    expect(getByText('Confirmar?')).toBeTruthy();
    expect(getByText('Deseja mesmo fazer isso?')).toBeTruthy();
  });

  test('deve chamar onConfirm ao clicar no botão de confirmação', () => {
    const { getByText } = render(
      <ConfirmPopup 
        visible={true} 
        title="Título" 
        message="Msg" 
        onConfirm={mockOnConfirm} 
        confirmLabel="Sim"
      />
    );

    fireEvent.press(getByText('Sim'));
    expect(mockOnConfirm).toHaveBeenCalled();
  });

  test('deve chamar onCancel ao clicar no botão cancelar', () => {
    const { getByText } = render(
      <ConfirmPopup 
        visible={true} 
        title="Título" 
        message="Msg" 
        onConfirm={mockOnConfirm} 
        onCancel={mockOnCancel}
        cancelLabel="Não"
      />
    );

    fireEvent.press(getByText('Não'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('deve chamar onConfirm se onCancel não for fornecido e o overlay for pressionado', () => {
    // Nota: O Modal do RN no Jest muitas vezes não renderiza o conteúdo se não for mockado corretamente,
    // mas aqui o ConfirmPopup renderiza os botões dentro dele.
    
    const { getByText } = render(
      <ConfirmPopup 
        visible={true} 
        title="Título" 
        message="Msg" 
        onConfirm={mockOnConfirm}
        // sem onCancel
      />
    );

    // O handleClose é disparado pelo overlay ou botão cancelar
    fireEvent.press(getByText('Cancelar'));
    expect(mockOnConfirm).toHaveBeenCalled();
  });

  test('deve esconder o botão cancelar se singleButton for true', () => {
    const { queryByText } = render(
      <ConfirmPopup 
        visible={true} 
        title="Título" 
        message="Msg" 
        onConfirm={mockOnConfirm} 
        singleButton={true}
      />
    );

    expect(queryByText('Cancelar')).toBeNull();
  });
});
