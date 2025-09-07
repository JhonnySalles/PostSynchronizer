import { SQLiteDatabase } from 'react-native-sqlite-storage';
import Logger from 'src/services/LoggerService';


const MIGRATIONS = [
    `CREATE TABLE IF NOT EXISTS auth_tokens (
      platform TEXT PRIMARY KEY NOT NULL,
      consumer_key TEXT,
      consumer_secret TEXT,
      token TEXT,
      token_secret TEXT,
      aditional TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        images TEXT,
        status TEXT NOT NULL, -- 'draft' ou 'posted'
        tags TEXT,
        platforms_send TEXT,
        platforms_success TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
];


export const runMigrations = async (db: SQLiteDatabase): Promise<void> => {
    try {
        await db.executeSql(`CREATE TABLE IF NOT EXISTS db_version (version INTEGER PRIMARY KEY NOT NULL);`,);

        let currentVersion = 0;
        const versionResult = await db.executeSql('SELECT version FROM db_version LIMIT 1;',);

        if (versionResult[0].rows.length > 0)
            currentVersion = versionResult[0].rows.item(0).version;
        else
            await db.executeSql('INSERT INTO db_version (version) VALUES (0);');


        Logger.debug(`[Migrations] Versão atual do banco de dados: ${currentVersion}`);

        if (currentVersion < MIGRATIONS.length) {
            Logger.debug('[Migrations] Iniciando migrações...');
            for (let i = currentVersion; i < MIGRATIONS.length; i++) {
                await db.executeSql(MIGRATIONS[i]);
                const newVersion = i + 1;
                await db.executeSql('UPDATE db_version SET version = ?;', [newVersion]);
                Logger.debug(`[Migrations] Migração #${newVersion} aplicada com sucesso.`);
            }
            Logger.debug('[Migrations] Todas as migrações foram concluídas.');
        } else
            Logger.debug('[Migrations] O banco de dados já está atualizado.');
    } catch (error) {
        const sqlError = error as Error;
        Logger.error(error as Error, { message: `[Migrations] Erro ao executar migrações: ${sqlError.message}` });
        throw error;
    }
};