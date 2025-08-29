import axios from 'axios';

// Você pode configurar a URL base da sua API aqui
const BASE_URL = 'https://api.example.com';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/*
  Exemplo de como adicionar um interceptor para incluir um token de autenticação
  em todas as requisições, caso necessário no futuro.

  api.interceptors.request.use(async config => {
    // const token = await AsyncStorage.getItem('@App:token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  });
*/

export default api;