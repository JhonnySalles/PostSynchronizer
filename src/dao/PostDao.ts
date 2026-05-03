import { DRAFT, POSTED, PostType } from 'src/constants/app';
import { getDBConnection } from '../database';
import Logger from 'src/services/LoggerService';
import { PlatformType } from 'src/constants/platforms';
import { cleanTags } from 'src/utils/util';

export interface Post {
  id: number;
  content: string | null;
  images: Image[];
  status: PostType;
  platformsSend: string | null;
  platformsSuccess: string | null;
  tags: string | null;
  pending: boolean;
  created_at: string;
  updated_at: string;
}

export type Image = {
  path: string;
  platforms: string[];
};

// Omit<> é um utilitário do TypeScript para criar um tipo omitindo certas chaves.
// Usado para o método 'create', já que 'id' e 'created_at' são gerados pelo banco.
type PostCreateData = Omit<Post, 'id' | 'created_at' | 'updated_at'>;
type PostDataPayload = Partial<PostCreateData>;

class PostDao {
  /**
   * Busca todos os posts do banco de dados, ordenados por data de criação decrescente.
   * @returns {Promise<Post[]>} Uma lista de posts.
   */
  public async getAll(): Promise<Post[]> {
    const db = await getDBConnection();
    try {
      const results = await db.executeSql(
        'SELECT id, content, images, status, platforms_send, platforms_success, created_at, tags FROM posts ORDER BY created_at DESC',
      );

      const posts: Post[] = [];
      results.forEach(result => {
        for (let i = 0; i < result.rows.length; i++) {
          const row = result.rows.item(i);
          posts.push({
            ...row,
            images: JSON.parse(row.images || '[]'),
            platformsSend: row.platforms_send,
            platformsSuccess: row.platforms_success,
          });
        }
      });
      return posts;
    } catch (error) {
      Logger.error(error as Error, { message: '[Post Dao] Erro ao buscar todos os posts:' });
      throw error;
    }
  }

  /**
   * Busca sugestões de tags com base em uma query.
   * @param {string} query - O texto sendo digitado pelo usuário.
   * @returns {Promise<string[]>} Uma lista de tags únicas que correspondem à busca.
   */
  public async getTagSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];

    const db = await getDBConnection();
    try {
      const results = await db.executeSql('SELECT DISTINCT tags FROM posts WHERE tags LIKE ?', [`%${query}%`]);

      const uniqueTags = new Set<string>();
      results.forEach(result => {
        for (let i = 0; i < result.rows.length; i++) {
          result.rows
            .item(i)
            .tags.split(';')
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0)
            .filter((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))
            .forEach((tag: string) => uniqueTags.add(tag));
        }
      });
      return Array.from(uniqueTags);
    } catch (error) {
      Logger.error(error as Error, { message: '[Post Dao] Erro ao buscar sugestões de tags:' });
      throw error;
    }
  }

  /**
   * Insere um novo post ou rascunho no banco de dados.
   * @param {PostCreateData} postData - Os dados do post a serem criados.
   */
  public async create(postData: Partial<PostCreateData>): Promise<number> {
    const {
      content = '',
      images = [],
      status = DRAFT,
      platformsSend: platforms_send = '',
      platformsSuccess: platforms_success = '',
      tags = '',
      pending = false,
    } = postData;

    const cleanedTags = cleanTags(tags);
    const imagesJson = JSON.stringify(images);
    const db = await getDBConnection();

    try {
      const [result] = await db.executeSql(
        'INSERT INTO posts (content, images, status, platforms_send, platforms_success, tags, pending) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [content, imagesJson, status, platforms_send, platforms_success, cleanedTags, pending],
      );
      const insertId = result.insertId;
      // prettier-ignore
      if (insertId === undefined || insertId < 0) 
        throw new Error('Falha ao obter o ID do post inserido.');

      Logger.info('[Post Dao] Post criado com sucesso');
      return insertId;
    } catch (error) {
      Logger.error(error as Error, { message: '[Post Dao] Erro ao criar post:' });
      throw error;
    }
  }

  /**
   * Atualiza um post existente no banco de dados com base no seu ID.
   * @param {number} postId - O ID do post a ser atualizado.
   * @param {PostDataPayload} postData - Os novos dados do post.
   */
  public async update(postId: number, postData: PostDataPayload): Promise<void> {
    const db = await getDBConnection();

    if (postData.platformsSend || postData.platformsSuccess) {
      try {
        const [currentDataResult] = await db.executeSql(
          'SELECT platforms_send, platforms_success FROM posts WHERE id = ?',
          [postId],
        );

        if (currentDataResult.rows.length > 0) {
          const currentData = currentDataResult.rows.item(0);

          const mergePlatforms = (current: string | null, incoming: string | null | undefined): string | undefined => {
            // prettier-ignore
            if (incoming === undefined || incoming === null) 
                return undefined;
            // prettier-ignore
            if (!current) 
                return incoming;

            const currentSet = new Set(current.split(',').map(p => p.trim()));
            const incomingValues = incoming.split(',').map(p => p.trim());
            incomingValues.forEach(p => currentSet.add(p));

            return Array.from(currentSet).join(', ');
          };

          const newPlatformsSend = mergePlatforms(currentData.platforms_send, postData.platformsSend);
          // prettier-ignore
          if (newPlatformsSend !== undefined)
            postData.platformsSend = newPlatformsSend;

          const newPlatformsSuccess = mergePlatforms(currentData.platforms_success, postData.platformsSuccess);
          // prettier-ignore
          if (newPlatformsSuccess !== undefined)
            postData.platformsSuccess = newPlatformsSuccess;
        }
      } catch (error) {
        Logger.error(error as Error, {
          message: `[Post Dao] Erro ao buscar dados existentes para o post ID ${postId}`,
        });
        throw error;
      }
    }

    if (postData.tags !== undefined) {
      postData.tags = cleanTags(postData.tags);
    }

    const fields = Object.keys(postData) as (keyof PostDataPayload)[];
    if (fields.length === 0) {
      Logger.warn(`[Post Dao] Tentativa de update no post ID ${postId} sem nenhum dado.`);
      return;
    }

    const setClauses = fields.map(field => {
      // prettier-ignore
      if (field === 'platformsSend') 
       return 'platforms_send = ?';
     else if (field === 'platformsSuccess') 
       return 'platforms_success = ?';
     else
       return `${field} = ?`;
    });

    const values = fields.map(field => {
      // prettier-ignore
      if (field === 'images')
        return JSON.stringify(postData[field]);
      else
        return postData[field];
    });

    const query = `UPDATE posts SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const queryParams = [...values, postId];
    try {
      await db.executeSql(query, queryParams);
      Logger.info(`[Post Dao] Post ID ${postId} atualizado com sucesso`);
    } catch (error) {
      Logger.error(error as Error, { message: `[Post Dao] Erro ao atualizar post ID ${postId}` });
      throw error;
    }
  }

  /**
   * Finaliza o post atualizando os campos de envio e sucesso com base no sumário final.
   * A lista 'platformsSend' conterá todas as plataformas tentadas (sucesso + falha).
   * A lista 'platformsSuccess' conterá apenas as que tiveram sucesso.
   *
   * @param {number} postId - O ID do post a ser atualizado.
   * @param {string[]} successfulPlatforms - Array com o nome das plataformas que tiveram sucesso.
   */
  public async updateLastSync(postId: number, successfulPlatforms: string[]): Promise<void> {
    const db = await getDBConnection();

    try {
      const platformsSuccess = Array.from(new Set(successfulPlatforms)).join(', ');
      await db.executeSql(
        `UPDATE posts SET pending = ?, status = ?, platforms_success = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [false, POSTED, platformsSuccess, postId],
      );

      Logger.info(`[Post Dao] Post ID ${postId} sincronizado a partir do sumário com sucesso.`);
    } catch (error) {
      Logger.error(error as Error, { message: `[Post Dao] Erro ao sincronizar sumário do post ID ${postId}` });
      throw error;
    }
  }

  /**
   * Deleta um post do banco de dados com base no seu ID.
   * @param {number} postId - O ID do post a ser deletado.
   */
  public async delete(postId: number): Promise<void> {
    const db = await getDBConnection();
    try {
      await db.executeSql('DELETE FROM posts WHERE id = ?', [postId]);
      Logger.info(`[Post Dao] Post ID ${postId} deletado com sucesso`);
    } catch (error) {
      Logger.error(error as Error, { message: `[Post Dao] Erro ao deletar post ID ${postId}` });
      throw error;
    }
  }

  /**
   * Busca todos os posts que ainda têm callbacks pendentes de sincronização.
   * @returns {Promise<Post[]>} Uma lista de posts com synchronized = 0.
   */
  public async getPendingPosts(): Promise<Post[]> {
    const db = await getDBConnection();
    try {
      const results = await db.executeSql('SELECT * FROM posts WHERE pending = 1');
      const posts: Post[] = [];
      results.forEach(result => {
        for (let i = 0; i < result.rows.length; i++) {
          const row = result.rows.item(i);
          posts.push({ ...row });
        }
      });
      return posts;
    } catch (error) {
      Logger.error(error as Error, { message: '[Post Dao] Erro ao buscar posts pendentes.' });
      throw error;
    }
  }

  /**
   * Consulta a quantidade de post de sucesso em uma determinada plataforma entre o periodo.
   * @param {PlatformType} platform - Plataforma a ser consultada.
   * @param {Date} startsWith - A data de início do período a ser considerado.
   */
  public async platformSuccessCount(platform: PlatformType, startsWith: Date): Promise<number> {
    const db = await getDBConnection();
    try {
      const results = await db.executeSql(
        `SELECT COUNT(*) AS qtd FROM posts WHERE Replace((',' || platforms_success || ','), ' ','') LIKE ? AND created_at >= ?`,
        [`%,${platform},%`, startsWith.toISOString()],
      );
      return results[0].rows.item(0)['qtd'];
    } catch (error) {
      Logger.error(error as Error, {
        message: `[Post Dao] Erro ao contar posts de sucesso para a plataforma ${platform}`,
      });
      throw error;
    }
  }
  /**
   * Busca o ano do primeiro registro no banco de dados.
   * @returns {Promise<number>} O ano mais antigo ou o ano atual se não houver registros.
   */
  public async getEarliestYear(): Promise<number> {
    const db = await getDBConnection();
    try {
      const results = await db.executeSql('SELECT MIN(created_at) as first_date FROM posts');
      const firstDate = results[0].rows.item(0).first_date;
      if (firstDate) {
        return new Date(firstDate).getFullYear();
      }
      return new Date().getFullYear();
    } catch (error) {
      Logger.error(error as Error, { message: '[Post Dao] Erro ao buscar ano inicial.' });
      return new Date().getFullYear();
    }
  }
}

export default new PostDao();
