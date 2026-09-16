import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { ApiStatusIcon } from 'src/components/ApiStatusIcon';
import { apiService } from 'src/services/ApiService';
import { ONLINE, OFFLINE, CONNECTING } from 'src/constants/app';
import Toast from 'react-native-toast-message';

// Mock do ApiService
jest.mock('src/services/ApiService', () => ({
    apiService: {
        getApiStatus: jest.fn(),
        onApiStatusChange: jest.fn(),
        offApiStatusChange: jest.fn(),
        checkHealth: jest.fn(),
    }
}));

// Mock do ThreadsJobService
jest.mock('src/services/ThreadsJobService', () => ({
    threadsJobService: {
        manualSync: jest.fn().mockResolvedValue({ activeJobsChecked: 1 }),
    }
}));

describe('ApiStatusIcon Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (apiService.getApiStatus as jest.Mock).mockReturnValue(ONLINE);
    });

    test('deve inicializar com o status atual do apiService', () => {
        const { getByTestId } = render(<ApiStatusIcon />);
        expect(getByTestId('api-status-icon-button')).toBeTruthy();
        expect(getByTestId('manual-sync-button')).toBeTruthy();
    });

    test('deve atualizar a cor quando o status mudar', () => {
        let capturedCallback: any;
        (apiService.onApiStatusChange as jest.Mock).mockImplementation((cb) => {
            capturedCallback = cb;
        });

        const { rerender } = render(<ApiStatusIcon />);
        
        act(() => {
            if (capturedCallback) capturedCallback(OFFLINE);
        });
    });

    test('deve disparar checkHealth e mostrar Toast ao clicar', async () => {
        (apiService.checkHealth as jest.Mock).mockResolvedValue(true);
        const { getByTestId } = render(<ApiStatusIcon />);
        
        const btn = getByTestId('api-status-icon-button');
        await act(async () => {
            fireEvent.press(btn);
        });

        expect(apiService.checkHealth).toHaveBeenCalled();
        expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
            type: 'success',
            text1: 'API Online'
        }));
    });

    test('deve mostrar Toast de erro se checkHealth retornar falso', async () => {
        (apiService.checkHealth as jest.Mock).mockResolvedValue(false);
        const { getByTestId } = render(<ApiStatusIcon />);
        
        const btn = getByTestId('api-status-icon-button');
        await act(async () => {
            fireEvent.press(btn);
        });

        expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
            type: 'error',
            text1: 'API Offline'
        }));
    });

    test('deve disparar manualSync ao clicar no botão de sincronização manual', async () => {
        const { threadsJobService } = require('src/services/ThreadsJobService');
        const { getByTestId } = render(<ApiStatusIcon />);

        const syncBtn = getByTestId('manual-sync-button');
        await act(async () => {
            fireEvent.press(syncBtn);
        });

        expect(threadsJobService.manualSync).toHaveBeenCalled();
        expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
            type: 'success',
            text1: 'Sincronização Concluída',
        }));
    });
});

