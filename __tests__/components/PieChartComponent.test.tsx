import React from 'react';
import { render } from '@testing-library/react-native';
import PieChartComponent from 'src/components/Charts/PieChartComponent';

// Mock dependências complexas
jest.mock('src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: { 
      primary: '#000', 
      text: '#000', 
      card: '#FFF', 
      border: '#CCC', 
      background: '#FFF',
      textSecondary: '#666',
      tumblr: '#36465D',
      x: '#000'
    },
  }),
}));

jest.mock('react-native-gifted-charts', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    PieChart: ({ centerLabelComponent }: any) => (
      <View testID="mock-pie-chart">
        {centerLabelComponent ? centerLabelComponent() : null}
      </View>
    ),
  };
});

describe('PieChartComponent', () => {
  const mockData = [
    { value: 6, color: '#36465D', label: 'Tumblr', platformName: 'tumblr' },
    { value: 4, color: '#000', label: 'X', platformName: 'x' },
  ];

  test('deve renderizar mensagem de "sem dados" se o total for zero', () => {
    const { getByText } = render(<PieChartComponent data={[]} />);
    expect(getByText('Sem postagens concluídas para exibir')).toBeTruthy();
  });

  test('deve renderizar o total e a legenda corretamente', () => {
    const { getByText } = render(<PieChartComponent data={mockData} />);
    
    // Total de 6 + 4 = 10 (Renderizado no centerLabelComponent)
    expect(getByText('10')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();

    // Legenda (Formatada com regex pois o React Native renderiza Text aninhado de forma fragmentada no teste)
    expect(getByText(/tumblr: 6 \(60%\)/i)).toBeTruthy();
    expect(getByText(/x: 4 \(40%\)/i)).toBeTruthy();
  });

  test('deve lidar com plataforma desconhecida na legenda', () => {
    const dataWithUnknown = [
        { value: 5, color: '#999', label: '?', platformName: 'unknow' }
    ];
    const { getByText } = render(<PieChartComponent data={dataWithUnknown} />);
    
    expect(getByText(/Desconhecido: 5 \(100%\)/i)).toBeTruthy();
  });
});
