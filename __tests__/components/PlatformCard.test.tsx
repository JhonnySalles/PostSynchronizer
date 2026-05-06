import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PlatformCard from 'src/components/PlatformCard';
import { TUMBLR, X } from 'src/constants/platforms';
import { TumblrCredentials } from 'src/dao/AuthTokenDao';

jest.mock('react-native-dropdown-picker', () => jest.fn(() => null));

describe('PlatformCard', () => {
  const mockOnStatusChange = jest.fn();
  const mockOnConsult = jest.fn();
  const mockOnCredentialsChange = jest.fn();

  const baseCredential = {
    platform: X,
    active: true,
    aditional: 'tok',
  };

  const tumblrCredential: TumblrCredentials = {
    platform: TUMBLR,
    active: true,
    aditional: '',
    blogName: 'blog1',
    blogs: [
      { name: 'blog1', title: 'Blog 1', selected: true },
      { name: 'blog2', title: 'Blog 2', selected: false },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar o título da plataforma e ícone', () => {
    const { getByText } = render(
      <PlatformCard 
        credential={baseCredential} 
        iconName="logo-twitter" 
        iconColor="blue" 
      />
    );
    expect(getByText(X)).toBeTruthy();
  });

  test('deve disparar onStatusChange ao alternar o Switch', () => {
    const { getByTestId } = render(
      <PlatformCard 
        credential={baseCredential} 
        iconName="logo-twitter" 
        iconColor="blue" 
        onStatusChange={mockOnStatusChange}
      />
    );

    const switchComp = getByTestId('platform-switch-x');
    fireEvent(switchComp, 'onValueChange', false);

    expect(mockOnStatusChange).toHaveBeenCalledWith(expect.objectContaining({
      platform: X,
      active: false
    }));
  });

  test('deve mostrar seção do Tumblr apenas para a plataforma Tumblr', () => {
    const { queryByText, getByText } = render(
      <PlatformCard 
        credential={tumblrCredential} 
        iconName="logo-tumblr" 
        iconColor="navy" 
      />
    );
    
    expect(getByText('Consultar blogs')).toBeTruthy();
    
    // Testar com X (não deve ter o botão)
    const { queryByText: queryByTextX } = render(
      <PlatformCard 
        credential={baseCredential} 
        iconName="logo-twitter" 
        iconColor="blue" 
      />
    );
    expect(queryByTextX('Consultar blogs')).toBeNull();
  });

  test('deve disparar onConsult ao clicar no botão do Tumblr', () => {
    const { getByText } = render(
      <PlatformCard 
        credential={tumblrCredential} 
        iconName="logo-tumblr" 
        iconColor="navy" 
        onConsult={mockOnConsult}
      />
    );

    fireEvent.press(getByText('Consultar blogs'));
    expect(mockOnConsult).toHaveBeenCalledWith(tumblrCredential);
  });

  test('deve disparar onCredentialsChange ao selecionar um novo blog no Tumblr', () => {
    // Mock local do DropDownPicker para capturar props
    const DropDownPicker = require('react-native-dropdown-picker');
    
    const { rerender } = render(
      <PlatformCard 
        credential={tumblrCredential} 
        iconName="logo-tumblr" 
        iconColor="navy" 
        onCredentialsChange={mockOnCredentialsChange}
      />
    );

    // Pegamos o mock que foi chamado
    const lastCall = (DropDownPicker as jest.Mock).mock.calls[(DropDownPicker as jest.Mock).mock.calls.length - 1];
    const props = lastCall[0];

    // Simular seleção do blog2
    // A função setValue do DropDownPicker recebe um callback: (prevValue) => newValue
    props.setValue((_prev: string) => 'blog2');

    expect(mockOnCredentialsChange).toHaveBeenCalledWith(expect.objectContaining({
      blogName: 'blog2',
      blogs: expect.arrayContaining([
        expect.objectContaining({ name: 'blog1', selected: false }),
        expect.objectContaining({ name: 'blog2', selected: true }),
      ])
    }));
  });
});
