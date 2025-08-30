import { enablePromise, openDatabase, SQLiteDatabase, } from 'react-native-sqlite-storage';
import { runMigrations } from './migrations';

enablePromise(true);

const DATABASE_NAME = 'myapp.db';

let dbInstance: SQLiteDatabase | null = null;

export const getDBConnection = async (): Promise<SQLiteDatabase> => {
    if (dbInstance)
        return dbInstance;

    try {
        const db = await openDatabase({ name: DATABASE_NAME, location: 'default' });
        console.log('Conexão com o banco de dados estabelecida.');
        await runMigrations(db);
        dbInstance = db;
        return db;
    } catch (error) {
        console.error('Falha ao abrir ou migrar o banco de dados:', error);
        throw error;
    }
};

export const closeDBConnection = async (): Promise<void> => {
    if (dbInstance) {
        await dbInstance.close();
        dbInstance = null;
        console.log('Conexão com o banco de dados fechada.');
    }
};