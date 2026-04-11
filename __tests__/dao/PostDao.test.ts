/**
 * PostDao Tests
 *
 * Estratégia: Mockamos o módulo 'src/database' via factory function do jest.mock.
 * A variável mockExecuteSql é inicializada dentro do factory e exportada via objeto
 * global para ser acessada nos testes.
 */

// Declara o mock antes para ser hoisted corretamente pelo Jest
jest.mock('src/database');

import PostDao from 'src/dao/PostDao';
import { DRAFT } from 'src/constants/app';
import { X } from 'src/constants/platforms';
import * as database from 'src/database';

describe('PostDao.ts', () => {
  let mockExecuteSql: jest.Mock;

  beforeEach(() => {
    mockExecuteSql = jest.fn();
    (database.getDBConnection as jest.Mock).mockResolvedValue({
      executeSql: mockExecuteSql,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('deve inserir post com valores padrão e retornar insertId', async () => {
      mockExecuteSql.mockResolvedValueOnce([{ insertId: 1 }]);

      const id = await PostDao.create({ content: 'Teste Post', status: DRAFT as any });

      expect(id).toBe(1);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO posts'),
        expect.any(Array)
      );
    });

    test('deve lançar erro se falhar ao obter insertId', async () => {
      mockExecuteSql.mockResolvedValueOnce([{ insertId: -1 }]);

      await expect(PostDao.create({})).rejects.toThrow('Falha ao obter o ID do post inserido.');
    });
  });

  describe('getAll', () => {
    test('deve retornar posts formatados corretamente', async () => {
      mockExecuteSql.mockResolvedValueOnce([{
        rows: {
          length: 1,
          item: (_i: number) => ({
            id: 1,
            content: 'Conteudo',
            tags: 'tag1;tag2',
            platforms_send: 'x;tumblr',
            platforms_success: 'x',
            status: DRAFT,
            images: '[]',
            created_at: '2023-01-01',
          }),
        },
      }]);

      const posts = await PostDao.getAll();
      expect(posts).toHaveLength(1);
      expect(posts[0].platformsSend).toBe('x;tumblr');
      expect(posts[0].platformsSuccess).toBe('x');
    });
  });

  describe('update', () => {
    test('deve chamar UPDATE no banco com os dados corretos', async () => {
      // SELECT do post atual (para leitura das plataformas)
      mockExecuteSql.mockResolvedValueOnce([{
        rows: {
          length: 1,
          item: () => ({ platforms_send: 'x', platforms_success: '' }),
        },
      }]);
      // UPDATE do post
      mockExecuteSql.mockResolvedValueOnce([{ rowsAffected: 1 }]);

      await PostDao.update(1, { content: 'Texto atualizado' });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET'),
        expect.any(Array)
      );
    });
  });

  describe('updateLastSync', () => {
    test('deve marcar post como finalizado em uma plataforma', async () => {
      mockExecuteSql.mockResolvedValueOnce([{ rowsAffected: 1 }]);

      await PostDao.updateLastSync(1, [X]);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('platforms_success'),
        expect.any(Array)
      );
    });
  });

  describe('getTagSuggestions', () => {
    test('deve retornar tags únicas e filtradas', async () => {
      mockExecuteSql.mockResolvedValueOnce([{
        rows: {
          length: 2,
          item: (i: number) => [{ tags: 'tag1,tag2' }, { tags: 'tag2,tag3' }][i],
        },
      }]);

      const suggestions = await PostDao.getTagSuggestions('tag');
      expect(suggestions).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
    });

    test('deve retornar [] para query vazia', async () => {
      const suggestions = await PostDao.getTagSuggestions('');
      expect(suggestions).toEqual([]);
      expect(mockExecuteSql).not.toHaveBeenCalled();
    });
  });
});
