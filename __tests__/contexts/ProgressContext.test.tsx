import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { ProgressProvider, useProgress } from 'src/contexts/ProgressContext';

describe('ProgressContext', () => {
  test('deve iniciar com valores padrão', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ProgressProvider,
    });

    expect(result.current.progress).toBe(0);
    expect(result.current.isPosting).toBe(false);
    expect(result.current.message).toBe('');
  });

  test('deve configurar estado inicial ao chamar startPosting', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ProgressProvider,
    });

    act(() => {
      result.current.startPosting(5);
    });

    expect(result.current.isPosting).toBe(true);
    expect(result.current.progress).toBe(0);
    expect(result.current.message).toBe('Iniciando postagem...');
  });

  test('deve atualizar o progresso proporcionalmente', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ProgressProvider,
    });

    // Primeiro define o total de passos
    act(() => {
      result.current.startPosting(4);
    });

    // Depois atualiza (em outro act para o estado de totalSteps ter atualizado)
    act(() => {
      result.current.updateProgress(1);
    });

    expect(result.current.progress).toBe(0.25);
    expect(result.current.message).toContain('1 de 4');

    act(() => {
      result.current.updateProgress(2);
    });

    expect(result.current.progress).toBe(0.5);
  });

  test('deve finalizar postagem corretamente', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useProgress(), {
      wrapper: ProgressProvider,
    });

    act(() => {
      result.current.startPosting(2);
    });
    
    act(() => {
      result.current.finishPosting();
    });

    expect(result.current.progress).toBe(1);
    expect(result.current.isPosting).toBe(false);

    // Verifica o reset do progresso após o timeout
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.progress).toBe(0);
    
    jest.useRealTimers();
  });

  test('deve configurar mensagem de erro ao chamar failPosting', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ProgressProvider,
    });

    act(() => {
      result.current.failPosting('Conexão perdida');
    });

    expect(result.current.isPosting).toBe(false);
    expect(result.current.message).toBe('Erro: Conexão perdida');
  });

  test('deve lançar erro se useProgress for usado fora do ProgressProvider', () => {
    // Silencia o erro do console para este teste
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useProgress());
    }).toThrow('useProgress must be used within a ProgressProvider');

    consoleSpy.mockRestore();
  });
});
