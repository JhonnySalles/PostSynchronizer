import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from 'src/services/LoggerService';
import RNFS from 'react-native-fs';
import { API_BASE_URL, API_USERNAME, API_PASSWORD, API_ACCESS_TOKEN } from '@env';
import AuthTokenDao, { TumblrBlogs, TumblrCredentials } from 'src/dao/AuthTokenDao';
import { io, Socket } from 'socket.io-client';
import EventEmitter from 'eventemitter3';
import { PlatformType } from 'src/constants/platforms';
import { firebaseService } from 'src/services/FirebaseService';

const JWT_TOKEN_KEY = 'api_jwt_token';
const JWT_EXPIRES_AT_KEY = 'api_jwt_expires_at';

export interface ImagePayload {
  base64?: string;
  path?: string;
  platforms?: string[];
}

export interface PostPayload {
  postId: number;
  platforms: string[];
  text: string;
  images: ImagePayload[];
  tags?: string[];
  platformOptions?: {
    tumblr?: {
      blogName: string;
    };
  };
}

export interface SinglePostPayload {
  platform: string;
  text: string;
  postId?: string;
  images: ImagePayload[];
  tags?: string[];
  blogName: string | null;
}

export interface ProgressUpdate {
  type: 'progress' | 'summary';
  platform?: string;
  status?: 'success' | 'error';
  progress?: number;
  error?: string | null;
  summary?: {
    successful: string[];
    failed: string[];
  };
}

export type ProgressCallback = (update: ProgressUpdate) => void;

class ApiService {
  private axiosInstance: AxiosInstance;
  private socket: Socket;
  private eventEmitter: EventEmitter;

  constructor() {
    Logger.info('[ApiService] Iniciando criação do service, endereço da api:', API_BASE_URL);

    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    this.axiosInstance.interceptors.request.use(async config => {
      const token = await AsyncStorage.getItem(JWT_TOKEN_KEY);
      const expiration = await AsyncStorage.getItem(JWT_EXPIRES_AT_KEY);
      // prettier-ignore
      if (expiration && Date.now() + 60000 < new Date(expiration).getTime())
        await this.refreshTokens();

      // prettier-ignore
      if (token) 
        config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.eventEmitter = new EventEmitter();

    this.socket = io(API_BASE_URL, {
      autoConnect: true,
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      Logger.info('[ApiService] Conectado ao servidor WebSocket com ID:', this.socket.id);
    });

    this.socket.on('progressUpdate', (data: ProgressUpdate) => {
      Logger.info('[ApiService] Progresso recebido via WebSocket:', data.toString());
      this.eventEmitter.emit('post_update', data);
    });

    this.socket.on('taskCompleted', (data: ProgressUpdate) => {
      Logger.info('[ApiService] Tarefa concluída recebida via WebSocket:', data.toString());
      this.eventEmitter.emit('post_update', { ...data, type: 'summary' });
    });

    this.socket.on('disconnect', () => {
      Logger.warn('[ApiService] Desconectado do servidor WebSocket.');
    });
  }

  /**
   * Realiza o login na API backend e salva o token JWT.
   */
  async login(): Promise<boolean> {
    try {
      Logger.info('[ApiService] Autenticando na API backend...');
      const response = await this.axiosInstance.post('/auth/login', {
        username: API_USERNAME,
        password: API_PASSWORD,
        accessToken: API_ACCESS_TOKEN,
      });

      const { token, expiration } = response.data;
      if (token && expiration) {
        await AsyncStorage.setItem(JWT_TOKEN_KEY, token);
        await AsyncStorage.setItem(JWT_EXPIRES_AT_KEY, expiration);
        Logger.info('[ApiService] Autenticação bem-sucedida.');
        return true;
      }
      Logger.error(new Error('[ApiService] Falha na autenticação: Token ou expiração ausente na resposta.'));
      return false;
    } catch (error) {
      Logger.error(error as Error, { message: '[ApiService] Falha na autenticação' });
      return false;
    }
  }

  /**
   * Renova o token JWT se estiver expirado. Deve ser chamado uma vez ao dia.
   */
  async refreshTokens(): Promise<string> {
    try {
      const expiration = await AsyncStorage.getItem(JWT_EXPIRES_AT_KEY);
      const oldToken = await AsyncStorage.getItem(JWT_TOKEN_KEY);

      if (!expiration || !oldToken) {
        Logger.warn('[ApiService] Nenhum token encontrado. Realizando login...');
        this.login();
        return (await AsyncStorage.getItem(JWT_TOKEN_KEY)) || '';
      }

      if (expiration && Date.now() + 60000 < new Date(expiration).getTime()) {
        Logger.info('[ApiService] Token JWT ainda é válido.');
        return oldToken || '';
      }

      Logger.info('[ApiService] Token JWT expirado. Renovando...');
      const response = await this.axiosInstance.post(
        '/auth/token/refresh',
        { accessToken: API_ACCESS_TOKEN },
        { headers: { Authorization: `Bearer ${oldToken}` } },
      );

      const { token, expiration: newExpiration } = response.data;
      if (token && newExpiration) {
        await AsyncStorage.setItem(JWT_TOKEN_KEY, token);
        await AsyncStorage.setItem(JWT_EXPIRES_AT_KEY, newExpiration);
        Logger.info('[ApiService] Token JWT renovado com sucesso.');
        return token || '';
      }
    } catch (error) {
      Logger.error(error as Error, { message: '[ApiService] Falha ao renovar token. Um novo login será necessário.' });
      await AsyncStorage.removeItem(JWT_TOKEN_KEY);
      await AsyncStorage.removeItem(JWT_EXPIRES_AT_KEY);
    }

    return '';
  }

  private isConnected(timeout = 3000): Promise<boolean> {
    // prettier-ignore
    if (this.socket.connected) 
        return Promise.resolve(true);

    return new Promise(resolve => {
      const timer = setTimeout(() => {
        Logger.warn('[ApiService] Timeout ao tentar conectar ao WebSocket.');
        this.socket.off('connect');
        this.socket.off('connect_error');
        resolve(false);
      }, timeout);

      this.socket.once('connect', () => {
        clearTimeout(timer);
        this.socket.off('connect_error');
        resolve(true);
      });

      this.socket.once('connect_error', err => {
        clearTimeout(timer);
        this.socket.off('connect');
        Logger.error(err, { message: '[ApiService] Erro de conexão com WebSocket.' });
        resolve(false);
      });

      this.socket.connect();
    });
  }

  private async prepareImagesAll(images: ImagePayload[]) {
    return Promise.all(
      images.map(async imageInfo => {
        const base64Data = await RNFS.readFile(imageInfo.path!, 'base64');
        const imageType = imageInfo.path!.endsWith('.png') ? 'png' : 'jpeg';
        const dataUrl = `data:image/${imageType};base64,${base64Data}`;
        return { base64: dataUrl, platforms: imageInfo.platforms };
      }),
    );
  }

  async postAll(
    payload: PostPayload,
    onProgress: ProgressCallback,
    options: { forceNoWebSocket?: boolean } = {},
    isFirst: boolean = true,
  ): Promise<{ success: boolean; message?: string; isWebSocket?: boolean }> {
    if (options.forceNoWebSocket) {
      try {
        Logger.warn('[ApiService] Forçando postagem sem WebSocket por solicitação do usuário.');
        const { ...backendPayload } = {
          ...payload,
          images: await this.prepareImagesAll(payload.images),
          instanceId: firebaseService.getAppInstanceId(),
          postId: payload.postId,
          socketId: undefined,
        };
        const response = await this.axiosInstance.post('/publish-all/post', backendPayload);
        // prettier-ignore
        if (response.status === 202) {
            Logger.info('[ApiService] Requisição de postagem aceita pelo backend.');
            return { success: true };
        } else
            return { success: false, message: `Status inesperado: ${response.status}` };
      } catch (error: Error | any) {
        if (error.response && error.response.status === 401 && isFirst) {
          // prettier-ignore
          if (await this.login()) 
            return this.postAll(payload, onProgress, options, false);
        }

        const errorMsg = error.response?.data?.message || error.message;
        Logger.error(error, { message: `[ApiService] Falha ao enviar postagem: ${errorMsg}` });
        return { success: false, message: errorMsg };
      }
    }

    const isConnected = await this.isConnected(3000);

    // prettier-ignore
    if (!isConnected) 
        return { success: false, message: 'Não foi possível conectar ao servidor de progresso.', isWebSocket: true };

    const progressListener = (update: ProgressUpdate) => {
      onProgress(update);
      // prettier-ignore
      if (update.type === 'summary') 
        this.eventEmitter.removeListener('post_update', progressListener);
    };
    this.eventEmitter.addListener('post_update', progressListener);

    try {
      Logger.info(`[ApiService] Enviando post para: ${payload.platforms.join(', ')}`);

      const backendPayload = {
        socketId: this.socket.id,
        platforms: payload.platforms,
        text: payload.text,
        images: await this.prepareImagesAll(payload.images),
        tags: payload.tags,
        platformOptions: payload.platformOptions,
        instanceId: firebaseService.getAppInstanceId(),
        postId: payload.postId,
      };

      const response = await this.axiosInstance.post('/publish-all/post', backendPayload);

      if (response.status === 202) {
        Logger.info('[ApiService] Requisição de postagem aceita pelo backend.');
        return { success: true };
      } else {
        this.eventEmitter.removeListener('post_update', progressListener);
        return { success: false, message: `Status inesperado: ${response.status}` };
      }
    } catch (error: any) {
      this.eventEmitter.removeListener('post_update', progressListener);

      if (error.response && error.response.status === 401 && isFirst) {
        // prettier-ignore
        if (await this.login()) 
          return this.postAll(payload, onProgress, options, false);
      }

      const errorMsg = error.response?.data?.message || error.message;
      Logger.error(error, { message: `[ApiService] Falha ao enviar postagem: ${errorMsg}` });
      return { success: false, message: errorMsg };
    }
  }

  private async prepareImagesSingle(images: ImagePayload[]) {
    return Promise.all(
      images.map(async imageInfo => {
        const base64Data = await RNFS.readFile(imageInfo.path!, 'base64');
        const imageType = imageInfo.path!.endsWith('.png') ? 'png' : 'jpeg';
        const dataUrl = `data:image/${imageType};base64,${base64Data}`;
        return dataUrl;
      }),
    );
  }

  async postSingle(
    platform: PlatformType,
    payload: Omit<SinglePostPayload, 'platforms'>,
    isFirst: boolean = true,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      Logger.info(`[ApiService] Enviando post individual para: ${platform}`);

      const backendPayload = {
        ...payload,
        images: await this.prepareImagesSingle(payload.images),
      };

      const endpoint = `/${platform}/post`;
      const response = await this.axiosInstance.post(endpoint, backendPayload);

      if (response.status === 200 || response.status === 201) {
        Logger.info(`[ApiService] Post individual para ${platform} bem-sucedido.`);
        return { success: true };
      } else {
        const errorMsg = `Status inesperado ao postar em ${platform}: ${response.status}`;
        Logger.warn(`[ApiService] ${errorMsg}`);
        return { success: false, message: errorMsg };
      }
    } catch (error: any) {
      if (error.response && error.response.status === 401 && isFirst) {
        // prettier-ignore
        if (await this.login()) 
          return this.postSingle(platform, payload, false);
      }

      const errorMsg = error.response?.data?.message || error.message;
      Logger.error(error, { message: `[ApiService] Falha ao enviar post individual para ${platform}: ${errorMsg}` });
      return { success: false, message: errorMsg };
    }
  }

  async getTumblrBlogs(): Promise<TumblrBlogs[]> {
    try {
      const response = await this.axiosInstance.get<{ blogs: { name: string; title: string }[] }>('/tumblr/blogs');
      const apiBlogs = response.data.blogs || [];

      // prettier-ignore
      if (apiBlogs.length === 0)
        return [];

      const credentials = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>('tumblr');
      const currentBlogName = credentials?.blogName;

      const processedBlogs: TumblrBlogs[] = apiBlogs.map(blog => ({
        name: blog.name,
        title: blog.title,
        selected: blog.name === currentBlogName,
      }));

      if (credentials) {
        credentials.blogs = processedBlogs;
        const selectedBlog = processedBlogs.find(b => b.selected);
        credentials.blogName = selectedBlog ? selectedBlog.name : processedBlogs[0].name;
        await AuthTokenDao.saveCredentials(credentials);
      }

      return processedBlogs;
    } catch (error) {
      Logger.error(error as Error, { message: '[ApiService] Falha ao buscar blogs do Tumblr.' });
      return [];
    }
  }
}

export const apiService = new ApiService();
