import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from 'src/theme/ThemeProvider';
import { SYSTEM } from 'src/constants/themes';

const ThemeTest = () => {
  const { themeMode } = useTheme();
  return <Text testID="theme-mode">{themeMode}</Text>;
};

describe('ThemeProvider', () => {
  test('deve renderizar e prover o contexto básico', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeTest />
      </ThemeProvider>
    );
    expect(getByTestId('theme-mode').children[0]).toBe(SYSTEM);
  });
});
