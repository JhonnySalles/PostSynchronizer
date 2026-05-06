import React from 'react';
import { render } from '@testing-library/react-native';
import StatisticsSummary from 'src/components/Statistics/StatisticsSummary';

// Mock do ThemeProvider
jest.mock('src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      text: '#000',
      card: '#FFF',
      border: '#CCC',
      textSecondary: '#666',
      unknow: '#999',
      tumblr: '#36465D',
      x: '#000',
      bluesky: '#0085FF'
    }
  }),
}));

describe('StatisticsSummary Component', () => {
  const mockPlatformCounts = [
    { platform: 'tumblr', count: 10 },
    { platform: 'x', count: 5 },
    { platform: 'unknow', count: 2 },
  ];

  const mockPeriodStats = {
    weekly: 3,
    monthly: 12,
    yearly: 45,
  };

  test('deve renderizar contadores de plataforma corretamente', () => {
    const { getByText } = render(
      <StatisticsSummary 
        platformCounts={mockPlatformCounts} 
        periodStats={mockPeriodStats} 
      />
    );

    expect(getByText('10')).toBeTruthy(); // Tumblr
    expect(getByText('5')).toBeTruthy();  // X
    expect(getByText('Desconhecido')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();  // Unknow
  });

  test('deve renderizar estatísticas de período corretamente', () => {
    const { getByText } = render(
      <StatisticsSummary 
        platformCounts={mockPlatformCounts} 
        periodStats={mockPeriodStats} 
      />
    );

    expect(getByText('Semana')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    
    expect(getByText('Mês')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    
    expect(getByText('Ano')).toBeTruthy();
    expect(getByText('45')).toBeTruthy();
  });

  test('não deve mostrar card de Desconhecido se o contador for zero', () => {
    const { queryByText } = render(
      <StatisticsSummary 
        platformCounts={[{ platform: 'tumblr', count: 5 }]} 
        periodStats={mockPeriodStats} 
      />
    );

    expect(queryByText('Desconhecido')).toBeNull();
  });
});
