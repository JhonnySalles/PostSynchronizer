import React from 'react';
import { render } from '@testing-library/react-native';
import LineChartComponent from 'src/components/Charts/LineChartComponent';

// Mock dependências complexas
jest.mock('src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: { primary: '#000', text: '#000', card: '#FFF', border: '#CCC', textSecondary: '#666' },
    isDark: false
  }),
}));

jest.mock('react-native-gifted-charts', () => ({
  LineChart: () => null,
}));

jest.mock('react-native-gesture-handler', () => {
    const View = require('react-native').View;
    return {
        Gesture: {
            Pinch: () => ({
                runOnJS: () => ({
                    onUpdate: () => ({
                        onEnd: () => ({})
                    })
                })
            })
        },
        GestureDetector: ({ children }: any) => children,
    };
});

describe('LineChartComponent', () => {
  test('deve renderizar mensagem de "sem dados" se a lista estiver vazia', () => {
    const { getByText } = render(<LineChartComponent data={[]} />);
    expect(getByText('Sem dados para o período selecionado')).toBeTruthy();
  });

  test('deve renderizar o gráfico se houver dados', () => {
    const data = [{ value: 10, label: 'Jan' }, { value: 20, label: 'Feb' }];
    const { queryByText } = render(<LineChartComponent data={data} />);
    
    expect(queryByText('Sem dados para o período selecionado')).toBeNull();
  });
});
