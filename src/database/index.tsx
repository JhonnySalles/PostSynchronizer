import { enablePromise, openDatabase, SQLiteDatabase, } from 'react-native-sqlite-storage';
import { runMigrations } from './migrations';
import Logger from '../services/LoggerService';

enablePromise(true);

const DATABASE_NAME = 'myapp.db';

let dbInstance: SQLiteDatabase | null = null;
let openingPromise: Promise<SQLiteDatabase> | null = null;

export const getDBConnection = async (): Promise<SQLiteDatabase> => {
    if (dbInstance)
        return dbInstance;

    if (openingPromise) {
        Logger.debug('[DB] Conexão já em progresso, aguardando...');
        return openingPromise;
    }

    Logger.debug('[DB] Nenhuma conexão ativa ou em progresso. Iniciando nova conexão...');
    openingPromise = (async () => {
        try {
            const db = await openDatabase({ name: DATABASE_NAME, location: 'default' });
            Logger.debug('[DB] Conexão com o banco de dados estabelecida.');
            await runMigrations(db);
            dbInstance = db;
            return db;
        } catch (e: Error | any) {
            Logger.error(e, { message: '[DB] Falha ao abrir ou migrar o banco de dados.' });
            openingPromise = null;
            throw e;
        }
    })();

    return openingPromise;
};

export const closeDBConnection = async (): Promise<void> => {
    if (dbInstance) {
        await dbInstance.close();
        dbInstance = null;
        Logger.debug('[DB] Conexão com o banco de dados fechada.');
    }
};