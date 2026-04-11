import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ApiStatusIcon } from 'src/components/ApiStatusIcon';
import { apiService } from 'src/services/ApiService';
import { ONLINE, OFFLINE } from 'src/constants/app';

// Mock do ApiService
jest.mock('src/services/ApiService', () => ({
    apiService: {
        getApiStatus: jest.fn(),
        onApiStatusChange: jest.fn(),
        offApiStatusChange: jest.fn(),
    }
}));

// Mock do Icon (Ionicons)
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('ApiStatusIcon Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (apiService.getApiStatus as jest.Mock).mockReturnValue(ONLINE);
    });

    test('deve inicializar com o status atual do apiService', () => {
        let testRenderer: any;
        act(() => {
            testRenderer = renderer.create(<ApiStatusIcon />);
        });
        const icon = testRenderer.root.findByType('Icon');
        expect(icon.props.color).toBe('#4ade80');
    });

    test('deve atualizar a cor quando o status mudar', () => {
        let capturedCallback: any;
        (apiService.onApiStatusChange as jest.Mock).mockImplementation((cb) => {
            capturedCallback = cb;
        });

        let testRenderer: any;
        act(() => {
            testRenderer = renderer.create(<ApiStatusIcon />);
        });
        
        act(() => {
            if (capturedCallback) capturedCallback(OFFLINE);
        });
        
        const icon = testRenderer.root.findByType('Icon');
        expect(icon.props.color).toBe('#f87171');
    });

    test('deve remover a inscrição ao desmontar', () => {
        let testRenderer: any;
        act(() => {
            testRenderer = renderer.create(<ApiStatusIcon />);
        });
        act(() => {
            testRenderer.unmount();
        });
        expect(apiService.offApiStatusChange).toHaveBeenCalled();
    });
});
