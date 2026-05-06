import { runMigrations } from 'src/database/migrations';
import { SQLiteDatabase } from 'react-native-sqlite-storage';

// Reutilizamos o mock do SQLite que criamos anteriormente
const mockExecuteSql = jest.fn();
const mockDb = {
  executeSql: mockExecuteSql,
} as unknown as SQLiteDatabase;

describe('Database Migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve criar a tabela de versão e aplicar todas as migrações em um banco novo', async () => {
    // 1. Mock do check inicial (tabela db_version não existe ou retorna vazio na primeira vez)
    // O runMigrations faz:
    // - CREATE TABLE IF NOT EXISTS db_version
    // - SELECT version FROM db_version LIMIT 1
    
    mockExecuteSql
      .mockResolvedValueOnce([{}]) // CREATE TABLE
      .mockResolvedValueOnce([{ rows: { length: 0 } }]); // SELECT version (vazio)

    await runMigrations(mockDb);

    // Deve ter inserido a versão 0 inicialmente
    expect(mockExecuteSql).toHaveBeenCalledWith('INSERT INTO db_version (version) VALUES (0);');
    
    // Deve ter chamado as migrações (MIGRATIONS.length)
    // e atualizado a versão para cada uma
    expect(mockExecuteSql).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS auth_tokens'));
    expect(mockExecuteSql).toHaveBeenCalledWith(expect.stringContaining('UPDATE db_version SET version = ?;'), [expect.any(Number)]);
  });

  test('deve pular migrações se o banco já estiver atualizado', async () => {
    // Simula que a versão atual é 5 (ajuste se MIGRATIONS.length mudar)
    mockExecuteSql
      .mockResolvedValueOnce([{}]) // CREATE TABLE
      .mockResolvedValueOnce([{ rows: { length: 1, item: (i: number) => ({ version: 5 }) } }]);

    await runMigrations(mockDb);

    // Não deve chamar INSERT INTO auth_tokens (que é a primeira migração)
    expect(mockExecuteSql).not.toHaveBeenCalledWith(expect.stringContaining('INSERT OR IGNORE INTO auth_tokens'));
  });

  test('deve aplicar apenas migrações pendentes a partir de uma versão intermediária', async () => {
    // Simula que a versão atual é 2
    mockExecuteSql
      .mockResolvedValueOnce([{}]) // CREATE TABLE
      .mockResolvedValueOnce([{ rows: { length: 1, item: (i: number) => ({ version: 2 }) } }]);

    await runMigrations(mockDb);

    // Migração #3 é 'CREATE TABLE IF NOT EXISTS posts' (index 2 no array MIGRATIONS)
    expect(mockExecuteSql).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS posts'));
    // Migração #1 (index 0) não deve ser chamada
    expect(mockExecuteSql).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS auth_tokens'));
  });
});
