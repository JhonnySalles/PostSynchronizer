import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  THREADS_CLIENT_ID,
  THREADS_CLIENT_SECRET,
  RENDER_SERVICE_ID,
  RENDER_TOKEN,
  RENDER_ENVIROMENT,
} from '@env';
import {
  THREADS_TOKEN_EXPIRY_KEY,
  THREADS_ACCESS_TOKEN_KEY,
  THREADS_TOKEN_WARNING_DAYS,
} from '../constants/app';
import Logger from './LoggerService';

export interface ExpiryInfo {
  isExpiringSoon: boolean;
  daysRemaining: number;
  expiryDate: string | null;
}

class ThreadsAuthService {
  private renderApiUrl = 'https://api.render.com/v1';

  /**
   * Retorna a URL de Autorização do Threads
   */
  getAuthorizationUrl(): string {
    const redirectUri = 'https://127.0.0.1:3000/callback';
    const scope = 'threads_basic,threads_content_publish';
    return `https://api.instagram.com/oauth/authorize?client_id=${THREADS_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scope}&response_type=code`;
  }

  /**
   * Troca authorization code por short-lived access token
   */
  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; userId: string }> {
    const redirectUri = 'https://127.0.0.1:3000/callback';
    Logger.info('[ThreadsAuthService] Trocando code por short-lived token...');
    
    const params = new URLSearchParams();
    params.append('client_id', THREADS_CLIENT_ID);
    params.append('client_secret', THREADS_CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirectUri);
    params.append('code', code);

    const response = await axios.post('https://api.instagram.com/oauth/access_token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.data.access_token) {
      throw new Error('Falha ao obter short-lived access token do Threads.');
    }

    return {
      accessToken: response.data.access_token,
      userId: response.data.user_id,
    };
  }

  /**
   * Troca short-lived token por long-lived token (válido por 60 dias)
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
    Logger.info('[ThreadsAuthService] Obtendo token de longa duração (60 dias)...');
    const url = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${THREADS_CLIENT_SECRET}&access_token=${shortLivedToken}`;
    
    const response = await axios.get(url);
    if (!response.data.access_token) {
      throw new Error('Falha ao obter long-lived token do Threads.');
    }

    return response.data.access_token;
  }

  /**
   * Salva o token de longa duração e a data de validade (daqui a 60 dias)
   */
  async saveToken(token: string): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 60); // 60 dias de validade
    
    await AsyncStorage.setItem(THREADS_ACCESS_TOKEN_KEY, token);
    await AsyncStorage.setItem(THREADS_TOKEN_EXPIRY_KEY, expiryDate.toISOString());
    Logger.info('[ThreadsAuthService] Token e expiração salvos localmente.');
  }

  /**
   * Verifica se o token está próximo de expirar ou expirou
   */
  async checkTokenExpiry(): Promise<ExpiryInfo> {
    try {
      const expiryStr = await AsyncStorage.getItem(THREADS_TOKEN_EXPIRY_KEY);
      if (!expiryStr) {
        return { isExpiringSoon: false, daysRemaining: 60, expiryDate: null };
      }

      const expiryDate = new Date(expiryStr);
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        isExpiringSoon: daysRemaining <= THREADS_TOKEN_WARNING_DAYS,
        daysRemaining: daysRemaining < 0 ? 0 : daysRemaining,
        expiryDate: expiryStr,
      };
    } catch (error) {
      Logger.error(error as Error, { message: '[ThreadsAuthService] Erro ao checar expiração do token' });
      return { isExpiringSoon: false, daysRemaining: 0, expiryDate: null };
    }
  }

  /**
   * Atualiza a variável de ambiente no Render
   */
  async updateRenderEnvVar(newToken: string): Promise<void> {
    Logger.info('[ThreadsAuthService] Buscando variáveis de ambiente atuais do Render...');
    const authHeader = {
      headers: {
        Authorization: `Bearer ${RENDER_TOKEN}`,
        Accept: 'application/json',
      },
    };

    // 1. GET para pegar a lista atual de env vars
    const getUrl = `${this.renderApiUrl}/services/${RENDER_SERVICE_ID}/env-vars`;
    const responseGet = await axios.get(getUrl, authHeader);
    
    const currentVars: Array<{ key: string; value: string }> = responseGet.data;
    
    // 2. Modifica a variável de ambiente alvo (THREADS_ACCESS_TOKEN) ou adiciona se não existir
    let found = false;
    const updatedVars = currentVars.map(v => {
      if (v.key === 'THREADS_ACCESS_TOKEN') {
        found = true;
        return { key: v.key, value: newToken };
      }
      return v;
    });

    if (!found) {
      updatedVars.push({ key: 'THREADS_ACCESS_TOKEN', value: newToken });
    }

    Logger.info('[ThreadsAuthService] Enviando variáveis atualizadas para o Render...');
    // 3. PUT para salvar a nova lista completa
    await axios.put(getUrl, updatedVars, authHeader);
    Logger.info('[ThreadsAuthService] Variáveis atualizadas com sucesso no Render.');
  }

  /**
   * Solicita rebuild/redeploy do serviço no Render
   */
  async triggerRenderDeploy(): Promise<void> {
    Logger.info('[ThreadsAuthService] Solicitando novo deploy para rebuild da API no Render...');
    const deployUrl = `${this.renderApiUrl}/services/${RENDER_SERVICE_ID}/deploys`;
    
    await axios.post(deployUrl, {}, {
      headers: {
        Authorization: `Bearer ${RENDER_TOKEN}`,
        Accept: 'application/json',
      },
    });
    Logger.info('[ThreadsAuthService] Deploy iniciado com sucesso.');
  }

  /**
   * Tenta renovar o token existente.
   * Se funcionar, atualiza o Render e retorna true. Caso contrário, retorna false.
   */
  async tryTokenRefreshFlow(): Promise<boolean> {
    try {
      const currentToken = await AsyncStorage.getItem(THREADS_ACCESS_TOKEN_KEY);
      if (!currentToken) {
        Logger.info('[ThreadsAuthService] Nenhum token existente para renovar.');
        return false;
      }

      Logger.info('[ThreadsAuthService] Tentando renovar token do Threads existente...');
      const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${currentToken}`;
      
      const response = await axios.get(url);
      const newToken = response.data.access_token;
      
      if (newToken) {
        Logger.info('[ThreadsAuthService] Token renovado com sucesso via API Refresh!');
        await this.saveToken(newToken);
        await this.updateRenderEnvVar(newToken);
        await this.triggerRenderDeploy();
        return true;
      }
      
      return false;
    } catch (error) {
      Logger.warn('[ThreadsAuthService] Falha ao renovar o token existente:', error);
      return false;
    }
  }

  /**
   * Executa todo o fluxo de atualização do Threads no Render
   */
  async handleFullLoginFlow(code: string): Promise<void> {
    // 1. Troca code por short-lived token
    const { accessToken: shortToken } = await this.exchangeCodeForToken(code);
    
    // 2. Converte para long-lived token (60 dias)
    const longToken = await this.exchangeForLongLivedToken(shortToken);
    
    // 3. Salva localmente
    await this.saveToken(longToken);
    
    // 4. Atualiza no Render
    await this.updateRenderEnvVar(longToken);
    
    // 5. Build/Deploy no Render
    await this.triggerRenderDeploy();
  }
}

export const threadsAuthService = new ThreadsAuthService();
