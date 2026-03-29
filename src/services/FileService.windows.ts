import ReactNativeBlobUtil from 'react-native-blob-util';

export class FileService {
  public DocumentDirectoryPath = ReactNativeBlobUtil.fs.dirs.DocumentDir;
  public CachesDirectoryPath = ReactNativeBlobUtil.fs.dirs.CacheDir;

  private operationQueue: Promise<any> = Promise.resolve();

  private async executeSerialized<T>(operation: () => Promise<T>, retries = 3, delay = 50): Promise<T> {
    const nextInQueue = async () => {
      let lastError: any;
      for (let i = 0; i < retries; i++) {
        try {
          return await operation();
        } catch (error: any) {
          lastError = error;
          // EUNSPECIFIED ou similar no Windows geralmente indica arquivo em uso
          const isFileInUse = error?.message?.includes('EUNSPECIFIED') || error?.message?.includes('arquivo está em uso');
          if (isFileInUse && i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    };

    const promise = this.operationQueue.then(nextInQueue);
    this.operationQueue = promise.catch(() => {}); // Manter a fila andando mesmo se falhar
    return promise;
  }

  public writeFile = (path: string, content: string, encoding?: string) =>
    this.executeSerialized(() => ReactNativeBlobUtil.fs.writeFile(path, content, encoding as any));

  public appendFile = (path: string, content: string, encoding?: string) =>
    this.executeSerialized(() => ReactNativeBlobUtil.fs.appendFile(path, content, encoding as any));

  public mkdir = async (path: string): Promise<void> => {
    await ReactNativeBlobUtil.fs.mkdir(path);
  };

  public exists = (path: string) => ReactNativeBlobUtil.fs.exists(path);

  public async readFileBase64(path: string): Promise<string> {
    const cleanPath = path.startsWith('file://') ? path.substring(7) : path;
    return await ReactNativeBlobUtil.fs.readFile(cleanPath, 'base64');
  }

  public async moveFile(from: string, to: string): Promise<void> {
    const cleanFrom = from.startsWith('file://') ? from.substring(7) : from;
    const cleanTo = to.startsWith('file://') ? to.substring(7) : to;
    await ReactNativeBlobUtil.fs.mv(cleanFrom, cleanTo);
  }

  public async copyFile(from: string, to: string): Promise<void> {
    const cleanFrom = from.startsWith('file://') ? from.substring(7) : from;
    const cleanTo = to.startsWith('file://') ? to.substring(7) : to;
    await ReactNativeBlobUtil.fs.cp(cleanFrom, cleanTo);
  }

  public async unlink(path: string): Promise<void> {
    const cleanPath = path.startsWith('file://') ? path.substring(7) : path;
    await ReactNativeBlobUtil.fs.unlink(cleanPath);
  }
}

export const fileService = new FileService();
