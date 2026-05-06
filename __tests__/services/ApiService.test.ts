import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from 'src/services/ApiService';
import AuthTokenDao from 'src/dao/AuthTokenDao';
import { CONNECTING, OFFLINE, ONLINE } from 'src/constants/app';

// Mock do axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    post: jest.fn(),
    get: jest.fn(),
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    default: mockAxiosInstance,
  };
});

// Mock do socket.io-client
jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    id: 'mock-socket-id',
    connected: false,
  };
  return { io: jest.fn(() => mSocket) };
});

const mockAxios = axios.create() as any;
const mockSocket = (require('socket.io-client').io)() as any;

describe('ApiService.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Injetamos o mock do axios no serviço
    (apiService as any).axiosInstance = mockAxios;
    (apiService as any).socket = mockSocket;
    
    // Mock default implementation for AsyncStorage.getItem
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'api_jwt_token') return Promise.resolve('mock_token');
      if (key === 'api_jwt_expires_at') return Promise.resolve(new Date(Date.now() + 3600000).toISOString());
      return Promise.resolve(null);
    });
  });

  describe('Login e Autenticação', () => {
    test('deve realizar login com sucesso e salvar token', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { token: 'mock_jwt_token', expiration: '2025-10-18T18:00:00Z' }
      });

      const success = await apiService.login();

      expect(success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('api_jwt_token', 'mock_jwt_token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('api_jwt_expires_at', '2025-10-18T18:00:00Z');
    });

    test('deve retornar false se o login falhar', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Unauthorized'));
      const success = await apiService.login();
      expect(success).toBe(false);
    });

    test('deve retornar false se token ou expiração estiverem ausentes na resposta', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { token: 'only_token' } });
      const success = await apiService.login();
      expect(success).toBe(false);
    });
  });

  describe('refreshTokens', () => {
    test('deve retornar token existente se ainda for válido', async () => {
      const token = await apiService.refreshTokens();
      expect(token).toBe('mock_token');
      expect(mockAxios.post).not.toHaveBeenCalledWith('/auth/token/refresh', expect.anything(), expect.anything());
    });

    test('deve renovar token se estiver expirado', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'api_jwt_token') return Promise.resolve('old_token');
        if (key === 'api_jwt_expires_at') return Promise.resolve(new Date(Date.now() - 1000).toISOString());
        return Promise.resolve(null);
      });

      mockAxios.post.mockResolvedValueOnce({
        data: { token: 'new_token', expiration: '2025-10-18T19:00:00Z' }
      });

      const token = await apiService.refreshTokens();

      expect(token).toBe('new_token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('api_jwt_token', 'new_token');
    });

    test('deve chamar login se não houver token ou expiração salvos', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const loginSpy = jest.spyOn(apiService, 'login').mockResolvedValue(true);
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'api_jwt_token') return Promise.resolve('fresh_token');
        return Promise.resolve(null);
      });

      const token = await apiService.refreshTokens();

      expect(loginSpy).toHaveBeenCalled();
      expect(token).toBe('fresh_token');
      loginSpy.mockRestore();
    });

    test('deve limpar storage em caso de erro na renovação', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'api_jwt_token') return Promise.resolve('old_token');
        if (key === 'api_jwt_expires_at') return Promise.resolve(new Date(Date.now() - 1000).toISOString());
        return Promise.resolve(null);
      });

      mockAxios.post.mockRejectedValueOnce(new Error('Refresh failed'));

      const token = await apiService.refreshTokens();

      expect(token).toBe('');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('api_jwt_token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('api_jwt_expires_at');
    });
  });

  describe('Postagem (postAll)', () => {
    const payload = {
      postId: 1,
      platforms: ['x'],
      text: 'Hello World',
      images: []
    };

    test('deve enviar post sem WebSocket quando forceNoWebSocket for true', async () => {
      mockAxios.post.mockResolvedValueOnce({ status: 202 });

      const result = await apiService.postAll(payload, jest.fn(), { forceNoWebSocket: true });

      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith('/publish-all/post', expect.any(Object));
    });

    test('deve retentar postagem se receber 401 (Unauthorized)', async () => {
      mockAxios.post
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce({ status: 202 });

      const loginSpy = jest.spyOn(apiService, 'login').mockResolvedValue(true);

      const result = await apiService.postAll(payload, jest.fn(), { forceNoWebSocket: true });

      expect(loginSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      loginSpy.mockRestore();
    });

    test('deve retornar erro se status da resposta não for 202', async () => {
      mockAxios.post.mockResolvedValueOnce({ status: 500 });

      const result = await apiService.postAll(payload, jest.fn(), { forceNoWebSocket: true });

      expect(result.success).toBe(false);
      expect(result.message).toContain('500');
    });

    test('deve falhar se não conseguir conectar ao WebSocket', async () => {
      mockSocket.connected = false;
      mockSocket.once.mockImplementation((event, cb) => {
        if (event === 'connect_error') cb(new Error('Connection failed'));
      });

      const result = await apiService.postAll(payload, jest.fn());

      expect(result.success).toBe(false);
      expect(result.isWebSocket).toBe(true);
    });
  });

  describe('Postagem Individual (postSingle)', () => {
    const singlePayload = {
      text: 'Single post',
      images: [],
      blogName: null
    };

    test('deve postar com sucesso (status 200)', async () => {
      mockAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

      const result = await apiService.postSingle('x', singlePayload);

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(false);
    });

    test('deve detectar agendamento (status 201)', async () => {
      mockAxios.post.mockResolvedValueOnce({ status: 201, data: { publishTime: '2025-10-18T18:00:00Z' } });

      const result = await apiService.postSingle('tumblr', singlePayload);

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(true);
      expect(result.message).toContain('Agendado');
    });

    test('deve retentar postagem individual em 401', async () => {
      mockAxios.post
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce({ status: 200, data: {} });

      const loginSpy = jest.spyOn(apiService, 'login').mockResolvedValue(true);

      const result = await apiService.postSingle('x', singlePayload);

      expect(loginSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      loginSpy.mockRestore();
    });
  });

  describe('Integração com Tumblr', () => {
    test('deve buscar e mapear blogs do Tumblr', async () => {
      const mockBlogs = { blogs: [{ name: 'blog1', title: 'Title1' }] };
      mockAxios.get.mockResolvedValueOnce({ data: mockBlogs });

      const mockSetCredentials = jest.spyOn(AuthTokenDao, 'saveCredentials').mockResolvedValue(undefined as any);
      const mockGetCredentials = jest.spyOn(AuthTokenDao, 'getCredentialsForPlatform').mockResolvedValue({
        platform: 'tumblr',
        blogName: 'blog1',
        blogs: []
      } as any);

      const blogs = await apiService.getTumblrBlogs();

      expect(blogs).toHaveLength(1);
      expect(blogs[0].name).toBe('blog1');
      expect(blogs[0].selected).toBe(true);
      
      mockSetCredentials.mockRestore();
      mockGetCredentials.mockRestore();
    });

    test('deve retornar [] se API retornar lista vazia', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { blogs: [] } });
      const blogs = await apiService.getTumblrBlogs();
      expect(blogs).toHaveLength(0);
    });

    test('deve retornar [] em caso de erro na API', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));
      const blogs = await apiService.getTumblrBlogs();
      expect(blogs).toHaveLength(0);
    });
  });

  describe('Health Check e Status', () => {
    test('deve retornar status atual', () => {
      expect(apiService.getApiStatus()).toBeDefined();
    });

    test('deve notificar listeners sobre mudança de status', () => {
      const callback = jest.fn();
      apiService.onApiStatusChange(callback);
      
      (apiService as any).setApiStatus(ONLINE);
      
      expect(callback).toHaveBeenCalledWith(ONLINE);
      apiService.offApiStatusChange(callback);
    });

    test('checkHealth deve retornar true se API responder com sucesso', async () => {
      mockAxios.get.mockResolvedValueOnce({ status: 200 });
      const online = await apiService.checkHealth();
      expect(online).toBe(true);
      expect(apiService.getApiStatus()).toBe(ONLINE);
    });

    test('checkHealth deve retornar false se API falhar', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Down'));
      const online = await apiService.checkHealth();
      expect(online).toBe(false);
      expect(apiService.getApiStatus()).toBe(OFFLINE);
    });

    test('startHealthCheckLoop deve iniciar ciclo de ping', () => {
      jest.useFakeTimers();
      const spyPing = jest.spyOn(mockAxios, 'get');
      
      apiService.startHealthCheckLoop();
      
      expect(apiService.getApiStatus()).toBe(CONNECTING);
      
      jest.advanceTimersByTime(1000);
      expect(spyPing).toHaveBeenCalled();
      
      apiService.stopHealthCheckLoop();
      jest.useRealTimers();
    });
  });
});

