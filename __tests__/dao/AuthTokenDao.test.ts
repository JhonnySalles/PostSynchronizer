import AuthTokenDao from 'src/dao/AuthTokenDao';
import { TUMBLR, X } from 'src/constants/platforms';

// Estado do banco de dados simulado para o mock inteligente
let nextSelectResult: any = { rows: { length: 0 } };

const mockExecuteSql = jest.fn((sql: string) => {
  // 1. Ignorar comandos de transação (Return vazio)
  if (sql.includes('BEGIN') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
    return Promise.resolve([{ rows: { length: 0 } }]);
  }
  
  // 2. Responder a SELECTs com o estado preparado pelo teste
  if (sql.includes('SELECT')) {
    return Promise.resolve([nextSelectResult]);
  }
  
  // 3. Responder a INSERT/UPDATE/DELETE com sucesso genérico
  return Promise.resolve([{}]);
});

const mockDB = {
  executeSql: mockExecuteSql,
  transaction: jest.fn(cb => cb({ executeSql: mockExecuteSql })),
  close: jest.fn(),
};

jest.mock('src/database', () => ({
  getDBConnection: jest.fn(() => Promise.resolve(mockDB)),
  closeDBConnection: jest.fn(() => Promise.resolve()),
}));

describe('AuthTokenDao.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Banco vazio para novos SELECTs
    nextSelectResult = { rows: { length: 0 } };
  });

  describe('saveCredentials', () => {
    test('deve inserir nova plataforma quando não existe', async () => {
      nextSelectResult = { rows: { length: 0 } }; 

      await AuthTokenDao.saveCredentials({ platform: X, aditional: 'test', active: true });

      const insertCall = mockExecuteSql.mock.calls.find(c => c[0].includes('INSERT INTO auth_tokens'));
      expect(insertCall).toBeDefined();
    });

    test('deve atualizar plataforma existente', async () => {
      // Configuramos o banco para "ter" a plataforma X
      nextSelectResult = { 
        rows: { length: 1, item: () => ({ platform: X }) } 
      };

      await AuthTokenDao.saveCredentials({ platform: X, aditional: 'new_token', active: false });

      const updateCall = mockExecuteSql.mock.calls.find(c => c[0].includes('UPDATE auth_tokens SET'));
      expect(updateCall).toBeDefined();
    });

    test('deve tratar campos especiais do Tumblr', async () => {
      nextSelectResult = { rows: { length: 0 } };

      const tumblrCreds = {
        platform: TUMBLR,
        blogs: [{ name: 'blog1', title: 'T1' }],
        active: true,
        aditional: ''
      };

      await AuthTokenDao.saveCredentials(tumblrCreds);
      
      const insertCall = mockExecuteSql.mock.calls.find(c => c[0].includes('INSERT INTO auth_tokens'));
      expect(insertCall[1][1]).toBe(JSON.stringify(tumblrCreds.blogs));
    });
  });

  describe('getCredentialsForPlatform', () => {
    test('deve parsear Tumblr corretamente', async () => {
      const blogs = [{ name: 'b1', title: 'T1', selected: true }];
      nextSelectResult = {
        rows: { 
          length: 1, 
          item: () => ({ platform: TUMBLR, aditional: JSON.stringify(blogs), active: 1 }) 
        }
      };

      const result = await AuthTokenDao.getCredentialsForPlatform(TUMBLR) as any;
      
      expect(result).not.toBeNull();
      expect(result.blogName).toBe('b1');
    });

    test('deve retornar null se não encontrar', async () => {
      nextSelectResult = { rows: { length: 0 } };
      const result = await AuthTokenDao.getCredentialsForPlatform(X);
      expect(result).toBeNull();
    });
  });
});
