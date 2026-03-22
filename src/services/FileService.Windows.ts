import ReactNativeBlobUtil from 'react-native-blob-util';

export class FileService {
  public DocumentDirectoryPath = ReactNativeBlobUtil.fs.dirs.DocumentDir;
  public CachesDirectoryPath = ReactNativeBlobUtil.fs.dirs.CacheDir;

  public writeFile = (path: string, content: string, encoding?: string) =>
    ReactNativeBlobUtil.fs.writeFile(path, content, encoding as any);

  public appendFile = (path: string, content: string, encoding?: string) =>
    ReactNativeBlobUtil.fs.appendFile(path, content, encoding as any);

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
