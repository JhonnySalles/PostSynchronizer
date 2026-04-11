import 'react-native';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Button from 'src/components/Button';

// Mock Theme
jest.mock('src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      destructive: '#dc3545',
      text: '#000',
      background: '#fff',
    },
    isDark: false,
  }),
}));

// Mock Ionicons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('Button Component', () => {
  test('deve renderizar o título corretamente', () => {
    const title = 'Clique Aqui';
    const testRenderer = renderer.create(<Button title={title} onPress={() => {}} />);
    const testInstance = testRenderer.root;
    
    expect(testInstance.findByType('Text').props.children).toBe(title);
  });

  test('deve chamar onPress quando clicado', () => {
    const onPressMock = jest.fn();
    const testRenderer = renderer.create(<Button title="OK" onPress={onPressMock} />);
    
    // Encontrar por prop onPress é mais seguro que por tipo TouchableOpacity em alguns mocks
    const touchable = testRenderer.root.findByProps({ onPress: onPressMock });
    
    act(() => {
        touchable.props.onPress();
    });
    
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  test('não deve chamar onPress se estiver desabilitado', () => {
    const onPressMock = jest.fn();
    const testRenderer = renderer.create(<Button title="OK" onPress={onPressMock} disabled={true} />);
    const touchable = testRenderer.root.findByProps({ onPress: onPressMock });
    
    expect(touchable.props.disabled).toBe(true);
  });

  test('deve mostrar LoadingIndicator quando isLoading for true', () => {
    const testRenderer = renderer.create(<Button title="OK" onPress={() => {}} isLoading={true} />);
    const testInstance = testRenderer.root;
    
    // Deve renderizar ActivityIndicator
    expect(testInstance.findByType('ActivityIndicator')).toBeTruthy();
    // No estado de loading, o texto não deve estar presente (segundo a lógica do componente)
    expect(testInstance.findAllByType('Text')).toHaveLength(0);
  });

  test('deve renderizar o ícone se for fornecido', () => {
    const testRenderer = renderer.create(<Button title="OK" onPress={() => {}} icon="add" />);
    const testInstance = testRenderer.root;
    
    const icon = testInstance.findByType('Icon');
    expect(icon.props.name).toBe('add');
  });
});
