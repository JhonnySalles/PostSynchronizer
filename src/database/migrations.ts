import { SQLExecutionError, SQLiteDatabase } from 'react-native-sqlite-storage';


const MIGRATIONS = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS auth_tokens (
      platform TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        images TEXT, -- Armazenaremos como uma string JSON
        status TEXT NOT NULL, -- 'draft' ou 'posted'
        platforms TEXT, -- 'x,tumblr', etc.
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
];


export const runMigrations = async (db: SQLiteDatabase): Promise<void> => {
    try {
        await db.executeSql(
            `CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY NOT NULL
      );`,
        );

        let currentVersion = 0;
        const versionResult = await db.executeSql('SELECT version FROM db_version LIMIT 1;',);

        if (versionResult[0].rows.length > 0)
            currentVersion = versionResult[0].rows.item(0).version;
        else
            await db.executeSql('INSERT INTO db_version (version) VALUES (0);');


        console.log(`Versão atual do banco de dados: ${currentVersion}`);

        if (currentVersion < MIGRATIONS.length) {
            console.log('Iniciando migrações...');
            for (let i = currentVersion; i < MIGRATIONS.length; i++) {
                await db.executeSql(MIGRATIONS[i]);
                const newVersion = i + 1;
                await db.executeSql('UPDATE db_version SET version = ?;', [newVersion]);
                console.log(`Migração #${newVersion} aplicada com sucesso.`);
            }
            console.log('Todas as migrações foram concluídas.');
        } else
            console.log('O banco de dados já está atualizado.');
    } catch (error) {
        const sqlError = error as SQLExecutionError;
        console.error('Erro ao executar migrações:', sqlError.message);
        throw error;
    }
};