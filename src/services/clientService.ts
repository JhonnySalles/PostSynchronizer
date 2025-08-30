import axios, { AxiosInstance } from 'axios';
import { X, TUMBLR, THREADS, PlatformType } from '../constants/platforms';

const BASE_URLS = {
    [X]: 'https://api.x.com/2/',
    [TUMBLR]: 'https://api.tumblr.com/v2/',
    [THREADS]: 'https://graph.threads.net/', // URL de exemplo
};

const createApiClient = (baseURL: string): AxiosInstance => {
    const client = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 10000,
    });

    /*
      Se você precisar de um interceptor que se comporte de maneira diferente
      para cada serviço, você pode adicioná-lo aqui dentro.
      Por exemplo, para adicionar um token de autenticação:
    
      client.interceptors.request.use(config => {
        // A lógica para buscar o token pode ser passada como parâmetro
        // ou ser gerenciada externamente.
        // const token = getTokenFor(baseURL);
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
      });
    */

    return client;
};

export const clientService: Record<PlatformType, AxiosInstance> = {
    [X]: createApiClient(BASE_URLS[X]),
    [TUMBLR]: createApiClient(BASE_URLS[TUMBLR]),
    [THREADS]: createApiClient(BASE_URLS[THREADS]),
};