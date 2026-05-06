import PostDao from 'src/dao/PostDao';
import { getDBConnection } from 'src/database';

jest.mock('src/database', () => ({
  getDBConnection: jest.fn(),
}));

describe('PostDao.ts', () => {
  const mockExecuteSql = jest.fn();
  const mockDb = {
    executeSql: mockExecuteSql,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDBConnection as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('getAll', () => {
    test('deve retornar lista de posts formatada', async () => {
      const mockRows = [
        { id: 1, content: 'Post 1', images: '[]', platforms_send: 'x', platforms_success: 'x', tags: 'tag1', status: 'posted' },
        { id: 2, content: 'Post 2', images: '[{"path":"p1"}]', platforms_send: 'tumblr', platforms_success: null, tags: '', status: 'draft' },
      ];

      mockExecuteSql.mockResolvedValue([{
        rows: {
          length: mockRows.length,
          item: (i: number) => mockRows[i],
        },
      }]);

      const result = await PostDao.getAll();

      expect(getDBConnection).toHaveBeenCalled();
      expect(mockExecuteSql).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].images).toEqual([{ path: 'p1' }]);
      expect(result[1].platformsSend).toBe('tumblr');
    });

    test('deve lançar erro se falhar no banco', async () => {
      mockExecuteSql.mockRejectedValue(new Error('DB Error'));
      await expect(PostDao.getAll()).rejects.toThrow('DB Error');
    });
  });

  describe('create', () => {
    test('deve inserir post e retornar insertId', async () => {
      mockExecuteSql.mockResolvedValue([{ insertId: 123 }]);

      const id = await PostDao.create({ content: 'New Post', tags: 't1; t2' });

      expect(id).toBe(123);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO posts'),
        expect.arrayContaining(['New Post', 't1; t2'])
      );
    });

    test('deve lançar erro se insertId for inválido', async () => {
      mockExecuteSql.mockResolvedValue([{ insertId: undefined }]);
      await expect(PostDao.create({})).rejects.toThrow('Falha ao obter o ID');
    });
  });

  describe('update', () => {
    test('deve atualizar campos simples', async () => {
      mockExecuteSql.mockResolvedValue([]);
      
      await PostDao.update(1, { content: 'Updated' });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET content = ?'),
        ['Updated', 1]
      );
    });

    test('deve mesclar plataformas se já existirem', async () => {
      // Mock da busca inicial dos dados existentes
      mockExecuteSql.mockResolvedValueOnce([{
        rows: {
          length: 1,
          item: () => ({ platforms_send: 'x', platforms_success: 'x' }),
        },
      }]);
      // Mock do update final
      mockExecuteSql.mockResolvedValueOnce([]);

      await PostDao.update(1, { platformsSend: 'tumblr', platformsSuccess: 'tumblr' });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET platforms_send = ?, platforms_success = ?'),
        ['x, tumblr', 'x, tumblr', 1]
      );
    });
  });

  describe('updateLastSync', () => {
    test('deve atualizar status para POSTED e desmarcar pending', async () => {
      mockExecuteSql.mockResolvedValue([]);

      await PostDao.updateLastSync(1, ['x', 'tumblr']);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET pending = ?, status = ?, platforms_success = ?'),
        [false, 'posted', 'x, tumblr', 1]
      );
    });
  });

  describe('delete', () => {
    test('deve deletar pelo id', async () => {
      mockExecuteSql.mockResolvedValue([]);
      await PostDao.delete(1);
      expect(mockExecuteSql).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM posts WHERE id = ?'), [1]);
    });
  });

  describe('getEarliestYear', () => {
    test('deve retornar o ano da primeira postagem', async () => {
      mockExecuteSql.mockResolvedValue([{
        rows: {
          length: 1,
          item: () => ({ first_date: '2022-06-01T12:00:00.000Z' }),
        },
      }]);

      const year = await PostDao.getEarliestYear();
      expect(year).toBe(2022);
    });

    test('deve retornar o ano atual se não houver registros', async () => {
      mockExecuteSql.mockResolvedValue([{
        rows: {
          length: 1,
          item: () => ({ first_date: null }),
        },
      }]);

      const year = await PostDao.getEarliestYear();
      expect(year).toBe(new Date().getFullYear());
    });
  });
});
