import AuthTokenDao, { Credentials, TumblrCredentials } from 'src/dao/AuthTokenDao';
import { getDBConnection } from 'src/database';
import { TUMBLR, X } from 'src/constants/platforms';

jest.mock('src/database', () => ({
  getDBConnection: jest.fn(),
}));

describe('AuthTokenDao.ts', () => {
  const mockExecuteSql = jest.fn();
  const mockDb = {
    executeSql: mockExecuteSql,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDBConnection as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('saveCredentials', () => {
    test('deve inserir novas credenciais se não existirem', async () => {
      // Mock Transaction
      mockExecuteSql.mockResolvedValueOnce([]); // BEGIN
      // Mock SELECT platform (não existe)
      mockExecuteSql.mockResolvedValueOnce([{ rows: { length: 0 } }]);
      // Mock INSERT
      mockExecuteSql.mockResolvedValueOnce([]);
      // Mock COMMIT
      mockExecuteSql.mockResolvedValueOnce([]);

      const creds: Credentials = { platform: X, active: true, aditional: 'token123' };
      await AuthTokenDao.saveCredentials(creds);

      expect(mockExecuteSql).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO auth_tokens'), expect.arrayContaining([X, 'token123', 1]));
      expect(mockExecuteSql).toHaveBeenCalledWith('COMMIT;');
    });

    test('deve atualizar credenciais se já existirem', async () => {
      mockExecuteSql.mockResolvedValueOnce([]); // BEGIN
      mockExecuteSql.mockResolvedValueOnce([{ rows: { length: 1 } }]); // Existe
      mockExecuteSql.mockResolvedValueOnce([]); // UPDATE
      mockExecuteSql.mockResolvedValueOnce([]); // COMMIT

      const creds: Credentials = { platform: X, active: false, aditional: 'new-token' };
      await AuthTokenDao.saveCredentials(creds);

      expect(mockExecuteSql).toHaveBeenCalledWith(expect.stringContaining('UPDATE auth_tokens SET'), expect.arrayContaining(['new-token', 0, X]));
    });

    test('deve formatar aditional como JSON para Tumblr', async () => {
      mockExecuteSql.mockResolvedValueOnce([]); // BEGIN
      mockExecuteSql.mockResolvedValueOnce([{ rows: { length: 1 } }]); 
      mockExecuteSql.mockResolvedValueOnce([]); // UPDATE
      mockExecuteSql.mockResolvedValueOnce([]); // COMMIT

      const tumblrCreds: TumblrCredentials = { 
        platform: TUMBLR, 
        active: true, 
        aditional: '', 
        blogs: [{ name: 'blog1', title: 'B1', selected: true }],
        blogName: 'blog1'
      };

      await AuthTokenDao.saveCredentials(tumblrCreds);

      const jsonStr = JSON.stringify(tumblrCreds.blogs);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE auth_tokens'),
        expect.arrayContaining([jsonStr, 1, TUMBLR])
      );
    });

    test('deve dar ROLLBACK em caso de erro', async () => {
      mockExecuteSql.mockResolvedValueOnce([]); // BEGIN
      mockExecuteSql.mockRejectedValueOnce(new Error('Insert Fail'));
      mockExecuteSql.mockResolvedValueOnce([]); // ROLLBACK

      await expect(AuthTokenDao.saveCredentials({ platform: X })).rejects.toThrow('Insert Fail');
      expect(mockExecuteSql).toHaveBeenCalledWith('ROLLBACK;');
    });
  });

  describe('getCredentialsForPlatform', () => {
    test('deve retornar credenciais simples (X)', async () => {
      mockExecuteSql.mockResolvedValue([{
        rows: {
          length: 1,
          item: () => ({ platform: X, aditional: 'tok', active: 1 }),
        },
      }]);

      const result = await AuthTokenDao.getCredentialsForPlatform<Credentials>(X);

      expect(result).toEqual({ platform: X, aditional: 'tok', active: 1 });
    });

    test('deve parsear blogs para Tumblr', async () => {
      const blogs = [{ name: 'myblog', selected: true }];
      mockExecuteSql.mockResolvedValue([{
        rows: {
          length: 1,
          item: () => ({ platform: TUMBLR, aditional: JSON.stringify(blogs), active: 1 }),
        },
      }]);

      const result = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(TUMBLR);

      expect(result?.blogName).toBe('myblog');
      expect(result?.blogs).toEqual(blogs);
    });

    test('deve retornar null se não encontrar', async () => {
      mockExecuteSql.mockResolvedValue([{ rows: { length: 0 } }]);
      const result = await AuthTokenDao.getCredentialsForPlatform(X);
      expect(result).toBeNull();
    });
  });

  describe('getActivePlatforms', () => {
    test('deve retornar lista de nomes de plataformas ativas', async () => {
      mockExecuteSql.mockResolvedValue([{
        rows: {
          length: 2,
          item: (i: number) => [{ platform: 'x' }, { platform: 'tumblr' }][i],
        },
      }]);

      const result = await AuthTokenDao.getActivePlatforms();
      expect(result).toEqual(['x', 'tumblr']);
      expect(mockExecuteSql).toHaveBeenCalledWith(expect.stringContaining('WHERE active = 1'));
    });
  });

  describe('updateActiveStatus', () => {
    test('deve atualizar apenas campo active', async () => {
      mockExecuteSql.mockResolvedValue([]);
      await AuthTokenDao.updateActiveStatus({ platform: X, active: true, aditional: '' });
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE auth_tokens SET active = ?'),
        [1, X]
      );
    });
  });
});
