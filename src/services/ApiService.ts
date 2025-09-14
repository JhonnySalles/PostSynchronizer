import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from 'src/services/LoggerService';
import RNFS from 'react-native-fs';
import { API_BASE_URL, API_USERNAME, API_PASSWORD, API_FIXED_ACCESS_TOKEN } from '@env';
import AuthTokenDao, { Credentials, TumblrCredentials } from 'src/dao/AuthTokenDao';

const JWT_TOKEN_KEY = 'api_jwt_token';
const JWT_EXPIRES_AT_KEY = 'api_jwt_expires_at';

export interface PostPayload {
    platforms: string[];
    text: string;
    images: string[];
    tags?: string[];
    platformOptions?: {
        tumblr?: {
            blogName: string;
        };
    };
}

class ApiService {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: API_BASE_URL,
            headers: { 'Content-Type': 'application/json' },
        });

        this.axiosInstance.interceptors.request.use(async (config) => {
            const token = await AsyncStorage.getItem(JWT_TOKEN_KEY);
            if (token)
                config.headers.Authorization = `Bearer ${token}`;
            return config;
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
                accessToken: API_FIXED_ACCESS_TOKEN,
            });

            const { token, expiresAt } = response.data;
            if (token && expiresAt) {
                await AsyncStorage.setItem(JWT_TOKEN_KEY, token);
                await AsyncStorage.setItem(JWT_EXPIRES_AT_KEY, expiresAt);
                Logger.info('[ApiService] Autenticação bem-sucedida.');
                return true;
            }
            return false;
        } catch (error) {
            Logger.error(error as Error, { message: '[ApiService] Falha na autenticação' });
            return false;
        }
    }

    /**
     * Renova o token JWT se estiver expirado. Deve ser chamado uma vez ao dia.
     */
    async refreshTokenIfNeeded(): Promise<void> {
        try {
            const expiresAt = await AsyncStorage.getItem(JWT_EXPIRES_AT_KEY);
            if (!expiresAt || Date.now() < new Date(expiresAt).getTime()) {
                Logger.info('[ApiService] Token JWT ainda é válido.');
                return;
            }

            Logger.info('[ApiService] Token JWT expirado. Renovando...');
            const oldToken = await AsyncStorage.getItem(JWT_TOKEN_KEY);
            const response = await this.axiosInstance.post('/auth/token/refresh', 
                { accessToken: API_FIXED_ACCESS_TOKEN },
                { headers: { Authorization: `Bearer ${oldToken}` } }
            );

            const { token, expiresAt: newExpiresAt } = response.data;
            if (token && newExpiresAt) {
                await AsyncStorage.setItem(JWT_TOKEN_KEY, token);
                await AsyncStorage.setItem(JWT_EXPIRES_AT_KEY, newExpiresAt);
                Logger.info('[ApiService] Token JWT renovado com sucesso.');
            }
        } catch (error) {
            Logger.error(error as Error, { message: '[ApiService] Falha ao renovar token. Um novo login será necessário.' });
            await AsyncStorage.removeItem(JWT_TOKEN_KEY);
            await AsyncStorage.removeItem(JWT_EXPIRES_AT_KEY);
        }
    }

    async post(payload: PostPayload): Promise<{ success: boolean; message?: string }> {
        try {
            Logger.info(`[ApiService] Enviando post para as plataformas: ${payload.platforms.join(', ')}`);
            
            const imagesAsDataUrls = await Promise.all(
                payload.images.map(async (imagePath) => {
                    const base64Data = await RNFS.readFile(imagePath, 'base64');
                    const imageType = imagePath.endsWith('.png') ? 'png' : 'jpeg';
                    return `data:image/${imageType};base64,${base64Data}`;
                })
            );

            const backendPayload = {
                platforms: payload.platforms,
                text: payload.text,
                images: imagesAsDataUrls,
                tags: payload.tags,
                platformOptions: payload.platformOptions,
            };

            const response = await this.axiosInstance.post('/post/publish-all', backendPayload);

            if (response.status === 202) {
                Logger.info('[ApiService] Requisição de postagem aceita pelo backend.');
                return { success: true };
            } else {
                Logger.warn('[ApiService] Backend retornou um status inesperado:', response.status);
                return { success: false, message: `Status inesperado: ${response.status}` };
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message;
            Logger.error(error, { message: `[ApiService] Falha ao enviar postagem: ${errorMsg}` });
            return { success: false, message: errorMsg };
        }
    }

    async getTumblrBlogs(credentials: TumblrCredentials): Promise<string[]> {
        try {
            const response = await this.axiosInstance.get('/tumblr/blogs');
            const blogs = response.data.blogs || [];
            //const blogName = (credentials as TumblrCredentials).blogName;
            //const data = blogs.map<TumblrBlogs>((blog: { name: any; title: any; }) => ({ name: blog.name, title: blog.title, selected: blog.name === blogName }));
            //(credentials as TumblrCredentials).blogs = data;
            //(credentials as TumblrCredentials).blogName = data.find(b => b.selected)?.name || ''
            await AuthTokenDao.saveCredentials(credentials);
            return blogs;
        } catch (error) {
            Logger.error(error as Error, { message: '[ApiService] Falha ao buscar blogs do Tumblr.' });
            return [];
        }
    }
}

export const apiService = new ApiService();