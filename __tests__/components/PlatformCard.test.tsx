import 'react-native';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import PlatformCard from 'src/components/PlatformCard';
import { TUMBLR } from 'src/constants/platforms';

// Mock Theme
jest.mock('src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: { 
        primary: '#007bff',
        primaryAccent: '#0056b3',
        primaryOuther: '#e9ecef',
        primaryOutherAccent: '#dee2e6',
        inactive: '#adb5bd'
    },
    isDark: false,
  }),
}));

// Mock components
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('src/components/Button', () => 'Button');
// Mock DropDownPicker - simplificado para evitar erros internos de biblioteca
jest.mock('react-native-dropdown-picker', () => 'DropDownPicker');

describe('PlatformCard Component', () => {
  const mockCredential = {
    platform: 'Twitter',
    active: true,
  } as any;

  test('deve renderizar o nome da plataforma e o ícone', () => {
    const testRenderer = renderer.create(
      <PlatformCard 
        credential={mockCredential} 
        iconName="logo-twitter" 
        iconColor="#1DA1F2" 
      />
    );
    const testInstance = testRenderer.root;
    
    expect(testInstance.findByType('Icon').props.name).toBe('logo-twitter');
    expect(testInstance.findAllByType('Text').some(t => t.props.children === 'Twitter')).toBe(true);
  });

  test('deve chamar onStatusChange ao alternar o Switch', () => {
    const onStatusChangeMock = jest.fn();
    const testRenderer = renderer.create(
      <PlatformCard 
        credential={mockCredential} 
        iconName="logo-twitter" 
        iconColor="#1DA1F2" 
        onStatusChange={onStatusChangeMock}
      />
    );
    
    const sw = testRenderer.root.findByProps({ value: true });
    act(() => {
        sw.props.onValueChange(false);
    });
    
    expect(onStatusChangeMock).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });

  describe('Tumblr Specifics', () => {
    const tumblrCredential = {
      platform: TUMBLR,
      active: true,
      blogName: 'myblog',
      blogs: [{ name: 'myblog', title: 'My Blog', selected: true }]
    } as any;

    test('deve renderizar DropDownPicker e Botão de consulta apenas para Tumblr', () => {
      const testRenderer = renderer.create(
        <PlatformCard 
          credential={tumblrCredential} 
          iconName="logo-tumblr" 
          iconColor="#36465d" 
        />
      );
      const testInstance = testRenderer.root;
      
      expect(testInstance.findAllByType('DropDownPicker')).toHaveLength(1);
      expect(testInstance.findAllByType('Button')).toHaveLength(1);
    });

    test('não deve renderizar extras se não for Tumblr', () => {
        const testRenderer = renderer.create(
          <PlatformCard 
            credential={mockCredential} 
            iconName="logo-twitter" 
            iconColor="#1DA1F2" 
          />
        );
        const testInstance = testRenderer.root;
        
        expect(testInstance.findAllByType('DropDownPicker')).toHaveLength(0);
        expect(testInstance.findAllByType('Button')).toHaveLength(0);
      });

    test('deve chamar onConsult ao clicar no botão de consulta', () => {
      const onConsultMock = jest.fn();
      const testRenderer = renderer.create(
        <PlatformCard 
          credential={tumblrCredential} 
          iconName="logo-tumblr" 
          iconColor="#36465d" 
          onConsult={onConsultMock}
        />
      );
      
      const btn = testRenderer.root.findByType('Button');
      act(() => {
          btn.props.onPress();
      });
      
      expect(onConsultMock).toHaveBeenCalledWith(tumblrCredential);
    });

    test('deve exibir loading no botão de consulta se isConsulting for true', () => {
        const testRenderer = renderer.create(
          <PlatformCard 
            credential={tumblrCredential} 
            iconName="logo-tumblr" 
            iconColor="#36465d" 
            isConsulting={true}
          />
        );
        const testInstance = testRenderer.root;
        
        const btn = testInstance.findByType('Button');
        expect(btn.props.isLoading).toBe(true);
        // Header ActivityIndicator
        expect(testInstance.findByType('ActivityIndicator')).toBeTruthy();
      });
  });
});
