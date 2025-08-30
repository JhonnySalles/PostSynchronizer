import { Credentials } from "src/dao/AuthTokenDao";

export interface PostData {
    text: string;
    tags?: string[];
    images?: string[];
    imagesUrl?: string[];
}

export interface ResultPost {
    sucess: boolean;
    imagesUrl?: string[];
}

export interface IApiService {
    /**
     * Testa um conjunto de credenciais para verificar se são válidas.
     * @param credentials - Nome de usuário ou e-mail.
     * @returns {Promise<boolean>} - True se o login for bem-sucedido.
     */
    test(credentials: Credentials): Promise<boolean>;

    /**
     * Publica conteúdo na plataforma.
     * @param {PostData} data - O conteúdo a ser postado.
     * @returns {Promise<ResultPost>} - True se a postagem for bem-sucedida.
     */
    post(data: PostData): Promise<ResultPost>;

    /**
   * Verifica a validade do token de acesso e o renova se estiver
   * perto de expirar. Se o serviço não suportar renovação,
   * a função não fará nada.
   * @returns {Promise<void>}
   */
  validateAndRefreshToken(): Promise<void>;
}