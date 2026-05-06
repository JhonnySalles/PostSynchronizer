import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from 'src/screens/SettingsScreen';
import AuthTokenDao from 'src/dao/AuthTokenDao';
import { apiService } from 'src/services/ApiService';
import * as BackupService from 'src/services/BackupService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TUMBLR, X } from 'src/constants/platforms';
import { AI_PROMPT_KEY } from 'src/constants/app';
import { Alert } from 'react-native';

// Mocks
jest.mock('src/dao/AuthTokenDao');
jest.mock('src/services/ApiService');
jest.mock('src/services/BackupService');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(cb, []);
  },
}));

describe('SettingsScreen', () => {
  const mockCredentials = [
    { platform: TUMBLR, active: true, aditional: '', blogName: 'blog1', blogs: [] },
    { platform: X, active: false, aditional: 'tok' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (AuthTokenDao.getAllCredentials as jest.Mock).mockResolvedValue(mockCredentials);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('Prompt salvo');
  });

  test('deve carregar configurações ao focar na tela', async () => {
    const { getByText, getByDisplayValue } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(AuthTokenDao.getAllCredentials).toHaveBeenCalled();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(AI_PROMPT_KEY);
    });

    expect(getByDisplayValue('Prompt salvo')).toBeTruthy();
  });

  test('deve disparar login na API ao clicar no botão', async () => {
    (apiService.login as jest.Mock).mockResolvedValue(true);
    const spyAlert = jest.spyOn(Alert, 'alert');
    
    const { getByTestId } = render(<SettingsScreen />);
    
    const loginBtn = getByTestId('login-api-button');
    await act(async () => {
      fireEvent.press(loginBtn);
    });

    expect(apiService.login).toHaveBeenCalled();
    expect(spyAlert).toHaveBeenCalledWith('Login Bem-Sucedido!', expect.any(String));
  });

  test('deve atualizar o prompt da IA ao digitar', async () => {
    const { getByDisplayValue } = render(<SettingsScreen />);
    
    const input = await waitFor(() => getByDisplayValue('Prompt salvo'));
    fireEvent.changeText(input, 'Novo Prompt');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(AI_PROMPT_KEY, 'Novo Prompt');
  });

  test('deve iniciar exportação de backup ao clicar no botão', async () => {
    (BackupService.exportDatabase as jest.Mock).mockResolvedValue(true);
    const { getByText } = render(<SettingsScreen />);

    const exportBtn = getByText('Gerar Backup');
    await act(async () => {
      fireEvent.press(exportBtn);
    });

    expect(BackupService.exportDatabase).toHaveBeenCalled();
  });

  test('deve mostrar popup de confirmação antes de importar backup', async () => {
    const { getByText, queryByText } = render(<SettingsScreen />);

    // Garante que o popup não está visível
    expect(queryByText('Ao importar um backup')).toBeNull();

    const importBtn = getByText('Importar Backup');
    fireEvent.press(importBtn);

    // Agora deve estar visível (ConfirmPopup renderiza o texto da mensagem)
    expect(getByText(/Ao importar um backup/)).toBeTruthy();
  });

  test('deve executar importação ao confirmar no popup', async () => {
    (BackupService.importDatabase as jest.Mock).mockResolvedValue(true);
    const { getByText } = render(<SettingsScreen />);

    fireEvent.press(getByText('Importar Backup'));
    
    const confirmBtn = getByText('Importar');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });

    expect(BackupService.importDatabase).toHaveBeenCalled();
  });

  test('deve atualizar status da plataforma via PlatformCard', async () => {
    (AuthTokenDao.updateActiveStatus as jest.Mock).mockResolvedValue(undefined);
    const { getByTestId } = render(<SettingsScreen />);

    // Switch do X (que está inativo no mockCredentials)
    const switchX = getByTestId('platform-switch-x');
    
    await act(async () => {
      fireEvent(switchX, 'onValueChange', true);
    });

    expect(AuthTokenDao.updateActiveStatus).toHaveBeenCalledWith(expect.objectContaining({
      platform: X,
      active: true
    }));
  });
});
