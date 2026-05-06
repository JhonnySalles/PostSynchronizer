describe('Database Initialization', () => {
  let getDBConnection: any;
  let closeDBConnection: any;
  let mockOpenDatabase: any;
  let mockRunMigrations: any;

  beforeEach(() => {
    jest.resetModules();
    
    // Mocks definidos localmente para funcionarem com resetModules
    jest.doMock('react-native-sqlite-storage', () => ({
      enablePromise: jest.fn(),
      openDatabase: jest.fn(),
    }));

    jest.doMock('src/database/migrations', () => ({
      runMigrations: jest.fn(),
    }));

    // Importamos os módulos mockados para configurar comportamentos e fazer expectativas
    const sqlite = require('react-native-sqlite-storage');
    mockOpenDatabase = sqlite.openDatabase;
    
    const migrations = require('src/database/migrations');
    mockRunMigrations = migrations.runMigrations;

    // Importamos o módulo sendo testado
    const dbModule = require('src/database');
    getDBConnection = dbModule.getDBConnection;
    closeDBConnection = dbModule.closeDBConnection;
  });

  test('deve abrir o banco de dados e rodar migrações apenas uma vez (Singleton)', async () => {
    const mockDb = { close: jest.fn() };
    mockOpenDatabase.mockResolvedValue(mockDb);

    // Primeira chamada
    const db1 = await getDBConnection();
    
    // Segunda chamada (deve retornar a mesma instância sem chamar openDatabase de novo)
    const db2 = await getDBConnection();

    expect(db1).toBe(db2);
    expect(mockOpenDatabase).toHaveBeenCalledTimes(1);
    expect(mockRunMigrations).toHaveBeenCalledTimes(1);
  });

  test('deve tratar múltiplas chamadas simultâneas aguardando a primeira promise', async () => {
    const mockDb = { close: jest.fn() };
    let resolveOpen: any;
    const openPromise = new Promise((resolve) => { resolveOpen = resolve; });
    mockOpenDatabase.mockReturnValue(openPromise);

    // Dispara múltiplas chamadas sem aguardar
    const p1 = getDBConnection();
    const p2 = getDBConnection();

    // Resolve a primeira
    resolveOpen(mockDb);

    const db1 = await p1;
    const db2 = await p2;

    expect(db1).toBe(db2);
    expect(mockOpenDatabase).toHaveBeenCalledTimes(1);
  });

  test('deve fechar a conexão e permitir reabrir depois', async () => {
    const mockDb = { close: jest.fn().mockResolvedValue(null) };
    mockOpenDatabase.mockResolvedValue(mockDb);

    await getDBConnection();
    await closeDBConnection();

    expect(mockDb.close).toHaveBeenCalled();

    // Tenta abrir de novo (deve chamar openDatabase de novo pois a instância foi resetada)
    await getDBConnection();
    expect(mockOpenDatabase).toHaveBeenCalledTimes(2);
  });
});
