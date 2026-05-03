import ReactNativeBlobUtil from 'react-native-blob-util';
import DocumentPicker from 'react-native-document-picker';
import { closeDBConnection } from '../database';
import Logger from './LoggerService';

const DB_NAME = 'myapp.db';
// No Windows, o banco geralmente fica na raiz do LocalState
const WINDOWS_DB_PATH = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}\\${DB_NAME}`;

/**
 * Exporta o banco de dados atual para uma pasta selecionada pelo usuário no Windows.
 */
export const exportDatabase = async () => {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(WINDOWS_DB_PATH);
    if (!exists) {
      Logger.error(new Error('DB Not Found'), { path: WINDOWS_DB_PATH });
      throw new Error('Banco de dados original não encontrado no Windows.');
    }

    // Abrir seletor de diretório
    const dirRes = await DocumentPicker.pickDirectory();
    if (!dirRes) return false;

    // Criar um nome de arquivo único com data
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const fileName = `PostSynchronizer_Backup_${dateStr}.db`;
    
    // Preparar caminho de destino (convertendo URI para caminho se necessário)
    let destPath = dirRes.uri;
    if (destPath.startsWith('file://')) {
      destPath = destPath.substring(7);
    }
    // Remover barra inicial se for Windows e começar com /C:/
    if (destPath.match(/^\/[a-zA-Z]:\//)) {
        destPath = destPath.substring(1);
    }
    
    const finalPath = `${destPath}\\${fileName}`.replace(/\//g, '\\');

    // Copiar arquivo
    await ReactNativeBlobUtil.fs.cp(WINDOWS_DB_PATH, finalPath);

    Logger.debug(`[BackupService] Backup exportado para: ${finalPath}`);
    return true;
  } catch (error: any) {
    if (DocumentPicker.isCancel(error)) return false;
    Logger.error(error as Error, { message: '[BackupService] Erro ao exportar banco no Windows.' });
    throw error;
  }
};

/**
 * Importa um arquivo de banco de dados e substitui o atual no Windows.
 */
export const importDatabase = async () => {
  try {
    // Abrir seletor de arquivos
    const res = await DocumentPicker.pickSingle({
      type: [DocumentPicker.types.allFiles],
    });

    if (!res.uri) return false;

    // 1. Fechar a conexão ativa
    await closeDBConnection();

    // 2. Preparar caminho de origem
    let srcPath = res.uri;
    if (srcPath.startsWith('file://')) {
      srcPath = srcPath.substring(7);
    }
    if (srcPath.match(/^\/[a-zA-Z]:\//)) {
        srcPath = srcPath.substring(1);
    }
    srcPath = srcPath.replace(/\//g, '\\');

    // 3. Sobrescrever o banco atual
    if (await ReactNativeBlobUtil.fs.exists(WINDOWS_DB_PATH)) {
        await ReactNativeBlobUtil.fs.unlink(WINDOWS_DB_PATH);
    }
    
    await ReactNativeBlobUtil.fs.cp(srcPath, WINDOWS_DB_PATH);
    
    Logger.debug('[BackupService] Banco de dados importado com sucesso no Windows.');
    return true;
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      return false;
    }
    Logger.error(err as Error, { message: '[BackupService] Erro ao importar banco no Windows.' });
    throw err;
  }
};
