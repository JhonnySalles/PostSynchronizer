import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { ProgressProvider, useProgress } from 'src/contexts/ProgressContext';

describe('ProgressContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProgressProvider>{children}</ProgressProvider>
  );

  test('deve iniciar com valores padrão', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    expect(result.current.progress).toBe(0);
    expect(result.current.isPosting).toBe(false);
    expect(result.current.message).toBe('');
  });

  test('deve configurar estado inicial ao chamar startPosting', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    act(() => {
      result.current.startPosting(10);
    });

    expect(result.current.isPosting).toBe(true);
    expect(result.current.message).toBe('Iniciando postagem...');
    expect(result.current.progress).toBe(0);
  });

  test('deve atualizar o progresso proporcionalmente', async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    // Dividimos em dois atos para garantir que o totalSteps seja processado no primeiro render
    act(() => {
      result.current.startPosting(10);
    });
    
    act(() => {
      result.current.updateProgress(5);
    });

    expect(result.current.progress).toBe(0.5);
    expect(result.current.message).toBe('Postando na plataforma 5 de 10...');
  });

  test('deve finalizar postagem corretamente', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useProgress(), { wrapper });

    act(() => {
      result.current.startPosting(10);
      result.current.updateProgress(10);
    });
    
    act(() => {
      result.current.finishPosting();
    });

    expect(result.current.progress).toBe(1);
    expect(result.current.isPosting).toBe(false);

    // Avançar o tempo (timeout de 5s no código real)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.progress).toBe(0);
    jest.useRealTimers();
  });

  test('deve configurar mensagem de erro ao chamar failPosting', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    act(() => {
      result.current.failPosting('Conexão perdida');
    });

    expect(result.current.isPosting).toBe(false);
    expect(result.current.message).toBe('Erro: Conexão perdida');
  });

  test('deve lançar erro se useProgress for usado fora do ProgressProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => renderHook(() => useProgress())).toThrow(
      'useProgress must be used within a ProgressProvider'
    );

    consoleSpy.mockRestore();
  });
});
