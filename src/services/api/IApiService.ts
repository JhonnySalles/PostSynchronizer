export interface PostData {
    text: string;
    tags?: string[];
    images?: string[];
  }
  
  export interface IApiService {
    /**
     * Realiza a autenticação, gera e armazena um token.
     * @param username - Nome de usuário ou e-mail.
     * @param password_or_token - Senha ou token de acesso.
     * @returns {Promise<boolean>} - True se o login for bem-sucedido.
     */
    login(username: string, password_or_token: string): Promise<boolean>;
  
    /**
     * Publica conteúdo na plataforma.
     * @param {PostData} data - O conteúdo a ser postado.
     * @returns {Promise<boolean>} - True se a postagem for bem-sucedida.
     */
    post(data: PostData): Promise<boolean>;
  }