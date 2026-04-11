import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from 'src/services/ApiService';
import AuthTokenDao from 'src/dao/AuthTokenDao';

// Mock do axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    post: jest.fn(),
    get: jest.fn(),
  })),
}));

const mockAxios = axios.create() as any;

describe('ApiService.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Injetamos o mock do axios no serviço
    (apiService as any).axiosInstance = mockAxios;
  });

  describe('Login e Autenticação', () => {
    test('deve realizar login com sucesso e salvar token', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { token: 'mock_jwt_token', expiration: '2025-10-18T18:00:00Z' }
      });

      const success = await apiService.login();

      expect(success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('api_jwt_token', 'mock_jwt_token');
    });

    test('deve retornar false se o login falhar', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Unauthorized'));
      const success = await apiService.login();
      expect(success).toBe(false);
    });
  });

  describe('Postagem (postAll)', () => {
    test('deve enviar post sem WebSocket quando forceNoWebSocket for true', async () => {
      mockAxios.post.mockResolvedValueOnce({ status: 202 });

      const payload = {
        postId: 1,
        platforms: ['x'],
        text: 'Hello World',
        images: []
      };

      const result = await apiService.postAll(payload, jest.fn(), { forceNoWebSocket: true });

      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalled();
    });
  });

  describe('Integração com Tumblr', () => {
    test('deve buscar e mapear blogs do Tumblr', async () => {
      const mockBlogs = { blogs: [{ name: 'blog1', title: 'Title1' }] };
      mockAxios.get.mockResolvedValueOnce({ data: mockBlogs });

      const mockSetCredentials = jest.spyOn(AuthTokenDao, 'saveCredentials').mockResolvedValue(undefined as any);
      const mockGetCredentials = jest.spyOn(AuthTokenDao, 'getCredentialsForPlatform').mockResolvedValue({
        platform: 'tumblr',
        blogName: 'old-blog',
        blogs: []
      } as any);

      const blogs = await apiService.getTumblrBlogs();

      expect(blogs).toHaveLength(1);
      expect(blogs[0].name).toBe('blog1');
      
      mockSetCredentials.mockRestore();
      mockGetCredentials.mockRestore();
    });
  });
});
