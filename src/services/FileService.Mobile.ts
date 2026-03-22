import RNFS from 'react-native-fs';

export class FileService {
  public DocumentDirectoryPath = RNFS.DocumentDirectoryPath;
  public CachesDirectoryPath = RNFS.CachesDirectoryPath;

  public writeFile = RNFS.writeFile;
  public appendFile = RNFS.appendFile;
  public mkdir = RNFS.mkdir;
  public exists = RNFS.exists;

  public async readFileBase64(path: string): Promise<string> {
    const cleanPath = path.startsWith('file://') ? path.substring(7) : path;
    return await RNFS.readFile(cleanPath, 'base64');
  }

  public async moveFile(from: string, to: string): Promise<void> {
    const cleanFrom = from.startsWith('file://') ? from.substring(7) : from;
    const cleanTo = to.startsWith('file://') ? to.substring(7) : to;
    return await RNFS.moveFile(cleanFrom, cleanTo);
  }

  public async copyFile(from: string, to: string): Promise<void> {
    const cleanFrom = from.startsWith('file://') ? from.substring(7) : from;
    const cleanTo = to.startsWith('file://') ? to.substring(7) : to;
    return await RNFS.copyFile(cleanFrom, cleanTo);
  }

  public async unlink(path: string): Promise<void> {
    const cleanPath = path.startsWith('file://') ? path.substring(7) : path;
    return await RNFS.unlink(cleanPath);
  }
}

export const fileService = new FileService();
