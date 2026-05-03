import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';
import { closeDBConnection } from '../database';
import Logger from './LoggerService';

const DB_NAME = 'myapp.db';
// No Android, o banco fica em /data/data/package_name/databases/
const ANDROID_DB_PATH = `/data/data/com.postsynchronizer/databases/${DB_NAME}`;

/**
 * Exporta o banco de dados atual para um arquivo externo selecionado pelo usuário.
 */
export const exportDatabase = async () => {
  try {
    const exists = await RNFS.exists(ANDROID_DB_PATH);
    if (!exists) {
      Logger.error(new Error('DB Not Found'), { path: ANDROID_DB_PATH });
      throw new Error('Banco de dados original não encontrado no dispositivo.');
    }

    // Criar um nome de arquivo único com data
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const fileName = `PostSynchronizer_Backup_${dateStr}.db`;
    const tempPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    
    // Limpar cache anterior se existir
    if (await RNFS.exists(tempPath)) {
      await RNFS.unlink(tempPath);
    }

    // Copiar para área temporária para compartilhamento
    await RNFS.copyFile(ANDROID_DB_PATH, tempPath);

    // Abrir seletor de compartilhamento/salvamento
    await Share.open({
      url: `file://${tempPath}`,
      type: 'application/x-sqlite3',
      filename: fileName,
      title: 'Exportar Backup do Banco de Dados',
    });

    return true;
  } catch (error: any) {
    if (error?.message === 'User did not share') return false;
    Logger.error(error as Error, { message: '[BackupService] Erro ao exportar banco.' });
    throw error;
  }
};

/**
 * Importa um arquivo de banco de dados e substitui o atual.
 */
export const importDatabase = async () => {
  try {
    // Abrir seletor de arquivos
    const res = await DocumentPicker.pickSingle({
      type: [DocumentPicker.types.allFiles],
    });

    if (!res.uri) return false;

    // 1. Fechar a conexão ativa para evitar corrupção
    await closeDBConnection();

    // 2. Garantir que o diretório de destino existe
    const dbDir = `/data/data/com.postsynchronizer/databases`;
    const dirExists = await RNFS.exists(dbDir);
    if (!dirExists) {
      await RNFS.mkdir(dbDir);
    }

    // 3. Sobrescrever o banco atual
    // O DocumentPicker no Android retorna um content:// URI que o RNFS consegue ler
    if (await RNFS.exists(ANDROID_DB_PATH)) {
        await RNFS.unlink(ANDROID_DB_PATH);
    }
    
    await RNFS.copyFile(res.uri, ANDROID_DB_PATH);
    
    Logger.debug('[BackupService] Banco de dados importado com sucesso.');
    return true;
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      return false;
    }
    Logger.error(err as Error, { message: '[BackupService] Erro ao importar banco.' });
    throw err;
  }
};
